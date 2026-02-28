import webpush from "web-push";
import { prisma } from "../db/prisma";

// VAPID keys are auto-generated on first run and persisted in the Settings table
let vapidPublicKey = "";
let vapidPrivateKey = "";

export async function initPushService() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["vapidPublicKey", "vapidPrivateKey"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  if (map.vapidPublicKey && map.vapidPrivateKey) {
    vapidPublicKey = map.vapidPublicKey;
    vapidPrivateKey = map.vapidPrivateKey;
  } else {
    // Generate fresh VAPID keys and persist them
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    for (const entry of [
      { key: "vapidPublicKey", value: vapidPublicKey },
      { key: "vapidPrivateKey", value: vapidPrivateKey },
    ]) {
      await prisma.setting.upsert({
        where: { key: entry.key },
        create: entry,
        update: { value: entry.value },
      });
    }
    console.log("[Push] Generated new VAPID keys");
  }

  webpush.setVapidDetails(
    "mailto:admin@family-chat.local",
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log("[Push] Push service initialized");
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  if (!vapidPublicKey) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  const message = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      )
    )
  );

  // Clean up expired subscriptions (410 Gone)
  const expired: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expired.push(subscriptions[i].endpoint);
      }
    }
  });
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expired } },
    });
  }
}
