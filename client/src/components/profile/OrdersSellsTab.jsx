import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  QrCode,
  Camera
} from 'lucide-react';
import HandoverQRModal from '../handover/HandoverQRModal';
import HandoverScannerModal from '../handover/HandoverScannerModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function OrdersSellsTab({ onListingsCountChange, profile, isSeller: isSellerProp }) {
  const isSeller = isSellerProp ?? (profile?.role === 'SELLER' || profile?.is_id_verified);
  const [subTab, setSubTab] = useState(isSeller ? 'selling' : 'orders'); // 'selling' | 'orders'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sync subTab if isSeller changes
  useEffect(() => {
    if (!isSeller) {
      setSubTab('orders');
    }
  }, [isSeller]);

  // Handover state
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeOfferForQR, setActiveOfferForQR] = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedOrderForScanner, setSelectedOrderForScanner] = useState(null);

  const handleOpenQRForListing = async (listingId) => {
    try {
      const res = await axios.get(`${API_BASE}/marketplace/listings/${listingId}/offers/`);
      const acceptedOffer = res.data.find((o) => o.status === 'ACCEPTED');
      if (acceptedOffer) {
        const listing = listings.find((l) => l.id === listingId);
        setActiveOfferForQR({
          ...acceptedOffer,
          location: listing?.location,
          image: listing?.images?.[0]?.image_url || acceptedOffer.listing_image
        });
        setShowQRModal(true);
      } else {
        toast.error('No accepted deal found for this reserved listing.');
      }
    } catch (err) {
      toast.error('Failed to load offer details.');
    }
  };

  const handleCancelDeal = async (offerId) => {
    if (!window.confirm('Are you sure you want to cancel this campus deal? The item will be made available again.')) {
      return;
    }
    try {
      await axios.post(`${API_BASE}/marketplace/offers/${offerId}/cancel/`);
      toast.success('Deal cancelled. Listing restored to Active.');
      fetchMyOffers();
      if (isSeller) fetchMyListings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel deal.');
    }
  };

  const handleHandoverSuccess = () => {
    setShowQRModal(false);
    setShowScannerModal(false);
    fetchMyOffers();
    if (isSeller) fetchMyListings();
  };

  const fetchMyOffers = async () => {
    setLoadingOrders(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/my-offers/`);
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load my offers', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchMyListings = async () => {
    if (!isSeller) return;
    setLoading(true);
    try {
      const url =
        statusFilter === 'ALL'
          ? `${API_BASE}/marketplace/my-listings/`
          : `${API_BASE}/marketplace/my-listings/?status=${statusFilter}`;
      const res = await axios.get(url);
      setListings(res.data);
      if (onListingsCountChange) {
        onListingsCountChange(res.data.length);
      }
    } catch (err) {
      console.error('Failed to load my listings', err);
      toast.error('Could not load listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSeller) {
      fetchMyOffers();
    } else if (subTab === 'selling') {
      fetchMyListings();
    } else if (subTab === 'orders') {
      fetchMyOffers();
    }
  }, [statusFilter, subTab, isSeller]);

  useEffect(() => {
    const handleDealDone = () => {
      if (isSeller) fetchMyListings();
      fetchMyOffers();
    };

    const handleStorage = (e) => {
      if (e.key === 'deal_completed_event') {
        handleDealDone();
      }
    };

    window.addEventListener('deal-completed', handleDealDone);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('deal-completed', handleDealDone);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleStatusChange = async (listingId, newStatus) => {
    const currentItem = listings.find((l) => l.id === listingId);
    if (currentItem?.status === 'SOLD') {
      toast.error('This item has already been marked as Sold and cannot be changed.');
      return;
    }
    try {
      await axios.patch(
        `${API_BASE}/marketplace/listings/${listingId}/status/`,
        { status: newStatus }
      );
      toast.success(`Listing status marked as ${newStatus}`);
      fetchMyListings();
    } catch (err) {
      console.error('Failed to change status', err);
      toast.error(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/marketplace/listings/${deleteModalId}/`);
      toast.success('Listing permanently removed.');
      setDeleteModalId(null);
      fetchMyListings();
    } catch (err) {
      console.error('Failed to delete listing', err);
      toast.error('Failed to delete listing.');
    } finally {
      setDeleting(false);
    }
  };

  const totalListings = listings.length;
  const activeCount = listings.filter((l) => l.status === 'ACTIVE').length;
  const soldCount = listings.filter((l) => l.status === 'SOLD').length;
  const totalViews = listings.reduce((acc, curr) => acc + (curr.views_count || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Reserved
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Sold
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Hidden
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {isSeller ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-md w-fit">
            <button
              type="button"
              onClick={() => setSubTab('selling')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                subTab === 'selling'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 text-brand-500" />
              My Sell Listings ({totalListings})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('orders')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                subTab === 'orders'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              My Orders & Trades ({orders.length})
            </button>
          </div>

          {subTab === 'selling' && (
            <Link
              to="/sell"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2.5 px-4 rounded-md transition-all shadow-sm hover:shadow-md self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Post New Listing
            </Link>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200 shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                My Orders & Campus Deals
              </h2>
              <p className="text-xs text-gray-500">
                Track your item purchase offers, meetup status, and order history
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            {orders.length} {orders.length === 1 ? 'Offer' : 'Offers'}
          </span>
        </div>
      )}

      {isSeller && subTab === 'selling' ? (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white border border-gray-200/90 rounded-md p-3 sm:p-4 shadow-sm">
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                Total Listings
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{totalListings}</div>
            </div>
            <div className="bg-white border border-gray-200/90 rounded-md p-3 sm:p-4 shadow-sm">
              <div className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
                Active Now
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
            </div>
            <div className="bg-white border border-gray-200/90 rounded-md p-3 sm:p-4 shadow-sm">
              <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                Items Sold
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-700 mt-1">{soldCount}</div>
            </div>
            <div className="bg-white border border-gray-200/90 rounded-md p-3 sm:p-4 shadow-sm">
              <div className="text-[10px] font-extrabold text-brand-600 uppercase tracking-wider">
                Total Views
              </div>
              <div className="text-xl sm:text-2xl font-black text-brand-700 mt-1">{totalViews}</div>
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 touch-pan-x scrollbar-none">
            {[
              { key: 'ALL', label: 'All Items' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'PENDING', label: 'Reserved' },
              { key: 'SOLD', label: 'Sold' },
              { key: 'HIDDEN', label: 'Hidden' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                  statusFilter === tab.key
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Listings List */}
          {loading ? (
            <div className="flex justify-center items-center py-20 bg-white rounded-md border border-gray-200">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white border border-gray-200/90 rounded-md p-8 sm:p-12 text-center shadow-sm">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900">No listings found</h3>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                You do not have any items in the selected status filter.
              </p>
              <Link
                to="/sell"
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-md text-xs inline-flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Sell an Item Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {listings.map((item) => {
                const cover =
                  item.images?.find((i) => i.is_primary)?.image_url ||
                  item.images?.[0]?.image_url;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200/90 rounded-md p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 shadow-sm hover:border-gray-300 transition-all"
                  >
                    {/* Left Thumbnail & Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Responsive thumbnail size */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                        {cover ? (
                          <img
                            src={cover}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-gray-300" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.status)}
                          <span className="text-[11px] text-gray-400 font-semibold">
                            {item.category?.name}
                          </span>
                          {item.offers_count > 0 && (
                            <Link
                              to={`/listing/${item.id}`}
                              className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full hover:bg-brand-100 transition-colors"
                            >
                              <ShoppingBag className="w-3 h-3 text-brand-500" />
                              {item.offers_count} {item.offers_count === 1 ? 'Buyer Request' : 'Buyer Requests'}
                            </Link>
                          )}
                        </div>

                        <Link
                          to={`/listing/${item.id}`}
                          className="font-bold text-sm text-gray-900 hover:text-brand-600 truncate block transition-colors"
                        >
                          {item.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="font-black text-gray-900">
                            {item.transaction_type === 'DONATE' ? 'Free' : `Rs ${item.price}`}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {item.location}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                            {item.views_count} views
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                      {item.status === 'PENDING' && (
                        <button
                          onClick={() => handleOpenQRForListing(item.id)}
                          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Generate Handover QR & PIN"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Handover QR
                        </button>
                      )}

                      {item.offers_count > 0 && item.status !== 'PENDING' && (
                        <Link
                          to={`/listing/${item.id}`}
                          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Review ({item.offers_count})
                        </Link>
                      )}

                      {item.status === 'SOLD' ? (
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2 text-xs font-bold flex items-center gap-1 select-none">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Sold
                        </span>
                      ) : (
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
                        >
                          <option value="ACTIVE">Mark Active</option>
                          <option value="PENDING">Mark Reserved</option>
                          <option value="SOLD">Mark Sold</option>
                          <option value="HIDDEN">Mark Hidden</option>
                        </select>
                      )}

                      <Link
                        to={`/listing/${item.id}`}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-2.5 rounded-md transition-colors border border-gray-200"
                        title="View Listing"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      {item.status !== 'SOLD' && (
                        <Link
                          to={`/edit-listing/${item.id}`}
                          className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-2.5 rounded-md transition-colors border border-gray-200"
                          title="Edit Listing"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                      )}

                      <button
                        onClick={() => setDeleteModalId(item.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-md transition-colors border border-red-100"
                        title="Delete Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Real Orders & Trade Offers View from Database */
        <div className="space-y-4">
          <div className="bg-white rounded-md border border-gray-200/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                  Campus Trade Deals & Offers
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Offers and purchase inquiries you have submitted to sellers.
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {orders.length} Offers
              </span>
            </div>

            {loadingOrders ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800">No active trade deals or offers yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  When you submit an offer or coordinate a campus meetup for an item, it will be tracked here.
                </p>
                <div className="pt-2">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-4 rounded-md text-xs transition-colors shadow-sm"
                  >
                    Browse Campus Marketplace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-gray-50/80 border border-gray-200/80 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {ord.listing_image ? (
                        <img
                          src={ord.listing_image}
                          alt=""
                          className="w-14 h-14 rounded-md object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              ord.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'ACCEPTED'
                                ? 'bg-blue-100 text-blue-800'
                                : ord.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status === 'COMPLETED'
                              ? '🎉 Purchased & Verified'
                              : ord.status === 'ACCEPTED'
                              ? 'Deal Accepted (Meetup Pending)'
                              : ord.status === 'REJECTED'
                              ? 'Request Declined'
                              : ord.status === 'CANCELLED'
                              ? 'Deal Cancelled'
                              : 'Pending Seller Response'}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(ord.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <Link
                          to={`/listing/${ord.listing}`}
                          className="font-bold text-sm text-gray-900 hover:text-brand-600 truncate block"
                        >
                          {ord.listing_title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span className="font-black text-gray-900">
                            Purchase Price: ₹{ord.offer_amount}
                          </span>
                          <span>•</span>
                          <span>
                            Seller: <strong>{ord.seller_name || `@${ord.seller_reg}`}</strong>
                          </span>
                          {ord.meetup_location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {ord.meetup_location}
                              </span>
                            </>
                          )}
                        </div>
                        {ord.buyer_message && (
                          <p className="text-xs text-gray-500 italic mt-1 bg-white/60 p-1.5 rounded border border-gray-100">
                            Your Note: "{ord.buyer_message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ord.status === 'ACCEPTED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedOrderForScanner(ord);
                              setShowScannerModal(true);
                            }}
                            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Complete Handover
                          </button>
                          <button
                            onClick={() => handleCancelDeal(ord.id)}
                            className="px-2.5 py-2 rounded-md border border-gray-300 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Cancel Deal"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      <Link
                        to={`/listing/${ord.listing}`}
                        className="px-3.5 py-2 rounded-md border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
                      >
                        View Listing
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-md max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <h3 className="text-base font-extrabold text-gray-900">Delete Listing?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This item will be permanently deleted and removed from the marketplace.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-md font-bold text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-md font-bold text-xs disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover QR Modal (for Seller) */}
      {showQRModal && activeOfferForQR && (
        <HandoverQRModal
          offerId={activeOfferForQR.id}
          listingId={activeOfferForQR.listing || activeOfferForQR.listing_id}
          listingTitle={activeOfferForQR.listing_title}
          buyerName={activeOfferForQR.buyer_name || activeOfferForQR.buyer_reg}
          price={activeOfferForQR.offer_amount}
          location={activeOfferForQR.location}
          image={activeOfferForQR.image}
          existingSession={activeOfferForQR.active_handover}
          onClose={() => setShowQRModal(false)}
          onComplete={handleHandoverSuccess}
        />
      )}

      {/* Handover Scanner Modal (for Buyer) */}
      {showScannerModal && (
        <HandoverScannerModal
          listingId={selectedOrderForScanner?.listing}
          defaultOfferId={selectedOrderForScanner?.id}
          onClose={() => setShowScannerModal(false)}
          onSuccess={handleHandoverSuccess}
        />
      )}
    </div>
  );
}
