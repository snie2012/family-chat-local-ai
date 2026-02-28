import { Platform } from "react-native";
import { api } from "./api";

// Convert a base64url VAPID public key to a Uint8Array for the browser API
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerPushNotifications(): Promise<void> {
  // Web only
  if (Platform.OS !== "web") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Register push service worker
    const registration = await navigator.serviceWorker.register("/push-sw.js", {
      scope: "/",
    });

    // Fetch VAPID public key from server
    const { data } = await api.get<{ publicKey: string }>("/push/public-key");
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const sub = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    // Save subscription to server
    await api.post("/push/subscribe", {
      endpoint: sub.endpoint,
      keys: sub.keys,
    });
  } catch (err) {
    // Non-critical — push notifications are optional
    console.warn("[Push] Registration failed:", err);
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (Platform.OS !== "web") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete("/push/unsubscribe", { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
    }
  } catch (err) {
    console.warn("[Push] Unregister failed:", err);
  }
}
