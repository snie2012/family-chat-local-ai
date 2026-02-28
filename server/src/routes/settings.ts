import { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env";

// In-memory settings — survives for the lifetime of the server process.
// Flip thinkMode to true only for models that support it (qwen3, deepseek-r1, etc.)
export const botSettings = {
  thinkMode: false,
  model: env.OLLAMA_MODEL,
  systemPrompt: env.BOT_SYSTEM_PROMPT,
};

const patchSchema = z.object({
  thinkMode: z.boolean().optional(),
  model: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get(
    "/settings/bot",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { isAdmin } = request.user as { userId: string; isAdmin: boolean };
      if (!isAdmin) return reply.status(403).send({ error: "Admin only" });
      return reply.send({ ...botSettings });
    }
  );

  app.patch(
    "/settings/bot",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { isAdmin } = request.user as { userId: string; isAdmin: boolean };
      if (!isAdmin) return reply.status(403).send({ error: "Admin only" });

      const body = patchSchema.safeParse(request.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      if (body.data.thinkMode !== undefined) botSettings.thinkMode = body.data.thinkMode;
      if (body.data.model !== undefined) botSettings.model = body.data.model;
      if (body.data.systemPrompt !== undefined) botSettings.systemPrompt = body.data.systemPrompt;

      console.log(`[Settings] Bot settings updated:`, botSettings);
      return reply.send({ ...botSettings });
    }
  );
}
