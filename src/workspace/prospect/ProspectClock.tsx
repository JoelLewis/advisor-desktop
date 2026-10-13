import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { TextInput } from '@/kit/text-input/TextInput'
import { fmtEasternDayTime } from '@/kit/measure'
import { useAdvanceProspect, useRecordCoffee } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { ProspectView } from '@/types/workspace-prospect'
import { COFFEE_NOTE_DRAFT } from './prospect-words'

type Props = { view: ProspectView; canRecordCoffee: boolean; presents: boolean }

/** The story's clock: the coffee (its note moves the clock to the coffee's end) and the presenter's labelled jumps. Never backwards. */
export function ProspectClock({ view, canRecordCoffee, presents }: Props) {
  const coffee = useRecordCoffee(view.id)
  const advance = useAdvanceProspect(view.id)
  const [writing, setWriting] = useState(false)
  const [note, setNote] = useState(COFFEE_NOTE_DRAFT)
  // A ref, not render state, so a second click in the same frame cannot record twice or jump twice.
  const busy = useRef(false)
  const reasonId = useId()
  const jump = presents ? view.nextJump : undefined
  if (!canRecordCoffee && !jump && !view.coffee) return null

  const once = (run: (settled: () => void) => void) => {
    if (busy.current) return
    busy.current = true
    run(() => { busy.current = false })
  }
  const record = () => once((settled) => coffee.mutate(note, { onSuccess: () => setWriting(false), onSettled: settled }))
  const go = (to: 'reply' | 'acceptance') => once((settled) => advance.mutate(to, { onSettled: settled }))

  return (
    <ContextSection title="Clock">
      {view.coffee ? <p className="text-body text-ink-2">Coffee recorded · the note is in the prospect work thread.</p>
        : canRecordCoffee ? <Button rank="secondary" className="self-start" onClick={() => { coffee.reset(); setWriting(true) }}>Record the coffee</Button>
        : null}
      <Dialog open={writing} onOpenChange={(open) => { if (!open && !coffee.isPending) setWriting(false) }} title="Record the coffee"
        description="The note is filed in her internal thread, and the clock moves to the end of the coffee.">
        <div className="flex flex-col gap-4">
          <TextInput label="Note" value={note} onChange={setNote} rows={6} />
          {coffee.isError ? <p role="alert" className="text-body">{coffee.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={coffee.isPending} onClick={() => setWriting(false)}>Cancel</Button>
            <Button disabled={coffee.isPending || note.trim().length === 0} onClick={record}>Record</Button>
          </div>
        </div>
      </Dialog>
      {jump ? (
        <div className="flex flex-col items-start gap-1.5">
          <Button rank="secondary" disabled={advance.isPending || jump.blockedReason !== undefined} aria-describedby={jump.blockedReason ? reasonId : undefined} onClick={() => go(jump.to)}>
            <span>{`Advance to her ${jump.to} · `}<span className="whitespace-nowrap">{fmtEasternDayTime(jump.at)}</span></span>
          </Button>
          {jump.blockedReason ? <p id={reasonId} className="text-label text-ink-3">{jump.blockedReason}</p> : null}
        </div>
      ) : null}
      {advance.isError ? <p role="alert" className="text-body">{advance.error.message}</p> : null}
    </ContextSection>
  )
}
