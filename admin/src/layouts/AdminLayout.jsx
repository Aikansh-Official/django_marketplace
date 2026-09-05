import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, AlertTriangle, Settings, LogOut, Clock } from 'lucide-react';
import logoImg from '../assets/LPUTrade_logo.jpeg';

export default function AdminLayout({ setAuth }) {
  const [time, setTime] = useState(new Date());
  const [adminUser, setAdminUser] = useState(null);

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

    return () => clearInterval(timer);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_user');
    setAuth(false);
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Listings', path: '/listings', icon: ShoppingCart },
    { name: 'Reports', path: '/reports', icon: AlertTriangle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* Sidebar - Simple Solid Design */}
      <aside className="w-64 bg-ink-900 text-white flex flex-col shadow-xl z-30">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-gray-800">
          <img src={logoImg} alt="LPUTrade Logo" className="h-9 w-9 object-cover rounded-full ring-2 ring-brand-500" />
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-wide leading-tight">
              LPUTrade
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
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold uppercase">
              {adminUser ? adminUser.username.charAt(0) : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{adminUser ? adminUser.full_name || adminUser.username : 'Admin User'}</p>
              <p className="text-xs text-gray-500 truncate">{adminUser ? adminUser.email : 'admin@lputrade.in'}</p>
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
          <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
          
          <div className="flex items-center gap-6">
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
        <main className="flex-1 overflow-auto p-8 relative z-10">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
