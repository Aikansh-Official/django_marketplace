import { CanceledError } from 'axios';

const RETRY_DELAYS_MS = [5000, 10000, 15000];
const READ_BUDGET_MS = 60000;
const ATTEMPT_TIMEOUT_MS = 25000;
const NETWORK_ERRORS = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']);

function isReadRequest(config) {
  return ['get', 'head'].includes((config?.method || 'get').toLowerCase());
}

// Limit the entire read/retry sequence, including a slow first cold-start response.
export function prepareReadRequest(config, now = Date.now()) {
  if (!isReadRequest(config)) return config;
  config.coldStartRetry ||= { startedAt: now, attempts: 0, originalTimeout: config.timeout };
  const remaining = Math.max(1, READ_BUDGET_MS - (now - config.coldStartRetry.startedAt));
  const requestedTimeout = config.coldStartRetry.originalTimeout > 0
    ? config.coldStartRetry.originalTimeout : ATTEMPT_TIMEOUT_MS;
  config.timeout = Math.min(requestedTimeout, ATTEMPT_TIMEOUT_MS, remaining);
  return config;
}

export function nextReadRetryDelay(error, now = Date.now()) {
  const config = error.config;
  if (!config || !isReadRequest(config) || config.signal?.aborted ||
      error.code === 'ERR_CANCELED' || error.response?.data?.maintenance_mode) return null;

  const transient = error.response
    ? [502, 503, 504].includes(error.response.status)
    : NETWORK_ERRORS.has(error.code);
  if (!transient) return null;

  const retry = config.coldStartRetry;
  if (!retry) return null;
  const delay = RETRY_DELAYS_MS[retry.attempts];
  if (delay === undefined || now - retry.startedAt + delay >= READ_BUDGET_MS) return null;
  retry.attempts += 1;
  return delay;
}

export function waitForReadRetry(delay, signal, schedule = setTimeout, cancel = clearTimeout) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CanceledError());
      return;
    }
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const onAbort = () => {
      cancel(timer);
      cleanup();
      reject(new CanceledError());
    };
    const timer = schedule(() => {
      cleanup();
      resolve();
    }, delay);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
