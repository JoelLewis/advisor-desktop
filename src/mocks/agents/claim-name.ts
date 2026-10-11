const hasDigit = (text: string) => /\d/.test(text)

/**
 * How a claim names a security. Claim text carries no digits, so a name with digits
 * ("SPDR S&P 500 ETF Trust") gives way to its ticker when the ticker has none (SPY).
 */
export function claimNameOf(symbol: string, name: string | undefined): string {
  if (symbol === 'CASH') return 'Cash'
  if (name !== undefined && !hasDigit(name)) return name
  if (symbol.length > 0 && !hasDigit(symbol)) return symbol
  return 'A security'
}
