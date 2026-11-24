import axios from 'axios';
axios.defaults.withCredentials = true;

// Disable all console logs in production (prevents third-party SDKs and errant logs from printing)
if (import.meta.env.PROD) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
