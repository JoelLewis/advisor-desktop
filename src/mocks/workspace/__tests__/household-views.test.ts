import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { clientView, householdView } from '../household-views'
import { holdMeeting } from '../meetings'
import { approvedV1, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const johnson = () => {
  const view = householdView(ADRIAN, 'hh-001')
  if (!view) throw new Error('the Johnson household view is readable by the advisor')
  return view
}
const valueOf = (id: string) => {
  const a = accounts.find((x) => x.id === id)!
  return getPositionsForAccount(a.id, a.totalValue).reduce((s, p) => s + p.marketValue, 0)
}

describe('the household view', () => {
  it('names the household and its members', () => {
    expect(johnson()).toMatchObject({ id: 'hh-001', name: 'Johnson Household', shortName: 'Johnson' })
    expect(johnson().members).toEqual([
      { clientId: 'cli-001', name: 'Robert Johnson', relationship: 'primary', dateOfBirth: '1958-03-22' },
      { clientId: 'cli-002', name: 'Patricia Johnson', relationship: 'spouse', dateOfBirth: '1960-07-11' },
    ])
  })

  it('lists all five managed accounts, each valued from its positions, against its model', () => {
    const rows = johnson().accounts
    expect(rows.map((r) => r.accountId)).toEqual(['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005'])
    for (const row of rows) {
      const account = accounts.find((a) => a.id === row.accountId)!
      const drift = computeDriftForAccount(account)
      expect(row.value, row.accountId).toBe(valueOf(row.accountId))
      expect(row.modelName).toBe(modelDisplayName(drift.modelId))
      expect(row.withinBand).toBe(!drift.needsRebalance)
      expect(row.maxAbsDrift).toBe(drift.maxAbsDrift)
      expect(row.outside.map((o) => o.assetClass)).toEqual(drift.assetClassDrifts.filter((d) => Math.abs(d.drift) > drift.driftTolerance).map((d) => d.assetClass))
      for (const o of row.outside) expect([undefined, 'not_market_tradable', 'replacement_hold']).toContain(o.residual)
    }
    expect(rows[1]).toMatchObject({ name: 'Robert Johnson Individual', ownerName: 'Robert Johnson', typeLabel: 'Individual' })
    expect(Math.abs(johnson().managedValue - 18_750_000)).toBeLessThanOrEqual(5)
    expect(johnson().managedValue).toBe(rows.reduce((s, r) => s + r.value, 0))
  })

  it('flags the held-away plans, outside the firm\'s view', () => {
    expect(johnson().heldAway).toEqual([
      { id: 'ha-001', ownerName: 'Robert Johnson', institution: 'Vanguard', accountType: '401(k) — Former employer', value: 2_400_000, reportedOn: '2025-12-01' },
      { id: 'ha-002', ownerName: 'Patricia Johnson', institution: 'TIAA', accountType: '403(b) — University', value: 1_500_000, reportedOn: '2025-11-15' },
    ])
    expect(johnson().heldAwayValue).toBe(3_900_000)
  })

  it("states the plan's goals with probability and funded status", () => {
    expect(johnson().planProbability).toBe(0.87)
    expect(johnson().goals).toContainEqual({ id: 'goal-002', name: 'Legacy / Estate', probability: 0.78, funded: 0.85, status: 'at_risk' })
  })

  it("lists the taxpayer's open wash-sale windows, and the one the morning's fills open", () => {
    expect(johnson().windows).toEqual([{ saleId: 'rs-001', accountName: 'Robert Johnson Individual', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-20', through: '2026-03-22', loss: -32_750 }])
    release(approvedV1())
    expect(johnson().windows.map((w) => [w.saleId, w.through])).toEqual([['rs-001', '2026-03-22'], ['rs-006', '2026-03-27']])
    expect(johnson().accounts[1]!.value).toBe(valueOf('acc-002'))
  })

  it('states the IPS and its signature, and the open items', () => {
    expect(johnson().ips).toEqual({ documentId: 'doc-001', name: 'Johnson Family Trust — IPS', signatureStatus: 'signed', signedOn: '2025-11-15' })
    expect(johnson().openItems.map((i) => i.id)).toEqual(['oi-001', 'doc-003'])
    expect(johnson().openItems[1]).toEqual({ id: 'doc-003', text: 'Awaiting signature: Tax Loss Harvesting Proposal', source: 'doc-003' })
  })

  it('carries documents, communications and activity, latest first, none after the session clock', () => {
    const view = johnson()
    expect(view.documents.map((d) => d.id)).toEqual(['doc-003', 'doc-002', 'doc-001', 'doc-004'])
    expect(view.communications.every((c) => Date.parse(c.at) <= Date.parse(MOCK_NOW_ISO))).toBe(true)
    expect(view.communications.map((c) => c.at)).toEqual([...view.communications.map((c) => c.at)].sort().reverse())
    expect(view.communications.find((c) => c.id === 'comm-014')?.summary).toContain('Vanguard 401(k)')
    expect(view.activity.map((a) => a.id)).toEqual(expect.arrayContaining(['act-005', 'act-011']))
  })

  it('lists the annual review as upcoming, then past once it is held', () => {
    expect(johnson().meetings).toEqual({
      past: [],
      upcoming: [{ eventId: 'evt-010', title: 'Johnson annual review', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z', state: 'scheduled', threadId: 'th-johnson-meeting' }],
    })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(johnson().meetings.past.map((m) => [m.eventId, m.state])).toEqual([['evt-010', 'held']])
    expect(johnson().meetings.upcoming).toEqual([])
  })

  it('is firm only: a client, a stranger and an unknown household get nothing', () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(householdView(viewer, 'hh-001'), viewer).toBeDefined()
    expect(householdView('cli-001', 'hh-001')).toBeUndefined()
    expect(householdView('nobody', 'hh-001')).toBeUndefined()
    expect(householdView(ADRIAN, 'hh-999')).toBeUndefined()
  })
})

describe('the client view', () => {
  it("states Patricia's profile, risk assessment and its date, her accounts, the household IPS and the communications she has (none)", () => {
    const view = clientView(ADRIAN, 'cli-002')!
    expect(view).toMatchObject({
      id: 'cli-002', name: 'Patricia Johnson', householdId: 'hh-001', householdName: 'Johnson Household', dateOfBirth: '1960-07-11', occupation: 'Retired',
      preferredContact: 'phone', risk: { tolerance: 'Conservative', scoreFraction: 0.35, assessedOn: '2025-09-15' },
    })
    expect(view.accounts.map((a) => a.accountId)).toEqual(['acc-004', 'acc-005'])
    expect(view.accountsValue).toBe(view.accounts.reduce((s, a) => s + a.value, 0))
    expect(view.ips?.documentId).toBe('doc-001')
    expect(view.communications).toEqual([])
  })

  it("carries only the client's own communications", () => {
    const comms = clientView(ADRIAN, 'cli-001')!.communications
    expect(comms.length).toBeGreaterThan(0)
    expect(comms.every((c) => c.clientName === 'Robert Johnson')).toBe(true)
  })

  it('is firm only', () => {
    expect(clientView('cli-001', 'cli-001')).toBeUndefined()
    expect(clientView(ADRIAN, 'cli-999')).toBeUndefined()
    expect(clientView('cco-001', 'cli-001')?.name).toBe('Robert Johnson')
  })
})
