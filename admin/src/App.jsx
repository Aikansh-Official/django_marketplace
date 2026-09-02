import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Listings from './pages/Listings';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';

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
    // Check if user is logged in
    const token = localStorage.getItem('admin_access');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-ink-900 text-white">Loading...</div>;
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
