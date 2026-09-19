import React from 'react';
import { Check, Eye, MapPin, Repeat } from 'lucide-react';
import BuyerActions from './BuyerActions';

export default function PriceCard({
  listing,
  isOwner,
  isAuthenticated,
  userOffer,
  listingOffers,
  cancellingDeal,
  onTriggerLogin,
  onOpenBuyModal,
  onOpenExchangeModal,
  onOpenChat,
  onOpenScannerModal,
  onOpenQRModal,
  onCancelDeal
}) {
  if (!listing) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Price
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5" />
            <span>{listing.views_count} views</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {listing.transaction_type === 'DONATE'
              ? 'Free (Donation)'
              : listing.transaction_type === 'EXCHANGE'
                ? (Number(listing.price) > 0 ? `Rs ${listing.price} (Est. Value)` : 'For Item Swap')
                : `Rs ${listing.price}`}
          </span>
        </div>

        {/* Badges for Negotiable & Exchange */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {listing.is_negotiable && listing.transaction_type === 'SELL' && (
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              <span>Price is negotiable</span>
            </div>
          )}
          {(listing.transaction_type === 'EXCHANGE' || listing.is_exchange_allowed) && (
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              <Repeat className="w-3 h-3" />
              <span>Open for Item Exchange</span>
            </div>
          )}
        </div>

        {/* What Seller Wants in Exchange Callout */}
        {(listing.transaction_type === 'EXCHANGE' || listing.is_exchange_allowed) && listing.exchange_preferences && (
          <div className="mt-3 p-3 rounded-md bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/90 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-950 uppercase tracking-wider">
              <Repeat className="w-3.5 h-3.5 text-indigo-600" />
              <span>Seller wants in exchange:</span>
            </div>
            <p className="text-xs font-bold text-indigo-900 pl-5">
              &ldquo;{listing.exchange_preferences}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-2">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
          {listing.title}
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span>{listing.location || 'Campus'}</span>
        </div>
      </div>

      {/* Embedded Buyer/Seller Actions */}
      <BuyerActions
        listing={listing}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        userOffer={userOffer}
        listingOffers={listingOffers}
        cancellingDeal={cancellingDeal}
        onTriggerLogin={onTriggerLogin}
        onOpenBuyModal={onOpenBuyModal}
        onOpenExchangeModal={onOpenExchangeModal}
        onOpenChat={onOpenChat}
        onOpenScannerModal={onOpenScannerModal}
        onOpenQRModal={onOpenQRModal}
        onCancelDeal={onCancelDeal}
      />
    </div>
  );
}
