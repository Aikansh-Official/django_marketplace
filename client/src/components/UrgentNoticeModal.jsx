import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Check, ExternalLink, X, BellRing } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UrgentNoticeModal() {
  const [urgentNotice, setUrgentNotice] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const checkUrgentNotice = useCallback(async () => {
    // Only check if user is logged in and page is active
    if (!isAuthenticated || document.visibilityState === 'hidden') return;

    try {
      const res = await api.get('/marketplace/notifications/urgent/');
      if (res.data?.urgent) {
        setUrgentNotice(res.data.urgent);
      } else {
        setUrgentNotice(null);
      }
    } catch {
      // Ignore unauthenticated or network errors silently
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkUrgentNotice();

    // Re-check on notifications-updated, auth change, or tab focus
    window.addEventListener('notifications-updated', checkUrgentNotice);
    window.addEventListener('auth-changed', checkUrgentNotice);
    window.addEventListener('focus', checkUrgentNotice);

    // Periodic check every 60 seconds
    const interval = setInterval(checkUrgentNotice, 60000);

    return () => {
      window.removeEventListener('notifications-updated', checkUrgentNotice);
      window.removeEventListener('auth-changed', checkUrgentNotice);
      window.removeEventListener('focus', checkUrgentNotice);
      clearInterval(interval);
    };
  }, [checkUrgentNotice]);

  const handleAcknowledge = async () => {
    if (!urgentNotice) return;
    setDismissing(true);

    try {
      await api.patch(`/marketplace/notifications/${urgentNotice.id}/read/`);
      setUrgentNotice(null);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark urgent notice read', err);
      // Close locally regardless
      setUrgentNotice(null);
    } finally {
      setDismissing(false);
    }
  };

  const handleActionClick = () => {
    if (!urgentNotice) return;
    const targetLink = urgentNotice.link;
    handleAcknowledge();
    if (targetLink) {
      if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
        window.open(targetLink, '_blank', 'noopener,noreferrer');
      } else {
        navigate(targetLink);
      }
    }
  };

  if (!urgentNotice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-md shadow-2xl border-2 border-red-500/80 overflow-hidden animate-zoom-in">
        {/* Top Warning Banner Stripe */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-3.5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-full animate-bounce">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-100 block">
                Official Campus Alert
              </span>
              <h3 className="text-sm font-black tracking-tight leading-none">
                CRITICAL ADMINISTRATIVE NOTICE
              </h3>
            </div>
          </div>

          <span className="px-2 py-0.5 bg-white/25 text-white rounded-full text-[10px] font-black tracking-wider uppercase">
            Priority: URGENT
          </span>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-lg font-black text-gray-900 tracking-tight leading-snug">
              {urgentNotice.title}
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Issued on {new Date(urgentNotice.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
          </div>

          {/* Formatted Message Box */}
          <div className="bg-red-50/60 p-4 rounded-md border border-red-100/80 text-xs text-gray-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
            {urgentNotice.message}
          </div>

          {/* Action Link Note if available */}
          {urgentNotice.link && (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-gray-700 block">Action Required</span>
                <span className="text-[11px] text-gray-500 truncate block font-mono">
                  {urgentNotice.link}
                </span>
              </div>
              <button
                onClick={handleActionClick}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Proceed</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Disclaimer text */}
          <p className="text-[10px] text-gray-400 italic">
            This notice was dispatched directly to your student account by Campus Administration and requires formal acknowledgment.
          </p>
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-500 font-medium">
            CampusXChange Security Shield
          </span>
          <button
            onClick={handleAcknowledge}
            disabled={dismissing}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>I Acknowledge & Understand</span>
          </button>
        </div>
      </div>
    </div>
  );
}
