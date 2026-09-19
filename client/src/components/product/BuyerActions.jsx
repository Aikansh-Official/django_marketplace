import React from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Clock,
  Edit3,
  Lock,
  QrCode,
  Repeat,
  Send,
  ShieldCheck,
  ShoppingBag,
  Tag,
  UserCheck
} from 'lucide-react';

export default function BuyerActions({
  listing,
  isOwner = false,
  isAuthenticated = false,
  userOffer = null,
  listingOffers = [],
  cancellingDeal = false,
  onTriggerLogin,
  onOpenBuyModal,
  onOpenExchangeModal,
  onOpenChat,
  onOpenScannerModal,
  onOpenQRModal,
  onCancelDeal
}) {
  if (!listing) return null;

  if (listing.status === 'ACTIVE') {
    return (
      <div className="space-y-3 pt-2">
        {!isAuthenticated ? (
          <div className="bg-gradient-to-br from-brand-50/50 via-white to-orange-50/40 border border-brand-200/80 rounded-md p-5 text-center shadow-xs space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">
                Log in to Buy or Contact Seller
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-1">
                To protect campus safety and student privacy, login is required to make purchase requests or chat with the seller.
              </p>
            </div>
            <button
              type="button"
              onClick={onTriggerLogin}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Log In / Sign Up to Continue</span>
            </button>
          </div>
        ) : isOwner ? (
          /* Clean Seller Status & Management Box */
          <div className="bg-gradient-to-br from-brand-50/60 via-white to-orange-50/30 border border-brand-200/80 rounded-md p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Live on Campus
                  </span>
                </div>
                <h4 className="text-sm font-black text-gray-900 truncate">
                  Your Active Listing
                </h4>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              You are the seller of this item. Buyers will contact you safely via campus in-app chat and make purchase offers.
            </p>

            <div className="space-y-2 pt-1">
              <Link
                to={`/edit-listing/${listing.id}`}
                className="w-full bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-800 font-bold py-2.5 px-4 rounded-md transition-all text-xs flex items-center justify-center gap-2 shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                <span>Edit Listing Details</span>
              </Link>

              {listingOffers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('seller-offers-panel');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-md transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>View Buyer Requests ({listingOffers.length})</span>
                </button>
              ) : (
                <div className="bg-white/90 border border-dashed border-gray-200 rounded-md py-2 px-3 text-center text-[11px] text-gray-400">
                  No buyer requests yet • Keep checking
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Buyer Actions */
          <div className="space-y-3">
            {userOffer?.status === 'PENDING' ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-md text-xs font-bold text-center flex items-center justify-center gap-2 shadow-2xs">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Purchase Request Pending Seller Approval</span>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onOpenBuyModal}
                  className={`w-full text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer ${listing.transaction_type === 'EXCHANGE'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : listing.transaction_type === 'DONATE'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-brand-500 hover:bg-brand-600'
                    }`}
                >
                  {listing.transaction_type === 'EXCHANGE' ? (
                    <>
                      <Repeat className="w-4 h-4" />
                      <span>Propose Item Exchange (Swap)</span>
                    </>
                  ) : listing.transaction_type === 'DONATE' ? (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Request Free Donation</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>I Want to Buy This (Rs {listing.price})</span>
                    </>
                  )}
                </button>

                {/* Dual option: Also show Propose Exchange if seller is open to it */}
                {listing.transaction_type === 'SELL' && listing.is_exchange_allowed && (
                  <button
                    type="button"
                    onClick={onOpenExchangeModal}
                    className="w-full bg-white border border-indigo-500 text-indigo-600 hover:bg-indigo-50/70 font-bold py-2.5 px-4 rounded-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Repeat className="w-4 h-4" />
                    <span>Or Propose an Item Exchange</span>
                  </button>
                )}
              </div>
            )}

            {/* In-App Direct Message */}
            <button
              type="button"
              onClick={onOpenChat}
              className="w-full bg-white hover:bg-brand-50 border border-brand-400 text-brand-700 active:scale-[0.99] font-bold py-3 px-4 rounded-md transition-all shadow-xs text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 text-brand-600" />
              <span>Send In-App Message</span>
            </button>

            {/* Privacy Reassurance Badge */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-md py-2 px-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-800 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Safe Campus Deal • Private In-App Messaging Only</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (listing.status === 'PENDING') {
    return (
      <div className="space-y-3 pt-2">
        {!isAuthenticated ? (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-md text-xs font-bold text-center space-y-2">
            <div>Campus Deal In Progress</div>
            <p className="font-normal text-[11px] text-amber-800">
              This item is currently reserved. Log in to view transaction details.
            </p>
            <button
              type="button"
              onClick={onTriggerLogin}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-3 rounded-md text-xs cursor-pointer"
            >
              Log In to View
            </button>
          </div>
        ) : isOwner ? (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-md text-xs font-bold text-center space-y-2.5">
            <div>Campus Deal In Progress</div>
            <p className="font-normal text-[11px] text-amber-800">
              When meeting the buyer for physical handover, click below to show your QR code and 6-digit PIN.
            </p>
            {listingOffers.find((o) => o.status === 'ACCEPTED') && (
              <button
                type="button"
                onClick={() => {
                  const acceptedOffer = listingOffers.find((o) => o.status === 'ACCEPTED');
                  if (acceptedOffer) onOpenQRModal(acceptedOffer);
                }}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Generate Handover QR & PIN</span>
              </button>
            )}
          </div>
        ) : userOffer?.status === 'ACCEPTED' ? (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-md text-xs font-bold text-center space-y-2.5">
            <div>Deal Reserved for You!</div>
            <div className="font-normal text-[11px] text-emerald-800">
              Meet the seller on campus, inspect the item, and scan their QR or enter their 6-digit PIN.
            </div>
            <button
              type="button"
              onClick={onOpenScannerModal}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Complete Handover / Scan QR</span>
            </button>
            <button
              type="button"
              onClick={() => onCancelDeal(userOffer.id)}
              disabled={cancellingDeal}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3 rounded-md text-[11px] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel Deal
            </button>
          </div>
        ) : (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 p-3.5 rounded-md text-xs font-bold text-center">
            Item Currently Reserved for Another Buyer
          </div>
        )}

        {/* In-app contact for winning buyer */}
        {userOffer?.status === 'ACCEPTED' && (
          <button
            type="button"
            onClick={onOpenChat}
            className="w-full bg-white hover:bg-brand-50 border border-brand-300 text-brand-700 font-semibold py-2 px-4 rounded-md transition-all shadow-2xs text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-brand-600" />
            <span>Chat with Seller In-App</span>
          </button>
        )}
      </div>
    );
  }

  if (listing.status === 'SOLD') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-center py-4 px-3 rounded-md text-xs font-extrabold uppercase mt-2 space-y-1">
        <div>Item Sold</div>
        <p className="text-[10px] font-normal text-red-600 lowercase first-letter:uppercase">
          Handover completed & verified on campus.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 border border-gray-200 text-gray-500 text-center py-3 rounded-md text-xs font-bold uppercase mt-2">
      Listing is {listing.status}
    </div>
  );
}
