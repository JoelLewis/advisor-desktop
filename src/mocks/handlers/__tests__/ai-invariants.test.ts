import { describe, it, expect } from 'vitest'
import { getAIInsights } from '@/services/ai'
import { clients } from '@/mocks/data/clients'
import { MOCK_NOW_ISO } from '@/lib/clock'

// Regression test for fix round 2: the "Contact Gap Detected" insight's daysSinceContact was
// computed against the live system clock (Date.now()) while comparing to a frozen fixture
// updatedAt — anchored to now() from src/lib/clock, it must match a day count derived from the
// same frozen clock, not the real wall-clock date.
describe('AI insight invariants — contact gap', () => {
  it('daysSinceContact is computed from the frozen clock, not the live system clock', async () => {
    const client = clients.find((c) => c.id === 'cli-001')
    if (!client) throw new Error('fixture cli-001 not found')

    const expectedDays = Math.floor(
      (new Date(MOCK_NOW_ISO).getTime() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
    )
    expect(expectedDays).toBeGreaterThan(60) // sanity: this client should trigger the insight

    const insights = await getAIInsights('client_detail', client.id)
    const contactGap = insights.find((i) => i.title === 'Contact Gap Detected')
    expect(contactGap).toBeDefined()
    expect(contactGap?.body).toContain(`${expectedDays} days`)
  })
})

// §9.1 (Task 2, review round 2, Finding 1) — `account_detail`'s "Tax-Loss Harvesting Opportunity"
// insight was hardcoded (`metric.value: '$12,400'`) and pushed for every account, with no
// `taxTreatment` check — a hardcoded string literal, so the sweep that found and fixed
// TaxManagementPage and OverviewTab (both derived from `estimatedTaxBenefit`/`isHarvestable`)
// never caught it. Confirmed live on acc-003 (Traditional IRA) and acc-014 (529, tax-free).
describe('AI insight invariants — account_detail tax-loss-harvesting insight gates on tax treatment', () => {
  it('acc-003 (Traditional IRA, tax-deferred) does not get the harvesting insight', async () => {
    const insights = await getAIInsights('account_detail', 'acc-003')
    expect(insights.find((i) => i.title === 'Tax-Loss Harvesting Opportunity')).toBeUndefined()
  })

  it('acc-014 (529 plan, tax-free) does not get the harvesting insight', async () => {
    const insights = await getAIInsights('account_detail', 'acc-014')
    expect(insights.find((i) => i.title === 'Tax-Loss Harvesting Opportunity')).toBeUndefined()
  })

  // The over-gating control: the gate must not suppress the taxable case.
  it('acc-005 (individual, taxable) still gets the harvesting insight', async () => {
    const insights = await getAIInsights('account_detail', 'acc-005')
    const harvest = insights.find((i) => i.title === 'Tax-Loss Harvesting Opportunity')
    expect(harvest).toBeDefined()
    expect(harvest?.metric?.value).toBe('$12,400')
  })
})
