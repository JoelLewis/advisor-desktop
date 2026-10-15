import type { Message, TodayLine } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { calendarEvents } from '@/mocks/data/calendar'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { reconciliationView } from '@/mocks/reference/reconciliation'
import { BRIEF_THREAD_ID } from './brief'
import { meetingEvent, meetingTitle, toUtc } from './meetings'

export const BRIEF_TODAY_ID = 'msg-btoday'

type Timed = Exclude<TodayLine, { kind: 'reconciliation' }>
const timeOf = (line: Timed) => (line.kind === 'release' ? line.at : line.start)

function releaseLines(): Timed[] {
  const s = store()
  return s.approvals.filter((a) => a.status === 'active').flatMap((approval) => {
    if (!s.staged.some((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')) return []
    const proposal = s.proposals.find((p) => p.id === approval.proposalId)
    if (!proposal) throw new Error(`Approval ${approval.actId} names a missing proposal ${approval.proposalId}`)
    const account = accounts.find((a) => a.id === proposal.accountId)
    if (!account) throw new Error(`Proposal ${proposal.id} names a missing account ${proposal.accountId}`)
    return [{ kind: 'release', at: approval.at, accountName: account.name, version: approval.version, threadId: proposal.threadId }]
  })
}

function meetingLines(): Timed[] {
  return store().meetings.map((m) => {
    const event = meetingEvent(m.eventId)
    if (!event) throw new Error(`Meeting ${m.eventId} names no calendar event`)
    return { kind: 'meeting', start: event.start, end: event.end, title: meetingTitle(m), state: m.state, threadId: m.threadId }
  })
}

function coffeeLines(): Timed[] {
  return store().prospects.filter((p) => p.coffee === undefined).map((p) => {
    const event = calendarEvents.find((e) => e.id === p.eventId)
    if (!event) throw new Error(`Prospect ${p.id} names a missing event ${p.eventId}`)
    const formCrs = p.disclosures.some((d) => d.document === 'form_crs') ? 'delivered' : 'due'
    return { kind: 'coffee', start: toUtc(event.startTime), prospectName: p.name, formCrs, threadId: p.threadId }
  })
}

/**
 * The Brief's Today, as the session stands: the timed lines in time order (orders awaiting release, the
 * day's meetings, a prospect's coffee until it is recorded), then reconciliation while a break is open.
 * Composed on every read, never stored, so it always says what is true now.
 */
export function briefToday(viewerId: string): Extract<Message, { kind: 'brief_today' }> {
  const recon = reconciliationView(viewerId)
  if (!recon) throw new Error(`The Brief's owner ${viewerId} cannot read reconciliation`)
  const timed = [...releaseLines(), ...meetingLines(), ...coffeeLines()].sort((a, b) => timeOf(a).localeCompare(timeOf(b)))
  const open = recon.summary.openBreaks
  return {
    kind: 'brief_today', id: BRIEF_TODAY_ID, threadId: BRIEF_THREAD_ID, at: sessionNow(),
    lines: [...timed, ...(open > 0 ? [{ kind: 'reconciliation' as const, openBreaks: open }] : [])],
  }
}
