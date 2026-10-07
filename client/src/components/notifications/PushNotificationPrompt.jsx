import React, { useState, useEffect } from 'react';
import { Bell, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermissionAndRegister 
} from '../../services/fcmService';

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access');
    if (!token) return;

    // Check if browser supports notifications
    if (!isNotificationSupported()) return;

    // Check if permission is already granted or denied
    const permission = getNotificationPermission();
    if (permission !== 'default') return;

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('push_prompt_dismissed');
    if (dismissed === 'true') return;

    // Small delay before showing to ensure smooth app load
    const timer = setTimeout(() => {
      setShow(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true');
    setShow(false);
  };

  const handleEnable = async () => {
    setIsRegistering(true);
    try {
      const res = await requestNotificationPermissionAndRegister();
      if (res.success) {
        toast.success('Web push alerts enabled! You will now receive instant trade notifications.');
        setShow(false);
      } else if (res.reason === 'PERMISSION_DENIED') {
        toast.error('Notification permission was blocked. Please allow it from browser settings.');
        handleDismiss(); // don't ask again if blocked
      } else if (res.reason === 'MISSING_VAPID_KEY') {
        toast.error('VAPID Key missing in configuration!');
      } else {
        toast.error(res.reason || 'Could not register push notifications.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to enable notifications.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md bg-white border-2 border-brand-500 shadow-2xl rounded-2xl p-4 sm:p-5 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-start gap-3 sm:gap-4">
      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5 border border-brand-200">
        <Bell className="w-5 h-5 text-brand-600 animate-pulse" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-gray-900 text-sm sm:text-base leading-snug">
            Turn on Notifications
          </h3>
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-xs text-gray-600 mt-1 mb-3">
          Never miss an offer or chat ping! Receive instant browser alerts even when you are browsing other tabs.
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            disabled={isRegistering}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Enabling...
              </>
            ) : (
              'Enable Alerts'
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-gray-200 cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
