import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { previewModelTrades } from '@/services/trading'
import { accounts } from '@/mocks/data/accounts'
import { realisedSales, washSaleWindow } from '@/mocks/data/realised-sales'
import { repurchaseRestrictionsFor } from '@/mocks/handlers/repurchase-restrictions'
import { estimateTaxOnReturns } from '@/mocks/handlers/tax-return'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTaxableAccount } from '@/lib/tax-treatment'
import type { TaxedLeg } from '@/lib/capital-gains'

const account = (id: string) => {
  const found = accounts.find((a) => a.id === id)
  if (!found) throw new Error(`no account ${id}`)
  return found
}
const recognisedLoss = (t: { realisedShortTerm: number; realisedLongTerm: number; washedLoss?: { shortTerm: number; longTerm: number } }) =>
  t.realisedShortTerm + t.realisedLongTerm - (t.washedLoss?.shortTerm ?? 0) - (t.washedLoss?.longTerm ?? 0)

describe('§0.2 · a loss sale opens its own wash-sale window', () => {
  it("acc-002's tax-aware INTC sale today blocks repurchase through 2026-03-27", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.realisedShortTerm + intc.realisedLongTerm).toBeLessThan(0)
    expect(intc.repurchaseBlockedUntil).toBe('2026-03-27')
    expect(intc.repurchaseBlockedUntil).toBe(washSaleWindow(MOCK_TODAY_ISO).end)
  })

  it('every sell leg that recognises a loss carries the window end; every other leg omits it', async () => {
    const previews = await previewRebalance({ accountIds: accounts.map((a) => a.id), taxAware: true })
    let lossLegs = 0
    for (const p of previews) {
      for (const t of p.trades) {
        const opensWindow = t.side === 'sell' && recognisedLoss(t) < 0
        if (opensWindow) lossLegs++
        expect(t.repurchaseBlockedUntil, `${p.accountId} ${t.side} ${t.symbol}`).toBe(opensWindow ? '2026-03-27' : undefined)
      }
    }
    expect(lossLegs).toBeGreaterThan(1)
  })

  it("the restriction list keeps rs-001's recorded window (to 2026-03-23) separate from the projected one", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const intc = preview!.repurchaseRestrictions.filter((r) => r.symbol === 'INTC')
    const rs001 = realisedSales.find((s) => s.id === 'rs-001')!
    expect(intc).toEqual([
      { symbol: 'INTC', start: '2026-01-22', until: '2026-03-23', source: { kind: 'recorded', saleId: 'rs-001', accountId: 'acc-002', saleDate: rs001.saleDate } },
      { symbol: 'INTC', start: '2026-01-26', until: '2026-03-27', source: { kind: 'projected', accountId: 'acc-002', saleDate: MOCK_TODAY_ISO } },
    ])
  })

  it("a batch's projected windows reach every account of the seller's wash-sale taxpayer, IRAs included, and no other", () => {
    const proposals = [
      { accountId: 'acc-002', legs: [{ symbol: 'INTC', repurchaseBlockedUntil: '2026-03-27' }] },
      { accountId: 'acc-011', legs: [{ symbol: 'INTC', repurchaseBlockedUntil: '2026-03-27' }] },
    ]
    const projectedSellers = (accountId: string) => repurchaseRestrictionsFor(account(accountId), MOCK_TODAY_ISO, proposals)
      .filter((r) => r.source.kind === 'projected').map((r) => r.source.accountId)
    // acc-003 is Robert Johnson's IRA: a purchase there would permanently disallow acc-002's loss.
    expect(projectedSellers('acc-003')).toEqual(['acc-002'])
    expect(projectedSellers('acc-012')).toEqual(['acc-011'])
  })

  it('a separate taxpayer in the same household sees none of its neighbours\' windows', () => {
    // hh-002: acc-006 is an irrevocable trust, its own taxpayer. hh-009: acc-033 and acc-034 are two unmarried clients.
    const proposals = [
      { accountId: 'acc-007', legs: [{ symbol: 'AGG', repurchaseBlockedUntil: '2026-03-27' }] },
      { accountId: 'acc-033', legs: [{ symbol: 'AGG', repurchaseBlockedUntil: '2026-03-27' }] },
    ]
    expect(account('acc-006').householdId).toBe(account('acc-007').householdId)
    expect(account('acc-033').householdId).toBe(account('acc-034').householdId)
    expect(repurchaseRestrictionsFor(account('acc-006'), MOCK_TODAY_ISO, proposals)).toEqual([])
    expect(repurchaseRestrictionsFor(account('acc-034'), MOCK_TODAY_ISO, proposals)).toEqual([])
    expect(repurchaseRestrictionsFor(account('acc-033'), MOCK_TODAY_ISO, proposals).map((r) => r.source.accountId)).toEqual(['acc-033'])
  })

  it('a loss inside an IRA or Roth opens no window: nothing deductible is realised there', async () => {
    const sheltered = accounts.filter((a) => !isTaxableAccount(a.taxTreatment))
    const previews = await previewRebalance({ accountIds: sheltered.map((a) => a.id), taxAware: true })
    for (const p of previews) {
      expect(p.taxable).toBe(false)
      for (const t of p.trades) expect(t.repurchaseBlockedUntil, `${p.accountId} ${t.symbol}`).toBeUndefined()
    }
  })

  it("one batch for two hh-001 accounts lists each account's projected windows once, beside the recorded one", async () => {
    const previews = await previewRebalance({ accountIds: ['acc-002', 'acc-005'], taxAware: true })
    const lossLegs = previews.flatMap((p) => p.trades.filter((t) => t.repurchaseBlockedUntil).map((t) => `${p.accountId}:${t.symbol}`))
    expect(lossLegs.length).toBeGreaterThan(1)
    for (const p of previews) {
      const projected = p.repurchaseRestrictions.filter((r) => r.source.kind === 'projected').map((r) => `${r.source.accountId}:${r.symbol}`)
      expect(projected.sort()).toEqual([...new Set(lossLegs)].sort())
      expect(p.repurchaseRestrictions.filter((r) => r.source.kind === 'recorded').map((r) => r.symbol)).toEqual(['INTC'])
    }
  })

  it('the model-trade preview carries the same window on the same leg', async () => {
    const [preview] = await previewModelTrades('mod-002', ['acc-002'])
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.repurchaseBlockedUntil).toBe('2026-03-27')
    expect(preview!.trades.filter((t) => t.side === 'buy').every((t) => t.repurchaseBlockedUntil === undefined)).toBe(true)
  })
})

