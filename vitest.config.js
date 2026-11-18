import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Component tests use jsdom and testing-library. Plain helper tests still run with `npm test` (node --test).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.ui.test.jsx'],
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
