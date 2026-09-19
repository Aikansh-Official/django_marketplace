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
  AlertCircle,
  Loader2,
  Ban
} from 'lucide-react';
import { compressImageToDataUrl } from '../../../utils/compressImage';
import { analyzeFaceFrame, preloadVisionDetectors, onLoadingProgress } from '../../../utils/faceLivenessDetector';

const videoConstraints = {
  width: { ideal: 480 },
  height: { ideal: 480 },
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
    statusText: 'Align face inside guide'
  });

  const [isDetecting, setIsDetecting] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [allowDirectCapture, setAllowDirectCapture] = useState(false);

  // Preload vision models as soon as the selfie component mounts
  useEffect(() => {
    const unsub = onLoadingProgress((stage, progress) => {
      setLoadingProgress(progress);
      if (stage === 'wasm') setLoadingStage('Loading vision engine...');
      else if (stage === 'face_model') setLoadingStage('Loading face scanner...');
      else if (stage === 'all_ready') setLoadingStage('Scanner ready!');
    });
    preloadVisionDetectors();
    return unsub;
  }, []);

  // Fail-safe: After 6 seconds, allow student to capture directly even if neural net is slow
  useEffect(() => {
    const timer = setTimeout(() => {
      setAllowDirectCapture(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Run face liveness, individual eye & hand detection loop every 260ms
  useEffect(() => {
    if (selfieImage || !cameraReady || cameraError) {
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
        setIsDetecting(false);
      } catch (err) {
        console.warn('Face detection error:', err);
      } finally {
        isBusy = false;
      }
    }, 260);

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
        // Convert base64 to blob for compact upload
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
        // Fallback to raw screenshot if compression fails
        setSelfieImage(screenshot);
      }
      setIsProcessing(false);
    }
    setIsCapturing(false);
  }, [setSelfieImage]);

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
      fullyVisible: false,
      statusText: 'Align face inside guide'
    });
    setCameraReady(false);
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    setCameraError(null);
  };

  const handleCameraError = (err) => {
    console.error('Camera error:', err);
    setCameraError(
      err?.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permission in browser.'
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
          Position your face inside the circle for verification
        </p>
      </div>

      {/* Camera / Preview Area */}
      <div className="flex flex-col items-center">
        {!selfieImage ? (
          /* LIVE CAMERA VIEW */
          <div className="relative flex flex-col items-center">
            {/* Circular camera viewport with dynamic state border */}
            <div
              className={`relative w-60 h-60 sm:w-68 sm:h-68 rounded-full overflow-hidden border-4 transition-all duration-300 shadow-xl ${
                cameraError
                  ? 'border-red-400'
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
                  />

                  {/* Visual Face & Facial Landmarks Guide Overlay */}
                  {cameraReady && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
                      >
                        {/* 1. Oval Head Silhouette */}
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

                        {/* Top & Bottom Alignment Ticks */}
                        <line
                          x1="100"
                          y1="18"
                          x2="100"
                          y2="26"
                          stroke={liveness.fullyVisible ? '#10b981' : 'rgba(255,255,255,0.8)'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line
                          x1="100"
                          y1="166"
                          x2="100"
                          y2="174"
                          stroke={liveness.fullyVisible ? '#10b981' : 'rgba(255,255,255,0.8)'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* 2. Left Eye Guide Marker */}
                        <g className="transition-all duration-200">
                          <ellipse
                            cx="77"
                            cy="82"
                            rx="11"
                            ry="6.5"
                            fill={liveness.leftEyeOpen ? 'rgba(16, 185, 129, 0.3)' : 'none'}
                            stroke={liveness.leftEyeOpen ? '#10b981' : 'rgba(255, 255, 255, 0.85)'}
                            strokeWidth={liveness.leftEyeOpen ? '2.5' : '1.8'}
                            strokeDasharray={liveness.leftEyeOpen ? 'none' : '3 3'}
                          />
                          <circle
                            cx="77"
                            cy="82"
                            r="2.5"
                            fill={liveness.leftEyeOpen ? '#10b981' : 'rgba(255, 255, 255, 0.9)'}
                          />
                        </g>

                        {/* 3. Right Eye Guide Marker */}
                        <g className="transition-all duration-200">
                          <ellipse
                            cx="123"
                            cy="82"
                            rx="11"
                            ry="6.5"
                            fill={liveness.rightEyeOpen ? 'rgba(16, 185, 129, 0.3)' : 'none'}
                            stroke={liveness.rightEyeOpen ? '#10b981' : 'rgba(255, 255, 255, 0.85)'}
                            strokeWidth={liveness.rightEyeOpen ? '2.5' : '1.8'}
                            strokeDasharray={liveness.rightEyeOpen ? 'none' : '3 3'}
                          />
                          <circle
                            cx="123"
                            cy="82"
                            r="2.5"
                            fill={liveness.rightEyeOpen ? '#10b981' : 'rgba(255, 255, 255, 0.9)'}
                          />
                        </g>

                        {/* 4. Nose Guide Marker */}
                        <path
                          d="M 100 86 L 98 103 L 104 103"
                          fill="none"
                          stroke={liveness.noseVisible ? '#10b981' : 'rgba(255, 255, 255, 0.85)'}
                          strokeWidth={liveness.noseVisible ? '2.5' : '1.8'}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all duration-200"
                        />

                        {/* 5. Mouth Guide Marker (Normal Mouth & Smile compatible) */}
                        <path
                          d="M 85 125 Q 100 137 115 125"
                          fill="none"
                          stroke={liveness.mouthVisible ? '#10b981' : 'rgba(255, 255, 255, 0.85)'}
                          strokeWidth={liveness.mouthVisible ? '2.5' : '1.8'}
                          strokeLinecap="round"
                          strokeDasharray={liveness.mouthVisible ? 'none' : '3 3'}
                          className="transition-all duration-200"
                        />
                      </svg>
                    </div>
                  )}

                  {!cameraReady && (
                    <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-white animate-spin mb-1" />
                      <p className="text-xs text-white/90 font-semibold">{loadingStage}</p>
                      {loadingProgress > 0 && loadingProgress < 100 && (
                        <div className="w-32 bg-white/20 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${loadingProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Overall Status Badge */}
            {cameraReady && !cameraError && (
              <div className="mt-3 flex flex-col items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md transition-all duration-300 ${
                    liveness.handDetected
                      ? 'bg-red-500 text-white animate-bounce'
                      : liveness.fullyVisible
                        ? 'bg-emerald-500 text-white animate-in zoom-in-95'
                        : liveness.faceDetected
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking face & hands...
                    </>
                  ) : liveness.handDetected ? (
                    <>
                      <Ban className="w-4 h-4 text-white" />
                      Hand Detected! Remove hands from frame
                    </>
                  ) : liveness.fullyVisible ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      Face Verified & Ready
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-white" />
                      {liveness.statusText}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* PREVIEW CAPTURED PHOTO */
          <div className="relative">
            <div className="w-60 h-60 sm:w-68 sm:h-68 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl shadow-emerald-200/40">
              <img
                src={selfieImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4" />
              Photo Captured & Verified
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-2.5">
        {!selfieImage ? (
          /* Capture Button */
          <button
            type="button"
            onClick={handleCapture}
            disabled={
              (!liveness.fullyVisible && !allowDirectCapture) ||
              liveness.handDetected ||
              isCapturing ||
              isProcessing ||
              !cameraReady ||
              cameraError
            }
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-md font-black text-sm tracking-tight transition-all duration-200 ${
              (liveness.fullyVisible || allowDirectCapture) && !liveness.handDetected && cameraReady && !cameraError
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            {isCapturing || isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Capturing...
              </>
            ) : liveness.handDetected ? (
              <>
                <Ban className="w-4 h-4 text-red-400" />
                Remove Hand to Enable Capture
              </>
            ) : !liveness.isFormal && liveness.faceDetected ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                {liveness.formalReason || 'Keep Formal Expression to Capture'}
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                {liveness.fullyVisible
                  ? 'Capture Selfie'
                  : allowDirectCapture
                  ? 'Capture Photo (Ready)'
                  : 'Align Face with Open Eyes & Mouth'}
              </>
            )}
          </button>
        ) : (
          /* Retake + Use Photo buttons */
          <>
            <button
              type="button"
              onClick={onProceed}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-black text-sm tracking-tight shadow-md shadow-brand-500/25 transition-all cursor-pointer"
            >
              Use This Photo
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRetake}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 font-bold text-sm transition-all cursor-pointer"
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
