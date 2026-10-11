import type { Message, Thread } from '@/types/workspace'
import { eventTime } from '@/lib/clock'

export const SEED_THREADS: readonly Thread[] = [
  { id: 'th-brief', title: 'Brief', visibility: 'private', ownerId: 'user-001', memberIds: ['user-001'], agentIds: ['drift-monitor'],
    subject: { type: 'account', id: 'acc-002' } },
  { id: 'th-johnson-review', title: 'Johnson Rebalance Review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: ['drift-monitor', 'pretrade-check'], subject: { type: 'account', id: 'acc-002' } },
  { id: 'th-robert', title: 'Robert Johnson', visibility: 'client', clientId: 'cli-001', memberIds: ['cli-001', 'user-001', 'user-002'],
    agentIds: [], subject: { type: 'client', id: 'cli-001' } },
]

/**
 * Seed messages take the first event-clock sequences, in conversation order, so they read after the
 * calculations' as-of (the frozen now) and before anything recorded in the session.
 */
export const SEED_MESSAGES: readonly Message[] = [
  { kind: 'text', id: 'msg-s04', threadId: 'th-robert', authorId: 'cli-001', at: eventTime(1),
    body: 'When is my annual review this year?' },
  { kind: 'text', id: 'msg-s01', threadId: 'th-johnson-review', authorId: 'user-002', at: eventTime(2),
    body: 'Robert asked when his annual review is this year.' },
  { kind: 'embed', id: 'msg-s02', threadId: 'th-johnson-review', authorId: 'user-001', at: eventTime(3),
    embed: 'drift', subject: { type: 'account', id: 'acc-002' } },
  { kind: 'text', id: 'msg-s03', threadId: 'th-johnson-review', authorId: 'user-001', at: eventTime(4),
    body: 'Mike, can you look at the tax side before we build anything?' },
]

/** The last event-clock sequence the seed uses; the session's own events follow it. */
export const SEED_LAST_SEQUENCE = 4
