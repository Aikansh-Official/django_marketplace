import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  MapPin, Eye, Search, Trash2, Edit3, X,
  ShoppingBag, RefreshCw, Download, HeartHandshake,
  CheckSquare, Square
} from 'lucide-react';
import { api } from '../config/api';
import { exportToCSV } from '../utils/csvExport';
import ConfirmModal from '../components/common/ConfirmModal';
import Pagination from '../components/common/Pagination';
import ImageLightbox from '../components/common/ImageLightbox';
import ListingViewModal from './listings/ListingViewModal';
import ListingEditModal from './listings/ListingEditModal';

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, PENDING, SOLD, HIDDEN
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SELL, DONATE
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Multi-select bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals & States
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {},
  });

  const fetchListingsAndCategories = async () => {
    setLoading(true);
    try {
      const [listingsRes, categoriesRes] = await Promise.allSettled([
        api.get('/marketplace/admin/listings/'),
        api.get('/marketplace/categories/'),
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
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchListingsAndCategories();
  }, []);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && item.transaction_type !== typeFilter) return false;

      if (categoryFilter !== 'ALL') {
        const catId = item.category?.id || item.category;
        if (String(catId) !== String(categoryFilter)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (item.title || '').toLowerCase();
        const location = (item.location || '').toLowerCase();
        const sellerName = (item.seller?.full_name || item.seller?.username || '').toLowerCase();
        return title.includes(q) || location.includes(q) || sellerName.includes(q);
      }

      return true;
    });
  }, [listings, statusFilter, typeFilter, categoryFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, typeFilter, categoryFilter]);

  // Paginated listings slice
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage, pageSize]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedListings.map((l) => l.id)));
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Change Status
  const handleChangeStatus = async (listingId, newStatus) => {
    setActionLoading(true);
    try {
      await api.patch(`/marketplace/admin/listings/${listingId}/`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l)));
      if (selectedListing?.id === listingId) {
        setSelectedListing((prev) => ({ ...prev, status: newStatus }));
      }
    } catch {
      toast.error('Failed to update listing status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Trusted Badge
  const handleToggleTrusted = async (listingId, currentVal) => {
    setActionLoading(true);
    try {
      await api.patch(`/marketplace/admin/listings/${listingId}/`, { is_trusted: !currentVal });
      toast.success(!currentVal ? 'Listing marked as Trusted' : 'Trusted badge removed');
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, is_trusted: !currentVal } : l)));
      if (selectedListing?.id === listingId) {
        setSelectedListing((prev) => ({ ...prev, is_trusted: !currentVal }));
      }
    } catch {
      toast.error('Failed to update trusted badge.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Listing with ConfirmModal
  const handleDeleteListing = (listing) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Listing Permanently',
      message: `Are you sure you want to permanently delete listing "${listing.title}"? This item will be removed from marketplace catalog.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/marketplace/admin/listings/${listing.id}/`);
          toast.success('Listing deleted successfully.');
          setListings((prev) => prev.filter((l) => l.id !== listing.id));
          if (selectedListing?.id === listing.id) setSelectedListing(null);
          if (editingListing?.id === listing.id) setEditingListing(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Failed to delete listing.');
        } finally {
          setActionLoading(false);
        }
      },
    });
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
      is_trusted: Boolean(listing.is_trusted),
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.patch(`/marketplace/admin/listings/${editingListing.id}/`, editFormData);
      toast.success('Listing updated successfully!');
      setListings((prev) => prev.map((l) => (l.id === editingListing.id ? res.data : l)));
      if (selectedListing?.id === editingListing.id) setSelectedListing(res.data);
      setEditingListing(null);
    } catch {
      toast.error('Failed to update listing.');
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = (onlySelected = false) => {
    const targetList = onlySelected
      ? listings.filter((l) => selectedIds.has(l.id))
      : filteredListings;

    exportToCSV({
      data: targetList,
      headers: [
        'Listing ID',
        'Title',
        'Price (Rs)',
        'Type',
        'Condition',
        'Category',
        'Status',
        'Trusted Badge',
        'Location',
        'Seller Name',
        'Seller Username',
        'Posted Date'
      ],
      rowMapper: (l) => [
        l.id,
        l.title,
        l.transaction_type === 'DONATE' ? 'FREE' : l.price,
        l.transaction_type,
        l.condition,
        l.category?.name || 'General',
        l.status,
        l.is_trusted ? 'YES' : 'NO',
        l.location || '',
        l.seller?.full_name || '',
        `@${l.seller?.username || ''}`,
        new Date(l.created_at).toLocaleDateString()
      ],
      filename: `campusxchange_listings_${new Date().toISOString().split('T')[0]}.csv`
    });
  };

  // Bulk Actions
  const handleBulkHide = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => api.patch(`/marketplace/admin/listings/${id}/`, { status: 'HIDDEN' }))
      );
      toast.success(`Marked ${ids.length} listings as HIDDEN.`);
      fetchListingsAndCategories();
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk hide failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => api.patch(`/marketplace/admin/listings/${id}/`, { status: 'ACTIVE' }))
      );
      toast.success(`Marked ${ids.length} listings as ACTIVE.`);
      fetchListingsAndCategories();
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk activate failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Header metric counts
  const metrics = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((l) => l.status === 'ACTIVE').length;
    const pending = listings.filter((l) => l.status === 'PENDING').length;
    const sold = listings.filter((l) => l.status === 'SOLD').length;
    const hidden = listings.filter((l) => l.status === 'HIDDEN').length;
    return { total, active, pending, sold, hidden };
  }, [listings]);

  return (
    <div className="space-y-4">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        loading={actionLoading}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* View Modal */}
      {selectedListing && (
        <ListingViewModal
          listing={selectedListing}
          actionLoading={actionLoading}
          onClose={() => setSelectedListing(null)}
          onOpenLightbox={(img) => setLightboxImage(img)}
          onChangeStatus={handleChangeStatus}
          onToggleTrusted={handleToggleTrusted}
        />
      )}

      {/* Edit Modal */}
      {editingListing && (
        <ListingEditModal
          listing={editingListing}
          categories={categories}
          formData={editFormData}
          setFormData={setEditFormData}
          actionLoading={actionLoading}
          onClose={() => setEditingListing(null)}
          onSubmit={handleSaveEdit}
        />
      )}

      {/* Metric Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Items</span>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active Public</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{metrics.active}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">In Handover</span>
          <p className="text-xl font-black text-amber-700 mt-1">{metrics.pending}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Sold & Exchanged</span>
          <p className="text-xl font-black text-blue-700 mt-1">{metrics.sold}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Hidden / Moderated</span>
          <p className="text-xl font-black text-red-700 mt-1">{metrics.hidden}</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-md overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/70">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Marketplace Catalog</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {listings.length} Listings
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Supervise all campus listings, manage live visibility, edit items, or mark trusted products.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleExportCSV(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              Export CSV
            </button>

            <button
              onClick={fetchListingsAndCategories}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search & Multi-Filters */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Title, Location, or Seller..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
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

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SOLD">SOLD</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>

            {/* Transaction Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Types</option>
              <option value="SELL">Sell (Paid)</option>
              <option value="DONATE">Free Donations</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[140px] truncate"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-2.5 bg-brand-50 border-b border-brand-200 flex items-center justify-between gap-4 text-xs">
            <span className="font-bold text-brand-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[11px]">
                {selectedIds.size}
              </span>
              Listings Selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkActivate}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Mark Active
              </button>
              <button
                onClick={handleBulkHide}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Hide Selected
              </button>
              <button
                onClick={() => handleExportCSV(true)}
                className="px-3 py-1 bg-white border border-gray-300 text-gray-700 font-bold rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Export Selected CSV
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-500 hover:text-gray-700 ml-2 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/60 text-gray-500 uppercase tracking-wider text-[10px] font-black border-b border-gray-200">
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {selectedIds.size > 0 && selectedIds.size === paginatedListings.length ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Price / Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Seller</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="8" className="py-4 px-6">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedListings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    No listings found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedListings.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const thumb = item.images?.[0]?.image || item.image;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Item Thumbnail & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => thumb && setLightboxImage(thumb)}
                            className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80"
                          >
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-gray-900 truncate">{item.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-semibold">{item.condition}</span>
                              {item.is_trusted && (
                                <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 px-1 rounded">
                                  Trusted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price / Type */}
                      <td className="py-3 px-4">
                        {item.transaction_type === 'DONATE' ? (
                          <span className="font-black text-emerald-600 flex items-center gap-1">
                            <HeartHandshake className="w-3.5 h-3.5" /> FREE
                          </span>
                        ) : (
                          <span className="font-black text-gray-900">₹{item.price}</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {item.category?.name || 'General'}
                      </td>

                      {/* Seller */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-800 leading-snug">
                          {item.seller?.full_name || item.seller?.username || 'Seller'}
                        </p>
                        <span className="font-mono text-[10px] text-gray-400">
                          @{item.seller?.username}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {item.location || 'Campus'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleChangeStatus(item.id, e.target.value)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : item.status === 'HIDDEN'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="HIDDEN">HIDDEN</option>
                          <option value="SOLD">SOLD</option>
                          <option value="PENDING">PENDING</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedListing(item)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors cursor-pointer"
                            title="Inspect Listing"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Listing"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteListing(item)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Listing"
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

        {/* Universal Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredListings.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
