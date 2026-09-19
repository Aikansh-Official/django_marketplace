import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import Tesseract from 'tesseract.js';
import {
  extractLpuCardDetails,
  checkImageAuthenticity,
  preprocessImageForOcr
} from '../../utils/idCardVerification';
import { compressImageToDataUrl } from '../../utils/compressImage';
import { preloadVisionDetectors } from '../../utils/faceLivenessDetector';
import { registerSchema } from './authSchemas';
import { ShieldAlert } from 'lucide-react';
import api, { getPlatformConfig } from '../../services/api';
import RegisterStepper from './RegisterStepper';
import RegisterStepDetails from './steps/RegisterStepDetails';
import RegisterStepIdCard from './steps/RegisterStepIdCard';
import RegisterStepSelfie from './steps/RegisterStepSelfie';
import RegisterStepOtp from './steps/RegisterStepOtp';
import RegisterStepPassword from './steps/RegisterStepPassword';

const baseZodResolver = zodResolver(registerSchema);

// Step-aware resolver: when specific fields are triggered, only report errors for those fields
const customResolver = async (values, context, options) => {
  const result = await baseZodResolver(values, context, options);
  if (options?.names && options.names.length > 0) {
    const filteredErrors = {};
    for (const name of options.names) {
      if (result.errors?.[name]) {
        filteredErrors[name] = result.errors[name];
      }
    }
    return {
      values: result.values,
      errors: filteredErrors,
    };
  }
  return result;
};

