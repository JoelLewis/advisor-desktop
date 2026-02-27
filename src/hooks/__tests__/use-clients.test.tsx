import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { useClients, useClient } from '../use-clients'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useClients', () => {
  it('fetches all 20 clients', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.items).toHaveLength(20)
  })
})

describe('useClient', () => {
  it('fetches a specific client', async () => {
    const { result } = renderHook(() => useClient('cli-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.id).toBe('cli-001')
    expect(result.current.data!.fullName).toBe('Robert Johnson')
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useClient(''), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
