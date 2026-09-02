import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import ProductDetail from './pages/ProductDetail';
import MyListings from './pages/MyListings';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ className: 'font-sans font-medium rounded-md shadow-lg', duration: 4000 }} />
      <div className="flex flex-col min-h-screen relative font-sans text-gray-900 bg-gray-50">
        
        <div className="flex-1 flex flex-col relative z-10">
          <Navbar />
          <main className="flex-grow pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/sell" element={<CreateListing />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/edit-listing/:id" element={<EditListing />} />
              <Route path="/listing/:id" element={<ProductDetail />} />
              <Route path="/my-listings" element={<MyListings />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
