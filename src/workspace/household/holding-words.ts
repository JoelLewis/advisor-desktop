import { fmtEasternStamp, fmtPoints, fmtQuantity } from '@/kit/measure'
import type { AssetClassRow, HoldingOrder, LastContact, MemberStanding } from '@/types/workspace-household'
import { quantityUnitWords, workingOrderWords } from '@/kit/working-order-words'
import { CHANNEL_WORDS } from './household-words'

/** An order on the holding it changes: "working: buy 200 QQQ, limit 480.00", "pending compliance release: sell 943 SPY", "filled 09:30 ET: sold 7,000 INTC". */
export function holdingOrderWords(order: HoldingOrder, asOf: string): string {
  switch (order.kind) {
    case 'working': return `working: ${workingOrderWords(order, quantityUnitWords(order.quantityUnit))}`
    case 'pending_compliance': return `pending compliance release: ${order.side} ${fmtQuantity(order.quantity)} ${order.symbol}`
    case 'filled': return `filled ${fmtEasternStamp(order.at, asOf)}: ${order.side === 'buy' ? 'bought' : 'sold'} ${fmtQuantity(order.quantity)} ${order.symbol}`
  }
}

/** A member in their own right: their tolerance band, and their own accounts as a whole when measured. */
export function standingWords({ tolerance, whole }: MemberStanding): { tolerance: string; whole?: string } {
  const band = `${tolerance.band} tolerance, ${fmtPoints(tolerance.floor)}–${fmtPoints(tolerance.ceiling)} pts`
  return whole ? { tolerance: band, whole: `accounts as a whole ${fmtPoints(whole.score)} pts` } : { tolerance: band }
}

export function ordersCellWords({ openOrders, fillsToday }: Pick<AssetClassRow, 'openOrders' | 'fillsToday'>): string {
  return [...(openOrders > 0 ? [`${fmtQuantity(openOrders)} open`] : []), ...(fillsToday > 0 ? [`${fmtQuantity(fillsToday)} filled today`] : [])].join(' · ')
}

/** The last word between the firm and a client: who, when (Eastern), and where. */
export function contactWords({ clientName, at, direction, where }: LastContact, asOf: string): string {
  const when = fmtEasternStamp(at, asOf)
  if (where.kind === 'conversation') return direction === 'from_client' ? `${clientName} wrote at ${when}, in their conversation` : `The firm wrote to ${clientName} at ${when}, in their conversation`
  const how = `by ${CHANNEL_WORDS[where.channel].toLowerCase()}: ${where.subject}`
  return direction === 'from_client' ? `From ${clientName}, ${when}, ${how}` : `To ${clientName}, ${when}, ${how}`
}
