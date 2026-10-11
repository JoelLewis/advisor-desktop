import { describe, it, expect, vi, beforeAll } from 'vitest'
import { server } from '@/test/server'
import { getAIInsights, sendMessage } from '@/services/ai'
import type { AIInsight } from '@/types/ai'

/**
 * A lot whose sale would wash defers its loss (§1091(d)), so it harvests nothing this year and
 * must not swell any harvest figure. No fixture has one, so this file gives acc-001 an older SMH
 * holding at a loss: acc-002 bought SMH on 2026-02-21, so every lot of it washes. Every harvest
 * figure must then read exactly as it does without the holding.
 *
 * The real handlers (bound by the test setup to the real modules) give the baseline; the same
 * handlers re-imported against the mock are then put in front of them.
 */
const TRUST_SMH = 'pos-test-acc-001-smh'

vi.mock('@/mocks/data/positions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/positions')>()
  return {
    ...original,
    getPositionsForAccount: (accountId: string, totalValue: number) => {
      const positions = original.getPositionsForAccount(accountId, totalValue)
      if (accountId !== 'acc-001') return positions
      return [...positions, {
        id: TRUST_SMH, accountId, symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity',
        quantity: 400, price: 245.20, costBasis: 120_000, marketValue: 98_080, gainLoss: -21_920, gainLossPercent: -18.27, weight: 0,
      }]
    },
  }
})

const harvestInsight = (insights: AIInsight[], title: string) => insights.find((i) => i.title === title)!
type Figures = { dashboard: AIInsight; account: AIInsight; chat: string }

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
let withWashingLots: Figures
beforeAll(async () => {
  baseline = await figures()
  vi.resetModules()
  const { generateTaxLotsWithSaleRisk } = await import('../custodian')
  const smh = generateTaxLotsWithSaleRisk('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
  // Vacuity guard: the planted lots are harvest candidates in their own right, and every one washes.
  expect(smh.length).toBeGreaterThan(0)
  expect(smh.every((l) => l.gainLoss < -1_000 && l.saleWashSaleRisk)).toBe(true)
  const { aiHandlers } = await import('../ai')
  server.use(...aiHandlers)
  withWashingLots = await figures()
}, 30_000)

describe('harvest figures leave out lots whose sale would wash', () => {
  it('the dashboard insight\'s loss total, account count and estimated benefit', () => {
    expect(withWashingLots.dashboard.body).toBe(baseline.dashboard.body)
    expect(withWashingLots.dashboard.metric).toEqual(baseline.dashboard.metric)
  })

  it('the chat answer\'s book total, account count and largest opportunity', () => {
    expect(withWashingLots.chat).toBe(baseline.chat)
  })

  it('the account insight\'s harvestable amount and position count, while its §1091 sentence still names the washing candidate', () => {
    expect(withWashingLots.account.metric).toEqual(baseline.account.metric)
    const positions = (body: string) => body.match(/^\d+ positions?/)![0]
    expect(positions(withWashingLots.account.body)).toBe(positions(baseline.account.body))
    expect(withWashingLots.account.body).toContain("At least one candidate's sale would be a wash sale")
  })
})
