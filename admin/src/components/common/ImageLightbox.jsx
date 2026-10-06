import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useState } from 'react';

export default function ImageLightbox({ src, alt = 'Preview Image', onClose }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-ink-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-ink-900/80 backdrop-blur-sm border border-gray-700/60 p-1.5 rounded-xl shadow-xl z-10 text-white">
        <button
          onClick={() => setZoom((prev) => Math.min(prev + 0.25, 3))}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-white"
          title="Open in new tab / Download"
        >
          <Download className="w-4 h-4" />
        </a>
        <div className="w-px h-4 bg-gray-700 mx-1" />
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Container */}
      <div className="max-w-5xl max-h-[85vh] overflow-auto flex items-center justify-center p-4">
        <img
          src={src}
          alt={alt}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl transition-transform duration-200"
        />
      </div>
    </div>,
    document.body
  );
}
