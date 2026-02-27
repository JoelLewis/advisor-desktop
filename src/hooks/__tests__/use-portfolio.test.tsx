import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import {
  usePositions,
  useDrift,
  useDriftSummary,
  useModels,
  useConcentration,
  useHouseholdPositions,
  useHouseholdDrift,
  useHouseholdAllocation,
  useModelGovernance,
  usePerformance,
  useBenchmark,
  useAttribution,
  useRiskMetrics,
  useSensitivity,
} from '../use-portfolio'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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

describe('useDriftSummary', () => {
  it('fetches drift for all accounts', async () => {
    const { result } = renderHook(() => useDriftSummary(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBe(45)
  })
})

describe('useModels', () => {
  it('fetches all 7 models', async () => {
    const { result } = renderHook(() => useModels(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBe(7)
  })
})

describe('useConcentration', () => {
  it('fetches concentration for acc-001', async () => {
    const { result } = renderHook(() => useConcentration('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.positions.length).toBeGreaterThan(0)
    expect(result.current.data!.summary.totalPositions).toBeGreaterThan(0)
  })
})

describe('useHouseholdPositions', () => {
  it('fetches combined positions for household', async () => {
    const { result } = renderHook(() => useHouseholdPositions('hh-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBeGreaterThan(0)
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useHouseholdPositions(''), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useHouseholdDrift', () => {
  it('fetches drift for all household accounts', async () => {
    const { result } = renderHook(() => useHouseholdDrift('hh-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // hh-001 has 5 accounts
    expect(result.current.data!.length).toBe(5)
  })
})

describe('useHouseholdAllocation', () => {
  it('fetches allocation breakdown', async () => {
    const { result } = renderHook(() => useHouseholdAllocation('hh-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const totalWeight = result.current.data!.reduce((s, a) => s + a.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 1)
  })
})

describe('useModelGovernance', () => {
  it('fetches governance data with staleTime', async () => {
    const { result } = renderHook(() => useModelGovernance(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBe(7)
  })
})

describe('usePerformance', () => {
  it('fetches performance series', async () => {
    const { result } = renderHook(() => usePerformance('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBeGreaterThan(0)
  })
})

describe('useBenchmark', () => {
  it('fetches benchmark comparisons across periods', async () => {
    const { result } = renderHook(() => useBenchmark('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBe(7)
    const periods = result.current.data!.map((b) => b.period)
    expect(periods).toContain('mtd')
    expect(periods).toContain('ytd')
    expect(periods).toContain('inception')
  })
})

describe('useAttribution', () => {
  it('fetches attribution results', async () => {
    const { result } = renderHook(() => useAttribution('acc-001', 'ytd'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBeGreaterThan(0)
  })
})

describe('useRiskMetrics', () => {
  it('fetches risk metrics', async () => {
    const { result } = renderHook(() => useRiskMetrics('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.sharpe).toBeGreaterThan(0)
  })
})

describe('useSensitivity', () => {
  it('fetches sensitivity analysis with Monte Carlo', async () => {
    const { result } = renderHook(() => useSensitivity('acc-001'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.interestRate.length).toBeGreaterThan(0)
    expect(result.current.data!.monteCarlo.simulations).toBe(10000)
  })
})
