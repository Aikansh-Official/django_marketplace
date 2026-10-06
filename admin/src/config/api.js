import axios from 'axios';

// Standardized API base URL with solid fallback
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Create a configured axios instance for admin panel
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'X-Client-Type': 'web',
  },
});

// Request interceptor: attach security key and bearer token
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  const appSecurityKey = import.meta.env.VITE_APP_SECURITY_KEY;
  if (appSecurityKey) {
    config.headers['X-App-Security-Key'] = appSecurityKey;
  }

  const token = localStorage.getItem('admin_access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle token expiration cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login/');
      if (!isAuthRoute) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
