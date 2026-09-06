import React, { useState, useEffect } from 'react';
import UniversalLoader from './UniversalLoader';

/**
 * BufferingView
 * A smart wrapper that renders the UniversalLoader while the UI is updating or fetching data.
 * Once the update finishes, it smoothly reveals the updated UI with a soft fade-and-lift animation.
 * 
 * Usage:
 * <BufferingView loading={loading} text="Buffering marketplace...">
 *    <YourActualContent />
 * </BufferingView>
 */
export default function BufferingView({
  loading = false,
  text,
  subtext,
  size = 'md',
  fullScreen = false,
  fallback = null,
  className = '',
  contentClassName = '',
  children
}) {
  const [shouldRenderLoader, setShouldRenderLoader] = useState(loading);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (loading) {
      setShouldRenderLoader(true);
      setIsFadingOut(false);
    } else {
      // Smooth fade-out before unmounting loader
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRenderLoader(false);
        setIsFadingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <div className={`relative ${className}`}>
      {/* Active Buffering Overlay / Placeholder */}
      {shouldRenderLoader && (
        <div
          className={`transition-opacity duration-200 ${
            isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {fallback || (
            <UniversalLoader
              fullScreen={fullScreen}
              text={text}
              subtext={subtext}
              size={size}
            />
          )}
        </div>
      )}

      {/* Actual UI Content - Reveals seamlessly with animation */}
      {!shouldRenderLoader && (
        <div className={`animate-fade-in-up ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
