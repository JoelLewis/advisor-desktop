import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { BRIEF_THREAD_ID, briefMessages } from '../brief'
import { remeasureBrief } from '../brief-remeasure'
import { approvedStoryV3, approvedV1, ok, release } from './story-fixture'
import { advanceProspect, recordCoffee } from '../prospect-steps'

type Finding = Extract<Message, { kind: 'agent_finding' }>
const brief = () => store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID)
const findings = () => brief().filter((m): m is Finding => m.kind === 'agent_finding')
const summary = () => {
  const s = brief().find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('The Brief has a summary')
  return s
}
/** The Brief's measured messages; Today is composed on read, not measured, so it is left out. */
async function openBrief() {
  const res = await fetch(`/api/workspace/threads/${BRIEF_THREAD_ID}`, { headers: { 'X-Viewer': 'user-001' } })
  const { messages } = (await res.json()) as { messages: Message[] }
  return { messages: messages.filter((m) => m.kind !== 'brief_today') }
}

describe('the Brief re-measures on view once the book has moved', () => {
  it('is the morning\'s Brief until something fills', async () => {
    const morning = briefMessages().map((m) => m.id)
    remeasureBrief()
    expect((await openBrief()).messages.map((m) => m.id)).toEqual(morning)
  })

  it("after the story's v3 fills: no INTC harvest, the recorded sale through 2026-03-27, US Equity still outside", async () => {
    release(approvedStoryV3())
    const { messages } = await openBrief()
    expect(messages[0]).toMatchObject({ kind: 'brief_summary', id: 'msg-r1-00' })
    expect(messages.every((m) => m.at > MOCK_NOW_ISO)).toBe(true)
    expect(findings().some((f) => f.claim.startsWith('The remaining Intel Corp. shares can be sold at a loss today'))).toBe(false)
    expect(findings().some((f) => f.citations.some((c) => c.source === 'Wash-sale window · rs-006 · INTC loss sale of 25 Feb 2026 · Don\'t repurchase through 27 Mar 2026'))).toBe(true)
    expect(summary().decide[0]?.readings[0]?.line).toBe('US Equity is outside its tolerance band')
    expect(findings().every((f) => f.runKey.endsWith('|book 1'))).toBe(true)
    const ids = brief().map((m) => m.id)
    await openBrief()
    expect(brief().map((m) => m.id)).toEqual(ids)
  })

  it('re-measures when the day changes though the book has not: nothing bought on Wednesday reads "bought today" on Thursday', async () => {
    release(approvedStoryV3())
    await openBrief()
    expect(findings().some((f) => f.claim.includes('was bought today in this account'))).toBe(true)
    ok(recordCoffee('user-001', 'prsp-011', 'Coffee after the introduction.'))
    ok(advanceProspect('user-001', 'prsp-011', 'reply'))
    const { messages } = await openBrief()
    expect(messages[0]).toMatchObject({ kind: 'brief_summary', id: 'msg-r1-0226-00' })
    expect(findings().some((f) => /bought today|was sold at a loss today/.test(f.claim))).toBe(false)
    expect(findings().every((f) => f.runKey.endsWith('|book 1|day 2026-02-26'))).toBe(true)
  })

  it('after v1 fills: every class inside its band, private equity still noted', async () => {
    release(approvedV1())
    await openBrief()
    expect(summary().context.flatMap((i) => i.readings.map((r) => r.line))).toContain('Every asset class is inside its tolerance band')
    expect(findings().map((f) => f.claim)).toContain("Private Equity cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows.")
  })

  it('after v1 fills: the re-measured readings carry the re-measure time as their as-of, not the morning', async () => {
    release(approvedV1())
    await openBrief()
    const engineCites = findings().flatMap((f) => f.citations.filter((c) => !c.source.startsWith('Held-away assets')).map((c) => ({ at: f.at, asOf: c.asOf })))
    expect(engineCites.length).toBeGreaterThan(0)
    expect(engineCites.every(({ at, asOf }) => asOf === at && asOf > MOCK_NOW_ISO)).toBe(true)
  })

  it('after v1 fills: Intel is one item in Context with its two realized losses, and no two items read the same', async () => {
    release(approvedV1())
    await openBrief()
    const { decide, context } = summary()
    const titles = [...decide, ...context].map((i) => i.title ?? i.readings[0]?.line)
    expect(new Set(titles).size).toBe(titles.length)
    expect(context.find((i) => i.title === 'Intel Corp.')?.readings.map((r) => r.line)).toEqual([
      'Sold at a loss today; a buyback would wash the loss', 'Sold at a loss recently; a buyback would wash the loss',
    ])
  })

  it('Today leads the Brief before and after a re-measure', async () => {
    const kinds = async () => {
      const res = await fetch(`/api/workspace/threads/${BRIEF_THREAD_ID}`, { headers: { 'X-Viewer': 'user-001' } })
      return ((await res.json()) as { messages: Message[] }).messages.map((m) => m.kind)
    }
    expect((await kinds()).slice(0, 2)).toEqual(['brief_today', 'brief_summary'])
    release(approvedV1())
    expect((await kinds()).slice(0, 2)).toEqual(['brief_today', 'brief_summary'])
  })

  it('a reset brings back the morning', async () => {
    release(approvedV1())
    await openBrief()
    resetWorkspaceStore()
    expect((await openBrief()).messages.map((m) => m.id)).toEqual(briefMessages().map((m) => m.id))
    expect(brief()[0]?.id).toBe('msg-b00')
  })
})
