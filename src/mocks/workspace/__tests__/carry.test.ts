import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { carryFinding } from '../carry'

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
})
