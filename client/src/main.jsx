import axios from 'axios';
axios.defaults.withCredentials = true;

// Automatically attach Bearer token and App Security Key to all outgoing requests
axios.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // Attach Data Security Layer Key
  const appSecurityKey = import.meta.env.VITE_APP_SECURITY_KEY;
  if (appSecurityKey) {
    config.headers['X-App-Security-Key'] = appSecurityKey;
  }

  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Gracefully handle auth expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, clear local auth
      const isAuthRoute = error.config?.url?.includes('/auth/login/') || error.config?.url?.includes('/auth/register/');
      if (!isAuthRoute) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
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
  <StrictMode>
    <App />
  </StrictMode>,
)
