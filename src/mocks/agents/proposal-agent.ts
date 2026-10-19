import type { DraftPreview, LegEdit, ProposalConstraint } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { requireModelManaged } from '@/lib/mandate'
import { buildVersion, normalizeConstraints } from '@/mocks/workspace/proposal-engine'
import { sameWashSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { isSubjectToWashSale } from '@/lib/security-master'
import { harvestOpportunities } from './harvest-scanner'
import { claimNameOf, hasDigit } from './claim-name'
import { joinWords } from '@/lib/words'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { easternDayOf } from '@/lib/eastern-day'
import { sessionNow } from '@/mocks/data/workspace-store'

const NO_SELF_WASH = 'buys nothing that would wash a loss the taxpayer has taken or this proposal takes'


const PROSE_LABELS: ReadonlyMap<string, string> = new Map(Object.entries(ASSET_CLASS_LABELS))

const prose = (assetClass: string): string => {
  const name = PROSE_LABELS.get(assetClass)
  if (!name) throw new Error(`Proposal Agent: no display name for asset class "${assetClass}"`)
  return name
}

const sameConstraints = (a: readonly ProposalConstraint[], b: readonly ProposalConstraint[]): boolean =>
  JSON.stringify(normalizeConstraints(a).map(constraintKey)) === JSON.stringify(normalizeConstraints(b).map(constraintKey))

/** Key-order independent: each constraint as a fixed tuple. */
function constraintKey(c: ProposalConstraint): readonly (string | number)[] {
  switch (c.kind) {
    case 'harvest_only': return [c.kind]
    case 'avoid_self_wash': return [c.kind]
    case 'cap_realized_gains': return [c.kind, c.usd]
    case 'exclude_asset_class': return [c.kind, c.assetClass]
  }
}

const legsOf = (built: DraftPreview) => JSON.stringify(built.preview.trades.map((t) => [t.symbol, t.side, t.quantity]))

/** Whether a gain cap changed the legs: the same constraints without it draft the same trades when it does not bind. */
function capBinds(constraints: readonly ProposalConstraint[], built: DraftPreview): boolean | undefined {
  if (!constraints.some((c) => c.kind === 'cap_realized_gains')) return undefined
  const uncapped = buildVersion(built.preview.accountId, constraints.filter((c) => c.kind !== 'cap_realized_gains'), [])
  if (!uncapped.ok) throw new Error(`Proposal Agent: cannot draft ${built.preview.accountId} without its cap: ${uncapped.message}`)
  return legsOf(uncapped.built) !== legsOf(built)
}

/** The agent never drafts a buy that would wash a loss the taxpayer has taken or this proposal takes, whatever else is asked. */
export function agentConstraints(requested: readonly ProposalConstraint[]): ProposalConstraint[] {
  return normalizeConstraints([{ kind: 'avoid_self_wash' }, ...requested])
}

export function proposalTitle(accountId: string): string {
  const account = accounts.find((a) => a.id === accountId)
  const client = clients.find((c) => c.id === account?.clientId)
  if (!account || !client) throw new Error(`Proposal Agent: no client for ${accountId}`)
  return `${client.lastName} rebalance`
}

/**
 * A buy of a security the Harvest Scanner flags for the same taxpayer forecloses that harvest: a
 * sale of its loss lots within thirty days of the purchase would be washed (§1091 looks back as
 * well as forward). In a taxable account the washed loss is deferred into the new shares; bought in
 * an IRA or Roth, the loss is disallowed for good (Rev. Rul. 2008-5). The engine buys a substitute
 * where the class has one (`harvestSubstitutions`); a flagged buy that remains has none, so the agent
 * says what it forecloses.
 */
function foreclosedHarvestCaveat(accountId: string, built: DraftPreview): string {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Proposal Agent: unknown account ${accountId}`)
  const flagged = new Set(sameWashSaleTaxpayer(account).flatMap((a) => harvestOpportunities(a, easternDayOf(sessionNow()))).map((o) => o.position.symbol))
  const names = [...new Set(built.preview.trades
    .filter((t) => t.side === 'buy' && isSubjectToWashSale(t.symbol) && flagged.has(t.symbol))
    .map((t) => claimNameOf(t.symbol, t.name)))]
  if (names.length === 0) return ''
  const one = names.length === 1
  const bought = one ? `${names[0]} is bought here` : `${joinWords(names)} are bought here`
  return isTaxableAccount(account.taxTreatment)
    ? ` ${bought}, so ${one ? 'its loss' : 'their losses'} cannot be harvested for thirty days without a wash sale.`
    : ` ${bought}, in a retirement account: a loss sale of ${one ? 'it' : 'them'} in the taxpayer's taxable accounts within thirty days would be disallowed for good, not deferred.`
}

/**
 * Whether two funds tracking similar indices are substantially identical is unsettled (the IRS has
 * not ruled), so the agent never asserts a substitute avoids a wash sale without saying so.
 */
const SUBSTITUTE_HEDGE = ' Whether funds that track similar indices are substantially identical is unsettled, so confirm the substitute before relying on the harvest.'

/** What the agent did instead of foreclosing a flagged harvest, in words with no digits. */
function harvestSubstitutionSentence(built: DraftPreview): string {
  if (built.harvestSubstitutions.length === 0) return ''
  return built.harvestSubstitutions.map((s) => {
    const foreclosed = claimNameOf(s.foreclosed.symbol, s.foreclosed.name)
    const bought = claimNameOf(s.bought.symbol, s.bought.name)
    return s.harvested
      ? ` It sells the ${foreclosed} lots at a loss and buys ${bought} in their place, so that harvest is not foreclosed.`
      : ` It buys ${bought} rather than ${foreclosed}, so the taxpayer's ${foreclosed} harvest is not foreclosed.`
  }).join('') + SUBSTITUTE_HEDGE
}

/** The working orders the version counted, named without digits. */
function workingOrderSentence({ workingOrders }: Pick<DraftPreview, 'workingOrders'>): string {
  if (workingOrders.length === 0) return ''
  const named = joinWords(workingOrders.map((w) => `${w.side === 'buy' ? 'a buy' : 'a sale'} of ${claimNameOf(w.symbol, w.name)}`))
  return ` It counts ${workingOrders.length === 1 ? 'the working order' : 'the working orders'} already open in this account (${named}) as filled, so it does not trade ${workingOrders.length === 1 ? 'it' : 'them'} again.`
}

/** Lot choice only changes the tax in an account whose sales are taxed. */
export function draftSummary(accountId: string, built: DraftPreview): string {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Proposal Agent: unknown account ${accountId}`)
  const model = modelDisplayName(computeDriftForAccount(requireModelManaged(account)).modelId)
  const toward = hasDigit(model) ? 'its model' : `the ${model} model`
  switch (account.taxTreatment) {
    case 'taxable':
    case 'trust_taxable':
      return `Drafted a tax-aware rebalance toward ${toward}. Where it sells, it sells loss lots first, then the lots that cost the least tax, and it ${NO_SELF_WASH}.${harvestSubstitutionSentence(built)}${foreclosedHarvestCaveat(accountId, built)}${workingOrderSentence(built)}`
    case 'tax_deferred':
    case 'tax_free':
      return `Drafted a rebalance toward ${toward}. Sales in this account are not taxed when they happen, so the choice of lots does not change the tax; it still ${NO_SELF_WASH}.${harvestSubstitutionSentence(built)}${foreclosedHarvestCaveat(accountId, built)}${workingOrderSentence(built)}`
  }
}

const asked = (c: ProposalConstraint): string[] => {
  switch (c.kind) {
    case 'harvest_only': return ['sell only lots at a loss']
    case 'cap_realized_gains': return ['cap the gains it realizes']
    case 'exclude_asset_class': return [`leave ${prose(c.assetClass)} untouched`]
    case 'avoid_self_wash': return []
  }
}

const under = (c: ProposalConstraint): string[] => {
  switch (c.kind) {
    case 'harvest_only': return ['the rule to sell only lots at a loss']
    case 'cap_realized_gains': return ['the cap on realized gains']
    case 'exclude_asset_class': return [`the exclusion of ${prose(c.assetClass)}`]
    case 'avoid_self_wash': return []
  }
}

function opening(constraints: readonly ProposalConstraint[], onlyDropsEdits: boolean): string {
  if (onlyDropsEdits) {
    const rules = constraints.flatMap(under)
    return rules.length > 0
      ? `Back to the agent's legs under ${joinWords(rules)}; it still ${NO_SELF_WASH}.`
      : `Back to the agent's own legs; it still ${NO_SELF_WASH}.`
  }
  const asks = constraints.flatMap(asked)
  return asks.length > 0 ? `Revised to ${joinWords(asks)}.` : `Revised with no constraint beyond its rule that it ${NO_SELF_WASH}.`
}

