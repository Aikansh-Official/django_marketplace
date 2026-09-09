import React from 'react';
import {
  Camera,
  Check,
  Sparkles,
  GraduationCap,
  Calendar,
  Activity,
  AlertTriangle,
  Loader2,
  ScanLine,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { compressImageToDataUrl } from '../../../utils/compressImage';

export default function RegisterStepIdCard({
  usernameValue,
  fullNameValue,
  idFrontImage,
  setIdFrontImage,
  isIdVerified,
  setIsIdVerified,
  isScanning,
  isLoading,
  extractedCardData,
  rejectionInfo,
  onScanAndVerify,
  onProceedToOtp,
  onBack,
  onSkip
}) {
  return (
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
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const compressed = await compressImageToDataUrl(file, {
                    maxWidth: 1000,
                    maxHeight: 700,
                    quality: 0.75,
                  });
                  setIdFrontImage(compressed);
                  setIsIdVerified(false);
                } catch {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setIdFrontImage(reader.result);
                    setIsIdVerified(false);
                  };
                  reader.readAsDataURL(file);
                }
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
            onClick={onScanAndVerify}
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
            onClick={onProceedToOtp}
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
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Edit Details
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
          >
            Skip for now (verify in profile)
          </button>
        </div>
      </div>
    </div>
  );
}
