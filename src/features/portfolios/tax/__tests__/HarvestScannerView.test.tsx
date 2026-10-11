import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { HarvestScannerView } from '../HarvestScannerView'
import { estimatedTaxBenefit } from '../shared'
import type { TaxLot } from '@/types/portfolio'

const lot = (id: string, positionId: string, saleWashSaleRisk: boolean): TaxLot => ({
  id, positionId, purchaseDate: '2024-06-03', quantity: 400, costBasis: 120_000, currentValue: 98_080,
  gainLoss: -21_920, holdingPeriod: 'long', repurchaseBlockedUntil: null, saleWashSaleRisk,
})
const washing = lot('lot-smh', 'pos-smh', true)
const clean = lot('lot-xyz', 'pos-xyz', false)
const positionMap = new Map([
  ['pos-smh', { symbol: 'SMH', name: 'VanEck Semiconductor ETF' }],
  ['pos-xyz', { symbol: 'XYZ', name: 'XYZ Corp.' }],
])
const money = (n: number) => `$${Math.round(n)}`

function renderScanner(selected: TaxLot[]) {
  return renderWithProviders(
    <HarvestScannerView
      harvestOpportunities={[washing, clean]}
      selectedLots={new Set(selected.map((l) => l.id))}
      toggleLot={() => {}}
      selectedLotObjects={selected}
      positionMap={positionMap}
      formatWithConversion={money}
      baseCurrency="USD"
    />,
  )
}

describe('the harvest scanner tests each lot\'s own sale under §1091', () => {
  it('a lot whose sale would wash says so, and shows its benefit as deferred, not as a saving', () => {
    renderScanner([])
    const row = screen.getByText('SMH').closest('tr')!
    expect(within(row).getByText('Wash sale: bought within 30 days')).toBeInTheDocument()
    expect(within(row).getByText('Deferred')).toBeInTheDocument()
  })

  it('a lot whose sale would not wash says no recent purchase was found', () => {
    renderScanner([])
    const row = screen.getByText('XYZ').closest('tr')!
    expect(within(row).getByText('No purchase in last 30 days')).toBeInTheDocument()
    expect(within(row).queryByText('Deferred')).not.toBeInTheDocument()
  })

  it('the selection\'s estimated benefit counts only the lots whose loss is allowed now', () => {
    renderScanner([washing, clean])
    const summary = screen.getByText('2 lots selected').parentElement!
    expect(summary.textContent).toContain(`estimated tax benefit ${money(estimatedTaxBenefit(clean))}`)
    expect(summary.textContent).toContain('1 would wash')
  })
})
