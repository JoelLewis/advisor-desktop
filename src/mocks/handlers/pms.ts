import { http, HttpResponse } from 'msw'
import type { MetricsSummary, AllocationSlice } from '@/services/pms'
import type { AssetClass, DriftStatus, BenchmarkKind, Position } from '@/types/portfolio'
import type { RiskMetrics, FactorExposure, StressScenario } from '@/types/risk'
import type {
  BenchmarkComparison, PerformanceSeries, AttributionResult, AttributionResponse,
} from '@/types/performance'
import type { CurrencyCode } from '@/types/currency'
import type { Account } from '@/types/account'
import { convertToBase } from '@/lib/currency'
import { accountValueUSD, deriveBookAUM, herfindahlIndex, effectiveN } from '@/lib/aum'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import {
  RISK_FREE_RATE, assetClassWeights, portfolioBeta, portfolioVolatility,
  assetClassReturn1Y, trackingError, parametricVaR, sharpe, sortino,
  downsideDeviation, modelledMaxDrawdown,
} from '@/lib/risk-model'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO, startOfToday } from '@/lib/clock'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { getPositionsForAccount, seedPositionsForAccount } from '../data/positions'
import { ledgerFills } from '../data/portfolio-ledger'
import { accounts } from '../data/accounts'
import { nbas } from '../data/nbas'
import { complianceAlerts } from './compliance'
import { calendarEvents } from '../data/calendar'
import { notFound, roundTo } from './utils'

/** Convert an account's value from its base currency to USD using static FX rates */
function toUSD(value: number, baseCurrency?: CurrencyCode): number {
  if (!baseCurrency || baseCurrency === 'USD') return value
  return convertToBase(value, baseCurrency, FX_RATES_USD_BASE)
}

/**
 * D21 · advisor-dashboards — every count previously hardcoded here contradicted the module that
 * owned it: `pendingTasks: 14` against 20 active NBAs, `alertCount: 3` against 5 open compliance
 * alerts, `meetingsToday: 4` against whatever the calendar actually schedules for the frozen
 * "today", and `netFlowsMTD: 1_250_000` against the AI insight's own "+$420K". One count per fact:
 * this is now the single place that counts NBAs, alerts and meetings, and `ai.ts` reads the result
 * rather than recounting.
 */
const NET_FLOWS_MTD = 1_250_000

export function computeMetrics(): MetricsSummary {
  const totalAUM = deriveBookAUM(accounts, FX_RATES_USD_BASE)
  const activeNBAs = nbas.filter((n) => !n.dismissed)
  const openAlerts = complianceAlerts.filter((a) => !a.resolvedAt && a.reviewStatus !== 'approved')
  return {
    totalAUM: Math.round(totalAUM),
    totalClients: new Set(accounts.map((a) => a.clientId)).size,
    pendingTasks: activeNBAs.length,
    criticalCount: activeNBAs.filter((n) => n.priority === 'critical').length,
    meetingsToday: calendarEvents.filter((e) => e.startTime.startsWith(MOCK_TODAY_ISO)).length,
    alertCount: openAlerts.length,
    netFlowsMTD: NET_FLOWS_MTD,
    asOf: MOCK_NOW_ISO,
  }
}

// Seeded PRNG (LCG) for deterministic performance series per account
function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

function createSeededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) | 0
    return ((state >>> 0) / 0xFFFFFFFF)
  }
}

