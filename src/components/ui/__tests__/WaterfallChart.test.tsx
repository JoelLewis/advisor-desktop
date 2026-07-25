import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WaterfallChart } from '../WaterfallChart'

/** acc-001's year-to-date attribution rows, which are basis-point quantities. */
const attributionBars = [
  { label: 'US Equity', value: 0.001002 },
  { label: 'Intl Equity', value: -0.000017 },
  { label: 'EM', value: 0.000005 },
  { label: 'Cash', value: -0.000201 },
]

function barLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('text')]
    .map((t) => t.textContent ?? '')
    .filter((t) => t.endsWith('%'))
}

describe('WaterfallChart value precision', () => {
  it('defaults to two decimals, so existing callers are unchanged', () => {
    const { container } = render(<WaterfallChart data={[{ label: 'New assets', value: 0.032 }]} />)
    expect(barLabels(container)).toContain('+3.20%')
  })

  /**
   * The attribution page publishes effects on a 1e-6 grid and renders the cards and the table at
   * that precision. Before `valueDecimals`, the chart carried its own hard-coded two decimals, so
   * the page's headline visual labelled five of eight bars `+0.00%` or `−0.00%` while the table
   * directly beneath it showed `+0.1002%` and `−0.0017%`. A bar labelled `−0.00%` is a display
   * defect in its own right.
   */
  it('renders small values at the caller’s precision rather than rounding them to zero', () => {
    const { container } = render(
      <WaterfallChart data={attributionBars} valueDecimals={4} />,
    )
    const labels = barLabels(container)
    expect(labels).toContain('+0.1002%')
    expect(labels).toContain('-0.0017%')
    expect(labels).toContain('+0.0005%')
    expect(labels.filter((l) => /^[+-]0\.00%$/.test(l))).toHaveLength(0)
  })

  it('collapses those same bars to zero at the default precision', () => {
    const { container } = render(<WaterfallChart data={attributionBars} />)
    expect(barLabels(container).filter((l) => /^[+-]0\.00%$/.test(l)).length).toBeGreaterThan(0)
  })
})
