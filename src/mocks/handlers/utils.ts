import { HttpResponse } from 'msw'
import { accounts } from '../data/accounts'

export function formatAUM(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

export function notFound(): HttpResponse<null> {
  return new HttpResponse(null, { status: 404 })
}

export function computeTotalAUM(): number {
  return accounts.reduce((sum, a) => sum + a.totalValue, 0)
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
