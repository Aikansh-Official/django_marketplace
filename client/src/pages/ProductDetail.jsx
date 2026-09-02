import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  UserCheck
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';

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

  // Fetch current user & listing details
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      const token = localStorage.getItem('access');
      if (token) {
        try {
          const res = await axios.get('http://localhost:8000/api/auth/profile/', {
            headers: { Authorization: `Bearer ${token}` }
          });
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
        const token = localStorage.getItem('access');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`http://localhost:8000/api/marketplace/listings/${id}/`, { headers });
        setListing(res.data);
        setActiveImageIndex(0);

        // Fetch related listings from same category
        if (res.data.category?.slug) {
          try {
            const relatedRes = await axios.get(
              `http://localhost:8000/api/marketplace/listings/?category=${res.data.category.slug}`
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
      const token = localStorage.getItem('access');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.patch(
        `http://localhost:8000/api/marketplace/listings/${id}/status/`,
        { status: newStatus },
        { headers }
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
      const token = localStorage.getItem('access');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`http://localhost:8000/api/marketplace/listings/${id}/`, { headers });
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

  const isOwner = listing.is_seller || (currentUserId && listing.seller?.id === currentUserId);
  const images = listing.images && listing.images.length > 0
    ? listing.images
    : [{ id: 1, image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80' }];

  const currentImage = images[activeImageIndex]?.image_url || images[0]?.image_url;

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

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-600 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
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

      {/* Main Grid: Gallery on Left (8 cols) & Details on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery & Description */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Image Container */}
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
            <div className="relative h-80 sm:h-[420px] w-full bg-gray-100 flex items-center justify-center group">
              <img
                src={currentImage}
                alt={listing.title}
                className="max-h-full max-w-full object-contain p-2"
              />

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
              <li>Only verified `@lpu.in` students are registered on this platform.</li>
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

            {/* Direct Contact Buttons */}
            {listing.status === 'ACTIVE' ? (
              <div className="space-y-2.5 pt-2">
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
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send In-App Message
                </button>
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-200 text-gray-500 text-center py-3 rounded-md text-xs font-bold uppercase">
                Listing is currently {listing.status}
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

            {/* Trust Score */}
            <div className="p-3 bg-gray-50 rounded-md space-y-1.5 border border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-600">Student Trust Score</span>
                <span className="font-bold text-brand-600">
                  {listing.seller?.trust_score || 90}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{ width: `${listing.seller?.trust_score || 90}%` }}
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
                    <img
                      src={img}
                      alt={rel.title}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                    />
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
    </div>
  );
}
