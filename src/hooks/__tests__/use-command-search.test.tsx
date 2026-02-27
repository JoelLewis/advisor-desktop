import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useCommandSearch } from '../use-command-search'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCommandSearch', () => {
  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useCommandSearch(), { wrapper: createWrapper() })
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('does not search with fewer than 2 characters', async () => {
    const { result } = renderHook(() => useCommandSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.setQuery('a')
    })

    // Even after debounce, should not trigger search
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('searches with 2+ characters after debounce', async () => {
    const { result } = renderHook(() => useCommandSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.setQuery('Johnson')
    })

    // Wait for debounce + API response
    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    }, { timeout: 2000 })
  })

  it('returns results matching client names', async () => {
    const { result } = renderHook(() => useCommandSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.setQuery('Robert')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    const names = result.current.results.map((r) => r.title)
    expect(names.some((n) => n.includes('Robert') || n.includes('Johnson'))).toBe(true)
  })

  it('clears results when query is cleared', async () => {
    const { result } = renderHook(() => useCommandSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.setQuery('Johnson')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    act(() => {
      result.current.setQuery('')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual([])
    })
  })
})
