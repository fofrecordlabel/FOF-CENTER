self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "alert") return;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.detail,
      icon: "/brand/bigdeucefof.png",
      data: { href: data.href || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/";
  event.waitUntil(clients.openWindow(new URL(href, self.location.origin).href));
});
