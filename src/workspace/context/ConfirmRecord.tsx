import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'

type RecordedAct = { id: string; summary: string }
type ActMutation<Variables> = {
  mutate: (variables: Variables, callbacks: { onSuccess: (act: RecordedAct) => void; onError: (error: Error) => void; onSettled: () => void }) => void
  reset: () => void
  isPending: boolean
  isError: boolean
  error: Error | null
}
type ConfirmRecordProps<Variables> = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  mutation: ActMutation<Variables>
  variables: Variables
  onRecorded: (actId: string) => void
  /** Extra dialog content, e.g. a rationale field, shown above the buttons. */
  children?: ReactNode
  /** Why Confirm is unavailable right now; shown in the dialog and set as its description. */
  blockedReason?: string
  /**
   * The page shows a refusal from the mutation it owns, since it outlives the dialog (the item may
   * leave the queue): a refused act closes the dialog. Otherwise the dialog shows the refusal.
   */
  refusalShownByPage?: boolean
}

/**
 * The confirm step every binding act takes: a busy ref against double submission, a kit Dialog, and
 * focus handed to the new record slip (not back to the opener) once the act is recorded.
 */
export function ConfirmRecord<Variables>({ open, onClose, title, description, mutation, variables, onRecorded, children, blockedReason, refusalShownByPage = false }: ConfirmRecordProps<Variables>) {
  const announce = useAnnounce()
  const [slipTakesFocus, setSlipTakesFocus] = useState(false)
  // A ref, not render state, so a second click in the same frame cannot record a second act.
  const busy = useRef(false)
  const blockedId = useId()
  useEffect(() => { if (open) setSlipTakesFocus(false) }, [open])
  // An act in flight is not cancelable: closing would reset the mutation and drop the callbacks that release the busy ref.
  const close = () => {
    if (mutation.isPending) return
    mutation.reset()
    onClose()
  }
  const confirm = () => {
    if (busy.current) return
    busy.current = true
    mutation.mutate(variables, {
      onSuccess: (act) => { setSlipTakesFocus(true); announce(`${act.summary} · ${act.id}`); onClose(); onRecorded(act.id) },
      onError: () => { if (refusalShownByPage) onClose() },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close() }} returnFocus={!slipTakesFocus} title={title} description={description}>
      <div className="flex flex-col gap-4">
        {children}
        {blockedReason ? <p id={blockedId} className="text-body text-ink-2">{blockedReason}</p> : null}
        {!refusalShownByPage && mutation.isError && mutation.error ? <p role="alert" className="text-body">{mutation.error.message}</p> : null}
        <div className="flex justify-end gap-3">
          <Button rank="secondary" disabled={mutation.isPending} onClick={close}>Cancel</Button>
          <Button disabled={mutation.isPending || blockedReason !== undefined} aria-describedby={blockedReason ? blockedId : undefined} onClick={confirm}>Confirm</Button>
        </div>
      </div>
    </Dialog>
  )
}
