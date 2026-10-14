import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Select } from '@/kit/select/Select'
import { TextInput } from '@/kit/text-input/TextInput'
import { UNIT, fmtMoney, fmtQuantity } from '@/kit/measure'
import { useResolveBreak } from '@/hooks/use-reference'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { BREAK_RESOLUTIONS, RESOLUTION_WORDS, isBreakResolution, type BreakResolution, type ReconBreakView } from '@/types/reference-reconciliation'

const reading = (b: ReconBreakView, v: number) => (b.unit === 'USD' ? `${fmtMoney(v)} ${UNIT.usd}` : b.unit === 'sh' ? `${fmtQuantity(v)} ${UNIT.shares}` : fmtQuantity(v))

/** Resolve: the advisor or client service closes a break as a binding act, against the figures on screen, with a rationale. */
export function ResolveBreak({ brk, onRecorded }: { brk: ReconBreakView; onRecorded: (actId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [resolution, setResolution] = useState<BreakResolution>('timing_difference')
  const [rationale, setRationale] = useState('')
  const resolve = useResolveBreak()
  const pick = (value: string) => {
    if (!isBreakResolution(value)) throw new Error(`${value} is not a resolution`)
    setResolution(value)
  }
  return (
    <>
      <Button rank="secondary" aria-label={`Resolve ${brk.id}`} onClick={() => setOpen(true)}>Resolve</Button>
      <ConfirmRecord open={open} onClose={() => setOpen(false)} title={`Resolve ${brk.id}?`}
        description={`${brk.accountName} · ${brk.fieldLabel}: the book ${reading(brk, brk.book)} against ${brk.custodian} ${reading(brk, brk.custodianValue)}. Recorded as a binding act in the Archive.`}
        mutation={resolve} variables={{ breakId: brk.id, fingerprint: brk.fingerprint, resolution, rationale }} onRecorded={onRecorded}
        blockedReason={rationale.trim() === '' ? 'Write the rationale first.' : undefined}>
        <Select label="Resolution" layout="stacked" value={resolution} onChange={pick} options={BREAK_RESOLUTIONS.map((r) => ({ value: r, label: RESOLUTION_WORDS[r] }))} />
        <TextInput label="Rationale" value={rationale} onChange={setRationale} />
      </ConfirmRecord>
    </>
  )
}
