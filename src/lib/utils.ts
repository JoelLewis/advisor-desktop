import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CurrencyCode } from '@/types/currency'
import { getCurrencyInfo } from '@/lib/currency'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type FormatCurrencyOptions = { compact?: boolean; currency?: CurrencyCode }

export function formatCurrency(
  value: number,
  optionsOrCompact?: boolean | FormatCurrencyOptions,
): string {
  const opts: FormatCurrencyOptions =
    typeof optionsOrCompact === 'boolean'
      ? { compact: optionsOrCompact }
      : (optionsOrCompact ?? {})

  const currencyCode = opts.currency ?? 'USD'
  const info = getCurrencyInfo(currencyCode)

  if (opts.compact) {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (absValue >= 1_000_000_000) return `${sign}${info.symbol}${(absValue / 1_000_000_000).toFixed(1)}B`
    if (absValue >= 1_000_000) return `${sign}${info.symbol}${(absValue / 1_000_000).toFixed(1)}M`
    if (absValue >= 1_000) return `${sign}${info.symbol}${(absValue / 1_000).toFixed(0)}K`
  }

  // Fiat currencies: use Intl.NumberFormat
  if (info.isFiat) {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(value)
  }

  // Crypto/stablecoin: manual format (not valid Intl currency codes)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(info.decimals, 6),
  }).format(value)
  return `${formatted} ${currencyCode}`
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}
