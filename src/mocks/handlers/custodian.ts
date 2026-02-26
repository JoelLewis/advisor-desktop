import { http, HttpResponse } from 'msw'
import type { Transaction } from '@/services/custodian'
import type { TaxLot } from '@/types/portfolio'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'

function generateTransactions(accountId: string, totalValue: number): Transaction[] {
  const baseDate = new Date('2026-02-25')
  const txns: Transaction[] = []
  const symbols = ['VTI', 'AGG', 'EFA', 'QQQ', 'BND', 'GLD']

  // Generate ~20 transactions over the past 60 days
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 60)
    const date = new Date(baseDate)
    date.setDate(date.getDate() - daysAgo)
    const dateStr = date.toISOString()

    const typeRoll = Math.random()
    if (typeRoll < 0.4) {
      // Buy/sell
      const side = Math.random() > 0.5 ? 'buy' : 'sell'
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const qty = Math.floor(Math.random() * 200) + 10
      const price = Math.round((Math.random() * 400 + 50) * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: side, symbol, description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} shares ${symbol}`,
        amount: side === 'buy' ? -(qty * price) : qty * price, quantity: qty, price,
      })
    } else if (typeRoll < 0.6) {
      // Dividend
      const symbol = symbols[Math.floor(Math.random() * 3)]
      const amount = Math.round(totalValue * 0.001 * Math.random() * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: 'dividend', symbol, description: `Dividend — ${symbol}`, amount,
      })
    } else if (typeRoll < 0.75) {
      // Interest
      const amount = Math.round(totalValue * 0.0003 * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: 'interest', description: 'Money market interest', amount,
      })
    } else if (typeRoll < 0.9) {
      // Fee
      const amount = Math.round(totalValue * 0.00025 * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: 'fee', description: 'Advisory fee — Q4 2025', amount: -amount,
      })
    } else {
      // Transfer
      const amount = Math.round((Math.random() * 50000 + 5000) * 100) / 100
      const direction = Math.random() > 0.5 ? 'transfer_in' : 'transfer_out'
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: direction, description: direction === 'transfer_in' ? 'Wire deposit' : 'Wire withdrawal',
        amount: direction === 'transfer_in' ? amount : -amount,
      })
    }
  }

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function generateTaxLots(accountId: string, totalValue: number): TaxLot[] {
  const positions = getPositionsForAccount(accountId, totalValue)
  const lots: TaxLot[] = []

  for (const pos of positions) {
    if (pos.symbol === 'CASH') continue
    // Split each position into 1-3 tax lots
    const lotCount = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1))
    const lotValue = pos.marketValue / lotCount

    for (let i = 0; i < lotCount; i++) {
      const monthsAgo = Math.floor(Math.random() * 48) + 3
      const purchaseDate = new Date('2026-02-25')
      purchaseDate.setMonth(purchaseDate.getMonth() - monthsAgo)
      const isLongTerm = monthsAgo > 12
      const costMultiplier = 0.7 + Math.random() * 0.5 // 70-120% of current value

      lots.push({
        id: `lot-${pos.id}-${i}`,
        positionId: pos.id,
        purchaseDate: purchaseDate.toISOString().slice(0, 10),
        quantity: Math.round(pos.quantity / lotCount),
        costBasis: Math.round(lotValue * costMultiplier),
        currentValue: Math.round(lotValue),
        gainLoss: Math.round(lotValue * (1 - costMultiplier)),
        holdingPeriod: isLongTerm ? 'long' : 'short',
        washSaleRestricted: false,
      })
    }
  }

  return lots
}

export const custodianHandlers = [
  http.get('/api/custodian/accounts', ({ request }) => {
    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    const householdId = url.searchParams.get('householdId')

    let filtered = [...accounts]
    if (clientId) filtered = filtered.filter((a) => a.clientId === clientId)
    if (householdId) filtered = filtered.filter((a) => a.householdId === householdId)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/custodian/accounts/:accountId', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(account)
  }),

  http.get('/api/custodian/accounts/:accountId/balances', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({
      totalValue: account.totalValue,
      cashBalance: account.cashBalance,
      marginBalance: 0,
    })
  }),

  http.get('/api/custodian/accounts/:accountId/transactions', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(generateTransactions(account.id, account.totalValue))
  }),

  http.get('/api/custodian/accounts/:accountId/tax-lots', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(generateTaxLots(account.id, account.totalValue))
  }),
]
