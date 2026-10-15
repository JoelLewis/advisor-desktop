import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { providerFuture } from './router-flags'
import { createAppQueryClient } from './query-client'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'

const queryClient = createAppQueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ViewerProvider><RouterProvider router={router} future={providerFuture} /></ViewerProvider>
    </QueryClientProvider>
  )
}
