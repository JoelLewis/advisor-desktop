import { useId, useState } from 'react'
import { Attestation } from '@/kit/attestation/Attestation'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { clientRate, fmtMoney, fmtPoints, fmtWeight } from '@/kit/measure'
import { useApproveProspectProposal } from '@/hooks/use-prospect-work'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import type { Directory } from '@/types/workspace'
import type { ProspectProposalDetail } from '@/types/workspace-prospect'
import { RATIONALE_DRAFT } from './prospect-words'

type Props = { detail: ProspectProposalDetail; directory: Directory; onRecorded: (actId: string) => void }

/** Approval of one exact version, with the firm-only best-interest record the engine composes and the advisor's own reasons. */
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
  const draft = detail.bestInterestDraft
  const canApprove = (directory.permissions[viewerId] ?? []).includes('approve_proposal') && !detail.sent && detail.approval?.version !== latest.n
  const blocked = attestedVersion !== latest.n ? `Tick the review of v${latest.n} first.` : rationale.trim().length === 0 ? 'Say why, in your own words.' : undefined
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <h2 id={titleId} className="text-label uppercase text-ink-2">{`Approval · ${detail.title}`}</h2>
      {detail.approval ? <p className="tabular text-body">{`v${detail.approval.version} is approved (${detail.approval.actId}).`}</p> : null}
      {detail.approval && detail.approval.version !== latest.n ? <p className="text-body">{`v${latest.n} is newer and not approved.`}</p> : null}
      <div className="flex flex-col gap-2 border-l-2 border-rule-2 pl-3">
        <p className="text-label uppercase text-ink-3">Best-interest record · firm only</p>
        <p className="tabular text-body">{`${draft.modelName} for the ${draft.profileLabel} band (score ${fmtPoints(draft.score)}).`}</p>
        <ul aria-label="Alternatives considered" className="flex flex-col gap-2">
          {draft.alternatives.map((a) => (
            <li key={a.kind} className="flex flex-col gap-0.5">
              <span className="tabular text-body font-semibold">{`${a.name} · ${fmtMoney(a.annualFee)} USD a year`}</span>
              <span className="text-body text-ink-2">{a.why}</span>
            </li>
          ))}
        </ul>
        <p className="tabular text-body">{`Costs · ${draft.costs.scheduleName} · ${fmtMoney(draft.costs.annualFee)} USD a year · blended ${clientRate(draft.costs.blendedRate)}`}</p>
        {draft.concentration ? <p className="tabular text-body">{`Concentration · ${draft.concentration.name} · ${fmtWeight(draft.concentration.weightOfAssets)}% of her assets · tax if sold now ${fmtMoney(draft.concentration.taxIfSoldNow)} USD (estimate)`}</p> : null}
        <p className="text-body">{draft.rollover}</p>
      </div>
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
            title={`Approve v${latest.n} of the ${detail.title}?`} description="Approval is a binding act; the best-interest record is filed with it, firm only." />
        </>
      ) : null}
    </section>
  )
}
