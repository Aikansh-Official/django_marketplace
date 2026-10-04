import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermissionAndRegister
} from '../../services/fcmService';

const SNOOZE_STORAGE_KEY = 'cxc_notif_prompt_snoozed_until';

export default function NotificationOptInBanner() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // Only check if notifications are supported and user is authenticated
    if (!isNotificationSupported()) return;

    const checkEligibility = () => {
      const token = localStorage.getItem('access');
      if (!token) {
        setShowPrompt(false);
        return;
      }

      const perm = getNotificationPermission();
      // If already granted or blocked/denied, no need to show banner
      if (perm !== 'default') {
        setShowPrompt(false);
        return;
      }

      // Check snooze timestamp
      const snoozedUntil = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (snoozedUntil && Date.now() < Number(snoozedUntil)) {
        setShowPrompt(false);
        return;
      }

      setShowPrompt(true);
    };

    checkEligibility();

    // Re-check on auth changes or tab focus
    window.addEventListener('auth-changed', checkEligibility);
    window.addEventListener('focus', checkEligibility);

    return () => {
      window.removeEventListener('auth-changed', checkEligibility);
      window.removeEventListener('focus', checkEligibility);
    };
  }, []);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const res = await requestNotificationPermissionAndRegister();
      if (res.success) {
        toast.success('🔔 Real-time push alerts enabled! You will now receive instant trade notifications.');
        setShowPrompt(false);
        window.dispatchEvent(new Event('notifications-updated'));
      } else if (res.reason === 'PERMISSION_DENIED') {
        toast.error('Notification permission was blocked in browser settings.');
        setShowPrompt(false);
      } else {
        toast.error(res.reason || 'Could not enable push notifications.');
      }
    } catch (err) {
      console.warn('Error enabling push from banner:', err);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    // Snooze for 48 hours
    localStorage.setItem(SNOOZE_STORAGE_KEY, String(Date.now() + 48 * 60 * 60 * 1000));
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-brand-600 text-white shadow-md border-b border-orange-500/30 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 leading-tight">
                <span>Enable Real-Time Browser Notifications</span>
                <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full tracking-wide">
                  Default ON
                </span>
              </p>
              <p className="text-[11px] sm:text-xs text-orange-100/90 leading-tight mt-0.5 line-clamp-1">
                Receive instant popups for buyer requests, deal handovers, and chats even when tab is in background.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleEnable}
              disabled={isEnabling}
              className="bg-white hover:bg-orange-50 text-orange-700 active:scale-95 text-xs font-black px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isEnabling ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>Allow Notifications</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              title="Remind me later"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
