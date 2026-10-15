import { describe, it, expect } from 'vitest'
import { MOCK_NOW_ISO, eventTime } from '@/lib/clock'
import { fmtEasternDay, fmtEasternTime } from '@/kit/measure'
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

/** The few stamps that are honestly outside a person's working day, each with why. */
const OFF_HOURS: readonly { name: string; reason: string; covers: (s: Stamp) => boolean }[] = [
  { name: 'nightly feeds', reason: 'Custodian and planning files sync overnight or on their own market’s clock.', covers: (s) => s.kind === 'integration' },
  { name: 'breaks a nightly file raises', reason: 'A break is detected when the overnight custodian file is matched, before anyone is in.', covers: (s) => s.kind === 'break' && s.field === 'detectedAt' },
  { name: 'pre-market note', reason: 'An automated futures note, published before the advisor is in because futures trade overnight.', covers: (s) => s.kind === 'activity' && s.id === 'act-002' },
  { name: 'digital assets', reason: 'Spot crypto trades every day, so a coin bought on a Saturday is a real fill.', covers: (s) => s.kind === 'order' && orders.some((o) => o.id === s.id && o.assetClass === 'digital_asset') },
]

const label = (s: Stamp) => `${s.kind} ${s.id} ${s.field} ${s.at} (${fmtEasternDay(s.at)} ${fmtEasternTime(s.at)} ET)`
const excused = (s: Stamp) => OFF_HOURS.some((e) => e.covers(s))
const WORKING_DAY = { from: '07:00', to: '20:00' } as const
const onWeekend = (s: Stamp) => /^(Sat|Sun) /.test(fmtEasternDay(s.at))
const outsideHours = (s: Stamp) => {
  const time = fmtEasternTime(s.at)
  return time < WORKING_DAY.from || time > WORKING_DAY.to
}

describe('seeded times read as a working day in New York', () => {
  it('collects every kind of seeded time a person reads', () => {
    const kinds = new Set(STAMPS.map((s) => s.kind))
    for (const kind of ['message', 'alert', 'supervision record', 'break', 'client comm', 'activity', 'document', 'order', 'prospect', 'prospect note', 'prospect stage', 'open item', 'event']) {
      expect(kinds, kind).toContain(kind)
    }
  })

  it('every one falls on a weekday', () => {
    const weekend = STAMPS.filter((s) => !excused(s) && onWeekend(s)).map(label)
    expect(weekend).toEqual([])
  })

  it('every one falls between 07:00 and 20:00 ET', () => {
    const offHours = STAMPS.filter((s) => !excused(s) && outsideHours(s)).map(label)
    expect(offHours).toEqual([])
  })

  it('nothing that already happened is dated after the frozen now; only scheduled times lie ahead', () => {
    const early = STAMPS.filter((s) => s.latest !== undefined && Date.parse(s.at) > Date.parse(s.latest)).map(label)
    expect(early).toEqual([])
  })

  it('each exception still excuses a time outside the working day', () => {
    for (const e of OFF_HOURS) expect(STAMPS.some((s) => e.covers(s) && (onWeekend(s) || outsideHours(s))), e.name).toBe(true)
  })
})
