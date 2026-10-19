import { digitalAssetSymbols } from './trading'

// ── FX Rates (USD base) ──
// 1 USD = X units of target currency
// For crypto: since 1 BTC >> 1 USD, the rate is a small fraction
// (e.g., 0.0000114 means 1 USD buys 0.0000114 BTC, i.e., BTC ≈ $87.5K)

/**
 * A crypto FX rate is the reciprocal of that asset's price, so restating it invites the two
 * to drift: BTC was quoted at 0.000011 (implying $90,909) against a book price of $87,450, SOL at
 * 0.0042 ($238) against $142.50, and every other crypto rate here disagreed with its own quote.
 * The rates are now derived from `digitalAssetSymbols`, which in turn carries the position prices.
 */
function impliedRate(symbol: string): number {
  const quote = digitalAssetSymbols.find((s) => s.symbol === symbol)
  if (!quote) throw new Error(`No quote for ${symbol}; cannot derive its USD-base FX rate`)
  return 1 / quote.lastPrice
}

export const FX_RATES_USD_BASE = {
  // ── Fiat ──
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.53,
  HKD: 7.82,
  SGD: 1.34,
  NZD: 1.67,
  SEK: 10.42,
  NOK: 10.58,
  DKK: 6.87,
  CNY: 7.24,
  INR: 83.12,
  BRL: 4.97,
  MXN: 17.15,
  ZAR: 18.62,
  KRW: 1298.50,
  TWD: 31.45,

  // ── Crypto (derived from the quote feed — see `impliedRate`) ──
  BTC: impliedRate('BTC'),
  ETH: impliedRate('ETH'),
  SOL: impliedRate('SOL'),
  ADA: impliedRate('ADA'),
  AVAX: impliedRate('AVAX'),
  DOT: impliedRate('DOT'),
  LINK: impliedRate('LINK'),
  MATIC: impliedRate('MATIC'),
  UNI: impliedRate('UNI'),
  ATOM: impliedRate('ATOM'),

  // ── Stablecoins (pegged 1:1, matching the USDC position's $1.00 price) ──
  USDT: 1.0,
  USDC: 1.0,
  DAI: 1.0,
} satisfies Record<string, number>
