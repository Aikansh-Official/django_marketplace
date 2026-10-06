import React, { memo } from 'react';

/**
 * ThemeBackground
 * Auto-animated geometric background for CampXChange (Admin-style floating cubes & squares).
 * Carefully positioned strictly within the outer 5% side gutters (empty margin areas),
 * keeping the center 90% content workspace completely clean, legible, and distraction-free.
 * Pure GPU-accelerated CSS animations with zero CPU overhead.
 */
function ThemeBackground({
  intensity = 'normal',
  className = '',
}) {
  const opacityMultiplier = intensity === 'soft' ? 'opacity-70' : 'opacity-100';

  return (
    <aside
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-[#f9fafb] ${opacityMultiplier} ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 4% 12%, rgba(251, 86, 7, 0.05) 0%, transparent 40%),
          radial-gradient(circle at 96% 88%, rgba(251, 86, 7, 0.05) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, #ffffff 0%, #f9fafb 100%)
        `,
      }}
    >
      {/* ===================================================================
          LEFT 5% EMPTY GUTTER (Admin-Style Floating Geometric Shapes)
          =================================================================== */}
      <div className="hidden sm:block absolute top-0 bottom-0 left-0 w-[5%] overflow-visible pointer-events-none">
        {/* Top Solid Orange Cube */}
        <div className="absolute top-[8%] left-[10%] animate-geo-float-slow" style={{ animationDelay: '0s' }}>
          <div className="w-10 sm:w-12 h-10 sm:h-12 bg-brand-500 rounded-md rotate-12 shadow-lg opacity-80" />
        </div>

        {/* Upper-Mid White Cube with Border & Shadow */}
        <div className="absolute top-[22%] left-[15%] animate-geo-float-reverse" style={{ animationDelay: '1.2s' }}>
          <div className="w-9 sm:w-11 h-9 sm:h-11 bg-white rounded-md -rotate-6 shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-gray-100" />
        </div>

        {/* Center Hollow Orange Square Outline */}
        <div className="absolute top-[42%] left-[12%] animate-geo-breathe" style={{ animationDelay: '0.8s' }}>
          <div className="w-11 sm:w-13 h-11 sm:h-13 border-2 border-brand-300/60 rounded-md rotate-45 opacity-60" />
        </div>

        {/* Lower-Mid Pulsing Accent Dot */}
        <div className="absolute top-[58%] left-[30%] animate-geo-dot-pulse" style={{ animationDelay: '1.5s' }}>
          <div className="w-3 h-3 bg-brand-400 rounded-full" />
        </div>

        {/* Lower Large Solid Orange Cube */}
        <div className="absolute bottom-[20%] left-[8%] animate-geo-float-slow" style={{ animationDelay: '2.5s' }}>
          <div className="w-12 sm:w-14 h-12 sm:h-14 bg-brand-600 rounded-md -rotate-12 shadow-xl opacity-85" />
        </div>

        {/* Bottom Small Hollow Accent Square */}
        <div className="absolute bottom-[7%] left-[18%] animate-geo-float-drift" style={{ animationDelay: '3s' }}>
          <div className="w-8 h-8 border-2 border-brand-400/50 rounded-md rotate-12 opacity-50" />
        </div>
      </div>

      {/* ===================================================================
          RIGHT 5% EMPTY GUTTER (Admin-Style Floating Geometric Shapes)
          =================================================================== */}
      <div className="hidden sm:block absolute top-0 bottom-0 right-0 w-[5%] overflow-visible pointer-events-none">
        {/* Top Solid Orange Drift Cube */}
        <div className="absolute top-[14%] right-[10%] animate-geo-float-drift" style={{ animationDelay: '1s' }}>
          <div className="w-11 sm:w-13 h-11 sm:h-13 bg-brand-400 rounded-md rotate-45 shadow-lg opacity-75" />
        </div>

        {/* Upper-Mid Hollow Square Outline */}
        <div className="absolute top-[32%] right-[12%] animate-geo-float-reverse" style={{ animationDelay: '2.2s' }}>
          <div className="w-10 sm:w-12 h-10 sm:h-12 border-2 border-brand-300/60 rounded-md -rotate-12 opacity-55" />
        </div>

        {/* Center Pulsing Accent Dot */}
        <div className="absolute top-[50%] right-[30%] animate-geo-dot-pulse" style={{ animationDelay: '0.5s' }}>
          <div className="w-3.5 h-3.5 bg-brand-500 rounded-full" />
        </div>

        {/* Lower-Mid White Cube with Border & Shadow */}
        <div className="absolute top-[66%] right-[14%] animate-geo-float-slow" style={{ animationDelay: '1.8s' }}>
          <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white rounded-md rotate-12 shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-gray-100" />
        </div>

        {/* Bottom Large Solid Orange Cube */}
        <div className="absolute bottom-[16%] right-[8%] animate-geo-breathe" style={{ animationDelay: '2s' }}>
          <div className="w-13 sm:w-15 h-13 sm:h-15 bg-brand-500 rounded-md rotate-12 shadow-xl opacity-75" />
        </div>

        {/* Bottom Corner Accent Dot */}
        <div className="absolute bottom-[6%] right-[22%] animate-geo-dot-pulse" style={{ animationDelay: '2.8s' }}>
          <div className="w-2.5 h-2.5 bg-brand-300 rounded-full opacity-80" />
        </div>
      </div>

      {/* Subtle bottom ambient divider line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-200/40 to-transparent" />
    </aside>
  );
}

export default memo(ThemeBackground);
