import { ASSET_CLASS_LABELS } from '@/lib/labels'

export function assetClassLabel(key: string): string {
  const label = ASSET_CLASS_LABELS[key.toLowerCase()]
  if (label === undefined) throw new Error(`No display label for asset class "${key}"`)
  return label
}
