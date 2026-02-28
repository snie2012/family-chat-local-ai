import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getUserConversations,
  getConversation,
  findOrCreateDM,
  createGroupConversation,
  getConversationMessages,
} from "../services/conversation.service";

const createConvSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("dm"), otherUserId: z.string() }),
  z.object({
    type: z.literal("group"),
    name: z.string().min(1).max(64),
    memberIds: z.array(z.string()).min(2),
  }),
]);

export async function conversationRoutes(app: FastifyInstance) {
  app.get(
    "/conversations",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const conversations = await getUserConversations(userId);
      return reply.send(conversations);
    }
  );

  app.post(
    "/conversations",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const body = createConvSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }

      let conversation;
      if (body.data.type === "dm") {
        conversation = await findOrCreateDM(userId, body.data.otherUserId);
      } else {
        const memberIds = [...new Set([userId, ...body.data.memberIds])];
        conversation = await createGroupConversation(body.data.name, memberIds);
      }

      const formatted = {
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup,
        createdAt: conversation.createdAt,
        members: conversation.members.map((m) => m.user),
        lastMessage: null,
      };

      return reply.status(201).send(formatted);
    }
  );

  app.get(
    "/conversations/:id",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const conversation = await getConversation(id, userId);
      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }
      return reply.send({
        ...conversation,
        members: conversation.members.map((m) => m.user),
      });
    }
  );

  app.get(
    "/messages",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };
      const query = request.query as {
        conversationId?: string;
        cursor?: string;
        limit?: string;
      };

      if (!query.conversationId) {
        return reply.status(400).send({ error: "conversationId required" });
      }

      const conversation = await getConversation(query.conversationId, userId);
      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      const limit = Math.min(parseInt(query.limit ?? "50", 10), 100);
      const result = await getConversationMessages(
        query.conversationId,
        query.cursor,
        limit
      );

      return reply.send(result);
    }
  );
}
