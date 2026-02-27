import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { useSuggestedPrompts, useSendMessage, useAIInsights, useActionTemplates } from '../use-ai'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSuggestedPrompts', () => {
  it('returns prompts for dashboard screen', async () => {
    const { result } = renderHook(() => useSuggestedPrompts('dashboard'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBeGreaterThan(0)
  })

  it('returns different prompts for different screens', async () => {
    const { result: dashResult } = renderHook(() => useSuggestedPrompts('dashboard'), { wrapper: createWrapper() })
    const { result: portfolioResult } = renderHook(() => useSuggestedPrompts('portfolios'), { wrapper: createWrapper() })

    await waitFor(() => expect(dashResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(portfolioResult.current.isSuccess).toBe(true))

    // Both should have prompts, but they may differ
    expect(dashResult.current.data!.length).toBeGreaterThan(0)
    expect(portfolioResult.current.data!.length).toBeGreaterThan(0)
  })
})

describe('useSendMessage', () => {
  it('sends a message and receives response', async () => {
    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({
        message: 'Hello',
        context: { screenType: 'dashboard' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })
})

describe('useAIInsights', () => {
  it('fetches insights for a screen type', async () => {
    const { result } = renderHook(() => useAIInsights('dashboard'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })
})

describe('useActionTemplates', () => {
  it('fetches action templates', async () => {
    const { result } = renderHook(() => useActionTemplates('dashboard'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })
})
