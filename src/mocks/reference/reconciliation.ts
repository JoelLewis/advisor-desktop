import { accountDisplayName } from '@/lib/account-display'
import type { Account } from '@/types/account'
import type { BindingAct } from '@/types/workspace'
import type { MethodNote, RowQuote } from '@/types/reference'
import {
  RESOLUTION_WORDS, isBreakResolution,
  type BreakField, type BreakUnit, type IntegrationView, type MatchKind, type MatchRate, type ReconBreakRecord,
  type ReconBreakView, type ReconciliationView, type ReconTrendPoint, type ResolveBreakRequest,
} from '@/types/reference-reconciliation'
import { accounts } from '@/mocks/data/accounts'
import { can, personById } from '@/mocks/data/people'
import { cashBalanceOf, getPositionsForAccount } from '@/mocks/data/positions'
import { INTEGRATION_LOG, PLANNING_INTEGRATION, RECON_BREAKS } from '@/mocks/data/reconciliation'
import { commitActId, nextAt, sessionNow, store } from '@/mocks/data/workspace-store'
import { generateTransactions } from '@/mocks/handlers/custodian'
import { rationaleRefusal } from '@/mocks/workspace/compliance-acts'
import { recordAct } from '@/mocks/workspace/proposal-acts'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { fingerprint } from '@/lib/fingerprint'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { isTradingDay } from '@/lib/trading-calendar'

export type ResolveFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
const refuse = (status: ResolveFailure['status'], code: string, message: string): ResolveFailure => ({ ok: false, status, code, message })

const FIELD: Readonly<Record<BreakField, { label: string; unit: BreakUnit; kind: MatchKind }>> = {
  cash_balance: { label: 'Cash balance', unit: 'USD', kind: 'cash' },
  position_quantity: { label: 'Position quantity', unit: 'sh', kind: 'positions' },
  market_value: { label: 'Market value', unit: 'USD', kind: 'valuations' },
  transaction_count: { label: 'Transaction count', unit: 'count', kind: 'transactions' },
}
const MATCH_KINDS: readonly MatchKind[] = ['positions', 'valuations', 'cash', 'transactions']
const DAY_MS = 86_400_000
const TREND_DAYS = 30

function accountOf(id: string): Account {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`A break names no account ${id}`)
  return account
}

/** The book's side of a break, read off the book as it stands. */
function bookSide(b: ReconBreakRecord, account: Account): number {
  switch (b.field) {
    case 'cash_balance': return cashBalanceOf(account)
    case 'market_value': return getPositionsForAccount(account.id, account.totalValue).reduce((s, p) => s + p.marketValue, 0)
    case 'transaction_count': return generateTransactions(account.id, account.totalValue).length
    case 'position_quantity': {
      const held = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === b.symbol)
      if (!held) throw new Error(`${b.id}: ${account.id} holds no ${b.symbol ?? '(no symbol)'}`)
      return held.quantity
    }
  }
}

function resolutionAct(breakId: string): BindingAct | undefined {
  return store().acts.find((a) => a.kind === 'resolve_break' && a.subject?.type === 'recon_break' && a.subject.id === breakId)
}

function resolutionOf(act: BindingAct): NonNullable<ReconBreakView['resolution']> {
  const actor = personById(act.actorId)
  if (!actor || !isBreakResolution(act.outcome) || act.rationale === undefined) throw new Error(`${act.id} is not a complete resolve_break act`)
  return { actId: act.id, actorName: actor.name, resolution: act.outcome, rationale: act.rationale }
}

function breakView(b: ReconBreakRecord): ReconBreakView {
  const account = accountOf(b.accountId)
  const field = FIELD[b.field]
  const book = bookSide(b, account)
  const custodianValue = book + b.custodianDelta
  const act = resolutionAct(b.id)
  const resolvedAt = act?.at ?? b.resolvedBeforeSession
  return {
    id: b.id, custodian: account.custodian, accountId: account.id, accountName: accountDisplayName(account), field: b.field, fieldLabel: field.label,
    ...(b.symbol ? { symbol: b.symbol } : {}),
    unit: field.unit, book, custodianValue, difference: b.custodianDelta, severity: b.severity, detectedAt: b.detectedAt,
    fingerprint: fingerprint([b.id, account.id, b.field, b.symbol ?? '', book, custodianValue].join('|')),
    status: resolvedAt ? 'resolved' : 'open',
    ...(resolvedAt ? { resolvedAt } : {}),
    ...(act ? { resolution: resolutionOf(act) } : {}),
  }
}

