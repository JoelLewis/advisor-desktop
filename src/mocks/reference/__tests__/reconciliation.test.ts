import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { accounts } from '@/mocks/data/accounts'
import { cashBalanceOf, getPositionsForAccount } from '@/mocks/data/positions'
import { store } from '@/mocks/data/workspace-store'
import { generateTransactions } from '@/mocks/handlers/custodian'
import { archiveFor } from '@/mocks/workspace/archive'
import { eventTime, MOCK_TODAY_ISO } from '@/lib/clock'
import { SEED_LAST_SEQUENCE } from '@/mocks/data/workspace-seed'
import { reconciliationQuote, reconciliationView, resolveBreak } from '../reconciliation'
import { isTradingDay } from '@/lib/trading-calendar'

const ADRIAN = 'user-001'
const SARAH = 'user-002'
const MIKE = 'user-003'
const MARK = 'cco-001'
const RATIONALE = 'Schwab confirmed the 24 Feb cash sweep posted after the file was cut.'

function view(viewerId = ADRIAN) {
  const v = reconciliationView(viewerId)
  if (!v) throw new Error(`${viewerId} reads reconciliation`)
  return v
}
const brk = (id: string) => {
  const b = view().breaks.find((x) => x.id === id)
  if (!b) throw new Error(`no ${id}`)
  return b
}
const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}
const resolve002 = (viewerId = ADRIAN, fingerprint = brk('brk-002').fingerprint) =>
  resolveBreak(viewerId, { breakId: 'brk-002', fingerprint, resolution: 'timing_difference', rationale: RATIONALE })

describe('breaks', () => {
  it("read the book's side off the book, and the custodian's as the book plus its recorded difference", () => {
    expect(brk('brk-002')).toMatchObject({ custodian: 'Schwab', accountName: 'Johnson Family Trust', fieldLabel: 'Cash balance', unit: 'USD', difference: -150, status: 'open' })
    expect(brk('brk-002').book).toBeCloseTo(cashBalanceOf(account('acc-001')), 6)
    expect(brk('brk-002').custodianValue).toBeCloseTo(cashBalanceOf(account('acc-001')) - 150, 6)
    expect(brk('brk-003')).toMatchObject({ custodian: 'Fidelity', symbol: 'EFA', unit: 'sh', book: 14_500, custodianValue: 14_480, status: 'resolved' })
    const acc003 = account('acc-003')
    expect(brk('brk-004')).toMatchObject({ unit: 'count', book: generateTransactions(acc003.id, acc003.totalValue).length })
  })

  it('name only real USD accounts, each at the custodian that holds it', () => {
    for (const b of view().breaks) {
      const a = account(b.accountId)
      expect(a.baseCurrency ?? 'USD', b.id).toBe('USD')
      expect(b.custodian, b.id).toBe(a.custodian)
    }
  })

  it('one is open this morning: brk-002', () => {
    expect(view().breaks.filter((b) => b.status === 'open').map((b) => b.id)).toEqual(['brk-002'])
    expect(view().summary).toMatchObject({ openBreaks: 1, resolvedToday: 0 })
  })
})

describe('match rates', () => {
  it('count checked records against open breaks of their kind', () => {
    const rates = view().summary.rates
    const positions = accounts.reduce((s, a) => s + getPositionsForAccount(a.id, a.totalValue).filter((p) => p.symbol !== 'CASH').length, 0)
    // Phase 7a final: a market-value break counts against one account's valuation and a transaction-count
    // break against one account's stream, not against every position or every transaction.
    expect(rates).toEqual([
      { kind: 'positions', checked: positions, open: 0, rate: 1 },
      { kind: 'valuations', checked: accounts.length, open: 0, rate: 1 },
      { kind: 'cash', checked: accounts.length, open: 1, rate: (accounts.length - 1) / accounts.length },
      { kind: 'transactions', checked: accounts.length, open: 0, rate: 1 },
    ])
  })
})

describe('the trend', () => {
  it("is end-of-day history for the 29 trading days before today and today's count as it stands", () => {
    const trend = view().trend
    expect(trend).toHaveLength(30)
    // Weekends and NYSE holidays (16 February, Washington's Birthday; 19 January, Martin Luther King Jr. Day) are left out.
    expect(trend.every((p) => isTradingDay(p.date))).toBe(true)
    expect(trend.map((p) => p.date)).not.toContain('2026-02-16')
    expect(trend[0]?.date).toBe('2026-01-13')
    expect(trend[29]?.date).toBe(MOCK_TODAY_ISO)
    expect(trend[29]?.openBreaks).toBe(view().summary.openBreaks)
    const on = (date: string) => trend.find((p) => p.date === date)?.openBreaks
    expect([on('2026-01-27'), on('2026-02-03'), on('2026-02-04'), on('2026-02-10'), on('2026-02-11'), on('2026-02-24')]).toEqual([0, 1, 0, 1, 0, 0])
    // brk-102 (3 February) is a market-value break: it dents the valuations rate, not the positions rate.
    expect(trend.find((p) => p.date === '2026-02-03')?.valuations).toBeLessThan(1)
    expect(trend.find((p) => p.date === '2026-02-03')?.positions).toBe(1)
  })
})

