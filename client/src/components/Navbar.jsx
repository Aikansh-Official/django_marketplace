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
  ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
import logoImg from '../assets/LPUTrade_logo.jpeg';
import AuthModal from './AuthModal';
import SavedItemsDrawer from './SavedItemsDrawer';
import { getSavedCount } from '../utils/savedStore';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedCount, setSavedCount] = useState(() => getSavedCount());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef(null);
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

  // Fetch user profile status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/auth/status/`);
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
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!userProfile) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/notifications/`);
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
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout/`);
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

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-xs h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            
            {/* Left: Brand Logo & Simple Name */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5">
                <img 
                  src={logoImg} 
                  alt="LPUTrade" 
                  className="h-9 w-9 object-cover rounded-lg" 
                />
                <div className="flex items-baseline">
                  <span className="text-xl font-bold tracking-tight text-gray-950 font-display">LPU</span>
                  <span className="text-xl font-bold tracking-tight text-brand-500 font-display">Trade</span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link 
                  to="/" 
                  className={`transition-colors ${
                    location.pathname === '/' ? 'text-brand-600 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Explore
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${savedCount > 0 ? 'fill-brand-500 text-brand-500' : 'text-gray-400'}`} />
                  <span>Wishlist</span>
                  {savedCount > 0 && (
                    <span className="bg-brand-50 text-brand-600 text-xs font-bold px-1.5 py-0.2 rounded-full">
                      {savedCount}
                    </span>
                  )}
                </button>

                {userProfile && (
                  <Link 
                    to="/my-listings" 
                    className={`transition-colors ${
                      location.pathname === '/my-listings' ? 'text-brand-600 font-semibold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Listings
                  </Link>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              
              {/* Desktop Auth State */}
              <div className="hidden sm:flex items-center gap-3">
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
                        <div className="w-7 h-7 rounded-full bg-gray-900 text-white font-semibold text-xs flex items-center justify-center">
                          {getUserInitials()}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">
                          {displayName}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1.5 z-50 text-xs animate-fade-in-up">
                          <div className="px-3 py-2 border-b border-gray-100">
                            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                            <p className="text-[11px] text-gray-500 truncate">{userProfile.email || 'LPU Student'}</p>
                          </div>
                          
                          <Link
                            to="/profile"
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            Profile
                          </Link>
                          <Link
                            to="/my-listings"
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            My Listings
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
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAuthModalMode('login');
                        setIsAuthModalOpen(true);
                      }}
                      className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-2 transition-colors"
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

                {/* Clean Sell Button */}
                <Link
                  to="/sell"
                  className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold py-1.5 px-3.5 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sell Item</span>
                </Link>
              </div>

              {/* Mobile Actions */}
              <div className="flex sm:hidden items-center gap-1.5">
                <button
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Wishlist"
                >
                  <Heart className={`w-5 h-5 ${savedCount > 0 ? 'fill-brand-500 text-brand-500' : 'text-gray-500'}`} />
                </button>

                <Link
                  to="/sell"
                  className="bg-brand-500 text-white text-xs font-semibold py-1.5 px-3 rounded-md flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sell</span>
                </Link>

                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Menu"
                >
                  {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2 shadow-lg">
            <div className="flex flex-col space-y-1 text-sm font-medium text-gray-700">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="py-2 hover:text-brand-600 transition-colors"
              >
                Explore Marketplace
              </Link>
              {userProfile && (
                <Link
                  to="/my-listings"
                  onClick={() => setIsOpen(false)}
                  className="py-2 hover:text-brand-600 transition-colors"
                >
                  My Listings
                </Link>
              )}
              {userProfile && (
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="py-2 flex items-center justify-between hover:text-brand-600 transition-colors"
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
                <div className="flex items-center justify-between text-xs pt-1">
                  <Link 
                    to="/profile" 
                    onClick={() => setIsOpen(false)}
                    className="font-semibold text-gray-900 hover:text-brand-600"
                  >
                    View Profile ({displayName})
                  </Link>
                  <button onClick={handleLogout} className="text-red-600 font-medium">
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
                    className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-md font-semibold text-xs text-center"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('register');
                      setIsAuthModalOpen(true);
                      setIsOpen(false);
                    }}
                    className="flex-1 bg-brand-500 text-white py-2 rounded-md font-semibold text-xs text-center"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
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
    </>
  );
}