const isOpenAt = (b: ReconBreakView, instant: string) => b.detectedAt <= instant && (b.resolvedAt === undefined || b.resolvedAt > instant)

/**
 * A break is counted against the record it is about: a quantity break against one position, a
 * market-value break against one account's valuation, a cash break against one balance, and a
 * transaction-count break against one account's transaction stream. Counting a valuation break
 * against every position (or a stream break against every transaction) diluted the rates.
 */
function checkedRecords(): Readonly<Record<MatchKind, number>> {
  return {
    positions: accounts.reduce((s, a) => s + getPositionsForAccount(a.id, a.totalValue).filter((p) => p.symbol !== 'CASH').length, 0),
    valuations: accounts.length,
    cash: accounts.length,
    transactions: accounts.length,
  }
}

function ratesFor(open: readonly ReconBreakView[], checked: Readonly<Record<MatchKind, number>>): MatchRate[] {
  return MATCH_KINDS.map((kind) => {
    const n = open.filter((b) => FIELD[b.field].kind === kind).length
    return { kind, checked: checked[kind], open: n, rate: (checked[kind] - n) / checked[kind] }
  })
}

const rateOf = (rates: readonly MatchRate[], kind: MatchKind) => {
  const found = rates.find((r) => r.kind === kind)
  if (!found) throw new Error(`No ${kind} match rate`)
  return found.rate
}

/** Today and the trading days before it, oldest first: nightly files do not arrive on weekends or NYSE holidays. */
function trendDays(): string[] {
  const days: string[] = []
  for (let t = Date.parse(`${MOCK_TODAY_ISO}T00:00:00Z`); days.length < TREND_DAYS; t -= DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10)
    if (isTradingDay(day)) days.unshift(day)
  }
  return days
}

/** End-of-day open breaks for each of the trading days before today, then today as it stands now. */
function trendOf(views: readonly ReconBreakView[], checked: Readonly<Record<MatchKind, number>>): ReconTrendPoint[] {
  return trendDays().map((date) => {
    const open = date === MOCK_TODAY_ISO ? views.filter((b) => b.status === 'open') : views.filter((b) => isOpenAt(b, `${date}T23:59:59.999Z`))
    const rates = ratesFor(open, checked)
    return { date, openBreaks: open.length, positions: rateOf(rates, 'positions'), valuations: rateOf(rates, 'valuations'), cash: rateOf(rates, 'cash'), transactions: rateOf(rates, 'transactions') }
  })
}

function integrationsOf(views: readonly ReconBreakView[]): IntegrationView[] {
  const custodians = [...new Set(accounts.map((a) => a.custodian))].sort()
  const feeds = [...custodians.map((name) => ({ name, kind: 'custodian' as const })), { name: PLANNING_INTEGRATION, kind: 'planning' as const }]
  return feeds.map(({ name, kind }) => {
    const log = INTEGRATION_LOG.filter((e) => e.integration === name).sort((a, b) => a.at.localeCompare(b.at))
    const latest = log[log.length - 1]
    if (!latest) throw new Error(`Integration ${name} has no log`)
    const lastSync = [...log].reverse().find((e) => e.status === 'synced')?.at
    return { name, kind, status: latest.status, ...(lastSync ? { lastSync } : {}), openBreaks: views.filter((b) => b.status === 'open' && b.custodian === name).length, log }
  })
}

const METHODS: readonly MethodNote[] = [
  { label: 'Book and custodian', modeled: false, text: "A break records how far the custodian's figure sits from the book's. The book's side is read off the book as it stands today: the cash position, the position's quantity, the positions' market value, or the count of the account's transaction stream. A resolved break therefore shows the book today, not the book when it was detected." },
  { label: 'Match rates', modeled: false, text: "Each break counts against the record it is about: a quantity break against one of the book's non-cash positions, a market-value break against one account's valuation, a cash break against one account's balance, a transaction-count break against one account's transaction stream. A rate is the share of those records with no open break." },
  { label: 'Trend', modeled: false, text: `End-of-day open breaks for each of the ${TREND_DAYS - 1} trading days before today, from each break's detection and resolution times, then today's count as it stands now. Weekends and NYSE holidays are left out: no nightly file arrives on them.` },
  { label: 'Integrations', modeled: false, text: "Each feed's status and last sync come from its log. A feed outside the US syncs on its own market's close." },
  { label: 'Resolving', modeled: false, text: 'Resolving a break is recorded by the advisor or client service in the Archive, with its rationale. Nothing edits or deletes it.' },
]

