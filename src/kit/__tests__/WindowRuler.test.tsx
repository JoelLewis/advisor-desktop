import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { daysBetween } from '@/kit/window-ruler/window'

describe('WindowRuler', () => {
  it('counts UTC calendar days', () => {
    expect(daysBetween('2026-02-25', '2026-03-27')).toBe(30)
    expect(daysBetween('2026-01-22', '2026-03-23')).toBe(60)
  })
  it('states the window, today and days left', () => {
    render(<WindowRuler label="INTC repurchase window" start="2026-01-22" end="2026-03-23" today="2026-02-25"
      events={[{ date: '2026-02-21', label: 'Loss sale' }]} />)
    expect(screen.getByRole('img', { name: /INTC repurchase window: 2026-01-22 to 2026-03-23, today 2026-02-25, 26 d left/ })).toBeInTheDocument()
    expect(screen.getByText('26 d left · ends 2026-03-23')).toBeInTheDocument()
    expect(screen.getByText('Loss sale')).toBeInTheDocument()
  })
})
