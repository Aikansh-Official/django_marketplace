// Old notification links use separate names for the two sides of a trade.
export function normalizeProfileTab(tab) {
  if (!tab) return 'personal-info';
  if (tab === 'verification') return 'id-verification';
  if (['my-orders', 'my_orders', 'my-sales', 'my_sales', 'orders_sells'].includes(tab)) return 'orders-sells';
  return tab;
}

export function tradeSubTab(tab, isSeller) {
  if (tab === 'my-orders' || tab === 'my_orders') return 'orders';
  if (tab === 'my-sales' || tab === 'my_sales') return isSeller ? 'selling' : 'orders';
  return isSeller ? 'selling' : 'orders';
}

export function prioritizeOffer(orders, offerId) {
  if (!offerId) return orders;
  const index = orders.findIndex((offer) => String(offer.id) === String(offerId));
  if (index <= 0) return orders;
  return [orders[index], ...orders.slice(0, index), ...orders.slice(index + 1)];
}
