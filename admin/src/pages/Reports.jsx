import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle, Clock, Trash2, XCircle, ShieldCheck,
  Eye, EyeOff, UserX, AlertOctagon, Send, Search, Filter,
  ShieldAlert, Tag, Sparkles, RefreshCw, X, Check, Loader2,
  ExternalLink, User, MessageSquare, AlertCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Reports() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'banned_words'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING'); // 'PENDING', 'RESOLVED', 'DISMISSED', 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action States
  const [inspectingReport, setInspectingReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isWarningFormOpen, setIsWarningFormOpen] = useState(false);

  // Banned Words State
  const [bannedWords, setBannedWords] = useState([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [bannedWordsLoading, setBannedWordsLoading] = useState(false);
  const [testText, setTestText] = useState('');

  // Fetch Reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/reports/`);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports', err);
      toast.error('Failed to load user reports.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Banned Words
  const fetchBannedWords = async () => {
    setBannedWordsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/banned-words/`);
      setBannedWords(res.data.words || []);
    } catch (err) {
      console.error('Failed to load banned words', err);
    } finally {
      setBannedWordsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchBannedWords();
  }, []);

  // Execute Moderation Action
  const handleModerationAction = async (reportId, actionType, extraPayload = {}) => {
    setActionLoading(true);
    try {
      const res = await axios.patch(`${API_BASE}/marketplace/admin/reports/${reportId}/`, {
        action: actionType,
        ...extraPayload
      });

      toast.success(res.data?.message || `Action ${actionType} applied successfully.`);
      setIsWarningFormOpen(false);
      setWarningMessage('');
      setInspectingReport(null);
      fetchReports();
    } catch (err) {
      console.error('Moderation action failed', err);
      toast.error(err.response?.data?.error || 'Failed to apply moderation action.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Banned Words
  const handleSaveBannedWords = async (updatedList) => {
    setBannedWordsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/admin/banned-words/`, {
        words: updatedList
      });
      setBannedWords(res.data.words || []);
      toast.success('Banned keywords list updated!');
    } catch (err) {
      console.error('Failed to save banned words', err);
      toast.error('Failed to update banned words.');
    } finally {
      setBannedWordsLoading(false);
    }
  };

  // Add Banned Word(s)
  const handleAddBannedWords = (e) => {
    e.preventDefault();
    if (!newWordInput.trim()) return;
    const splitWords = newWordInput.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    const merged = Array.from(new Set([...bannedWords, ...splitWords]));
    handleSaveBannedWords(merged);
    setNewWordInput('');
  };

  // Remove Banned Word
  const handleRemoveBannedWord = (wordToRemove) => {
    const filtered = bannedWords.filter((w) => w !== wordToRemove);
    handleSaveBannedWords(filtered);
  };

  // Filter Reports by search and tab
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.listing_title?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.details?.toLowerCase().includes(q) ||
        r.reporter_username?.toLowerCase().includes(q) ||
        r.seller_username?.toLowerCase().includes(q) ||
        r.listing_seller?.toLowerCase().includes(q)
      );
    });
  }, [reports, filter, searchQuery]);

  // Test keyword matching
  const matchedTestWords = useMemo(() => {
    if (!testText.trim() || !bannedWords.length) return [];
    const lower = testText.toLowerCase();
    return bannedWords.filter((word) => {
      if (word.includes(' ')) return lower.includes(word);
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lower);
    });
  }, [testText, bannedWords]);

  // Report counts
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const dismissedCount = reports.filter((r) => r.status === 'DISMISSED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 rounded-lg text-red-600 border border-red-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Content Moderation & Reports</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Resolve community violation reports, issue seller warnings, enforce account suspensions, and manage banned keywords.
          </p>
        </div>

        {/* Tab Switch */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Moderation Queue</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('banned_words')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'banned_words'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Banned Keywords Engine</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODERATION QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Pending Review</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
              <span className="text-[10px] text-gray-400">Needs administrative action</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Resolved Violations</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</div>
              <span className="text-[10px] text-gray-400">Penalized or resolved</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Dismissed Reports</span>
              <div className="text-2xl font-black text-gray-600 mt-1">{dismissedCount}</div>
              <span className="text-[10px] text-gray-400">Marked safe / no violation</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Filed</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{reports.length}</div>
              <span className="text-[10px] text-gray-400">All lifetime reports</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search listing, reason, seller, reporter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              {[
                { key: 'PENDING', label: `Pending (${pendingCount})` },
                { key: 'RESOLVED', label: `Resolved (${resolvedCount})` },
                { key: 'DISMISSED', label: `Dismissed (${dismissedCount})` },
                { key: 'ALL', label: `All (${reports.length})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === tab.key
                      ? 'bg-ink-900 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Table */}
          {loading ? (
            <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white p-16 rounded-lg border border-gray-200 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">
                {filter === 'PENDING' ? 'All Clear! No Pending Reports' : 'No Reports Found'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {filter === 'PENDING'
                  ? 'All peer reports have been investigated and moderated.'
                  : 'There are no reports recorded matching your search filters.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Item & Reason</th>
                      <th className="py-3 px-4">Reported Seller</th>
                      <th className="py-3 px-4">Reporter</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-gray-900 truncate">
                            {report.listing_title || `Listing #${report.listing}`}
                          </div>
                          <div className="text-red-600 font-bold text-[11px] mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{report.reason}</span>
                          </div>
                          {report.details && (
                            <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-xs">
                              "{report.details}"
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">
                            @{report.seller_username || report.listing_seller || 'unknown'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Trust Score: {report.seller_trust_score ?? 'N/A'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">
                            @{report.reporter_username || 'anonymous'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {report.reporter_email || 'student'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              report.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : report.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-gray-500 whitespace-nowrap">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setInspectingReport(report);
                              setIsWarningFormOpen(false);
                            }}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-xs transition-colors shadow-xs"
                          >
                            Inspect & Moderate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BANNED KEYWORDS ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'banned_words' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Prohibited Words Dictionary</h2>
              <p className="text-xs text-gray-500 mt-1">
                Listings posted by students containing any of these keywords will be automatically hidden and flagged in the moderation queue.
              </p>
            </div>

            {/* Add Words Form */}
            <form onSubmit={handleAddBannedWords} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter prohibited word or comma-separated words (e.g. vape, weed, alcohol)..."
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={bannedWordsLoading || !newWordInput.trim()}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
              >
                Add Keyword(s)
              </button>
            </form>

            {/* Active Keywords Cloud */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Active Banned Words ({bannedWords.length})
                </span>
                <span className="text-[11px] text-gray-400">Click ‘×’ to remove a keyword</span>
              </div>

              {bannedWordsLoading ? (
                <div className="p-8 text-center text-xs text-gray-400">Updating keywords...</div>
              ) : bannedWords.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-lg text-center text-xs text-gray-500">
                  No prohibited words defined yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-gray-50/80 rounded-lg border border-gray-200">
                  {bannedWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white border border-gray-300 text-gray-800 shadow-xs hover:border-red-300 group"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBannedWord(word)}
                        className="text-gray-400 group-hover:text-red-600 transition-colors"
                        title="Remove word"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Live Keyword Tester */}
            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Live Keyword Screening Tester
                </h3>
              </div>
              <p className="text-[11px] text-gray-500">
                Type or paste test listing content below to verify how the auto-flagging engine evaluates it.
              </p>

              <textarea
                rows={2}
                placeholder="Type sample title or description (e.g. 'Selling my bicycle and vape pen in hostel room')..."
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />

              {testText.trim() && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    matchedTestWords.length > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {matchedTestWords.length > 0 ? (
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-bold">
                      {matchedTestWords.length > 0
                        ? `Auto-Flag Triggered! Matched keyword(s): ${matchedTestWords.join(', ')}`
                        : 'Content Safe — No prohibited keywords detected'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80 uppercase tracking-wider">
                    {matchedTestWords.length > 0 ? 'Would Be Hidden' : 'Would Be Published'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPORT DEEP INSPECTION & MODERATION ACTIONS */}
      {/* ========================================================================= */}
      {inspectingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Report #{inspectingReport.id} Investigation
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Filed on {new Date(inspectingReport.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    inspectingReport.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : inspectingReport.status === 'RESOLVED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {inspectingReport.status}
                </span>

                <button
                  onClick={() => setInspectingReport(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Left Column: Reported Item Preview */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Reported Marketplace Listing
                </h4>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                  {inspectingReport.listing_image_url ? (
                    <img
                      src={inspectingReport.listing_image_url}
                      alt="Listing Preview"
                      className="w-full h-40 object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                      No listing photo available
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-gray-900 text-sm">
                        {inspectingReport.listing_title || `Listing #${inspectingReport.listing}`}
                      </h5>
                      <span className="font-black text-brand-600 text-sm whitespace-nowrap">
                        ₹{inspectingReport.listing_price ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        Condition: {inspectingReport.listing_condition || 'N/A'}
                      </span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        Location: {inspectingReport.listing_location || 'Campus'}
                      </span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">
                        Status: {inspectingReport.listing_status || 'UNKNOWN'}
                      </span>
                    </div>

                    {inspectingReport.listing_description && (
                      <p className="text-gray-600 text-[11px] pt-2 border-t border-gray-100 line-clamp-3">
                        {inspectingReport.listing_description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Violation Details & Profiles */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Violation Context & Evidence
                </h4>

                {/* Reason Banner */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">
                    Report Reason:
                  </span>
                  <p className="font-bold text-red-900 text-xs mt-0.5">
                    {inspectingReport.reason}
                  </p>
                  {inspectingReport.details && (
                    <blockquote className="mt-2 text-xs text-red-800 bg-white/60 p-2.5 rounded border border-red-200/50 italic">
                      "{inspectingReport.details}"
                    </blockquote>
                  )}
                </div>

                {/* Seller Account Profile Card */}
                <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Reported Seller
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        @{inspectingReport.seller_username || inspectingReport.listing_seller}
                      </p>
                      <p className="text-[11px] text-gray-500">{inspectingReport.seller_email || 'No email'}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100 block">
                        Trust: {inspectingReport.seller_trust_score ?? 0}/100
                      </span>
                      <span
                        className={`text-[10px] font-bold mt-1 block ${
                          inspectingReport.seller_is_active === false ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {inspectingReport.seller_is_active === false ? 'Suspended / Banned' : 'Account Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reporter Profile */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Reported By
                  </span>
                  <p className="font-semibold text-gray-800">
                    @{inspectingReport.reporter_username} ({inspectingReport.reporter_email})
                  </p>
                </div>
              </div>
            </div>

            {/* Inline Warning Form if toggled */}
            {isWarningFormOpen && (
              <div className="px-6 py-4 bg-amber-50/70 border-t border-amber-200 space-y-2 text-xs">
                <label className="block font-bold text-amber-900">
                  Compose Official Warning to Seller @{inspectingReport.seller_username}:
                </label>
                <textarea
                  rows={2}
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder="Enter specific policy advisory for the student seller..."
                  className="w-full border border-amber-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWarningFormOpen(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded text-xs hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      handleModerationAction(inspectingReport.id, 'WARN_SELLER', {
                        warning_message: warningMessage
                      })
                    }
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition-colors flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send Warning Notice
                  </button>
                </div>
              </div>
            )}

            {/* Action Toolbar */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsWarningFormOpen(!isWarningFormOpen)}
                  className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Warn Seller
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleModerationAction(inspectingReport.id, 'HIDE_LISTING')}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold transition-colors flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5 text-gray-700" />
                  Hide Listing
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleModerationAction(inspectingReport.id, 'DELETE_LISTING')}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Delete Listing
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to suspend/ban student @${inspectingReport.seller_username}?`)) {
                      handleModerationAction(inspectingReport.id, 'BAN_SELLER');
                    }
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Ban Seller
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleModerationAction(inspectingReport.id, 'DISMISS')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold transition-colors"
                >
                  Dismiss Report
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleModerationAction(inspectingReport.id, 'RESOLVE')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
