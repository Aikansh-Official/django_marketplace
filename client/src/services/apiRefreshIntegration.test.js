import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { createServer } from 'vite';

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test('real Axios interceptors preserve account ownership during refresh and replay', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = { dispatchEvent() {}, addEventListener() {} };
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  const oldAdapter = axios.defaults.adapter;
  try {
    const { default: api } = await server.ssrLoadModule('/src/services/api.js');
    const startSession = () => {
      values.clear();
      values.set('access', 'old-access');
      values.set('refresh', 'old-refresh');
      values.set('user', 'old-user');
    };
    const fail401 = (config) => Promise.reject(new axios.AxiosError(
      'Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {}, config }
    ));
    const ok = (config) => ({ status: 200, data: { ok: true }, headers: {}, config });

    // A normal rotation refreshes once and replays the original write.
    startSession();
    let calls = 0;
    api.defaults.adapter = async (config) => (++calls === 1 ? fail401(config) : ok(config));
    axios.defaults.adapter = async (config) => ({ ...ok(config), data: { access: 'rotated-access', refresh: 'rotated-refresh' } });
    await api.delete('/auth/account/');
    assert.equal(calls, 2);
    assert.equal(values.get('refresh'), 'rotated-refresh');

    // An old refresh response arriving after logout never replays the write.
    startSession();
    calls = 0;
    const started = deferred();
    const refresh = deferred();
    api.defaults.adapter = async (config) => { calls++; return fail401(config); };
    axios.defaults.adapter = async (config) => { started.resolve(); return { ...ok(config), data: await refresh.promise }; };
    const pending = api.delete('/auth/account/');
    await started.promise;
    values.clear();
    refresh.resolve({ access: 'late-access', refresh: 'late-refresh' });
    await assert.rejects(pending);
    assert.equal(calls, 1);
    assert.equal(values.has('access'), false);
    assert.equal(values.has('refresh'), false);

    // If the account changes after queued requests are released but before
    // their interceptors dispatch, neither the original nor queued write runs.
    startSession();
    calls = 0;
    const queueStarted = deferred();
    const secondFailed = deferred();
    const queuedRefresh = deferred();
    api.defaults.adapter = async (config) => {
      calls++;
      if (calls === 2) secondFailed.resolve();
      return fail401(config);
    };
    axios.defaults.adapter = async (config) => {
      queueStarted.resolve();
      return { ...ok(config), data: await queuedRefresh.promise };
    };
    const firstWrite = api.delete('/auth/account/');
    await queueStarted.promise;
    const queuedWrite = api.delete('/auth/account/');
    await secondFailed.promise;
    await new Promise((resolve) => setImmediate(resolve));
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      originalSetItem(key, value);
      if (key === 'access' && value === 'rotated-access') {
        queueMicrotask(() => {
          values.set('access', 'other-access');
          values.set('refresh', 'other-refresh');
          values.set('user', 'other-user');
        });
      }
    };
    queuedRefresh.resolve({ access: 'rotated-access', refresh: 'rotated-refresh' });
    const outcomes = await Promise.allSettled([firstWrite, queuedWrite]);
    assert.deepEqual(outcomes.map(({ status }) => status), ['rejected', 'rejected']);
    assert.equal(calls, 2);
    assert.equal(values.get('access'), 'other-access');
    assert.equal(values.get('refresh'), 'other-refresh');
    assert.equal(values.get('user'), 'other-user');
  } finally {
    axios.defaults.adapter = oldAdapter;
    await server.close();
    delete globalThis.localStorage;
    delete globalThis.window;
  }
});
