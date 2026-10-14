// Currency domain types for Advisor Desktop

type FiatCurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF'
  | 'CAD' | 'AUD' | 'HKD' | 'SGD' | 'NZD'
  | 'SEK' | 'NOK' | 'DKK' | 'CNY' | 'INR'
  | 'BRL' | 'MXN' | 'ZAR' | 'KRW' | 'TWD';

type CryptoCurrencyCode =
  | 'BTC' | 'ETH' | 'SOL' | 'ADA' | 'AVAX'
  | 'DOT' | 'LINK' | 'MATIC' | 'UNI' | 'ATOM';

type StablecoinCode = 'USDT' | 'USDC' | 'DAI';

type CurrencyCode = FiatCurrencyCode | CryptoCurrencyCode | StablecoinCode;

type FXRateMap = Record<string, number>;

export type {
  CurrencyCode,
  FXRateMap,
};
