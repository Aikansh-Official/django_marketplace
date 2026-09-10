import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
import toast from 'react-hot-toast';
import {
  Plus,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  ExternalLink,
  MapPin,
  Tag,
  AlertCircle,
  Package,
  Layers,
  ChevronRight
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import UniversalLoader from '../components/common/UniversalLoader';

export default function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await axios.get(`${API_BASE}/auth/profile/`);
        if (res.data && res.data.role !== 'SELLER' && !res.data.is_id_verified) {
          toast('Buyers do not have seller listings. Redirecting to your Orders...', { icon: 'ℹ️' });
          navigate('/profile?tab=orders-sells', { replace: true });
        }
      } catch (err) {
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (localUser.role && localUser.role !== 'SELLER' && !localUser.is_id_verified) {
          navigate('/profile?tab=orders-sells', { replace: true });
        }
      }
    };
    checkRole();
  }, [navigate]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? `${API_BASE}/marketplace/my-listings/`
        : `${API_BASE}/marketplace/my-listings/?status=${statusFilter}`;
      
      const res = await axios.get(url);
      setListings(res.data);
    } catch (err) {
      console.error('Failed to load my listings', err);
      toast.error('Could not load your listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, [statusFilter]);

  const handleStatusChange = async (listingId, newStatus) => {
    const currentItem = listings.find((l) => l.id === listingId);
    if (currentItem?.status === 'SOLD') {
      toast.error('This item has already been marked as Sold and its status cannot be changed.');
      return;
    }
    try {
      await axios.patch(
        `${API_BASE}/marketplace/listings/${listingId}/status/`,
        { status: newStatus }
      );
      toast.success(`Listing status updated to ${newStatus}`);
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
      toast.success('Listing deleted.');
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
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Reserved
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Sold
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Hidden
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            My Listings
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Manage your items, adjust prices, and toggle active/sold status.
          </p>
        </div>

        <Link
          to="/sell"
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-5 rounded-md transition-all shadow-md hover:shadow-lg text-xs flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Post New Listing
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Total Listings
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">{totalListings}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Active Now
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Items Sold
          </div>
          <div className="text-2xl font-extrabold text-gray-700 mt-1">{soldCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
            Total Views
          </div>
          <div className="text-2xl font-extrabold text-brand-700 mt-1">{totalViews}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-6 overflow-x-auto">
        {[
          { key: 'ALL', label: 'All Items' },
          { key: 'ACTIVE', label: 'Active' },
          { key: 'PENDING', label: 'Reserved' },
          { key: 'SOLD', label: 'Sold' },
          { key: 'HIDDEN', label: 'Hidden' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listings List */}
      {loading ? (
        <div className="py-12">
          <UniversalLoader text="Loading listings..." />
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-12 text-center shadow-sm animate-fade-in-up">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No listings found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-6">
            You don't have any items in this status filter.
          </p>
          <Link
            to="/sell"
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-5 rounded-md text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Sell an Item
          </Link>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in-up">
          {listings.map((item) => {
            const cover = item.images?.find((i) => i.is_primary)?.image_url || item.images?.[0]?.image_url;
            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-gray-300 transition-all"
              >
                {/* Left Section: Image + Title + Meta */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-20 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                    {cover ? (
                      <img src={cover} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <span className="text-xs text-gray-400 font-medium">
                        {item.category?.name}
                      </span>
                    </div>

                    <Link
                      to={`/listing/${item.id}`}
                      className="font-bold text-sm text-gray-900 hover:text-brand-600 truncate block transition-colors"
                    >
                      {item.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-extrabold text-gray-900">
                        {item.transaction_type === 'DONATE' ? 'Free' : `Rs ${item.price}`}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {item.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-gray-400" />
                        {item.views_count} views
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions: Status Toggle & Edit/Delete */}
                <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  {/* Fast Status Switcher / Static Indicator when Sold */}
                  {item.status === 'SOLD' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-2.5 py-1.5 text-xs font-bold select-none cursor-default">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Sold
                    </span>
                  ) : (
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                    >
                      <option value="ACTIVE">Mark Active</option>
                      <option value="PENDING">Mark Reserved</option>
                      <option value="SOLD">Mark as Sold</option>
                      <option value="HIDDEN">Mark Hidden</option>
                    </select>
                  )}

                  <Link
                    to={`/listing/${item.id}`}
                    className="bg-white border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-600 p-2 rounded-md transition-colors"
                    title="View Listing"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  {item.status !== 'SOLD' && (
                    <Link
                      to={`/edit-listing/${item.id}`}
                      className="bg-white border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-600 p-2 rounded-md transition-colors"
                      title="Edit Listing"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  )}

                  <button
                    onClick={() => setDeleteModalId(item.id)}
                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 p-2 rounded-md transition-colors"
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

      {/* Delete Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-md max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Delete this item?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This listing will be permanently removed from CampusXChange.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-md font-medium text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold text-xs disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
