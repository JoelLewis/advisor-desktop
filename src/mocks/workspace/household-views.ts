import { accountDisplayName } from '@/lib/account-display'
import type { Account } from '@/types/account'
import type { HouseholdFixture } from '@/types/household'
import type { AssetClass } from '@/types/portfolio'
import type { MethodNote } from '@/types/reference'
import type { Subject, Visibility } from '@/types/workspace'
import type { TaskOwner } from '@/types/workspace-meeting'
import type {
  AssetClassRow, ClassHolder, ClientView, CommunicationRow, HoldingOrder, HouseholdAccount, HouseholdConversation, HouseholdDecision, HouseholdHoldings,
  HouseholdSummary, HouseholdTask, HouseholdView, IpsOnFile, LastContact, MeetingRef, MemberStanding, OutOfBand, StructuralResidual,
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
import { openWashSaleWindows } from '@/mocks/data/realized-sales'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { projectDrift } from '@/mocks/handlers/oms'
import { ACCOUNT_TYPE_LABELS, ASSET_CLASS_LABELS } from '@/lib/labels'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { bandFor } from '@/lib/risk-profile'
import { PRESENTER_ID } from '@/lib/presenter'
import { UnknownModelError, isModelManaged } from '@/lib/mandate'
import { personWithRole } from '@/lib/role-label'
import { convertToBase } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { AGENTS, PEOPLE, can, personById } from '@/mocks/data/people'
import { MODEL_BANDS, MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { latestVersion } from '@/mocks/data/proposals-store'
import { currencyForAccount } from '@/mocks/handlers/oms'
import { BRIEF_THREAD_ID } from './brief'
import { briefSummaryNow, clientsWaiting, openAlertsAbout, unapprovedProposals } from './household-book'
import { accountValueUsd, managedValueUsd, householdLedger, type AccountLedger, type HouseholdLedger } from './household-ledger'
import { wholeStandingOf } from './meeting-agents'
import { audienceOf } from './party'
import { meetingOf, meetingTitle } from './meetings'
import { isFirmViewer, visibleThreads } from './visibility'

const STRUCTURAL: ReadonlySet<string> = new Set<StructuralResidual>(['not_market_tradable', 'replacement_hold'])
const isStructural = (reason: string | undefined): reason is StructuralResidual => reason !== undefined && STRUCTURAL.has(reason)
const latestFirst = <T>(at: (x: T) => string) => (a: T, b: T) => Date.parse(at(b)) - Date.parse(at(a))

function clientName(clientId: string): string {
  const client = clients.find((c) => c.id === clientId)
  if (!client) throw new Error(`No client "${clientId}"`)
  return client.fullName
}

/** An account against its model: drift from the drift engine, and for an out-of-band class, the structural reason it cannot be sold back in. */
function accountRow(account: Account): HouseholdAccount {
  const value = getPositionsForAccount(account.id, account.totalValue).reduce((s, p) => s + p.marketValue, 0)
  const currency = currencyForAccount(account.id)
  const base = {
    accountId: account.id, name: accountDisplayName(account), ownerId: account.clientId, ownerName: clientName(account.clientId), typeLabel: ACCOUNT_TYPE_LABELS[account.type],
    value, currency, valueUsd: convertToBase(value, currency, FX_RATES_USD_BASE),
  }
  if (account.mandate === 'custom') return { ...base, mandate: 'custom', mandateSummary: account.mandateSummary }
  const drift = computeDriftForAccount(account)
  const residuals = new Map(projectDrift(account.id, [], true, drift.driftTolerance).assetClassDrifts.map((d) => [d.assetClass, d.residualReason]))
  const outside: OutOfBand[] = drift.assetClassDrifts.filter((d) => Math.abs(d.drift) > drift.driftTolerance).map((d) => {
    const reason = residuals.get(d.assetClass)
    return { assetClass: d.assetClass, drift: d.drift, ...(isStructural(reason) ? { residual: reason } : {}) }
  })
  return {
    ...base, mandate: 'model',
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

function summaryOf(household: HouseholdFixture, ledger: HouseholdLedger): HouseholdSummary {
  const memberIds = new Set(household.members.map((m) => m.clientId))
  const own = accounts.filter((a) => a.householdId === household.id).map(accountRow)
  const heldAway = heldAwayAssets.filter((h) => h.householdId === household.id).map((h) => ({
    id: h.id, ownerName: clientName(h.clientId), institution: h.institutionName, accountType: h.accountType, value: h.estimatedValue, reportedOn: h.lastUpdated,
  }))
  const plan = plans.find((p) => p.householdId === household.id)
  const accountNameOf = (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) throw new Error(`A wash-sale window names no account ${id}`)
    return accountDisplayName(account)
  }
  const pending = documents.filter((d) => memberIds.has(d.clientId) && d.signatureStatus === 'pending')
  const ips = ipsOf(memberIds)
  return {
    id: household.id, name: household.name, shortName: household.name.replace(/ Household$/, ''),
    members: household.members.map((m) => ({ clientId: m.clientId, name: m.name, relationship: m.relationship, dateOfBirth: m.dateOfBirth })),
    accounts: own, managedValue: managedValueUsd(ledger),
    heldAway, heldAwayValue: heldAway.reduce((s, h) => s + h.value, 0),
    goals: (plan?.goals ?? []).map((g) => ({ id: g.id, name: g.name, probability: g.probability, funded: g.currentFunding / g.targetAmount, status: g.status })),
    ...(plan ? { planProbability: plan.aggregateProbability } : {}),
    windows: openWashSaleWindows(MOCK_TODAY_ISO, household.id).map((w) => ({
      saleId: w.id, accountName: accountNameOf(w.accountId), symbol: w.symbol, name: w.name, saleDate: w.saleDate, through: w.end, loss: w.realizedGainLoss,
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

const ADVISOR_OF_RECORD = PRESENTER_ID
const COMPLIANCE_OWNER = (() => {
  const cco = PEOPLE.find((p) => can(p.id, 'dispose_alert'))
  if (!cco) throw new Error('No one in the directory disposes of compliance alerts')
  return personWithRole(cco)
})()

const usd = (account: Account, value: number) => convertToBase(value, currencyForAccount(account.id), FX_RATES_USD_BASE)

function modelOf(modelId: string) {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  const band = MODEL_BANDS[modelId]?.driftTolerance
  if (!model || band === undefined) throw new UnknownModelError(modelId)
  return { targets: model.assetClasses.map((t) => ({ assetClass: assetClassNamed(t.assetClass), targetWeight: t.targetWeight })), band }
}

function assetClassNamed(name: string): AssetClass {
  const known = (Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).find((c) => c === name)
  if (!known) throw new Error(`A model targets "${name}", which is no asset class`)
  return known
}

function standingOf(household: HouseholdFixture): MemberStanding[] {
  return household.members.map((m) => {
    const client = clients.find((c) => c.id === m.clientId)
    if (!client) throw new Error(`No client ${m.clientId}`)
    const band = bandFor(client.riskProfile.score)
    const tolerance = { band: band.label, floor: band.floor, ceiling: band.ceiling, score: client.riskProfile.score, assessedOn: client.riskProfile.lastAssessed }
    const whole = wholeStandingOf(m.clientId)
    if (!whole) return { clientId: m.clientId, name: m.name, tolerance }
    return { clientId: m.clientId, name: m.name, tolerance, whole: { score: whole.score, status: whole.status, value: whole.value } }
  })
}

function holdingOrders(l: AccountLedger, assetClass?: AssetClass): HoldingOrder[] {
  const inClass = ({ assetClass: c }: { assetClass: AssetClass }) => assetClass === undefined || c === assetClass
  return [
    ...l.openOrders.filter(inClass).map((o): HoldingOrder => (o.status === 'working'
      ? { kind: 'working', id: o.id, side: o.side, symbol: o.symbol, quantity: o.quantity, quantityUnit: o.quantityUnit, ...(o.limitPrice !== undefined ? { limitPrice: o.limitPrice } : {}) }
      : { kind: 'pending_compliance', id: o.id, side: o.side, symbol: o.symbol, quantity: o.quantity })),
    ...l.fillsOnDay.filter(inClass).map((f): HoldingOrder => ({ kind: 'filled', id: f.id, side: f.side, symbol: f.symbol, quantity: f.quantity, at: f.at })),
  ]
}

/**
 * Holdings by asset class against the household target: the value-weighted model targets of its model-managed
 * accounts, in USD, with the same weighting of their bands. A custom mandate follows no model: it is listed outside the target.
 */
function holdingsOf(ledger: HouseholdLedger): HouseholdHoldings {
  const model = ledger.accounts.flatMap((l) => (isModelManaged(l.account) ? [{ l, account: l.account, ...modelOf(l.account.modelId) }] : []))
  const modelValue = model.reduce((s, m) => s + accountValueUsd(m.l), 0)
  const classes = new Set<AssetClass>([
    ...model.flatMap((m) => m.targets.map((t) => t.assetClass)), ...model.flatMap((m) => m.l.positions.map((p) => p.assetClass)),
    ...ledger.heldAway.flatMap((h) => h.assetClasses.map((c) => c.assetClass)),
    ...ledger.openOrders.map((o) => o.assetClass), ...ledger.fillsOnDay.map((f) => f.assetClass),
  ])
  const ofModel = (x: number) => (modelValue === 0 ? 0 : x / modelValue)
  const rows = [...classes].map((assetClass): AssetClassRow => {
    const managed = model.flatMap(({ l, account }): ClassHolder[] => {
      const value = usd(account, l.positions.filter((p) => p.assetClass === assetClass).reduce((s, p) => s + p.marketValue, 0))
      const orders = holdingOrders(l, assetClass)
      return value > 0 || orders.length > 0
        ? [{ kind: 'managed', accountId: account.id, name: accountDisplayName(account), ownerName: clientName(account.clientId), typeLabel: ACCOUNT_TYPE_LABELS[account.type], value, weightInAccount: value / accountValueUsd(l), orders }]
        : []
    })
    const away = ledger.heldAway.flatMap((h): ClassHolder[] => {
      const share = h.assetClasses.find((c) => c.assetClass === assetClass)?.percentage
      return share === undefined ? [] : [{ kind: 'held_away', heldAwayId: h.id, name: `${h.institutionName} ${h.accountType}`, ownerName: clientName(h.clientId), value: h.estimatedValue * share, reportedOn: h.lastUpdated }]
    })
    const value = managed.reduce((s, h) => s + h.value, 0)
    // A class a model does not name has a target of nothing in that model.
    const target = ofModel(model.reduce((s, m) => s + (m.targets.find((t) => t.assetClass === assetClass)?.targetWeight ?? 0) * accountValueUsd(m.l), 0))
    const band = ofModel(model.reduce((s, m) => s + m.band * accountValueUsd(m.l), 0))
    const weight = ofModel(value)
    const orders = managed.flatMap((h) => (h.kind === 'managed' ? h.orders : []))
    return {
      assetClass, value, weight, target, drift: weight - target, band, withinBand: Math.abs(weight - target) <= band,
      holders: [...managed, ...away], openOrders: orders.filter((o) => o.kind !== 'filled').length, fillsToday: orders.filter((o) => o.kind === 'filled').length,
    }
  }).sort((a, b) => b.target - a.target || b.value - a.value)
  return {
    managedValue: managedValueUsd(ledger), modelValue, rows,
    notInTarget: ledger.accounts.flatMap((l) => (l.account.mandate === 'custom'
      ? [{ accountId: l.account.id, name: accountDisplayName(l.account), value: accountValueUsd(l), mandateSummary: l.account.mandateSummary, orders: holdingOrders(l) }] : [])),
  }
}

function decisionsOf(accountIds: ReadonlySet<string>): HouseholdDecision[] {
  const s = store()
  const proposals = unapprovedProposals(accountIds)
    .map((p): HouseholdDecision => ({ kind: 'proposal', proposalId: p.id, title: p.title, latestVersion: latestVersion(p).n, threadId: p.threadId }))
  const subject = s.threads.find((t) => t.id === BRIEF_THREAD_ID)?.subject
  const brief = subject?.type === 'account' && accountIds.has(subject.id)
    ? briefSummaryNow().decide.map((item): HouseholdDecision => ({ kind: 'brief', item, threadId: BRIEF_THREAD_ID }))
    : []
  return [...proposals, ...brief]
}

function ownerName(owner: TaskOwner): string {
  if (owner.kind === 'agent') {
    const agent = AGENTS.find((a) => a.id === owner.agentId)
    if (!agent) throw new Error(`No agent ${owner.agentId}`)
    return agent.name
  }
  const person = personById(owner.personId)
  if (!person) throw new Error(`No person ${owner.personId}`)
  return personWithRole(person)
}

function tasksOf(household: HouseholdFixture, accountIds: ReadonlySet<string>, memberIds: ReadonlySet<string>, day: string): HouseholdTask[] {
  const advisor = personById(ADVISOR_OF_RECORD)
  if (!advisor) throw new Error('The advisor of record is not in the directory')
  return [
    ...store().meetings.filter((m) => m.householdId === household.id).flatMap((m) => m.tasks).filter((t) => t.state === 'open')
      .map((t): HouseholdTask => ({ id: t.id, title: t.title, owner: ownerName(t.owner), due: t.due, overdue: t.due < day, source: 'meeting' })),
    ...openAlertsAbout(accountIds, memberIds).map((a): HouseholdTask => ({ id: a.id, title: a.title, owner: COMPLIANCE_OWNER, overdue: false, source: 'compliance' })),
    ...OPEN_ITEMS.filter((i) => i.householdId === household.id).map((i): HouseholdTask => ({ id: i.id, title: i.text, owner: personWithRole(advisor), overdue: false, source: 'open_item' })),
    ...documents.filter((d) => memberIds.has(d.clientId) && d.signatureStatus === 'pending')
      .map((d): HouseholdTask => ({ id: d.id, title: `Awaiting signature: ${d.name}`, owner: clientName(d.clientId), overdue: false, source: 'signature' })),
  ]
}

function lastContactOf(memberIds: ReadonlySet<string>): LastContact | undefined {
  const s = store()
  const inThreads = s.threads.filter((t) => t.visibility === 'client').flatMap((t) => {
    const party = t.partyId
    if (party === undefined || !memberIds.has(party)) return []
    return s.messages.flatMap((m): LastContact[] => (m.kind === 'text' && m.threadId === t.id
      ? [{ clientName: clientName(party), at: m.at, direction: m.authorId === party ? 'from_client' : 'to_client', where: { kind: 'conversation', threadId: t.id, title: t.title } }]
      : []))
  })
  const crm = clientComms.filter((c) => memberIds.has(c.clientId)).map((c): LastContact => ({
    clientName: c.clientName, at: c.timestamp, direction: c.direction === 'inbound' ? 'from_client' : 'to_client', where: { kind: 'crm', channel: c.channel, subject: c.subject },
  }))
  return [...inThreads, ...crm].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]
}

const VISIBILITY_ORDER: readonly Visibility[] = ['private', 'internal', 'client']

function conversationsOf(viewerId: string, householdId: string, accountIds: ReadonlySet<string>, memberIds: ReadonlySet<string>): HouseholdConversation[] {
  const about = (s: Subject | undefined) => s !== undefined
    && ((s.type === 'household' && s.id === householdId) || (s.type === 'client' && memberIds.has(s.id)) || (s.type === 'account' && accountIds.has(s.id)))
  return visibleThreads(viewerId).filter((t) => t.id !== BRIEF_THREAD_ID && about(t.subject))
    .sort((a, b) => VISIBILITY_ORDER.indexOf(a.visibility) - VISIBILITY_ORDER.indexOf(b.visibility) || a.title.localeCompare(b.title))
    .map((t) => ({ threadId: t.id, title: t.title, visibility: t.visibility, audience: audienceOf(t) }))
}

const HOUSEHOLD_METHODS: readonly MethodNote[] = [
  { label: 'Household target', modeled: false, text: "The household target is the value-weighted average of the model targets of its model-managed accounts, in USD; its band is the same weighting of their models' drift bands. Each class's drift is its weight of those accounts against that target. A custom mandate follows no model: it is listed outside the target, with its own orders and fills. Class rows summarize the household; trades are gated per account, so a household row can read within its band while one account is outside its own." },
  { label: 'Held away', modeled: false, text: "Held-away accounts are shown inside each class at the client's last reported value and mix. They are outside the firm's view and not in the totals." },
  { label: 'Orders and fills', modeled: false, text: "Open orders are working order-management tickets and a proposal's orders pending compliance release. Fills are today's, in Eastern Time, against the holding they change." },
  { label: 'Risk against tolerance', modeled: true, text: "Each member is judged against their own questionnaire, on their own accounts as a whole: a value-weighted average of their accounts' risk scores, glide paths aside. Nothing is pooled across the household." },
]

/** The household as a firm viewer reads it. A client, or anyone unknown, gets nothing. */
export function householdView(viewerId: string, householdId: string): HouseholdView | undefined {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household || !isFirmViewer(viewerId)) return undefined
  const memberIds = new Set(household.members.map((m) => m.clientId))
  const accountIds = new Set(accounts.filter((a) => a.householdId === household.id).map((a) => a.id))
  const ledger = householdLedger(household.id)
  const lastContact = lastContactOf(memberIds)
  return {
    ...summaryOf(household, ledger),
    documents: documents.filter((d) => memberIds.has(d.clientId)).sort(latestFirst((d) => d.updatedAt)).map((d) => ({
      id: d.id, name: d.name, type: d.type, clientName: clientName(d.clientId), signatureStatus: d.signatureStatus, updatedOn: d.updatedAt.slice(0, 10),
    })),
    communications: communicationsOf(memberIds),
    activity: activities.filter((a) => a.entityId === household.id || (a.entityId !== undefined && memberIds.has(a.entityId)))
      .sort(latestFirst((a) => a.timestamp)).map((a) => ({ id: a.id, title: a.title, description: a.description, at: a.timestamp })),
    meetings: meetingsOf(household.id),
    standing: standingOf(household),
    holdings: holdingsOf(ledger),
    decisions: decisionsOf(accountIds),
    tasks: tasksOf(household, accountIds, memberIds, ledger.day),
    ...(lastContact ? { lastContact } : {}),
    waiting: clientsWaiting(household.id).map(({ clientName: name, since, threadId }) => ({ clientName: name, since, threadId })),
    conversations: conversationsOf(viewerId, household.id, accountIds, memberIds),
    methods: [...HOUSEHOLD_METHODS],
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
    risk: { tolerance: bandFor(client.riskProfile.score).label, scoreFraction: client.riskProfile.score / 100, assessedOn: client.riskProfile.lastAssessed },
    accounts: owned,
    accountsValue: owned.reduce((s, a) => s + a.valueUsd, 0),
    ...(ips ? { ips } : {}),
    communications: communicationsOf(new Set([client.id])),
  }
}
