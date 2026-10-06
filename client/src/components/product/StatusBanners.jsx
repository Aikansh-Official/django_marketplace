import React from 'react';
import { AlertCircle, Camera, Check, CheckCircle2 } from 'lucide-react';

export default function StatusBanners({
  listing,
  userOffer,
  isBuyer = false,
  respondingToCounter = false,
  cancellingDeal = false,
  onBuyerCounterRespond,
  onOpenScannerModal,
  onCancelDeal
}) {
  if (!listing) return null;

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
            </div>
          </div>
        )
      )}
    </div>
  );
}
