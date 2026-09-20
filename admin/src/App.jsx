import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Listings from './pages/Listings';
import Categories from './pages/Categories';
import Banners from './pages/Banners';
import Reports from './pages/Reports';
import Deals from './pages/Deals';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import SystemHealth from './pages/SystemHealth';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PermissionRoute from './components/PermissionRoute';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// A simple protected route component
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
    // Check if user is logged in securely via HttpOnly cookies
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/status/`);
        if (response.data.isAuthenticated && (response.data.is_staff || response.data.is_superuser)) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
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
    </BrowserRouter>
  );
}

export default App;
