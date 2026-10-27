// Firebase Cloud Messaging Service Worker for CampXChange
// Handles background push alerts even when the website/tab is closed.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// 1. Resolve Firebase Configuration from URL query parameters (dynamically passed from client .env)
const urlParams = new URL(location).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || 'AIzaSyBE0mfGFWDldaexmetlxg2m9eLOVsLYNRY',
  authDomain: urlParams.get('authDomain') || 'campxchange-auth.firebaseapp.com',
  projectId: urlParams.get('projectId') || 'campxchange-auth',
  storageBucket: urlParams.get('storageBucket') || 'campxchange-auth.firebasestorage.app',
  messagingSenderId: urlParams.get('messagingSenderId') || '665608453808',
  appId: urlParams.get('appId') || '1:665608453808:web:d492284a5be72910a10575'
};

let firebaseInitialized = false;

// 2. Helper to reliably construct and display notification
function displayPushNotification(payload) {
  if (!payload) return Promise.resolve();

  const title = payload.notification?.title || payload.data?.title || 'CampXChange Notification';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new update on CampXChange.';
  const link = payload.data?.link || payload.data?.route || payload.fcmOptions?.link || '/notifications';
  const icon = payload.notification?.icon || '/favicon.png';
  const badge = '/favicon.png';
  const tag = payload.data?.type || payload.data?.tag || 'cxc-notification';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: badge,
    data: { 
      link: link,
      ...payload.data 
    },
    tag: tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(title, notificationOptions);
}

// 3. Initialize Firebase SDK inside Service Worker
try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Firebase background message handler (triggers for data-only FCM messages)
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] onBackgroundMessage received:', payload);
      displayPushNotification(payload);
    });

    firebaseInitialized = true;
  }
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Firebase SDK init fallback to native push:', e);
}

// 4. Native W3C Push Event Handler (Guaranteed delivery when tab/website is closed)
// Handles raw WebPush packets and ensures showNotification is ALWAYS called inside event.waitUntil
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received in background.');

  let payload = null;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      try {
        payload = { data: { message: event.data.text() } };
      } catch (_) {
        payload = {};
      }
    }
  }

  // Display notification via waitUntil to keep Service Worker alive until rendered
  if (payload) {
    event.waitUntil(displayPushNotification(payload));
  }
});

// 5. Notification Click Handler (Focus existing tab or open new window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || event.notification.data?.route || '/notifications';
  const targetUrl = new URL(rawLink, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing CampXChange tab if open
      for (let client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