/** Box–Muller from a seeded uniform stream, so the series is deterministic per account. */
function seededNormal(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

type SeriesParams = {
  accountId: string
  modelId: string
  annualReturn: number
  annualVol: number
  benchReturn: number
  benchVol: number
}

/**
 * C34 · performance-reporting — the monthly series is drawn from the account's own μ and σ. The
 * previous uniform [−2%, +4%] draw was identical for every account and could not produce the
 * drawdown the risk tab reported alongside it.
 *
 * The benchmark line is drawn from the *model's* own μ and σ — the same `benchReturn` that drives
 * the benchmark comparison table — rather than from hand-typed 0.92/0.95 multiples of the
 * portfolio's. Two benchmark returns for one account on two tabs is the failure this phase exists
 * to remove. It is also seeded from the model, not the account, so every account tracking a given
 * benchmark sees the identical line: one index, one series.
 *
 * The series is trailing: it ends at the frozen clock and never runs into the future.
 */
function generatePerformanceSeries(months: number, p: SeriesParams): PerformanceSeries[] {
  const rand = createSeededRandom(hashSeed(p.accountId))
  const benchRand = createSeededRandom(hashSeed(p.modelId))
  const series: PerformanceSeries[] = []
  const muM = p.annualReturn / 12
  const sigmaM = p.annualVol / Math.sqrt(12)
  const benchMuM = p.benchReturn / 12
  const benchSigmaM = p.benchVol / Math.sqrt(12)
  let portfolioValue = 100
  let benchmarkValue = 100
  const anchor = startOfToday()
  for (let i = months; i >= 0; i--) {
    const date = new Date(anchor)
    date.setUTCMonth(date.getUTCMonth() - i)
    portfolioValue *= 1 + muM + sigmaM * seededNormal(rand)
    benchmarkValue *= 1 + benchMuM + benchSigmaM * seededNormal(benchRand)
    series.push({
      date: date.toISOString().slice(0, 10),
      value: roundTo(portfolioValue, 2),
      benchmark: roundTo(benchmarkValue, 2),
    })
  }
  return series
}

/**
 * An account's modeled monthly series. `today` draws it from today's holdings (what the attribution page
 * shows); `fixtures` from the holdings as the fixtures state them, so a release today cannot rewrite the
 * past that billing values quarter ends from.
 */
export function performanceSeriesFor(account: Account, basis: 'today' | 'fixtures' = 'today'): PerformanceSeries[] {
  const p = riskProfileFor(account, basis === 'fixtures' ? seedPositionsForAccount(account.id, account.totalValue) : undefined)
  return generatePerformanceSeries(24, {
    accountId: account.id, modelId: p.modelId, annualReturn: p.ret, annualVol: p.vol, benchReturn: p.benchReturn, benchVol: p.benchVol,
  })
}

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

type ModelDefinition = {
  id: string
  name: string
  benchmark: string
  benchmarkKind: BenchmarkKind
  description: string
  assetClasses: AssetClassAllocation[]
}

/**
 * §9.4 · `benchmark` is not a real external index return series for any model — `weightsFor` below
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
const MODELS: ModelDefinition[] = [
  { id: 'mod-001', name: 'Balanced Growth', benchmark: 'Balanced Growth policy benchmark', benchmarkKind: 'model_policy', description: 'Core 60/40 model with growth tilt', assetClasses: [
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
  { id: 'mod-007', name: 'Moderate Balanced', benchmark: 'Moderate Balanced policy benchmark', benchmarkKind: 'model_policy', description: 'Balanced 50/50 equity-bond split', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.35, implementationSymbol: 'VTI' }, { assetClass: 'intl_equity', targetWeight: 0.10, implementationSymbol: 'EFA' },
    { assetClass: 'emerging_markets', targetWeight: 0.05, implementationSymbol: 'VWO' }, { assetClass: 'fixed_income', targetWeight: 0.35, implementationSymbol: 'AGG' },
    { assetClass: 'alternatives', targetWeight: 0.05, implementationSymbol: 'QAI' }, { assetClass: 'real_estate', targetWeight: 0.03, implementationSymbol: 'VNQ' },
    { assetClass: 'commodities', targetWeight: 0.02, implementationSymbol: 'GLD' }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
]

/**
 * Exported for `model-implementation-invariants.test.ts`, which pins the two properties the
 * rebalance engine depends on and neither the type system nor a grep can enforce: every non-cash
 * sleeve names a symbol, and every symbol named resolves to a real USD price below.
 */
export const MODEL_DEFINITIONS: readonly ModelDefinition[] = MODELS

/**
 * The sleeve vehicles repeat across models because the firm runs one lineup — the same broad-market
 * ETF fills the same sleeve wherever it appears; that is the fact, not an accident of copying. The
 * one deliberate difference is `intl_equity`: models that carry a **separate** emerging-markets
 * sleeve implement it with EFA (MSCI EAFE — developed ex-North-America), because a total-ex-US fund
 * would double-count the EM sleeve sitting beside it. mod-003 and mod-006 have no EM sleeve, so
 * they use VXUS (FTSE Global All Cap ex-US, EM included) and get their emerging-markets exposure
 * inside the international allocation, which is what a 5%/10% international target in an
 * income or education model is meant to hold.
 */
function resolveModel(modelId: string): ModelDefinition {
  return MODELS.find((m) => m.id === modelId) ?? getModelByIndex(0)
}

/**
 * The same lookup **without** the fallback, for the one caller where guessing is not a display
 * degradation but a trade instruction. `resolveModel`'s `?? getModelByIndex(0)` is pre-existing and
 * defensible for `getModelTargets` — an unrecognised model there renders a
 * plausible target set rather than an empty page. Extending it to **security selection** is not the
 * same thing: an account on an unknown model would be told to buy mod-001's lineup, a Growth
 * equity lineup, with no signal that the model behind it was never found. It returns `undefined`
 * instead, and the engine proposes nothing for that sleeve.
 */
function findModel(modelId: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === modelId)
}

/**
 * Symbol -> quote, built from the positions of **USD-denominated accounts only**. The restriction
 * is the point: `positions.ts` prices each account's holdings in that account's own currency
 * (0700.HK at HK$380, SIE.DE at EUR 185.40), so a master built over every account would hand the
 * rebalance engine a mix of currencies wearing no label. Every symbol here is therefore a USD
 * quote, and `oms.ts` converts it into the buying account's currency exactly once.
 */
const USD_SECURITY_QUOTES: ReadonlyMap<string, { name: string; price: number; assetClass: AssetClass }> = (() => {
  const quotes = new Map<string, { name: string; price: number; assetClass: AssetClass }>()
  for (const account of accounts) {
    if ((account.baseCurrency ?? 'USD') !== 'USD') continue
    for (const position of getPositionsForAccount(account.id, account.totalValue)) {
      // CASH is a per-account balance masquerading as a price, not a quote for a tradeable security.
      if (position.symbol === 'CASH' || position.price <= 0) continue
      quotes.set(position.symbol, { name: position.name, price: position.price, assetClass: position.assetClass })
    }
  }
  return quotes
})()

export type ModelSecurity = { symbol: string; name: string; price: number }

/**
 * §9.7 · the security a model buys to fill `assetClass` when the account holds nothing in it, with
 * its **USD** price and name read from `positions.ts` rather than re-typed here — a hand-typed
 * price alongside the symbol is exactly the second copy Global Constraint 1 forbids, and a symbol
 * with no quote behind it produces a zero notional that the engine's `estimatedValue > 0` filter
 * drops silently, which looks identical to the bug this fixes.
 */
export function modelImplementationSecurity(modelId: string, assetClass: string): ModelSecurity | undefined {
  const symbol = findModel(modelId)?.assetClasses.find((ac) => ac.assetClass === assetClass)?.implementationSymbol
  if (!symbol) return undefined
  const quote = USD_SECURITY_QUOTES.get(symbol)
  if (!quote) return undefined
  return { symbol, name: quote.name, price: quote.price }
}

