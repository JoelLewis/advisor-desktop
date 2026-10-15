import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gauge } from '@/kit/gauge/Gauge'
import { MeasureError } from '@/kit/measure'
import { driftStatus, gaugeDomain, sharedGaugeDomain } from '@/kit/gauge/gauge-math'

describe('gauge maths', () => {
  it('classifies against the band; the edge is AT LIMIT', () => {
    expect(driftStatus(0.132, 0.05)).toBe('OUT')
    expect(driftStatus(-0.05, 0.05)).toBe('AT LIMIT')
    expect(driftStatus(0.02, 0.05)).toBe('IN')
  })
  it('treats both edges and float noise as AT LIMIT', () => {
    expect(driftStatus(0.05, 0.05)).toBe('AT LIMIT')
    expect(driftStatus(-0.05, 0.05)).toBe('AT LIMIT')
    expect(driftStatus(0.1 - 0.05, 0.05)).toBe('AT LIMIT')
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
  it('a shared domain is the widest of the set, so every gauge reads on one scale', () => {
    expect(sharedGaugeDomain([0.02, 0.132, -0.07], 0.05)).toBeCloseTo(0.15)
    expect(sharedGaugeDomain([], 0.05)).toBeCloseTo(0.1)
  })
})

const hatchOf = (container: HTMLElement) => container.querySelector('svg > rect:not([data-part])')!

describe('Gauge scale', () => {
  it('two gauges given the shared domain draw the band the same width', () => {
    const domain = sharedGaugeDomain([0.02, 0.132], 0.05)
    const a = render(<Gauge label="a" drift={0.02} band={0.05} domain={domain} />)
    const b = render(<Gauge label="b" drift={0.132} band={0.05} domain={domain} />)
    const width = (c: HTMLElement) => Number(hatchOf(c).getAttribute('width'))
    expect(width(a.container)).toBeCloseTo(width(b.container))
    expect(width(a.container)).toBeCloseTo((0.1 / 0.15) * 99)
  })
  it('draws major ticks at each band multiple and minor ticks at fifths of a band', () => {
    const { container } = render(<Gauge label="x" drift={0.02} band={0.05} domain={0.1} />)
    const xs = (part: string) => [...container.querySelectorAll(`[data-part="${part}"]`)].map((t) => Number(t.getAttribute('x1')))
    const scale = (v: number) => 100 + (v / 0.1) * 99
    const major = xs('tick-major')
    expect(major).toHaveLength(4)
    for (const v of [-0.1, -0.05, 0.05, 0.1]) expect(major.some((x) => Math.abs(x - scale(v)) < 1e-6)).toBe(true)
    const minor = xs('tick-minor')
    expect(minor).toHaveLength(16)
    expect(minor.some((x) => Math.abs(x - scale(0.01)) < 1e-6)).toBe(true)
  })
  it('rejects a domain that is not positive and finite', () => {
    const swallow = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', swallow)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Gauge label="x" drift={0.02} band={0.05} domain={0} />)).toThrow(MeasureError)
    spy.mockRestore()
    window.removeEventListener('error', swallow)
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
  it('colors only OUT with the signal fill', () => {
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
  it('names the whole row, so a phone that drops the drawing keeps the reading', () => {
    const { container } = render(<Gauge label="US Equity" drift={0.132} band={0.05} />)
    const row = screen.getByRole('img')
    expect(row.tagName).toBe('DIV')
    expect(row).toHaveAccessibleName(/^US Equity: drift \+13\.2 percentage points/)
    const drawing = container.querySelector('svg')!
    expect(drawing).toHaveAttribute('aria-hidden', 'true')
    expect(drawing.getAttribute('class')).toContain('max-narrow:hidden')
  })
  it('hides the status code from assistive tech (the label already ends with it)', () => {
    render(<Gauge label="x" drift={0.132} band={0.05} />)
    expect(screen.getByText('OUT').closest('[aria-hidden="true"]')).not.toBeNull()
  })
})

describe('gauge ghost', () => {
  it('draws a ghost tick at before and a solid mark at after, and says both', () => {
    render(<Gauge label="US Equity" drift={0.012} before={0.132} band={0.05} bare />)
    const img = screen.getByRole('img')
    expect(img).toHaveAccessibleName('US Equity: drift +13.2 before, +1.2 after, percentage points against tolerance ±5.0 percentage points, IN')
    expect(img.querySelector('[data-part="ghost"]')).not.toBeNull()
    expect(screen.queryByText('US Equity')).toBeNull()
  })
})
