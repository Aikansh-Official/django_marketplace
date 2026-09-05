import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  ArrowRight,
  ArrowLeft,
  Filter
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/marketplace/notifications/`);
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
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await axios.patch(`${API_BASE}/marketplace/notifications/${id}/read/`);
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
      await axios.post(`${API_BASE}/marketplace/notifications/read-all/`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all read', err);
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/marketplace/notifications/${id}/delete/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('Notification removed.');
    } catch (err) {
      console.error('Failed to delete notification', err);
      toast.error('Could not delete notification.');
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(`${API_BASE}/marketplace/notifications/clear-all/`);
      setNotifications([]);
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('All notifications cleared.');
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'BUY_REQUEST':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'REQUEST_ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REQUEST_REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ITEM_SOLD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getBadgeLabel = (type) => {
    switch (type) {
      case 'BUY_REQUEST':
        return 'Purchase Request';
      case 'REQUEST_ACCEPTED':
        return 'Deal Accepted';
      case 'REQUEST_REJECTED':
        return 'Declined';
      case 'ITEM_SOLD':
        return 'Sold Out';
      default:
        return 'Alert';
    }
  };

  const formatTime = (iso) => {
    if (!iso) return 'Recent';
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Marketplace
        </Link>
      </div>

      {/* Main Header Container */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Notifications Center
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-brand-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Real-time updates regarding student purchase requests, trade deals, and campus alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all shadow-2xs cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-brand-600" />
                Mark all read
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-rose-50 text-xs font-bold text-gray-600 hover:text-rose-600 transition-all shadow-2xs cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 pb-1">
          <div className="flex items-center gap-1 text-xs font-bold text-gray-400 mr-2 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </div>
          {[
            { key: 'ALL', label: `All Alerts (${notifications.length})` },
            { key: 'UNREAD', label: `Unread (${unreadCount})` },
            { key: 'TRADE', label: 'Purchase Requests & Deals' },
            { key: 'GENERAL', label: 'General Alerts' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.key
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-gray-50 border border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="bg-white border border-gray-200/90 rounded-xl p-16 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900">No notifications in this view</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {filter === 'UNREAD'
              ? "You're all caught up! There are no unread notifications right now."
              : 'You will receive real-time notifications when a student requests to purchase your item or accepts your request.'}
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              Explore Campus Marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkRead(notif.id)}
              className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !notif.is_read
                  ? 'bg-brand-50/25 border-brand-200 shadow-xs hover:border-brand-300'
                  : 'bg-white border-gray-200/90 hover:border-gray-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                  {getIcon(notif.notification_type)}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                        notif.notification_type
                      )}`}
                    >
                      {getBadgeLabel(notif.notification_type)}
                    </span>

                    <h4 className="font-extrabold text-sm text-gray-900">
                      {notif.title}
                    </h4>

                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatTime(notif.created_at)}
                    </span>

                    {notif.related_listing && (
                      <Link
                        to={`/listing/${notif.related_listing}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand-600 hover:text-brand-700 font-bold inline-flex items-center gap-1 transition-colors"
                      >
                        View Listing & Manage Deals <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(e, notif.id)}
                className="text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0 cursor-pointer"
                title="Delete alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
