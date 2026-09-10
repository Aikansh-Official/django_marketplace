import { useState, useEffect } from 'react';
import axios from 'axios';
import { Info, AlertTriangle, AlertCircle, Sparkles, X, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAnnouncement = async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/announcement/`);
        if (isMounted && res.data && res.data.enabled && res.data.text) {
          const dismissedText = sessionStorage.getItem('cxc_announcement_dismissed_text');
          // If the text is the same as what student dismissed earlier in this session, keep it dismissed
          if (dismissedText === res.data.text) {
            setIsDismissed(true);
          }
          setAnnouncement(res.data);
        }
      } catch (err) {
        // Silently fail if offline / error
      }
    };

    fetchAnnouncement();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!announcement || !announcement.enabled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (announcement.text) {
      sessionStorage.setItem('cxc_announcement_dismissed_text', announcement.text);
    }
  };

  // Theme Styling
  const getTheme = () => {
    switch (announcement.type) {
      case 'WARNING':
        return {
          wrapper: 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white border-b border-amber-500/50 shadow-sm',
          badge: 'bg-amber-900/40 text-amber-200 border border-amber-400/30',
          icon: AlertTriangle,
          label: 'Caution'
        };
      case 'ALERT':
        return {
          wrapper: 'bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white border-b border-red-500/50 shadow-md',
          badge: 'bg-red-950/50 text-red-100 border border-red-400/40 animate-pulse',
          icon: AlertCircle,
          label: 'Urgent Alert'
        };
      case 'PROMO':
        return {
          wrapper: 'bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white border-b border-emerald-500/50 shadow-sm',
          badge: 'bg-emerald-950/40 text-emerald-100 border border-emerald-400/30',
          icon: Sparkles,
          label: 'Campus Fest'
        };
      case 'INFO':
      default:
        return {
          wrapper: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white border-b border-blue-500/50 shadow-sm',
          badge: 'bg-blue-950/40 text-blue-100 border border-blue-400/30',
          icon: Info,
          label: 'Notice'
        };
    }
  };

  const theme = getTheme();
  const IconComp = theme.icon;

  return (
    <aside aria-label="Campus Announcement" className={`w-full relative z-40 transition-all duration-200 ${theme.wrapper}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${theme.badge}`}>
            <IconComp className="w-3 h-3" />
            <span>{theme.label}</span>
          </span>

          <p className="font-medium truncate text-white/95 leading-normal">
            {announcement.text}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {announcement.link && (
            <a
              href={announcement.link}
              target={announcement.link.startsWith('http') ? '_blank' : '_self'}
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold underline hover:text-white text-white/90 text-[11px] transition-colors"
            >
              <span>Learn More</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          )}

          {announcement.dismissible && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss Notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
