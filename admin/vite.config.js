import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Read unified version from master root version.json (fallback to package.json)
let appVersion = '2.4.0'
let releaseStage = 'Enterprise'
let releaseDate = 'October 2026'
let buildName = 'CampusXChange Admin v2.4.0'

try {
  const rootVersionPath = path.resolve(__dirname, '../version.json')
  const localPkgPath = path.resolve(__dirname, 'package.json')
  if (fs.existsSync(rootVersionPath)) {
    const data = JSON.parse(fs.readFileSync(rootVersionPath, 'utf-8'))
    appVersion = data.version || appVersion
    releaseStage = data.releaseStage || releaseStage
    releaseDate = data.releaseDate || releaseDate
    buildName = data.admin?.buildName || `CampusXChange Admin v${appVersion}`
  } else if (fs.existsSync(localPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf-8'))
    appVersion = pkg.version || appVersion
    buildName = `CampusXChange Admin v${appVersion}`
  }
} catch {
  // Safe fallbacks
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_NAME__: JSON.stringify(buildName),
    __APP_RELEASE_STAGE__: JSON.stringify(releaseStage),
    __APP_RELEASE_DATE__: JSON.stringify(releaseDate),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router-dom')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }
        },
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
    host: true,
    port: 5174,
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
})


