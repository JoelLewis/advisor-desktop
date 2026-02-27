import { useFormatCurrency } from '@/hooks/use-format-currency'
import { useDisplaySettings } from '@/hooks/use-settings'
import { formatCurrency } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'

type CurrencyValueProps = {
  value: number
  from?: CurrencyCode
  compact?: boolean
  className?: string
}

/**
 * Renders a currency value converted to the user's reporting currency.
 * When `showOriginalCurrency` is enabled and the source currency differs
 * from the reporting currency, a title tooltip shows the original value.
 */
export function CurrencyValue({
  value,
  from = 'USD',
  compact,
  className,
}: CurrencyValueProps) {
  const { formatWithConversion, reportingCurrency } = useFormatCurrency()
  const { data: displaySettings } = useDisplaySettings()
  const showOriginal = displaySettings?.showOriginalCurrency ?? false

  const converted = formatWithConversion(value, from, { compact })

  const needsTooltip = showOriginal && from !== reportingCurrency
  const originalFormatted = needsTooltip
    ? formatCurrency(value, { currency: from, compact })
    : undefined

  return (
    <span className={className} title={originalFormatted}>
      {converted}
    </span>
  )
}
