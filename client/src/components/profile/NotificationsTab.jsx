import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermissionAndRegister, sendTestPushNotification } from '../../services/fcmService';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  ShoppingBag,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function NotificationsTab({ onUnreadCountChange, onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [pushStatus, setPushStatus] = useState(() => getNotificationPermission());
  const [pushLoading, setPushLoading] = useState(false);

  const handleTestOrEnablePush = async () => {
    setPushLoading(true);
    try {
      if (pushStatus !== 'granted') {
        const res = await requestNotificationPermissionAndRegister();
        if (res.success) {
          setPushStatus('granted');
          toast.success('Device push notifications enabled!');
        } else {
          setPushStatus(getNotificationPermission());
          toast.error(res.reason || 'Could not enable notifications.');
        }
      } else {
        const res = await sendTestPushNotification();
        if (res?.mode === 'FALLBACK_SIMULATED') {
          toast.error('Server running in fallback mode (missing Firebase credentials). Real push not delivered.', { duration: 5000 });
        } else {
          toast.success('Test alert dispatched to registered devices! Check PC/phone notification tray.');
        }
      }
    } catch (err) {
      toast.error('Failed to trigger device test alert.');
    } finally {
      setPushLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/marketplace/notifications/');
      setNotifications(res.data);
      const unread = res.data.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/marketplace/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      const unread = notifications.filter((n) => n.id !== id && !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/marketplace/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
      toast.success('All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all read', err);
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/marketplace/notifications/${id}/delete/`);
      const updated = notifications.filter((n) => n.id !== id);
      setNotifications(updated);
      if (onUnreadCountChange) onUnreadCountChange(updated.filter((n) => !n.is_read).length);
      toast.success('Notification removed.');
    } catch (err) {
      console.error('Failed to delete notification', err);
      toast.error('Could not delete notification.');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/marketplace/notifications/clear-all/');
      setNotifications([]);
      if (onUnreadCountChange) onUnreadCountChange(0);
      toast.success('Notifications cleared.');
    } catch (err) {
      console.error('Failed to clear notifications', err);
      toast.error('Could not clear notifications.');
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'TRADE')
      return ['BUY_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'ITEM_SOLD'].includes(
        n.notification_type
      );
    if (filter === 'GENERAL') return n.notification_type === 'GENERAL';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'BUY_REQUEST':
        return <ShoppingBag className="w-5 h-5 text-brand-600" />;
      case 'REQUEST_ACCEPTED':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'REQUEST_REJECTED':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'ITEM_SOLD':
        return <Package className="w-5 h-5 text-purple-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatTime = (iso) => {
    if (!iso) return 'Recent';
    try {
      const date = new Date(iso);
      return (
        date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Notifications Center
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time updates on student purchase requests, responses, and trade status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5 text-brand-600" />
              Mark all as read
            </button>
          )}

          <button
            onClick={handleTestOrEnablePush}
            disabled={pushLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors shadow-2xs ${
              pushStatus === 'granted'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : pushStatus === 'denied'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
            title={pushStatus === 'granted' ? 'Click to send a test notification to your device' : 'Click to enable device push notifications'}
          >
            <Bell className="w-3.5 h-3.5" />
            {pushLoading
              ? 'Testing...'
              : pushStatus === 'granted'
              ? 'Test Device Alert'
              : pushStatus === 'denied'
              ? 'Push Blocked'
              : 'Enable Device Push'}
          </button>

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-red-50 text-xs font-semibold text-gray-600 hover:text-red-600 transition-colors shadow-2xs"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: 'Unread' },
          { key: 'TRADE', label: 'Purchase Requests & Deals' },
          { key: 'GENERAL', label: 'General' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex justify-center items-center py-16 bg-white rounded-md border border-gray-200">
          <div className="w-7 h-7 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="bg-white border border-gray-200/90 rounded-md p-12 text-center shadow-sm">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900">No notifications here</h3>
          <p className="text-xs text-gray-500 mt-1">
            You're all caught up with your campus alerts and messages.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkRead(notif.id)}
              className={`p-4 rounded-md border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !notif.is_read
                  ? 'bg-brand-50/30 border-brand-200 shadow-xs'
                  : 'bg-white border-gray-200/90 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(notif.notification_type)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-gray-900 truncate">
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(notif.created_at)}
                    </span>

                    {notif.related_listing && (
                      <Link
                        to={`/listing/${notif.related_listing}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand-600 font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        View Listing & Requests <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(e, notif.id)}
                className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors flex-shrink-0"
                title="Delete alert"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
