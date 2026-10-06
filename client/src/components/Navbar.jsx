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
  MessageSquare
} from 'lucide-react';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/CampusXChange_Logo.webp';
const AuthModal = lazy(() => import('./AuthModal'));
const SavedItemsDrawer = lazy(() => import('./SavedItemsDrawer'));
import NotificationDropdown from './notifications/NotificationDropdown';
import { getSavedCount } from '../utils/savedStore';
import { APP_VERSION } from '../config/version';
import { getSafeImageUrl } from '../utils/imageUrl';
import { unregisterFCMDevice } from '../services/fcmService';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user: userProfile, isSeller, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [savedCount, setSavedCount] = useState(() => getSavedCount());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ listings: [], categories: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const profileMenuRef = useRef(null);
  const notificationDropdownRef = useRef(null);
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



  // Fetch notifications unread count
  useEffect(() => {
    if (!userProfile) {
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await api.get('/marketplace/notifications/unread-count/');
        setUnreadCount(res.data?.unread_count ?? 0);
      } catch {
        // ignore
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    window.addEventListener('notifications-updated', fetchNotifications);
    window.addEventListener('focus', fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', fetchNotifications);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, [userProfile]);

  // Fetch unread messages count for Campus Messenger
  useEffect(() => {
    if (!userProfile) return;

    const fetchChatUnread = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await api.get('/marketplace/conversations/');
        if (Array.isArray(res.data)) {
          const totalUnread = res.data.reduce((acc, c) => acc + (c.unread_count || 0), 0);
          setUnreadChatCount(totalUnread);
        }
      } catch {
        // ignore
      }
    };

    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 30000);
    window.addEventListener('messages-updated', fetchChatUnread);
    window.addEventListener('focus', fetchChatUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('messages-updated', fetchChatUnread);
      window.removeEventListener('focus', fetchChatUnread);
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

  // Close profile and notification dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target)) {
        setIsNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationDropdownOpen(false);
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
      await unregisterFCMDevice();
      await api.post('/auth/logout/');
    } catch {
      // ignore
    }
    logout();
    setIsProfileMenuOpen(false);
    setIsNotificationDropdownOpen(false);
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

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-2xs h-16">
        <div className="w-full px-4 sm:px-6 lg:px-[5%] h-full">
          <div className="flex items-center justify-between h-full gap-2 sm:gap-4 lg:gap-6">

            {/* Left: Brand Logo & Links */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-shrink-0">
              <Link to="/" className="flex items-center py-1 group" aria-label="CampusXChange">
                <img
                  src={logoImg}
                  alt="CampusXChange"
                  className="h-9 sm:h-10 md:h-11 w-auto object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
                />
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden lg:flex items-center gap-2 text-xs font-semibold">
                <Link
                  to="/"
                  className={`transition-colors py-1.5 px-3 rounded-full text-xs font-semibold ${location.pathname === '/' && !location.search.includes('search=')
                    ? 'text-brand-600 font-bold bg-brand-50 border border-brand-200/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                    }`}
                >
                  Explore
                </Link>
              </div>
            </div>

            {/* Center: Search Bar (Main Navbar Search) - Responsive width on tablets */}
            <form
              ref={searchContainerRef}
              onSubmit={(e) => {
                setShowSuggestions(false);
                handleSearchSubmit(e);
              }}
              className="flex-1 max-w-xs md:max-w-md lg:max-w-2xl xl:max-w-3xl hidden sm:flex items-center relative"
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
                  <>
                    {/* Campus Messenger / Chat */}
                    <Link
                      to="/messages"
                      className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                      title="Campus Messenger"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {unreadChatCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-500 rounded-full ring-2 ring-white animate-pulse">
                          {unreadChatCount > 9 ? '9+' : unreadChatCount}
                        </span>
                      )}
                    </Link>

                    {/* Notifications Button & Dropdown */}
                    <div className="relative" ref={notificationDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                        className={`relative p-2 rounded-md transition-colors ${
                          isNotificationDropdownOpen
                            ? 'text-brand-600 bg-brand-50'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                        title="Notifications"
                        aria-label="View notifications"
                      >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-500 rounded-full ring-2 ring-white animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>

                      <NotificationDropdown
                        isOpen={isNotificationDropdownOpen}
                        onClose={() => setIsNotificationDropdownOpen(false)}
                        unreadCount={unreadCount}
                        onNotificationRead={() => {
                          setUnreadCount((c) => Math.max(0, c - 1));
                        }}
                      />
                    </div>

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
                          <Link
                            to="/messages"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
                              Messenger / Chats
                            </span>
                            {unreadChatCount > 0 && (
                              <span className="text-[10px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-full">
                                {unreadChatCount}
                              </span>
                            )}
                          </Link>

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
                  </>
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
              <div className="flex sm:hidden items-center gap-0.5">
                {/* Mobile Search Toggle Button */}
                <button
                  onClick={() => {
                    setIsMobileSearchOpen(!isMobileSearchOpen);
                    if (!isMobileSearchOpen) setIsOpen(false);
                  }}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isMobileSearchOpen ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:text-gray-900 active:bg-gray-100'
                  }`}
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg cursor-pointer"
                  aria-label="Wishlist"
                >
                  <Heart className={`w-5 h-5 ${savedCount > 0 ? 'fill-brand-500 text-brand-500' : 'text-gray-500'}`} />
                </button>

                {isSeller && (
                  <Link
                    to="/sell"
                    className="bg-brand-500 active:bg-brand-600 text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg flex items-center gap-1 shadow-2xs shrink-0 min-h-[36px]"
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
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg cursor-pointer"
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
          <div className="sm:hidden absolute top-16 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search books, notes, campus essentials..."
                className="w-full pl-10 pr-20 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-14 text-gray-400 hover:text-gray-600 p-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xs cursor-pointer"
              >
                Go
              </button>
            </form>

            {/* Mobile Autocomplete Suggestions Dropdown */}
            {(suggestions.listings.length > 0 || suggestions.categories.length > 0) && (
              <div className="mt-2.5 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                {/* Category suggestions */}
                {suggestions.categories.length > 0 && (
                  <div className="p-2.5 bg-gray-50/80">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 px-1">
                      Matching Categories
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setIsMobileSearchOpen(false);
                            navigate(`/?category=${encodeURIComponent(cat.slug)}`);
                          }}
                          className="inline-flex items-center gap-1 bg-white hover:bg-brand-50 border border-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer"
                        >
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listing suggestions */}
                {suggestions.listings.length > 0 && (
                  <div className="p-1 space-y-0.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-1 px-2.5">
                      Matching Items
                    </div>
                    {suggestions.listings.map((item) => (
                      <Link
                        key={item.id}
                        to={`/listing/${item.id}`}
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
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
                            <div className="text-xs font-bold text-gray-800 truncate max-w-[200px]">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
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
                    to="/messages"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between min-h-[44px] px-3 rounded-md hover:bg-gray-100/70 hover:text-brand-600 transition-colors font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-brand-500" />
                      <span>Campus Messenger</span>
                    </span>
                    {unreadChatCount > 0 && (
                      <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">
                        {unreadChatCount}
                      </span>
                    )}
                  </Link>
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
      {isSavedDrawerOpen && (
        <Suspense fallback={null}>
          <SavedItemsDrawer
            isOpen={isSavedDrawerOpen}
            onClose={() => setIsSavedDrawerOpen(false)}
          />
        </Suspense>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
          />
        </Suspense>
      )}
    </>
  );
}
