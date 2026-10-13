import { describe, it, expect } from 'vitest'
import { JOHNSON_REVIEW_TRANSCRIPT, transcriptOf } from '../meeting-transcripts'

const PLAN_NAMES = /401\(k\)|403\(b\)/g
const text = (id: string) => JOHNSON_REVIEW_TRANSCRIPT.find((l) => l.id === id)?.text ?? ''
const all = JOHNSON_REVIEW_TRANSCRIPT.map((l) => l.text).join(' ')

describe('the Johnson annual review transcript', () => {
  it('has twenty-five turns, t-01 to t-25, by Robert, Patricia and Adrian', () => {
    expect(JOHNSON_REVIEW_TRANSCRIPT.map((l) => l.id)).toEqual(Array.from({ length: 25 }, (_, i) => `t-${String(i + 1).padStart(2, '0')}`))
    expect(new Set(JOHNSON_REVIEW_TRANSCRIPT.map((l) => l.speaker))).toEqual(new Set(['cli-001', 'cli-002', 'user-001']))
    expect(transcriptOf('evt-010')).toBe(JOHNSON_REVIEW_TRANSCRIPT)
    expect(transcriptOf('evt-002')).toBeUndefined()
  })

  it('states no figure: figures come from the engine (the plan names 401(k) and 403(b) aside)', () => {
    for (const line of JOHNSON_REVIEW_TRANSCRIPT) expect(line.text.replace(PLAN_NAMES, ''), line.id).not.toMatch(/\d/)
  })

  it('covers the meeting content table, topic by topic', () => {
    // This morning's rebalance and harvest: not buying INTC back; dividends and held-away plans count.
    expect(text('t-02')).toContain('Intel')
    expect(text('t-04')).toMatch(/dividends/)
    expect(text('t-04')).toMatch(/Vanguard/)
    expect(text('t-05')).toContain('Intel')
    // The legacy goal: Patricia wants it kept; Mike's scenarios; options at the next review.
    expect(text('t-07')).toMatch(/legacy goal/)
    expect(text('t-08')).toMatch(/Mike.*scenarios.*Monday/)
    // Roth conversions before RMDs (seventy-three); an estimate, not tax advice; the CPA; Mike's analysis.
    expect(text('t-10')).toContain('seventy-three')
    expect(text('t-11')).toMatch(/conversion amounts/)
    expect(text('t-12')).toMatch(/Mike/)
    expect(text('t-12')).toMatch(/estimate/)
    expect(text('t-12')).toMatch(/CPA/)
    // Consolidating the held-away plans: asked; no recommendation; the comparison; Sarah's request.
    expect(text('t-13')).toMatch(/401\(k\).*403\(b\)/)
    expect(text('t-14')).toMatch(/fees.*services.*investment options/)
    expect(text('t-15')).toMatch(/Sarah.*fee disclosures.*statements/)
    // The beneficiary on the Vanguard 401(k): Robert calls the administrator; Sarah's checklist.
    expect(text('t-17')).toMatch(/beneficiary/)
    expect(text('t-18')).toMatch(/plan administrator/)
    expect(text('t-19')).toMatch(/Sarah.*beneficiary checklist/)
    // ESG for the trust: a signed amendment; Adrian drafts it for the next meeting.
    expect(text('t-20')).toContain('ESG')
    expect(text('t-21')).toMatch(/signed amendment/)
    expect(text('t-23')).toMatch(/draft the amendment.*next meeting/)
    // The IPS: reviewed; no other change.
    expect(text('t-24')).toMatch(/investment policy statement stays as signed/)
    expect(all).not.toMatch(/\brecommend (you|that you) (roll|move|consolidate)/i)
  })
})
