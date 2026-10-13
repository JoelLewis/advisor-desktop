import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { Dialog } from '@/kit/dialog/Dialog'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney, fmtPrice, fmtQuantity } from '@/kit/measure'
import { useApproveProposal, useProposals, useWithdrawApproval } from '@/hooks/use-workspace'
import { PRESENTER_ID } from '@/lib/presenter'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { isApprovedLatest } from '@/workspace/proposal/approval-words'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { FILL_SIDE_WORDS, SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { Directory, Thread } from '@/types/workspace'
import type { Fill, ProposalDetail, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { ContextSection } from './ContextSection'
import { approveBlocker } from './approve-blocker'
import { PresenterRelease } from './PresenterRelease'

type OnRecorded = (actId: string) => void
type ApprovalPanelProps = { thread: Thread; directory: Directory; onRecorded: OnRecorded }
type RecordCallbacks = { onSuccess: (act: { id: string }) => void; onSettled: () => void }

export function ApprovalPanel({ thread, directory, onRecorded }: ApprovalPanelProps) {
  const proposals = useProposals(thread.id)
  // Most threads have no proposal: nothing shows until there is one to show, so unrelated threads never flash a loading line.
  if (proposals.isPending) return null
  if (proposals.isError) return <p role="alert" className="py-5 text-body">{proposals.error.message}</p>
  return proposals.data.map((p) => <ProposalApproval key={p.id} detail={p} directory={directory} onRecorded={onRecorded} />)
}

function ProposalApproval({ detail, directory, onRecorded }: { detail: ProposalDetail; directory: Directory; onRecorded: OnRecorded }) {
  const { viewerId } = useViewer()
  const approve = useApproveProposal()
  const withdraw = useWithdrawApproval()
  // The attestation names one version; a newer version arriving un-ticks it rather than carrying the review over.
  const [attestedVersion, setAttestedVersion] = useState<number>()
  const [confirmingWithdrawOf, setConfirmingWithdrawOf] = useState<number>()
  const [slipTakesFocus, setSlipTakesFocus] = useState(false)
  const busy = useRef(false)
  const reasonId = useId()
  const readingId = useId()
  const latest = latestVersionOf(detail)
  const approval = detail.approval
  const permissions = directory.permissions[viewerId] ?? []
  const canApprove = permissions.includes('approve_proposal') && approval.kind !== 'released' && !isApprovedLatest(approval)
  const withdrawableVersion = approval.kind === 'approved' && approval.approverId === viewerId && permissions.includes('withdraw_approval')
    ? approval.version : undefined
  const reason = approveBlocker({
    blocked: latest.pretrade.violations.some((v) => v.severity === 'block'),
    hasLegs: latest.preview.trades.length > 0,
    attested: attestedVersion === latest.n,
  })
  // A refusal belongs to the version it was about; once another version is on screen it no longer describes anything here.
  const approveError = approve.isError && approve.variables.proposalId === detail.id && approve.variables.version === latest.n ? approve.error : undefined
  const pending = detail.staged.filter((o) => o.status === 'pending_compliance')
  const returned = approval.kind === 'unapproved' ? detail.staged.filter((o) => o.status === 'returned').pop() : undefined
  // The one presenter acts for compliance through a labelled shortcut; compliance itself records in Supervision.
  const presents = viewerId === PRESENTER_ID && !permissions.includes('release_orders')

  // A ref, not render state, so a second click in the same frame cannot send a second act.
  const record = (send: (callbacks: RecordCallbacks) => void, afterRecorded?: () => void) => {
    if (busy.current) return
    busy.current = true
    send({
      onSuccess: (act) => { setAttestedVersion(undefined); afterRecorded?.(); onRecorded(act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  const openWithdraw = (version: number) => { withdraw.reset(); setSlipTakesFocus(false); setConfirmingWithdrawOf(version) }
  // An act in flight is not cancellable: closing would reset the mutation and drop the callbacks that release the busy ref.
  const closeWithdraw = () => {
    if (withdraw.isPending) return
    withdraw.reset()
    setConfirmingWithdrawOf(undefined)
  }
  const confirmWithdraw = () => record(
    (callbacks) => withdraw.mutate(detail.id, callbacks),
    () => { setSlipTakesFocus(true); setConfirmingWithdrawOf(undefined) },
  )

  return (
    <ContextSection title={`Approval · ${detail.title}`}>
      <ApprovalNote state={approval} />
      {canApprove ? (
        <div className="flex flex-col items-start gap-3">
          <Checkbox label={`I reviewed every leg of v${latest.n} and its pre-trade reading.`} checked={attestedVersion === latest.n}
            describedBy={hasReading(latest) ? readingId : undefined}
            onChange={(checked) => setAttestedVersion(checked ? latest.n : undefined)} />
          <PretradeReading id={readingId} version={latest} />
          <Button disabled={reason !== undefined || approve.isPending} aria-describedby={reason ? reasonId : undefined}
            onClick={() => record((callbacks) => approve.mutate({ proposalId: detail.id, version: latest.n, fingerprint: latest.fingerprint }, callbacks))}>
            {`Approve v${latest.n}`}
          </Button>
          {reason ? <p id={reasonId} className="text-body text-ink-2">{reason}</p> : null}
          {approveError ? <p role="alert" className="text-body">{approveError.message}</p> : null}
        </div>
      ) : null}
      {pending.length > 0 ? <StagedOrders orders={pending} escalated={detail.escalation !== undefined} /> : null}
      {pending.length > 0 && presents && pending[0] ? <PresenterRelease proposalId={detail.id} version={pending[0].version} directory={directory} onRecorded={onRecorded} /> : null}
      {approval.kind === 'released' ? <FilledOrders fills={detail.fills} version={approval.version} releaseActId={approval.releaseActId} /> : null}
      {returned ? <p className="text-body text-ink-2">{`Compliance returned v${returned.version} (${returned.closedByActId ?? ''}). Revise it, or approve it again, to stage new orders.`}</p> : null}
      {withdrawableVersion !== undefined ? (
        <Button rank="secondary" className="self-start" onClick={() => openWithdraw(withdrawableVersion)}>
          {`Withdraw the approval of v${withdrawableVersion}`}
        </Button>
      ) : null}
      <Dialog open={confirmingWithdrawOf !== undefined} onOpenChange={(open) => { if (!open) closeWithdraw() }} returnFocus={!slipTakesFocus}
        title={`Withdraw the approval of v${confirmingWithdrawOf ?? ''}?`} description="The staged orders are withdrawn.">
        <div className="flex flex-col gap-4">
          {withdraw.isError ? <p role="alert" className="text-body">{withdraw.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={withdraw.isPending} onClick={closeWithdraw}>Cancel</Button>
            <Button disabled={withdraw.isPending} onClick={confirmWithdraw}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </ContextSection>
  )
}

const readingLines = (version: ProposalVersion) => version.pretrade.violations
const hasReading = (version: ProposalVersion) => readingLines(version).length > 0

/** Every block and warning the attestation covers, as the pre-trade check worded them. */
function PretradeReading({ id, version }: { id: string; version: ProposalVersion }) {
  const lines = readingLines(version)
  if (lines.length === 0) return null
  return (
    <ul id={id} aria-label={`Pre-trade reading of v${version.n}`} className="flex flex-col gap-1">
      {lines.map((v) => (
        <li key={`${v.severity}:${v.category}:${v.symbol ?? v.constraint}`} className="flex items-baseline gap-3 text-body">
          <StatusCode status={v.severity === 'block' ? 'BLOCK' : 'WARN'} /><span>{v.message}</span>
        </li>
      ))}
    </ul>
  )
}

function StagedOrders({ orders, escalated }: { orders: StagedOrder[]; escalated: boolean }) {
  // The engine keeps one active approval, so every pending order traces to the same act.
  const source = orders[0]
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="hatch">PENDING COMPLIANCE REVIEW</Tag>
        <span className="text-ink-2">Staged, not released.</span>
      </p>
      {escalated ? (
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">ESCALATED</Tag>
          <span className="text-ink-2">Held by compliance for further review.</span>
        </p>
      ) : null}
      {source ? <p className="text-label text-ink-2">{`Staged from v${source.version} · ${source.approvalActId}`}</p> : null}
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

function FilledOrders({ fills, version, releaseActId }: { fills: Fill[]; version: number; releaseActId: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="solid">FILLED</Tag>
        <span className="text-ink-2">Released by compliance; filled at the day&apos;s prices.</span>
      </p>
      <p className="text-label text-ink-2">{`Filled from v${version} · released by ${releaseActId}`}</p>
      <ul aria-label="Filled orders" className="flex flex-col gap-1 text-body">
        {fills.map((f) => (
          <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>{`${FILL_SIDE_WORDS[f.side]} ${fmtQuantity(f.quantity)} ${f.symbol} at ${fmtPrice(f.price)}`}</span>
            <span className="tabular text-ink-2">{fmtMoney(f.value)} <span className="text-ink-3">{f.currency}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
