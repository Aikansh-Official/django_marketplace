/**
 * idCardVerification.js
 * Intelligent Student ID Card OCR analysis, document anti-spoofing filter,
 * multi-anchor validation, and structured data extraction for LPU ID cards.
 */

/**
 * Intelligent OCR registration number matching utility.
 * Handles exact matches, whitespace/dash/punctuation stripping,
 * and common OCR optical character confusions (O <-> 0, I/l <-> 1, S <-> 5, B <-> 8).
 */
export function matchRegistrationNumber(rawText, targetReg) {
  if (!rawText || !targetReg) {
    return {
      matched: false,
      detected: null,
      reason: 'No legible text was detected from the uploaded image.'
    };
  }

  const target = String(targetReg).trim();
  const normalizedRaw = rawText.toUpperCase();

  // 1. Direct contains check
  if (normalizedRaw.includes(target)) {
    return { matched: true, detected: target };
  }

  // 2. Continuous alphanumeric stripping (removes spaces, hyphens, colons, slashes)
  const strippedText = normalizedRaw.replace(/[^A-Z0-9]/g, '');
  if (strippedText.includes(target)) {
    return { matched: true, detected: target };
  }

  // 3. Extract all potential numeric sequences of 7 to 9 digits
  const numericSequences = normalizedRaw.match(/\b\d{7,9}\b/g) || [];
  for (const seq of numericSequences) {
    if (seq === target) {
      return { matched: true, detected: target };
    }
  }

  // 4. Fuzzy digit substitution check for common OCR confusions
  const fuzzyClean = normalizedRaw
    .replace(/O/g, '0')
    .replace(/[IL|!]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/[^0-9]/g, '');

  if (fuzzyClean.includes(target)) {
    return { matched: true, detected: target };
  }

  // If match failed, check if another 7-9 digit registration number was spotted on the ID
  if (numericSequences.length > 0) {
    const foreignNumber = numericSequences[0];
    return {
      matched: false,
      detected: foreignNumber,
      reason: `Mismatched Registration Number: Found ID number "${foreignNumber}" on card, but your account is registered as "${target}".`
    };
  }

  return {
    matched: false,
    detected: null,
    reason: `Registration Number Not Found: Could not detect registration number "${target}" on the uploaded ID card photo.`
  };
}

/**
 * Advanced Client-Side Document Authenticity & Anti-Spoofing Filter.
 * Evaluates the uploaded image on an offscreen HTML5 canvas to detect:
 * 1. Aspect Ratio (Landscape CR80 ID card layout)
 * 2. Flat Digital Mockups / Monotone Backgrounds (e.g. MS Paint, dark screenshot, plain text canvas)
 * 3. Embedded Student Passport Photo Region presence (contrast/edge variance on left side)
 */
