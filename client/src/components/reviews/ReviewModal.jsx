import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Star, X, MessageSquare, ShieldCheck, Tag, ThumbsUp } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
              <Star className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-amber-400 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-gray-900 text-sm sm:text-base leading-snug">Rate Campus Trade</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate" title={listingTitle}>
                {listingTitle ? `Item: ${listingTitle}` : 'Completed Handover'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Close review dialog"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 space-y-3.5 sm:space-y-4">
          <div className="overflow-y-auto pr-1 space-y-3.5 sm:space-y-4 flex-1 scrollbar-thin">
            {/* Target Student Info */}
            <div className="bg-gray-50/90 border border-gray-200/80 rounded-lg p-2.5 sm:p-3 text-xs flex items-center justify-between gap-2">
              <span className="text-gray-500 shrink-0">Reviewing Peer:</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5 min-w-0 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">{reviewedUserName || 'Campus Trader'}</span>
              </span>
            </div>

            {/* Star Rating Interactive Selector */}
            <div className="text-center py-2.5 sm:py-3 space-y-2 bg-gradient-to-b from-amber-50/50 to-amber-50/20 rounded-xl border border-amber-200/60 p-3 sm:p-4">
              <div className="text-[11px] sm:text-xs font-extrabold text-gray-600 uppercase tracking-wider">
                Select Experience Rating
              </div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 sm:p-1.5 transition-transform hover:scale-115 active:scale-95 focus:outline-none cursor-pointer touch-manipulation"
                      title={`${star} Star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs sm:text-sm font-black text-amber-800 min-h-[20px] flex items-center justify-center">
                {rating === 5 && '🌟 Exceptional Trade (5/5)'}
                {rating === 4 && '👍 Very Good Experience (4/5)'}
                {rating === 3 && '👌 Satisfactory Trade (3/5)'}
                {rating === 2 && '⚠️ Needs Improvement (2/5)'}
                {rating === 1 && '👎 Poor Experience (1/5)'}
              </div>
            </div>

            {/* Quick Tags Chips */}
            <div className="space-y-1.5">
              <label className="block text-[11px] sm:text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-500" /> Quick Trade Highlights (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-0.5 scrollbar-thin">
                {QUICK_TAG_OPTIONS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all border touch-manipulation cursor-pointer select-none ${
                        isSelected
                          ? 'bg-brand-500 text-white border-brand-500 shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 active:bg-gray-100'
                      }`}
                    >
                      {isSelected ? `✓ ${tag}` : tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Feedback Textarea */}
            <div className="space-y-1.5">
              <label className="block text-[11px] sm:text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" /> Written Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share how the physical inspection, campus meetup, and handover went..."
                className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none font-normal leading-relaxed text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-2 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-gray-50 active:bg-gray-100 min-h-[42px] cursor-pointer transition-colors flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:flex-1 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white py-2.5 rounded-lg font-bold text-xs sm:text-sm disabled:opacity-50 min-h-[42px] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
              {submitting ? 'Submitting...' : 'Publish Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
