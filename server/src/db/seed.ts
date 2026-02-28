import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env } from "../config/env";

const BOT_USER_ID = "bot-ai-assistant";

async function main() {
  console.log("Seeding database...");

  // Create bot user
  const bot = await prisma.user.upsert({
    where: { id: BOT_USER_ID },
    update: {},
    create: {
      id: BOT_USER_ID,
      username: "ai",
      displayName: env.BOT_DISPLAY_NAME,
      isBot: true,
      avatarColor: "#6366f1",
    },
  });
  console.log(`Bot user: ${bot.displayName} (@${bot.username})`);

  // Create admin user
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { username: env.ADMIN_USERNAME },
    update: {},
    create: {
      username: env.ADMIN_USERNAME,
      displayName: env.ADMIN_DISPLAY_NAME,
      passwordHash,
      isAdmin: true,
      avatarColor: "#10b981",
    },
  });
  console.log(`Admin user: ${admin.displayName} (@${admin.username})`);

  console.log("Seed complete.");
  console.log(`\nLogin credentials:`);
  console.log(`  Username: ${env.ADMIN_USERNAME}`);
  console.log(`  Password: ${env.ADMIN_PASSWORD}`);
  console.log(`\nBot username: @${bot.username}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
