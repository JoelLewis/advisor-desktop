import { get } from './api-client'
import type { Account } from '@/types/account'
import type { TaxLot } from '@/types/portfolio'
import type { OpenWashSaleWindow } from '@/mocks/data/realized-sales'

export type Transaction = {
  id: string
  accountId: string
  date: string
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'transfer_in' | 'transfer_out' | 'fee'
  symbol?: string
  description: string
  amount: number
  quantity?: number
  price?: number
}

/** The custodian's records are the firm's: each read names its viewer, and an outsider is told they do not exist. */
const as = (viewer: string) => ({ 'X-Viewer': viewer })

export function getAccount(viewer: string, id: string) {
  return get<Account>(`/custodian/accounts/${id}`, undefined, as(viewer))
}

export function getTaxLots(viewer: string, accountId: string) {
  return get<TaxLot[]>(`/custodian/accounts/${accountId}/tax-lots`, undefined, as(viewer))
}

export function getOpenWashSaleWindows(viewer: string, accountId: string) {
  return get<OpenWashSaleWindow[]>(`/custodian/accounts/${accountId}/realized-sales`, undefined, as(viewer))
}
