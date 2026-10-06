import React, { useState, useEffect, lazy, Suspense } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import triggerConfetti from '../../utils/confetti';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Camera,
  X,
  BadgeCheck,
  Lock,
  AlertTriangle,
  ScanLine,
  FileText,
  UserCheck,
  GraduationCap,
  Calendar,
  Activity
} from 'lucide-react';
import {
  extractLpuCardDetails,
  checkImageAuthenticity,
  preprocessImageForOcr
} from '../../utils/idCardVerification';
import { compressImageToDataUrl } from '../../utils/compressImage';
const UpdateSelfieModal = lazy(() => import('./UpdateSelfieModal'));

export default function IdVerificationTab({ profile, onProfileUpdated, onOpenSelfieModal }) {
  // Purge any old global localStorage artifact so verification status is strictly read from the user DB model
  useEffect(() => {
    localStorage.removeItem('campusxchange_id_verification');
    localStorage.removeItem('lputrade_id_verification');
  }, []);

  const registeredRegNo = String(profile?.username || '').replace(/^@/, '').trim();
  const studentName = profile?.full_name || profile?.first_name || '';
  const isVerified = Boolean(profile?.is_id_verified);

  const [isEditing, setIsEditing] = useState(false);
  const [internalSelfieModalOpen, setInternalSelfieModalOpen] = useState(false);
  const handleOpenSelfie = onOpenSelfieModal || (() => setInternalSelfieModalOpen(true));

  const [idFrontImage, setIdFrontImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [rejectionInfo, setRejectionInfo] = useState(null);

  const displayedCardImage = idFrontImage || profile?.id_card_image || null;

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
      setRejectionInfo(null);
      toast.success('ID photo loaded successfully.');
    };
    reader.onerror = () => {
      toast.error('Failed to read ID photo file.');
    };
    reader.readAsDataURL(file);
  };

  const triggerCelebrationConfetti = () => {
    triggerConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f97316', '#3b82f6', '#eab308']
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!idFrontImage) {
      toast.error('Please upload the Front side photo of your LPU ID card.');
      return;
    }
    if (!registeredRegNo) {
      toast.error('No registered registration number found for this account.');
      return;
    }

    setSubmitting(true);
    setScanProgress(5);
    setScanStatus('Checking document authenticity & layout...');
    setRejectionInfo(null);

    try {
      // Step 1: Pre-OCR In-House Visual Authenticity & Anti-Spoofing Filter
      const authenticityCheck = await checkImageAuthenticity(idFrontImage);
      if (!authenticityCheck.isAuthentic) {
        setRejectionInfo({ reason: authenticityCheck.reason });
        toast.error(authenticityCheck.reason, { duration: 6000 });
        setSubmitting(false);
        setScanProgress(0);
        setScanStatus('');
        return;
      }

      setScanProgress(10);
      setScanStatus('Optimizing image for scanning...');
      let ocrReadyImage = idFrontImage;
      try {
        ocrReadyImage = await preprocessImageForOcr(idFrontImage);
      } catch (prepErr) {
        console.warn('OCR preprocessing failed, using original:', prepErr);
      }

      setScanProgress(15);
      // Step 2: In-browser client-side OCR (Dynamically loaded on demand)
      setScanStatus('Loading OCR engine...');
      const { default: Tesseract } = await import('tesseract.js');
      const {
        data: { text }
      } = await Tesseract.recognize(ocrReadyImage, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            setScanProgress(Math.max(15, pct));
            setScanStatus(`Scanning card text (${pct}%)...`);
          } else if (m.status) {
            setScanStatus(`${m.status.replace(/_/g, ' ')}...`);
          }
        }
      });

      setScanProgress(100);
      setScanStatus('Validating LPU branding, registration number & student name...');

      const validationResult = extractLpuCardDetails(text, registeredRegNo, studentName);

      if (validationResult.isValid) {
        // MATCH SUCCESSFUL! Update backend DB model CustomUser.is_id_verified = True
        try {
          let compressedForDb = idFrontImage;
          try {
            compressedForDb = await compressImageToDataUrl(idFrontImage, {
              maxWidth: 1000,
              maxHeight: 700,
              quality: 0.75,
            });
          } catch (compErr) {
            console.warn('Compression before upload failed, using original:', compErr);
          }

          await api.post('/auth/verify-id/', {
            reg_no: registeredRegNo,
            id_card_image: compressedForDb,
            id_card_data: validationResult.extraData
          });
        } catch (apiErr) {
          console.warn('Backend verify-id call:', apiErr?.response?.data || apiErr.message);
        }

        setRejectionInfo(null);
        setIsEditing(false);

        triggerCelebrationConfetti();
        toast.success(
          `ID Verified! Registration number ${registeredRegNo} and student details matched successfully! +5 Trust Score Points awarded!`,
          { icon: '🎉', duration: 5000 }
        );

        if (onProfileUpdated) onProfileUpdated();
        window.dispatchEvent(new Event('auth-changed'));
      } else {
        // REJECTED
        setRejectionInfo({
          reason: validationResult.reason
        });

        toast.error('Verification Rejected: ' + validationResult.reason, {
          duration: 6000
        });
      }
    } catch (ocrErr) {
      console.error('OCR scanning error:', ocrErr);
      const errMsg = 'Failed to read ID card photo. Please upload a clearer photo with good lighting.';
      toast.error(errMsg);
      setRejectionInfo({ reason: errMsg });
    } finally {
      setSubmitting(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  const handleStartReupload = async () => {
    setIsEditing(true);
    setIdFrontImage(null);
    setRejectionInfo(null);
    try {
      await api.delete('/auth/verify-id/');
      if (onProfileUpdated) onProfileUpdated();
    } catch (e) {
      // Non-critical
    }
  };

  // =========================================================================
  // VIEW 1: ALREADY VERIFIED (2-Column Showcase: Details Left, ID Card Right)
  // =========================================================================
  if (isVerified && !isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Student ID Card Verification
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Your official student identity is verified and active.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
            Verified Student
          </span>
        </div>

        {/* Single Verified Details Card (No right side document preview) */}
        <div className="max-w-2xl bg-white rounded-md border border-gray-200/90 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                +5 Trust Score Points Earned
              </span>
              <h3 className="text-sm font-extrabold text-gray-900 mt-1">
                Official Student Verified
              </h3>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200/80 rounded-md p-4 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Student Name
              </span>
              <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                {studentName || 'LPU Student'}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200/60">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Registration Number
              </span>
              <span className="text-sm font-mono font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {registeredRegNo}
              </span>
            </div>

            {profile?.id_card_data?.program && (
              <div className="pt-2 border-t border-gray-200/60">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Program / Degree
                </span>
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                  {profile.id_card_data.program}
                </span>
              </div>
            )}

            {profile?.id_card_data?.validity && (
              <div className="pt-2 border-t border-gray-200/60">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Valid Upto
                </span>
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {profile.id_card_data.validity}
                </span>
              </div>
            )}

            {profile?.id_card_data?.bloodGroup && (
              <div className="pt-2 border-t border-gray-200/60">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Blood Group
                </span>
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  {profile.id_card_data.bloodGroup}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200/60">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Marketplace Privileges
              </span>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Your profile displays the Golden Verified Badge on all product listings, offers, and chat messages.
              </p>
            </div>
          </div>

          {/* Verified Selfie Photo (with Retake/Upload Option) */}
          {profile?.profile_photo ? (
            <div className="pt-2">
              <div className="mb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Verified Selfie Photo
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-3 rounded-md bg-gray-50 border border-gray-200/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={profile.profile_photo}
                    alt="Verified Live Selfie"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover border-2 border-emerald-500 shadow-xs flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Live Selfie Verified
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-1 truncate">
                      {studentName || 'Student'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Face identity authenticated with student credentials
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSelfie}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-brand-50 text-brand-600 hover:text-brand-700 border border-gray-200 hover:border-brand-200 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer flex-shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Retake Selfie
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Verified Selfie Photo
              </span>
              <div className="flex items-center justify-between gap-3.5 p-3.5 rounded-md bg-amber-50/60 border border-amber-200/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-md bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      No Live Selfie Attached
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Take a live selfie to verify your face identity and earn +3 trust points.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSelfie}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer flex-shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Selfie
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Update Selfie Modal Fallback */}
        {!onOpenSelfieModal && internalSelfieModalOpen && (
          <Suspense fallback={null}>
            <UpdateSelfieModal
              isOpen={internalSelfieModalOpen}
              onClose={() => setInternalSelfieModalOpen(false)}
              profile={profile}
              onProfileUpdated={onProfileUpdated}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: UNVERIFIED OR RE-UPLOADING (2-Column Form: Controls Left, Preview Right)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            Student ID Card Verification
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload your physical student ID card photo to verify your identity and unlock a 100/100 trust score.
          </p>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-gray-600 hover:text-gray-900 font-bold hover:underline cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* REJECTION ALERT (Full Width if error occurred) */}
      {rejectionInfo && (
        <div className="bg-red-50 border-2 border-red-200 rounded-md p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div className="text-xs text-red-950 space-y-1 flex-1">
              <div className="font-extrabold text-sm text-red-900">
                Verification Rejected
              </div>
              <p className="text-red-800 font-medium leading-relaxed">
                {rejectionInfo.reason}
              </p>
              <p className="text-[11px] text-red-700">
                Tip: Please upload a clear, original photo of your physical student ID card taken directly under good lighting without glare or blur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Grid: Left = Form / Controls | Right = ID Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Upload Input (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-md border border-gray-200/90 p-4 sm:p-6 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-600" />
              Upload Details
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Verify your front ID card against your registered student account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Registered Student Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentName || 'Student Name'}
                  readOnly
                  disabled
                  className="w-full bg-gray-100 border border-gray-300 rounded-md pl-9 pr-3.5 py-2.5 text-xs text-gray-800 font-bold cursor-not-allowed select-none shadow-xs"
                />
                <UserCheck className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Locked Registration Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-gray-600 uppercase">
                  Registration Number
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3 text-gray-500" />
                  Locked to Account
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={registeredRegNo}
                  readOnly
                  disabled
                  className="w-full bg-gray-100 border border-gray-300 rounded-md pl-9 pr-3.5 py-2.5 text-xs text-gray-800 font-mono font-bold cursor-not-allowed select-none shadow-xs"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Front Photo Picker Button / Dropzone */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Front Side Photo (JPG, PNG, WEBP)
              </label>

              <label className="border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-md p-4 sm:p-6 flex flex-col items-center justify-center cursor-pointer bg-gray-50/40 hover:bg-white transition-all group shadow-2xs">
                <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 text-center">
                  {idFrontImage ? 'Change ID Card Photo' : 'Click to select or capture ID photo'}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">
                  Front side only • Maximum 5MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              disabled={submitting || !idFrontImage}
              className="w-full py-3 px-4 rounded-md bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Scanning & Verifying ID...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Verify ID Card</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Large ID Card Image Preview (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-md border border-gray-200/90 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              ID Card Image Preview
            </h3>
            {idFrontImage && !submitting && (
              <button
                type="button"
                onClick={() => setIdFrontImage(null)}
                className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Remove Photo
              </button>
            )}
          </div>

          {idFrontImage ? (
            <div className="space-y-3">
              <div className="relative rounded-md overflow-hidden border border-gray-200 bg-gray-900/5 min-h-[290px] flex items-center justify-center p-3">
                {/* Active OCR Scanning Overlay */}
                {submitting && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-white">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                      <ScanLine className="w-10 h-10 text-brand-400 animate-pulse" />
                      <div className="absolute inset-0 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="font-bold text-xs tracking-wide">{scanStatus}</div>
                    <div className="w-48 bg-white/20 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div
                        className="bg-brand-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-200 mt-1 font-mono">{scanProgress}%</span>
                  </div>
                )}

                <img
                  src={idFrontImage}
                  alt="LPU Student ID Card Preview"
                  className="max-h-80 w-full object-contain rounded-md shadow-xs bg-white"
                />

                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded shadow flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-brand-400" />
                  Front Side ID Loaded
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-3 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Photo loaded! Click <strong>"Verify ID Card"</strong> on the left to scan and authenticate details.
                </span>
              </div>
            </div>
          ) : (
            /* Empty State Placeholder */
            <div className="border-2 border-dashed border-gray-200 rounded-md min-h-[290px] flex flex-col items-center justify-center p-6 text-center bg-gray-50/40">
              <div className="w-44 h-28 rounded-md border-2 border-dashed border-gray-300 bg-white p-3 flex flex-col justify-between shadow-2xs mb-3 opacity-60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-gray-200"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-1.5 bg-gray-100 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                  <div className="h-1.5 bg-gray-100 rounded w-2/3"></div>
                </div>
              </div>
              <p className="text-xs font-bold text-gray-700">
                No ID Photo Selected
              </p>
              <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                Upload your front ID card photo on the left. The full preview will appear here so you can ensure details are clearly legible.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
