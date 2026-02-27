import type { SymbolSearchResult, OptionChain, OptionStrike } from '@/types/trading'

// ── Equities (existing) ───────────────────────────────────────────────

export const equitySymbols: SymbolSearchResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'equity', lastPrice: 185.0, change: 2.34, changePct: 1.28 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', assetClass: 'equity', lastPrice: 420.0, change: -3.15, changePct: -0.74 },
  { symbol: 'GOOG', name: 'Alphabet Inc.', assetClass: 'equity', lastPrice: 175.0, change: 1.87, changePct: 1.08 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetClass: 'equity', lastPrice: 195.0, change: 4.12, changePct: 2.16 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetClass: 'equity', lastPrice: 870.0, change: -12.50, changePct: -1.42 },
  { symbol: 'META', name: 'Meta Platforms Inc.', assetClass: 'equity', lastPrice: 520.0, change: 8.75, changePct: 1.71 },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetClass: 'equity', lastPrice: 245.0, change: -5.60, changePct: -2.23 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', assetClass: 'equity', lastPrice: 410.0, change: 1.20, changePct: 0.29 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', assetClass: 'equity', lastPrice: 205.0, change: 3.45, changePct: 1.71 },
  { symbol: 'V', name: 'Visa Inc.', assetClass: 'equity', lastPrice: 295.0, change: -1.80, changePct: -0.61 },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', assetClass: 'equity', lastPrice: 540.0, change: 6.30, changePct: 1.18 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', assetClass: 'equity', lastPrice: 155.0, change: -0.95, changePct: -0.61 },
  { symbol: 'PG', name: 'Procter & Gamble Co.', assetClass: 'equity', lastPrice: 165.0, change: 0.75, changePct: 0.46 },
  { symbol: 'HD', name: 'The Home Depot Inc.', assetClass: 'equity', lastPrice: 385.0, change: -2.40, changePct: -0.62 },
  { symbol: 'MA', name: 'Mastercard Inc.', assetClass: 'equity', lastPrice: 475.0, change: 5.10, changePct: 1.09 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', assetClass: 'equity', lastPrice: 175.0, change: 2.15, changePct: 1.24 },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', assetClass: 'equity', lastPrice: 125.0, change: -1.35, changePct: -1.07 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', assetClass: 'equity', lastPrice: 170.0, change: 0.90, changePct: 0.53 },
  { symbol: 'KO', name: 'The Coca-Cola Company', assetClass: 'equity', lastPrice: 62.0, change: 0.28, changePct: 0.45 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', assetClass: 'equity', lastPrice: 1350.0, change: -18.70, changePct: -1.37 },
  { symbol: 'LLY', name: 'Eli Lilly and Company', assetClass: 'equity', lastPrice: 760.0, change: 11.25, changePct: 1.50 },
  { symbol: 'COST', name: 'Costco Wholesale Corp.', assetClass: 'equity', lastPrice: 750.0, change: 4.60, changePct: 0.62 },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', assetClass: 'equity', lastPrice: 570.0, change: -3.80, changePct: -0.66 },
  { symbol: 'ORCL', name: 'Oracle Corporation', assetClass: 'equity', lastPrice: 135.0, change: 1.95, changePct: 1.47 },
  { symbol: 'ACN', name: 'Accenture plc', assetClass: 'equity', lastPrice: 375.0, change: -2.10, changePct: -0.56 },
]

// ── Mutual Funds ──────────────────────────────────────────────────────

export const mutualFundSymbols: SymbolSearchResult[] = [
  { symbol: 'VFIAX', name: 'Vanguard 500 Index Fund Admiral', assetClass: 'mutual_fund', lastPrice: 465.32, change: 3.12, changePct: 0.67, nav: 465.32, navDate: '2026-02-25', expenseRatio: 0.04, category: 'Large Blend', minInvestment: 3000 },
  { symbol: 'FXAIX', name: 'Fidelity 500 Index Fund', assetClass: 'mutual_fund', lastPrice: 198.75, change: 1.34, changePct: 0.68, nav: 198.75, navDate: '2026-02-25', expenseRatio: 0.015, category: 'Large Blend', minInvestment: 0 },
  { symbol: 'VBTLX', name: 'Vanguard Total Bond Market Index Admiral', assetClass: 'mutual_fund', lastPrice: 9.82, change: -0.03, changePct: -0.31, nav: 9.82, navDate: '2026-02-25', expenseRatio: 0.05, category: 'Intermediate Core Bond', minInvestment: 3000 },
  { symbol: 'PIMIX', name: 'PIMCO Income Fund Institutional', assetClass: 'mutual_fund', lastPrice: 11.45, change: 0.02, changePct: 0.17, nav: 11.45, navDate: '2026-02-25', expenseRatio: 0.59, category: 'Multisector Bond', minInvestment: 1000000 },
  { symbol: 'VWILX', name: 'Vanguard International Growth Admiral', assetClass: 'mutual_fund', lastPrice: 38.94, change: 0.56, changePct: 1.46, nav: 38.94, navDate: '2026-02-25', expenseRatio: 0.32, category: 'Foreign Large Growth', minInvestment: 3000 },
  { symbol: 'DODGX', name: 'Dodge & Cox Stock Fund', assetClass: 'mutual_fund', lastPrice: 262.18, change: -1.87, changePct: -0.71, nav: 262.18, navDate: '2026-02-25', expenseRatio: 0.51, category: 'Large Value', minInvestment: 2500 },
  { symbol: 'VTSAX', name: 'Vanguard Total Stock Market Index Admiral', assetClass: 'mutual_fund', lastPrice: 120.45, change: 0.98, changePct: 0.82, nav: 120.45, navDate: '2026-02-25', expenseRatio: 0.04, category: 'Large Blend', minInvestment: 3000 },
  { symbol: 'FBALX', name: 'Fidelity Balanced Fund', assetClass: 'mutual_fund', lastPrice: 28.67, change: 0.15, changePct: 0.53, nav: 28.67, navDate: '2026-02-25', expenseRatio: 0.49, category: 'Allocation—50% to 70% Equity', minInvestment: 0 },
  { symbol: 'TRBCX', name: 'T. Rowe Price Blue Chip Growth', assetClass: 'mutual_fund', lastPrice: 155.34, change: 2.45, changePct: 1.60, nav: 155.34, navDate: '2026-02-25', expenseRatio: 0.69, category: 'Large Growth', minInvestment: 2500 },
  { symbol: 'VTMGX', name: 'Vanguard Developed Markets Index Admiral', assetClass: 'mutual_fund', lastPrice: 14.23, change: 0.11, changePct: 0.78, nav: 14.23, navDate: '2026-02-25', expenseRatio: 0.07, category: 'Foreign Large Blend', minInvestment: 3000 },
  { symbol: 'PRWCX', name: 'T. Rowe Price Capital Appreciation', assetClass: 'mutual_fund', lastPrice: 35.89, change: 0.22, changePct: 0.62, nav: 35.89, navDate: '2026-02-25', expenseRatio: 0.70, category: 'Allocation—70% to 85% Equity', minInvestment: 2500 },
  { symbol: 'VWENX', name: 'Vanguard Wellington Fund Admiral', assetClass: 'mutual_fund', lastPrice: 74.56, change: 0.34, changePct: 0.46, nav: 74.56, navDate: '2026-02-25', expenseRatio: 0.16, category: 'Allocation—50% to 70% Equity', minInvestment: 50000 },
]

// ── Fixed Income ──────────────────────────────────────────────────────

export const fixedIncomeSymbols: SymbolSearchResult[] = [
  { symbol: 'UST-2Y', name: 'US Treasury Note 2-Year', assetClass: 'fixed_income', lastPrice: 99.45, change: 0.08, changePct: 0.08, cusip: '91282CJH2', couponRate: 4.625, maturityDate: '2028-02-28', creditRating: 'AAA', yieldToMaturity: 4.35, yieldToWorst: 4.35, duration: 1.92, parValue: 1000, issuer: 'US Treasury', bondType: 'treasury' },
  { symbol: 'UST-5Y', name: 'US Treasury Note 5-Year', assetClass: 'fixed_income', lastPrice: 97.88, change: -0.15, changePct: -0.15, cusip: '91282CJK5', couponRate: 4.250, maturityDate: '2031-02-15', creditRating: 'AAA', yieldToMaturity: 4.52, yieldToWorst: 4.52, duration: 4.48, parValue: 1000, issuer: 'US Treasury', bondType: 'treasury' },
  { symbol: 'UST-10Y', name: 'US Treasury Note 10-Year', assetClass: 'fixed_income', lastPrice: 95.25, change: -0.32, changePct: -0.34, cusip: '91282CJM1', couponRate: 4.000, maturityDate: '2036-02-15', creditRating: 'AAA', yieldToMaturity: 4.58, yieldToWorst: 4.58, duration: 8.12, parValue: 1000, issuer: 'US Treasury', bondType: 'treasury' },
  { symbol: 'UST-30Y', name: 'US Treasury Bond 30-Year', assetClass: 'fixed_income', lastPrice: 88.50, change: -0.78, changePct: -0.87, cusip: '912810TL0', couponRate: 4.375, maturityDate: '2056-02-15', creditRating: 'AAA', yieldToMaturity: 4.72, yieldToWorst: 4.72, duration: 16.85, parValue: 1000, issuer: 'US Treasury', bondType: 'treasury' },
  { symbol: 'AAPL-30', name: 'Apple Inc. 3.00% 2030', assetClass: 'fixed_income', lastPrice: 94.75, change: 0.12, changePct: 0.13, cusip: '037833DX1', couponRate: 3.000, maturityDate: '2030-06-20', creditRating: 'AA+', yieldToMaturity: 4.15, yieldToWorst: 4.15, duration: 3.85, parValue: 1000, issuer: 'Apple Inc.', bondType: 'corporate' },
  { symbol: 'MSFT-31', name: 'Microsoft Corp 2.40% 2031', assetClass: 'fixed_income', lastPrice: 91.20, change: -0.18, changePct: -0.20, cusip: '594918BW6', couponRate: 2.400, maturityDate: '2031-08-08', creditRating: 'AAA', yieldToMaturity: 4.25, yieldToWorst: 4.25, duration: 4.62, parValue: 1000, issuer: 'Microsoft Corp', bondType: 'corporate' },
  { symbol: 'JPM-29', name: 'JPMorgan Chase 4.25% 2029', assetClass: 'fixed_income', lastPrice: 98.80, change: 0.05, changePct: 0.05, cusip: '46647PAZ5', couponRate: 4.250, maturityDate: '2029-10-01', creditRating: 'A-', yieldToMaturity: 4.45, yieldToWorst: 4.45, duration: 3.15, parValue: 1000, issuer: 'JPMorgan Chase & Co.', bondType: 'corporate' },
  { symbol: 'GS-28', name: 'Goldman Sachs 3.85% 2028', assetClass: 'fixed_income', lastPrice: 97.50, change: -0.10, changePct: -0.10, cusip: '38141GYB3', couponRate: 3.850, maturityDate: '2028-07-08', creditRating: 'A+', yieldToMaturity: 4.30, yieldToWorst: 4.30, duration: 2.18, parValue: 1000, issuer: 'Goldman Sachs Group', bondType: 'corporate' },
  { symbol: 'CA-GO-32', name: 'California GO 5.00% 2032', assetClass: 'fixed_income', lastPrice: 105.25, change: 0.20, changePct: 0.19, cusip: '13063DRG8', couponRate: 5.000, maturityDate: '2032-10-01', creditRating: 'AA-', yieldToMaturity: 3.25, yieldToWorst: 3.25, duration: 5.10, parValue: 5000, issuer: 'State of California', bondType: 'municipal' },
  { symbol: 'NY-GO-30', name: 'New York GO 4.50% 2030', assetClass: 'fixed_income', lastPrice: 102.75, change: 0.15, changePct: 0.15, cusip: '649791MQ7', couponRate: 4.500, maturityDate: '2030-03-15', creditRating: 'AA', yieldToMaturity: 3.15, yieldToWorst: 3.15, duration: 3.52, parValue: 5000, issuer: 'City of New York', bondType: 'municipal' },
  { symbol: 'TX-REV-33', name: 'Texas Water Revenue 4.75% 2033', assetClass: 'fixed_income', lastPrice: 103.50, change: 0.08, changePct: 0.08, cusip: '882854KR2', couponRate: 4.750, maturityDate: '2033-08-01', creditRating: 'AAA', yieldToMaturity: 3.40, yieldToWorst: 3.40, duration: 5.82, parValue: 5000, issuer: 'Texas Water Dev Board', bondType: 'municipal' },
  { symbol: 'FNMA-28', name: 'Fannie Mae 3.50% 2028', assetClass: 'fixed_income', lastPrice: 96.80, change: 0.04, changePct: 0.04, cusip: '3135G0W33', couponRate: 3.500, maturityDate: '2028-09-12', creditRating: 'AA+', yieldToMaturity: 4.10, yieldToWorst: 4.10, duration: 2.35, parValue: 1000, issuer: 'Fannie Mae', bondType: 'agency' },
]

// ── Digital Assets ────────────────────────────────────────────────────

export const digitalAssetSymbols: SymbolSearchResult[] = [
  { symbol: 'BTC', name: 'Bitcoin', assetClass: 'digital_asset', lastPrice: 87450.00, change: 1250.00, changePct: 1.45, volume24h: 32_500_000_000, marketCap: 1_720_000_000_000, circulatingSupply: 19_650_000, fractionalAllowed: true },
  { symbol: 'ETH', name: 'Ethereum', assetClass: 'digital_asset', lastPrice: 3280.00, change: -45.00, changePct: -1.35, volume24h: 15_800_000_000, marketCap: 394_000_000_000, circulatingSupply: 120_200_000, fractionalAllowed: true },
  { symbol: 'SOL', name: 'Solana', assetClass: 'digital_asset', lastPrice: 142.50, change: 5.80, changePct: 4.24, volume24h: 3_200_000_000, marketCap: 65_000_000_000, circulatingSupply: 456_000_000, fractionalAllowed: true },
  { symbol: 'ADA', name: 'Cardano', assetClass: 'digital_asset', lastPrice: 0.62, change: 0.03, changePct: 5.08, volume24h: 850_000_000, marketCap: 22_000_000_000, circulatingSupply: 35_500_000_000, fractionalAllowed: true },
  { symbol: 'AVAX', name: 'Avalanche', assetClass: 'digital_asset', lastPrice: 38.75, change: -1.20, changePct: -3.00, volume24h: 620_000_000, marketCap: 15_200_000_000, circulatingSupply: 392_000_000, fractionalAllowed: true },
  { symbol: 'DOT', name: 'Polkadot', assetClass: 'digital_asset', lastPrice: 7.85, change: 0.25, changePct: 3.29, volume24h: 380_000_000, marketCap: 10_500_000_000, circulatingSupply: 1_340_000_000, fractionalAllowed: true },
  { symbol: 'LINK', name: 'Chainlink', assetClass: 'digital_asset', lastPrice: 18.40, change: 0.65, changePct: 3.66, volume24h: 520_000_000, marketCap: 11_200_000_000, circulatingSupply: 608_000_000, fractionalAllowed: true },
  { symbol: 'MATIC', name: 'Polygon', assetClass: 'digital_asset', lastPrice: 0.92, change: -0.04, changePct: -4.17, volume24h: 410_000_000, marketCap: 9_200_000_000, circulatingSupply: 10_000_000_000, fractionalAllowed: true },
  { symbol: 'UNI', name: 'Uniswap', assetClass: 'digital_asset', lastPrice: 12.35, change: 0.42, changePct: 3.52, volume24h: 290_000_000, marketCap: 7_400_000_000, circulatingSupply: 600_000_000, fractionalAllowed: true },
  { symbol: 'ATOM', name: 'Cosmos', assetClass: 'digital_asset', lastPrice: 9.45, change: -0.18, changePct: -1.87, volume24h: 195_000_000, marketCap: 3_600_000_000, circulatingSupply: 381_000_000, fractionalAllowed: true },
]

// ── Option chain data ─────────────────────────────────────────────────

const OPTION_UNDERLYINGS: Record<string, number> = {
  AAPL: 185.0,
  MSFT: 420.0,
  NVDA: 870.0,
  AMZN: 195.0,
  TSLA: 245.0,
}

const EXPIRATION_DATES = [
  { date: '2026-03-07', dte: 9 },
  { date: '2026-03-21', dte: 23 },
  { date: '2026-04-17', dte: 50 },
  { date: '2026-06-19', dte: 113 },
  { date: '2026-09-18', dte: 204 },
]

function generateStrike(underlying: string, price: number, strike: number, dte: number, type: 'call' | 'put'): {
  symbol: string
  optionType: 'call' | 'put'
  strikePrice: number
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  impliedVolatility: number
  delta: number
  gamma: number
  theta: number
  vega: number
} {
  const moneyness = (strike - price) / price
  const timeFactor = Math.sqrt(dte / 365)
  const iv = 0.25 + Math.abs(moneyness) * 0.3 + (1 - timeFactor) * 0.05

  let delta: number
  if (type === 'call') {
    delta = Math.max(0.02, Math.min(0.98, 0.5 - moneyness * 2.5 + timeFactor * 0.1))
  } else {
    delta = -Math.max(0.02, Math.min(0.98, 0.5 + moneyness * 2.5 + timeFactor * 0.1))
  }

  const intrinsic = type === 'call' ? Math.max(0, price - strike) : Math.max(0, strike - price)
  const timeValue = price * iv * timeFactor * 0.4
  const theoreticalPrice = intrinsic + timeValue * Math.abs(delta)
  const mid = Math.max(0.01, +theoreticalPrice.toFixed(2))

  const spread = Math.max(0.01, mid * 0.02)
  const bid = Math.max(0.01, +(mid - spread / 2).toFixed(2))
  const ask = +(mid + spread / 2).toFixed(2)

  const expDate = `${underlying}${type === 'call' ? 'C' : 'P'}${strike}`

  return {
    symbol: expDate,
    optionType: type,
    strikePrice: strike,
    bid,
    ask,
    last: +(bid + (ask - bid) * 0.4).toFixed(2),
    volume: Math.floor(Math.random() * 5000) + 100,
    openInterest: Math.floor(Math.random() * 20000) + 500,
    impliedVolatility: +iv.toFixed(4),
    delta: +delta.toFixed(4),
    gamma: +(0.01 + Math.abs(0.5 - Math.abs(delta)) * 0.02).toFixed(4),
    theta: -(+(0.01 + mid * 0.005 / Math.max(dte, 1)).toFixed(4)),
    vega: +(0.05 + timeFactor * 0.15).toFixed(4),
  }
}

function generateStrikes(underlying: string, price: number, dte: number): OptionStrike[] {
  // Generate 7 strikes around the current price
  const step = price < 50 ? 2.5 : price < 200 ? 5 : price < 500 ? 10 : 25
  const atm = Math.round(price / step) * step
  const offsets = [-3, -2, -1, 0, 1, 2, 3]

  return offsets.map((offset) => {
    const strike = atm + offset * step
    return {
      strikePrice: strike,
      call: { ...generateStrike(underlying, price, strike, dte, 'call'), expirationDate: '' },
      put: { ...generateStrike(underlying, price, strike, dte, 'put'), expirationDate: '' },
    }
  })
}

export function getOptionChainData(underlying: string): OptionChain | null {
  const price = OPTION_UNDERLYINGS[underlying.toUpperCase()]
  if (!price) return null

  return {
    underlying: underlying.toUpperCase(),
    underlyingPrice: price,
    expirations: EXPIRATION_DATES.map((exp) => ({
      expirationDate: exp.date,
      daysToExpiration: exp.dte,
      strikes: generateStrikes(underlying.toUpperCase(), price, exp.dte).map((s) => ({
        ...s,
        call: { ...s.call, expirationDate: exp.date },
        put: { ...s.put, expirationDate: exp.date },
      })),
    })),
  }
}

// ── Combined symbol list for backward compatibility ───────────────────

export const symbols: SymbolSearchResult[] = [
  ...equitySymbols,
  ...mutualFundSymbols,
  ...fixedIncomeSymbols,
  ...digitalAssetSymbols,
]
