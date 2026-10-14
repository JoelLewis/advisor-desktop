import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { Dialog } from '@/kit/dialog/Dialog'
import { NumberInput } from '@/kit/number-input/NumberInput'
import { Select } from '@/kit/select/Select'
import { usePositions } from '@/hooks/use-portfolio'
import { useReviseProposal } from '@/hooks/use-workspace'
import { ApiClientError } from '@/services/api-client'
import { ASSET_CLASS_PROSE_LABELS } from '@/lib/labels'
import type { AssetClass, Position } from '@/types/portfolio'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { constraintsFromForm, formFromConstraints, type ConstraintForm, type FormProblem } from './constraint-form'
import { latestVersionOf } from './latest-version'

type ReviseDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; detail: ProposalDetail }

/** The engine leaves untouched only a class the account holds, and never cash: every sale settles into it. */
const excludableClasses = (positions: readonly Position[]): AssetClass[] =>
  [...new Set(positions.filter((p) => p.marketValue > 0 && p.assetClass !== 'cash').map((p) => p.assetClass))]
    .sort((a, b) => ASSET_CLASS_PROSE_LABELS[a].localeCompare(ASSET_CLASS_PROSE_LABELS[b]))

const refusalCode = (error: Error | null) => (error instanceof ApiClientError ? error.code : undefined)

export function ReviseDialog({ open, onOpenChange, detail }: ReviseDialogProps) {
  const latest = latestVersionOf(detail)
  const [form, setForm] = useState(() => formFromConstraints(latest.constraints))
  const [formProblem, setFormProblem] = useState<FormProblem>()
  const revise = useReviseProposal(detail.id)
  const positions = usePositions(detail.accountId)
  const formRef = useRef<HTMLFormElement>(null)
  const code = refusalCode(revise.error)
  // The engine's refusal to leave a class untouched belongs to that field, like the form's own.
  const problem: FormProblem | undefined = formProblem
    ?? (code === 'NOT_EXCLUDABLE' && revise.error ? { field: 'exclude', problem: revise.error.message } : undefined)
  const problemOn = (field: FormProblem['field']) => (problem?.field === field ? problem.problem : undefined)

  // A refused submission moves focus to the field it names, so the refusal is announced there.
  useEffect(() => {
    if (formProblem || code === 'NOT_EXCLUDABLE') formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [formProblem, code])

  const edit = (change: Partial<ConstraintForm>) => {
    setForm({ ...form, ...change })
    setFormProblem(undefined)
    revise.reset()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = constraintsFromForm(form)
    if (!parsed.ok) { setFormProblem({ field: parsed.field, problem: parsed.problem }); return }
    setFormProblem(undefined)
    revise.mutate(parsed.constraints, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Revise the proposal"
      description={`The Proposal Agent drafts v${latest.n + 1} from its own legs under these constraints, replacing those of v${latest.n}.`}>
      <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
        {latest.edits.length > 0 ? <p className="text-body">{`Edits made in v${latest.n} are not carried into the revision.`}</p> : null}
        <Checkbox label="Harvest only: sell only lots at a loss" checked={form.harvestOnly} onChange={(v) => edit({ harvestOnly: v })} />
        <Checkbox label="Cap realized gains" checked={form.capOn} onChange={(v) => edit({ capOn: v })} />
        {form.capOn ? (
          <div className="pl-7">
            <NumberInput label="Realized gains cap" unit="USD" value={form.cap} error={problemOn('cap')} onChange={(v) => edit({ cap: v })} />
          </div>
        ) : null}
        {positions.isPending ? <p role="status" className="text-body text-ink-3">Loading the holdings…</p>
          : positions.isError ? <p role="alert" className="text-body">{positions.error.message}</p>
          : (
            <Select label="Leave untouched" layout="stacked" value={form.exclude} error={problemOn('exclude')} onChange={(v) => edit({ exclude: v })}
              options={[{ value: '', label: 'Nothing' }, ...excludableClasses(positions.data).map((c) => ({ value: c, label: ASSET_CLASS_PROSE_LABELS[c] }))]} />
          )}
        <p className="border-t border-rule pt-3 text-body text-ink-2">Always on: no buy that would wash a loss the taxpayer has taken or this proposal takes.</p>
        {code === 'NO_CHANGE' ? <p role="status" className="text-body text-ink-2">That changes nothing in the proposal.</p> : null}
        {revise.isError && code !== 'NO_CHANGE' && code !== 'NOT_EXCLUDABLE' ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={revise.isPending}>Ask Proposal Agent to revise</Button>
        </div>
      </form>
    </Dialog>
  )
}
