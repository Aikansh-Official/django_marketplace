import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Tag,
  Package,
  ShoppingBag,
  MessageSquare,
  Megaphone,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import api from '../../services/api';


export default function NotificationDropdown({ isOpen, onClose, unreadCount, onNotificationRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'OFFERS' | 'CHATS'

  const navigate = useNavigate();

  const fetchDropdownNotifications = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      let tabParam = '';
      if (activeTab === 'UNREAD') tabParam = '?tab=UNREAD';
      else if (activeTab === 'OFFERS') tabParam = '?tab=OFFERS';
      else if (activeTab === 'CHATS') tabParam = '?tab=CHATS';

      const res = await api.get(`/marketplace/notifications/${tabParam}`);
      setNotifications(Array.isArray(res.data) ? res.data.slice(0, 7) : []);
    } catch (err) {
      console.debug('Failed to load dropdown notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownNotifications();
  }, [isOpen, activeTab]);

  // Sync push permission state
  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, [isOpen]);

  const handleMarkRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.patch(`/marketplace/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event('notifications-updated'));
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/marketplace/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications-updated'));
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleItemClick = (notif) => {
    if (!notif.is_read) {
      handleMarkRead(notif.id);
    }
    onClose();

    const listingId = notif.listing || notif.related_listing;

    // Chat messages go to /messages
    if (notif.notification_type === 'NEW_CHAT_MESSAGE') {
      navigate('/messages');
      return;
    }

    // Direct seller/buyer notifications related to a listing directly to the listing page
    if (
      ['BUY_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'OFFER_COUNTERED', 'HANDOVER_READY', 'ITEM_SOLD', 'DEAL_CANCELLED'].includes(notif.notification_type) && 
      listingId
    ) {
      navigate(`/listing/${listingId}`);
      return;
    }

    // Default fallbacks
    if (notif.link && !notif.link.includes('/profile?tab=my-sales')) { 
       // Only use backend link if it's not the old buggy profile link, or just trust link if no listingId
      navigate(notif.link);
    } else if (listingId) {
      navigate(`/listing/${listingId}`);
    } else {
      navigate('/notifications');
    }
  };


  const getTypeIcon = (type) => {
    switch (type) {
      case 'BUY_REQUEST':
        return <ShoppingBag className="w-4 h-4 text-orange-500" />;
      case 'REQUEST_ACCEPTED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'REQUEST_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'OFFER_COUNTERED':
        return <Tag className="w-4 h-4 text-blue-500" />;
      case 'HANDOVER_READY':
        return <Package className="w-4 h-4 text-purple-500" />;
      case 'ITEM_SOLD':
        return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
      case 'NEW_CHAT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'BROADCAST':
        return <Megaphone className="w-4 h-4 text-brand-500" />;
      case 'DIRECT_WARNING':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="p-3.5 pb-2.5 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-brand-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Tab Filter Pills */}
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-100">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'UNREAD', label: 'Unread' },
          { key: 'OFFERS', label: 'Offers' },
          { key: 'CHATS', label: 'Chats' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${activeTab === tab.key
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            <span className="text-xs">Loading alerts...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2 text-lg">
              🎉
            </div>
            <p className="text-xs font-bold text-gray-800">You're all caught up!</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} notifications right now.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              className={`p-3 hover:bg-gray-50/90 transition-colors cursor-pointer flex items-start gap-2.5 relative group ${!notif.is_read ? 'bg-orange-50/30' : ''
                }`}
            >
              <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                {getTypeIcon(notif.notification_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-semibold truncate ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                    {notif.title}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">
                    {formatTimeAgo(notif.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                  {notif.message}
                </p>
              </div>

              {/* Unread indicator dot & mark read button */}
              {!notif.is_read && (
                <button
                  type="button"
                  onClick={(e) => handleMarkRead(notif.id, e)}
                  title="Mark as read"
                  className="opacity-80 group-hover:opacity-100 hover:scale-110 transition-all p-1"
                >
                  <span className="w-2 h-2 rounded-full bg-brand-500 block"></span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
        >
          <span>Open Full Notification Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