describe('§0.2 · the estimate counts only the part of a loss §1091 allows', () => {
  // A constructed proposal on acc-033's return (single filer, nothing realised this year): a
  // +$20,000 long-term gain leg and a −$10,000 long-term loss leg of which 30% of the shares were
  // replaced in the last 30 days, so −$3,000 of the loss is washed and only −$7,000 offsets the gain.
  const gain: TaxedLeg = { realisedShortTerm: 0, realisedLongTerm: 20_000, taxImpact: 4_760 }
  const partlyWashed: TaxedLeg = { realisedShortTerm: 0, realisedLongTerm: -10_000, taxImpact: 0, washedLoss: { shortTerm: 0, longTerm: -3_000 } }

  it('nets the gain against the allowed $7,000, not the realised $10,000: 13,000 × 23.8% = 3,094', () => {
    const [estimate] = estimateTaxOnReturns([{ account: account('acc-033'), legs: [gain, partlyWashed] }], MOCK_TODAY_ISO)
    expect(estimate!.net).toBe(Math.round(13_000 * 0.238))
    expect(estimate!.net).not.toBe(Math.round(10_000 * 0.238))
    expect(estimate!.gross).toBe(4_760)
  })

  it('a fully washed loss offsets nothing', () => {
    const fullyWashed: TaxedLeg = { ...partlyWashed, washedLoss: { shortTerm: 0, longTerm: -10_000 } }
    const [estimate] = estimateTaxOnReturns([{ account: account('acc-033'), legs: [gain, fullyWashed] }], MOCK_TODAY_ISO)
    expect(estimate!.net).toBe(4_760)
  })

  it('the washed part does not carry to a later account on the same return in the batch', () => {
    const [, second] = estimateTaxOnReturns(
      [{ account: account('acc-002'), legs: [partlyWashed] }, { account: account('acc-005'), legs: [gain] }],
      MOCK_TODAY_ISO,
    )
    const [alone] = estimateTaxOnReturns(
      [{ account: account('acc-002'), legs: [{ ...partlyWashed, realisedLongTerm: -7_000, washedLoss: undefined }] }, { account: account('acc-005'), legs: [gain] }],
      MOCK_TODAY_ISO,
    ).slice(1)
    expect(second!.net).toBe(alone!.net)
  })
})
