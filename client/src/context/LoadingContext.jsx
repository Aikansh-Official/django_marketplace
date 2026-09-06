import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import UniversalLoader from '../components/common/UniversalLoader';

const LoadingContext = createContext({
  isBuffering: false,
  bufferingText: '',
  bufferingSubtext: '',
  startBuffering: () => {},
  stopBuffering: () => {},
  withBuffering: async () => {}
});

export function LoadingProvider({ children }) {
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingText, setBufferingText] = useState('Loading...');
  const [bufferingSubtext, setBufferingSubtext] = useState('');
  
  // Top progress bar state
  const [topBarProgress, setTopBarProgress] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);

  const location = useLocation();

  const startBuffering = useCallback((text = 'Loading...', subtext = '') => {
    setBufferingText(text);
    setBufferingSubtext(subtext);
    setIsBuffering(true);
    setShowTopBar(true);
    setTopBarProgress(30);
  }, []);

  const stopBuffering = useCallback(() => {
    setTopBarProgress(100);
    setTimeout(() => {
      setIsBuffering(false);
      setShowTopBar(false);
      setTopBarProgress(0);
    }, 200);
  }, []);

  const withBuffering = useCallback(async (asyncFn, text, subtext) => {
    startBuffering(text, subtext);
    try {
      if (typeof asyncFn === 'function') {
        return await asyncFn();
      }
      return await asyncFn;
    } finally {
      stopBuffering();
    }
  }, [startBuffering, stopBuffering]);

  // Route change listener: Provides instant top-bar buffering feedback on any page navigation
  useEffect(() => {
    setShowTopBar(true);
    setTopBarProgress(45);
    const midTimer = setTimeout(() => setTopBarProgress(80), 80);
    const endTimer = setTimeout(() => {
      setTopBarProgress(100);
      setTimeout(() => {
        setShowTopBar(false);
        setTopBarProgress(0);
      }, 150);
    }, 220);

    return () => {
      clearTimeout(midTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname, location.search]);

  // Global window event listeners for app-wide decoupling
  useEffect(() => {
    const handleStart = (e) => {
      const { text, subtext } = e.detail || {};
      startBuffering(text, subtext);
    };
    const handleStop = () => {
      stopBuffering();
    };

    window.addEventListener('app:start-buffering', handleStart);
    window.addEventListener('app:stop-buffering', handleStop);

    return () => {
      window.removeEventListener('app:start-buffering', handleStart);
      window.removeEventListener('app:stop-buffering', handleStop);
    };
  }, [startBuffering, stopBuffering]);

  return (
    <LoadingContext.Provider
      value={{
        isBuffering,
        bufferingText,
        bufferingSubtext,
        startBuffering,
        stopBuffering,
        withBuffering
      }}
    >
      {/* Top Micro-Buffer Progress Bar (Instant feedback on route changes & async tasks) */}
      {showTopBar && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-brand-500 via-amber-400 to-brand-600 shadow-[0_0_12px_rgba(251,86,7,0.8)] transition-all duration-200 ease-out"
            style={{ width: `${topBarProgress}%` }}
          />
        </div>
      )}

      {/* Global Full-Screen Buffering Overlay (When triggered globally) */}
      {isBuffering && (
        <UniversalLoader
          fullScreen
          text={bufferingText}
          subtext={bufferingSubtext}
          size="lg"
        />
      )}

      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