export async function checkImageAuthenticity(imageSrc) {
  return new Promise((resolve) => {
    if (!imageSrc) {
      return resolve({ isAuthentic: false, reason: 'No image data was provided.' });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const { naturalWidth: width, naturalHeight: height } = img;
        if (!width || !height) {
          return resolve({ isAuthentic: true, reason: null });
        }

        const aspectRatio = width / height;

        // 1. Aspect Ratio Check: Real ID cards are horizontal/landscape (CR80 ~1.58 ratio)
        if (aspectRatio < 0.92) {
          return resolve({
            isAuthentic: false,
            reason: 'Invalid Document Orientation: Student ID cards are landscape (horizontal). Please capture the entire ID card horizontally without vertical cropping.'
          });
        }

        // 2. Pixel Analysis via Offscreen Canvas
        const sampleW = 120;
        const sampleH = 80;
        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve({ isAuthentic: true, reason: null });

        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;
        const totalPixels = sampleW * sampleH;

        // Color quantization into buckets of 32 to detect flat synthetic backgrounds
        const colorBuckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = `${Math.floor(r / 32)},${Math.floor(g / 32)},${Math.floor(b / 32)}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        // Find the most dominant color frequency
        let maxBucketCount = 0;
        for (const k in colorBuckets) {
          if (colorBuckets[k] > maxBucketCount) {
            maxBucketCount = colorBuckets[k];
          }
        }
        const dominantColorPercent = (maxBucketCount / totalPixels) * 100;
        const uniqueColorsCount = Object.keys(colorBuckets).length;

        // 3. Flat Digital Mockup / Plain Text Canvas Detection:
        if (dominantColorPercent > 82 && uniqueColorsCount < 22) {
          return resolve({
            isAuthentic: false,
            reason: 'Authentication Failed: Unrecognized document format. Please upload a clear, original photo of your physical student ID card.'
          });
        }

        // 4. Student Passport Photo Region Analysis (Left quadrant: x: 5%-35%, y: 15%-65%)
        const photoXStart = Math.floor(sampleW * 0.05);
        const photoXEnd = Math.floor(sampleW * 0.35);
        const photoYStart = Math.floor(sampleH * 0.15);
        const photoYEnd = Math.floor(sampleH * 0.65);

        let photoSum = 0;
        let photoPixelCount = 0;
        for (let y = photoYStart; y < photoYEnd; y++) {
          for (let x = photoXStart; x < photoXEnd; x++) {
            const idx = (y * sampleW + x) * 4;
            photoSum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            photoPixelCount++;
          }
        }
        const photoAvg = photoSum / (photoPixelCount || 1);

        let photoVar = 0;
        for (let y = photoYStart; y < photoYEnd; y++) {
          for (let x = photoXStart; x < photoXEnd; x++) {
            const idx = (y * sampleW + x) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            photoVar += Math.pow(gray - photoAvg, 2);
          }
        }
        const photoStdDev = Math.sqrt(photoVar / (photoPixelCount || 1));

        // If the photo region has practically zero contrast and dominant flat background
        if (photoStdDev < 8.0 && dominantColorPercent > 70) {
          return resolve({
            isAuthentic: false,
            reason: 'Authentication Failed: Unrecognized ID card format. Please upload a clear, uncropped photo of your official student ID card.'
          });
        }

        return resolve({ isAuthentic: true, reason: null });
      } catch (err) {
        console.warn('Image visual authenticity inspection exception:', err);
        return resolve({ isAuthentic: true, reason: null });
      }
    };

    img.onerror = () => {
      resolve({ isAuthentic: false, reason: 'Failed to inspect image. Please ensure the file is a valid photo.' });
    };

    img.src = imageSrc;
  });
}

/**
 * Multi-Anchor LPU ID Card Validation:
 * Internal verification of university credentials, structural template anchors, registration number, and student name.
 */
export function validateLpuIdCard(rawText, targetReg, studentName) {
  if (!rawText || !rawText.trim()) {
    return {
      isValid: false,
      reason: 'No legible text could be read from this image. Please ensure good lighting and clear camera focus.'
    };
  }

  const normalizedRaw = rawText.toUpperCase();
  const strippedText = normalizedRaw.replace(/[^A-Z0-9]/g, '');

  // 1. Verify Official University Branding
  const hasOfficialName =
    normalizedRaw.includes('LOVELY') ||
    normalizedRaw.includes('PROFESSIONAL') ||
    normalizedRaw.includes('ROFESSIONAL') ||
    normalizedRaw.includes('UNIVERSITY') ||
    normalizedRaw.includes('INIVERSITY') ||
    normalizedRaw.includes('TRANSFORMING') ||
    normalizedRaw.includes('PUNJAB') ||
    strippedText.includes('LOVELY') ||
    strippedText.includes('PROFESSIONAL') ||
    strippedText.includes('TRANSFORMING');

  const hasLpuAcronym = normalizedRaw.includes('LPU') || strippedText.includes('LPU');

  if (!hasOfficialName && !hasLpuAcronym) {
    return {
      isValid: false,
      reason: 'Authentication Failed: Could not verify official university credentials on the card. Please upload a clear photo of your official student ID card.'
    };
  }

  // 2. Mandatory Structural Template Anchors (Real LPU ID card fields)
  const anchors = [
    { name: 'Batch', matched: normalizedRaw.includes('BATCH') || strippedText.includes('BATCH') },
    { name: 'Validity', matched: normalizedRaw.includes('VALID') || normalizedRaw.includes('UPTO') || normalizedRaw.includes('WITHDRAWN') },
    { name: 'Guardian/Residence', matched: normalizedRaw.includes('C/O') || normalizedRaw.includes('RESI') || normalizedRaw.includes('CARE OF') },
    { name: 'University Tagline', matched: normalizedRaw.includes('TRANSFORMING') || normalizedRaw.includes('EDUCATION') || normalizedRaw.includes('LOVELY') }
  ];

  const matchedAnchorsCount = anchors.filter((a) => a.matched).length;
  const requiredAnchors = hasOfficialName ? 1 : 2;

  if (matchedAnchorsCount < requiredAnchors) {
    return {
      isValid: false,
      reason: 'Authentication Failed: Document format does not match official student ID card records. Please upload a clear, uncropped photo of your physical LPU ID card.'
    };
  }

  // 3. Verify Registration Number
  const regMatch = matchRegistrationNumber(rawText, targetReg);
  if (!regMatch.matched) {
    return {
      isValid: false,
      reason: regMatch.reason
    };
  }

  // 4. Verify Student Name (if provided)
  let nameMatched = false;
  if (studentName && studentName.trim().length >= 3) {
    const nameParts = studentName
      .toUpperCase()
      .trim()
      .split(/\s+/)
      .filter((part) => part.length >= 2);

    const requiredParts =
      nameParts.length <= 2 ? nameParts : [nameParts[0], nameParts[nameParts.length - 1]];

    const missingParts = requiredParts.filter(
      (part) => !normalizedRaw.includes(part) && !strippedText.includes(part)
    );

    if (missingParts.length > 0) {
      return {
        isValid: false,
        reason: 'Authentication Failed: Student name on the card does not match your registered account name. Please ensure your registered name matches your ID card.'
      };
    }
    nameMatched = true;
  }

  return {
    isValid: true,
    reason: null,
    regMatched: true,
    nameMatched
  };
}

/**
 * Intelligent field parser to extract extra student card data:
 * - Program / Course / Degree (e.g. B.Tech Computer Science and Engineering)
 * - Valid Upto / Validity (e.g. JUN-2026)
 * - Batch (e.g. 2022 - 2026)
 * - Blood Group (e.g. O+, B+)
 * - Care Of / Guardian (e.g. C/O ...)
 * - Roll No / UID
 */
export function extractLpuCardDetails(rawText, targetReg, studentName) {
  const validation = validateLpuIdCard(rawText, targetReg, studentName);
  const normalizedRaw = (rawText || '').toUpperCase();

  const extraData = {
    program: null,
    validity: null,
    batch: null,
    bloodGroup: null,
    careOf: null,
    rollNo: null
  };

  if (!rawText) {
    return {
      ...validation,
      extraData,
      rawText: ''
    };
  }

  // --- 1. Program / Course Extraction ---
  const programLineMatch = rawText.match(/(?:PROGRAMME|PROGRAM|COURSE|BRANCH|STREAM)\s*[:\-–]?\s*([^\r\n]{3,60})/i);
  if (programLineMatch && programLineMatch[1]) {
    extraData.program = programLineMatch[1].trim().replace(/^[:\-–\s]+/, '');
  } else {
    const degreeMatch = rawText.match(/\b(B\.?\s*Tech(?:\s*\([^\)]+\))?|Bachelor of [A-Za-z\s]+|M\.?\s*Tech|BCA|MCA|MBA|BBA|B\.?\s*Sc|M\.?\s*Sc|B\.?\s*Com|B\.?\s*Des|Diploma in [A-Za-z\s]+|Ph\.?D)\b/i);
    if (degreeMatch) {
      extraData.program = degreeMatch[0].trim();
    }
  }

  if (extraData.program) {
    extraData.program = extraData.program.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 70);
  }

  // --- 2. Validity / Expiry Extraction ---
  const validityMatch = rawText.match(/(?:VALID\s*(?:UPTO|TILL|THROUGH)?|VALIDITY|EXPIRY)\s*[:\-–]?\s*([A-Za-z]{3,4}[\s\-/]*\d{4}|\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|\b\d{4}\b)/i);
  if (validityMatch && validityMatch[1]) {
    extraData.validity = validityMatch[1].trim();
  }

  // --- 3. Batch Extraction ---
  const batchMatch = rawText.match(/(?:BATCH)\s*[:\-–]?\s*(\d{4}\s*[-–/]\s*\d{2,4}|\d{4})/i);
  if (batchMatch && batchMatch[1]) {
    extraData.batch = batchMatch[1].trim();
  }

  // --- 4. Blood Group Extraction ---
  const bgMatch = rawText.match(/(?:BLOOD\s*(?:GROUP|GRP)|B\.?G\.?)\s*[:\-–]?\s*([ABO][+-]|AB[+-])/i);
  if (bgMatch && bgMatch[1]) {
    extraData.bloodGroup = bgMatch[1].trim().toUpperCase();
  } else {
    const standaloneBg = rawText.match(/\b(A\+|B\+|AB\+|O\+|A\-|B\-|AB\-|O\-)\b/);
    if (standaloneBg && standaloneBg[1]) {
      extraData.bloodGroup = standaloneBg[1].trim();
    }
  }

  // --- 5. Care Of / Guardian ---
  const careOfMatch = rawText.match(/(?:C\/O|CARE OF|FATHER['’]?S? NAME)\s*[:\-–]?\s*([A-Za-z\s\.]{3,35})/i);
  if (careOfMatch && careOfMatch[1]) {
    extraData.careOf = careOfMatch[1].trim().replace(/[\n\r]+/g, ' ');
  }

  // --- 6. Roll Number / UID ---
  const rollMatch = rawText.match(/(?:ROLL\s*(?:NO|NUMBER)?|UID)\s*[:\-–]?\s*([A-Z0-9]{4,15})/i);
  if (rollMatch && rollMatch[1]) {
    extraData.rollNo = rollMatch[1].trim();
  }

  return {
    ...validation,
    extraData,
    rawText
  };
}
