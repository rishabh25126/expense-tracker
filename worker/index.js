self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || 'ExpenseAI';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: payload.url || '/',
    },
    tag: payload.tag || 'expense-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of allClients) {
      if ('focus' in client) {
        client.navigate(url);
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }
  })());
});
