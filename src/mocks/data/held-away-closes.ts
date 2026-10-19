import type { AssetClass } from '@/types/portfolio'

export type Close = { name: string; price: number; assetClass: AssetClass }

/**
 * The 25 Feb 2026 close of held-away securities the book does not hold, for valuing a prospect's
 * statements. A security the book holds is priced by `usdQuoteFor` and must not appear here: one price, one place.
 */
export const HELD_AWAY_CLOSES: ReadonlyMap<string, Close> = new Map<string, Close>([
  ['SYK', { name: 'Stryker Corp.', price: 390.2, assetClass: 'us_equity' }],
])
