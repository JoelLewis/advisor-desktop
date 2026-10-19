import { fmtPrice, fmtQuantity } from '@/kit/measure'

/** A working order as a line reads it: "buy 200 QQQ, limit 480.00", or with a unit, "buy 5 contracts AAPLC185, limit 8.50". */
export const workingOrderWords = (
  { side, quantity, symbol, limitPrice }: { side: 'buy' | 'sell'; quantity: number; symbol: string; limitPrice?: number },
  unit?: string,
): string =>
  `${side} ${fmtQuantity(quantity)}${unit !== undefined ? ` ${unit}` : ''} ${symbol}${limitPrice !== undefined ? `, limit ${fmtPrice(limitPrice)}` : ''}`

/** The unit a working order's line names: none for shares, the read default; "contracts" for an option, "par" for a bond. */
export const quantityUnitWords = (unit: 'sh' | 'contracts' | 'par'): string | undefined => (unit === 'sh' ? undefined : unit)
