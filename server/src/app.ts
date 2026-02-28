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
import { pushRoutes } from "./routes/push";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  // Security headers
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  });

  // CORS — restrict to configured origin + localhost in dev
  const allowedOrigins = [
    env.ALLOWED_ORIGIN,
    env.NODE_ENV === "development" ? "http://localhost:8081" : null,
    env.NODE_ENV === "development" ? "http://localhost:3000" : null,
  ].filter(Boolean) as string[];

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some((o) => origin === o)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  });

  // Rate limiting — global default
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
  await app.register(pushRoutes);

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // SPA fallback: serve index.html for unknown non-API routes
  const apiPrefixes = ["/auth", "/users", "/conversations", "/settings", "/push", "/health", "/socket.io"];
  app.setNotFoundHandler(async (request, reply) => {
    const isApiRoute = apiPrefixes.some((p) => request.url.startsWith(p));
    if (!isApiRoute && fs.existsSync(clientDistPath)) {
      return reply.sendFile("index.html");
    }
    reply.status(404).send({ error: "Not found" });
  });

  return app;
}
