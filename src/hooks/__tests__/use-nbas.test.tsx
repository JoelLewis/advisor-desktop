import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { useNBAs, useDismissNBA, useSnoozeNBA, useNBAEffectiveness } from '../use-nbas'
import { useBatchAction } from '../use-batch-nba'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useNBAs', () => {
  it('fetches all 20 NBAs', async () => {
    const { result } = renderHook(() => useNBAs(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(20)
  })
})

describe('useDismissNBA', () => {
  it('dismisses an NBA without error', async () => {
    const { result } = renderHook(() => useDismissNBA(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate('nba-001')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useSnoozeNBA', () => {
  it('snoozes an NBA without error', async () => {
    const { result } = renderHook(() => useSnoozeNBA(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ id: 'nba-001', until: '2026-03-01' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useNBAEffectiveness', () => {
  it('fetches effectiveness data', async () => {
    const { result } = renderHook(() => useNBAEffectiveness(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })
})

describe('useBatchAction', () => {
  it('executes batch action without error', async () => {
    const { result } = renderHook(() => useBatchAction(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({
        groupId: 'grp-001',
        nbaIds: ['nba-001'],
        action: 'rebalance',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
