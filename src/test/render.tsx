/* eslint-disable react-refresh/only-export-components */
import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

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
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
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
