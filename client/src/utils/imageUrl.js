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

  // 2. Relative API or Media URLs (/api/media/secure-image/... or /media/...)
  // In production, frontend is on cxc.anshuman892494.online and backend is on Render.
  // Prepending BACKEND_ORIGIN ensures the request hits the Django backend, not the static frontend host.
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/media/')) {
    if (BACKEND_ORIGIN && !trimmed.startsWith('http')) {
      return `${BACKEND_ORIGIN}${trimmed}`;
    }
    return trimmed;
  }

  // 3. Direct Cloudinary URLs — auto-optimize to WebP with smart compression
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
    // If it already has transformations, preserve them
    if (trimmed.includes('/f_auto') || trimmed.includes('/f_webp') || trimmed.includes('/q_auto')) {
      return trimmed;
    }

    let transform = 'f_auto,q_auto';
    if (options.width) {
      transform += `,w_${options.width},c_limit`;
    }

    return trimmed.replace('/image/upload/', `/image/upload/${transform}/`);
  }

  // 4. Absolute URLs (already starting with http:// or https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 5. Fallback relative path
  if (BACKEND_ORIGIN) {
    return `${BACKEND_ORIGIN}/${trimmed.replace(/^\/+/, '')}`;
  }

  return trimmed;
}

export default getSafeImageUrl;
