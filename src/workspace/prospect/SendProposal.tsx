import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { fmtEasternDayTime } from '@/kit/measure'
import { useSendProspectProposal } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { addressNameOf } from '@/lib/words'
import { DISCLOSURE_TITLES, type ProspectView } from '@/types/workspace-prospect'

type Props = { view: ProspectView; canSend: boolean; onRecorded: (actId: string) => void }

/** The approved version, sent to her as a binding act: Form CRS first; ADV 2A goes with it when she has not had it. */
export function SendProposal({ view, canSend, onRecorded }: Props) {
  const send = useSendProspectProposal()
  const [open, setOpen] = useState(false)
  const proposal = view.proposals[0]
  if (!proposal) return null
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${proposal.id} has no versions`)
  if (proposal.sent) {
    return (
      <ContextSection title="Proposal">
        <p className="tabular text-body">{`Sent v${proposal.sent.version} · ${proposal.sent.actId} · ${fmtEasternDayTime(proposal.sent.at)}`}</p>
        {proposal.accepted ? <p className="tabular text-body">{`Accepted v${proposal.accepted.version} · ${proposal.accepted.actId} · ${fmtEasternDayTime(proposal.accepted.at)}`}</p> : null}
      </ContextSection>
    )
  }
  const approval = proposal.approval
  if (!approval) {
    return <ContextSection title="Proposal"><p className="text-body text-ink-2">{`v${latest.n} is drafted. Approve a version in the prospect work thread before sending it.`}</p></ContextSection>
  }
  const name = addressNameOf(view.name)
  const blockedReason = !view.formCrsDelivered ? 'Deliver Form CRS first: it comes before or with the first recommendation. This is firm policy.'
    : latest.n !== approval.version ? `v${latest.n} is newer than the approved v${approval.version}; approve the version you mean to send.`
    : undefined
  const withAdv2a = !view.disclosures.some((d) => d.document === 'adv_2a')
  return (
    <ContextSection title="Proposal">
      <p className="tabular text-body">{`v${approval.version} is approved (${approval.actId}).`}</p>
      {canSend ? <Button className="self-start" onClick={() => { send.reset(); setOpen(true) }}>{`Send v${approval.version} to ${name}`}</Button> : null}
      <ConfirmRecord open={open} onClose={() => setOpen(false)} mutation={send} variables={proposal.id} onRecorded={onRecorded}
        title={`Send v${approval.version} to ${name}?`}
        description={withAdv2a ? `${DISCLOSURE_TITLES.adv_2a} is delivered with it, in the same record. Firm policy puts it at or before the proposal.` : 'The record names you, the version and the time.'}
        blockedReason={blockedReason} />
    </ContextSection>
  )
}
