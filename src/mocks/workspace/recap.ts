import type { Draft } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { writeMeetingRecap, type RecordSentence } from '@/mocks/agents/meeting-recap'
import { openWashSaleWindowsFor } from '@/mocks/handlers/tax-return'
import { todayISO } from '@/lib/clock'
import { firstNameOf } from '@/lib/words'
import { draftingClientThread, type LetterFailure } from './letters'
import { isRecapStale } from './draft-staleness'
import { meetingEvent, meetingTitle, visibleMeeting } from './meetings'

const refuse = (status: LetterFailure['status'], code: string, message: string): LetterFailure => ({ ok: false, status, code, message })

/** The filed line that records the decision not to buy Intel back; the recap states its window beneath it. */
const INTEL_DECISION_LINE_ID = 'n-08'

/** The latest end among the household's open INTC windows, from the engine; the notes themselves carry no date. */
function intelWindowSentence(householdId: string): RecordSentence[] {
  const ends = accounts.filter((a) => a.householdId === householdId)
    .flatMap((a) => openWashSaleWindowsFor(a, todayISO()))
    .filter((w) => w.symbol === 'INTC')
    .map((w) => w.end)
  const latest = [...ends].sort().pop()
  return latest === undefined ? [] : [{ afterLineId: INTEL_DECISION_LINE_ID, text: `The Intel window runs through ${latest}.` }]
}

/** The Client Letter Agent's recap of a filed meeting, drafted in the client thread of a member of the meeting's household. */
export function draftRecap(viewerId: string, clientThreadId: string, eventId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (thread.visibility !== 'client' || thread.clientId === undefined) return refuse(400, 'NOT_CLIENT_THREAD', 'A recap is drafted in a client thread.')
  const meeting = visibleMeeting(viewerId, eventId)
  const event = meeting && meetingEvent(meeting.eventId)
  if (!meeting || !event) return refuse(404, 'NO_MEETING', 'Meeting not found.')
  const client = clients.find((c) => c.id === thread.clientId)
  if (!client || client.householdId !== meeting.householdId) return refuse(400, 'NOT_THIS_CLIENT', "That meeting is not with this thread's client.")
  if (!meeting.filed) return refuse(409, 'NOT_FILED', `File the record of the ${meetingTitle(meeting)} before asking for its recap.`)

  const recordBasis = { eventId: meeting.eventId, actId: meeting.filed.actId, fingerprint: meeting.filed.fingerprint }
  const s = store()
  const existing = s.drafts.find((d) => d.clientThreadId === thread.id && d.agentId === 'client-letter'
    && d.recordBasis?.actId === recordBasis.actId && !isRecapStale(d))
  if (existing) return { ok: true, draft: existing, created: false }
  const filedBy = s.acts.find((a) => a.id === recordBasis.actId)?.actorId
  const signer = filedBy === undefined ? undefined : personById(filedBy)
  if (!signer) throw new Error(`The filing ${recordBasis.actId} names no recorded actor`)
  const withOthers = event.attendees.some((a) => a.id !== client.id && clients.some((c) => c.id === a.id))
  const letter = writeMeetingRecap({
    greetingName: firstNameOf(client.fullName), withOthers, filing: meeting.filed, signerName: signer.name,
    recordSentences: intelWindowSentence(meeting.householdId),
  })
  const draft: Draft = {
    id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body: letter.body, createdAt: nextAt(),
    agentId: 'client-letter', recordBasis, figures: letter.figures,
  }
  s.drafts.push(draft)
  return { ok: true, draft, created: true }
}
