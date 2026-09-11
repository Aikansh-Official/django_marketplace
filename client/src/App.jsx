import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AnnouncementBanner from './components/AnnouncementBanner';
import UrgentNoticeModal from './components/UrgentNoticeModal';
import Footer from './components/Footer';
import Home from './pages/Home';

import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import ProductDetail from './pages/ProductDetail';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import SellerProfile from './pages/SellerProfile';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Guidelines from './pages/Guidelines';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import ThemeBackground from './components/ThemeBackground';
import { Toaster } from 'react-hot-toast';
import { LoadingProvider } from './context/LoadingContext';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <LoadingProvider>
        <Toaster position="bottom-right" toastOptions={{ className: 'font-sans font-medium rounded-md shadow-lg', duration: 4000 }} />
        <div className="flex flex-col min-h-screen relative font-sans text-gray-900 bg-transparent">
          {/* 100% Auto-Animated Geometric Background */}
          <ThemeBackground />
          
          <div className="flex-1 flex flex-col relative z-10">
            <Navbar />
          <main className="flex-grow pt-16">
            <AnnouncementBanner />
            <UrgentNoticeModal />
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/sell" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
              <Route path="/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
              <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
              <Route path="/listing/:id" element={<ProductDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/guidelines" element={<Guidelines />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/my-listings" element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/seller/:id" element={<ProtectedRoute><SellerProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
      </LoadingProvider>
    </BrowserRouter>
  );
}

export default App;
