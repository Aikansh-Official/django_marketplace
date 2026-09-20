import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  Lock,
  MapPin,
  QrCode,
  Repeat,
  ShoppingBag,
  Tag,
  Trash2,
  MessageSquare
} from 'lucide-react';

export default function SellerControlPanel({
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
  if (!listing) return null;

  // Sort offers: PENDING first, then COUNTERED, then ACCEPTED, then COMPLETED/REJECTED
  const sortedOffers = useMemo(() => {
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
  }, [listingOffers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 items-start">
      {/* Left Column: Seller Control Panel */}
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
              className="inline-flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold py-1.5 px-2.5 rounded-md border border-brand-200 transition-colors shadow-2xs"
              title="Open Campus Messenger"
            >
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>Inquiries</span>
            </Link>

            {listing.status !== 'SOLD' && (
              <Link
                to={`/edit-listing/${listing.id}`}
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

      {/* Right Column: Incoming Student Purchase Requests */}
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

          {listingOffers.some((o) => o.status === 'PENDING') && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0 animate-pulse">
              Action Needed
            </span>
          )}
        </div>

        {/* List of Offers or Empty Placeholder */}
        {listingOffers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 text-center bg-gray-50/70 rounded-md border border-dashed border-gray-200">
            <ShoppingBag className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-600">No purchase requests yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs px-2">
              When students send buy offers or swap proposals, they will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[385px] sm:max-h-[400px] overflow-y-auto pr-1.5 overscroll-contain scroll-smooth">
            {sortedOffers.map((off) => (
              <div
                key={off.id}
                className="p-2.5 sm:p-3 bg-gray-50/90 rounded-md border border-gray-200/90 text-xs space-y-1.5 hover:border-brand-200 transition-colors"
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
                  <p className="text-gray-600 italic text-[11px] truncate">
                    &ldquo;{off.buyer_message}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200/60 text-[11px]">
                  <span className="text-gray-400">
                    {new Date(off.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
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

        {sortedOffers.length > 4 && (
          <div className="pt-2 text-center text-[11px] font-semibold text-gray-400 border-t border-gray-100 flex items-center justify-center gap-1.5 shrink-0">
            <span>Showing 4 requests • Scroll down to view all ({sortedOffers.length})</span>
          </div>
        )}
      </div>
    </div>
  );
}
