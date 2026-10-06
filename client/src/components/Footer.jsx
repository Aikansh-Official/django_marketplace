import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/CampusXChange_Logo.webp';
import { APP_VERSION } from '../config/version';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const { user: userProfile, isSeller, isBuyer } = useAuth();

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
    <footer className="bg-white border-t border-gray-200 text-gray-600 mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-[5%] py-8 sm:py-10">

        {/* Main Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 pb-7 border-b border-gray-100">

          {/* Brand Info (Stacked Logo over Name) */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-4">
            <Link to="/" className="inline-flex flex-col items-start group" aria-label="CampusXChange">
              <img
                src={logoImg}
                alt="CampusXChange"
                className="h-8 sm:h-9 w-auto object-contain mb-1.5 transition-transform duration-200 group-hover:scale-105"
              />
              <div className="flex items-baseline">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 font-display">Campus</span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-brand-500 font-display">XChange</span>
              </div>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
              The trusted student marketplace for Lovely Professional University. Buy, sell, and trade campus essentials easily.
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3">
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
          <div className="lg:col-span-3">
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
              <li className="pt-0.5">
                <Link to="/guidelines#reporting" className="text-amber-600 hover:text-amber-700 font-medium transition-colors inline-block">
                  Report a Listing or Scam
                </Link>
              </li>
            </ul>
          </div>

          {/* About & Legal */}
          <div className="lg:col-span-2">
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
            <span className="text-xs text-gray-400">
              Version {APP_VERSION}
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
