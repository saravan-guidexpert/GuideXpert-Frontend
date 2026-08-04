import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Default: deployed backend so `npm run dev` works without a local Node server.
// For local API: copy `.env.development.local.example` → `.env.development.local` and set
// VITE_PROXY_TARGET=http://127.0.0.1:5000, then restart Vite.
const DEFAULT_PROXY_TARGET = 'https://guide-xpert-backend.vercel.app'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env* so VITE_PROXY_TARGET works.
  // On some macOS setups synced files can intermittently throw ECANCELED while reading.
  // Fall back to process.env/defaults so `npm run dev` still starts.
  let env = {}
  try {
    env = loadEnv(mode, process.cwd(), 'VITE_')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[vite] Failed to load .env files (${message}). Falling back to process.env.`)
  }
  const proxyTarget = (env.VITE_PROXY_TARGET || '').trim() || DEFAULT_PROXY_TARGET
  const isHttpsTarget = proxyTarget.startsWith('https://')

  if (mode === 'development') {
    console.info(`[vite] dev proxy: /api → ${proxyTarget}`)
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          // For https targets, verify TLS; for http (local), leave false.
          secure: isHttpsTarget,
        },
      },
    },
  }
})
