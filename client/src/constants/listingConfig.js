/**
 * listingConfig.js
 * Centralized marketplace constants for CampXChange.
 * Eliminates duplication across CreateListing, EditListing, ProductDetail, and Home pages.
 */

export const LPU_LOCATIONS = [
  'BH-1', 'BH-2', 'BH-3', 'BH-4', 'BH-5', 'BH-6', 'BH-7', 'BH-8',
  'GH-1', 'GH-2', 'GH-3', 'GH-4', 'GH-5', 'GH-6',
  'Block 34', 'Block 36', 'Block 38', 'Central Library',
  'Uni-Mall', 'Law Gate', 'Main Gate', 'Green Valley'
];

export const CONDITIONS = [
  { value: 'NEW', label: 'Brand New', desc: 'Unopened / with original tags' },
  { value: 'LIKE_NEW', label: 'Like New', desc: 'Barely used, flawless condition' },
  { value: 'GOOD', label: 'Good', desc: 'Gently used, fully functional' },
  { value: 'FAIR', label: 'Fair', desc: 'Visible wear, works fine' },
  { value: 'POOR', label: 'For Parts / Poor', desc: 'Needs repair or for parts' },
];

export const CONTACT_PREFERENCES = [
  { value: 'CHAT', label: 'In-App Chat Only', desc: 'Secure real-time chat keeps your phone and WhatsApp number private' },
];

export const TRANSACTION_FILTERS = [
  { value: 'ALL', label: 'All Modes' },
  { value: 'SELL', label: 'Buy & Sell' },
  { value: 'EXCHANGE', label: 'Exchange & Barter' },
  { value: 'DONATE', label: 'Free Donations' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Viewed' },
];

export function calculateSaleEndTime(hasSaleTimer, saleDuration, customSaleEndTime) {
  if (!hasSaleTimer) return null;
  if (saleDuration === 'custom') {
    return customSaleEndTime ? new Date(customSaleEndTime).toISOString() : null;
  }
  const now = new Date();
  if (saleDuration === '12h') now.setHours(now.getHours() + 12);
  else if (saleDuration === '24h') now.setHours(now.getHours() + 24);
  else if (saleDuration === '48h') now.setHours(now.getHours() + 48);
  else if (saleDuration === '3d') now.setDate(now.getDate() + 3);
  else if (saleDuration === '7d') now.setDate(now.getDate() + 7);
  return now.toISOString();
}

export function calculateDiscountPercent(originalPrice, price) {
  const orig = parseFloat(originalPrice);
  const curr = parseFloat(price);
  if (orig && curr && orig > curr && curr > 0) {
    return Math.round(((orig - curr) / orig) * 100);
  }
  return 0;
}
