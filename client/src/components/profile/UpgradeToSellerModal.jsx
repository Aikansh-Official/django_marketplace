import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import triggerConfetti from '../../utils/confetti';
import {
  X,
  Camera,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Upload,
  Store,
  BadgeCheck,
  AlertTriangle,
  ScanLine,
  ShieldCheck,
  RefreshCw,
  GraduationCap,
  Calendar,
  Activity,
  Sparkles
} from 'lucide-react';
import {
  extractLpuCardDetails,
  checkImageAuthenticity,
  preprocessImageForOcr
} from '../../utils/idCardVerification';
import { compressImageToDataUrl } from '../../utils/compressImage';
import { preloadVisionDetectors } from '../../utils/faceLivenessDetector';
import RegisterStepSelfie from '../auth/steps/RegisterStepSelfie';

export default function UpgradeToSellerModal({ isOpen, onClose, profile, onUpgradeSuccess }) {
  const [currentStep, setCurrentStep] = useState(1); // 1: ID Card, 2: Selfie, 3: Email OTP
  const [loading, setLoading] = useState(false);

  // Step 1: ID Card State
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [extractedCardData, setExtractedCardData] = useState(null);
  const [rejectionInfo, setRejectionInfo] = useState(null);
  const [verificationDetails, setVerificationDetails] = useState({
    regMatched: false,
    nameMatched: false,
    univMatched: false
  });
  const fileInputRef = useRef(null);

  // Step 2: Selfie State
  const [selfieImage, setSelfieImage] = useState(null);

  // Step 3: OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIdFrontImage(null);
      setIsIdVerified(false);
      setExtractedCardData(null);
      setRejectionInfo(null);
      setVerificationDetails({ regMatched: false, nameMatched: false, univMatched: false });
      setSelfieImage(null);
      setOtpCode('');
      setOtpSent(false);
      preloadVisionDetectors();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const storedUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Clean username: remove any leading @ symbol and trim
  const username = String(profile?.username || storedUser?.username || '').replace(/^@/, '').trim();
  const fullName = profile?.full_name || profile?.first_name || storedUser?.full_name || storedUser?.first_name || '';
  const email = profile?.email || storedUser?.email || '';

  if (!isOpen) return null;

  // Handle ID photo upload & compression
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image (JPG, PNG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdFrontImage(reader.result);
      setIsIdVerified(false);
      setExtractedCardData(null);
      setRejectionInfo(null);
      setVerificationDetails({ regMatched: false, nameMatched: false, univMatched: false });
      toast.success('ID photo loaded successfully.');
    };
    reader.onerror = () => {
      toast.error('Failed to read ID photo file.');
    };
    reader.readAsDataURL(file);
  };

  // Run OCR & authenticity verification
  const handleScanAndVerifyId = async () => {
    if (!idFrontImage) {
      toast.error('Please upload your student ID card photo first.');
      return;
    }

    setIsScanning(true);
    setScanProgress(10);
    setScanStatus('Scanning photo authenticity...');
    setRejectionInfo(null);

    try {
      // 1. Authenticity check
      const authenticityCheck = await checkImageAuthenticity(idFrontImage);
      if (!authenticityCheck.isAuthentic) {
        setRejectionInfo({ reason: authenticityCheck.reason });
        toast.error(authenticityCheck.reason, { duration: 5000 });
        setIsScanning(false);
        return;
      }

      setScanProgress(30);
      setScanStatus('Optimizing image for fast OCR...');

      // 2. High-speed, high-accuracy offscreen canvas preprocessing
      const ocrReadyImage = await preprocessImageForOcr(idFrontImage);

      setScanProgress(50);
      setScanStatus('Reading card text...');

      // 3. OCR recognition on preprocessed image (dynamically loaded on demand)
      const { default: Tesseract } = await import('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(ocrReadyImage, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const currentPct = 50 + Math.floor(m.progress * 45);
            setScanProgress(currentPct);
            setScanStatus(`Reading card text (${Math.floor(m.progress * 100)}%)...`);
          }
        },
      });

      setScanProgress(100);
      setScanStatus('Matching details...');

      // 4. Match against account
      const result = extractLpuCardDetails(text, username, fullName);

      setVerificationDetails({
        regMatched: Boolean(result.regMatched),
        nameMatched: Boolean(result.nameMatched),
        univMatched: Boolean(result.univMatched)
      });

      if (result.isValid) {
        setIsIdVerified(true);
        setExtractedCardData(result.extraData);
        setRejectionInfo(null);
        triggerConfetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
        toast.success(`ID Verified! Matched registration ${username}.`, { icon: '🎉' });
      } else {
        setIsIdVerified(false);
        setExtractedCardData(null);
        setRejectionInfo({ reason: result.reason });
        toast.error(result.reason);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      const errMsg = 'Could not read card clearly. Please upload a brighter, sharper photo.';
      toast.error(errMsg);
      setRejectionInfo({ reason: errMsg });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  // Send OTP for Step 3
  const handleSendOtp = async () => {
    if (!email) {
      toast.error('No email address associated with account.');
      return;
    }
    setOtpSending(true);
    try {
      await api.post('/auth/send-otp/', { email, purpose: 'upgrade' });
      setOtpSent(true);
      toast.success(`Verification code sent to ${email}`);
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.response?.data?.email?.[0] ||
        e.response?.data?.detail ||
        'Failed to send OTP code.';
      toast.error(msg);
    } finally {
      setOtpSending(false);
    }
  };

  // Transition to step 3 and trigger OTP
  const handleProceedToStep3 = async () => {
    if (!selfieImage) {
      toast.error('Please capture or upload your selfie photo first.');
      return;
    }
    setCurrentStep(3);
    if (!otpSent) {
      await handleSendOtp();
    }
  };

  // Final upgrade submission to backend
  const handleFinalUpgrade = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      let compressedForDb = idFrontImage;
      try {
        compressedForDb = await compressImageToDataUrl(idFrontImage, {
          maxWidth: 1000,
          maxHeight: 700,
          quality: 0.75,
        });
      } catch (compErr) {
        console.warn('Compression before upgrade failed, using original:', compErr);
      }

      const payload = {
        reg_no: username,
        id_card_image: compressedForDb,
        id_card_data: extractedCardData || {},
        profile_photo: selfieImage,
        otp: otpCode.trim()
      };

      const res = await api.post('/auth/upgrade-to-seller/', payload);

      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }

      toast.success('Congratulations! Your account is now upgraded to Verified Seller!', {
        icon: '🎉',
        duration: 5000
      });

      triggerConfetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 }
      });

      window.dispatchEvent(new Event('auth-changed'));
      if (onUpgradeSuccess) onUpgradeSuccess(res.data.user);
      onClose();
    } catch (err) {
      console.error('Upgrade Error:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.otp?.[0] ||
        err.response?.data?.detail ||
        'Upgrade failed. Please check your verification code.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Student ID Card' },
    { num: 2, label: 'Selfie Verification' },
    { num: 3, label: 'Email OTP' }
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/50 backdrop-blur-xs flex p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="m-auto w-full max-w-xl bg-white rounded-md shadow-2xl border border-gray-200 overflow-hidden relative my-6 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md p-1.5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight font-display">
                Upgrade to Verified Seller
              </h2>
              <p className="text-white/80 text-xs">
                Complete student verification to start selling campus items
              </p>
            </div>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {steps.map((item, idx) => {
              const isCompleted = currentStep > item.num;
              const isCurrent = currentStep === item.num;
              return (
                <React.Fragment key={item.num}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-brand-500 text-white ring-4 ring-brand-500/20 font-black'
                          : 'bg-gray-200 text-gray-400 font-medium'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.num}
                    </div>
                    <span
                      className={`text-[10px] sm:text-[11px] mt-1 font-bold tracking-tight text-center ${
                        isCurrent ? 'text-brand-600' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 -mt-4 transition-all ${
                        currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* ============================================================ */}
          {/* STEP 1: STUDENT ID CARD UPLOAD & SCAN */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900">
                  Upload Student ID Card
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ensure registration number <strong>{username}</strong> and your name are clearly visible.
                </p>
              </div>

              {/* ID Card Display / Dropzone */}
              {idFrontImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-md overflow-hidden border-2 border-gray-300 bg-gray-900/5 min-h-[200px] flex items-center justify-center p-2 shadow-inner group">
                    {/* Laser scanning animation */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-white text-center">
                        <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                          <ScanLine className="w-6 h-6 text-brand-400 animate-pulse" />
                          <div className="absolute inset-0 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="font-bold text-xs tracking-wide">{scanStatus}</div>
                        <div className="w-36 bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className="bg-brand-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-300 mt-1 font-mono">{scanProgress}%</span>
                      </div>
                    )}

                    <img
                      src={idFrontImage}
                      alt="Student ID Card Preview"
                      className="max-h-56 w-full object-contain rounded bg-white"
                    />

                    {isIdVerified && (
                      <div className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded shadow-md flex items-center gap-1 z-10">
                        <BadgeCheck className="w-4 h-4" />
                        ID Matched & Verified
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isScanning}
                      className="text-brand-600 hover:text-brand-700 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIdFrontImage(null);
                        setIsIdVerified(false);
                        setExtractedCardData(null);
                        setRejectionInfo(null);
                      }}
                      disabled={isScanning}
                      className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-md p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-brand-50/20 transition-all text-center min-h-[200px]"
                >
                  <div className="w-12 h-12 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-3 shadow-2xs border border-brand-100">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">
                    Click to upload front ID card photo
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">
                    JPG, PNG, or WEBP • Front side only • Max 5MB
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded border border-brand-200">
                    <Upload className="w-3 h-3" /> Browse from Device
                  </span>
                </label>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Details Cross-Matching Checklist */}
              <div className="bg-gray-50/90 border border-gray-200 rounded-md p-3.5 space-y-2.5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  Details Cross-Matching
                </span>

                {/* Registration No */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-700">Registration No:</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 text-[11px]">
                      {username}
                    </span>
                  </div>
                  {verificationDetails.regMatched ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Matched
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-200/70 px-2 py-0.5 rounded">
                      Pending Scan
                    </span>
                  )}
                </div>

                {/* Student Name */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-700">Student Name:</span>
                    <span className="font-bold text-gray-900">{fullName}</span>
                  </div>
                  {verificationDetails.nameMatched ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Matched
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-200/70 px-2 py-0.5 rounded">
                      Pending Scan
                    </span>
                  )}
                </div>

                {/* University */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-700">University:</span>
                    <span className="text-gray-900 font-medium">Lovely Professional University</span>
                  </div>
                  {verificationDetails.univMatched ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-200/70 px-2 py-0.5 rounded">
                      Pending Scan
                    </span>
                  )}
                </div>
              </div>

              {/* Extracted Card Badges */}
              {extractedCardData && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-3 space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Extracted Card Information
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {extractedCardData.program && (
                      <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5 col-span-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] text-gray-500 block">Program</span>
                          <strong className="text-gray-900 font-semibold">{extractedCardData.program}</strong>
                        </div>
                      </div>
                    )}
                    {extractedCardData.validity && (
                      <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] text-gray-500 block">Validity</span>
                          <strong className="text-gray-900 font-semibold">{extractedCardData.validity}</strong>
                        </div>
                      </div>
                    )}
                    {extractedCardData.bloodGroup && (
                      <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] text-gray-500 block">Blood Group</span>
                          <strong className="text-gray-900 font-semibold">{extractedCardData.bloodGroup}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Alert */}
              {rejectionInfo && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Verification Note:</strong>
                    <span>{rejectionInfo.reason}</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                {!isIdVerified ? (
                  <button
                    type="button"
                    onClick={handleScanAndVerifyId}
                    disabled={!idFrontImage || isScanning}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-md transition-all shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Details...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Scan & Verify ID Card</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-md transition-all shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                  >
                    <span>Proceed to Step 2: Selfie Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: LIVE SELFIE VERIFICATION */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <RegisterStepSelfie
                selfieImage={selfieImage}
                setSelfieImage={setSelfieImage}
                onProceed={handleProceedToStep3}
                onBack={() => setCurrentStep(1)}
              />
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: EMAIL OTP VERIFICATION & UPGRADE */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900">
                  Confirm With Email Code
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  6-digit security code sent to <strong className="text-gray-800">{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 text-center font-black tracking-[0.4em] text-2xl rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-300"
                  placeholder="••••••"
                  maxLength={6}
                />
              </div>

              <button
                type="button"
                onClick={handleFinalUpgrade}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-md transition-all shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Upgrading Account to Seller...</span>
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4" />
                    <span>Complete Upgrade & Become Seller</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Selfie
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || loading}
                  className="text-brand-600 hover:text-brand-700 font-bold hover:underline cursor-pointer disabled:opacity-50"
                >
                  {otpSending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
