import type { SymbolSearchResult } from '@/types/trading'

/**
 * D24/D25 — one price per security. This quote feed disagreed with the positions it prices: NVDA
 * was $870.00 here against $780.00 in positions.ts, AAPL $185.00 against $195.40, MSFT $420.00
 * against $420.15, and three of the crypto quotes disagreed with the acc-045 holdings they value.
 * Positions are the book of record, so every quote below is the position's price, and
 * currencies.ts derives its implied crypto rates from `digitalAssetSymbols` rather than restating
 * them. `changePct` is recomputed as `change / (lastPrice - change)` wherever a price moved.
 */

// ── Equities (existing) ───────────────────────────────────────────────

// ── Mutual Funds ──────────────────────────────────────────────────────

// ── Fixed Income ──────────────────────────────────────────────────────

// ── Digital Assets ────────────────────────────────────────────────────

export const digitalAssetSymbols: SymbolSearchResult[] = [
  { symbol: 'BTC', name: 'Bitcoin', assetClass: 'digital_asset', lastPrice: 87450.00, change: 1250.00, changePct: 1.45, volume24h: 32_500_000_000, marketCap: 1_720_000_000_000, circulatingSupply: 19_650_000, fractionalAllowed: true },
  { symbol: 'ETH', name: 'Ethereum', assetClass: 'digital_asset', lastPrice: 3280.00, change: -45.00, changePct: -1.35, volume24h: 15_800_000_000, marketCap: 394_000_000_000, circulatingSupply: 120_200_000, fractionalAllowed: true },
  { symbol: 'SOL', name: 'Solana', assetClass: 'digital_asset', lastPrice: 142.50, change: 5.80, changePct: 4.24, volume24h: 3_200_000_000, marketCap: 65_000_000_000, circulatingSupply: 456_000_000, fractionalAllowed: true },
  { symbol: 'ADA', name: 'Cardano', assetClass: 'digital_asset', lastPrice: 0.62, change: 0.03, changePct: 5.08, volume24h: 850_000_000, marketCap: 22_000_000_000, circulatingSupply: 35_500_000_000, fractionalAllowed: true },
  { symbol: 'AVAX', name: 'Avalanche', assetClass: 'digital_asset', lastPrice: 41.67, change: -1.20, changePct: -2.80, volume24h: 620_000_000, marketCap: 16_300_000_000, circulatingSupply: 392_000_000, fractionalAllowed: true },
  { symbol: 'DOT', name: 'Polkadot', assetClass: 'digital_asset', lastPrice: 8.40, change: 0.25, changePct: 3.07, volume24h: 380_000_000, marketCap: 11_300_000_000, circulatingSupply: 1_340_000_000, fractionalAllowed: true },
  { symbol: 'LINK', name: 'Chainlink', assetClass: 'digital_asset', lastPrice: 20.41, change: 0.65, changePct: 3.29, volume24h: 520_000_000, marketCap: 12_400_000_000, circulatingSupply: 608_000_000, fractionalAllowed: true },
  { symbol: 'MATIC', name: 'Polygon', assetClass: 'digital_asset', lastPrice: 0.92, change: -0.04, changePct: -4.17, volume24h: 410_000_000, marketCap: 9_200_000_000, circulatingSupply: 10_000_000_000, fractionalAllowed: true },
  { symbol: 'UNI', name: 'Uniswap', assetClass: 'digital_asset', lastPrice: 12.35, change: 0.42, changePct: 3.52, volume24h: 290_000_000, marketCap: 7_400_000_000, circulatingSupply: 600_000_000, fractionalAllowed: true },
  { symbol: 'ATOM', name: 'Cosmos', assetClass: 'digital_asset', lastPrice: 9.45, change: -0.18, changePct: -1.87, volume24h: 195_000_000, marketCap: 3_600_000_000, circulatingSupply: 381_000_000, fractionalAllowed: true },
]

