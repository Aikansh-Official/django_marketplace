import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, TrendingUp, Users, ShoppingCart,
  Handshake, FolderTree, AlertTriangle, Bell, ShieldAlert,
  Activity, Settings, UserCheck, Megaphone, ArrowRight,
  Sparkles, FileText, Download, X, CornerDownLeft
} from 'lucide-react';

import { hasModulePermission } from '../utils/permissions';

export default function CommandPalette({ isOpen, onClose, adminUser }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const commands = [
    // Pages / Navigation
    { id: 'dash', title: 'Dashboard Overview', category: 'Navigation', icon: LayoutDashboard, path: '/', shortcut: 'D', permission: 'dashboard' },
    { id: 'analytics', title: 'Analytics & Growth Charts', category: 'Navigation', icon: TrendingUp, path: '/analytics', shortcut: 'A', permission: 'analytics' },
    { id: 'students', title: 'Student Management & ID Cards', category: 'Navigation', icon: Users, path: '/students', shortcut: 'S', permission: 'students' },
    { id: 'listings', title: 'Listing Catalog & Inventory', category: 'Navigation', icon: ShoppingCart, path: '/listings', shortcut: 'L', permission: 'listings' },
    { id: 'deals', title: 'Deals & QR Handover Sessions', category: 'Navigation', icon: Handshake, path: '/deals', shortcut: 'H', permission: 'deals' },
    { id: 'categories', title: 'Category Management', category: 'Navigation', icon: FolderTree, path: '/categories', shortcut: 'C', permission: 'categories' },
    { id: 'reports', title: 'Content Moderation & Reports', category: 'Navigation', icon: AlertTriangle, path: '/reports', shortcut: 'M', permission: 'reports' },
    { id: 'notifications', title: 'Broadcasts & Direct Notices', category: 'Navigation', icon: Bell, path: '/notifications', shortcut: 'B', permission: 'notifications' },
    { id: 'audit-logs', title: 'Audit Trail & Action Logs', category: 'Navigation', icon: ShieldAlert, path: '/audit-logs', shortcut: 'T', permission: 'audit_logs' },
    { id: 'system-health', title: 'System Health & Diagnostics', category: 'Navigation', icon: Activity, path: '/system-health', shortcut: 'P', permission: 'system_health' },
    { id: 'team', title: 'Staff Team & Admin RBAC', category: 'Navigation', icon: UserCheck, path: '/team', shortcut: 'U', permission: 'team' },
    { id: 'settings', title: 'Platform Settings & Constraints', category: 'Navigation', icon: Settings, path: '/settings', shortcut: 'O', permission: 'settings' },

    // Quick Actions
    { id: 'act-broadcast', title: 'Compose Campus Broadcast', category: 'Quick Actions', icon: Megaphone, path: '/notifications', permission: 'notifications' },
    { id: 'act-inspect-reports', title: 'Review Unresolved Flagged Reports', category: 'Quick Actions', icon: AlertTriangle, path: '/reports', permission: 'reports' },
    { id: 'act-health', title: 'Run Live Database & Cache Diagnostics', category: 'Quick Actions', icon: Activity, path: '/system-health', permission: 'system_health' },
    { id: 'act-audit', title: 'Export Audit Logs (CSV)', category: 'Quick Actions', icon: Download, path: '/audit-logs', permission: 'audit_logs' },
    { id: 'act-team', title: 'Appoint / Promote Staff Member', category: 'Quick Actions', icon: UserCheck, path: '/team', permission: 'team' },
    { id: 'act-deals', title: 'Inspect Active QR Handovers', category: 'Quick Actions', icon: Handshake, path: '/deals', permission: 'deals' },
  ];

  const authorizedCommands = commands.filter((cmd) => hasModulePermission(adminUser, cmd.permission));

  const filteredCommands = authorizedCommands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  const handleSelect = (command) => {
    onClose();
    navigate(command.path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in">
      {/* Overlay Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-10">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or quick action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-gray-50">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold">No commands found for "{query}"</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Try searching for students, deals, settings, or audit logs.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {cmd.title}
                        </p>
                        <p className={`text-[10px] ${isSelected ? 'text-brand-100' : 'text-gray-400'}`}>
                          {cmd.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cmd.shortcut && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isSelected
                              ? 'bg-brand-700/60 border-brand-500 text-brand-100'
                              : 'bg-gray-100 border-gray-200 text-gray-500'
                          }`}
                        >
                          {cmd.shortcut}
                        </span>
                      )}
                      {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-white/80" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200 text-[10px]">↑</kbd>{' '}
              <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200 text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">↵</kbd> to select
            </span>
            <span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">esc</kbd> to close
            </span>
          </div>
          <span className="font-semibold text-brand-600">CampusXChange Command Center</span>
        </div>
      </div>
    </div>
  );
}
