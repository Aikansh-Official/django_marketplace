import React, { memo } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Tag,
  BadgePercent,
  Sparkles,
} from 'lucide-react';

/**
 * ThemeBackground
 * 100% Auto-Animated Shopping & Campus Marketplace Themed Background for CampusXChange.
 * Features floating glassmorphic shopping badges, translucent marketplace watermarks,
 * swinging price tags, delivery parcels, savings coins, and twinkling deal sparkles.
 * Zero CPU overhead, fully GPU-accelerated CSS animations.
 */
function ThemeBackground({
  variant = 'default', // 'default' | 'subtle' | 'minimal'
  intensity = 'normal', // 'normal' | 'soft'
  className = '',
}) {
  const opacityMultiplier = intensity === 'soft' ? 'opacity-65' : 'opacity-100';

  return (
    <aside
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-[#f8f9fb] ${opacityMultiplier} ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 10% 12%, rgba(251, 86, 7, 0.08) 0%, transparent 45%),
          radial-gradient(circle at 88% 85%, rgba(251, 86, 7, 0.08) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, #ffffff 0%, #f6f7f9 100%)
        `,
      }}
    >
      {/* ===================================================================
          LAYER 1: Compact Corner Orbs with Subtle Shopping Watermarks
          =================================================================== */}
      <div className="absolute inset-0">
        {/* Top-Left: Neat Amber Glow Orb with Shopping Bag Contour */}
        <div
          className="absolute -top-6 -left-6 sm:-top-8 sm:-left-8 rounded-full bg-gradient-to-br from-[#ffb444] via-[#ff732c] to-[#fb5607] shadow-[0_10px_30px_rgba(251,86,7,0.22)] animate-geo-float-slow flex items-center justify-center overflow-hidden"
          style={{ width: 'clamp(90px, 10vw, 140px)', height: 'clamp(90px, 10vw, 140px)' }}
        >
          <ShoppingBag className="w-1/2 h-1/2 text-white/20 translate-x-1.5 translate-y-1.5" strokeWidth={1.5} />
        </div>

        {/* Bottom-Right: Neat Glowing Orb with Shopping Cart Contour */}
        <div
          className="absolute -bottom-8 -right-8 sm:-bottom-10 sm:-right-10 rounded-full bg-gradient-to-tr from-[#fb5607] via-[#ff732c] to-[#ffa834] shadow-[0_-10px_30px_rgba(251,86,7,0.22)] animate-geo-float-drift flex items-center justify-center overflow-hidden"
          style={{ width: 'clamp(100px, 11vw, 150px)', height: 'clamp(100px, 11vw, 150px)' }}
        >
          <ShoppingCart className="w-1/2 h-1/2 text-white/20 -translate-x-1.5 -translate-y-1.5" strokeWidth={1.5} />
        </div>

        {/* Bottom-Left: Petite Accent Orb */}
        <div
          className="absolute bottom-8 left-8 sm:bottom-12 sm:left-12 rounded-full bg-gradient-to-br from-[#ffa62b] to-[#fb5607] shadow-[0_6px_20px_rgba(251,86,7,0.18)] animate-geo-float-reverse flex items-center justify-center"
          style={{ width: 'clamp(38px, 4.5vw, 56px)', height: 'clamp(38px, 4.5vw, 56px)' }}
        >
          <Tag className="w-3.5 h-3.5 text-white/60 rotate-12" strokeWidth={2} />
        </div>

        {/* Floating Mini Decorative Circles / Bubbles */}
        <div
          className="absolute top-[8%] left-[28%] w-5 h-5 rounded-full bg-brand-400/25 border border-brand-300/40 animate-geo-float-slow"
          style={{ animationDelay: '1.2s' }}
        />
        <div
          className="absolute bottom-[18%] right-[22%] w-4 h-4 rounded-full bg-brand-500/20 border border-brand-400/40 animate-geo-float-reverse"
          style={{ animationDelay: '2.5s' }}
        />
        <div
          className="absolute top-[52%] left-[4%] w-3.5 h-3.5 rounded-full bg-amber-400/30 animate-geo-dot-pulse"
          style={{ animationDelay: '0.8s' }}
        />
      </div>

      {/* ===================================================================
          LAYER 2: Neat Translucent Marketplace Rings & Wireframes
          =================================================================== */}
      <div className="absolute inset-0">
        {/* Compact Shopping Cart Wireframe Ring (Center-Bottom) */}
        <div
          className="absolute -bottom-10 sm:-bottom-14 left-[34%] sm:left-[40%] rounded-full border-2 border-brand-400/35 animate-geo-ring-breathe flex items-center justify-center"
          style={{ width: 'clamp(130px, 15vw, 190px)', height: 'clamp(130px, 15vw, 190px)', animationDelay: '2s' }}
        >
          <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 text-brand-500/[0.06] -rotate-6" strokeWidth={1.2} />
        </div>

        {/* Mid-Right: Compact Floating Shopping Bag Wireframe */}
        <div
          className="hidden md:flex absolute top-[46%] -right-8 rounded-full border-2 border-brand-300/35 animate-geo-float-drift items-center justify-center"
          style={{ width: 'clamp(90px, 10vw, 130px)', height: 'clamp(90px, 10vw, 130px)', animationDelay: '1.5s' }}
        >
          <ShoppingBag className="w-12 h-12 text-brand-500/[0.06] rotate-12" strokeWidth={1.2} />
        </div>

        {/* Mid-Left: Compact Price Tag Contour */}
        <div
          className="hidden sm:flex absolute top-[24%] -left-6 rounded-full border-2 border-brand-400/30 animate-geo-ring-breathe items-center justify-center"
          style={{ width: 'clamp(75px, 8vw, 110px)', height: 'clamp(75px, 8vw, 110px)', animationDelay: '0.5s' }}
        >
          <BadgePercent className="w-10 h-10 text-brand-500/[0.06] -rotate-12" strokeWidth={1.4} />
        </div>

        {/* Petite Floating Ring Accent */}
        <div
          className="absolute top-[36%] right-[32%] w-10 h-10 rounded-full border border-brand-400/30 animate-geo-ring-spin-slow"
        />
        <div
          className="absolute bottom-[35%] left-[28%] w-8 h-8 rounded-full border border-brand-300/25 animate-geo-float-slow"
          style={{ animationDelay: '1.8s' }}
        />
      </div>

      {/* ===================================================================
          LAYER 3: Ambient Sparkles & Delicate Shimmer
          =================================================================== */}
      <div className="absolute inset-0">
        {/* Twinkling Deal Sparkle 1 (Near Top Left) */}
        <div
          className="absolute top-[26%] left-[26%] text-brand-500/60 animate-geo-dot-pulse"
          style={{ animationDelay: '0s' }}
        >
          <Sparkles className="w-5 h-5 drop-shadow-[0_0_8px_rgba(251,86,7,0.4)]" />
        </div>

        {/* Twinkling Deal Sparkle 2 (Near Top Right) */}
        <div
          className="absolute top-[34%] right-[28%] text-brand-500/60 animate-geo-dot-pulse"
          style={{ animationDelay: '1.6s' }}
        >
          <Sparkles className="w-4 h-4 drop-shadow-[0_0_8px_rgba(251,86,7,0.4)]" />
        </div>

        {/* Twinkling Deal Sparkle 3 (Bottom Center) */}
        <div
          className="absolute bottom-[20%] left-[42%] text-amber-500/50 animate-geo-dot-pulse"
          style={{ animationDelay: '2.8s' }}
        >
          <Sparkles className="w-4 h-4 drop-shadow-[0_0_8px_rgba(251,86,7,0.3)]" />
        </div>
      </div>

      {/* Subtle bottom-edge ambient gradient line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-200/40 to-transparent" />
    </aside>
  );
}

export default memo(ThemeBackground);