/** Exported so the invariant test checks the same map the engine reads, not a re-derivation. */
export function usdQuoteFor(symbol: string): { name: string; price: number; assetClass: AssetClass } | undefined {
  return USD_SECURITY_QUOTES.get(symbol)
}

/**
 * §0.4 · a model's display name ("mod-002" → "Growth"), from `MODELS` — the one place a model is
 * named. Throws on an unknown id: a name that silently fell back to another model's would label
 * one policy with another's name.
 */
export function modelDisplayName(modelId: string): string {
  const model = findModel(modelId)
  if (!model) throw new Error(`no model ${modelId}`)
  return model.name
}

function getModelByIndex(index: number): ModelDefinition {
  const model = MODELS[index]
  if (!model) throw new Error(`Model at index ${index} not found`)
  return model
}

function getModelTargets(modelId: string): Record<string, number> {
  // Same `MODELS` lookup the implementation-security resolver uses, so a sleeve's target weight
  // and the security that fills it can never be read off two different models. The two differ
  // only in what they do when the model is not found — see `findModel`.
  const model = resolveModel(modelId)
  const targets: Record<string, number> = {}
  for (const ac of model.assetClasses) {
    targets[ac.assetClass] = ac.targetWeight
  }
  return targets
}

function findAccount(accountId: string | readonly string[] | undefined): typeof accounts[0] | undefined {
  return accounts.find((a) => a.id === accountId)
}

/** C36 · currencies-and-fx — risk and sensitivity read a USD value, not the raw local-currency one. */
function accountUSD(account: typeof accounts[0]): number {
  return accountValueUSD(account, FX_RATES_USD_BASE)
}

/**
 * Deterministic per-asset-class manager selection edge, annualised: the amount by which the
 * account's holdings inside a class are modelled to beat that class's index.
 *
 * It is the only source of selection and interaction effect in the attribution, which makes it
 * part of the portfolio's return, not a decoration on top of it. There is no separate expression
 * for "the account's return" anywhere in this file — `periodReturnsFor` is the one derivation, and
 * it gets the edge through the attribution's own rows.
 */
const SELECTION_EDGE: Record<string, number> = {
  us_equity: 0.008, intl_equity: 0.002, emerging_markets: -0.002, fixed_income: -0.001,
  alternatives: 0.003, real_estate: 0.000, commodities: 0.001, cash: 0.000,
  digital_assets: 0.010, private_equity: 0.004,
}

/**
 * An account's own asset-class weights and the target weights of the model it tracks.
 *
 * Split out of `riskProfileFor` so that `attributionFor` can take the weights without taking the
 * returns: `riskProfileFor` now *sources* its returns from the attribution, and the two would
 * otherwise call each other.
 */
function weightsFor(account: Account, positions: readonly Position[] = getPositionsForAccount(account.id, account.totalValue)) {
  const model = MODELS.find((m) => m.id === account.modelId) ?? getModelByIndex(0)
  return {
    weights: assetClassWeights(positions),
    benchWeights: new Map(model.assetClasses.map((a) => [a.assetClass, a.targetWeight])),
    modelId: model.id,
    benchmarkName: model.benchmark,
  }
}

/**
 * The one place per-account risk is derived, so the risk tab, the performance chart and the Monte
 * Carlo curve all quote the same σ and β. μ is not derived here at all: it comes from
 * `periodReturnsFor`, which is also what the benchmark table publishes, so the returns quoted
 * across those surfaces are one number rather than two expressions for it.
 *
 * σ's rounding happens here, not in `@/lib/risk-model` — per the `aum.ts` convention the pure
 * module stays at full precision and its callers round. σ is rounded to 4dp *before* it reaches
 * `parametricVaR`; feeding the raw value instead shifts VaR by tens of dollars on a large account.
 */
export function riskProfileFor(account: Account, positions?: readonly Position[]) {
  const { weights, benchWeights, modelId, benchmarkName } = weightsFor(account, positions)
  // The account's own one-year return and its benchmark's, taken from the single derivation rather
  // than re-expressed here. `portfolioReturn1Y(weights) + Σ wᵢ·edgeᵢ` is algebraically the same
  // quantity, but it rounds at a different point and so disagreed with the benchmark table by one
  // unit in the fourth decimal on 12 of the 47 accounts — visible as 10.09% on the performance tab
  // against 10.08% on risk analytics for the same account on the same date.
  const oneYear = periodReturnsFor(account, 1, positions)
  return {
    weights,
    benchWeights,
    modelId,
    benchmarkName,
    value: accountUSD(account),
    beta: roundTo(portfolioBeta(weights), 2),
    vol: roundTo(portfolioVolatility(weights), 4),
    ret: oneYear.portfolioReturn,
    benchReturn: oneYear.benchmarkReturn,
    // Derived from the model's target weights by the same primitive as the portfolio's σ, so the
    // benchmark line on the chart carries the model's own risk rather than a multiple of the
    // account's.
    benchVol: roundTo(portfolioVolatility(benchWeights), 4),
    te: roundTo(trackingError(weights, benchWeights), 4),
  }
}

/**
 * Period lengths in years. The sub-annual ones are measured from the frozen clock rather than
 * hard-coded, so QTD and YTD agree in Q1 instead of the quarter reading longer than the year.
 */
