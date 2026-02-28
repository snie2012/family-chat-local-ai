import { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

// In-memory settings — loaded from DB on startup, written back on change.
export const botSettings = {
  thinkMode: false,
  model: env.OLLAMA_MODEL,
  systemPrompt: env.BOT_SYSTEM_PROMPT,
};

export async function initBotSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["thinkMode", "model", "systemPrompt"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  if (map.thinkMode !== undefined) botSettings.thinkMode = map.thinkMode === "true";
  if (map.model !== undefined) botSettings.model = map.model;
  if (map.systemPrompt !== undefined) botSettings.systemPrompt = map.systemPrompt;
  console.log("[Settings] Bot settings loaded from DB:", botSettings);
}

async function persistBotSettings() {
  const entries = [
    { key: "thinkMode", value: String(botSettings.thinkMode) },
    { key: "model", value: botSettings.model },
    { key: "systemPrompt", value: botSettings.systemPrompt },
  ];
  for (const entry of entries) {
    await prisma.setting.upsert({
      where: { key: entry.key },
      create: entry,
      update: { value: entry.value },
    });
  }
}

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

      await persistBotSettings();
      console.log(`[Settings] Bot settings updated and persisted:`, botSettings);
      return reply.send({ ...botSettings });
    }
  );
}
