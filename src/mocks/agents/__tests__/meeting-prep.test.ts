import { describe, it, expect } from 'vitest'
import { runMeetingPrepAgent } from '../meeting-prep'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { isModelManaged } from '@/lib/mandate'

const PLAN_NAMES = /401\(k\)|403\(b\)/g
const johnsonAccounts = accounts.filter((a) => a.householdId === 'hh-001')
const titled = (findings: ReturnType<typeof runMeetingPrepAgent>, title: string) => {
  const f = findings.find((x) => x.agendaTitle === title)
  if (!f) throw new Error(`no finding titled "${title}" in ${findings.map((x) => x.agendaTitle).join(' | ')}`)
  return f
}

describe('Meeting Prep', () => {
  const findings = runMeetingPrepAgent('hh-001', MOCK_NOW_ISO)

  it('reports seven findings, each with a digit-free claim and agenda title, a citation and its as-of', () => {
    expect(findings).toHaveLength(7)
    for (const f of findings) {
      expect(f.claim.replace(PLAN_NAMES, ''), f.claim).not.toMatch(/\d/)
      expect(f.agendaTitle, f.agendaTitle).not.toMatch(/\d/)
      expect(f.citations.length, f.claim).toBeGreaterThan(0)
    }
  })

  it('before any fill: no orders filled today', () => {
    expect(titled(findings, 'Changes since the last review')).toMatchObject({ claim: "No orders have been filled in the household's accounts today.", attention: 'info', figures: [] })
  })

  it("states the taxpayer's open windows, figures and dates from the realized-sales ledger", () => {
    const windows = titled(findings, 'Wash-sale windows: what not to buy back')
    expect(windows.attention).toBe('attention')
    expect(windows.claim).toContain("in any of the taxpayer's accounts, including IRAs and Roths")
    expect(windows.claim).not.toMatch(/household/i)
    expect(windows.figures).toContainEqual({ label: 'INTC loss · rs-001', value: -32_750, unit: 'USD', source: 'realizedSales.realizedGainLoss' })
    expect(windows.citations.map((c) => c.source)).toContain('Wash-sale window · rs-001 · INTC loss sale of 20 Feb 2026, open through 22 Mar 2026')
  })

  it('reads drift for every Johnson account from the drift engine', () => {
    const outside = johnsonAccounts.filter(isModelManaged).filter((a) => computeDriftForAccount(a).needsRebalance)
    const drift = findings.find((f) => f.citations.some((c) => c.source.startsWith('Drift calculation')))!
    expect(drift.citations.map((c) => c.source)).toEqual(johnsonAccounts.map((a) => `Drift calculation · ${a.name}`))
    expect(drift.attention).toBe(outside.length > 0 ? 'attention' : 'info')
    expect(drift.figures.filter((f) => f.label.startsWith('Tolerance · ')).map((f) => f.label)).toEqual(outside.map((a) => `Tolerance · ${a.name}`))
  })

  it("states the plan's goals: the legacy goal at risk, with probability and funded status", () => {
    const goals = titled(findings, 'Plan goals at risk: Legacy / Estate')
    expect(goals).toMatchObject({ claim: 'In the financial plan, Legacy / Estate is at risk; Retirement Income is on track.', attention: 'attention' })
    expect(goals.figures).toContainEqual({ label: 'Probability · Legacy / Estate', value: 0.78, unit: '%', source: 'plan.goals.probability' })
    expect(goals.figures).toContainEqual({ label: 'Funded · Legacy / Estate', value: 0.85, unit: '%', source: 'plan.goals.currentFunding / targetAmount' })
    expect(goals.citations).toEqual([{ source: 'Financial plan · plan-001', asOf: '2025-11-14' }])
  })

  it('flags the held-away plans as outside the firm\'s view, and still inside the taxpayer\'s windows', () => {
    const held = titled(findings, 'Held-away accounts')
    expect(held.claim).toBe("Robert's Vanguard account and Patricia's TIAA account are held away: the firm does not manage them and cannot see their holdings; the firm treats purchases in the held-away 401(k) and 403(b) as if they count for the wash-sale windows, though the rule for employer plans is unsettled.")
    expect(held.figures.map((f) => [f.label, f.value])).toEqual([['Vanguard 401(k) — Former employer', 2_400_000], ['TIAA 403(b) — University', 1_500_000]])
  })

  it('states the open items: the IPS signature state and the Vanguard beneficiary', () => {
    const items = titled(findings, 'Open items: the IPS and the Vanguard beneficiary')
    expect(items).toMatchObject({ attention: 'attention', claim: "The investment policy statement is signed; the beneficiary on Robert's Vanguard plan does not match the estate plan." })
    expect(items.citations.map((c) => c.source)).toEqual(['Document · doc-001 · Johnson Family Trust — IPS', 'Client communication · comm-014'])
  })

  it("times the Roth-conversion window to Robert's first required distribution, from his date of birth", () => {
    const rmd = titled(findings, 'Roth conversions before required distributions')
    expect(rmd.citations.map((c) => c.source)).toEqual(['Required beginning · Robert Johnson, born 1958-03-22 · first required distribution for 2031 (age 73, SECURE 2.0)'])
    const ira = accounts.find((a) => a.id === 'acc-003')!
    const value = getPositionsForAccount(ira.id, ira.totalValue).reduce((s, p) => s + p.marketValue, 0)
    expect(rmd.figures).toEqual([{ label: 'Robert Johnson Traditional IRA', value, unit: 'USD', source: 'positions.marketValue' }])
    expect(rmd.claim).toMatch(/estimate/)
  })

  it('after the morning fills: the changes name the moved account, and the new window is open', () => {
    release(approvedV1())
    const after = runMeetingPrepAgent('hh-001', '2026-02-25T15:00:00.000Z')
    const changes = titled(after, "This morning's rebalance and harvest")
    expect(changes.claim).toBe("Orders released today were filled in Robert Johnson Individual; the figures below include today's trades.")
    expect(changes.figures.map((f) => f.label)).toEqual(['Sold today', 'Bought today'])
    expect(titled(after, 'Wash-sale windows: what not to buy back').citations.map((c) => c.source))
      .toContain('Wash-sale window · rs-006 · INTC loss sale of 25 Feb 2026, open through 27 Mar 2026')
  })
})
