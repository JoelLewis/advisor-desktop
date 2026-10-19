import type { AssetClass } from './portfolio'
import type { MethodNote } from './reference'
import type { ModelBenchmark } from './reference-models'

export const ATTRIBUTION_PERIODS = [
  { id: 'mtd', label: 'Month to date' }, { id: 'qtd', label: 'Quarter to date' }, { id: 'ytd', label: 'Year to date' },
  { id: '1y', label: 'One year' }, { id: '3y', label: 'Three years' }, { id: '5y', label: 'Five years' },
] as const
export type AttributionPeriod = (typeof ATTRIBUTION_PERIODS)[number]['id']
export const isAttributionPeriod = (value: unknown): value is AttributionPeriod => ATTRIBUTION_PERIODS.some((p) => p.id === value)

type AttributionRow = {
  assetClass: AssetClass; portfolioWeight: number; benchmarkWeight: number; portfolioReturn: number; benchmarkReturn: number
  allocation: number; selection: number; interaction: number; total: number
}
export type AttributionView = {
  asOf: string; accountId: string; accountName: string
  /** The account's owner, by full name: the client the page is about. */
  clientName: string
  /** The model's id, or null for a custom mandate. */
  modelId: string | null
  /** The model's name, or "Custom mandate". */
  mandateName: string; benchmark: ModelBenchmark
  period: AttributionPeriod; periods: { id: AttributionPeriod; label: string }[]
  /** For the period: cumulative over it when the period is longer than a year. */
  portfolioReturn: number; benchmarkReturn: number; activeReturn: number
  /** A period longer than a year is cumulative, with its annualized equivalents: (1 + R)^(1/years) − 1. */
  multiYear: { years: number; annualized: { portfolio: number; benchmark: number } } | null
  rows: AttributionRow[]; totals: { allocation: number; selection: number; interaction: number; total: number }
  series: { date: string; portfolio: number; benchmark: number }[]
  methods: MethodNote[]
}
