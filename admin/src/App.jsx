import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { api } from './config/api';
import AdminLayout from './layouts/AdminLayout';
import PermissionRoute from './components/PermissionRoute';
import AdminPageSkeleton from './components/common/AdminPageSkeleton';

// Code-split pages for high performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Listings = lazy(() => import('./pages/Listings'));
const Categories = lazy(() => import('./pages/Categories'));
const Banners = lazy(() => import('./pages/Banners'));
const Reports = lazy(() => import('./pages/Reports'));
const Deals = lazy(() => import('./pages/Deals'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const Team = lazy(() => import('./pages/Team'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));

// Protected route component
function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in securely
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/status/');
        if (response.data.isAuthenticated && (response.data.is_staff || response.data.is_superuser)) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-700 tracking-wider uppercase">Loading CampusXChange Admin...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ className: 'font-sans font-medium rounded-md shadow-lg', duration: 4000 }} />
      <Suspense fallback={<AdminPageSkeleton />}>
        <Routes>
          <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />

          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminLayout setAuth={setIsAuthenticated} />
              </ProtectedRoute>
            }
          >
            <Route index element={<PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>} />
            <Route path="analytics" element={<PermissionRoute requiredPermission="analytics"><Analytics /></PermissionRoute>} />
            <Route path="students" element={<PermissionRoute requiredPermission="students"><Students /></PermissionRoute>} />
            <Route path="listings" element={<PermissionRoute requiredPermission="listings"><Listings /></PermissionRoute>} />
            <Route path="deals" element={<PermissionRoute requiredPermission="deals"><Deals /></PermissionRoute>} />
            <Route path="categories" element={<PermissionRoute requiredPermission="categories"><Categories /></PermissionRoute>} />
            <Route path="banners" element={<PermissionRoute requiredPermission="banners"><Banners /></PermissionRoute>} />
            <Route path="reports" element={<PermissionRoute requiredPermission="reports"><Reports /></PermissionRoute>} />
            <Route path="notifications" element={<PermissionRoute requiredPermission="notifications"><Notifications /></PermissionRoute>} />
            <Route path="audit-logs" element={<PermissionRoute requiredPermission="audit_logs"><AuditLogs /></PermissionRoute>} />
            <Route path="system-health" element={<PermissionRoute requiredPermission="system_health"><SystemHealth /></PermissionRoute>} />
            <Route path="team" element={<PermissionRoute requiredPermission="team"><Team /></PermissionRoute>} />
            <Route path="settings" element={<PermissionRoute requiredPermission="settings"><Settings /></PermissionRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
