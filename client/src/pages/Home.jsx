import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, MapPin, Heart } from 'lucide-react';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/marketplace/listings/');
        setListings(response.data);
      } catch (err) {
        setError('Failed to fetch listings');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 1) return 'TODAY';
    if (diffDays === 2) return 'YESTERDAY';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] w-full">
      {/* Search Header (OLX style) */}
      <div className="bg-white/80 backdrop-blur-md py-4 border-b border-gray-200 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex bg-white border-2 border-gray-200 hover:border-brand-300 rounded-md p-2 items-center focus-within:border-brand-500 transition-colors shadow-sm">
            <Search className="h-5 w-5 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Find Textbooks, Electronics and more..." 
              className="w-full outline-none text-gray-800 bg-transparent font-medium placeholder-gray-400"
            />
          </div>
          <div className="sm:w-1/3 flex bg-white border-2 border-gray-200 hover:border-brand-300 rounded-md p-2 items-center focus-within:border-brand-500 transition-colors shadow-sm">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="LPU Campus, Phagwara" 
              className="w-full outline-none text-gray-800 bg-transparent font-medium placeholder-gray-400"
              defaultValue="LPU Campus"
            />
          </div>
          <button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-8 rounded-md transition-all shadow-md hover:shadow-lg">
            Search
          </button>
        </div>
      </div>

      {/* Categories Banner */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-100 shadow-sm hidden md:block relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ul className="flex gap-6 text-sm font-semibold text-gray-700 overflow-x-auto whitespace-nowrap">
            <li className="cursor-pointer hover:text-brand-600 uppercase font-bold">All Categories</li>
            <li className="cursor-pointer hover:text-brand-600">Textbooks</li>
            <li className="cursor-pointer hover:text-brand-600">Electronics</li>
            <li className="cursor-pointer hover:text-brand-600">Hostel Essentials</li>
            <li className="cursor-pointer hover:text-brand-600">Bicycles</li>
            <li className="cursor-pointer hover:text-brand-600">Laptops</li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Fresh recommendations</h2>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-10 font-bold bg-white rounded-md border border-red-100">{error}</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-md shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-700 mb-2">No listings found</h3>
            <p className="text-gray-500">Be the first to post an item in the marketplace!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => {
              const primaryImage = listing.images?.find(img => img.is_primary)?.image_url 
                                || listing.images?.[0]?.image_url 
                                || 'https://placehold.co/400x300?text=No+Image';

              return (
                <Link to={`/listing/${listing.id}`} key={listing.id} className="bg-white border border-gray-100 rounded-md overflow-hidden hover:shadow-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow group flex flex-col">
                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-gray-100 p-2 flex items-center justify-center">
                    <img 
                      src={primaryImage} 
                      alt={listing.title} 
                      className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                    />
                    <button className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors z-10" onClick={(e) => { e.preventDefault(); /* handle favorite */ }}>
                      <Heart className="h-5 w-5" />
                    </button>
                    {listing.transaction_type === 'RENT' && (
                      <div className="absolute top-3 left-3 bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                        FOR RENT
                      </div>
                    )}
                  </div>

                  {/* Content Container */}
                  <div className="p-4 flex flex-col flex-grow border-t border-gray-100">
                    <h3 className="font-bold text-2xl text-gray-900 mb-1">
                      ₹ {listing.price}
                    </h3>
                    <p className="text-gray-600 text-sm truncate mb-4" title={listing.title}>
                      {listing.title}
                    </p>
                    
                    <div className="mt-auto flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center gap-1 truncate max-w-[70%]">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{listing.location}</span>
                      </span>
                      <span className="uppercase whitespace-nowrap">{formatDate(listing.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        
        {listings.length > 0 && (
          <div className="flex justify-center mt-10">
            <button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 px-8 rounded-md transition-all shadow-sm">
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
