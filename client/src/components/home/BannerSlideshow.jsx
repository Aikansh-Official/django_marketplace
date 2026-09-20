import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import api from '../../services/api';

export default function BannerSlideshow() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Touch swipe coordinates
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Fetch active banners for client homepage
  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      try {
        const response = await api.get('/marketplace/banners/');
        if (isMounted) {
          setBanners(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Failed to load homepage banners:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  const total = banners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  // Touch Swipe Handlers
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const deltaX = touchStartX.current - touchEndX.current;
    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0) {
        // Swiped Left
        nextSlide();
      } else {
        // Swiped Right
        prevSlide();
      }
    }
  };

  // Click Navigation
  const handleBannerClick = (banner) => {
    if (!banner || !banner.link_url) return;
    const url = banner.link_url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  // If loading or no active banners, collapse gracefully (0 gap)
  if (loading || total === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <section
      aria-label="Promotional Banners"
      className="w-full px-4 sm:px-6 lg:px-[5%] pt-3 sm:pt-4 pb-1 sm:pb-2 relative z-0"
    >
      <div
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-gray-900 border border-gray-100 group select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides Track */}
        <div className="relative h-44 sm:h-56 md:h-64 lg:h-72 w-full overflow-hidden">
          {banners.map((banner, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={banner.id}
                aria-hidden={!isActive}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out cursor-pointer ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                onClick={() => handleBannerClick(banner)}
              >
                {/* Background Image */}
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover object-center scale-[1.01] hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80';
                  }}
                />

                {/* Multi-layered Contrast Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 sm:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent sm:max-w-2xl" />

                {/* Banner Content */}
                <div className="absolute inset-0 p-4 sm:p-7 md:p-8 flex flex-col justify-end max-w-xl sm:max-w-2xl text-white">
                  {/* Badge Text */}
                  {banner.badge_text && (
                    <div className="inline-flex items-center gap-1.5 self-start mb-2 px-2.5 py-0.5 sm:py-1 rounded-full bg-brand-500/90 backdrop-blur-md text-white font-black text-[10px] sm:text-xs tracking-wider uppercase shadow-sm">
                      <span>{banner.badge_text}</span>
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug line-clamp-2 drop-shadow-sm">
                    {banner.title}
                  </h2>

                  {/* Subtitle */}
                  {banner.subtitle && (
                    <p className="text-xs sm:text-sm text-gray-200 mt-1 sm:mt-1.5 line-clamp-1 sm:line-clamp-2 max-w-lg font-medium leading-relaxed drop-shadow-xs">
                      {banner.subtitle}
                    </p>
                  )}

                  {/* CTA Button */}
                  <div className="mt-3 sm:mt-4 self-start">
                    <span className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white text-gray-950 hover:bg-brand-50 hover:text-brand-700 text-xs sm:text-sm font-extrabold shadow-md transition-all duration-200 group-hover:scale-102">
                      <span>{banner.button_text || 'Explore Now'}</span>
                      {banner.link_url?.startsWith('http') ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Arrow Controls (Shown when > 1 slide) */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Previous Slide"
              className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition opacity-80 sm:opacity-0 group-hover:opacity-100 border border-white/10 active:scale-95 shadow-lg"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Next Slide"
              className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition opacity-80 sm:opacity-0 group-hover:opacity-100 border border-white/10 active:scale-95 shadow-lg"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* Bottom Pagination Dots (Shown when > 1 slide) */}
        {total > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3.5 right-4 z-20 flex items-center gap-1.5 sm:gap-2">
            {banners.map((b, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={b.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${isSelected
                    ? 'w-6 sm:w-7 bg-brand-500 shadow-sm'
                    : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/90'
                    }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
