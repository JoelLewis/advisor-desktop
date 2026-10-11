import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gauge } from '@/kit/gauge/Gauge'
import { MeasureError } from '@/kit/measure'
import { gaugeDomain, gaugeStatus } from '@/kit/gauge/gauge-math'

describe('gauge maths', () => {
  it('classifies against the band; the edge is AT LIMIT', () => {
    expect(gaugeStatus(0.132, 0.05)).toBe('OUT')
    expect(gaugeStatus(-0.05, 0.05)).toBe('AT LIMIT')
    expect(gaugeStatus(0.02, 0.05)).toBe('IN')
  })
  it('treats both edges and float noise as AT LIMIT', () => {
    expect(gaugeStatus(0.05, 0.05)).toBe('AT LIMIT')
    expect(gaugeStatus(-0.05, 0.05)).toBe('AT LIMIT')
    expect(gaugeStatus(0.1 - 0.05, 0.05)).toBe('AT LIMIT')
  })
  it('rejects a zero, negative or non-finite band', () => {
    expect(() => gaugeDomain(0.1, 0)).toThrow(MeasureError)
    expect(() => gaugeDomain(0.1, -0.05)).toThrow(MeasureError)
    expect(() => gaugeDomain(0.1, Number.NaN)).toThrow(MeasureError)
  })
  it('domain is the next band multiple, at least two bands', () => {
    expect(gaugeDomain(0.132, 0.05)).toBeCloseTo(0.15)
    expect(gaugeDomain(0.01, 0.05)).toBeCloseTo(0.1)
  })
})

describe('Gauge', () => {
  it('prints the true value and status and describes itself', () => {
    render(<Gauge label="US equity" drift={0.132} band={0.05} />)
    expect(screen.getByRole('img', { name: /US equity: drift \+13\.2 percentage points against tolerance ±5\.0 percentage points, OUT/ })).toBeInTheDocument()
    expect(screen.getByText('+13.2')).toBeInTheDocument()
    expect(screen.getByText('OUT')).toBeInTheDocument()
  })
  it('prints its label visibly, hidden from assistive tech (the svg names it)', () => {
    render(<Gauge label="US equity" drift={0.132} band={0.05} />)
    expect(screen.getByText('US equity').closest('[aria-hidden="true"]')).not.toBeNull()
  })
  it('clamps an off-scale bar inside the drawing', () => {
    const { container } = render(<Gauge label="Digital" drift={0.9} band={0.05} />)
    const bar = container.querySelector('[data-part="bar"]')!
    const x = Number(bar.getAttribute('x')) + Number(bar.getAttribute('width'))
    expect(x).toBeLessThanOrEqual(200)
  })
  it('clamps a negative off-scale bar inside the drawing', () => {
    const { container } = render(<Gauge label="Digital" drift={-0.9} band={0.05} />)
    const bar = container.querySelector('[data-part="bar"]')!
    expect(Number(bar.getAttribute('x'))).toBeGreaterThanOrEqual(0)
    expect(Number(bar.getAttribute('x')) + Number(bar.getAttribute('width'))).toBeLessThanOrEqual(200)
  })
  it('colours only OUT with the signal fill', () => {
    const fill = (drift: number) => {
      const { container, unmount } = render(<Gauge label="x" drift={drift} band={0.05} />)
      const cls = container.querySelector('[data-part="bar"]')!.getAttribute('class')
      unmount()
      return cls
    }
    expect(fill(0.132)).toBe('fill-signal')
    expect(fill(0.05)).toBe('fill-ink-2')
    expect(fill(0.02)).toBe('fill-ink-2')
  })
  it('draws the tolerance hatch between -band and +band on the scale', () => {
    const { container } = render(<Gauge label="x" drift={0.02} band={0.05} />)
    const hatch = container.querySelector('svg > rect:not([data-part])')!
    const domain = 0.1
    const scale = (v: number) => 100 + (v / domain) * 99
    expect(Number(hatch.getAttribute('x'))).toBeCloseTo(scale(-0.05))
    expect(Number(hatch.getAttribute('width'))).toBeCloseTo(scale(0.05) - scale(-0.05))
  })
  it('hides the status code from assistive tech (the label already ends with it)', () => {
    render(<Gauge label="x" drift={0.132} band={0.05} />)
    expect(screen.getByText('OUT').closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
