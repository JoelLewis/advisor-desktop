import { describe, it, expect } from 'vitest'
import { MOCK_NOW_ISO, eventTime } from '@/lib/clock'
import { fmtEasternDay, fmtEasternTime } from '@/kit/measure'
import { isTradingDay } from '@/lib/trading-calendar'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { householdFixtures } from '@/mocks/data/households'
import { plans } from '@/mocks/data/planning'
import { activities } from '@/mocks/data/activities'
import { BILLING_EXCEPTIONS } from '@/mocks/data/billing'
import { calendarEvents } from '@/mocks/data/calendar'
import { clientComms } from '@/mocks/data/client-comms'
import { documents } from '@/mocks/data/documents'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { ACCEPTANCE_AT, REPLY_AT } from '@/mocks/data/prospect-script'
import { SEED_PROSPECTS } from '@/mocks/data/prospect-seed'
import { prospects } from '@/mocks/data/prospects'
import { INTEGRATION_LOG, RECON_BREAKS } from '@/mocks/data/reconciliation'
import { SEED_LAST_SEQUENCE, SEED_MESSAGES } from '@/mocks/data/workspace-seed'
import { SUPERVISION_RECORDS, complianceAlerts } from '@/mocks/handlers/compliance'
import { orders } from '@/mocks/handlers/oms'

/**
 * Every seeded time a person reads, as `kind id field`. `latest` is the latest the stamp may fall: the frozen
 * now for the past, the seed's last event-clock minute for the seed's messages, and nothing for a scheduled time.
 */
type Stamp = { kind: string; id: string; field: string; at: string; latest?: string }

const past = (kind: string, id: string, field: string, at: string | undefined): Stamp[] =>
  at === undefined ? [] : [{ kind, id, field, at, latest: MOCK_NOW_ISO }]
const scheduled = (kind: string, id: string, field: string, at: string): Stamp => ({ kind, id, field, at })

const STAMPS: readonly Stamp[] = [
  ...SEED_MESSAGES.map((m) => ({ kind: 'message', id: m.id, field: 'at', at: m.at, latest: eventTime(SEED_LAST_SEQUENCE) })),
  ...complianceAlerts.flatMap((a) => [...past('alert', a.id, 'createdAt', a.createdAt), ...past('alert', a.id, 'resolvedAt', a.resolvedAt)]),
  ...SUPERVISION_RECORDS.flatMap((r) => past('supervision record', r.id, 'timestamp', r.timestamp)),
  ...RECON_BREAKS.flatMap((b) => [...past('break', b.id, 'detectedAt', b.detectedAt), ...past('break', b.id, 'resolvedBeforeSession', b.resolvedBeforeSession)]),
  ...INTEGRATION_LOG.flatMap((e) => past('integration', e.integration, 'at', e.at)),
  ...BILLING_EXCEPTIONS.flatMap((e) => [...past('billing exception', e.id, 'openedAt', e.openedAt), ...past('billing exception', e.id, 'resolvedAt', e.resolvedAt)]),
  ...clientComms.flatMap((c) => past('client comm', c.id, 'timestamp', c.timestamp)),
  ...activities.flatMap((a) => past('activity', a.id, 'timestamp', a.timestamp)),
  ...documents.flatMap((d) => [...past('document', d.id, 'createdAt', d.createdAt), ...past('document', d.id, 'updatedAt', d.updatedAt)]),
  ...orders.flatMap((o) => [...past('order', o.id, 'submittedAt', o.submittedAt), ...past('order', o.id, 'filledAt', o.filledAt)]),
  ...prospects.flatMap((p) => [
    ...past('prospect', p.id, 'createdAt', p.createdAt),
    ...past('prospect', p.id, 'stageChangedAt', p.stageChangedAt),
    ...p.activities.flatMap((a) => past('prospect note', a.id, 'date', a.date)),
    scheduled('prospect', p.id, 'nextActionDate', p.nextActionDate),
  ]),
  ...SEED_PROSPECTS.flatMap((p) => [
    ...p.stageHistory.flatMap((s) => past('prospect stage', p.id, s.stage, s.at)),
    ...p.steps.flatMap((s) => past('prospect step', p.id, s.kind, s.at)),
  ]),
  scheduled('prospect script', 'reply', 'at', REPLY_AT),
  scheduled('prospect script', 'acceptance', 'at', ACCEPTANCE_AT),
  ...OPEN_ITEMS.flatMap((i) => past('open item', i.id, 'asOf', i.asOf)),
  ...calendarEvents.flatMap((e) => [scheduled('event', e.id, 'startTime', e.startTime), scheduled('event', e.id, 'endTime', e.endTime)]),
]

/**
 * The few stamps that are honestly outside a person's working day, each with why and what it excuses: the
 * hour (it happened overnight) or the weekend (the market it records trades every day). None excuses both.
 */
