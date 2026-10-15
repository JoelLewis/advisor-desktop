import { useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { Tag } from '@/kit/tag/Tag'
import { useHerStep, usePartySteps } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { ProspectStepName, StepState } from '@/types/workspace-prospect'

type Props = { prospectId: string; onRecorded: (actId: string) => void }

/** Her own next steps in her thread: answer the questionnaire, share her statements, accept the proposal sent to her. */
export function PartyStepsPanel({ prospectId, onRecorded }: Props) {
  const steps = usePartySteps(prospectId)
  const take = useHerStep(prospectId)
  const [accepting, setAccepting] = useState(false)
  const busy = useRef(false)
  if (steps.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading your steps…</p>
  if (steps.isError) return <p role="alert" className="py-5 text-body">{steps.error.message}</p>
  const s = steps.data
  const run = (step: ProspectStepName) => {
    if (busy.current) return
    busy.current = true
    take.mutate(step, {
      onSuccess: (outcome) => { setAccepting(false); if (outcome.act) onRecorded(outcome.act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <ContextSection title="Your steps">
      <ul className="flex flex-col gap-3">
        <StepLine label="Risk questionnaire" state={s.questionnaire} action="Answer the questionnaire" waiting="After your first meeting." pending={take.isPending} onRun={() => run('questionnaire')} />
        <StepLine label="Statements" state={s.statements} action="Share my statements" waiting="After your first meeting." pending={take.isPending} onRun={() => run('statements')} />
        <StepLine label="Proposal" state={s.acceptance} action="Accept the proposal" waiting="When a proposal is sent to you." pending={take.isPending} onRun={() => { take.reset(); setAccepting(true) }} />
      </ul>
      {take.isError && !accepting ? <p role="alert" className="text-body">{take.error.message}</p> : null}
      <Dialog open={accepting} onOpenChange={(open) => { if (!open && !take.isPending) setAccepting(false) }} title="Accept the proposal?"
        description="Your acceptance is recorded, and the firm opens your account paperwork.">
        <div className="flex flex-col gap-4">
          {take.isError ? <p role="alert" className="text-body">{take.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" pending={take.isPending} onClick={() => setAccepting(false)}>Cancel</Button>
            <Button pending={take.isPending} onClick={() => run('accept')}>Accept</Button>
          </div>
        </div>
      </Dialog>
    </ContextSection>
  )
}

type StepLineProps = { label: string; state: StepState; action: string; waiting: string; pending: boolean; onRun: () => void }

function StepLine({ label, state, action, waiting, pending, onRun }: StepLineProps) {
  return (
    <li className="flex flex-col items-start gap-1">
      <span className="text-body">{label}</span>
      {state === 'done' ? <Tag tone="solid">Done</Tag>
        : state === 'open' ? <Button rank="secondary" pending={pending} onClick={onRun}>{action}</Button>
        : <span className="text-label text-ink-3">{waiting}</span>}
    </li>
  )
}
