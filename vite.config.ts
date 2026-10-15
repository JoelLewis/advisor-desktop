/// <reference types="vitest/config" />
import { defineConfig, type Plugin, type Rollup } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/** Build only: the mock server's chunk and the Archivo latin face are preloaded, so they load beside the app instead of after it. */
function preloadServerAndFont(): Plugin {
  return {
    name: 'preload-server-and-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) throw new Error('preload-server-and-font runs at build, with a bundle')
        const files = Object.values(ctx.bundle)
        const server = files.find((f): f is Rollup.OutputChunk => f.type === 'chunk' && (f.facadeModuleId ?? '').endsWith('/src/mocks/browser.ts'))
        const font = files.find((f): f is Rollup.OutputAsset => f.type === 'asset' && /archivo-latin-wdth-normal-[\w-]+\.woff2$/.test(f.fileName))
        if (!server) throw new Error('preload-server-and-font: no mock-server chunk in the bundle')
        if (!font) throw new Error('preload-server-and-font: no Archivo latin face in the bundle')
        return [
          { tag: 'link', attrs: { rel: 'modulepreload', href: `/${server.fileName}` }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${font.fileName}`, crossorigin: '' }, injectTo: 'head' },
        ]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadServerAndFont()],
  build: {
    // Two chunks are large by design: the MSW worker with the engine (~635 kB, ~195 kB gzip), the demo's whole
    // server running in the browser, which passes Vite's 500 kB default and loads beside the app; and the App chunk
    // (~455 kB, ~135 kB gzip), with the secondary routes split off into their own lazy chunks. The limit sits
    // above the worker, so a chunk that grows past it still warns.
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
