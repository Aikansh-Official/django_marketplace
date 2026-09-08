import React, { memo } from 'react';

/**
 * ThemeBackground
 * Auto-animated geometric background for LPXchange Admin Portal.
 * Features continuous organic floating solid orange cubes, soft-shadowed white cubes,
 * fine-stroke hollow square outlines, and asynchronous pulsing dots.
 * Pure GPU-accelerated CSS animations with zero CPU overhead.
 */
function ThemeBackground() {
  return (
    <aside
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-[#f9fafb]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 12% 14%, rgba(251, 86, 7, 0.06) 0%, transparent 42%),
          radial-gradient(circle at 88% 85%, rgba(251, 86, 7, 0.06) 0%, transparent 42%),
          radial-gradient(circle at 50% 50%, #ffffff 0%, #f8f9fa 100%)
        `,
      }}
    >
      {/* ===================================================================
          1. Solid Orange Floating Squares
          =================================================================== */}
      {/* Top-Left Main Solid Square */}
      <div className="absolute top-[10%] left-[5%] animate-geo-float-slow" style={{ animationDelay: '0s' }}>
        <div className="w-32 h-32 bg-brand-500 rounded-md rotate-12 shadow-xl opacity-80" />
      </div>

      {/* Top-Right Solid Square */}
      <div className="absolute top-[20%] right-[10%] animate-geo-float-drift" style={{ animationDelay: '1.2s' }}>
        <div className="w-24 h-24 bg-brand-400 rounded-md rotate-45 shadow-lg opacity-60" />
      </div>

      {/* Bottom-Left Solid Square */}
      <div className="absolute bottom-[15%] left-[15%] animate-geo-float-reverse" style={{ animationDelay: '2.5s' }}>
        <div className="w-40 h-40 bg-brand-600 rounded-md -rotate-12 shadow-2xl opacity-90" />
      </div>

      {/* Bottom-Right Large Solid Square */}
      <div className="absolute bottom-[25%] right-[5%] animate-geo-float-slow" style={{ animationDelay: '1.8s' }}>
        <div className="w-48 h-48 bg-brand-500 rounded-md rotate-12 shadow-xl opacity-70" />
      </div>

      {/* Mid-Center Small Solid Square */}
      <div className="absolute top-[40%] left-[45%] animate-geo-breathe" style={{ animationDelay: '0.6s' }}>
        <div className="w-16 h-16 bg-brand-300 rounded-md rotate-45 shadow-sm opacity-40" />
      </div>

      {/* Lower-Mid Right Solid Square */}
      <div className="absolute top-[70%] right-[40%] animate-geo-float-drift" style={{ animationDelay: '3s' }}>
        <div className="w-12 h-12 bg-brand-400 rounded-md -rotate-12 shadow-sm opacity-50" />
      </div>

      {/* ===================================================================
          2. White Floating Squares with Soft Borders & Shadows
          =================================================================== */}
      {/* Top-Left White Square */}
      <div className="absolute top-[15%] left-[20%] animate-geo-float-reverse" style={{ animationDelay: '1s' }}>
        <div className="w-20 h-20 bg-white rounded-md -rotate-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100" />
      </div>

      {/* Bottom-Right White Square */}
      <div className="absolute bottom-[20%] right-[25%] animate-geo-float-slow" style={{ animationDelay: '2.2s' }}>
        <div className="w-28 h-28 bg-white rounded-md rotate-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100" />
      </div>

      {/* Mid-Left White Square */}
      <div className="absolute top-[60%] left-[8%] animate-geo-breathe" style={{ animationDelay: '0.5s' }}>
        <div className="w-16 h-16 bg-white rounded-md rotate-45 shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100" />
      </div>

      {/* Top-Right White Square */}
      <div className="absolute top-[5%] right-[30%] animate-geo-float-drift" style={{ animationDelay: '1.6s' }}>
        <div className="w-24 h-24 bg-white rounded-md -rotate-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100" />
      </div>

      {/* ===================================================================
          3. Hollow / Outlined Geometric Squares
          =================================================================== */}
      {/* Mid-Left Hollow Square */}
      <div className="absolute top-[30%] left-[10%] animate-geo-breathe" style={{ animationDelay: '2s' }}>
        <div className="w-28 h-28 border-4 border-brand-200 rounded-md rotate-45 opacity-50" />
      </div>

      {/* Bottom-Right Hollow Square */}
      <div className="absolute bottom-[10%] right-[15%] animate-geo-float-reverse" style={{ animationDelay: '1.4s' }}>
        <div className="w-36 h-36 border-[6px] border-brand-100 rounded-md -rotate-12 opacity-60" />
      </div>

      {/* Top-Right Corner Hollow Square */}
      <div className="absolute top-[15%] right-[2%] animate-geo-float-drift" style={{ animationDelay: '2.8s' }}>
        <div className="w-20 h-20 border-2 border-brand-300 rounded-md rotate-12 opacity-40" />
      </div>

      {/* Bottom-Left Corner Hollow Square */}
      <div className="absolute bottom-[40%] left-[3%] animate-geo-float-slow" style={{ animationDelay: '0.9s' }}>
        <div className="w-12 h-12 border-2 border-brand-400 rounded-md rotate-45 opacity-50" />
      </div>

      {/* ===================================================================
          4. Tiny Decorative Accent Dots (Staggered Pulsing)
          =================================================================== */}
      <div className="absolute top-[50%] right-[20%] animate-geo-dot-pulse" style={{ animationDelay: '0s' }}>
        <div className="w-3 h-3 bg-brand-400 rounded-full" />
      </div>

      <div className="absolute bottom-[30%] left-[25%] animate-geo-dot-pulse" style={{ animationDelay: '1.2s' }}>
        <div className="w-4 h-4 bg-brand-500 rounded-full opacity-60" />
      </div>

      <div className="absolute top-[25%] left-[30%] animate-geo-dot-pulse" style={{ animationDelay: '2.4s' }}>
        <div className="w-2 h-2 bg-brand-300 rounded-full opacity-80" />
      </div>

      <div className="absolute bottom-[50%] right-[40%] animate-geo-dot-pulse" style={{ animationDelay: '0.7s' }}>
        <div className="w-5 h-5 border-2 border-brand-400 rounded-full opacity-40" />
      </div>

      <div className="absolute top-[10%] left-[50%] animate-geo-dot-pulse" style={{ animationDelay: '1.9s' }}>
        <div className="w-2 h-2 bg-brand-600 rounded-full opacity-50" />
      </div>

      {/* Subtle bottom ambient divider line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-200/40 to-transparent" />
    </aside>
  );
}

export default memo(ThemeBackground);
