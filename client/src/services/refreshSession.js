const requestSessions = new WeakMap();
class RequestSessionOwner {}

// Keep the refresh token out of Axios request configs, which can be logged on
// errors, while remembering which account initiated each request.
export function recordRequestSession(config, storage) {
  // Axios merges and clones plain config objects before a replay. A class
  // instance remains the same reference across that merge, so a replay keeps
  // the owner of the original request rather than adopting the current user.
  if (!config._requestSessionOwner) {
    config._requestSessionOwner = new RequestSessionOwner();
    requestSessions.set(config._requestSessionOwner, storage.getItem('refresh'));
  }
}

export function isCurrentRequestSession(config, storage) {
  const owner = config._requestSessionOwner;
  return requestSessions.has(owner) && requestSessions.get(owner) === storage.getItem('refresh');
}

export function advanceRequestSession(config, storage, previousRefresh, nextRefresh) {
  const owner = config._requestSessionOwner;
  if (!requestSessions.has(owner) || requestSessions.get(owner) !== previousRefresh ||
      storage.getItem('refresh') !== nextRefresh) return false;
  requestSessions.set(owner, nextRefresh);
  return true;
}

// A refresh response belongs only to the session that started it. A user may
// have logged out, deleted the account, or signed into another account while
// the request was in flight.
export function storeRefreshResult(storage, expectedRefresh, data) {
  if (storage.getItem('refresh') !== expectedRefresh) return false;
  storage.setItem('access', data.access);
  if (data.refresh) storage.setItem('refresh', data.refresh);
  return true;
}

export function clearFailedRefresh(storage, expectedRefresh) {
  if (storage.getItem('refresh') !== expectedRefresh) return false;
  storage.removeItem('access');
  storage.removeItem('refresh');
  storage.removeItem('user');
  return true;
}
