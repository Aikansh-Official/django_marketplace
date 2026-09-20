import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Star,
  Package,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ArrowLeft,
  ShoppingBag,
  Eye,
  Tag,
  Lock,
  Sparkles,
  Flag,
  X,
  AlertTriangle
} from 'lucide-react';
import UniversalLoader from '../components/common/UniversalLoader';
import ChatDrawer from '../components/chat/ChatDrawer';
import api, { submitReport } from '../services/api';
import { getSafeImageUrl } from '../utils/imageUrl';

export default function SellerProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'reviews'

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Demanding Advance / External Payment');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Chat Drawer State
  const [chatListing, setChatListing] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/marketplace/seller/${id}/`);
        setData(res.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load seller profile.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  const handleOpenReportModal = () => {
    const token = localStorage.getItem('access');
    if (!token) {
      toast('Please log in to report a trader.', { icon: '🔒' });
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
      return;
    }
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      toast.error('Please select a reason for reporting.');
      return;
    }

    setSubmittingReport(true);
    try {
      await submitReport({
        reportedUserId: id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      toast.success('Report submitted. Campus moderators will review this trader.');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <UniversalLoader text="Loading Campus Trader Profile..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-gray-200 rounded-md p-8 shadow-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Profile Unavailable</h2>
          <p className="text-xs text-gray-500 mb-6">{error || 'This campus member profile could not be found.'}</p>
          <Link
            to="/"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-md text-xs inline-block shadow-sm"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const { seller, listings, recent_reviews } = data;

  const getTrustScoreBadge = (score) => {
    if (score >= 80) return { label: 'Top Trusted Trader', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' };
    if (score >= 50) return { label: 'Verified Campus Trader', color: 'bg-brand-50 text-brand-700 border-brand-300' };
    return { label: 'New Campus Trader', color: 'bg-gray-50 text-gray-700 border-gray-300' };
  };

  const trustBadge = getTrustScoreBadge(seller.trust_score);

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] px-4 sm:px-6 lg:px-[5%] py-6 sm:py-8 space-y-6 animate-fade-in-up pb-12">
      {/* Top Breadcrumb & Action Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>

        <button
          type="button"
          onClick={handleOpenReportModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 text-xs font-semibold transition-colors shadow-2xs cursor-pointer bg-white"
          title="Report this campus trader"
        >
          <Flag className="w-3.5 h-3.5 text-red-500" />
          <span>Report Trader</span>
        </button>
      </div>
      {/* Seller Header Profile Card */}
      <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          {/* Avatar & Core Identity */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 w-full md:w-auto">
            <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-brand-500 to-orange-400 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md border-2 sm:border-4 border-white overflow-hidden aspect-square">
                {seller.profile_photo ? (
                  <img
                    src={getSafeImageUrl(seller.profile_photo)}
                    alt={seller.display_name}
                    className="w-full h-full object-cover aspect-square"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  seller.display_name.slice(0, 2).toUpperCase()
                )}
              </div>
              {seller.is_id_verified && (
                <div
                  className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs"
                  title="Physical Student ID Card Verified"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-1 sm:space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                  {seller.display_name}
                </h1>
                <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${trustBadge.color}`}>
                  {trustBadge.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Member since {seller.member_since}</span>
                </span>
              </div>

              {/* Rating Star Badge */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 text-amber-900 px-2 sm:px-2.5 py-0.5 rounded-md text-xs font-black transition-all cursor-pointer"
                  title="View Verified Reviews"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                  <span>{seller.avg_rating ? `${seller.avg_rating} / 5.0` : 'New Trader'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="text-xs text-gray-400 hover:text-brand-600 transition-colors cursor-pointer"
                >
                  ({seller.reviews_count} {seller.reviews_count === 1 ? 'review' : 'reviews'})
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
            <div className="text-center bg-gray-50/80 border border-gray-200/80 rounded-md px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-2xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Trust Score
              </div>
              <div className="text-base sm:text-2xl font-black text-brand-600 mt-0.5">
                {seller.trust_score}<span className="text-xs text-gray-400 font-bold">/100</span>
              </div>
            </div>

            <div className="text-center bg-gray-50/80 border border-gray-200/80 rounded-md px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-2xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Completed Deals
              </div>
              <div className="text-base sm:text-2xl font-black text-gray-900 mt-0.5">
                {seller.completed_trades_count || 0}
              </div>
            </div>

            <div className="text-center bg-gray-50/80 border border-gray-200/80 rounded-md px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-2xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Active Items
              </div>
              <div className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">
                {data.active_listings_count || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`shrink-0 pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'listings'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>Active Listings ({data.active_listings_count || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`shrink-0 pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Star className="w-4 h-4 shrink-0" />
          <span>Verified Reviews ({seller.reviews_count || 0})</span>
        </button>
      </div>

      {/* Tab 1: Active Listings Grid */}
      {activeTab === 'listings' && (
        <div>
          {listings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-md p-12 text-center shadow-xs">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-gray-900">No active listings</h3>
              <p className="text-xs text-gray-500 mt-1">This seller currently has no items available for sale.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
              {listings.map((item) => {
                const cover =
                  item.images?.find((i) => i.is_primary)?.image_url ||
                  item.images?.[0]?.image_url;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200/90 rounded-md overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group"
                  >
                    <Link to={`/listing/${item.id}`} className="relative h-36 sm:h-44 bg-gray-100 overflow-hidden block">
                      {cover ? (
                        <img
                          src={getSafeImageUrl(cover)}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                        {item.category?.name || 'Item'}
                      </div>
                    </Link>

                    <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-sm sm:text-base text-gray-900">
                            {item.transaction_type === 'DONATE' ? 'Free (Donation)' : `Rs ${item.price}`}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.condition}
                          </span>
                        </div>
                        <Link
                          to={`/listing/${item.id}`}
                          className="font-bold text-xs text-gray-800 hover:text-brand-600 block line-clamp-2 mt-1 leading-snug"
                        >
                          {item.title}
                        </Link>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <span className="flex items-center gap-1 text-gray-500 truncate text-[10px] sm:text-[11px] max-w-[65%]">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setChatListing(item)}
                          className="inline-flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded transition-colors shadow-2xs cursor-pointer shrink-0"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Verified Reviews List */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {recent_reviews.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center shadow-xs">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-500">
                <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-amber-300 text-amber-500" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900">No reviews yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Reviews appear here once campus trades are completed and verified by student peers.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 sm:space-y-4">
              {/* Rating Summary Header Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-200 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-base sm:text-lg font-black text-amber-900 leading-none">
                      {seller.avg_rating ? seller.avg_rating : '—'}
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-700 mt-0.5">/ 5.0</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                            s <= Math.round(Number(seller.avg_rating || 0))
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs sm:text-sm font-bold text-gray-800 ml-1">
                        {seller.avg_rating ? `${seller.avg_rating} out of 5` : 'Trader Rating'}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                      Based on {seller.reviews_count || 0} verified peer trade {seller.reviews_count === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>100% Verified LPU Student Reviews</span>
                </div>
              </div>

              {/* Reviews Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {recent_reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:border-gray-300 transition-colors"
                  >
                    <div className="space-y-2.5">
                      {/* Reviewer identity & stars */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {rev.reviewer_name?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                              {rev.reviewer_name || 'Campus Trader'}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate">Verified Student Buyer</span>
                            </div>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5 shrink-0 bg-amber-50/90 border border-amber-200/70 px-1.5 py-0.5 rounded-md">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                                i < rev.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Quick Tags */}
                      {rev.quick_tags && rev.quick_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {rev.quick_tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-brand-50/80 text-brand-700 border border-brand-200/60 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                            >
                              <span className="text-[9px]">✓</span> {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Comment */}
                      {rev.comment && (
                        <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed italic bg-gray-50/90 p-2.5 sm:p-3 rounded-lg border border-gray-100 break-words">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>

                    {/* Footer: Item Title & Date */}
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                      <span className="truncate flex-1 min-w-0" title={rev.listing_title}>
                        <span className="text-gray-500 font-medium">Item:</span> {rev.listing_title || 'Campus Deal'}
                      </span>
                      <span className="shrink-0 font-medium">
                        {new Date(rev.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-App Chat Drawer Integration */}
      {chatListing && (
        <ChatDrawer
          listingId={chatListing.id}
          peerId={seller.id}
          peerName={seller.display_name}
          listingTitle={chatListing.title}
          listingPrice={chatListing.price}
          listingImage={chatListing.images?.[0]?.image_url}
          onClose={() => setChatListing(null)}
        />
      )}

      {/* Report Trader Modal - Portal to document.body for full-screen coverage */}
      {showReportModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                  <Flag className="w-4 h-4" />
                  <span>Report Campus Trader</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs flex items-center justify-between">
                <span className="text-gray-500">Reported Student:</span>
                <span className="font-bold text-gray-900">{seller.display_name}</span>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Reason for Reporting
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Demanding Advance / External Payment">Demanding Advance / External Payment</option>
                    <option value="Suspicious / Fake Trader Profile">Suspicious / Fake Trader Profile</option>
                    <option value="Harassment / Abusive Behavior">Harassment / Abusive Behavior</option>
                    <option value="No-Show / Unresponsive Handover">No-Show / Unresponsive Handover</option>
                    <option value="Selling Counterfeit / Stolen Goods">Selling Counterfeit / Stolen Goods</option>
                    <option value="Other Guidelines Violation">Other Guidelines Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Details & Context (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe what occurred. Our campus moderation team reviews every report within 12 hours."
                    className="w-full text-xs border border-gray-300 rounded-md p-2.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
