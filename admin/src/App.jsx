import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Listings from './pages/Listings';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';

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
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="listings" element={<Listings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
