import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm max-w-md w-full">
        <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <SearchX className="w-10 h-10 text-brand-500" />
        </div>
        
        <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Page Not Found</h2>
        
        <p className="text-sm text-gray-500 mb-8 px-4">
          Oops! The page you're looking for doesn't exist, has been removed, or you typed the URL incorrectly.
        </p>

        <Link
          to="/"
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-md transition-all shadow-md hover:shadow-lg text-sm inline-flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </div>
    </div>
  );
}
