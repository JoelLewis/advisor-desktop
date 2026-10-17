import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Select } from '@/kit/select/Select'
import { TextInput } from '@/kit/text-input/TextInput'
import { UNIT, fmtMoney, fmtQuantity } from '@/kit/measure'
import { useResolveBreak } from '@/hooks/use-reference'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { BREAK_RESOLUTIONS, RESOLUTION_WORDS, isBreakResolution, type BreakResolution, type ReconBreakView } from '@/types/reference-reconciliation'

/** Never sent: the dialog is blocked until a resolution is chosen, so this only fills the variables' type. */
const UNCHOSEN = BREAK_RESOLUTIONS[0]

const reading = (b: ReconBreakView, v: number) => (b.unit === 'USD' ? `${fmtMoney(v)} ${UNIT.usd}` : b.unit === 'sh' ? `${fmtQuantity(v)} ${UNIT.shares}` : fmtQuantity(v))

/** Resolve: the advisor or client service closes a break as a record, against the figures on screen, with a rationale. */
export function ResolveBreak({ brk, onRecorded }: { brk: ReconBreakView; onRecorded: (actId: string) => void }) {
  const [open, setOpen] = useState(false)
  // A record's outcome is an explicit choice: the dialog opens with none selected.
  const [resolution, setResolution] = useState<BreakResolution>()
  const [rationale, setRationale] = useState('')
  const resolve = useResolveBreak()
  const pick = (value: string) => {
    if (value === '') return setResolution(undefined)
    if (!isBreakResolution(value)) throw new Error(`${value} is not a resolution`)
    setResolution(value)
  }
  const blockedReason = resolution === undefined ? 'Choose a resolution first.' : rationale.trim() === '' ? 'Write the rationale first.' : undefined
  return (
    <>
      <Button rank="secondary" aria-label={`Resolve ${brk.id}`} onClick={() => setOpen(true)}>Resolve</Button>
      <ConfirmRecord open={open} onClose={() => setOpen(false)} title={`Resolve ${brk.id}?`}
        description={`${brk.accountName} · ${brk.fieldLabel}: the book ${reading(brk, brk.book)} against ${brk.custodian} ${reading(brk, brk.custodianValue)}. Recorded in the Archive.`}
        mutation={resolve} variables={{ breakId: brk.id, fingerprint: brk.fingerprint, resolution: resolution ?? UNCHOSEN, rationale }} onRecorded={onRecorded}
        blockedReason={blockedReason}>
        <Select label="Resolution" layout="stacked" value={resolution ?? ''} onChange={pick}
          options={[{ value: '', label: 'Choose a resolution' }, ...BREAK_RESOLUTIONS.map((r) => ({ value: r, label: RESOLUTION_WORDS[r] }))]} />
        <TextInput label="Rationale" value={rationale} onChange={setRationale} />
      </ConfirmRecord>
    </>
  )
}
