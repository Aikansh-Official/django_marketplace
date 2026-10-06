import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AnnouncementBanner from './components/AnnouncementBanner';
import UrgentNoticeModal from './components/UrgentNoticeModal';
import MaintenanceScreen from './components/MaintenanceScreen';
import SuspendedAccountModal from './components/auth/SuspendedAccountModal';
import Footer from './components/Footer';
import Home from './pages/Home';

// Route-level code splitting for performance optimization
const CreateListing = lazy(() => import('./pages/CreateListing'));
const EditListing = lazy(() => import('./pages/EditListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const MyListings = lazy(() => import('./pages/MyListings'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const About = lazy(() => import('./pages/About'));
const Guidelines = lazy(() => import('./pages/Guidelines'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import UniversalLoader from './components/common/UniversalLoader';
import ErrorBoundary from './components/common/ErrorBoundary';
import ThemeBackground from './components/ThemeBackground';
import toast, { Toaster } from 'react-hot-toast';
import { LoadingProvider } from './context/LoadingContext';
import { AuthProvider } from './context/AuthContext';
import {
  setupForegroundNotifications,
  requestNotificationPermissionAndRegister,
  getNotificationPermission
} from './services/fcmService';
import NotificationOptInBanner from './components/notifications/NotificationOptInBanner';

function App() {
  // Global Image Protection & Anti-Exfiltration Layer
  useEffect(() => {
    const handleContextMenu = (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        e.preventDefault();
        toast('Image Protected: Direct link sharing & saving are disabled for student privacy.', {
          id: 'image-protected-notice',
          duration: 3000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: '600',
            border: '1px solid #334155'
          }
        });
      }
    };

    const handleDragStart = (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    // Dual-Device Session Management: notify user if logged in on another device
    const handleSessionTerminated = (e) => {
      const msg = e.detail?.message || 'Your web session was terminated because your account was logged in on another web browser/device.';
      toast.error(msg, {
        id: 'session-terminated-toast',
        duration: 7000,
        icon: '🔒',
        style: {
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #ef4444',
          fontSize: '13px',
          fontWeight: '600',
        },
      });
      window.dispatchEvent(new Event('auth-changed'));
    };

    window.addEventListener('session-terminated', handleSessionTerminated);

    // Initialize real-time FCM foreground listener
    setupForegroundNotifications();

    // Auto-register FCM device token and request permission by default for logged-in students
    const checkAndRegisterFCM = async () => {
      if (!localStorage.getItem('access')) return;
      const perm = getNotificationPermission();
      if (perm === 'granted') {
        requestNotificationPermissionAndRegister().catch(() => {});
      } else if (perm === 'default') {
        // Attempt programmatic request (works in many browsers or upon login redirect)
        requestNotificationPermissionAndRegister().catch(() => {});
      }
    };
    checkAndRegisterFCM();
    window.addEventListener('auth-changed', checkAndRegisterFCM);

    // Also prompt on first user gesture anywhere if permission is still default
    const handleFirstGestureForPush = () => {
      if (localStorage.getItem('access') && getNotificationPermission() === 'default') {
        requestNotificationPermissionAndRegister().catch(() => {});
      }
    };
    window.addEventListener('click', handleFirstGestureForPush, { once: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('session-terminated', handleSessionTerminated);
      window.removeEventListener('auth-changed', checkAndRegisterFCM);
      window.removeEventListener('click', handleFirstGestureForPush);
    };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <LoadingProvider>
        <AuthProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{ className: 'font-sans font-medium rounded-md shadow-lg', duration: 4000 }}
          />
        <div className="flex flex-col min-h-screen relative font-sans text-gray-900 bg-transparent">
          {/* 100% Auto-Animated Geometric Background */}
          <ThemeBackground />

          <div className="flex-1 flex flex-col relative z-10">
            <Navbar />
            <main className="flex-grow pt-16">
              <AnnouncementBanner />
              <NotificationOptInBanner />
              <UrgentNoticeModal />
              <MaintenanceScreen />
              <SuspendedAccountModal />

              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <UniversalLoader text="Loading CampusXChange..." size="md" />
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route
                      path="/sell"
                      element={
                        <ProtectedRoute>
                          <CreateListing />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/create-listing"
                      element={
                        <ProtectedRoute>
                          <CreateListing />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/edit-listing/:id"
                      element={
                        <ProtectedRoute>
                          <EditListing />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/listing/:id" element={<ProductDetail />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/guidelines" element={<Guidelines />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                      path="/my-listings"
                      element={
                        <ProtectedRoute>
                          <MyListings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages"
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages/:listingId/:peerId"
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/seller/:id"
                      element={
                        <ProtectedRoute>
                          <SellerProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </div>
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  );
}

export default App;
