import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import AuthLeftPanel from './auth/AuthLeftPanel';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

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
  const fileInputRef = useRef(null);

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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid photo (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('File too large. Maximum size allowed is 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdFrontImage(reader.result);
      setIsIdVerified(false);
      setExtractedCardData(null);
      setRejectionInfo(null);
      toast.success('ID photo loaded successfully.');
    };
    reader.onerror = () => {
      toast.error('Failed to read ID photo file.');
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
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
          />

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
            <div className="overflow-y-auto px-5 sm:px-10 md:px-12 py-7 sm:py-10 flex-grow flex flex-col justify-center">
              {mode === 'login' ? (
                <LoginForm
                  onSwitch={() => setMode('register')}
                  onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                />
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
