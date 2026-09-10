import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Megaphone, Radio, Send, Bell, Users, ShieldAlert,
  AlertTriangle, CheckCircle2, Search, RefreshCw, Sparkles,
  ExternalLink, Clock, User, Phone, Mail, ArrowRight,
  ShieldCheck, Loader2, FileText, Check, Tag, Eye, Info
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('broadcast'); // 'broadcast' | 'direct' | 'history'

  // Stats State
  const [stats, setStats] = useState({
    total_broadcasts: 0,
    total_students_reached: 0,
    urgent_broadcasts: 0,
    direct_notices_sent: 0,
    audience_counts: { ALL: 0, SELLERS: 0, BUYERS: 0, UNVERIFIED: 0 }
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Broadcast Form State
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [broadcastPriority, setBroadcastPriority] = useState('NORMAL');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Direct Notice State
  const [studentSearch, setStudentSearch] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [directTitle, setDirectTitle] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [directPriority, setDirectPriority] = useState('HIGH');
  const [directLink, setDirectLink] = useState('');
  const [sendingDirect, setSendingDirect] = useState(false);

  // History State
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Quick Templates for Direct Notices
  const DIRECT_TEMPLATES = [
    {
      id: 'id_verify',
      label: '🪪 ID Card Re-upload',
      title: 'Action Required: Re-upload Student ID Card',
      message: 'Your uploaded student ID card image was blurry, expired, or unreadable. Please submit a clear photo of your official physical campus ID card in your profile to maintain your verified student status.',
      priority: 'HIGH',
      link: '/profile'
    },
    {
      id: 'policy_warn',
      label: '⚠️ Prohibited Item Notice',
      title: 'Official Notice: Listing Guidelines Violation',
      message: 'A listing on your account was flagged or hidden for violating campus marketplace safety policies. Repeated violations will result in account suspension and listing bans.',
      priority: 'HIGH',
      link: '/guidelines'
    },
    {
      id: 'dispute_check',
      label: '🤝 Trade Dispute Inquiry',
      title: 'Urgent: Campus Trade Dispute Resolution',
      message: 'A trade partner reported an unfulfilled handover agreement or exchange issue. Please check your active deals or visit the campus support helpdesk immediately.',
      priority: 'URGENT',
      link: '/profile'
    },
    {
      id: 'unresponsive',
      label: '⏳ Unresponsive Offer Reminder',
      title: 'Reminder: Pending Purchase Requests Awaiting Response',
      message: 'You have pending buyer purchase requests waiting for your response. Responding quickly helps keep your student Trust Score high.',
      priority: 'NORMAL',
      link: '/profile'
    }
  ];

  // Quick Titles for Broadcasts
  const BROADCAST_TEMPLATES = [
    {
      title: 'Hostel Clearance Sale Live! 🎒',
      message: 'The end-of-semester campus clearance sale is now live! List your textbooks, electronics, and room essentials before vacating your hostel.',
      link: '/sell',
      priority: 'NORMAL'
    },
    {
      title: 'Campus Marketplace Safety Advisory 🛡️',
      message: 'Always verify items in person at designated campus safe zones (BH/GH reception, Uni-Mall) and never share personal UPI OTPs or passwords.',
      link: '/guidelines',
      priority: 'NORMAL'
    },
    {
      title: 'Student ID Verification Drive 🪪',
      message: 'Get your Verified Student Badge today! Upload your physical student ID card to unlock seller capabilities and boost buyer trust.',
      link: '/profile',
      priority: 'HIGH'
    },
    {
      title: 'Urgent: Campus Handover Security Alert 🚨',
      message: 'Important security reminder: Only confirm deals using the 6-digit OTP PIN or QR scanner upon physical inspection and handover of goods.',
      link: '/notifications',
      priority: 'URGENT'
    }
  ];

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/notifications/stats/`);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch History Logs
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/broadcasts/`);
      setHistoryLogs(res.data);
    } catch (err) {
      console.error('Failed to load broadcast history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Search Students for Direct Message
  useEffect(() => {
    if (!studentSearch.trim() || studentSearch.length < 2) {
      setStudentResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await axios.get(`${API_BASE}/auth/users/?search=${encodeURIComponent(studentSearch.trim())}`);
        setStudentResults(res.data || []);
      } catch (err) {
        console.error('Student search failed', err);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Handle Broadcast Dispatch
  const handleDispatchBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error('Title and Message body are required.');
      return;
    }

    setDispatching(true);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/admin/broadcasts/`, {
        target_audience: targetAudience,
        priority: broadcastPriority,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        link: broadcastLink.trim()
      });

      toast.success(res.data.message || 'Campus broadcast dispatched successfully!');
      setConfirmModalOpen(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastLink('');
      fetchStats();
    } catch (err) {
      console.error('Broadcast failed', err);
      toast.error(err.response?.data?.error || 'Failed to dispatch broadcast.');
    } finally {
      setDispatching(false);
    }
  };

  // Handle Send Direct Notice
  const handleSendDirectNotice = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student recipient.');
      return;
    }
    if (!directTitle.trim() || !directMessage.trim()) {
      toast.error('Title and Message body are required.');
      return;
    }

    setSendingDirect(true);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/admin/direct-notice/`, {
        recipient_id: selectedStudent.id,
        title: directTitle.trim(),
        message: directMessage.trim(),
        priority: directPriority,
        link: directLink.trim()
      });

      toast.success(res.data.message || 'Official notice sent successfully!');
      setSelectedStudent(null);
      setStudentSearch('');
      setDirectTitle('');
      setDirectMessage('');
      setDirectLink('');
      fetchStats();
    } catch (err) {
      console.error('Direct notice failed', err);
      toast.error(err.response?.data?.error || 'Failed to send notice.');
    } finally {
      setSendingDirect(false);
    }
  };

  // Apply Quick Template for Direct Notice
  const applyDirectTemplate = (tmpl) => {
    setDirectTitle(tmpl.title);
    setDirectMessage(tmpl.message);
    setDirectPriority(tmpl.priority);
    setDirectLink(tmpl.link);
    toast.success(`Loaded template: ${tmpl.label}`);
  };

  // Apply Quick Template for Broadcast
  const applyBroadcastTemplate = (tmpl) => {
    setBroadcastTitle(tmpl.title);
    setBroadcastMessage(tmpl.message);
    setBroadcastPriority(tmpl.priority);
    setBroadcastLink(tmpl.link);
    toast.success('Applied announcement template!');
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyLogs;
    const q = historySearch.toLowerCase();
    return historyLogs.filter((log) =>
      log.title?.toLowerCase().includes(q) ||
      log.message?.toLowerCase().includes(q) ||
      log.target_audience?.toLowerCase().includes(q) ||
      log.sender_username?.toLowerCase().includes(q)
    );
  }, [historyLogs, historySearch]);

  const audienceLabel = (aud) => {
    switch (aud) {
      case 'SELLERS': return 'All Active Sellers';
      case 'BUYERS': return 'All Student Buyers';
      case 'UNVERIFIED': return 'Unverified Students';
      default: return 'All Registered Students';
    }
  };

  const recipientCountForAudience = stats.audience_counts[targetAudience] || 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
              <Megaphone className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Broadcast Notifications & Student Messaging</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Dispatch campus-wide announcements, target role-specific student cohorts, send urgent warnings, and issue direct administrative notices.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'broadcast'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-600" />
            <span>Campus Broadcast</span>
          </button>

          <button
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'direct'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-amber-600" />
            <span>Direct Notice</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-gray-600" />
            <span>Broadcast Logs</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Broadcasts</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.total_broadcasts}</div>
          <span className="text-[10px] text-gray-400">Campus-wide announcements</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Students Reached</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{stats.total_students_reached.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-gray-400">Cumulative notification deliveries</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Urgent Alerts</span>
          <div className="text-2xl font-black text-red-600 mt-1">{stats.urgent_broadcasts}</div>
          <span className="text-[10px] text-gray-400">Modal screen popups</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Direct Notices</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.direct_notices_sent}</div>
          <span className="text-[10px] text-gray-400">Individual student warnings</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPUS BROADCAST COMPOSER */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 Cols */}
          <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-600" />
                  Compose Broadcast Announcement
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Delivers in-app alerts directly to targeted students' notification centers.
                </p>
              </div>
            </div>

            {/* Quick Template Suggestion Chips */}
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Quick Announcement Starters
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BROADCAST_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyBroadcastTemplate(tmpl)}
                    className="px-2.5 py-1 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 border border-gray-200 rounded-md text-[11px] font-medium transition-colors"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience Picker */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Target Audience Cohort
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ALL', label: 'All Students', count: stats.audience_counts.ALL },
                  { id: 'SELLERS', label: 'Sellers Only', count: stats.audience_counts.SELLERS },
                  { id: 'BUYERS', label: 'Buyers Only', count: stats.audience_counts.BUYERS },
                  { id: 'UNVERIFIED', label: 'Unverified ID', count: stats.audience_counts.UNVERIFIED },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setTargetAudience(aud.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      targetAudience === aud.id
                        ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-bold block">{aud.label}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                      {aud.count} recipients
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Picker */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Announcement Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'NORMAL', label: 'Normal Priority', desc: 'Standard in-app bell notification' },
                  { id: 'HIGH', label: 'High Priority', desc: 'Highlighted alert in notification center' },
                  { id: 'URGENT', label: 'Urgent Critical', desc: 'Instant screen popup modal on next login' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBroadcastPriority(p.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      broadcastPriority === p.id
                        ? p.id === 'URGENT'
                          ? 'bg-red-50 border-red-500 text-red-900 font-bold'
                          : 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs block font-bold">{p.label}</span>
                    <span className="text-[10px] text-gray-500 leading-tight block mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Message */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. End of Semester Hostel Clearance Sale Is Live!"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Message Content (Markdown & Emojis supported)
                </label>
                <textarea
                  rows={5}
                  placeholder="Write clear announcement instructions or news for students..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Action Deep Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /my-listings, /profile, /sell, or https://campus.lpu.in"
                  value={broadcastLink}
                  onChange={(e) => setBroadcastLink(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Will be dispatched to <strong className="text-gray-900">{recipientCountForAudience} active students</strong>.
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                disabled={!broadcastTitle.trim() || !broadcastMessage.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Broadcast</span>
              </button>
            </div>
          </div>

          {/* Right Live Device Preview: 5 Cols */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  Live Student View Preview
                </span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                  Target: {targetAudience}
                </span>
              </div>

              {/* Simulated Notification Card */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  1. In-App Notification Center Card:
                </span>
                <div className={`p-4 rounded-lg border transition-all ${
                  broadcastPriority === 'URGENT'
                    ? 'border-l-4 border-l-red-600 bg-red-50/25 border-red-200'
                    : broadcastPriority === 'HIGH'
                    ? 'border-l-4 border-l-amber-500 bg-amber-50/15 border-amber-200'
                    : 'border-l-4 border-l-indigo-600 bg-white border-gray-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold">
                          Campus Broadcast
                        </span>
                        {broadcastPriority === 'URGENT' && (
                          <span className="px-2 py-0.2 bg-red-100 text-red-700 border border-red-300 rounded-full text-[10px] font-black animate-pulse">
                            URGENT
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">Just now</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">
                        {broadcastTitle || 'Announcement Title Preview'}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                        {broadcastMessage || 'Your message body preview will appear here as you type in the composer...'}
                      </p>
                      {broadcastLink && (
                        <div className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1">
                          <span>Action Link: {broadcastLink}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* If Urgent, also preview modal */}
                {broadcastPriority === 'URGENT' && (
                  <div className="pt-4 border-t border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-2 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      2. Critical Student Popup Modal Preview:
                    </span>
                    <div className="bg-white rounded-lg border-2 border-red-500 shadow-lg overflow-hidden">
                      <div className="bg-red-600 px-4 py-2 text-white flex items-center justify-between text-xs font-bold">
                        <span>CRITICAL CAMPUS NOTICE</span>
                        <span className="text-[10px] bg-red-800 px-1.5 py-0.2 rounded">POPUP</span>
                      </div>
                      <div className="p-4 space-y-2">
                        <h5 className="font-black text-sm text-gray-900">{broadcastTitle || 'Urgent Title'}</h5>
                        <p className="text-xs text-gray-600">{broadcastMessage || 'Urgent notification text'}</p>
                        <div className="pt-2">
                          <button type="button" className="w-full py-1.5 bg-gray-900 text-white rounded text-xs font-bold">
                            I Acknowledge & Understand
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DIRECT STUDENT MESSAGING */}
      {/* ========================================================================= */}
      {activeTab === 'direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                Dispatch Direct Student Notice / Warning
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Send an official administrative alert or compliance warning directly to a single registered student.
              </p>
            </div>

            {/* Quick Templates Selector */}
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Pre-Configured Administrative Templates
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DIRECT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyDirectTemplate(tmpl)}
                    className="p-2.5 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-gray-900 block">{tmpl.label}</span>
                    <span className="text-[10px] text-gray-500 block truncate mt-0.5">{tmpl.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Student Search & Select Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                Search & Select Student Recipient
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student by Reg No (e.g. 12104829), Name, or Email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {searchingStudents && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />
                )}
              </div>

              {/* Student Search Dropdown Results */}
              {studentResults.length > 0 && !selectedStudent && (
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white shadow-lg">
                  {studentResults.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        setSelectedStudent(st);
                        setStudentResults([]);
                        setStudentSearch(`${st.full_name || st.username} (@${st.username})`);
                      }}
                      className="p-2.5 hover:bg-amber-50/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="text-xs font-bold text-gray-900">{st.full_name || st.username}</span>
                        <div className="text-[10px] text-gray-500 font-mono">
                          @{st.username} • {st.email}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                        Trust: {st.trust_score}/100
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Card */}
            {selectedStudent && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-sm">
                    {selectedStudent.full_name?.[0] || selectedStudent.username?.[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">
                      {selectedStudent.full_name || selectedStudent.username}
                    </h4>
                    <p className="text-[10px] text-gray-600 font-mono">
                      @{selectedStudent.username} • {selectedStudent.email}
                    </p>
                    <span className="text-[10px] text-amber-800 font-semibold">
                      Role: {selectedStudent.role} • Trust Score: {selectedStudent.trust_score}/100
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch('');
                  }}
                  className="text-xs text-gray-400 hover:text-gray-700 font-bold underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Direct Notice Fields */}
            <form onSubmit={handleSendDirectNotice} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Notice Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['NORMAL', 'HIGH', 'URGENT'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDirectPriority(p)}
                      className={`py-1.5 rounded-md border text-xs font-bold transition-all ${
                        directPriority === p
                          ? p === 'URGENT'
                            ? 'bg-red-50 border-red-400 text-red-700'
                            : 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Notice Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official Warning: Marketplace Violation"
                  value={directTitle}
                  onChange={(e) => setDirectTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Official Warning / Notice Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail the compliance instructions or warning notice..."
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Deep Link Action (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /profile, /guidelines, or /my-listings"
                  value={directLink}
                  onChange={(e) => setDirectLink(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={sendingDirect || !selectedStudent || !directTitle.trim() || !directMessage.trim()}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {sendingDirect ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Deliver Official Notice</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Preview: 5 cols */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block border-b border-gray-100 pb-2">
                Recipient In-App View
              </span>
              <div className={`p-4 rounded-lg border ${
                directPriority === 'URGENT'
                  ? 'border-l-4 border-l-red-600 bg-red-50/25 border-red-200'
                  : 'border-l-4 border-l-amber-500 bg-amber-50/15 border-amber-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold">
                        Official Notice
                      </span>
                      {directPriority === 'URGENT' && (
                        <span className="px-2 py-0.2 bg-red-100 text-red-700 rounded text-[10px] font-black">
                          URGENT
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 leading-snug">
                      {directTitle || 'Official Notice Subject'}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                      {directMessage || 'Direct administrative notice preview will render here...'}
                    </p>
                    {directLink && (
                      <div className="mt-2 text-xs font-bold text-amber-700 flex items-center gap-1">
                        <span>Action: {directLink}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BROADCAST HISTORY & AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search history by title, audience, or keyword..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-semibold">Loading broadcast logs...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-20 text-center text-gray-400 space-y-2">
                <Megaphone className="w-12 h-12 text-gray-300 mx-auto stroke-[1.5]" />
                <p className="text-sm font-bold text-gray-700">No broadcast records found</p>
                <p className="text-xs text-gray-400">Past campus announcements will be logged here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Audience</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Announcement Details</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Dispatched By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                            {log.target_audience}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.priority === 'URGENT' ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-black animate-pulse">
                              URGENT
                            </span>
                          ) : log.priority === 'HIGH' ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                              HIGH
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                              NORMAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <h5 className="font-bold text-gray-900 truncate">{log.title}</h5>
                          <p className="text-gray-500 truncate text-[11px] mt-0.5">{log.message}</p>
                          {log.link && (
                            <span className="text-[10px] text-indigo-600 font-mono mt-0.5 block truncate">
                              Link: {log.link}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900">{log.recipients_count}</span> students
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                          @{log.sender_username || 'admin'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Campus Broadcast */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-gray-900">
                Confirm Campus Broadcast
              </h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You are about to dispatch this announcement to approximately{' '}
              <strong className="text-gray-900 font-bold">{recipientCountForAudience} active students</strong> with{' '}
              <strong className="text-indigo-600 font-bold">{broadcastPriority} priority</strong>.
            </p>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
              <div className="font-bold text-gray-900">{broadcastTitle}</div>
              <div className="text-gray-500 text-[11px] line-clamp-2">{broadcastMessage}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchBroadcast}
                disabled={dispatching}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {dispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Confirm & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
