import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';

export default function LogoutModal({ isOpen, onClose, onConfirm, loggingOut }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-md max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-md bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 text-center">
          Log Out of LPXchange?
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2">
          You will be logged out of your campus account on this device. You will need to sign in again to manage your listings, saved items, or messages.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loggingOut}
            className="flex-1 py-2.5 px-4 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loggingOut}
            className="flex-1 py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 text-sm font-semibold text-white shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {loggingOut ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
