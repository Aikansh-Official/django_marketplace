import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import Tesseract from 'tesseract.js';
import {
  X,
  Loader2,
  Check,
  GraduationCap,
  Upload,
  Camera,
  ShieldCheck,
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ScanLine,
  FileText,
  UserCheck,
  User,
  Phone,
  Mail,
  KeyRound,
  Lock,
  Calendar,
  Activity,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  MapPin
} from 'lucide-react';
import { checkImageAuthenticity, extractLpuCardDetails } from '../utils/idCardVerification';
import logoImg from '../assets/LPXchange_Logo.jpeg';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const loginSchema = z.object({
  username: z.string().regex(/^\d{8}$/, { message: 'Enter your 8-digit registration number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const registerSchema = z.object({
  full_name: z.string().min(3, { message: 'Name must be at least 3 characters' }).max(50, { message: 'Name cannot exceed 50 characters' }),
  username: z.string().regex(/^\d{8}$/, { message: 'Registration number must be exactly 8 digits' }),
  phone_number: z.string().regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  email: z.string().email({ message: 'Must be a valid email' }).regex(/@gmail\.com$/i, { message: 'Only @gmail.com emails are allowed' }),
  otp: z.string().optional(),
  password: z.string()
    .min(8, { message: 'Must be at least 8 characters' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character' }),
  password_confirm: z.string().min(1, { message: 'Please confirm your password' }),
}).refine((data) => {
  return data.password === data.password_confirm;
}, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

  // Shared register verification state across left panel and right form
  const [registerStep, setRegisterStep] = useState(1);
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [extractedCardData, setExtractedCardData] = useState(null);
  const [rejectionInfo, setRejectionInfo] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRegisterStep(1);
      setIdFrontImage(null);
      setIsIdVerified(false);
      setExtractedCardData(null);
      setRejectionInfo(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialMode]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid photo (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size allowed is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdFrontImage(reader.result);
      setIsIdVerified(false);
      setExtractedCardData(null);
      setRejectionInfo(null);
      toast.success('ID photo loaded in preview.');
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-900/60 backdrop-blur-sm">
      <style>{`
        @keyframes scanline {
          0% { top: 6%; opacity: 0.9; }
          50% { top: 88%; opacity: 1; }
          100% { top: 6%; opacity: 0.9; }
        }
        .laser-scanline-anim {
          animation: scanline 2.2s ease-in-out infinite;
        }
      `}</style>

      <div className="flex min-h-full p-3 sm:p-6">
        <div className="m-auto w-full max-w-4xl bg-white rounded-md shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">

          {/* LEFT SIDE: Clean Brand Showcase */}
          <div className="hidden md:flex md:w-5/12 relative flex-col justify-center overflow-hidden">
            {mode === 'login' || registerStep === 1 ? (
              /* CLEAN, SIMPLE & PROMINENT BRANDING FOR LOGIN & REGISTER STEP 1 */
              <div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-600 p-8 sm:p-10 flex flex-col justify-center items-center text-center text-white">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-md bg-white p-1.5 shadow-md mb-4 flex items-center justify-center">
                    <img src={logoImg} alt="LPXchange Logo" className="w-full h-full object-cover rounded" />
                  </div>

                  <div className="flex items-baseline">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">LP</span>
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-brand-100 font-display">Xchange</span>
                  </div>

                  <p className="text-white/90 text-sm mt-3 max-w-[260px] leading-relaxed">
                    Campus marketplace exclusively for students of Lovely Professional University.
                  </p>

                  <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/15 text-white text-xs font-semibold border border-white/25 shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>100% Student Verified Platform</span>
                  </div>
                </div>
              </div>
            ) : registerStep === 2 ? (
              /* REGISTER STEP 2: Dedicated ID Card Upload Dropzone & Live Scanner Viewport */
              <div className="h-full w-full bg-gray-50 border-r border-gray-200 p-6 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-2xs">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                          Student ID Scanner
                        </h3>
                        <p className="text-[10px] text-gray-500">Front side photo inspection</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      Front Side Only
                    </span>
                  </div>

                  {/* ID Card Display Viewport / Dropzone */}
                  {idFrontImage ? (
                    <div className="space-y-3">
                      <div className="relative rounded-md overflow-hidden border-2 border-gray-300 bg-gray-900/5 min-h-[240px] flex items-center justify-center p-2 shadow-xs group">
                        {/* Laser Scan Line Animation during OCR */}
                        {isScanning && (
                          <>
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-white text-center">
                              <div className="relative w-14 h-14 flex items-center justify-center mb-2">
                                <ScanLine className="w-8 h-8 text-brand-400 animate-pulse" />
                                <div className="absolute inset-0 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <div className="font-bold text-xs tracking-wide">{scanStatus}</div>
                              <div className="w-40 bg-white/20 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                <div
                                  className="bg-brand-400 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${scanProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-200 mt-1 font-mono">{scanProgress}%</span>
                            </div>

                            {/* Active traversing laser beam */}
                            <div className="laser-scanline-anim absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_12px_#f97316] z-10 pointer-events-none" />
                          </>
                        )}

                        <img
                          src={idFrontImage}
                          alt="LPU Student ID Card Preview"
                          className="max-h-64 w-full object-contain rounded bg-white"
                        />

                        {isIdVerified && (
                          <div className="absolute bottom-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm flex items-center gap-1 z-10">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Verified Front
                          </div>
                        )}
                      </div>

                      {/* Photo Control Actions */}
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
                          className="text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty Upload Dropzone */
                    <label
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-md p-8 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-brand-50/20 transition-all group shadow-2xs min-h-[240px] text-center"
                    >
                      <div className="w-12 h-12 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-2xs border border-brand-100">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        Click to select or drop ID card photo
                      </span>
                      <span className="text-[11px] text-gray-400 mt-1 max-w-xs">
                        JPG, PNG, or WEBP • Front side only • Max 5MB
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded border border-brand-200">
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
                </div>

                {/* Left Side Helper Guide */}
                <div className="bg-white border border-gray-200 rounded-md p-3 text-[11px] text-gray-600 space-y-1 mt-4 shadow-2xs">
                  <span className="font-bold text-gray-900 block text-[10px] uppercase tracking-wider text-brand-600">
                    ID Photo Tips
                  </span>
                  <p className="leading-snug">
                    • Capture entire horizontal ID card under good lighting.<br />
                    • Make sure 8-digit Registration Number and Student Name are clearly legible without glare.
                  </p>
                </div>
              </div>
            ) : (
              /* REGISTER STEP 3 & 4: Simple & Clean Verified ID Preview */
              <div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-600 p-8 flex flex-col justify-center items-center text-center text-white">
                <div className="flex flex-col items-center w-full max-w-[280px]">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/25 mb-3 shadow-2xs">
                    <BadgeCheck className="w-4 h-4 text-white" />
                    <span>ID Verified</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
                    Student ID Verified
                  </h3>
                  <p className="text-white/85 text-xs mt-1 mb-4">
                    Credentials matched successfully
                  </p>

                  {/* ID Card Display Card */}
                  {idFrontImage && (
                    <div className="w-full rounded-md overflow-hidden bg-white p-1.5 shadow-md border border-white/20 mb-4">
                      <img
                        src={idFrontImage}
                        alt="Verified Student ID"
                        className="max-h-44 w-full object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Clean Student Info */}
                  <div className="w-full py-2.5 px-4 rounded-md bg-white/10 border border-white/20 text-white text-xs">
                    <p className="font-bold text-sm">{fullNameValue || 'Student'}</p>
                    <p className="text-white/80 font-mono text-xs mt-0.5">Reg No: {usernameValue}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Form Content & Multi-Step Flow */}
          <div className="w-full md:w-7/12 relative flex flex-col bg-white">

            {/* Header with Close Button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md p-2 transition-all cursor-pointer shadow-2xs"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-8 sm:px-12 py-10 sm:py-12 flex-grow flex flex-col justify-center">
              {mode === 'login' ? (
                <LoginForm
                  onSwitch={() => setMode('register')}
                  onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                />
              ) : (
                <RegisterForm
                  step={registerStep}
                  setStep={setRegisterStep}
                  idFrontImage={idFrontImage}
                  setIdFrontImage={setIdFrontImage}
                  isScanning={isScanning}
                  setIsScanning={setIsScanning}
                  scanProgress={scanProgress}
                  setScanProgress={setScanProgress}
                  scanStatus={scanStatus}
                  setScanStatus={setScanStatus}
                  isIdVerified={isIdVerified}
                  setIsIdVerified={setIsIdVerified}
                  extractedCardData={extractedCardData}
                  setExtractedCardData={setExtractedCardData}
                  rejectionInfo={rejectionInfo}
                  setRejectionInfo={setRejectionInfo}
                  onSwitch={() => setMode('login')}
                  onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch, onSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login/`, data);
      if (response.data.access) {
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
      }
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      toast.success('Successfully logged in!');
      onSuccess();
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in with your student registration number</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Registration Number
            </label>
            <span className="text-xs font-medium text-gray-400">8 digits</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              {...register('username')}
              className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-semibold rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 placeholder:font-normal"
              placeholder="e.g. 12200000"
            />
          </div>
          {errors.username && <p className="text-red-500 text-xs font-medium mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-xs font-medium text-gray-500">
        Don't have an account?{' '}
        <button
          onClick={onSwitch}
          type="button"
          className="text-brand-600 hover:text-brand-700 font-bold hover:underline cursor-pointer"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}

function RegisterForm({
  step,
  setStep,
  idFrontImage,
  setIdFrontImage,
  isScanning,
  setIsScanning,
  scanProgress,
  setScanProgress,
  scanStatus,
  setScanStatus,
  isIdVerified,
  setIsIdVerified,
  extractedCardData,
  setExtractedCardData,
  rejectionInfo,
  setRejectionInfo,
  onSwitch,
  onSuccess
}) {
  const { register, handleSubmit, watch, setError, clearErrors, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameValue = watch("username");
  const fullNameValue = watch("full_name");
  const emailValue = watch("email");

  // Live registration number availability check
  useEffect(() => {
    if (!usernameValue || usernameValue.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const checkAvailability = async () => {
      setUsernameStatus('checking');
      try {
        const response = await axios.get(`${API_BASE}/auth/check-username/?username=${usernameValue}`);
        if (response.data.available) {
          setUsernameStatus('available');
          clearErrors("username");
        } else {
          setUsernameStatus('taken');
          setError("username", { type: "manual", message: "This registration number is already registered" });
        }
      } catch (error) {
        setUsernameStatus('idle');
      }
    };

    const debounceTimer = setTimeout(() => { checkAvailability(); }, 400);
    return () => clearTimeout(debounceTimer);
  }, [usernameValue, setError, clearErrors]);

  // Step 1 -> Step 2: Validate fields & proceed to ID verification
  const handleProceedToIdVerification = async () => {
    const isValid = await trigger(['full_name', 'username', 'phone_number', 'email']);
    if (!isValid || usernameStatus === 'taken' || usernameStatus === 'checking') return;
    setStep(2);
  };

  // Step 2: Intelligent OCR verification of ID Card
  const handleScanAndVerifyId = async () => {
    if (!idFrontImage) {
      toast.error('Please upload your physical student ID card photo first.');
      return;
    }

    setIsScanning(true);
    setScanProgress(10);
    setScanStatus('Scanning...');
    setRejectionInfo(null);

    try {
      // 1. Client-Side Document Authenticity & Spoof Filter
      const authenticityCheck = await checkImageAuthenticity(idFrontImage);
      if (!authenticityCheck.isAuthentic) {
        setRejectionInfo({ reason: authenticityCheck.reason });
        toast.error(authenticityCheck.reason, { duration: 5000 });
        setIsScanning(false);
        setScanProgress(0);
        setScanStatus('');
        return;
      }

      setScanProgress(20);
      setScanStatus('Scanning...');

      // 2. Optical Character Recognition via Tesseract
      const { data: { text } } = await Tesseract.recognize(idFrontImage, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            setScanProgress(Math.max(20, pct));
            setScanStatus(`Scanning (${pct}%)...`);
          } else if (m.status) {
            setScanStatus('Scanning...');
          }
        }
      });

      setScanProgress(100);
      setScanStatus('Verifying...');

      // 3. Multi-Anchor LPU Validation & Field Extraction
      const result = extractLpuCardDetails(text, usernameValue, fullNameValue);

      if (result.isValid) {
        // MATCH SUCCESSFUL!
        setIsIdVerified(true);
        setExtractedCardData(result.extraData);
        setRejectionInfo(null);

        try {
          confetti({
            particleCount: 90,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10b981', '#f97316', '#3b82f6', '#eab308']
          });
        } catch { }

        toast.success(
          `ID Verified! Registration ${usernameValue} & details matched successfully!`,
          { icon: '🎉', duration: 4000 }
        );
      } else {
        // REJECTION
        setIsIdVerified(false);
        setExtractedCardData(null);
        setRejectionInfo({ reason: result.reason });
        toast.error(result.reason);
      }
    } catch (ocrErr) {
      console.error('OCR Error:', ocrErr);
      const errMsg = 'Could not read ID card. Please upload a clearer photo.';
      toast.error(errMsg);
      setRejectionInfo({ reason: errMsg });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  // Step 2 -> Step 3: Trigger Email OTP and advance
  const handleProceedToOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/send-otp/`, { email: emailValue });
      toast.success(`Verification code sent to ${emailValue}!`);
      setStep(3);
    } catch (e) {
      const errMsg = e.response?.data?.error || e.response?.data?.email?.[0] || e.response?.data?.detail || "Failed to send OTP.";
      toast.error(errMsg);
    }
    setIsLoading(false);
  };

  // Skip ID card for now (verify later in profile)
  const handleSkipIdVerification = async () => {
    setIsIdVerified(false);
    setIdFrontImage(null);
    setExtractedCardData(null);
    await handleProceedToOtp();
  };

  // Step 3: Verify Email OTP
  const handleVerifyOTP = async () => {
    const isValid = await trigger(['otp']);
    if (!isValid) return;

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/verify-otp/`, {
        email: emailValue,
        otp: watch('otp')
      });
      toast.success("Email verified successfully!");
      setStep(4);
    } catch (e) {
      toast.error(e.response?.data?.error || "Invalid OTP");
    }
    setIsLoading(false);
  };

  // Step 4: Final Account Creation Submit
  const onSubmit = async (data) => {
    if (step !== 4) return;
    if (usernameStatus === 'taken') return;

    setIsLoading(true);
    try {
      // Include verified ID card image and structured extra card data if available
      const payload = {
        ...data,
        id_card_image: isIdVerified && idFrontImage ? idFrontImage : null,
        id_card_data: isIdVerified && extractedCardData ? extractedCardData : {}
      };

      await axios.post(`${API_BASE}/auth/register/`, payload);

      // Auto login after successful registration
      const loginResponse = await axios.post(`${API_BASE}/auth/login/`, {
        username: data.username,
        password: data.password
      });

      if (loginResponse.data.access) {
        localStorage.setItem('access', loginResponse.data.access);
        localStorage.setItem('refresh', loginResponse.data.refresh);
      }
      if (loginResponse.data.user) {
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
      }

      toast.success('Registration successful! Automatically logged in with verified credentials.');
      onSuccess();
      window.location.reload();
    } catch (error) {
      if (error.response?.data) {
        const errorsData = error.response.data;
        let handled = false;
        ['username', 'email', 'phone_number', 'password'].forEach(field => {
          if (errorsData[field]) {
            setError(field, { type: 'manual', message: errorsData[field][0] });
            handled = true;
          }
        });
        if (!handled) toast.error(errorsData.detail || 'Registration failed.');
      } else {
        toast.error('An unexpected error occurred during registration.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* TOP MULTI-STEP PROGRESS INDICATOR */}
      <div className="mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {[
            { num: 1, label: 'Details' },
            { num: 2, label: 'ID Card' },
            { num: 3, label: 'Verify OTP' },
            { num: 4, label: 'Password' }
          ].map((item, idx) => {
            const isCompleted = step > item.num;
            const isCurrent = step === item.num;
            return (
              <React.Fragment key={item.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                        ? 'bg-brand-500 text-white ring-4 ring-brand-500/20 font-black'
                        : 'bg-gray-100 text-gray-400 font-medium'
                      }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : item.num}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-bold tracking-tight ${isCurrent ? 'text-brand-600' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                      }`}
                  >
                    {item.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-5 transition-all ${step > idx + 1 ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

        {/* STEP 1: BASIC STUDENT DETAILS */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="mb-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
                Create Student Account
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter your student information to get started
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Name (as on ID card)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  {...register('full_name')}
                  maxLength={50}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="e.g. Anshu"
                />
              </div>
              {errors.full_name && <p className="text-red-500 text-xs font-medium mt-1">{errors.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Registration Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    {...register('username')}
                    className={`w-full border text-gray-900 font-medium rounded-md pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-brand-500 transition-all placeholder:text-gray-400 ${usernameStatus === 'taken'
                      ? 'bg-red-50/80 border-red-200 focus:ring-red-500/20'
                      : usernameStatus === 'available'
                        ? 'bg-emerald-50/80 border-emerald-200 focus:ring-emerald-500/20'
                        : 'bg-gray-50/80 hover:bg-white focus:bg-white border-gray-200 focus:ring-brand-500/20'
                      }`}
                    placeholder="e.g. 12345678"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                    {usernameStatus === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
                    {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {errors.username && <p className="text-red-500 text-xs font-medium mt-1">{errors.username.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    {...register('phone_number')}
                    className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                    placeholder="10-digit phone"
                  />
                </div>
                {errors.phone_number && <p className="text-red-500 text-xs font-medium mt-1">{errors.phone_number.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="yourname@gmail.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>}
            </div>

            <button
              type="button"
              onClick={handleProceedToIdVerification}
              disabled={usernameStatus === 'checking' || usernameStatus === 'taken'}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Step 2: ID Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: STUDENT ID CARD UPLOAD & INTELLIGENT OCR VERIFICATION */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="mb-2 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-display flex items-center justify-center gap-2">
                Verify Student ID Card
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload your front student ID card photo to verify your registration details
              </p>
            </div>

            {/* Mobile-Only ID Card Upload Area (Rendered only on < md screens) */}
            <div className="md:hidden">
              <label className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <Camera className="w-6 h-6 text-brand-500 mb-1" />
                <span className="text-xs font-bold text-gray-800">
                  {idFrontImage ? 'Change ID Card Photo' : 'Upload Front ID Photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setIdFrontImage(reader.result);
                        setIsIdVerified(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
              {idFrontImage && (
                <div className="mt-2 rounded border border-gray-200 p-1 bg-white">
                  <img src={idFrontImage} alt="ID Preview" className="max-h-36 mx-auto object-contain" />
                </div>
              )}
            </div>

            {/* Verification Checklist */}
            <div className="bg-gray-50/80 border border-gray-200 rounded-md p-4 space-y-3">
              <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider block">
                Details Cross-Matching
              </span>

              {/* Reg Number Match */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">Registration No:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">
                    {usernameValue}
                  </span>
                </div>
                {isIdVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <Check className="w-3.5 h-3.5" /> Matched
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-400 bg-gray-200/70 px-2 py-0.5 rounded">
                    Pending Scan
                  </span>
                )}
              </div>

              {/* Student Name Match */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200/60">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">Student Name:</span>
                  <span className="font-bold text-gray-900">{fullNameValue}</span>
                </div>
                {isIdVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <Check className="w-3.5 h-3.5" /> Matched
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-400 bg-gray-200/70 px-2 py-0.5 rounded">
                    Pending Scan
                  </span>
                )}
              </div>

              {/* University Branding */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200/60">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">University:</span>
                  <span className="text-gray-900 font-medium">Lovely Professional University</span>
                </div>
                {isIdVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <Check className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-400 bg-gray-200/70 px-2 py-0.5 rounded">
                    Pending Scan
                  </span>
                )}
              </div>
            </div>

            {/* Extracted Extra Card Data Badges */}
            {extractedCardData && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Extracted Card Information
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {extractedCardData.program && (
                    <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5 col-span-2">
                      <GraduationCap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-gray-700 font-medium truncate">
                        <strong className="text-gray-900">Program:</strong> {extractedCardData.program}
                      </span>
                    </div>
                  )}
                  {extractedCardData.validity && (
                    <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">
                        <strong className="text-gray-900">Valid:</strong> {extractedCardData.validity}
                      </span>
                    </div>
                  )}
                  {extractedCardData.bloodGroup && (
                    <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">
                        <strong className="text-gray-900">Blood:</strong> {extractedCardData.bloodGroup}
                      </span>
                    </div>
                  )}
                  {extractedCardData.batch && (
                    <div className="bg-white/80 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">
                        <strong className="text-gray-900">Batch:</strong> {extractedCardData.batch}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rejection Alert - Clean One Line */}
            {rejectionInfo && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5 text-xs text-red-700 flex items-center gap-2 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="font-semibold">{rejectionInfo.reason}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {!isIdVerified ? (
                <button
                  type="button"
                  onClick={handleScanAndVerifyId}
                  disabled={isScanning || !idFrontImage}
                  className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning & Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      <span>{idFrontImage ? 'Scan & Verify Details' : 'Upload ID on Left to Verify'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToOtp}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Proceed to Step 3: Verify Email OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit Details
                </button>

                <button
                  type="button"
                  onClick={handleSkipIdVerification}
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
                >
                  Skip for now (verify in profile)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: EMAIL OTP VERIFICATION */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="mb-3 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
                Enter Verification Code
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                6-digit code sent to <strong className="text-gray-800 font-semibold">{emailValue}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                {...register('otp')}
                className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 text-center font-black tracking-[0.4em] text-2xl rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-300"
                placeholder="••••••"
                maxLength={6}
              />
              {errors.otp && <p className="text-red-500 text-xs font-medium mt-1 text-center">{errors.otp.message}</p>}
            </div>

            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to ID Card
              </button>
              <button
                type="button"
                onClick={handleProceedToOtp}
                disabled={isLoading}
                className="text-brand-600 hover:text-brand-700 font-bold hover:underline cursor-pointer"
              >
                Resend Code
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PASSWORD SETUP & REGISTRATION FINISH */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="mb-3 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
                Set Your Password
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Create a secure password for your student account
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    {...register('password_confirm')}
                    className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                    placeholder="Re-enter password"
                  />
                </div>
                {errors.password_confirm && <p className="text-red-500 text-xs font-medium mt-1">{errors.password_confirm.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Registration & Sign In</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>

      <div className="mt-5 text-center text-xs font-medium text-gray-500">
        Already have an account?{' '}
        <button
          onClick={onSwitch}
          type="button"
          className="text-brand-600 hover:text-brand-700 font-bold hover:underline cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
