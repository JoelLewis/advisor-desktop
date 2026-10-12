import { describe, it, expect } from 'vitest'
import { threads, threadMessages } from '@/mocks/data/messages'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { getPositionsForAccount } from '@/mocks/data/positions'

describe("§0.7 · msg-003 reports acc-002's own drift and trades", () => {
  const msg = threadMessages['thread-001']!.find((m) => m.id === 'msg-003')!
  const account = accounts.find((a) => a.id === 'acc-002')!
  const drift = computeDriftForAccount(account)

  it('names only securities acc-002 holds or the engine proposes', () => {
    const held = new Set(getPositionsForAccount(account.id, account.totalValue).map((p) => p.symbol))
    expect(held.has('AAPL')).toBe(false)
    expect(msg.content).not.toMatch(/AAPL|MSFT/)
    for (const leg of generateRebalanceTrades(account.id, true).filter((l) => l.side === 'sell')) {
      expect(held.has(leg.symbol)).toBe(true)
      expect(msg.content).toContain(`${leg.quantity.toLocaleString('en-US')} ${leg.symbol}`)
    }
  })

  it("states the worst class's drift against acc-002's own model and band", () => {
    const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]!
    expect(worst.assetClass).toBe('us_equity')
    expect(msg.content).toContain(`US Equity is ${(worst.actual * 100).toFixed(1)}% against the Growth model's ${(worst.target * 100).toFixed(1)}% target`)
    expect(msg.content).toContain(`${(worst.drift * 100).toFixed(1)} points over, outside its ±5% band`)
    expect(msg.content).not.toContain('3.2%')
  })

  it('the attached card is acc-002 with its engine drift, and the thread preview is the message', () => {
    const card = msg.attachments![0]!
    expect(card.entityId).toBe('acc-002')
    expect(card.richData!.driftPercent).toBe(Math.round(drift.maxAbsDrift * 1000) / 10)
    expect(card.richData!.needsRebalance).toBe(drift.needsRebalance)
    expect(threads.find((t) => t.id === 'thread-001')!.lastMessage).toBe(msg.content)
  })
})
