import { describe, it, expect } from 'vitest'
import { getAIInsights } from '@/services/ai'
import { clients } from '@/mocks/data/clients'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { formatCalendarDate } from '@/lib/utils'

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
//
// §9.5 (coordinator follow-up, Task 6) — the gate was the only half of that finding fixed at the
// time. The body/metric were still hand-typed for every taxable account regardless of its real
// harvestable lots, including an unconditional "wash sale window clear for all candidates" — so
// acc-005's expected figure below is now the real derived one ($21,525, 2 positions), not the old
// coincidental '$12,400'.
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
  it('acc-005 (individual, taxable) still gets the harvesting insight, with the real derived figure', async () => {
    const insights = await getAIInsights('account_detail', 'acc-005')
    const harvest = insights.find((i) => i.title === 'Tax-Loss Harvesting Opportunity')
    expect(harvest).toBeDefined()
    expect(harvest?.metric?.value).toBe('$21,525')
    expect(harvest?.body).toContain('2 positions')
    expect(harvest?.body).toContain('clear for all candidates')
  })

  // acc-002 sold INTC at a loss (rs-001, realised-sales.ts) — opening its own household's
  // wash-sale window — and still holds 7,000 remaining INTC shares (D28). Those shares are one of
  // its two harvestable positions, so this account's real lots include a genuinely
  // wash-sale-restricted candidate: the insight must not claim the window is clear for it.
  it('acc-002 (holds a harvestable position inside its own open wash-sale window) does not claim the window is clear', async () => {
    const insights = await getAIInsights('account_detail', 'acc-002')
    const harvest = insights.find((i) => i.title === 'Tax-Loss Harvesting Opportunity')
    expect(harvest).toBeDefined()
    expect(harvest?.metric?.value).toBe('$48,804')
    expect(harvest?.body).not.toContain('clear for all candidates')
    expect(harvest?.body).toContain('wash-sale window')
  })
})

describe('I5 · the trading insight states each wash-sale window end as a calendar date, and counts accounts', () => {
  it('prints every window end as its own date in any time zone, and the number of accounts restricted', async () => {
    const windows = openWashSaleWindows(MOCK_TODAY_ISO)
    const insight = (await getAIInsights('trading')).find((i) => i.id === 'trade-2')!
    for (const w of windows) expect(insight.body).toContain(`${w.symbol} in`) // every window is named
    // rs-001 closes 2026-03-22; a local-time formatter west of Greenwich printed "Mar 21, 2026".
    expect(insight.body).toContain('(through Mar 22, 2026)')
    for (const w of windows) expect(insight.body).toContain(`(through ${formatCalendarDate(w.end)})`)
    const restricted = new Set(windows.map((w) => w.accountId)).size
    expect(insight.body).toMatch(new RegExp(`^${restricted} accounts? carrying an active wash-sale restriction`))
  })
})
