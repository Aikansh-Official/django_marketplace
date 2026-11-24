/**
 * Compress an image file using the Canvas API before uploading.
 *
 * - Resizes to fit within maxWidth × maxHeight (preserving aspect ratio)
 * - Converts to JPEG at the given quality (0.0 – 1.0)
 * - Returns a new compressed File object
 *
 * @param {File} file - The original image file
 * @param {object} options
 * @param {number} options.maxWidth - Max width in px (default: 1200)
 * @param {number} options.maxHeight - Max height in px (default: 1200)
 * @param {number} options.quality - JPEG quality 0.0–1.0 (default: 0.75)
 * @param {number} options.maxSizeKB - Target max file size in KB (default: 500)
 * @returns {Promise<File>} Compressed file
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    maxSizeKB = 500,
  } = options;

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip GIFs (animated) — can't compress well with canvas
  if (file.type === 'image/gif') {
    return file;
  }

  // If file is already small enough, skip compression
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (preserve aspect ratio)
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw on canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP blob (fallback to JPEG if not supported)
      const tryFormat = 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to JPEG
            canvas.toBlob(
              (jpgBlob) => {
                if (!jpgBlob) {
                  reject(new Error('Canvas compression failed.'));
                  return;
                }
                const compressedFile = new File(
                  [jpgBlob],
                  file.name.replace(/\.\w+$/, '.jpg'),
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
            return;
          }

          const isWebp = blob.type === 'image/webp';
          const ext = isWebp ? '.webp' : '.jpg';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.\w+$/, ext),
            { type: blob.type, lastModified: Date.now() }
          );

          resolve(compressedFile);
        },
        tryFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If canvas fails, return the original file
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Compress an image file or data URL directly into a compact Base64 Data URL (WebP format).
 * Ideal for student ID card uploads and document storage.
 *
 * @param {File|Blob|string} input - File object or data URL string
 * @param {object} options
 * @param {number} options.maxWidth - Max width in px (default: 1000)
 * @param {number} options.maxHeight - Max height in px (default: 700)
 * @param {number} options.quality - Quality 0.0–1.0 (default: 0.8)
 * @returns {Promise<string>} Compressed Base64 WebP data URL
 */
export async function compressImageToDataUrl(input, options = {}) {
  const {
    maxWidth = 1000,
    maxHeight = 700,
    quality = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    let src = '';
    let objectUrlToRevoke = null;

    if (typeof input === 'string') {
      src = input;
    } else if (input instanceof Blob || input instanceof File) {
      objectUrlToRevoke = URL.createObjectURL(input);
      src = objectUrlToRevoke;
    } else {
      return reject(new Error('Invalid image input for compression.'));
    }

    const img = new Image();

    img.onload = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }

      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let compressedDataUrl = canvas.toDataURL('image/webp', quality);
      if (!compressedDataUrl.startsWith('data:image/webp')) {
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(err);
    };

    img.src = src;
  });
}
