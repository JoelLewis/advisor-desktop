import { useId, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Select } from '@/kit/select/Select'
import { TextInput } from '@/kit/text-input/TextInput'
import { useRecordComplianceAct } from '@/hooks/use-workspace'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory } from '@/types/workspace'
import type { SupervisionItem } from '@/types/workspace-supervision'
import { dispositionOptions } from './disposition-options'

type DispositionPanelProps = {
  item: SupervisionItem
  open: boolean
  directory: Directory
  onRecorded: (actId: string) => void
  /** A refusal outlives this panel: the item may leave the queue when the page refreshes. */
  onRefused: (message: string) => void
}

export function DispositionPanel({ item, open, directory, onRecorded, onRefused }: DispositionPanelProps) {
  const { viewerId } = useViewer()
  const record = useRecordComplianceAct()
  const options = dispositionOptions(item, open)
  const [choice, setChoice] = useState(options[0]?.value ?? '')
  const [rationale, setRationale] = useState('')
  const [confirming, setConfirming] = useState(false)
  const titleId = useId()
  const reasonId = useId()
  const option = options.find((o) => o.value === choice) ?? options[0]
  if (!option) return null
  const heading = <h3 id={titleId} className="text-label uppercase text-ink">Record a disposition</h3>
  if (!(directory.permissions[viewerId] ?? []).includes(option.act)) {
    return (
      <section aria-labelledby={titleId} className="flex flex-col gap-2 border border-rule-2 p-4">
        {heading}
        <p className="text-body text-ink-2">Only compliance records a disposition.</p>
      </section>
    )
  }
  const blank = rationale.trim().length === 0
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 border border-ink p-4">
      {heading}
      <Select label="Disposition" layout="stacked" value={option.value} options={options.map(({ value, label }) => ({ value, label }))} onChange={setChoice} />
      <TextInput label="Rationale (required)" value={rationale} rows={4} onChange={setRationale} describedBy={blank ? reasonId : undefined} />
      <div className="flex flex-col items-start gap-2">
        <Button disabled={blank || record.isPending} aria-describedby={blank ? reasonId : undefined}
          onClick={() => { record.reset(); setConfirming(true) }}>
          Record disposition
        </Button>
        {blank ? <p id={reasonId} className="text-body text-ink-2">Write a rationale to record the disposition.</p> : null}
        <p className="text-label text-ink-3">Recorded as a binding act in your name, with this rationale.</p>
      </div>
      <ConfirmRecord open={confirming} onClose={() => setConfirming(false)} mutation={record} variables={option.request(rationale.trim())}
        title={`${option.label}?`} description={option.consequence}
        onRecorded={(actId) => { setRationale(''); onRecorded(actId) }} onRefused={onRefused}>
        <blockquote className="whitespace-pre-line border-l-2 border-rule-2 pl-4 text-copy">{rationale.trim()}</blockquote>
      </ConfirmRecord>
    </section>
  )
}
