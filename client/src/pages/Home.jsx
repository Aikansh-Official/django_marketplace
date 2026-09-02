import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  MapPin,
  Heart,
  SlidersHorizontal,
  X,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Tag,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Filter
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';

const LPU_LOCATION_FILTERS = [
  { value: 'ALL', label: 'All LPU Campus' },
  { value: 'BH-', label: 'Boys Hostels (BH-1 to BH-8)' },
  { value: 'GH-', label: 'Girls Hostels (GH-1 to GH-6)' },
  { value: 'Block 34', label: 'Block 34 (CS / Tech)' },
  { value: 'Central Library', label: 'Central Library' },
  { value: 'Uni-Mall', label: 'Uni-Mall' },
  { value: 'Law Gate', label: 'Law Gate' },
  { value: 'Main Gate', label: 'Main Gate' },
];

const TRANSACTION_FILTERS = [
  { value: 'ALL', label: 'All Modes' },
  { value: 'SELL', label: 'Buy & Sell' },
  { value: 'RENT', label: 'For Rent' },
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
  const initialCategory = searchParams.get('category') || 'ALL';

  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [transactionType, setTransactionType] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [favorites, setFavorites] = useState({});

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/marketplace/categories/');
        setCategories(res.data);
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
      if (locationFilter && locationFilter !== 'ALL') {
        params.append('location', locationFilter);
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

      const response = await axios.get(
        `http://localhost:8000/api/marketplace/listings/?${params.toString()}`
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
  }, [selectedCategory, locationFilter, transactionType, conditionFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const handleCategoryClick = (slug) => {
    setSelectedCategory(slug);
    if (slug === 'ALL') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: slug });
    }
  };

  const toggleFavorite = (e, id) => {
    e.preventDefault();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
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
      {/* Search Header Bar */}
      <div className="bg-white/80 backdrop-blur-md py-4 border-b border-gray-200 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 flex bg-white border-2 border-gray-200 hover:border-brand-300 rounded-md p-2 items-center focus-within:border-brand-500 transition-colors shadow-sm">
              <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search textbooks, calculators, cycles, coolers, keyboards..."
                className="w-full outline-none text-gray-800 bg-transparent text-sm font-medium placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchListings();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Campus Location Filter Dropdown */}
            <div className="sm:w-64 flex bg-white border-2 border-gray-200 hover:border-brand-300 rounded-md px-3 py-2 items-center focus-within:border-brand-500 transition-colors shadow-sm">
              <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full outline-none text-gray-800 bg-transparent text-xs font-semibold cursor-pointer"
              >
                {LPU_LOCATION_FILTERS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search CTA */}
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-100 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => handleCategoryClick('ALL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                selectedCategory === 'ALL'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                    isSelected
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Controls Row: Title, Filters & Sorting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              {selectedCategory === 'ALL'
                ? 'Campus Marketplace Recommendations'
                : categories.find((c) => c.slug === selectedCategory)?.name || 'Listings'}
            </h1>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {listings.length} {listings.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Transaction Mode Filter */}
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
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
              className="bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
            >
              <option value="ALL">All Conditions</option>
              <option value="NEW">Brand New</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">For Parts</option>
            </select>

            {/* Sorting Dropdown */}
            <div className="flex items-center bg-white border border-gray-200 rounded-md px-2.5 py-1.5 shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-700 text-xs font-medium outline-none cursor-pointer"
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
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
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
            <h3 className="text-lg font-bold text-gray-800">No matching items found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try adjusting your search terms, campus location filter, or be the first student to post this item!
            </p>
            <div className="pt-2">
              <Link
                to="/sell"
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-md text-xs inline-flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Sell an Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {listings.map((listing) => {
              const primaryImage =
                listing.images?.find((img) => img.is_primary)?.image_url ||
                listing.images?.[0]?.image_url ||
                'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';

              const isFav = favorites[listing.id];

              return (
                <Link
                  to={`/listing/${listing.id}`}
                  key={listing.id}
                  className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-xl hover:border-brand-200 transition-all duration-200 group flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={primaryImage}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-full shadow-sm transition-all z-10 ${
                        isFav
                          ? 'bg-red-50 text-red-500'
                          : 'bg-white/80 hover:bg-white text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Mode Badges */}
                    {listing.transaction_type === 'RENT' && (
                      <div className="absolute top-2.5 left-2.5 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        FOR RENT
                      </div>
                    )}
                    {listing.transaction_type === 'DONATE' && (
                      <div className="absolute top-2.5 left-2.5 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        FREE DONATION
                      </div>
                    )}

                    {/* Condition Badge */}
                    <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold px-2 py-0.5 rounded">
                      {listing.condition ? listing.condition.replace('_', ' ') : 'GOOD'}
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">
                        {listing.transaction_type === 'DONATE' ? 'Free' : `Rs ${listing.price}`}
                      </h3>
                      {listing.transaction_type === 'RENT' && listing.rent_period && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          /{listing.rent_period}
                        </span>
                      )}
                    </div>

                    <p
                      className="text-gray-700 text-xs font-medium line-clamp-2 mb-3 group-hover:text-brand-600 transition-colors"
                      title={listing.title}
                    >
                      {listing.title}
                    </p>

                    <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-500">
                      <span className="flex items-center gap-1 truncate max-w-[65%]">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{listing.location}</span>
                      </span>
                      <span className="font-bold text-[10px] text-gray-400 uppercase whitespace-nowrap">
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
