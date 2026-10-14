import { ASSET_CLASS_LABELS } from '@/lib/labels'

const LABELS: ReadonlyMap<string, string> = new Map(Object.entries(ASSET_CLASS_LABELS))

export function assetClassLabel(key: string): string {
  const label = LABELS.get(key.toLowerCase())
  if (label === undefined) throw new Error(`No display label for asset class "${key}"`)
  return label
}
