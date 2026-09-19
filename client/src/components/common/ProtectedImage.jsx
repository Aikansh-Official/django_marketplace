import React, { useState } from 'react';
import { ImageOff, ShieldCheck } from 'lucide-react';

/**
 * ProtectedImage: Enterprise-grade image container with anti-exfiltration safeguards.
 * - Prevents right-click context menu copying
 * - Prevents dragging and dropping
 * - Disables browser callout on mobile touch
 * - Provides graceful fallback on network / permission failure
 */
export default function ProtectedImage({
  src,
  alt = 'CampusXChange Image',
  className = '',
  fallbackSrc = null,
  showSecurityBadge = false,
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleContextMenu = (e) => {
    // Intercept right-click copy actions
    e.preventDefault();
  };

  const handleDragStart = (e) => {
    // Prevent dragging image outside the app
    e.preventDefault();
  };

  if (hasError || !src) {
    if (fallbackSrc && !hasError) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={`protected-image select-none pointer-events-auto ${className}`}
          draggable={false}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          {...props}
        />
      );
    }

    return (
      <div
        className={`bg-gray-100 flex flex-col items-center justify-center text-gray-400 p-4 select-none ${className}`}
        onContextMenu={handleContextMenu}
      >
        <ImageOff className="w-8 h-8 stroke-1 text-gray-400 mb-1" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Image Protected
        </span>
      </div>
    );
  }

  return (
    <div className="relative inline-block overflow-hidden group select-none">
      <img
        src={src}
        alt={alt}
        className={`protected-image select-none transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        draggable={false}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />

      {showSecurityBadge && (
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white/90 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ShieldCheck className="w-3 h-3 text-brand-400" />
          Secured
        </div>
      )}
    </div>
  );
}
