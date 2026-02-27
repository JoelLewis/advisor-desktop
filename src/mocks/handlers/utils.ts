import { HttpResponse } from 'msw'
import { convertToBase } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { accounts } from '../data/accounts'

export function formatAUM(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

export function notFound(): HttpResponse<null> {
  return new HttpResponse(null, { status: 404 })
}

/** Sum all account values, converting non-USD accounts at current FX rates */
export function computeTotalAUM(): number {
  return Math.round(
    accounts.reduce((sum, a) => {
      if (a.baseCurrency && a.baseCurrency !== 'USD') {
        return sum + convertToBase(a.totalValue, a.baseCurrency, FX_RATES_USD_BASE)
      }
      return sum + a.totalValue
    }, 0),
  )
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
