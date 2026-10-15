import { useId, useState } from 'react'
import { Attestation } from '@/kit/attestation/Attestation'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { clientRate, fmtMoney, fmtPoints, fmtWeight } from '@/kit/measure'
import { useActs } from '@/hooks/use-workspace'
import { useApproveProspectProposal } from '@/hooks/use-prospect-work'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { personIn } from '@/workspace/people/directory-people'
import { teamWords } from '@/workspace/people/visibility-words'
import { addressNameOf } from '@/lib/words'
import type { Directory } from '@/types/workspace'
import type { BestInterestDraft, BestInterestRecord, ProspectProposalDetail } from '@/types/workspace-prospect'
import { RATIONALE_DRAFT } from './prospect-words'

type Props = { detail: ProspectProposalDetail; directory: Directory; onRecorded: (actId: string) => void }

/** Approval of one exact version, with the best-interest record (the team's, never hers) the engine composes and the advisor's own reasons. */
export function ProspectApproval({ detail, directory, onRecorded }: Props) {
  const { viewerId } = useViewer()
  const approve = useApproveProspectProposal()
  const titleId = useId()
  const attestId = useId()
  const [attestedVersion, setAttestedVersion] = useState<number>()
  const [rationale, setRationale] = useState(RATIONALE_DRAFT)
  const [confirming, setConfirming] = useState(false)
  const latest = detail.versions[detail.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${detail.id} has no versions`)
  const acts = useActs(detail.threadId)
  const draft = detail.bestInterestDraft
  const prospectName = personIn(directory, detail.prospectId).name
  const filedAct = detail.approval ? acts.data?.find((a) => a.id === detail.approval?.actId) : undefined
  const filed = filedAct?.bestInterest
  const canApprove = (directory.permissions[viewerId] ?? []).includes('approve_proposal') && !detail.sent && detail.approval?.version !== latest.n
  const blocked = attestedVersion !== latest.n ? `Tick the review of v${latest.n} first.` : rationale.trim().length === 0 ? 'Say why, in your own words.' : undefined
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <h2 id={titleId} className="text-label uppercase text-ink-2">{`Approval · ${detail.title}`}</h2>
      {detail.approval ? <p className="tabular text-body">{`v${detail.approval.version} is approved (${detail.approval.actId}).`}</p> : null}
      {detail.approval && detail.approval.version !== latest.n ? <p className="text-body">{`v${latest.n} is newer and not approved.`}</p> : null}
      {acts.isError ? <p role="alert" className="text-body">{acts.error.message}</p>
        : detail.approval && !filed ? <p role="status" className="text-body text-ink-3">Loading the filed best-interest record…</p>
        : <BestInterestView record={filed ?? draft} heading={`Best-interest record · ${filed ? 'filed with the approval' : 'draft, not yet filed'} · ${teamWords([prospectName])}`} />}
      {canApprove ? (
        <>
          <TextInput label="Why this recommendation (your words)" value={rationale} onChange={setRationale} rows={4} />
          <Attestation id={attestId} checked={attestedVersion === latest.n} onChange={(checked) => setAttestedVersion(checked ? latest.n : undefined)}>
            {`I reviewed v${latest.n}: its model, its transfer plan, its fees and the best-interest record.`}
          </Attestation>
          <Button className="self-start" disabled={blocked !== undefined} onClick={() => { approve.reset(); setConfirming(true) }}>{`Approve v${latest.n}`}</Button>
          {blocked ? <p className="text-label text-ink-3">{blocked}</p> : null}
          <ConfirmRecord open={confirming} onClose={() => setConfirming(false)} mutation={approve}
            variables={{ proposalId: detail.id, version: latest.n, fingerprint: latest.fingerprint, rationale }}
            onRecorded={(actId) => { setAttestedVersion(undefined); onRecorded(actId) }}
            title={`Approve v${latest.n} of the ${detail.title}?`} description={`Approval is a binding act; the best-interest record is filed with it, and ${addressNameOf(prospectName)} can't see the record.`} />
        </>
      ) : null}
    </section>
  )
}

function BestInterestView({ record, heading }: { record: BestInterestDraft | BestInterestRecord; heading: string }) {
  return (
    <div className="flex flex-col gap-2 border-l-2 border-rule-2 pl-3">
      <p className="text-label uppercase text-ink-3">{heading}</p>
      <p className="tabular text-body">{`${record.modelName} for the ${record.profileLabel} band (score ${fmtPoints(record.score)}).`}</p>
      <ul aria-label="Alternatives considered" className="flex flex-col gap-2">
        {record.alternatives.map((a) => (
          <li key={a.kind} className="flex flex-col gap-0.5">
            <span className="tabular text-body font-semibold">{`${a.name} · ${fmtMoney(a.annualFee)} USD a year`}</span>
            <span className="text-body text-ink-2">{a.why}</span>
          </li>
        ))}
      </ul>
      <p className="tabular text-body">{`Costs · ${record.costs.scheduleName} · ${fmtMoney(record.costs.annualFee)} USD a year · blended ${clientRate(record.costs.blendedRate)}`}</p>
      {record.concentration ? <p className="tabular text-body">{`Concentration · ${record.concentration.name} · ${fmtWeight(record.concentration.weightOfAssets)}% of her total assets across both accounts · tax if sold now ${fmtMoney(record.concentration.taxIfSoldNow)} USD (estimate)`}</p> : null}
      <p className="text-body">{record.rollover}</p>
      {'rationale' in record ? <p className="text-body">{`Why, in the advisor's words: ${record.rationale}`}</p> : null}
    </div>
  )
}
