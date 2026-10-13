import { describe, it, expect } from 'vitest'
import type { ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { cashBalanceOf, getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { agentConstraints } from '@/mocks/agents/proposal-agent'
import { eventTime } from '@/lib/clock'
import { buildVersion } from '../proposal-engine'
import { applyFills } from '../fills'

const approvable = (v: ProposalVersion) => v.preview.trades.length > 0 && !v.pretrade.violations.some((x) => x.severity === 'block')

describe('releasing every account\'s approvable proposal, one after another', () => {
  it('leaves no negative or empty position, no lot sold twice, cash and quantities reconciled, drift from the new holdings', () => {
    const constraints = agentConstraints([])
    let released = 0
    for (const account of accounts) {
      const built = buildVersion(account.id, constraints, [])
      if (!built.ok) throw new Error(`${account.id}: ${built.message}`)
      const version: ProposalVersion = { n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: eventTime(5), constraints, edits: [], changeSummary: 'x', ...built.built }
      if (!approvable(version)) continue
      const orders: StagedOrder[] = version.preview.trades.map((t, i) => ({
        id: `stg-${account.id}-${i}`, proposalId: `prop-${account.id}`, version: 1, accountId: account.id, symbol: t.symbol, side: t.side,
        quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: eventTime(10), approvalActId: `REC-${account.id}`,
      }))
      const cashBefore = cashBalanceOf(account)
      const fills = applyFills({ accountId: account.id, proposalId: `prop-${account.id}`, version, orders, times: orders.map((_, i) => eventTime(150 + i)) })
      released += 1

      const positions = getPositionsForAccount(account.id, account.totalValue)
      const lots = generateTaxLots(account.id, account.totalValue)
      for (const p of positions) {
        expect(p.quantity, `${account.id} ${p.symbol}`).toBeGreaterThan(0)
        expect(p.marketValue, `${account.id} ${p.symbol}`).toBeGreaterThanOrEqual(0)
        if (p.symbol === 'CASH') continue
        const own = lots.filter((l) => l.positionId === p.id)
        expect(own.reduce((s, l) => s + l.quantity, 0), `${account.id} ${p.symbol} lots`).toBeCloseTo(p.quantity, 6)
        expect(own.reduce((s, l) => s + l.currentValue, 0), `${account.id} ${p.symbol} lot values`).toBeCloseTo(p.marketValue, 1)
      }
      expect(lots.every((l) => positions.some((p) => p.id === l.positionId)), account.id).toBe(true)
      expect(fills.map((f) => [f.symbol, f.side, f.quantity])).toEqual([...orders].sort((a, b) => Number(a.side === 'buy') - Number(b.side === 'buy')).map((o) => [o.symbol, o.side, o.quantity]))
      const moved = fills.reduce((s, f) => s + (f.side === 'sell' ? f.value : -f.value), 0)
      expect(cashBalanceOf(account), `${account.id} cash`).toBeCloseTo(cashBefore + moved, 2)
      expect(positions.reduce((s, p) => s + p.marketValue, 0), `${account.id} value`).toBeCloseTo(account.totalValue, 1)
      const after = new Map(computeDriftForAccount(account).assetClassDrifts.map((d) => [d.assetClass, d.drift]))
      for (const d of version.preview.projectedDrift.assetClassDrifts) {
        expect(Math.abs((after.get(d.assetClass) ?? 0) - d.drift), `${account.id} ${d.assetClass} drift`).toBeLessThan(0.0005)
      }
    }
    expect(released).toBe(10)
    const ids = accounts.flatMap((a) => generateTaxLots(a.id, a.totalValue).map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  }, 180_000)
})
