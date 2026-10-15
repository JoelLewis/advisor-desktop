import type { Account } from '@/types/account'
import type { AssetClass } from '@/types/portfolio'
import type { MethodNote, RowQuote } from '@/types/reference'
import { ATTRIBUTION_PERIODS, isAttributionPeriod, type AttributionPeriod, type AttributionView } from '@/types/reference-attribution'
import { accounts } from '@/mocks/data/accounts'
import { attributionFor, performanceSeriesFor, periodReturnsFor, periodYears } from '@/mocks/handlers/pms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { SLEEVE_INDEX, accountBenchmark, mandateNameOf } from './models'

const METHODS: readonly MethodNote[] = [
  { label: 'Model', modeled: false, text: 'Brinson-Fachler: allocation is (wp − wb) × (Rb,i − Rb), selection is wb × (Rp,i − Rb,i), interaction is (wp − wb) × (Rp,i − Rb,i). The three effects sum exactly to the active return.' },
  { label: 'Linking', modeled: false, text: 'Single-period and arithmetic: each period is compounded from annual class returns as one period; sub-periods are not linked.' },
  { label: 'Returns', modeled: true, text: "Modeled, not realized: each asset class's return is a modeled index return, and the account's edge within a class is a modeled assumption. Weights are today's holdings, applied to the whole period: a holdings-based approximation, not the account's path. A period longer than a year is cumulative, shown beside its annualized equivalent." },
  { label: 'Benchmark', modeled: false, text: "The model's policy benchmark: each sleeve at the model's target weight, measured by the index named for it. A custom mandate is measured against the benchmark its mandate names; the education model's is its glide path's current-stage targets, not re-weighted along the path within the period." },
  { label: 'Performance line', modeled: true, text: "Modeled, not realized: the monthly line is drawn from the account's modeled return and volatility as the fixtures state its holdings, so today's trades do not rewrite it, and the benchmark line from the model's; neither is a record of realized returns." },
  { label: 'Fees', modeled: false, text: 'Gross of fees.' },
]

const isAssetClass = (value: string): value is AssetClass => value in SLEEVE_INDEX
/** A cumulative return over `years` as its annual equivalent, to the published four places. */
const annualize = (cumulative: number, years: number) => Math.round(((1 + cumulative) ** (1 / years) - 1) * 10_000) / 10_000

function build(account: Account, period: AttributionPeriod): AttributionView {
  const years = periodYears()[period]
  if (years === undefined) throw new Error(`No period length for ${period}`)
  const a = attributionFor(account, years)
  const r = periodReturnsFor(account, years)
  return {
    asOf: MOCK_NOW_ISO, accountId: account.id, accountName: account.name, modelId: account.mandate === 'model' ? account.modelId : null, mandateName: mandateNameOf(account), benchmark: accountBenchmark(account),
    period, periods: ATTRIBUTION_PERIODS.map((p) => ({ id: p.id, label: p.label })),
    portfolioReturn: r.portfolioReturn, benchmarkReturn: r.benchmarkReturn, activeReturn: r.activeReturn,
    multiYear: years > 1 ? { years, annualized: { portfolio: annualize(r.portfolioReturn, years), benchmark: annualize(r.benchmarkReturn, years) } } : null,
    rows: a.rows.map((row, i) => {
      const leg = a.legs[i]
      if (!leg || leg.assetClass !== row.assetClass || !isAssetClass(leg.assetClass)) throw new Error(`Attribution rows and legs disagree at ${i}`)
      return {
        assetClass: leg.assetClass, portfolioWeight: leg.wp, benchmarkWeight: leg.wb, portfolioReturn: leg.rp, benchmarkReturn: leg.rb,
        allocation: row.allocation, selection: row.selection, interaction: row.interaction, total: row.total,
      }
    }),
    totals: a.totals,
    series: performanceSeriesFor(account, 'fixtures').map((p) => {
      if (p.benchmark === undefined) throw new Error(`${account.id} has a performance point with no benchmark on ${p.date}`)
      return { date: p.date, portfolio: p.value, benchmark: p.benchmark }
    }),
    methods: [...METHODS],
  }
}

export function attributionView(viewerId: string, accountId: string, period: AttributionPeriod): AttributionView | undefined {
  const account = accounts.find((a) => a.id === accountId)
  if (!account || !isFirmViewer(viewerId)) return undefined
  return build(account, period)
}

export function attributionQuote(rowId: string): RowQuote | undefined {
  const [accountId, period, assetClass] = rowId.split(':')
  const account = accounts.find((a) => a.id === accountId)
  if (!account || !isAttributionPeriod(period) || !assetClass) return undefined
  const v = build(account, period)
  const row = v.rows.find((r) => r.assetClass === assetClass)
  if (!row) return undefined
  const label = ATTRIBUTION_PERIODS.find((p) => p.id === period)?.label ?? period
  return {
    view: 'attribution', rowId, subject: { type: 'account', id: account.id }, threadTitle: `Attribution · ${account.name}`,
    claim: `${ASSET_CLASS_LABELS[row.assetClass]} in ${account.name} against the ${v.benchmark.name}: allocation, selection and interaction.`,
    figures: [
      { label: 'Allocation', value: row.allocation, unit: 'pp', source: 'attribution.rows.allocation' },
      { label: 'Selection', value: row.selection, unit: 'pp', source: 'attribution.rows.selection' },
      { label: 'Interaction', value: row.interaction, unit: 'pp', source: 'attribution.rows.interaction' },
      { label: 'Total', value: row.total, unit: 'pp', source: 'attribution.rows.total' },
    ],
    citations: [{ source: `Attribution · Brinson-Fachler, ${label.toLowerCase()}, modeled returns`, asOf: MOCK_NOW_ISO }],
  }
}
