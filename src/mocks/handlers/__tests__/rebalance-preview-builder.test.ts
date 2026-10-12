import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { buildRebalancePreviews, generateRebalanceProposal } from '@/mocks/handlers/oms'
import { MOCK_TODAY_ISO } from '@/lib/clock'

describe('buildRebalancePreviews', () => {
  it('serves exactly what the rebalance endpoint serves, batch netting included', async () => {
    const ids = ['acc-001', 'acc-002', 'acc-003', 'acc-005']
    const served = await previewRebalance({ accountIds: ids, taxAware: true })
    const built = buildRebalancePreviews(
      ids.map((id) => ({ account: accounts.find((a) => a.id === id)!, ...generateRebalanceProposal(id, true) })),
      true, undefined, MOCK_TODAY_ISO,
    )
    expect(JSON.parse(JSON.stringify(built))).toEqual(served)
  })

  it('acc-002 alone: the INTC loss nets against the joint return, and the estimate is the one Phase 0 pinned', () => {
    const account = accounts.find((a) => a.id === 'acc-002')!
    const [preview] = buildRebalancePreviews([{ account, ...generateRebalanceProposal('acc-002', true) }], true, 0.005, MOCK_TODAY_ISO)
    expect(preview!.estimatedTaxImpact).toBe(10_422)
    expect(preview!.grossTaxOnGains).toBe(29_128)
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: -32_750, collectibleLongTerm: 0 })
    expect(preview!.trades.find((t) => t.symbol === 'INTC')?.repurchaseBlockedUntil).toBe('2026-03-27')
  })
})
