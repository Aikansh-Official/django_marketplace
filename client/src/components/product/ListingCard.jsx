import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Package, Repeat, Star, Clock } from 'lucide-react';
import { getSafeImageUrl } from '../../utils/imageUrl';
import cxcLogo from '../../assets/CampusXChange_Logo.webp';

export default function ListingCard({
  listing,
  isFavorite = false,
  onToggleFavorite,
  formatDate
}) {
  const [timeLeft, setTimeLeft] = useState(null);

  // Live ticking countdown timer for active deals
  useEffect(() => {
    if (!listing.sale_end_time) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const difference = new Date(listing.sale_end_time).getTime() - Date.now();
      if (difference <= 0) {
        return null;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      }
      const pad = (num) => String(num).padStart(2, '0');
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    setTimeLeft(calculateTimeRemaining());

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeLeft(remaining);
      if (!remaining) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [listing.sale_end_time]);

  const primaryImage =
    listing.images?.find((img) => img.is_primary)?.image_url ||
    listing.images?.[0]?.image_url;

  // Real price & discount calculation
  const hasDiscount = Boolean(
    listing.original_price &&
    Number(listing.original_price) > Number(listing.price) &&
    Number(listing.price) > 0
  );

  const discountPercent =
    listing.discount_percentage ||
    (hasDiscount
      ? Math.round(
          ((Number(listing.original_price) - Number(listing.price)) /
            Number(listing.original_price)) *
            100
        )
      : 0);

  const sellerAvatar =
    listing.seller?.profile_photo || listing.seller?.profile_picture_url;
  const sellerName =
    listing.seller?.full_name || listing.seller?.username || 'Campus Student';
  const trustScore = listing.seller?.trust_score ?? 100;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-xl hover:border-brand-200 transition-all duration-200 group flex flex-col shadow-xs relative"
    >
      {/* Image Container */}
      <div className="relative h-36 xs:h-44 sm:h-52 md:h-60 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
        {primaryImage ? (
          <img
            src={getSafeImageUrl(primaryImage)}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback placeholder */}
        <div
          className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 group-hover:bg-gray-200 transition-colors ${
            primaryImage ? 'hidden' : 'flex'
          }`}
        >
          <Package className="w-6 h-6 sm:w-8 sm:h-8 mb-1 opacity-50" />
          <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider opacity-60">
            No Image
          </span>
        </div>

        {/* Top Badges Bar: Left (Mode/Timer) & Right (Favorite) */}
        <div className="absolute top-1.5 inset-x-1.5 sm:top-2 sm:inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
          {/* Left: Mode / Active Deal Countdown Timer */}
          <div className="flex items-center gap-1 pointer-events-auto flex-wrap">
            {listing.transaction_type === 'DONATE' ? (
              <span className="bg-emerald-600 text-white text-[8px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                FREE
              </span>
            ) : listing.transaction_type === 'EXCHANGE' ? (
              <span className="bg-indigo-600 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-0.5 sm:gap-1">
                <Repeat className="w-2.5 h-2.5" />
                <span>SWAP</span>
              </span>
            ) : listing.is_exchange_allowed ? (
              <span className="bg-indigo-500/95 backdrop-blur-xs text-white text-[7px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" />
                <span className="hidden xs:inline">+SWAP</span>
              </span>
            ) : null}

            {/* Live Sale Countdown Badge */}
            {timeLeft && (
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span className="truncate max-w-[70px] sm:max-w-none">{timeLeft}</span>
              </span>
            )}
          </div>

          {/* Right: Favorite Button */}
          <div className="flex items-center gap-1 pointer-events-auto">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => onToggleFavorite(e, listing)}
                className={`p-1.5 sm:p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full shadow-xs transition-all cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-50 text-rose-500'
                    : 'bg-white/90 hover:bg-white text-gray-400 hover:text-rose-500'
                }`}
                title={isFavorite ? 'Remove from Saved' : 'Save Item'}
                aria-label={isFavorite ? 'Remove from Saved' : 'Save Item'}
              >
                <Heart
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill={isFavorite ? 'currentColor' : 'none'}
                />
              </button>
            )}
          </div>
        </div>

        {/* Condition Badge (Bottom-left) */}
        <div className="absolute bottom-1.5 left-1.5 sm:bottom-2.5 sm:left-2.5 bg-black/60 backdrop-blur-xs text-white text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded">
          {listing.condition ? listing.condition.replace('_', ' ') : 'GOOD'}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
        {/* Price, Discount & Trusted Sign Section */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1">
          <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap min-w-0">
            <h3 className="font-black text-sm xs:text-base sm:text-xl text-gray-900 tracking-tight">
              {listing.transaction_type === 'DONATE'
                ? 'Free'
                : listing.transaction_type === 'EXCHANGE'
                ? Number(listing.price) > 0
                  ? `₹${listing.price}`
                  : 'Swap'
                : `₹${listing.price}`}
            </h3>

            {/* Strikethrough Original Price & Discount Badge */}
            {hasDiscount && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] sm:text-xs text-gray-400 line-through font-semibold">
                  ₹{listing.original_price}
                </span>
                <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.2 rounded-full">
                  -{discountPercent}%
                </span>
              </div>
            )}
          </div>

          {/* CXC Trusted Sign */}
          {listing.is_trusted && (
            <div
              className="bg-blue-50/90 border border-blue-200 px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] font-black text-blue-900 shrink-0"
              title="Verified CampusXChange Trusted Listing"
            >
              <img
                src={cxcLogo}
                alt="CXC"
                className="h-2.5 sm:h-3 w-auto object-contain shrink-0"
              />
              <span className="tracking-wide hidden xs:inline">TRUSTED</span>
            </div>
          )}
        </div>

        {/* Listing Title */}
        <p
          className="text-gray-700 text-xs font-medium line-clamp-2 mb-2 sm:mb-3 group-hover:text-brand-600 transition-colors leading-snug"
          title={listing.title}
        >
          {listing.title}
        </p>

        {/* Card Footer: Seller Profile & Location */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex flex-col gap-1.5 sm:gap-2">
          {/* Seller Details Row */}
          <div className="flex items-center justify-between gap-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              {sellerAvatar ? (
                <img
                  src={getSafeImageUrl(sellerAvatar)}
                  alt={sellerName}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-gray-200 shrink-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[9px] sm:text-[10px] flex items-center justify-center border border-brand-200 shrink-0">
                  {sellerName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-[11px] sm:text-xs font-bold text-gray-800 truncate max-w-[80px] xs:max-w-[110px] sm:max-w-[140px]">
                {sellerName}
              </span>
            </div>

            {/* Trust Score Badge */}
            <span
              className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 shrink-0"
              title="Seller Campus Trust Score"
            >
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
              <span>{trustScore}</span>
            </span>
          </div>

          {/* Location & Date */}
          <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-gray-500 pt-0.5">
            <span className="flex items-center gap-0.5 sm:gap-1 truncate max-w-[65%]">
              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 text-gray-400" />
              <span className="truncate">{listing.location || 'Campus'}</span>
            </span>
            {formatDate && (
              <span className="font-bold text-[8px] sm:text-[9px] text-gray-400 uppercase whitespace-nowrap">
                {formatDate(listing.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
