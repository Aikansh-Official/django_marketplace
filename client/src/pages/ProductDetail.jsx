import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { submitReport } from '../services/api';
import toast from 'react-hot-toast';
import {
  MapPin,
  Clock,
  Eye,
  ShieldCheck,
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
  ShoppingBag,
  X,
  QrCode,
  Camera,
  Lock,
  BadgeCheck,
  Mail,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Repeat
} from 'lucide-react';
import { toggleSavedItem, isItemSaved } from '../utils/savedStore';
import HandoverQRModal from '../components/handover/HandoverQRModal';
import HandoverScannerModal from '../components/handover/HandoverScannerModal';
import UniversalLoader from '../components/common/UniversalLoader';
import ChatDrawer from '../components/chat/ChatDrawer';
import { getSafeImageUrl } from '../utils/imageUrl';

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
  const [isExchangeProposal, setIsExchangeProposal] = useState(false);
  const [exchangeItemTitle, setExchangeItemTitle] = useState('');
  const [buyerMessage, setBuyerMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [submittingBuyRequest, setSubmittingBuyRequest] = useState(false);
  const [listingOffers, setListingOffers] = useState([]);
  const [userOffer, setUserOffer] = useState(null);

  // In-App Chat state
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Image Magnifier / Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Counter-Offer state
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [sellerNote, setSellerNote] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [respondingToCounter, setRespondingToCounter] = useState(false);

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
    setIsExchangeProposal(listing?.transaction_type === 'EXCHANGE');
    setExchangeItemTitle('');
    setOfferAmount(listing?.price || '');
    setShowBuyModal(true);
  };

  const handleOpenExchangeModal = () => {
    if (!isAuthenticated) {
      toast('Please log in to propose an item exchange.', { icon: '🔒' });
      triggerLogin();
      return;
    }
    setIsExchangeProposal(true);
    setExchangeItemTitle('');
    setOfferAmount('0');
    setShowBuyModal(true);
  };

  const handleOpenChat = () => {
    if (!isAuthenticated) {
      toast('Please log in to chat with the seller.', { icon: '🔒' });
      triggerLogin();
      return;
    }
    setShowChatDrawer(true);
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
        const res = await api.get('/auth/status/');
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
        const res = await api.get(`/marketplace/listings/${id}/`);
        setListing(res.data);
        setActiveImageIndex(0);

        // Fetch related listings from same category
        if (res.data.category?.slug) {
          try {
            const relatedRes = await api.get(
              `/marketplace/listings/?category=${res.data.category.slug}`
            );
            const list = Array.isArray(relatedRes.data)
              ? relatedRes.data
              : Array.isArray(relatedRes.data?.results)
                ? relatedRes.data.results
                : [];
            setRelatedListings(
              list.filter((item) => String(item.id) !== String(id)).slice(0, 4)
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
      const res = await api.patch(
        `/marketplace/listings/${id}/status/`,
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
      await api.delete(`/marketplace/listings/${id}/`);
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
      const res = await api.get(`/marketplace/listings/${id}/offers/`);
      setListingOffers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      // Not owner or error
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchListingOffers();
    } else if (currentUserId && id) {
      api
        .get('/marketplace/my-offers/')
        .then((res) => {
          const list = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.results)
              ? res.data.results
              : [];
          const myOf = list.find((o) => String(o.listing) === String(id));
          if (myOf) setUserOffer(myOf);
        })
        .catch(() => { });
    }
  }, [id, isOwner, currentUserId]);

  const handleRespondOffer = async (offerId, action) => {
    try {
      await api.patch(`/marketplace/offers/${offerId}/respond/`, { action });
      toast.success(action === 'ACCEPT' ? 'Deal accepted! Listing is now Reserved.' : 'Request declined.');
      fetchListingOffers();
      if (action === 'ACCEPT') {
        setListing((prev) => ({ ...prev, status: 'PENDING' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update request.');
    }
  };

  const handleOpenCounterModal = (off) => {
    setSelectedOfferForCounter(off);
    setCounterAmount(off.offer_amount || listing?.price || '');
    setSellerNote('');
    setShowCounterModal(true);
  };

  const handleSubmitCounter = async (e) => {
    e.preventDefault();
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      toast.error('Please enter a valid counter price.');
      return;
    }
    setSubmittingCounter(true);
    try {
      await api.patch(`/marketplace/offers/${selectedOfferForCounter.id}/respond/`, {
        action: 'COUNTER',
        counter_amount: counterAmount,
        seller_note: sellerNote
      });
      toast.success(`Counter-offer of Rs ${counterAmount} sent to buyer!`, { icon: '🤝' });
      setShowCounterModal(false);
      fetchListingOffers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit counter-offer.');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleBuyerCounterRespond = async (action) => {
    if (!userOffer) return;
    setRespondingToCounter(true);
    try {
      const res = await api.post(`/marketplace/offers/${userOffer.id}/counter-respond/`, { action });
      setUserOffer(res.data);
      if (action === 'ACCEPT') {
        toast.success(`Counter-offer accepted! Listing is now reserved for you.`, { icon: '🎉' });
        setListing((prev) => ({ ...prev, status: 'PENDING' }));
      } else {
        toast('Counter-offer declined.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to respond to counter-offer.');
    } finally {
      setRespondingToCounter(false);
    }
  };

  const handleCancelDeal = async (offerId) => {
    if (!window.confirm('Are you sure you want to cancel this campus deal? The listing will become Active again for other students.')) {
      return;
    }
    setCancellingDeal(true);
    try {
      await api.post(`/marketplace/offers/${offerId}/cancel/`);
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
      api
        .get(`/marketplace/listings/${id}/`)
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
        const res = await api.get(`/marketplace/listings/${id}/`);
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
    if (isExchangeProposal && !exchangeItemTitle.trim()) {
      toast.error('Please specify what item you are offering to swap.');
      return;
    }
    setSubmittingBuyRequest(true);
    try {
      const payload = {
        message: buyerMessage,
        is_exchange_offer: isExchangeProposal,
        exchange_item_title: isExchangeProposal ? exchangeItemTitle.trim() : ''
      };
      if (offerAmount !== '' && Number(offerAmount) >= 0) {
        payload.offer_amount = offerAmount;
      }
      const res = await api.post(`/marketplace/listings/${id}/offer/`, payload);
      toast.success(isExchangeProposal ? 'Exchange proposal sent to the seller!' : 'Purchase request sent to the seller!', {
        icon: isExchangeProposal ? '🔄' : '🎉'
      });
      setShowBuyModal(false);
      setBuyerMessage('');
      setExchangeItemTitle('');
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
      await submitReport({
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

  const images = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images
    : [];

  const rawCurrentImage = images[activeImageIndex]?.image_url || images[0]?.image_url || '';
  const currentImage = getSafeImageUrl(rawCurrentImage);

  // Direct contact is routed securely through In-App Chat to safeguard student privacy

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
          <div id="seller-offers-panel" className="bg-white border border-brand-200/90 rounded-md p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
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

                    {off.is_exchange_offer && off.exchange_item_title && (
                      <div className="bg-indigo-50 border border-indigo-200/80 rounded p-1.5 flex items-center gap-1.5 text-[11px] text-indigo-900 font-bold">
                        <Repeat className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Swap with: {off.exchange_item_title}</span>
                        {Number(off.offer_amount) > 0 && (
                          <span className="text-indigo-600 font-medium">(+{off.offer_amount} Rs)</span>
                        )}
                      </div>
                    )}

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
                            {listing.is_negotiable && listing.transaction_type !== 'DONATE' && (
                              <button
                                type="button"
                                onClick={() => handleOpenCounterModal(off)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Propose a counter price"
                              >
                                Counter
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRespondOffer(off.id, 'REJECT')}
                              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md text-xs transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : off.status === 'COUNTERED' ? (
                          <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Countered: Rs {off.counter_amount}
                          </span>
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

      {/* Buyer Counter-Offer Alert Banner */}
      {userOffer?.status === 'COUNTERED' && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-md p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                🤝 Seller Proposed a Counter-Offer of Rs {userOffer.counter_amount}
              </h4>
              {userOffer.seller_note && (
                <p className="text-xs text-amber-800 mt-0.5 italic">"{userOffer.seller_note}"</p>
              )}
              <p className="text-[11px] text-amber-700 mt-0.5">
                Accept this counter-price to immediately reserve the listing for campus handover.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleBuyerCounterRespond('ACCEPT')}
              disabled={respondingToCounter}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-md shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Accept Rs {userOffer.counter_amount}
            </button>
            <button
              type="button"
              onClick={() => handleBuyerCounterRespond('REJECT')}
              disabled={respondingToCounter}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs px-3 py-2.5 rounded-md transition-colors cursor-pointer"
            >
              Decline
            </button>
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
          {/* Hero Image Container with Click-to-Zoom Magnifier */}
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
            <div
              onClick={() => currentImage && setIsLightboxOpen(true)}
              className="relative h-64 sm:h-80 md:h-96 lg:h-[420px] w-full bg-gray-100 flex items-center justify-center group cursor-zoom-in"
              title="Click to view full-resolution & zoom inspection"
            >
              {currentImage ? (
                <>
                  <img
                    src={currentImage}
                    alt={listing.title}
                    className="max-h-full max-w-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.product-hero-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="product-hero-fallback hidden w-full h-full flex-col items-center justify-center text-gray-400 bg-gray-100">
                    <Package className="w-16 h-16 mb-3 opacity-30" />
                    <span className="text-sm font-semibold uppercase tracking-wider opacity-50">Image Protected or Unavailable</span>
                  </div>
                  {/* Floating Magnifier Badge */}
                  <div className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-sm">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Click to Zoom & Inspect</span>
                  </div>
                </>
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
              {listing.transaction_type === 'DONATE' ? (
                <div className="absolute top-4 left-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  FREE DONATION
                </div>
              ) : listing.transaction_type === 'EXCHANGE' ? (
                <div className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" />
                  <span>FOR EXCHANGE / SWAP</span>
                </div>
              ) : listing.is_exchange_allowed ? (
                <div className="absolute top-4 left-4 bg-indigo-600/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" />
                  <span>SELL OR SWAP</span>
                </div>
              ) : null}

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
                      src={getSafeImageUrl(img.image_url)}
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
                  {listing.transaction_type === 'DONATE'
                    ? 'Free (Donation)'
                    : listing.transaction_type === 'EXCHANGE'
                      ? (Number(listing.price) > 0 ? `Rs ${listing.price} (Est. Value)` : 'For Item Swap')
                      : `Rs ${listing.price}`}
                </span>
              </div>

              {/* Badges for Negotiable & Exchange */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {listing.is_negotiable && listing.transaction_type === 'SELL' && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                    Price is negotiable
                  </div>
                )}
                {(listing.transaction_type === 'EXCHANGE' || listing.is_exchange_allowed) && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                    <Repeat className="w-3 h-3" />
                    Open for Item Exchange
                  </div>
                )}
              </div>

              {/* What Seller Wants in Exchange Callout */}
              {(listing.transaction_type === 'EXCHANGE' || listing.is_exchange_allowed) && listing.exchange_preferences && (
                <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                    <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seller wants in exchange:</span>
                  </div>
                  <p className="text-xs font-bold text-indigo-900 pl-5">
                    &ldquo;{listing.exchange_preferences}&rdquo;
                  </p>
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
                        To protect campus safety and student privacy, login is required to make purchase requests or chat with the seller.
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
                ) : isOwner ? (
                  /* Clean Seller Status & Management Box */
                  <div className="bg-gradient-to-br from-brand-50/60 via-white to-orange-50/30 border border-brand-200/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Live on Campus</span>
                        </div>
                        <h4 className="text-sm font-black text-gray-900 truncate">
                          Your Active Listing
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      You are the seller of this item. Buyers will contact you safely via campus in-app chat and make purchase offers.
                    </p>

                    <div className="space-y-2 pt-1">
                      <Link
                        to={`/edit-listing/${listing.id}`}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-800 font-bold py-2.5 px-4 rounded-md transition-all text-xs flex items-center justify-center gap-2 shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                        <span>Edit Listing Details</span>
                      </Link>

                      {listingOffers.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('seller-offers-panel');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-md transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>View Buyer Requests ({listingOffers.length})</span>
                        </button>
                      ) : (
                        <div className="bg-white/90 border border-dashed border-gray-200 rounded-md py-2 px-3 text-center text-[11px] text-gray-400">
                          No buyer requests yet • Keep checking
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Buyer Actions */
                  <div className="space-y-3">
                    {userOffer?.status === 'PENDING' ? (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2 shadow-2xs">
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>Purchase Request Pending Seller Approval</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleOpenBuyModal}
                          className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer ${
                            listing.transaction_type === 'EXCHANGE'
                              ? 'bg-indigo-600 hover:bg-indigo-700'
                              : 'bg-brand-500 hover:bg-brand-600'
                          }`}
                        >
                          {listing.transaction_type === 'EXCHANGE' ? (
                            <>
                              <Repeat className="w-4 h-4" />
                              <span>Propose Item Exchange (Swap)</span>
                            </>
                          ) : listing.transaction_type === 'DONATE' ? (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              <span>Request Free Donation</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              <span>I Want to Buy This (Rs {listing.price})</span>
                            </>
                          )}
                        </button>

                        {/* Dual option: Also show Propose Exchange if seller is open to it */}
                        {listing.transaction_type === 'SELL' && listing.is_exchange_allowed && (
                          <button
                            type="button"
                            onClick={handleOpenExchangeModal}
                            className="w-full bg-white border border-indigo-500 text-indigo-600 hover:bg-indigo-50/70 font-bold py-2.5 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                          >
                            <Repeat className="w-4 h-4" />
                            <span>Or Propose an Item Exchange</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* In-App Direct Message */}
                    <button
                      type="button"
                      onClick={handleOpenChat}
                      className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send In-App Message</span>
                    </button>

                    {/* Privacy Reassurance Badge */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg py-2 px-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-800 text-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Safe Campus Deal • Private In-App Messaging Only</span>
                    </div>
                  </div>
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
                {/* In-app contact for winning buyer */}
                {userOffer?.status === 'ACCEPTED' && (
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="w-full bg-white hover:bg-brand-50 border border-brand-300 text-brand-700 font-semibold py-2 px-4 rounded-md transition-all shadow-2xs text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-brand-600" />
                    Chat with Seller In-App
                  </button>
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
                {(((listing.seller?.full_name || listing.seller?.username) || 'U')[0] || 'U').toUpperCase()}
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
              <span>Contact Mode:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified In-App Chat
              </span>
            </div>

            {/* Link to DPDP-Compliant Public Seller Profile */}
            <Link
              to={listing.seller?.id ? `/seller/${listing.seller.id}` : '#'}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-brand-600 py-2.5 px-3 rounded-md text-xs font-bold border border-gray-200 transition-colors shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-500" />
              <span>View Verified Public Profile →</span>
            </Link>
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
                        src={getSafeImageUrl(img)}
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
                {isExchangeProposal ? (
                  <>
                    <Repeat className="w-4 h-4 text-indigo-600" />
                    <span>Propose Item Exchange</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-brand-500" />
                    <span>Confirm Purchase Request</span>
                  </>
                )}
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
                  Target Item: <strong className="text-gray-900">{listing.title}</strong>
                </div>
                {listing.exchange_preferences && (
                  <div className="text-xs text-indigo-900 bg-indigo-50/70 p-2 rounded border border-indigo-100">
                    <span className="font-bold">Seller wants in return:</span> &ldquo;{listing.exchange_preferences}&rdquo;
                  </div>
                )}
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>Campus Pickup Spot:</span>
                  <span className="font-semibold text-gray-800">{listing.location}</span>
                </div>
              </div>

              {/* What item are you offering (if exchange proposal) */}
              {isExchangeProposal ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 uppercase mb-1">
                      What item are you offering to swap? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={exchangeItemTitle}
                      onChange={(e) => setExchangeItemTitle(e.target.value)}
                      placeholder="e.g. Casio FX-991EX Calculator (Like New) or Atlas Bicycle"
                      className="w-full border border-indigo-300 rounded-md px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                      <span>Cash Adjustment / Difference (Rs)</span>
                      <span className="text-[10px] text-gray-400 normal-case">Optional (0 if equal trade)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="e.g. 200 (if you'll pay extra) or 0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* Custom Proposed Price for Negotiable Items */
                listing.is_negotiable && listing.transaction_type !== 'DONATE' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                      <span>Your Proposed Price (Rs)</span>
                      <span className="text-[11px] text-brand-600 font-semibold lowercase first-letter:uppercase">Item is negotiable</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder={`Direct price: ${listing.price}`}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                )
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Message for Seller (Optional)
                </label>
                <textarea
                  rows={2}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  placeholder="e.g. Can meet at Uni-Mall at 5 PM today to inspect items."
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
                  className={`flex-1 text-white py-2.5 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                    isExchangeProposal
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-brand-500 hover:bg-brand-600'
                  }`}
                >
                  {submittingBuyRequest ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : isExchangeProposal ? (
                    <Repeat className="w-3.5 h-3.5" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5" />
                  )}
                  {isExchangeProposal ? 'Send Exchange Proposal' : 'Confirm & Send Request'}
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
          image={getSafeImageUrl(listing.images?.[0]?.image_url)}
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
              <button
                type="button"
                onClick={handleOpenChat}
                className="bg-white border border-gray-300 hover:border-brand-500 text-gray-700 hover:text-brand-600 p-2.5 rounded-md shadow-xs flex items-center justify-center cursor-pointer"
                title="Send In-App Message"
              >
                <Send className="w-4 h-4" />
              </button>

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

      {/* Seller Counter-Offer Modal */}
      {showCounterModal && selectedOfferForCounter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-md max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                Propose Counter-Offer
              </h3>
              <button
                onClick={() => setShowCounterModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCounter} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-xs space-y-1">
                <div>Buyer Offer: <strong>Rs {selectedOfferForCounter.offer_amount}</strong></div>
                <div>Listed Price: <strong>Rs {listing.price}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Counter Amount (Rs)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="e.g. 1500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Note for Buyer (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sellerNote}
                  onChange={(e) => setSellerNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  placeholder="e.g. Can do Rs 1500 including accessories."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-md font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCounter}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submittingCounter ? 'Sending...' : 'Send Counter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Resolution Image Lightbox Modal with Zoom Inspection */}
      {isLightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Controls Bar */}
          <div
            className="flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/80 truncate max-w-xs sm:max-w-md">
                {listing.title} ({activeImageIndex + 1} / {images.length || 1})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.min(3, prev + 0.25))}
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.max(0.75, prev - 0.25))}
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-bold"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-md bg-white/20 hover:bg-red-600 text-white transition-colors ml-2"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered High-Res Zoomable Image */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={listing.title}
              style={{ transform: `scale(${lightboxZoom})`, transition: 'transform 0.2s ease-out' }}
              className="max-h-[75vh] max-w-[90vw] object-contain select-none cursor-grab active:cursor-grabbing"
            />
          </div>

          {/* Thumbnail strip & Image Switcher */}
          {images.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setLightboxZoom(1);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? 'border-brand-500 scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getSafeImageUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* In-App Student Chat Drawer */}
      {showChatDrawer && (
        <ChatDrawer
          listingId={listing.id}
          peerId={listing.seller?.id}
          peerName={listing.seller?.full_name || listing.seller?.username}
          listingTitle={listing.title}
          listingPrice={listing.price}
          listingImage={currentImage}
          onClose={() => setShowChatDrawer(false)}
        />
      )}
    </div>
  );
}
