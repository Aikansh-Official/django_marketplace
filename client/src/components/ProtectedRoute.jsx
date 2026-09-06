import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

import UniversalLoader from './common/UniversalLoader';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
    
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/status/`);
        if (response.data.isAuthenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
        }
      } catch (error) {
        setIsAuthenticated(false);
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <UniversalLoader fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    // If there is no token/cookie, redirect to home page which has the login modal
    return <Navigate to="/" replace />;
  }
  
  return children;
}
