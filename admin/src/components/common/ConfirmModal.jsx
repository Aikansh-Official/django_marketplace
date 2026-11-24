import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertOctagon, Info, Loader2, X } from 'lucide-react';

/**
 * Modern Glassmorphic Confirmation Modal
 * Replaces browser native window.confirm() with a sleek enterprise UX.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  loading = false,
  detail = null,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: AlertOctagon,
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      buttonBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
      badge: 'Destructive Action',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
      badge: 'Caution Required',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      buttonBg: 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20',
      badge: 'System Notice',
    },
  }[variant] || {
    icon: AlertTriangle,
    iconBg: 'bg-red-50 text-red-600 border-red-200',
    buttonBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
    badge: 'Notice',
  };

  const IconComponent = variantConfig.icon;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-scale-up">
        {/* Header Bar */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs ${variantConfig.iconBg}`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {variantConfig.badge}
                </span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-snug">
                  {title}
                </h3>
              </div>
            </div>
            {!loading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <p className="mt-4 text-xs font-medium text-gray-600 leading-relaxed">
            {message}
          </p>

          {detail && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono text-gray-700 break-words">
              {detail}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-200/70 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer ${variantConfig.buttonBg}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
