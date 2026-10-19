import type { ConversationAudience, Thread } from '@/types/workspace'
import { clients } from '@/mocks/data/clients'
import { householdFixtures } from '@/mocks/data/households'
import { PEOPLE, can } from '@/mocks/data/people'
import { nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { isFirmViewer } from './visibility'

type ConversationFailure = { ok: false; status: 400 | 403 | 404; code: string; message: string }
const refuse = (status: ConversationFailure['status'], code: string, message: string): ConversationFailure => ({ ok: false, status, code, message })

const TITLE_MAX = 120
/** The people a team thread is for: everyone in the firm's advice team. Compliance supervises every firm thread without being a member. */
const TEAM_IDS: readonly string[] = PEOPLE.filter((p) => p.role === 'advisor' || p.role === 'csa' || p.role === 'analyst').map((p) => p.id)
const CLIENT_SERVICE_IDS: readonly string[] = PEOPLE.filter((p) => p.role === 'csa').map((p) => p.id)
const newThreadId = () => `th-new-${pad(nextNumber('thread'))}`

/**
 * A conversation started from a household. Just me and the team get a thread whose subject is the household. A
 * client has one conversation with the firm: asking for one with a member opens theirs, or makes it if they have none.
 */
export function startConversation(viewerId: string, input: { householdId: string; title: string; audience: ConversationAudience }): { ok: true; thread: Thread; created: boolean } | ConversationFailure {
  if (!isFirmViewer(viewerId)) return refuse(404, 'NO_HOUSEHOLD', 'Household not found.')
  const household = householdFixtures.find((h) => h.id === input.householdId)
  if (!household) return refuse(404, 'NO_HOUSEHOLD', 'Household not found.')
  const s = store()
  const { audience } = input
  if (audience.kind === 'client') {
    if (!household.members.some((m) => m.clientId === audience.clientId)) return refuse(400, 'NOT_A_MEMBER', `That client is not a member of the ${household.name}.`)
    if (!can(viewerId, 'draft_for_client')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor and client service write to a client.')
    const existing = s.threads.find((t) => t.visibility === 'client' && t.partyId === audience.clientId)
    if (existing) return { ok: true, thread: existing, created: false }
    const client = clients.find((c) => c.id === audience.clientId)
    if (!client) throw new Error(`Household ${household.id} names a member ${audience.clientId} the CRM does not know`)
    const thread: Thread = {
      id: newThreadId(), title: client.fullName, visibility: 'client', partyId: client.id,
      memberIds: [client.id, ...new Set([viewerId, ...CLIENT_SERVICE_IDS])], agentIds: [], subject: { type: 'client', id: client.id },
    }
    s.threads.push(thread)
    return { ok: true, thread, created: true }
  }
  if (!can(viewerId, 'post_firm')) return refuse(403, 'NOT_PERMITTED', 'Only the firm starts a conversation here.')
  const title = input.title.trim()
  if (title.length === 0) return refuse(400, 'TITLE_REQUIRED', 'Give the conversation a title.')
  if (title.length > TITLE_MAX) return refuse(400, 'TITLE_TOO_LONG', `A title is at most ${TITLE_MAX} characters.`)
  const subject = { type: 'household' as const, id: household.id }
  const thread: Thread = audience.kind === 'private'
    ? { id: newThreadId(), title, visibility: 'private', ownerId: viewerId, memberIds: [viewerId], agentIds: [], subject }
    : { id: newThreadId(), title, visibility: 'internal', memberIds: [...new Set([viewerId, ...TEAM_IDS])], agentIds: [], subject }
  s.threads.push(thread)
  return { ok: true, thread, created: true }
}
