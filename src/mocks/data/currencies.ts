// ── FX Rates (USD base) ──
// 1 USD = X units of target currency
// For crypto: since 1 BTC >> 1 USD, the rate is a small fraction
// (e.g., 0.000011 means 1 USD buys 0.000011 BTC, i.e., BTC ≈ $91K)

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

  // ── Crypto ──
  BTC: 0.000011,   // ≈ $91,000
  ETH: 0.00028,    // ≈ $3,571
  SOL: 0.0042,     // ≈ $238
  ADA: 1.11,       // ≈ $0.90
  AVAX: 0.024,     // ≈ $41.67
  DOT: 0.119,      // ≈ $8.40
  LINK: 0.049,     // ≈ $20.41
  MATIC: 1.82,     // ≈ $0.55
  UNI: 0.067,      // ≈ $14.93
  ATOM: 0.089,     // ≈ $11.24

  // ── Stablecoins ──
  USDT: 1.0,
  USDC: 1.0,
  DAI: 1.0,
} as const satisfies Record<string, number>

export const FX_RATE_TIMESTAMP = '2025-12-15T16:00:00Z' as const
