import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Send,
  X,
  ShieldCheck,
  Package,
  Clock,
  CheckCheck,
  AlertCircle,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
      {/* Drawer Header */}
      <div className="p-3.5 sm:p-4 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-white/20">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-sm text-white truncate">{displayName}</h3>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Campus Trader" />
            </div>
            <p className="text-[11px] text-gray-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Campus Secure Chat
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Listing Snapshot Bar */}
      <div className="p-2.5 bg-brand-50/80 border-b border-brand-100 flex items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded bg-white overflow-hidden shrink-0 border border-brand-200 flex items-center justify-center">
            {displayImage ? (
              <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-5 h-5 text-gray-300" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 text-xs truncate max-w-[200px] sm:max-w-[240px]">
              {displayTitle}
            </h4>
            <div className="font-black text-brand-700 text-[11px]">
              {displayPrice ? `Rs ${displayPrice}` : 'Free Donation'}
            </div>
          </div>
        </div>

        {listingId && (
          <Link
            to={`/listing/${listingId}`}
            className="text-[11px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 shrink-0 bg-white px-2 py-1 rounded border border-brand-200 shadow-2xs"
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* DPDP Act 2023 Safety Notice */}
      <div className="bg-amber-50/70 border-b border-amber-200/70 px-3 py-1.5 text-[10px] text-amber-900 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span className="truncate">
          🔒 DPDP Act 2023 protected: Phone numbers are kept private. Meet in Uni-Mall/Library for exchange.
        </span>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Loading campus conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center text-gray-500 space-y-2.5 p-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-xs text-gray-800">No messages yet</p>
              <p className="text-[11px] text-gray-500 mt-0.5 max-w-[220px]">
                Say hello, ask about the item condition, or coordinate a meetup spot on campus!
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
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs font-normal shadow-2xs leading-relaxed break-words whitespace-pre-wrap ${
                    isMine
                      ? 'bg-brand-500 text-white rounded-br-xs'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                  }`}
                >
                  {msg.message}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1">
                  <span>{formatTime(msg.created_at)}</span>
                  {isMine && <CheckCheck className="w-3 h-3 text-brand-500" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Footer */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (Press Enter to send)..."
            className="flex-1 border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none font-normal"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || sending}
            className="h-10 px-3.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg font-bold text-xs disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            {sending ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
