import type { CurrencyCode, FXRateMap } from '@/types/currency';

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

export { convertCurrency, convertToBase };
