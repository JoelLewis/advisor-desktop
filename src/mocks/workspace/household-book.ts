import type { Message } from '@/types/workspace'
import { QUEUE_TIERS, type HouseholdBook, type HouseholdMarkers, type HouseholdRow, type QueueReason } from '@/types/workspace-book'
import { accounts } from '@/mocks/data/accounts'
import { calendarEvents } from '@/mocks/data/calendar'
import type { MeetingType } from '@/types/calendar'
import { documents } from '@/mocks/data/documents'
import { householdFixtures } from '@/mocks/data/households'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { actOnApproval, activeApproval, escalationOf, latestVersion, releasedApproval } from '@/mocks/data/proposals-store'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import type { ComplianceAlert } from '@/types/compliance'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { easternDayOf } from '@/lib/eastern-day'
import { isModelManaged } from '@/lib/mandate'
import { alertContext, isOpenAlert } from './alerts'
import { BRIEF_THREAD_ID, composeBrief } from './brief'
import { settleApproved, type BriefSummary } from './brief-groups'
import { briefIsCurrent, remeasurePrefix } from './brief-remeasure'
import { meetingOf, toUtc } from './meetings'
import { suitablyApprovedAccounts } from './suitability'
import { householdLedger, managedValueUsd } from './household-ledger'
import { isFirmViewer } from './visibility'

type TextMessage = Extract<Message, { kind: 'text' }>
/** Instants compare as instants: the fixtures mix "…:00Z" and "….000Z", which sort apart as text. */
const byInstant = (a: string, b: string) => Date.parse(a) - Date.parse(b)
const byAt = (a: { at: string }, b: { at: string }) => byInstant(a.at, b.at)
const oldest = (instants: readonly string[]): string => {
  const first = [...instants].sort(byInstant)[0]
  if (first === undefined) throw new Error('No instant to take the oldest of')
  return first
}

function householdOf(householdId: string) {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  return household
}

const isBriefSummary = (m: Message): m is BriefSummary => m.kind === 'brief_summary' && m.threadId === BRIEF_THREAD_ID

/**
 * The Brief's summary as it reads now, suitability settled by recorded approvals. A read never writes: if fills have
 * moved the book, or the session has moved to another day, since the Brief was measured, the summary is composed in
 * memory as of now and left unstored (opening the Brief thread is what re-measures and stores it).
 */
export function briefSummaryNow(): BriefSummary {
  const prefix = remeasurePrefix('q')
  const messages = briefIsCurrent() ? store().messages : composeBrief((i) => `${prefix}-${i}`, sessionNow())
  const summary = messages.filter(isBriefSummary).sort(byAt).pop()
  if (!summary) throw new Error('The Brief has no summary')
  return settleApproved(summary, suitablyApprovedAccounts())
}

/** Proposals on the given accounts that nobody has approved or released. */
export const unapprovedProposals = (accountIds: ReadonlySet<string>) =>
  store().proposals.filter((p) => accountIds.has(p.accountId) && !activeApproval(p.id) && !releasedApproval(p.id))

/** Unapproved proposals on the household's accounts, and suitability reasons the Brief still waits for. */
function decision(accountIds: ReadonlySet<string>, summary: BriefSummary): QueueReason[] {
  const proposals = unapprovedProposals(accountIds)
  const reasonsDue = summary.decide.filter((i) => i.awaitsApprovalOf !== undefined && accountIds.has(i.awaitsApprovalOf))
  const since = [...proposals.map((p) => latestVersion(p).createdAt), ...reasonsDue.map(() => summary.at)]
  return since.length === 0 ? [] : [{ kind: 'decision', count: proposals.length + reasonsDue.length, since: oldest(since) }]
}

/** Since when a client has waited: their first message after the firm's last reply in their own conversation. */
export function clientsWaiting(householdId: string): Extract<QueueReason, { kind: 'client_waiting' }>[] {
  return householdOf(householdId).members.flatMap((member) => store().threads
    .filter((t) => t.visibility === 'client' && t.partyId === member.clientId)
    .flatMap((t) => {
      const texts = store().messages.filter((m): m is TextMessage => m.kind === 'text' && m.threadId === t.id).sort(byAt)
      const lastReply = texts.map((m) => isFirmViewer(m.authorId)).lastIndexOf(true)
      const first = texts.slice(lastReply + 1).find((m) => m.authorId === member.clientId)
      return first ? [{ kind: 'client_waiting' as const, clientName: member.name, since: first.at, threadId: t.id }] : []
    }))
    .sort((a, b) => byInstant(a.since, b.since))
}

const MEETING_LABEL: Readonly<Record<MeetingType, string>> = {
  annual_review: 'review', quarterly_review: 'quarterly review', planning: 'planning meeting',
  ad_hoc: 'meeting', internal: 'internal meeting', prospect: 'prospect meeting',
}

type MeetingReason = Extract<QueueReason, { kind: 'meeting' }>

