import type { AssetClass } from '@/types/portfolio'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'

export type ModelMix = { stocks: number; bonds: number; other: number; cash: number }
const STOCKS: ReadonlySet<AssetClass> = new Set<AssetClass>(['us_equity', 'intl_equity', 'emerging_markets'])

const ASSET_CLASSES: ReadonlySet<string> = new Set<AssetClass>([
  'us_equity', 'intl_equity', 'emerging_markets', 'fixed_income', 'alternatives', 'real_estate', 'commodities', 'cash', 'digital_assets', 'private_equity',
])

function assetClassOf(name: string): AssetClass {
  if (!ASSET_CLASSES.has(name)) throw new Error(`Model weight names an unknown asset class: ${name}`)
  return name as AssetClass
}

export function modelWeights(modelId: string): ReadonlyMap<AssetClass, number> {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`No model ${modelId}`)
  return new Map(model.assetClasses.map((a): [AssetClass, number] => [assetClassOf(a.assetClass), a.targetWeight]))
}

/** A model in four words a prospect reads: stocks, bonds, everything else, cash. */
export function modelMix(modelId: string): ModelMix {
  const weights = [...modelWeights(modelId)]
  const sum = (keep: (c: AssetClass) => boolean) => weights.filter(([c]) => keep(c)).reduce((s, [, w]) => s + w, 0)
  const stocks = sum((c) => STOCKS.has(c))
  const bonds = sum((c) => c === 'fixed_income')
  const cash = sum((c) => c === 'cash')
  return { stocks, bonds, cash, other: sum((c) => !STOCKS.has(c) && c !== 'fixed_income' && c !== 'cash') }
}
