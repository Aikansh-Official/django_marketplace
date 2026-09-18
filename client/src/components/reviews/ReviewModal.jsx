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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-md max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Rate Campus Trade</h3>
              <p className="text-[11px] text-gray-500 truncate max-w-[240px]">
                {listingTitle ? `Item: ${listingTitle}` : 'Completed Handover'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Student Info */}
          <div className="bg-gray-50/80 border border-gray-200/80 rounded-md p-3 text-xs flex items-center justify-between">
            <span className="text-gray-500">Reviewing Peer:</span>
            <span className="font-bold text-gray-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              {reviewedUserName || 'Campus Trader'}
            </span>
          </div>

          {/* Star Rating Interactive Selector */}
          <div className="text-center py-2 space-y-1.5 bg-amber-50/30 rounded-md border border-amber-100/60 p-3">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Select Experience Rating
            </div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-black text-amber-700">
              {rating === 5 && '🌟 Exceptional Trade (5/5)'}
              {rating === 4 && '👍 Very Good Experience (4/5)'}
              {rating === 3 && '👌 Satisfactory Trade (3/5)'}
              {rating === 2 && '⚠️ Needs Improvement (2/5)'}
              {rating === 1 && '👎 Poor Experience (1/5)'}
            </div>
          </div>

          {/* Quick Tags Chips */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-brand-500" /> Quick Trade Highlights (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
              {QUICK_TAG_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all border ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-500 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Written Feedback Textarea */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-gray-400" /> Written Feedback (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how the physical inspection, campus meetup, and handover went..."
              className="w-full border border-gray-300 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none font-normal"
            />
          </div>

          {/* DPDP Act 2023 Compliance Notice */}
          <div className="text-[10px] text-gray-400 leading-tight bg-gray-50 p-2 rounded border border-gray-100">
            🔒 <strong>DPDP Act 2023 Compliance</strong>: Your review will be displayed with your sanitized name only. Your registration number, email, and phone are never disclosed.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-md font-bold text-xs hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white py-2.5 rounded-md font-bold text-xs disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <ThumbsUp className="w-3.5 h-3.5" />
              )}
              {submitting ? 'Submitting...' : 'Publish Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
