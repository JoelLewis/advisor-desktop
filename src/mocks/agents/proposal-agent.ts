import type { DraftPreview, ProposalConstraint } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { normaliseConstraints } from '@/mocks/workspace/proposal-engine'
import { ASSET_CLASS_LABELS } from '@/lib/labels'

const hasDigit = (text: string) => /\d/.test(text)

const label = (assetClass: string): string => {
  const name = ASSET_CLASS_LABELS[assetClass]
  if (!name) throw new Error(`Proposal Agent: no display name for asset class "${assetClass}"`)
  return name
}

const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`

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

export function draftSummary(accountId: string): string {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Proposal Agent: unknown account ${accountId}`)
  const model = modelDisplayName(computeDriftForAccount(account).modelId)
  const toward = hasDigit(model) ? 'its model' : `the ${model} model`
  return `Drafted a tax-aware rebalance toward ${toward}. It sells losses first, then the lots that cost the least tax, and buys nothing that would wash one of the taxpayer's losses.`
}

export function revisionSummary(constraints: readonly ProposalConstraint[], built: DraftPreview, previousHadEdits: boolean): string {
  const asked = constraints.flatMap((c): string[] => {
    switch (c.kind) {
      case 'harvest_only': return ['sell only lots at a loss']
      case 'cap_realised_gains': return ['cap the gains it realises']
      case 'exclude_asset_class': return [`leave ${label(c.assetClass)} untouched`]
      case 'avoid_self_wash': return []
    }
  })
  const opening = asked.length > 0 ? `Revised to ${joinWords(asked)}.` : 'Revised with no constraint beyond avoiding self-washing buys.'
  const { driftTolerance, assetClassDrifts, withinBand } = built.preview.projectedDrift
  const outside = assetClassDrifts.filter((d) => Math.abs(d.drift) > driftTolerance).map((d) => label(d.assetClass))
  const result = withinBand || outside.length === 0
    ? ' Every asset class ends inside its band.'
    : ` ${joinWords(outside)} ${outside.length === 1 ? 'stays outside its band' : 'stay outside their bands'}.`
  const carried = previousHadEdits ? ' Workbench edits on the previous version are not carried into this one.' : ''
  return `${opening}${result}${carried}`
}
