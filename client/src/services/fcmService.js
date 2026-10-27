import React from 'react';
import toast from 'react-hot-toast';
import api from './api';
import { firebaseConfig, getFirebaseMessaging } from '../config/firebase';

const FCM_TOKEN_STORAGE_KEY = 'cxc_fcm_token';
let foregroundListenerInitialized = false;

/**
 * Checks if Notification and ServiceWorker APIs are supported by current browser
 */
export const isNotificationSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
};

/**
 * Returns current browser notification permission: 'granted' | 'denied' | 'default'
 */
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

/**
 * Registers the background Service Worker with Firebase configuration parameters
 */
export const registerServiceWorker = async () => {
  if (!isNotificationSupported()) return null;
  try {
    const params = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      authDomain: firebaseConfig.authDomain || '',
      projectId: firebaseConfig.projectId || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || ''
    }).toString();

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params}`,
      { scope: '/' }
    );
    return registration;
  } catch (error) {
    return null;
  }
};

/**
 * Requests user notification permission and registers FCM device token with Django backend
 */
export const requestNotificationPermissionAndRegister = async () => {
  if (!isNotificationSupported()) {
    return { success: false, reason: 'UNSUPPORTED' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'PERMISSION_DENIED', permission };
    }

    let swRegistration = await registerServiceWorker();
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      try {
        const readyRegistration = await navigator.serviceWorker.ready;
        if (readyRegistration) swRegistration = readyRegistration;
      } catch (_) {}
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      return { success: false, reason: 'MESSAGING_UNAVAILABLE' };
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
    }

    const { getToken } = await import('firebase/messaging');

    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration || undefined
    });

    if (token) {
      // Save locally
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

      // Register device token with Django backend
      await api.post('/marketplace/notifications/register-device/', {
        registration_id: token,
        device_type: 'WEB',
        device_name: `${navigator.platform || 'Desktop'} Web Browser`
      });
      return { success: true, token };
    }

    return { success: false, reason: 'TOKEN_EMPTY' };
  } catch (err) {
    let reason = err.message || 'REGISTRATION_ERROR';
    if (err.message && err.message.includes('missing-vapid-key')) {
      reason = 'MISSING_VAPID_KEY';
    }
    return { success: false, reason, originalError: err.message };
  }
};

/**
 * Triggers a native OS / browser notification if permission is granted
 */
export const triggerBrowserNotification = (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.png',
      badge: options.badge || '/favicon.png',
      tag: options.tag || 'cxc-native-alert',
      renotify: true,
      data: { link: options.link || '/notifications' }
    });

    notif.onclick = () => {
      window.focus();
      const target = options.link || '/notifications';
      if (window.location.pathname !== target) {
        window.location.href = target;
      }
      notif.close();
    };

    return notif;
  } catch (e) {
    return null;
  }
};

/**
 * Sets up foreground push listener to display real-time interactive toasts, update badge,
 * and dispatch native browser notification if user is tabbed away (hidden).
 */
export const setupForegroundNotifications = async () => {
  if (foregroundListenerInitialized || !isNotificationSupported()) return;

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;

    const { onMessage } = await import('firebase/messaging');

    onMessage(messaging, (payload) => {

      const title = payload.notification?.title || payload.data?.title || 'CampXChange Alert';
      const body = payload.notification?.body || payload.data?.body || 'New marketplace update.';
      const link = payload.data?.link || payload.data?.route || '/notifications';

      // 1. Dispatch custom event for navbar bell and list views to refresh
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: payload }));

      // 2. If tab is in background / user is browsing another window, trigger OS browser notification!
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        triggerBrowserNotification(title, { body, link });
      }

      // 3. Display interactive foreground toast using React.createElement (pure JS compatible)
      toast(
        (t) =>
          React.createElement(
            'div',
            {
              className: 'flex items-start gap-3 cursor-pointer py-1',
              onClick: () => {
                toast.dismiss(t.id);
                if (link) window.location.href = link;
              }
            },
            React.createElement(
              'div',
              { className: 'w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center flex-shrink-0 text-lg' },
              '🔔'
            ),
            React.createElement(
              'div',
              { className: 'flex-1 min-w-0' },
              React.createElement('p', { className: 'text-sm font-semibold text-slate-800 dark:text-slate-100 truncate' }, title),
              React.createElement('p', { className: 'text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5' }, body),
              link
                ? React.createElement(
                  'span',
                  { className: 'text-[11px] text-orange-500 font-medium inline-block mt-1 hover:underline' },
                  'Tap to view →'
                )
                : null
            )
          ),
        {
          duration: 6000,
          position: 'top-right',
          style: {
            background: 'var(--toast-bg, #1e293b)',
            color: '#f8fafc',
            border: '1px solid rgba(249, 115, 22, 0.25)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            padding: '12px'
          }
        }
      );
    });

    foregroundListenerInitialized = true;
  } catch (err) {
  }
};

/**
 * Sends a test push notification to verify browser notification delivery
 */
export const sendTestPushNotification = async () => {
  // Trigger backend test endpoint to test REAL FCM push dispatch
  try {
    const res = await api.post('/marketplace/notifications/test-push/', {
      title: 'CampXChange Live Alert',
      message: 'FCM push dispatched from Django backend to your device!',
      link: '/notifications'
    });

    if (res.data?.mode === 'FALLBACK_SIMULATED') {
      triggerBrowserNotification('⚠️ FCM Server Fallback', {
        body: 'Server running in Simulated mode (Firebase Admin key not loaded). Real push not sent.',
        link: '/notifications'
      });
    }
    return res.data;
  } catch (err) {
    // Fallback to local browser notification only if backend is unreachable
    triggerBrowserNotification('CampXChange Browser Alert', {
      body: 'Browser push notifications are enabled (local offline test).',
      link: '/notifications'
    });
    throw err;
  }
};

/**
 * Deactivates FCM device on logout
 */
export const unregisterFCMDevice = async () => {
  try {
    const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (token) {
      await api.post('/marketplace/notifications/unregister-device/', {
        registration_id: token
      });
      localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    }
  } catch (err) {
  }
};
