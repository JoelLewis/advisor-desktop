import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { previewModelTrades } from '@/services/trading'
import { accounts } from '@/mocks/data/accounts'
import { realisedSales, washSaleWindow } from '@/mocks/data/realised-sales'
import { repurchaseRestrictionsFor } from '@/mocks/handlers/repurchase-restrictions'
import { estimateTaxOnReturns } from '@/mocks/handlers/tax-return'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { recognisedResult, type TaxedLeg } from '@/lib/capital-gains'
import { isSubjectToWashSale } from '@/lib/security-master'
import { generateRebalanceProposal, type ProposedTradeLeg } from '@/mocks/handlers/oms'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { settleBatchWashSales, type LegSale } from '@/mocks/handlers/batch-wash-sales'

const account = (id: string) => {
  const found = accounts.find((a) => a.id === id)
  if (!found) throw new Error(`no account ${id}`)
  return found
}
const recognisedNet = (t: TaxedLeg) => {
  const r = recognisedResult(t)
  return r.shortTerm + r.longTerm
}

describe('§0.2 · a loss sale opens its own wash-sale window', () => {
  it("acc-002's tax-aware INTC sale today blocks repurchase through 2026-03-27", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.realisedShortTerm + intc.realisedLongTerm).toBeLessThan(0)
    expect(intc.repurchaseBlockedUntil).toBe('2026-03-27')
    expect(intc.repurchaseBlockedUntil).toBe(washSaleWindow(MOCK_TODAY_ISO).end)
  })

  it('every sell of a security that still recognises a net loss carries the window end; no buy and no coin ever does', async () => {
    const previews = await previewRebalance({ accountIds: accounts.map((a) => a.id), taxAware: true })
    let windows = 0
    for (const p of previews) {
      for (const t of p.trades) {
        const where = `${p.accountId} ${t.side} ${t.symbol}`
        if (t.repurchaseBlockedUntil !== undefined) {
          windows++
          expect(t.repurchaseBlockedUntil, where).toBe('2026-03-27')
          expect(t.side, where).toBe('sell')
          expect(isSubjectToWashSale(t.symbol), where).toBe(true)
        }
        if (t.side === 'sell' && isSubjectToWashSale(t.symbol) && recognisedNet(t) < 0) {
          expect(t.repurchaseBlockedUntil, where).toBe('2026-03-27')
        }
      }
    }
    expect(windows).toBeGreaterThan(1)
  })

  it("acc-045's DOT and SOL loss sales (coins held directly) open no window and no restriction", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-045'], taxAware: true })
    for (const symbol of ['DOT', 'SOL']) {
      const leg = preview!.trades.find((t) => t.symbol === symbol && t.side === 'sell')!
      expect(leg.realisedShortTerm + leg.realisedLongTerm, symbol).toBeLessThan(0)
      expect(leg.repurchaseBlockedUntil, symbol).toBeUndefined()
      expect(leg.washSaleRisk, symbol).toBe(false)
      expect(leg.washedLoss, symbol).toBeUndefined()
      expect(preview!.repurchaseRestrictions.filter((r) => r.symbol === symbol), symbol).toEqual([])
    }
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

  it('a coin leg projects no restriction even if it arrives stamped', () => {
    const proposals = [{ accountId: 'acc-045', legs: [{ symbol: 'DOT', repurchaseBlockedUntil: '2026-03-27' }, { symbol: 'AGG', repurchaseBlockedUntil: '2026-03-27' }] }]
    expect(repurchaseRestrictionsFor(account('acc-045'), MOCK_TODAY_ISO, proposals).map((r) => r.symbol)).toEqual(['AGG'])
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

describe('§0.2 · a buy proposed in the same batch washes a loss sold by the same taxpayer', () => {
  it("acc-002's AGG buy washes 1,567 of acc-005's AGG loss shares; the estimate counts only the rest", async () => {
    const previews = await previewRebalance({ accountIds: ['acc-002', 'acc-005'], taxAware: true })
    const [p002, p005] = previews
    const buy = p002!.trades.find((t) => t.symbol === 'AGG' && t.side === 'buy')!
    const sell = p005!.trades.find((t) => t.symbol === 'AGG' && t.side === 'sell')!
    expect(buy.quantity).toBe(1_567)
    expect(buy.washSaleRisk).toBe(true)

    // The loss shares acc-005 sells, earliest bought first (§1.1091-1(b)); the first 1,567 of them wash.
    const { legs, sales } = generateRebalanceProposal('acc-005', true)
    const ownLeg = legs.find((l) => l.symbol === 'AGG' && l.side === 'sell')!
    const lossLots = [...sales.get(ownLeg)!.soldLosses].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
    let unmatched = buy.quantity
    let expected = 0
    for (const lot of lossLots) {
      const matched = Math.min(unmatched, lot.quantity)
      expected += (lot.loss / lot.quantity) * matched
      unmatched -= matched
    }
    // No AGG bought by the couple in the last 30 days, so the batch's buy is the only replacement.
    const recentAgg = ['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005'].flatMap((id) => {
      const a = account(id)
      const agg = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'AGG')
      return generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === agg?.id && l.purchaseDate >= '2026-01-26')
    })
    expect(recentAgg).toEqual([])
    expect(sell.washedLoss).toEqual({ shortTerm: 0, longTerm: Math.round(expected), collectibleLongTerm: 0, deferred: Math.round(expected), disallowed: 0 })
    expect(sell.washSaleRisk).toBe(true)
    expect(sell.repurchaseBlockedUntil).toBe('2026-03-27')

    // The estimate is the one the recognised result gives, not the one the realised loss would.
    const asServed = estimateTaxOnReturns(previews.map((p) => ({ account: account(p.accountId), legs: p.trades })), MOCK_TODAY_ISO)
    const ignoringWash = estimateTaxOnReturns(previews.map((p) => ({ account: account(p.accountId), legs: p.trades.map((t) => ({ ...t, washedLoss: undefined })) })), MOCK_TODAY_ISO)
    expect(p005!.estimatedTaxImpact).toBe(asServed[1]!.net)
    expect(p005!.estimatedTaxImpact).not.toBe(ignoringWash[1]!.net)
  })

  it('the generator proposes the same trades either way: settlement only adds §1091 facts', async () => {
    const previews = await previewRebalance({ accountIds: ['acc-002', 'acc-005'], taxAware: true })
    for (const p of previews) {
      const own = generateRebalanceProposal(p.accountId, true).legs
      expect(p.trades.map((t) => [t.side, t.symbol, t.quantity, t.estimatedValue])).toEqual(own.map((t) => [t.side, t.symbol, t.quantity, t.estimatedValue]))
    }
  })

  it('a buy in another taxpayer\'s account washes nothing', async () => {
    // acc-006 is an irrevocable trust inside hh-002; acc-007 sells AGG at a loss.
    const [alone] = await previewRebalance({ accountIds: ['acc-007'], taxAware: true })
    const [withTrust] = await previewRebalance({ accountIds: ['acc-007', 'acc-006'], taxAware: true })
    const agg = (p: typeof alone) => p!.trades.find((t) => t.symbol === 'AGG' && t.side === 'sell')
    expect(agg(withTrust)?.washedLoss).toEqual(agg(alone)?.washedLoss)
  })
})

describe('§0.2 · settleBatchWashSales on constructed legs', () => {
  const leg = (symbol: string, side: 'buy' | 'sell', quantity: number, realisedLongTerm = 0): ProposedTradeLeg => ({
    symbol, name: symbol, side, quantity, estimatedValue: quantity, taxImpact: 0, realisedShortTerm: 0, realisedLongTerm,
    realisedCollectibleLongTerm: 0, washSaleRisk: false, currency: 'USD', assetClass: 'equity', actualWeight: 0, targetWeight: 0,
  })
  const settleOne = (accountId: string, sell: ProposedTradeLeg, sale: LegSale, others: ProposedTradeLeg[] = []) =>
    settleBatchWashSales([{ account: account(accountId), legs: [sell, ...others], sales: new Map([[sell, sale]]) }], MOCK_TODAY_ISO)[0]!

  it('an IBIT loss sale (an exchange-traded trust) still opens a window; a DOT one does not', () => {
    const lossLot = (symbol: string) => ({ lotId: `x-${symbol}`, symbol, purchaseDate: '2025-06-03', quantity: 100, loss: -1_000, holdingPeriod: 'long' as const })
    const ibit = leg('IBIT', 'sell', 100, -1_000)
    expect(settleOne('acc-002', ibit, { soldLosses: [lossLot('IBIT')], consumedLotIds: ['x-IBIT'] })[0]!.repurchaseBlockedUntil).toBe('2026-03-27')
    const dot = leg('DOT', 'sell', 100, -1_000)
    expect(settleOne('acc-045', dot, { soldLosses: [lossLot('DOT')], consumedLotIds: ['x-DOT'] })[0]!.repurchaseBlockedUntil).toBeUndefined()
  })

  it('a net-gain leg that sells a loss lot opens a window: the loss shares are judged per lot', () => {
    const sell = leg('SMH', 'sell', 300, 4_000)
    const sale: LegSale = {
      soldLosses: [{ lotId: 'loss', symbol: 'SMH', purchaseDate: '2025-06-03', quantity: 100, loss: -1_000, holdingPeriod: 'long' }],
      consumedLotIds: ['loss', 'gain'],
    }
    expect(settleOne('acc-033', sell, sale)[0]!.repurchaseBlockedUntil).toBe('2026-03-27')
  })

  it('a loss fully washed by a buy in the same batch leaves no window, and that buy is flagged', () => {
    const sell = leg('SMH', 'sell', 100, -1_000)
    const sale: LegSale = {
      soldLosses: [{ lotId: 'loss', symbol: 'SMH', purchaseDate: '2025-06-03', quantity: 100, loss: -1_000, holdingPeriod: 'long' }],
      consumedLotIds: ['loss'],
    }
    const [settledSell, settledBuy] = settleOne('acc-033', sell, sale, [leg('SMH', 'buy', 100)])
    expect(settledSell!.washedLoss).toEqual({ shortTerm: 0, longTerm: -1_000, collectibleLongTerm: 0, deferred: -1_000, disallowed: 0 })
    expect(settledSell!.repurchaseBlockedUntil).toBeUndefined()
    expect(settledBuy!.washSaleRisk).toBe(true)
  })
})
