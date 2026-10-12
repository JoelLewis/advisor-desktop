/**
 * IRC §1091 disallows a loss when substantially identical securities are acquired within 30 days
 * before or after the sale. "Substantially identical" is approximated as the same symbol: INTC and
 * SMH are distinct, which is the household's own compliance ruling (comp-006).
 *
 * Two further approximations, both deliberate:
 * - A leg is judged on its net result, so a loss lot inside a net-gain leg is not tested.
 * - A multi-account batch that sells X at a loss in one account and buys X in another in the same
 *   batch is not cross-checked; only recorded sales and held lots are.
 */
export type LossSaleWindow = { symbol: string; start: string; end: string }
export type Acquisition = { symbol: string; date: string; lotId: string }
/** `soldLotIds`: the lots a sell consumes — shares disposed of in the sale are not replacement shares. */
export type WashSaleLeg = { symbol: string; side: 'buy' | 'sell'; realisesLoss: boolean; soldLotIds: readonly string[] }

const DAY_MS = 86_400_000

export function isoDaysBefore(asOfISO: string, days: number): string {
  return new Date(Date.parse(`${asOfISO}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10)
}

export function hasWashSaleRisk(
  leg: WashSaleLeg,
  openLossWindows: readonly LossSaleWindow[],
  recentAcquisitions: readonly Acquisition[],
  asOfISO: string,
): boolean {
  if (leg.side === 'buy') {
    return openLossWindows.some((w) => w.symbol === leg.symbol && w.start <= asOfISO && asOfISO <= w.end)
  }
  if (!leg.realisesLoss) return false
  const from = isoDaysBefore(asOfISO, 30)
  return recentAcquisitions.some((a) => a.symbol === leg.symbol && !leg.soldLotIds.includes(a.lotId) && a.date >= from && a.date <= asOfISO)
}
