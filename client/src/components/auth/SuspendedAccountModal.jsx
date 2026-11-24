import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertOctagon, Mail, ExternalLink, LogOut, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SuspendedAccountModal() {
  const [suspensionData, setSuspensionData] = useState(null);

  useEffect(() => {
    const handleSuspension = (e) => {
      setSuspensionData({
        message: e.detail?.message || 'Your student account has been suspended by campus moderators.',
        reason: e.detail?.reason || 'Violation of Campus Trading & Safety Guidelines',
      });
    };

    window.addEventListener('account-suspended', handleSuspension);
    return () => {
      window.removeEventListener('account-suspended', handleSuspension);
    };
  }, []);

  if (!suspensionData) return null;

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setSuspensionData(null);
    window.location.href = '/';
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-md shadow-2xl border border-red-200 overflow-hidden text-center p-6 sm:p-8 relative">
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-full bg-red-100 border border-red-300 flex items-center justify-center mx-auto mb-5 text-red-600 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2 font-display">
          Account Suspended
        </h2>

        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          {suspensionData.message}
        </p>

        {/* Details box */}
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
          <div className="flex items-center gap-2 text-red-700 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertOctagon className="w-4 h-4" />
            Safety Action Applied
          </div>
          <p className="text-xs text-red-800 leading-relaxed">
            Campus administrators have temporarily or permanently restricted this account from buying, listing, or initiating handovers on CampXChange.
          </p>
        </div>

        {/* Appeal / Action Links */}
        <div className="space-y-3 mb-6 text-xs text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>Appeal or dispute: <a href="mailto:support@campxchange.in" className="font-semibold text-brand-600 hover:underline">support@campxchange.in</a></span>
          </div>
          <div>
            <Link
              to="/guidelines"
              onClick={() => setSuspensionData(null)}
              className="text-gray-600 hover:underline inline-flex items-center gap-1"
            >
              Read Community Guidelines <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-gray-900 hover:bg-black text-white font-bold text-sm transition-all shadow-md cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out & Return Home
        </button>
      </div>
    </div>,
    document.body
  );
}
