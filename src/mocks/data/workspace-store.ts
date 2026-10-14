import type { SupervisionRecord } from '@/types/compliance'
import type { Meeting } from '@/types/workspace-meeting'
import type { ProspectProposal, ProspectRecord } from '@/types/workspace-prospect'
import type { BindingAct, Draft, Message, Thread } from '@/types/workspace'
import type { ApprovalRecord, Proposal, StagedOrder } from '@/types/workspace-proposal'
import { eventTime } from '@/lib/clock'
import { briefMessages } from '@/mocks/workspace/brief'
import { bookVersion, resetLedger } from './portfolio-ledger'
import { SEED_PROSPECTS } from './prospect-seed'
import { SEED_LAST_SEQUENCE, SEED_MEETINGS, SEED_MESSAGES, SEED_THREADS } from './workspace-seed'

type Counter = 'msg' | 'draft' | 'act' | 'proposal' | 'staged' | 'record' | 'agenda' | 'task' | 'note' | 'pproposal' | 'ptask' | 'thread'

export type WorkspaceState = {
  threads: Thread[]
  messages: Message[]
  acts: BindingAct[]
  drafts: Draft[]
  proposals: Proposal[]
  approvals: ApprovalRecord[]
  staged: StagedOrder[]
  supervisionRecords: SupervisionRecord[]
  /** The session's meetings: each one's state machine, agenda versions, notes, filing and tasks. */
  meetings: Meeting[]
  /** The session's prospects: stage, disclosures, steps, statements, tasks, onboarding. */
  prospects: ProspectRecord[]
  prospectProposals: ProspectProposal[]
  /** The book version the Brief's findings measured. */
  briefBook: number
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
    supervisionRecords: [],
    meetings: SEED_MEETINGS.map((m) => ({ ...m, agenda: [], tasks: [] })),
    prospects: SEED_PROSPECTS.map((p) => ({ ...p, stageHistory: [...p.stageHistory], statements: [], disclosures: [], steps: [], tasks: [] })),
    prospectProposals: [],
    briefBook: bookVersion(),
    sequence: SEED_LAST_SEQUENCE,
    counters: { msg: 0, draft: 0, act: 0, proposal: 0, staged: 0, record: 0, agenda: 0, task: 0, note: 0, pproposal: 0, ptask: 0, thread: 0 },
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

export const pad = (n: number) => String(n).padStart(4, '0')

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

/** The session clock's present: the time of the latest recorded event (the frozen now plus the sequence). */
export function sessionNow(): string {
  return eventTime(store().sequence)
}
