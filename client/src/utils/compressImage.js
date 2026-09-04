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

      // Export as JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas compression failed.'));
            return;
          }

          // Create a new File from the blob
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.\w+$/, '.jpg'),
            { type: 'image/jpeg', lastModified: Date.now() }
          );

          const savedPercent = Math.round(
            ((file.size - compressedFile.size) / file.size) * 100
          );


          resolve(compressedFile);
        },
        'image/jpeg',
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