/** Meetings with the household on the session day still to hold: a workspace meeting not yet held, or a calendar entry not yet over. */
function meetingsToday(householdId: string, day: string, now: string): MeetingReason[] {
  return calendarEvents.filter((e) => e.householdId === householdId && easternDayOf(toUtc(e.startTime)) === day).flatMap((e): MeetingReason[] => {
    const meeting = meetingOf(e.id)
    const pending = meeting ? meeting.state === 'scheduled' : Date.parse(toUtc(e.endTime)) > Date.parse(now)
    return pending ? [{ kind: 'meeting', label: MEETING_LABEL[e.meetingType], start: toUtc(e.startTime), eventId: e.id }] : []
  }).sort((a, b) => byInstant(a.start, b.start))
}

/** Open compliance alerts about the household's accounts or clients. */
export function openAlertsAbout(accountIds: ReadonlySet<string>, clientIds: ReadonlySet<string>): ComplianceAlert[] {
  return complianceAlerts.filter(isOpenAlert).filter((a) => {
    const c = alertContext(a)
    return (c.accountId !== undefined && accountIds.has(c.accountId)) || (c.clientId !== undefined && clientIds.has(c.clientId))
  })
}

/** Open alerts about the household's accounts or clients, and its orders compliance returned or escalated. */
function complianceSince(accountIds: ReadonlySet<string>, clientIds: ReadonlySet<string>): string[] {
  const alerts = openAlertsAbout(accountIds, clientIds).map((a) => a.createdAt)
  const s = store()
  const held = s.proposals.filter((p) => accountIds.has(p.accountId)).flatMap((p) => {
    const approvals = s.approvals.filter((a) => a.proposalId === p.id)
    const returned = approvals.filter((a) => a.status === 'returned' && !activeApproval(p.id)).map((a) => {
      const act = actOnApproval('return_to_advisor', a.actId)
      if (!act) throw new Error(`Approval ${a.actId} is returned but no return_to_advisor act names it`)
      return act.at
    })
    const active = activeApproval(p.id)
    const escalated = active ? escalationOf(active.actId)?.at : undefined
    return [...returned, ...(escalated ? [escalated] : [])]
  })
  return [...alerts, ...held]
}

/** The household's open follow-up tasks from filed meetings. */
const openTasks = (householdId: string) => store().meetings.filter((m) => m.householdId === householdId).flatMap((m) => m.tasks).filter((t) => t.state === 'open')

function tasksDue(householdId: string, day: string): QueueReason[] {
  const due = openTasks(householdId).filter((t) => t.due <= day)
  if (due.length === 0) return []
  const first = [...due].sort((a, b) => a.due.localeCompare(b.due))[0]
  if (!first) throw new Error('Tasks due with no first')
  return [{ kind: 'task', count: due.length, due: first.due, overdue: due.some((t) => t.due < day) }]
}

function markersOf(householdId: string, complianceCount: number): HouseholdMarkers {
  const own = accounts.filter((a) => a.householdId === householdId)
  const members = new Set(householdOf(householdId).members.map((m) => m.clientId))
  const items = OPEN_ITEMS.filter((i) => i.householdId === householdId).length
    + documents.filter((d) => members.has(d.clientId) && d.signatureStatus === 'pending').length
  return {
    outOfBand: own.filter(isModelManaged).some((a) => computeDriftForAccount(a).needsRebalance),
    compliance: complianceCount,
    tasks: openTasks(householdId).length + items,
  }
}

const tierOf = (r: QueueReason) => QUEUE_TIERS.indexOf(r.kind)
/** The instant a reason is ordered by within its tier: how long it has waited, or when it falls. */
const ageOf = (r: QueueReason): string => (r.kind === 'meeting' ? r.start : r.kind === 'task' ? r.due : r.since)

function householdRow(householdId: string, summary: BriefSummary): HouseholdRow {
  const household = householdOf(householdId)
  const own = accounts.filter((a) => a.householdId === householdId)
  const accountIds = new Set(own.map((a) => a.id))
  const clientIds = new Set(household.members.map((m) => m.clientId))
  const now = sessionNow()
  const day = easternDayOf(now)
  const compliance = complianceSince(accountIds, clientIds)
  const reasons: QueueReason[] = [
    ...decision(accountIds, summary),
    ...clientsWaiting(householdId),
    ...meetingsToday(householdId, day, now),
    ...(compliance.length > 0 ? [{ kind: 'compliance' as const, count: compliance.length, since: oldest(compliance) }] : []),
    ...tasksDue(householdId, day),
  ]
  return {
    householdId, name: household.name, managedValue: managedValueUsd(householdLedger(householdId)),
    reasons, markers: markersOf(householdId, compliance.length),
  }
}

/** The advisor's book as a firm viewer reads it. A client, a prospect or anyone unknown gets nothing. */
export function householdBook(viewerId: string): HouseholdBook | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const summary = briefSummaryNow()
  const households = householdFixtures.map((h) => householdRow(h.id, summary)).sort((a, b) => a.name.localeCompare(b.name))
  const queue = households.filter((h) => h.reasons.length > 0).sort((a, b) => {
    const [ra, rb] = [a.reasons[0], b.reasons[0]]
    if (!ra || !rb) throw new Error('A queued household has no reason')
    return tierOf(ra) - tierOf(rb) || byInstant(ageOf(ra), ageOf(rb)) || a.name.localeCompare(b.name)
  })
  return { asOf: sessionNow(), queue, households }
}