export function periodYears(): Record<string, number> {
  const anchor = startOfToday()
  const y = anchor.getUTCFullYear()
  const m = anchor.getUTCMonth()
  const yearsSince = (start: Date) => (anchor.getTime() - start.getTime()) / 86_400_000 / 365
  return {
    mtd: yearsSince(new Date(Date.UTC(y, m, 1))),
    qtd: yearsSince(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))),
    ytd: yearsSince(new Date(Date.UTC(y, 0, 1))),
    '1y': 1,
    '3y': 3,
    '5y': 5,
    inception: 7.2,
  }
}

type Attribution = {
  rows: AttributionResult[]
  /** The same classes as `rows`, in order: the weights and the period returns each effect is computed from. */
  legs: { assetClass: string; wp: number; wb: number; rp: number; rb: number }[]
  totals: { allocation: number; selection: number; interaction: number; total: number }
  /** Σ wb·Rb,i — the benchmark's cumulative return over the period. Rp is Rb + totals.total. */
  benchmarkReturn: number
  benchmarkName: string
}

/**
 * Brinson-Fachler attribution for one account over one period. **This is the only place either
 * the attribution endpoint or the benchmark endpoint derives a portfolio or benchmark return.**
 * Two handlers computing the same decomposition independently is precisely how the three summary
 * cards came to disagree with the benchmark table.
 *
 * C3 · performance-attribution — the interaction effect is retained and totalled. The previous
 * implementation summed only allocation and selection, so the summary cards were short of active
 * return by the whole interaction term. It is reported as its own column and its own card, not
 * folded into selection: folding is a defensible presentation choice in some shops, but it is a
 * different decomposition and must not happen silently.
 *
 * The variant is **Brinson-Fachler**, so the allocation effect is measured against the benchmark's
 * *total* return:
 *
 *   allocation  = (wp − wb) × (Rb,i − Rb)
 *   selection   = wb × (Rp,i − Rb,i)
 *   interaction = (wp − wb) × (Rp,i − Rb,i)
 *
 * Brinson-Hood-Beebower would use `(wp − wb) × Rb,i` for allocation instead, which rewards
 * overweighting any class with a positive return rather than one that beat the benchmark. The
 * numbers alone do not reveal which is in use, so the response and the page caption name it.
 *
 * C2 · performance-attribution — Σ(A + S + I) = Rp − Rb holds exactly, not approximately. Both
 * weight sets sum to one (`assetClassWeights` normalises; every model's targets sum to 1.00), so
 * Σ(wp − wb) = 0, the −Rb in the allocation term cancels, and the three effects collapse to
 * Σ wp·Rp,i − Σ wb·Rb,i. The totals returned here are the totals of the *rounded* rows, so the
 * published cards add up to the published total as well.
 *
 * C1 · performance-attribution — the period is compounded from the annual class returns rather
 * than multiplied by an arbitrary scale factor, and compounding happens per asset class so that
 * Σ wb·Rb,i is the benchmark return for the period by construction. Sub-period geometric linking
 * (Carino, Menchero, GRAP) is **not** modelled; the response labels the model single-period
 * arithmetic rather than implying a rigour it does not have.
 */
export function attributionFor(account: Account, years: number, positions?: readonly Position[]): Attribution {
  const p = weightsFor(account, positions)
  const compound = (annual: number) => (1 + annual) ** years - 1

  const legs = [...new Set([...p.weights.keys(), ...p.benchWeights.keys()])].map((assetClass) => {
    const annualIndexReturn = assetClassReturn1Y(assetClass)
    return {
      assetClass,
      wp: p.weights.get(assetClass) ?? 0,
      wb: p.benchWeights.get(assetClass) ?? 0,
      rb: compound(annualIndexReturn),
      rp: compound(annualIndexReturn + (SELECTION_EDGE[assetClass] ?? 0)),
    }
  })

  const benchmarkReturn = legs.reduce((sum, l) => sum + l.wb * l.rb, 0)

  const rows: AttributionResult[] = legs.map((l) => {
    const allocation = roundTo((l.wp - l.wb) * (l.rb - benchmarkReturn), 6)
    const selection = roundTo(l.wb * (l.rp - l.rb), 6)
    const interaction = roundTo((l.wp - l.wb) * (l.rp - l.rb), 6)
    return {
      assetClass: l.assetClass as AttributionResult['assetClass'],
      allocation,
      selection,
      interaction,
      // The sum of the rounded parts, not the rounding of the sum, so the row reconciles on screen.
      total: roundTo(allocation + selection + interaction, 6),
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      allocation: roundTo(acc.allocation + r.allocation, 6),
      selection: roundTo(acc.selection + r.selection, 6),
      interaction: roundTo(acc.interaction + r.interaction, 6),
      total: roundTo(acc.total + r.total, 6),
    }),
    { allocation: 0, selection: 0, interaction: 0, total: 0 },
  )

  return { rows, legs, totals, benchmarkReturn, benchmarkName: p.benchmarkName }
}

/**
 * **The one place a cumulative return is published.** The benchmark table, Sharpe, Sortino, the
 * Monte Carlo mean and the performance series drift all read these three numbers, so "what this
 * portfolio returned" has exactly one value per account per period across the product.
 *
 * Rounding happens once, here, at publication rather than at derivation — `attributionFor` works
 * at full precision and the row effects carry 6dp. Rp is published as the sum of its own published
 * parts rather than as `roundTo(Rb + Σ(A + S + I), 4)`, because the two disagree by one unit in
 * the fourth decimal on 12 of the 47 accounts (acc-004, 010, 013, 014, 018, 021, 025, 031, 032,
 * 034, 038 and acc-044) and only this form leaves the published row footing: rounding the sum
 * instead moves the same 1e-4 discrepancy from *between* surfaces to *within* the row, where
 * `Rp − Rb` would stop equalling the active return on those same 12 accounts. One derivation, one
 * rounding, and the row adds up as printed.
 */
