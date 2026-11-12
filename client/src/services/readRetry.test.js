import assert from 'node:assert/strict';
import test from 'node:test';
import { nextReadRetryDelay, prepareReadRequest, waitForReadRetry } from './readRetry.js';

function failure(method = 'get', status = 502) {
  const config = prepareReadRequest({ method, timeout: 0 }, 0);
  return { config, response: { status, data: {} } };
}

test('a temporary gateway failure can recover on a bounded read replay', async () => {
  const error = failure();
  let calls = 0;
  const results = [error, { data: ['real listing'] }];
  let result;
  let time = 0;
  while (calls < 5) {
    result = results[calls++];
    if (!result.response) break;
    const delay = nextReadRetryDelay(result, time);
    assert.equal(delay, 5000);
    time += delay;
    prepareReadRequest(result.config, time);
  }
  assert.equal(calls, 2);
  assert.deepEqual(result.data, ['real listing']);
});

test('writes and auth failures are never retried', () => {
  for (const method of ['post', 'patch', 'put', 'delete', 'options']) {
    assert.equal(nextReadRetryDelay(failure(method), 0), null);
  }
  for (const status of [400, 401, 403, 404, 429, 500]) {
    assert.equal(nextReadRetryDelay(failure('get', status), 0), null);
  }
});

test('only gateway failures and known transport failures retry; maintenance does not', () => {
  for (const status of [502, 503, 504]) {
    assert.equal(nextReadRetryDelay(failure('head', status), 0), 5000);
  }
  for (const code of ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']) {
    const error = failure();
    delete error.response;
    error.code = code;
    assert.equal(nextReadRetryDelay(error, 0), 5000);
  }
  const maintenance = failure('get', 503);
  maintenance.response.data.maintenance_mode = true;
  assert.equal(nextReadRetryDelay(maintenance, 0), null);
  const unexpected = failure();
  delete unexpected.response;
  assert.equal(nextReadRetryDelay(unexpected, 0), null);
});

test('attempt count and elapsed budget stop a persistent outage', () => {
  const error = failure();
  assert.equal(nextReadRetryDelay(error, 0), 5000);
  assert.equal(nextReadRetryDelay(error, 5000), 10000);
  assert.equal(nextReadRetryDelay(error, 15000), 15000);
  assert.equal(nextReadRetryDelay(error, 30000), null);
  const elapsed = failure();
  assert.equal(nextReadRetryDelay(elapsed, 56000), null);
  assert.equal(prepareReadRequest(elapsed.config, 59000).timeout, 1000);
  assert.equal(prepareReadRequest({ method: 'post', timeout: 90000 }, 0).timeout, 90000);
});

test('aborting during backoff cancels its timer and prevents a replay', async () => {
  const controller = new AbortController();
  const error = failure();
  error.config.signal = controller.signal;
  let scheduledCallback;
  let cancellations = 0;
  const waiting = waitForReadRetry(5000, controller.signal, (callback) => {
    scheduledCallback = callback;
    return 123;
  }, (timer) => { assert.equal(timer, 123); cancellations++; });
  controller.abort();
  await assert.rejects(waiting, (err) => err.code === 'ERR_CANCELED');
  assert.equal(cancellations, 1);
  assert.equal(nextReadRetryDelay(error, 0), null);
  // A cleared callback cannot resolve or trigger an HTTP request after cancellation.
  scheduledCallback();
  await assert.rejects(waitForReadRetry(1, controller.signal), (err) => err.code === 'ERR_CANCELED');
});

test('successful backoff removes the abort listener and leaves no active timer', async () => {
  const controller = new AbortController();
  let finish;
  let cancellations = 0;
  const waiting = waitForReadRetry(1, controller.signal,
    (callback) => { finish = callback; return 4; }, () => { cancellations++; });
  finish();
  await waiting;
  controller.abort();
  assert.equal(cancellations, 0);
});
