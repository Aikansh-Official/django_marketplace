import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import Tesseract from 'tesseract.js';
import { checkImageAuthenticity, extractLpuCardDetails } from '../../utils/idCardVerification';
import { registerSchema } from './authSchemas';
import RegisterStepper from './RegisterStepper';
import RegisterStepDetails from './steps/RegisterStepDetails';
import RegisterStepIdCard from './steps/RegisterStepIdCard';
import RegisterStepOtp from './steps/RegisterStepOtp';
import RegisterStepPassword from './steps/RegisterStepPassword';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function RegisterForm({
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
  studentInfo,
  setStudentInfo,
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
    if (setStudentInfo) {
      setStudentInfo({
        fullName: fullNameValue || '',
        username: usernameValue || ''
      });
    }
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

      setScanProgress(40);
      setScanStatus('Reading card text...');

      // 2. High Accuracy Optical Character Recognition (OCR)
      const { data: { text } } = await Tesseract.recognize(idFrontImage, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const currentPct = 40 + Math.floor(m.progress * 55);
            setScanProgress(currentPct);
            setScanStatus(`Reading card text (${Math.floor(m.progress * 100)}%)...`);
          }
        },
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
      {/* Top Multi-Step Progress Indicator */}
      <RegisterStepper step={step} />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* STEP 1: BASIC STUDENT DETAILS */}
        {step === 1 && (
          <RegisterStepDetails
            register={register}
            errors={errors}
            usernameStatus={usernameStatus}
            onProceed={handleProceedToIdVerification}
          />
        )}

        {/* STEP 2: STUDENT ID CARD UPLOAD & OCR VERIFICATION */}
        {step === 2 && (
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
            onScanAndVerify={handleScanAndVerifyId}
            onProceedToOtp={handleProceedToOtp}
            onBack={() => setStep(1)}
            onSkip={handleSkipIdVerification}
          />
        )}

        {/* STEP 3: EMAIL OTP VERIFICATION */}
        {step === 3 && (
          <RegisterStepOtp
            register={register}
            errors={errors}
            emailValue={emailValue}
            isLoading={isLoading}
            onVerifyOtp={handleVerifyOTP}
            onResendOtp={handleProceedToOtp}
            onBack={() => setStep(2)}
          />
        )}

        {/* STEP 4: PASSWORD SETUP & FINISH */}
        {step === 4 && (
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
