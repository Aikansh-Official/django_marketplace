// Firebase Cloud Messaging Service Worker for CampusXChange
// Runs in the background to receive push alerts even when the app/tab is closed.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Initialize Firebase in Service Worker using same credentials from URL search params or fallback
const urlParams = new URL(location).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || '',
  authDomain: urlParams.get('authDomain') || '',
  projectId: urlParams.get('projectId') || '',
  storageBucket: urlParams.get('storageBucket') || '',
  messagingSenderId: urlParams.get('messagingSenderId') || '',
  appId: urlParams.get('appId') || ''
};

let firebaseInitialized = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Background push handler via Firebase SDK
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Background message received:', payload);
      const title = payload.notification?.title || payload.data?.title || 'CampusXChange Notification';
      const body = payload.notification?.body || payload.data?.body || 'You have a new update on CampusXChange.';
      const link = payload.data?.link || payload.data?.route || '/notifications';

      const notificationOptions = {
        body: body,
        icon: '/CampusXChange_Logo.webp',
        badge: '/favicon.png',
        data: { link: link },
        tag: payload.data?.type || 'cxc-notification',
        renotify: true,
        vibrate: [200, 100, 200]
      };

      self.registration.showNotification(title, notificationOptions);
    });

    firebaseInitialized = true;
  } catch (e) {
    console.warn('[firebase-messaging-sw.js] Firebase SDK init in SW skipped or failed:', e);
  }
}

// Fallback native push event listener (ONLY runs if Firebase SDK wasn't initialized, avoiding duplicate popups)
self.addEventListener('push', (event) => {
  if (firebaseInitialized || !event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || data.data?.title || 'CampusXChange Notification';
    const body = data.notification?.body || data.data?.body || '';
    const link = data.data?.link || data.data?.route || '/notifications';

    const options = {
      body: body,
      icon: '/CampusXChange_Logo.webp',
      badge: '/favicon.png',
      data: { link: link },
      tag: data.data?.type || 'cxc-push',
      renotify: true,
      vibrate: [150, 80, 150]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.debug('[firebase-messaging-sw.js] Raw push handled.');
  }
});

// Notification click event handler: Focus existing window or open target route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || '/notifications';
  const targetUrl = new URL(rawLink, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (let client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new browser window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
