import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Package,
  CheckCheck,
  ArrowLeft,
  Clock,
  ExternalLink,
  Sparkles,
  Tag,
  AlertCircle,
  ShoppingBag,
  Repeat
} from 'lucide-react';
import { getSafeImageUrl } from '../utils/imageUrl';
import UniversalLoader from '../components/common/UniversalLoader';

export default function Messages() {
  const { listingId: routeListingId, peerId: routePeerId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null); // { listing_id, peer_id, peer_name, listing_title, listing_price, listing_image }
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch current user ID
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u?.id) setCurrentUserId(u.id);
      } catch (e) {}
    }
  }, []);

  // Fetch all user conversations
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await api.get('/marketplace/conversations/');
      const list = Array.isArray(res.data) ? res.data : [];
      setConversations(list);

      // If route params are present and no chat is selected, find or initialize it
      if (routeListingId && routePeerId && !selectedChat) {
        const matched = list.find(
          (c) =>
            String(c.listing_id) === String(routeListingId) &&
            String(c.peer_id) === String(routePeerId)
        );
        if (matched) {
          setSelectedChat(matched);
        } else {
          // If conversation is brand new, fetch listing info to populate header
          api
            .get(`/marketplace/listings/${routeListingId}/`)
            .then((listingRes) => {
              const item = listingRes.data;
              setSelectedChat({
                listing_id: routeListingId,
                peer_id: routePeerId,
                peer_name: 'Campus Student',
                listing_title: item.title,
                listing_price: item.price,
                listing_image: item.images?.[0]?.image_url
              });
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      if (!silent) console.error('Failed to load conversations', err);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations(false);
    const interval = setInterval(() => fetchConversations(true), 5000);
    return () => clearInterval(interval);
  }, [routeListingId, routePeerId]);

  // Fetch messages for selected chat
  const fetchMessages = async (silent = false) => {
    if (!selectedChat?.listing_id || !selectedChat?.peer_id) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(
        `/marketplace/chat/${selectedChat.listing_id}/${selectedChat.peer_id}/`
      );
      setMessages(res.data.messages || []);
      if (!silent) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      if (!silent) console.error('Failed to load messages', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedChat?.listing_id && selectedChat?.peer_id) {
      fetchMessages(false);
      const interval = setInterval(() => fetchMessages(true), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.listing_id, selectedChat?.peer_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSelectConversation = (conv) => {
    setSelectedChat(conv);
    navigate(`/messages/${conv.listing_id}/${conv.peer_id}`);
    // Clear unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c.listing_id === conv.listing_id && c.peer_id === conv.peer_id
          ? { ...c, unread_count: 0 }
          : c
      )
    );
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !selectedChat || sending) return;

    setSending(true);
    try {
      const res = await api.post(
        `/marketplace/chat/${selectedChat.listing_id}/${selectedChat.peer_id}/`,
        { message: text }
      );
      setMessages((prev) => [...prev, res.data]);
      setInputMessage('');
      setTimeout(scrollToBottom, 50);

      // Update last message in conversations list
      setConversations((prev) => {
        const existing = prev.find(
          (c) =>
            c.listing_id === selectedChat.listing_id &&
            c.peer_id === selectedChat.peer_id
        );
        if (existing) {
          return [
            {
              ...existing,
              last_message: text,
              last_message_time: new Date().toISOString()
            },
            ...prev.filter(
              (c) =>
                !(
                  c.listing_id === selectedChat.listing_id &&
                  c.peer_id === selectedChat.peer_id
                )
            )
          ];
        }
        return prev;
      });
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

  const handleQuickSuggestion = (text) => {
    setInputMessage(text);
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.peer_name || '').toLowerCase().includes(q) ||
      (c.listing_title || '').toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    );
  });

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatConvDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[5%] py-3 sm:py-6 animate-fade-in-up">
      {/* Container with Modern Shadow & Border */}
      <div className="bg-white border border-gray-200 rounded-md shadow-md overflow-hidden flex flex-col md:flex-row h-[84vh] min-h-[550px]">
        {/* ============================================================ */}
        {/* LEFT COLUMN: CONVERSATIONS INBOX LIST                         */}
        {/* ============================================================ */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col h-full bg-white ${
            selectedChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  Campus Messenger
                </h1>
                <p className="text-[11px] text-gray-500">
                  Student inquiries & product chats
                </p>
              </div>
            </div>
            <span className="bg-brand-50 text-brand-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-brand-200">
              {conversations.length} Active
            </span>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats, students, items..."
                className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 scrollbar-thin">
            {loadingConversations ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-2 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-md bg-brand-50 text-brand-500 flex items-center justify-center border border-brand-100">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800">No Messages Found</h4>
                <p className="text-xs text-gray-500 max-w-[200px]">
                  When buyers ask questions or negotiate on your listings, chats will appear here!
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected =
                  selectedChat &&
                  String(selectedChat.listing_id) === String(conv.listing_id) &&
                  String(selectedChat.peer_id) === String(conv.peer_id);

                return (
                  <button
                    key={`${conv.listing_id}-${conv.peer_id}`}
                    type="button"
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3 sm:p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/70 border-l-4 border-brand-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Product Image Thumbnail with Peer Avatar badge */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-200/90 overflow-hidden shadow-2xs flex items-center justify-center relative">
                        {conv.listing_image ? (
                          <img
                            src={getSafeImageUrl(conv.listing_image)}
                            alt={conv.listing_title}
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
                          className={`w-full h-full items-center justify-center bg-brand-50/70 text-brand-500 ${
                            conv.listing_image ? 'hidden' : 'flex'
                          }`}
                        >
                          <Package className="w-5 h-5 text-brand-500/70" />
                        </div>
                      </div>
                      {/* Floating Peer Avatar badge */}
                      <div
                        className="w-5 h-5 rounded-full bg-brand-500 text-white border-2 border-white text-[9px] font-black flex items-center justify-center absolute -bottom-1 -right-1 shadow-xs"
                        title={conv.peer_name}
                      >
                        {(conv.peer_name || 'U')[0].toUpperCase()}
                      </div>
                    </div>

                    {/* Chat Preview Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {conv.peer_name}
                        </h4>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {formatConvDate(conv.last_message_time)}
                        </span>
                      </div>

                      {/* Listing Reference Pill */}
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 bg-brand-50/80 px-2 py-0.5 rounded-md truncate max-w-fit mb-1 border border-brand-200/60">
                        <Tag className="w-3 h-3 flex-shrink-0 text-brand-500" />
                        <span className="truncate">{conv.listing_title}</span>
                      </div>

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 truncate">
                          {conv.last_message || 'Inquiry started...'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-brand-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full flex-shrink-0 shadow-2xs">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: ACTIVE CONVERSATION THREAD                      */}
        {/* ============================================================ */}
        <div
          className={`flex-1 flex flex-col h-full bg-gray-50/40 ${
            !selectedChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedChat ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shadow-2xs flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChat(null);
                      navigate('/messages');
                    }}
                    className="md:hidden p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {(selectedChat.peer_name || 'U')[0].toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-gray-900 truncate">
                        {selectedChat.peer_name}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Verified Campus Trader" />
                    </div>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active on Campus</span>
                    </p>
                  </div>
                </div>

                {/* Product Snapshot Bar inside Header */}
                <div className="flex items-center gap-2.5 bg-orange-50/50 border border-orange-200/80 px-3 py-1.5 rounded-md text-xs shrink-0 max-w-[220px] sm:max-w-xs hover:border-brand-300 transition-all shadow-2xs">
                  <div className="w-10 h-10 rounded-md bg-white overflow-hidden shrink-0 border border-brand-200/80 flex items-center justify-center relative shadow-2xs">
                    {selectedChat.listing_image ? (
                      <img
                        src={getSafeImageUrl(selectedChat.listing_image)}
                        alt={selectedChat.listing_title}
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
                        selectedChat.listing_image ? 'hidden' : 'flex'
                      }`}
                    >
                      <Package className="w-5 h-5 text-brand-500/70" />
                    </div>
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <h4 className="font-bold text-gray-900 text-xs truncate max-w-[130px]">
                      {selectedChat.listing_title}
                    </h4>
                    <span className="text-brand-600 font-extrabold text-xs">
                      Rs {selectedChat.listing_price}
                    </span>
                  </div>
                  <Link
                    to={`/listing/${selectedChat.listing_id}`}
                    className="text-brand-600 hover:text-brand-800 p-1.5 rounded-md hover:bg-brand-100/60 transition-colors ml-auto"
                    title="View listing details"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* DPDP Act 2023 Safety Notice Banner */}
              <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-1.5 text-[11px] text-emerald-900 flex items-center gap-2 flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">
                  🔒 DPDP Safe Campus Mode: Phone numbers are kept private. Inspect items physically in public areas like Uni-Mall or Central Library.
                </span>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-gray-50/60 scrollbar-thin">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading message history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 space-y-3 p-4">
                    <div className="w-14 h-14 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-xs">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Start the Conversation</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">
                        Discuss product condition, negotiate price, or coordinate pickup location on campus!
                      </p>
                    </div>

                    {/* Quick Suggested Messages */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-md">
                      <button
                        type="button"
                        onClick={() => handleQuickSuggestion('Hi, is this item still available?')}
                        className="bg-white hover:bg-brand-50 text-gray-700 hover:text-brand-600 text-xs px-3 py-1.5 rounded-full border border-gray-200 transition-colors shadow-2xs"
                      >
                        👋 Still available?
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSuggestion('Can we meet at Uni-Mall today?')}
                        className="bg-white hover:bg-brand-50 text-gray-700 hover:text-brand-600 text-xs px-3 py-1.5 rounded-full border border-gray-200 transition-colors shadow-2xs"
                      >
                        📍 Meet at Uni-Mall?
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSuggestion('Are you open to negotiation?')}
                        className="bg-white hover:bg-brand-50 text-gray-700 hover:text-brand-600 text-xs px-3 py-1.5 rounded-full border border-gray-200 transition-colors shadow-2xs"
                      >
                        🤝 Open to negotiation?
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.is_mine;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? 'items-end' : 'items-start'
                        } max-w-full`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-md text-xs sm:text-sm font-normal shadow-2xs leading-relaxed break-words whitespace-pre-wrap ${
                            isMine
                              ? 'bg-brand-500 text-white rounded-br-xs'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1">
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {isMine && <CheckCheck className="w-3.5 h-3.5 text-brand-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 bg-white border-t border-gray-200 flex-shrink-0"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message (Press Enter to send)..."
                    className="flex-1 border border-gray-300 rounded-md p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none font-normal"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || sending}
                    className="h-11 px-5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-md font-bold text-xs sm:text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Empty State when no chat is selected on desktop */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
              <div className="w-16 h-16 rounded-md bg-brand-50 text-brand-500 flex items-center justify-center border border-brand-100 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Select a Conversation
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Choose a student or product chat from the left panel to coordinate handover, negotiate prices, or answer questions!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
