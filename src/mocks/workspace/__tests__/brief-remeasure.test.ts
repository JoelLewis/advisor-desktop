import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { BRIEF_THREAD_ID, briefMessages } from '../brief'
import { remeasureBrief } from '../brief-remeasure'
import { approvedStoryV3, approvedV1, release } from './story-fixture'

type Finding = Extract<Message, { kind: 'agent_finding' }>
const brief = () => store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID && m.kind !== 'meeting_notice')
const findings = () => brief().filter((m): m is Finding => m.kind === 'agent_finding')
const summary = () => {
  const s = brief().find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('The Brief has a summary')
  return s
}
/** The Brief's measured messages; the meeting line is seeded, not measured, so it is left out. */
async function openBrief() {
  const res = await fetch(`/api/workspace/threads/${BRIEF_THREAD_ID}`, { headers: { 'X-Viewer': 'user-001' } })
  const { messages } = (await res.json()) as { messages: Message[] }
  return { messages: messages.filter((m) => m.kind !== 'meeting_notice') }
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
    expect(findings().some((f) => f.claim.startsWith('Intel Corp. can be sold at a loss today'))).toBe(false)
    expect(findings().some((f) => f.citations.some((c) => c.source === 'Wash-sale window · rs-006 · INTC loss sale of 2026-02-25, open through 2026-03-27'))).toBe(true)
    expect(summary().items[0]?.claim).toBe('US Equity is outside its tolerance band.')
    expect(findings().every((f) => f.runKey.endsWith('|book 1'))).toBe(true)
    const ids = brief().map((m) => m.id)
    await openBrief()
    expect(brief().map((m) => m.id)).toEqual(ids)
  })

  it('after v1 fills: every class inside its band, private equity still noted', async () => {
    release(approvedV1())
    await openBrief()
    expect(summary().items.map((i) => i.claim)).toContain('Every asset class is inside its tolerance band.')
    expect(findings().map((f) => f.claim)).toContain("Private Equity cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows.")
  })

  it('after v1 fills: the re-measured readings carry the re-measure time as their as-of, not the morning', async () => {
    release(approvedV1())
    await openBrief()
    const engineCites = findings().flatMap((f) => f.citations.filter((c) => !c.source.startsWith('Held-away assets')).map((c) => ({ at: f.at, asOf: c.asOf })))
    expect(engineCites.length).toBeGreaterThan(0)
    expect(engineCites.every(({ at, asOf }) => asOf === at && asOf > MOCK_NOW_ISO)).toBe(true)
  })

  it('after v1 fills: no two summary items read the same', async () => {
    release(approvedV1())
    await openBrief()
    const claims = summary().items.map((i) => i.claim)
    expect(new Set(claims).size).toBe(claims.length)
    expect(claims).toContain('Intel Corp. was sold at a loss today; buying it back in any account of the same taxpayer, IRAs and Roths included, would wash that loss until its window closes.')
    expect(claims).toContain('Intel Corp. was sold at a loss recently; buying it back in any account of the same taxpayer, IRAs and Roths included, would wash that loss until its window closes.')
  })

  it("the meeting line survives a re-measure, unchanged, and still reads below the ranked summary and its findings", async () => {
    const morningNotice = store().messages.find((m) => m.kind === 'meeting_notice')
    const kinds = async () => {
      const res = await fetch(`/api/workspace/threads/${BRIEF_THREAD_ID}`, { headers: { 'X-Viewer': 'user-001' } })
      return ((await res.json()) as { messages: Message[] }).messages
    }
    const morning = await kinds()
    expect(morning[0]?.kind).toBe('brief_summary')
    expect(morning[morning.length - 1]?.kind).toBe('meeting_notice')
    release(approvedV1())
    const remeasured = await kinds()
    expect(remeasured[0]).toMatchObject({ kind: 'brief_summary', id: 'msg-r1-00' })
    expect(remeasured[remeasured.length - 1]).toEqual(morningNotice)
    expect(remeasured.filter((m) => m.kind === 'meeting_notice')).toHaveLength(1)
  })

  it('a reset brings back the morning', async () => {
    release(approvedV1())
    await openBrief()
    resetWorkspaceStore()
    expect((await openBrief()).messages.map((m) => m.id)).toEqual(briefMessages().map((m) => m.id))
    expect(brief()[0]?.id).toBe('msg-b00')
  })
})
