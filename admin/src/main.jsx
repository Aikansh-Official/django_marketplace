import axios from 'axios';
axios.defaults.withCredentials = true;

// Automatically attach admin JWT token and App Security Key to all outgoing requests
axios.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // Attach Data Security Layer Key
  const appSecurityKey = import.meta.env.VITE_APP_SECURITY_KEY;
  if (appSecurityKey) {
    config.headers['X-App-Security-Key'] = appSecurityKey;
  }

  // Dual-Device Session Isolation
  config.headers['X-Client-Type'] = 'web';

  const token = localStorage.getItem('admin_access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

axios.interceptors.response.use(
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
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <App />
)
