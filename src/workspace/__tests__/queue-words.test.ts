import { describe, it, expect } from 'vitest'
import { markerWords, reasonWords, statusLineOf } from '@/workspace/book/queue-words'
import type { HouseholdRow } from '@/types/workspace-book'

const AS_OF = '2026-02-25T20:15:00.000Z'
const johnson: HouseholdRow = {
  householdId: 'hh-001', name: 'Johnson Household', managedValue: 18_750_000, markers: { outOfBand: true, compliance: 1, tasks: 1 },
  reasons: [
    { kind: 'decision', count: 1, since: '2026-02-25T12:00:00Z' },
    { kind: 'client_waiting', clientName: 'Robert Johnson', since: '2026-02-25T12:01:00.000Z', threadId: 'th-robert' },
    { kind: 'meeting', label: 'review', start: '2026-02-25T19:00:00.000Z', eventId: 'evt-010' },
  ],
}

describe('the queue in words', () => {
  it("reads a household's reasons as one line", () => {
    expect(statusLineOf(johnson, AS_OF)).toBe('Decision waiting · Robert waiting 8h · review 14:00\u00A0ET')
    expect(statusLineOf({ ...johnson, reasons: [{ kind: 'meeting', label: 'quarterly review', start: '2026-02-25T15:00:00.000Z', eventId: 'evt-x' }] }, AS_OF)).toBe('Quarterly review 10:00\u00A0ET')
  })
  it('counts several of a kind, and says when a task is overdue', () => {
    expect(reasonWords({ kind: 'decision', count: 2, since: AS_OF }, AS_OF)).toBe('2 decisions waiting')
    expect(reasonWords({ kind: 'compliance', count: 1, since: AS_OF }, AS_OF)).toBe('1 compliance item')
    expect(reasonWords({ kind: 'compliance', count: 3, since: AS_OF }, AS_OF)).toBe('3 compliance items')
    expect(reasonWords({ kind: 'task', count: 1, due: '2026-02-24', overdue: true }, AS_OF)).toBe('Task overdue')
    expect(reasonWords({ kind: 'task', count: 2, due: '2026-02-25', overdue: false }, AS_OF)).toBe('2 tasks due today')
  })
  it('a household with nothing due has no line and no markers', () => {
    const quiet: HouseholdRow = { ...johnson, reasons: [], markers: { outOfBand: false, compliance: 0, tasks: 0 } }
    expect(statusLineOf(quiet, AS_OF)).toBe('')
    expect(markerWords(quiet.markers)).toEqual([])
  })
  it('marks drift, compliance and open items in words, never by color alone', () => {
    expect(markerWords(johnson.markers)).toEqual(['OUT OF BAND', 'COMPLIANCE · 1', 'OPEN ITEMS · 1'])
  })
})
