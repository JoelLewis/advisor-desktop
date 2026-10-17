import type { Account } from '@/types/account'
import type { HouseholdFixture } from '@/types/household'
import type { AgentFinding } from './agent'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { plans } from '@/mocks/data/planning'
import { documents } from '@/mocks/data/documents'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows } from '@/mocks/data/realized-sales'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { isModelManaged } from '@/lib/mandate'
import { firstNameOf, joinWords } from '@/lib/words'
import { firstRmdYear, requiredBeginningAge } from '@/lib/rmd'
import { fmtDayMonthYear } from '@/kit/measure'

/** A finding, and the agenda title it proposes. */
export type PrepFinding = AgentFinding & { agendaTitle: string }

export const AGENDA_V1_SUMMARY = 'Proposed an agenda ordered by what needs attention first.'

const hasDigit = (text: string) => /\d/.test(text)
const isOrAre = (n: number) => (n === 1 ? 'is' : 'are')
/** How a claim names an account or a goal: claims carry no digits. */
const accountWords = (a: Account) => (hasDigit(a.name) ? 'an account' : a.name)
const goalWords = (name: string) => (hasDigit(name) ? 'a goal' : name)
const valueOf = (a: Account) => getPositionsForAccount(a.id, a.totalValue).reduce((s, p) => s + p.marketValue, 0)

function householdOf(householdId: string): HouseholdFixture {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household) throw new Error(`Meeting Prep: unknown household ${householdId}`)
  return household
}

function memberName(household: HouseholdFixture, clientId: string): string {
  const member = household.members.find((m) => m.clientId === clientId)
  if (!member) throw new Error(`Meeting Prep: ${clientId} is not a member of ${household.id}`)
  return member.name
}

/** What changed today: the session's fills in the household's accounts. */
function changes(own: readonly Account[], asOf: string): PrepFinding {
  const ids = new Set(own.map((a) => a.id))
  const fills = ledgerFills().filter((f) => ids.has(f.accountId))
  if (fills.length === 0) {
    return { claim: "No orders have been filled in the household's accounts today.", attention: 'info', figures: [], citations: [{ source: 'Fills recorded this session', asOf }], agendaTitle: 'Changes since the last review' }
  }
  const moved = own.filter((a) => fills.some((f) => f.accountId === a.id))
  const total = (side: 'buy' | 'sell') => fills.filter((f) => f.side === side).reduce((s, f) => s + f.value, 0)
  return {
    claim: `Orders released today were filled in ${joinWords(moved.map(accountWords))}; the figures below include today's trades.`,
    attention: 'info',
    figures: [
      { label: 'Sold today', value: total('sell'), unit: 'USD', source: 'ledgerFills.value' },
      { label: 'Bought today', value: total('buy'), unit: 'USD', source: 'ledgerFills.value' },
    ],
    citations: moved.map((a) => ({ source: `Fills · ${a.name}`, asOf })),
    agendaTitle: "This morning's rebalance and harvest",
  }
}

/** The taxpayer's open loss-sale windows, from the realized-sales ledger (fixtures and the session's fills). */
function windows(householdId: string, asOf: string): PrepFinding {
  const open = openWashSaleWindows(asOf.slice(0, 10), householdId)
  if (open.length === 0) {
    return { claim: 'The taxpayer has no open wash-sale window.', attention: 'info', figures: [], citations: [{ source: `Realized sales · ${householdId}`, asOf }], agendaTitle: 'Wash-sale windows' }
  }
  return {
    claim: "The taxpayer has open wash-sale windows: what was sold at a loss must not be bought back in any of the taxpayer's accounts, including IRAs and Roths, before each window closes, and reinvested dividends count as buying.",
    attention: 'attention',
    figures: open.flatMap((w) => [
      { label: `${w.symbol} loss · ${w.id}`, value: w.realizedGainLoss, unit: 'USD' as const, source: 'realizedSales.realizedGainLoss' },
      { label: `Days until the ${w.symbol} window closes · ${w.id}`, value: w.daysRemaining, unit: 'd' as const, source: 'openWashSaleWindows.daysRemaining' },
    ]),
    citations: open.map((w) => ({ source: `Wash-sale window · ${w.id} · ${w.symbol} loss sale of ${fmtDayMonthYear(w.saleDate)}, open through ${fmtDayMonthYear(w.end)}`, asOf })),
    agendaTitle: 'Wash-sale windows: what not to buy back',
  }
}

