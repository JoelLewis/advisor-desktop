export type WaterfallBar = {
  label: string
  value: number
  /** `anchor` bars are absolute levels (opening and closing balance); `delta` bars are movements. */
  kind: 'anchor' | 'delta'
}

/**
 * A truncated axis for a waterfall whose deltas are small relative to its base.
 *
 * critique-ux §1.1 — on a $0–$100M axis, Market Appreciation, New Assets, Withdrawals and
 * Attrition rendered as 3–8px slivers. A waterfall of $2M deltas on a $91M base is unreadable
 * unless the axis brackets the running cumulative range instead of starting at zero.
 * The caller must caption the axis so the truncation is disclosed.
 */
export function computeWaterfallDomain(
  bars: readonly WaterfallBar[],
  padFraction = 0.08,
): [number, number] {
  const levels: number[] = []
  let running = 0
  for (const bar of bars) {
    if (bar.kind === 'anchor') {
      running = bar.value
      levels.push(running)
    } else {
      levels.push(running)
      running += bar.value
      levels.push(running)
    }
  }
  const lo = Math.min(...levels)
  const hi = Math.max(...levels)
  const span = hi - lo
  if (span === 0) return [0, hi || 1]
  const pad = span * padFraction
  return [Math.max(0, lo - pad), hi + pad]
}
