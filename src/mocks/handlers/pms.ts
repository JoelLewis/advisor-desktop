import { http, HttpResponse } from 'msw'
import type { AssetClass, DriftStatus, Position } from '@/types/portfolio'
import type { StressScenario } from '@/types/risk'
import type {
  PerformanceSeries, AttributionResult,
} from '@/types/performance'
import type { Account, ModelManagedAccount } from '@/types/account'
import { UnknownModelError, isModelManaged, modelIdFor } from '@/lib/mandate'
import { accountValueUSD, herfindahlIndex, effectiveN } from '@/lib/aum'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import {
  assetClassWeights, portfolioBeta, portfolioVolatility,
  assetClassReturn1Y, trackingError,
} from '@/lib/risk-model'
import { MOCK_NOW_ISO, startOfToday } from '@/lib/clock'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { getPositionsForAccount, seedPositionsForAccount } from '../data/positions'
import { ledgerFills } from '../data/portfolio-ledger'
import { refuseExternal } from './workspace-http'
import { accounts } from '../data/accounts'
import { notFound, roundTo } from './utils'
import { MODEL_BANDS, MODEL_DEFINITIONS, type ModelDefinition } from '../data/model-definitions'

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
  /** The model's id, or a custom mandate's account id: every account on one benchmark sees one line. */
  benchmarkId: string
  annualReturn: number
  annualVol: number
  benchReturn: number
  benchVol: number
}

/**
 * The monthly series is drawn from the account's own μ and σ. The
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
  const benchRand = createSeededRandom(hashSeed(p.benchmarkId))
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
    accountId: account.id, benchmarkId: p.benchmarkId, annualReturn: p.ret, annualVol: p.vol, benchReturn: p.benchReturn, benchVol: p.benchVol,
  })
}


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
function requireModel(modelId: string): ModelDefinition {
  const model = findModel(modelId)
  if (!model) throw new UnknownModelError(modelId)
  return model
}

/**
 * The lookup without a throw, for security selection: an unknown model there proposes nothing for the
 * sleeve. Every other reader goes through `requireModel`, which throws; the old
 * `?? getModelByIndex(0)` fallback, which silently measured an account on an unknown model (or on
 * none) against Balanced Growth, is gone.
 */
