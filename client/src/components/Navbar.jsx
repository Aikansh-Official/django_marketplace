import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Menu, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import logoImg from '../assets/LPUTrade_logo.jpeg';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('access');
      if (token) {
        try {
          const response = await axios.get('http://localhost:8000/api/auth/profile/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserProfile(response.data);
        } catch (error) {
          console.error("Failed to fetch profile", error);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUserProfile(null);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <img src={logoImg} alt="LPUTrade Logo" className="h-10 w-10 object-cover rounded-full shadow-sm" />
              <span className="font-bold text-xl tracking-tight text-gray-900">LPUTrade</span>
            </Link>
          </div>

          <div className="hidden sm:flex flex-1 justify-center px-8">
            <div className="max-w-md w-full relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:text-sm transition-all"
                placeholder="Search for books, calculators, electronics..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center space-x-4">
            {userProfile ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-ink-900 uppercase">
                  Hi, {userProfile.first_name || userProfile.username}
                </span>
                <button onClick={handleLogout} className="text-ink-800 hover:text-brand-600 transition-colors">
                  <LogOut className="h-5 w-5" />
                </button>
                <Link to="/sell" className="px-5 py-2.5 bg-brand-500 text-white rounded-sm font-bold text-sm hover:bg-brand-600 transition-colors uppercase tracking-wider">
                  Sell Item
                </Link>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-ink-800 hover:text-brand-600 font-bold transition-colors uppercase text-sm tracking-wider">
                  Log in
                </Link>
                <Link to="/register" className="px-5 py-2.5 bg-brand-500 text-white rounded-sm font-bold text-sm hover:bg-brand-600 transition-colors uppercase tracking-wider">
                  Sign up
                </Link>
              </>
            )}
          </div>
          </div>

        </div>
      </div>
    </nav>
  );
}
