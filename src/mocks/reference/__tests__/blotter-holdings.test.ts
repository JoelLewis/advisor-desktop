import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { easternDayOf } from '@/lib/eastern-day'
import { accountLedger } from '@/mocks/workspace/household-ledger'
import { ADRIAN, approvedStoryV3, release } from '@/mocks/workspace/__tests__/story-fixture'
import { blotterView } from '../blotter'

/** What disagrees between the blotter and the holdings, account by account, as "account symbol: why". */
function disagreements(): string[] {
  const view = blotterView(ADRIAN, {})
  if (!view) throw new Error('Adrian reads the blotter')
  const firstDay = view.days[0]
  if (firstDay === undefined) throw new Error('The blotter has no day')
  const filledBuys = view.rows.filter((r) => r.status === 'filled' && r.side === 'buy')
  const notHeld = filledBuys.flatMap((r) => {
    const held = accountLedger(r.accountId).positions.find((p) => p.symbol === r.symbol)
    if (!held) return [`${r.accountId} ${r.symbol}: ${r.id} filled a buy the holdings do not show`]
    return r.quantityUnit === 'sh' && held.quantity < r.quantity ? [`${r.accountId} ${r.symbol}: ${r.id} bought ${r.quantity}, the holding is ${held.quantity}`] : []
  })
  const unordered = accounts.flatMap((account) => {
    const { lots, positions } = accountLedger(account.id)
    return lots.filter((l) => l.purchaseDate >= firstDay).flatMap((lot) => {
      const symbol = positions.find((p) => p.id === lot.positionId)?.symbol
      const bought = filledBuys.some((r) => r.accountId === account.id && r.symbol === symbol && r.filledAt !== undefined
        && easternDayOf(r.filledAt) === lot.purchaseDate && r.quantity === lot.quantity)
      return bought ? [] : [`${account.id} ${symbol ?? lot.positionId}: the lot bought ${lot.purchaseDate} has no filled buy`]
    })
  })
  return [...notHeld, ...unordered]
}

describe('the blotter and the holdings agree, in every account', () => {
  it('at the start of the session', () => expect(disagreements()).toEqual([]))
  it("after the story's release: each fill is a lot, each lot a fill", () => {
    release(approvedStoryV3())
    expect(disagreements()).toEqual([])
  })
})
