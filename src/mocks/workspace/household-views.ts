import type { Account } from '@/types/account'
import type { HouseholdFixture } from '@/types/household'
import type {
  ClientView, CommunicationRow, HouseholdAccount, HouseholdSummary, HouseholdView, IpsOnFile, MeetingRef, OutOfBand, StructuralResidual,
} from '@/types/workspace-household'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { plans } from '@/mocks/data/planning'
import { documents } from '@/mocks/data/documents'
import { clientComms } from '@/mocks/data/client-comms'
import { activities } from '@/mocks/data/activities'
import { clients } from '@/mocks/data/clients'
import { calendarEvents } from '@/mocks/data/calendar'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { personById } from '@/mocks/data/people'
import { sessionNow } from '@/mocks/data/workspace-store'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { projectDrift } from '@/mocks/handlers/oms'
import { ACCOUNT_TYPE_LABELS, capitalize } from '@/lib/labels'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { meetingOf, meetingTitle } from './meetings'

const STRUCTURAL: ReadonlySet<string> = new Set<StructuralResidual>(['not_market_tradable', 'replacement_hold'])
const isStructural = (reason: string | undefined): reason is StructuralResidual => reason !== undefined && STRUCTURAL.has(reason)
const latestFirst = <T>(at: (x: T) => string) => (a: T, b: T) => Date.parse(at(b)) - Date.parse(at(a))
const isFirmViewer = (viewerId: string) => {
  const viewer = personById(viewerId)
  return viewer !== undefined && viewer.role !== 'client'
}

function clientName(clientId: string): string {
  const client = clients.find((c) => c.id === clientId)
  if (!client) throw new Error(`No client "${clientId}"`)
  return client.fullName
}

/** An account against its model: drift from the drift engine, and for an out-of-band class, the structural reason it cannot be sold back in. */
function accountRow(account: Account): HouseholdAccount {
  const drift = computeDriftForAccount(account)
  const residuals = new Map(projectDrift(account.id, [], true, drift.driftTolerance).assetClassDrifts.map((d) => [d.assetClass, d.residualReason]))
  const outside: OutOfBand[] = drift.assetClassDrifts.filter((d) => Math.abs(d.drift) > drift.driftTolerance).map((d) => {
    const reason = residuals.get(d.assetClass)
    return { assetClass: d.assetClass, drift: d.drift, ...(isStructural(reason) ? { residual: reason } : {}) }
  })
  return {
    accountId: account.id, name: account.name, ownerId: account.clientId, ownerName: clientName(account.clientId), typeLabel: ACCOUNT_TYPE_LABELS[account.type],
    value: getPositionsForAccount(account.id, account.totalValue).reduce((s, p) => s + p.marketValue, 0),
    modelName: modelDisplayName(drift.modelId), driftTolerance: drift.driftTolerance, maxAbsDrift: drift.maxAbsDrift, withinBand: !drift.needsRebalance, outside,
  }
}

function ipsOf(memberIds: ReadonlySet<string>): IpsOnFile | undefined {
  const ips = documents.filter((d) => d.type === 'ips' && memberIds.has(d.clientId)).sort(latestFirst((d) => d.updatedAt))[0]
  return ips && { documentId: ips.id, name: ips.name, signatureStatus: ips.signatureStatus, ...(ips.signatureStatus === 'signed' ? { signedOn: ips.updatedAt.slice(0, 10) } : {}) }
}

function communicationsOf(memberIds: ReadonlySet<string>): CommunicationRow[] {
  return clientComms.filter((c) => memberIds.has(c.clientId)).sort(latestFirst((c) => c.timestamp))
    .map((c) => ({ id: c.id, clientName: c.clientName, channel: c.channel, direction: c.direction, subject: c.subject, summary: c.summary, at: c.timestamp }))
}

