import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { MeasureError } from '@/kit/measure'
import { daysBetween } from '@/kit/window-ruler/window'

describe('WindowRuler', () => {
  it('counts UTC calendar days', () => {
    expect(daysBetween('2026-02-25', '2026-03-27')).toBe(30)
    expect(daysBetween('2026-01-22', '2026-03-23')).toBe(60)
  })
  it('states the window, today and days left', () => {
    render(<WindowRuler label="INTC repurchase window" start="2026-01-22" end="2026-03-23" today="2026-02-25"
      events={[{ date: '2026-02-21', label: 'Loss sale' }]} />)
    expect(screen.getByRole('img', { name: /INTC repurchase window: 2026-01-22 to 2026-03-23, today 2026-02-25, 26 d left, Loss sale 2026-02-21/ })).toBeInTheDocument()
    expect(screen.getByText('26 d left · ends 2026-03-23')).toBeInTheDocument()
    expect(screen.getByText('Loss sale 2026-02-21')).toBeInTheDocument()
  })
  it('routes dates through measure: offsets convert to UTC, garbage throws', () => {
    expect(daysBetween('2026-02-25T23:30:00-05:00', '2026-03-23')).toBe(25)
    expect(() => daysBetween('garbage', '2026-03-23')).toThrow(MeasureError)
  })
  const ruler = (over: Partial<Parameters<typeof WindowRuler>[0]> = {}) => (
    <WindowRuler label="W" start="2026-01-22" end="2026-03-23" today="2026-02-25" events={[]} {...over} />
  )
  it('says the window is closed once today is past the end', () => {
    render(ruler({ today: '2026-04-01' }))
    expect(screen.getByText('Window closed · ended 2026-03-23')).toBeInTheDocument()
    expect(screen.queryByText(/0 d left/)).toBeNull()
  })
  it('clamps today before the start and an outside event inside the drawing', () => {
    const { container } = render(ruler({ today: '2026-01-01', events: [{ date: '2026-06-01', label: 'Late' }] }))
    const xs = [...container.querySelectorAll('[data-part="today"], [data-part="event"]')].map((l) => Number(l.getAttribute('x1')))
    expect(xs).toHaveLength(2)
    xs.forEach((x) => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(480) })
  })
  it('rejects a reversed window and garbage dates', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(ruler({ start: '2026-03-23', end: '2026-01-22' }))).toThrow(MeasureError)
    expect(() => render(ruler({ today: 'garbage' }))).toThrow(MeasureError)
    expect(() => render(ruler({ events: [{ date: 'garbage', label: 'x' }] }))).toThrow(MeasureError)
    vi.restoreAllMocks()
  })
})
