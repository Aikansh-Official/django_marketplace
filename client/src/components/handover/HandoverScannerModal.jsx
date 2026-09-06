import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  Camera,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  MapPin,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function HandoverScannerModal({ listingId, defaultOfferId, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' | 'scan' (default to PIN for immediate reliability)
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [verifiedData, setVerifiedData] = useState(null);
  const [hasInspected, setHasInspected] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const html5QrCodeRef = useRef(null);
  const inputRefs = useRef([]);

  // Handle PIN input digit changes
  const handlePinChange = (index, value) => {
    // Only accept numeric characters
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...pinDigits];
    if (cleanVal.length > 1) {
      // User pasted full PIN
      const chars = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = chars[i] || '';
      }
      setPinDigits(newDigits);
      const nextFocus = Math.min(chars.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (chars.length === 6) {
        verifyPin(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleanVal;
    setPinDigits(newDigits);

    // Auto-advance to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (index === 5 && cleanVal && newDigits.every((d) => d !== '')) {
      verifyPin(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasteData.length; i++) {
        newDigits[i] = pasteData[i];
      }
      setPinDigits(newDigits);
      if (pasteData.length === 6) {
        verifyPin(pasteData);
      }
    }
  };

  // Verify PIN submission
  const verifyPin = async (fullPin) => {
    const code = fullPin || pinDigits.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit PIN.');
      return;
    }

    setVerifying(true);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/handover/verify/`, {
        pin_code: code
      });
      setVerifiedData(res.data);
      stopScanner();
    } catch (err) {
      console.error('Handover PIN verification failed', err);
      toast.error(err.response?.data?.error || 'Invalid or expired PIN code.');
    } finally {
      setVerifying(false);
    }
  };

  // Verify Token submission (from camera QR scan)
  const verifyToken = async (token) => {
    if (!token) return;
    setVerifying(true);
    try {
      const res = await axios.post(`${API_BASE}/marketplace/handover/verify/`, {
        token: token.trim()
      });
      setVerifiedData(res.data);
      stopScanner();
    } catch (err) {
      console.error('Handover QR verification failed', err);
      toast.error(err.response?.data?.error || 'Invalid or expired QR code.');
    } finally {
      setVerifying(false);
    }
  };

  // Setup HTML5 QR Code Scanner
  const startScanner = async () => {
    setScannerError(null);
    try {
      const qrId = 'handover-qr-reader';
      const html5QrCode = new Html5Qrcode(qrId);
      html5QrCodeRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Success callback
          verifyToken(decodedText);
        },
        (errorMessage) => {
          // Frequent scan failures - ignore to avoid spamming
        }
      );
    } catch (err) {
      console.warn('Camera failed to start', err);
      setScannerError('Could not start camera. Please switch to the 6-Digit PIN tab.');
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current.clear();
          });
        }
      } catch (e) {
        // Ignore stop error
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'scan' && !verifiedData) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [activeTab, verifiedData]);

  // Final confirmation
  const handleConfirmPurchase = async () => {
    if (!verifiedData?.token) return;
    if (!hasInspected || !hasPaid) {
      toast.error('Please check both verification boxes before completing purchase.');
      return;
    }

    setConfirming(true);
    try {
      await axios.post(`${API_BASE}/marketplace/handover/confirm/`, {
        token: verifiedData.token
      });

      setIsCompleted(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
      toast.success('Congratulations! Deal verified & completed successfully! 🎉', { duration: 5000 });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(verifiedData);
        }, 2200);
      }
    } catch (err) {
      console.error('Confirmation failed', err);
      toast.error(err.response?.data?.error || 'Failed to complete purchase. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isCompleted ? (
          /* Success Screen */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">Purchase Verified! 🎉</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                You have successfully completed the handover for{' '}
                <strong className="text-gray-800">{verifiedData?.listing_title}</strong>.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold inline-block">
              Saved to your profile under: <span className="font-extrabold text-emerald-700">My Purchases</span>
            </div>
          </div>
        ) : verifiedData ? (
          /* Step 2: Verification Confirmation Screen */
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Handover Code Verified
              </div>
              <h3 className="text-lg font-black text-gray-900">Confirm Physical Handover</h3>
              <p className="text-xs text-gray-500">
                Please verify the item and payment before finalizing.
              </p>
            </div>

            {/* Product Summary Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {verifiedData.listing_image ? (
                  <img
                    src={verifiedData.listing_image}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Package className="w-8 h-8" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <h4 className="font-extrabold text-sm text-gray-900 truncate">
                    {verifiedData.listing_title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-black text-brand-600 text-sm">
                      ₹{verifiedData.listing_price}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      Seller: <strong>{verifiedData.seller_name}</strong>
                    </span>
                  </div>
                  {verifiedData.meetup_location && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {verifiedData.meetup_location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Checkboxes */}
            <div className="space-y-2.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasInspected}
                  onChange={(e) => setHasInspected(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-brand-500 focus:ring-brand-400 accent-brand-500"
                />
                <span className="text-xs text-gray-700 font-medium leading-relaxed">
                  I have physically met the seller and inspected the product condition.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={hasPaid}
                  onChange={(e) => setHasPaid(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-brand-500 focus:ring-brand-400 accent-brand-500"
                />
                <span className="text-xs text-gray-700 font-medium leading-relaxed">
                  I have paid <strong className="text-gray-900">₹{verifiedData.listing_price}</strong> directly to {verifiedData.seller_name} (via UPI / Cash).
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmPurchase}
                disabled={confirming || !hasInspected || !hasPaid}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Finalizing Purchase...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Purchase & Mark as Sold
                  </>
                )}
              </button>

              <button
                onClick={() => setVerifiedData(null)}
                className="w-full text-xs font-bold text-gray-500 hover:text-gray-700 py-1.5 transition-colors"
              >
                Back / Re-enter Code
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Scan QR or Enter PIN Screen */
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                Buyer Handover Verification
              </div>
              <h3 className="text-lg font-black text-gray-900">Complete Item Handover</h3>
              <p className="text-xs text-gray-500">
                Ask the seller to show their Handover QR or 6-digit PIN.
              </p>
            </div>

            {/* Switch Tabs (PIN vs QR Camera) */}
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab('pin')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'pin'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                6-Digit PIN
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'scan'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Scan QR Code
              </button>
            </div>

            {/* TAB 1: Enter 6-digit PIN */}
            {activeTab === 'pin' && (
              <div className="space-y-4 py-2">
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className="w-11 h-13 text-center font-mono text-xl font-black bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-2xs"
                    />
                  ))}
                </div>

                <p className="text-center text-[11px] text-gray-400">
                  Read out the 6-digit PIN shown on the seller's screen.
                </p>

                <button
                  onClick={() => verifyPin()}
                  disabled={verifying || pinDigits.some((d) => d === '')}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying PIN...
                    </>
                  ) : (
                    <>
                      Verify Handover
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: Camera Viewfinder */}
            {activeTab === 'scan' && (
              <div className="space-y-3">
                {scannerError ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs text-amber-800 font-medium">{scannerError}</p>
                    <button
                      onClick={() => setActiveTab('pin')}
                      className="bg-white border border-amber-300 text-amber-900 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs"
                    >
                      Switch to PIN Entry
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-black min-h-[220px] flex items-center justify-center">
                    <div id="handover-qr-reader" className="w-full"></div>
                    {verifying && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white space-y-2">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold">Verifying scanned code...</p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-center text-[11px] text-gray-400">
                  Point your camera at the QR code displayed on the seller's device.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
