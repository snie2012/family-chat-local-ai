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

export async function createMessage(data: {
  conversationId: string;
  senderId: string;
  body: string;
  isStreaming?: boolean;
}) {
  return prisma.message.create({
    data: {
      conversationId: data.conversationId,
      senderId: data.senderId,
      body: data.body,
      isStreaming: data.isStreaming ?? false,
    },
    include: { sender: { select: userSelect } },
  });
}

export async function updateMessage(
  id: string,
  data: { body?: string; isStreaming?: boolean }
) {
  return prisma.message.update({
    where: { id },
    data,
    include: { sender: { select: userSelect } },
  });
}

export async function getRecentMessages(conversationId: string, limit = 20) {
  return prisma.message.findMany({
    where: { conversationId, isStreaming: false },
    include: { sender: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
