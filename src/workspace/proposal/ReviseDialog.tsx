import { useState, type FormEvent } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { Dialog } from '@/kit/dialog/Dialog'
import { NumberInput } from '@/kit/number-input/NumberInput'
import { Select } from '@/kit/select/Select'
import { usePositions } from '@/hooks/use-portfolio'
import { useReviseProposal } from '@/hooks/use-workspace'
import { ApiClientError } from '@/services/api-client'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { AssetClass, Position } from '@/types/portfolio'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { constraintsFromForm, formFromConstraints, type ConstraintForm } from './constraint-form'
import { latestVersionOf } from './latest-version'

type ReviseDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; detail: ProposalDetail }

/** The engine leaves untouched only a class the account holds, and never cash: every sale settles into it. */
const excludableClasses = (positions: readonly Position[]): AssetClass[] =>
  [...new Set(positions.filter((p) => p.marketValue > 0 && p.assetClass !== 'cash').map((p) => p.assetClass))]
    .sort((a, b) => assetClassLabel(a).localeCompare(assetClassLabel(b)))

const isUnchanged = (error: Error) => error instanceof ApiClientError && error.code === 'NO_CHANGE'

export function ReviseDialog({ open, onOpenChange, detail }: ReviseDialogProps) {
  const latest = latestVersionOf(detail)
  const [form, setForm] = useState(() => formFromConstraints(latest.constraints))
  const [problem, setProblem] = useState<string>()
  const revise = useReviseProposal(detail.id)
  const positions = usePositions(detail.accountId)

  const edit = (change: Partial<ConstraintForm>) => {
    setForm({ ...form, ...change })
    setProblem(undefined)
    revise.reset()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = constraintsFromForm(form)
    if (!parsed.ok) { setProblem(parsed.message); return }
    setProblem(undefined)
    revise.mutate(parsed.constraints, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Revise the proposal"
      description={`The Proposal Agent drafts v${latest.n + 1} from its own legs under these constraints, replacing those of v${latest.n}.`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Checkbox label="Harvest only: sell only lots at a loss" checked={form.harvestOnly} onChange={(v) => edit({ harvestOnly: v })} />
        <Checkbox label="Cap realised gains" checked={form.capOn} onChange={(v) => edit({ capOn: v })} />
        {form.capOn ? (
          <div className="pl-7">
            <NumberInput label="Realised gains cap" unit="USD" value={form.cap} error={problem} onChange={(v) => edit({ cap: v })} />
          </div>
        ) : null}
        {positions.isPending ? <p role="status" className="text-body text-ink-3">Loading the holdings…</p>
          : positions.isError ? <p role="alert" className="text-body">{positions.error.message}</p>
          : (
            <Select label="Leave untouched" value={form.exclude} onChange={(v) => edit({ exclude: v })}
              options={[{ value: '', label: 'Nothing' }, ...excludableClasses(positions.data).map((c) => ({ value: c, label: assetClassLabel(c) }))]} />
          )}
        <p className="border-t border-rule pt-3 text-body text-ink-2">Always on: no buy that would wash one of the taxpayer&apos;s losses.</p>
        {problem && !form.capOn ? <p role="alert" className="text-body">{problem}</p> : null}
        {revise.isError
          ? isUnchanged(revise.error)
            ? <p role="status" className="text-body text-ink-2">That changes nothing in the proposal.</p>
            : <p role="alert" className="text-body">{revise.error.message}</p>
          : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={revise.isPending}>Ask Proposal Agent to revise</Button>
        </div>
      </form>
    </Dialog>
  )
}
