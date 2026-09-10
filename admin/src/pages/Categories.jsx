import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FolderTree, Plus, Search, Edit3, Trash2, Tag, Loader2,
  X, AlertTriangle, CheckCircle2, ArrowRight, Layers,
  BookOpen, Laptop, Smartphone, Headphones, Bike, Home,
  Shirt, PenTool, Trophy, Gamepad2, Watch, Camera,
  Coffee, Sparkles, Package, Music, Briefcase, Glasses
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Available curated icons with labels and categories
const AVAILABLE_ICONS = [
  { name: 'BookOpen', label: 'Books & Notes', icon: BookOpen, category: 'Academic' },
  { name: 'PenTool', label: 'Stationery & Lab', icon: PenTool, category: 'Academic' },
  { name: 'Laptop', label: 'Laptops & Computers', icon: Laptop, category: 'Tech' },
  { name: 'Smartphone', label: 'Mobiles & Tablets', icon: Smartphone, category: 'Tech' },
  { name: 'Headphones', label: 'Audio & Gadgets', icon: Headphones, category: 'Tech' },
  { name: 'Camera', label: 'Cameras & Photo', icon: Camera, category: 'Tech' },
  { name: 'Watch', label: 'Smartwatches', icon: Watch, category: 'Tech' },
  { name: 'Gamepad2', label: 'Gaming & Consoles', icon: Gamepad2, category: 'Entertainment' },
  { name: 'Music', label: 'Musical Instruments', icon: Music, category: 'Entertainment' },
  { name: 'Bike', label: 'Cycles & Mobility', icon: Bike, category: 'Campus' },
  { name: 'Home', label: 'Room Essentials', icon: Home, category: 'Campus' },
  { name: 'Coffee', label: 'Appliances & Kettle', icon: Coffee, category: 'Campus' },
  { name: 'Shirt', label: 'Clothing & Uniform', icon: Shirt, category: 'Lifestyle' },
  { name: 'Glasses', label: 'Accessories & Eyewear', icon: Glasses, category: 'Lifestyle' },
  { name: 'Briefcase', label: 'Bags & Luggage', icon: Briefcase, category: 'Lifestyle' },
  { name: 'Trophy', label: 'Sports & Fitness', icon: Trophy, category: 'Lifestyle' },
  { name: 'Sparkles', label: 'Featured / Unique', icon: Sparkles, category: 'General' },
  { name: 'Package', label: 'Others / General', icon: Package, category: 'General' },
];

const ICON_MAP = AVAILABLE_ICONS.reduce((acc, curr) => {
  acc[curr.name] = curr.icon;
  return acc;
}, {});

