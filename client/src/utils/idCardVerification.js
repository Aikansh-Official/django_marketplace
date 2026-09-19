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
      reason: 'Please upload a clearer photo.'
    };
  }

  // Strip leading @ and whitespace
  const target = String(targetReg).replace(/^@/, '').trim();
  const normalizedRaw = rawText.toUpperCase();
  const strippedText = normalizedRaw.replace(/[^A-Z0-9]/g, '');

  // 1. Direct contains check
  if (normalizedRaw.includes(target) || strippedText.includes(target)) {
    return { matched: true, detected: target };
  }

  // 2. Pure digits extraction check
  const targetDigits = target.replace(/[^0-9]/g, '');
  const rawDigits = normalizedRaw.replace(/[^0-9]/g, '');
  if (targetDigits.length >= 6 && rawDigits.includes(targetDigits)) {
    return { matched: true, detected: target };
  }

  // 3. Extract all potential numeric sequences of 6 to 10 digits
  const numericSequences = normalizedRaw.match(/\b\d{6,10}\b/g) || [];
  for (const seq of numericSequences) {
    if (seq === target || (targetDigits.length >= 6 && seq === targetDigits)) {
      return { matched: true, detected: target };
    }
  }

  // 4. Fuzzy digit substitution check for common OCR confusions (O <-> 0, I/l <-> 1, S <-> 5, B <-> 8, Z <-> 2)
  const fuzzyClean = normalizedRaw
    .replace(/O/g, '0')
    .replace(/[IL|!]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/[^0-9]/g, '');

  if (fuzzyClean.includes(target) || (targetDigits.length >= 6 && fuzzyClean.includes(targetDigits))) {
    return { matched: true, detected: target };
  }

  // If match failed, check if another 7-9 digit registration number was spotted on the ID
  if (numericSequences.length > 0) {
    const foreignNumber = numericSequences[0];
    return {
      matched: false,
      detected: foreignNumber,
      reason: `Registration number (${foreignNumber}) does not match your account (${target}).`
    };
  }

  return {
    matched: false,
    detected: null,
    reason: `Registration number (${target}) not found on uploaded ID card.`
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
            reason: 'Please upload a horizontal (landscape) photo of your ID card.'
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
            reason: 'Invalid document: Please upload your physical student ID card.'
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
            reason: 'Invalid format: Please upload a clear photo of your student ID card.'
          });
        }

        return resolve({ isAuthentic: true, reason: null });
      } catch (err) {
        console.warn('Image visual authenticity inspection exception:', err);
        return resolve({ isAuthentic: true, reason: null });
      }
    };

    img.onerror = () => {
      resolve({ isAuthentic: false, reason: 'Invalid image file. Please upload a clear photo.' });
    };

    img.src = imageSrc;
  });
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalizeOcrText(text) {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/RN/g, 'M')
    .replace(/VV/g, 'W')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');
}

function matchNamePart(part, normalizedRaw, strippedText) {
  if (!part || part.length < 2) return true;
  const p = part.toUpperCase();
  // Calibrated distance: <=3: 0, 4-7: 1, >=8: 2
  const maxDist = p.length <= 3 ? 0 : p.length <= 7 ? 1 : 2;

  // 1. Exact checks
  if (normalizedRaw.includes(p) || strippedText.includes(p)) {
    return true;
  }

  // 2. Normalized OCR checks (handles RN <-> M, 0 <-> O, etc.)
  const normRawOcr = normalizeOcrText(normalizedRaw);
  const normStrippedOcr = normalizeOcrText(strippedText);
  const normP = normalizeOcrText(p);
  if (normRawOcr.includes(normP) || normStrippedOcr.includes(normP)) {
    return true;
  }

  // 3. Indian vowel variant check (A <-> E, e.g. VARMA <-> VERMA)
  const pVowelVariant = p.includes('A') ? p.replace(/A/g, 'E') : p.replace(/E/g, 'A');
  if (normalizedRaw.includes(pVowelVariant) || strippedText.includes(pVowelVariant)) {
    return true;
  }

  // 4. Token-level fuzzy match
  const tokens = (normalizedRaw.match(/[A-Z]{2,}/g) || []).concat(
    normRawOcr.match(/[A-Z]{2,}/g) || []
  );

  for (const token of tokens) {
    if (token.includes(p) || (token.length >= 4 && p.includes(token))) {
      return true;
    }
    if (Math.abs(token.length - p.length) <= 1) {
      if (levenshteinDistance(p, token) <= maxDist) return true;
      if (levenshteinDistance(normP, token) <= maxDist) return true;
    }
  }

  // 5. Multi-window sliding check on strippedText
  const windowSizes = [p.length - 1, p.length, p.length + 1].filter((l) => l >= 2);
  for (const wLen of windowSizes) {
    for (let i = 0; i <= strippedText.length - wLen; i++) {
      const sub = strippedText.slice(i, i + wLen);
      if (levenshteinDistance(p, sub) <= maxDist) return true;
      if (levenshteinDistance(normP, sub) <= maxDist) return true;
      if (levenshteinDistance(pVowelVariant, sub) <= 1) return true;
    }
    for (let i = 0; i <= normStrippedOcr.length - wLen; i++) {
      const sub = normStrippedOcr.slice(i, i + wLen);
      if (levenshteinDistance(normP, sub) <= maxDist) return true;
    }
  }

  return false;
}

