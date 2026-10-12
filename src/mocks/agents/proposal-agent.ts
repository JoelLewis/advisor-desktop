import type { DraftPreview, LegEdit, ProposalConstraint } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { buildVersion, normaliseConstraints } from '@/mocks/workspace/proposal-engine'
import { ASSET_CLASS_PROSE_LABELS } from '@/lib/labels'

const NO_SELF_WASH = "buys nothing that would wash one of the taxpayer's losses"

const hasDigit = (text: string) => /\d/.test(text)

const PROSE_LABELS: ReadonlyMap<string, string> = new Map(Object.entries(ASSET_CLASS_PROSE_LABELS))

const prose = (assetClass: string): string => {
  const name = PROSE_LABELS.get(assetClass)
  if (!name) throw new Error(`Proposal Agent: no display name for asset class "${assetClass}"`)
  return name
}

const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`

const sameConstraints = (a: readonly ProposalConstraint[], b: readonly ProposalConstraint[]): boolean =>
  JSON.stringify(normaliseConstraints(a).map(constraintKey)) === JSON.stringify(normaliseConstraints(b).map(constraintKey))

/** Key-order independent: each constraint as a fixed tuple. */
function constraintKey(c: ProposalConstraint): readonly (string | number)[] {
  switch (c.kind) {
    case 'harvest_only': return [c.kind]
    case 'avoid_self_wash': return [c.kind]
    case 'cap_realised_gains': return [c.kind, c.usd]
    case 'exclude_asset_class': return [c.kind, c.assetClass]
  }
}

const legsOf = (built: DraftPreview) => JSON.stringify(built.preview.trades.map((t) => [t.symbol, t.side, t.quantity]))

/** Whether a gain cap changed the legs: the same constraints without it draft the same trades when it does not bind. */
function capBinds(constraints: readonly ProposalConstraint[], built: DraftPreview): boolean | undefined {
  if (!constraints.some((c) => c.kind === 'cap_realised_gains')) return undefined
  const uncapped = buildVersion(built.preview.accountId, constraints.filter((c) => c.kind !== 'cap_realised_gains'), [])
  if (!uncapped.ok) throw new Error(`Proposal Agent: cannot draft ${built.preview.accountId} without its cap: ${uncapped.message}`)
  return legsOf(uncapped.built) !== legsOf(built)
}

/** The agent never drafts a buy that would wash one of the taxpayer's losses, whatever else is asked. */
export function agentConstraints(requested: readonly ProposalConstraint[]): ProposalConstraint[] {
  return normaliseConstraints([{ kind: 'avoid_self_wash' }, ...requested])
}

export function proposalTitle(accountId: string): string {
  const account = accounts.find((a) => a.id === accountId)
  const client = clients.find((c) => c.id === account?.clientId)
  if (!account || !client) throw new Error(`Proposal Agent: no client for ${accountId}`)
  return `${client.lastName} rebalance`
}

/** Lot choice only changes the tax in an account whose sales are taxed. */
export function draftSummary(accountId: string): string {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Proposal Agent: unknown account ${accountId}`)
  const model = modelDisplayName(computeDriftForAccount(account).modelId)
  const toward = hasDigit(model) ? 'its model' : `the ${model} model`
  switch (account.taxTreatment) {
    case 'taxable':
    case 'trust_taxable':
      return `Drafted a tax-aware rebalance toward ${toward}. It harvests losses first, then sells the lots that cost the least tax, and ${NO_SELF_WASH}.`
    case 'tax_deferred':
    case 'tax_free':
      return `Drafted a rebalance toward ${toward}. Sales in this account are not taxed when they happen, so the choice of lots does not change the tax; it still ${NO_SELF_WASH}.`
  }
}

const asked = (c: ProposalConstraint): string[] => {
  switch (c.kind) {
    case 'harvest_only': return ['sell only lots at a loss']
    case 'cap_realised_gains': return ['cap the gains it realises']
    case 'exclude_asset_class': return [`leave ${prose(c.assetClass)} untouched`]
    case 'avoid_self_wash': return []
  }
}

const under = (c: ProposalConstraint): string[] => {
  switch (c.kind) {
    case 'harvest_only': return ['the rule to sell only lots at a loss']
    case 'cap_realised_gains': return ['the cap on realised gains']
    case 'exclude_asset_class': return [`the exclusion of ${prose(c.assetClass)}`]
    case 'avoid_self_wash': return []
  }
}

function opening(constraints: readonly ProposalConstraint[], onlyDropsEdits: boolean): string {
  if (onlyDropsEdits) {
    const rules = constraints.flatMap(under)
    return rules.length > 0
      ? `Back to the agent's legs under ${joinWords(rules)}; it still ${NO_SELF_WASH}.`
      : `Back to the agent's legs, which ${NO_SELF_WASH}.`
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
  return `${opening(constraints, onlyDropsEdits)}${cap}${bandResult(built)}${carried}`
}
