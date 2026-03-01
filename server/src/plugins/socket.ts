import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createMessage } from "../services/message.service";
import { isUserInConversation } from "../services/conversation.service";
import { shouldBotRespond, handleBotResponse } from "../bot/bot";
import { sendPushToUsers } from "../services/push.service";
import { prisma } from "../db/prisma";
import { FastifyInstance } from "fastify";

// Sliding-window rate limiter: max 10 messages per 5 seconds per user
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5000;
const messageTimes = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const times = (messageTimes.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (times.length >= RATE_LIMIT_MAX) return true;
  times.push(now);
  messageTimes.set(userId, times);
  return false;
}

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
    displayName: string;
  };
}

type SendMessageAck =
  | { ok: true; message: Record<string, unknown> }
  | { ok: false; error: string };

export function createSocketServer(
  httpServer: HttpServer,
  app: FastifyInstance
): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // JWT authentication middleware
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = app.jwt.verify(token) as {
        userId: string;
        isAdmin: boolean;
      };

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, displayName: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      (socket as AuthenticatedSocket).data = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
      };

      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    const { userId, displayName } = authedSocket.data;
    console.log(`[WS] Connected: ${displayName} (${userId})`);

    // Join a conversation room
    socket.on("join_room", async ({ conversationId }: { conversationId: string }) => {
      const isMember = await isUserInConversation(userId, conversationId);
      if (!isMember) {
        socket.emit("error", { code: "NOT_MEMBER", message: "Not a member of this conversation" });
        return;
      }
      socket.join(conversationId);
    });

    // Leave a conversation room
    socket.on("leave_room", ({ conversationId }: { conversationId: string }) => {
      socket.leave(conversationId);
    });

    // Send a message
    socket.on(
      "send_message",
      async (
        { conversationId, body }: { conversationId: string; body: string },
        ack?: (result: SendMessageAck) => void
      ) => {
        if (!body?.trim()) {
          ack?.({ ok: false, error: "Empty message" });
          return;
        }

        if (isRateLimited(userId)) {
          ack?.({ ok: false, error: "Rate limit exceeded. Slow down." });
          return;
        }

        const isMember = await isUserInConversation(userId, conversationId);
        if (!isMember) {
          socket.emit("error", { code: "NOT_MEMBER", message: "Not a member of this conversation" });
          ack?.({ ok: false, error: "Not a member" });
          return;
        }

        try {
          // Save message to DB
          const message = await createMessage({
            conversationId,
            senderId: userId,
            body: body.trim(),
          });

          // Broadcast to OTHER members in the room (exclude sender to avoid duplicate)
          socket.to(conversationId).emit("new_message", { message });

          // Acknowledge success to sender with the saved message so the client can
          // replace the optimistic message in-place (no duplicate, no race condition)
          ack?.({ ok: true, message: { ...message, reactions: [] } });

          // Push notifications to members who may be offline
          const members = await prisma.conversationMember.findMany({
            where: { conversationId },
            select: { userId: true },
          });
          const recipientIds = members
            .map((m) => m.userId)
            .filter((id) => id !== userId);
          if (recipientIds.length > 0) {
            sendPushToUsers(recipientIds, {
              title: displayName,
              body: message.body.slice(0, 100),
              url: `/conversation/${conversationId}`,
            }).catch(() => { /* non-critical */ });
          }

          // Check if bot should respond (non-blocking)
          const botShouldReply = await shouldBotRespond(conversationId, body);
          if (botShouldReply) {
            handleBotResponse(io, conversationId).catch((err) => {
              console.error("Bot handler error:", err);
            });
          }
        } catch (err) {
          console.error("send_message error:", err);
          ack?.({ ok: false, error: "Server error" });
        }
      }
    );

    // Toggle a reaction on a message
    socket.on(
      "toggle_reaction",
      async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
        if (!messageId || !emoji) return;

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { conversationId: true },
        });
        if (!message) return;

        const isMember = await isUserInConversation(userId, message.conversationId);
        if (!isMember) return;

        const existing = await prisma.messageReaction.findUnique({
          where: { messageId_userId_emoji: { messageId, userId, emoji } },
        });

        if (existing) {
          await prisma.messageReaction.delete({ where: { id: existing.id } });
        } else {
          await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
        }

        const reactions = await prisma.messageReaction.findMany({
          where: { messageId },
          select: { emoji: true, userId: true },
        });

        io.to(message.conversationId).emit("reaction_updated", { messageId, reactions });
      }
    );

    // Typing indicators
    socket.on("typing_start", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("user_typing", {
        userId,
        displayName,
        conversationId,
      });
    });

    socket.on("typing_stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("user_stopped_typing", {
        userId,
        conversationId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Disconnected: ${displayName} (${userId})`);
    });
  });

  return io;
}
