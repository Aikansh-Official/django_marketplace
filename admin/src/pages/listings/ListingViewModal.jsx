import { X, MapPin, HeartHandshake, ShoppingBag, ShieldCheck, Maximize2 } from 'lucide-react';
import { useState } from 'react';

export default function ListingViewModal({
  listing,
  onClose,
  onOpenLightbox,
  onChangeStatus,
  onToggleTrusted,
  actionLoading,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!listing) return null;

  const images = listing.images || [];
  const currentImage = images[activeImageIndex]?.image || images[activeImageIndex] || listing.image;

  return (
    <div
      className="fixed inset-0 bg-ink-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 my-auto text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900 leading-snug">{listing.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  listing.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : listing.status === 'HIDDEN'
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {listing.status}
                </span>
                {listing.is_trusted && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    <ShieldCheck className="w-3 h-3 text-blue-600" /> Trusted
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                <span>Category: {listing.category?.name || 'General'}</span>
                <span>•</span>
                <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Gallery Section */}
            <div className="space-y-3">
              <div className="h-64 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center relative group">
                {currentImage ? (
                  <>
                    <img
                      src={currentImage}
                      alt={listing.title}
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onOpenLightbox(currentImage)}
                    />
                    <button
                      onClick={() => onOpenLightbox(currentImage)}
                      className="absolute bottom-2 right-2 p-1.5 bg-ink-900/70 text-white rounded-lg hover:bg-ink-900 transition-colors opacity-0 group-hover:opacity-100"
                      title="Fullscreen Zoom"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-gray-400 text-center">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No image uploaded</p>
                  </div>
                )}
              </div>

              {/* Thumbnails strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => {
                    const imgSrc = img.image || img;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 h-14 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                          activeImageIndex === idx ? 'border-brand-600 scale-95' : 'border-gray-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Price / Trade Type</span>
                <div className="flex items-baseline gap-2 mt-1">
                  {listing.transaction_type === 'DONATE' ? (
                    <span className="text-xl font-black text-emerald-600 flex items-center gap-1">
                      <HeartHandshake className="w-5 h-5" /> 100% Free Campus Donation
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-gray-900">₹{listing.price}</span>
                      {listing.is_negotiable && (
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                          Price Negotiable
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Item Description</span>
                <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {listing.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Condition</span>
                  <p className="font-bold text-gray-800 mt-1">{listing.condition || 'GOOD'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Meetup Location</span>
                  <p className="font-bold text-gray-800 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {listing.location || 'Campus Center'}
                  </p>
                </div>
              </div>

              {/* Seller Information Card */}
              <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-200 space-y-1.5">
                <span className="text-[10px] font-black text-brand-700 uppercase tracking-wider block">Campus Seller</span>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{listing.seller?.full_name || listing.seller?.username || 'Seller'}</p>
                    <p className="text-[11px] text-gray-500 font-mono">@{listing.seller?.username}</p>
                  </div>
                  {listing.seller?.trust_score !== undefined && (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                      ⭐ {listing.seller.trust_score}/100 Trust
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleTrusted(listing.id, listing.is_trusted)}
              disabled={actionLoading}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                listing.is_trusted
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {listing.is_trusted ? 'Remove Trusted Badge' : 'Mark as Trusted'}
            </button>

            <select
              value={listing.status}
              onChange={(e) => onChangeStatus(listing.id, e.target.value)}
              disabled={actionLoading}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ACTIVE">Set Status: ACTIVE</option>
              <option value="HIDDEN">Set Status: HIDDEN</option>
              <option value="SOLD">Set Status: SOLD</option>
              <option value="PENDING">Set Status: PENDING</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
