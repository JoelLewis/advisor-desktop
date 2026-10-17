import type { AssetClass } from '@/types/portfolio'
import type { Account } from '@/types/account'
import type { ProposedTrade, RebalancePreview } from '@/services/oms'
import type { DraftPreview, ExcludedLeg, LegEdit, LegFacts, ProposalConstraint, ProposalTaxSummary } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { withSuitability } from './suitability'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { requireModelManaged } from '@/lib/mandate'
import type { LegSale } from '@/mocks/handlers/batch-wash-sales'
import {
  buildRebalancePreviews, generateRebalanceProposal, realizedGains, recutLeg, standingHarvestSubstitutions,
  type GenerationConstraints, type ProposedTradeLeg, type RebalanceProposal,
} from '@/mocks/handlers/oms'
import { harvestOpportunities } from '@/mocks/agents/harvest-scanner'
import { sameWashSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { claimNameOf } from '@/mocks/agents/claim-name'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { fingerprint } from '@/lib/fingerprint'

/** Proposals are generated tax-aware against the drift surface's own threshold. */
const PROPOSAL_DRIFT_THRESHOLD = 0.005

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
      case 'cap_realized_gains':
        if (typeof item.usd !== 'number' || !Number.isFinite(item.usd) || item.usd < 0) return fail('BAD_CONSTRAINTS', 'A gains cap must be zero or a positive amount.')
        out.push({ kind: 'cap_realized_gains', usd: item.usd })
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

const CONSTRAINT_ORDER: Readonly<Record<ProposalConstraint['kind'], number>> = { avoid_self_wash: 0, harvest_only: 1, cap_realized_gains: 2, exclude_asset_class: 3 }
const EDIT_ORDER: Readonly<Record<LegEdit['kind'], number>> = { exclude: 0, quantity: 1, lots: 2 }

/** Code-unit order, the same on every machine and locale: what feeds a fingerprint never sorts by locale. */
const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** A constraint as a fixed tuple, so its spelling never depends on an object's key order. */
const constraintTuple = (c: ProposalConstraint): [string, number | string | null] =>
  [c.kind, c.kind === 'cap_realized_gains' ? c.usd : c.kind === 'exclude_asset_class' ? c.assetClass : null]

/** An edit as a fixed tuple, so its spelling never depends on an object's key order. */
const editTuple = (e: LegEdit): [string, string, number | string[] | null] =>
  [e.kind, e.symbol, e.kind === 'quantity' ? e.quantity : e.kind === 'lots' ? [...e.lotIds] : null]

/** One spelling per constraint set: duplicates dropped, gain caps collapsed to the tightest, a fixed order. */
export function normalizeConstraints(constraints: readonly ProposalConstraint[]): ProposalConstraint[] {
  const caps = constraints.flatMap((c) => (c.kind === 'cap_realized_gains' ? [c.usd] : []))
  const collapsed: ProposalConstraint[] = [
    ...constraints.filter((c) => c.kind !== 'cap_realized_gains'),
    ...(caps.length > 0 ? [{ kind: 'cap_realized_gains', usd: Math.min(...caps) } as const] : []),
  ]
  const unique = [...new Map(collapsed.map((c) => [JSON.stringify(constraintTuple(c)), c])).values()]
  return unique.sort((a, b) => CONSTRAINT_ORDER[a.kind] - CONSTRAINT_ORDER[b.kind] || byCodeUnit(JSON.stringify(constraintTuple(a)), JSON.stringify(constraintTuple(b))))
}

/** One spelling per edit set: by symbol, then by kind. */
export function normalizeEdits(edits: readonly LegEdit[]): LegEdit[] {
  return [...edits].sort((a, b) => byCodeUnit(a.symbol, b.symbol) || EDIT_ORDER[a.kind] - EDIT_ORDER[b.kind])
}

function generationConstraintsOf(constraints: readonly ProposalConstraint[]): GenerationConstraints {
  const caps = constraints.flatMap((c) => (c.kind === 'cap_realized_gains' ? [c.usd] : []))
  return {
    harvestOnly: constraints.some((c) => c.kind === 'harvest_only'),
    capRealizedGains: caps.length > 0 ? Math.min(...caps) : undefined,
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
  const conflicting = edits.find((e) => e.kind !== 'exclude' && excluded.has(e.symbol))
  if (conflicting) return fail('CONFLICTING_EDITS', `${conflicting.symbol} is excluded, so it cannot also have a ${conflicting.kind} edit.`)
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

function taxSummaryOf(preview: RebalancePreview): ProposalTaxSummary {
  const sum = (f: (t: ProposedTrade) => number) => preview.trades.reduce((s, t) => s + f(t), 0)
  return {
    sold: sum((t) => (t.side === 'sell' ? t.estimatedValue : 0)),
    bought: sum((t) => (t.side === 'buy' ? t.estimatedValue : 0)),
    gains: realizedGains(preview.trades),
    losses: sum((t) => Math.min(0, t.realizedShortTerm) + Math.min(0, t.realizedLongTerm)),
    netShortTerm: sum((t) => t.realizedShortTerm),
    netLongTerm: sum((t) => t.realizedLongTerm),
    washed: sum((t) => (t.washedLoss?.shortTerm ?? 0) + (t.washedLoss?.longTerm ?? 0)),
    grossTax: preview.grossTaxOnGains,
    netTax: preview.estimatedTaxImpact,
  }
}

/**
 * An asset class can be left untouched only if the account holds some of it, and never cash:
 * every sale settles into cash and every buy is paid from it.
 */
function unexcludable(account: Account, constraints: readonly ProposalConstraint[]): EngineFailure | undefined {
  const held = new Set(getPositionsForAccount(account.id, account.totalValue).filter((p) => p.marketValue > 0).map((p) => p.assetClass))
  for (const c of constraints) {
    if (c.kind !== 'exclude_asset_class') continue
    const name = ASSET_CLASS_LABELS[c.assetClass]
    if (c.assetClass === 'cash') return fail('NOT_EXCLUDABLE', 'Cash cannot be left untouched: every sale settles into it and every buy is paid from it.')
    if (!held.has(c.assetClass)) return fail('NOT_EXCLUDABLE', `The account holds no ${name} to leave untouched.`)
  }
  return undefined
}

/** What the Harvest Scanner flags for the account's wash-sale taxpayer: buying one of these forecloses its harvest. */
function flaggedHarvests(account: Account): Set<string> {
  return new Set(sameWashSaleTaxpayer(account).flatMap(harvestOpportunities).map((o) => o.position.symbol))
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
  const refused = unexcludable(account, constraints)
  if (refused) return refused
  const avoidsWash = constraints.some((c) => c.kind === 'avoid_self_wash')
  const generated = generateRebalanceProposal(accountId, true, PROPOSAL_DRIFT_THRESHOLD, undefined, {
    ...generationConstraintsOf(constraints), ...(avoidsWash ? { protectHarvests: flaggedHarvests(account) } : {}),
  })
  const symbols = generated.legs.map((l) => l.symbol)
  if (new Set(symbols).size !== symbols.length) throw new Error(`The proposal for ${accountId} names a symbol twice; edits address legs by symbol`)
  const edited = applyEdits(accountId, generated, edits)
  if (!edited.ok) return edited
  const [preview] = buildRebalancePreviews([{ account, ...edited.proposal }], true, PROPOSAL_DRIFT_THRESHOLD, MOCK_TODAY_ISO)
  if (!preview) throw new Error(`No preview for ${accountId}`)
  const evaluated = evaluateProposal(accountId, preview.trades.map(({ symbol, side, quantity, estimatedValue }) => ({ symbol, side, quantity, estimatedValue })))
  if (!evaluated) throw new Error(`No pre-trade result for ${accountId}`)
  const pretrade = withSuitability(evaluated, account, edited.proposal.legs)
  const legFacts: LegFacts[] = edited.proposal.legs.flatMap((leg, i) => {
    const settled = preview.trades[i]
    if (leg.side !== 'sell' || !settled) return []
    const sale = edited.proposal.sales.get(leg)
    if (!sale) throw new Error(`The ${leg.symbol} sale carries no record of the lots it sells`)
    return [{
      symbol: leg.symbol,
      lotIds: [...sale.consumedLotIds],
      lots: sale.lotTakes.map((t) => ({ ...t })),
      washed: (settled.washedLoss?.shortTerm ?? 0) + (settled.washedLoss?.longTerm ?? 0),
    }]
  })
  const content = {
    accountId,
    constraints: normalizeConstraints(constraints).map(constraintTuple),
    edits: normalizeEdits(edits).map(editTuple),
    legs: preview.trades.map((t) => [t.symbol, t.side, t.quantity, t.estimatedValue]),
    lots: legFacts.map((f) => [f.symbol, f.lotIds]),
  }
  return {
    ok: true,
    built: { preview, driftBefore: computeDriftForAccount(requireModelManaged(account)), pretrade, legFacts, excludedLegs: edited.excludedLegs, harvestSubstitutions: standingHarvestSubstitutions(generated.harvestSubstitutions, preview.trades), summary: taxSummaryOf(preview), fingerprint: fingerprint(JSON.stringify(content)) },
    names: new Map(generated.legs.map((l) => [l.symbol, l.name])),
  }
}

export function editSummary(edits: readonly LegEdit[], names: ReadonlyMap<string, string>): string {
  if (edits.length === 0) return "Back to the agent's legs, with no workbench edits."
  const who = (symbol: string) => claimNameOf(symbol, names.get(symbol))
  const parts = normalizeEdits(edits).map((e) => {
    switch (e.kind) {
      case 'exclude': return `excluded ${who(e.symbol)}`
      case 'quantity': return `set the ${who(e.symbol)} quantity`
      case 'lots': return `chose specific lots for ${who(e.symbol)}`
    }
  })
  return `Workbench edits: ${parts.join('; ')}.`
}
