import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";

export async function validateUser(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function createUser(data: {
  username: string;
  displayName: string;
  password: string;
  isAdmin?: boolean;
  avatarColor?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      username: data.username,
      displayName: data.displayName,
      passwordHash,
      isAdmin: data.isAdmin ?? false,
      avatarColor: data.avatarColor,
    },
  });
}

const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
