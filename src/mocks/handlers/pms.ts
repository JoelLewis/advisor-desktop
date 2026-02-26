import { http, HttpResponse } from 'msw'
import type { MetricsSummary } from '@/services/pms'
import type { DriftStatus } from '@/types/portfolio'
import type { RiskMetrics, FactorExposure, StressScenario } from '@/types/risk'
import type { BenchmarkComparison, PerformanceSeries, AttributionResult } from '@/types/performance'
import { getPositionsForAccount } from '../data/positions'
import { accounts } from '../data/accounts'

const metricsSummary: MetricsSummary = {
  totalAUM: 101_855_000,
  totalClients: 20,
  pendingTasks: 14,
  meetingsToday: 4,
  alertCount: 3,
  netFlowsMTD: 1_250_000,
}

function generatePerformanceSeries(months: number): PerformanceSeries[] {
  const series: PerformanceSeries[] = []
  let portfolioValue = 100
  let benchmarkValue = 100
  const now = new Date('2026-02-25')
  for (let i = months; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    portfolioValue *= 1 + (Math.random() * 0.06 - 0.02)
    benchmarkValue *= 1 + (Math.random() * 0.055 - 0.02)
    series.push({
      date: date.toISOString().slice(0, 10),
      value: Math.round(portfolioValue * 100) / 100,
      benchmark: Math.round(benchmarkValue * 100) / 100,
    })
  }
  return series
}

// Model target allocations by model ID
const MODEL_TARGETS: Record<string, Record<string, number>> = {
  'mod-001': { us_equity: 0.40, intl_equity: 0.12, emerging_markets: 0.03, fixed_income: 0.30, alternatives: 0.05, real_estate: 0.03, commodities: 0.02, cash: 0.05 },
  'mod-002': { us_equity: 0.55, intl_equity: 0.15, emerging_markets: 0.05, fixed_income: 0.15, alternatives: 0.05, commodities: 0.02, cash: 0.03 },
  'mod-003': { us_equity: 0.20, intl_equity: 0.05, fixed_income: 0.55, alternatives: 0.05, real_estate: 0.05, cash: 0.10 },
  'mod-004': { us_equity: 0.50, intl_equity: 0.20, emerging_markets: 0.10, fixed_income: 0.10, alternatives: 0.05, cash: 0.05 },
  'mod-005': { us_equity: 0.35, intl_equity: 0.15, emerging_markets: 0.05, fixed_income: 0.20, alternatives: 0.15, real_estate: 0.05, cash: 0.05 },
  'mod-006': { us_equity: 0.45, intl_equity: 0.10, fixed_income: 0.35, cash: 0.10 },
  'mod-007': { us_equity: 0.35, intl_equity: 0.10, emerging_markets: 0.05, fixed_income: 0.35, alternatives: 0.05, real_estate: 0.03, commodities: 0.02, cash: 0.05 },
}

function computeDriftForAccount(account: typeof accounts[0]): DriftStatus {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const modelId = account.modelId ?? 'mod-001'
  const targets: Record<string, number> = MODEL_TARGETS[modelId] ?? MODEL_TARGETS['mod-001'] ?? {}

  // Aggregate actual weights by asset class
  const actualWeights = new Map<string, number>()
  for (const pos of positions) {
    actualWeights.set(pos.assetClass, (actualWeights.get(pos.assetClass) ?? 0) + pos.weight)
  }

  // Compute per-class drift
  const allClasses = new Set([...Object.keys(targets), ...actualWeights.keys()])
  const assetClassDrifts: DriftStatus['assetClassDrifts'] = [...allClasses]
    .map((ac) => ({
      assetClass: ac as DriftStatus['assetClassDrifts'][0]['assetClass'],
      target: targets[ac] ?? 0,
      actual: actualWeights.get(ac) ?? 0,
      drift: Math.round(Math.abs((actualWeights.get(ac) ?? 0) - (targets[ac] ?? 0)) * 1000) / 1000,
    }))
    .filter((d) => d.target > 0 || d.actual > 0)

  const totalDrift = Math.round(assetClassDrifts.reduce((sum, d) => sum + d.drift, 0) * 1000 / 2) / 1000

  return {
    accountId: account.id,
    totalDrift,
    assetClassDrifts,
    lastCalculated: '2026-02-25T08:00:00Z',
    needsRebalance: totalDrift > 0.03,
  }
}

