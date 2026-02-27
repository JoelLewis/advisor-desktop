import { useCallback } from 'react'
import { useDisplaySettings, useReportingCurrency } from '@/hooks/use-settings'
import { useCurrencyConverter } from '@/hooks/use-fx'
import { formatCurrency } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'

type FormatOptions = {
  compact?: boolean
  currency?: CurrencyCode
}

/**
 * Centralized currency formatting hook that reads display settings (reporting
 * currency, compactNumbers) and FX rates, returning ready-to-use formatters.
 *
 * - `format` — formats a value already denominated in the reporting currency
 * - `formatWithConversion` — converts from a source currency → reporting currency, then formats
 */
export function useFormatCurrency() {
  const { data: displaySettings } = useDisplaySettings()
  const reportingCurrency = useReportingCurrency()
  const { convert, isReady } = useCurrencyConverter()

  const compactNumbers = displaySettings?.compactNumbers ?? false

  const format = useCallback(
    (value: number, opts?: FormatOptions): string =>
      formatCurrency(value, {
        compact: opts?.compact ?? compactNumbers,
        currency: opts?.currency ?? reportingCurrency,
      }),
    [compactNumbers, reportingCurrency],
  )

  const formatWithConversion = useCallback(
    (value: number, from: CurrencyCode, opts?: FormatOptions): string => {
      const targetCurrency = opts?.currency ?? reportingCurrency
      const converted =
        from !== targetCurrency && isReady
          ? convert(value, from, targetCurrency)
          : value
      return formatCurrency(converted, {
        compact: opts?.compact ?? compactNumbers,
        currency: targetCurrency,
      })
    },
    [reportingCurrency, compactNumbers, isReady, convert],
  )

  return {
    format,
    formatWithConversion,
    reportingCurrency,
    compactNumbers,
    isReady,
  } as const
}
