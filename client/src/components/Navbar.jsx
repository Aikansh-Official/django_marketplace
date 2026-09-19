import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  LogOut,
  Plus,
  Package,
  Bell,
  Heart,
  ChevronDown,
  Search,
  ShoppingBag,
  Trophy
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import logoImg from '../assets/CampusXChange_Logo.jpeg';
import AuthModal from './AuthModal';
import SavedItemsDrawer from './SavedItemsDrawer';
import CampusCommunityModal from './CampusCommunityModal';
import { getSavedCount } from '../utils/savedStore';
import { APP_VERSION } from '../config/version';
import { getSafeImageUrl } from '../utils/imageUrl';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedCount, setSavedCount] = useState(() => getSavedCount());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ listings: [], categories: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCommunityHubOpen, setIsCommunityHubOpen] = useState(false);

  const profileMenuRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Sync Saved items count
  useEffect(() => {
    const handleSavedUpdate = (e) => {
      setSavedCount(e.detail?.count ?? getSavedCount());
    };
    window.addEventListener('saved-items-updated', handleSavedUpdate);
    return () => window.removeEventListener('saved-items-updated', handleSavedUpdate);
  }, []);

  // Sync search input with URL search query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
  }, [location.search]);

  // Debounced search autocomplete suggestions
  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSuggestions({ listings: [], categories: [] });
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/marketplace/search-suggestions/?q=${encodeURIComponent(q)}`);
        setSuggestions(res.data);
        setShowSuggestions(Boolean(res.data?.listings?.length || res.data?.categories?.length));
      } catch {
        // ignore
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user profile status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/status/');
        if (res.data?.isAuthenticated && res.data?.user) {
          setUserProfile(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } else {
          if (!res.data?.isAuthenticated) {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            localStorage.removeItem('user');
          }
          setUserProfile(null);
        }
      } catch {
        setUserProfile(null);
      }
    };
    fetchProfile();
    window.addEventListener('auth-changed', fetchProfile);
    return () => {
      window.removeEventListener('auth-changed', fetchProfile);
    };
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!userProfile) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/marketplace/notifications/');
        const count = res.data.filter((n) => !n.is_read).length;
        setUnreadCount(count);
      } catch {
        // ignore
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    window.addEventListener('notifications-updated', fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', fetchNotifications);
    };
  }, [userProfile]);

  // Listen to open-auth-modal events
  useEffect(() => {
    const handleOpenAuthModal = (e) => {
      setAuthModalMode(e.detail?.mode || 'login');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuthModal);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuthModal);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsOpen(false);
    setIsProfileMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim();
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      if (query) {
        params.set('search', query);
      } else {
        params.delete('search');
      }
      navigate(`/?${params.toString()}`);
    } else {
      if (query) {
        navigate(`/?search=${encodeURIComponent(query)}`);
      } else {
        navigate('/');
      }
    }
    setIsMobileSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      params.delete('search');
      navigate(`/?${params.toString()}`);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch {
      // ignore
    }
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUserProfile(null);
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const getUserInitials = () => {
    if (!userProfile) return 'U';
    const name = userProfile.full_name || userProfile.first_name || userProfile.username || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'U';
  };

  const displayName = userProfile?.full_name || userProfile?.first_name || userProfile?.username || 'Student';
  const isSeller = Boolean(
    userProfile && (
      userProfile.role === 'SELLER' ||
      userProfile.is_id_verified ||
      userProfile.is_staff ||
      userProfile.is_superuser
    )
  );
  const isBuyer = Boolean(userProfile && !isSeller);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-2xs h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full gap-2 sm:gap-4 lg:gap-6">

            {/* Left: Brand Logo & Links */}
            <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-5 flex-shrink-0">
              <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
                <img
                  src={logoImg}
                  alt="CampusXChange"
                  className="h-8 w-8 sm:h-9 sm:w-9 object-cover rounded-lg shadow-2xs shrink-0"
                />
                <div className="flex items-baseline">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 font-display">Campus</span>
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-brand-500 font-display">XChange</span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden lg:flex items-center gap-3 text-xs font-semibold text-gray-600">
                <Link
                  to="/"
                  className={`transition-colors py-1.5 px-2.5 rounded-md ${location.pathname === '/' && !location.search.includes('search=')
                      ? 'text-brand-600 font-bold bg-brand-50'
                      : 'hover:text-gray-900 hover:bg-gray-100/70'
                    }`}
                >
                  Explore
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCommunityHubOpen(true)}
                  className="transition-colors py-1.5 px-2.5 rounded-md hover:text-gray-900 hover:bg-gray-100/70 flex items-center gap-1.5 font-semibold text-xs cursor-pointer text-gray-700"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Campus Hub</span>
                </button>
              </div>
            </div>

            {/* Center: Search Bar (Main Navbar Search) - Responsive width on tablets */}
            <form
              ref={searchContainerRef}
              onSubmit={(e) => {
                setShowSuggestions(false);
                handleSearchSubmit(e);
              }}
              className="flex-1 max-w-xs md:max-w-md lg:max-w-xl hidden sm:flex items-center relative"
            >
              <div className="relative w-full flex items-center group">
                <div className="absolute left-3.5 pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onFocus={() => {
                    if (suggestions.listings.length > 0 || suggestions.categories.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search textbooks, calculators, notes, essentials..."
                  className="w-full pl-10 pr-20 md:pr-24 py-2 text-xs sm:text-sm bg-gray-50/90 hover:bg-gray-100/70 focus:bg-white border border-gray-200 hover:border-gray-300 focus:border-brand-500 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 placeholder-gray-400 transition-all font-medium shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClearSearch();
                      setShowSuggestions(false);
                    }}
                    className="absolute right-16 md:right-20 text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-semibold px-2.5 md:px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <span>Search</span>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && (suggestions.listings.length > 0 || suggestions.categories.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Category suggestions */}
                  {suggestions.categories.length > 0 && (
                    <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 px-1">
                        Matching Categories
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setShowSuggestions(false);
                              navigate(`/?category=${encodeURIComponent(cat.slug)}`);
                            }}
                            className="inline-flex items-center gap-1 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 text-gray-700 hover:text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                          >
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Listing suggestions */}
                  {suggestions.listings.length > 0 && (
                    <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-1 px-2.5">
                        Matching Items
                      </div>
                      {suggestions.listings.map((item) => (
                        <Link
                          key={item.id}
                          to={`/listing/${item.id}`}
                          onClick={() => setShowSuggestions(false)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                              {item.image ? (
                                <img
                                  src={getSafeImageUrl(item.image)}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Package className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-800 group-hover:text-brand-600 truncate max-w-[260px]">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                <span>{item.category || 'Item'}</span>
                                <span>•</span>
                                <span>{item.location}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-black text-brand-600 shrink-0 ml-2">
                            {item.transaction_type === 'DONATE' ? 'Free' : `Rs ${item.price}`}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

              {/* Desktop Wishlist Button */}
              <button
                type="button"
                onClick={() => setIsSavedDrawerOpen(true)}
                className="hidden md:flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors px-2.5 py-1.5 rounded-md hover:bg-gray-50 text-xs font-semibold"
                title="Wishlist"
              >
                <Heart className={`w-4 h-4 ${savedCount > 0 ? 'fill-brand-500 text-brand-500' : 'text-gray-400'}`} />
                <span className="hidden xl:inline">Wishlist</span>
                {savedCount > 0 && (
                  <span className="bg-brand-50 text-brand-600 text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {savedCount}
                  </span>
                )}
              </button>

              {/* Desktop Auth State */}
              <div className="hidden sm:flex items-center gap-2.5">
                {userProfile ? (
                  <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <Link
                      to="/notifications"
                      className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                      title="Notifications"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white"></span>
                      )}
                    </Link>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileMenuRef}>
                      <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-full hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-900 text-white font-semibold text-xs flex items-center justify-center overflow-hidden">
                          {userProfile?.profile_photo ? (
                            <img
                              src={getSafeImageUrl(userProfile.profile_photo)}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            getUserInitials()
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">
                          {displayName}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1.5 z-50 text-xs animate-fade-in-up">
                          <div className="px-3 py-2 border-b border-gray-100">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                              {isSeller ? (
                                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full shrink-0">
                                  Verified Seller
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full shrink-0">
                                  Buyer
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">{userProfile.email || 'LPU Student'}</p>
                          </div>

                          <Link
                            to="/profile"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            Profile
                          </Link>
                          {isSeller ? (
                            <Link
                              to="/my-listings"
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                              My Listings
                            </Link>
                          ) : (
                            <Link
                              to="/profile?tab=orders-sells"
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                              My Orders & Trades
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              setIsSavedDrawerOpen(true);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="flex items-center gap-2">
                              <Heart className="w-3.5 h-3.5 text-gray-400" />
                              Wishlist
                            </span>
                            {savedCount > 0 && (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {savedCount}
                              </span>
                            )}
                          </button>

                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors font-medium text-left"
                          >
                            <LogOut className="w-3.5 h-3.5 text-red-500" />
                            Log out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setAuthModalMode('login');
                        setIsAuthModalOpen(true);
                      }}
                      className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => {
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                      }}
                      className="text-xs font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Sign up
                    </button>
                  </div>
                )}

                {/* Clean Sell Button - Visible only for verified sellers */}
                {isSeller && (
                  <Link
                    to="/sell"
                    className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold py-1.5 px-3.5 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Sell Item</span>
                  </Link>
                )}
              </div>

              {/* Mobile Actions */}
              <div className="flex sm:hidden items-center gap-1">
                {/* Mobile Search Toggle Button */}
                <button
                  onClick={() => {
                    setIsMobileSearchOpen(!isMobileSearchOpen);
                    if (!isMobileSearchOpen) setIsOpen(false);
                  }}
                  className={`p-2 rounded-md transition-colors ${isMobileSearchOpen ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Wishlist"
                >
                  <Heart className={`w-5 h-5 ${savedCount > 0 ? 'fill-brand-500 text-brand-500' : 'text-gray-500'}`} />
                </button>

                {isSeller && (
                  <Link
                    to="/sell"
                    className="bg-brand-500 text-white text-xs font-semibold py-1.5 px-2.5 rounded-md flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Sell</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setIsMobileSearchOpen(false);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Menu"
                >
                  {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Expandable Search Row */}
        {isMobileSearchOpen && (
          <div className="sm:hidden absolute top-16 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-2.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search books, notes, campus essentials..."
                className="w-full pl-9 pr-20 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-14 text-gray-400 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs"
              >
                Go
              </button>
            </form>
          </div>
        )}

        {/* Mobile Dropdown & Backdrop */}
        {isOpen && (
          <>
            {/* Backdrop overlay for mobile menu */}
            <div
              className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Solid Menu Panel */}
            <div className="sm:hidden absolute top-16 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-4 space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col space-y-1 text-sm font-medium text-gray-700">
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-md hover:bg-gray-100/70 hover:text-brand-600 transition-colors font-semibold"
                >
                  Explore Marketplace
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsCommunityHubOpen(true);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 min-h-[44px] px-3 rounded-md hover:bg-gray-100/70 hover:text-brand-600 transition-colors font-semibold text-left w-full text-gray-700"
                >
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Campus Hub & Top Sellers</span>
                </button>
                {userProfile && (
                  isSeller ? (
                    <Link
                      to="/my-listings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center min-h-[44px] px-3 rounded-md hover:bg-gray-100/70 hover:text-brand-600 transition-colors font-semibold"
                    >
                      My Listings
                    </Link>
                  ) : (
                    <Link
                      to="/profile?tab=orders-sells"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center min-h-[44px] px-3 rounded-md hover:bg-gray-100/70 hover:text-brand-600 transition-colors font-semibold"
                    >
                      My Orders & Trades
                    </Link>
                  )
                )}
                {userProfile && (
                  <Link
                    to="/notifications"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between min-h-[44px] px-3 rounded-md hover:bg-gray-100/70 hover:text-brand-600 transition-colors font-semibold"
                  >
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                {userProfile ? (
                  <div className="flex items-center justify-between min-h-[44px] px-3 rounded-md bg-gray-50/70">
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="font-bold text-xs text-gray-900 hover:text-brand-600 truncate max-w-[180px]"
                    >
                      View Profile ({displayName})
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-red-600 hover:text-red-700 font-bold text-xs cursor-pointer py-1 px-2 rounded hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setAuthModalMode('login');
                        setIsAuthModalOpen(true);
                        setIsOpen(false);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 min-h-[44px] rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                        setIsOpen(false);
                      }}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white min-h-[44px] rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Drawer Platform Version */}
              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>CampusXChange</span>
                <span>Version {APP_VERSION}</span>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Slide-over Saved Wishlist Drawer */}
      <SavedItemsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Campus Community Leaderboard & Hotspots Modal */}
      <CampusCommunityModal
        isOpen={isCommunityHubOpen}
        onClose={() => setIsCommunityHubOpen(false)}
      />
    </>
  );
}
