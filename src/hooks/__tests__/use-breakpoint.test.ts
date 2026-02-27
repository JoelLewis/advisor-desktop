import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// useBreakpoint calls window.matchMedia at module-level (lines 35-36),
// so we must define the mock BEFORE importing the module.
let currentWidth = 1024

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => {
    let matches = false
    if (query === '(min-width: 1280px)') matches = currentWidth >= 1280
    if (query === '(min-width: 1536px)') matches = currentWidth >= 1536

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }),
})

function setWidth(width: number) {
  currentWidth = width
  // Re-mock so matchMedia returns fresh results for the new width
  ;(window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query: string) => {
    let matches = false
    if (query === '(min-width: 1280px)') matches = width >= 1280
    if (query === '(min-width: 1536px)') matches = width >= 1536

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

describe('useBreakpoint', () => {
  beforeEach(() => {
    // Reset module cache so subscriptions are recreated with the new matchMedia
    vi.resetModules()
  })

  it('returns isBase=true at 1024px', async () => {
    setWidth(1024)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isBase).toBe(true)
    expect(result.current.isXL).toBe(false)
    expect(result.current.is2XL).toBe(false)
  })

  it('returns isBase=true at 1279px (just below xl)', async () => {
    setWidth(1279)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isBase).toBe(true)
    expect(result.current.isXL).toBe(false)
  })

  it('returns isXL=true at 1280px', async () => {
    setWidth(1280)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isBase).toBe(false)
    expect(result.current.isXL).toBe(true)
    expect(result.current.is2XL).toBe(false)
  })

  it('returns isXL=true at 1535px (just below 2xl)', async () => {
    setWidth(1535)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isXL).toBe(true)
    expect(result.current.is2XL).toBe(false)
  })

  it('returns is2XL=true at 1536px', async () => {
    setWidth(1536)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isBase).toBe(false)
    expect(result.current.isXL).toBe(true)
    expect(result.current.is2XL).toBe(true)
  })

  it('returns is2XL=true at 1920px (common desktop)', async () => {
    setWidth(1920)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isBase).toBe(false)
    expect(result.current.isXL).toBe(true)
    expect(result.current.is2XL).toBe(true)
  })

  it('isBase is the inverse of isXL', async () => {
    setWidth(1280)
    const mod = await import('../use-breakpoint')
    const { result } = renderHook(() => mod.useBreakpoint())
    expect(result.current.isBase).toBe(!result.current.isXL)
  })
})
