import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token & app security key
api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    const appSecurityKey = import.meta.env.VITE_APP_SECURITY_KEY;
    if (appSecurityKey) {
      config.headers['X-App-Security-Key'] = appSecurityKey;
    }

    // Platform identifier for dual-device session isolation (1 Web + 1 Android)
    config.headers['X-Client-Type'] = 'web';

    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh queue management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: handle token refresh, 503 maintenance, 403 suspension
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const data = error.response?.data;

    // 1. Maintenance Mode (503)
    if (status === 503 && (data?.maintenance_mode || data?.error)) {
      window.dispatchEvent(
        new CustomEvent('platform-maintenance', {
          detail: {
            message: data?.error || 'CampXChange is currently undergoing maintenance.',
            maintenance_mode: true,
          },
        })
      );
      return Promise.reject(error);
    }

    // 2. Account Suspension / Ban (403 or specific payload)
    if (
      status === 403 &&
      (data?.is_active === false ||
        data?.account_suspended ||
        (typeof data?.error === 'string' && data.error.toLowerCase().includes('suspend')))
    ) {
      window.dispatchEvent(
        new CustomEvent('account-suspended', {
          detail: {
            message: data?.error || 'Your student account has been suspended by Campus Safety.',
            reason: data?.reason || 'Safety guideline violation',
          },
        })
      );
      return Promise.reject(error);
    }

    // 3. Token Expiration (401) with silent refresh retry
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthUrl =
        originalRequest.url?.includes('/auth/login/') ||
        originalRequest.url?.includes('/auth/google/') ||
        originalRequest.url?.includes('/auth/register/') ||
        originalRequest.url?.includes('/auth/forgot-password/') ||
        originalRequest.url?.includes('/auth/reset-password/') ||
        originalRequest.url?.includes('/auth/token/refresh/');

      if (isAuthUrl) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(`${API_BASE}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess = refreshRes.data.access;
        localStorage.setItem('access', newAccess);
        if (refreshRes.data.refresh) {
          localStorage.setItem('refresh', refreshRes.data.refresh);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');

        const isSessionInvalid = refreshErr.response?.data?.session_invalidated;
        const errMsg = refreshErr.response?.data?.error;

        if (isSessionInvalid) {
          window.dispatchEvent(
            new CustomEvent('session-terminated', {
              detail: {
                message: errMsg || 'Your web session was terminated because your account was logged in on another device.',
              },
            })
          );
        } else {
          window.dispatchEvent(new Event('auth-expired'));
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Standardized error message extractor
export function getErrorMessage(error, defaultMessage = 'An unexpected error occurred.') {
  if (!error) return defaultMessage;
  const data = error.response?.data;
  if (typeof data === 'string') return data;
  if (data?.error && typeof data.error === 'string') return data.error;
  if (data?.detail && typeof data.detail === 'string') return data.detail;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      return Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
    }
  }
  return error.message || defaultMessage;
}

// Global cached platform config fetcher
let cachedConfig = null;
let configFetchPromise = null;

export async function getPlatformConfig(forceRefresh = false) {
  if (cachedConfig && !forceRefresh) return cachedConfig;
  if (configFetchPromise && !forceRefresh) return configFetchPromise;

  configFetchPromise = api
    .get('/marketplace/config/')
    .then((res) => {
      cachedConfig = res.data;
      configFetchPromise = null;
      return cachedConfig;
    })
    .catch((err) => {
      configFetchPromise = null;
      // Default safe fallback if endpoint unreachable
      return {
        maintenance_mode: false,
        maintenance_message: '',
        allow_registrations: true,
        max_active_listings_per_student: 10,
        min_trust_score_to_sell: 0,
        handover_qr_expiry_minutes: 30,
        allowed_domains: 'lpu.in',
        otp_daily_limit: 5,
        announcement: { enabled: false },
      };
    });

  return configFetchPromise;
}

// In-memory cached categories fetcher
let cachedCategories = null;
let categoriesFetchPromise = null;

export async function getCategories(forceRefresh = false) {
  if (cachedCategories && !forceRefresh) return cachedCategories;
  if (categoriesFetchPromise && !forceRefresh) return categoriesFetchPromise;

  categoriesFetchPromise = api
    .get('/marketplace/categories/')
    .then((res) => {
      cachedCategories = res.data;
      categoriesFetchPromise = null;
      return cachedCategories;
    })
    .catch((err) => {
      categoriesFetchPromise = null;
      throw err;
    });

  return categoriesFetchPromise;
}

// In-memory cached banners fetcher
let cachedBanners = null;
let bannersFetchPromise = null;

export async function getBanners(forceRefresh = false) {
  if (cachedBanners && !forceRefresh) return cachedBanners;
  if (bannersFetchPromise && !forceRefresh) return bannersFetchPromise;

  bannersFetchPromise = api
    .get('/marketplace/banners/')
    .then((res) => {
      cachedBanners = Array.isArray(res.data) ? res.data : [];
      bannersFetchPromise = null;
      return cachedBanners;
    })
    .catch((err) => {
      bannersFetchPromise = null;
      throw err;
    });

  return bannersFetchPromise;
}

// In-memory cached auth status fetcher (deduplicates simultaneous calls across Navbar, Home, FCM)
let cachedAuthStatus = null;
let authStatusFetchPromise = null;

export async function getAuthStatus(forceRefresh = false) {
  if (cachedAuthStatus && !forceRefresh) return cachedAuthStatus;
  if (authStatusFetchPromise && !forceRefresh) return authStatusFetchPromise;

  authStatusFetchPromise = api
    .get('/auth/status/')
    .then((res) => {
      cachedAuthStatus = res.data;
      authStatusFetchPromise = null;
      return cachedAuthStatus;
    })
    .catch((err) => {
      authStatusFetchPromise = null;
      throw err;
    });

  return authStatusFetchPromise;
}

export function invalidateAuthStatusCache() {
  cachedAuthStatus = null;
  authStatusFetchPromise = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('auth-changed', invalidateAuthStatusCache);
}

// In-memory cached community hub data fetcher
let cachedCommunityHub = null;
let communityHubFetchPromise = null;

export async function getCommunityHubData(forceRefresh = false) {
  if (cachedCommunityHub && !forceRefresh) return cachedCommunityHub;
  if (communityHubFetchPromise && !forceRefresh) return communityHubFetchPromise;

  communityHubFetchPromise = api
    .get('/marketplace/community-hub/')
    .then((res) => {
      cachedCommunityHub = res.data;
      communityHubFetchPromise = null;
      return cachedCommunityHub;
    })
    .catch((err) => {
      communityHubFetchPromise = null;
      throw err;
    });

  return communityHubFetchPromise;
}

// Safe report submission & fetchers
export async function submitReport({ listingId, reportedUserId, reason, details }) {
  const payload = { reason, details };
  if (listingId) payload.listing = listingId;
  if (reportedUserId) payload.reported_user = reportedUserId;
  return api.post('/marketplace/reports/', payload);
}

export async function getMyReports() {
  return api.get('/marketplace/my-reports/');
}

export default api;

