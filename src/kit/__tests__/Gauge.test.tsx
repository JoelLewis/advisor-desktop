import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gauge } from '@/kit/gauge/Gauge'
import { gaugeDomain, gaugeStatus } from '@/kit/gauge/gauge-math'

describe('gauge maths', () => {
  it('classifies against the band; the edge is AT LIMIT', () => {
    expect(gaugeStatus(0.132, 0.05)).toBe('OUT')
    expect(gaugeStatus(-0.05, 0.05)).toBe('AT LIMIT')
    expect(gaugeStatus(0.02, 0.05)).toBe('IN')
  })
  it('domain is the next band multiple, at least two bands', () => {
    expect(gaugeDomain(0.132, 0.05)).toBeCloseTo(0.15)
    expect(gaugeDomain(0.01, 0.05)).toBeCloseTo(0.1)
  })
})

describe('Gauge', () => {
  it('prints the true value and status and describes itself', () => {
    render(<Gauge label="US equity" drift={0.132} band={0.05} />)
    expect(screen.getByRole('img', { name: /US equity: drift \+13\.2 pp against tolerance ±5\.0 pp, OUT/ })).toBeInTheDocument()
    expect(screen.getByText('+13.2')).toBeInTheDocument()
    expect(screen.getByText('OUT')).toBeInTheDocument()
  })
  it('clamps an off-scale bar inside the drawing', () => {
    const { container } = render(<Gauge label="Digital" drift={0.9} band={0.05} />)
    const bar = container.querySelector('[data-part="bar"]')!
    const x = Number(bar.getAttribute('x')) + Number(bar.getAttribute('width'))
    expect(x).toBeLessThanOrEqual(200)
  })
})
