/**
 * Global Real-Time Trade Event Emitter & Listener Helpers
 * Enables immediate synchronization across components and browser windows
 * for all buyer and seller interactions without requiring manual page reload.
 */

export const TRADE_ACTIONS = {
  NEW_OFFER: 'NEW_OFFER',
  OFFER_RESPONDED: 'OFFER_RESPONDED',
  OFFER_COUNTERED: 'OFFER_COUNTERED',
  COUNTER_RESPONDED: 'COUNTER_RESPONDED',
  DEAL_CANCELLED: 'DEAL_CANCELLED',
  DEAL_COMPLETED: 'DEAL_COMPLETED'
};

/**
 * Emit a trade event to both the local window and cross-window storage
 * @param {string} action - One of TRADE_ACTIONS
 * @param {object} payload - Relevant metadata such as listingId, offerId, etc.
 */
export const emitTradeEvent = (action, payload = {}) => {
  const eventDetail = {
    action,
    timestamp: Date.now(),
    ...payload
  };

  // 1. Same-window custom event
  try {
    window.dispatchEvent(new CustomEvent('trade-updated', { detail: eventDetail }));
  } catch (e) {
    // Non-critical if custom event dispatch fails
  }

  // 2. Cross-tab / cross-window storage broadcast
  try {
    localStorage.setItem('trade_updated_event', JSON.stringify(eventDetail));
  } catch (e) {
    // Non-critical if storage fails (e.g. incognito quota)
  }

  // 3. Keep notifications badge in sync
  try {
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch (e) {
    // Non-critical
  }
};
