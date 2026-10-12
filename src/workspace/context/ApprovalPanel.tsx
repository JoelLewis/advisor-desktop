import { useId, useRef, useState } from 'react'
import { Attestation } from '@/kit/attestation/Attestation'
import { Button } from '@/kit/button/Button'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney, fmtQuantity } from '@/kit/measure'
import { useApproveProposal, useProposals, useWithdrawApproval } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { isApprovedLatest } from '@/workspace/proposal/approval-words'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { Directory, Thread } from '@/types/workspace'
import type { ProposalDetail, StagedOrder } from '@/types/workspace-proposal'
import { ContextSection } from './ContextSection'
import { approveBlocker } from './approve-blocker'

type OnRecorded = (actId: string) => void
type ApprovalPanelProps = { thread: Thread; directory: Directory; onRecorded: OnRecorded }
type RecordCallbacks = { onSuccess: (act: { id: string }) => void; onSettled: () => void }

export function ApprovalPanel({ thread, directory, onRecorded }: ApprovalPanelProps) {
  const proposals = useProposals(thread.id)
  if (proposals.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the proposals…</p>
  if (proposals.isError) return <p role="alert" className="py-5 text-body">{proposals.error.message}</p>
  return proposals.data.map((p) => <ProposalApproval key={p.id} detail={p} directory={directory} onRecorded={onRecorded} />)
}

function ProposalApproval({ detail, directory, onRecorded }: { detail: ProposalDetail; directory: Directory; onRecorded: OnRecorded }) {
  const { viewerId } = useViewer()
  const approve = useApproveProposal()
  const withdraw = useWithdrawApproval()
  // The attestation names one version; a newer version arriving un-ticks it rather than carrying the review over.
  const [attestedVersion, setAttestedVersion] = useState<number>()
  const busy = useRef(false)
  const attestId = useId()
  const reasonId = useId()
  const latest = latestVersionOf(detail)
  const approval = detail.approval
  const permissions = directory.permissions[viewerId] ?? []
  const canApprove = permissions.includes('approve_proposal') && !isApprovedLatest(approval)
  const withdrawableVersion = approval.kind === 'approved' && approval.approverId === viewerId && permissions.includes('withdraw_approval')
    ? approval.version : undefined
  const reason = approveBlocker({
    blocked: latest.pretrade.violations.some((v) => v.severity === 'block'),
    hasLegs: latest.preview.trades.length > 0,
    attested: attestedVersion === latest.n,
  })
  const blocks = latest.pretrade.violations.filter((v) => v.severity === 'block')
  const pending = detail.staged.filter((o) => o.status === 'pending_compliance')

  // A ref, not render state, so a second click in the same frame cannot send a second act.
  const record = (send: (callbacks: RecordCallbacks) => void) => {
    if (busy.current) return
    busy.current = true
    send({ onSuccess: (act) => { setAttestedVersion(undefined); onRecorded(act.id) }, onSettled: () => { busy.current = false } })
  }

  return (
    <ContextSection title={`Approval · ${detail.title}`}>
      <ApprovalNote state={approval} />
      {canApprove ? (
        <div className="flex flex-col items-start gap-3">
          <Attestation id={attestId} checked={attestedVersion === latest.n} onChange={(checked) => setAttestedVersion(checked ? latest.n : undefined)}>
            {`I reviewed every leg of v${latest.n} and its pre-trade reading.`}
          </Attestation>
          <Button disabled={reason !== undefined || approve.isPending} aria-describedby={reason ? reasonId : undefined}
            onClick={() => record((callbacks) => approve.mutate({ proposalId: detail.id, version: latest.n, fingerprint: latest.fingerprint }, callbacks))}>
            {`Approve v${latest.n}`}
          </Button>
          {reason ? <p id={reasonId} className="text-body text-ink-2">{reason}</p> : null}
          {blocks.map((v) => (
            <p key={`${v.category}:${v.symbol ?? v.constraint}`} className="flex items-baseline gap-3 text-body"><StatusCode status="BLOCK" /><span>{v.message}</span></p>
          ))}
        </div>
      ) : null}
      {approve.isError ? <p role="alert" className="text-body">{approve.error.message}</p> : null}
      {pending.length > 0 ? <StagedOrders orders={pending} /> : null}
      {withdrawableVersion !== undefined ? (
        <Button rank="secondary" className="self-start" disabled={withdraw.isPending} onClick={() => record((callbacks) => withdraw.mutate(detail.id, callbacks))}>
          {`Withdraw the approval of v${withdrawableVersion}`}
        </Button>
      ) : null}
      {withdraw.isError ? <p role="alert" className="text-body">{withdraw.error.message}</p> : null}
    </ContextSection>
  )
}

function StagedOrders({ orders }: { orders: StagedOrder[] }) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="hatch">PENDING COMPLIANCE REVIEW</Tag>
        <span className="text-ink-2">Staged, not released.</span>
      </p>
      <ul aria-label="Staged orders" className="flex flex-col gap-1 text-body">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>{`${SIDE_WORDS[o.side]} ${fmtQuantity(o.quantity)} ${o.symbol}`}</span>
            <span className="tabular text-ink-2">{fmtMoney(o.estimatedValue)} <span className="text-ink-3">{o.currency}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
