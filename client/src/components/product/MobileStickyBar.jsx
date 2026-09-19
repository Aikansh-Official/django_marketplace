import React from 'react';
import {
  Camera,
  Check,
  Clock,
  Lock,
  QrCode,
  Repeat,
  Send,
  ShoppingBag
} from 'lucide-react';

export default function MobileStickyBar({
  listing,
  isOwner = false,
  isAuthenticated = false,
  userOffer = null,
  listingOffers = [],
  respondingToCounter = false,
  onTriggerLogin,
  onOpenBuyModal,
  onOpenChat,
  onOpenScannerModal,
  onOpenQRModal,
  onBuyerCounterRespond
}) {
  if (!listing) return null;

  const displayPrice =
    listing.transaction_type === 'DONATE'
      ? 'Free'
      : listing.transaction_type === 'EXCHANGE'
        ? (Number(listing.price) > 0 ? `Rs ${listing.price}` : 'Item Swap')
        : `Rs ${listing.price}`;

  return (
    <div className="fixed md:hidden bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
      {/* Price / Status Column */}
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-bold text-gray-400">
          {userOffer?.status === 'COUNTERED' ? 'Counter-Offer' : 'Price'}
        </div>
        <div className="font-black text-base sm:text-lg text-gray-950 truncate">
          {userOffer?.status === 'COUNTERED'
            ? `Rs ${userOffer.counter_amount}`
            : displayPrice}
        </div>
      </div>

      {/* Action States */}
      {!isAuthenticated ? (
        <button
          type="button"
          onClick={onTriggerLogin}
          className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Log In to Buy</span>
        </button>
      ) : isOwner ? (
        <div className="flex items-center gap-2 shrink-0">
          {listing.status === 'PENDING' ? (
            (() => {
              const acceptedOffer = listingOffers.find((o) => o.status === 'ACCEPTED');
              return acceptedOffer ? (
                <button
                  type="button"
                  onClick={() => onOpenQRModal(acceptedOffer)}
                  className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show QR</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  Deal Reserved
                </span>
              );
            })()
          ) : listing.status === 'SOLD' ? (
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
              Sold Out
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('seller-offers-panel');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Offers ({listingOffers.length})</span>
            </button>
          )}
        </div>
      ) : userOffer?.status === 'COUNTERED' ? (
        /* Counter Offer Response Buttons */
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onBuyerCounterRespond('ACCEPT')}
            disabled={respondingToCounter}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept</span>
          </button>
          <button
            type="button"
            onClick={() => onBuyerCounterRespond('REJECT')}
            disabled={respondingToCounter}
            className="bg-white border border-gray-300 text-gray-700 font-bold py-2.5 px-2.5 rounded-xl text-xs hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : userOffer?.status === 'ACCEPTED' && listing.status === 'PENDING' ? (
        /* Accepted Deal Handover */
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenChat}
            className="bg-white border border-gray-300 hover:border-brand-500 text-gray-700 hover:text-brand-600 p-2.5 rounded-xl shadow-xs flex items-center justify-center cursor-pointer"
            title="Chat with Seller"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenScannerModal}
            className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Complete Handover</span>
          </button>
        </div>
      ) : listing.status === 'PENDING' ? (
        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
          Reserved for Peer
        </span>
      ) : listing.status === 'SOLD' ? (
        <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
          Item Sold
        </span>
      ) : (
        /* Active Listing Buyer CTA */
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenChat}
            className="bg-white border border-gray-300 hover:border-brand-500 text-gray-700 hover:text-brand-600 p-2.5 rounded-xl shadow-xs flex items-center justify-center cursor-pointer"
            title="Send In-App Message"
          >
            <Send className="w-4 h-4" />
          </button>

          {userOffer?.status === 'PENDING' ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Pending</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenBuyModal}
              className={`text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                listing.transaction_type === 'EXCHANGE'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : listing.transaction_type === 'DONATE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-brand-500 hover:bg-brand-600'
              }`}
            >
              {listing.transaction_type === 'EXCHANGE' ? (
                <>
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Swap</span>
                </>
              ) : listing.transaction_type === 'DONATE' ? (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Request Free</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Buy Now</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
