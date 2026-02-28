import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createMessage } from "../services/message.service";
import { isUserInConversation } from "../services/conversation.service";
import { shouldBotRespond, handleBotResponse } from "../bot/bot";
import { prisma } from "../db/prisma";
import { FastifyInstance } from "fastify";

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
    displayName: string;
  };
}

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
      async ({
        conversationId,
        body,
      }: {
        conversationId: string;
        body: string;
      }) => {
        if (!body?.trim()) return;

        const isMember = await isUserInConversation(userId, conversationId);
        if (!isMember) {
          socket.emit("error", { code: "NOT_MEMBER", message: "Not a member of this conversation" });
          return;
        }

        // Save message to DB
        const message = await createMessage({
          conversationId,
          senderId: userId,
          body: body.trim(),
        });

        // Broadcast to all members in the room
        io.to(conversationId).emit("new_message", { message });

        // Check if bot should respond (non-blocking)
        const botShouldReply = await shouldBotRespond(conversationId, body);
        if (botShouldReply) {
          // Fire-and-forget bot response
          handleBotResponse(io, conversationId).catch((err) => {
            console.error("Bot handler error:", err);
          });
        }
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
