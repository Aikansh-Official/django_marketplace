import React from 'react';
import { AlertCircle, Camera, Check, CheckCircle2, Eye, ShoppingBag, Tag } from 'lucide-react';

export default function StatusBanners({
  listing,
  userOffer,
  isBuyer = false,
  isOwner = false,
  completedOffer = null,
  listingOffers = [],
  onOpenSellerDrawer,
  respondingToCounter = false,
  cancellingDeal = false,
  onBuyerCounterRespond,
  onOpenScannerModal,
  onCancelDeal
}) {
  if (!listing) return null;

  const totalRequestsCount = (listingOffers && listingOffers.length > 0)
    ? listingOffers.length
    : (listing.total_offers_count || listing.offers_count || 0);

  const viewsCount = listing.views_count || 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Buyer Counter-Offer Alert Banner */}
      {userOffer?.status === 'COUNTERED' && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                Seller Proposed a Counter-Offer of Rs {userOffer.counter_amount}
              </h4>
              {userOffer.seller_note && (
                <p className="text-xs text-amber-800 mt-1 italic">&ldquo;{userOffer.seller_note}&rdquo;</p>
              )}
              <p className="text-[11px] text-amber-700 mt-1">
                Accept this counter-price to immediately reserve the listing for campus handover.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onBuyerCounterRespond('ACCEPT')}
              disabled={respondingToCounter}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-md shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Accept Rs {userOffer.counter_amount}</span>
            </button>
            <button
              type="button"
              onClick={() => onBuyerCounterRespond('REJECT')}
              disabled={respondingToCounter}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs px-3.5 py-2.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Global Status Banner for Buyers (When Listing is Reserved / Pending Handover) */}
      {listing.status === 'PENDING' && (
        userOffer?.status === 'ACCEPTED' ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-950">
                  Your Purchase Request Was Accepted!
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Meet the seller on campus to inspect the item, make payment (UPI/Cash), and scan their Handover QR code or enter their 6-digit PIN.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenScannerModal}
                className="flex-1 sm:flex-none bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-md shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Complete Handover / Scan QR</span>
              </button>
              <button
                type="button"
                onClick={() => onCancelDeal(userOffer.id)}
                disabled={cancellingDeal}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs px-3.5 py-2.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel Deal
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded-md p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">Deal In Progress (Reserved)</h4>
              <p className="text-xs text-amber-800 mt-1">
                This item is currently reserved for a student peer. If the deal falls through, the seller will reactivate it.
              </p>
            </div>
          </div>
        )
      )}

      {/* Item Sold / Bought Banner */}
      {listing.status === 'SOLD' && (
        isBuyer ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-emerald-950">Item Bought</h4>
              <p className="text-xs text-emerald-800 mt-1">
                You have successfully bought this item. Handover completed & verified on campus.
              </p>
            </div>
          </div>
        ) : isOwner ? (
          /* FOR SELLER: Celebratory Deal Sold & Analytics Banner */
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-300 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                    Item Successfully Sold & Delivered!
                  </h4>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Handover Complete
                  </span>
                </div>

                {completedOffer ? (
                  <p className="text-xs text-emerald-950 mt-1 font-medium">
                    Sold to <strong className="font-extrabold text-gray-900">{completedOffer.buyer_name || completedOffer.buyer_reg}</strong>{' '}
                    <span className="text-gray-500 font-semibold">(@{completedOffer.buyer_reg})</span>
                    {completedOffer.buyer_trust_score !== undefined && (
                      <span className="ml-1.5 inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                        Trust {completedOffer.buyer_trust_score}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-950 mt-1 font-medium">
                    This item was verified and marked as sold on campus.
                  </p>
                )}

                {/* Stat pills row */}
                <div className="flex items-center gap-2 text-xs text-gray-700 mt-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-emerald-200 font-bold shadow-2xs">
                    <Eye className="w-3.5 h-3.5 text-brand-500" />
                    <span>{viewsCount} {viewsCount === 1 ? 'View' : 'Views'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-emerald-200 font-bold shadow-2xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-brand-500" />
                    <span>{totalRequestsCount} {totalRequestsCount === 1 ? 'Buyer Request' : 'Buyer Requests'}</span>
                  </span>
                  {completedOffer && (
                    <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-emerald-200 font-bold text-emerald-800 shadow-2xs">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {listing.transaction_type === 'DONATE'
                          ? 'Free (Donation)'
                          : completedOffer.is_exchange_offer
                            ? `Swap: ${completedOffer.exchange_item_title || 'Item'}`
                            : `Rs ${completedOffer.counter_amount || completedOffer.offer_amount || completedOffer.amount || listing.price}`}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {onOpenSellerDrawer && (
              <button
                type="button"
                onClick={onOpenSellerDrawer}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
              >
                <span>View Sold Details</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-red-950">Item Sold Out</h4>
              <p className="text-xs text-red-800 mt-1">
                This item has already been purchased/traded and is no longer available.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2">
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200">
                  <Eye className="w-3 h-3 text-gray-400" />
                  {viewsCount} views
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200">
                  <ShoppingBag className="w-3 h-3 text-gray-400" />
                  {totalRequestsCount} requests
                </span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
