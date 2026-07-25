import { http, HttpResponse } from 'msw'
import type { MetricsSummary } from '@/services/pms'
import type { DriftStatus } from '@/types/portfolio'
import type { RiskMetrics, FactorExposure, StressScenario } from '@/types/risk'
import type {
  BenchmarkComparison, PerformanceSeries, AttributionResult, AttributionResponse,
} from '@/types/performance'
import type { CurrencyCode } from '@/types/currency'
import { convertToBase } from '@/lib/currency'
import { accountValueUSD, deriveBookAUM, deriveHouseholdAUM, deriveSegmentAUM, herfindahlIndex, effectiveN } from '@/lib/aum'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import {
  RISK_FREE_RATE, assetClassWeights, portfolioBeta, portfolioVolatility,
  portfolioReturn1Y, assetClassReturn1Y, trackingError, parametricVaR, sharpe, sortino,
  downsideDeviation, modelledMaxDrawdown,
} from '@/lib/risk-model'
import { assetWeightedEffectiveFee, householdAnnualFee } from '@/lib/fees'
import { computeWaterfallDomain, type WaterfallBar } from '@/lib/waterfall'
import { MOCK_NOW_ISO, startOfToday } from '@/lib/clock'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { getPositionsForAccount } from '../data/positions'
import { accounts } from '../data/accounts'
import { households } from '../data/households'
import { householdFees } from '../data/billing'
import { notFound, roundTo } from './utils'

/** Convert an account's value from its base currency to USD using static FX rates */
function toUSD(value: number, baseCurrency?: CurrencyCode): number {
  if (!baseCurrency || baseCurrency === 'USD') return value
  return convertToBase(value, baseCurrency, FX_RATES_USD_BASE)
}

