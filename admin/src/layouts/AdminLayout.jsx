import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, FolderTree, AlertTriangle,
  Settings, LogOut, Clock, Handshake, Bell, TrendingUp,
  ShieldAlert, Activity, UserCheck, Search, Shield
} from 'lucide-react';
import CommandPalette from '../components/CommandPalette';
import logoImg from '../assets/CampusXChange_Logo.jpeg';

export default function AdminLayout({ setAuth }) {
  const [time, setTime] = useState(new Date());
  const [adminUser, setAdminUser] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Fetch user info from localStorage
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }

    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_user');
    setAuth(false);
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Listings', path: '/listings', icon: ShoppingCart },
    { name: 'Deals', path: '/deals', icon: Handshake },
    { name: 'Categories', path: '/categories', icon: FolderTree },
    { name: 'Reports', path: '/reports', icon: AlertTriangle },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert },
    { name: 'System Health', path: '/system-health', icon: Activity },
    { name: 'Staff Team', path: '/team', icon: UserCheck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const adminRoleDisplay = adminUser?.admin_role || (adminUser?.is_superuser ? 'SUPER_ADMIN' : 'MODERATOR');

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Sidebar - Simple Solid Design */}
      <aside className="w-64 bg-ink-900 text-white flex flex-col shadow-xl z-30">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-gray-800">
          <img src={logoImg} alt="CampusXChange Logo" className="h-9 w-9 object-cover rounded-full ring-2 ring-brand-500" />
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-wide leading-tight">
              CampusXChange
            </h1>
            <span className="text-[10px] text-brand-400 tracking-wider font-bold">ADMIN PANEL</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink 
              key={item.name}
              to={item.path} 
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-brand-600 text-white font-bold shadow-md' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white font-medium'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold uppercase shrink-0">
              {adminUser ? adminUser.username.charAt(0) : 'A'}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-bold text-white truncate">{adminUser ? adminUser.full_name || adminUser.username : 'Admin User'}</p>
              <span className="inline-block px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-brand-900 text-brand-300 border border-brand-700">
                {adminRoleDisplay.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md font-semibold text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500 hover:shadow-md"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
            
            {/* Quick Search / Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-3 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-xs font-semibold transition-all border border-gray-200 shadow-2xs"
              title="Search or jump to any page (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <span>Search or jump to...</span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-300 text-[10px] text-gray-600 shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Staff Role Pill */}
             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
               <Shield className="w-3.5 h-3.5 text-purple-600" />
               <span>{adminRoleDisplay.replace('_', ' ')}</span>
             </div>

             {/* Realtime Clock Widget */}
             <div className="flex items-center gap-2 text-gray-700 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-md font-semibold text-sm border border-gray-200 shadow-sm whitespace-nowrap">
               <Clock className="h-4 w-4 text-brand-500" />
               <span>{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
               <span className="text-gray-300 mx-1">|</span>
               <span className="tabular-nums min-w-[85px] text-right">
                 {time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </span>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 relative">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
