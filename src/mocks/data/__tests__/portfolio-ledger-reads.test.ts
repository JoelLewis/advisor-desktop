import { describe, it, expect } from 'vitest'
import type { Fill } from '@/types/workspace-proposal'
import { accounts } from '../accounts'
import { cashBalanceOf, getPositionsForAccount, seedPositionsForAccount } from '../positions'
import type { RealisedSale } from '../realised-sales'
import { commitMove } from '../portfolio-ledger'
import { resetWorkspaceStore } from '../workspace-store'
import { generateTaxLots, generateTransactions, seedTaxLots } from '@/mocks/handlers/custodian'
import { openWashSaleWindowsFor, taxReturnFor, ytdRealisedOnReturn } from '@/mocks/handlers/tax-return'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { runKeyOf } from '@/mocks/workspace/run-key'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { requireModelManaged } from '@/lib/mandate'

const acc002 = accounts.find((a) => a.id === 'acc-002')!
const SALE: RealisedSale = {
  id: 'rs-006', accountId: 'acc-002', householdId: 'hh-001', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-25',
  quantity: 7000, proceeds: 199_150, costBasis: 245_000, realisedGainLoss: -45_850, holdingPeriod: 'long',
}
const FILL: Fill = {
  id: 'fill-0001', stagedOrderId: 'stg-0001', proposalId: 'prop-0001', version: 3, accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.',
  side: 'sell', quantity: 7000, price: 28.45, value: 199_150, currency: 'USD', at: '2026-02-25T14:30:00.000Z',
}

/** acc-002 as if its 7,000 INTC had sold at the mark: no INTC position or lot, the proceeds in cash. */
function sellIntcByHand(sale: RealisedSale = SALE) {
  const positions = seedPositionsForAccount('acc-002', acc002.totalValue)
    .filter((p) => p.symbol !== 'INTC')
    .map(({ weight: _weight, ...p }) => (p.symbol === 'CASH' ? { ...p, price: p.marketValue + 199_150, marketValue: p.marketValue + 199_150, costBasis: p.costBasis + 199_150 } : p))
  const lots = seedTaxLots('acc-002', acc002.totalValue).filter((l) => l.positionId !== 'pos-023').map(({ repurchaseBlockedUntil: _until, ...l }) => l)
  commitMove('acc-002', { positions, lots }, [sale], [FILL])
}

async function json(path: string) {
  return (await fetch(`/api${path}`)).json()
}

describe('every engine read sees the moved book', () => {
  it('positions, weights and cash', async () => {
    sellIntcByHand()
    const positions = getPositionsForAccount('acc-002', acc002.totalValue)
    expect(positions.some((p) => p.symbol === 'INTC')).toBe(false)
    expect(positions.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1, 9)
    expect(cashBalanceOf(acc002)).toBe(424_654)
    expect((await json('/custodian/accounts/acc-002/balances')).cashBalance).toBe(424_654)
    expect((await json('/custodian/accounts/acc-002')).cashBalance).toBe(424_654)
    expect(evaluateProposal('acc-002', [])?.projectedCash).toBe(424_654)
  })

  it('lots, windows and the return-level results', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    sellIntcByHand()
    expect(generateTaxLots('acc-002', acc002.totalValue).some((l) => l.id === 'lot-pos-023-0')).toBe(false)
    expect(generateTaxLots('acc-002', acc002.totalValue).every((l) => 'repurchaseBlockedUntil' in l)).toBe(true)
    expect(openWashSaleWindowsFor(acc002, MOCK_TODAY_ISO).find((w) => w.id === 'rs-006')).toMatchObject({ symbol: 'INTC', end: '2026-03-27' })
    expect(ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 45_850)
  })

  it('a washed part of a recorded loss is not recognised on the return', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    sellIntcByHand({ ...SALE, washedLoss: -10_000 })
    expect(ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 35_850)
  })

  it('drift is measured on the new holdings', () => {
    const usEquity = () => computeDriftForAccount(requireModelManaged(acc002)).assetClassDrifts.find((d) => d.assetClass === 'us_equity')!.actual
    const before = usEquity()
    sellIntcByHand()
    expect(before - usEquity()).toBeCloseTo(199_150 / acc002.totalValue, 4)
  })

  it('the transaction history keeps the fixtures and appends the fills', () => {
    sellIntcByHand()
    const txns = generateTransactions('acc-002', acc002.totalValue)
    expect(txns.find((t) => t.id === 'txn-fill-0001')).toMatchObject({ type: 'sell', symbol: 'INTC', amount: 199_150, quantity: 7000, date: '2026-02-25T14:30:00.000Z' })
    expect(txns.find((t) => t.id === 'txn-rs-001')).toBeDefined()
    expect(txns.find((t) => t.id === 'txn-acc-002-opening-INTC')?.quantity).toBe(12_000)
  })

  it('a run after the book moves is a new run', () => {
    const subject = { type: 'account', id: 'acc-002' } as const
    expect(runKeyOf('drift-monitor', 'th-brief', subject)).not.toMatch(/book/)
    sellIntcByHand()
    expect(runKeyOf('drift-monitor', 'th-brief', subject)).toMatch(/\|book 1$/)
  })

  it('a reset restores the seed everywhere', () => {
    sellIntcByHand()
    resetWorkspaceStore()
    expect(getPositionsForAccount('acc-002', acc002.totalValue).find((p) => p.symbol === 'INTC')?.quantity).toBe(7000)
    expect(cashBalanceOf(acc002)).toBe(225_504)
    expect(openWashSaleWindowsFor(acc002, MOCK_TODAY_ISO).some((w) => w.id === 'rs-006')).toBe(false)
    expect(generateTaxLots('acc-002', acc002.totalValue).some((l) => l.id === 'lot-pos-023-0')).toBe(true)
  })
})
