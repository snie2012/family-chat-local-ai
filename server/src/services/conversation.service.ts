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

const messageWithSenderSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  isStreaming: true,
  createdAt: true,
  sender: { select: userSelect },
};

export async function getUserConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: { select: userSelect } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: userSelect } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return conversations.map((c) => ({
    id: c.id,
    name: c.name,
    isGroup: c.isGroup,
    createdAt: c.createdAt,
    members: c.members.map((m) => m.user),
    lastMessage: c.messages[0] ?? null,
  }));
}

export async function getConversation(id: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id,
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: { select: userSelect } } },
    },
  });
}

export async function findOrCreateDM(userIdA: string, userIdB: string) {
  // Check if userIdB is a bot — if so, always create a new conversation
  const otherUser = await prisma.user.findUnique({ where: { id: userIdB }, select: { isBot: true } });
  if (!otherUser?.isBot) {
    // For human DMs, deduplicate: find an existing DM between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: userIdA } } },
          { members: { some: { userId: userIdB } } },
        ],
      },
      include: {
        members: { include: { user: { select: userSelect } } },
      },
    });

    if (existing && existing.members.length === 2) {
      return existing;
    }
  }

  return prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
    include: {
      members: { include: { user: { select: userSelect } } },
    },
  });
}

export async function createGroupConversation(
  name: string,
  memberIds: string[]
) {
  return prisma.conversation.create({
    data: {
      name,
      isGroup: true,
      members: {
        create: memberIds.map((userId) => ({ userId })),
      },
    },
    include: {
      members: { include: { user: { select: userSelect } } },
    },
  });
}

export async function isUserInConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const member = await prisma.conversationMember.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
  });
  return !!member;
}

export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  limit = 50
) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: items.reverse(),
    nextCursor: hasMore ? items[0].id : null,
  };
}
