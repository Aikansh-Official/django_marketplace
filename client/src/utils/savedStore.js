// Utility for managing saved / bookmarked marketplace listings
const STORAGE_KEY = 'lputrade_saved_items';

export const getSavedItems = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading saved items:', e);
    return [];
  }
};

export const isItemSaved = (id) => {
  if (!id) return false;
  const items = getSavedItems();
  return items.some((item) => String(item.id) === String(id));
};

export const toggleSavedItem = (listing) => {
  if (!listing || !listing.id) return { isSaved: false, count: 0 };
  const items = getSavedItems();
  const index = items.findIndex((item) => String(item.id) === String(listing.id));
  
  let newItems;
  let isSaved;

  if (index >= 0) {
    newItems = items.filter((item) => String(item.id) !== String(listing.id));
    isSaved = false;
  } else {
    // Keep clean normalized structure
    const coverImage = listing.images?.find((img) => img.is_primary)?.image_url 
      || listing.images?.[0]?.image_url 
      || listing.image 
      || null;

    const normalized = {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      transaction_type: listing.transaction_type || 'SELL',
      rent_period: listing.rent_period || null,
      condition: listing.condition || 'GOOD',
      location: listing.location || 'Campus',
      category: listing.category || { name: 'General' },
      images: listing.images || (coverImage ? [{ image_url: coverImage, is_primary: true }] : []),
      seller: listing.seller || null,
      created_at: listing.created_at || new Date().toISOString(),
      saved_at: new Date().toISOString()
    };

    newItems = [normalized, ...items];
    isSaved = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  } catch (e) {
    console.error('Error saving item to localStorage:', e);
  }

  window.dispatchEvent(new CustomEvent('saved-items-updated', { detail: { count: newItems.length, items: newItems } }));
  return { isSaved, count: newItems.length };
};

export const removeSavedItem = (id) => {
  if (!id) return;
  const items = getSavedItems();
  const newItems = items.filter((item) => String(item.id) !== String(id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  } catch (e) {
    console.error('Error removing saved item:', e);
  }
  window.dispatchEvent(new CustomEvent('saved-items-updated', { detail: { count: newItems.length, items: newItems } }));
  return newItems;
};

export const getSavedCount = () => {
  return getSavedItems().length;
};
