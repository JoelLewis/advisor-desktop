import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AssetClassTable } from '@/workspace/household/AssetClassTable'
import type { HouseholdHoldings } from '@/types/workspace-household'

const AS_OF = '2026-02-25T15:00:00.000Z'

// The seed holds no order on a custom mandate; this is the one place the listing is exercised.
const holdings: HouseholdHoldings = {
  managedValue: 1_500_000, modelValue: 1_000_000,
  rows: [{ assetClass: 'us_equity', value: 1_000_000, weight: 100, target: 100, drift: 0, band: 5, withinBand: true, holders: [], openOrders: 0, fillsToday: 0 }],
  notInTarget: [{
    accountId: 'acc-x', name: 'Patel Digital Assets Account (…0912)', value: 500_000, mandateSummary: 'Digital assets at the client\'s instruction',
    orders: [
      { kind: 'working', id: 'ord-x', side: 'buy', symbol: 'IBIT', quantity: 100, quantityUnit: 'sh', limitPrice: 40 },
      { kind: 'filled', id: 'fill-x', side: 'sell', symbol: 'ETHA', quantity: 50, at: '2026-02-25T14:30:00.000Z' },
    ],
  }],
}

describe('a custom mandate outside the target', () => {
  it('is listed with its open orders and today\'s fills', () => {
    render(<AssetClassTable holdings={holdings} asOf={AS_OF} />)
    const outside = screen.getByRole('list', { name: 'Outside the target' })
    expect(within(outside).getByText(/^Patel Digital Assets Account \(…0912\) · 500,000 USD · custom mandate, outside the target/)).toBeInTheDocument()
    expect(outside).toHaveTextContent('working: buy 100 IBIT, limit 40.00')
    expect(outside).toHaveTextContent('filled 09:30 ET: sold 50 ETHA')
  })
})
