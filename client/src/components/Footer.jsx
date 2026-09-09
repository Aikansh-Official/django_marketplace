import { Link } from 'react-router-dom';
import logoImg from '../assets/LPXchange_Logo.jpeg';

export default function Footer() {
  const currentYear = new Date().getFullYear();

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
                alt="LPXchange"
                className="h-8 w-8 object-cover rounded-lg"
              />
              <div className="flex items-baseline">
                <span className="text-lg font-bold tracking-tight text-gray-950 font-display">LP</span>
                <span className="text-lg font-bold tracking-tight text-brand-500 font-display">Xchange</span>
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
              <li>
                <Link to="/sell" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Post an Item for Sale
                </Link>
              </li>
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
                  About LPXchange
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
          <p>
            &copy; {currentYear} LPXchange. A campus marketplace for LPU students.
          </p>
          <p className="flex items-center gap-1 font-medium text-gray-500">
            Made by LPU Student
          </p>
        </div>

      </div>
    </footer>
  );
}
