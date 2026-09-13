/**
 * faceLivenessDetector.js
 * Advanced Face Landmark, Liveness & Hand/Obstacle Detection using Google MediaPipe.
 * 
 * Enforces:
 * 1. Both eyes must be individually open and visible (detects if one eye is winked or covered by hand/patch).
 * 2. Mouth must be clearly visible (supports normal closed resting mouth, smiling, mustache/beard).
 * 3. NO hands or obstacles allowed in the selfie frame (uses MediaPipe HandLandmarker).
 * 4. Face must be properly centered in the circular viewfinder.
 */

import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

let landmarkerInstance = null;
let handLandmarkerInstance = null;
let initPromise = null;

// Reusable offscreen canvas for pixel inspection
let offscreenCanvas = null;

function getOffscreenCanvas(width = 320, height = 320) {
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
  }
  if (offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
  }
  return offscreenCanvas;
}

/**
 * Initialize MediaPipe FaceLandmarker and HandLandmarker singletons
 */
export async function getVisionDetectors() {
  if (landmarkerInstance && handLandmarkerInstance) {
    return { faceLandmarker: landmarkerInstance, handLandmarker: handLandmarkerInstance };
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Load WASM assets
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      } catch (wasmErr) {
        console.warn('Local WASM failed, falling back to CDN:', wasmErr);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
        );
      }

      // 2. Initialize FaceLandmarker
      let faceModelPath = '/mediapipe/models/face_landmarker.task';
      try {
        const testRes = await fetch(faceModelPath, { method: 'HEAD' });
        if (!testRes.ok) throw new Error('Local face model not found');
      } catch {
        faceModelPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
      }

      try {
        landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: faceModelPath,
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      } catch (gpuErr) {
        console.warn('FaceLandmarker GPU init failed, falling back to CPU:', gpuErr);
        landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: faceModelPath,
            delegate: 'CPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      }

      // 3. Initialize HandLandmarker (to detect hands / obstacles in selfie)
      let handModelPath = '/mediapipe/models/hand_landmarker.task';
      try {
        const testHand = await fetch(handModelPath, { method: 'HEAD' });
        if (!testHand.ok) throw new Error('Local hand model not found');
      } catch {
        handModelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      }

      try {
        handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: handModelPath,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });
      } catch {
        try {
          handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: handModelPath,
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numHands: 2
          });
        } catch (handErr) {
          console.warn('HandLandmarker init warning (face detector will still work):', handErr);
        }
      }

      return { faceLandmarker: landmarkerInstance, handLandmarker: handLandmarkerInstance };
    } catch (err) {
      console.warn('MediaPipe initialization failed:', err);
      initPromise = null; // Allow retry on subsequent attempts
      return { faceLandmarker: null, handLandmarker: null };
    }
  })();

  return initPromise;
}

/**
 * Calculate Euclidean distance between two landmarks (normalized coords)
 */
function dist(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Verify individual eye texture and dark pupil/iris presence
 * An unobstructed open eye always has a dark pupil/iris (lum < 110)
 * and variance > 10. A hand covering the eye results in flat skin tone.
 */
function inspectEyePatch(ctx, canvasWidth, canvasHeight, eyeCenter, eyeWidthPx) {
  try {
    const cx = Math.floor(eyeCenter.x * canvasWidth);
    const cy = Math.floor(eyeCenter.y * canvasHeight);
    const radiusX = Math.max(8, Math.floor(eyeWidthPx * 0.6));
    const radiusY = Math.max(6, Math.floor(radiusX * 0.6));

    const sx = Math.max(0, cx - radiusX);
    const sy = Math.max(0, cy - radiusY);
    const sw = Math.min(canvasWidth - sx, radiusX * 2);
    const sh = Math.min(canvasHeight - sy, radiusY * 2);

    if (sw <= 2 || sh <= 2) return true;

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const d = imgData.data;

    let minLum = 255;
    let maxLum = 0;
    let lumSum = 0;
    let darkPixelCount = 0;
    const pixelCount = d.length / 4;

    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      lumSum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      // Pupil/iris dark threshold
      if (lum < 105) darkPixelCount++;
    }

    const avgLum = lumSum / (pixelCount || 1);
    let lumVar = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      lumVar += (lum - avgLum) * (lum - avgLum);
    }
    const stdDev = Math.sqrt(lumVar / (pixelCount || 1));

    // A real open eye has distinct pupil contrast (dark pixels + contrast spread)
    // If an eye is covered by hand/palm, variance is low and no dark pupil is seen
    const hasPupilContrast = (maxLum - minLum) >= 28 || stdDev >= 9.0;
    const hasDarkFeature = darkPixelCount >= Math.max(2, Math.floor(pixelCount * 0.04));

    return hasPupilContrast && hasDarkFeature;
  } catch {
    return true; // fail-safe if canvas read is blocked
  }
}

