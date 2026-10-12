import type { AssetClass } from '@/types/portfolio'
import type { ProposedTrade, RebalancePreview } from '@/services/oms'
import type { DraftPreview, ExcludedLeg, LegEdit, LegFacts, ProposalConstraint, ProposalTaxSummary } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import type { LegSale } from '@/mocks/handlers/batch-wash-sales'
import {
  buildRebalancePreviews, generateRebalanceProposal, realisedGains, recutLeg,
  type GenerationConstraints, type ProposedTradeLeg, type RebalanceProposal,
} from '@/mocks/handlers/oms'
import { claimNameOf } from '@/mocks/agents/claim-name'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { fingerprint } from '@/lib/fingerprint'

/** Proposals are generated tax-aware against the drift surface's own threshold. */
export const PROPOSAL_DRIFT_THRESHOLD = 0.005

export type EngineFailure = { ok: false; code: string; message: string }
const fail = (code: string, message: string): EngineFailure => ({ ok: false, code, message })

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isAssetClass = (v: unknown): v is AssetClass => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ASSET_CLASS_LABELS, v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export function parseConstraints(value: unknown): { ok: true; value: ProposalConstraint[] } | EngineFailure {
  if (!Array.isArray(value)) return fail('BAD_CONSTRAINTS', 'constraints must be a list.')
  const out: ProposalConstraint[] = []
  for (const item of value) {
    if (!isRecord(item)) return fail('BAD_CONSTRAINTS', 'Each constraint must be an object.')
    switch (item.kind) {
      case 'harvest_only':
      case 'avoid_self_wash':
        out.push({ kind: item.kind })
        break
      case 'cap_realised_gains':
        if (typeof item.usd !== 'number' || !Number.isFinite(item.usd) || item.usd < 0) return fail('BAD_CONSTRAINTS', 'A gains cap must be zero or a positive amount.')
        out.push({ kind: 'cap_realised_gains', usd: item.usd })
        break
      case 'exclude_asset_class':
        if (!isAssetClass(item.assetClass)) return fail('BAD_CONSTRAINTS', 'That is not an asset class.')
        out.push({ kind: 'exclude_asset_class', assetClass: item.assetClass })
        break
      default:
        return fail('BAD_CONSTRAINTS', 'Unknown constraint.')
    }
  }
  return { ok: true, value: out }
}

export function parseEdits(value: unknown): { ok: true; value: LegEdit[] } | EngineFailure {
  if (!Array.isArray(value)) return fail('BAD_EDITS', 'edits must be a list.')
  const out: LegEdit[] = []
  for (const item of value) {
    if (!isRecord(item) || !nonEmpty(item.symbol)) return fail('BAD_EDITS', 'Each edit names a symbol.')
    const symbol = item.symbol
    switch (item.kind) {
      case 'exclude':
        out.push({ kind: 'exclude', symbol })
        break
      case 'quantity':
        if (typeof item.quantity !== 'number') return fail('BAD_EDITS', `${symbol}: the quantity must be a number.`)
        out.push({ kind: 'quantity', symbol, quantity: item.quantity })
        break
      case 'lots':
        if (!Array.isArray(item.lotIds) || item.lotIds.length === 0 || !item.lotIds.every(nonEmpty)) return fail('BAD_EDITS', `${symbol}: choose at least one lot.`)
        out.push({ kind: 'lots', symbol, lotIds: item.lotIds.filter(nonEmpty) })
        break
      default:
        return fail('BAD_EDITS', 'Unknown edit.')
    }
  }
  return { ok: true, value: out }
}

const CONSTRAINT_ORDER: Readonly<Record<ProposalConstraint['kind'], number>> = { avoid_self_wash: 0, harvest_only: 1, cap_realised_gains: 2, exclude_asset_class: 3 }
const EDIT_ORDER: Readonly<Record<LegEdit['kind'], number>> = { exclude: 0, quantity: 1, lots: 2 }

