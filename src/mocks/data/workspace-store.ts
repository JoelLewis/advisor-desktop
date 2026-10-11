import type { BindingAct, Draft, Message, Thread } from '@/types/workspace'
import { eventTime } from '@/lib/clock'
import { SEED_MESSAGES, SEED_THREADS } from './workspace-seed'

export type WorkspaceState = { threads: Thread[]; messages: Message[]; acts: BindingAct[]; drafts: Draft[]; sequence: number; counters: Record<'msg' | 'draft' | 'act', number> }

function seed(): WorkspaceState {
  return {
    threads: SEED_THREADS.map((t) => ({ ...t, memberIds: [...t.memberIds], agentIds: [...t.agentIds] })),
    messages: SEED_MESSAGES.map((m) => ({ ...m })),
    acts: [],
    drafts: [],
    sequence: 0,
    counters: { msg: 0, draft: 0, act: 0 },
  }
}

let state = seed()

export function store(): WorkspaceState {
  return state
}

export function resetWorkspaceStore(): void {
  state = seed()
}

export function nextAt(): string {
  state.sequence += 1
  return eventTime(state.sequence)
}

export function nextId(prefix: 'msg' | 'draft'): string {
  state.counters[prefix] += 1
  return `${prefix}-${String(state.counters[prefix]).padStart(4, '0')}`
}

export function nextActId(): string {
  return `REC-${String(state.counters.act + 1).padStart(4, '0')}`
}

export function commitActId(): string {
  state.counters.act += 1
  return `REC-${String(state.counters.act).padStart(4, '0')}`
}
