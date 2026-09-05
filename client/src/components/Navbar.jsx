import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Plus, Package, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
import logoImg from '../assets/LPUTrade_logo.jpeg';
import AuthModal from './AuthModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/auth/status/`);
        if (res.data?.isAuthenticated && res.data?.user) {
          setUserProfile(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } else {
          // If not authenticated, clean up any stale local auth tokens
          if (!res.data?.isAuthenticated) {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            localStorage.removeItem('user');
          }
          setUserProfile(null);
        }
      } catch (error) {
        setUserProfile(null);
      }
    };
    fetchProfile();
  }, []);

  const fetchUnreadNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/marketplace/notifications/`);
      const count = res.data.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } catch (e) {
      // not logged in or error
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchUnreadNotifications();
      const interval = setInterval(fetchUnreadNotifications, 20000);
      window.addEventListener('notifications-updated', fetchUnreadNotifications);
      return () => {
        clearInterval(interval);
        window.removeEventListener('notifications-updated', fetchUnreadNotifications);
      };
    }
  }, [userProfile]);

  useEffect(() => {
    const handleOpenAuthModal = (e) => {
      setAuthModalMode(e.detail?.mode || 'login');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuthModal);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuthModal);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout/`);
    } catch (e) {
      // Ignore network error during logout
    }
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUserProfile(null);
    navigate('/');
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo & Main Nav Links */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2.5">
                <img src={logoImg} alt="LPUTrade Logo" className="h-9 w-9 object-cover rounded-full shadow-xs" />
                <span className="font-extrabold text-xl tracking-tight text-gray-900">LPUTrade</span>
              </Link>

              <div className="hidden sm:flex items-center gap-5 text-sm font-semibold text-gray-600">
                <Link to="/" className="hover:text-brand-600 transition-colors">
                  Explore
                </Link>
                {userProfile && (
                  <Link to="/my-listings" className="hover:text-brand-600 transition-colors">
                    My Listings
                  </Link>
                )}
              </div>
            </div>

            {/* Right CTAs */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center space-x-3">
                {userProfile ? (
                  <div className="flex items-center space-x-3">
                    <Link
                      to="/notifications"
                      className="relative text-gray-600 hover:text-brand-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                      title="Notifications"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link 
                      to="/profile"
                      className="text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-full truncate max-w-[140px] flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      {userProfile.full_name || userProfile.first_name || userProfile.username}
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Log out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>

                    <Link
                      to="/sell"
                      className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-4 rounded-md transition-all shadow-sm hover:shadow-md text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Sell Item
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setAuthModalMode('login');
                        setIsAuthModalOpen(true);
                      }}
                      className="text-gray-700 hover:text-brand-600 text-xs font-semibold px-2 py-1.5 transition-colors"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => {
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2 px-3.5 rounded-md transition-all"
                    >
                      Sign up
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="flex sm:hidden items-center gap-2">
                {userProfile && (
                  <>
                    <Link
                      to="/notifications"
                      className="relative text-gray-600 hover:text-brand-600 p-2 rounded-md hover:bg-gray-100"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/sell"
                      className="bg-brand-500 text-white p-2 rounded-md shadow-xs"
                      title="Sell Item"
                    >
                      <Plus className="w-4 h-4" />
                    </Link>
                  </>
                )}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-gray-600 p-1.5 rounded-md hover:bg-gray-100"
                >
                  {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 shadow-lg">
            <div className="flex flex-col gap-2 text-xs font-semibold text-gray-700">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="py-2 hover:text-brand-600 border-b border-gray-100"
              >
                Explore Marketplace
              </Link>
              {userProfile && (
                <>
                  <Link
                    to="/my-listings"
                    onClick={() => setIsOpen(false)}
                    className="py-2 hover:text-brand-600 border-b border-gray-100"
                  >
                    My Listings
                  </Link>
                  <Link
                    to="/sell"
                    onClick={() => setIsOpen(false)}
                    className="py-2 text-brand-600 font-bold"
                  >
                    Post an Item (Sell / Rent / Free)
                  </Link>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              {userProfile ? (
                <div className="flex justify-between items-center w-full flex-wrap gap-2">
                  <span className="font-bold w-full truncate">{userProfile.full_name || userProfile.first_name || userProfile.username}</span>
                  <Link 
                    to="/profile" 
                    onClick={() => setIsOpen(false)}
                    className="text-brand-600 font-semibold"
                  >
                    View Profile
                  </Link>
                  <button onClick={handleLogout} className="text-red-600 font-semibold">
                    Log out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full pt-1">
                  <button
                    onClick={() => {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                      setIsOpen(false);
                    }}
                    className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-md font-semibold text-center"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('register');
                      setIsAuthModalOpen(true);
                      setIsOpen(false);
                    }}
                    className="flex-1 bg-brand-500 text-white py-2 rounded-md font-semibold text-center"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authModalMode} 
      />
    </>
  );
}