describe('integrations', () => {
  it("are the custodians the accounts name, then MoneyGuidePro, each with the log that explains it", () => {
    const list = view().integrations
    expect(list.map((i) => i.name)).toEqual(['Coinbase', 'DBS', 'Fidelity', 'HSBC', 'Schwab', 'UBS', 'Vanguard', 'MoneyGuidePro'])
    for (const i of list) expect(i.log.length, i.name).toBeGreaterThan(0)
    expect(list.find((i) => i.name === 'Schwab')).toMatchObject({ status: 'synced', lastSync: '2026-02-25T07:00:00Z', openBreaks: 1 })
    expect(list.find((i) => i.name === 'MoneyGuidePro')).toMatchObject({ kind: 'planning', status: 'pending', lastSync: '2026-02-24T22:00:00Z', openBreaks: 0 })
    expect(list.find((i) => i.name === 'MoneyGuidePro')?.log.slice(-1)[0]?.detail).toMatch(/has not returned it/)
  })
})

describe('resolve_break', () => {
  it('is a binding act outside any thread that closes the break', () => {
    const r = resolve002()
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({
      kind: 'resolve_break', actorId: ADRIAN, subject: { type: 'recon_break', id: 'brk-002' }, outcome: 'timing_difference', rationale: RATIONALE,
      at: eventTime(SEED_LAST_SEQUENCE + 1), summary: 'Resolved brk-002 · Johnson Family Trust cash balance: timing difference',
    })
    expect(r.act.threadId).toBeUndefined()
    expect(store().messages.some((m) => m.kind === 'act' && m.actId === r.act.id)).toBe(false)
    expect(brk('brk-002')).toMatchObject({ status: 'resolved', resolvedAt: r.act.at, resolution: { actId: r.act.id, actorName: 'Adrian Hale', resolution: 'timing_difference' } })
    expect(view().summary).toMatchObject({ openBreaks: 0, resolvedToday: 1 })
    expect(view().summary.rates.find((x) => x.kind === 'cash')?.rate).toBe(1)
    expect(view().trend[29]?.openBreaks).toBe(0)
  })

  it('records once: a second resolve, by anyone, names the first act', () => {
    const first = resolve002()
    if (!first.ok) throw new Error(first.message)
    expect(resolve002(SARAH)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_RESOLVED', message: `brk-002 was already resolved (${first.act.id}).` })
    expect(store().acts.filter((a) => a.kind === 'resolve_break')).toHaveLength(1)
  })

  it('refuses a break resolved before this session', () => {
    expect(resolveBreak(ADRIAN, { breakId: 'brk-003', fingerprint: brk('brk-003').fingerprint, resolution: 'custodian_corrected', rationale: RATIONALE }))
      .toMatchObject({ ok: false, status: 409, code: 'ALREADY_RESOLVED', message: 'brk-003 was resolved before this session.' })
  })

  it('refuses a fingerprint that is not the break’s, recording nothing', () => {
    expect(resolve002(ADRIAN, '00000000')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(store().acts).toHaveLength(0)
  })

  it('belongs to the advisor and client service: the analyst and compliance get 403, outsiders 404', () => {
    expect(resolve002(MIKE)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(resolve002(MARK)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(resolve002('cli-001')).toMatchObject({ ok: false, status: 404 })
    expect(resolve002('prsp-011')).toMatchObject({ ok: false, status: 404 })
    expect(resolveBreak(ADRIAN, { breakId: 'brk-999', fingerprint: 'X', resolution: 'book_corrected', rationale: RATIONALE })).toMatchObject({ ok: false, status: 404, code: 'NO_BREAK' })
    expect(resolve002(SARAH)).toMatchObject({ ok: true })
  })

  it('needs a rationale', () => {
    expect(resolveBreak(ADRIAN, { breakId: 'brk-002', fingerprint: brk('brk-002').fingerprint, resolution: 'book_corrected', rationale: '   ' }))
      .toMatchObject({ ok: false, status: 400, code: 'RATIONALE_REQUIRED' })
  })

  it("is in the Archive for any firm viewer, under the account's client", () => {
    const r = resolve002()
    if (!r.ok) throw new Error(r.message)
    const archive = archiveFor(MARK, { kind: 'resolve_break' })
    expect(archive?.entries).toEqual([expect.objectContaining({ kind: 'act', id: r.act.id, partyId: 'cli-001', partyName: 'Robert Johnson' })])
  })
})

describe('the boundary and the quote', () => {
  it('is firm only', () => {
    expect(reconciliationView('cli-001')).toBeUndefined()
    expect(reconciliationView('prsp-011')).toBeUndefined()
  })

  it('quotes a break: the book, the custodian and the difference, with the file it came from', () => {
    const q = reconciliationQuote('brk-002')
    expect(q).toMatchObject({ view: 'reconciliation', subject: { type: 'recon_break', id: 'brk-002' }, threadTitle: 'Reconciliation · brk-002 · Johnson Family Trust' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Book', 'USD'], ['Schwab', 'USD'], ['Difference', 'USD']])
    expect(reconciliationQuote('brk-999')).toBeUndefined()
  })

  it('the hand-typed reconciliation surface is gone', () => {
    for (const path of ['src/mocks/handlers/reconciliation.ts', 'src/services/reconciliation.ts', 'src/hooks/use-reconciliation.ts', 'src/types/reconciliation.ts']) {
      expect(existsSync(path), path).toBe(false)
    }
  })
})
