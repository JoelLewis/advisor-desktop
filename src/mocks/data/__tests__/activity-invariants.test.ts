import { describe, it, expect } from 'vitest'
import { activities } from '@/mocks/data/activities'
import { realisedSales } from '@/mocks/data/realised-sales'
import { orders } from '@/mocks/handlers/oms'
import { KNOWN_OPEN_DATES } from '@/mocks/handlers/custodian'
import { notes } from '@/mocks/data/notes'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { tasks } from '@/mocks/data/workflows'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { getSupervisionRecords } from '@/services/compliance'

describe('§0.7 · the activity feed agrees with the records', () => {
  const sale = activities.find((a) => a.id === 'act-005')!
  const replacement = activities.find((a) => a.id === 'act-011')!
  const rs001 = realisedSales.find((s) => s.id === 'rs-001')!

  it("act-005 is rs-001: 5,000 INTC at $28.45, a $32,750 long-term loss, at ord-004's fill", () => {
    expect(sale.description).toBe('Sold 5,000 shares INTC at $28.45 in Robert Johnson Individual. Realised long-term loss: $32,750.')
    expect(rs001.proceeds / rs001.quantity).toBe(28.45)
    expect(rs001.realisedGainLoss).toBe(-32_750)
    expect(sale.timestamp).toBe(orders.find((o) => o.id === 'ord-004')!.filledAt)
    expect(sale.description).not.toContain('500 shares INTC at')
    expect(sale.description).not.toContain('6,820')
  })

  it('act-011 is the SMH bought five minutes after the sale fill, on its recorded open date, before note-002', () => {
    expect(replacement.description).toBe('Purchased 180 shares SMH at $245.20 in Robert Johnson Individual as the INTC replacement.')
    expect(replacement.timestamp.slice(0, 10)).toBe(KNOWN_OPEN_DATES.get('pos-265'))
    expect(Date.parse(replacement.timestamp) - Date.parse(sale.timestamp)).toBe(5 * 60_000)
    const note002 = notes.find((n) => n.id === 'note-002')!
    expect(replacement.timestamp < note002.createdAt).toBe(true)
  })

  it('the harvest records follow one another on the day of the sale: fill, replacement, note, task, compliance review', async () => {
    const note002 = notes.find((n) => n.id === 'note-002')!
    const task006 = tasks.find((t) => t.id === 'task-006')!
    const comp006 = complianceAlerts.find((a) => a.id === 'comp-006')!
    const [sr002] = await getSupervisionRecords('comp-006')
    const sequence = [sale.timestamp, replacement.timestamp, note002.createdAt, task006.createdAt, comp006.createdAt, comp006.resolvedAt!].map(Date.parse)
    expect(sequence).toEqual([...sequence].sort((a, b) => a - b))
    expect(new Set([sale.timestamp, note002.createdAt, task006.createdAt, comp006.createdAt].map((t) => t.slice(0, 10)))).toEqual(new Set([rs001.saleDate]))
    expect(sr002!.timestamp).toBe(comp006.resolvedAt)
  })

  it('no activity is dated after the frozen now', () => {
    for (const a of activities) expect(Date.parse(a.timestamp), `${a.id} ${a.timestamp}`).toBeLessThanOrEqual(Date.parse(MOCK_NOW_ISO))
  })
})
