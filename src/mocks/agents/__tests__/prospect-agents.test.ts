import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { runAgent } from '@/mocks/workspace/run-agent'
import { ADRIAN, withHerReply } from '@/mocks/workspace/__tests__/prospect-fixture'

type Finding = Extract<Message, { kind: 'agent_finding' }>
function run(agentId: 'prospect-profile' | 'transfer-in', viewer = ADRIAN, threadId = 'th-pell-work'): Finding[] {
  const r = runAgent(viewer, threadId, agentId)
  if (!r.ok) throw new Error(r.message)
  return r.findings.filter((m): m is Finding => m.kind === 'agent_finding')
}
const figure = (f: Finding | undefined, label: string) => f?.figures.find((x) => x.label === label)?.value

describe('Prospect Profile', () => {
  it('before her reply reports nothing to score; after it, measures anew', () => {
    const before = run('prospect-profile')
    expect(before.map((f) => f.claim)).toEqual(['No questionnaire is on file yet; there is nothing to score.'])
    withHerReply()
    const after = run('prospect-profile')
    expect(after.map((f) => f.claim)).toEqual([
      "Dr. Amanda Pell's answers average to a score in the moderate aggressive band.",
      "The firm's risk-profile table maps the moderate aggressive band to Growth, whose weights are below.",
    ])
    expect(after.every((f) => !before.some((b) => b.id === f.id))).toBe(true)
    expect([figure(after[0], 'Score'), figure(after[0], 'Band from'), figure(after[0], 'Band to')]).toEqual([66, 56, 75])
    expect(figure(after[1], 'Stocks')).toBeCloseTo(0.75, 10)
    expect(run('prospect-profile').map((f) => f.id)).toEqual(after.map((f) => f.id))
  })
})

describe('Transfer-In', () => {
  it('sets each holding in kind against selling it, flags the concentration, and records the rollover as asked about', () => {
    expect(run('transfer-in').map((f) => f.claim)).toEqual(['No statements are on file yet; there is nothing to read.'])
    withHerReply()
    const findings = run('transfer-in')
    expect(findings.map((f) => [f.claim, f.attention])).toEqual([
      ['SPY can move in kind; selling it now would realize a long-term gain (an estimate at the top federal rate; state tax not modeled; consult your tax professional).', 'info'],
      ['Stryker Corp. is a concentrated position; it can move in kind, which defers its long-term gain, and selling it now would realize it (an estimate at the top federal rate; state tax not modeled; consult your tax professional).', 'attention'],
      ['Cash moves as cash and carries no gain.', 'info'],
      ['Rollover of the former employer 403(b): asked about; comparison to follow.', 'info'],
    ])
    expect([figure(findings[1], 'Market value'), figure(findings[1], 'Unrealized'), figure(findings[1], 'Tax if sold now')]).toEqual([542_378, 481_378, 114_567.96])
    expect(figure(findings[1], 'Share of her assets')).toBeCloseTo(0.18079, 5)
    expect(figure(findings[1], 'Rate')).toBe(0.238)
    expect(figure(findings[3], 'Value')).toBe(900_000)
  })
})

describe('both agents', () => {
  it('state no digits in a claim, except the plan name 403(b), and never recommend a rollover', () => {
    withHerReply()
    for (const f of [...run('prospect-profile'), ...run('transfer-in')]) {
      expect(f.claim.replace(/403\(b\)|401\(k\)/g, ''), f.claim).not.toMatch(/\d/)
      expect(f.claim).not.toMatch(/recommend/i)
    }
  })
  it('never post in her thread, and she cannot run them', () => {
    expect(runAgent(ADRIAN, 'th-pell', 'transfer-in')).toMatchObject({ ok: false, status: 400, code: 'CLIENT_THREAD' })
    expect(runAgent('prsp-011', 'th-pell-work', 'transfer-in')).toMatchObject({ ok: false, status: 404 })
    expect(runAgent(ADRIAN, 'th-johnson-review', 'prospect-profile')).toMatchObject({ ok: false, status: 403, code: 'NOT_ON_THREAD' })
  })
})
