import { Link, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, AlertTriangle, Settings, LogOut } from 'lucide-react';
import logoImg from '../assets/LPUTrade_logo.jpeg';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-ink-900 text-white flex flex-col">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800">
          <img src={logoImg} alt="LPUTrade Logo" className="h-8 w-8 object-cover rounded-full shadow-sm" />
          <span className="text-xl font-bold text-brand-500 uppercase tracking-wider">LPUTrade Admin</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md bg-brand-600 text-white font-medium">
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </Link>
          <Link to="/students" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <Users className="h-5 w-5" /> Students
          </Link>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <ShoppingCart className="h-5 w-5" /> Listings
          </Link>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <AlertTriangle className="h-5 w-5" /> Reports
          </Link>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <Settings className="h-5 w-5" /> Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-gray-300 hover:bg-red-500 hover:text-white transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800">Overview</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold">
              A
            </div>
            <span className="text-sm font-medium text-gray-700">Admin User</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
