import type { CurrencyCode, CurrencyInfo, FXRateMap } from '@/types/currency';

const CURRENCY_REGISTRY: Record<CurrencyCode, CurrencyInfo> = {
  // ── Fiat currencies (20) ──────────────────────────────────────────────
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2, flag: '\u{1F1FA}\u{1F1F8}', isFiat: true, isCrypto: false },
  EUR: { code: 'EUR', name: 'Euro', symbol: '\u20AC', locale: 'de-DE', decimals: 2, flag: '\u{1F1EA}\u{1F1FA}', isFiat: true, isCrypto: false },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '\u00A3', locale: 'en-GB', decimals: 2, flag: '\u{1F1EC}\u{1F1E7}', isFiat: true, isCrypto: false },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', locale: 'ja-JP', decimals: 0, flag: '\u{1F1EF}\u{1F1F5}', isFiat: true, isCrypto: false },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', decimals: 2, flag: '\u{1F1E8}\u{1F1ED}', isFiat: true, isCrypto: false },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA', decimals: 2, flag: '\u{1F1E8}\u{1F1E6}', isFiat: true, isCrypto: false },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 2, flag: '\u{1F1E6}\u{1F1FA}', isFiat: true, isCrypto: false },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK', decimals: 2, flag: '\u{1F1ED}\u{1F1F0}', isFiat: true, isCrypto: false },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', decimals: 2, flag: '\u{1F1F8}\u{1F1EC}', isFiat: true, isCrypto: false },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ', decimals: 2, flag: '\u{1F1F3}\u{1F1FF}', isFiat: true, isCrypto: false },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE', decimals: 2, flag: '\u{1F1F8}\u{1F1EA}', isFiat: true, isCrypto: false },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO', decimals: 2, flag: '\u{1F1F3}\u{1F1F4}', isFiat: true, isCrypto: false },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK', decimals: 2, flag: '\u{1F1E9}\u{1F1F0}', isFiat: true, isCrypto: false },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5', locale: 'zh-CN', decimals: 2, flag: '\u{1F1E8}\u{1F1F3}', isFiat: true, isCrypto: false },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', locale: 'en-IN', decimals: 2, flag: '\u{1F1EE}\u{1F1F3}', isFiat: true, isCrypto: false },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR', decimals: 2, flag: '\u{1F1E7}\u{1F1F7}', isFiat: true, isCrypto: false },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX', decimals: 2, flag: '\u{1F1F2}\u{1F1FD}', isFiat: true, isCrypto: false },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', decimals: 2, flag: '\u{1F1FF}\u{1F1E6}', isFiat: true, isCrypto: false },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9', locale: 'ko-KR', decimals: 0, flag: '\u{1F1F0}\u{1F1F7}', isFiat: true, isCrypto: false },
  TWD: { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', locale: 'zh-TW', decimals: 2, flag: '\u{1F1F9}\u{1F1FC}', isFiat: true, isCrypto: false },

  // ── Crypto currencies (10) ────────────────────────────────────────────
  BTC:   { code: 'BTC',   name: 'Bitcoin',   symbol: '\u20BF', locale: 'en-US', decimals: 8, flag: '', isFiat: false, isCrypto: true },
  ETH:   { code: 'ETH',   name: 'Ethereum',  symbol: '\u039E', locale: 'en-US', decimals: 8, flag: '', isFiat: false, isCrypto: true },
  SOL:   { code: 'SOL',   name: 'Solana',    symbol: 'SOL',    locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  ADA:   { code: 'ADA',   name: 'Cardano',   symbol: 'ADA',    locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  AVAX:  { code: 'AVAX',  name: 'Avalanche', symbol: 'AVAX',   locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  DOT:   { code: 'DOT',   name: 'Polkadot',  symbol: 'DOT',    locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  LINK:  { code: 'LINK',  name: 'Chainlink', symbol: 'LINK',   locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  MATIC: { code: 'MATIC', name: 'Polygon',   symbol: 'MATIC',  locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  UNI:   { code: 'UNI',   name: 'Uniswap',   symbol: 'UNI',    locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  ATOM:  { code: 'ATOM',  name: 'Cosmos',    symbol: 'ATOM',   locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },

  // ── Stablecoins (3) ───────────────────────────────────────────────────
  USDT: { code: 'USDT', name: 'Tether',   symbol: 'USDT', locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  USDC: { code: 'USDC', name: 'USD Coin', symbol: 'USDC', locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
  DAI:  { code: 'DAI',  name: 'Dai',      symbol: 'DAI',  locale: 'en-US', decimals: 6, flag: '', isFiat: false, isCrypto: true },
} as const satisfies Record<CurrencyCode, CurrencyInfo>;

function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCY_REGISTRY[code] ?? CURRENCY_REGISTRY.USD;
}

function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: FXRateMap,
): number {
  if (from === to) return amount;

  const fromRate = from === 'USD' ? 1 : (rates[from] ?? 1);
  const toRate = to === 'USD' ? 1 : (rates[to] ?? 1);
  const usdAmount = amount / fromRate;

  return usdAmount * toRate;
}

function convertToBase(
  amount: number,
  currency: CurrencyCode,
  rates: FXRateMap,
): number {
  return convertCurrency(amount, currency, 'USD', rates);
}

export { CURRENCY_REGISTRY, getCurrencyInfo, convertCurrency, convertToBase };
