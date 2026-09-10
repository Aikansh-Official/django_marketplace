import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Handshake, Search, RefreshCw, Download, Eye, AlertTriangle,
  CheckCircle2, XCircle, Clock, ShieldCheck, User, Phone,
  Mail, MapPin, Tag, ArrowRight, DollarSign, Key, ShieldAlert,
  Loader2, Copy, Check, ExternalLink, AlertOctagon, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inspector & Intervention Modal
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [interventionReason, setInterventionReason] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);

  // Fetch all deals
  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/deals/`);
      setDeals(res.data);
      // If a deal is currently open in modal, refresh its state
      if (selectedDeal) {
        const updated = res.data.find((d) => d.id === selectedDeal.id);
        if (updated) setSelectedDeal(updated);
      }
    } catch (err) {
      console.error('Failed to fetch deals', err);
      toast.error('Failed to load campus deals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Filter deals by status and search query
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (statusFilter !== 'ALL' && deal.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        deal.id?.toString().includes(q) ||
        deal.listing_title?.toLowerCase().includes(q) ||
        deal.listing_location?.toLowerCase().includes(q) ||
        deal.buyer_username?.toLowerCase().includes(q) ||
        deal.buyer_full_name?.toLowerCase().includes(q) ||
        deal.buyer_email?.toLowerCase().includes(q) ||
        deal.seller_username?.toLowerCase().includes(q) ||
        deal.seller_full_name?.toLowerCase().includes(q) ||
        deal.seller_email?.toLowerCase().includes(q) ||
        deal.active_handover?.pin_code?.includes(q) ||
        deal.latest_handover?.pin_code?.includes(q)
      );
    });
  }, [deals, statusFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = deals.length;
    const accepted = deals.filter((d) => d.status === 'ACCEPTED').length;
    const completed = deals.filter((d) => d.status === 'COMPLETED').length;
    const cancelled = deals.filter((d) => d.status === 'CANCELLED').length;
    const pending = deals.filter((d) => d.status === 'PENDING').length;
    
    // Total completed GMV
    const totalGmv = deals
      .filter((d) => d.status === 'COMPLETED')
      .reduce((sum, d) => sum + parseFloat(d.offer_amount || 0), 0);

    return { total, accepted, completed, cancelled, pending, totalGmv };
  }, [deals]);

  // Handle Administrative Intervention (Force Cancel / Force Complete)
  const handleAdminIntervention = async (actionType) => {
    if (!selectedDeal) return;
    setActionLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/marketplace/admin/deals/${selectedDeal.id}/action/`, {
        action: actionType,
        reason: interventionReason.trim()
      });

      toast.success(res.data.message || `Action ${actionType} completed successfully.`);
      setShowCancelPrompt(false);
      setShowCompletePrompt(false);
      setInterventionReason('');
      
      // Update local state with the returned updated deal
      if (res.data.deal) {
        setSelectedDeal(res.data.deal);
      }
      fetchDeals();
    } catch (err) {
      console.error(`Intervention ${actionType} failed`, err);
      toast.error(err.response?.data?.error || `Failed to execute ${actionType}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Copy PIN to clipboard
  const handleCopyPin = (pin) => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    toast.success(`PIN ${pin} copied!`);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Export Deals to CSV
  const handleExportCSV = () => {
    if (!filteredDeals.length) {
      toast.error('No deals to export.');
      return;
    }

    const headers = [
      'Deal ID',
      'Created Date',
      'Listing Title',
      'Listing Price (Rs)',
      'Agreed Price (Rs)',
      'Deal Status',
      'Buyer Reg No',
      'Buyer Name',
      'Buyer Email',
      'Seller Reg No',
      'Seller Name',
      'Seller Email',
      'Handover Status',
      'Handover PIN',
      'Meetup Location'
    ];

    const rows = filteredDeals.map((d) => [
      d.id,
      new Date(d.created_at).toISOString().split('T')[0],
      `"${(d.listing_title || '').replace(/"/g, '""')}"`,
      d.listing_price || 0,
      d.offer_amount || 0,
      d.status,
      d.buyer_username,
      `"${(d.buyer_full_name || '').replace(/"/g, '""')}"`,
      d.buyer_email,
      d.seller_username,
      `"${(d.seller_full_name || '').replace(/"/g, '""')}"`,
      d.seller_email,
      d.latest_handover?.status || 'NONE',
      d.latest_handover?.pin_code || 'N/A',
      `"${(d.listing_location || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `campusxchange_deals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Deals CSV report exported successfully!');
  };

  // Status Badge Renderer
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            In Handover
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Cancelled
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Pending Response
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle className="w-3 h-3 text-gray-500" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600 border border-brand-100">
              <Handshake className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Campus Deals & QR Handovers</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Supervise all peer-to-peer offers, verify 6-digit handover OTP PINs, resolve campus disputes, and enforce transaction resolutions.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={fetchDeals}
            disabled={loading}
            className="px-3.5 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh Deals"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Deals</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</div>
          <span className="text-[10px] text-gray-400">All student requests</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">In Handover</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{metrics.accepted}</div>
          <span className="text-[10px] text-gray-400">Active QR / OTP PINs</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Completed Deals</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{metrics.completed}</div>
          <span className="text-[10px] text-gray-400">Exchanged & Verified</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Cancelled / Disputed</span>
          <div className="text-2xl font-black text-red-600 mt-1">{metrics.cancelled}</div>
          <span className="text-[10px] text-gray-400">Voided or Intervened</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Trade Volume</span>
          <div className="text-2xl font-black text-brand-600 mt-1">₹{metrics.totalGmv.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-gray-400">Verified exchange value</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Deal ID, Item Title, Buyer/Seller Reg No, or PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Tab Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs shrink-0">
            {[
              { id: 'ALL', label: 'All Deals', count: deals.length },
              { id: 'ACCEPTED', label: 'In Handover', count: metrics.accepted },
              { id: 'COMPLETED', label: 'Completed', count: metrics.completed },
              { id: 'PENDING', label: 'Pending', count: metrics.pending },
              { id: 'CANCELLED', label: 'Cancelled', count: metrics.cancelled },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Deals Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-xs font-semibold">Loading campus deal transactions...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-2">
            <Handshake className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <p className="text-sm font-bold text-gray-700">No deals found</p>
            <p className="text-xs text-gray-400 max-w-sm text-center">
              {searchQuery ? 'No deals match your search query.' : 'There are currently no deals in this status category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Deal ID</th>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Price / Agreed</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Handover State / PIN</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredDeals.map((deal) => {
                  const handover = deal.active_handover || deal.latest_handover;
                  const isDiscounted = parseFloat(deal.offer_amount) < parseFloat(deal.listing_price);

                  return (
                    <tr key={deal.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Deal ID */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-600">
                        #{deal.id}
                        <div className="text-[10px] font-sans font-normal text-gray-400">
                          {new Date(deal.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>

                      {/* Listing Title & Image */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                            {deal.listing_image ? (
                              <img
                                src={deal.listing_image}
                                alt={deal.listing_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Tag className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate" title={deal.listing_title}>
                              {deal.listing_title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded font-medium">
                                {deal.listing_category || 'Item'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5" />
                                {deal.listing_location || 'Campus'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Agreed Price vs Listed Price */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">
                          ₹{parseFloat(deal.offer_amount || 0).toLocaleString('en-IN')}
                        </div>
                        {isDiscounted ? (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                            <span className="line-through text-gray-400">₹{deal.listing_price}</span>
                            <span>(-₹{parseFloat(deal.listing_price) - parseFloat(deal.offer_amount)})</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 font-medium">
                            Listed at ₹{deal.listing_price}
                          </div>
                        )}
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{deal.buyer_full_name || deal.buyer_username}</span>
                          {deal.buyer_is_verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Verified Student" />
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          @{deal.buyer_username} • Trust: {deal.buyer_trust_score}/100
                        </div>
                      </td>

                      {/* Seller */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{deal.seller_full_name || deal.seller_username}</span>
                          {deal.seller_is_verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Verified Student" />
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          @{deal.seller_username} • Trust: {deal.seller_trust_score}/100
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(deal.status)}
                      </td>

                      {/* Handover State & PIN */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {deal.status === 'ACCEPTED' && handover ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-900 text-white rounded font-mono font-bold text-xs tracking-wider">
                              <Key className="w-3 h-3 text-amber-400" />
                              PIN: {handover.pin_code}
                            </span>
                            {handover.status === 'ACTIVE' ? (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                Live QR active
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">
                                Session: {handover.status}
                              </span>
                            )}
                          </div>
                        ) : deal.status === 'COMPLETED' ? (
                          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Exchange Verified
                          </div>
                        ) : deal.status === 'CANCELLED' ? (
                          <div className="text-[11px] text-gray-400 font-medium">
                            Cancelled / Void
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-400 italic">
                            Awaiting QR
                          </div>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedDeal(deal);
                            setShowCancelPrompt(false);
                            setShowCompletePrompt(false);
                            setInterventionReason('');
                          }}
                          className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto border border-gray-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Deal</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DEAL INSPECTOR & ADMINISTRATIVE INTERVENTION MODAL */}
      {/* ========================================================================= */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/75">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-lg border border-brand-100">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-gray-900">
                      Deal #{selectedDeal.id} Supervision
                    </h2>
                    {renderStatusBadge(selectedDeal.status)}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Initiated on {new Date(selectedDeal.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDeal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Item Card + Financial Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-white overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center shadow-xs">
                    {selectedDeal.listing_image ? (
                      <img
                        src={selectedDeal.listing_image}
                        alt={selectedDeal.listing_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tag className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      {selectedDeal.listing_title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-white rounded border border-gray-200 font-medium">
                        {selectedDeal.listing_category || 'General'}
                      </span>
                      <span>•</span>
                      <span>Condition: <strong className="text-gray-700">{selectedDeal.listing_condition}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {selectedDeal.listing_location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price & Savings Pill */}
                <div className="bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-xs text-right self-stretch md:self-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Agreed Purchase Price
                  </span>
                  <div className="text-xl font-black text-gray-900">
                    ₹{parseFloat(selectedDeal.offer_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Original Asking: ₹{selectedDeal.listing_price}
                  </div>
                </div>
              </div>

              {/* Buyer Note / Message if any */}
              {selectedDeal.buyer_message && (
                <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-100 text-xs text-blue-900">
                  <span className="font-bold block mb-0.5 text-blue-800">Buyer's Note:</span>
                  "{selectedDeal.buyer_message}"
                </div>
              )}

              {/* Buyer and Seller Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buyer Card */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Buyer Profile
                    </span>
                    {selectedDeal.buyer_is_verified && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        ID Verified
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      {selectedDeal.buyer_full_name || selectedDeal.buyer_username}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">@{selectedDeal.buyer_username}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a href={`mailto:${selectedDeal.buyer_email}`} className="text-brand-600 hover:underline truncate">
                        {selectedDeal.buyer_email}
                      </a>
                    </div>
                    {selectedDeal.buyer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-mono">{selectedDeal.buyer_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Trust Score Progress */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-gray-500">Student Trust Score</span>
                      <span className="text-brand-600 font-black">{selectedDeal.buyer_trust_score}/100</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, selectedDeal.buyer_trust_score)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Seller Card */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Seller Profile
                    </span>
                    {selectedDeal.seller_is_verified && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-purple-600" />
                        ID Verified
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      {selectedDeal.seller_full_name || selectedDeal.seller_username}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">@{selectedDeal.seller_username}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a href={`mailto:${selectedDeal.seller_email}`} className="text-brand-600 hover:underline truncate">
                        {selectedDeal.seller_email}
                      </a>
                    </div>
                    {selectedDeal.seller_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-mono">{selectedDeal.seller_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Trust Score Progress */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-gray-500">Student Trust Score</span>
                      <span className="text-purple-600 font-black">{selectedDeal.seller_trust_score}/100</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, selectedDeal.seller_trust_score)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Handover Session Inspector */}
              <div className="bg-gray-900 text-white p-5 rounded-lg border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      QR Handover & Verification Security Session
                    </h4>
                  </div>
                  {selectedDeal.active_handover ? (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      ACTIVE SESSION
                    </span>
                  ) : selectedDeal.latest_handover ? (
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[10px] font-bold">
                      SESSION {selectedDeal.latest_handover.status}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded text-[10px] font-bold">
                      NO QR GENERATED YET
                    </span>
                  )}
                </div>

                {(selectedDeal.active_handover || selectedDeal.latest_handover) ? (
                  (() => {
                    const session = selectedDeal.active_handover || selectedDeal.latest_handover;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        {/* 6-Digit PIN Display */}
                        <div className="bg-gray-800/80 p-3.5 rounded-lg border border-gray-700/80">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            6-Digit Verification PIN
                          </span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-mono text-2xl font-black text-amber-400 tracking-widest">
                              {session.pin_code}
                            </span>
                            <button
                              onClick={() => handleCopyPin(session.pin_code)}
                              className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                              title="Copy PIN Code"
                            >
                              {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            Generated for buyer physical scan
                          </span>
                        </div>

                        {/* Expiration Details */}
                        <div className="bg-gray-800/80 p-3.5 rounded-lg border border-gray-700/80">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Session Status / Time
                          </span>
                          <div className="font-bold text-sm text-white mt-1">
                            {session.status === 'ACTIVE' ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {session.remaining_seconds ? `${Math.ceil(session.remaining_seconds / 60)} min remaining` : 'Active'}
                              </span>
                            ) : (
                              <span>Status: {session.status}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block font-mono">
                            Expires: {new Date(session.expires_at).toLocaleTimeString('en-IN')}
                          </span>
                        </div>

                        {/* Handover Token */}
                        <div className="bg-gray-800/80 p-3.5 rounded-lg border border-gray-700/80">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Security Token
                          </span>
                          <div className="font-mono text-xs text-gray-300 truncate mt-1" title={session.token}>
                            {session.token ? `${session.token.slice(0, 16)}...` : 'N/A'}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            One-time UUID scan identifier
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    The seller has not yet generated a Handover QR code or PIN code for this offer.
                  </p>
                )}
              </div>

              {/* Administrative Intervention Actions Section */}
              <div className="border-t border-gray-200 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-gray-700" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Administrative Intervention & Dispute Control
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  Admins can intervene if students dispute the exchange, if a party ghosts after acceptance, or if QR scanning failed due to campus WiFi connectivity issues.
                </p>

                {/* Buttons Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {selectedDeal.status !== 'CANCELLED' && (
                    <button
                      onClick={() => {
                        setShowCancelPrompt(true);
                        setShowCompletePrompt(false);
                      }}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                      <span>Force Cancel Deal</span>
                    </button>
                  )}

                  {selectedDeal.status !== 'COMPLETED' && (
                    <button
                      onClick={() => {
                        setShowCompletePrompt(true);
                        setShowCancelPrompt(false);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Force Complete Transaction</span>
                    </button>
                  )}
                </div>

                {/* Force Cancel Confirmation Panel */}
                {showCancelPrompt && (
                  <div className="bg-red-50/75 p-4 rounded-lg border border-red-200 mt-3 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Are you sure you want to force cancel this campus deal?</span>
                    </div>
                    <p className="text-[11px] text-red-700">
                      This will void any active Handover session, mark Deal #{selectedDeal.id} as <strong>CANCELLED</strong>, restore the item listing back to <strong>ACTIVE</strong> in the marketplace, and notify both students via in-app alerts.
                    </p>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-red-800 block mb-1">
                        Reason for Cancellation (Dispatched to Students)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Seller unresponsive / Buyer requested cancellation / Fake meetup"
                        value={interventionReason}
                        onChange={(e) => setInterventionReason(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-red-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAdminIntervention('FORCE_CANCEL')}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                        <span>Confirm Cancellation</span>
                      </button>
                      <button
                        onClick={() => setShowCancelPrompt(false)}
                        className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 transition-colors"
                      >
                        Abort
                      </button>
                    </div>
                  </div>
                )}

                {/* Force Complete Confirmation Panel */}
                {showCompletePrompt && (
                  <div className="bg-emerald-50/75 p-4 rounded-lg border border-emerald-200 mt-3 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Manually Verify & Complete Handover</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Use this if the students completed the exchange physically but could not scan the QR due to network or battery issues. This will mark the listing as <strong>SOLD</strong>, mark the deal as <strong>COMPLETED</strong>, award both students +5 Trust Score points, and send completion receipts.
                    </p>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                        Admin Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified in-person at Helpdesk / Both parties confirmed via call"
                        value={interventionReason}
                        onChange={(e) => setInterventionReason(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAdminIntervention('FORCE_COMPLETE')}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Confirm Complete Deal</span>
                      </button>
                      <button
                        onClick={() => setShowCompletePrompt(false)}
                        className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 transition-colors"
                      >
                        Abort
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                LPUTrade Admin Supervision Suite v4.0
              </span>
              <button
                onClick={() => setSelectedDeal(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
