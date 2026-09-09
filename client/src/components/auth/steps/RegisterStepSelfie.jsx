import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  Camera,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ScanFace,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  User
} from 'lucide-react';
import { compressImageToDataUrl } from '../../../utils/compressImage';

// Face detection: use native FaceDetector API if available, else canvas heuristic
async function detectFaceNative(imageSrc) {
  if (!('FaceDetector' in window)) return null;
  try {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const img = new Image();
    img.src = imageSrc;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const faces = await detector.detect(img);
    return faces.length > 0;
  } catch {
    return null; // API exists but failed, fallback
  }
}

function detectFaceHeuristic(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = Math.min(img.width, 320);
      const h = Math.min(img.height, 240);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Sample center 40% region
      const sx = Math.floor(w * 0.3);
      const sy = Math.floor(h * 0.2);
      const sw = Math.floor(w * 0.4);
      const sh = Math.floor(h * 0.6);
      const imageData = ctx.getImageData(sx, sy, sw, sh);
      const pixels = imageData.data;

      let skinPixels = 0;
      const totalPixels = pixels.length / 4;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        // Skin tone detection using RGB ranges (covers multiple skin tones)
        if (
          r > 60 && g > 40 && b > 20 &&
          r > g && r > b &&
          (r - g) > 15 &&
          Math.abs(r - g) < 130 &&
          r < 250 && g < 230 && b < 210
        ) {
          skinPixels++;
        }
      }

      const skinRatio = skinPixels / totalPixels;
      resolve(skinRatio > 0.12); // At least 12% skin pixels in center = likely a face
    };
    img.onerror = () => resolve(false);
    img.src = imageSrc;
  });
}

async function detectFace(imageSrc) {
  const nativeResult = await detectFaceNative(imageSrc);
  if (nativeResult !== null) return nativeResult;
  return detectFaceHeuristic(imageSrc);
}

const videoConstraints = {
  width: 480,
  height: 480,
  facingMode: 'user',
};

export default function RegisterStepSelfie({
  selfieImage,
  setSelfieImage,
  onProceed,
  onBack
}) {
  const webcamRef = useRef(null);
  const detectionInterval = useRef(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Run face detection every 600ms while camera is active
  useEffect(() => {
    if (selfieImage || !cameraReady || cameraError) {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      return;
    }

    detectionInterval.current = setInterval(async () => {
      if (!webcamRef.current) return;
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) return;

      setIsDetecting(true);
      const hasFace = await detectFace(screenshot);
      setFaceDetected(hasFace);
      setIsDetecting(false);
    }, 600);

    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [selfieImage, cameraReady, cameraError]);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    const screenshot = webcamRef.current.getScreenshot({ width: 640, height: 640 });

    if (screenshot) {
      setIsProcessing(true);
      try {
        // Convert base64 to blob for compression
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
        // Use raw screenshot if compression fails
        setSelfieImage(screenshot);
      }
      setIsProcessing(false);
    }
    setIsCapturing(false);
  }, [setSelfieImage]);

  const handleRetake = () => {
    setSelfieImage(null);
    setFaceDetected(false);
    setCameraReady(false);
    // Camera will re-mount and trigger onUserMedia
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    setCameraError(null);
  };

  const handleCameraError = (err) => {
    console.error('Camera error:', err);
    setCameraError(
      err?.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permission and try again.'
        : 'Could not access camera. Please make sure your device has a camera.'
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-2 text-center">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-display flex items-center justify-center gap-2">
          <ScanFace className="w-6 h-6 text-brand-500" />
          Take a Selfie
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          This will be used as your profile photo
        </p>
      </div>

      {/* Camera / Preview Area */}
      <div className="flex flex-col items-center">
        {!selfieImage ? (
          /* LIVE CAMERA VIEW */
          <div className="relative">
            {/* Circular camera viewport */}
            <div
              className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 transition-all duration-300 shadow-lg ${
                cameraError
                  ? 'border-red-400'
                  : faceDetected
                    ? 'border-emerald-400 shadow-emerald-200/50'
                    : 'border-gray-300'
              }`}
            >
              {cameraError ? (
                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4">
                  <XCircle className="w-10 h-10 text-red-400 mb-2" />
                  <p className="text-xs text-red-600 text-center font-medium leading-tight">
                    {cameraError}
                  </p>
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
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                      <p className="text-xs text-white/80 font-medium">Starting camera...</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Face detection badge */}
            {cameraReady && !cameraError && (
              <div
                className={`absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-all duration-300 ${
                  faceDetected
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Detecting...
                  </>
                ) : faceDetected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Face Detected
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    No Face Found
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* PREVIEW CAPTURED PHOTO */
          <div className="relative">
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-emerald-400 shadow-lg shadow-emerald-200/40">
              <img
                src={selfieImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Photo Captured
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      {!selfieImage && !cameraError && (
        <div className="mt-6 bg-brand-50/50 rounded-lg p-3 border border-brand-100">
          <p className="text-xs font-bold text-brand-700 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Tips for a good selfie
          </p>
          <ul className="text-[11px] text-brand-600/80 space-y-0.5 list-disc list-inside">
            <li>Look straight at the camera</li>
            <li>Make sure your face is well-lit</li>
            <li>Remove glasses or accessories covering your face</li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 space-y-2.5">
        {!selfieImage ? (
          /* Capture Button */
          <button
            type="button"
            onClick={handleCapture}
            disabled={!faceDetected || isCapturing || isProcessing || !cameraReady || cameraError}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm tracking-tight transition-all duration-200 ${
              faceDetected && cameraReady && !cameraError
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isCapturing || isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Capture Selfie
              </>
            )}
          </button>
        ) : (
          /* Retake + Use Photo buttons */
          <>
            <button
              type="button"
              onClick={onProceed}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm tracking-tight shadow-md shadow-brand-500/25 transition-all cursor-pointer"
            >
              Use This Photo
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRetake}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 font-bold text-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retake Photo
            </button>
          </>
        )}

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to ID Card
        </button>
      </div>
    </div>
  );
}
