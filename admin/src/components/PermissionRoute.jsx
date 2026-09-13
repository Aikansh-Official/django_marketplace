import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, LayoutDashboard } from 'lucide-react';
import { hasModulePermission, PERMISSION_CATALOG, getEffectivePermissions } from '../utils/permissions';

export default function PermissionRoute({ requiredPermission, children }) {
  const navigate = useNavigate();

  let adminUser = null;
  try {
    const raw = localStorage.getItem('admin_user');
    if (raw) adminUser = JSON.parse(raw);
  } catch {
    adminUser = null;
  }

  const isAllowed = hasModulePermission(adminUser, requiredPermission);

  if (isAllowed) {
    return children;
  }

  const permMeta = PERMISSION_CATALOG.find((p) => p.key === requiredPermission) || {
    label: requiredPermission,
    description: 'This administrative module is restricted.',
  };

  const roleName = adminUser?.admin_role || (adminUser?.is_superuser ? 'SUPER_ADMIN' : 'MODERATOR');
  const allowedPerms = getEffectivePermissions(adminUser);
  const firstPermittedPath = allowedPerms.includes('dashboard') ? '/' : `/${allowedPerms[0] || ''}`;

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-red-50/50">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-md bg-red-100 text-red-800 mb-3">
          403 • Restricted Section
        </span>

        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">
          Access Restricted
        </h2>

        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your administrative role (<strong className="text-gray-800">{roleName.replace('_', ' ')}</strong>)
          does not have permission to access <strong className="text-gray-800">{permMeta.label}</strong>.
          Please contact a Super Administrator if you require elevated privileges for this module.
        </p>

        <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-100 text-left mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-1">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span>Required Administrative Scope:</span>
          </div>
          <p className="text-xs text-gray-500 pl-5">
            Module key: <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">{requiredPermission}</code>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate(firstPermittedPath)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Authorized Tab
          </button>
        </div>
      </div>
    </div>
  );
}
