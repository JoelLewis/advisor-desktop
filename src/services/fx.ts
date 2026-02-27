import { get } from './api-client'
import type { FXRateMap } from '@/types/currency'

type FXRatesResponse = {
  base: string
  rates: FXRateMap
  asOf: string
}

type FXConvertResponse = {
  from: string
  to: string
  amount: number
  converted: number
  rate: number
  asOf: string
}

export function getFXRates(base = 'USD') {
  return get<FXRatesResponse>('/fx/rates', { base })
}

export function convertAmount(from: string, to: string, amount: number) {
  return get<FXConvertResponse>('/fx/convert', { from, to, amount: String(amount) })
}
