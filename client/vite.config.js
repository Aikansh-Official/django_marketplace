import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Binds to 0.0.0.0 so other devices on the same Wi-Fi can access it
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '^/media/': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('tesseract.js')) {
              return 'vendor-ocr';
            }
            if (id.includes('html5-qrcode')) {
              return 'vendor-scanner';
            }
            if (id.includes('leaflet')) {
              return 'vendor-maps';
            }
          }
        },
      },
    },
  },
})
