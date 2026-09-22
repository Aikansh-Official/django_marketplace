import React from 'react';
import {
  ShieldCheck,
  Camera,
  BadgeCheck,
  CheckCircle2
} from 'lucide-react';
import logoImg from '../../assets/CampusXChange_Logo.webp';
import IdCardCamera from './IdCardCamera';
import { useIsMobile } from '../../utils/useIsMobile';

export default function AuthLeftPanel({
  mode,
  role = 'BUYER',
  registerStep,
  isIdVerified,
  idFrontImage,
  setIdFrontImage,
  selfieImage,
  isScanning,
  scanStatus,
  scanProgress,
  setIsIdVerified,
  extractedCardData,
  setExtractedCardData,
  setRejectionInfo,
  fullNameValue,
  usernameValue,
}) {
  const isMobile = useIsMobile();
  const displayFullName = fullNameValue || extractedCardData?.name || 'Student';
  const displayRegNo = usernameValue || extractedCardData?.registration_no || '—';

  return (
    <div className="hidden md:flex md:w-5/12 relative flex-col justify-center overflow-hidden">
      {mode === 'login' || role === 'BUYER' || registerStep === 1 || (!isIdVerified && registerStep !== 2) ? (
        /* CLEAN, SIMPLE & PROMINENT BRANDING FOR LOGIN, BUYERS & REGISTER STEP 1 (AND SELLER STEPS 3/4/5 IF ID NOT VERIFIED) */
        <div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-600 p-8 sm:p-10 flex flex-col justify-center items-center text-center text-white">
          <div className="flex flex-col items-center">
            <div className="px-5 py-3 rounded-2xl bg-white shadow-md mb-4 flex items-center justify-center">
              <img src={logoImg} alt="CampusXChange Logo" className="h-10 w-auto object-contain" />
            </div>

            <div className="flex items-baseline">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">Campus</span>
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-brand-100 font-display">XChange</span>
            </div>

            <p className="text-white/90 text-sm mt-3 max-w-[260px] leading-relaxed">
              Campus marketplace exclusively for students of Lovely Professional University.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/15 text-white text-xs font-semibold border border-white/25 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>
                {mode === 'register' && role === 'BUYER'
                  ? 'Instant Student Buyer Access'
                  : '100% Student Verified Platform'}
              </span>
            </div>
          </div>
        </div>
      ) : (role === 'SELLER' && registerStep === 2) ? (
        /* REGISTER STEP 2 (SELLER ONLY): Dedicated ID Card Live Camera Viewport */
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

            {/* Render ID Card Camera on desktop */}
            {!isMobile && (
              <IdCardCamera
                idFrontImage={idFrontImage}
                setIdFrontImage={setIdFrontImage}
                setIsIdVerified={setIsIdVerified}
                setExtractedCardData={setExtractedCardData}
                setRejectionInfo={setRejectionInfo}
                isScanning={isScanning}
                scanStatus={scanStatus}
                scanProgress={scanProgress}
                isIdVerified={isIdVerified}
              />
            )}
          </div>

          {/* Left Side Helper Guide */}
          <div className="bg-white border border-gray-200 rounded-md p-3 text-[11px] text-gray-600 space-y-1 mt-4 shadow-2xs">
            <span className="font-bold text-gray-900 block text-[10px] uppercase tracking-wider text-brand-600">
              ID Photo Tips
            </span>
            <p className="leading-snug">
              • Hold ID card steady inside the box under good lighting.<br />
              • Make sure 8-digit Registration Number and Student Name are clearly legible without glare.
            </p>
          </div>
        </div>
      ) : (
        /* REGISTER STEPS 3, 4, 5 (SELLER): ID Verified Preview & Dual Photo Showcase (ID + Selfie) */
        <div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-600 p-5 sm:p-6 flex flex-col justify-center items-center text-center text-white">
          <div className="flex flex-col items-center w-full max-w-[310px]">
            {/* Verification Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/25 mb-2 shadow-2xs">
              <BadgeCheck className="w-4 h-4 text-white" />
              <span>{selfieImage ? 'ID & Face Verified' : 'ID Verified'}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight leading-tight">
              {selfieImage ? 'Student Verified' : 'Student ID Verified'}
            </h3>
            <p className="text-white/85 text-xs mt-0.5 mb-3">
              {selfieImage
                ? 'ID Card & Live Selfie matched successfully'
                : 'Credentials matched successfully'}
            </p>

            {/* ID Card Display Card */}
            {idFrontImage && (
              <div className="w-full rounded-md overflow-hidden bg-white/10 backdrop-blur-xs border border-white/20 p-2 shadow-sm mb-2.5 text-left">
                <div className="flex items-center justify-between text-[10px] font-bold text-white mb-1.5 px-0.5">
                  <span className="flex items-center gap-1 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    Student ID Card
                  </span>
                </div>
                <div className="rounded overflow-hidden bg-white p-1 shadow-xs flex items-center justify-center">
                  <img
                    src={idFrontImage}
                    alt="Verified Student ID Card"
                    className={`${selfieImage ? 'max-h-28 sm:max-h-30' : 'max-h-40 sm:max-h-44'} w-full object-contain rounded`}
                  />
                </div>
              </div>
            )}

            {/* Live Selfie Photo & Student Profile (Shown prominently during Step 4 OTP and Step 5 Password) */}
            {selfieImage ? (
              <div className="w-full rounded-md overflow-hidden bg-white/10 backdrop-blur-xs border border-white/20 p-2.5 shadow-sm text-left">
                <div className="flex items-center justify-between text-[10px] font-bold text-white mb-1.5 px-0.5">
                  <span className="flex items-center gap-1 uppercase tracking-wider">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    Live Selfie Photo
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 p-2 rounded-md border border-white/20">
                  <div className="relative shrink-0">
                    <img
                      src={selfieImage}
                      alt="Live Selfie Photo"
                      className="w-16 h-16 sm:w-18 sm:h-18 rounded-md object-cover border-2 border-white shadow-sm bg-white/10"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-white text-brand-600 rounded-full p-0.5 border border-brand-500/20 shadow-xs">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">
                      {displayFullName}
                    </p>
                    <p className="text-white/80 font-mono text-xs mt-0.5 truncate">
                      Reg No: {displayRegNo}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-white/90 font-medium">
                      <span>✓ Liveness Passed</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Clean Student Info fallback when selfie not yet taken (Step 3) */
              <div className="w-full py-2.5 px-4 rounded-md bg-white/10 border border-white/20 text-white text-xs text-center">
                <p className="font-bold text-sm">{displayFullName}</p>
                <p className="text-white/80 font-mono text-xs mt-0.5">Reg No: {displayRegNo}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
