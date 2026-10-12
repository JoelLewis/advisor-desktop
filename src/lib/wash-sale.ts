/**
 * IRC §1091 disallows a loss when substantially identical securities are acquired within 30 days
 * before or after the sale. "Substantially identical" is approximated as the same symbol: INTC and
 * SMH are distinct, which is the household's own compliance ruling (comp-006).
 *
 * Two further approximations, both deliberate:
 * - A leg is judged on its net result, so a loss lot inside a net-gain leg is not tested, and
 *   `hasWashSaleRisk` says only whether a replacement exists. How many shares wash, and whether
 *   the washed loss is deferred or lost, is `matchWashedShares`' job, per lot.
 * - A multi-account batch that sells X at a loss in one account and buys X in another in the same
 *   batch is not cross-checked; only recorded sales and held lots are.
 */
export type LossSaleWindow = { symbol: string; start: string; end: string }
/**
 * A purchase that can replace sold shares. `account` says what a loss it washes becomes: in a
 * taxable account the disallowed loss is added to the replacement's basis (§1091(d)) and is only
 * deferred; in an IRA, Roth or other tax-advantaged account there is no basis to carry it into, so
 * it is permanently disallowed (Rev. Rul. 2008-5).
 */
export type Acquisition = { symbol: string; date: string; lotId: string; quantity: number; account: 'taxable' | 'tax_advantaged' }
/** `soldLotIds`: the lots a sell consumes — shares disposed of in the sale are not replacement shares. */
export type WashSaleLeg = { symbol: string; side: 'buy' | 'sell'; realisesLoss: boolean; soldLotIds: readonly string[] }

const DAY_MS = 86_400_000

export function isoDaysBefore(asOfISO: string, days: number): string {
  return new Date(Date.parse(`${asOfISO}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10)
}

export function hasWashSaleRisk(
  leg: WashSaleLeg,
  openLossWindows: readonly LossSaleWindow[],
  recentAcquisitions: readonly Pick<Acquisition, 'symbol' | 'date' | 'lotId'>[],
  asOfISO: string,
): boolean {
  if (leg.side === 'buy') {
    return openLossWindows.some((w) => w.symbol === leg.symbol && w.start <= asOfISO && asOfISO <= w.end)
  }
  if (!leg.realisesLoss) return false
  const from = isoDaysBefore(asOfISO, 30)
  return recentAcquisitions.some((a) => a.symbol === leg.symbol && !leg.soldLotIds.includes(a.lotId) && a.date >= from && a.date <= asOfISO)
}

/** A lot that would realise a loss if sold today. */
export type LossLot = { lotId: string; symbol: string; purchaseDate: string; quantity: number }

/** The shares of one loss lot whose loss §1091 would take, by what becomes of it. */
export type WashedShares = { deferredShares: number; disallowedShares: number }

const byDateThenId = <T>(dateOf: (x: T) => string, idOf: (x: T) => string) => (a: T, b: T) =>
  dateOf(a).localeCompare(dateOf(b)) || idOf(a).localeCompare(idOf(b))

/**
 * Treas. Reg. §1.1091-1(c): when fewer replacement shares are acquired than loss shares are sold,
 * only the loss on as many sold shares as were replaced is disallowed, and each replacement share
 * washes one sold share, never two. Replacement shares are matched in the order they were bought,
 * earliest first, as the regulation directs.
 *
 * The scenario is "sell every one of `lossLots` today": the replacements are the purchases of the
 * same symbol in the last 30 days that are not themselves among the lots sold. The sold shares are
 * taken in the order they were bought, earliest first — a convention, since the regulation does
 * not order shares sold together. Purchases in the 30 days after today cannot be known and are
 * not counted; an open loss-sale window (`repurchaseBlockedUntil`) is what guards those.
 *
 * Returns an entry for every loss lot, `0`/`0` when nothing washes it.
 */
export function matchWashedShares(
  lossLots: readonly LossLot[],
  acquisitions: readonly Acquisition[],
  asOfISO: string,
): Map<string, WashedShares> {
  const from = isoDaysBefore(asOfISO, 30)
  const sold = new Set(lossLots.map((l) => l.lotId))
  const washed = new Map<string, WashedShares>(lossLots.map((l) => [l.lotId, { deferredShares: 0, disallowedShares: 0 }]))
  for (const symbol of new Set(lossLots.map((l) => l.symbol))) {
    const replacements = acquisitions
      .filter((a) => a.symbol === symbol && !sold.has(a.lotId) && a.date >= from && a.date <= asOfISO)
      .sort(byDateThenId((a) => a.date, (a) => a.lotId))
      .map((a) => ({ account: a.account, unmatched: a.quantity }))
    const losses = lossLots.filter((l) => l.symbol === symbol).sort(byDateThenId((l) => l.purchaseDate, (l) => l.lotId))
    for (const loss of losses) {
      let unwashed = loss.quantity
      const shares: WashedShares = { deferredShares: 0, disallowedShares: 0 }
      for (const replacement of replacements) {
        if (unwashed <= 0) break
        const matched = Math.min(unwashed, replacement.unmatched)
        if (matched <= 0) continue
        replacement.unmatched -= matched
        unwashed -= matched
        if (replacement.account === 'taxable') shares.deferredShares += matched
        else shares.disallowedShares += matched
      }
      washed.set(loss.lotId, shares)
    }
  }
  return washed
}
