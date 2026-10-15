import { describe, it, expect } from 'vitest'
import { orders } from '@/mocks/handlers/oms'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { store } from '@/mocks/data/workspace-store'
import { withdrawApproval } from '@/mocks/workspace/proposal-acts'
import { ADRIAN, approvedV1, ok, release } from '@/mocks/workspace/__tests__/story-fixture'
import type { BlotterFilters } from '@/types/reference-blotter'
import { blotterQuote, blotterView } from '../blotter'

const view = (filters: BlotterFilters = {}) => {
  const v = blotterView(ADRIAN, filters)
  if (!v) throw new Error('Adrian reads the blotter')
  return v
}
const row = (id: string) => view().rows.find((r) => r.id === id)

describe('tickets', () => {
  it('lists every order management ticket, its status read as working, filled or canceled', () => {
    expect(view().rows.filter((r) => r.source.kind === 'ticket').map((r) => r.id).sort()).toEqual(orders.map((o) => o.id).sort())
    expect(row('ord-003')).toMatchObject({ status: 'working', price: 785, priceKind: 'limit', side: 'sell' })
    expect(row('ord-009')).toMatchObject({ status: 'canceled' })
    expect(row('ord-001')).toMatchObject({ status: 'filled', price: 268.35, priceKind: 'fill', filledAt: '2026-02-24T14:30:02Z', currency: 'USD' })
    expect(row('ord-001')?.recId).toBeUndefined()
  })

  it('says which tickets were entered before the 9:30 ET open, queued for it, and no others', () => {
    const early = view().rows.filter((r) => r.source.kind === 'ticket' && r.preMarket).map((r) => r.id).sort()
    expect(early).toEqual(['ord-003', 'ord-005', 'ord-008', 'ord-010', 'ord-016'])
    expect(row('ord-001')?.preMarket).toBeUndefined()
    expect(row('ord-015')?.preMarket, 'a coin bought on a Saturday is not queued for an open').toBeUndefined()
  })

  it('values a fill by what it is: a fund purchase, a bond at par, a coin', () => {
    expect(row('ord-013')).toMatchObject({ side: 'buy' })
    expect(row('ord-013')?.value).toBeCloseTo(25_000, 2)
    expect(row('ord-014')?.value).toBeCloseTo(47_600, 6)
    expect(row('ord-015')?.value).toBeCloseTo(21_862.5, 6)
    expect(row('ord-016')).toMatchObject({ side: 'buy', status: 'working' })
  })

  it('quotes each quantity in its instrument: option contracts, bond par, shares otherwise', () => {
    expect(row('ord-016')).toMatchObject({ quantity: 5, quantityUnit: 'contracts' })
    expect(row('ord-014')).toMatchObject({ quantity: 50_000, quantityUnit: 'par' })
    expect(row('ord-001')).toMatchObject({ quantityUnit: 'sh' })
    expect(blotterQuote('ord-016')?.figures[0]).toMatchObject({ label: 'Quantity', unit: 'contracts' })
    expect(blotterQuote('ord-014')?.figures[0]).toMatchObject({ label: 'Par', value: 50_000, unit: 'par' })
  })
})

describe("the session's proposal orders", () => {
  it('appear when staged: pending compliance, from the proposal and version, under the approval act', () => {
    const a = approvedV1()
    const staged = view().rows.filter((r) => r.source.kind === 'proposal')
    expect(staged.length).toBe(store().staged.length)
    for (const r of staged) {
      expect(r).toMatchObject({ status: 'pending_compliance', recId: a.approvalActId, accountId: 'acc-002', source: { kind: 'proposal', proposalId: a.proposalId, version: 1, threadId: 'th-johnson-review' } })
      expect(r.price).toBeUndefined()
    }
  })

  it('read as filled after the release: the fill price, value and time, under the release act', () => {
    const releaseAct = release(approvedV1())
    const filled = view({ status: 'filled' }).rows.filter((r) => r.source.kind === 'proposal')
    expect(filled).toHaveLength(ledgerFills().length)
    for (const r of filled) {
      const fill = ledgerFills().find((f) => f.stagedOrderId === r.id)
      expect(r).toMatchObject({ recId: releaseAct.id, price: fill?.price, priceKind: 'fill', value: fill?.value, filledAt: fill?.at })
    }
  })

  it('read as withdrawn, under the withdrawal act, when the approver withdraws', () => {
    const a = approvedV1()
    const { act } = ok(withdrawApproval(ADRIAN, a.proposalId))
    for (const r of view().rows.filter((x) => x.source.kind === 'proposal')) expect(r).toMatchObject({ status: 'withdrawn', recId: act.id })
  })
})

describe('filters and order', () => {
  it('filters by status, account and submitted day, newest first', () => {
    expect(view({ status: 'canceled' }).rows.map((r) => r.id)).toEqual(['ord-009'])
    expect(view({ accountId: 'acc-001' }).rows.every((r) => r.accountId === 'acc-001')).toBe(true)
    expect(view({ since: '2026-02-24', until: '2026-02-24' }).rows.every((r) => r.submittedAt.startsWith('2026-02-24'))).toBe(true)
    const times = view().rows.map((r) => r.submittedAt)
    expect(times).toEqual([...times].sort().reverse())
  })

  it('lists the accounts and days of the whole blotter for the filter controls, whatever the filter', () => {
    const all = view()
    const filtered = view({ status: 'canceled' })
    expect(filtered.accounts).toEqual(all.accounts)
    expect(filtered.days).toEqual(all.days)
    expect(filtered.filters).toEqual({ status: 'canceled' })
  })
})

describe('the boundary and the quote', () => {
  it('is firm only', () => {
    expect(blotterView('cli-001', {})).toBeUndefined()
    expect(blotterView('prsp-011', {})).toBeUndefined()
  })

  it('quotes an order to its account', () => {
    const q = blotterQuote('ord-001')
    expect(q).toMatchObject({ view: 'blotter', subject: { type: 'account', id: 'acc-001' }, threadTitle: 'Orders · Johnson Family Trust' })
    expect(q?.claim).toBe('A buy of VTI in Johnson Family Trust: filled.')
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Quantity', 'sh'], ['Value', 'USD']])
    expect(blotterQuote('ord-999')).toBeUndefined()
  })
})
