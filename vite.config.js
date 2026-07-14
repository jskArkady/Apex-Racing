/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function vendorChunk(id) {
  const normalizedId = id.replaceAll('\\', '/')

  if (!normalizedId.includes('/node_modules/')) return undefined
  if (normalizedId.includes('/node_modules/@dimforge/')) return 'rapier-core'
  if (normalizedId.includes('/node_modules/@react-three/rapier/')) return 'rapier-react'
  if (normalizedId.includes('/node_modules/three/examples/')) return 'three-extras'
  if (normalizedId.includes('/node_modules/three/')) return 'three-core'
  if (normalizedId.includes('/node_modules/@react-three/')) return 'react-three'
  if (
    normalizedId.includes('/node_modules/react/')
    || normalizedId.includes('/node_modules/react-dom/')
    || normalizedId.includes('/node_modules/scheduler/')
  ) {
    return 'react-vendor'
  }
  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The Rapier physics runtime is the expected heavy production dependency.
    // Keep it split for browser caching, and warn only when a chunk exceeds
    // that known budget instead of Vite's generic 500 kB web-app default.
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // R3F integration files mount hundreds of mocked scene nodes. Letting
    // Vitest saturate all 16 host cores can starve Testing Library's 10s
    // teardown hook even though the same file cleans up in under a second on
    // its own. A bounded pool keeps full-suite results deterministic without
    // extending hook timeouts or masking a real lifecycle leak.
    maxWorkers: 4,
    // Full-circuit QA intentionally exercises thousands of frame callbacks,
    // and some fake-timer cases advance the virtual clock by 20s to verify
    // countdown behavior. Keep the timeout above the largest virtual jump so
    // fake timer advancement is not misreported as a real test hang.
    testTimeout: 60_000,
  },
})
