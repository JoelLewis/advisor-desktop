import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { openWashSaleWindowsFor } from '@/mocks/handlers/tax-return'
import { settleBatchWashSales } from '@/mocks/handlers/batch-wash-sales'
import { buildRebalancePreviews, generateRebalanceProposal, realizedGains, washingSymbols, type GenerationConstraints } from '@/mocks/handlers/oms'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isModelManaged } from '@/lib/mandate'

const account = (id: string) => accounts.find((a) => a.id === id)!
const generate = (id: string, constraints: GenerationConstraints) => generateRebalanceProposal(id, true, 0.005, undefined, constraints)
const settled = (id: string, constraints: GenerationConstraints) => settleBatchWashSales([{ account: account(id), ...generate(id, constraints) }], MOCK_TODAY_ISO)[0]!

describe('no constraints', () => {
  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: nothing is held back and the legs are the unconstrained ones', (id) => {
    const plain = generateRebalanceProposal(id, true)
    const empty = generate(id, {})
    expect(empty.heldBack.size).toBe(0)
    expect(empty.legs).toEqual(plain.legs)
  })
})

describe('harvest only', () => {
  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: every sale draws only on loss lots; a tax-advantaged account sells nothing', (id) => {
    const a = account(id)
    const proposal = generate(id, { harvestOnly: true })
    const lossLots = new Set(generateTaxLots(a.id, a.totalValue).filter((l) => l.gainLoss < 0).map((l) => l.id))
    for (const leg of proposal.legs.filter((l) => l.side === 'sell')) {
      expect(isTaxableAccount(a.taxTreatment)).toBe(true)
      expect(leg.realizedShortTerm).toBeLessThanOrEqual(0)
      expect(leg.realizedLongTerm).toBeLessThanOrEqual(0)
      for (const lotId of proposal.sales.get(leg)?.consumedLotIds ?? []) expect(lossLots.has(lotId)).toBe(true)
    }
  })

  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: a harvest draws only on loss lots even with the tax-aware toggle off', (id) => {
    const a = account(id)
    const proposal = generateRebalanceProposal(id, false, 0.005, undefined, { harvestOnly: true })
    const lossLots = new Set(generateTaxLots(a.id, a.totalValue).filter((l) => l.gainLoss < 0).map((l) => l.id))
    for (const leg of proposal.legs.filter((l) => l.side === 'sell')) {
      for (const lotId of proposal.sales.get(leg)?.consumedLotIds ?? []) expect(lossLots.has(lotId)).toBe(true)
    }
  })

  it('acc-002 sells exactly its 7,000 INTC and holds US Equity and Digital Assets back for harvest only', () => {
    const proposal = generate('acc-002', { harvestOnly: true })
    const sells = proposal.legs.filter((l) => l.side === 'sell')
    expect(sells.map((l) => [l.symbol, l.quantity])).toEqual([['INTC', 7_000]])
    expect(proposal.heldBack.get('us_equity')).toBe('harvest_only')
    expect(proposal.heldBack.get('digital_assets')).toBe('harvest_only')
    expect(proposal.heldBack.has('private_equity')).toBe(false)
    expect(proposal.legs.some((l) => l.side === 'buy')).toBe(true)
  })

  it('acc-002: the projected drift names harvest only as the reason US Equity stays out', () => {
    const [preview] = buildRebalancePreviews([{ account: account('acc-002'), ...generate('acc-002', { harvestOnly: true }) }], true, 0.005, MOCK_TODAY_ISO)
    const usEquity = preview!.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(usEquity.residualReason).toBe('harvest_only')
    const privateEquity = preview!.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    expect(privateEquity.residualReason).toBe('not_market_tradable')
  })
})

describe('excluding an asset class', () => {
  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: no leg trades the excluded class, which is reported as held back', (id) => {
    const first = generateRebalanceProposal(id, true).legs[0]
    if (!first) return
    const proposal = generate(id, { excludeAssetClasses: [first.assetClass] })
    expect(proposal.legs.some((l) => l.assetClass === first.assetClass)).toBe(false)
    expect(proposal.heldBack.get(first.assetClass)).toBe('excluded_by_constraint')
  })

  it('acc-002 without digital assets keeps its ETHE and IBIT', () => {
    const symbols = generate('acc-002', { excludeAssetClasses: ['digital_assets'] }).legs.map((l) => l.symbol)
    expect(symbols).not.toContain('ETHE')
    expect(symbols).not.toContain('IBIT')
    expect(symbols).toContain('INTC')
  })
})

describe('capping realized gains', () => {
  it('acc-002 under a $50,000 cap realizes at most $50,000 of gains, trimming IBIT (highest gain per dollar) first', () => {
    const uncapped = generate('acc-002', {})
    const capped = generate('acc-002', { capRealizedGains: 50_000 })
    expect(realizedGains(uncapped.legs)).toBeGreaterThan(50_000)
    expect(realizedGains(capped.legs)).toBeLessThanOrEqual(50_000)
    expect(realizedGains(capped.legs)).toBeGreaterThan(0)
    const ibit = capped.legs.find((l) => l.symbol === 'IBIT')
    const uncappedIbit = uncapped.legs.find((l) => l.symbol === 'IBIT')!
    expect(ibit === undefined || ibit.quantity < uncappedIbit.quantity).toBe(true)
    expect(capped.legs.find((l) => l.symbol === 'INTC')?.quantity).toBe(7_000)
    expect(capped.heldBack.size).toBeGreaterThan(0)
  })

  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: a $10,000 cap holds under either tax mode', (id) => {
    for (const taxAware of [true, false]) {
      expect(realizedGains(generateRebalanceProposal(id, taxAware, 0.005, undefined, { capRealizedGains: 10_000 }).legs)).toBeLessThanOrEqual(10_000)
    }
  })

  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: a zero cap realizes no gain at all', (id) => {
    expect(realizedGains(generate(id, { capRealizedGains: 0 }).legs)).toBe(0)
  })
})

describe('avoiding self-washing buys', () => {
  it('the couple\'s open INTC window makes INTC unbuyable in every account of that taxpayer, and in no other household', () => {
    for (const id of ['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005']) {
      expect(washingSymbols(openWashSaleWindowsFor(account(id), MOCK_TODAY_ISO), []).has('INTC')).toBe(true)
    }
    expect(washingSymbols(openWashSaleWindowsFor(account('acc-006'), MOCK_TODAY_ISO), []).has('INTC')).toBe(false)
  })

  it('a symbol sold at a loss is unbuyable, and a coin held directly never is', () => {
    expect([...washingSymbols([], ['AGG', 'ETH'])]).toEqual(['AGG'])
  })

  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: with the constraint on, no buy carries a wash-sale risk after settlement', (id) => {
    for (const leg of settled(id, { avoidSelfWash: true }).filter((l) => l.side === 'buy')) expect(leg.washSaleRisk).toBe(false)
  })

  it.each(accounts.filter(isModelManaged).map((a) => a.id))('%s: no buy names a symbol the proposal sells at a loss', (id) => {
    const a = account(id)
    const positions = getPositionsForAccount(a.id, a.totalValue)
    const legs = generate(id, { avoidSelfWash: true, harvestOnly: true }).legs
    const lossSold = new Set(legs.filter((l) => l.side === 'sell' && (positions.find((p) => p.symbol === l.symbol)?.gainLoss ?? 0) < 0).map((l) => l.symbol))
    for (const leg of legs.filter((l) => l.side === 'buy')) expect(lossSold.has(leg.symbol)).toBe(false)
  })
})
