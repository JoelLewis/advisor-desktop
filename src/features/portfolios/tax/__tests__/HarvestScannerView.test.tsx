import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { HarvestScannerView } from '../HarvestScannerView'
import { estimatedTaxBenefit } from '../shared'
import type { TaxLot } from '@/types/portfolio'

/**
 * Each lot: 400 shares at a −21,920 long-term loss (23.8%). What §1091 takes depends on how many
 * shares a replacement was matched to (Treas. Reg. §1.1091-1(c)) and where it was bought.
 */
const lot = (id: string, positionId: string, saleWash: TaxLot['saleWash']): TaxLot => ({
  id, positionId, purchaseDate: '2024-06-03', quantity: 400, costBasis: 120_000, currentValue: 98_080,
  gainLoss: -21_920, holdingPeriod: 'long', repurchaseBlockedUntil: null, saleWash,
})
// 180 of 400 shares washed by a taxable purchase: −21,920 × 180/400 = −9,864 deferred, −12,056 allowed.
const partlyDeferred = lot('lot-smh', 'pos-smh', { deferredShares: 180, disallowedShares: 0 })
// All 400 washed by a Roth purchase: the whole −21,920 is permanently disallowed.
const allDisallowed = lot('lot-soxx', 'pos-soxx', { deferredShares: 0, disallowedShares: 400 })
// All 400 washed by a taxable purchase: the whole −21,920 is deferred.
const allDeferred = lot('lot-qqq', 'pos-qqq', { deferredShares: 400, disallowedShares: 0 })
const clean = lot('lot-xyz', 'pos-xyz', { deferredShares: 0, disallowedShares: 0 })
const positionMap = new Map([
  ['pos-smh', { symbol: 'SMH', name: 'VanEck Semiconductor ETF' }],
  ['pos-soxx', { symbol: 'SOXX', name: 'iShares Semiconductor ETF' }],
  ['pos-qqq', { symbol: 'QQQ', name: 'Invesco QQQ Trust' }],
  ['pos-xyz', { symbol: 'XYZ', name: 'XYZ Corp.' }],
])
const money = (n: number) => `$${Math.round(n)}`

function renderScanner(selected: TaxLot[]) {
  return renderWithProviders(
    <HarvestScannerView
      harvestOpportunities={[partlyDeferred, allDisallowed, allDeferred, clean]}
      selectedLots={new Set(selected.map((l) => l.id))}
      toggleLot={() => {}}
      selectedLotObjects={selected}
      positionMap={positionMap}
      formatWithConversion={money}
      baseCurrency="USD"
    />,
  )
}

const rowOf = (symbol: string) => screen.getByText(symbol).closest('tr')!

describe('the harvest scanner tests each lot\'s own sale under §1091', () => {
  it('a partly washed lot shows how many shares wash and a benefit on the allowed part only', () => {
    renderScanner([])
    const row = rowOf('SMH')
    expect(within(row).getByText('Wash sale: 180 of 400 shares')).toBeInTheDocument()
    expect(within(row).getByText('180 deferred into a taxable replacement’s basis')).toBeInTheDocument()
    // 12,056 × 23.8% = 2,869.33
    expect(row.textContent).toContain('$2,869.33')
    expect(within(row).queryByText(/permanently disallowed/)).not.toBeInTheDocument()
  })

  it('a lot washed by an IRA or Roth purchase says permanently disallowed, never deferred', () => {
    renderScanner([])
    const row = rowOf('SOXX')
    expect(within(row).getByText('400 permanently disallowed: bought in an IRA or Roth')).toBeInTheDocument()
    expect(within(row).getByText('Permanently disallowed')).toBeInTheDocument()
    expect(within(row).queryByText(/deferred/i)).not.toBeInTheDocument()
  })

  it('a lot fully washed by a taxable purchase shows its benefit as deferred, not as a saving', () => {
    renderScanner([])
    const row = rowOf('QQQ')
    expect(within(row).getByText('Deferred')).toBeInTheDocument()
    expect(within(row).queryByText(/disallowed/i)).not.toBeInTheDocument()
  })

  it('a lot whose sale would not wash says no recent purchase was found', () => {
    renderScanner([])
    const row = rowOf('XYZ')
    expect(within(row).getByText('No purchase in last 30 days')).toBeInTheDocument()
    expect(within(row).queryByText(/deferred|disallowed/i)).not.toBeInTheDocument()
  })

  it('the selection counts the allowed part of each loss, and names the deferred and disallowed parts apart', () => {
    renderScanner([partlyDeferred, allDisallowed, clean])
    const summary = screen.getByText('3 lots selected').parentElement!
    // Realised now: 12,056 (SMH) + 0 (SOXX) + 21,920 (XYZ) = 33,976.
    expect(summary.textContent).toContain(`Loss realised now ${money(33_976)}`)
    const benefit = estimatedTaxBenefit({ gainLoss: -33_976, holdingPeriod: 'long' })
    expect(summary.textContent).toContain(`estimated tax benefit ${money(benefit)}`)
    expect(summary.textContent).toContain(`${money(9_864)} deferred by a wash sale`)
    expect(summary.textContent).toContain(`${money(21_920)} permanently disallowed (IRA or Roth replacement)`)
  })
})
