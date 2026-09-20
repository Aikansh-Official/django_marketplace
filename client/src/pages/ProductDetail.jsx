import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { submitReport } from '../services/api';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Flag,
  Heart,
  Mail,
  Package,
  Share2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { toggleSavedItem, isItemSaved } from '../utils/savedStore';
import HandoverQRModal from '../components/handover/HandoverQRModal';
import HandoverScannerModal from '../components/handover/HandoverScannerModal';
import UniversalLoader from '../components/common/UniversalLoader';
import ChatDrawer from '../components/chat/ChatDrawer';
import { getSafeImageUrl } from '../utils/imageUrl';

// Modular Product Components
import ImageGallery from '../components/product/ImageGallery';
import StatusBanners from '../components/product/StatusBanners';
import SellerControlPanel from '../components/product/SellerControlPanel';
import PriceCard from '../components/product/PriceCard';
import MobileStickyBar from '../components/product/MobileStickyBar';

// Modular Modals
import BuyOfferModal from '../components/product/modals/BuyOfferModal';
import CounterOfferModal from '../components/product/modals/CounterOfferModal';
import ReportModal from '../components/product/modals/ReportModal';
import DeleteConfirmModal from '../components/product/modals/DeleteConfirmModal';

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
        } catch (e) {}
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

  // Fetch listing data
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

  const isOwner = Boolean(
    listing?.is_seller || (currentUserId && listing?.seller?.id === currentUserId)
  );

  // Offer State Fetchers
  const fetchListingOffers = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/marketplace/listings/${id}/offers/`);
      setListingOffers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  }, [id]);

  const fetchUserOffer = useCallback(async () => {
    if (!id || !currentUserId) return;
    try {
      const res = await api.get('/marketplace/my-offers/');
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
          ? res.data.results
          : [];
      const myOf = list.find((o) => String(o.listing) === String(id));
      if (myOf) setUserOffer(myOf);
    } catch (e) {}
  }, [id, currentUserId]);

  const refreshOfferState = useCallback(() => {
    if (isOwner) {
      fetchListingOffers();
    } else if (currentUserId) {
      fetchUserOffer();
    }
  }, [isOwner, currentUserId, fetchListingOffers, fetchUserOffer]);

  useEffect(() => {
    refreshOfferState();
  }, [refreshOfferState]);

  // Real-Time Buyer Polling: When buyer has an active offer, poll every 5s to pick up seller response
  useEffect(() => {
    if (isOwner || !currentUserId || !userOffer) return;
    if (userOffer.status !== 'PENDING' && userOffer.status !== 'COUNTERED') return;

    const interval = setInterval(() => {
      fetchUserOffer();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOwner, currentUserId, userOffer?.status, fetchUserOffer]);

  // Real-time synchronization for Seller & Buyer when deal is PENDING (Reserved)
  useEffect(() => {
    if (!id || listing?.status !== 'PENDING') return;

    const syncPendingListing = async () => {
      try {
        const res = await api.get(`/marketplace/listings/${id}/`);
        if (res.data.status === 'SOLD') {
          setListing(res.data);
          refreshOfferState();
          setShowQRModal(false);
          setShowScannerModal(false);
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        } else if (res.data.status === 'ACTIVE' && listing.status === 'PENDING') {
          setListing(res.data);
          refreshOfferState();
        }
      } catch (e) {}
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
  }, [id, listing?.status, refreshOfferState]);

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
        .catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  };

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
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-md transition-all text-sm inline-block shadow-sm"
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[5%] py-4 sm:py-6 pb-24 md:pb-8 animate-fade-in-up">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 font-medium overflow-hidden">
          <Link to="/" className="hover:text-brand-600 transition-colors flex items-center gap-1 shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Marketplace</span>
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
            className={`flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-600'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save Item'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-600 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          {!isOwner && (
            <button
              type="button"
              onClick={handleOpenReportModal}
              className="flex items-center gap-1 bg-white border border-gray-200 hover:border-red-300 text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Report this listing"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Seller Management Panel */}
      {isOwner && (
        <SellerControlPanel
          listing={listing}
          listingOffers={listingOffers}
          statusUpdating={statusUpdating}
          cancellingDeal={cancellingDeal}
          onStatusChange={handleStatusChange}
          onDeleteClick={() => setShowDeleteModal(true)}
          onRespondOffer={handleRespondOffer}
          onOpenCounterModal={handleOpenCounterModal}
          onOpenQRModal={(off) => {
            setActiveOfferForQR(off);
            setShowQRModal(true);
          }}
          onCancelDeal={handleCancelDeal}
        />
      )}

      {/* Status & Action Banners for Buyer */}
      <StatusBanners
        listing={listing}
        userOffer={userOffer}
        respondingToCounter={respondingToCounter}
        cancellingDeal={cancellingDeal}
        onBuyerCounterRespond={handleBuyerCounterRespond}
        onOpenScannerModal={() => setShowScannerModal(true)}
        onCancelDeal={handleCancelDeal}
      />

      {/* Main Grid: Gallery on Left (md: 7 cols / lg: 8 cols) & Details on Right (md: 5 cols / lg: 4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Image Gallery & Description */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          <ImageGallery
            images={images}
            listing={listing}
            activeImageIndex={activeImageIndex}
            setActiveImageIndex={setActiveImageIndex}
          />

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
                <span className="font-bold text-gray-800">{listing.location || 'Campus'}</span>
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
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-md p-5 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>LPU Student Safety Recommendations</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Meet in bustling campus public areas such as <strong>Uni-Mall</strong>, <strong>Central Library</strong>, or your hostel entrance.</li>
              <li>Inspect the product physically before making UPI payments.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Pricing, Actions & Seller Profile */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          <PriceCard
            listing={listing}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            userOffer={userOffer}
            listingOffers={listingOffers}
            cancellingDeal={cancellingDeal}
            onTriggerLogin={triggerLogin}
            onOpenBuyModal={handleOpenBuyModal}
            onOpenExchangeModal={handleOpenExchangeModal}
            onOpenChat={handleOpenChat}
            onOpenScannerModal={() => setShowScannerModal(true)}
            onOpenQRModal={(off) => {
              setActiveOfferForQR(off);
              setShowQRModal(true);
            }}
            onCancelDeal={handleCancelDeal}
          />

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

            {/* Trust Score */}
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
                />
              </div>
            </div>

            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
              <span>Contact Mode:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified In-App Chat
              </span>
            </div>

            <Link
              to={`/seller/${listing.seller?.id || ''}`}
              className="w-full bg-gray-50 hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 py-2.5 rounded-md text-xs font-bold text-gray-700 text-center transition-colors block mt-2"
            >
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

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
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
                  <div className="p-3.5 flex flex-col flex-grow">
                    <span className="font-extrabold text-base text-gray-900">
                      Rs {rel.price}
                    </span>
                    <p className="text-xs text-gray-600 truncate mt-1">{rel.title}</p>
                    <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="truncate max-w-[70%]">{rel.location || 'Campus'}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom CTA Bar */}
      <MobileStickyBar
        listing={listing}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        userOffer={userOffer}
        listingOffers={listingOffers}
        respondingToCounter={respondingToCounter}
        onTriggerLogin={triggerLogin}
        onOpenBuyModal={handleOpenBuyModal}
        onOpenChat={handleOpenChat}
        onOpenScannerModal={() => setShowScannerModal(true)}
        onOpenQRModal={(off) => {
          setActiveOfferForQR(off);
          setShowQRModal(true);
        }}
        onBuyerCounterRespond={handleBuyerCounterRespond}
      />

      {/* Delete Listing Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        listingTitle={listing?.title}
        deleting={deleting}
        onConfirmDelete={handleDelete}
      />

      {/* Purchase / Exchange Request Modal */}
      <BuyOfferModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        listing={listing}
        isExchangeProposal={isExchangeProposal}
        exchangeItemTitle={exchangeItemTitle}
        setExchangeItemTitle={setExchangeItemTitle}
        buyerMessage={buyerMessage}
        setBuyerMessage={setBuyerMessage}
        offerAmount={offerAmount}
        setOfferAmount={setOfferAmount}
        submittingBuyRequest={submittingBuyRequest}
        onSubmit={handleSubmitBuyRequest}
      />

      {/* Seller Counter-Offer Modal */}
      <CounterOfferModal
        isOpen={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        listing={listing}
        selectedOffer={selectedOfferForCounter}
        counterAmount={counterAmount}
        setCounterAmount={setCounterAmount}
        sellerNote={sellerNote}
        setSellerNote={setSellerNote}
        submittingCounter={submittingCounter}
        onSubmit={handleSubmitCounter}
      />

      {/* Report Listing Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        submittingReport={submittingReport}
        onSubmit={handleSubmitReport}
      />

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

      {/* In-App Student Chat Drawer */}
      {showChatDrawer && (
        <ChatDrawer
          listingId={listing.id}
          peerId={listing.seller?.id}
          peerName={listing.seller?.full_name || listing.seller?.username}
          listingTitle={listing.title}
          listingPrice={listing.price}
          listingImage={images[0]?.image_url ? getSafeImageUrl(images[0]?.image_url) : ''}
          onClose={() => setShowChatDrawer(false)}
        />
      )}
    </div>
  );
}