export function reconciliationView(viewerId: string): ReconciliationView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const views = RECON_BREAKS.map(breakView).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || a.id.localeCompare(b.id))
  const checked = checkedRecords()
  const open = views.filter((b) => b.status === 'open')
  const day = sessionNow().slice(0, 10)
  return {
    asOf: MOCK_NOW_ISO,
    summary: { openBreaks: open.length, resolvedToday: views.filter((b) => b.resolvedAt?.slice(0, 10) === day).length, rates: ratesFor(open, checked) },
    breaks: views,
    integrations: integrationsOf(views),
    trend: trendOf(views, checked),
    methods: [...METHODS],
  }
}

/** The advisor or client service closes a break, once, against the figures they read. */
export function resolveBreak(viewerId: string, r: ResolveBreakRequest): { ok: true; act: BindingAct } | ResolveFailure {
  const record = RECON_BREAKS.find((b) => b.id === r.breakId)
  if (!record || !isFirmViewer(viewerId)) return refuse(404, 'NO_BREAK', 'Break not found.')
  if (!can(viewerId, 'resolve_break')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor or client service can resolve a break.')
  const badRationale = rationaleRefusal(r.rationale, 'break resolution')
  if (badRationale) return badRationale
  if (!isBreakResolution(r.resolution)) return refuse(400, 'BAD_RESOLUTION', 'The resolution is book_corrected, custodian_corrected or timing_difference.')
  const earlier = resolutionAct(record.id)
  if (earlier) return refuse(409, 'ALREADY_RESOLVED', `${record.id} was already resolved (${earlier.id}).`)
  if (record.resolvedBeforeSession) return refuse(409, 'ALREADY_RESOLVED', `${record.id} was resolved before this session.`)
  const view = breakView(record)
  if (view.fingerprint !== r.fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', 'The break changed since you opened it. Open it again.')
  const act: BindingAct = {
    id: commitActId(), kind: 'resolve_break', actorId: viewerId, at: nextAt(), subject: { type: 'recon_break', id: record.id },
    fingerprint: r.fingerprint, rationale: r.rationale.trim(), outcome: r.resolution,
    summary: `Resolved ${record.id} · ${accountOf(record.accountId).name} ${view.fieldLabel.toLowerCase()}: ${RESOLUTION_WORDS[r.resolution].toLowerCase()}`,
  }
  recordAct(act)
  return { ok: true, act }
}

/** The client whose account a break is about: the Archive files the act under them. */
export function breakClientId(breakId: string): string | undefined {
  const record = RECON_BREAKS.find((b) => b.id === breakId)
  return record ? accountOf(record.accountId).clientId : undefined
}

export function reconciliationQuote(breakId: string): RowQuote | undefined {
  const record = RECON_BREAKS.find((b) => b.id === breakId)
  if (!record) return undefined
  const b = breakView(record)
  const name = accountOf(record.accountId).name
  const field = b.fieldLabel.toLowerCase()
  return {
    view: 'reconciliation', rowId: b.id, subject: { type: 'recon_break', id: b.id }, threadTitle: `Reconciliation · ${b.id} · ${name}`,
    claim: b.status === 'open'
      ? `${name}: the book's ${field} differs from ${b.custodian}'s.`
      : `${name}: the book's ${field} differed from ${b.custodian}'s; the break is resolved.`,
    figures: [
      { label: b.status === 'open' ? 'Book' : 'Book today', value: b.book, unit: b.unit, source: 'reconciliation.breaks.book' },
      { label: b.custodian, value: b.custodianValue, unit: b.unit, source: 'reconciliation.breaks.custodianValue' },
      { label: 'Difference', value: b.difference, unit: b.unit, source: 'reconciliation.breaks.difference' },
    ],
    citations: [{ source: `Reconciliation · ${b.custodian} nightly file`, asOf: b.detectedAt }],
  }
}
