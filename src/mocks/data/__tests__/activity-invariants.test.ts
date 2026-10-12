import { describe, it, expect } from 'vitest'
import { activities } from '@/mocks/data/activities'
import { realisedSales } from '@/mocks/data/realised-sales'
import { orders } from '@/mocks/handlers/oms'
import { KNOWN_OPEN_DATES } from '@/mocks/handlers/custodian'
import { notes } from '@/mocks/data/notes'
import { MOCK_NOW_ISO } from '@/lib/clock'

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

  it('act-011 is the SMH bought the same morning, after the sale fill and before note-002', () => {
    expect(replacement.description).toBe('Purchased 180 shares SMH at $245.20 in Robert Johnson Individual as the INTC replacement.')
    expect(replacement.timestamp.slice(0, 10)).toBe(KNOWN_OPEN_DATES.get('pos-265'))
    expect(replacement.timestamp > sale.timestamp).toBe(true)
    const note002 = notes.find((n) => n.id === 'note-002')!
    expect(replacement.timestamp < note002.createdAt).toBe(true)
  })

  it('no activity is dated after the frozen now', () => {
    for (const a of activities) expect(Date.parse(a.timestamp), `${a.id} ${a.timestamp}`).toBeLessThanOrEqual(Date.parse(MOCK_NOW_ISO))
  })
})
