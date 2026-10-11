export type HoldingCharacter = 'short' | 'long'

/**
 * IRC §1222: net short-term and long-term results within each character, then offset a net loss
 * in one against a net gain in the other. A net loss overall owes nothing here; the excess
 * carries forward and is reported by the caller, never shown as a negative tax.
 */
export function netCapitalGainsTax(shortTerm: number, longTerm: number, rateFor: (p: HoldingCharacter) => number): number {
  let st = shortTerm
  let lt = longTerm
  if (st < 0 && lt > 0) { lt = Math.max(0, lt + st); st = 0 }
  else if (lt < 0 && st > 0) { st = Math.max(0, st + lt); lt = 0 }
  return Math.round(Math.max(0, st) * rateFor('short') + Math.max(0, lt) * rateFor('long'))
}