/**
 * Main Face & Hand Analysis function for video/webcam frame
 */
export async function analyzeFaceFrame(videoElement) {
  if (!videoElement || videoElement.readyState < 2) {
    return {
      faceDetected: false,
      eyesOpen: false,
      leftEyeOpen: false,
      rightEyeOpen: false,
      noseVisible: false,
      mouthVisible: false,
      handDetected: false,
      fullyVisible: false,
      statusText: 'Starting camera...'
    };
  }

  const { faceLandmarker, handLandmarker } = await getVisionDetectors();
  const timestamp = performance.now();

  // Prepare canvas for pixel analysis
  const canvas = getOffscreenCanvas(240, 240);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(videoElement, 0, 0, 240, 240);

  // 1. Hand / Obstacle Detection (Check if ANY hand is in the frame or touching the face)
  let handDetected = false;
  if (handLandmarker) {
    try {
      const handResult = handLandmarker.detectForVideo(videoElement, timestamp);
      if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
        for (const hand of handResult.landmarks) {
          // Check if hand landmarks are inside the selfie circular frame (dist from center < 0.48)
          for (const point of hand) {
            const distFromCenter = Math.hypot(point.x - 0.5, point.y - 0.5);
            if (distFromCenter < 0.46) {
              handDetected = true;
              break;
            }
          }
          if (handDetected) break;
        }
      }
    } catch (err) {
      console.warn('Hand detection error:', err);
    }
  }

  // If a hand is in the frame, reject immediately with clear warning
  if (handDetected) {
    return {
      faceDetected: true,
      eyesOpen: false,
      leftEyeOpen: false,
      rightEyeOpen: false,
      noseVisible: false,
      mouthVisible: false,
      handDetected: true,
      fullyVisible: false,
      statusText: 'Hand detected! Please remove hands from frame'
    };
  }

  // 2. Face Detection & Landmark Extraction
  if (!faceLandmarker) {
    return {
      faceDetected: false,
      eyesOpen: false,
      leftEyeOpen: false,
      rightEyeOpen: false,
      noseVisible: false,
      mouthVisible: false,
      handDetected: false,
      fullyVisible: false,
      statusText: 'Loading facial scanner...'
    };
  }

  try {
    const result = faceLandmarker.detectForVideo(videoElement, timestamp);

    if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
      return {
        faceDetected: false,
        eyesOpen: false,
        leftEyeOpen: false,
        rightEyeOpen: false,
        noseVisible: false,
        mouthVisible: false,
        handDetected: false,
        fullyVisible: false,
        statusText: 'Align face inside the circle guide'
      };
    }

    const landmarks = result.faceLandmarks[0];
    const blendshapes = result.faceBlendshapes?.[0]?.categories || [];

    const getBlendshape = (name) => {
      const item = blendshapes.find((b) => b.categoryName === name);
      return item ? item.score : 0;
    };

    const eyeBlinkLeft = getBlendshape('eyeBlinkLeft');
    const eyeBlinkRight = getBlendshape('eyeBlinkRight');

    // Key Landmarks:
    // Left eye: 33 (outer), 133 (inner), 159 (top), 145 (bottom)
    const leftEyeOuter = landmarks[33];
    const leftEyeInner = landmarks[133];
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];

    // Right eye: 362 (inner), 263 (outer), 386 (top), 374 (bottom)
    const rightEyeInner = landmarks[362];
    const rightEyeOuter = landmarks[263];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];

    // Nose: 1 (tip), 168 (bridge)
    const noseTip = landmarks[1];
    const noseBridge = landmarks[168];

    // Mouth:
    // 0 (top of upper lip), 17 (bottom of lower lip)
    // 61 (left corner), 291 (right corner)
    // 13 (inner upper lip), 14 (inner lower lip)
    const lipTop = landmarks[0] || landmarks[13];
    const lipBottom = landmarks[17] || landmarks[14];
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];

    // Face structure:
    const chin = landmarks[152];
    const forehead = landmarks[10];

    // --- CHECK 1: INDIVIDUAL EYE VERIFICATION (BOTH EYES MUST BE OPEN & VISIBLE) ---
    // Left eye openness & texture
    const leftEyeHeight = dist(leftEyeTop, leftEyeBottom);
    const leftEyeWidth = dist(leftEyeOuter, leftEyeInner) || 0.001;
    const leftEAR = leftEyeHeight / leftEyeWidth;
    const leftEyeCenter = {
      x: (leftEyeOuter.x + leftEyeInner.x) / 2,
      y: (leftEyeTop.y + leftEyeBottom.y) / 2
    };
    const leftEyeTextureValid = inspectEyePatch(ctx, 240, 240, leftEyeCenter, leftEyeWidth * 240);
    const isLeftEyeOpen = (eyeBlinkLeft < 0.60) && (leftEAR >= 0.11) && leftEyeTextureValid;

    // Right eye openness & texture
    const rightEyeHeight = dist(rightEyeTop, rightEyeBottom);
    const rightEyeWidth = dist(rightEyeOuter, rightEyeInner) || 0.001;
    const rightEAR = rightEyeHeight / rightEyeWidth;
    const rightEyeCenter = {
      x: (rightEyeOuter.x + rightEyeInner.x) / 2,
      y: (rightEyeTop.y + rightEyeBottom.y) / 2
    };
    const rightEyeTextureValid = inspectEyePatch(ctx, 240, 240, rightEyeCenter, rightEyeWidth * 240);
    const isRightEyeOpen = (eyeBlinkRight < 0.60) && (rightEAR >= 0.11) && rightEyeTextureValid;

    const eyesOpen = isLeftEyeOpen && isRightEyeOpen;

    // --- CHECK 2: NOSE VERIFICATION ---
    const noseHeight = dist(noseBridge, noseTip);
    const noseVisible = Boolean(noseTip && noseBridge && noseHeight > 0.025 && noseTip.y > noseBridge.y);

    // --- CHECK 3: MOUTH VERIFICATION (NORMAL CLOSED MOUTH + SMILE BOTH VALID) ---
    // Uses full lip thickness (lipTop 0 to lipBottom 17) and horizontal width (61 to 291)
    const fullLipThickness = dist(lipTop, lipBottom);
    const mouthWidth = dist(mouthLeft, mouthRight);

    // Valid if mouth is below the nose, above the chin, and has natural anatomical width/thickness
    const mouthVisible = Boolean(
      lipTop && lipBottom && mouthLeft && mouthRight &&
      lipTop.y > (noseTip.y - 0.01) &&
      lipBottom.y < (chin.y + 0.02) &&
      fullLipThickness >= 0.012 &&
      mouthWidth >= 0.05
    );

    // --- CHECK 4: FACE CENTERING & SIZE ---
    const faceHeight = dist(forehead, chin);
    const faceCenterX = (noseTip.x + noseBridge.x) / 2;
    const faceCenterY = (forehead.y + chin.y) / 2;

    const isCentered = faceCenterX >= 0.20 && faceCenterX <= 0.80 && faceCenterY >= 0.18 && faceCenterY <= 0.82;
    const isGoodSize = faceHeight >= 0.28 && faceHeight <= 0.94;

    // --- CHECK 5: FORMAL EXPRESSION VERIFICATION (NO FUNNY FACES) ---
    const tongueOut = getBlendshape('tongueOut');
    const mouthPucker = getBlendshape('mouthPucker');
    const mouthFunnel = getBlendshape('mouthFunnel');
    const jawOpen = getBlendshape('jawOpen');
    const cheekPuff = getBlendshape('cheekPuff');
    const eyeWideLeft = getBlendshape('eyeWideLeft');
    const eyeWideRight = getBlendshape('eyeWideRight');

    // Head tilt calculation
    const eyeDx = rightEyeOuter.x - leftEyeOuter.x;
    const eyeDy = rightEyeOuter.y - leftEyeOuter.y;
    const headTiltDeg = Math.abs(Math.atan2(eyeDy, eyeDx) * (180 / Math.PI));

    let isFormal = true;
    let formalReason = null;

    if (tongueOut > 0.22) {
      isFormal = false;
      formalReason = 'Keep your tongue inside (formal face required)';
    } else if (mouthPucker > 0.40 || mouthFunnel > 0.45) {
      isFormal = false;
      formalReason = 'Avoid duck face / puckering lips';
    } else if (jawOpen > 0.52) {
      isFormal = false;
      formalReason = 'Keep mouth closed or gentle smile (not wide open)';
    } else if (cheekPuff > 0.38) {
      isFormal = false;
      formalReason = 'Do not puff your cheeks';
    } else if (eyeWideLeft > 0.72 || eyeWideRight > 0.72) {
      isFormal = false;
      formalReason = 'Relax eyes (natural expression required)';
    } else if (headTiltDeg > 18) {
      isFormal = false;
      formalReason = 'Keep head straight and upright (avoid tilting)';
    }

    // All conditions must be strictly satisfied
    const fullyVisible = eyesOpen && noseVisible && mouthVisible && isCentered && isGoodSize && !handDetected && isFormal;

    // Helpful, specific live instruction for the user
    let statusText = 'Face Ready for Capture';
    if (!isFormal) {
      statusText = formalReason;
    } else if (!isLeftEyeOpen && !isRightEyeOpen) {
      statusText = 'Both eyes must be open and visible';
    } else if (!isLeftEyeOpen) {
      statusText = 'Left eye is closed or covered';
    } else if (!isRightEyeOpen) {
      statusText = 'Right eye is closed or covered';
    } else if (!mouthVisible) {
      statusText = 'Mouth must be uncovered and visible';
    } else if (!noseVisible) {
      statusText = 'Nose must be visible';
    } else if (!isCentered || !isGoodSize) {
      statusText = 'Center your face inside the circle guide';
    }

    return {
      faceDetected: true,
      eyesOpen,
      leftEyeOpen: isLeftEyeOpen,
      rightEyeOpen: isRightEyeOpen,
      noseVisible,
      mouthVisible,
      handDetected: false,
      isFormal,
      formalReason,
      fullyVisible,
      statusText,
      landmarks: {
        noseTip,
        noseBridge,
        leftEye: leftEyeCenter,
        rightEye: rightEyeCenter,
        mouth: lipTop
      }
    };
  } catch (err) {
    console.warn('Face detection processing error:', err);
    return {
      faceDetected: false,
      eyesOpen: false,
      leftEyeOpen: false,
      rightEyeOpen: false,
      noseVisible: false,
      mouthVisible: false,
      handDetected: false,
      fullyVisible: false,
      statusText: 'Align face inside guide'
    };
  }
}