/** Each model-managed account against its model, from the drift engine; a custom mandate has no model to drift from. */
function drift(own: readonly Account[], asOf: string): PrepFinding {
  const readings = own.filter(isModelManaged).map((account) => ({ account, reading: computeDriftForAccount(account) }))
  const outside = readings.filter(({ reading }) => reading.needsRebalance && reading.assetClassDrifts.length > 0)
  const citations = readings.map(({ account }) => ({ source: `Drift calculation · ${account.name}`, asOf }))
  if (outside.length === 0) {
    return { claim: 'Every managed account in the household is inside its tolerance band.', attention: 'info', figures: [], citations, agendaTitle: 'Allocation against the models' }
  }
  const one = outside.length === 1
  return {
    claim: `${joinWords(outside.map(({ account }) => accountWords(account)))} ${isOrAre(outside.length)} outside ${one ? 'its' : 'their'} tolerance band${one ? '' : 's'}.`,
    attention: 'attention',
    figures: outside.flatMap(({ account, reading }) => {
      const worst = reading.assetClassDrifts.reduce((x, y) => (Math.abs(y.drift) > Math.abs(x.drift) ? y : x))
      return [
        { label: `Largest drift · ${account.name}`, value: worst.drift, unit: 'pp' as const, source: 'drift.assetClassDrifts' },
        { label: `Tolerance · ${account.name}`, value: reading.driftTolerance, unit: 'pp' as const, source: 'drift.driftTolerance' },
      ]
    }),
    citations,
    agendaTitle: 'Accounts outside their bands',
  }
}

/** The financial plan's goals: probability and funded status. */
function goals(householdId: string): PrepFinding | undefined {
  const plan = plans.find((p) => p.householdId === householdId)
  if (!plan) return undefined
  const atRisk = plan.goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track')
  const onTrack = plan.goals.filter((g) => g.status === 'on_track')
  const phrase = (gs: typeof plan.goals, state: string) => (gs.length > 0 ? [`${joinWords(gs.map((g) => goalWords(g.name)))} ${isOrAre(gs.length)} ${state}`] : [])
  return {
    claim: `In the financial plan, ${[...phrase(atRisk, 'at risk'), ...phrase(onTrack, 'on track')].join('; ')}.`,
    attention: atRisk.length > 0 ? 'attention' : 'info',
    figures: plan.goals.flatMap((g) => [
      { label: `Probability · ${g.name}`, value: g.probability, unit: '%' as const, source: 'plan.goals.probability' },
      { label: `Funded · ${g.name}`, value: g.currentFunding / g.targetAmount, unit: '%' as const, source: 'plan.goals.currentFunding / targetAmount' },
    ]),
    citations: [{ source: `Financial plan · ${plan.id}`, asOf: plan.lastUpdated }],
    agendaTitle: atRisk.length > 0 ? `Plan goals at risk: ${joinWords(atRisk.map((g) => goalWords(g.name)))}` : 'Plan goals',
  }
}

