import React from 'react';
import {
  User,
  Package,
  ShieldCheck,
  Heart,
  Bell,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Star,
  BadgeCheck,
  Store,
  ShoppingBag
} from 'lucide-react';

export default function ProfileSidebar({
  activeTab,
  onTabChange,
  profile,
  listingsCount = 0,
  savedCount = 0,
  unreadCount = 0,
  onLogoutClick,
  onUpgradeClick
}) {
  const isSeller = profile?.role === 'SELLER' || profile?.is_id_verified;

  const tabs = [
    {
      id: 'personal-info',
      label: 'Personal Information',
      icon: User,
      badge: null,
      description: 'Profile & contact details'
    },
    {
      id: 'orders-sells',
      label: isSeller ? 'Manage Orders & Sells' : 'My Orders & Trades',
      icon: isSeller ? Package : ShoppingBag,
      badge: isSeller && listingsCount > 0 ? listingsCount : null,
      description: isSeller ? 'Listings, trades & inquiries' : 'Purchases, inquiries & trades'
    },
    ...(isSeller ? [{
      id: 'id-verification',
      label: 'ID Card Verification',
      icon: ShieldCheck,
      badge: profile?.is_id_verified ? 'Verified' : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      description: 'LPU Student ID verification'
    }] : []),
    {
      id: 'saved-items',
      label: 'Saved Items',
      icon: Heart,
      badge: savedCount > 0 ? savedCount : null,
      badgeColor: 'bg-rose-100 text-rose-700',
      description: 'Wishlist & bookmarked items'
    }
  ];

  const displayName = profile?.full_name || profile?.first_name || profile?.username;
  const firstLetter = (displayName || 'U')[0].toUpperCase();

  const hasEmail = Boolean(profile?.email && profile?.email.trim());
  const hasIdVerified = Boolean(profile?.is_id_verified);
  const tradesCount = Number(profile?.completed_trades_count || 0);
  const trustScore = profile?.trust_score !== undefined
    ? profile.trust_score
    : (hasEmail ? 5 : 0) + (hasIdVerified ? 5 : 0) + (tradesCount * 5);

  return (
    <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
      {/* User Mini Profile Card */}
      <div className="bg-white rounded-md border border-gray-200/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with guaranteed valid size */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md bg-gradient-to-tr from-brand-500 to-brand-400 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-xs flex-shrink-0 overflow-hidden">
              {profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                firstLetter
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-extrabold text-sm text-gray-900 truncate">
                  {displayName}
                </h2>
                {profile?.is_id_verified && (
                  <span title="Official Student ID Verified" className="inline-flex shrink-0">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs font-medium text-gray-500 truncate">@{profile?.username}</p>
                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                  profile?.is_id_verified || profile?.role === 'SELLER'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {profile?.is_id_verified || profile?.role === 'SELLER' ? 'Seller' : 'Buyer'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile quick sign out */}
          <button
            type="button"
            onClick={onLogoutClick}
            className="lg:hidden p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Trust Score Snapshot */}
        <div className="mt-3.5 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-semibold flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Trust Score
            </span>
            <span className="font-extrabold text-brand-600">
              {trustScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Desktop only - mobile uses top slider) */}
      <nav className="hidden lg:block bg-white rounded-md border border-gray-200/90 p-2 shadow-sm space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold transition-all duration-150 text-left ${isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'
                    }`}
                />
                <span className="truncate">{tab.label}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeColor || 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-gray-300'
                    }`}
                />
              </div>
            </button>
          );
        })}

        {/* Separator */}
        <div className="pt-2 border-t border-gray-100 my-1"></div>

        {/* Logout Tab Item */}
        <button
          onClick={onLogoutClick}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-red-500 group-hover:translate-x-0.5 transition-transform" />
            <span>Logout</span>
          </div>
          <span className="text-[11px] text-red-400 group-hover:text-red-600 font-medium">Sign out</span>
        </button>
      </nav>

      {/* Upgrade to Seller CTA for Buyers */}
      {!isSeller && (
        <div className="bg-gradient-to-br from-brand-50 via-orange-50 to-amber-50/50 border border-brand-200/90 rounded-md p-4 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-brand-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">Want to Sell Items?</h4>
              <p className="text-[10px] text-gray-600 font-medium">Verify ID & become a seller</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-600 leading-snug">
            Upgrade your buyer account in 3 quick steps to list books, cycles, and essentials.
          </p>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white text-xs font-bold py-2.5 px-3 rounded-md transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Upgrade to Seller</span>
          </button>
        </div>
      )}
    </div>
  );
}