/** One spelling per constraint set: duplicates dropped, a fixed order. */
export function normaliseConstraints(constraints: readonly ProposalConstraint[]): ProposalConstraint[] {
  const unique = [...new Map(constraints.map((c) => [JSON.stringify(c), c])).values()]
  return unique.sort((a, b) => CONSTRAINT_ORDER[a.kind] - CONSTRAINT_ORDER[b.kind] || JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

/** One spelling per edit set: by symbol, then by kind. */
export function normaliseEdits(edits: readonly LegEdit[]): LegEdit[] {
  return [...edits].sort((a, b) => a.symbol.localeCompare(b.symbol) || EDIT_ORDER[a.kind] - EDIT_ORDER[b.kind])
}

export function generationConstraintsOf(constraints: readonly ProposalConstraint[]): GenerationConstraints {
  const caps = constraints.flatMap((c) => (c.kind === 'cap_realised_gains' ? [c.usd] : []))
  return {
    harvestOnly: constraints.some((c) => c.kind === 'harvest_only'),
    capRealisedGains: caps.length > 0 ? Math.min(...caps) : undefined,
    excludeAssetClasses: constraints.flatMap((c) => (c.kind === 'exclude_asset_class' ? [c.assetClass] : [])),
    avoidSelfWash: constraints.some((c) => c.kind === 'avoid_self_wash'),
  }
}

/** Workbench edits on top of the agent's legs. Each edited leg is re-cut by the engine; anything untradeable is refused. */
export function applyEdits(accountId: string, base: RebalanceProposal, edits: readonly LegEdit[]): { ok: true; proposal: RebalanceProposal; excludedLegs: ExcludedLeg[] } | EngineFailure {
  const symbols = new Set(base.legs.map((l) => l.symbol))
  const seen = new Set<string>()
  for (const e of edits) {
    if (!symbols.has(e.symbol)) return fail('NOT_A_LEG', `${e.symbol} is not a leg of this proposal.`)
    const key = `${e.kind}:${e.symbol}`
    if (seen.has(key)) return fail('DUPLICATE_EDIT', `${e.symbol} has two ${e.kind} edits.`)
    seen.add(key)
  }
  const excluded = new Set(edits.flatMap((e) => (e.kind === 'exclude' ? [e.symbol] : [])))
  const quantities = new Map(edits.flatMap((e) => (e.kind === 'quantity' ? [[e.symbol, e.quantity] as const] : [])))
  const lots = new Map(edits.flatMap((e) => (e.kind === 'lots' ? [[e.symbol, e.lotIds] as const] : [])))
  const legs: ProposedTradeLeg[] = []
  const sales = new Map<ProposedTradeLeg, LegSale>()
  const heldBack = new Map(base.heldBack)
  const excludedLegs: ExcludedLeg[] = []
  for (const leg of base.legs) {
    if (excluded.has(leg.symbol)) {
      excludedLegs.push({ symbol: leg.symbol, name: leg.name, side: leg.side, quantity: leg.quantity, estimatedValue: leg.estimatedValue })
      if (!heldBack.has(leg.assetClass)) heldBack.set(leg.assetClass, 'excluded_by_constraint')
      continue
    }
    const quantity = quantities.get(leg.symbol)
    const lotIds = lots.get(leg.symbol)
    if (quantity === undefined && lotIds === undefined) {
      legs.push(leg)
      // An unedited leg keeps the generator's own sale record; a sell without one is refused at settlement.
      const sale = base.sales.get(leg)
      if (sale) sales.set(leg, sale)
      continue
    }
    const cut = recutLeg(accountId, leg, { quantity: quantity ?? leg.quantity, lotIds })
    if (!cut.ok) return fail(cut.code, cut.message)
    legs.push(cut.leg)
    sales.set(cut.leg, cut.sale)
  }
  return { ok: true, proposal: { legs, sales, heldBack }, excludedLegs }
}

export function taxSummaryOf(preview: RebalancePreview): ProposalTaxSummary {
  const sum = (f: (t: ProposedTrade) => number) => preview.trades.reduce((s, t) => s + f(t), 0)
  return {
    sold: sum((t) => (t.side === 'sell' ? t.estimatedValue : 0)),
    bought: sum((t) => (t.side === 'buy' ? t.estimatedValue : 0)),
    gains: realisedGains(preview.trades),
    losses: sum((t) => Math.min(0, t.realisedShortTerm) + Math.min(0, t.realisedLongTerm)),
    netShortTerm: sum((t) => t.realisedShortTerm),
    netLongTerm: sum((t) => t.realisedLongTerm),
    washed: sum((t) => (t.washedLoss?.shortTerm ?? 0) + (t.washedLoss?.longTerm ?? 0)),
    grossTax: preview.grossTaxOnGains,
    netTax: preview.estimatedTaxImpact,
  }
}

/**
 * One version: the agent's legs under `constraints`, `edits` on top, then the engine's preview
 * (§1091 settled, the return-level estimate against year-to-date results, drift after the trades)
 * and the proposal-level pre-trade check. The fingerprint covers the account, the constraints, the
 * edits, every leg and every lot it sells.
 */
export function buildVersion(accountId: string, constraints: readonly ProposalConstraint[], edits: readonly LegEdit[]): { ok: true; built: DraftPreview; names: ReadonlyMap<string, string> } | EngineFailure {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return fail('NO_ACCOUNT', 'Account not found.')
  const generated = generateRebalanceProposal(accountId, true, PROPOSAL_DRIFT_THRESHOLD, undefined, generationConstraintsOf(constraints))
  const symbols = generated.legs.map((l) => l.symbol)
  if (new Set(symbols).size !== symbols.length) throw new Error(`The proposal for ${accountId} names a symbol twice; edits address legs by symbol`)
  const edited = applyEdits(accountId, generated, edits)
  if (!edited.ok) return edited
  const [preview] = buildRebalancePreviews([{ account, ...edited.proposal }], true, PROPOSAL_DRIFT_THRESHOLD, MOCK_TODAY_ISO)
  if (!preview) throw new Error(`No preview for ${accountId}`)
  const pretrade = evaluateProposal(accountId, preview.trades.map(({ symbol, side, quantity, estimatedValue }) => ({ symbol, side, quantity, estimatedValue })))
  if (!pretrade) throw new Error(`No pre-trade result for ${accountId}`)
  const legFacts: LegFacts[] = edited.proposal.legs.flatMap((leg, i) => {
    const settled = preview.trades[i]
    if (leg.side !== 'sell' || !settled) return []
    return [{
      symbol: leg.symbol,
      lotIds: [...(edited.proposal.sales.get(leg)?.consumedLotIds ?? [])],
      washed: (settled.washedLoss?.shortTerm ?? 0) + (settled.washedLoss?.longTerm ?? 0),
    }]
  })
  const content = {
    accountId,
    constraints: normaliseConstraints(constraints),
    edits: normaliseEdits(edits),
    legs: preview.trades.map((t) => [t.symbol, t.side, t.quantity, t.estimatedValue]),
    lots: legFacts.map((f) => [f.symbol, f.lotIds]),
  }
  return {
    ok: true,
    built: { preview, pretrade, legFacts, excludedLegs: edited.excludedLegs, summary: taxSummaryOf(preview), fingerprint: fingerprint(JSON.stringify(content)) },
    names: new Map(generated.legs.map((l) => [l.symbol, l.name])),
  }
}

export function editSummary(edits: readonly LegEdit[], names: ReadonlyMap<string, string>): string {
  if (edits.length === 0) return "Back to the agent's legs, with no workbench edits."
  const who = (symbol: string) => claimNameOf(symbol, names.get(symbol))
  const parts = normaliseEdits(edits).map((e) => {
    switch (e.kind) {
      case 'exclude': return `excluded ${who(e.symbol)}`
      case 'quantity': return `set the ${who(e.symbol)} quantity`
      case 'lots': return `chose specific lots for ${who(e.symbol)}`
    }
  })
  return `Workbench edits: ${parts.join('; ')}.`
}
