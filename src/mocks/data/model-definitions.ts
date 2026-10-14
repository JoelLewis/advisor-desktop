import type { BenchmarkKind } from '@/types/portfolio'

/**
 * §9.7 · rebalancing — `implementationSymbol` is the security a model actually buys to fill this
 * sleeve. Without it the rebalance engine could only ever trade what an account already held, so
 * an underweight class the account holds *nothing* in was unreachable: acc-041 sat at 94.4%
 * international equity against a 15% target and proposed no trades at all, because every class it
 * needed to buy (us_equity, emerging_markets, fixed_income, alternatives, commodities) was one it
 * held zero of.
 *
 * `cash` deliberately carries none — cash is the residual an account settles into, not something
 * the engine buys, and `oms.ts` filters the `CASH` pseudo-position out of every candidate list.
 * Every other sleeve must name one; `model-implementation-invariants.test.ts` pins that, and pins
 * that each named symbol resolves to a real, positive, USD-denominated price in `positions.ts`
 * rather than a plausible-looking ticker with no quote behind it.
 */
type AssetClassAllocation = { assetClass: string; targetWeight: number; implementationSymbol?: string }

export type ModelDefinition = {
  id: string
  name: string
  benchmark: string
  benchmarkKind: BenchmarkKind
  description: string
  assetClasses: AssetClassAllocation[]
}

/**
 * §9.4 · `benchmark` is not a real external index return series for any model — `weightsFor` in `handlers/pms.ts`
 * always derives the "benchmark" return from the model's own `assetClasses` target weights
 * (`benchWeights`), never from a fetched index. `benchmark` is therefore the model's own policy
 * blend, named as such (`benchmarkKind: 'model_policy'`), not a bare index name implying an
 * external return series. mod-001, mod-002 and mod-007 previously named a single equity index (or
 * an equity/bond pair) for blends that also carry international equity, emerging markets,
 * alternatives, real estate, commodities and cash — publishing e.g. an "S&P 500" return of ~11.11%
 * against a 14.5% US-equity-only proxy return. The fix is naming, not the arithmetic (Task 12
 * verified the Brinson-Fachler math reconciles): describe the blend instead of borrowing an index's
 * identity for it.
 *
 * Phase 7a · R8 — each label is now the model's policy benchmark: every sleeve at its target weight, measured by the index named for it in src/mocks/reference/models.ts.
 */
/**
 * The firm's models: the one place a model's targets, implementation symbols and name are stated. Read
 * by the drift and rebalance engines in `handlers/pms.ts`, by the position generator in `positions.ts`
 * (each generated account holds its own model's lineup), and by `model-implementation-invariants.test.ts`,
 * which pins that every non-cash sleeve names a symbol with a real USD price.
 */
