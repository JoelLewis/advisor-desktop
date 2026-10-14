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
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<SeriesLines label="x" legend={[]} lines={[{ name: 'a', values: [1, 2] }, { name: 'b', values: [1] }]} />)).toThrow(MeasureError)
    expect(() => render(<SeriesLines label="x" legend={[]} lines={[{ name: 'a', values: [1] }]} />)).toThrow(MeasureError)
  })
})