const OFF_HOURS: readonly { name: string; reason: string; excuses: 'hours' | 'weekend'; covers: (s: Stamp) => boolean }[] = [
  { name: 'nightly feeds', reason: 'Custodian and planning files sync overnight or on their own market’s clock.', excuses: 'hours', covers: (s) => s.kind === 'integration' },
  { name: 'breaks a nightly file raises', reason: 'A break is detected when the overnight custodian file is matched, before anyone is in.', excuses: 'hours', covers: (s) => s.kind === 'break' && s.field === 'detectedAt' },
  { name: 'pre-market note', reason: 'An automated futures note, published before the advisor is in because futures trade overnight.', excuses: 'hours', covers: (s) => s.kind === 'activity' && s.id === 'act-002' },
  { name: 'digital assets', reason: 'Spot crypto trades every day, so a coin bought on a Saturday is a real fill.', excuses: 'weekend', covers: (s) => s.kind === 'order' && orders.some((o) => o.id === s.id && o.assetClass === 'digital_asset') },
]

/**
 * Calendar dates that record an office act (an account opened, a rebalance, a risk assessment, a record or report
 * updated, a review scheduled): `YYYY-MM-DD`, read as the day itself.
 */
type OfficeDate = { kind: string; id: string; field: string; date: string }
const OFFICE_DATES: readonly OfficeDate[] = [
  ...clients.flatMap((c) => [
    { kind: 'client', id: c.id, field: 'createdAt', date: c.createdAt },
    { kind: 'client', id: c.id, field: 'updatedAt', date: c.updatedAt },
    { kind: 'client', id: c.id, field: 'riskProfile.lastAssessed', date: c.riskProfile.lastAssessed },
  ]),
  ...householdFixtures.map((h) => ({ kind: 'household', id: h.id, field: 'createdAt', date: h.createdAt })),
  ...accounts.flatMap((a) => [
    { kind: 'account', id: a.id, field: 'openDate', date: a.openDate },
    ...(a.lastRebalance ? [{ kind: 'account', id: a.id, field: 'lastRebalance', date: a.lastRebalance }] : []),
  ]),
  ...heldAwayAssets.map((h) => ({ kind: 'held-away', id: h.id, field: 'lastUpdated', date: h.lastUpdated })),
  ...plans.flatMap((p) => [
    { kind: 'plan', id: p.id, field: 'lastUpdated', date: p.lastUpdated },
    { kind: 'plan', id: p.id, field: 'nextReviewDate', date: p.nextReviewDate },
  ]),
]
/** The NYSE calendar stands in for the firm's own closures in the years it covers; before them, only weekends are known. */
const NYSE_CALENDAR_FROM = '2022-01-01'
const officeClosed = (date: string) => {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return weekday === 0 || weekday === 6 || (date >= NYSE_CALENDAR_FROM && !isTradingDay(date))
}

const label = (s: Stamp) => `${s.kind} ${s.id} ${s.field} ${s.at} (${fmtEasternDay(s.at)} ${fmtEasternTime(s.at)} ET)`
const excused = (s: Stamp, what: 'hours' | 'weekend') => OFF_HOURS.some((e) => e.excuses === what && e.covers(s))
const WORKING_DAY = { from: '07:00', to: '20:00' } as const
const onWeekend = (s: Stamp) => /^(Sat|Sun) /.test(fmtEasternDay(s.at))
const outsideHours = (s: Stamp) => {
  const time = fmtEasternTime(s.at)
  return time < WORKING_DAY.from || time > WORKING_DAY.to
}

describe('seeded times read as a working day in New York', () => {
  it('collects every kind of seeded time a person reads', () => {
    const kinds = new Set(STAMPS.map((s) => s.kind))
    const expected = ['message', 'alert', 'supervision record', 'break', 'integration', 'billing exception', 'client comm', 'activity', 'document', 'order',
      'prospect', 'prospect note', 'prospect stage', 'prospect script', 'open item', 'event']
    for (const kind of expected) expect(kinds, kind).toContain(kind)
    // Dr. Pell is seeded at first contact, before any step of hers; a seeded step would be checked as 'prospect step'.
    expect(SEED_PROSPECTS.flatMap((p) => p.steps)).toEqual([])
  })

  it('every one falls on a weekday', () => {
    const weekend = STAMPS.filter((s) => !excused(s, 'weekend') && onWeekend(s)).map(label)
    expect(weekend).toEqual([])
  })

  it('every one falls between 07:00 and 20:00 ET', () => {
    const offHours = STAMPS.filter((s) => !excused(s, 'hours') && outsideHours(s)).map(label)
    expect(offHours).toEqual([])
  })

  it('nothing that already happened is dated after the frozen now; only scheduled times lie ahead', () => {
    const early = STAMPS.filter((s) => s.latest !== undefined && Date.parse(s.at) > Date.parse(s.latest)).map(label)
    expect(early).toEqual([])
  })

  it('each exception still excuses a time outside the working day', () => {
    for (const e of OFF_HOURS) expect(STAMPS.some((s) => e.covers(s) && (e.excuses === 'weekend' ? onWeekend(s) : outsideHours(s))), e.name).toBe(true)
  })

  it('no office act is dated to a weekend or a day the firm is closed', () => {
    expect(new Set(OFFICE_DATES.map((d) => d.kind))).toEqual(new Set(['client', 'household', 'account', 'held-away', 'plan']))
    const closed = OFFICE_DATES.filter((d) => officeClosed(d.date)).map((d) => `${d.kind} ${d.id} ${d.field} ${d.date}`)
    expect(closed).toEqual([])
  })
})
