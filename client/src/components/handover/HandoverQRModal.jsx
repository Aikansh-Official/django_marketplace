import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  QrCode,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function HandoverQRModal({ offerId, listingTitle, buyerName, price, onClose, onComplete }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [copied, setCopied] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const pollIntervalRef = useRef(null);

  // Generate or fetch handover session
  const generateQR = async () => {
    try {
      const res = await axios.post(`${API_BASE}/marketplace/offers/${offerId}/generate-qr/`);
      setSession(res.data);
      setSecondsLeft(res.data.remaining_seconds || 300);
      setIsCompleted(false);
    } catch (err) {
      console.error('Failed to generate handover QR', err);
      toast.error(err.response?.data?.error || 'Failed to generate Handover QR code.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    generateQR();
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

  // Status polling to detect when Buyer confirms
  useEffect(() => {
    if (!session || isCompleted || secondsLeft <= 0) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/listings/${session.listing_id}/offers/`);
        const currentOffer = res.data.find((o) => o.id === offerId);
        if (currentOffer && currentOffer.status === 'COMPLETED') {
          setIsCompleted(true);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
          toast.success('Handover Verified! Your item is marked as SOLD! 🎉', { duration: 5000 });
          clearInterval(pollIntervalRef.current);
          if (onComplete) {
            setTimeout(() => {
              onComplete();
            }, 2500);
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session, isCompleted, secondsLeft, offerId, onComplete]);

  const handleCopyPin = () => {
    if (!session?.pin_code) return;
    navigator.clipboard.writeText(session.pin_code);
    setCopied(true);
    toast.success('Handover PIN copied to clipboard!');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isCompleted ? (
          /* Success Screen */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">Handover Complete!</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Buyer confirmed receipt of <strong className="text-gray-800">{listingTitle}</strong>.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold inline-block">
              Listing status automatically updated to: <span className="font-extrabold text-emerald-700 uppercase">SOLD</span>
            </div>
          </div>
        ) : loading ? (
          /* Loading Screen */
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-medium">Generating secure Handover QR & PIN...</p>
          </div>
        ) : (
          /* QR & PIN Handover Screen */
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                Physical Handover Handshake
              </div>
              <h3 className="text-lg font-black text-gray-900">Scan to Verify Handover</h3>
              <p className="text-xs text-gray-500">
                Show this QR to <strong className="text-gray-800">{buyerName || 'the buyer'}</strong> when handing over the item.
              </p>
            </div>

            {/* QR Card */}
            <div className="relative bg-gradient-to-b from-gray-50 to-gray-100/70 border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center shadow-inner">
              {isExpired ? (
                <div className="py-8 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-gray-800">QR Code Expired</p>
                    <p className="text-xs text-gray-500">Handover codes expire after 5 minutes for security.</p>
                  </div>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate Code
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white p-3.5 rounded-xl shadow-md border border-gray-200/90">
                    <QRCodeSVG
                      value={session?.token || ''}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  {/* Timer Badge */}
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white/90 px-3 py-1 rounded-full shadow-2xs border border-gray-200">
                    <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    Expires in: <span className="font-mono text-orange-600 font-extrabold">{formatTime(secondsLeft)}</span>
                  </div>
                </>
              )}
            </div>

            {/* 6-Digit PIN Fallback Section */}
            {!isExpired && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-center space-y-2">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  <span>Or enter 6-digit Handover PIN</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black tracking-widest text-gray-900 bg-white px-4 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                    {session?.pin_code}
                  </span>
                  <button
                    onClick={handleCopyPin}
                    className="p-2 bg-white hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-300 transition-colors"
                    title="Copy PIN"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Useful if the buyer is using a laptop webcam or has poor lighting.
                </p>
              </div>
            )}

            {/* Transaction Brief */}
            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div className="truncate pr-2">
                <p className="font-bold text-gray-800 truncate">{listingTitle}</p>
                <p className="text-[11px] text-gray-500">Buyer: {buyerName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-gray-900">₹{price}</p>
                <p className="text-[10px] text-emerald-600 font-bold">UPI / Cash at Handover</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                Refresh QR
              </button>
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
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
