import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
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
  ShoppingBag,
  Sparkles,
  Check
} from 'lucide-react';
import triggerConfetti from '../../utils/confetti';
import { emitTradeEvent, TRADE_ACTIONS } from '../../utils/tradeEvents';

export default function HandoverScannerModal({ listingId, defaultOfferId, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' | 'scan'
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

  // Lock body scroll and handle Escape key like SavedItemsDrawer
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopScanner();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Handle PIN input digit changes
  const handlePinChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...pinDigits];
    if (cleanVal.length > 1) {
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

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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
      const res = await api.post('/marketplace/handover/verify/', {
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
      const res = await api.post('/marketplace/handover/verify/', {
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
          verifyToken(decodedText);
        },
        () => {
          // ignore scan frame ticks
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
      await api.post('/marketplace/handover/confirm/', {
        token: verifiedData.token
      });

      setIsCompleted(true);
      triggerConfetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.6 }
      });
      toast.success('Congratulations! Deal verified & completed successfully! 🎉', { duration: 5000 });

      const targetListingId = listingId || verifiedData?.listing_id;
      try {
        localStorage.setItem(
          'deal_completed_event',
          JSON.stringify({ listingId: targetListingId, timestamp: Date.now() })
        );
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('deal-completed', { detail: { listingId: targetListingId } }));
      emitTradeEvent(TRADE_ACTIONS.DEAL_COMPLETED, { listingId: targetListingId });

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

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={() => {
          stopScanner();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside
          className="w-screen max-w-full sm:w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-100 h-full"
          aria-label="Buyer Handover Scanner Drawer"
        >
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shadow-xs border border-brand-100 shrink-0">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Buyer Screen
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Verify & Complete</span>
                </div>
                <h2 className="text-base font-bold text-gray-900 truncate">
                  Complete Handover
                </h2>
              </div>
            </div>

            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-safe touch-momentum">
            {isCompleted ? (
              /* SUCCESS CELEBRATION SCREEN */
              <div className="py-10 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-500" /> Deal Completed
                  </span>
                  <h3 className="text-xl font-black text-gray-900">Purchase Verified! 🎉</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    You have successfully completed the handover for{' '}
                    <strong className="text-gray-800">{verifiedData?.listing_title}</strong>.
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 font-semibold inline-block">
                  Saved to your profile under:{' '}
                  <span className="font-black text-emerald-700">My Orders & Purchases</span>
                </div>
                <button
                  onClick={() => {
                    stopScanner();
                    onClose();
                  }}
                  className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : verifiedData ? (
              /* STEP 2: VERIFICATION CONFIRMATION SCREEN */
              <div className="space-y-5 animate-in fade-in">
                {/* Header Badge */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Handover Code Verified
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Confirm Physical Handover</h3>
                  <p className="text-xs text-gray-500">
                    Please verify the physical item and payment before completing.
                  </p>
                </div>

                {/* Product Summary Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {verifiedData.listing_image ? (
                      <img
                        src={verifiedData.listing_image}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
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
                        <span className="text-gray-600 truncate">
                          Seller: <strong>{verifiedData.seller_name}</strong>
                        </span>
                      </div>
                      {verifiedData.meetup_location && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{verifiedData.meetup_location}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Checkboxes */}
                <div className="space-y-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasInspected}
                      onChange={(e) => setHasInspected(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded text-brand-500 focus:ring-brand-400 accent-brand-500 shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-800 font-medium leading-relaxed">
                      I have physically met the seller and inspected the product condition.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={hasPaid}
                      onChange={(e) => setHasPaid(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded text-brand-500 focus:ring-brand-400 accent-brand-500 shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-800 font-medium leading-relaxed">
                      I have paid <strong className="text-gray-900">₹{verifiedData.listing_price}</strong> directly to {verifiedData.seller_name} (via UPI or Cash).
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={confirming || !hasInspected || !hasPaid}
                    className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {confirming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Finalizing Purchase...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Purchase & Mark as Sold</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setVerifiedData(null)}
                    className="w-full min-h-[38px] text-xs font-bold text-gray-500 hover:text-gray-800 py-1.5 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Back / Re-enter Code
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 1: SCAN QR OR ENTER PIN SCREEN */
              <div className="space-y-5">
                {/* Instructions banner */}
                <div className="bg-orange-50/60 border border-orange-200/60 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-gray-900">
                    Ask the seller to open their Handover QR code or tell you their 6-digit PIN.
                  </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                  <button
                    onClick={() => setActiveTab('pin')}
                    className={`flex-1 min-h-[40px] py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'pin'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>6-Digit PIN</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('scan')}
                    className={`flex-1 min-h-[40px] py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'scan'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan QR Code</span>
                  </button>
                </div>

                {/* TAB 1: Enter 6-digit PIN */}
                {activeTab === 'pin' && (
                  <div className="space-y-4 py-2">
                    <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={handlePaste}>
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
                          className="w-10 sm:w-12 h-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black bg-gray-50 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-2xs"
                        />
                      ))}
                    </div>

                    <p className="text-center text-xs text-gray-400 font-medium">
                      Enter the 6 numbers displayed on the seller's phone screen.
                    </p>

                    <button
                      onClick={() => verifyPin()}
                      disabled={verifying || pinDigits.some((d) => d === '')}
                      className="w-full min-h-[44px] bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {verifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verifying PIN...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Handover</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* TAB 2: Camera Viewfinder */}
                {activeTab === 'scan' && (
                  <div className="space-y-3">
                    {scannerError ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="text-xs text-amber-800 font-medium">{scannerError}</p>
                        <button
                          onClick={() => setActiveTab('pin')}
                          className="min-h-[40px] bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold text-xs px-4 py-2 rounded-lg shadow-2xs cursor-pointer"
                        >
                          Switch to PIN Entry
                        </button>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-black min-h-[240px] flex items-center justify-center">
                        <div id="handover-qr-reader" className="w-full"></div>
                        {verifying && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white space-y-2">
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs font-bold">Verifying scanned code...</p>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-center text-xs text-gray-400 font-medium">
                      Point camera directly at the seller's QR code.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0 pb-safe">
            <span className="text-[11px] text-gray-400">
              CampusXChange Handover
            </span>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
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
