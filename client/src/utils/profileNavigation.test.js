import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfileTab, prioritizeOffer, tradeSubTab } from './profileNavigation.js';

test('buyer and seller notification links select a real profile section', () => {
  assert.equal(normalizeProfileTab('my-orders'), 'orders-sells');
  assert.equal(normalizeProfileTab('my-sales'), 'orders-sells');
  assert.equal(tradeSubTab('my-orders', true), 'orders');
  assert.equal(tradeSubTab('my-sales', true), 'selling');
  assert.equal(tradeSubTab('my-sales', false), 'orders');
});

test('a notification highlights its deal first without losing other deals', () => {
  const orders = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  assert.deepEqual(prioritizeOffer(orders, 'two').map((item) => item.id), ['two', 'one', 'three']);
  assert.deepEqual(prioritizeOffer(orders, 'missing'), orders);
});
