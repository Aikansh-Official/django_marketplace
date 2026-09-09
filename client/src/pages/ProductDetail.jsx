import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
import toast from 'react-hot-toast';
import {
  MapPin,
  Clock,
  Eye,
  ShieldCheck,
  Phone,
  MessageSquare,
  Share2,
  Heart,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Tag,
  Package,
  Check,
  Send,
  UserCheck,
  Flag,
  HandCoins,
  ShoppingBag,
  X,
  QrCode,
  Camera,
  Lock,
  BadgeCheck,
  Mail
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import { toggleSavedItem, isItemSaved } from '../utils/savedStore';
import HandoverQRModal from '../components/handover/HandoverQRModal';
import HandoverScannerModal from '../components/handover/HandoverScannerModal';
import UniversalLoader from '../components/common/UniversalLoader';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [relatedListings, setRelatedListings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('access')));
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Purchase request state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyerMessage, setBuyerMessage] = useState('');
  const [submittingBuyRequest, setSubmittingBuyRequest] = useState(false);
  const [listingOffers, setListingOffers] = useState([]);
  const [userOffer, setUserOffer] = useState(null);

  // Handover QR & Scanner state
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeOfferForQR, setActiveOfferForQR] = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [cancellingDeal, setCancellingDeal] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Duplicate / Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const triggerLogin = () => {
    window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
  };

  const handleOpenBuyModal = () => {
    if (!isAuthenticated) {
      toast('Please log in to make a purchase request.', { icon: '🔒' });
      triggerLogin();
      return;
    }
    setShowBuyModal(true);
  };

  const handleOpenReportModal = () => {
    if (!isAuthenticated) {
      toast('Please log in to report a listing.', { icon: '🔒' });
      triggerLogin();
      return;
    }
    setShowReportModal(true);
  };

  useEffect(() => {
    if (id) {
      setIsSaved(isItemSaved(id));
    }
  }, [id]);

  const handleToggleSave = () => {
    if (!listing) return;
    if (!isAuthenticated) {
      toast('Please log in to save items to your wishlist.', { icon: '🔒' });
      triggerLogin();
      return;
    }
    const res = toggleSavedItem(listing);
    setIsSaved(res.isSaved);
    if (res.isSaved) {
      toast.success('Saved to your Wishlist!', { icon: '❤️' });
    } else {
      toast.success('Removed from saved items.');
    }
  };

  // Fetch current user & check auth status
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access');
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUserId(null);
        return;
      }
      setIsAuthenticated(true);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed?.id) setCurrentUserId(parsed.id);
        } catch (e) { }
      }
      try {
        const res = await axios.get(`${API_BASE}/auth/status/`);
        if (res.data?.isAuthenticated && res.data?.user?.id) {
          setIsAuthenticated(true);
          setCurrentUserId(res.data.user.id);
        } else {
          setIsAuthenticated(false);
          setCurrentUserId(null);
        }
      } catch (e) {
        // guest or expired token
      }
    };

    checkAuthStatus();
    window.addEventListener('auth-changed', checkAuthStatus);
    return () => window.removeEventListener('auth-changed', checkAuthStatus);
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/marketplace/listings/${id}/`);
        setListing(res.data);
        setActiveImageIndex(0);

        // Fetch related listings from same category
        if (res.data.category?.slug) {
          try {
            const relatedRes = await axios.get(
              `${API_BASE}/marketplace/listings/?category=${res.data.category.slug}`
            );
            setRelatedListings(
              relatedRes.data.filter((item) => String(item.id) !== String(id)).slice(0, 4)
            );
          } catch (relErr) {
            console.error('Failed to fetch related items', relErr);
          }
        }
      } catch (err) {
        console.error('Failed to load listing', err);
        setError('Listing not found or has been removed.');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
    window.scrollTo(0, 0);
  }, [id]);

  // Status Toggle Handler
  const handleStatusChange = async (newStatus) => {
    if (listing?.status === 'SOLD') {
      toast.error('This item has already been marked as Sold and its status cannot be changed.');
      return;
    }
    if (newStatus === listing?.status) return;

    setStatusUpdating(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/marketplace/listings/${id}/status/`,
        { status: newStatus }
      );
      setListing((prev) => ({ ...prev, status: res.data.status }));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error(err.response?.data?.error || 'Failed to update listing status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete Listing Handler
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/marketplace/listings/${id}/`);
      toast.success('Listing deleted successfully');
      navigate('/my-listings');
    } catch (err) {
      console.error('Failed to delete listing', err);
      toast.error('Failed to delete listing.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Listing link copied to clipboard!');
    }
  };

  const isOwner = Boolean(
    listing?.is_seller || (currentUserId && listing?.seller?.id === currentUserId)
  );

  const fetchListingOffers = async () => {
    if (!id) return;
    try {
      const res = await axios.get(`${API_BASE}/marketplace/listings/${id}/offers/`);
      setListingOffers(res.data);
    } catch (e) {
      // Not owner or error
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchListingOffers();
    } else if (currentUserId && id) {
      axios
        .get(`${API_BASE}/marketplace/my-offers/`)
        .then((res) => {
          const myOf = res.data.find((o) => String(o.listing) === String(id));
          if (myOf) setUserOffer(myOf);
        })
        .catch(() => { });
    }
  }, [id, isOwner, currentUserId]);

  const handleRespondOffer = async (offerId, action) => {
    try {
      await axios.patch(`${API_BASE}/marketplace/offers/${offerId}/respond/`, { action });
      toast.success(action === 'ACCEPT' ? 'Deal accepted! Listing is now Reserved.' : 'Request declined.');
      fetchListingOffers();
      if (action === 'ACCEPT') {
        setListing((prev) => ({ ...prev, status: 'PENDING' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update request.');
    }
  };

  const handleCancelDeal = async (offerId) => {
    if (!window.confirm('Are you sure you want to cancel this campus deal? The listing will become Active again for other students.')) {
      return;
    }
    setCancellingDeal(true);
    try {
      await axios.post(`${API_BASE}/marketplace/offers/${offerId}/cancel/`);
      toast.success('Deal cancelled. Listing restored to Active.');
      setListing((prev) => ({ ...prev, status: 'ACTIVE' }));
      if (isOwner) {
        fetchListingOffers();
      } else {
        setUserOffer((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel deal.');
    } finally {
      setCancellingDeal(false);
    }
  };

  const handleDealCompleted = () => {
    setShowQRModal(false);
    setShowScannerModal(false);
    setListing((prev) => ({ ...prev, status: 'SOLD' }));
    if (isOwner) {
      fetchListingOffers();
    } else {
      setUserOffer((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
    }
    if (id) {
      axios
        .get(`${API_BASE}/marketplace/listings/${id}/`)
        .then((res) => setListing(res.data))
        .catch(() => { });
    }
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  };

  // Real-time synchronization for Seller & Buyer when deal is PENDING (Reserved)
  useEffect(() => {
    if (!id || listing?.status !== 'PENDING') return;

    const syncPendingListing = async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/listings/${id}/`);
        if (res.data.status === 'SOLD') {
          setListing(res.data);
          if (isOwner) {
            fetchListingOffers();
          } else {
            setUserOffer((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
          }
          setShowQRModal(false);
          setShowScannerModal(false);
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        }
      } catch (e) {
        // Ignore background polling error
      }
    };

    const interval = setInterval(syncPendingListing, 2000);

    const handleDealCompletedEvent = (e) => {
      const eventListingId = e?.detail?.listingId || e?.detail;
      if (!eventListingId || String(eventListingId) === String(id)) {
        syncPendingListing();
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'deal_completed_event') {
        syncPendingListing();
      }
    };

    window.addEventListener('deal-completed', handleDealCompletedEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('deal-completed', handleDealCompletedEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [id, listing?.status, isOwner]);

  const handleSubmitBuyRequest = async (e) => {
    e.preventDefault();
    setSubmittingBuyRequest(true);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/listings/${id}/offer/`, {
        message: buyerMessage
      });
      toast.success('Purchase request sent to the seller!', { icon: '🎉' });
      setShowBuyModal(false);
      setBuyerMessage('');
      setUserOffer(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit request. Please log in first.';
      toast.error(msg);
    } finally {
      setSubmittingBuyRequest(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      toast.error('Please select a reason for reporting');
      return;
    }
    setSubmittingReport(true);
    try {
      await axios.post(`${API_BASE}/marketplace/reports/`, {
        listing: id,
        reason: reportReason,
        details: reportDetails
      });
      toast.success('Report submitted. Our campus moderators will review this listing.');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit report. Please log in first.';
      toast.error(msg);
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <UniversalLoader text="Loading..." />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-gray-200 rounded-md p-8 shadow-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Listing Unavailable</h2>
          <p className="text-sm text-gray-500 mb-6">{error || 'This item is no longer available.'}</p>
          <Link
            to="/"
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-md transition-all text-sm inline-block"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : [];

  const currentImage = images[activeImageIndex]?.image_url;

  // Contact helper URLs
  const rawPhone = listing.contact_phone || listing.seller?.phone_number || '';
  const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
  const waPhone = (listing.contact_whatsapp || rawPhone).replace(/[^\d]/g, '');
  const waMessage = encodeURIComponent(
    `Hi ${listing.seller?.full_name || 'there'}, I saw your listing "${listing.title}" on CampusXChange for Rs ${listing.price}. Is it still available?`
  );
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waMessage}` : null;
  const callUrl = cleanPhone ? `tel:${cleanPhone}` : null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const conditionLabels = {
    NEW: 'Brand New (Unused with tags)',
    LIKE_NEW: 'Like New (Barely used, flawless)',
    GOOD: 'Good (Gently used, fully functional)',
    FAIR: 'Fair (Visible wear, functional)',
    POOR: 'For Parts / Needs Repair'
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 animate-fade-in-up">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 font-medium overflow-hidden">
          <Link to="/" className="hover:text-brand-600 transition-colors flex items-center gap-1 shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
            Marketplace
          </Link>
          <span>/</span>
          {listing.category && (
            <>
              <Link to={`/?category=${listing.category.slug}`} className="hover:text-brand-600 shrink-0">
                {listing.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-800 font-semibold truncate max-w-[140px] sm:max-w-xs">
            {listing.title}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs ${isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-600'
              }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
            {isSaved ? 'Saved' : 'Save Item'}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-600 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>

          {!isOwner && (
            <button
              type="button"
              onClick={handleOpenReportModal}
              className="flex items-center gap-1 bg-white border border-gray-200 hover:border-red-300 text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs"
              title="Report this listing"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Seller Management & Purchase Requests (Side-by-side Row) */}
      {isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 items-stretch">

          {/* Left Column: Seller Control Panel */}
          <div className="bg-white border border-brand-200/90 rounded-md p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
            {/* Header with Title & Action Buttons */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-brand-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-brand-950 uppercase tracking-wider truncate">
                    Seller Control Panel
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate">
                    Manage visibility & item lifecycle
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {listing.status !== 'SOLD' && (
                  <Link
                    to={`/edit-listing/${listing.id}`}
                    className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-brand-600 text-xs font-semibold py-1.5 px-2.5 rounded-md border border-gray-200 transition-colors shadow-2xs"
                    title="Edit listing details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>
                )}

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold py-1.5 px-2.5 rounded-md border border-red-200 transition-colors shadow-2xs cursor-pointer"
                  title="Delete listing"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Quick Listing Info Strip to balance vertical spacing */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50/80 border border-gray-100 rounded-md text-xs">
              <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span className="truncate font-medium text-gray-700">{listing.location || 'Campus'}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-extrabold text-gray-900">
                  {listing.transaction_type === 'DONATE' ? 'Free' : `Rs ${listing.price}`}
                </span>
                <span className="text-[10px] text-gray-300">•</span>
                <span className="text-gray-500 text-[11px] flex items-center gap-1">
                  <Eye className="w-3 h-3 text-gray-400" />
                  {listing.views_count} views
                </span>
              </div>
            </div>

            {/* Status Switcher Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  {listing.status === 'SOLD' && <Lock className="w-3 h-3 text-gray-400" />}
                  Listing Status:
                </span>
                <span
                  className={`font-extrabold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md border ${listing.status === 'SOLD'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-brand-50 text-brand-600 border-brand-200/80'
                    }`}
                >
                  {listing.status === 'PENDING' ? 'Reserved' : listing.status}
                </span>
              </div>

              {listing.status === 'SOLD' ? (
                /* Static / Display-only when Sold (Not clickable/dynamic) */
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-1.5 bg-gray-50/90 p-1.5 rounded-md border border-gray-200/80 select-none cursor-default">
                    {['ACTIVE', 'PENDING', 'SOLD', 'HIDDEN'].map((st) => (
                      <div
                        key={st}
                        className={`py-1.5 text-xs font-bold rounded-md text-center select-none ${st === 'SOLD'
                            ? 'bg-brand-500 text-white shadow-xs'
                            : 'text-gray-300 opacity-40 cursor-not-allowed'
                          }`}
                      >
                        {st === 'PENDING' ? 'Reserved' : st.charAt(0) + st.slice(1).toLowerCase()}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 text-center font-medium">
                    Item handed over & marked as Sold. Status is locked.
                  </p>
                </div>
              ) : (
                /* Interactive status buttons for Active, Reserved, Hidden */
                <div className="grid grid-cols-4 gap-1.5 bg-gray-50/90 p-1.5 rounded-md border border-gray-200/80">
                  {['ACTIVE', 'PENDING', 'SOLD', 'HIDDEN'].map((st) => (
                    <button
                      key={st}
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange(st)}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all text-center cursor-pointer ${listing.status === st
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                        }`}
                    >
                      {st === 'PENDING' ? 'Reserved' : st.charAt(0) + st.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Incoming Student Purchase Requests */}
          <div className="bg-white border border-brand-200/90 rounded-md p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-orange-50 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 truncate">
                    Purchase Requests
                    <span className="bg-brand-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {listingOffers.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate">
                    {listingOffers.length > 0
                      ? 'Accept a student to reserve this item'
                      : 'Incoming buyer offers appear here'}
                  </p>
                </div>
              </div>

              {listingOffers.some((o) => o.status === 'PENDING') && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0 animate-pulse">
                  Action Needed
                </span>
              )}
            </div>

            {/* List of Offers or Empty Placeholder */}
            {listingOffers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center bg-gray-50/70 rounded-md border border-dashed border-gray-200">
                <p className="text-xs font-semibold text-gray-600">No purchase requests yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs">
                  When students send buy offers or reserve requests, they will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
                {listingOffers.map((off) => (
                  <div
                    key={off.id}
                    className="p-2.5 bg-gray-50/90 rounded-md border border-gray-200/90 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <strong className="text-gray-900 truncate">
                          {off.buyer_name || off.buyer_reg}
                        </strong>
                        <span className="text-gray-400 text-[11px]">(@{off.buyer_reg})</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                          Trust {off.buyer_trust_score ?? 0}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${off.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : off.status === 'REJECTED' || off.status === 'CANCELLED'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {off.status === 'ACCEPTED' ? 'Reserved' : off.status}
                      </span>
                    </div>

                    {off.buyer_message && (
                      <p className="text-gray-600 italic text-[11px] truncate">
                        "{off.buyer_message}"
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60 text-[11px]">
                      <span className="text-gray-400">
                        {new Date(off.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {off.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRespondOffer(off.id, 'ACCEPT')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondOffer(off.id, 'REJECT')}
                              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md text-xs transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : off.status === 'ACCEPTED' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveOfferForQR(off);
                                setShowQRModal(true);
                              }}
                              className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <QrCode className="w-3 h-3" />
                              Show QR
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelDeal(off.id)}
                              disabled={cancellingDeal}
                              className="bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold px-2 py-1 rounded-md text-xs transition-colors cursor-pointer"
                              title="Cancel this deal"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : off.status === 'COMPLETED' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Sold & Handed Over
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Global Status Banner for Buyers */}
      {listing.status === 'PENDING' && (
        userOffer?.status === 'ACCEPTED' ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">🎉 Your Purchase Request Was Accepted!</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Meet the seller on campus to inspect the item, make payment (UPI/Cash), and scan their Handover QR code or enter their 6-digit PIN.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setShowScannerModal(true)}
                className="flex-1 sm:flex-none bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Complete Handover / Scan QR
              </button>
              <button
                onClick={() => handleCancelDeal(userOffer.id)}
                disabled={cancellingDeal}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs px-3 py-2.5 rounded-md transition-colors cursor-pointer"
              >
                Cancel Deal
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded-md p-4 mb-6 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-950">🤝 Deal In Progress (Reserved)</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                This item is currently reserved for a student peer. If the deal falls through, the seller will reactivate it.
              </p>
            </div>
          </div>
        )
      )}

      {listing.status === 'SOLD' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-950">🔴 Item Sold Out</h4>
            <p className="text-xs text-red-800 mt-0.5">
              This item has already been purchased/traded and is no longer available.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Gallery on Left (8 cols) & Details on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery & Description */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Image Container */}
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
            <div className="relative h-64 sm:h-80 md:h-96 lg:h-[420px] w-full bg-gray-100 flex items-center justify-center group">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={listing.title}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                  <Package className="w-16 h-16 mb-3 opacity-30" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-50">No Image Provided</span>
                </div>
              )}

              {/* Status Banner overlay if not active */}
              {listing.status === 'SOLD' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="bg-red-600 text-white font-extrabold text-xl px-6 py-2 rounded-md tracking-wider shadow-lg border border-red-400">
                    ITEM SOLD
                  </span>
                </div>
              )}
              {listing.status === 'PENDING' && (
                <div className="absolute top-4 left-4 bg-amber-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow-md">
                  RESERVED / DEAL IN PROGRESS
                </div>
              )}

              {/* Transaction Badge */}
              {listing.transaction_type === 'DONATE' && (
                <div className="absolute top-4 left-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  FREE DONATION
                </div>
              )}

              {/* Gallery Arrow Controls (if multiple images) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md transition-all opacity-80 hover:opacity-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md transition-all opacity-80 hover:opacity-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center gap-3 overflow-x-auto bg-gray-50/50">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all aspect-square bg-white ${activeImageIndex === idx
                        ? 'border-brand-500 ring-2 ring-brand-200'
                        : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              Item Details & Description
            </h2>

            {/* Structured Specifications Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Category</span>
                <span className="font-bold text-gray-800">{listing.category?.name || 'General'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Condition</span>
                <span className="font-bold text-gray-800">
                  {listing.condition ? listing.condition.replace('_', ' ') : 'Good'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Campus Location</span>
                <span className="font-bold text-gray-800">{listing.location}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Transaction Type</span>
                <span className="font-bold text-gray-800">{listing.transaction_type}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Posted On</span>
                <span className="font-bold text-gray-800">{formatDate(listing.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Views</span>
                <span className="font-bold text-gray-800">{listing.views_count} student views</span>
              </div>
            </div>

            {/* Body Text */}
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed pt-2">
              {listing.description}
            </div>
          </div>

          {/* Safety & Campus Trade Guidelines */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-md p-5 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              LPU Student Safety Recommendations
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Meet in bustling campus public areas such as <strong>Uni-Mall</strong>, <strong>Central Library</strong>, or your hostel entrance.</li>
              <li>Inspect the product physically before making UPI payments.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Pricing, Contact & Seller Profile */}
        <div className="lg:col-span-4 space-y-6">
          {/* Price & Primary Action Card */}
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Price
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{listing.views_count} views</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {listing.transaction_type === 'DONATE' ? 'Free (Donation)' : `Rs ${listing.price}`}
                </span>
              </div>

              {listing.is_negotiable && listing.transaction_type === 'SELL' && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  Price is negotiable
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h1 className="text-lg font-bold text-gray-900 leading-snug">
                {listing.title}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{listing.location}</span>
              </div>
            </div>

            {/* Direct Contact & Buy Request Buttons */}
            {listing.status === 'ACTIVE' ? (
              <div className="space-y-3 pt-2">
                {!isAuthenticated ? (
                  <div className="bg-gradient-to-br from-brand-50/50 via-white to-orange-50/40 border border-brand-200/80 rounded-xl p-5 text-center shadow-xs space-y-3.5">
                    <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                      <Lock className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">
                        Log in to Buy or Contact Seller
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed mt-1">
                        To protect campus safety and student privacy, login is required to make purchase requests, chat on WhatsApp, or call the seller.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={triggerLogin}
                      className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Log In / Sign Up to Continue</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Direct Purchase Button (for non-owners) */}
                    {!isOwner && (
                      userOffer?.status === 'PENDING' ? (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-xs font-bold text-center flex items-center justify-center gap-2 shadow-2xs">
                          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>Purchase Request Pending Seller Approval</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenBuyModal}
                          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          {listing.transaction_type === 'DONATE'
                            ? 'Request Free Donation'
                            : `I Want to Buy This (Rs ${listing.price})`}
                        </button>
                      )
                    )}

                    {/* WhatsApp Button */}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-sm hover:shadow-md text-sm flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat on WhatsApp
                      </a>
                    )}

                    {/* Call Button */}
                    {callUrl && (
                      <a
                        href={callUrl}
                        className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-800 font-semibold py-2.5 px-4 rounded-md transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4 text-gray-600" />
                        Call Seller ({rawPhone})
                      </a>
                    )}

                    {/* In-App Direct Message */}
                    <button
                      onClick={() => {
                        toast.success('In-App Chat initiated! Connecting with seller...');
                      }}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Send In-App Message
                    </button>
                  </>
                )}
              </div>
            ) : listing.status === 'PENDING' ? (
              <div className="space-y-3 pt-2">
                {!isAuthenticated ? (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-md text-xs font-bold text-center space-y-2">
                    <div>⚠️ Campus Deal In Progress</div>
                    <p className="font-normal text-[11px] text-amber-800">
                      This item is currently reserved. Log in to view transaction details.
                    </p>
                    <button
                      type="button"
                      onClick={triggerLogin}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-3 rounded-md text-xs cursor-pointer"
                    >
                      Log In to View
                    </button>
                  </div>
                ) : isOwner ? (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3.5 rounded-md text-xs font-bold text-center space-y-2">
                    <div>🤝 Campus Deal In Progress</div>
                    <p className="font-normal text-[11px] text-amber-800">
                      When meeting the buyer for physical handover, click below to show your QR code and 6-digit PIN.
                    </p>
                    {listingOffers.find((o) => o.status === 'ACCEPTED') && (
                      <button
                        type="button"
                        onClick={() => {
                          const acceptedOffer = listingOffers.find((o) => o.status === 'ACCEPTED');
                          setActiveOfferForQR(acceptedOffer);
                          setShowQRModal(true);
                        }}
                        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        Generate Handover QR & PIN
                      </button>
                    )}
                  </div>
                ) : userOffer?.status === 'ACCEPTED' ? (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-md text-xs font-bold text-center space-y-2.5">
                    <div>✅ Deal Reserved for You!</div>
                    <div className="font-normal text-[11px] text-emerald-800">
                      Meet the seller on campus, inspect the item, and scan their QR or enter their 6-digit PIN.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(true)}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Complete Handover / Scan QR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelDeal(userOffer.id)}
                      disabled={cancellingDeal}
                      className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-3 rounded-md text-[11px] transition-colors cursor-pointer"
                    >
                      Cancel Deal
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-100 border border-amber-300 text-amber-900 p-3 rounded-md text-xs font-bold text-center">
                    ⚠️ Item Currently Reserved for Another Buyer
                  </div>
                )}
                {/* Still allow contact for winning buyer */}
                {userOffer?.status === 'ACCEPTED' && waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-md transition-all shadow-sm text-xs flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat on WhatsApp with Seller
                  </a>
                )}
              </div>
            ) : listing.status === 'SOLD' ? (
              <div className="bg-red-50 border border-red-200 text-red-700 text-center py-3.5 rounded-md text-xs font-extrabold uppercase mt-2 space-y-1">
                <div>🔴 Item Sold</div>
                <p className="text-[10px] font-normal text-red-600 lowercase first-letter:uppercase">Handover completed & verified on campus.</p>
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-200 text-gray-500 text-center py-3 rounded-md text-xs font-bold uppercase mt-2">
                Listing is {listing.status}
              </div>
            )}
          </div>

          {/* Seller Profile Card */}
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Seller Information
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-100 border border-brand-200 text-brand-800 font-bold flex items-center justify-center text-lg shadow-sm">
                {(listing.seller?.full_name || listing.seller?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900 truncate flex items-center gap-1.5">
                  <span className="truncate">{listing.seller?.full_name || listing.seller?.username || 'LPU Student'}</span>
                  {listing.seller?.is_id_verified && (
                    <span
                      title="Official Student ID Verified"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0 shadow-2xs"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ID Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5">
                  {listing.seller?.is_id_verified ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Official Student ID Verified
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      Email Verified Student
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Score from real user profile */}
            <div className="p-3 bg-gray-50 rounded-md space-y-1.5 border border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-600">Student Trust Score</span>
                <span className="font-bold text-brand-600">
                  {listing.seller?.trust_score ?? 0}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{ width: `${listing.seller?.trust_score ?? 0}%` }}
                ></div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
              <span>Contact Options:</span>
              {isAuthenticated ? (
                <span className="font-bold text-gray-700">
                  {listing.contact_preference === 'ALL'
                    ? 'All Channels'
                    : listing.contact_preference?.replace('_', ' ')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={triggerLogin}
                  className="font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Lock className="w-3 h-3 text-brand-600" />
                  Log in to view
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Category Listings */}
      {relatedListings.length > 0 && (
        <div className="mt-14 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              More in {listing.category?.name || 'this category'}
            </h2>
            <Link
              to={`/?category=${listing.category?.slug}`}
              className="text-brand-600 hover:text-brand-700 text-xs font-bold"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {relatedListings.map((rel) => {
              const img = rel.images?.find((i) => i.is_primary)?.image_url || rel.images?.[0]?.image_url;
              return (
                <Link
                  key={rel.id}
                  to={`/listing/${rel.id}`}
                  className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-lg transition-all group flex flex-col"
                >
                  <div className="h-40 bg-gray-100 flex items-center justify-center p-2">
                    {img ? (
                      <img
                        src={img}
                        alt={rel.title}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="w-6 h-6 mb-1 opacity-40" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-grow">
                    <span className="font-extrabold text-base text-gray-900">
                      Rs {rel.price}
                    </span>
                    <p className="text-xs text-gray-600 truncate mt-1">{rel.title}</p>
                    <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="truncate max-w-[70%]">{rel.location}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-md max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Delete Listing?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete "{listing.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-md font-medium text-xs hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-md font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Purchase Request Modal (Direct Listed Price) */}
      {showBuyModal && isAuthenticated && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-md max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-500" />
                Confirm Purchase Request
              </h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBuyRequest} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-100 space-y-2">
                <div className="text-xs text-gray-500">
                  Item: <strong className="text-gray-900">{listing.title}</strong>
                </div>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>Direct Listed Price:</span>
                  <strong className="text-base font-black text-brand-600">
                    {listing.transaction_type === 'DONATE' ? 'Free (Donation)' : `Rs ${listing.price}`}
                  </strong>
                </div>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>Campus Pickup Spot:</span>
                  <span className="font-semibold text-gray-800">{listing.location}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Message for Seller (Optional)
                </label>
                <textarea
                  rows={2}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  placeholder="e.g. Can meet at Uni-Mall at 5 PM today."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBuyModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-md font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBuyRequest}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submittingBuyRequest ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5" />
                  )}
                  Confirm & Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-md max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2 text-red-600">
                <Flag className="w-4 h-4" /> Report Listing
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Reason for Reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                >
                  <option value="Duplicate / Spam">Duplicate / Spam Listing</option>
                  <option value="Incorrect Price / Info">Incorrect Price or Misleading Information</option>
                  <option value="Inappropriate Content">Inappropriate / Offensive Content</option>
                  <option value="Item Already Sold">Item is Already Sold / Inactive</option>
                  <option value="Scam / Fraud">Potential Scam / Fraud Suspicion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows="3"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2.5 text-xs font-normal focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Explain why this listing violates campus guidelines..."
                ></textarea>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-md font-bold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover QR Modal (for Seller) */}
      {showQRModal && activeOfferForQR && (
        <HandoverQRModal
          offerId={activeOfferForQR.id}
          listingId={listing.id}
          listingTitle={listing.title}
          buyerName={activeOfferForQR.buyer_name || activeOfferForQR.buyer_reg}
          price={activeOfferForQR.offer_amount || listing.price}
          location={listing.location}
          image={listing.images?.[0]?.image_url}
          existingSession={activeOfferForQR.active_handover}
          onClose={() => setShowQRModal(false)}
          onComplete={handleDealCompleted}
        />
      )}

      {/* Handover Scanner & PIN Modal (for Buyer) */}
      {showScannerModal && (
        <HandoverScannerModal
          listingId={listing.id}
          defaultOfferId={userOffer?.id}
          onClose={() => setShowScannerModal(false)}
          onSuccess={handleDealCompleted}
        />
      )}

      {/* Mobile Sticky Bottom CTA Bar (Visible only on screens < md) */}
      {!isOwner && listing.status === 'ACTIVE' && (
        <div className="fixed md:hidden bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-gray-400">Price</div>
            <div className="font-black text-lg text-gray-950 truncate">
              {listing.transaction_type === 'DONATE' ? 'Free' : `Rs ${listing.price}`}
            </div>
          </div>

          {!isAuthenticated ? (
            <button
              type="button"
              onClick={triggerLogin}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-md text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Log in to Buy / Contact</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-md shadow-xs flex items-center justify-center"
                  title="Chat on WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              )}

              {userOffer?.status === 'PENDING' ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md text-xs font-bold text-center">
                  Request Pending
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenBuyModal}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-md text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{listing.transaction_type === 'DONATE' ? 'Request Free' : 'Buy Now'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
