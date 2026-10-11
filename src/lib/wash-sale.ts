/**
 * IRC §1091 disallows a loss when substantially identical securities are acquired within 30 days
 * before or after the sale. "Substantially identical" is approximated as the same symbol: INTC and
 * SMH are distinct, which is the household's own compliance ruling (comp-006).
 */
export type LossSaleWindow = { symbol: string; start: string; end: string }
export type Acquisition = { symbol: string; date: string }
export type WashSaleLeg = { symbol: string; side: 'buy' | 'sell'; realisesLoss: boolean }

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
  return recentAcquisitions.some((a) => a.symbol === leg.symbol && a.date >= from && a.date <= asOfISO)
}
