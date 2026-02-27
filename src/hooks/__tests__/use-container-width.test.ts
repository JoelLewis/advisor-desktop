import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useContainerWidth } from '../use-container-width'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useContainerWidth', () => {
  it('returns default width when no element is attached', () => {
    const { result } = renderHook(() => useContainerWidth())
    expect(result.current.width).toBe(600)
  })

  it('returns custom default width when specified', () => {
    const { result } = renderHook(() => useContainerWidth(800))
    expect(result.current.width).toBe(800)
  })

  it('provides a ref for the container element', () => {
    const { result } = renderHook(() => useContainerWidth())
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.containerRef.current).toBeNull()
  })
})
