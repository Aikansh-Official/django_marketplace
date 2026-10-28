/**
 * @deprecated Legacy offline store for mock campus notifications.
 * Production notifications are fully persisted in MongoDB via Django REST API
 * at `/api/marketplace/notifications/` with real-time FCM Push delivery.
 */
const NOTIFICATIONS_STORAGE_KEY = 'campxchange_notifications';
const LEGACY_NOTIFICATIONS_STORAGE_KEY = 'lputrade_notifications';

export const getNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || localStorage.getItem(LEGACY_NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const getUnreadNotificationCount = () => {
  const notifs = getNotifications();
  return notifs.filter((n) => !n.is_read).length;
};
