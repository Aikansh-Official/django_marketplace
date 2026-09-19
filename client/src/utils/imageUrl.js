import { API_BASE } from '../services/api';

/**
 * Derives the backend server origin from API_BASE.
 * E.g., 'http://localhost:8000/api' -> 'http://localhost:8000'
 * E.g., 'https://cxc-marketplace.onrender.com/api' -> 'https://cxc-marketplace.onrender.com'
 */
const BACKEND_ORIGIN = (API_BASE || '').replace(/\/api\/?$/, '');

/**
 * Universal Image URL Resolver:
 * Ensures all images, whether relative gateway URLs (/api/media/secure-image/...),
 * local media paths (/media/...), or direct Cloudinary URLs, resolve to the correct
 * backend server in production and deliver optimized WebP assets.
 *
 * @param {string} url - Raw image URL or relative path
 * @param {object} options - Optional transformations (e.g. { width, height })
 * @returns {string} - Fully qualified, secure image URL
 */
export function getSafeImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Data URLs and Blob URLs (camera previews, client uploads)
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Remap legacy localhost media URLs in production
  let processedUrl = trimmed;
  if (
    BACKEND_ORIGIN &&
    !BACKEND_ORIGIN.includes('localhost') &&
    !BACKEND_ORIGIN.includes('127.0.0.1')
  ) {
    // If running in production but image URL points to localhost:8000
    if (processedUrl.startsWith('http://localhost:8000') || processedUrl.startsWith('http://127.0.0.1:8000')) {
      processedUrl = processedUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, BACKEND_ORIGIN);
    }
  }

  // 3. Relative API or Media URLs (/api/media/secure-image/... or /media/...)
  // In production, frontend is on cxc.anshuman892494.online and backend is on Render.
  // Prepending BACKEND_ORIGIN ensures the request hits the Django backend, not the static frontend host.
  if (processedUrl.startsWith('/api/') || processedUrl.startsWith('/media/')) {
    if (BACKEND_ORIGIN && !processedUrl.startsWith('http')) {
      return `${BACKEND_ORIGIN}${processedUrl}`;
    }
    return processedUrl;
  }

  // 4. Direct Cloudinary URLs — auto-optimize to WebP with smart compression
  if (processedUrl.includes('res.cloudinary.com') && processedUrl.includes('/image/upload/')) {
    // If it already has transformations, preserve them
    if (processedUrl.includes('/f_auto') || processedUrl.includes('/f_webp') || processedUrl.includes('/q_auto')) {
      return processedUrl;
    }

    let transform = 'f_auto,q_auto';
    if (options.width) {
      transform += `,w_${options.width},c_limit`;
    }

    return processedUrl.replace('/image/upload/', `/image/upload/${transform}/`);
  }

  // 5. Absolute URLs (already starting with http:// or https://)
  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://')) {
    // If page is HTTPS and URL is HTTP to our domain, upgrade to HTTPS to avoid mixed content
    if (
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      processedUrl.startsWith('http://') &&
      (processedUrl.includes('anshuman892494.online') || processedUrl.includes('onrender.com'))
    ) {
      return processedUrl.replace('http://', 'https://');
    }
    return processedUrl;
  }

  // 6. Fallback relative path
  if (BACKEND_ORIGIN) {
    return `${BACKEND_ORIGIN}/${processedUrl.replace(/^\/+/, '')}`;
  }

  return processedUrl;
}

export default getSafeImageUrl;
