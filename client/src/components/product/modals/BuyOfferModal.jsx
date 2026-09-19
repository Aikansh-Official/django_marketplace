import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Repeat, ShoppingBag, X, MapPin } from 'lucide-react';

export default function BuyOfferModal({
  isOpen,
  onClose,
  listing,
  isExchangeProposal,
  exchangeItemTitle,
  setExchangeItemTitle,
  buyerMessage,
  setBuyerMessage,
  offerAmount,
  setOfferAmount,
  submittingBuyRequest,
  onSubmit
}) {
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

  if (!isOpen || !listing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (True Full-Height Viewport Slide-In) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex z-[10000] w-full sm:w-[480px]">
        <aside
          className="w-full h-full bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-200"
          aria-label="Purchase or exchange offer drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header with Warm Gradient */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shadow-xs border border-brand-100 flex-shrink-0">
                {isExchangeProposal ? (
                  <Repeat className="w-5 h-5 text-indigo-600" />
                ) : (
                  <ShoppingBag className="w-5 h-5 text-brand-500" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 truncate">
                  {isExchangeProposal ? 'Propose Item Exchange' : 'Purchase Request'}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  Send deal offer directly to campus seller
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable Form) */}
          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Target Item Card */}
            <div className="bg-gray-50/90 p-4 rounded-md border border-gray-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Target Item:</span>
                <strong className="text-gray-900 font-bold max-w-[220px] truncate">{listing.title}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Listed Price:</span>
                <strong className="text-brand-600 font-black text-sm">
                  {listing.transaction_type === 'DONATE' ? 'Free Donation' : `Rs ${listing.price}`}
                </strong>
              </div>
              {listing.exchange_preferences && (
                <div className="text-xs text-indigo-900 bg-indigo-50/80 p-2.5 rounded-md border border-indigo-100">
                  <span className="font-bold">Seller wants in return:</span> &ldquo;{listing.exchange_preferences}&rdquo;
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60 text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Campus Pickup:
                </span>
                <span className="font-semibold text-gray-800">{listing.location || 'Campus'}</span>
              </div>
            </div>

            {/* What item are you offering (if exchange proposal) */}
            {isExchangeProposal ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase mb-1">
                    What item are you offering to swap? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={exchangeItemTitle}
                    onChange={(e) => setExchangeItemTitle(e.target.value)}
                    placeholder="e.g. Casio FX-991EX Calculator or Atlas Bicycle"
                    className="w-full border border-indigo-300 rounded-md px-3 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                    <span>Cash Adjustment / Difference (Rs)</span>
                    <span className="text-[10px] text-gray-400 normal-case font-normal">Optional (0 if equal trade)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="e.g. 200 (if you'll pay extra) or 0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Custom Proposed Price for Negotiable Items */
              listing.is_negotiable && listing.transaction_type !== 'DONATE' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                    <span>Your Proposed Price (Rs)</span>
                    <span className="text-[11px] text-brand-600 font-semibold lowercase first-letter:uppercase">Item is negotiable</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder={`Direct price: ${listing.price}`}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              )
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Message for Seller (Optional)
              </label>
              <textarea
                rows={3}
                value={buyerMessage}
                onChange={(e) => setBuyerMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                placeholder="e.g. Can meet at Uni-Mall at 5 PM today to inspect items."
              />
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-md p-3 text-[11px] text-amber-900">
              💡 <strong>Campus Tip:</strong> Submitting a request notifies the seller directly. Once accepted, you can inspect the item physically on campus before payment.
            </div>

            {/* Action Footer */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-md font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingBuyRequest}
                className={`flex-1 text-white py-3 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                  isExchangeProposal
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-brand-500 hover:bg-brand-600'
                }`}
              >
                {submittingBuyRequest ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : isExchangeProposal ? (
                  <Repeat className="w-3.5 h-3.5" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5" />
                )}
                <span>{isExchangeProposal ? 'Send Swap Proposal' : 'Send Request'}</span>
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>,
    document.body
  );
}
