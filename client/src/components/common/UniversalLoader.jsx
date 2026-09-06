import React from 'react';

/**
 * UniversalLoader
 * A clean, minimal, and fast buffering indicator for LPUTrade.
 * 
 * Props:
 * - fullScreen: boolean (renders centered in full-screen overlay)
 * - text: string (optional short label, e.g. "Loading...")
 * - size: 'sm' | 'md' | 'lg'
 * - className: string
 */
export default function UniversalLoader({
  fullScreen = false,
  text = 'Loading...',
  size = 'md',
  className = ''
}) {
  const sizeMap = {
    sm: {
      spinner: 'w-6 h-6 border-2',
      text: 'text-[11px]'
    },
    md: {
      spinner: 'w-8 h-8 border-2',
      text: 'text-xs'
    },
    lg: {
      spinner: 'w-10 h-10 border-2.5',
      text: 'text-xs sm:text-sm'
    }
  }[size] || {
    spinner: 'w-8 h-8 border-2',
    text: 'text-xs'
  };

  const cleanText = text ? text.replace(/\.+$/, '') + '...' : '';

  const content = (
    <div className="flex flex-col items-center justify-center gap-2.5 select-none text-center">
      {/* Clean, smooth single spinner */}
      <div
        className={`${sizeMap.spinner} border-brand-100 border-t-brand-500 rounded-full animate-spin`}
        style={{ animationDuration: '0.8s' }}
      />

      {/* Simple, unobtrusive status text */}
      {cleanText && (
        <p className={`${sizeMap.text} font-medium text-gray-500 tracking-wide`}>
          {cleanText}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-xs transition-opacity duration-200 ${className}`}
        role="status"
        aria-live="polite"
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={`w-full py-10 flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
}