export const MODEL_DEFINITIONS: readonly ModelDefinition[] = [
  { id: 'mod-001', name: 'Balanced Growth', benchmark: 'Balanced Growth policy benchmark', benchmarkKind: 'model_policy', description: 'Core balanced model with a growth tilt', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.40, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.12, implementationSymbol: 'EFA' },
    { assetClass: 'emerging_markets', targetWeight: 0.03, implementationSymbol: 'VWO' }, { assetClass: 'fixed_income', targetWeight: 0.30, implementationSymbol: 'AGG' },
    { assetClass: 'alternatives', targetWeight: 0.05, implementationSymbol: 'QAI' }, { assetClass: 'real_estate', targetWeight: 0.03, implementationSymbol: 'VNQ' },
    { assetClass: 'commodities', targetWeight: 0.02, implementationSymbol: 'GLD' }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
  { id: 'mod-002', name: 'Growth', benchmark: 'Growth policy benchmark', benchmarkKind: 'model_policy', description: 'Equity-focused growth model', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.55, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.15, implementationSymbol: 'EFA' },
    { assetClass: 'emerging_markets', targetWeight: 0.05, implementationSymbol: 'VWO' }, { assetClass: 'fixed_income', targetWeight: 0.15, implementationSymbol: 'AGG' },
    { assetClass: 'alternatives', targetWeight: 0.05, implementationSymbol: 'QAI' }, { assetClass: 'commodities', targetWeight: 0.02, implementationSymbol: 'GLD' },
    { assetClass: 'cash', targetWeight: 0.03 },
  ]},
  { id: 'mod-003', name: 'Conservative Income', benchmark: 'Conservative Income policy benchmark', benchmarkKind: 'model_policy', description: 'Income-focused with capital preservation', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.20, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.05, implementationSymbol: 'VXUS' },
    { assetClass: 'fixed_income', targetWeight: 0.55, implementationSymbol: 'AGG' }, { assetClass: 'alternatives', targetWeight: 0.05, implementationSymbol: 'QAI' },
    { assetClass: 'real_estate', targetWeight: 0.05, implementationSymbol: 'VNQ' }, { assetClass: 'cash', targetWeight: 0.10 },
  ]},
  { id: 'mod-004', name: 'Aggressive Growth', benchmark: 'Aggressive Growth policy benchmark', benchmarkKind: 'model_policy', description: 'High-growth equity allocation', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.50, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.20, implementationSymbol: 'EFA' },
    { assetClass: 'emerging_markets', targetWeight: 0.10, implementationSymbol: 'VWO' }, { assetClass: 'fixed_income', targetWeight: 0.10, implementationSymbol: 'AGG' },
    { assetClass: 'alternatives', targetWeight: 0.05, implementationSymbol: 'QAI' }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
  { id: 'mod-005', name: 'Ultra-HNW Multi-Strategy', benchmark: 'Ultra-HNW Multi-Strategy policy benchmark', benchmarkKind: 'model_policy', description: 'Multi-strategy for large accounts', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.35, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.15, implementationSymbol: 'EFA' },
    { assetClass: 'emerging_markets', targetWeight: 0.05, implementationSymbol: 'VWO' }, { assetClass: 'fixed_income', targetWeight: 0.20, implementationSymbol: 'AGG' },
    { assetClass: 'alternatives', targetWeight: 0.15, implementationSymbol: 'QAI' }, { assetClass: 'real_estate', targetWeight: 0.05, implementationSymbol: 'VNQ' },
    { assetClass: 'cash', targetWeight: 0.05 },
  ]},
  { id: 'mod-006', name: 'Education 529', benchmark: 'Education 529 glide-path benchmark', benchmarkKind: 'model_policy', description: 'Age-based education savings glide path', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.45, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.10, implementationSymbol: 'VXUS' },
    { assetClass: 'fixed_income', targetWeight: 0.35, implementationSymbol: 'AGG' }, { assetClass: 'cash', targetWeight: 0.10 },
  ]},
  { id: 'mod-007', name: 'Moderate Balanced', benchmark: 'Moderate Balanced policy benchmark', benchmarkKind: 'model_policy', description: 'Balanced model with a smaller equity share than Balanced Growth', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.35, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.10, implementationSymbol: 'EFA' },
    { assetClass: 'emerging_markets', targetWeight: 0.05, implementationSymbol: 'VWO' }, { assetClass: 'fixed_income', targetWeight: 0.35, implementationSymbol: 'AGG' },
    { assetClass: 'alternatives', targetWeight: 0.05, implementationSymbol: 'QAI' }, { assetClass: 'real_estate', targetWeight: 0.03, implementationSymbol: 'VNQ' },
    { assetClass: 'commodities', targetWeight: 0.02, implementationSymbol: 'GLD' }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
]

/** C24 · rebalancing — these were defined per model and displayed on Model Governance, but the
 *  rebalance engine never read them; a 7%-band model was treated identically to a 3%-band one.
 *  Shared by `computeDriftForAccount` and the models view, so the band shown to a model
 *  administrator is the same band the rebalance engine evaluates against. */
export type RebalanceFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'threshold_only'
export const MODEL_BANDS: Readonly<Record<string, { driftTolerance: number; rebalanceFrequency: RebalanceFrequency }>> = {
  'mod-001': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
  'mod-002': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
  'mod-003': { driftTolerance: 0.03, rebalanceFrequency: 'quarterly' },
  'mod-004': { driftTolerance: 0.07, rebalanceFrequency: 'threshold_only' },
  'mod-005': { driftTolerance: 0.05, rebalanceFrequency: 'monthly' },
  'mod-006': { driftTolerance: 0.05, rebalanceFrequency: 'semi_annual' },
  'mod-007': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
}
