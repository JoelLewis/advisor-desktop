import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/routes'
import { providerFuture } from '@/app/router-flags'
import '@/styles/app.css'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { applyTheme, readThemeChoice, themeFromSearch } from '@/kit/theme'

applyTheme(themeFromSearch(window.location.search) ?? readThemeChoice())

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } },
})

async function enableMocking() {
  const { worker } = await import('@/mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  const root = document.getElementById('root')
  if (!root) throw new Error('index.html is missing #root')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ViewerProvider>
          <RouterProvider router={router} future={providerFuture} />
        </ViewerProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
