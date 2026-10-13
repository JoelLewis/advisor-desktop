import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { calendarEvents } from '@/mocks/data/calendar'
import { plans } from '@/mocks/data/planning'
import { nbas } from '@/mocks/data/nbas'
import { notes } from '@/mocks/data/notes'
import { clientComms } from '@/mocks/data/client-comms'
import { documents } from '@/mocks/data/documents'
import { realisedSales } from '@/mocks/data/realised-sales'
import { clients } from '@/mocks/data/clients'
import { MOCK_NOW_ISO } from '@/lib/clock'

const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/
const weekdayOf = (local: string) => new Date(`${local.slice(0, 10)}T00:00:00Z`).getUTCDay()
const JOHNSONS: ReadonlySet<string> = new Set(['cli-001', 'cli-002'])
const evt010 = () => {
  const event = calendarEvents.find((e) => e.id === 'evt-010')
  if (!event) throw new Error('evt-010 is missing')
  return event
}

describe('the calendar', () => {
  it('states every time in Eastern Time with its offset, each event ending after it starts', () => {
    for (const e of calendarEvents) {
      expect(e.startTime, e.id).toMatch(OFFSET_TIME)
      expect(e.endTime, e.id).toMatch(OFFSET_TIME)
      expect(Date.parse(e.endTime), e.id).toBeGreaterThan(Date.parse(e.startTime))
    }
  })

  it('puts no event on a weekend', () => {
    for (const e of calendarEvents) expect([0, 6], `${e.id} ${e.startTime}`).not.toContain(weekdayOf(e.startTime))
  })

  it('holds the Johnson annual review this afternoon, between the Patel call and Dr. Pell\'s coffee, overlapping nothing', () => {
    expect(evt010()).toMatchObject({
      title: 'Annual Review — Johnson Household', clientId: 'cli-001', householdId: 'hh-001', meetingType: 'annual_review',
      startTime: '2026-02-25T14:00:00-05:00', endTime: '2026-02-25T15:15:00-05:00', location: 'Office — Main',
      attendees: ['cli-001', 'cli-002', 'user-001'],
    })
    expect(new Date(evt010().startTime).toISOString()).toBe('2026-02-25T19:00:00.000Z')
    expect(new Date(evt010().endTime).toISOString()).toBe('2026-02-25T20:15:00.000Z')
    const today = calendarEvents.filter((e) => e.startTime.startsWith('2026-02-25')).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    expect(today.map((e) => e.id)).toEqual(['evt-001', 'evt-002', 'evt-003', 'evt-010', 'evt-004'])
    for (let i = 1; i < today.length; i++) expect(Date.parse(today[i - 1]!.endTime)).toBeLessThanOrEqual(Date.parse(today[i]!.startTime))
  })

  it("names each client event's household and invites its client", () => {
    for (const e of calendarEvents.filter((x) => x.clientId !== undefined)) {
      const client = clients.find((c) => c.id === e.clientId)
      expect(e.householdId, e.id).toBe(client?.householdId)
      expect(e.attendees, e.id).toContain(e.clientId)
    }
  })

  it("dates the Johnson plan's next review to the annual review", () => {
    expect(plans.find((p) => p.id === 'plan-001')?.nextReviewDate).toBe(evt010().startTime.slice(0, 10))
  })
})

describe('one Johnson IPS story', () => {
  it('the IPS on file is doc-001, signed on 2025-11-15', () => {
    expect(documents.find((d) => d.id === 'doc-001')).toMatchObject({ type: 'ips', signatureStatus: 'signed', createdAt: '2025-11-15T10:00:00Z' })
  })

  it('nothing about the Johnsons calls the IPS review overdue or dates it to any other day', () => {
    const texts = [
      ...nbas.filter((n) => n.clients.some((c) => JOHNSONS.has(c.id)))
        .flatMap((n) => [n.title, n.description, n.trigger.value, ...(n.complianceInfo?.auditTrail ?? []).map((a) => a.note ?? '')]),
      ...notes.filter((n) => JOHNSONS.has(n.clientId)).map((n) => n.content),
      ...clientComms.filter((c) => JOHNSONS.has(c.clientId)).map((c) => c.summary),
    ]
    for (const text of texts.filter((t) => /\bIPS\b|investment policy/i.test(t))) {
      expect(text).not.toMatch(/overdue/i)
      for (const date of text.match(/\d{4}-\d{2}-\d{2}/g) ?? []) expect(['2025-11-15', '2026-02-25'], text).toContain(date)
    }
  })

  it('nba-012 states the signed IPS and attributes the annual cadence to firm policy', () => {
    const nba = nbas.find((n) => n.id === 'nba-012')
    expect(nba?.title).toBe('Annual review today — Johnson Household')
    expect(nba?.description).toBe('The Johnson Family Trust IPS was signed on 2025-11-15. Firm policy requires an annual IPS review; it is on the agenda for the annual review on 2026-02-25.')
  })
})

describe('client communications', () => {
  it('none is timestamped after the frozen now', () => {
    for (const c of clientComms) expect(Date.parse(c.timestamp), c.id).toBeLessThanOrEqual(Date.parse(MOCK_NOW_ISO))
  })

  it('comm-001 states no performance figure; performance comes from the engine', () => {
    const comm = clientComms.find((c) => c.id === 'comm-001')
    expect(comm?.summary).not.toMatch(/%|YTD|benchmark|outperform/i)
  })

  it("comm-009 reports rs-001: its quantity, its loss and its window, after the sale", () => {
    const comm = clientComms.find((c) => c.id === 'comm-009')
    const sale = realisedSales.find((s) => s.id === 'rs-001')
    if (!comm || !sale) throw new Error('comm-009 and rs-001 are fixtures')
    expect(comm.summary).toContain(`${sale.quantity.toLocaleString('en-US')} INTC`)
    expect(comm.summary).toContain(`$${Math.abs(sale.realisedGainLoss).toLocaleString('en-US')} long-term loss`)
    expect(comm.summary).toContain('through March 22')
    expect(comm.timestamp.slice(0, 10) >= sale.saleDate).toBe(true)
  })

  it("comm-014's beneficiary discrepancy is on the held-away Vanguard 401(k), not a trust designation", () => {
    const comm = clientComms.find((c) => c.id === 'comm-014')
    expect(comm?.summary).toContain('Vanguard 401(k)')
    expect(comm?.summary).not.toMatch(/trust designation/i)
  })
})

describe('no generated prep text reaches the product', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? (name === '__tests__' ? [] : walk(path)) : [path]
  })
  const sources = walk(join(process.cwd(), 'src')).filter((f) => /\.(ts|tsx)$/.test(f))

  it.each([
    'Current advisory fee is 0.85%', '14 months ago', 'harvestable losses identified in INTC',
    'returned +12.4% over the past 12 months', 'Monte Carlo probability at 87%',
  ])('no source file contains "%s"', (text) => {
    expect(sources.filter((f) => readFileSync(f, 'utf8').includes(text))).toEqual([])
  })

  it('the calendar handler serves events and the schedule only', () => {
    const handler = readFileSync(join(process.cwd(), 'src/mocks/handlers/calendar.ts'), 'utf8')
    expect(handler).not.toMatch(/\/prep|\/notes|\/follow-ups/)
  })
})
