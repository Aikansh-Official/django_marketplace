import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LayoutTemplate, Plus, Search, Edit3, Trash2, Tag, Loader2,
  X, AlertTriangle, CheckCircle2, ArrowRight, ExternalLink,
  Eye, EyeOff, Sparkles, UploadCloud, Link as LinkIcon,
  SlidersHorizontal, Image as ImageIcon, ArrowUpDown, RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const QUICK_LINK_PRESETS = [
  { label: 'All Listings', url: '/' },
  { label: 'Books & Notes', url: '/?category=books-notes' },
  { label: 'Campus Donations', url: '/?transaction_type=DONATE' },
  { label: 'Sell Item Page', url: '/sell' },
];

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deletingBanner, setDeletingBanner] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge_text: '',
    image_url: '',
    link_url: '/',
    button_text: 'Explore Now',
    display_order: 1,
    is_active: true,
  });

  const [imageUploadType, setImageUploadType] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  // Fetch Banners from Admin endpoint
  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('admin_access');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE}/marketplace/admin/banners/`, {
        headers,
        withCredentials: true,
      });
      setBanners(res.data);
    } catch (err) {
      console.error('Failed to load banners:', err);
      toast.error('Could not load banners. Please verify your admin connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Filtered banners
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.badge_text && b.badge_text.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && b.is_active) ||
        (statusFilter === 'INACTIVE' && !b.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [banners, searchQuery, statusFilter]);

  const activeCount = banners.filter((b) => b.is_active).length;
  const inactiveCount = banners.length - activeCount;

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      badge_text: '',
      image_url: '',
      link_url: '/',
      button_text: 'Explore Now',
      display_order: banners.length > 0 ? Math.max(...banners.map((b) => b.display_order || 0)) + 1 : 1,
      is_active: true,
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setImageUploadType('file');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner?.title || '',
      subtitle: banner?.subtitle || '',
      badge_text: banner?.badge_text || '',
      image_url: banner?.image_url || '',
      link_url: banner?.link_url || '/',
      button_text: banner?.button_text || 'Explore Now',
      display_order: banner?.display_order ?? 1,
      is_active: Boolean(banner?.is_active),
    });
    setSelectedFile(null);
    setPreviewUrl(banner?.image_url || '');
    setImageUploadType(banner?.image_url ? 'url' : 'file');
    setIsModalOpen(true);
  };

  // Handle File Change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose a valid image file (PNG, JPG, WebP)');
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  // Instant Toggle Status
  const handleToggleStatus = async (banner) => {
    try {
      const token = localStorage.getItem('admin_access');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const newStatus = !banner.is_active;

      const res = await axios.patch(
        `${API_BASE}/marketplace/admin/banners/${banner.id}/`,
        { is_active: newStatus },
        { headers, withCredentials: true }
      );

      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? res.data : b))
      );
      toast.success(newStatus ? 'Banner activated in carousel!' : 'Banner hidden from carousel');
    } catch (err) {
      console.error('Failed to toggle status', err);
      toast.error('Could not update banner status');
    }
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Please enter a banner title');
      return;
    }
    if (!selectedFile && !formData.image_url?.trim() && !previewUrl) {
      toast.error('Please upload an image or provide an image URL');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_access');
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const payload = new FormData();
      payload.append('title', (formData.title || '').trim());
      payload.append('subtitle', (formData.subtitle || '').trim());
      payload.append('badge_text', (formData.badge_text || '').trim().toUpperCase());
      payload.append('link_url', (formData.link_url || '/').trim());
      payload.append('button_text', (formData.button_text || 'Explore Now').trim());
      payload.append('display_order', String(formData.display_order ?? 1));
      payload.append('is_active', String(Boolean(formData.is_active)));

      if (selectedFile) {
        payload.append('image', selectedFile);
      } else if (formData.image_url?.trim()) {
        payload.append('image_url', formData.image_url.trim());
      } else if (previewUrl) {
        payload.append('image_url', previewUrl.trim());
      }

      if (editingBanner) {
        // PATCH
        const res = await axios.patch(
          `${API_BASE}/marketplace/admin/banners/${editingBanner.id}/`,
          payload,
          { headers, withCredentials: true }
        );
        setBanners((prev) =>
          prev.map((b) => (b.id === editingBanner.id ? res.data : b))
        );
        toast.success('Banner updated successfully!');
      } else {
        // CREATE
        const res = await axios.post(
          `${API_BASE}/marketplace/admin/banners/`,
          payload,
          { headers, withCredentials: true }
        );
        setBanners((prev) => [res.data, ...prev]);
        toast.success('New banner created & published to Cloudinary!');
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Save banner error:', err);
      let errMsg = 'Failed to save banner. Please check your network and image size.';
      if (err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'string') {
          errMsg = d;
        } else if (d.error) {
          errMsg = d.error;
        } else if (d.detail) {
          errMsg = d.detail;
        } else if (typeof d === 'object') {
          const fieldErrors = Object.entries(d)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join(' | ');
          if (fieldErrors) errMsg = fieldErrors;
        }
      }
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Banner
  const handleConfirmDelete = async () => {
    if (!deletingBanner) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_access');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.delete(
        `${API_BASE}/marketplace/admin/banners/${deletingBanner.id}/`,
        { headers, withCredentials: true }
      );

      setBanners((prev) => prev.filter((b) => b.id !== deletingBanner.id));
      toast.success('Banner removed and cleaned from Cloudinary');
      setDeletingBanner(null);
    } catch (err) {
      console.error('Delete banner error:', err);
      toast.error('Failed to delete banner');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <LayoutTemplate className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Banner Slideshow Carousel
            </h1>
            <span className="bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Cloudinary Powered
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-2xl">
            Control promotional hero slides positioned directly beneath the categories bar on the Student Homepage. All images are compressed to WebP and securely hosted on Cloudinary CDN.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBanners}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition border border-gray-200"
            title="Refresh Banners"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Banner</span>
          </button>
        </div>
      </div>

      {/* Metric Cards & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Slides</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{banners.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active in Slideshow</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Draft / Inactive</p>
            <p className="text-2xl font-black text-gray-500 mt-1">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search banners by title or badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 font-semibold rounded-md transition ${
                  statusFilter === st
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs ml-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 font-semibold rounded-md transition ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 font-semibold rounded-md transition ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Banner Display Grid/Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
          <p className="text-xs font-semibold text-gray-500">Loading banner slideshows...</p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center min-h-[260px]">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">No Banners Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mb-4">
            {searchQuery
              ? `No banners matched your search query "${searchQuery}".`
              : 'There are no banners currently configured. Create one to display it on the student homepage.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Banner</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards Visual Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all duration-200"
            >
              {/* Visual Banner Preview */}
              <div className="relative h-44 bg-gray-900 overflow-hidden select-none">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                {/* Badges on Top */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                    <span>Order #{banner.display_order}</span>
                  </span>

                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md border transition ${
                      banner.is_active
                        ? 'bg-emerald-500/90 text-white border-emerald-400'
                        : 'bg-gray-800/80 text-gray-300 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        banner.is_active ? 'bg-white animate-pulse' : 'bg-gray-400'
                      }`}
                    />
                    <span>{banner.is_active ? 'Active' : 'Draft'}</span>
                  </button>
                </div>

                {/* Banner Content Overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  {banner.badge_text && (
                    <span className="inline-block bg-brand-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase mb-1">
                      {banner.badge_text}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-white line-clamp-1 leading-snug">
                    {banner.title}
                  </h4>
                  {banner.subtitle && (
                    <p className="text-[11px] text-gray-300 line-clamp-1 mt-0.5">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-gray-400" />
                      <span className="truncate max-w-[180px]" title={banner.link_url}>
                        {banner.link_url}
                      </span>
                    </span>
                    <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                      CTA: {banner.button_text}
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-400 flex items-center justify-between">
                    <span>Target: Student Home</span>
                    <span>
                      Updated: {new Date(banner.updated_at || banner.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className="text-xs font-semibold text-gray-600 hover:text-brand-600 transition flex items-center gap-1"
                  >
                    {banner.is_active ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(banner)}
                      className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                      title="Edit Banner"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingBanner(banner)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Banner Details</th>
                  <th className="py-3 px-4">Destination Link</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBanners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4 font-bold text-gray-700">#{banner.display_order}</td>
                    <td className="py-3 px-4">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-20 h-11 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {banner.badge_text && (
                        <span className="inline-block bg-brand-50 text-brand-600 text-[9px] font-extrabold px-1.5 py-0.2 rounded mb-0.5">
                          {banner.badge_text}
                        </span>
                      )}
                      <p className="font-bold text-gray-900 line-clamp-1">{banner.title}</p>
                      {banner.subtitle && (
                        <p className="text-gray-500 text-[11px] line-clamp-1">{banner.subtitle}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span>{banner.link_url}</span>
                      </div>
                      <span className="text-[10px] text-brand-600 font-semibold">
                        CTA: &quot;{banner.button_text}&quot;
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(banner)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border transition ${
                          banner.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            banner.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                        <span>{banner.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(banner)}
                          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                          title="Edit Banner"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingBanner(banner)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                  <LayoutTemplate className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {editingBanner ? 'Edit Banner Slide' : 'Create New Promotional Banner'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Uploaded image will be automatically compressed to WebP and hosted on Cloudinary
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Live Preview Card */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Live Carousel Slide Preview
                </label>
                <div className="relative h-44 rounded-xl overflow-hidden bg-gray-900 shadow-inner border border-gray-200">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-800">
                      <ImageIcon className="w-8 h-8 mb-1 text-gray-500" />
                      <span className="text-xs">No image selected</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    {formData.badge_text && (
                      <span className="inline-block bg-brand-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase mb-1">
                        {formData.badge_text}
                      </span>
                    )}
                    <h4 className="text-base font-extrabold text-white leading-tight">
                      {formData.title || 'Enter banner title...'}
                    </h4>
                    {formData.subtitle && (
                      <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">
                        {formData.subtitle}
                      </p>
                    )}
                    <div className="mt-2 inline-flex items-center gap-1 bg-white text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-md shadow">
                      <span>{formData.button_text || 'Explore Now'}</span>
                      <ArrowRight className="w-3 h-3 text-brand-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Banner Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LPU Semester Book Swap & Notes Exchange"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Badge Tag (Uppercase)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SEMESTER SPECIAL"
                    value={formData.badge_text || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, badge_text: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pass on notes and books to juniors with zero commission."
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Image Input Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Banner Image (Cloudinary CDN) <span className="text-red-500">*</span>
                  </label>
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setImageUploadType('file')}
                      className={`px-2 py-0.5 font-semibold rounded ${
                        imageUploadType === 'file'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadType('url')}
                      className={`px-2 py-0.5 font-semibold rounded ${
                        imageUploadType === 'url'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {imageUploadType === 'file' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-brand-400 bg-gray-50/50 hover:bg-brand-50/30 rounded-xl p-4 text-center cursor-pointer transition"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <UploadCloud className="w-6 h-6 text-brand-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-gray-800">
                      {selectedFile ? selectedFile.name : 'Click to browse or drop an image file'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Recommended aspect ratio: 16:9 or 21:9 (minimum 1200x400). PNG, JPG, WebP.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formData.image_url || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e.target.value });
                        setPreviewUrl(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                )}
              </div>

              {/* Destination Link & Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Destination Link URL
                  </label>
                  <span className="text-[10px] text-gray-400">Where student clicks redirect</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="text-[10px] font-semibold text-gray-500">Presets:</span>
                  {QUICK_LINK_PRESETS.map((p) => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => setFormData({ ...formData, link_url: p.url })}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition ${
                        formData.link_url === p.url
                          ? 'bg-brand-50 text-brand-700 border-brand-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="/ or /?category=books-notes or /sell"
                  value={formData.link_url || ''}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              {/* Button Text, Display Order, Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Button CTA Text
                  </label>
                  <input
                    type="text"
                    placeholder="Explore Now"
                    value={formData.button_text || ''}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Display Order (Seq)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.display_order ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: e.target.value === '' ? '' : parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_active)}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                    />
                    <span className="text-xs font-bold text-gray-800">Active in Carousel</span>
                  </label>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Uploading...</span>
                    </>
                  ) : (
                    <span>{editingBanner ? 'Save Changes' : 'Create Banner'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Delete Banner Slide</h3>
                <p className="text-xs text-gray-500">This action will remove the slide and clean Cloudinary assets</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4 text-xs space-y-1">
              <p className="font-bold text-gray-800">{deletingBanner.title}</p>
              <p className="text-gray-500 truncate">Image: {deletingBanner.image_url}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBanner(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
