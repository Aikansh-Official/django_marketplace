import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Clock,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Package,
  Zap,
  Sparkles,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api, { getPlatformConfig } from '../../services/api';

export default function HandoverQRModal({
  offerId,
  listingId,
  listingTitle,
  buyerName,
  price,
  location,
  image,
  existingSession,
  onClose,
  onComplete
}) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [defaultExpirySeconds, setDefaultExpirySeconds] = useState(1800);
  const [secondsLeft, setSecondsLeft] = useState(1800);
  const [copied, setCopied] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const isCompletedRef = useRef(false);
  const pollIntervalRef = useRef(null);

  // Lock body scroll and handle Escape key like SavedItemsDrawer
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    getPlatformConfig().then((cfg) => {
      if (cfg?.handover_qr_expiry_minutes) {
        const secs = cfg.handover_qr_expiry_minutes * 60;
        setDefaultExpirySeconds(secs);
      }
    }).catch(() => {});
  }, []);

  // Generate or fetch handover session
  const generateQR = async () => {
    setError(null);
    try {
      const res = await api.post(`/marketplace/offers/${offerId}/generate-qr/`);
      setSession(res.data);
      setSecondsLeft(res.data.remaining_seconds || defaultExpirySeconds);
      setIsCompleted(false);
      isCompletedRef.current = false;
    } catch (err) {
      console.error('Failed to generate handover QR', err);
      const msg = err.response?.data?.error || 'Failed to generate Handover code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (existingSession && existingSession.status === 'ACTIVE' && existingSession.remaining_seconds > 10) {
      setSession(existingSession);
      setSecondsLeft(existingSession.remaining_seconds);
      setLoading(false);
    } else {
      generateQR();
    }
  }, [offerId]);

  // Countdown timer
  useEffect(() => {
    if (!session || isCompleted || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, isCompleted, secondsLeft]);

  // Trigger completion celebration for Seller
  const triggerCompletion = () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    setIsCompleted(true);

    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 }
    });
    toast.success('Handover Verified! Item marked as SOLD! 🎉', { duration: 5000 });

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    window.dispatchEvent(new CustomEvent('notifications-updated'));

    if (onComplete) {
      setTimeout(() => {
        onComplete();
      }, 3500);
    }
  };

  // Status polling and cross-window events to detect when Buyer confirms handover
  useEffect(() => {
    if (isCompleted) return;

    const targetListingId = listingId || session?.listing_id || existingSession?.listing_id;
    if (!targetListingId) return;

    const checkOfferStatus = async () => {
      if (isCompletedRef.current) return;
      try {
        const res = await api.get(`/marketplace/listings/${targetListingId}/offers/`);
        const currentOffer = res.data.find((o) => o.id === offerId);

        if (currentOffer && currentOffer.status === 'COMPLETED') {
          triggerCompletion();
        } else if (currentOffer && currentOffer.status === 'CANCELLED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsCancelled(true);
          setCancellationReason(
            currentOffer.cancellation_reason ||
            'This handover was cancelled by the administration or counterparty.'
          );
        }
      } catch (e) {
        // Ignore background polling errors
      }
    };

    pollIntervalRef.current = setInterval(checkOfferStatus, 1500);

    const handleDealCompletedEvent = (e) => {
      const eventListingId = e?.detail?.listingId || e?.detail;
      if (!eventListingId || String(eventListingId) === String(targetListingId)) {
        triggerCompletion();
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'deal_completed_event') {
        try {
          const data = JSON.parse(e.newValue);
          if (!data?.listingId || String(data.listingId) === String(targetListingId)) {
            triggerCompletion();
          }
        } catch (err) {
          triggerCompletion();
        }
      }
    };

    window.addEventListener('deal-completed', handleDealCompletedEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      window.removeEventListener('deal-completed', handleDealCompletedEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [listingId, session?.listing_id, existingSession?.listing_id, offerId, isCompleted]);

  const handleCopyPin = () => {
    if (!session?.pin_code) return;
    navigator.clipboard.writeText(session.pin_code);
    setCopied(true);
    toast.success(`PIN ${session.pin_code} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setRegenerating(true);
    generateQR();
  };

  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isExpired = secondsLeft <= 0;

  // Clean 6 individual digit boxes
  const renderPinBoxes = () => {
    const pin = session?.pin_code ? String(session.pin_code) : '';
    const digits = pin.padEnd(6, '-').slice(0, 6).split('');

    return (
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        {digits.map((digit, idx) => (
          <div
            key={idx}
            className="w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center bg-gray-50/90 rounded-lg border-2 border-gray-200 font-mono text-xl sm:text-2xl font-black text-gray-900 select-all shadow-2xs"
          >
            {digit}
          </div>
        ))}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside
          className="w-screen max-w-full sm:w-[460px] bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-100 h-full"
          aria-label="Handover QR & PIN Drawer"
        >
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shadow-xs border border-brand-100 shrink-0">
                <QrCode className="w-4 h-4 text-brand-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-brand-500 text-white font-bold px-2 py-0.5 rounded-full">
                    Seller Screen
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Verify Pickup</span>
                </div>
                <h2 className="text-base font-bold text-gray-900 truncate">
                  Handover Verification
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-safe touch-momentum">
            {isCancelled ? (
              /* DEAL CANCELLED / DISPUTED SCREEN */
              <div className="py-10 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 bg-red-100 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                    Deal Interrupted
                  </span>
                  <h3 className="text-xl font-black text-gray-900">Deal Cancelled</h3>
                  <p className="text-xs text-gray-500">
                    This transaction was cancelled and the handover code is void.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left space-y-1">
                  <div className="text-xs font-bold text-red-800">Reason / Notice:</div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {cancellationReason}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full min-h-[44px] rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer"
                >
                  Close Handover
                </button>
              </div>
            ) : isCompleted ? (
              /* SUCCESS CELEBRATION SCREEN */
              <div className="py-8 text-center space-y-4 animate-in fade-in">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"></div>
                  <div className="relative w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-500" /> Handover Complete
                  </span>
                  <h3 className="text-xl font-black text-gray-900">Deal Verified!</h3>
                  <p className="text-xs text-gray-500">
                    <strong className="text-gray-800">{buyerName || 'Buyer'}</strong> confirmed delivery & payment.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/90 rounded-lg p-3.5 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>+3 Trust Score Added!</span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Listing status updated to <span className="font-bold text-emerald-700">SOLD</span>.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (onComplete) onComplete();
                    onClose();
                  }}
                  className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : loading ? (
              /* LOADING SCREEN */
              <div className="py-20 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500 font-medium">Generating Handover QR & PIN...</p>
              </div>
            ) : error && !session ? (
              /* ERROR / RETRY SCREEN */
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-gray-900">Failed to load code</h3>
                  <p className="text-xs text-red-600 max-w-xs mx-auto">{error}</p>
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="min-h-[44px] inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  Try Again
                </button>
              </div>
            ) : (
              /* ACTIVE HANDOVER SCREEN */
              <div className="space-y-5">
                {/* Instructions banner */}
                <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-amber-900">
                    Show this QR or read out the 6-digit PIN to{' '}
                    <strong className="text-gray-900">{buyerName || 'the buyer'}</strong>
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Once they scan or enter it on their phone, the deal completes instantly.
                  </p>
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col items-center justify-center py-2">
                  {isExpired ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-gray-900">QR Code Expired</p>
                        <p className="text-xs text-gray-400">Codes expire after 30 minutes for safety.</p>
                      </div>
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="min-h-[44px] inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                        Generate New Code
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Clean QR Code Frame */}
                      <div className="p-4 bg-white border-2 border-gray-200/90 rounded-xl shadow-md flex items-center justify-center">
                        {session?.token && (
                          <QRCodeSVG
                            value={session.token}
                            size={200}
                            level="H"
                            includeMargin={false}
                          />
                        )}
                      </div>

                      {/* Clean Timer Badge */}
                      <div
                        className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full transition-colors ${
                          secondsLeft > 120
                            ? 'bg-gray-100 text-gray-700'
                            : secondsLeft > 60
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expires in <strong className="font-mono">{formatTime(secondsLeft)}</strong></span>
                      </div>
                    </>
                  )}
                </div>

                {/* PIN fallback section */}
                {!isExpired && (
                  <div className="space-y-3 pt-2">
                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-gray-200 w-full"></div>
                      <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        or 6-digit confirmation PIN
                      </span>
                    </div>

                    {renderPinBoxes()}

                    <div className="text-center">
                      <button
                        onClick={handleCopyPin}
                        className="min-h-[38px] inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-4 py-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600">Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-gray-500" />
                            <span>Copy PIN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Product Summary Card */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 text-xs">
                  <div className="flex items-center gap-3 truncate pr-2">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-orange-50 text-brand-500 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-gray-900 truncate">{listingTitle}</p>
                      <p className="text-[11px] text-gray-500 truncate">Buyer: {buyerName}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-gray-900">₹{price}</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">UPI / Cash</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0 pb-safe">
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className="min-h-[44px] px-3 text-xs font-bold text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Refresh Code</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold px-5 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Close Drawer
            </button>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
}
