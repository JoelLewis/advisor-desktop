import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { AGENT_DEFINITIONS } from '../registry'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows, realizedSales, washSaleWindow } from '@/mocks/data/realized-sales'
import { handTypedDigits } from '@/test/claim-digits'
import { claimNameOf } from '../claim-name'
import { isModelManaged, requireModelManaged } from '@/lib/mandate'

const drift = AGENT_DEFINITIONS.get('drift-monitor')!
const pretrade = AGENT_DEFINITIONS.get('pretrade-check')!
const ctx = (id: string) => ({ asOf: MOCK_NOW_ISO, subject: { type: 'account' as const, id } })

describe('agents over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: claims have no digits; every figure has a source and finite value', (id) => {
    for (const agent of [drift, pretrade]) {
      for (const f of agent.run(ctx(id))) {
        expect(handTypedDigits(f.claim, f.figures)).toEqual([])
        expect(f.citations.length).toBeGreaterThan(0)
        for (const fig of f.figures) {
          expect(Number.isFinite(fig.value)).toBe(true)
          expect(fig.source.length).toBeGreaterThan(0)
        }
      }
    }
  })
  it('drift monitor figures equal the engine drift', () => {
    const account = requireModelManaged(accounts.find((a) => a.id === 'acc-002')!)
    const engine = computeDriftForAccount(account)
    const findings = drift.run(ctx('acc-002'))
    const max = findings.flatMap((f) => f.figures).find((fig) => fig.label.startsWith('Largest drift'))!
    const worst = engine.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
    expect(max.value).toBe(worst.drift)
    expect(findings[0]!.attention).toBe('attention')
  })
  it('drift monitor names private equity as not tradable at market for acc-002', () => {
    const claims = drift.run(ctx('acc-002')).map((f) => f.claim).join(' ')
    expect(claims).toMatch(/Private Equity cannot be sold at market/)
  })
  it('a custom mandate is answered as one: no model to drift from or rebalance to', () => {
    for (const id of ['acc-041', 'acc-042', 'acc-045']) {
      for (const agent of [drift, pretrade]) expect(agent.run(ctx(id)).map((f) => f.claim).join(' '), id).toContain('custom mandate')
    }
  })
  it('pre-trade check never reports anything as cleared', () => {
    for (const a of accounts) for (const f of pretrade.run(ctx(a.id))) expect(f.claim.toLowerCase()).not.toContain('cleared')
  })
  it('runs are deterministic per as-of', () => {
    expect(drift.run(ctx('acc-002'))).toEqual(drift.run(ctx('acc-002')))
  })
  it('concentration claims agree with the engine weights', () => {
    for (const a of accounts.filter(isModelManaged)) {
      const legs = generateRebalanceTrades(a.id, true)
      const result = evaluateProposal(a.id, legs.map((l) => ({ symbol: l.symbol, side: l.side, quantity: l.quantity, estimatedValue: l.estimatedValue })))
      const findings = pretrade.run(ctx(a.id))
      if (!result || result.violations.length === 0) continue
      result.violations.forEach((v, i) => {
        const claim = findings[i]!.claim
        if (v.projectedWeight === undefined || v.limitWeight === undefined) return
        if (claim.includes('would exceed')) expect(v.projectedWeight).toBeGreaterThan(v.limitWeight)
        if (claim.includes('approaching')) expect(v.projectedWeight).toBeLessThanOrEqual(v.limitWeight)
        if (claim.includes('already over')) expect(v.preExisting).toBe(true)
      })
    }
  })
  it('no claim says "A security" when the name or the ticker is digit-free', () => {
    let named = 0
    for (const a of accounts.filter(isModelManaged)) {
      const legs = generateRebalanceTrades(a.id, true)
      const result = evaluateProposal(a.id, legs.map((l) => ({ symbol: l.symbol, side: l.side, quantity: l.quantity, estimatedValue: l.estimatedValue })))
      if (!result) continue
      const names = new Map([...getPositionsForAccount(a.id, a.totalValue).map((p) => [p.symbol, p.name] as const), ...legs.map((l) => [l.symbol, l.name] as const)])
      const findings = pretrade.run(ctx(a.id))
      result.violations.forEach((v, i) => {
        if (v.symbol === undefined) return
        const name = names.get(v.symbol)
        if (/\d/.test(v.symbol) && (name === undefined || /\d/.test(name))) return
        named += 1
        expect(findings[i]!.claim).not.toContain('A security')
      })
    }
    expect(named).toBeGreaterThan(0)
  })
  it("Pre-trade Check reports Growth above Robert Johnson's Moderate tolerance with his accounts as a whole after the proposal, digit-free, with the scores as figures", () => {
    const gap = pretrade.run(ctx('acc-002')).find((f) => f.claim.startsWith('Warning: Growth'))
    expect(gap?.claim).toBe("Warning: Growth sits above Robert Johnson's Moderate tolerance for this account; after this proposal, Robert Johnson's accounts as a whole would sit within it.")
    expect(gap?.figures.map((f) => [f.label, f.unit, f.value])).toEqual([
      ['Growth risk score', 'pts', 66], ["Robert Johnson's tolerance ceiling", 'pts', 55], ["Robert Johnson's accounts as a whole, after this proposal", 'pts', 46],
    ])
  })
  it('Drift Monitor flags the model above the tolerance for the advisor to decide, and says where the accounts as a whole would sit', () => {
    const gap = drift.run(ctx('acc-002')).find((f) => f.claim.startsWith('Growth sits above'))
    expect(gap?.claim).toBe("Growth sits above Robert Johnson's Moderate tolerance for this account; after a rebalance to the model, Robert Johnson's accounts as a whole would sit within it. Approving a rebalance to it needs a recorded suitability reason.")
    expect(gap?.attention).toBe('attention')
    expect(gap?.figures.map((f) => f.value)).toEqual([66, 55, 46])
    expect(drift.run(ctx('acc-017')).map((f) => f.claim)).toContain(
      "Growth sits above Jennifer Martinez's Moderate tolerance for this account, and after a rebalance to the model Jennifer Martinez's accounts as a whole would sit above it too. Approving a rebalance to it needs a recorded suitability reason.",
    )
    expect(drift.run(ctx('acc-003')).some((f) => f.claim.includes('tolerance for this account'))).toBe(false)
  })
  it('names SPY by its ticker on acc-002, since its name carries digits', () => {
    expect(pretrade.run(ctx('acc-002')).map((f) => f.claim)).toContain('Warning: SPY is already over its concentration limit; the proposal reduces it.')
  })
})

