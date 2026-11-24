// Firebase Cloud Messaging service worker. The client supplies its own Firebase
// web configuration in the registration URL; never fall back to another project.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || event.notification.data?.route || '/notifications';
  const target = new URL(rawLink, self.location.origin);
  // Notifications must not navigate an existing marketplace tab to another origin.
  const targetUrl = target.origin === self.location.origin ? target.href : new URL('/notifications', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          if ('navigate' in client) await client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    })
  );
});

// Register the click handler before importing Firebase so it is not overridden.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  firebase.messaging().onBackgroundMessage((payload) => {
    // Firebase itself displays messages containing a notification. Only show
    // data-only messages here, preventing duplicate alerts for the same push.
    if (payload.notification) return;
    const data = payload.data || {};
    return self.registration.showNotification(data.title || 'CampXChange Notification', {
      body: data.body || data.message || 'You have a new update on CampXChange.',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: data.type || data.tag || 'cxc-notification',
      data: { ...data, link: data.link || data.route || '/notifications' },
    });
  });
}
