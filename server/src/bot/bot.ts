import { Server } from "socket.io";
import { prisma } from "../db/prisma";
import { streamChat } from "../services/llm.service";
import { createMessage, updateMessage, getRecentMessages } from "../services/message.service";
import { buildPrompt } from "./prompt";
import { isUserInConversation } from "../services/conversation.service";
import { botSettings } from "../routes/settings";

const BOT_USER_ID = "bot-ai-assistant";

export async function shouldBotRespond(
  conversationId: string,
  body: string
): Promise<boolean> {
  const botInConv = await isUserInConversation(BOT_USER_ID, conversationId);
  if (!botInConv) return false;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { isGroup: true },
  });
  if (!conversation) return false;

  // In DMs, always respond
  if (!conversation.isGroup) return true;

  // In group chats, respond only when @mentioned by display name or fallback aliases
  const botUser = await prisma.user.findUnique({
    where: { id: BOT_USER_ID },
    select: { displayName: true },
  });

  const lowerBody = body.toLowerCase();
  const botName = (botUser?.displayName ?? "AI Assistant").toLowerCase();

  return (
    lowerBody.includes(`@${botName}`) ||
    lowerBody.includes("@ai assistant") ||
    lowerBody.includes("@ai") ||
    lowerBody.includes("@bot")
  );
}

export async function handleBotResponse(
  io: Server,
  conversationId: string
): Promise<void> {
  try {
    const history = await getRecentMessages(conversationId, 20);
    const orderedHistory = [...history].reverse();

    const prompt = buildPrompt(
      orderedHistory.map((m) => ({
        body: m.body,
        sender: { displayName: m.sender.displayName, isBot: m.sender.isBot },
      }))
    );

    const botMessage = await createMessage({
      conversationId,
      senderId: BOT_USER_ID,
      body: "",
      isStreaming: true,
    });

    io.to(conversationId).emit("message_stream_start", {
      messageId: botMessage.id,
      conversationId,
      sender: botMessage.sender,
      thinkMode: botSettings.thinkMode,
    });

    let fullBody = "";
    for await (const chunk of streamChat(prompt, {
      think: botSettings.thinkMode,
      model: botSettings.model,
    })) {
      if (chunk.type === "thinking") {
        io.to(conversationId).emit("message_stream_think_chunk", {
          messageId: botMessage.id,
          chunk: chunk.content,
        });
      } else {
        fullBody += chunk.content;
        io.to(conversationId).emit("message_stream_chunk", {
          messageId: botMessage.id,
          chunk: chunk.content,
        });
      }
    }

    await updateMessage(botMessage.id, { body: fullBody, isStreaming: false });

    io.to(conversationId).emit("message_stream_end", {
      messageId: botMessage.id,
      body: fullBody,
    });
  } catch (error) {
    console.error("Bot response error:", error);
    io.to(conversationId).emit("bot_error", {
      message: "AI assistant is unavailable right now.",
    });
  }
}
