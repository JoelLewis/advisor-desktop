import type { BindingAct, Draft, Message, Thread } from '@/types/workspace'
import type { ApprovalRecord, Proposal, StagedOrder } from '@/types/workspace-proposal'
import { eventTime } from '@/lib/clock'
import { briefMessages } from '@/mocks/workspace/brief'
import { resetLedger } from './portfolio-ledger'
import { SEED_LAST_SEQUENCE, SEED_MESSAGES, SEED_THREADS } from './workspace-seed'

type Counter = 'msg' | 'draft' | 'act' | 'proposal' | 'staged'

export type WorkspaceState = {
  threads: Thread[]
  messages: Message[]
  acts: BindingAct[]
  drafts: Draft[]
  proposals: Proposal[]
  approvals: ApprovalRecord[]
  staged: StagedOrder[]
  sequence: number
  counters: Record<Counter, number>
}

function seed(): WorkspaceState {
  return {
    threads: SEED_THREADS.map((t) => ({ ...t, memberIds: [...t.memberIds], agentIds: [...t.agentIds] })),
    messages: [...briefMessages(), ...SEED_MESSAGES.map((m) => ({ ...m }))],
    acts: [],
    drafts: [],
    proposals: [],
    approvals: [],
    staged: [],
    sequence: SEED_LAST_SEQUENCE,
    counters: { msg: 0, draft: 0, act: 0, proposal: 0, staged: 0 },
  }
}

// Seeded on first use, not at import: the seed reads the engine (the Brief), and the
// engine must finish loading before anything runs it.
let state: WorkspaceState | undefined

export function store(): WorkspaceState {
  state ??= seed()
  return state
}

export function resetWorkspaceStore(): void {
  state = undefined
  resetLedger()
}

export function nextAt(): string {
  const s = store()
  s.sequence += 1
  return eventTime(s.sequence)
}

/** Allocates the next number on `counter`. */
export function nextNumber(counter: Counter): number {
  const s = store()
  s.counters[counter] += 1
  return s.counters[counter]
}

const pad = (n: number) => String(n).padStart(4, '0')

export function nextId(prefix: 'msg' | 'draft'): string {
  return `${prefix}-${pad(nextNumber(prefix))}`
}

export function commitActId(): string {
  return `REC-${pad(nextNumber('act'))}`
}

/** Moves the event clock forward to `sequence` (fills wait for the open); it never runs backwards. */
export function advanceClockTo(sequence: number): void {
  const s = store()
  s.sequence = Math.max(s.sequence, sequence)
}
