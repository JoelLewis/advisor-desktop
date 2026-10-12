import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { carryFinding } from '../carry'
import { runAgent } from '../run-agent'

const intcFinding = () => store().messages.find((m) => m.kind === 'agent_finding' && m.agentId === 'harvest-scanner')!

describe('carrying a Brief finding into a team thread', () => {
  beforeEach(() => resetWorkspaceStore())

  it('posts a quoted card with who carried it and when; a repeat returns the same card', () => {
    const finding = intcFinding()
    const first = carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
    if (!first.ok) throw new Error(first.message)
    expect(first.created).toBe(true)
    expect(first.message).toMatchObject({ kind: 'carried', threadId: 'th-johnson-review', carriedBy: 'user-001', fromThreadId: 'th-brief', findingId: finding.id })
    if (finding.kind !== 'agent_finding') throw new Error('expected a finding')
    expect(first.message.finding).toEqual({ agentId: finding.agentId, at: finding.at, claim: finding.claim, figures: finding.figures, citations: finding.citations, attention: finding.attention })
    const again = carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
    expect(again).toMatchObject({ ok: true, created: false, message: { id: first.message.id } })
    expect(store().messages.filter((m) => m.kind === 'carried')).toHaveLength(1)
  })

  it('refuses a client thread, someone else\'s brief, a summary, and anything the viewer cannot see', () => {
    const id = intcFinding().id
    expect(carryFinding('user-001', 'th-brief', id, 'th-robert')).toMatchObject({ ok: false, status: 400 })
    expect(carryFinding('user-002', 'th-brief', id, 'th-johnson-review')).toMatchObject({ ok: false, status: 404 })
    expect(carryFinding('cco-001', 'th-brief', id, 'th-johnson-review')).toMatchObject({ ok: false, status: 404 })
    expect(carryFinding('cli-001', 'th-brief', id, 'th-johnson-review')).toMatchObject({ ok: false, status: 404 })
    expect(carryFinding('user-001', 'th-brief', 'msg-b00', 'th-johnson-review')).toMatchObject({ ok: false, status: 404, code: 'NO_FINDING' })
    expect(carryFinding('user-001', 'th-brief', id, 'th-nowhere')).toMatchObject({ ok: false, status: 404 })
    expect(store().messages.some((m) => m.kind === 'carried')).toBe(false)
  })

  it("refuses a finding from a thread that is not the viewer's own brief", () => {
    const run = runAgent('user-001', 'th-johnson-review', 'drift-monitor')
    if (!run.ok) throw new Error(run.message)
    const teamFinding = run.findings[0]!
    expect(carryFinding('user-001', 'th-johnson-review', teamFinding.id, 'th-johnson-review')).toMatchObject({ ok: false, status: 403, code: 'NOT_YOUR_BRIEF' })
    expect(store().messages.some((m) => m.kind === 'carried')).toBe(false)
  })

  it('refuses a team thread the viewer can read but is not a member of', () => {
    // Compliance reads every firm thread without being a member of it.
    const finding = intcFinding()
    if (finding.kind !== 'agent_finding') throw new Error('expected a finding')
    store().threads.push({ id: 'th-cco-brief', title: 'Brief', visibility: 'private', ownerId: 'cco-001', memberIds: ['cco-001'], agentIds: ['harvest-scanner'], subject: { type: 'account', id: 'acc-002' } })
    store().messages.push({ ...finding, id: 'msg-cco-finding', threadId: 'th-cco-brief' })
    expect(carryFinding('cco-001', 'th-cco-brief', 'msg-cco-finding', 'th-johnson-review')).toMatchObject({ ok: false, status: 403, code: 'NOT_A_MEMBER' })
    expect(store().messages.some((m) => m.kind === 'carried')).toBe(false)
  })
})