export const pmsHandlers = [
  http.get('/api/pms/metrics', () => {
    return HttpResponse.json(metricsSummary)
  }),

  http.get('/api/pms/drift/summary', () => {
    const summaries = accounts.map(computeDriftForAccount)
    return HttpResponse.json(summaries)
  }),

  http.get('/api/pms/accounts/:accountId/positions', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(getPositionsForAccount(account.id, account.totalValue))
  }),

  http.get('/api/pms/accounts/:accountId/holdings', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    const positions = getPositionsForAccount(account.id, account.totalValue)

    const groups = new Map<string, { targetWeight: number; actualWeight: number; positions: typeof positions }>()
    const targets: Record<string, number> = {
      us_equity: 0.45, intl_equity: 0.12, emerging_markets: 0.03,
      fixed_income: 0.30, alternatives: 0.05, real_estate: 0.03,
      commodities: 0.02, cash: 0.05,
    }

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
        actualWeight: Math.round(data.actualWeight * 1000) / 1000,
        drift: Math.round(Math.abs(data.actualWeight - data.targetWeight) * 1000) / 1000,
        positions: data.positions,
      })),
    )
  }),

  http.get('/api/pms/accounts/:accountId/drift', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(computeDriftForAccount(account))
  }),

  http.get('/api/pms/accounts/:accountId/performance', () => {
    return HttpResponse.json(generatePerformanceSeries(24))
  }),

  http.get('/api/pms/accounts/:accountId/benchmark', () => {
    const comparisons: BenchmarkComparison[] = [
      { period: 'mtd', portfolioReturn: 0.018, benchmarkReturn: 0.015, alpha: 0.003, trackingError: 0.005 },
      { period: 'qtd', portfolioReturn: 0.042, benchmarkReturn: 0.038, alpha: 0.004, trackingError: 0.008 },
      { period: 'ytd', portfolioReturn: 0.065, benchmarkReturn: 0.058, alpha: 0.007, trackingError: 0.012 },
      { period: '1y', portfolioReturn: 0.124, benchmarkReturn: 0.115, alpha: 0.009, trackingError: 0.015 },
      { period: '3y', portfolioReturn: 0.087, benchmarkReturn: 0.079, alpha: 0.008, trackingError: 0.018 },
      { period: '5y', portfolioReturn: 0.098, benchmarkReturn: 0.092, alpha: 0.006, trackingError: 0.020 },
      { period: 'inception', portfolioReturn: 0.105, benchmarkReturn: 0.095, alpha: 0.010, trackingError: 0.022 },
    ]
    return HttpResponse.json(comparisons)
  }),

  http.get('/api/pms/accounts/:accountId/attribution', ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') ?? 'ytd'
    // Scale attribution values by period length
    const scale: Record<string, number> = { mtd: 0.15, qtd: 0.35, ytd: 1.0, '1y': 1.8 }
    const s = scale[period] ?? 1.0
    const round = (v: number) => Math.round(v * s * 10000) / 10000

    const base: AttributionResult[] = [
      { assetClass: 'us_equity', allocation: 0.012, selection: 0.008, interaction: 0.001, total: 0.021 },
      { assetClass: 'intl_equity', allocation: -0.003, selection: 0.002, interaction: 0.000, total: -0.001 },
      { assetClass: 'emerging_markets', allocation: -0.001, selection: -0.002, interaction: 0.000, total: -0.003 },
      { assetClass: 'fixed_income', allocation: 0.004, selection: -0.001, interaction: 0.000, total: 0.003 },
      { assetClass: 'alternatives', allocation: 0.002, selection: 0.003, interaction: 0.001, total: 0.006 },
      { assetClass: 'real_estate', allocation: 0.001, selection: 0.000, interaction: 0.000, total: 0.001 },
      { assetClass: 'commodities', allocation: 0.003, selection: 0.001, interaction: 0.000, total: 0.004 },
      { assetClass: 'cash', allocation: -0.002, selection: 0.000, interaction: 0.000, total: -0.002 },
    ]

    const attribution = base.map((a) => ({
      ...a,
      allocation: round(a.allocation),
      selection: round(a.selection),
      interaction: round(a.interaction),
      total: round(a.total),
    }))
    return HttpResponse.json(attribution)
  }),

  http.get('/api/pms/accounts/:accountId/risk', () => {
    const metrics: RiskMetrics = {
      beta: 0.92,
      sharpe: 1.34,
      sortino: 1.78,
      maxDrawdown: -0.142,
      standardDeviation: 0.118,
      var95: 485_000,
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
    const accountId = String(params.accountId)
    const account = accounts.find((a) => a.id === accountId)
    const value = account?.totalValue ?? 1_000_000

    const scenarios: StressScenario[] = [
      {
        id: 'stress-001',
        name: '2008 Financial Crisis',
        description: 'Replay of Sept 2008 – Mar 2009 market conditions',
        portfolioImpact: -0.38,
        positionImpacts: [
          { positionId: 'p1', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', currentValue: value * 0.35, projectedValue: value * 0.35 * 0.55, impact: -(value * 0.35 * 0.45), impactPercent: -0.45 },
          { positionId: 'p2', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', currentValue: value * 0.21, projectedValue: value * 0.21 * 0.95, impact: -(value * 0.21 * 0.05), impactPercent: -0.05 },
          { positionId: 'p3', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', currentValue: value * 0.15, projectedValue: value * 0.15 * 0.50, impact: -(value * 0.15 * 0.50), impactPercent: -0.50 },
        ],
      },
      {
        id: 'stress-002',
        name: 'Rising Rate Shock (+300bp)',
        description: 'Sudden 300 basis-point increase in interest rates',
        portfolioImpact: -0.14,
        positionImpacts: [
          { positionId: 'p1', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', currentValue: value * 0.35, projectedValue: value * 0.35 * 0.90, impact: -(value * 0.35 * 0.10), impactPercent: -0.10 },
          { positionId: 'p2', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', currentValue: value * 0.21, projectedValue: value * 0.21 * 0.82, impact: -(value * 0.21 * 0.18), impactPercent: -0.18 },
          { positionId: 'p3', symbol: 'TLT', name: 'iShares 20+ Year Treasury', currentValue: value * 0.06, projectedValue: value * 0.06 * 0.65, impact: -(value * 0.06 * 0.35), impactPercent: -0.35 },
        ],
      },
      {
        id: 'stress-003',
        name: 'Pandemic Selloff (Mar 2020)',
        description: 'Replay of Feb – Mar 2020 COVID-driven selloff',
        portfolioImpact: -0.25,
        positionImpacts: [
          { positionId: 'p1', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', currentValue: value * 0.35, projectedValue: value * 0.35 * 0.66, impact: -(value * 0.35 * 0.34), impactPercent: -0.34 },
          { positionId: 'p2', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', currentValue: value * 0.21, projectedValue: value * 0.21 * 0.97, impact: -(value * 0.21 * 0.03), impactPercent: -0.03 },
          { positionId: 'p3', symbol: 'GLD', name: 'SPDR Gold Shares', currentValue: value * 0.05, projectedValue: value * 0.05 * 1.08, impact: value * 0.05 * 0.08, impactPercent: 0.08 },
        ],
      },
    ]
    return HttpResponse.json(scenarios)
  }),

  // ── Sensitivity analysis ──
  http.get('/api/pms/accounts/:accountId/sensitivity', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    const value = account?.totalValue ?? 1_000_000

    const sensitivity = {
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
      monteCarlo: {
        simulations: 10000,
        horizon: '1Y',
        percentiles: [
          { percentile: 1, value: value * 0.72 },
          { percentile: 5, value: value * 0.82 },
          { percentile: 10, value: value * 0.87 },
          { percentile: 25, value: value * 0.94 },
          { percentile: 50, value: value * 1.06 },
          { percentile: 75, value: value * 1.15 },
          { percentile: 90, value: value * 1.22 },
          { percentile: 95, value: value * 1.28 },
          { percentile: 99, value: value * 1.38 },
        ],
        histogram: Array.from({ length: 30 }, (_, i) => {
          const returnPct = -0.30 + i * 0.025
          const center = 0.06
          const sigma = 0.12
          const freq = Math.exp(-0.5 * ((returnPct - center) / sigma) ** 2)
          return { returnBucket: Math.round(returnPct * 100) / 100, frequency: Math.round(freq * 800 + Math.random() * 40) }
        }),
      },
    }
    return HttpResponse.json(sensitivity)
  }),

  // ── Concentration analysis ──
  http.get('/api/pms/accounts/:accountId/concentration', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    const positions = getPositionsForAccount(account.id, account.totalValue)

    const concentrationMetrics = positions
      .sort((a, b) => b.weight - a.weight)
      .map((pos) => ({
        positionId: pos.id,
        symbol: pos.symbol,
        name: pos.name,
        assetClass: pos.assetClass,
        marketValue: pos.marketValue,
        weight: pos.weight,
        limit: pos.assetClass === 'cash' ? 0.15 : 0.05,
        breached: pos.weight > (pos.assetClass === 'cash' ? 0.15 : 0.05),
      }))

    const top10Weight = positions.sort((a, b) => b.weight - a.weight).slice(0, 10).reduce((s, p) => s + p.weight, 0)
    const herfindahl = positions.reduce((s, p) => s + p.weight ** 2, 0)

    return HttpResponse.json({
      positions: concentrationMetrics,
      summary: {
        top10Weight: Math.round(top10Weight * 1000) / 1000,
        herfindahlIndex: Math.round(herfindahl * 10000) / 10000,
        breachCount: concentrationMetrics.filter((c) => c.breached).length,
        totalPositions: positions.length,
      },
    })
  }),

  http.get('/api/pms/models', () => {
    return HttpResponse.json([
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
    ])
  }),

  // ── Household-level endpoints ──
  http.get('/api/pms/households/:householdId/positions', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return new HttpResponse(null, { status: 404 })
    const allPositions = hhAccounts.flatMap((a) => getPositionsForAccount(a.id, a.totalValue))
    return HttpResponse.json(allPositions)
  }),

  http.get('/api/pms/households/:householdId/drift', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return new HttpResponse(null, { status: 404 })
    const drifts = hhAccounts.map(computeDriftForAccount)
    return HttpResponse.json(drifts)
  }),

  http.get('/api/pms/households/:householdId/allocation', ({ params }) => {
    const hhAccounts = accounts.filter((a) => a.householdId === params.householdId)
    if (hhAccounts.length === 0) return new HttpResponse(null, { status: 404 })
    const allPositions = hhAccounts.flatMap((a) => getPositionsForAccount(a.id, a.totalValue))
    const totalValue = allPositions.reduce((sum, p) => sum + p.marketValue, 0)

    // Aggregate by asset class
    const byClass = new Map<string, number>()
    for (const pos of allPositions) {
      byClass.set(pos.assetClass, (byClass.get(pos.assetClass) ?? 0) + pos.marketValue)
    }

    const allocation = [...byClass.entries()].map(([assetClass, value]) => ({
      assetClass,
      weight: Math.round((value / totalValue) * 1000) / 1000,
      value: Math.round(value),
    }))
    return HttpResponse.json(allocation)
  }),

  http.get('/api/pms/models/:modelId', ({ params }) => {
    const models = [
      { id: 'mod-001', name: 'Balanced Growth', benchmark: 'S&P 500 / Agg 60/40', description: 'Core 60/40 model with growth tilt', assetClasses: [
        { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
        { assetClass: 'emerging_markets', targetWeight: 0.03 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
        { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
        { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
      ]},
    ]
    const model = models.find((m) => m.id === params.modelId)
    if (!model) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(model)
  }),

  // ── Model Governance ──
  http.get('/api/pms/models/governance', () => {
    const modelGovernance = [
      {
        id: 'mod-001', name: 'Balanced Growth', benchmark: 'S&P 500 / Agg 60/40',
        description: 'Core 60/40 model with growth tilt',
        riskProfile: 'moderate', currentVersion: 3, assignedAccounts: 14, totalAUM: 42_350_000,
        lastRebalanceDate: '2026-02-10', driftTolerance: 0.05, rebalanceFrequency: 'quarterly',
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
          { assetClass: 'emerging_markets', targetWeight: 0.03 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
          { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
          { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
        ],
        versions: [
          {
            version: 3, effectiveDate: '2026-01-15', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2026-01-14',
            changes: [
              { id: 'chg-001', type: 'weight_change', description: 'Reduced emerging markets from 5% to 3%', assetClass: 'emerging_markets', oldValue: 0.05, newValue: 0.03 },
              { id: 'chg-002', type: 'weight_change', description: 'Increased fixed income from 28% to 30%', assetClass: 'fixed_income', oldValue: 0.28, newValue: 0.30 },
            ],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 },
              { assetClass: 'emerging_markets', targetWeight: 0.03 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
              { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
            ],
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
            changes: [
              { id: 'chg-005', type: 'description_change', description: 'Initial model creation' },
            ],
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
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.55 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
          { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
          { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 },
          { assetClass: 'cash', targetWeight: 0.03 },
        ],
        versions: [
          {
            version: 2, effectiveDate: '2025-10-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-09-25',
            changes: [
              { id: 'chg-006', type: 'weight_change', description: 'Increased intl equity from 12% to 15%', assetClass: 'intl_equity', oldValue: 0.12, newValue: 0.15 },
              { id: 'chg-007', type: 'weight_change', description: 'Reduced US equity from 58% to 55%', assetClass: 'us_equity', oldValue: 0.58, newValue: 0.55 },
            ],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.55 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 },
              { assetClass: 'cash', targetWeight: 0.03 },
            ],
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
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.20 }, { assetClass: 'intl_equity', targetWeight: 0.05 },
          { assetClass: 'fixed_income', targetWeight: 0.55 }, { assetClass: 'alternatives', targetWeight: 0.05 },
          { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
        ],
        versions: [
          {
            version: 2, effectiveDate: '2025-09-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-08-27',
            changes: [
              { id: 'chg-009', type: 'weight_change', description: 'Increased fixed income from 50% to 55%', assetClass: 'fixed_income', oldValue: 0.50, newValue: 0.55 },
              { id: 'chg-010', type: 'weight_change', description: 'Reduced US equity from 25% to 20%', assetClass: 'us_equity', oldValue: 0.25, newValue: 0.20 },
            ],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.20 }, { assetClass: 'intl_equity', targetWeight: 0.05 },
              { assetClass: 'fixed_income', targetWeight: 0.55 }, { assetClass: 'alternatives', targetWeight: 0.05 },
              { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
            ],
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
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.50 }, { assetClass: 'intl_equity', targetWeight: 0.20 },
          { assetClass: 'emerging_markets', targetWeight: 0.10 }, { assetClass: 'fixed_income', targetWeight: 0.10 },
          { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
        ],
        versions: [
          {
            version: 1, effectiveDate: '2025-01-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-012', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.50 }, { assetClass: 'intl_equity', targetWeight: 0.20 },
              { assetClass: 'emerging_markets', targetWeight: 0.10 }, { assetClass: 'fixed_income', targetWeight: 0.10 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
            ],
          },
        ],
      },
      {
        id: 'mod-005', name: 'Ultra-HNW Multi-Strategy', benchmark: 'Custom Blended',
        description: 'Multi-strategy for large accounts',
        riskProfile: 'moderate_aggressive', currentVersion: 3, assignedAccounts: 3, totalAUM: 18_900_000,
        lastRebalanceDate: '2026-01-20', driftTolerance: 0.05, rebalanceFrequency: 'monthly',
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
          { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
          { assetClass: 'alternatives', targetWeight: 0.15 }, { assetClass: 'real_estate', targetWeight: 0.05 },
          { assetClass: 'cash', targetWeight: 0.05 },
        ],
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
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
              { assetClass: 'alternatives', targetWeight: 0.15 }, { assetClass: 'real_estate', targetWeight: 0.05 },
              { assetClass: 'cash', targetWeight: 0.05 },
            ],
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
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.45 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
          { assetClass: 'fixed_income', targetWeight: 0.35 }, { assetClass: 'cash', targetWeight: 0.10 },
        ],
        versions: [
          {
            version: 1, effectiveDate: '2025-01-01', author: 'David Park, PM', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2024-12-18',
            changes: [{ id: 'chg-018', type: 'description_change', description: 'Initial model creation' }],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.45 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
              { assetClass: 'fixed_income', targetWeight: 0.35 }, { assetClass: 'cash', targetWeight: 0.10 },
            ],
          },
        ],
      },
      {
        id: 'mod-007', name: 'Moderate Balanced', benchmark: 'S&P 500 / Agg 50/50',
        description: 'Balanced 50/50 equity-bond split',
        riskProfile: 'moderate_conservative', currentVersion: 2, assignedAccounts: 2, totalAUM: 3_200_000,
        lastRebalanceDate: '2026-02-01', driftTolerance: 0.05, rebalanceFrequency: 'quarterly',
        assetClasses: [
          { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
          { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.35 },
          { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
          { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
        ],
        versions: [
          {
            version: 2, effectiveDate: '2025-11-01', author: 'Sarah Kim, CIO', status: 'approved',
            approvedBy: 'Investment Committee', approvedDate: '2025-10-28',
            changes: [
              { id: 'chg-019', type: 'weight_change', description: 'Increased fixed income from 30% to 35%', assetClass: 'fixed_income', oldValue: 0.30, newValue: 0.35 },
              { id: 'chg-020', type: 'weight_change', description: 'Reduced US equity from 40% to 35%', assetClass: 'us_equity', oldValue: 0.40, newValue: 0.35 },
            ],
            assetClasses: [
              { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.10 },
              { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.35 },
              { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 },
              { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
            ],
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
]