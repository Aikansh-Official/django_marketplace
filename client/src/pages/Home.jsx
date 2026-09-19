import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toggleSavedItem, isItemSaved } from '../utils/savedStore';
import api, { getCategories } from '../services/api';
import {
  MapPin,
  Heart,
  X,
  Plus,
  ArrowUpDown,
  Tag,
  Package,
  Repeat
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import UniversalLoader from '../components/common/UniversalLoader';
import { getSafeImageUrl } from '../utils/imageUrl';

const TRANSACTION_FILTERS = [
  { value: 'ALL', label: 'All Modes' },
  { value: 'SELL', label: 'Buy & Sell' },
  { value: 'EXCHANGE', label: 'Exchange & Barter' },
  { value: 'DONATE', label: 'Free Donations' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Viewed' },
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'ALL');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [transactionType, setTransactionType] = useState(() => searchParams.get('transaction_type') || 'ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [favorites, setFavorites] = useState({});

  // Current User Profile State
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          setUserProfile(JSON.parse(stored));
        } else if (localStorage.getItem('access')) {
          const res = await api.get('/auth/status/');
          if (res.data?.isAuthenticated && res.data?.user) {
            setUserProfile(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        }
      } catch {
        // ignore
      }
    };
    syncUser();
    window.addEventListener('auth-changed', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('auth-changed', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const isSeller = Boolean(
    userProfile && (
      userProfile.role === 'SELLER' ||
      userProfile.is_id_verified ||
      userProfile.is_staff ||
      userProfile.is_superuser
    )
  );
  const isBuyer = Boolean(userProfile && !isSeller);

  // Sync state when URL params change (e.g. from footer links or header navigation)
  useEffect(() => {
    const cat = searchParams.get('category') || 'ALL';
    const tType = searchParams.get('transaction_type') || 'ALL';
    const q = searchParams.get('search') || '';
    setSelectedCategory(cat);
    setTransactionType(tType);
    setSearchQuery(q);
  }, [searchParams]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Listings with Filters
  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (transactionType && transactionType !== 'ALL') {
        params.append('transaction_type', transactionType);
      }
      if (conditionFilter && conditionFilter !== 'ALL') {
        params.append('condition', conditionFilter);
      }
      if (sortBy) {
        params.append('sort', sortBy);
      }

      const response = await api.get(
        `/marketplace/listings/?${params.toString()}`
      );
      setListings(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch listings', err);
      setError('Unable to load listings. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, transactionType, conditionFilter, sortBy, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  const handleCategoryClick = (slug) => {
    setSelectedCategory(slug);
    const newParams = new URLSearchParams(searchParams);
    if (slug === 'ALL') {
      newParams.delete('category');
    } else {
      newParams.set('category', slug);
    }
    setSearchParams(newParams);
  };

  const handleTransactionTypeChange = (newType) => {
    setTransactionType(newType);
    const newParams = new URLSearchParams(searchParams);
    if (newType === 'ALL') {
      newParams.delete('transaction_type');
    } else {
      newParams.set('transaction_type', newType);
    }
    setSearchParams(newParams);
  };

  const toggleFavorite = (e, listing) => {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleSavedItem(listing);
    setFavorites((prev) => ({ ...prev, [listing.id]: res.isSaved }));
    if (res.isSaved) {
      toast.success(`Saved to your wishlist!`, { icon: '❤️' });
    } else {
      toast.success('Removed from saved items.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'RECENT';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'TODAY';
    if (diffDays === 2) return 'YESTERDAY';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] w-full">
      {/* Category Pills Bar */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-100 shadow-sm relative z-10">
        <div className="w-full px-4 sm:px-6 lg:px-[5%] py-2.5 sm:py-3">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none no-scrollbar touch-pan-x pr-4">
            <button
              onClick={() => handleCategoryClick('ALL')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${selectedCategory === 'ALL'
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
                }`}
            >
              <span>All Categories</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border shrink-0 ${isSelected
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
                    }`}
                >
                  <CategoryIcon
                    name={cat.icon}
                    slug={cat.slug}
                    className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`}
                  />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full px-4 sm:px-6 lg:px-[5%] py-4 sm:py-6">

        {/* Controls Row: Title, Filters & Sorting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              {searchQuery ? (
                <>
                  <span className="truncate max-w-[200px] sm:max-w-none">Results for &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    onClick={handleClearSearch}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-0.5 sm:py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title="Clear search filter"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </>
              ) : selectedCategory === 'ALL'
                ? 'Campus Marketplace Recommendations'
                : categories.find((c) => c.slug === selectedCategory)?.name || 'Listings'}
            </h1>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
              {listings.length} {listings.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2.5 w-full md:w-auto">
            {/* Transaction Mode Filter */}
            <select
              value={transactionType}
              onChange={(e) => handleTransactionTypeChange(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-[11px] sm:text-xs font-medium rounded-md px-1.5 sm:px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs truncate cursor-pointer"
            >
              {TRANSACTION_FILTERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Condition Filter */}
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-[11px] sm:text-xs font-medium rounded-md px-1.5 sm:px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs truncate cursor-pointer"
            >
              <option value="ALL">All Conditions</option>
              <option value="NEW">Brand New</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">For Parts</option>
            </select>

            {/* Sorting Dropdown */}
            <div className="w-full sm:w-auto flex items-center bg-white border border-gray-200 rounded-md px-1.5 sm:px-2.5 py-2 shadow-2xs">
              <ArrowUpDown className="w-3 h-3 text-gray-400 mr-1 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-transparent text-gray-700 text-[11px] sm:text-xs font-medium outline-none cursor-pointer truncate"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="py-12">
            <UniversalLoader text="Loading items..." />
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-md border border-red-200 p-6 shadow-sm">
            <p className="text-red-600 font-bold text-sm mb-3">{error}</p>
            <button
              onClick={fetchListings}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2 px-4 rounded-md transition-all shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-md shadow-sm border border-gray-200 p-8 space-y-3">
            <Tag className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">
              {searchQuery ? `No results found for "${searchQuery}"` : 'No matching items found'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try checking for spelling errors, broader keywords, or clear the search filter.'
                : isSeller
                ? 'Try adjusting your filters, or be the first student to post this item!'
                : 'Try adjusting your filters, or explore other categories to find what you need.'}
            </p>
            {searchQuery && (
              <div className="pt-1">
                <button
                  onClick={handleClearSearch}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Search Filter
                </button>
              </div>
            )}
            {(selectedCategory !== 'ALL' || transactionType !== 'ALL' || conditionFilter !== 'ALL') && (
              <div className="pt-1">
                <button
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setTransactionType('ALL');
                    setConditionFilter('ALL');
                    setSearchQuery('');
                    setSearchParams(new URLSearchParams());
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Reset All Filters
                </button>
              </div>
            )}
            {/* Sell button is strictly for verified Sellers - NEVER shown to Buyers */}
            {isSeller ? (
              <div className="pt-2">
                <Link
                  to="/sell"
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-md text-xs inline-flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Sell an Item
                </Link>
              </div>
            ) : !userProfile && !localStorage.getItem('access') ? (
              <div className="pt-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }))}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-md text-xs inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  Login to Sell
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6 animate-fade-in-up">
            {listings.map((listing) => {
              const primaryImage =
                listing.images?.find((img) => img.is_primary)?.image_url ||
                listing.images?.[0]?.image_url

              const isFav = favorites[listing.id] !== undefined ? favorites[listing.id] : isItemSaved(listing.id);

              return (
                <Link
                  to={`/listing/${listing.id}`}
                  key={listing.id}
                  className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-xl hover:border-brand-200 transition-all duration-200 group flex flex-col shadow-xs"
                >
                  {/* Image Container */}
                  <div className="relative h-48 sm:h-56 md:h-60 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={getSafeImageUrl(primaryImage)}
                        alt={listing.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 group-hover:bg-gray-200 transition-colors ${
                        primaryImage ? 'hidden' : 'flex'
                      }`}
                    >
                      <Package className="w-7 h-7 sm:w-8 sm:h-8 mb-1 sm:mb-2 opacity-50" />
                      <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider opacity-60">No Image</span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, listing)}
                      className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 p-1.5 rounded-full shadow-sm transition-all z-10 ${isFav
                        ? 'bg-rose-50 text-rose-500'
                        : 'bg-white/80 hover:bg-white text-gray-400 hover:text-rose-500'
                        }`}
                      title={isFav ? 'Remove from Saved' : 'Save Item'}
                    >
                      <Heart
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Mode Badges */}
                    {listing.transaction_type === 'DONATE' ? (
                      <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-green-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
                        FREE
                      </div>
                    ) : listing.transaction_type === 'EXCHANGE' ? (
                      <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-indigo-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" />
                        <span>SWAP</span>
                      </div>
                    ) : listing.is_exchange_allowed ? (
                      <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-indigo-500/90 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" />
                        <span>+SWAP</span>
                      </div>
                    ) : null}

                    {/* Condition Badge */}
                    <div className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 bg-black/60 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-semibold px-1.5 sm:px-2 py-0.5 rounded">
                      {listing.condition ? listing.condition.replace('_', ' ') : 'GOOD'}
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-black text-base sm:text-xl text-gray-900 tracking-tight">
                        {listing.transaction_type === 'DONATE'
                          ? 'Free'
                          : listing.transaction_type === 'EXCHANGE'
                            ? (Number(listing.price) > 0 ? `Rs ${listing.price} (Swap)` : 'Item Swap')
                            : `Rs ${listing.price}`}
                      </h3>
                    </div>

                    <p
                      className="text-gray-700 text-xs sm:text-xs font-medium line-clamp-2 mb-2 sm:mb-3 group-hover:text-brand-600 transition-colors"
                      title={listing.title}
                    >
                      {listing.title}
                    </p>

                    <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-100 flex justify-between items-center text-[10px] sm:text-[11px] text-gray-500">
                      <span className="flex items-center gap-1 truncate max-w-[65%]">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{listing.location}</span>
                      </span>
                      <span className="font-bold text-[9px] sm:text-[10px] text-gray-400 uppercase whitespace-nowrap">
                        {formatDate(listing.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
