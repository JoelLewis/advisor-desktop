// Currency domain types for iDeal Desktop

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

type CurrencyInfo = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
  flag: string;
  isFiat: boolean;
  isCrypto: boolean;
};

type ExchangeRate = {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  asOf: string;
};

type FXRateMap = Record<string, number>;

type CurrencyAmount = {
  amount: number;
  currency: CurrencyCode;
};

export type {
  FiatCurrencyCode,
  CryptoCurrencyCode,
  StablecoinCode,
  CurrencyCode,
  CurrencyInfo,
  ExchangeRate,
  FXRateMap,
  CurrencyAmount,
};
