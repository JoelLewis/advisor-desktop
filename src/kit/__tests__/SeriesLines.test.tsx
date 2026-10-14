import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeasureError } from '@/kit/measure'
import { SeriesLines } from '@/kit/series/SeriesLines'

describe('SeriesLines', () => {
  it('draws each series as a line on one scale, named, with a legend', () => {
    const { container } = render(
      <SeriesLines label="Growth of 100" legend={[{ name: 'Account', value: '103.00' }, { name: 'Benchmark', value: '102.00', dashed: true }]}
        lines={[{ name: 'Account', values: [100, 101, 103] }, { name: 'Benchmark', values: [100, 100.5, 102], dashed: true }]} />,
    )
    expect(screen.getByRole('img', { name: 'Growth of 100' })).toBeInTheDocument()
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(container.querySelector('polyline.stroke-ink-3')?.getAttribute('stroke-dasharray')).toBe('4 3')
    expect(screen.getByText('Benchmark · 102.00')).toBeInTheDocument()
  })

  it('refuses series of different lengths or of one point', () => {
    const quiet = (e: ErrorEvent) => e.preventDefault()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', quiet)
    try {
      expect(() => render(<SeriesLines label="x" legend={[]} lines={[{ name: 'a', values: [1, 2] }, { name: 'b', values: [1] }]} />)).toThrow(MeasureError)
      expect(() => render(<SeriesLines label="x" legend={[]} lines={[{ name: 'a', values: [1] }]} />)).toThrow(MeasureError)
    } finally {
      window.removeEventListener('error', quiet)
      consoleError.mockRestore()
    }
  })

  it('draws every line 2px and shows no legend for a single line', () => {
    const { container } = render(<SeriesLines label="One" legend={[{ name: 'A', value: '1' }]} lines={[{ name: 'A', values: [1, 2] }]} />)
    expect(container.querySelector('figcaption')).toBeNull()
    expect(screen.getByRole('img', { name: 'One' })).not.toHaveAttribute('aria-describedby')
    expect(container.querySelector('polyline')?.getAttribute('stroke-width')).toBe('2')
  })
})