function computeMetrics(): MetricsSummary {
  const totalAUM = deriveBookAUM(accounts, FX_RATES_USD_BASE)
  return {
    totalAUM: Math.round(totalAUM),
    totalClients: new Set(accounts.map((a) => a.clientId)).size,
    pendingTasks: 14,
    meetingsToday: 4,
    alertCount: 3,
    netFlowsMTD: 1_250_000,
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

type AssetClassAllocation = { assetClass: string; targetWeight: number }

type ModelDefinition = {
  id: string
  name: string
  benchmark: string
  description: string
  assetClasses: AssetClassAllocation[]
}

const MODELS: ModelDefinition[] = [
  { id: 'mod-001', name: 'Balanced Growth', benchmark: 'S&P 500 / Agg 60/40', description: 'Core 60/40 model with growth tilt', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
    { assetClass: 'emerging_markets', targetWeight: 0.03 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
    { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
  { id: 'mod-002', name: 'Growth', benchmark: 'S&P 500', description: 'Equity-focused growth model', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.55 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
    { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 },
    { assetClass: 'cash', targetWeight: 0.03 },
  ]},
  { id: 'mod-003', name: 'Conservative Income', benchmark: 'Barclays Agg', description: 'Income-focused with capital preservation', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.20 }, { assetClass: 'intl_equity', targetWeight: 0.05 },
    { assetClass: 'fixed_income', targetWeight: 0.55 }, { assetClass: 'alternatives', targetWeight: 0.05 },
    { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
  ]},
  { id: 'mod-004', name: 'Aggressive Growth', benchmark: 'MSCI ACWI', description: 'High-growth equity allocation', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.50 }, { assetClass: 'intl_equity', targetWeight: 0.20 },
    { assetClass: 'emerging_markets', targetWeight: 0.10 }, { assetClass: 'fixed_income', targetWeight: 0.10 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
  { id: 'mod-005', name: 'Ultra-HNW Multi-Strategy', benchmark: 'Custom Blended', description: 'Multi-strategy for large accounts', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
    { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
    { assetClass: 'alternatives', targetWeight: 0.15 }, { assetClass: 'real_estate', targetWeight: 0.05 },
    { assetClass: 'cash', targetWeight: 0.05 },
  ]},
  { id: 'mod-006', name: 'Education 529', benchmark: 'Age-Based Glide', description: 'Age-based education savings glide path', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.45 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
    { assetClass: 'fixed_income', targetWeight: 0.35 }, { assetClass: 'cash', targetWeight: 0.10 },
  ]},
  { id: 'mod-007', name: 'Moderate Balanced', benchmark: 'S&P 500 / Agg 50/50', description: 'Balanced 50/50 equity-bond split', assetClasses: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
    { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.35 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
    { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ]},
]

function getModelByIndex(index: number): ModelDefinition {
  const model = MODELS[index]
  if (!model) throw new Error(`Model at index ${index} not found`)
  return model
}

function getModelTargets(modelId: string): Record<string, number> {
  const model = MODELS.find((m) => m.id === modelId) ?? getModelByIndex(0)
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
 * part of the portfolio's return, not a decoration on top of it. `riskProfileFor` therefore adds
 * it to `ret`. Leaving it out there while the attribution counts it would put the benchmark
 * table's portfolio return and the Sharpe numerator Σ(selection + interaction) below what the
 * attribution page reports — the same two-numbers-for-one-thing defect this phase exists to
 * remove.
 */
const SELECTION_EDGE: Record<string, number> = {
  us_equity: 0.008, intl_equity: 0.002, emerging_markets: -0.002, fixed_income: -0.001,
  alternatives: 0.003, real_estate: 0.000, commodities: 0.001, cash: 0.000,
  digital_assets: 0.010, private_equity: 0.004,
}

/** Σ wᵢ·edgeᵢ — the account-level manager edge implied by its asset-class weights. */
function portfolioSelectionEdge(weights: ReadonlyMap<string, number>): number {
  let edge = 0
  for (const [ac, w] of weights) edge += w * (SELECTION_EDGE[ac] ?? 0)
  return edge
}

/**
 * The one place per-account risk is derived, so the risk tab, the benchmark table, the
 * performance chart and the Monte Carlo curve all quote the same μ, σ and β.
 *
 * Rounding happens here, not in `@/lib/risk-model` — per the `aum.ts` convention the pure module
 * stays at full precision and its callers round. σ is rounded to 4dp *before* it reaches
 * `parametricVaR`; feeding the raw value instead shifts VaR by tens of dollars on a large account.
 */
function riskProfileFor(account: typeof accounts[0]) {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const weights = assetClassWeights(positions)
  const model = MODELS.find((m) => m.id === account.modelId) ?? getModelByIndex(0)
  const benchWeights = new Map(model.assetClasses.map((a) => [a.assetClass, a.targetWeight]))
  return {
    weights,
    benchWeights,
    modelId: model.id,
    benchmarkName: model.benchmark,
    value: accountUSD(account),
    beta: roundTo(portfolioBeta(weights), 2),
    vol: roundTo(portfolioVolatility(weights), 4),
    // Index return of the account's asset-class mix plus the manager edge those holdings are
    // modelled to earn inside each class. The edge is the whole of the attribution's selection and
    // interaction effect, so it belongs in the account's return rather than only in the
    // attribution — see SELECTION_EDGE.
    ret: roundTo(portfolioReturn1Y(weights) + portfolioSelectionEdge(weights), 4),
    benchReturn: roundTo(portfolioReturn1Y(benchWeights), 4),
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
function periodYears(): Record<string, number> {
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
function attributionFor(account: typeof accounts[0], years: number): Attribution {
  const p = riskProfileFor(account)
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

  return { rows, totals, benchmarkReturn, benchmarkName: p.benchmarkName }
}

function computeDriftForAccount(account: typeof accounts[0]): DriftStatus {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const targets = getModelTargets(account.modelId ?? 'mod-001')

  const actualWeights = new Map<string, number>()
  for (const pos of positions) {
    actualWeights.set(pos.assetClass, (actualWeights.get(pos.assetClass) ?? 0) + pos.weight)
  }

  const allClasses = new Set([...Object.keys(targets), ...actualWeights.keys()])
  const assetClassDrifts: DriftStatus['assetClassDrifts'] = [...allClasses]
    .map((ac) => ({
      assetClass: ac as DriftStatus['assetClassDrifts'][0]['assetClass'],
      target: targets[ac] ?? 0,
      actual: actualWeights.get(ac) ?? 0,
      drift: roundTo(Math.abs((actualWeights.get(ac) ?? 0) - (targets[ac] ?? 0)), 3),
    }))
    .filter((d) => d.target > 0 || d.actual > 0)

  const totalDrift = roundTo(Math.max(...assetClassDrifts.map((d) => d.drift), 0), 3)

  return {
    accountId: account.id,
    totalDrift,
    assetClassDrifts,
    lastCalculated: '2026-02-25T08:00:00Z',
    needsRebalance: totalDrift > 0.03,
  }
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
    return HttpResponse.json(accounts.map(computeDriftForAccount))
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
    const p = riskProfileFor(account)
    return HttpResponse.json(generatePerformanceSeries(24, {
      accountId: account.id,
      modelId: p.modelId,
      annualReturn: p.ret,
      annualVol: p.vol,
      benchReturn: p.benchReturn,
      benchVol: p.benchVol,
    }))
  }),

  http.get('/api/pms/accounts/:accountId/benchmark', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()

    // Returns are cumulative over the period, compounded from the annual asset-class figures.
    // Both sides come from `attributionFor`, the same helper the attribution endpoint uses, so
    // the benchmark table's active return and Σ(allocation + selection + interaction) are the
    // same quantity rather than two derivations that happen to be close.
    const comparisons: BenchmarkComparison[] = Object.entries(periodYears()).map(([period, years]) => {
      const a = attributionFor(account, years)
      const benchmarkReturn = roundTo(a.benchmarkReturn, 4)
      // C6 · performance-reporting — this is active (excess) return, not Jensen's alpha. It is
      // the attribution's own total rounded once, not Rp and Rb rounded separately and then
      // subtracted: on a month-to-date window those two differ by a full basis point, which is
      // most of the figure. Rp is then published as Rb + active so the row adds up as printed.
      const activeReturn = roundTo(a.totals.total, 4)
      return {
        period: period as BenchmarkComparison['period'],
        portfolioReturn: roundTo(benchmarkReturn + activeReturn, 4),
        benchmarkReturn,
        activeReturn,
      }
    })
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
        // The delta-normal form is unbounded below, so at extreme quantiles on a very high-σ
        // account (acc-045, σ = 0.636) `1 + μ + σz` goes negative — a projected account value
        // below zero. A portfolio cannot be worth less than nothing, so the displayed value is
        // floored at zero. The floor is a display bound only: μ, σ and the method are unchanged,
        // and the caption on the page discloses that the normal form admits sub-zero values here.
        const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99].map((pct) => ({
          percentile: pct,
          value: roundTo(Math.max(0, value * (1 + mu + sigma * inverseNormalCDF(pct / 100))), 2),
        }))
        // Same bound on the other axis. The μ − 3σ domain runs to −150% for acc-045, and a
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
    return HttpResponse.json(hhAccounts.map(computeDriftForAccount))
  }),

  http.get('/api/pms/households/:householdId/allocation', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return notFound()

    // FX-aware aggregation: convert each account's positions to USD before combining
    const byClass = new Map<string, number>()
    for (const acc of hhAccounts) {
      const positions = getPositionsForAccount(acc.id, acc.totalValue)
      for (const pos of positions) {
        const usdValue = toUSD(pos.marketValue, acc.baseCurrency)
        byClass.set(pos.assetClass, (byClass.get(pos.assetClass) ?? 0) + usdValue)
      }
    }
    const totalValue = [...byClass.values()].reduce((sum, v) => sum + v, 0)

    return HttpResponse.json(
      [...byClass.entries()].map(([assetClass, value]) => ({
        assetClass,
        weight: roundTo(value / totalValue, 3),
        value: Math.round(value),
      })),
    )
  }),

  http.get('/api/pms/models/governance', () => {
    const modelGovernance = [
      {
        id: 'mod-001', name: 'Balanced Growth', benchmark: 'S&P 500 / Agg 60/40',
        description: 'Core 60/40 model with growth tilt',
        riskProfile: 'moderate', currentVersion: 3, assignedAccounts: 14, totalAUM: 42_350_000,
        lastRebalanceDate: '2026-02-10', driftTolerance: 0.05, rebalanceFrequency: 'quarterly',
        assetClasses: getModelByIndex(0).assetClasses,
        versions: [
          {
            version: 3, effectiveDate: '2026-01-15', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2026-01-14',
            changes: [
              { id: 'chg-001', type: 'weight_change', description: 'Reduced emerging markets from 5% to 3%', assetClass: 'emerging_markets', oldValue: 0.05, newValue: 0.03 },
              { id: 'chg-002', type: 'weight_change', description: 'Increased fixed income from 28% to 30%', assetClass: 'fixed_income', oldValue: 0.28, newValue: 0.30 },
            ],
            assetClasses: getModelByIndex(0).assetClasses,
          },
          {
            version: 2, effectiveDate: '2025-07-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-06-28',
            changes: [
              { id: 'chg-003', type: 'weight_change', description: 'Increased US equity from 38% to 40%', assetClass: 'us_equity', oldValue: 0.38, newValue: 0.40 },
              { id: 'chg-004', type: 'weight_change', description: 'Reduced cash from 7% to 5%', assetClass: 'cash', oldValue: 0.07, newValue: 0.05 },
            ],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.28 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
              { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
            ],
          },
          {
            version: 1, effectiveDate: '2025-01-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-005', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.38 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.28 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
              { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.07 },
            ],
          },
        ],
      },
      {
        id: 'mod-002', name: 'Growth', benchmark: 'S&P 500',
        description: 'Equity-focused growth model',
        riskProfile: 'moderate_aggressive', currentVersion: 2, assignedAccounts: 8, totalAUM: 28_120_000,
        lastRebalanceDate: '2026-02-12', driftTolerance: 0.05, rebalanceFrequency: 'quarterly',
        assetClasses: getModelByIndex(1).assetClasses,
        versions: [
          {
            version: 2, effectiveDate: '2025-10-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-09-25',
            changes: [
              { id: 'chg-006', type: 'weight_change', description: 'Increased intl equity from 12% to 15%', assetClass: 'intl_equity', oldValue: 0.12, newValue: 0.15 },
              { id: 'chg-007', type: 'weight_change', description: 'Reduced US equity from 58% to 55%', assetClass: 'us_equity', oldValue: 0.58, newValue: 0.55 },
            ],
            assetClasses: getModelByIndex(1).assetClasses,
          },
          {
            version: 1, effectiveDate: '2025-01-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-008', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.58 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 },
              { assetClass: 'cash', targetWeight: 0.03 },
            ],
          },
        ],
      },
      {
        id: 'mod-003', name: 'Conservative Income', benchmark: 'Barclays Agg',
        description: 'Income-focused with capital preservation',
        riskProfile: 'conservative', currentVersion: 2, assignedAccounts: 6, totalAUM: 15_800_000,
        lastRebalanceDate: '2026-01-28', driftTolerance: 0.03, rebalanceFrequency: 'quarterly',
        assetClasses: getModelByIndex(2).assetClasses,
        versions: [
          {
            version: 2, effectiveDate: '2025-09-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-08-27',
            changes: [
              { id: 'chg-009', type: 'weight_change', description: 'Increased fixed income from 50% to 55%', assetClass: 'fixed_income', oldValue: 0.50, newValue: 0.55 },
              { id: 'chg-010', type: 'weight_change', description: 'Reduced US equity from 25% to 20%', assetClass: 'us_equity', oldValue: 0.25, newValue: 0.20 },
            ],
            assetClasses: getModelByIndex(2).assetClasses,
          },
          {
            version: 1, effectiveDate: '2025-01-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-011', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.25 }, { assetClass: 'intl_equity', targetWeight: 0.05 },
              { assetClass: 'fixed_income', targetWeight: 0.50 }, { assetClass: 'alternatives', targetWeight: 0.05 },
              { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
            ],
          },
        ],
      },
      {
        id: 'mod-004', name: 'Aggressive Growth', benchmark: 'MSCI ACWI',
        description: 'High-growth equity allocation',
        riskProfile: 'aggressive', currentVersion: 1, assignedAccounts: 4, totalAUM: 8_450_000,
        lastRebalanceDate: '2026-02-05', driftTolerance: 0.07, rebalanceFrequency: 'threshold_only',
        assetClasses: getModelByIndex(3).assetClasses,
        versions: [
          {
            version: 1, effectiveDate: '2025-01-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-012', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: getModelByIndex(3).assetClasses,
          },
        ],
      },
      {
        id: 'mod-005', name: 'Ultra-HNW Multi-Strategy', benchmark: 'Custom Blended',
        description: 'Multi-strategy for large accounts',
        riskProfile: 'moderate_aggressive', currentVersion: 3, assignedAccounts: 3, totalAUM: 18_900_000,
        lastRebalanceDate: '2026-01-20', driftTolerance: 0.05, rebalanceFrequency: 'monthly',
        assetClasses: getModelByIndex(4).assetClasses,
        versions: [
          {
            version: 3, effectiveDate: '2026-02-01', author: 'Sarah Kim, CIO', status: 'pending_approval',
            changes: [
              { id: 'chg-013', type: 'weight_change', description: 'Proposed increase in alternatives from 15% to 18%', assetClass: 'alternatives', oldValue: 0.15, newValue: 0.18 },
              { id: 'chg-014', type: 'weight_change', description: 'Proposed reduction in fixed income from 20% to 17%', assetClass: 'fixed_income', oldValue: 0.20, newValue: 0.17 },
            ],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.17 },
              { assetClass: 'alternatives', targetWeight: 0.18 }, { assetClass: 'real_estate', targetWeight: 0.05 },
              { assetClass: 'cash', targetWeight: 0.05 },
            ],
          },
          {
            version: 2, effectiveDate: '2025-06-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-05-28',
            changes: [
              { id: 'chg-015', type: 'security_add', description: 'Added private equity sleeve (BXPE)', assetClass: 'alternatives' },
              { id: 'chg-016', type: 'weight_change', description: 'Increased alternatives from 10% to 15%', assetClass: 'alternatives', oldValue: 0.10, newValue: 0.15 },
            ],
            assetClasses: getModelByIndex(4).assetClasses,
          },
          {
            version: 1, effectiveDate: '2025-01-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-017', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
              { assetClass: 'alternatives', targetWeight: 0.10 }, { assetClass: 'real_estate', targetWeight: 0.05 },
              { assetClass: 'cash', targetWeight: 0.05 },
            ],
          },
        ],
      },
      {
        id: 'mod-006', name: 'Education 529', benchmark: 'Age-Based Glide',
        description: 'Age-based education savings glide path',
        riskProfile: 'moderate', currentVersion: 1, assignedAccounts: 3, totalAUM: 1_850_000,
        lastRebalanceDate: '2026-01-15', driftTolerance: 0.05, rebalanceFrequency: 'semi_annual',
        assetClasses: getModelByIndex(5).assetClasses,
        versions: [
          {
            version: 1, effectiveDate: '2025-01-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-018', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: getModelByIndex(5).assetClasses,
          },
        ],
      },
      {
        id: 'mod-007', name: 'Moderate Balanced', benchmark: 'S&P 500 / Agg 50/50',
        description: 'Balanced 50/50 equity-bond split',
        riskProfile: 'moderate_conservative', currentVersion: 2, assignedAccounts: 2, totalAUM: 3_200_000,
        lastRebalanceDate: '2026-02-01', driftTolerance: 0.05, rebalanceFrequency: 'quarterly',
        assetClasses: getModelByIndex(6).assetClasses,
        versions: [
          {
            version: 2, effectiveDate: '2025-11-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-10-28',
            changes: [
              { id: 'chg-019', type: 'weight_change', description: 'Increased fixed income from 30% to 35%', assetClass: 'fixed_income', oldValue: 0.30, newValue: 0.35 },
              { id: 'chg-020', type: 'weight_change', description: 'Reduced US equity from 40% to 35%', assetClass: 'us_equity', oldValue: 0.40, newValue: 0.35 },
            ],
            assetClasses: getModelByIndex(6).assetClasses,
          },
          {
            version: 1, effectiveDate: '2025-01-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-021', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
              { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
            ],
          },
        ],
      },
    ]
    return HttpResponse.json(modelGovernance)
  }),

  http.get('/api/pms/models/:modelId', ({ params }) => {
    const model = MODELS.find((m) => m.id === params.modelId)
    if (!model) return notFound()
    return HttpResponse.json(model)
  }),

  // ── Book of Business ──
  http.get('/api/pms/book-of-business', () => {
    const totalAUM = deriveBookAUM(accounts, FX_RATES_USD_BASE)
    const clientCount = new Set(accounts.map((a) => a.clientId)).size

    // C29 · fee-billing — the effective fee is asset-weighted (Σ fees ÷ Σ AUM), reported in basis
    // points. It was previously the constant 0.85 rendered as "0.85 bps" — a 100× unit error — and
    // disagreed with Billing's 88 bps (an unweighted mean of 13 rates).
    const fees = householdFees.map((f) => ({
      aum: deriveHouseholdAUM(f.householdId, accounts, FX_RATES_USD_BASE),
      annualFee: householdAnnualFee(
        deriveHouseholdAUM(f.householdId, accounts, FX_RATES_USD_BASE), f.annualRate,
      ),
    }))
    const annualRevenue = fees.reduce((s, f) => s + f.annualFee, 0)
    const effectiveFeeBps = assetWeightedEffectiveFee(fees)

    const segments = deriveSegmentAUM(households, accounts, FX_RATES_USD_BASE).map((s) => ({
      segment: s.segment,
      householdCount: s.householdCount,
      aum: Math.round(s.aum),
      pctOfAUM: roundTo(s.pctOfAUM, 4),
    }))

    // AUM waterfall — trailing 12 months. Deltas are the leaf figures; both anchors are derived
    // so the bars reconcile exactly to the book total.
    const marketAppreciation = Math.round(totalAUM * 0.065)
    const newAssets = Math.round(totalAUM * 0.032)
    const withdrawals = -Math.round(totalAUM * 0.012)
    const attrition = -Math.round(totalAUM * 0.005)
    const startingAUM = Math.round(totalAUM) - marketAppreciation - newAssets - withdrawals - attrition
    const aumWaterfall: WaterfallBar[] = [
      { label: 'Starting AUM', value: startingAUM, kind: 'anchor' },
      { label: 'Market appreciation', value: marketAppreciation, kind: 'delta' },
      { label: 'New assets', value: newAssets, kind: 'delta' },
      { label: 'Withdrawals', value: withdrawals, kind: 'delta' },
      { label: 'Attrition', value: attrition, kind: 'delta' },
      { label: 'Current AUM', value: Math.round(totalAUM), kind: 'anchor' },
    ]

    // C29 · advisor-dashboards — organic growth is net of withdrawals and attrition. The 3.2%
    // previously shown was the gross new-asset line straight off the waterfall.
    const organicGrowthRate = roundTo(
      ((newAssets + withdrawals + attrition) / startingAUM) * 100, 1,
    )

    // C22 · diversification — one HHI scale (0–10,000), named for what it measures (AUM, not
    // revenue), reported with its effective-N companion. At 13 households the floor is 769.
    const shares = households.map((hh) => deriveHouseholdAUM(hh.id, accounts, FX_RATES_USD_BASE) / totalAUM)
    const concentrationHHI = Math.round(herfindahlIndex(shares))
    const concentrationEffectiveN = roundTo(effectiveN(herfindahlIndex(shares)), 1)

    // D30 · advisor-dashboards — losing 1 of 13 households is 92.3% retention, not 98.5%.
    const attritionCount = 1
    // D31 · advisor-dashboards — 120 clients on a $4.3M-average book implies a $520M practice.
    const targetClients = 75
    const avgMeetingsPerClient = 2.4
    const meetingsPerWeek = 12

    return HttpResponse.json({
      totalAUM: Math.round(totalAUM),
      householdCount: households.length,
      clientCount,
      annualRevenue: Math.round(annualRevenue),
      effectiveFeeBps: roundTo(effectiveFeeBps, 1),
      organicGrowthRate,
      retentionRate: roundTo(((households.length - attritionCount) / households.length) * 100, 1),
      attritionCount,
      concentrationHHI,
      concentrationEffectiveN,
      segments,
      aumWaterfall,
      aumWaterfallDomain: computeWaterfallDomain(aumWaterfall),
      asOf: MOCK_NOW_ISO,
      capacity: {
        currentClients: clientCount,
        targetClients,
        utilizationPct: roundTo((clientCount / targetClients) * 100, 1),
        avgMeetingsPerClient,
        meetingsPerWeek,
        meetingCapacityPct: roundTo((clientCount * avgMeetingsPerClient) / (meetingsPerWeek * 50) * 100, 1),
      },
    })
  }),
]