describe('claim names', () => {
  it('prefer a digit-free name, then a digit-free ticker', () => {
    expect(claimNameOf('INTC', 'Intel Corp.')).toBe('Intel Corp.')
    expect(claimNameOf('SPY', 'SPDR S&P 500 ETF Trust')).toBe('SPY')
    expect(claimNameOf('0700.HK', 'Tencent Holdings')).toBe('Tencent Holdings')
    expect(claimNameOf('2800.HK', 'Tracker Fund 2800')).toBe('A security')
    expect(claimNameOf('CASH', undefined)).toBe('Cash')
  })
})

describe('drift monitor replacement holds', () => {
  const isReplacementHold = (claim: string) => claim.includes('wash-sale window')

  it('acc-002: SMH is held in place of Intel during the open wash-sale window', () => {
    const findings = drift.run(ctx('acc-002')).filter((f) => isReplacementHold(f.claim))
    expect(findings).toHaveLength(1)
    const [hold] = findings
    expect(hold!.claim).toBe('VanEck Semiconductor ETF was bought in place of the Intel Corp. shares sold at a loss, keeping related exposure while the wash-sale window is open. '
      + 'A US Equity trim should leave it in place, and Intel Corp. should not be bought back in any account of the same taxpayer before the window closes: a buyback in a taxable account would defer the harvested loss into the new shares, and one in an IRA or Roth would disallow it permanently.')
    expect(hold!.attention).toBe('info')
    const account = accounts.find((a) => a.id === 'acc-002')!
    const smh = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === 'SMH')!
    const sale = realizedSales.find((s) => s.id === 'rs-001')!
    const { end } = washSaleWindow(sale.saleDate)
    const daysToClose = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${MOCK_TODAY_ISO}T00:00:00Z`)) / 86_400_000
    // The INTC harvest is Fri 2026-02-20 (Phase 0 trading-day ruling), so the window closes 03-22, 25 days out.
    expect([end, daysToClose]).toEqual(['2026-03-22', 25])
    expect(hold!.figures).toEqual([
      { label: 'SMH weight', value: smh.weight, unit: '%', source: 'positions.weight' },
      { label: 'Days until the INTC window closes', value: daysToClose, unit: 'd', source: 'openWashSaleWindows.daysRemaining' },
    ])
    expect(hold!.citations).toEqual([{ source: 'Wash-sale window · rs-001 · INTC loss sale of 20 Feb 2026 · Don\'t repurchase through 22 Mar 2026', asOf: MOCK_NOW_ISO }])
  })

  it('the replacement link lives on the loss sale, not in the agent', () => {
    expect(realizedSales.filter((s) => s.replacementSymbol !== undefined).map((s) => [s.id, s.symbol, s.replacementSymbol])).toEqual([['rs-001', 'INTC', 'SMH']])
    expect(openWashSaleWindows(MOCK_TODAY_ISO).find((w) => w.id === 'rs-001')?.replacementSymbol).toBe('SMH')
  })

  it('no other account in the book gets a replacement-hold finding', () => {
    const flagged = accounts.filter((a) => drift.run(ctx(a.id)).some((f) => isReplacementHold(f.claim))).map((a) => a.id)
    expect(flagged).toEqual(['acc-002'])
  })
})