export function periodReturnsFor(account: Account, years: number, positions?: readonly Position[]) {
  const a = attributionFor(account, years, positions)
  const benchmarkReturn = roundTo(a.benchmarkReturn, 4)
  // C6 · performance-reporting — active (excess) return, not Jensen's alpha. It is the
  // attribution's own total rounded once: rounding Rp and Rb separately and subtracting differs
  // from it by a full basis point on a month-to-date window, which is most of the figure.
  const activeReturn = roundTo(a.totals.total, 4)
  return {
    portfolioReturn: roundTo(benchmarkReturn + activeReturn, 4),
    benchmarkReturn,
    activeReturn,
  }
}

/** C24 · rebalancing — these were defined per model and displayed on Model Governance, but the
 *  rebalance engine never read them; a 7%-band model was treated identically to a 3%-band one.
 *  Shared by `computeDriftForAccount` and the models view, so the band shown to a model
 *  administrator is the same band the rebalance engine evaluates against. */
type RebalanceFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'threshold_only'
export const MODEL_BANDS: Readonly<Record<string, { driftTolerance: number; rebalanceFrequency: RebalanceFrequency }>> = {
  'mod-001': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
  'mod-002': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
  'mod-003': { driftTolerance: 0.03, rebalanceFrequency: 'quarterly' },
  'mod-004': { driftTolerance: 0.07, rebalanceFrequency: 'threshold_only' },
  'mod-005': { driftTolerance: 0.05, rebalanceFrequency: 'monthly' },
  'mod-006': { driftTolerance: 0.05, rebalanceFrequency: 'semi_annual' },
  'mod-007': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
}

// Exported so `oms.ts`'s rebalance trade generator reads the same drift the drift surface does,
// rather than a second computation.
//
// §9.7 / Task 9 · `modelIdOverride` answers "what would this account's drift be against *that*
// model" — the question the model-trade screen exists to ask, since it can propose migrating an
// account onto a model it is not currently assigned to. Omitted, it is the account's own model
// and every existing caller is unchanged. The override is deliberately the **only** thing that
// varies: the positions, the renormalisation and the two drift metrics are the same derivation
// the drift surface publishes, so a migration preview and the drift page cannot disagree about
// what drift means. An unknown model id throws rather than falling back to mod-001 — a silently
// substituted model here would be a trade instruction against a policy nobody chose.
export function computeDriftForAccount(account: typeof accounts[0], modelIdOverride?: string): DriftStatus {
  const drift = computeDriftForHoldings(account, getPositionsForAccount(account.id, account.totalValue), modelIdOverride)
  return { ...drift, lastCalculated: holdingsAsOf(account.id) }
}

/** When the account's holdings last changed: its latest fill this session, else the fixtures' as-of. */
function holdingsAsOf(accountId: string): string {
  return ledgerFills().filter((f) => f.accountId === accountId).reduce<string>((latest, f) => (f.at > latest ? f.at : latest), MOCK_NOW_ISO)
}

/** What drift reads from a holding: its asset class and its weight in the account. */
export type DriftHolding = Pick<Position, 'assetClass' | 'weight'>

/**
 * §0.6 · the drift derivation itself, over any set of holdings. `computeDriftForAccount` runs it on
 * the account's positions today; the rebalance preview runs it on the same positions with the
 * proposed trades applied, so current and projected drift are one function, not two.
 */
export function computeDriftForHoldings(account: typeof accounts[0], positions: readonly DriftHolding[], modelIdOverride?: string): DriftStatus {
  const modelId = modelIdOverride ?? account.modelId ?? 'mod-001'
  const targets = getModelTargets(modelId)
  const band = MODEL_BANDS[modelId]
  if (!band) throw new Error(`no drift band defined for model ${modelId}`)

  const totalWeight = positions.reduce((s, p) => s + p.weight, 0) || 1
  const actualWeights = new Map<string, number>()
  for (const pos of positions) {
    actualWeights.set(pos.assetClass, (actualWeights.get(pos.assetClass) ?? 0) + pos.weight / totalWeight)
  }

  const allClasses = new Set([...Object.keys(targets), ...actualWeights.keys()])
  const assetClassDrifts: DriftStatus['assetClassDrifts'] = [...allClasses]
    .map((ac) => {
      const actual = actualWeights.get(ac) ?? 0
      const target = targets[ac] ?? 0
      // C24 — signed, so the UI can say "overweight" or "underweight" rather than "drifted".
      return { assetClass: ac as DriftStatus['assetClassDrifts'][0]['assetClass'], target, actual, drift: roundTo(actual - target, 4) }
    })
    .filter((d) => d.target > 0 || d.actual > 0)

  // Two distinct metrics, deliberately not conflated:
  //  - totalDrift: total portfolio drift, the classic half-sum-of-absolute-deviations. Because
  //    actual and target weights each sum to ~1, every overweight class is balanced by an
  //    underweight elsewhere, so summing |drift| double-counts the imbalance — halving it gives
  //    the fraction of the portfolio that must trade to reach target.
  //  - maxAbsDrift: the single worst asset-class breach, which is what a band actually gates —
  //    a model rebalances when any one class breaches its tolerance, not when the portfolio-wide
  //    total does.
  const sumAbsDrift = assetClassDrifts.reduce((s, d) => s + Math.abs(d.drift), 0)
  const totalDrift = roundTo(sumAbsDrift / 2, 4)
  const maxAbsDrift = roundTo(Math.max(...assetClassDrifts.map((d) => Math.abs(d.drift)), 0), 4)

  return {
    accountId: account.id,
    modelId,
    driftTolerance: band.driftTolerance,
    rebalanceFrequency: band.rebalanceFrequency,
    totalDrift,
    maxAbsDrift,
    assetClassDrifts,
    lastCalculated: MOCK_NOW_ISO,
    needsRebalance: maxAbsDrift > band.driftTolerance,
  }
}

