import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { getFXRates } from '@/services/fx'
import { convertCurrency, convertToBase } from '@/lib/currency'
import type { CurrencyCode, FXRateMap } from '@/types/currency'

export function useFXRates(base = 'USD') {
  return useQuery({
    queryKey: ['fx-rates', base],
    queryFn: () => getFXRates(base),
    staleTime: 5 * 60 * 1000, // FX rates refresh every 5 min
  })
}

export function useCurrencyConverter() {
  const { data } = useFXRates()
  const rates: FXRateMap = useMemo(() => data?.rates ?? {}, [data?.rates])

  const convert = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode): number =>
      convertCurrency(amount, from, to, rates),
    [rates],
  )

  const toBase = useCallback(
    (amount: number, currency: CurrencyCode): number =>
      convertToBase(amount, currency, rates),
    [rates],
  )

  return { convert, toBase, rates, isReady: !!data }
}
