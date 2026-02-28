// Push notification service worker for Family Chat PWA

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Family Chat", body: event.data.text() };
  }

  const title = data.title || "Family Chat";
  const options = {
    body: data.body || "New message",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/" },
    tag: data.url || "family-chat",  // Replace older notifications for same conversation
    renotify: true,
  };

  event.waitUntil(
    // Only show notification if app is not in the foreground
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const appFocused = clientList.some((c) => c.focused);
        if (appFocused) return;
        return self.registration.showNotification(title, options);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(url);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
