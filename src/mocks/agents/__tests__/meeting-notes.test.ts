import { describe, it, expect } from 'vitest'
import { draftNotesFromTranscript } from '../meeting-notes'
import { JOHNSON_REVIEW_TRANSCRIPT } from '@/mocks/data/meeting-transcripts'
import { personById } from '@/mocks/data/people'
import { isTradingDay } from '@/lib/trading-calendar'
import { firstNameOf } from '@/lib/words'

const PLAN_NAMES = /401\(k\)|403\(b\)/g
const notes = draftNotesFromTranscript('evt-010', '2026-02-25')
const transcript = new Map(JOHNSON_REVIEW_TRANSCRIPT.map((l) => [l.id, l]))
const toClient = notes.filter((l) => l.section === 'decisions' || l.section === 'client_requests')

describe('Meeting Notes', () => {
  it('drafts twenty lines in the four sections', () => {
    expect(notes.map((l) => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => `n-${String(i + 1).padStart(2, '0')}`))
    const count = (section: string) => notes.filter((l) => l.section === section).length
    expect([count('discussion'), count('decisions'), count('client_requests'), count('follow_ups')]).toEqual([7, 4, 3, 6])
  })

  it('cites at least one real transcript line on every line', () => {
    for (const line of notes) {
      expect(line.cites.length, line.id).toBeGreaterThan(0)
      for (const id of line.cites) expect(transcript.has(id), `${line.id} cites ${id}`).toBe(true)
    }
  })

  it('states no figure (the plan names aside)', () => {
    for (const line of notes) expect(line.text.replace(PLAN_NAMES, ''), line.id).not.toMatch(/\d/)
  })

  it('assigns each follow-up as the meeting did, due on a trading day', () => {
    expect(notes.filter((l) => l.section === 'follow_ups').map((l) => [l.id, l.owner, l.due])).toEqual([
      ['n-15', { kind: 'person', personId: 'user-003' }, '2026-03-02'],
      ['n-16', { kind: 'person', personId: 'user-003' }, '2026-03-06'],
      ['n-17', { kind: 'person', personId: 'user-001' }, '2026-02-27'],
      ['n-18', { kind: 'person', personId: 'user-002' }, '2026-03-04'],
      ['n-19', { kind: 'person', personId: 'user-002' }, '2026-02-26'],
      ['n-20', { kind: 'person', personId: 'user-001' }, '2026-03-13'],
    ])
    for (const line of notes.filter((l) => l.section === 'follow_ups')) expect(isTradingDay(line.due!), line.id).toBe(true)
    for (const line of notes.filter((l) => l.section !== 'follow_ups')) {
      expect(line.owner, line.id).toBeUndefined()
      expect(line.due, line.id).toBeUndefined()
    }
  })

  it('never chooses an owner: each is named, or speaks for themself, in a cited line', () => {
    for (const line of notes.filter((l) => l.section === 'follow_ups')) {
      if (line.owner?.kind !== 'person') throw new Error(`${line.id} has no person owner`)
      const owner = personById(line.owner.personId)!
      const cited = line.cites.map((id) => transcript.get(id)!)
      const named = cited.some((t) => t.text.includes(firstNameOf(owner.name)))
      const selfStated = cited.some((t) => t.speaker === owner.id && /\bI'll\b/.test(t.text))
      expect(named || selfStated, line.id).toBe(true)
    }
  })

  it('adds no recommendation nobody made; a rollover is only asked about', () => {
    for (const line of notes) expect(line.text, line.id).not.toMatch(/\bwe recommend|\brecommend (that|you)|\brecommends\b|should (roll|move|consolidate)/i)
    const rollover = toClient.filter((l) => /consolidat|roll ?over|401\(k\).*403\(b\)/i.test(l.text))
    expect(rollover.map((l) => l.id)).toEqual(['n-13'])
    for (const line of rollover) expect(line.text).toContain('asked about; comparison to follow')
  })

  it('every tax item the client will read carries the estimate wording', () => {
    const tax = toClient.filter((l) => /\btax\b|Roth|conversion/i.test(l.text))
    expect(tax.map((l) => l.id)).toEqual(['n-12'])
    for (const line of tax) expect(line.text).toContain('estimate; consult your tax professional')
  })

  it('names no colleague in a line the client will read, and scopes wash sales to the taxpayer', () => {
    for (const line of toClient) expect(line.text, line.id).not.toMatch(/Sarah|Mike|Mitchell|Chen/)
    for (const line of notes) expect(line.text, line.id).not.toMatch(/household/i)
  })

  it('has no script for a meeting without a transcript', () => {
    expect(() => draftNotesFromTranscript('evt-002', '2026-02-25')).toThrow(/no transcript/)
  })
})
