import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Heart,
  Package,
  MapPin,
  ExternalLink,
  Trash2,
  ArrowRight,
  Eye,
  MessageSquare
} from 'lucide-react';
import { getSavedItems, removeSavedItem } from '../../utils/savedStore';

export default function SavedItemsTab({ onSavedCountChange }) {
  const [savedItems, setSavedItems] = useState(getSavedItems());

  useEffect(() => {
    const handleSavedUpdated = () => {
      const items = getSavedItems();
      setSavedItems(items);
      if (onSavedCountChange) onSavedCountChange(items.length);
    };

    window.addEventListener('saved-items-updated', handleSavedUpdated);
    return () => window.removeEventListener('saved-items-updated', handleSavedUpdated);
  }, [onSavedCountChange]);

  const handleRemove = (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = removeSavedItem(id);
    setSavedItems(updated);
    if (onSavedCountChange) onSavedCountChange(updated.length);
    toast.success(`Removed "${title.substring(0, 20)}..." from saved items.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Saved Items & Wishlist
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Items you have bookmarked across the marketplace for later.
          </p>
        </div>

        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-full">
          {savedItems.length} Saved
        </span>
      </div>

      {savedItems.length === 0 ? (
        <div className="bg-white border border-gray-200/90 rounded-md p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Your wishlist is empty</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-5 leading-relaxed">
            Whenever you find a book, study notes, or campus essentials you like, tap the heart icon to save it here.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-md text-xs transition-colors shadow-sm hover:shadow-md"
          >
            Explore Marketplace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedItems.map((item) => {
            const cover = item.images?.find((img) => img.is_primary)?.image_url
              || item.images?.[0]?.image_url
              || null;

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200/90 rounded-md overflow-hidden shadow-sm hover:shadow-md hover:border-brand-200 transition-all flex flex-col group"
              >
                {/* Thumbnail & Remove Button */}
                <div className="relative h-44 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {cover ? (
                    <img
                      src={cover}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <Package className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[10px] uppercase font-semibold">No Image</span>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(e, item.id, item.title)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-rose-500 shadow-sm flex items-center justify-center transition-transform hover:scale-110"
                    title="Remove from saved"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </button>

                  {/* Mode Badge */}
                  {item.transaction_type === 'DONATE' && (
                    <span className="absolute bottom-2.5 left-2.5 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      FREE
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base font-extrabold text-gray-900">
                      {item.transaction_type === 'DONATE' ? 'Free' : `Rs ${item.price}`}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">
                      {item.category?.name || 'Item'}
                    </span>
                  </div>

                  <Link
                    to={`/listing/${item.id}`}
                    className="font-bold text-xs text-gray-800 hover:text-brand-600 line-clamp-2 mb-2 transition-colors"
                  >
                    {item.title}
                  </Link>

                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1 truncate max-w-[65%]">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>

                    <Link
                      to={`/listing/${item.id}`}
                      className="text-brand-600 font-bold hover:underline flex items-center gap-0.5 text-xs"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
