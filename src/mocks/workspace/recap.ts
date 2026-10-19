import type { Draft } from '@/types/workspace'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { writeMeetingRecap } from '@/mocks/agents/meeting-recap'
import { firstNameOf } from '@/lib/words'
import { draftingClientThread, type LetterFailure } from './letters'
import { isRecapStale, latestIntelWindowEnd } from './draft-staleness'
import { clientDate } from '@/kit/measure'
import { meetingEvent, meetingTitle, visibleMeeting } from './meetings'

const refuse = (status: LetterFailure['status'], code: string, message: string): LetterFailure => ({ ok: false, status, code, message })

/** The Intel instruction, in the client's words: no purchase through the last day of the latest open Intel window (the house rule writes windows "through <date>"). */
const intelWindowSentence = (end: string) => `Please don't buy Intel shares in any of your accounts through ${clientDate(end)}.`

/** The Client Letter Agent's recap of a filed meeting, drafted in the client thread of a member of the meeting's household. */
export function draftRecap(viewerId: string, clientThreadId: string, eventId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (thread.visibility !== 'client' || thread.partyId === undefined) return refuse(400, 'NOT_CLIENT_THREAD', 'A recap is drafted in a client thread.')
  const meeting = visibleMeeting(viewerId, eventId)
  const event = meeting && meetingEvent(meeting.eventId)
  if (!meeting || !event) return refuse(404, 'NO_MEETING', 'Meeting not found.')
  const client = clients.find((c) => c.id === thread.partyId)
  if (!client || client.householdId !== meeting.householdId) return refuse(400, 'NOT_THIS_CLIENT', "That meeting is not with this thread's client.")
  if (!meeting.filed) return refuse(409, 'NOT_FILED', `File the record of the ${meetingTitle(meeting)} before asking for its recap.`)

  const windowEnd = latestIntelWindowEnd(client.id)
  const recordBasis = { eventId: meeting.eventId, actId: meeting.filed.actId, fingerprint: meeting.filed.fingerprint, ...(windowEnd ? { windowEnd } : {}) }
  const s = store()
  const existing = s.drafts.find((d) => d.clientThreadId === thread.id && d.agentId === 'client-letter'
    && d.recordBasis?.actId === recordBasis.actId && !isRecapStale(d))
  if (existing) return { ok: true, draft: existing, created: false }
  const filedBy = s.acts.find((a) => a.id === recordBasis.actId)?.actorId
  const signer = filedBy === undefined ? undefined : personById(filedBy)
  if (!signer) throw new Error(`The filing ${recordBasis.actId} names no recorded actor`)
  const attending = [client, ...clients.filter((c) => c.id !== client.id && c.householdId === meeting.householdId && event.attendees.some((a) => a.id === c.id))]
  const copies = attending.slice(1).flatMap((c) => {
    const own = s.threads.find((t) => t.visibility === 'client' && t.partyId === c.id)
    return own ? [{ threadId: own.id, partyName: c.fullName }] : []
  })
  const letter = writeMeetingRecap({
    addresseeId: client.id, greetingNames: attending.map((c) => firstNameOf(c.fullName)), filing: meeting.filed, signerName: signer.name,
    windowSentence: windowEnd === undefined ? undefined : intelWindowSentence(windowEnd),
  })
  const draft: Draft = {
    id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body: letter.body, createdAt: nextAt(),
    agentId: 'client-letter', recordBasis, figures: letter.figures,
    ...(copies.length > 0 ? { copies } : {}),
  }
  s.drafts.push(draft)
  return { ok: true, draft, created: true }
}
