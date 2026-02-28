import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  isBot: true,
  isAdmin: true,
  avatarColor: true,
  createdAt: true,
};

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/users",
    { onRequest: [app.authenticate] },
    async (_request, reply) => {
      const users = await prisma.user.findMany({
        select: userSelect,
        orderBy: [{ isBot: "asc" }, { displayName: "asc" }],
      });
      return reply.send(users);
    }
  );

  app.get(
    "/users/me",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    }
  );
}
