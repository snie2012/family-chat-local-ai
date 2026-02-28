import "dotenv/config";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { conversationRoutes } from "./routes/conversations";
import { settingsRoutes } from "./routes/settings";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  // CORS
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Rate limiting
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    skipOnError: true,
  });

  // JWT
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  // Decorate with authenticate helper
  app.decorate(
    "authenticate",
    async function (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({ error: "Unauthorized" });
      }
    }
  );

  // Serve built client (production)
  const clientDistPath = env.CLIENT_DIST_PATH
    ? path.resolve(env.CLIENT_DIST_PATH)
    : path.resolve(__dirname, "../../client/dist");

  if (fs.existsSync(clientDistPath)) {
    await app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: "/",
      index: "index.html",
    });
  }

  // Routes
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(conversationRoutes);
  await app.register(settingsRoutes);

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // SPA fallback: serve index.html for unknown non-API routes
  const apiPrefixes = ["/auth", "/users", "/conversations", "/settings", "/health", "/socket.io"];
  app.setNotFoundHandler(async (request, reply) => {
    const isApiRoute = apiPrefixes.some((p) => request.url.startsWith(p));
    if (!isApiRoute && fs.existsSync(clientDistPath)) {
      return reply.sendFile("index.html");
    }
    reply.status(404).send({ error: "Not found" });
  });

  return app;
}