/**
 * FX-aware allocation aggregation shared by the household and client allocation endpoints:
 * convert every position's market value to USD before combining by asset class, so mixed-
 * currency entities (e.g. hh-002's HKD and SGD accounts) aggregate correctly. One derivation,
 * two consumers — keeps the two endpoints from drifting apart on rounding or ordering.
 */
function deriveAllocationByAssetClass(entityAccounts: readonly (typeof accounts)[0][]): AllocationSlice[] {
  const byClass = new Map<string, number>()
  for (const acc of entityAccounts) {
    for (const pos of getPositionsForAccount(acc.id, acc.totalValue)) {
      byClass.set(pos.assetClass, (byClass.get(pos.assetClass) ?? 0)
        + toUSD(pos.marketValue, acc.baseCurrency))
    }
  }
  const total = [...byClass.values()].reduce((sum, v) => sum + v, 0)
  return [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass, weight: roundTo(value / total, 3), value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * C8 · historical-risk — the Bloomberg Aggregate was flat-to-positive Sep-08 → Mar-09; the
 * flight-to-quality Treasury rally is the single most famous fixed-income fact about 2008.
 * C9 · historical-risk — impacts are computed from the account's own holdings, so the position
 * rows reconcile to the headline by construction.
 */
type StressFactorSet = {
  id: string
  name: string
  description: string
  factors: Record<string, number>
}

const STRESS_FACTORS: StressFactorSet[] = [
  {
    id: 'stress-001', name: '2008 financial crisis',
    description: 'Replay of September 2008 – March 2009 factor returns',
    factors: {
      us_equity: -0.45, intl_equity: -0.50, emerging_markets: -0.55, fixed_income: 0.03,
      alternatives: -0.20, real_estate: -0.42, commodities: -0.30, cash: 0.00,
      digital_assets: -0.60, private_equity: -0.35,
    },
  },
  {
    id: 'stress-002', name: 'Rising rate shock (+300bp)',
    description: 'Parallel 300 basis-point increase in the yield curve',
    factors: {
      us_equity: -0.10, intl_equity: -0.09, emerging_markets: -0.12, fixed_income: -0.18,
      alternatives: -0.04, real_estate: -0.22, commodities: -0.03, cash: 0.01,
      digital_assets: -0.15, private_equity: -0.14,
    },
  },
  {
    id: 'stress-003', name: 'Pandemic selloff (March 2020)',
    description: 'Replay of February – March 2020 factor returns',
    factors: {
      us_equity: -0.34, intl_equity: -0.33, emerging_markets: -0.31, fixed_income: -0.03,
      alternatives: -0.12, real_estate: -0.40, commodities: -0.25, cash: 0.00,
      digital_assets: -0.50, private_equity: -0.28,
    },
  },
]

/**
 * Acklam's inverse normal CDF, accurate to ~1e-9 over (0,1). Used to place percentiles on the
 * same curve the histogram draws, rather than from a second, unrelated table of multipliers.
 */
function inverseNormalCDF(q: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const pLow = 0.02425
  if (q < pLow) {
    const u = Math.sqrt(-2 * Math.log(q))
    return (((((c[0]! * u + c[1]!) * u + c[2]!) * u + c[3]!) * u + c[4]!) * u + c[5]!) /
      ((((d[0]! * u + d[1]!) * u + d[2]!) * u + d[3]!) * u + 1)
  }
  if (q > 1 - pLow) return -inverseNormalCDF(1 - q)
  const u = q - 0.5
  const r = u * u
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * u /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
}

export const pmsHandlers = [
  http.get('/api/pms/metrics', () => {
    return HttpResponse.json(computeMetrics())
  }),

  http.get('/api/pms/drift/summary', () => {
    return HttpResponse.json(accounts.map((a) => computeDriftForAccount(a)))
  }),

  http.get('/api/pms/accounts/:accountId/positions', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(getPositionsForAccount(account.id, account.totalValue))
  }),

  http.get('/api/pms/accounts/:accountId/holdings', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const positions = getPositionsForAccount(account.id, account.totalValue)
    const targets = getModelTargets(account.modelId ?? 'mod-001')

    const groups = new Map<string, { targetWeight: number; actualWeight: number; positions: typeof positions }>()
    for (const pos of positions) {
      const existing = groups.get(pos.assetClass)
      if (existing) {
        existing.actualWeight += pos.weight
        existing.positions.push(pos)
      } else {
        groups.set(pos.assetClass, {
          targetWeight: targets[pos.assetClass] ?? 0,
          actualWeight: pos.weight,
          positions: [pos],
        })
      }
    }

    return HttpResponse.json(
      [...groups.entries()].map(([assetClass, data]) => ({
        assetClass,
        targetWeight: data.targetWeight,
        actualWeight: roundTo(data.actualWeight, 3),
        drift: roundTo(Math.abs(data.actualWeight - data.targetWeight), 3),
        positions: data.positions,
      })),
    )
  }),

  http.get('/api/pms/accounts/:accountId/drift', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(computeDriftForAccount(account))
  }),

  http.get('/api/pms/accounts/:accountId/performance', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(performanceSeriesFor(account))
  }),

  http.get('/api/pms/accounts/:accountId/benchmark', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()

    // Returns are cumulative over the period, compounded from the annual asset-class figures, and
    // come from `periodReturnsFor` — the same single derivation the risk tab, the Monte Carlo mean
    // and the performance chart read. The active return here and Σ(allocation + selection +
    // interaction) on the attribution page are one quantity, not two that happen to be close.
    const comparisons: BenchmarkComparison[] = Object.entries(periodYears()).map(([period, years]) => ({
      period: period as BenchmarkComparison['period'],
      ...periodReturnsFor(account, years),
    }))
    return HttpResponse.json(comparisons)
  }),

  http.get('/api/pms/accounts/:accountId/attribution', ({ params, request }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const url = new URL(request.url)
    const period = url.searchParams.get('period') ?? 'ytd'
    // The same clock-derived period lengths the benchmark table uses. A second, hard-coded map
    // here would put the two endpoints on different windows for the same named period.
    const years = periodYears()[period] ?? 1

    const a = attributionFor(account, years)
    const response: AttributionResponse = {
      model: 'Brinson-Fachler',
      linking: 'single-period arithmetic',
      period,
      benchmark: a.benchmarkName,
      basis: 'gross of fees',
      asOf: MOCK_NOW_ISO,
      rows: a.rows,
      totals: a.totals,
      activeReturn: a.totals.total,
    }
    return HttpResponse.json(response)
  }),

  http.get('/api/pms/accounts/:accountId/risk', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const p = riskProfileFor(account)
    const dd = roundTo(downsideDeviation(p.vol), 4)
    // C5 · forward-risk — p.vol is already rounded to 4dp by riskProfileFor, which is required
    // before parametricVaR; the raw σ moves VaR by tens of dollars on a large account.
    const var95 = Math.round(parametricVaR(p.value, p.vol))

    const metrics: RiskMetrics = {
      beta: p.beta,
      sharpe: roundTo(sharpe(p.ret, p.vol), 2),
      sortino: roundTo(sortino(p.ret, dd), 2),
      maxDrawdown: roundTo(modelledMaxDrawdown(p.vol), 3),
      standardDeviation: p.vol,
      downsideDeviation: dd,
      riskFreeRate: RISK_FREE_RATE,
      var95,
      var95Percent: roundTo(var95 / p.value, 4),
      var95Horizon: '1 month',
      var95Confidence: 0.95,
      var95Method: 'parametric',
      benchmark: p.benchmarkName,
      trackingError: p.te,
      asOf: MOCK_NOW_ISO,
    }
    return HttpResponse.json(metrics)
  }),

  http.get('/api/pms/accounts/:accountId/factors', () => {
    const exposures: FactorExposure[] = [
      { factor: 'Market', exposure: 0.95, benchmark: 1.00 },
      { factor: 'Size (SMB)', exposure: -0.12, benchmark: 0.00 },
      { factor: 'Value (HML)', exposure: 0.08, benchmark: 0.05 },
      { factor: 'Momentum', exposure: 0.22, benchmark: 0.10 },
      { factor: 'Quality', exposure: 0.35, benchmark: 0.15 },
      { factor: 'Low Volatility', exposure: 0.18, benchmark: 0.10 },
      { factor: 'Yield', exposure: 0.14, benchmark: 0.20 },
    ]
    return HttpResponse.json(exposures)
  }),

  http.get('/api/pms/accounts/:accountId/stress', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const positions = getPositionsForAccount(account.id, account.totalValue)

    const scenarios: StressScenario[] = STRESS_FACTORS.map((scenario) => {
      const positionImpacts = positions.map((p) => {
        const impactPct = scenario.factors[p.assetClass] ?? 0
        return {
          positionId: p.id,
          symbol: p.symbol,
          name: p.name,
          currentValue: p.marketValue,
          projectedValue: p.marketValue * (1 + impactPct),
          impact: p.marketValue * impactPct,
          impactPercent: impactPct,
        }
      })
      const covered = positionImpacts.reduce((s, p) => s + p.currentValue, 0)
      // Left unrounded on purpose: C9 asks that Σ position impact equal portfolioImpact × Σ
      // position value exactly. Rounding this ratio to 4dp puts that reconciliation hundreds of
      // dollars out on a large account. The display layer rounds it, the API does not.
      const portfolioImpact = covered === 0
        ? 0
        : positionImpacts.reduce((s, p) => s + p.impact, 0) / covered
      return {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        portfolioImpact,
        positionImpacts,
      }
    })
    return HttpResponse.json(scenarios)
  }),

  http.get('/api/pms/accounts/:accountId/sensitivity', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const p = riskProfileFor(account)
    // C36 · currencies-and-fx — the ladders scale a USD value, not the raw local-currency one.
    const value = p.value

    return HttpResponse.json({
      interestRate: [
        { shock: -100, impact: value * 0.025 },
        { shock: -50, impact: value * 0.012 },
        { shock: 50, impact: value * -0.011 },
        { shock: 100, impact: value * -0.024 },
        { shock: 200, impact: value * -0.052 },
        { shock: 300, impact: value * -0.085 },
      ],
      equity: [
        { shock: -30, impact: value * -0.22 },
        { shock: -20, impact: value * -0.15 },
        { shock: -10, impact: value * -0.072 },
        { shock: 10, impact: value * 0.068 },
        { shock: 20, impact: value * 0.14 },
        { shock: 30, impact: value * 0.21 },
      ],
      credit: [
        { shock: -100, impact: value * 0.015 },
        { shock: -50, impact: value * 0.008 },
        { shock: 50, impact: value * -0.009 },
        { shock: 100, impact: value * -0.018 },
        { shock: 200, impact: value * -0.038 },
      ],
      monteCarlo: (() => {
        const mu = p.ret
        const sigma = p.vol
        // The delta-normal form is unbounded below, so at extreme quantiles on a high-σ account
        // `1 + μ + σz` goes negative — a projected account value below zero. A portfolio cannot be
        // worth less than nothing, so the displayed value is floored at zero. The floor is a
        // display bound only: μ, σ and the method are unchanged, and the caption on the page
        // discloses that the normal form admits sub-zero values here.
        //
        // No fixture account currently reaches it. acc-045 used to (σ = 0.636 when its weights
        // summed to 0.925 and the 9.4% cash weight was normalised away); at its real σ = 0.589 the
        // 1st percentile lands at 0.0166 of value. The floor stays because the bound is a property
        // of the method, not of today's book — see risk-invariants.test.ts.
        const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99].map((pct) => ({
          percentile: pct,
          value: roundTo(Math.max(0, value * (1 + mu + sigma * inverseNormalCDF(pct / 100))), 2),
        }))
        // Same bound on the other axis. The μ − 3σ domain runs to −138% for acc-045, and a
        // long-only unlevered portfolio cannot lose more than everything, so the domain starts at
        // −100% at the earliest. The probability the normal approximation places below total loss
        // is **truncated from the display, not redistributed**: each bar is still the raw Gaussian
        // density at its own return, so the visible bars sum to slightly less than the whole
        // distribution. Renormalising would hide the model's edge rather than disclose it, which
        // is why it is not done here and why the caption states the truncation.
        const TOTAL_LOSS = -1
        const lower = Math.max(TOTAL_LOSS, mu - 3 * sigma)
        const upper = mu + 3 * sigma
        const step = (upper - lower) / 29
        const histogram = Array.from({ length: 30 }, (_, i) => {
          const returnBucket = roundTo(lower + i * step, 4)
          const density = Math.exp(-0.5 * ((returnBucket - mu) / sigma) ** 2)
          return { returnBucket, frequency: Math.round(density * 1000) }
        })
        return {
          // C7 · forward-risk — one distribution drives both the table and the chart, and the
          // method is stated rather than asserting 10,000 simulations that never ran.
          //
          // "normal", not "lognormal", and deliberately so: returns are placed arithmetically as
          // `1 + μ + σz` and the histogram is a Gaussian density in return space, which is the
          // delta-normal form. Lognormal VaR takes a different form entirely (`exp(μ + σz)`). The
          // label was corrected to match the maths — do not change it back without changing the
          // maths, and do not change the maths: the delta-normal form is the intended one.
          method: 'closed-form normal' as const,
          horizon: '1Y',
          expectedReturn: mu,
          volatility: sigma,
          baseValue: value,
          percentiles,
          histogram,
        }
      })(),
    })
  }),

  http.get('/api/pms/accounts/:accountId/concentration', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const positions = getPositionsForAccount(account.id, account.totalValue)

    const sorted = [...positions].sort((a, b) => b.weight - a.weight)
    const concentrationMetrics = sorted.map((pos) => {
      const kind = securityKind(pos.symbol, pos.assetClass)
      const limit = concentrationLimitFor(kind)
      return {
        positionId: pos.id,
        symbol: pos.symbol,
        name: pos.name,
        assetClass: pos.assetClass,
        marketValue: pos.marketValue,
        weight: pos.weight,
        kind,
        limit,
        limitBasis: kind === 'single_name' ? 'Single issuer (IPS)'
          : kind === 'fund' ? 'Pooled vehicle (IPS)'
          : 'Cash and equivalents (IPS)',
        breached: pos.weight > limit,
      }
    })

    const singleNames = concentrationMetrics.filter((c) => c.kind === 'single_name')
    const totalWeight = positions.reduce((s, p) => s + p.weight, 0) || 1
    const top10Weight = sorted.slice(0, 10).reduce((s, p) => s + p.weight, 0)

    return HttpResponse.json({
      positions: concentrationMetrics,
      summary: {
        top10Weight: roundTo(top10Weight, 3),
        // C22 · diversification — one HHI scale across the product (0–10,000), with effective N.
        herfindahlIndex: Math.round(herfindahlIndex(positions.map((p) => p.weight / totalWeight))),
        effectiveN: roundTo(effectiveN(herfindahlIndex(positions.map((p) => p.weight / totalWeight))), 1),
        singleNameWeight: roundTo(singleNames.reduce((s, c) => s + c.weight, 0), 3),
        largestSingleName: singleNames[0]
          ? { symbol: singleNames[0].symbol, weight: singleNames[0].weight }
          : null,
        breachCount: concentrationMetrics.filter((c) => c.breached).length,
        totalPositions: positions.length,
      },
    })
  }),

  http.get('/api/pms/models', () => {
    return HttpResponse.json(MODELS)
  }),

  http.get('/api/pms/households/:householdId/positions', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return notFound()
    return HttpResponse.json(hhAccounts.flatMap((a) => getPositionsForAccount(a.id, a.totalValue)))
  }),

  http.get('/api/pms/households/:householdId/drift', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return notFound()
    return HttpResponse.json(hhAccounts.map((a) => computeDriftForAccount(a)))
  }),

  http.get('/api/pms/households/:householdId/allocation', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return notFound()
    return HttpResponse.json(deriveAllocationByAssetClass(hhAccounts))
  }),

  http.get('/api/pms/clients/:clientId/allocation', ({ params }) => {
    const clientAccounts = accounts.filter((a) => a.clientId === params.clientId)
    if (clientAccounts.length === 0) return notFound()
    return HttpResponse.json(deriveAllocationByAssetClass(clientAccounts))
  }),

  http.get('/api/pms/models/:modelId', ({ params }) => {
    const model = MODELS.find((m) => m.id === params.modelId)
    if (!model) return notFound()
    return HttpResponse.json(model)
  }),
]
