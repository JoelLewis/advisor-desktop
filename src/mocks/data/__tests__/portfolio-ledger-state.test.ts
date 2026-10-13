import { describe, it, expect } from 'vitest'
import type { Fill } from '@/types/workspace-proposal'
import { resetWorkspaceStore } from '../workspace-store'
import { bookOf, bookVersion, commitMove, ledgerFills, nextLedgerNumber, recordedSales } from '../portfolio-ledger'

const fill: Fill = {
  id: 'fill-0001', stagedOrderId: 'stg-0001', proposalId: 'prop-0001', version: 1, accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.',
  side: 'sell', quantity: 7000, price: 28.45, value: 199150, currency: 'USD', at: '2026-02-25T14:30:00.000Z',
}

describe('the portfolio ledger state', () => {
  it('starts with nothing moved, and a commit moves one account and the book version', () => {
    expect(bookVersion()).toBe(0)
    expect(bookOf('acc-002')).toBeUndefined()
    commitMove('acc-002', { positions: [], lots: [] }, [], [fill])
    expect(bookVersion()).toBe(1)
    expect(bookOf('acc-002')).toEqual({ positions: [], lots: [] })
    expect(ledgerFills()).toEqual([fill])
    expect(recordedSales()).toEqual([])
  })

  it('resets with the workspace store: no moved book, no fills, counters from the start', () => {
    commitMove('acc-002', { positions: [], lots: [] }, [], [fill])
    expect(nextLedgerNumber('fill')).toBe(1)
    resetWorkspaceStore()
    expect(bookVersion()).toBe(0)
    expect(bookOf('acc-002')).toBeUndefined()
    expect(ledgerFills()).toEqual([])
    expect(nextLedgerNumber('fill')).toBe(1)
    expect(nextLedgerNumber('sale')).toBe(1)
  })
})
