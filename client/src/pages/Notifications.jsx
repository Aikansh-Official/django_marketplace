import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Trash2,
  Package,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Tag,
  AlertCircle,
  Megaphone,
  ShieldAlert,
  Radio,
  AlertTriangle,
  MessageSquare,
  Search,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import UniversalLoader from '../components/common/UniversalLoader';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermissionAndRegister,
  sendTestPushNotification
} from '../services/fcmService';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pushPermission, setPushPermission] = useState(() => getNotificationPermission());
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/marketplace/notifications/');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
      toast.error('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    window.scrollTo(0, 0);

    // If permission is default, auto-request registration so FCM is enabled by default
    if (getNotificationPermission() === 'default' && localStorage.getItem('access')) {
      requestNotificationPermissionAndRegister()
        .then((res) => {
          if (res?.success) setPushPermission('granted');
        })
        .catch(() => {});
    }
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/marketplace/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/marketplace/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all read', err);
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    setDeleting(true);
    try {
      await api.delete(`/marketplace/notifications/${deleteModalId}/delete/`);
      setNotifications((prev) => prev.filter((n) => n.id !== deleteModalId));
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('Notification removed.');
      setDeleteModalId(null);
    } catch (err) {
      console.error('Failed to delete notification', err);
      toast.error('Could not delete notification.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      await api.delete('/marketplace/notifications/clear-all/');
      setNotifications([]);
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('All notifications cleared.');
      setClearAllModalOpen(false);
    } catch (err) {
      console.error('Failed to clear notifications', err);
      toast.error('Could not clear notifications.');
    } finally {
      setClearingAll(false);
    }
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    try {
      const res = await requestNotificationPermissionAndRegister();
      setPushPermission(getNotificationPermission());
      if (res.success) {
        toast.success('🔔 Web push alerts enabled! You will now receive instant trade notifications.');
      } else if (res.reason === 'PERMISSION_DENIED') {
        toast.error('Notification permission was blocked in browser settings. Please allow notifications for this site.');
      } else if (res.reason === 'MISSING_VAPID_KEY') {
        toast.error('VAPID Key missing in client/.env! Please configure VITE_FIREBASE_VAPID_KEY from Firebase Console.');
      } else {
        toast.error(res.reason || 'Could not register push notifications.');
      }
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingPush(true);
    try {
      const res = await sendTestPushNotification();
      if (res?.mode === 'FALLBACK_SIMULATED') {
        toast.success('Browser notification triggered! (Server FCM in Fallback Mode - service account key needed for live background push)');
      } else {
        toast.success('Test push notification sent successfully to your browser!');
      }
    } catch (err) {
      toast.success('Local test notification displayed! (Backend test push skipped or unavailable)');
    } finally {
      setIsTestingPush(false);
    }
  };

  // Metrics calculation
  const totalNotifications = notifications.length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const dealCount = notifications.filter((n) =>
    ['BUY_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'OFFER_COUNTERED', 'ITEM_SOLD', 'DEAL_CANCELLED', 'HANDOVER_READY'].includes(
      n.notification_type
    )
  ).length;
  const chatCount = notifications.filter((n) => n.notification_type === 'NEW_CHAT_MESSAGE').length;
  const broadcastCount = notifications.filter((n) =>
    ['BROADCAST', 'DIRECT_WARNING'].includes(n.notification_type) || n.priority === 'URGENT'
  ).length;

  // Filter list
  const filteredNotifications = notifications.filter((n) => {
    // Tab filter
    if (filter === 'UNREAD' && n.is_read) return false;
    if (filter === 'TRADE' && !['BUY_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'OFFER_COUNTERED', 'ITEM_SOLD', 'DEAL_CANCELLED', 'HANDOVER_READY'].includes(n.notification_type)) return false;
    if (filter === 'MESSAGES' && n.notification_type !== 'NEW_CHAT_MESSAGE') return false;
    if (filter === 'BROADCAST' && !['BROADCAST', 'DIRECT_WARNING'].includes(n.notification_type) && n.priority !== 'URGENT') return false;

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchListing = n.listing_title?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchListing) return false;
    }

    return true;
  });

  const getTypeBadge = (notif) => {
    const type = notif.notification_type;
    switch (type) {
      case 'NEW_CHAT_MESSAGE':
        return (
          <span className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <MessageSquare className="w-3 h-3 text-brand-600" />
            Product Inquiry
          </span>
        );
      case 'BROADCAST':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Megaphone className="w-3 h-3 text-indigo-600" />
            Campus Broadcast
          </span>
        );
      case 'DIRECT_WARNING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Official Notice
          </span>
        );
      case 'BUY_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Purchase Request
          </span>
        );
      case 'REQUEST_ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Deal Accepted
          </span>
        );
      case 'REQUEST_REJECTED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Declined
          </span>
        );
      case 'ITEM_SOLD':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Item Sold
          </span>
        );
      case 'DEAL_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-red-600" />
            Deal Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Bell className="w-3 h-3 text-blue-500" />
            Campus Alert
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'URGENT') {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          URGENT
        </span>
      );
    }
    if (priority === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
          HIGH
        </span>
      );
    }
    return null;
  };

  const getNotificationIcon = (type, priority) => {
    if (priority === 'URGENT') {
      return <AlertTriangle className="w-6 h-6 text-red-600 animate-bounce" />;
    }
    switch (type) {
      case 'NEW_CHAT_MESSAGE':
        return <MessageSquare className="w-6 h-6 text-brand-600" />;
      case 'BROADCAST':
        return <Megaphone className="w-6 h-6 text-indigo-600" />;
      case 'DIRECT_WARNING':
        return <ShieldAlert className="w-6 h-6 text-amber-600" />;
      case 'BUY_REQUEST':
        return <ShoppingBag className="w-6 h-6 text-amber-600" />;
      case 'REQUEST_ACCEPTED':
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      case 'REQUEST_REJECTED':
        return <XCircle className="w-6 h-6 text-rose-600" />;
      case 'ITEM_SOLD':
        return <Package className="w-6 h-6 text-purple-600" />;
      case 'DEAL_CANCELLED':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Bell className="w-6 h-6 text-blue-600" />;
    }
  };

  const formatTime = (iso) => {
    if (!iso) return 'Just now';
    try {
      const date = new Date(iso);
      return (
        date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' at ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] px-4 sm:px-6 lg:px-[5%] py-5 sm:py-7 animate-fade-in-up pb-12">
      {/* Top Banner - matching MyListings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6 pb-3.5 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Notifications
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Track student purchase requests, deal updates, and real-time campus activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-2 px-3.5 rounded-md transition-all shadow-xs hover:shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-brand-500" />
              Mark all as read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => setClearAllModalOpen(true)}
              className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold py-2 px-3.5 rounded-md transition-all shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Clear all alerts"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}

          {(() => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isSeller = currentUser.role === 'SELLER' || currentUser.is_id_verified;
            return isSeller ? (
              <Link
                to="/my-listings"
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-5 rounded-md transition-all shadow-md hover:shadow-lg text-xs flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <Package className="w-4 h-4" />
                My Listings
              </Link>
            ) : (
              <Link
                to="/profile?tab=orders-sells"
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-5 rounded-md transition-all shadow-md hover:shadow-lg text-xs flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <ShoppingBag className="w-4 h-4" />
                My Orders & Trades
              </Link>
            );
          })()}
        </div>
      </div>

      {/* Web Push Alerts Status & Toggle Banner */}
      {isNotificationSupported() && (
        <div className="mb-4 sm:mb-5 p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs bg-gradient-to-r from-orange-50/70 via-white to-amber-50/50 border-orange-200/70">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${pushPermission === 'granted'
              ? 'bg-emerald-500/15 text-emerald-600'
              : 'bg-orange-500/15 text-orange-600'
              }`}>
              {pushPermission === 'granted' ? '🔔' : '🔕'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  {pushPermission === 'granted' ? 'Real-Time Push Notifications Active' : 'Enable Web Push Alerts'}
                </span>
                <span className={`w-2 h-2 rounded-full ${pushPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                  }`} />
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {pushPermission === 'granted'
                  ? 'Your browser is linked to Firebase Cloud Messaging (FCM). You will receive instant alerts for offers, chats, and handovers.'
                  : 'Never miss an offer or chat ping! Receive native browser notifications even when CampusXChange is running in the background.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {pushPermission !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isEnablingPush}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isEnablingPush ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>Enable Push Alerts</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-300/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Push Active
                </span>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTestingPush}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Test sending a browser push notification"
                >
                  {isTestingPush ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <span>Test Alert</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4 mb-4 sm:mb-5">
        <div className="bg-white border border-gray-200 rounded-md p-3 sm:p-4 shadow-sm">
          <div className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Total Alerts
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{totalNotifications}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3 sm:p-4 shadow-sm">
          <div className="text-[10px] sm:text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
            Unread Alerts
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-brand-700 mt-1">{unreadCount}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3 sm:p-4 shadow-sm">
          <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Purchase Deals
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{dealCount}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3 sm:p-4 shadow-sm">
          <div className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Chat Messages
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{chatCount}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3 sm:p-4 shadow-sm">
          <div className="text-[10px] sm:text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Campus Broadcasts
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">{broadcastCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        {/* Filters Strip */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 touch-pan-x touch-momentum scrollbar-none">
          {[
            { key: 'ALL', label: `All (${totalNotifications})` },
            { key: 'UNREAD', label: `Unread (${unreadCount})` },
            { key: 'TRADE', label: `Deals & Offers (${dealCount})` },
            { key: 'MESSAGES', label: `Messages (${chatCount})` },
            { key: 'BROADCAST', label: `Broadcasts (${broadcastCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[38px] flex items-center justify-center shrink-0 ${filter === tab.key
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input Bar */}
        <div className="relative min-w-[220px] sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts by title or item..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-12">
          <UniversalLoader text="Loading notifications..." />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center shadow-sm animate-fade-in-up">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No notifications found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-6">
            {filter === 'UNREAD'
              ? "You're all caught up! You don't have any unread notifications."
              : "You don't have any notifications in this filter view."}
          </p>
          <Link
            to="/"
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-5 rounded-lg text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            Explore Campus Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in-up">
          {filteredNotifications.map((notif) => {
            const listingId = notif.listing || notif.related_listing;
            const isUrgent = notif.priority === 'URGENT';
            const isHigh = notif.priority === 'HIGH';

            return (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                className={`bg-white border rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-sm hover:border-gray-300 transition-all ${isUrgent
                  ? 'border-l-4 border-l-red-600 bg-red-50/20 border-red-200 shadow-md'
                  : isHigh
                    ? 'border-l-4 border-l-amber-500 bg-amber-50/15 border-amber-200'
                    : !notif.is_read
                      ? 'border-l-4 border-l-brand-500 border-gray-200 bg-brand-50/15'
                      : 'border-gray-200'
                  }`}
              >
                {/* Left Section: Image/Icon + Title + Message + Meta */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                    {notif.listing_image ? (
                      <img
                        src={notif.listing_image}
                        alt={notif.listing_title || notif.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        {getNotificationIcon(notif.notification_type, notif.priority)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(notif)}
                      {getPriorityBadge(notif.priority)}
                      {!notif.is_read && (
                        <span className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                          New
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatTime(notif.created_at)}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-gray-900 leading-snug">
                      {notif.title}
                    </h4>

                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                      {notif.message}
                    </p>

                    {/* Action link or Listing link */}
                    {listingId ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 pt-0.5">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Tag className="w-3 h-3 text-brand-500" />
                          Listing:
                        </span>
                        <Link
                          to={`/listing/${listingId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-gray-900 hover:text-brand-600 truncate max-w-xs transition-colors inline-flex items-center gap-1"
                        >
                          {notif.listing_title || 'View Listing Details'}
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </Link>
                      </div>
                    ) : notif.link ? (
                      <div className="pt-1">
                        <a
                          href={notif.link}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          <span>Open Notice Action Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right Actions - matching MyListings action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 self-end md:self-center flex-shrink-0">
                  {notif.notification_type === 'NEW_CHAT_MESSAGE' && (
                    <Link
                      to="/messages"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.is_read) handleMarkRead(notif.id);
                      }}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Reply in Messenger
                    </Link>
                  )}

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notif.id);
                      }}
                      className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-600 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Mark as Read"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
                      Mark Read
                    </button>
                  )}

                  {listingId && (
                    <Link
                      to={`/listing/${listingId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-600 p-2 rounded-md transition-colors inline-flex items-center justify-center"
                      title="View Listing"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalId(notif.id);
                    }}
                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 p-2 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Notification Modal - Portal to document.body for full-screen coverage */}
      {deleteModalId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900">Delete notification?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This notification will be permanently removed from your alerts.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalId(null)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-md font-medium text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Clear All Notifications Modal - Portal to document.body for full-screen coverage */}
      {clearAllModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900">Clear all notifications?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  All notifications will be deleted. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClearAllModalOpen(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-md font-medium text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={clearingAll}
                  onClick={handleClearAll}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {clearingAll ? 'Clearing...' : 'Clear All'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
