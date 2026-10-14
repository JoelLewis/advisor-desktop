import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { usePositions, useDrift } from '../use-portfolio'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  }
}

describe('usePositions', () => {
  it('fetches positions for acc-001', async () => {
    const { result } = renderHook(() => usePositions('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.data![0]!.accountId).toBe('acc-001')
  })

  it('does not fetch when accountId is empty', () => {
    const { result } = renderHook(() => usePositions(''), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useDrift', () => {
  it('fetches drift for acc-001', async () => {
    const { result } = renderHook(() => useDrift('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.accountId).toBe('acc-001')
    expect(result.current.data!.totalDrift).toBeGreaterThanOrEqual(0)
  })

  it('does not fetch when accountId is empty', () => {
    const { result } = renderHook(() => useDrift(''), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