/** Accounts held away: outside the firm's view, still inside the taxpayer's wash-sale windows. */
function heldAway(household: HouseholdFixture): PrepFinding | undefined {
  const held = heldAwayAssets.filter((h) => h.householdId === household.id)
  if (held.length === 0) return undefined
  const one = held.length === 1
  const names = held.map((h) => `${firstNameOf(memberName(household, h.clientId))}'s ${h.institutionName} account`)
  const planNames = [...new Set(held.flatMap((h) => h.accountType.match(/^(?:401\(k\)|403\(b\))/) ?? []))]
  const policy = planNames.length > 0
    ? `; the firm treats purchases in the held-away ${joinWords(planNames)} as if they count for the wash-sale windows, though the rule for employer plans is unsettled`
    : ''
  return {
    claim: `${joinWords(names)} ${isOrAre(held.length)} held away: the firm does not manage ${one ? 'it' : 'them'} and cannot see ${one ? 'its' : 'their'} holdings${policy}.`,
    attention: 'info',
    figures: held.map((h) => ({ label: `${h.institutionName} ${h.accountType}`, value: h.estimatedValue, unit: 'USD' as const, source: 'heldAwayAssets.estimatedValue' })),
    citations: held.map((h) => ({ source: `Held-away assets · ${h.id} · ${h.institutionName}`, asOf: h.lastUpdated })),
    agendaTitle: 'Held-away accounts',
  }
}

/** The IPS's signature state, and the items on file to resolve. */
function openItems(household: HouseholdFixture): PrepFinding | undefined {
  const members = new Set(household.members.map((m) => m.clientId))
  const ips = documents.find((d) => d.type === 'ips' && members.has(d.clientId))
  const items = OPEN_ITEMS.filter((i) => i.householdId === household.id)
  if (!ips && items.length === 0) return undefined
  const ipsWords = !ips ? 'No investment policy statement is on file'
    : ips.signatureStatus === 'signed' ? 'The investment policy statement is signed' : 'The investment policy statement awaits signature'
  return {
    claim: `${[ipsWords, ...items.map((i) => i.claim)].join('; ')}.`,
    attention: items.length > 0 || ips?.signatureStatus !== 'signed' ? 'attention' : 'info',
    figures: [],
    citations: [
      ...(ips ? [{ source: `Document · ${ips.id} · ${ips.name}`, asOf: ips.updatedAt }] : []),
      ...items.map((i) => ({ source: `Client communication · ${i.source}`, asOf: i.asOf })),
    ],
    agendaTitle: `Open items: ${joinWords(['the IPS', ...items.map((i) => i.agendaWords)])}`,
  }
}

/** Each traditional IRA owner's first required distribution: the years before it are when Roth conversions can be modeled. */
function rmd(household: HouseholdFixture, own: readonly Account[], asOf: string): PrepFinding | undefined {
  const iras = own.filter((a) => a.type === 'traditional_ira')
  if (iras.length === 0) return undefined
  const owners = iras.map((account) => ({ account, member: household.members.find((m) => m.clientId === account.clientId) }))
    .flatMap(({ account, member }) => (member ? [{ account, member }] : []))
  if (owners.length === 0) return undefined
  return {
    claim: `Required distributions from ${joinWords(owners.map(({ member }) => `${firstNameOf(member.name)}'s traditional IRA`))} begin in the year the citation states; the years before then are when Roth conversions can be modeled, as an estimate for the clients' tax professional to confirm.`,
    attention: 'info',
    figures: owners.map(({ account }) => ({ label: account.name, value: valueOf(account), unit: 'USD' as const, source: 'positions.marketValue' })),
    citations: owners.map(({ member }) => ({
      source: `Required beginning · ${member.name}, born ${member.dateOfBirth} · first required distribution for ${firstRmdYear(member.dateOfBirth)} (age ${requiredBeginningAge(member.dateOfBirth)}, SECURE 2.0)`,
      asOf,
    })),
    agendaTitle: 'Roth conversions before required distributions',
  }
}

/** The household measured for its review, in the order the agenda breaks ties. Scripted and deterministic. */
export function runMeetingPrepAgent(householdId: string, asOf: string): PrepFinding[] {
  const household = householdOf(householdId)
  const own = accounts.filter((a) => a.householdId === householdId)
  return [changes(own, asOf), windows(householdId, asOf), drift(own, asOf), goals(householdId), heldAway(household), openItems(household), rmd(household, own, asOf)]
    .flatMap((f) => (f ? [f] : []))
}
