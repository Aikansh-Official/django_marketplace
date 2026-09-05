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
  X
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import { toggleSavedItem, isItemSaved } from '../utils/savedStore';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [relatedListings, setRelatedListings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
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

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Duplicate / Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (id) {
      setIsSaved(isItemSaved(id));
    }
  }, [id]);

  const handleToggleSave = () => {
    if (!listing) return;
    const res = toggleSavedItem(listing);
    setIsSaved(res.isSaved);
    if (res.isSaved) {
      toast.success('Saved to your Wishlist!', { icon: '❤️' });
    } else {
      toast.success('Removed from saved items.');
    }
  };

  // Fetch current user & listing details
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      const token = localStorage.getItem('access');
      if (token) {
        try {
          const res = await axios.get(`${API_BASE}/auth/profile/`);
          setCurrentUserId(res.data.id);
        } catch (e) {
          console.error('Could not fetch user profile', e);
        }
      }
    };
    fetchCurrentProfile();
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
      toast.error('Failed to update listing status.');
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
        .catch(() => {});
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
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
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
    `Hi ${listing.seller?.full_name || 'there'}, I saw your listing "${listing.title}" on LPUTrade for Rs ${listing.price}. Is it still available?`
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Link to="/" className="hover:text-brand-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Marketplace
          </Link>
          <span>/</span>
          {listing.category && (
            <>
              <Link to={`/?category=${listing.category.slug}`} className="hover:text-brand-600">
                {listing.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-800 font-semibold truncate max-w-[200px] sm:max-w-xs">
            {listing.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs ${
              isSaved
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
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-600 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>

          {!isOwner && (
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1 bg-white border border-gray-200 hover:border-red-300 text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-xs"
              title="Report this listing"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Owner Management Bar */}
      {isOwner && (
        <div className="bg-brand-50/80 border border-brand-200 rounded-md p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                Seller Control Panel
              </div>
              <div className="text-xs text-brand-700">
                You own this listing. Manage its visibility and status.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status Switcher */}
            <div className="flex items-center bg-white border border-brand-200 rounded-md p-1 shadow-sm">
              {['ACTIVE', 'PENDING', 'SOLD', 'HIDDEN'].map((st) => (
                <button
                  key={st}
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                    listing.status === st
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-brand-600'
                  }`}
                >
                  {st === 'PENDING' ? 'Reserved' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <Link
              to={`/edit-listing/${listing.id}`}
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-600 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Link>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Incoming Purchase Requests for Seller */}
      {isOwner && listingOffers.length > 0 && (
        <div className="bg-white border border-brand-200 rounded-md p-5 mb-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-600" />
              Incoming Student Purchase Requests ({listingOffers.length})
            </h3>
            <span className="text-[11px] text-gray-500 font-medium">
              Accept a student to reserve this item
            </span>
          </div>

          <div className="space-y-2.5">
            {listingOffers.map((off) => (
              <div
                key={off.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/80 rounded-md border border-gray-200 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-gray-900">{off.buyer_name || off.buyer_reg}</strong>
                    <span className="text-gray-400">(@{off.buyer_reg})</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Trust: {off.buyer_trust_score || 50}/100
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        off.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : off.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {off.status === 'ACCEPTED' ? 'Reserved' : off.status}
                    </span>
                  </div>
                  {off.buyer_message && (
                    <p className="text-gray-600 italic">"{off.buyer_message}"</p>
                  )}
                  <span className="text-[10px] text-gray-400">
                    Requested on {new Date(off.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {off.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRespondOffer(off.id, 'ACCEPT')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept & Reserve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondOffer(off.id, 'REJECT')}
                        className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </>
                  ) : off.status === 'ACCEPTED' ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Deal Reserved
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Status Banner for Buyers */}
      {listing.status === 'PENDING' && (
        userOffer?.status === 'ACCEPTED' ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4 mb-6 flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-950">🎉 Your Purchase Request Was Accepted!</h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                The seller has reserved this item for you. Reach out via WhatsApp or Phone below to complete your campus meetup.
              </p>
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
            <div className="relative h-80 sm:h-[420px] w-full bg-gray-100 flex items-center justify-center group">
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
              {listing.transaction_type === 'RENT' && (
                <div className="absolute top-4 left-4 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  FOR RENT ({listing.rent_period ? `/${listing.rent_period}` : ''})
                </div>
              )}
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
                    className={`relative w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all aspect-square bg-white ${
                      activeImageIndex === idx
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
                  {listing.transaction_type === 'RENT' ? 'Rental Fee' : 'Price'}
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
                {listing.transaction_type === 'RENT' && listing.rent_period && (
                  <span className="text-sm text-gray-500 font-semibold">
                    /{listing.rent_period}
                  </span>
                )}
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
              <div className="space-y-2.5 pt-2">
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
                      onClick={() => setShowBuyModal(true)}
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
              </div>
            ) : listing.status === 'PENDING' ? (
              <div className="space-y-2 pt-2">
                {userOffer?.status === 'ACCEPTED' ? (
                  <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 p-3.5 rounded-md text-xs font-bold text-center space-y-1">
                    <div>✅ Deal Reserved for You!</div>
                    <div className="font-normal text-[11px] text-emerald-800">
                      Coordinate with the seller via WhatsApp or Phone to meet on campus.
                    </div>
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
                <div className="font-bold text-sm text-gray-900 truncate">
                  {listing.seller?.full_name || listing.seller?.username || 'LPU Student'}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Student (@lpu.in)</span>
                </div>
              </div>
            </div>

            {/* Trust Score from real user profile */}
            <div className="p-3 bg-gray-50 rounded-md space-y-1.5 border border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-600">Student Trust Score</span>
                <span className="font-bold text-brand-600">
                  {listing.seller?.trust_score ?? 50}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{ width: `${listing.seller?.trust_score ?? 50}%` }}
                ></div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
              <span>Contact Preference:</span>
              <span className="font-bold text-gray-700">
                {listing.contact_preference === 'ALL'
                  ? 'All Channels'
                  : listing.contact_preference.replace('_', ' ')}
              </span>
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
      {showBuyModal && (
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
    </div>
  );
}