function summaryOf(household: HouseholdFixture): HouseholdSummary {
  const memberIds = new Set(household.members.map((m) => m.clientId))
  const own = accounts.filter((a) => a.householdId === household.id).map(accountRow)
  const heldAway = heldAwayAssets.filter((h) => h.householdId === household.id).map((h) => ({
    id: h.id, ownerName: clientName(h.clientId), institution: h.institutionName, accountType: h.accountType, value: h.estimatedValue, reportedOn: h.lastUpdated,
  }))
  const plan = plans.find((p) => p.householdId === household.id)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id
  const pending = documents.filter((d) => memberIds.has(d.clientId) && d.signatureStatus === 'pending')
  const ips = ipsOf(memberIds)
  return {
    id: household.id, name: household.name, shortName: household.name.replace(/ Household$/, ''),
    members: household.members.map((m) => ({ clientId: m.clientId, name: m.name, relationship: m.relationship, dateOfBirth: m.dateOfBirth })),
    accounts: own, managedValue: own.reduce((s, a) => s + a.value, 0),
    heldAway, heldAwayValue: heldAway.reduce((s, h) => s + h.value, 0),
    goals: (plan?.goals ?? []).map((g) => ({ id: g.id, name: g.name, probability: g.probability, funded: g.currentFunding / g.targetAmount, status: g.status })),
    ...(plan ? { planProbability: plan.aggregateProbability } : {}),
    windows: openWashSaleWindows(MOCK_TODAY_ISO, household.id).map((w) => ({
      saleId: w.id, accountName: accountName(w.accountId), symbol: w.symbol, name: w.name, saleDate: w.saleDate, through: w.end, loss: w.realisedGainLoss,
    })),
    ...(ips ? { ips } : {}),
    openItems: [
      ...OPEN_ITEMS.filter((i) => i.householdId === household.id).map((i) => ({ id: i.id, text: i.text, source: i.source })),
      ...pending.map((d) => ({ id: d.id, text: `Awaiting signature: ${d.name}`, source: d.id })),
    ],
    asOf: sessionNow(),
  }
}

function meetingsOf(householdId: string): HouseholdView['meetings'] {
  const now = Date.parse(sessionNow())
  const refs = calendarEvents.filter((e) => e.householdId === householdId).map((e): { ref: MeetingRef; past: boolean } => {
    const meeting = meetingOf(e.id)
    const start = new Date(e.startTime).toISOString()
    const end = new Date(e.endTime).toISOString()
    return meeting
      ? { ref: { eventId: e.id, title: meetingTitle(meeting), start, end, state: meeting.state, threadId: meeting.threadId }, past: meeting.state !== 'scheduled' }
      : { ref: { eventId: e.id, title: e.title, start, end, state: 'calendar' }, past: Date.parse(end) <= now }
  }).sort((a, b) => Date.parse(a.ref.start) - Date.parse(b.ref.start))
  return { past: refs.filter((r) => r.past).map((r) => r.ref), upcoming: refs.filter((r) => !r.past).map((r) => r.ref) }
}

/** The household as a firm viewer reads it. A client, or anyone unknown, gets nothing. */
export function householdView(viewerId: string, householdId: string): HouseholdView | undefined {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household || !isFirmViewer(viewerId)) return undefined
  const memberIds = new Set(household.members.map((m) => m.clientId))
  return {
    ...summaryOf(household),
    documents: documents.filter((d) => memberIds.has(d.clientId)).sort(latestFirst((d) => d.updatedAt)).map((d) => ({
      id: d.id, name: d.name, type: d.type, clientName: clientName(d.clientId), signatureStatus: d.signatureStatus, updatedOn: d.updatedAt.slice(0, 10),
    })),
    communications: communicationsOf(memberIds),
    activity: activities.filter((a) => a.entityId === household.id || (a.entityId !== undefined && memberIds.has(a.entityId)))
      .sort(latestFirst((a) => a.timestamp)).map((a) => ({ id: a.id, title: a.title, description: a.description, at: a.timestamp })),
    meetings: meetingsOf(household.id),
  }
}

/** One client as a firm viewer reads them: profile, risk assessment, the accounts they own, the household's IPS, their communications. */
export function clientView(viewerId: string, clientId: string): ClientView | undefined {
  const client = clients.find((c) => c.id === clientId)
  const household = client && householdFixtures.find((h) => h.id === client.householdId)
  if (!client || !household || !isFirmViewer(viewerId)) return undefined
  const ips = ipsOf(new Set(household.members.map((m) => m.clientId)))
  const owned = accounts.filter((a) => a.clientId === client.id).map(accountRow)
  return {
    id: client.id, name: client.fullName, householdId: household.id, householdName: household.name, dateOfBirth: client.dateOfBirth, occupation: client.occupation,
    ...(client.contactInfo.preferredContactMethod ? { preferredContact: client.contactInfo.preferredContactMethod } : {}),
    risk: { tolerance: capitalize(client.riskProfile.tolerance), scoreFraction: client.riskProfile.score / 100, assessedOn: client.riskProfile.lastAssessed },
    accounts: owned,
    accountsValue: owned.reduce((s, a) => s + a.value, 0),
    ...(ips ? { ips } : {}),
    communications: communicationsOf(new Set([client.id])),
  }
}
