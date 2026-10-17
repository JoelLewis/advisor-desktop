import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { TextInput } from '@/kit/text-input/TextInput'
import { RadioGroup } from '@/kit/radio-group/RadioGroup'
import { Dialog } from '@/kit/dialog/Dialog'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { useActs, useApproveProposal, useProposals, useWithdrawApproval } from '@/hooks/use-workspace'
import { releaseAnnouncement } from './release-announcement'
import { personIn } from '@/workspace/people/directory-people'
import { PRESENTER_ID } from '@/lib/presenter'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { isApprovedLatest, returnedLine } from '@/workspace/proposal/approval-words'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { BlotterLink } from '@/workspace/proposal/BlotterLink'
import { FillList } from '@/workspace/proposal/FillList'
import { StagedOrderList } from '@/workspace/proposal/StagedOrderList'
import type { Directory, Thread } from '@/types/workspace'
import type { Fill, ProposalDetail, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { ContextSection } from './ContextSection'
import { approveBlocker } from './approve-blocker'
import { PresenterRelease } from './PresenterRelease'
import { supervisionHref } from '@/workspace/supervision/supervision-items'
import { LINK_TARGET } from '@/kit/link-target'
import type { SuitabilityReason, SuitabilityReasonId } from '@/lib/suitability'
import { preselectedReason, reasonOptions, wholeAfterSentence } from './suitability-choice'
import { toleranceCheckOf, type ToleranceCheck } from '@/lib/suitability'

type OnRecorded = (actId: string) => void
type ApprovalPanelProps = { thread: Thread; directory: Directory; onRecorded: OnRecorded }
type ChosenReason = { version: number; reason: SuitabilityReasonId | ''; note: string }
type RecordCallbacks = { onSuccess: (act: { id: string; summary: string }) => void; onSettled: () => void }

export function ApprovalPanel({ thread, directory, onRecorded }: ApprovalPanelProps) {
  const proposals = useProposals(thread.id)
  // Most threads have no proposal: nothing shows until there is one to show, so unrelated threads never flash a loading line.
  if (proposals.isPending) return null
  if (proposals.isError) return <p role="alert" className="py-5 text-body">{proposals.error.message}</p>
  return proposals.data.map((p) => <ProposalApproval key={p.id} detail={p} directory={directory} onRecorded={onRecorded} />)
}

function ProposalApproval({ detail, directory, onRecorded }: { detail: ProposalDetail; directory: Directory; onRecorded: OnRecorded }) {
  const { viewerId } = useViewer()
  const announce = useAnnounce()
  useAnnounceRelease(detail, directory)
  const approve = useApproveProposal()
  const withdraw = useWithdrawApproval()
  // The attestation names one version; a newer version arriving un-ticks it rather than carrying the review over.
  const [attestedVersion, setAttestedVersion] = useState<number>()
  // The suitability reason belongs to one version too: a newer version starts again from the reason chosen for it.
  const [chosenReason, setChosenReason] = useState<ChosenReason>()
  const [confirmingWithdrawOf, setConfirmingWithdrawOf] = useState<number>()
  const [slipTakesFocus, setSlipTakesFocus] = useState(false)
  const busy = useRef(false)
  const blockerId = useId()
  const readingId = useId()
  const latest = latestVersionOf(detail)
  const toleranceCheck = toleranceCheckOf(latest.pretrade.violations)
  const chosen: ChosenReason = chosenReason?.version === latest.n
    ? chosenReason
    : { version: latest.n, reason: toleranceCheck ? preselectedReason(toleranceCheck) : '', note: '' }
  const suitability: SuitabilityReason | undefined = toleranceCheck && chosen.reason !== ''
    ? { reason: chosen.reason, ...(chosen.note.trim() ? { note: chosen.note.trim() } : {}) }
    : undefined
  const approval = detail.approval
  const permissions = directory.permissions[viewerId] ?? []
  const canApprove = permissions.includes('approve_proposal') && approval.kind !== 'released' && !isApprovedLatest(approval)
  const withdrawableVersion = approval.kind === 'approved' && approval.approverId === viewerId && permissions.includes('withdraw_approval')
    ? approval.version : undefined
  const blocker = approveBlocker({
    blocked: latest.pretrade.violations.some((v) => v.severity === 'block'),
    hasLegs: latest.preview.trades.length > 0,
    attested: attestedVersion === latest.n,
    reasonMissing: toleranceCheck !== undefined && suitability === undefined,
  })
  // A refusal belongs to the version it was about; once another version is on screen it no longer describes anything here.
  const approveError = approve.isError && approve.variables.proposalId === detail.id && approve.variables.version === latest.n ? approve.error : undefined
  const pending = detail.staged.filter((o) => o.status === 'pending_compliance')
  const returned = approval.kind === 'unapproved' ? detail.staged.filter((o) => o.status === 'returned').pop() : undefined
  // The one presenter acts for compliance through a labeled shortcut; compliance itself records in Supervision.
  const presents = viewerId === PRESENTER_ID && !permissions.includes('release_orders')

  // A ref, not render state, so a second click in the same frame cannot send a second act.
  const record = (send: (callbacks: RecordCallbacks) => void, afterRecorded?: () => void) => {
    if (busy.current) return
    busy.current = true
    send({
      onSuccess: (act) => { setAttestedVersion(undefined); setChosenReason(undefined); announce(`${act.summary} · ${act.id}`); afterRecorded?.(); onRecorded(act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  const openWithdraw = (version: number) => { withdraw.reset(); setSlipTakesFocus(false); setConfirmingWithdrawOf(version) }
  // An act in flight is not cancelable: closing would reset the mutation and drop the callbacks that release the busy ref.
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
          <Checkbox label={`I reviewed every leg of v${latest.n} and its pre-trade check results.`} checked={attestedVersion === latest.n}
            describedBy={hasReading(latest) ? readingId : undefined}
            onChange={(checked) => setAttestedVersion(checked ? latest.n : undefined)} />
          <PretradeReading id={readingId} version={latest} />
          {toleranceCheck ? <SuitabilityReasonField check={toleranceCheck} chosen={chosen} onChange={setChosenReason} /> : null}
          <Button pending={approve.isPending} disabled={blocker !== undefined} aria-describedby={blocker ? blockerId : undefined}
            onClick={() => record((callbacks) => approve.mutate({ proposalId: detail.id, version: latest.n, fingerprint: latest.fingerprint, ...(suitability ? { suitability } : {}) }, callbacks))}>
            {`Approve v${latest.n}`}
          </Button>
          {blocker ? <p id={blockerId} className="text-body text-ink-2">{blocker}</p> : null}
          {approveError ? <p role="alert" className="text-body">{approveError.message}</p> : null}
        </div>
      ) : null}
      {pending.length > 0 ? <StagedOrders orders={pending} escalated={detail.escalation !== undefined} /> : null}
      {pending.length > 0 && permissions.includes('release_orders') ? (
        <Link to={supervisionHref('orders', detail.id)} className={`${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>
          Review in Supervision <span aria-hidden="true">↗</span>
        </Link>
      ) : null}
      {pending.length > 0 && presents && pending[0] ? <PresenterRelease proposalId={detail.id} version={pending[0].version} directory={directory} onRecorded={onRecorded} /> : null}
      {approval.kind === 'released' ? <FilledOrders fills={detail.fills} version={approval.version} releaseActId={approval.releaseActId} /> : null}
      {returned ? <p className="text-body text-ink-2">{returnedLine(returned)}</p> : null}
      {withdrawableVersion !== undefined ? (
        <Button rank="secondary" className="self-start" onClick={() => openWithdraw(withdrawableVersion)}>
          {`Withdraw the approval of v${withdrawableVersion}`}
        </Button>
      ) : null}
      <Dialog open={confirmingWithdrawOf !== undefined} onOpenChange={(open) => { if (!open) closeWithdraw() }} returnFocus={!slipTakesFocus}
        title={`Withdraw the approval of v${confirmingWithdrawOf ?? ''}?`} description="The orders pending compliance release are withdrawn.">
        <div className="flex flex-col gap-4">
          {withdraw.isError ? <p role="alert" className="text-body">{withdraw.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" pending={withdraw.isPending} onClick={closeWithdraw}>Cancel</Button>
            <Button pending={withdraw.isPending} onClick={confirmWithdraw}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </ContextSection>
  )
}

/** Says the release and its fills when a release is seen in this session; one already released on load is not news. */
function useAnnounceRelease(detail: ProposalDetail, directory: Directory) {
  const announce = useAnnounce()
  const acts = useActs(detail.threadId)
  const kind = detail.approval.kind
  const releaseActId = detail.approval.kind === 'released' ? detail.approval.releaseActId : undefined
  const previousKind = useRef(kind)
  const awaitingReleaseAct = useRef(false)
  const releaseAct = acts.data?.find((a) => a.id === releaseActId)
  useEffect(() => {
    if (previousKind.current === 'approved' && kind === 'released') awaitingReleaseAct.current = true
    previousKind.current = kind
    if (!awaitingReleaseAct.current || !releaseAct) return
    awaitingReleaseAct.current = false
    announce(releaseAnnouncement(personIn(directory, releaseAct.actorId).name, detail.fills.length))
  }, [kind, releaseAct, announce, directory, detail.fills.length])
}

/** The advisor's suitability reason for a model above the client's tolerance, with the figure it rests on. Outside the band as a whole, nothing is chosen and the warning is the stronger one. */
function SuitabilityReasonField({ check, chosen, onChange }: { check: ToleranceCheck; chosen: ChosenReason; onChange: (next: ChosenReason) => void }) {
  const wholeId = useId()
  const within = check.wholeAfterStatus === 'within'
  return (
    <div className="flex w-full flex-col gap-2">
      <RadioGroup legend="Suitability reason" options={reasonOptions(check)} value={chosen.reason === '' ? undefined : chosen.reason} describedBy={wholeId}
        onChange={(reason) => onChange({ ...chosen, reason })} />
      <p id={wholeId} className={within ? 'text-body text-ink-2' : 'flex items-baseline gap-3 text-body'}>
        {within ? null : <StatusCode status="OUT" label="Outside the tolerance as a whole" />}
        <span>{wholeAfterSentence(check)}</span>
      </p>
      <TextInput label="Note (optional)" value={chosen.note} rows={2} onChange={(note) => onChange({ ...chosen, note })} />
    </div>
  )
}

const readingLines = (version: ProposalVersion) => version.pretrade.violations
const hasReading = (version: ProposalVersion) => readingLines(version).length > 0

/** Every block and warning the attestation covers, as the pre-trade check worded them. */
function PretradeReading({ id, version }: { id: string; version: ProposalVersion }) {
  const lines = readingLines(version)
  if (lines.length === 0) return null
  return (
    <ul id={id} aria-label={`Pre-trade check results · v${version.n}`} className="flex flex-col gap-1">
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
        <Tag tone="hatch">PENDING COMPLIANCE RELEASE</Tag>
      </p>
      {escalated ? (
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">ESCALATED</Tag>
          <span className="text-ink-2">Held by compliance for further review.</span>
        </p>
      ) : null}
      {source ? <p className="text-label text-ink-2">{`From v${source.version} · approval ${source.approvalActId}`}</p> : null}
      <StagedOrderList orders={orders} />
      {source ? <BlotterLink accountId={source.accountId} /> : null}
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
      <FillList fills={fills} label="Filled orders" />
      {fills[0] ? <BlotterLink accountId={fills[0].accountId} /> : null}
    </div>
  )
}
