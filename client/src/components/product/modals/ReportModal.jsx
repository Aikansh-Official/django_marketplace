import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, ShieldAlert } from 'lucide-react';

export default function ReportModal({
  isOpen,
  onClose,
  reportReason,
  setReportReason,
  reportDetails,
  setReportDetails,
  submittingReport,
  onSubmit
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (True Full-Height Viewport Slide-In) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex z-[10000] w-full sm:w-[480px]">
        <aside
          className="w-full h-full bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-200"
          aria-label="Report listing drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header with Warm Alert Gradient */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/70 via-orange-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shadow-xs border border-red-100 flex-shrink-0">
                <Flag className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 truncate">
                  Report Listing
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  Help keep CampusXChange safe and trustworthy
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable Form) */}
          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Reason for Reporting <span className="text-red-500">*</span>
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white cursor-pointer"
              >
                <option value="Duplicate / Spam">Duplicate / Spam Listing</option>
                <option value="Incorrect Price / Info">Incorrect Price or Misleading Information</option>
                <option value="Inappropriate Content">Inappropriate / Offensive Content</option>
                <option value="Item Already Sold">Item is Already Sold / Inactive</option>
                <option value="Scam / Fraud">Potential Scam / Fraud Suspicion</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                rows={4}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 text-xs font-normal focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                placeholder="Explain why this listing violates campus guidelines or safety rules..."
              />
            </div>

            <div className="bg-red-50/70 border border-red-200/80 rounded-md p-3 text-[11px] text-red-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>
                All reports are reviewed anonymously by campus student moderators. False reporting may affect your campus trust score.
              </span>
            </div>

            {/* Action Footer */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-md font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReport}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-md font-bold text-xs disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>,
    document.body
  );
}
