import React from 'react'
import ReactDOM from 'react-dom/client'
import { ServerUnavailable } from '@/app/ServerUnavailable'
import { StartFailure } from '@/app/start-failure'
import '@/styles/app.css'

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

// The app chunk and the worker load side by side; the page renders when both are ready, and either failing
// replaces the static first frame with a page that says which one failed.
const app = import('@/app/App').catch((error: unknown) => { throw new StartFailure('app', error) })
const server = startServer().catch((error: unknown) => { throw new StartFailure('server', error) })

Promise.all([app, server]).then(
  ([{ App }]) => {
    ReactDOM.createRoot(rootElement()).render(<React.StrictMode><App /></React.StrictMode>)
  },
  (error: unknown) => {
    // Both halves reject only with a StartFailure; the guard keeps the type honest without a cast.
    const failure = error instanceof StartFailure ? error : new StartFailure('app', error)
    console.error(failure.stage === 'server' ? 'The demo server (MSW service worker) did not start:' : 'The demo app did not load:', error)
    ReactDOM.createRoot(rootElement()).render(<ServerUnavailable stage={failure.stage} reason={failure.message} />)
  },
)
