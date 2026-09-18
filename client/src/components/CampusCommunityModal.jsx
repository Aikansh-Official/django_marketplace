import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy,
  Award,
  ShieldCheck,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  X,
  ExternalLink,
  Zap,
  TrendingUp
} from 'lucide-react';
import api from '../services/api';

export default function CampusCommunityModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'hotspots'

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    api
      .get('/marketplace/community-hub/')
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load community hub', err);
        if (isMounted) setLoading(false);
      });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const topSellers = data?.top_sellers || [];
  const hotspots = data?.hotspots || [];
  const stats = data?.stats || { total_students: 0, completed_deals: 0, active_listings: 0 };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Warm Light Theme Matching CampusXChange */}
        <div className="px-5 sm:px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>CampusXChange Community</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-display text-gray-900 tracking-tight">
            Campus Hall of Fame & Trading Zones
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Top trusted student traders and safe meetup zones across LPU campus.
          </p>

          {/* Quick stats ticker */}
          <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-orange-100">
            <div className="bg-white/90 p-2.5 rounded-xl border border-orange-100 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900 font-display">{stats.completed_deals}+</div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Deals Completed</div>
            </div>
            <div className="bg-white/90 p-2.5 rounded-xl border border-orange-100 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900 font-display">{stats.total_students}</div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Registered Students</div>
            </div>
            <div className="bg-white/90 p-2.5 rounded-xl border border-orange-100 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900 font-display">{stats.active_listings}</div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Live Listings</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'border-brand-500 text-brand-600 bg-white/60'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Top Trusted Sellers
          </button>
          <button
            onClick={() => setActiveTab('hotspots')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'hotspots'
                ? 'border-brand-500 text-brand-600 bg-white/60'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            Safe Handover Hotspots
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-3 bg-white">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
              Loading verified campus community rankings...
            </div>
          ) : activeTab === 'leaderboard' ? (
            <div className="space-y-2.5">
              {topSellers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No verified peer sales recorded yet. Be the first to trade!
                </div>
              ) : (
                topSellers.map((seller) => {
                  const isGold = seller.rank === 1;
                  const isSilver = seller.rank === 2;
                  const isBronze = seller.rank === 3;

                  return (
                    <div
                      key={seller.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isGold
                          ? 'bg-amber-50/50 border-amber-200/80 shadow-2xs'
                          : isSilver
                          ? 'bg-slate-50/60 border-slate-200/80'
                          : isBronze
                          ? 'bg-orange-50/50 border-orange-200/80'
                          : 'bg-white border-gray-100 hover:border-gray-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            isGold
                              ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                              : isSilver
                              ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-300/40'
                              : isBronze
                              ? 'bg-orange-300 text-orange-950 ring-2 ring-orange-400/30'
                              : 'bg-gray-100 text-gray-600 font-bold'
                          }`}
                        >
                          {isGold ? '1🥇' : isSilver ? '2🥈' : isBronze ? '3🥉' : `#${seller.rank}`}
                        </div>

                        {/* Profile Photo / Avatar */}
                        <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-brand-700 overflow-hidden shrink-0">
                          {seller.profile_photo ? (
                            <img src={seller.profile_photo} alt={seller.username} className="w-full h-full object-cover" />
                          ) : (
                            seller.username.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        {/* Name & Reg */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-sm text-gray-900 truncate">
                              {seller.full_name}
                            </span>
                            {seller.is_verified && (
                              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Physical ID Verified Student" />
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-mono truncate">@{seller.username}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <span>{seller.trust_score}</span>
                          <span className="text-[10px] font-medium text-emerald-600">Trust</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          <span className="font-semibold text-gray-800">{seller.completed_deals}</span> deals verified
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  Campus Safety Meetup Protocol
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  Always meet in well-lit campus public zones during daytime. Verify the physical item thoroughly before scanning the QR code or providing your 6-digit confirmation PIN.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hotspots.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border border-gray-100 hover:border-brand-200 hover:shadow-xs transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{h.location}</div>
                        <div className="text-[10px] text-gray-400">Verified Trade Zone</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 shrink-0">
                      {h.total_listings} items
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-500">
            Rankings update dynamically after verified QR transactions.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