function DynamicCategoryIcon({ name, className = "w-5 h-5" }) {
  const IconComponent = ICON_MAP[name] || Package;
  return <IconComponent className={className} />;
}

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: 'Package',
  });

  // Delete Safeguard State
  const [reassignTo, setReassignTo] = useState('');
  const [forceDelete, setForceDelete] = useState(false);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/categories/`);
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories', err);
      toast.error('Could not load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-generate slug from name when adding
  const handleNameChange = (val) => {
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.isSlugManual ? prev.slug : autoSlug
    }));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      slug: '',
      icon: 'Package',
      isSlugManual: false
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || 'Package',
      isSlugManual: true
    });
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (cat) => {
    setDeletingCategory(cat);
    setReassignTo('');
    setForceDelete(false);
  };

  // Save (Create) Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setActionLoading(true);
    try {
      await axios.post(`${API_BASE}/marketplace/admin/categories/`, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        icon: formData.icon
      });
      toast.success(`Category "${formData.name}" created!`);
      setIsAddModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Create category failed', err);
      const errMsg = err.response?.data?.slug?.[0] || err.response?.data?.name?.[0] || 'Failed to create category.';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Save (Update) Category
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setActionLoading(true);
    try {
      await axios.patch(`${API_BASE}/marketplace/admin/categories/${editingCategory.id}/`, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        icon: formData.icon
      });
      toast.success(`Category updated successfully!`);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Update category failed', err);
      const errMsg = err.response?.data?.slug?.[0] || err.response?.data?.name?.[0] || 'Failed to update category.';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delete Category
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setActionLoading(true);

    try {
      const payload = {};
      if (reassignTo) payload.reassign_to = parseInt(reassignTo);
      if (forceDelete) payload.force = true;

      const res = await axios.delete(
        `${API_BASE}/marketplace/admin/categories/${deletingCategory.id}/`,
        { data: payload }
      );

      toast.success(res.data?.message || 'Category deleted successfully.');
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Delete category failed', err);
      toast.error(err.response?.data?.error || 'Failed to delete category.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Aggregate Stats
  const totalActiveListings = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.listings_count || 0), 0);
  }, [categories]);

  const mostPopularCategory = useMemo(() => {
    if (!categories.length) return null;
    return [...categories].sort((a, b) => (b.listings_count || 0) - (a.listings_count || 0))[0];
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600 border border-brand-100">
              <FolderTree className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Category Management</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Create, reorganize, and manage marketplace categories and visual icons across the platform.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-brand-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Categories</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-md"><Layers className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{categories.length}</div>
          <p className="text-[11px] text-gray-500 mt-1">Active categories available to students</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categorized Listings</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-md"><Tag className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{totalActiveListings}</div>
          <p className="text-[11px] text-gray-500 mt-1">Live active listings across all categories</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Most Active Category</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-md"><Sparkles className="w-4 h-4" /></span>
          </div>
          <div className="text-base font-black text-gray-900 mt-2 truncate">
            {mostPopularCategory ? mostPopularCategory.name : 'N/A'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {mostPopularCategory ? `${mostPopularCategory.listings_count || 0} active listings` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* Search & View Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search category name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Categories Content */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading marketplace categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900">No categories found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or add a new category.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-lg border border-gray-200 hover:border-brand-300 p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform shadow-xs">
                      <DynamicCategoryIcon name={cat.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{cat.name}</h3>
                      <span className="inline-block text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-0.5">
                        /{cat.slug}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {cat.listings_count || 0} active
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-medium">
                    Icon: <span className="font-mono text-gray-700 font-bold">{cat.icon || 'Package'}</span>
                  </span>
                  <span className="text-[11px] text-gray-400">ID: #{cat.id}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEditModal(cat)}
                  className="px-3 py-1.5 rounded bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-600 font-bold text-xs flex items-center gap-1.5 transition-colors border border-gray-200 hover:border-brand-200"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleOpenDeleteModal(cat)}
                  className="px-3 py-1.5 rounded bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors border border-gray-200 hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Icon Name</th>
                  <th className="py-3.5 px-4">Active Listings</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                          <DynamicCategoryIcon name={cat.icon} className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                      /{cat.slug}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">
                      {cat.icon || 'Package'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {cat.listings_count || 0} listings
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors"
                          title="Edit Category"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(cat)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ========================================================================= */}
      {/* MODAL 1: ADD CATEGORY */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-brand-600" />
                <h3 className="text-base font-black text-gray-900">Add New Category</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gaming & Consoles"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  placeholder="gaming-consoles"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value, isSlugManual: true })}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Used in marketplace URL queries (e.g. `?category={formData.slug || 'slug'}`).</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-2">Select Visual Icon *</label>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50/50">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = formData.icon === item.name;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: item.name })}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-5 h-5 mb-1" />
                        <span className="text-[9px] truncate max-w-full font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Preview */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Student Filter Preview
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-800 shadow-xs">
                  <DynamicCategoryIcon name={formData.icon} className="w-3.5 h-3.5 text-brand-600" />
                  <span>{formData.name || 'Category Name'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT CATEGORY */}
      {/* ========================================================================= */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-600" />
                <h3 className="text-base font-black text-gray-900">Edit Category: {editingCategory.name}</h3>
              </div>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-2">Change Visual Icon</label>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50/50">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = formData.icon === item.name;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: item.name })}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-5 h-5 mb-1" />
                        <span className="text-[9px] truncate max-w-full font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Live Preview
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-800 shadow-xs">
                  <DynamicCategoryIcon name={formData.icon} className="w-3.5 h-3.5 text-brand-600" />
                  <span>{formData.name || 'Category Name'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
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
      {/* MODAL 3: DELETE CATEGORY WITH LISTINGS REASSIGNMENT SAFEGUARD */}
      {/* ========================================================================= */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black text-gray-900">Delete Category</h3>
              </div>
              <button
                onClick={() => setDeletingCategory(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-bold text-gray-900">"{deletingCategory.name}"</span>?
              </p>

              {deletingCategory.listings_count > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 space-y-3">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">This category contains {deletingCategory.listings_count} active listings!</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        To protect campus listings from becoming orphaned, choose an alternative category to reassign them to.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Reassign listings to:</label>
                    <select
                      value={reassignTo}
                      onChange={(e) => {
                        setReassignTo(e.target.value);
                        setForceDelete(false);
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">-- Select Target Category --</option>
                      {categories
                        .filter((c) => c.id !== deletingCategory.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.listings_count || 0} listings)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-amber-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceDelete}
                        onChange={(e) => {
                          setForceDelete(e.target.checked);
                          if (e.target.checked) setReassignTo('');
                        }}
                        className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="font-medium text-red-700 text-[11px]">
                        Or force delete (leaves associated listings uncategorized)
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No active listings are attached to this category. It can be safely deleted.</span>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={actionLoading || (deletingCategory.listings_count > 0 && !reassignTo && !forceDelete)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm & Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
