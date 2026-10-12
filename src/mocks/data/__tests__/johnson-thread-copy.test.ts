import { describe, it, expect } from 'vitest'
import { threads, threadMessages } from '@/mocks/data/messages'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { washSaleWindow } from '@/mocks/data/realised-sales'
import { previewRebalance } from '@/services/oms'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { formatRatePercent } from '@/lib/tax-rules'
import { formatCalendarDate } from '@/lib/utils'
import { MOCK_TODAY_ISO } from '@/lib/clock'

const wholeDollars = (amount: number) => `$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`

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
    const label = ASSET_CLASS_LABELS[worst.assetClass]!
    expect(msg.content).toContain(`${label} is ${(worst.actual * 100).toFixed(1)}% against the ${modelDisplayName(drift.modelId)} model's ${(worst.target * 100).toFixed(1)}% target`)
    expect(msg.content).toContain(`${(Math.abs(worst.drift) * 100).toFixed(1)} points ${worst.drift > 0 ? 'over' : 'under'}, outside its ±${formatRatePercent(drift.driftTolerance)} band`)
    expect(msg.content).not.toContain('3.2%')
  })

  it('says the rebalance proposes the trades: nothing has been sold', () => {
    expect(msg.content).toContain('A tax-aware rebalance proposes selling')
    expect(msg.content).not.toMatch(/rebalance sells/)
  })

  it("states each sale's result, gains as well as the INTC loss, the net, and the preview's tax estimate", async () => {
    // acc-002 alone: −45,850 INTC + 69,411 SPY + 11,569 ETHE + 41,408 IBIT = +76,538 LT, netted with
    // rs-001's −32,750 on the joint return: 43,788 × 23.8% = 10,422 (tax-return-netting).
    const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
    const sells = preview!.trades.filter((t) => t.side === 'sell')
    const recognised = (t: (typeof sells)[number]) => t.realisedShortTerm + t.realisedLongTerm - (t.washedLoss ? t.washedLoss.shortTerm + t.washedLoss.longTerm : 0)
    for (const t of sells) {
      const result = recognised(t)
      expect(msg.content).toContain(`${t.quantity.toLocaleString('en-US')} ${t.symbol} (a ${wholeDollars(result)} ${result < 0 ? 'loss' : 'gain'})`)
    }
    expect(sells.some((t) => recognised(t) > 0) && sells.some((t) => recognised(t) < 0)).toBe(true)
    const net = sells.reduce((s, t) => s + recognised(t), 0)
    expect(msg.content).toContain(`The sales net a ${wholeDollars(net)} ${net < 0 ? 'loss' : 'gain'}`)
    expect(preview!.estimatedTaxImpact).toBeGreaterThan(0)
    expect(msg.content).toContain(`about ${wholeDollars(preview!.estimatedTaxImpact)} of capital-gains tax added to the return`)
  })

  it('gives the date to which selling INTC bars buying it back', async () => {
    const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
    const intc = preview!.trades.find((t) => t.side === 'sell' && t.symbol === 'INTC')!
    expect(intc.repurchaseBlockedUntil).toBe(washSaleWindow(MOCK_TODAY_ISO).end)
    expect(msg.content).toContain(`bars buying it back in any of the couple's accounts, IRAs included, through ${formatCalendarDate(intc.repurchaseBlockedUntil!)}`)
  })

  it('the attached card is acc-002 with its engine drift, and the thread preview is the message', () => {
    const card = msg.attachments![0]!
    expect(card.entityId).toBe('acc-002')
    expect(card.richData!.driftPercent).toBe(Math.round(drift.maxAbsDrift * 1000) / 10)
    expect(card.richData!.needsRebalance).toBe(drift.needsRebalance)
    expect(threads.find((t) => t.id === 'thread-001')!.lastMessage).toBe(msg.content)
  })
})
