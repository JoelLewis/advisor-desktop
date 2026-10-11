import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CurrencyCode } from '@/types/currency'
import { getCurrencyInfo } from '@/lib/currency'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The class pair every numeric surface carries. R13 + R14.
 * Never write `font-mono` on a figure by hand — use this, so Phase 3's font
 * swap is a single change inside `@utility tabular-figures` in src/index.css.
 */
export const TABULAR_NUMS = 'font-mono tabular-figures' as const

// Cache Intl.NumberFormat instances — construction is expensive, called hundreds of times per page
const formatterCache = new Map<string, Intl.NumberFormat>()

function getCachedFormatter(locale: string, currency: string, decimals: number): Intl.NumberFormat {
  const key = `${locale}:${currency}:${decimals}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatterCache.set(key, fmt)
  }
  return fmt
}

function getCachedNumberFormatter(locale: string, minDecimals: number, maxDecimals: number): Intl.NumberFormat {
  const key = `num:${locale}:${minDecimals}:${maxDecimals}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    })
    formatterCache.set(key, fmt)
  }
  return fmt
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

  // Fiat currencies: use cached Intl.NumberFormat
  if (info.isFiat) {
    return getCachedFormatter(info.locale, currencyCode, info.decimals).format(value)
  }

  // Crypto/stablecoin: manual format (not valid Intl currency codes)
  const formatted = getCachedNumberFormatter('en-US', 2, Math.min(info.decimals, 6)).format(value)
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

/**
 * An ISO calendar date ("2026-03-23") as "Mar 23, 2026". Formatted in UTC because `new Date`
 * parses a bare date as UTC midnight, which a local-time formatter west of Greenwich shows as the
 * day before.
 */
export function formatCalendarDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}
