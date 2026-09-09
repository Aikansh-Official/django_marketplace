import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [copied, setCopied] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const isCompletedRef = useRef(false);
  const pollIntervalRef = useRef(null);

  // Generate or fetch handover session
  const generateQR = async () => {
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/offers/${offerId}/generate-qr/`);
      setSession(res.data);
      setSecondsLeft(res.data.remaining_seconds || 300);
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
      // Auto-transition after 3.5 seconds so seller can see verified screen
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
        const res = await axios.get(`${API_BASE}/marketplace/listings/${targetListingId}/offers/`);
        const currentOffer = res.data.find((o) => o.id === offerId);

        if (currentOffer && currentOffer.status === 'COMPLETED') {
          triggerCompletion();
        }
      } catch (e) {
        // Ignore background polling errors
      }
    };

    // Poll every 1.5 seconds without being cancelled by countdown timer
    pollIntervalRef.current = setInterval(checkOfferStatus, 1500);

    // Instant sync for same-browser tabs/windows
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
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {digits.map((digit, idx) => (
          <div
            key={idx}
            className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 font-mono text-lg sm:text-2xl font-bold text-gray-900 select-all"
          >
            {digit}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {isCompleted ? (
          /* ====================================================
             1. SUCCESS CELEBRATION SCREEN
             ==================================================== */
          <div className="py-6 text-center space-y-4">
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

            <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3 text-center space-y-1">
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-colors"
            >
              Done
            </button>
          </div>
        ) : loading ? (
          /* ====================================================
             2. LOADING SCREEN
             ==================================================== */
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-medium">Generating Handover QR & PIN...</p>
          </div>
        ) : error && !session ? (
          /* ====================================================
             3. ERROR / RETRY SCREEN
             ==================================================== */
          <div className="py-10 text-center space-y-3">
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
              className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              Try Again
            </button>
          </div>
        ) : (
          /* ====================================================
             4. CLEAN & SIMPLE ACTIVE HANDOVER SCREEN
             ==================================================== */
          <div className="space-y-4">
            
            {/* Header */}
            <div className="text-center space-y-0.5 pt-1">
              <h3 className="text-lg font-bold text-gray-900">
                Handover Verification
              </h3>
              <p className="text-xs text-gray-500">
                Show this to <strong className="text-gray-800">{buyerName || 'the buyer'}</strong> at pickup
              </p>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center py-1">
              {isExpired ? (
                /* Expired Overlay */
                <div className="py-6 text-center space-y-2.5">
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-gray-900">QR Code Expired</p>
                    <p className="text-xs text-gray-400">Codes expire after 5 minutes.</p>
                  </div>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                    Generate New Code
                  </button>
                </div>
              ) : (
                <>
                  {/* Clean QR Code */}
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-xs">
                    {session?.token && (
                      <QRCodeSVG
                        value={session.token}
                        size={170}
                        level="H"
                        includeMargin={false}
                      />
                    )}
                  </div>

                  {/* Clean Timer Badge */}
                  <div
                    className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full transition-colors ${
                      secondsLeft > 120
                        ? 'bg-gray-100 text-gray-700'
                        : secondsLeft > 60
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700 animate-pulse'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in <strong className="font-mono">{formatTime(secondsLeft)}</strong></span>
                  </div>
                </>
              )}
            </div>

            {/* Subtle Divider */}
            {!isExpired && (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-gray-200 w-full"></div>
                  <span className="bg-white px-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    or enter 6-digit PIN
                  </span>
                </div>

                {/* 6 Digit Display & Copy */}
                <div className="space-y-2">
                  {renderPinBoxes()}

                  <div className="text-center">
                    <button
                      onClick={handleCopyPin}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy PIN</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Clean Minimal Product Row */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-2.5 truncate pr-2">
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-brand-500 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                )}
                <div className="truncate">
                  <p className="font-semibold text-gray-900 truncate">{listingTitle}</p>
                  <p className="text-[11px] text-gray-500 truncate">Buyer: {buyerName}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-black text-gray-900">₹{price}</p>
                <p className="text-[10px] font-semibold text-emerald-600">UPI / Cash</p>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleRegenerate}
                disabled={regenerating || loading}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
