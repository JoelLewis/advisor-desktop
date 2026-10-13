import type { Message } from '@/types/workspace'

/** A finding the agenda can carry: posted in the meeting thread by an agent, or carried into it from the Brief. */
export type AgendaFinding = { messageId: string; claim: string }

export function agendaFindings(messages: readonly Message[]): AgendaFinding[] {
  return messages.flatMap((m) => (m.kind === 'agent_finding' ? [{ messageId: m.id, claim: m.claim }]
    : m.kind === 'carried' ? [{ messageId: m.id, claim: m.finding.claim }]
    : []))
}
