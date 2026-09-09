import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, ExternalLink, Heart, ShoppingBag, MapPin, Tag } from 'lucide-react';
import { getSavedItems, removeSavedItem } from '../utils/savedStore';

export default function SavedItemsDrawer({ isOpen, onClose }) {
  const [items, setItems] = useState(() => getSavedItems());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleUpdate = (e) => {
      if (e.detail?.items) {
        setItems(e.detail.items);
      } else {
        setItems(getSavedItems());
      }
    };

    window.addEventListener('saved-items-updated', handleUpdate);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('saved-items-updated', handleUpdate);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside 
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-100"
          aria-label="Saved items drawer"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shadow-xs border border-brand-100">
                <Heart className="w-4 h-4 fill-brand-500 text-brand-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  Saved Wishlist
                  <span className="text-xs bg-brand-500 text-white font-semibold px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-500">Quick access to bookmarked campus deals</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-500 mb-4 shadow-inner">
                  <ShoppingBag className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">Your wishlist is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-6">
                  Tap the heart icon on any books, notes, or campus essentials to save them here for quick access later!
                </p>
                <button
                  onClick={onClose}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  Explore Marketplace
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {items.map((item) => {
                  const imageSrc = item.images?.[0]?.image_url || item.image || null;

                  return (
                    <div 
                      key={item.id}
                      className="group flex gap-3 p-3 bg-white hover:bg-orange-50/30 rounded-xl border border-gray-100 hover:border-orange-200 transition-all shadow-2xs relative"
                    >
                      {/* Image Thumbnail */}
                      <Link 
                        to={`/listing/${item.id}`} 
                        onClick={onClose}
                        className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative block"
                      >
                        {imageSrc ? (
                          <img 
                            src={imageSrc} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                            <Tag className="w-6 h-6" />
                          </div>
                        )}

                        {/* Transaction badge */}
                        <span className={`absolute bottom-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase text-white shadow-xs ${
                          item.transaction_type === 'DONATE' 
                            ? 'bg-emerald-600' 
                            : 'bg-brand-500'
                        }`}>
                          {item.transaction_type || 'SELL'}
                        </span>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <Link 
                            to={`/listing/${item.id}`} 
                            onClick={onClose}
                            className="text-xs font-bold text-gray-900 hover:text-brand-600 line-clamp-2 leading-snug mb-1"
                          >
                            {item.title}
                          </Link>

                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{item.location || 'LPU Campus'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-black text-gray-900">
                            {item.transaction_type === 'DONATE' ? (
                              <span className="text-emerald-600 font-bold">FREE</span>
                            ) : (
                              <>₹{item.price ? Number(item.price).toLocaleString('en-IN') : '0'}</>
                            )}
                          </span>

                          <div className="flex items-center gap-1">
                            <Link
                              to={`/listing/${item.id}`}
                              onClick={onClose}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-orange-50 rounded-md transition-colors"
                              title="View details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => removeSavedItem(item.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer actions */}
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 font-medium">
                {items.length} {items.length === 1 ? 'item' : 'items'} saved
              </span>
              <button
                onClick={onClose}
                className="text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors shadow-2xs"
              >
                Close Wishlist
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