function bandResult(built: DraftPreview): string {
  const { driftTolerance, assetClassDrifts, withinBand } = built.preview.projectedDrift
  const outside = assetClassDrifts.filter((d) => Math.abs(d.drift) > driftTolerance).map((d) => prose(d.assetClass))
  if (withinBand || outside.length === 0) return ' Every asset class ends inside its band.'
  return ` ${joinWords(outside)} ${outside.length === 1 ? 'stays outside its band' : 'stay outside their bands'}.`
}

/**
 * The agent's account of a revision. `previous` is the version it replaces; its workbench edits
 * are never carried, and a revision that keeps its constraints only drops them.
 */
export function revisionSummary(
  constraints: readonly ProposalConstraint[],
  built: DraftPreview,
  previous?: { constraints: readonly ProposalConstraint[]; edits: readonly LegEdit[] },
): string {
  const hadEdits = (previous?.edits.length ?? 0) > 0
  const onlyDropsEdits = previous !== undefined && hadEdits && sameConstraints(constraints, previous.constraints)
  const cap = capBinds(constraints, built) === false ? ' The cap changes no trade.' : ''
  const carried = hadEdits ? ' Workbench edits on the previous version are not carried into this one.' : ''
  return `${opening(constraints, onlyDropsEdits)}${cap}${bandResult(built)}${harvestSubstitutionSentence(built)}${foreclosedHarvestCaveat(built.preview.accountId, built)}${workingOrderSentence(built)}${carried}`
}
