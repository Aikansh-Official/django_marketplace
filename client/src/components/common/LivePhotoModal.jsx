import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Webcam from 'react-webcam';
import {
  Camera,
  RefreshCw,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  FlipHorizontal,
  UploadCloud,
  Smartphone,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LivePhotoModal({ isOpen, onClose, onPhotoCaptured }) {
  const webcamRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [flash, setFlash] = useState(false);

  // Reset states whenever modal opens & handle scroll locking and escape key
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError(false);
      setFlash(false);
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error('Could not capture frame. Please try again or use your camera app.');
      return;
    }

    // Trigger flash animation
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    setCapturedImage(imageSrc);
  }, [webcamRef]);

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    try {
      // Convert dataURL to File
      const arr = capturedImage.split(',');
      const mime = arr[0].match(/:(.*?);/)[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const filename = `live-photo-${Date.now()}.jpg`;
      const file = new File([u8arr], filename, { type: mime });

      onPhotoCaptured(file);
      onClose();
      setCapturedImage(null);
    } catch (err) {
      console.error('Failed to convert captured photo to file', err);
      toast.error('Failed to process captured image.');
    }
  };

  // Handle native camera file selection
  const handleNativeCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoCaptured(file);
      onClose();
      setCapturedImage(null);
    }
  };

  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: facingMode
  };

  if (!isOpen) return null;

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
          aria-label="Take live photo drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header with Gradient */}
          <div className="bg-gradient-to-r from-brand-500 via-brand-600 to-orange-500 p-5 sm:p-6 text-white relative flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-md bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center shadow-inner flex-shrink-0">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight font-display">
                    Click Live Product Photo
                  </h2>
                  <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Live Camera
                  </span>
                </div>
                <p className="text-white/85 text-xs mt-0.5 leading-relaxed">
                  Snap real-time photos of your item for 100% verified student trust.
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white">
            {/* Camera Viewport Frame */}
            <div className="relative w-full h-64 sm:h-72 bg-gray-100 rounded-md overflow-hidden border-2 border-gray-200 shadow-inner flex items-center justify-center">
              {flash && (
                <div className="absolute inset-0 z-30 bg-white pointer-events-none transition-opacity duration-200" />
              )}

            {capturedImage ? (
              // Captured Preview State
              <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
                <img
                  src={capturedImage}
                  alt="Captured Product Snapshot"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Photo Captured
                </div>
              </div>
            ) : cameraError ? (
              // Camera Error State
              <div className="p-6 text-center space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Camera Not Accessible</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Please allow camera access in browser settings or use your phone camera app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-2.5 px-4 rounded-md flex items-center justify-center gap-2 transition-colors shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Use Phone Camera App
                </button>
              </div>
            ) : (
              // Live Webcam Feed
              <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMediaError={() => setCameraError(true)}
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Overlays */}
                <div className="absolute inset-3 pointer-events-none flex flex-col justify-between p-1">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-brand-500 rounded-tl-md" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-brand-500 rounded-tr-md" />
                  </div>

                  <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white/95 border border-white/20 shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      Position item inside the frame
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-brand-500 rounded-bl-md" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-brand-500 rounded-br-md" />
                  </div>
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Switch Camera"
                  className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-2.5 rounded-md backdrop-blur-sm border border-white/20 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">{facingMode === 'environment' ? 'Back' : 'Front'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {capturedImage ? (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={retakePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Photo
              </button>
              <button
                type="button"
                onClick={confirmPhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-black text-sm bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Check className="w-4 h-4" />
                Use This Photo
              </button>
            </div>
          ) : !cameraError ? (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md font-black text-sm tracking-tight bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Camera className="w-5 h-5" />
                Capture Product Photo
              </button>

              <div className="flex items-center justify-between text-xs text-gray-500 px-1 pt-1">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 hover:text-brand-600 font-semibold cursor-pointer transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-brand-500" />
                  Use Phone Camera App
                </button>

                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="flex items-center gap-1 hover:text-brand-600 font-semibold cursor-pointer transition-colors"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-brand-500" />
                  Switch to {facingMode === 'environment' ? 'Front' : 'Back'} Camera
                </button>
              </div>
            </div>
          ) : null}

          {/* Hidden Native Camera Input */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeCapture}
            className="hidden"
          />

          {/* Security Tagline */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 pt-3 border-t border-gray-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>CampusXChange Anti-Fraud: Only real photos accepted</span>
          </div>
        </div>
      </aside>
    </div>
  </div>,
  document.body
);
}
