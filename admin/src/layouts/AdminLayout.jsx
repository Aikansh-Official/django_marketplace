import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, FolderTree, AlertTriangle,
  Settings, LogOut, Clock, Handshake, Bell, TrendingUp,
  ShieldAlert, Activity, UserCheck, Search, Shield, LayoutTemplate,
  Menu, X
} from 'lucide-react';
import { api } from '../config/api';
import CommandPalette from '../components/CommandPalette';
import logoImg from '../assets/CampusXChange_Logo.webp';
import { hasModulePermission, getEffectivePermissions } from '../utils/permissions';
import { APP_VERSION } from '../config/version';

export default function AdminLayout({ setAuth }) {
  const [time, setTime] = useState(new Date());
  const [adminUser, setAdminUser] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // 1. Initial cached user from localStorage
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        // eslint-disable-next-line react/set-state-in-effect
        setAdminUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }

    // 2. Refresh live session profile to synchronize permissions in real-time
    const syncProfile = async () => {
      try {
        const res = await api.get('/auth/status/');
        if (res.data && res.data.isAuthenticated && res.data.user) {
          const mergedUser = {
            ...res.data.user,
            admin_role: res.data.admin_role || res.data.user.admin_role,
            effective_role: res.data.admin_role,
            admin_permissions: res.data.admin_permissions || res.data.user.admin_permissions || [],
            effective_permissions: res.data.admin_permissions || res.data.user.effective_permissions || []
          };
          setAdminUser(mergedUser);
          localStorage.setItem('admin_user', JSON.stringify(mergedUser));
        }
      } catch (err) {
        console.warn('Could not sync live admin permissions:', err);
      }
    };
    syncProfile();

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
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp, permission: 'analytics' },
    { name: 'Students', path: '/students', icon: Users, permission: 'students' },
    { name: 'Listings', path: '/listings', icon: ShoppingCart, permission: 'listings' },
    { name: 'Deals', path: '/deals', icon: Handshake, permission: 'deals' },
    { name: 'Categories', path: '/categories', icon: FolderTree, permission: 'categories' },
    { name: 'Banners', path: '/banners', icon: LayoutTemplate, permission: 'banners' },
    { name: 'Reports', path: '/reports', icon: AlertTriangle, permission: 'reports' },
    { name: 'Notifications', path: '/notifications', icon: Bell, permission: 'notifications' },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert, permission: 'audit_logs' },
    { name: 'System Health', path: '/system-health', icon: Activity, permission: 'system_health' },
    { name: 'Staff Team', path: '/team', icon: UserCheck, permission: 'team' },
    { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings' },
  ];

  const visibleNavItems = navItems.filter((item) => hasModulePermission(adminUser, item.permission));
  const effectivePerms = getEffectivePermissions(adminUser);
  const adminRoleDisplay = adminUser?.admin_role || (adminUser?.is_superuser ? 'SUPER_ADMIN' : 'MODERATOR');

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        adminUser={adminUser}
      />

      {/* Mobile Backdrop Overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar - Solid Design with Responsive Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-ink-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-20 flex items-center justify-between px-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="CampXChange Logo" className="h-8 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <div className="flex items-baseline truncate">
                <span className="text-base font-extrabold text-white tracking-tight">Camp</span>
                <span className="text-base font-extrabold text-brand-400 tracking-tight">XChange</span>
              </div>
              <span className="text-[10px] text-brand-400 tracking-[0.2em] font-bold block">ADMIN PANEL</span>
            </div>
          </div>
          {/* Close mobile nav button */}
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink 
              key={item.name}
              to={item.path} 
              onClick={() => setIsMobileNavOpen(false)}
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
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-brand-900 text-brand-300 border border-brand-700">
                  {adminRoleDisplay.replace('_', ' ')}
                </span>
                <span className="text-[9px] text-gray-400 font-semibold">
                  {effectivePerms.length} tabs
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md font-semibold text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500 hover:shadow-md cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>

          {/* Sidebar Version */}
          <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500">
            <span>Admin</span>
            <span>Version {APP_VERSION}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative min-w-0">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Hamburger toggle button for Mobile/Tablet */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Overview</h2>
            
            {/* Quick Search / Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-xs font-semibold transition-all border border-gray-200 shadow-2xs cursor-pointer"
              title="Search or jump to any page (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden sm:inline">Search or jump to...</span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-300 text-[10px] text-gray-600 shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
             {/* Staff Role Pill */}
             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
               <Shield className="w-3.5 h-3.5 text-purple-600" />
               <span>{adminRoleDisplay.replace('_', ' ')}</span>
             </div>

             {/* Realtime Clock Widget */}
             <div className="flex items-center gap-2 text-gray-700 bg-white/50 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-md font-semibold text-xs sm:text-sm border border-gray-200 shadow-sm whitespace-nowrap">
               <Clock className="h-4 w-4 text-brand-500" />
               <span className="hidden md:inline">{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
               <span className="hidden md:inline text-gray-300 mx-1">|</span>
               <span className="tabular-nums min-w-[75px] sm:min-w-[85px] text-right">
                 {time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </span>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-8 relative">
          <Outlet />
        </main>

        {/* Admin Footer */}
        <footer className="h-11 bg-white/70 backdrop-blur-sm border-t border-gray-200/80 px-4 sm:px-8 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <p>© {new Date().getFullYear()} CampXChange Enterprise Admin Portal</p>
          <p>Version {APP_VERSION}</p>
        </footer>
      </div>

    </div>
  );
}