export default function RegisterForm({
  step,
  setStep,
  selectedRole: propSelectedRole,
  setSelectedRole: propSetSelectedRole,
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
  studentInfo,
  setStudentInfo,
  selfieImage: propSelfieImage,
  setSelfieImage: propSetSelfieImage,
  onSwitch,
  onSuccess
}) {
  const { register, handleSubmit, watch, setError, clearErrors, trigger, formState: { errors } } = useForm({
    resolver: customResolver,
    mode: 'onBlur',
    defaultValues: {
      full_name: '',
      username: '',
      phone_number: '',
      email: '',
      otp: '',
      password: '',
      password_confirm: '',
    },
  });

  // Role management
  const [internalRole, setInternalRole] = useState('BUYER');
  const selectedRole = propSelectedRole !== undefined ? propSelectedRole : internalRole;
  const setSelectedRole = propSetSelectedRole || setInternalRole;

  // Clear errors when switching steps so no premature validation errors linger
  useEffect(() => {
    clearErrors();
  }, [step, clearErrors]);

  // Preload MediaPipe face/hand models when seller is on ID card step (step 2)
  // so the scanner is ready by the time they reach the selfie step (step 3)
  useEffect(() => {
    if (selectedRole === 'SELLER' && step >= 2) {
      preloadVisionDetectors();
    }
  }, [selectedRole, step]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegAllowed, setIsRegAllowed] = useState(true);
  const [allowedDomains, setAllowedDomains] = useState('lpu.in');
  const [verificationDetails, setVerificationDetails] = useState({
    regMatched: false,
    nameMatched: false,
    univMatched: false
  });

  useEffect(() => {
    getPlatformConfig().then((cfg) => {
      if (cfg) {
        if (cfg.allow_registrations === false) {
          setIsRegAllowed(false);
        }
        if (cfg.allowed_domains) {
          setAllowedDomains(cfg.allowed_domains);
        }
      }
    }).catch(() => {});
  }, []);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [phoneStatus, setPhoneStatus] = useState('idle');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [internalSelfie, setInternalSelfie] = useState(null);
  const selfieImage = propSelfieImage !== undefined ? propSelfieImage : internalSelfie;
  const setSelfieImage = propSetSelfieImage || setInternalSelfie;
  const usernameValue = watch("username");
  const fullNameValue = watch("full_name");
  const phoneValue = watch("phone_number");
  const emailValue = watch("email");

  // Keep studentInfo synced with form values so parent AuthModal has access
  useEffect(() => {
    if (setStudentInfo) {
      setStudentInfo({
        fullName: fullNameValue || '',
        username: usernameValue || ''
      });
    }
  }, [fullNameValue, usernameValue, setStudentInfo]);

  // Live registration number availability check
  useEffect(() => {
    const trimmed = usernameValue ? String(usernameValue).trim() : '';
    if (!trimmed || trimmed.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const checkAvailability = async () => {
      setUsernameStatus('checking');
      try {
        const response = await api.get(`/auth/check-username/?username=${encodeURIComponent(trimmed)}`);
        if (response.data.available) {
          setUsernameStatus('available');
          clearErrors("username");
        } else {
          setUsernameStatus('taken');
          setError("username", { type: "manual", message: response.data.message || "This registration number is already registered" });
        }
      } catch (error) {
        console.error("Username check error:", error);
        setUsernameStatus('idle');
      }
    };

    const debounceTimer = setTimeout(() => { checkAvailability(); }, 300);
    return () => clearTimeout(debounceTimer);
  }, [usernameValue, setError, clearErrors]);

  // Live phone number availability check
  useEffect(() => {
    const trimmed = phoneValue ? String(phoneValue).trim() : '';
    if (!trimmed || trimmed.length < 10) {
      setPhoneStatus('idle');
      return;
    }

    const checkPhoneAvailability = async () => {
      setPhoneStatus('checking');
      try {
        const response = await api.get(`/auth/check-phone/?phone=${encodeURIComponent(trimmed)}`);
        if (response.data.available) {
          setPhoneStatus('available');
          clearErrors("phone_number");
        } else {
          setPhoneStatus('taken');
          setError("phone_number", { type: "manual", message: response.data.message || "This phone number is already registered" });
        }
      } catch (error) {
        console.error("Phone check error:", error);
        setPhoneStatus('idle');
      }
    };

    const debounceTimer = setTimeout(() => { checkPhoneAvailability(); }, 300);
    return () => clearTimeout(debounceTimer);
  }, [phoneValue, setError, clearErrors]);

  // Live email availability check
  useEffect(() => {
    const trimmed = emailValue ? String(emailValue).trim() : '';
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailStatus('idle');
      return;
    }

    const checkEmailAvailability = async () => {
      setEmailStatus('checking');
      try {
        const response = await api.get(`/auth/check-email/?email=${encodeURIComponent(trimmed)}`);
        if (response.data.available) {
          setEmailStatus('available');
          clearErrors("email");
        } else {
          setEmailStatus('taken');
          setError("email", { type: "manual", message: response.data.message || "This email address is already registered" });
        }
      } catch (error) {
        console.error("Email check error:", error);
        setEmailStatus('idle');
      }
    };

    const debounceTimer = setTimeout(() => { checkEmailAvailability(); }, 300);
    return () => clearTimeout(debounceTimer);
  }, [emailValue, setError, clearErrors]);

  // Handle Step 1 proceed with strict server-side uniqueness check
  const handleProceedFromDetails = async () => {
    const isValid = await trigger(['full_name', 'username', 'phone_number', 'email']);
    if (!isValid) return;

    if (usernameStatus === 'taken' || phoneStatus === 'taken' || emailStatus === 'taken') {
      toast.error('Please fix the duplicate or already registered fields before continuing.');
      return;
    }

    setIsLoading(true);
    try {
      // Pre-flight check against database before advancing to Step 2
      const res = await api.post('/auth/check-availability/', {
        username: usernameValue ? String(usernameValue).trim() : '',
        phone: phoneValue ? String(phoneValue).trim() : '',
        email: emailValue ? String(emailValue).trim() : '',
      });

      if (!res.data.available) {
        const errs = res.data.errors || {};
        let hasError = false;

        if (errs.username) {
          setUsernameStatus('taken');
          setError('username', { type: 'manual', message: errs.username });
          toast.error(errs.username);
          hasError = true;
        }
        if (errs.phone_number) {
          setPhoneStatus('taken');
          setError('phone_number', { type: 'manual', message: errs.phone_number });
          toast.error(errs.phone_number);
          hasError = true;
        }
        if (errs.email) {
          setEmailStatus('taken');
          setError('email', { type: 'manual', message: errs.email });
          toast.error(errs.email);
          hasError = true;
        }

        if (hasError) {
          setIsLoading(false);
          return;
        }
      }

      setUsernameStatus('available');
      setPhoneStatus('available');
      setEmailStatus('available');
    } catch (err) {
      console.error('Availability check failed:', err);
    } finally {
      setIsLoading(false);
    }

    if (setStudentInfo) {
      setStudentInfo({
        fullName: fullNameValue || '',
        username: usernameValue || ''
      });
    }

    if (selectedRole === 'BUYER') {
      // For Buyer: Skip ID Card verification and proceed directly to Email OTP (step 2 for Buyer)
      await handleProceedToOtp(2);
    } else {
      // For Seller: Proceed to ID Card verification (step 2 for Seller)
      setStep(2);
    }
  };

  // Step 2 (Seller): Intelligent OCR verification of ID Card
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

      setScanProgress(30);
      setScanStatus('Optimizing image for fast OCR...');

      // 2. High Accuracy Optical Character Recognition (OCR) with canvas optimization
      const ocrReadyImage = await preprocessImageForOcr(idFrontImage);

      setScanProgress(50);
      setScanStatus('Reading card text...');

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
      setScanStatus('Verifying...');

      // 3. Multi-Anchor LPU Validation & Field Extraction
      const result = extractLpuCardDetails(text, usernameValue, fullNameValue);

      setVerificationDetails({
        regMatched: Boolean(result.regMatched),
        nameMatched: Boolean(result.nameMatched),
        univMatched: Boolean(result.univMatched)
      });

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

  // Trigger Email OTP and advance to target step
  // Seller: proceed from selfie (step 3) to OTP (step 4)
  const handleProceedToOtp = async (targetStep = 4) => {
    setIsLoading(true);
    try {
      await api.post('/auth/send-otp/', { email: emailValue });
      toast.success(`Verification code sent to ${emailValue}!`);
      setStep(targetStep);
    } catch (e) {
      const errMsg = e.response?.data?.error || e.response?.data?.email?.[0] || e.response?.data?.detail || "Failed to send OTP.";
      toast.error(errMsg);
    }
    setIsLoading(false);
  };

  // Skip ID card for now (switches to Buyer mode)
  const handleSkipIdVerification = async () => {
    setIsIdVerified(false);
    setIdFrontImage(null);
    setExtractedCardData(null);
    setSelectedRole('BUYER');
    await handleProceedToOtp(2);
  };

  // Verify Email OTP
  const handleVerifyOTP = async () => {
    const isValid = await trigger(['otp']);
    if (!isValid) return;

    setIsLoading(true);
    try {
      await api.post('/auth/verify-otp/', {
        email: emailValue,
        otp: watch('otp')
      });
      toast.success("Email verified successfully!");
      // For Buyer: next is step 3 (Password). For Seller: next is step 5 (Password).
      setStep(selectedRole === 'BUYER' ? 3 : 5);
    } catch (e) {
      toast.error(e.response?.data?.error || "Invalid OTP");
    }
    setIsLoading(false);
  };

  // Final Account Creation Submit
  const onSubmit = async (data) => {
    const finalStep = selectedRole === 'BUYER' ? 3 : 5;
    if (step !== finalStep) return;
    if (usernameStatus === 'taken') return;

    setIsLoading(true);
    try {
      // Compress verified ID card image right before saving to DB
      let compressedIdCardImage = null;
      if (selectedRole === 'SELLER' && isIdVerified && idFrontImage) {
        try {
          compressedIdCardImage = await compressImageToDataUrl(idFrontImage, {
            maxWidth: 1000,
            maxHeight: 700,
            quality: 0.75,
          });
        } catch (compErr) {
          console.warn('ID compression failed before upload, using original:', compErr);
          compressedIdCardImage = idFrontImage;
        }
      }

      // Include compressed verified ID card image, card data, and selfie profile photo if seller
      const payload = {
        ...data,
        role: selectedRole,
        id_card_image: compressedIdCardImage,
        id_card_data: selectedRole === 'SELLER' && isIdVerified && extractedCardData ? extractedCardData : {},
        profile_photo: selectedRole === 'SELLER' && selfieImage ? selfieImage : null
      };

      await api.post('/auth/register/', payload);

      // Auto login after successful registration
      const loginResponse = await api.post('/auth/login/', {
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

      toast.success(
        selectedRole === 'BUYER'
          ? 'Welcome to CampusXChange! Buyer account created successfully.'
          : 'Welcome to CampusXChange! Verified Seller account created successfully.'
      );
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

  // Handle form submission safely across multi-step flow
  const handleFormSubmit = (e) => {
    const finalStep = selectedRole === 'BUYER' ? 3 : 5;
    if (step !== finalStep) {
      e.preventDefault();
      if (step === 1) {
        handleProceedFromDetails();
      } else if ((selectedRole === 'BUYER' && step === 2) || (selectedRole === 'SELLER' && step === 4)) {
        handleVerifyOTP();
      }
      return;
    }
    handleSubmit(onSubmit)(e);
  };

  if (!isRegAllowed) {
    return (
      <div className="w-full max-w-sm sm:max-w-md mx-auto py-8 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Registrations Temporarily Closed</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
          New student account registrations are temporarily paused by campus administration for scheduled maintenance. If you already have an account, please sign in.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onSwitch}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
          >
            Switch to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* Top Multi-Step Progress Indicator */}
      <RegisterStepper step={step} role={selectedRole} />

      <form className="space-y-4" onSubmit={handleFormSubmit}>
        {/* STEP 1: BASIC STUDENT DETAILS */}
        {step === 1 && (
          <RegisterStepDetails
            register={register}
            errors={errors}
            usernameStatus={usernameStatus}
            phoneStatus={phoneStatus}
            emailStatus={emailStatus}
            isLoading={isLoading}
            onProceed={handleProceedFromDetails}
            role={selectedRole}
            allowedDomains={allowedDomains}
            onRoleChange={(newRole) => {
              setSelectedRole(newRole);
              setStep(1);
            }}
          />
        )}

        {/* STEP 2 FOR SELLER ONLY: STUDENT ID CARD UPLOAD & OCR VERIFICATION */}
        {selectedRole === 'SELLER' && step === 2 && (
          <RegisterStepIdCard
            usernameValue={usernameValue}
            fullNameValue={fullNameValue}
            idFrontImage={idFrontImage}
            setIdFrontImage={setIdFrontImage}
            isIdVerified={isIdVerified}
            setIsIdVerified={setIsIdVerified}
            isScanning={isScanning}
            isLoading={isLoading}
            extractedCardData={extractedCardData}
            rejectionInfo={rejectionInfo}
            verificationDetails={verificationDetails}
            onScanAndVerify={handleScanAndVerifyId}
            onProceedToOtp={() => setStep(3)}
            onBack={() => setStep(1)}
            onSkip={handleSkipIdVerification}
          />
        )}

        {/* STEP 3 FOR SELLER ONLY: SELFIE CAPTURE */}
        {selectedRole === 'SELLER' && step === 3 && (
          <RegisterStepSelfie
            selfieImage={selfieImage}
            setSelfieImage={setSelfieImage}
            onProceed={() => handleProceedToOtp(4)}
            onBack={() => setStep(2)}
          />
        )}

        {/* EMAIL OTP VERIFICATION: Step 2 for Buyer, Step 4 for Seller */}
        {((selectedRole === 'BUYER' && step === 2) || (selectedRole === 'SELLER' && step === 4)) && (
          <RegisterStepOtp
            register={register}
            errors={errors}
            emailValue={emailValue}
            isLoading={isLoading}
            onVerifyOtp={handleVerifyOTP}
            onResendOtp={() => handleProceedToOtp(selectedRole === 'BUYER' ? 2 : 4)}
            onBack={() => setStep(selectedRole === 'BUYER' ? 1 : 3)}
            role={selectedRole}
          />
        )}

        {/* PASSWORD SETUP & FINISH: Step 3 for Buyer, Step 5 for Seller */}
        {((selectedRole === 'BUYER' && step === 3) || (selectedRole === 'SELLER' && step === 5)) && (
          <RegisterStepPassword
            register={register}
            errors={errors}
            showRegPassword={showRegPassword}
            setShowRegPassword={setShowRegPassword}
            isLoading={isLoading}
          />
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
