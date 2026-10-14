import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Reading } from '@/kit/reading/Reading'
import { fmtDrift, fmtResult, fmtTolerance } from '@/kit/measure'

describe('Reading', () => {
  it('shows label, value, unit, limit and status', () => {
    render(<Reading label="Max drift · US equity" value={fmtDrift(0.132)} unit="pp" limit={`tol ${fmtTolerance(0.05)} pp`} status="OUT" />)
    expect(screen.getByText('Max drift · US equity')).toBeInTheDocument()
    expect(screen.getByText('+13.2')).toBeInTheDocument()
    expect(screen.getByText('pp')).toBeInTheDocument()
    expect(screen.getByText('tol ±5.0 pp')).toBeInTheDocument()
    expect(screen.getByText('OUT')).toBeInTheDocument()
  })
  it('a loss renders heavier, never colored', () => {
    render(<Reading value={fmtResult(-45_850)} unit="USD" />)
    const v = screen.getByText(fmtResult(-45_850))
    expect(v).toHaveAttribute('data-negative', 'true')
    expect(v.className).not.toMatch(/signal/)
    expect(v.className).toMatch(/font-semibold/)
  })
})
