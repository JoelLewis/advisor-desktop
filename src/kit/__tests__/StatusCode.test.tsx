import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusCode } from '@/kit/status/StatusCode'
import { isSignal } from '@/kit/status/status'

describe('StatusCode', () => {
  it('only OUT and BLOCK are signal', () => {
    expect(['OUT', 'BLOCK'].every((s) => isSignal(s as 'OUT'))).toBe(true)
    expect(['WARN', 'AT LIMIT', 'IN', 'CLEAR', 'OPEN'].some((s) => isSignal(s as 'WARN'))).toBe(false)
  })
  it('always shows its word, so colour is never the only carrier', () => {
    render(<StatusCode status="BLOCK" />)
    expect(screen.getByText('BLOCK')).toBeInTheDocument()
    expect(screen.getByText('BLOCK').closest('[data-status]')).toHaveAttribute('data-signal', 'true')
  })
  it('WARN is ink, not signal', () => {
    render(<StatusCode status="WARN" />)
    expect(screen.getByText('WARN').closest('[data-status]')).toHaveAttribute('data-signal', 'false')
  })
})
