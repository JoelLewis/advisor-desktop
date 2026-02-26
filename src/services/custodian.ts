import { get } from './api-client'
import type { Account } from '@/types/account'
import type { TaxLot } from '@/types/portfolio'

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

export function getAccount(id: string) {
  return get<Account>(`/custodian/accounts/${id}`)
}

export function getAccounts(params?: Record<string, string>) {
  return get<Account[]>('/custodian/accounts', params)
}

export function getTransactions(accountId: string, params?: Record<string, string>) {
  return get<Transaction[]>(`/custodian/accounts/${accountId}/transactions`, params)
}

export function getTaxLots(accountId: string) {
  return get<TaxLot[]>(`/custodian/accounts/${accountId}/tax-lots`)
}

export function getBalances(accountId: string) {
  return get<{ totalValue: number; cashBalance: number; marginBalance: number }>(
    `/custodian/accounts/${accountId}/balances`,
  )
}
