import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  Camera,
  RefreshCw,
  XCircle,
  Loader2,
  ScanLine,
  BadgeCheck,
  SwitchCamera
} from 'lucide-react';
import { compressImageToDataUrl } from '../../utils/compressImage';

export default function IdCardCamera({
  idFrontImage,
  setIdFrontImage,
  setIsIdVerified,
  setExtractedCardData,
  setRejectionInfo,
  isScanning = false,
  scanStatus = '',
  scanProgress = 0,
  isIdVerified = false
}) {
  const webcamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // Default to rear camera for ID document scanning

  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 800 },
    facingMode: { ideal: facingMode }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    setCameraError(null);
  };

  const handleCameraError = (err) => {
    console.error('ID Card Camera error:', err);
    setCameraError(
      err?.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions in your browser settings.'
        : 'Could not access camera. Please verify your camera is connected and permitted.'
    );
  };

  const handleFlipCamera = () => {
    setCameraReady(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    setIsCapturing(true);

    try {
      const screenshot = webcamRef.current.getScreenshot({ width: 1280, height: 800 });
      if (screenshot) {
        const compressed = await compressImageToDataUrl(screenshot, {
          maxWidth: 1200,
          maxHeight: 800,
          quality: 0.88
        });
        setIdFrontImage(compressed);
        setIsIdVerified(false);
        if (setExtractedCardData) setExtractedCardData(null);
        if (setRejectionInfo) setRejectionInfo(null);
      }
    } catch (err) {
      console.error('Failed to capture ID card photo:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [setIdFrontImage, setIsIdVerified, setExtractedCardData, setRejectionInfo]);

  const handleRetake = () => {
    setIdFrontImage(null);
    setIsIdVerified(false);
    if (setExtractedCardData) setExtractedCardData(null);
    if (setRejectionInfo) setRejectionInfo(null);
    setCameraReady(false);
    setCameraError(null);
  };

  return (
    <div className="w-full space-y-2.5">
      {!idFrontImage ? (
        /* LIVE CAMERA VIEW */
        <div className="space-y-2">
          <div className="relative w-full aspect-[1.58/1] min-h-[220px] max-h-[290px] rounded-lg overflow-hidden bg-black/95 border-2 border-gray-300 shadow-xs flex items-center justify-center">
            {cameraError ? (
              <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <XCircle className="w-9 h-9 text-red-500 mb-2" />
                <p className="text-xs text-red-600 font-semibold max-w-xs leading-relaxed">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setCameraReady(false);
                  }}
                  className="mt-3 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded shadow-xs hover:bg-brand-600 transition-colors cursor-pointer"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  mirrored={false}
                  onUserMedia={handleCameraReady}
                  onUserMediaError={handleCameraError}
                  className="w-full h-full object-cover"
                />

                {/* Card Framing Guide Overlay */}
                {cameraReady && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
                    {/* Corner Bracket Frame */}
                    <div className="relative w-[92%] h-[88%] border border-white/40 rounded-lg shadow-sm">
                      {/* Top-Left Bracket */}
                      <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-3 border-l-3 border-brand-400 rounded-tl-md" />
                      {/* Top-Right Bracket */}
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-3 border-r-3 border-brand-400 rounded-tr-md" />
                      {/* Bottom-Left Bracket */}
                      <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-3 border-l-3 border-brand-400 rounded-bl-md" />
                      {/* Bottom-Right Bracket */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-3 border-r-3 border-brand-400 rounded-br-md" />
                    </div>

                    {/* Helper Guidance Pill */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-white/20 whitespace-nowrap shadow-xs">
                      Align ID card within frame
                    </div>
                  </div>
                )}

                {/* Flip Camera Button */}
                {cameraReady && (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    title="Switch camera"
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-xs border border-white/20 transition-all cursor-pointer z-10"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Camera Initializing Loader */}
                {!cameraReady && (
                  <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center gap-2 text-white">
                    <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
                    <p className="text-xs font-semibold text-white/90">Starting camera...</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Capture Action Button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={!cameraReady || isCapturing || Boolean(cameraError)}
            className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-md text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            {isCapturing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Capturing Photo...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Capture ID Card</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* CAPTURED PHOTO PREVIEW */
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-900/5 aspect-[1.58/1] min-h-[220px] max-h-[290px] flex items-center justify-center p-1.5 shadow-xs">
            {/* Laser Scan Line Animation during OCR */}
            {isScanning && (
              <>
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-white text-center">
                  <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                    <ScanLine className="w-7 h-7 text-brand-400 animate-pulse" />
                    <div className="absolute inset-0 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="font-bold text-xs tracking-wide">{scanStatus}</div>
                  <div className="w-36 bg-white/20 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className="bg-brand-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-200 mt-1 font-mono">{scanProgress}%</span>
                </div>

                {/* Traversing Laser Line */}
                <div className="laser-scanline-anim absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_12px_#f97316] z-10 pointer-events-none" />
              </>
            )}

            <img
              src={idFrontImage}
              alt="Captured Student ID Card"
              className="max-h-56 w-full object-contain rounded bg-white"
            />

            {isIdVerified && (
              <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm flex items-center gap-1 z-10">
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified Front
              </div>
            )}
          </div>

          {/* Retake Photo Button */}
          <button
            type="button"
            onClick={handleRetake}
            disabled={isScanning}
            className="w-full border border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:text-gray-900 font-bold py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
            <span>Retake Photo</span>
          </button>
        </div>
      )}
    </div>
  );
}
