import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { Select } from '@/kit/select/Select'
import { useReviseProspectProposal } from '@/hooks/use-prospect-work'
import type { ProspectConstraint, ProspectProposalDetail } from '@/types/workspace-prospect'
import { TRANCHE_OPTIONS } from './prospect-words'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; prospectId: string; detail: ProspectProposalDetail }

const constraintsFor = (value: string): ProspectConstraint[] =>
  value === '2' || value === '3' ? [{ kind: 'stage_diversification', tranches: value === '2' ? 2 : 3 }] : []

/** Asks the Proposal Agent for the next version under the chosen staging. The form starts from the latest version each time it opens. */
export function ReviseProspectDialog({ open, onOpenChange, prospectId, detail }: Props) {
  const revise = useReviseProspectProposal(prospectId)
  const latest = detail.versions[detail.versions.length - 1]
  const staged = latest?.constraints.find((c) => c.kind === 'stage_diversification')
  const [value, setValue] = useState<string>(staged ? String(staged.tranches) : '')
  if (!latest) throw new Error(`Proposal ${detail.id} has no versions`)
  const ask = () => revise.mutate({ proposalId: detail.id, constraints: constraintsFor(value) }, { onSuccess: () => onOpenChange(false) })
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!revise.isPending) onOpenChange(next) }} title={`Revise the ${detail.title}`}
      description="The Proposal Agent drafts a new version; nothing is sold in any version.">
      <div className="flex flex-col gap-4">
        <Select label="Staged sale of the concentrated stock" layout="stacked" value={value} onChange={setValue} options={TRANCHE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
        <div className="flex justify-end gap-3">
          <Button rank="secondary" disabled={revise.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={revise.isPending} onClick={ask}>{`Ask for v${latest.n + 1}`}</Button>
        </div>
      </div>
    </Dialog>
  )
}
