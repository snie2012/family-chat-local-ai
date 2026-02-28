import { FastifyInstance } from "fastify";
import { z } from "zod";
import { validateUser, createUser, randomAvatarColor } from "../services/auth.service";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(64),
  password: z.string().min(8),
  isAdmin: z.boolean().optional(),
  avatarColor: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const user = await validateUser(body.data.username, body.data.password);
    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign(
      { userId: user.id, isAdmin: user.isAdmin },
      { expiresIn: process.env.JWT_EXPIRY ?? "30d" }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isBot: user.isBot,
        isAdmin: user.isAdmin,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt,
      },
    });
  });

  app.post(
    "/auth/register",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const jwtPayload = request.user as { userId: string; isAdmin: boolean };
      if (!jwtPayload.isAdmin) {
        return reply.status(403).send({ error: "Admin access required" });
      }

      const body = registerSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }

      try {
        const user = await createUser({
          ...body.data,
          avatarColor: body.data.avatarColor ?? randomAvatarColor(),
        });

        return reply.status(201).send({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isBot: user.isBot,
          isAdmin: user.isAdmin,
          avatarColor: user.avatarColor,
          createdAt: user.createdAt,
        });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          return reply.status(409).send({ error: "Username already taken" });
        }
        throw err;
      }
    }
  );
}
