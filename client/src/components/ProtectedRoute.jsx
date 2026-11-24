import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';

import UniversalLoader from './common/UniversalLoader';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
    
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async (retryCount = 0) => {
      try {
        const response = await api.get('/auth/status/');
        if (!isMounted) return;
        if (response.data.isAuthenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
        }
      } catch (error) {
        // If transient network glitch or server redeploying / waking from sleep, retry once
        if (retryCount < 1) {
          setTimeout(() => {
            if (isMounted) checkAuth(retryCount + 1);
          }, 1500);
          return;
        }
        if (!isMounted) return;
        setIsAuthenticated(false);
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
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
