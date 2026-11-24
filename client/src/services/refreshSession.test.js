import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { advanceRequestSession, clearFailedRefresh, isCurrentRequestSession, recordRequestSession, storeRefreshResult } from './refreshSession.js';

function storageWith(values) {
  const map = new Map(Object.entries(values));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

test('a refresh response that arrives after logout cannot restore tokens', async () => {
  const storage = storageWith({ access: 'old-access', refresh: 'old-refresh', user: 'old-user' });
  let deliver;
  const response = new Promise((resolve) => { deliver = resolve; });
  const inFlight = response.then((data) => storeRefreshResult(storage, 'old-refresh', data));
  for (const key of ['access', 'refresh', 'user']) storage.removeItem(key);
  deliver({ access: 'late-access', refresh: 'late-refresh' });
  assert.equal(await inFlight, false);
  assert.equal(storage.getItem('access'), null);
  assert.equal(storage.getItem('refresh'), null);
});

test('an old account request cannot be replayed after switching accounts', () => {
  const storage = storageWith({ access: 'old-access', refresh: 'old-refresh' });
  const deleteRequest = { method: 'delete', url: '/auth/account/' };
  recordRequestSession(deleteRequest, storage);
  assert.equal(isCurrentRequestSession(deleteRequest, storage), true);
  storage.setItem('access', 'new-access');
  storage.setItem('refresh', 'new-refresh');
  assert.equal(isCurrentRequestSession(deleteRequest, storage), false);
  assert.equal(JSON.stringify(deleteRequest).includes('old-refresh'), false);
});

test('Axios config merging preserves the original owner for queued and read replays', () => {
  const storage = storageWith({ refresh: 'old-refresh' });
  for (const method of ['delete', 'get']) {
    const original = { method, url: '/test/' };
    recordRequestSession(original, storage);
    const replay = axios.mergeConfig({}, original);
    assert.equal(isCurrentRequestSession(replay, storage), true);
    storage.setItem('refresh', 'new-refresh');
    recordRequestSession(replay, storage);
    assert.equal(isCurrentRequestSession(replay, storage), false);
    assert.equal(JSON.stringify(replay).includes('old-refresh'), false);
    storage.setItem('refresh', 'old-refresh');
  }
});

test('a valid refresh rotation allows replay only while that session stays active', () => {
  const storage = storageWith({ refresh: 'old-refresh' });
  const original = { method: 'delete', url: '/auth/account/' };
  recordRequestSession(original, storage);
  storage.setItem('refresh', 'rotated-refresh');
  assert.equal(advanceRequestSession(original, storage, 'old-refresh', 'rotated-refresh'), true);
  const replay = axios.mergeConfig({}, original);
  assert.equal(isCurrentRequestSession(replay, storage), true);
  storage.setItem('refresh', 'other-account-refresh');
  assert.equal(isCurrentRequestSession(replay, storage), false);
  assert.equal(advanceRequestSession(replay, storage, 'old-refresh', 'rotated-refresh'), false);
});

test('a stale refresh response or failure cannot replace or log out a different account', async () => {
  const storage = storageWith({ access: 'old-access', refresh: 'old-refresh', user: 'old-user' });
  let deliver;
  const response = new Promise((resolve) => { deliver = resolve; });
  const inFlight = response.then((data) => storeRefreshResult(storage, 'old-refresh', data));
  storage.setItem('access', 'new-access');
  storage.setItem('refresh', 'new-refresh');
  storage.setItem('user', 'new-user');
  deliver({ access: 'late-access', refresh: 'late-refresh' });
  assert.equal(await inFlight, false);
  assert.equal(clearFailedRefresh(storage, 'old-refresh'), false);
  assert.equal(storage.getItem('access'), 'new-access');
  assert.equal(storage.getItem('refresh'), 'new-refresh');
  assert.equal(storage.getItem('user'), 'new-user');
});

test('a current session can refresh and its own failed refresh can clear it', () => {
  const storage = storageWith({ access: 'old-access', refresh: 'old-refresh', user: 'user' });
  assert.equal(storeRefreshResult(storage, 'old-refresh', { access: 'new-access', refresh: 'new-refresh' }), true);
  assert.equal(storage.getItem('access'), 'new-access');
  assert.equal(storage.getItem('refresh'), 'new-refresh');
  assert.equal(clearFailedRefresh(storage, 'new-refresh'), true);
  assert.equal(storage.getItem('access'), null);
  assert.equal(storage.getItem('refresh'), null);
  assert.equal(storage.getItem('user'), null);
});
