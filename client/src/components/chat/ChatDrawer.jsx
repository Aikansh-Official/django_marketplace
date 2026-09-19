import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Send,
  X,
  ShieldCheck,
  Package,
  CheckCheck,
  MessageCircle,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSafeImageUrl } from '../../utils/imageUrl';

export default function ChatDrawer({
  listingId,
  peerId,
  peerName: initialPeerName,
  listingTitle: initialListingTitle,
  listingPrice: initialListingPrice,
  listingImage: initialListingImage,
  onClose
}) {
  const [messages, setMessages] = useState([]);
  const [listing, setListing] = useState(null);
  const [peer, setPeer] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const fetchChat = async (isBackground = false) => {
    if (!listingId || !peerId) return;
    try {
      const res = await api.get(`/marketplace/chat/${listingId}/${peerId}/`);
      setMessages(res.data.messages || []);
      if (res.data.listing) setListing(res.data.listing);
      if (res.data.peer) setPeer(res.data.peer);
      if (!isBackground) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      if (!isBackground) {
        console.error('Chat fetch error:', err);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchChat(false);
    const interval = setInterval(() => fetchChat(true), 3000);
    return () => clearInterval(interval);
  }, [listingId, peerId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/marketplace/chat/${listingId}/${peerId}/`, {
        message: text
      });
      setMessages((prev) => [...prev, res.data]);
      setInputMessage('');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send message.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const displayName = peer?.name || initialPeerName || 'Campus Student';
  const displayTitle = listing?.title || initialListingTitle || 'Listing Chat';
  const displayPrice = listing?.price || initialListingPrice;
  const displayImage = listing?.image || initialListingImage;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Full Backdrop covering entire window */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (True Full-Height Viewport Slide-In) */}
      <div
        className={`fixed inset-y-0 right-0 max-w-full flex z-[10000] transition-all duration-300 ${
          isFullScreen ? 'w-full' : 'w-full sm:w-[480px] md:w-[540px]'
        }`}
      >
        <aside
          className="w-full h-full bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-200"
          aria-label="Campus In-App Chat"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Warm Gradient & Controls */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs border border-brand-100">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-gray-900 truncate">{displayName}</h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Verified Campus Trader" />
                </div>
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-medium text-emerald-800">Campus Secure Chat</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFullScreen((prev) => !prev)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                title={isFullScreen ? 'Exit full screen' : 'Expand full screen'}
              >
                {isFullScreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Listing Snapshot Bar */}
          <div className="p-3 bg-brand-50/70 border-b border-brand-100 flex items-center justify-between gap-3 text-xs flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 border border-brand-200 flex items-center justify-center shadow-2xs relative">
                {displayImage ? (
                  <img
                    src={getSafeImageUrl(displayImage)}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full items-center justify-center bg-brand-50 text-brand-500 ${
                    displayImage ? 'hidden' : 'flex'
                  }`}
                >
                  <Package className="w-5 h-5 text-brand-500/70" />
                </div>
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-xs truncate max-w-[220px] sm:max-w-md">
                  {displayTitle}
                </h4>
                <div className="font-extrabold text-brand-600 text-[11px]">
                  {displayPrice ? `Rs ${displayPrice}` : 'Free Donation'}
                </div>
              </div>
            </div>

            {listingId && (
              <Link
                to={`/listing/${listingId}`}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 shrink-0 bg-white px-2.5 py-1.5 rounded-lg border border-brand-200 shadow-2xs transition-colors"
              >
                <span>View Listing</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* DPDP Act Safety Notice */}
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-1.5 text-[10px] text-emerald-900 flex items-center gap-1.5 flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              🔒 DPDP Act 2023 Protected: Phone numbers are kept private. Coordinate meetup safely in public campus areas.
            </span>
          </div>

          {/* Messages Stream Container (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gray-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Loading campus conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 space-y-2.5 p-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-xs">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">No messages yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Say hello, ask about the item condition, or coordinate a meetup spot like Uni-Mall or Library!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.is_mine;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-full`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-normal shadow-2xs leading-relaxed break-words whitespace-pre-wrap ${
                        isMine
                          ? 'bg-brand-500 text-white rounded-br-xs'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1">
                      <span>{formatTime(msg.created_at)}</span>
                      {isMine && <CheckCheck className="w-3.5 h-3.5 text-brand-500" />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer Footer - Always pinned at bottom */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message (Press Enter to send)..."
                className="flex-1 border border-gray-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none font-normal"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="h-11 px-4 sm:px-5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>,
    document.body
  );
}
