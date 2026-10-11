/* eslint-disable react-refresh/only-export-components */
import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { providerFuture, routerFuture } from '@/app/router-flags'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

type ProvidersProps = {
  children: ReactNode
  queryClient?: QueryClient
  initialEntries?: string[]
}

function Providers({ children, queryClient, initialEntries = ['/'] }: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient()
  return (
    <QueryClientProvider client={client}>
      <ViewerProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </ViewerProvider>
    </QueryClientProvider>
  )
}

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient
  initialEntries?: string[]
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, initialEntries, ...renderOptions }: RenderWithProvidersOptions = {},
) {
  const client = queryClient ?? createTestQueryClient()
  return {
    ...render(ui, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <Providers queryClient={client} initialEntries={initialEntries}>
          {children}
        </Providers>
      ),
      ...renderOptions,
    }),
    queryClient: client,
  }
}

/** Renders a route table at a path inside the app's providers, the way main.tsx mounts the router. */
export function renderRoutes(routes: RouteObject[], path: string, queryClient: QueryClient = createTestQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ViewerProvider>
          <RouterProvider router={router} future={providerFuture} />
        </ViewerProvider>
      </QueryClientProvider>,
    ),
    router,
    queryClient,
  }
}
