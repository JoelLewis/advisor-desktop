import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { useActAsProspect, usePartySteps } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import { addressNameOf } from '@/lib/words'
import type { PartySteps, ProspectStepName, ProspectView } from '@/types/workspace-prospect'

type Props = { view: ProspectView; onRecorded: (actId: string) => void }

const label = (step: ProspectStepName, steps: PartySteps) =>
  step === 'questionnaire' ? 'Answer her questionnaire' : step === 'statements' ? 'Share her statements' : `Accept v${steps.sentVersion ?? '?'}`

/** The one-presenter demo: her scripted step, recorded as her with the shortcut marked. Shown only to the presenter. */
export function ActAsProspect({ view, onRecorded }: Props) {
  const steps = usePartySteps(view.id)
  const shortcut = useActAsProspect(view.id)
  const [confirming, setConfirming] = useState<ProspectStepName>()
  const busy = useRef(false)
  const noteId = useId()
  if (!steps.data) return null
  const s = steps.data
  const open: ProspectStepName[] = [
    ...(s.questionnaire === 'open' ? ['questionnaire' as const] : []), ...(s.statements === 'open' ? ['statements' as const] : []),
    ...(s.acceptance === 'open' ? ['accept' as const] : []),
  ]
  if (open.length === 0) return null
  const name = addressNameOf(view.name)
  const confirm = () => {
    if (!confirming || busy.current) return
    busy.current = true
    shortcut.mutate(confirming, {
      onSuccess: (outcome) => { setConfirming(undefined); if (outcome.act) onRecorded(outcome.act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <ContextSection title={`Demo · act as ${name}`}>
      <p id={noteId} className="text-label text-ink-3">{`Presenter shortcut: records ${name}'s scripted step as her, marked as made through this shortcut.`}</p>
      <div className="flex flex-wrap gap-2">
        {open.map((step) => (
          <Button key={step} rank="secondary" aria-describedby={noteId} onClick={() => { shortcut.reset(); setConfirming(step) }}>{label(step, s)}</Button>
        ))}
      </div>
      <Dialog open={confirming !== undefined} onOpenChange={(next) => { if (!next && !shortcut.isPending) setConfirming(undefined) }}
        title={confirming ? `${label(confirming, s)} as ${name}?` : ''} description={`Recorded as ${view.name}, with the presenter shortcut noted.`}>
        <div className="flex flex-col gap-4">
          {shortcut.isError ? <p role="alert" className="text-body">{shortcut.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={shortcut.isPending} onClick={() => setConfirming(undefined)}>Cancel</Button>
            <Button disabled={shortcut.isPending} onClick={confirm}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </ContextSection>
  )
}
