import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X,
  Tag,
  ShoppingBag,
  MapPin,
  Eye,
  Lock,
  Check,
  CheckCircle2,
  Edit3,
  Trash2,
  MessageSquare,
  QrCode,
  Repeat,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { getSafeImageUrl } from '../../utils/imageUrl';

export default function SellerControlDrawer({
  isOpen,
  onClose,
  initialTab = 'all',
  listing,
  listingOffers = [],
  statusUpdating = false,
  cancellingDeal = false,
  onStatusChange,
  onDeleteClick,
  onRespondOffer,
  onOpenCounterModal,
  onOpenQRModal,
  onCancelDeal
}) {
  const resolveTab = (tab) => {
    if (tab === 'controls' || tab === 'requests') return tab;
    return (listingOffers && listingOffers.length > 0) ? 'requests' : 'controls';
  };

  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab));

  // Sync tab when drawer opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveTab(initialTab));
    }
  }, [initialTab, isOpen]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Sort offers: PENDING first, then COUNTERED, then ACCEPTED, then COMPLETED/REJECTED/CANCELLED
  const sortedOffers = useMemo(() => {
    if (!listing || !Array.isArray(listingOffers)) return [];
    const priority = {
      PENDING: 1,
      COUNTERED: 2,
      ACCEPTED: 3,
      COMPLETED: 4,
      REJECTED: 5,
      CANCELLED: 6
    };
    return [...listingOffers].sort((a, b) => {
      const pA = priority[a.status] || 99;
      const pB = priority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [listing, listingOffers]);

  const pendingOffersCount = useMemo(() => {
    return (listingOffers || []).filter((o) => o.status === 'PENDING').length;
  }, [listingOffers]);

  if (!isOpen || !listing) return null;

  const displayImage = listing.images?.[0]?.image_url || listing.image || null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="seller-drawer-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 z-50">
        <aside
          className="w-screen max-w-full sm:max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-100"
          aria-label="Seller Control Panel Drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-brand-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="seller-drawer-title" className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight truncate">
                    Seller Control Panel
                  </h2>
                  <span
                    className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md border ${
                      listing.status === 'SOLD'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-brand-50 text-brand-600 border-brand-200/80'
                    }`}
                  >
                    {listing.status === 'PENDING' ? 'Reserved' : listing.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">
                  Manage visibility, lifecycle & student purchase requests
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-2"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Listing Snapshot */}
          <div className="p-3 bg-brand-50/50 border-b border-brand-100/70 flex items-center justify-between gap-3 text-xs flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-11 h-11 rounded-md bg-white overflow-hidden shrink-0 border border-brand-200/80 flex items-center justify-center shadow-2xs relative">
                {displayImage ? (
                  <img
                    src={getSafeImageUrl(displayImage)}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Tag className="w-5 h-5 text-brand-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-xs truncate max-w-[200px] sm:max-w-xs">
                  {listing.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span className="font-extrabold text-gray-900">
                    {listing.transaction_type === 'DONATE' ? 'Free (Donation)' : `Rs ${listing.price}`}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {listing.location || 'Campus'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-gray-500 text-[11px]">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span>{listing.views_count} views</span>
            </div>
          </div>

          {/* Segmented 2-Tab Navigation */}
          <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50/70 flex-shrink-0">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-200/70 rounded-md text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-3 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'requests'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-brand-500" />
                <span className="truncate">Purchase Requests</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                    pendingOffersCount > 0
                      ? 'bg-brand-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {listingOffers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('controls')}
                className={`py-2 px-3 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'controls'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-brand-500" />
                <span className="truncate">Seller Control Panel</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 1. SELLER CONTROL PANEL */}
            {activeTab === 'controls' && (
              <div className="bg-white border border-brand-200/90 rounded-md p-4 sm:p-5 shadow-xs flex flex-col space-y-3.5">
                {/* Header with Title & Action Buttons */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-brand-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-brand-950 uppercase tracking-wider truncate">
                        Seller Control Panel
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate">
                        Manage visibility & item lifecycle
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to="/messages"
                      onClick={onClose}
                      className="inline-flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold py-1.5 px-2.5 rounded-md border border-brand-200 transition-colors shadow-2xs"
                      title="Open Campus Messenger"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                      <span>Inquiries</span>
                    </Link>

                    {listing.status !== 'SOLD' && (
                      <Link
                        to={`/edit-listing/${listing.id}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-brand-600 text-xs font-semibold py-1.5 px-2.5 rounded-md border border-gray-200 transition-colors shadow-2xs"
                        title="Edit listing details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={onDeleteClick}
                      className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold py-1.5 px-2.5 rounded-md border border-red-200 transition-colors shadow-2xs cursor-pointer"
                      title="Delete listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Quick Listing Info Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50/80 border border-gray-100 rounded-md text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span className="truncate font-medium text-gray-700">{listing.location || 'Campus'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-gray-900">
                      {listing.transaction_type === 'DONATE' ? 'Free' : `Rs ${listing.price}`}
                    </span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-gray-500 text-[11px] flex items-center gap-1">
                      <Eye className="w-3 h-3 text-gray-400" />
                      {listing.views_count} views
                    </span>
                  </div>
                </div>

                {/* Status Switcher Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      {listing.status === 'SOLD' && <Lock className="w-3 h-3 text-gray-400" />}
                      Listing Status:
                    </span>
                    <span
                      className={`font-extrabold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md border ${
                        listing.status === 'SOLD'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-brand-50 text-brand-600 border-brand-200/80'
                      }`}
                    >
                      {listing.status === 'PENDING' ? 'Reserved' : listing.status}
                    </span>
                  </div>

                  {listing.status === 'SOLD' ? (
                    /* Static / Display-only when Sold */
                    <div className="space-y-1">
                      <div className="grid grid-cols-4 gap-1.5 bg-gray-50/90 p-1.5 rounded-md border border-gray-200/80 select-none cursor-default">
                        {['ACTIVE', 'PENDING', 'SOLD', 'HIDDEN'].map((st) => (
                          <div
                            key={st}
                            className={`py-1.5 text-xs font-bold rounded-md text-center select-none ${
                              st === 'SOLD'
                                ? 'bg-brand-500 text-white shadow-xs'
                                : 'text-gray-300 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            {st === 'PENDING' ? 'Reserved' : st.charAt(0) + st.slice(1).toLowerCase()}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 text-center font-medium">
                        Item handed over & marked as Sold. Status is locked.
                      </p>
                    </div>
                  ) : (
                    /* Interactive status buttons */
                    <div className="grid grid-cols-4 gap-1.5 bg-gray-50/90 p-1.5 rounded-md border border-gray-200/80">
                      {['ACTIVE', 'PENDING', 'SOLD', 'HIDDEN'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={statusUpdating}
                          onClick={() => onStatusChange(st)}
                          className={`py-1.5 text-xs font-bold rounded-md transition-all text-center cursor-pointer ${
                            listing.status === st
                              ? 'bg-brand-500 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                          }`}
                        >
                          {st === 'PENDING' ? 'Reserved' : st.charAt(0) + st.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. PURCHASE REQUESTS */}
            {activeTab === 'requests' && (
              <div
                id="seller-offers-panel"
                className="bg-white border border-brand-200/90 rounded-md p-4 sm:p-5 shadow-xs flex flex-col space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-orange-50 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 truncate">
                        Purchase Requests
                        <span className="bg-brand-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                          {listingOffers.length}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate">
                        {listingOffers.length > 0
                          ? 'Accept a student to reserve this item'
                          : 'Incoming buyer offers appear here'}
                      </p>
                    </div>
                  </div>

                  {pendingOffersCount > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0 animate-pulse">
                      Action Needed
                    </span>
                  )}
                </div>

                {/* List of Offers or Empty Placeholder */}
                {listingOffers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-gray-50/70 rounded-md border border-dashed border-gray-200">
                    <ShoppingBag className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-xs font-semibold text-gray-600">No purchase requests yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs px-2">
                      When students send buy offers or swap proposals, they will show up here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedOffers.map((off) => (
                      <div
                        key={off.id}
                        className="p-3 bg-gray-50/90 rounded-md border border-gray-200/90 text-xs space-y-1.5 hover:border-brand-200 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <strong className="text-gray-900 truncate">
                              {off.buyer_name || off.buyer_reg}
                            </strong>
                            <span className="text-gray-400 text-[11px]">(@{off.buyer_reg})</span>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                              Trust {off.buyer_trust_score ?? 0}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                              off.status === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : off.status === 'REJECTED' || off.status === 'CANCELLED'
                                  ? 'bg-gray-200 text-gray-700'
                                  : off.status === 'COUNTERED'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {off.status === 'ACCEPTED' ? 'Reserved' : off.status}
                          </span>
                        </div>

                        {off.is_exchange_offer && off.exchange_item_title && (
                          <div className="bg-indigo-50 border border-indigo-200/80 rounded-md p-2 flex items-center gap-1.5 text-[11px] text-indigo-900 font-bold">
                            <Repeat className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Swap with: {off.exchange_item_title}</span>
                            {Number(off.offer_amount) > 0 && (
                              <span className="text-indigo-600 font-medium">(+{off.offer_amount} Rs)</span>
                            )}
                          </div>
                        )}

                        {off.buyer_message && (
                          <p className="text-gray-600 italic text-[11px] bg-white/70 p-2 rounded border border-gray-100">
                            &ldquo;{off.buyer_message}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200/60 text-[11px]">
                          <span className="text-gray-400">
                            {new Date(off.created_at).toLocaleDateString()}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {off.status === 'PENDING' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onRespondOffer(off.id, 'ACCEPT')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Accept</span>
                                </button>
                                {listing.is_negotiable && listing.transaction_type !== 'DONATE' && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCounterModal(off)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                    title="Propose a counter price"
                                  >
                                    Counter
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onRespondOffer(off.id, 'REJECT')}
                                  className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md text-xs transition-colors cursor-pointer"
                                >
                                  Decline
                                </button>
                              </>
                            ) : off.status === 'COUNTERED' ? (
                              <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Countered: Rs {off.counter_amount}
                              </span>
                            ) : off.status === 'ACCEPTED' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenQRModal(off)}
                                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <QrCode className="w-3 h-3" />
                                  <span>Show QR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCancelDeal(off.id)}
                                  disabled={cancellingDeal}
                                  className="bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold px-2 py-1 rounded-md text-xs transition-colors cursor-pointer disabled:opacity-50"
                                  title="Cancel this deal"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : off.status === 'COMPLETED' ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Sold & Handed Over</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3 flex-shrink-0">
            <span className="text-xs text-gray-500 font-medium">
              {listingOffers.length} {listingOffers.length === 1 ? 'request' : 'requests'} • Status:{' '}
              <span className="font-bold text-gray-800">{listing.status}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
}