function findModel(modelId: string): ModelDefinition | undefined {
  return MODEL_DEFINITIONS.find((m) => m.id === modelId)
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
 * The security a model buys to fill `assetClass` when the account holds nothing in it, with
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
 * A model's display name ("mod-002" → "Growth"), from `MODEL_DEFINITIONS` — the one place a model is
 * named. Throws on an unknown id: a name that silently fell back to another model's would label
 * one policy with another's name.
 */
export function modelDisplayName(modelId: string): string {
  return requireModel(modelId).name
}

function getModelTargets(modelId: string): Record<string, number> {
  // Same `MODEL_DEFINITIONS` lookup the implementation-security resolver uses, so a sleeve's target weight
  // and the security that fills it can never be read off two different models.
  const model = requireModel(modelId)
  const targets: Record<string, number> = {}
  for (const ac of model.assetClasses) {
    targets[ac.assetClass] = ac.targetWeight
  }
  return targets
}

function findAccount(accountId: string | readonly string[] | undefined): typeof accounts[0] | undefined {
  return accounts.find((a) => a.id === accountId)
}

/** Risk and sensitivity read a USD value, not the raw local-currency one. */
function accountUSD(account: typeof accounts[0]): number {
  return accountValueUSD(account, FX_RATES_USD_BASE)
}

/**
 * Deterministic per-asset-class manager selection edge, annualized: the amount by which the
 * account's holdings inside a class are modeled to beat that class's index.
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
  return { weights: assetClassWeights(positions), ...benchmarkOf(account) }
}

/**
 * What an account is measured against: its model's targets, or for a custom mandate the benchmark the
 * mandate names. `benchmarkId` seeds the benchmark line (one index, one series); `modelId` is null for
 * a custom mandate, which follows no model.
 */
function benchmarkOf(account: Account): { modelId: string | null; benchmarkId: string; benchmarkName: string; benchWeights: Map<string, number> } {
  if (account.mandate === 'custom') {
    return { modelId: null, benchmarkId: account.id, benchmarkName: account.benchmark.name, benchWeights: new Map(account.benchmark.weights.map((w) => [w.assetClass, w.weight])) }
  }
  const model = requireModel(account.modelId)
  return { modelId: model.id, benchmarkId: model.id, benchmarkName: model.benchmark, benchWeights: new Map(model.assetClasses.map((a) => [a.assetClass, a.targetWeight])) }
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
  const { weights, benchWeights, modelId, benchmarkId, benchmarkName } = weightsFor(account, positions)
  // The account's own one-year return and its benchmark's, taken from the single derivation rather
  // than re-expressed here. `the weighted one-year return + Σ wᵢ·edgeᵢ` is algebraically the same
  // quantity, but it rounds at a different point and so disagreed with the benchmark table by one
  // unit in the fourth decimal on 12 of the 47 accounts — visible as 10.09% on the performance tab
  // against 10.08% on risk analytics for the same account on the same date.
  const oneYear = periodReturnsFor(account, 1, positions)
  return {
    weights,
    benchWeights,
    modelId,
    benchmarkId,
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
 * The interaction effect is retained and totalled. The previous
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
 * Σ(A + S + I) = Rp − Rb holds exactly, not approximately. Both
 * weight sets sum to one (`assetClassWeights` normalizes; every model's targets sum to 1.00), so
 * Σ(wp − wb) = 0, the −Rb in the allocation term cancels, and the three effects collapse to
 * Σ wp·Rp,i − Σ wb·Rb,i. The totals returned here are the totals of the *rounded* rows, so the
 * published cards add up to the published total as well.
 *
 * The period is compounded from the annual class returns rather
 * than multiplied by an arbitrary scale factor, and compounding happens per asset class so that
 * Σ wb·Rb,i is the benchmark return for the period by construction. Sub-period geometric linking
 * (Carino, Menchero, GRAP) is **not** modeled; the response labels the model single-period
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
  // Active (excess) return, not Jensen's alpha. It is the
  // attribution's own total rounded once: rounding Rp and Rb separately and subtracting differs
  // from it by a full basis point on a month-to-date window, which is most of the figure.
  const activeReturn = roundTo(a.totals.total, 4)
  return {
    portfolioReturn: roundTo(benchmarkReturn + activeReturn, 4),
    benchmarkReturn,
    activeReturn,
  }
}


// Exported so `oms.ts`'s rebalance trade generator reads the same drift the drift surface does,
// rather than a second computation.
//
// `modelIdOverride` answers "what would this account's drift be against *that*
// model" — the question the model-trade screen exists to ask, since it can propose migrating an
// account onto a model it is not currently assigned to. Omitted, it is the account's own model
// and every existing caller is unchanged. The override is deliberately the **only** thing that
// varies: the positions, the renormalization and the two drift metrics are the same derivation
// the drift surface publishes, so a migration preview and the drift page cannot disagree about
// what drift means. An unknown model id throws rather than falling back to mod-001 — a silently
// substituted model here would be a trade instruction against a policy nobody chose.
export function computeDriftForAccount(account: ModelManagedAccount, modelIdOverride?: string): DriftStatus
export function computeDriftForAccount(account: Account, modelIdOverride: string): DriftStatus
export function computeDriftForAccount(account: Account, modelIdOverride?: string): DriftStatus {
  const drift = computeDriftForHoldings(account, getPositionsForAccount(account.id, account.totalValue), modelIdFor(account, modelIdOverride))
  return { ...drift, lastCalculated: holdingsAsOf(account.id) }
}

/** When the account's holdings last changed: its latest fill this session, else the fixtures' as-of. */
function holdingsAsOf(accountId: string): string {
  return ledgerFills().filter((f) => f.accountId === accountId).reduce<string>((latest, f) => (f.at > latest ? f.at : latest), MOCK_NOW_ISO)
}

/** What drift reads from a holding: its asset class and its weight in the account. */
export type DriftHolding = Pick<Position, 'assetClass' | 'weight'>

/**
 * The drift derivation itself, over any set of holdings. `computeDriftForAccount` runs it on
 * the account's positions today; the rebalance preview runs it on the same positions with the
 * proposed trades applied, so current and projected drift are one function, not two.
 */
export function computeDriftForHoldings(account: ModelManagedAccount, positions: readonly DriftHolding[], modelIdOverride?: string): DriftStatus
export function computeDriftForHoldings(account: Account, positions: readonly DriftHolding[], modelIdOverride: string): DriftStatus
export function computeDriftForHoldings(account: Account, positions: readonly DriftHolding[], modelIdOverride?: string): DriftStatus {
  const modelId = modelIdFor(account, modelIdOverride)
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
      // Signed, so the UI can say "overweight" or "underweight" rather than "drifted".
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
 * The Bloomberg Aggregate was flat-to-positive Sep-08 → Mar-09; the
 * flight-to-quality Treasury rally is the single most famous fixed-income fact about 2008.
 * Impacts are computed from the account's own holdings, so the position
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

/** Each stress scenario's asset-class returns replayed on the account's holdings today. */
export function stressScenariosFor(account: Account): StressScenario[] {
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
    // Left unrounded on purpose: the stress test requires that Σ position impact equal portfolioImpact × Σ
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
  return scenarios
}

/** Position concentration against the IPS limits, with one HHI scale (0–10,000) and its effective N. */
export function concentrationFor(account: Account) {
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

  return {
    positions: concentrationMetrics,
    summary: {
      top10Weight: roundTo(top10Weight, 3),
      // One HHI scale across the product (0–10,000), with effective N.
      herfindahlIndex: Math.round(herfindahlIndex(positions.map((p) => p.weight / totalWeight))),
      effectiveN: roundTo(effectiveN(herfindahlIndex(positions.map((p) => p.weight / totalWeight))), 1),
      singleNameWeight: roundTo(singleNames.reduce((s, c) => s + c.weight, 0), 3),
      largestSingleName: singleNames[0]
        ? { symbol: singleNames[0].symbol, weight: singleNames[0].weight }
        : null,
      breachCount: concentrationMetrics.filter((c) => c.breached).length,
      totalPositions: positions.length,
    },
  }
}

export const pmsHandlers = [
  http.get('/api/pms/accounts/:accountId/positions', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(getPositionsForAccount(account.id, account.totalValue))
  }),

  http.get('/api/pms/accounts/:accountId/drift', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    // A custom mandate follows no model, so it has no drift to report.
    if (!isModelManaged(account)) return notFound()
    return HttpResponse.json(computeDriftForAccount(account))
  }),
]
