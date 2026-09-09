// Utility for managing campus notifications & trade alerts
const NOTIFICATIONS_STORAGE_KEY = 'campusxchange_notifications';
const LEGACY_NOTIFICATIONS_STORAGE_KEY = 'lputrade_notifications';

export const getNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || localStorage.getItem(LEGACY_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading notifications:', e);
    return [];
  }
};

export const addNotification = ({ type = 'TRADE', title, message, link, tab }) => {
  const notifs = getNotifications();
  const newNotif = {
    id: `notif-${Date.now()}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    is_read: false,
    link,
    tab
  };
  const updated = [newNotif, ...notifs];
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving notification:', e);
  }
  window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { notifications: updated } }));
  return newNotif;
};


export const getUnreadNotificationCount = () => {
  const notifs = getNotifications();
  return notifs.filter((n) => !n.is_read).length;
};

export const markNotificationAsRead = (id) => {
  const notifs = getNotifications();
  const updated = notifs.map((n) => (n.id === id ? { ...n, is_read: true } : n));
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating notifications:', e);
  }
  window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { notifications: updated } }));
  return updated;
};

export const markAllNotificationsAsRead = () => {
  const notifs = getNotifications();
  const updated = notifs.map((n) => ({ ...n, is_read: true }));
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating notifications:', e);
  }
  window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { notifications: updated } }));
  return updated;
};

export const deleteNotification = (id) => {
  const notifs = getNotifications();
  const updated = notifs.filter((n) => n.id !== id);
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting notification:', e);
  }
  window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { notifications: updated } }));
  return updated;
};

export const clearAllNotifications = () => {
  const updated = [];
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error clearing notifications:', e);
  }
  window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { notifications: updated } }));
  return updated;
};
