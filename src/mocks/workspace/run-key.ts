import type { AgentId, Subject } from '@/types/workspace'
import { MOCK_NOW_ISO } from '@/lib/clock'

/** One agent run: the same agent, thread, subject and as-of always find the same thing. */
export const runKeyOf = (agentId: AgentId, threadId: string, subject: Subject): string =>
  `${agentId}|${threadId}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}`
