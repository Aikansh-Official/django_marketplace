import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tag, X, ShieldCheck } from 'lucide-react';

export default function CounterOfferModal({
  isOpen,
  onClose,
  listing,
  selectedOffer,
  counterAmount,
  setCounterAmount,
  sellerNote,
  setSellerNote,
  submittingCounter,
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

  if (!isOpen || !selectedOffer) return null;

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
          aria-label="Propose counter-offer drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header with Warm Gradient */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shadow-xs border border-amber-100 flex-shrink-0">
                <Tag className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 truncate">
                  Propose Counter-Offer
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  Negotiate price with {selectedOffer.buyer_name || selectedOffer.buyer_reg}
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
            {/* Offer Comparison Box */}
            <div className="bg-gray-50/90 p-4 rounded-md border border-gray-100 text-xs space-y-2.5">
              <div className="flex justify-between items-center text-gray-600">
                <span>Buyer's Initial Offer:</span>
                <strong className="text-gray-900 font-bold text-sm">Rs {selectedOffer.offer_amount || 0}</strong>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Original Listed Price:</span>
                <strong className="text-brand-600 font-black text-sm">Rs {listing?.price}</strong>
              </div>
              {selectedOffer.buyer_message && (
                <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500 italic">
                  Buyer note: &ldquo;{selectedOffer.buyer_message}&rdquo;
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Your Counter Price (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="e.g. 1500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Note for Buyer (Optional)
              </label>
              <textarea
                rows={3}
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                placeholder="e.g. Can do Rs 1500 including accessories and free notes."
              />
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-md p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                If the buyer accepts your counter-offer, this listing will be reserved automatically and ready for physical handover!
              </span>
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
                disabled={submittingCounter}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submittingCounter ? 'Sending...' : 'Send Counter'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>,
    document.body
  );
}
