import api from '../services/api';

// Old unscoped wishlists are intentionally not imported: their owner is unknown.
const GUEST_KEY = 'campxchange_guest_saved_items';
let activeUserId = null;
let accountItems = [];
let loading = false;
let failed = false;
let generation = 0;
const pending = new Set();

function guestItems() {
  try {
    const data = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function notify() {
  const items = getSavedItems();
  window.dispatchEvent(new CustomEvent('saved-items-updated', { detail: { count: items.length, items, loading } }));
}
function currentStoredUserId() {
  try {
    if (!localStorage.getItem('access')) return null;
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id ? String(user.id) : null;
  } catch { return null; }
}
export const getSavedItems = () => {
  const current = currentStoredUserId();
  if (current !== activeUserId) return [];
  return current ? accountItems : guestItems();
};
export const getWishlistStatus = () => currentStoredUserId() !== activeUserId || loading ? 'loading' : failed ? 'error' : 'ready';
export const refreshWishlist = () => setWishlistUser(activeUserId, true);
export const getSavedCount = () => getSavedItems().length;
export const isItemSaved = (id) => Boolean(id && getSavedItems().some(item => String(item.id) === String(id)));

// Bind all account operations to a stable user id, not a buyer/seller role.
export async function setWishlistUser(userId, force = false) {
  const next = userId ? String(userId) : null;
  if (activeUserId === next && !force) return;
  activeUserId = next;
  accountItems = [];
  failed = false;
  const requestGeneration = ++generation;
  loading = Boolean(next);
  notify();
  if (!next) return;
  try {
    const response = await api.get('/marketplace/wishlist/', { wishlistUserId: next });
    if (generation === requestGeneration && currentStoredUserId() === next) accountItems = Array.isArray(response.data) ? response.data : [];
  } catch {
    if (generation === requestGeneration) {
      failed = true;
      window.dispatchEvent(new CustomEvent('wishlist-error', { detail: 'Could not load your wishlist. Please try again.' }));
    }
  } finally {
    if (generation === requestGeneration) { loading = false; notify(); }
  }
}

export async function toggleSavedItem(listing) {
  if (!listing?.id) throw new Error('Listing unavailable.');
  const id = String(listing.id);
  if (pending.has(id)) throw new Error('Please wait for the previous wishlist change.');
  if (loading || failed || currentStoredUserId() !== activeUserId) throw new Error('Wishlist is unavailable. Please try again.');
  const exists = isItemSaved(id);
  const currentGeneration = generation;
  if (activeUserId) {
    pending.add(id);
    try {
      if (exists) await api.delete(`/marketplace/wishlist/${encodeURIComponent(id)}/`, { wishlistUserId: activeUserId });
      else {
        const response = await api.put(`/marketplace/wishlist/${encodeURIComponent(id)}/`, null, { wishlistUserId: activeUserId });
        if (generation === currentGeneration) accountItems = [response.data, ...accountItems.filter(item => String(item.id) !== id)];
      }
      if (generation !== currentGeneration || currentStoredUserId() !== activeUserId) throw new Error('Account changed. Please try again.');
      if (exists) accountItems = accountItems.filter(item => String(item.id) !== id);
    } finally { pending.delete(id); }
  } else {
    const items = guestItems();
    const next = exists ? items.filter(item => String(item.id) !== id) : [listing, ...items];
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  }
  notify();
  return { isSaved: !exists, count: getSavedCount() };
}
export async function removeSavedItem(id) {
  const item = getSavedItems().find(item => String(item.id) === String(id));
  if (!item) throw new Error('Item is no longer in this wishlist.');
  await toggleSavedItem(item);
  return getSavedItems();
}
