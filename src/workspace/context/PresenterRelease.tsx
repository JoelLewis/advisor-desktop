import { useId, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useActAsCco } from '@/hooks/use-workspace'
import type { Directory } from '@/types/workspace'
import { ConfirmRecord } from './ConfirmRecord'

type PresenterReleaseProps = { proposalId: string; version: number; directory: Directory; onRecorded: (actId: string) => void }

/**
 * The one-presenter demo's shortcut: compliance's default release of these orders, recorded as the
 * compliance officer with the record noting the shortcut. A record, so it confirms first.
 */
export function PresenterRelease({ proposalId, version, directory, onRecorded }: PresenterReleaseProps) {
  const shortcut = useActAsCco()
  const [open, setOpen] = useState(false)
  const noteId = useId()
  const cco = directory.people.find((p) => p.role === 'compliance')
  if (!cco) return null
  return (
    <div className="flex flex-col items-start gap-2 border-t border-dashed border-rule-2 pt-3">
      <Button rank="secondary" aria-describedby={noteId} onClick={() => { shortcut.reset(); setOpen(true) }}>
        {`Demo · act as ${cco.name}`}
      </Button>
      <p id={noteId} className="text-label text-ink-3">
        {`Presenter shortcut: records ${cco.name}'s release with the default compliance rationale, marked as made through this shortcut.`}
      </p>
      <ConfirmRecord open={open} onClose={() => setOpen(false)} mutation={shortcut} variables={{ kind: 'orders', id: proposalId }} onRecorded={onRecorded}
        title={`Release v${version} as ${cco.name}?`} description={`The record names ${cco.name} as the actor and notes the presenter shortcut.`} />
    </div>
  )
}
