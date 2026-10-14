import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/routes'
import { providerFuture } from '@/app/router-flags'
import { createAppQueryClient } from '@/app/query-client'
import { ServerUnavailable } from '@/app/ServerUnavailable'
import '@/styles/app.css'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { applyTheme, readThemeChoice, themeFromSearch } from '@/kit/theme'

applyTheme(themeFromSearch(window.location.search) ?? readThemeChoice())

const RELOADED_AT_KEY = 'ws-preload-reloaded-at'
const RELOAD_GAP_MS = 10_000

// A tab left open across a deploy asks for chunks the new build no longer has: reload once for the new
// build. A second failure within the gap is left to throw, so a missing chunk can never loop the page.
window.addEventListener('vite:preloadError', (event) => {
  const reloadedAt = Number(sessionStorage.getItem(RELOADED_AT_KEY))
  if (Date.now() - reloadedAt < RELOAD_GAP_MS) return
  sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

const queryClient = createAppQueryClient()

async function startServer() {
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
  // MSW's per-request logs are quiet in production; this one line says where the answers come from.
  if (import.meta.env.PROD) console.info('Advisor Desktop: every /api request is answered in this browser by the demo’s mock server (MSW, src/mocks).')
}

function rootElement(): HTMLElement {
  const root = document.getElementById('root')
  if (!root) throw new Error('index.html is missing #root')
  return root
}

startServer().then(
  () => {
    ReactDOM.createRoot(rootElement()).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <ViewerProvider>
            <RouterProvider router={router} future={providerFuture} />
          </ViewerProvider>
        </QueryClientProvider>
      </React.StrictMode>,
    )
  },
  (error: unknown) => {
    console.error('The demo server (MSW service worker) did not start:', error)
    const reason = error instanceof Error ? error.message : String(error)
    ReactDOM.createRoot(rootElement()).render(<ServerUnavailable reason={reason} />)
  },
)
