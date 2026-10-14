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
/** Every text a client may read: the firm's line, and its client wording where it has one. */
const clientTexts = toClient.flatMap((l) => [{ id: l.id, text: l.text }, ...(l.toClient ? [{ id: `${l.id} (to client)`, text: l.toClient.text }] : [])])

describe('Meeting Notes', () => {
  it('drafts twenty-three lines in the four sections', () => {
    expect(notes.map((l) => l.id)).toEqual(Array.from({ length: 23 }, (_, i) => `n-${String(i + 1).padStart(2, '0')}`))
    const count = (section: string) => notes.filter((l) => l.section === section).length
    expect([count('discussion'), count('decisions'), count('client_requests'), count('follow_ups')]).toEqual([8, 5, 3, 7])
  })

  it('cites at least one real transcript line on every line', () => {
    for (const line of notes) {
      expect(line.cites.length, line.id).toBeGreaterThan(0)
      for (const id of line.cites) expect(transcript.has(id), `${line.id} cites ${id}`).toBe(true)
    }
  })

  it('states no figure (the plan names aside)', () => {
    for (const line of notes) expect(line.text.replace(PLAN_NAMES, ''), line.id).not.toMatch(/\d/)
    for (const line of clientTexts) expect(line.text.replace(PLAN_NAMES, ''), line.id).not.toMatch(/\d/)
  })

  it('assigns each follow-up as the meeting did, due on a trading day', () => {
    expect(notes.filter((l) => l.section === 'follow_ups').map((l) => [l.id, l.owner, l.due])).toEqual([
      ['n-17', { kind: 'person', personId: 'user-003' }, '2026-03-02'],
      ['n-18', { kind: 'person', personId: 'user-001' }, '2026-03-02'],
      ['n-19', { kind: 'person', personId: 'user-003' }, '2026-03-06'],
      ['n-20', { kind: 'person', personId: 'user-001' }, '2026-02-27'],
      ['n-21', { kind: 'person', personId: 'user-002' }, '2026-03-04'],
      ['n-22', { kind: 'person', personId: 'user-002' }, '2026-02-26'],
      ['n-23', { kind: 'person', personId: 'user-001' }, '2026-03-13'],
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
    for (const line of [...notes, ...clientTexts]) expect(line.text, line.id).not.toMatch(/\bwe recommend|\brecommend (that|you)|\brecommends\b|should (roll|move|consolidate)/i)
    const rollover = toClient.filter((l) => /consolidat|roll ?over|401\(k\).*403\(b\)/i.test(l.text))
    expect(rollover.map((l) => l.id)).toEqual(['n-15'])
    for (const line of rollover) expect(line.text).toContain('asked about; comparison to follow')
    expect(rollover[0]?.toClient?.text).toBe("A rollover of your Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.")
    expect(notes.find((l) => l.id === 'n-15')?.text).toBe("A rollover of Robert's Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.")
  })

  it('every tax item the client will read carries the estimate wording', () => {
    const tax = toClient.filter((l) => /\btax\b|Roth|conversion/i.test(l.text))
    expect(tax.map((l) => l.id)).toEqual(['n-14'])
    for (const line of tax) expect(line.text).toContain('estimate; consult your tax professional')
  })

  it('names no colleague in a line the client will read, and scopes wash sales to the taxpayer', () => {
    for (const line of clientTexts) expect(line.text, line.id).not.toMatch(/Sarah|Mike|Mitchell|Chen/)
    for (const line of notes) expect(line.text, line.id).not.toMatch(/household/i)
  })

  it("records Patricia's accounts against their models: what was said, what was decided, and Adrian's review", () => {
    const line = (id: string) => notes.find((l) => l.id === id)!
    expect(line('n-03')).toMatchObject({ section: 'discussion', cites: ['t-09', 't-10'] })
    expect(line('n-11')).toMatchObject({ section: 'decisions', text: "No trades in Patricia's accounts until her risk profile and models are reviewed.", cites: ['t-09', 't-11'] })
    expect(line('n-18')).toMatchObject({ section: 'follow_ups', text: "Review Patricia's risk profile and model assignments.", owner: { kind: 'person', personId: 'user-001' } })
  })

  it('states what the cited lines say: the deferred loss, the options, the plans Sarah requests', () => {
    const line = (id: string) => notes.find((l) => l.id === id)!
    expect(line('n-01').text).toContain('the loss is deductible now only if Intel is not bought back before its window closes')
    expect(line('n-09').text).toContain('until the wash-sale window closes. As firm policy, the held-away Vanguard 401(k) counts too: the rule for employer plans is unsettled.')
    expect(line('n-10').text).toBe('We keep the legacy goal and will bring the options to the next review.')
    expect(line('n-21').cites).toEqual(['t-16', 't-18'])
  })

  it("words for Robert, in the second person, each line that names him; the meaning and the citations stay the line's", () => {
    const worded = notes.filter((l) => l.toClient)
    expect(worded.map((l) => [l.id, l.toClient!.clientId])).toEqual([['n-09', 'cli-001'], ['n-12', 'cli-001'], ['n-14', 'cli-001'], ['n-15', 'cli-001']])
    for (const line of notes) expect(line.toClient === undefined || line.section === 'decisions' || line.section === 'client_requests', line.id).toBe(true)
    for (const line of toClient.filter((l) => /\bRobert\b/.test(l.text))) expect(line.toClient, line.id).toBeDefined()
    for (const line of worded) {
      expect(line.toClient!.text, line.id).not.toMatch(/\bRobert\b/)
      expect(line.toClient!.text, line.id).toMatch(/\byou(r)?\b/i)
    }
    const to = (id: string) => notes.find((l) => l.id === id)!.toClient!.text
    expect(to('n-09')).toBe("You will not buy Intel in any of your or Patricia's accounts, including the IRAs, until the wash-sale window closes. As firm policy, your held-away Vanguard 401(k) counts too: the rule for employer plans is unsettled. Reinvested dividends count as buying.")
    expect(to('n-12')).toBe('You will contact the Vanguard plan administrator to correct the beneficiary; we will send our beneficiary checklist.')
    expect(to('n-14')).toContain('estimate; consult your tax professional')
  })

  it('has no script for a meeting without a transcript', () => {
    expect(() => draftNotesFromTranscript('evt-002', '2026-02-25')).toThrow(/no transcript/)
  })
})
