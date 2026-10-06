import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getAuthStatus, invalidateAuthStatusCache } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access') || null);
  const [loading, setLoading] = useState(false);

  // Synchronize state from storage and backend status
  const syncAuthState = useCallback(async (forceFetch = false) => {
    try {
      const token = localStorage.getItem('access');
      setAccessToken(token);

      const storedUserStr = localStorage.getItem('user');
      if (storedUserStr) {
        try {
          setUser(JSON.parse(storedUserStr));
        } catch {
          // invalid json
        }
      }

      if (token && (!storedUserStr || forceFetch)) {
        setLoading(true);
        const data = await getAuthStatus(forceFetch);
        if (data?.isAuthenticated && data?.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else if (!data?.isAuthenticated) {
          setUser(null);
          setAccessToken(null);
        }
      } else if (!token) {
        setUser(null);
      }
    } catch (err) {
      // Guest or network offline fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // Login handler
  const login = useCallback((authData) => {
    if (authData?.access) {
      localStorage.setItem('access', authData.access);
      setAccessToken(authData.access);
    }
    if (authData?.refresh) {
      localStorage.setItem('refresh', authData.refresh);
    }
    if (authData?.user) {
      localStorage.setItem('user', JSON.stringify(authData.user));
      setUser(authData.user);
    }
    invalidateAuthStatusCache();
    window.dispatchEvent(new Event('auth-changed'));
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
    invalidateAuthStatusCache();
    window.dispatchEvent(new Event('auth-changed'));
  }, []);

  // Update profile in state and localStorage
  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const next = typeof updatedUserData === 'function' ? updatedUserData(prev) : { ...prev, ...updatedUserData };
      if (next) {
        localStorage.setItem('user', JSON.stringify(next));
      } else {
        localStorage.removeItem('user');
      }
      return next;
    });
    invalidateAuthStatusCache();
    window.dispatchEvent(new Event('auth-changed'));
  }, []);

  useEffect(() => {
    syncAuthState();

    const handleAuthChanged = () => {
      syncAuthState();
    };

    const handleStorage = (e) => {
      if (e.key === 'access' || e.key === 'user') {
        syncAuthState();
      }
    };

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth-changed', handleAuthChanged);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-expired', handleAuthExpired);
    window.addEventListener('session-terminated', handleAuthExpired);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.removeEventListener('session-terminated', handleAuthExpired);
    };
  }, [syncAuthState, logout]);

  // Derived role values memoized for speed
  const isAuthenticated = useMemo(() => Boolean(accessToken && user), [accessToken, user]);

  const isSeller = useMemo(() => {
    return Boolean(
      user && (
        user.role === 'SELLER' ||
        user.is_id_verified ||
        user.is_staff ||
        user.is_superuser
      )
    );
  }, [user]);

  const isBuyer = useMemo(() => {
    return Boolean(user && !isSeller);
  }, [user, isSeller]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isSeller,
      isBuyer,
      loading,
      login,
      logout,
      updateUser,
      refreshAuth: () => syncAuthState(true),
    }),
    [user, accessToken, isAuthenticated, isSeller, isBuyer, loading, login, logout, updateUser, syncAuthState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
