import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Webcam from 'react-webcam';
import api from '../../services/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Ban,
  X,
  Sparkles,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import { compressImageToDataUrl } from '../../utils/compressImage';
import { analyzeFaceFrame } from '../../utils/faceLivenessDetector';

const videoConstraints = {
  width: 480,
  height: 480,
  facingMode: 'user',
};

export default function UpdateSelfieModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated
}) {
  const webcamRef = useRef(null);
  const detectionInterval = useRef(null);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  const [selfieImage, setSelfieImage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Camera & Face Liveness states
  const [liveness, setLiveness] = useState({
    faceDetected: false,
    eyesOpen: false,
    leftEyeOpen: false,
    rightEyeOpen: false,
    noseVisible: false,
    mouthVisible: false,
    handDetected: false,
    isFormal: true,
    formalReason: null,
    fullyVisible: false,
    statusText: 'Align face inside circle'
  });

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSelfieImage(null);
      setCameraError(null);
      setCameraReady(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean up camera stream tracks when closed or unmounted
  useEffect(() => {
    if (!isOpen) {
      if (webcamRef.current?.video?.srcObject) {
        try {
          const stream = webcamRef.current.video.srcObject;
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen]);

  // Face liveness detection loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera' || selfieImage || !cameraReady || cameraError) {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      return;
    }

    let isBusy = false;

    detectionInterval.current = setInterval(async () => {
      if (isBusy || !webcamRef.current) return;
      const video = webcamRef.current.video;
      if (!video || video.readyState < 2) return;

      isBusy = true;
      try {
        const result = await analyzeFaceFrame(video);
        setLiveness(result);
      } catch (err) {
        console.warn('Face detection error:', err);
      } finally {
        isBusy = false;
      }
    }, 260);

    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [isOpen, activeTab, selfieImage, cameraReady, cameraError]);

  const handleCameraReady = () => {
    setCameraReady(true);
    setCameraError(null);
  };

  const handleCameraError = (err) => {
    console.error('Camera access error:', err);
    setCameraError(
      err?.name === 'NotAllowedError'
        ? 'Camera access was denied. Please allow camera permissions in your browser or use the file upload tab.'
        : 'Unable to access camera on this device. Please try the upload tab instead.'
    );
  };

  // Capture snapshot from webcam
  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    const screenshot = webcamRef.current.getScreenshot({ width: 640, height: 640 });

    if (screenshot) {
      setIsProcessing(true);
      try {
        const res = await fetch(screenshot);
        const blob = await res.blob();
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        const compressed = await compressImageToDataUrl(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.85,
        });
        setSelfieImage(compressed);
      } catch {
        setSelfieImage(screenshot);
      }
      setIsProcessing(false);
    }
    setIsCapturing(false);
  }, []);

  // Handle photo file selection from device
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image size must be under 12MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const compressed = await compressImageToDataUrl(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
      });
      setSelfieImage(compressed);
      toast.success('Photo loaded successfully.');
    } catch (err) {
      console.error('Error processing photo:', err);
      toast.error('Failed to read image file.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reset captured image to take another
  const handleRetake = () => {
    setSelfieImage(null);
    setLiveness({
      faceDetected: false,
      eyesOpen: false,
      leftEyeOpen: false,
      rightEyeOpen: false,
      noseVisible: false,
      mouthVisible: false,
      handDetected: false,
      isFormal: true,
      formalReason: null,
      fullyVisible: false,
      statusText: 'Align face inside circle'
    });
    setCameraReady(false);
  };

  // Save updated selfie to backend profile
  const handleSaveProfilePhoto = async () => {
    if (!selfieImage) {
      toast.error('Please capture or select a selfie first.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/profile/', {
        profile_photo: selfieImage
      });

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#10b981', '#3b82f6', '#eab308']
        });
      } catch {
        // Confetti fallback
      }

      toast.success('Selfie profile photo updated successfully!', {
        icon: '📸',
        duration: 4000
      });

      if (onProfileUpdated) onProfileUpdated();
      window.dispatchEvent(new Event('auth-changed'));
      onClose();
    } catch (err) {
      console.error('Failed to update profile photo:', err);
      const msg =
        err.response?.data?.profile_photo?.[0] ||
        err.response?.data?.detail ||
        'Failed to save updated profile photo. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentPhoto = profile?.profile_photo;

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Slides in from Right) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 z-[60]">
        <aside
          className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-100 h-full"
          aria-label="Update selfie drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header with Warm Subtle Gradient matching Saved Wishlist Drawer */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shadow-xs border border-brand-100 flex-shrink-0">
                <Camera className="w-5 h-5 text-brand-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 truncate">
                  Update Selfie Photo
                  <span className="inline-flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Live
                  </span>
                </h2>
                <p className="text-xs text-gray-500 truncate">Capture or upload verified profile identity</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs (when not previewing captured photo) */}
          {!selfieImage && (
            <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-black'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-brand-500" />
                Live Camera Selfie
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-black'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-brand-500" />
                Upload From Device
              </button>
            </div>
          )}

          {/* Drawer Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            {!selfieImage ? (
            /* CAPTURE / UPLOAD STATE */
            <div>
              {activeTab === 'camera' ? (
                /* LIVE WEBCAM FEED */
                <div className="flex flex-col items-center">
                  <div
                    className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 transition-all duration-300 shadow-xl ${
                      cameraError
                        ? 'border-red-400 bg-red-50'
                        : liveness.handDetected
                        ? 'border-red-500 shadow-red-300 ring-4 ring-red-500/25'
                        : liveness.fullyVisible
                        ? 'border-emerald-500 shadow-emerald-400/40 ring-4 ring-emerald-500/20'
                        : liveness.faceDetected
                        ? 'border-amber-400 shadow-amber-200/50'
                        : 'border-gray-300 shadow-gray-200'
                    }`}
                  >
                    {cameraError ? (
                      <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                        <XCircle className="w-10 h-10 text-red-400 mb-2" />
                        <p className="text-xs text-red-600 font-bold leading-snug">
                          {cameraError}
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('upload')}
                          className="mt-3 text-[11px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-md cursor-pointer transition-all"
                        >
                          Switch to Photo Upload
                        </button>
                      </div>
                    ) : (
                      <>
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          videoConstraints={videoConstraints}
                          mirrored={true}
                          onUserMedia={handleCameraReady}
                          onUserMediaError={handleCameraError}
                          className="w-full h-full object-cover"
                        />

                        {/* Visual Face Landmarks Guide Overlay */}
                        {cameraReady && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <svg
                              viewBox="0 0 200 200"
                              className="w-full h-full"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
                            >
                              <ellipse
                                cx="100"
                                cy="96"
                                rx="55"
                                ry="69"
                                fill="none"
                                stroke={
                                  liveness.handDetected
                                    ? '#ef4444'
                                    : liveness.fullyVisible
                                    ? '#10b981'
                                    : liveness.faceDetected
                                    ? '#f59e0b'
                                    : 'rgba(255, 255, 255, 0.75)'
                                }
                                strokeWidth={liveness.fullyVisible || liveness.handDetected ? '3' : '2'}
                                strokeDasharray={liveness.fullyVisible ? 'none' : '5 4'}
                                className="transition-all duration-300"
                              />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Liveness Guide Status Pill */}
                  {!cameraError && cameraReady && (
                    <div className="mt-4 flex items-center justify-center">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                          liveness.handDetected
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : liveness.fullyVisible
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : liveness.faceDetected
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {liveness.handDetected ? (
                          <>
                            <Ban className="w-3.5 h-3.5 text-red-500" />
                            <span>Keep hands away from face</span>
                          </>
                        ) : liveness.fullyVisible ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ready to Capture!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span>{liveness.statusText}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Capture Button */}
                  <div className="w-full mt-6">
                    <button
                      type="button"
                      onClick={handleCapture}
                      disabled={
                        !liveness.fullyVisible ||
                        liveness.handDetected ||
                        isCapturing ||
                        isProcessing ||
                        !cameraReady ||
                        Boolean(cameraError)
                      }
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm tracking-tight transition-all duration-200 ${
                        liveness.fullyVisible && !liveness.handDetected && cameraReady && !cameraError
                          ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      {isCapturing || isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Capturing Photo...
                        </>
                      ) : liveness.handDetected ? (
                        <>
                          <Ban className="w-4 h-4 text-red-400" />
                          Remove Hand to Enable Capture
                        </>
                      ) : !liveness.isFormal && liveness.faceDetected ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          {liveness.formalReason || 'Keep Formal Expression'}
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          {liveness.fullyVisible ? 'Capture Selfie' : 'Align Face in Circle to Capture'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* FILE UPLOAD DROPZONE */
                <div className="flex flex-col items-center py-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="selfie-file-input"
                  />

                  <label
                    htmlFor="selfie-file-input"
                    className="w-full border-2 border-dashed border-gray-300 hover:border-brand-500 bg-gray-50/70 hover:bg-brand-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-brand-50 group-hover:bg-brand-100 text-brand-600 flex items-center justify-center mb-3.5 transition-all shadow-xs">
                      <Upload className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-sm font-bold text-gray-800 text-center">
                      Click or drag a clear front-facing photo
                    </span>
                    <span className="text-xs text-gray-400 mt-1 text-center">
                      PNG, JPG, or WEBP (Max 12MB)
                    </span>
                  </label>

                  {isProcessing && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Optimizing and preparing image...
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW NEW SELFIE PHOTO & CONFIRM STATE */
            <div className="flex flex-col items-center space-y-5 animate-fade-in">
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  New Selfie Captured & Ready
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Review your new profile selfie before confirming the update.
                </p>
              </div>

              {/* Photo Comparison Display */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 pt-1">
                {/* Current Photo (if exists) */}
                {currentPhoto && (
                  <div className="flex flex-col items-center text-center opacity-80">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm relative">
                      <img
                        src={currentPhoto}
                        alt="Current Profile Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-2">
                      Current
                    </span>
                  </div>
                )}

                {currentPhoto && (
                  <div className="text-gray-300">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}

                {/* New Photo */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl shadow-emerald-500/20">
                      <img
                        src={selfieImage}
                        alt="New Selfie Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> New Selfie
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-3">
                    New Photo
                  </span>
                </div>
              </div>

              {/* Confirmation Action Buttons */}
              <div className="w-full space-y-2.5 pt-4">
                <button
                  type="button"
                  onClick={handleSaveProfilePhoto}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm tracking-tight shadow-lg shadow-brand-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Profile Photo...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save & Update Profile Photo
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 font-bold text-sm transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Photo / Select Another
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  </div>,
  document.body
);
}
