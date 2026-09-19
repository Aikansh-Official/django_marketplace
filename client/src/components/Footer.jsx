import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logoImg from '../assets/CampusXChange_Logo.jpeg';
import { APP_VERSION } from '../config/version';

export default function Footer() {
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem('user');
        setUserProfile(stored ? JSON.parse(stored) : null);
      } catch {
        setUserProfile(null);
      }
    };
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

  // Normalize current pathname (strip trailing slash)
  const pathname = location.pathname.replace(/\/$/, '') || '/';

  // Routes where Footer should be visible:
  // - Home ('/')
  // - Public Item Details ('/listing/:id')
  // - Public Informational & Legal pages ('/about', '/guidelines', '/privacy', '/terms')
  // Hidden on action & dashboard pages like /profile, /sell, /create-listing, /edit-listing, /my-listings, /notifications
  const isAllowed =
    pathname === '/' ||
    pathname.startsWith('/listing/') ||
    ['/about', '/guidelines', '/privacy', '/terms'].includes(pathname);

  if (!isAllowed) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-600 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Main Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pb-8 border-b border-gray-100">

          {/* Brand Info */}
          <div className="space-y-3 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={logoImg}
                alt="CampusXChange"
                className="h-8 w-8 object-cover rounded-lg"
              />
              <div className="flex items-baseline">
                <span className="text-lg font-bold tracking-tight text-gray-950 font-display">Campus</span>
                <span className="text-lg font-bold tracking-tight text-brand-500 font-display">XChange</span>
              </div>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              A student project developed by LPU students for the Lovely Professional University campus community. Buy, sell, and donate books, notes, stationery, and daily campus essentials directly with fellow students.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Explore All Listings
                </Link>
              </li>
              {!isBuyer && (
                <li>
                  <Link to="/sell" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Post an Item for Sale
                  </Link>
                </li>
              )}
              <li>
                <Link to="/?transaction_type=DONATE" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Free Donation Box
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus Safety */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Safety & Handover
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/guidelines#safe-handover" className="text-gray-500 hover:text-gray-900 transition-colors font-medium">
                  Safe Handover Rules
                </Link>
              </li>
              <li>
                <Link to="/guidelines#safe-handover" className="text-gray-400 hover:text-gray-600 block text-[11px] leading-relaxed transition-colors">
                  Recommended spots: Uni-Mall entrance, Central Library, and Hostel gates.
                </Link>
              </li>
              <li className="pt-1">
                <Link to="/guidelines#reporting" className="text-amber-600 hover:text-amber-700 font-medium transition-colors inline-block">
                  Report a Listing or Scam
                </Link>
              </li>
            </ul>
          </div>

          {/* About & Legal */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              About & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="text-gray-500 hover:text-gray-900 transition-colors">
                  About CampusXChange
                </Link>
              </li>
              <li>
                <Link to="/guidelines" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p>
              &copy; {currentYear} CampusXChange. A campus marketplace for LPU students.
            </p>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              v{APP_VERSION}
            </span>
          </div>
          <p className="flex items-center gap-1 font-medium text-gray-500">
            Made by LPU Student
          </p>
        </div>

      </div>
    </footer>
  );
}
