import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Star,
  X,
  MessageSquare,
  ShieldCheck,
  Tag,
  ThumbsUp,
  Maximize2,
  Minimize2,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';

const QUICK_TAG_OPTIONS = [
  'Item as Described',
  'Smooth Handover',
  'Friendly & Polite',
  'Punctual Meetup',
  'Fair Price',
  'Clean & Well Kept',
  'Quick Responder',
  'Highly Recommended'
];

export default function ReviewModal({ dealId, listingTitle, reviewedUserName, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1) {
      toast.error('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/marketplace/reviews/', {
        deal_id: dealId,
        rating,
        comment: comment.trim(),
        quick_tags: selectedTags
      });

      toast.success('Thank you! Your verified review has been published.', { icon: '⭐' });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit review. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Slides in from Right / Full Screen on Mobile, expandable on Desktop) */}
      <div
        className={`fixed inset-y-0 right-0 max-w-full flex z-[10000] transition-all duration-300 ${
          isFullScreen ? 'w-full' : 'w-full sm:w-[480px] md:w-[540px]'
        }`}
      >
        <aside
          className="w-full h-full bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-100"
          aria-label="Campus Review Drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Warm Subtle Gradient matching Saved Wishlist Drawer */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-amber-100/70 text-amber-600 flex items-center justify-center shadow-xs border border-amber-200/80 flex-shrink-0">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2 truncate">
                  Rate Campus Trade
                  <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Verified Deal
                  </span>
                </h2>
                <p className="text-xs text-gray-500 truncate" title={listingTitle}>
                  {listingTitle ? `Item: ${listingTitle}` : 'Completed Handover'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Desktop Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="hidden sm:flex p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title={isFullScreen ? 'Restore normal drawer size' : 'Expand full screen'}
                aria-label={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close review drawer"
                aria-label="Close review drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
              {/* Reviewing Peer Info Card */}
              <div className="bg-gradient-to-r from-gray-50 to-orange-50/20 border border-gray-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-black text-sm flex items-center justify-center shrink-0 border border-brand-200">
                    {reviewedUserName?.slice(0, 2).toUpperCase() || 'TR'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Reviewing Trader
                    </div>
                    <div className="font-extrabold text-sm sm:text-base text-gray-900 flex items-center gap-1.5 truncate">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{reviewedUserName || 'Campus Trader'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Deal</span>
                  </span>
                </div>
              </div>

              {/* Star Rating Interactive Selector */}
              <div className="text-center py-4 sm:py-5 space-y-3 bg-gradient-to-b from-amber-50/60 via-amber-50/30 to-white rounded-2xl border border-amber-200/70 p-4 sm:p-6 shadow-2xs">
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Overall Trade Experience
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tap a star below to rate your campus interaction
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1.5 sm:p-2 transition-transform hover:scale-120 active:scale-95 focus:outline-none cursor-pointer touch-manipulation"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-500 drop-shadow-md'
                              : 'text-gray-200 hover:text-amber-200'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="inline-block bg-amber-100/70 border border-amber-200 text-amber-900 px-3.5 py-1 rounded-full text-xs sm:text-sm font-extrabold shadow-2xs">
                  {rating === 5 && '🌟 Exceptional Trade (5/5)'}
                  {rating === 4 && '👍 Very Good Experience (4/5)'}
                  {rating === 3 && '👌 Satisfactory Trade (3/5)'}
                  {rating === 2 && '⚠️ Needs Improvement (2/5)'}
                  {rating === 1 && '👎 Poor Experience (1/5)'}
                </div>
              </div>

              {/* Quick Tags Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-brand-500" />
                    Quick Highlights (Optional)
                  </span>
                  {selectedTags.length > 0 && (
                    <span className="text-[11px] text-brand-600 font-bold">
                      {selectedTags.length} selected
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {QUICK_TAG_OPTIONS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border touch-manipulation cursor-pointer select-none flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-500 text-white border-brand-500 shadow-xs scale-[1.02]'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        {isSelected && <span className="text-[11px]">✓</span>}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Written Feedback Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    Written Peer Feedback
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">Optional</span>
                </div>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share how the physical inspection, campus meetup (Uni-Mall / Central Library / Hostel), and handover went. Helps other LPU students trade with confidence..."
                  className="w-full border border-gray-300 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none resize-none font-normal leading-relaxed text-gray-800 placeholder-gray-400 shadow-2xs"
                />
              </div>

              {/* Campus Trust Guideline Note */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your feedback helps maintain a trustworthy and secure student marketplace at LPU. Reviews directly update the seller's public campus trust score.
                </p>
              </div>
            </div>

            {/* Bottom Pinned Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/90 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full sm:w-1/3 bg-white border border-gray-300 hover:bg-gray-100 active:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-xs sm:text-sm min-h-[44px] cursor-pointer transition-colors flex items-center justify-center shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-2/3 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-xs sm:text-sm disabled:opacity-50 min-h-[44px] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                <span>{submitting ? 'Publishing Review...' : 'Publish Verified Review'}</span>
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>,
    document.body
  );
}
