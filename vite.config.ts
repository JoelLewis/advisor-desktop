/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Two chunks pass Vite's 500 kB default, by design: the app (~700 kB, ~210 kB gzip), and the MSW worker
    // with the engine (~630 kB, ~195 kB gzip), which is the demo's whole server running in the browser and
    // already loads on its own. The limit sits just above them, so a chunk that grows past it still warns.
    chunkSizeWarningLimit: 750,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    // Half the cores, not Vitest's default of all-but-one. Every file pays ~1s of CPU for jsdom
    // plus the mock book's import before a test runs, so the suite is CPU-bound, and this repo is
    // routinely tested from several worktrees at once: two suites at seven workers each put 14
    // workers on 8 cores, and the long UI flows (SingleTradeView's ~25 interactions) then cross
    // the 5s test timeout. On an idle machine this costs a few seconds of wall time; under that
    // contention it is the difference between green and 1–5 timeouts.
    maxWorkers: '50%',
    // The same 30s the plans pass on a loaded workstation (`--testTimeout 30000`), for CI's
    // two workers as well: a long UI flow is slow under contention, not stuck. A real hang still
    // fails, and a flaky test is fixed, never retried.
    testTimeout: 30_000,
  },
})
