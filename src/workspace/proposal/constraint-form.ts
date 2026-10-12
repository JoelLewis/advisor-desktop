import type { ProposalConstraint } from '@/types/workspace-proposal'
import type { AssetClass } from '@/types/portfolio'
import { ASSET_CLASS_LABELS } from '@/lib/labels'

export type ConstraintForm = { harvestOnly: boolean; capOn: boolean; cap: string; exclude: string }

const isAssetClass = (v: string): v is AssetClass => Object.prototype.hasOwnProperty.call(ASSET_CLASS_LABELS, v)

export function formFromConstraints(constraints: readonly ProposalConstraint[]): ConstraintForm {
  const cap = constraints.find((c) => c.kind === 'cap_realised_gains')
  const exclude = constraints.find((c) => c.kind === 'exclude_asset_class')
  return {
    harvestOnly: constraints.some((c) => c.kind === 'harvest_only'),
    capOn: cap !== undefined,
    cap: cap?.kind === 'cap_realised_gains' ? String(cap.usd) : '',
    exclude: exclude?.kind === 'exclude_asset_class' ? exclude.assetClass : '',
  }
}

/** The constraints to ask for, as a full replacement set. The agent adds "avoid self-washing buys" itself. */
export function constraintsFromForm(form: ConstraintForm): { ok: true; constraints: ProposalConstraint[] } | { ok: false; message: string } {
  const constraints: ProposalConstraint[] = []
  if (form.harvestOnly) constraints.push({ kind: 'harvest_only' })
  if (form.capOn) {
    const usd = Number(form.cap.replace(/[$,\s]/g, ''))
    if (form.cap.trim() === '' || !Number.isFinite(usd) || usd < 0) return { ok: false, message: 'Enter the cap as a dollar amount, zero or more.' }
    constraints.push({ kind: 'cap_realised_gains', usd })
  }
  if (form.exclude !== '') {
    if (!isAssetClass(form.exclude) || form.exclude === 'cash') return { ok: false, message: 'Choose an asset class from the list.' }
    constraints.push({ kind: 'exclude_asset_class', assetClass: form.exclude })
  }
  return { ok: true, constraints }
}
