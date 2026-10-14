import { useId, useRef, useState } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { useDraftRecap, useMeetings } from '@/hooks/use-meetings'
import { useDrafts } from '@/hooks/use-workspace'
import type { Thread } from '@/types/workspace'
import type { MeetingSummary } from '@/types/workspace-meeting'
import { Unbroken } from '@/kit/unbroken/Unbroken'

type Asked = { draftId: string; title: string; created: boolean }

const recapReport = (asked: Asked) => asked.created
  ? `The Client Letter Agent drafted the recap of the ${asked.title}.`
  : `The Client Letter Agent's recap of the ${asked.title} is already in the drafts.`

/** Asks the Client Letter Agent for the recap of a meeting with this thread's client, once its record is filed. */
export function RecapControl({ thread }: { thread: Thread }) {
  const announce = useAnnounce()
  const meetings = useMeetings()
  const recap = useDraftRecap(thread.id)
  const drafts = useDrafts(thread.id, true)
  const [asked, setAsked] = useState<Asked>()
  // A ref, not render state, so a double-click cannot send a second request before the first settles.
  const asking = useRef(false)
  const reasonId = useId()
  if (meetings.isPending) return <p role="status" className="text-body text-ink-3">Loading the meetings…</p>
  if (meetings.isError) return <p role="alert" className="text-body">{meetings.error.message}</p>
  const withClient = meetings.data.filter((m) => m.clientId === thread.partyId)
  if (withClient.length === 0) return null
  const ask = (meeting: MeetingSummary) => {
    if (asking.current) return
    asking.current = true
    const held = new Set((drafts.data ?? []).map((d) => d.id))
    recap.mutate(meeting.eventId, {
      onSuccess: (draft) => {
        const next = { draftId: draft.id, title: meeting.title, created: asked?.draftId === draft.id ? asked.created : !held.has(draft.id) }
        setAsked(next)
        announce(recapReport(next))
      },
      onSettled: () => { asking.current = false },
    })
  }
  // The report stands only while the draft it names is still held: it clears once that draft is sent or replaced.
  const reported = asked && drafts.data?.some((d) => d.id === asked.draftId) ? asked : undefined
  return (
    <div className="flex flex-col items-start gap-2">
      {withClient.map((m) => (m.filedActId ? (
        <div key={m.eventId} className="flex flex-col items-start gap-1">
          <Button rank="secondary" disabled={recap.isPending} onClick={() => ask(m)}>Ask Client Letter Agent for the recap</Button>
          <span className="text-label text-ink-3"><Unbroken text={`From the filed record of the ${m.title} (${m.filedActId})`} /></span>
        </div>
      ) : (
        <div key={m.eventId} className="flex flex-col items-start gap-1">
          <Button rank="secondary" disabled aria-describedby={reasonId}>Ask Client Letter Agent for the recap</Button>
          <span id={reasonId} className="text-label text-ink-3">{`File the record of the ${m.title} first.`}</span>
        </div>
      )))}
      {recap.isError ? <p role="alert" className="text-body">{recap.error.message}</p> : null}
      {reported ? (
        <p className="text-body text-ink-2">{recapReport(reported)}</p>
      ) : null}
    </div>
  )
}
