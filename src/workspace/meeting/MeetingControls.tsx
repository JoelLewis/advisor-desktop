import { useRef, useState } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { fmtEasternClock } from '@/kit/measure'
import { useDraftMeetingNotes, useFileMeetingRecord, useHoldMeeting, useRunMeetingPrep } from '@/hooks/use-meetings'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import type { MeetingView } from '@/types/workspace-meeting'
import { ADVISOR_RUNS_IT } from './meeting-words'
import { Unbroken } from '@/kit/unbroken/Unbroken'

type MeetingControlsProps = { meeting: MeetingView; canPrepare: boolean; onRecorded: (actId: string) => void; filingBlockedReason?: string }

/** What the advisor can do next with the meeting, by its state: prep and hold it, draft its notes, file its record. */
export function MeetingControls({ meeting, canPrepare, onRecorded, filingBlockedReason }: MeetingControlsProps) {
  if (!canPrepare) return <p className="text-body text-ink-2">{ADVISOR_RUNS_IT}</p>
  switch (meeting.state) {
    case 'scheduled': return <BeforeTheMeeting meeting={meeting} />
    case 'held': return <AfterTheMeeting meeting={meeting} onRecorded={onRecorded} filingBlockedReason={filingBlockedReason} />
    case 'filed': {
      if (meeting.filedActId === undefined) throw new Error(`Meeting ${meeting.eventId} is filed but names no filing act`)
      return <p className="text-body text-ink-2"><Unbroken text={`Filed · ${meeting.filedActId}`} /></p>
    }
  }
}

function BeforeTheMeeting({ meeting }: { meeting: MeetingView }) {
  const announce = useAnnounce()
  const prep = useRunMeetingPrep(meeting.eventId)
  const hold = useHoldMeeting(meeting.eventId)
  const [report, setReport] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  // Refs, not render state, so a second click in the same frame cannot start a second request.
  const prepping = useRef(false)
  const holding = useRef(false)
  const runPrep = () => {
    if (prepping.current) return
    prepping.current = true
    const before = meeting.agenda.length
    setReport(undefined)
    prep.mutate(undefined, {
      onSuccess: (view) => {
        const said = view.agenda.length > before ? 'Meeting Prep posted its findings and agenda v1.' : 'Meeting Prep has reported; the agenda is unchanged.'
        setReport(said)
        announce(said)
      },
      onSettled: () => { prepping.current = false },
    })
  }
  const confirmHold = () => {
    if (holding.current) return
    holding.current = true
    hold.mutate(undefined, { onSuccess: () => { setConfirming(false); announce('Meeting held.') }, onSettled: () => { holding.current = false } })
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <Button rank="secondary" pending={prep.isPending} onClick={runPrep}>Run prep</Button>
        <Button onClick={() => { hold.reset(); setConfirming(true) }}>Demo · hold the meeting</Button>
      </div>
      {report ? <p className="text-body text-ink-2">{report}</p> : null}
      {prep.isError ? <p role="alert" className="text-body">{prep.error.message}</p> : null}
      <Dialog open={confirming} onOpenChange={(open) => { if (!open && !hold.isPending) setConfirming(false) }} title="Hold the meeting?"
        description={`A demo step: the session clock moves to the end of the meeting, ${fmtEasternClock(meeting.end)}, and the transcript arrives. Prep and the agenda close.`}>
        <div className="flex flex-col gap-4">
          {hold.isError ? <p role="alert" className="text-body">{hold.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" pending={hold.isPending} onClick={() => setConfirming(false)}>Cancel</Button>
            <Button pending={hold.isPending} onClick={confirmHold}>Hold the meeting</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function AfterTheMeeting({ meeting, onRecorded, filingBlockedReason }: { meeting: MeetingView; onRecorded: (actId: string) => void; filingBlockedReason?: string }) {
  const announce = useAnnounce()
  const draft = useDraftMeetingNotes(meeting.eventId)
  const file = useFileMeetingRecord(meeting.eventId)
  const [report, setReport] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const drafting = useRef(false)
  const askForNotes = () => {
    if (drafting.current) return
    drafting.current = true
    draft.mutate(undefined, {
      onSuccess: () => {
        const said = 'Meeting Notes drafted the notes; edit them beside the transcript in the meeting view.'
        setReport(said)
        announce(said)
      },
      onSettled: () => { drafting.current = false },
    })
  }
  const fingerprint = meeting.notesFingerprint
  return (
    <div className="flex flex-col items-start gap-3">
      {fingerprint === undefined
        ? <Button pending={draft.isPending} onClick={askForNotes}>Draft notes</Button>
        : <Button onClick={() => { file.reset(); setConfirming(true) }}>File the record</Button>}
      {report ? <p className="text-body text-ink-2">{report}</p> : null}
      {draft.isError ? <p role="alert" className="text-body">{draft.error.message}</p> : null}
      {fingerprint !== undefined ? (
        <ConfirmRecord open={confirming} onClose={() => setConfirming(false)} mutation={file} variables={fingerprint} onRecorded={onRecorded}
          title={`File the record of the ${meeting.title}?`}
          description="Filing records the notes as they stand, with their fingerprint, and creates the follow-up tasks. A filed record cannot be changed."
          blockedReason={filingBlockedReason} />
      ) : null}
    </div>
  )
}
