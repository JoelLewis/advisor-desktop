import { fmtPrice, fmtQuantity } from '@/kit/measure'
import type { CountedWorkingOrder } from '@/types/workspace-proposal'

/** A working order as a line reads it: "buy 200 QQQ, limit 480.00", or with a unit, "buy 5 contracts AAPLC185, limit 8.50". */
export const workingOrderWords = (
  { side, quantity, symbol, limitPrice }: Pick<CountedWorkingOrder, 'side' | 'quantity' | 'symbol' | 'limitPrice'>,
  unit?: string,
): string =>
  `${side} ${fmtQuantity(quantity)}${unit !== undefined ? ` ${unit}` : ''} ${symbol}${limitPrice !== undefined ? `, limit ${fmtPrice(limitPrice)}` : ''}`
