import type { AssetClass } from './portfolio'
import type { MethodNote } from './reference'
import type { ModelBenchmark } from './reference-models'

export const ATTRIBUTION_PERIODS = [
  { id: 'mtd', label: 'Month to date' }, { id: 'qtd', label: 'Quarter to date' }, { id: 'ytd', label: 'Year to date' },
  { id: '1y', label: 'One year' }, { id: '3y', label: 'Three years' }, { id: '5y', label: 'Five years' },
] as const
export type AttributionPeriod = (typeof ATTRIBUTION_PERIODS)[number]['id']
export const isAttributionPeriod = (value: unknown): value is AttributionPeriod => ATTRIBUTION_PERIODS.some((p) => p.id === value)

export type AttributionRow = {
  assetClass: AssetClass; portfolioWeight: number; benchmarkWeight: number; portfolioReturn: number; benchmarkReturn: number
  allocation: number; selection: number; interaction: number; total: number
}
export type AttributionView = {
  asOf: string; accountId: string; accountName: string; modelId: string; modelName: string; benchmark: ModelBenchmark
  period: AttributionPeriod; periods: { id: AttributionPeriod; label: string }[]
  portfolioReturn: number; benchmarkReturn: number; activeReturn: number
  rows: AttributionRow[]; totals: { allocation: number; selection: number; interaction: number; total: number }
  series: { date: string; portfolio: number; benchmark: number }[]
  methods: MethodNote[]
}