/**
 * Multi-Anchor LPU ID Card Validation:
 * Internal verification of university credentials, structural template anchors, registration number, and student name.
 */
export function validateLpuIdCard(rawText, targetReg, studentName) {
  if (!rawText || !rawText.trim()) {
    return {
      isValid: false,
      reason: 'No legible text detected. Please upload a clearer photo.',
      regMatched: false,
      nameMatched: false,
      univMatched: false
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
      reason: 'University credentials not found. Please upload a valid LPU ID card.',
      regMatched: false,
      nameMatched: false,
      univMatched: false
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
      reason: 'Card format does not match official LPU student ID.',
      regMatched: false,
      nameMatched: false,
      univMatched: true
    };
  }

  // 3. Verify Registration Number
  const regMatch = matchRegistrationNumber(rawText, targetReg);
  if (!regMatch.matched) {
    return {
      isValid: false,
      reason: regMatch.reason,
      regMatched: false,
      nameMatched: false,
      univMatched: true
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

    const matchedParts = nameParts.filter((part) =>
      matchNamePart(part, normalizedRaw, strippedText)
    );

    // Accept student ID if the unique registration number matches and at least 1 significant name part matches (or >= 50% of name parts)
    const isNameValid = matchedParts.length >= Math.ceil(nameParts.length / 2) || matchedParts.length > 0;

    if (!isNameValid) {
      return {
        isValid: false,
        reason: 'Student name on card does not match your entered name.',
        regMatched: true,
        nameMatched: false,
        univMatched: true
      };
    }
    nameMatched = true;
  }

  return {
    isValid: true,
    reason: null,
    regMatched: true,
    nameMatched: true,
    univMatched: true
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

/**
 * Preprocesses a raw image (especially large phone photos 3000x4000+) on an offscreen HTML5 canvas:
 * 1. Rescales so max dimension <= 1400px (optimal for Tesseract neural nets, reducing processing time 10x).
 * 2. Applies high-contrast grayscale normalization to make faint or shadowed text sharp.
 * Returns an optimized Data URL for Tesseract OCR.
 */
export async function preprocessImageForOcr(imageSrc) {
  return new Promise((resolve) => {
    if (!imageSrc || typeof imageSrc !== 'string') {
      return resolve(imageSrc);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const { naturalWidth: w, naturalHeight: h } = img;
        if (!w || !h) return resolve(imageSrc);

        let targetW = w;
        let targetH = h;
        const maxDim = 1400;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            targetW = maxDim;
            targetH = Math.round((h * maxDim) / w);
          } else {
            targetH = maxDim;
            targetW = Math.round((w * maxDim) / h);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(imageSrc);

        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Apply high-contrast grayscale normalization
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const d = imgData.data;
        const contrast = 1.25;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const contrasted = factor * (gray - 128) + 128;
          const clamped = Math.max(0, Math.min(255, contrasted));
          d[i] = clamped;
          d[i + 1] = clamped;
          d[i + 2] = clamped;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        console.warn('OCR image preprocessing exception, using raw image:', e);
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

