import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Tag, MapPin, Eye, EyeOff, Search, Trash2, Edit3, X,
  ExternalLink, Phone, MessageSquare, AlertTriangle,
  CheckCircle2, RefreshCw, Loader2, Maximize2, ShoppingBag,
  DollarSign, HeartHandshake, Layers
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, PENDING, SOLD, HIDDEN
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SELL, DONATE
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals & Active Selections
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchListingsAndCategories = async () => {
    setLoading(true);
    try {
      const [listingsRes, categoriesRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/marketplace/admin/listings/`),
        axios.get(`${API_BASE}/marketplace/categories/`)
      ]);

      if (listingsRes.status === 'fulfilled') {
        setListings(listingsRes.value.data);
      } else {
        toast.error('Failed to load listings');
      }

      if (categoriesRes.status === 'fulfilled') {
        setCategories(categoriesRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching listings data:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListingsAndCategories();
  }, []);

  // Quick Change Status (Active, Hidden, Sold, Pending)
  const handleChangeStatus = async (listingId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await axios.patch(`${API_BASE}/marketplace/admin/listings/${listingId}/`, {
        status: newStatus
      });
      toast.success(`Status updated to ${newStatus}`);
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
      if (selectedListing && selectedListing.id === listingId) {
        setSelectedListing(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Failed to change status:', error);
      toast.error(error.response?.data?.error || 'Failed to update listing status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Listing
  const handleDeleteListing = async (listingId, title) => {
    if (window.confirm(`Are you sure you want to permanently delete the listing "${title}"? This cannot be undone.`)) {
      setActionLoading(true);
      try {
        await axios.delete(`${API_BASE}/marketplace/admin/listings/${listingId}/`);
        toast.success("Listing deleted successfully.");
        setListings(prev => prev.filter(l => l.id !== listingId));
        if (selectedListing && selectedListing.id === listingId) {
          setSelectedListing(null);
        }
        if (editingListing && editingListing.id === listingId) {
          setEditingListing(null);
        }
      } catch (error) {
        console.error("Failed to delete listing", error);
        toast.error("Failed to delete listing.");
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Open Edit Modal
  const handleStartEdit = (listing) => {
    setEditingListing(listing);
    setEditFormData({
      title: listing.title || '',
      description: listing.description || '',
      price: listing.price || 0,
      is_negotiable: Boolean(listing.is_negotiable),
      transaction_type: listing.transaction_type || 'SELL',
      condition: listing.condition || 'GOOD',
      location: listing.location || '',
      status: listing.status || 'ACTIVE',
      category: listing.category?.id || listing.category || '',
      contact_phone: listing.contact_phone || '',
      contact_whatsapp: listing.contact_whatsapp || '',
      contact_preference: listing.contact_preference || 'ALL'
    });
  };

  // Submit Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.patch(`${API_BASE}/marketplace/admin/listings/${editingListing.id}/`, editFormData);
      toast.success("Listing updated successfully!");
      setListings(prev => prev.map(l => l.id === editingListing.id ? res.data : l));
      if (selectedListing && selectedListing.id === editingListing.id) {
        setSelectedListing(res.data);
      }
      setEditingListing(null);
    } catch (error) {
      console.error("Failed to update listing", error);
      toast.error(error.response?.data?.price?.[0] || "Failed to update listing.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter listings
  const filteredListings = listings.filter(item => {
    // Status Filter
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

    // Type Filter
    if (typeFilter !== 'ALL' && item.transaction_type !== typeFilter) return false;

    // Category Filter
    if (categoryFilter !== 'ALL') {
      const catId = item.category?.id || item.category;
      if (String(catId) !== String(categoryFilter)) return false;
    }

    // Search Query (Title, Seller Name, Username, Location)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (item.title || '').toLowerCase();
      const location = (item.location || '').toLowerCase();
      const sellerName = (item.seller?.full_name || '').toLowerCase();
      const sellerUser = (item.seller?.username || '').toLowerCase();
      return title.includes(q) || location.includes(q) || sellerName.includes(q) || sellerUser.includes(q);
    }

    return true;
  });

  return (
    <>
      <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden relative">
        {/* Top Header with Stats */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/70">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Marketplace Listings</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {listings.length} Items Total
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Full control to inspect, edit details, toggle active/hidden/sold status, and delete any student listing.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={fetchListingsAndCategories}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-200 bg-white/60 text-xs divide-x divide-gray-100">
          <div className="p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Active Listings</span>
            <span className="text-base font-black text-green-700">
              {listings.filter(l => l.status === 'ACTIVE').length}
            </span>
          </div>
          <div className="p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Reserved / Pending</span>
            <span className="text-base font-black text-amber-700">
              {listings.filter(l => l.status === 'PENDING').length}
            </span>
          </div>
          <div className="p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Sold & Verified</span>
            <span className="text-base font-black text-blue-700">
              {listings.filter(l => l.status === 'SOLD').length}
            </span>
          </div>
          <div className="p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Hidden / Moderated</span>
            <span className="text-base font-black text-gray-600">
              {listings.filter(l => l.status === 'HIDDEN').length}
            </span>
          </div>
        </div>

        {/* Search & Multi-Filters Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Item Title, Campus Location, or Seller Name..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2.5 py-1.5 font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Live)</option>
              <option value="PENDING">Pending (Reserved)</option>
              <option value="SOLD">Sold</option>
              <option value="HIDDEN">Hidden</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2.5 py-1.5 font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Types (Sell & Donate)</option>
              <option value="SELL">For Sale</option>
              <option value="DONATE">Donations (Free)</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-200 rounded-md px-2.5 py-1.5 font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Listings Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Item Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Price / Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                  Admin Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gray-200 rounded-md"></div>
                        <div className="space-y-1.5">
                          <div className="h-4 w-40 bg-gray-200 rounded"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-gray-200 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-10 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-7 w-24 bg-gray-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredListings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-gray-400" />
                      <p className="font-semibold text-gray-700">No listings found matching your filters.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setCategoryFilter('ALL'); }}
                        className="text-xs font-bold text-brand-600 hover:underline"
                      >
                        Reset all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredListings.map((listing) => {
                  const cover = listing.images?.find(img => img.is_primary)?.image_url || listing.images?.[0]?.image_url;
                  const categoryName = listing.category?.name || 'Uncategorized';

                  return (
                    <tr key={listing.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Item Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            onClick={() => cover && setLightboxImage(cover)}
                            className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border border-gray-200 cursor-pointer group relative"
                          >
                            {cover ? (
                              <>
                                <img src={cover} alt="" className="object-cover h-full w-full group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </div>
                              </>
                            ) : (
                              <Tag className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-3.5 max-w-[220px]">
                            <div className="text-sm font-bold text-gray-900 truncate" title={listing.title}>
                              {listing.title}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                                {categoryName}
                              </span>
                              <span>•</span>
                              <span>{listing.condition?.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Seller */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900">
                          {listing.seller?.full_name || listing.seller?.username || 'Unknown Seller'}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          @{listing.seller?.username}
                        </div>
                      </td>

                      {/* Price / Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {listing.transaction_type === 'DONATE' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black inline-flex items-center gap-1">
                            <HeartHandshake className="w-3 h-3" /> Free Donate
                          </span>
                        ) : (
                          <div>
                            <span className="text-sm font-black text-gray-900">
                              ₹{listing.price}
                            </span>
                            {listing.is_negotiable && (
                              <span className="text-[10px] font-semibold text-gray-400 block">
                                (Negotiable)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Campus Location */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-700 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{listing.location || 'Campus'}</span>
                        </div>
                      </td>

                      {/* Status & Quick Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={listing.status}
                          disabled={actionLoading}
                          onChange={(e) => handleChangeStatus(listing.id, e.target.value)}
                          className={`text-xs font-bold px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 ${
                            listing.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : listing.status === 'SOLD'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : listing.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="PENDING">PENDING</option>
                          <option value="SOLD">SOLD</option>
                          <option value="HIDDEN">HIDDEN</option>
                        </select>
                      </td>

                      {/* Views Count */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono">{listing.views_count || 0}</span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedListing(listing);
                              setActiveImageIndex(0);
                            }}
                            title="Inspect Details & Photos"
                            className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded border border-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleStartEdit(listing)}
                            title="Edit Listing"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteListing(listing.id, listing.title)}
                            title="Delete Listing"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW LISTING DETAILS & IMAGE GALLERY */}
      {/* ========================================================================= */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {selectedListing.title}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  <span>Category: <strong>{selectedListing.category?.name || 'Uncategorized'}</strong></span>
                  <span>•</span>
                  <span>Listed on: {new Date(selectedListing.created_at).toLocaleDateString()}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedListing(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Image Gallery */}
              {selectedListing.images && selectedListing.images.length > 0 ? (
                <div>
                  {/* Main Display Image */}
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-[16/9] flex items-center justify-center group">
                    <img
                      src={selectedListing.images[activeImageIndex]?.image_url}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setLightboxImage(selectedListing.images[activeImageIndex]?.image_url)}
                      className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thumbnail Strip */}
                  {selectedListing.images.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {selectedListing.images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`h-14 w-14 rounded-md overflow-hidden border-2 flex-shrink-0 ${
                            activeImageIndex === idx ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200 opacity-70'
                          }`}
                        >
                          <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-400 text-xs font-medium">
                  No images attached to this listing.
                </div>
              )}

              {/* Price & Meta Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Price & Type</span>
                  <div className="text-xl font-black text-gray-900 mt-0.5">
                    {selectedListing.transaction_type === 'DONATE' ? 'Free (Donation)' : `₹${selectedListing.price}`}
                    {selectedListing.is_negotiable && (
                      <span className="text-xs font-medium text-gray-500 ml-2">(Price Negotiable)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    selectedListing.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : selectedListing.status === 'SOLD'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedListing.status}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-bold bg-gray-200 text-gray-800 rounded-full">
                    {selectedListing.condition?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Description</h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedListing.description || 'No description provided.'}
                </div>
              </div>

              {/* Seller & Contact Details */}
              <div className="p-4 bg-brand-50/50 border border-brand-100 rounded-lg">
                <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-2">
                  Seller & Campus Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">Student Seller:</span>
                    <strong className="text-gray-900">{selectedListing.seller?.full_name || selectedListing.seller?.username}</strong>
                    <p className="text-[11px] text-gray-500">@{selectedListing.seller?.username}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Meeting Location:</span>
                    <strong className="text-gray-900 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {selectedListing.location || 'Campus'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Contact Preference:</span>
                    <strong className="text-gray-900">{selectedListing.contact_preference || 'In-App Chat'}</strong>
                    {selectedListing.contact_phone && (
                      <p className="text-[11px] text-gray-600 font-mono mt-0.5">📞 {selectedListing.contact_phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Quick Status:</span>
                  <button
                    onClick={() => handleChangeStatus(selectedListing.id, 'ACTIVE')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleChangeStatus(selectedListing.id, 'HIDDEN')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => handleChangeStatus(selectedListing.id, 'SOLD')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded"
                  >
                    Sold
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const itemToEdit = selectedListing;
                      setSelectedListing(null);
                      handleStartEdit(itemToEdit);
                    }}
                    className="px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Listing
                  </button>

                  <button
                    onClick={() => handleDeleteListing(selectedListing.id, selectedListing.title)}
                    className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT LISTING FORM */}
      {/* ========================================================================= */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <div>
                <h3 className="text-base font-black text-gray-900">Edit Listing</h3>
                <p className="text-xs text-gray-500">ID #{editingListing.id}</p>
              </div>
              <button
                onClick={() => setEditingListing(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Listing Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Price & Transaction Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={editFormData.transaction_type === 'DONATE'}
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Transaction Type</label>
                  <select
                    value={editFormData.transaction_type}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      transaction_type: e.target.value,
                      price: e.target.value === 'DONATE' ? 0 : editFormData.price
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="SELL">For Sale</option>
                    <option value="DONATE">Donation (Free)</option>
                  </select>
                </div>
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Condition</label>
                  <select
                    value={editFormData.condition}
                    onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="NEW">Brand New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor / For Parts</option>
                  </select>
                </div>
              </div>

              {/* Location & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Campus Location</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="e.g. Block 34, BH-4, Uni-Mall"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Listing Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING (Reserved)</option>
                    <option value="SOLD">SOLD</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Checkboxes */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.is_negotiable}
                    onChange={(e) => setEditFormData({ ...editFormData, is_negotiable: e.target.checked })}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span className="font-semibold text-gray-800">Price is Negotiable</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LIGHTBOX FOR FULL-RESOLUTION IMAGE ZOOM */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Expanded Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
