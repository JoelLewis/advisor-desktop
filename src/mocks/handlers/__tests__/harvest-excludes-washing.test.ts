import { describe, it, expect, vi, beforeAll } from 'vitest'
import { server } from '@/test/server'
import { getAIInsights, sendMessage } from '@/services/ai'
import type { AIInsight } from '@/types/ai'
import type { TaxLot } from '@/types/portfolio'
import { taxRateFor } from '@/lib/tax-rules'

/**
 * §1091 takes only the loss on the shares a replacement was matched to (Treas. Reg.
 * §1.1091-1(c)), so a partly washed lot adds its allowed part — and only that — to every harvest
 * figure. No fixture has one, so this file gives acc-001 (Robert Johnson's revocable trust) a
 * 400-share SMH holding at a −21,920 loss. acc-002 (Robert's individual account, same taxpayer)
 * bought 180 SMH on 2026-02-20, so 180 of the 400 shares wash and are deferred:
 *
 *   allowed now: −21,920 × (400 − 180)/400 = −12,056
 *   tax benefit: 12,056 × the lot's own holding-period rate (it is short-term: 37% → 4,460.72)
 *
 * Every figure must then read as the baseline plus exactly that allowed part — not the baseline
 * (the whole loss deferred) and not the baseline plus −21,920 (nothing deferred).
 *
 * The real handlers (bound by the test setup to the real modules) give the baseline; the same
 * handlers re-imported against the mock are then put in front of them.
 */
const TRUST_SMH = 'pos-test-acc-001-smh'

vi.mock('@/mocks/data/positions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/positions')>()
  // The planted holding is part of the book both ways the fixtures reach it: the live read and the seed the lots partition.
  const withPlanted = (read: typeof original.getPositionsForAccount) => (accountId: string, totalValue: number) => {
    const positions = read(accountId, totalValue)
    if (accountId !== 'acc-001') return positions
    return [...positions, {
      id: TRUST_SMH, accountId, symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity',
      quantity: 400, price: 245.20, costBasis: 120_000, marketValue: 98_080, gainLoss: -21_920, gainLossPercent: -18.27, weight: 0,
    }]
  }
  return {
    ...original,
    getPositionsForAccount: withPlanted(original.getPositionsForAccount),
    seedPositionsForAccount: withPlanted(original.seedPositionsForAccount),
  }
})

const harvestInsight = (insights: AIInsight[], title: string) => insights.find((i) => i.title === title)!
type Figures = { dashboard: AIInsight; account: AIInsight; chat: string }
const dollars = (insight: AIInsight) => Number(insight.metric!.value.replace(/[$,]/g, ''))
const positionCount = (body: string) => Number(body.match(/^(\d+) positions?/)![1])

async function figures(): Promise<Figures> {
  const [dashboard, account, chat] = await Promise.all([
    getAIInsights('dashboard'),
    getAIInsights('account_detail', 'acc-001'),
    sendMessage('Identify tax-loss harvesting opportunities', { screenType: 'dashboard' }),
  ])
  return {
    dashboard: harvestInsight(dashboard, 'Tax-loss harvesting window'),
    account: harvestInsight(account, 'Tax-Loss Harvesting Opportunity'),
    chat: chat.content,
  }
}

let baseline: Figures
let withWashingLot: Figures
let smh: TaxLot[]
beforeAll(async () => {
  baseline = await figures()
  vi.resetModules()
  const { generateTaxLotsWithSaleRisk } = await import('../custodian')
  smh = generateTaxLotsWithSaleRisk('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
  const { aiHandlers } = await import('../ai')
  server.use(...aiHandlers)
  withWashingLot = await figures()
}, 30_000)

describe('harvest figures count only the part of a loss a sale realises now', () => {
  it('vacuity guard: the planted lot is one harvest candidate, 180 of its 400 shares washed and deferred', () => {
    expect(smh).toHaveLength(1)
    expect(smh[0]!.gainLoss).toBeLessThan(-1_000)
    expect(smh[0]!.saleWash).toEqual({ deferredShares: 180, disallowedShares: 0 })
  })

  it('the account insight\'s harvestable amount grows by 12,056 and its position count by one', () => {
    // Each metric is rounded to the dollar, so the difference of two can be off by one.
    expect(Math.abs(dollars(withWashingLot.account) - dollars(baseline.account) - 12_056)).toBeLessThanOrEqual(1)
    expect(positionCount(withWashingLot.account.body)).toBe(positionCount(baseline.account.body) + 1)
    expect(withWashingLot.account.body).toContain("At least one candidate's sale would be a wash sale, in part or in whole")
    expect(withWashingLot.account.body).toContain('deferred into the replacement\'s basis')
    expect(withWashingLot.account.body).not.toContain('permanently disallowed')
  })

  it('the dashboard insight\'s estimated benefit grows by the allowed loss at the lot\'s own rate', () => {
    const benefit = 12_056 * taxRateFor(smh[0]!.holdingPeriod)
    expect(Math.abs(dollars(withWashingLot.dashboard) - dollars(baseline.dashboard) - benefit)).toBeLessThanOrEqual(1)
  })

  it('the book total in the dashboard insight and the chat answer moves by the allowed 12,056, not the whole 21,920', () => {
    const totalOf = (body: string) => body.match(/^(\$(\d+)K) in harvestable losses/)!
    const [before, after] = [totalOf(baseline.dashboard.body), totalOf(withWashingLot.dashboard.body)]
    // Stated to the nearest $1K, so a 12,056 increase reads as +12K or +13K; the whole loss would read +22K.
    expect(Number(after[2]) - Number(before[2])).toBeGreaterThanOrEqual(12)
    expect(Number(after[2]) - Number(before[2])).toBeLessThanOrEqual(13)
    expect(withWashingLot.chat).toContain(`I've identified ${after[1]} in harvestable losses`)
  })
})
