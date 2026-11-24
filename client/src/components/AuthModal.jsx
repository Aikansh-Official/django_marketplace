import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import AuthLeftPanel from './auth/AuthLeftPanel';
import LoginForm from './auth/LoginForm';
import UniversalLoader from './common/UniversalLoader';

const RegisterForm = lazy(() => import('./auth/RegisterForm'));
const ForgotPasswordForm = lazy(() => import('./auth/ForgotPasswordForm'));

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login', 'register', or 'forgot-password'

  // Shared register verification state across left panel and right form
  const [registerStep, setRegisterStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('BUYER');
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [extractedCardData, setExtractedCardData] = useState(null);
  const [rejectionInfo, setRejectionInfo] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ fullName: '', username: '' });

  const fullNameValue = studentInfo.fullName;
  const usernameValue = studentInfo.username;

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRegisterStep(1);
      setSelectedRole('BUYER');
      setIdFrontImage(null);
      setSelfieImage(null);
      setIsIdVerified(false);
      setExtractedCardData(null);
      setRejectionInfo(null);
      setStudentInfo({ fullName: '', username: '' });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialMode]);

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

      <div className="flex min-h-full p-2 sm:p-6 pb-safe">
        <div className="m-auto w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-200 max-h-[96dvh] sm:max-h-[92vh] animate-in fade-in zoom-in duration-200">

          {/* LEFT SIDE: Branding, Live Scanner & Verified ID Preview */}
          <AuthLeftPanel
            mode={mode}
            role={selectedRole}
            registerStep={registerStep}
            isIdVerified={isIdVerified}
            idFrontImage={idFrontImage}
            setIdFrontImage={setIdFrontImage}
            selfieImage={selfieImage}
            setSelfieImage={setSelfieImage}
            isScanning={isScanning}
            scanStatus={scanStatus}
            scanProgress={scanProgress}
            setIsIdVerified={setIsIdVerified}
            extractedCardData={extractedCardData}
            setExtractedCardData={setExtractedCardData}
            setRejectionInfo={setRejectionInfo}
            fullNameValue={fullNameValue}
            usernameValue={usernameValue}
          />

          {/* RIGHT SIDE: Form Content & Multi-Step Flow */}
          <div className="w-full md:w-7/12 relative flex flex-col bg-white overflow-hidden">

            {/* Header with Close Button */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 min-w-[38px] min-h-[38px] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-4 sm:px-10 md:px-12 py-6 sm:py-10 flex-grow flex flex-col justify-center touch-momentum">
              {mode === 'login' ? (
                <LoginForm
                  onSwitch={() => setMode('register')}
                  onForgotPassword={() => setMode('forgot-password')}
                  onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                />
              ) : mode === 'forgot-password' ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center min-h-[300px]">
                      <UniversalLoader text="Loading reset password..." size="sm" />
                    </div>
                  }
                >
                  <ForgotPasswordForm
                    onBackToLogin={() => setMode('login')}
                  />
                </Suspense>
              ) : (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center min-h-[300px]">
                      <UniversalLoader text="Loading registration..." size="sm" />
                    </div>
                  }
                >
                  <RegisterForm
                    step={registerStep}
                    setStep={setRegisterStep}
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    idFrontImage={idFrontImage}
                    setIdFrontImage={setIdFrontImage}
                    selfieImage={selfieImage}
                    setSelfieImage={setSelfieImage}
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
                    studentInfo={studentInfo}
                    setStudentInfo={setStudentInfo}
                    onSwitch={() => setMode('login')}
                    onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
