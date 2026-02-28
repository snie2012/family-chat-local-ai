import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { getVapidPublicKey } from "../services/push.service";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function pushRoutes(app: FastifyInstance) {
  // Public: client fetches this to subscribe
  app.get("/push/public-key", async (_request, reply) => {
    const key = getVapidPublicKey();
    if (!key) return reply.status(503).send({ error: "Push not initialized" });
    return reply.send({ publicKey: key });
  });

  // Save a push subscription for the authenticated user
  app.post(
    "/push/subscribe",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const body = subscribeSchema.safeParse(request.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      await prisma.pushSubscription.upsert({
        where: { endpoint: body.data.endpoint },
        create: {
          userId,
          endpoint: body.data.endpoint,
          p256dh: body.data.keys.p256dh,
          auth: body.data.keys.auth,
        },
        update: {
          userId,
          p256dh: body.data.keys.p256dh,
          auth: body.data.keys.auth,
        },
      });
      return reply.status(204).send();
    }
  );

  // Remove a push subscription
  app.delete(
    "/push/unsubscribe",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const body = z.object({ endpoint: z.string() }).safeParse(request.body);
      if (!body.success) return reply.status(400).send({ error: "Missing endpoint" });

      await prisma.pushSubscription.deleteMany({
        where: { userId, endpoint: body.data.endpoint },
      });
      return reply.status(204).send();
    }
  );
}
