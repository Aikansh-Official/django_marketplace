import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Package,
  Repeat,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { getSafeImageUrl } from '../../utils/imageUrl';

export default function ImageGallery({
  images = [],
  listing,
  activeImageIndex = 0,
  setActiveImageIndex
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const rawCurrentImage = images[activeImageIndex]?.image_url || images[0]?.image_url || '';
  const currentImage = getSafeImageUrl(rawCurrentImage);

  // Lock body scroll and listen for keyboard navigation when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setLightboxZoom(1);
    }

    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, images.length, setActiveImageIndex]);

  return (
    <>
      {/* Hero Image Container on Product Page */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-xs">
        <div
          onClick={() => currentImage && setIsLightboxOpen(true)}
          className="relative h-64 sm:h-80 md:h-96 lg:h-[420px] w-full bg-gray-50 flex items-center justify-center group cursor-zoom-in select-none"
          title="Click to view full-screen image inspection"
        >
          {currentImage ? (
            <>
              <img
                src={currentImage}
                alt={listing?.title || 'Product Image'}
                className="max-h-full max-w-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.product-hero-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="product-hero-fallback hidden w-full h-full flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Package className="w-16 h-16 mb-3 opacity-30" />
                <span className="text-sm font-semibold uppercase tracking-wider opacity-50">
                  Image Protected or Unavailable
                </span>
              </div>

              {/* Floating Fullscreen Magnifier Badge */}
              <div className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-md">
                <Maximize2 className="w-4 h-4" />
                <span>Click for Full Screen View</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <Package className="w-16 h-16 mb-3 opacity-30" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-50">
                No Image Provided
              </span>
            </div>
          )}

          {/* Status Overlay if Sold or Reserved */}
          {listing?.status === 'SOLD' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-red-600 text-white font-extrabold text-lg sm:text-xl px-6 py-2 rounded-md tracking-wider shadow-lg border border-red-400 animate-pulse">
                ITEM SOLD
              </span>
            </div>
          )}
          {listing?.status === 'PENDING' && (
            <div className="absolute top-4 left-4 bg-amber-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow-md">
              RESERVED / DEAL IN PROGRESS
            </div>
          )}

          {/* Transaction Badge */}
          {listing?.transaction_type === 'DONATE' ? (
            <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              FREE DONATION
            </div>
          ) : listing?.transaction_type === 'EXCHANGE' ? (
            <div className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              <span>FOR EXCHANGE / SWAP</span>
            </div>
          ) : listing?.is_exchange_allowed ? (
            <div className="absolute top-4 left-4 bg-indigo-600/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              <span>SELL OR SWAP</span>
            </div>
          ) : null}

          {/* Gallery Arrow Controls (if multiple images) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-md transition-all opacity-80 hover:opacity-100 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-md transition-all opacity-80 hover:opacity-100 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center gap-2.5 overflow-x-auto bg-gray-50/50 scrollbar-thin">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all aspect-square bg-white cursor-pointer ${
                  activeImageIndex === idx
                    ? 'border-brand-500 ring-2 ring-brand-200 shadow-xs'
                    : 'border-gray-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={getSafeImageUrl(img.image_url)}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TRUE FULL-SCREEN LIGHTBOX INSPECTOR (Via Portal) */}
      {isLightboxOpen && currentImage && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-150"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Controls Bar */}
          <div
            className="flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <span className="text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
                {listing?.title}
              </span>
              <span className="bg-white/10 text-white/80 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {activeImageIndex + 1} / {images.length || 1}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/60 mr-2 hidden sm:inline">
                Zoom: {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.min(3, prev + 0.25))}
                className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.max(0.75, prev - 0.25))}
                className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-bold"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-md bg-white/20 hover:bg-red-600 text-white transition-colors ml-2 cursor-pointer"
                title="Close Full Screen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Giant Centered Image Viewport (Full Screen) */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden my-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                  }
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 text-white p-3 rounded-full transition-all cursor-pointer z-10"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 text-white p-3 rounded-full transition-all cursor-pointer z-10"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <img
              src={currentImage}
              alt={listing?.title || 'Inspect'}
              style={{
                transform: `scale(${lightboxZoom})`,
                transition: 'transform 0.15s ease-out'
              }}
              className="max-h-[82vh] max-w-[92vw] object-contain select-none cursor-grab active:cursor-grabbing shadow-2xl"
            />
          </div>

          {/* Bottom Thumbnails Strip */}
          {images.length > 1 && (
            <div
              className="flex items-center justify-center gap-2.5 overflow-x-auto py-2 shrink-0 scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setLightboxZoom(1);
                  }}
                  className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-brand-500 scale-110 shadow-lg ring-2 ring-brand-300'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getSafeImageUrl(img.image_url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
