import type { Message, Thread } from '@/types/workspace'
import type { Meeting } from '@/types/workspace-meeting'
import { eventTime } from '@/lib/clock'
import { PELL_ID, PELL_THREAD_ID, PELL_WORK_THREAD_ID } from './prospect-seed'
import { PELL_INTRO } from './prospect-script'

export const SEED_THREADS: readonly Thread[] = [
  { id: 'th-brief', title: 'Brief', visibility: 'private', ownerId: 'user-001', memberIds: ['user-001'], agentIds: ['drift-monitor', 'harvest-scanner'],
    subject: { type: 'account', id: 'acc-002' } },
  { id: 'th-johnson-review', title: 'Johnson Rebalance Review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: ['drift-monitor', 'pretrade-check', 'proposal'], subject: { type: 'account', id: 'acc-002' } },
  { id: 'th-johnson-meeting', title: 'Johnson annual review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: ['meeting-prep', 'meeting-notes'], subject: { type: 'household', id: 'hh-001' } },
  { id: 'th-robert', title: 'Robert Johnson', visibility: 'client', partyId: 'cli-001', memberIds: ['cli-001', 'user-001', 'user-002'],
    agentIds: [], subject: { type: 'client', id: 'cli-001' } },
  { id: PELL_THREAD_ID, title: 'Dr. Amanda Pell', visibility: 'client', partyId: PELL_ID, memberIds: [PELL_ID, 'user-001', 'user-002'],
    agentIds: [], subject: { type: 'prospect', id: PELL_ID } },
  { id: PELL_WORK_THREAD_ID, title: 'Pell · prospect work', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: ['prospect-profile', 'transfer-in', 'proposal'], subject: { type: 'prospect', id: PELL_ID } },
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
  { kind: 'text', id: 'msg-s06', threadId: 'th-johnson-meeting', authorId: 'user-002', at: eventTime(6),
    body: "Robert and Patricia confirmed this afternoon's annual review." },
  { kind: 'text', id: 'msg-s07', threadId: PELL_THREAD_ID, authorId: PELL_ID, at: eventTime(7), body: PELL_INTRO },
]

/**
 * The last event-clock sequence the seed reserves; 5 and 8 were the Brief's old meeting and referral lines and
 * stay unused, so the session's events keep their times.
 */
export const SEED_LAST_SEQUENCE = 8

export const MEETING_THREAD_ID = 'th-johnson-meeting'

/** The Johnson annual review, scheduled: no agenda, notes or tasks until the session makes them. */
export const SEED_MEETINGS: readonly Meeting[] = [
  { eventId: 'evt-010', householdId: 'hh-001', threadId: MEETING_THREAD_ID, state: 'scheduled', agenda: [], tasks: [] },
]
