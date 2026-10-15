import { useId, type ReactNode } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Tag } from '@/kit/tag/Tag'
import { clientRate, fmtDayMonthYear, fmtMoney, fmtPoints, fmtQuantity, fmtResult, fmtWeight } from '@/kit/measure'
import { useProspectProposals } from '@/hooks/use-prospect-work'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { ProspectProposalDetail, ProspectProposalVersion } from '@/types/workspace-prospect'

type Props = { prospectId: string; proposalId: string; actions?: ReactNode }

function approvalWords(detail: ProspectProposalDetail): string {
  if (detail.accepted) return `Accepted v${detail.accepted.version} (${detail.accepted.actId})`
  if (detail.sent) return `Sent v${detail.sent.version} (${detail.sent.actId})`
  if (detail.approval) return `v${detail.approval.version} approved (${detail.approval.actId})`
  return 'Not approved'
}

/** Her proposal as the thread shows it: always the latest version, every figure the engine's. */
export function ProspectProposalEmbed({ prospectId, proposalId, actions }: Props) {
  const titleId = useId()
  const proposals = useProspectProposals(prospectId)
  if (proposals.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposals.isError) return <p role="alert" className="text-body">{proposals.error.message}</p>
  const detail = proposals.data.find((p) => p.id === proposalId)
  // A proposal just drafted may not be in the list until it refetches.
  if (!detail) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  const v = detail.versions[detail.versions.length - 1]
  if (!v) throw new Error(`Proposal ${proposalId} has no versions`)
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Proposal · ${detail.title}`}</h2>
        <span className="tabular text-label text-ink-3">{`v${v.n}`}</span>
      </div>
      <p className="text-copy">{v.changeSummary}</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Tag>{approvalWords(detail)}</Tag>
        <span className="tabular text-body">{`${v.modelName} · ${v.profileLabel} · score ${fmtPoints(v.score)}`}</span>
      </div>
      <SleevesTable version={v} />
      <TransferTable version={v} />
      {v.concentration ? (
        <p className="text-body">{`${v.concentration.name} is ${fmtWeight(v.concentration.weightOfAssets)}% of her total assets across both accounts; it moves in kind, and nothing is sold.`}</p>
      ) : null}
      {v.tranches.length > 0 ? <TranchesTable version={v} /> : null}
      {v.heldAway.map((h) => (
        <p key={h.statementId} className="tabular text-body">{`${h.custodian} 403(b) · ${fmtMoney(h.value)} USD · rollover: asked about; comparison to follow`}</p>
      ))}
      <p className="tabular text-body">{`Fees · ${v.fees.scheduleName} · ${fmtMoney(v.fees.annual)} USD a year on ${fmtMoney(v.fees.base)} USD · blended ${clientRate(v.fees.blendedRate)}`}</p>
      <p className="text-label normal-case text-ink-3">{`Prices as of ${fmtDayMonthYear(v.pricesAsOf)} close. ${v.taxNote}`}</p>
      <ol aria-label="Versions" className="flex flex-col gap-1">
        {detail.versions.map((x) => <li key={x.n} className="tabular text-label text-ink-3">{`v${x.n} · fingerprint ${x.fingerprint}`}</li>)}
      </ol>
      {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
    </section>
  )
}

function SleevesTable({ version }: { version: ProspectProposalVersion }) {
  return (
    <DataTable caption={`Model against the transfer · v${version.n}`} rows={version.sleeves} getRowId={(s) => s.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }} density="dense"
      columns={[
        { id: 'class', header: 'Asset class', cell: (s) => assetClassLabel(s.assetClass) },
        { id: 'target', header: 'Model', unit: '%', align: 'right', cell: (s) => <Num text={fmtWeight(s.target)} /> },
        { id: 'transferred', header: 'As transferred', unit: '%', align: 'right', cell: (s) => <Num text={fmtWeight(s.transferred)} /> },
      ]} />
  )
}

function TransferTable({ version }: { version: ProspectProposalVersion }) {
  return (
    <DataTable caption={`Transfer in kind · v${version.n}`} rows={version.transfer} getRowId={(l) => l.symbol} noun={{ singular: 'holding', plural: 'holdings' }} density="dense"
      columns={[
        { id: 'holding', header: 'Holding', wrap: true, cell: (l) => `${l.name} (${l.symbol})` },
        { id: 'shares', header: 'Shares', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} /> },
        { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.marketValue)} /> },
        { id: 'unrealized', header: 'Unrealized', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtResult(l.unrealized)} /> },
        { id: 'tax', header: 'Tax if sold now', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.taxIfSoldNow)} /> },
        { id: 'plan', header: 'Plan', cell: () => 'In kind' },
      ]} />
  )
}

function TranchesTable({ version }: { version: ProspectProposalVersion }) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable caption={`Staged sale option · v${version.n}`} rows={version.tranches} getRowId={(t) => String(t.n)} noun={{ singular: 'tranche', plural: 'tranches' }} density="dense"
        columns={[
          { id: 'year', header: 'Tax year', cell: (t) => String(t.taxYear) },
          { id: 'shares', header: 'Shares', unit: 'sh', align: 'right', cell: (t) => <Num text={fmtQuantity(t.shares)} /> },
          { id: 'gain', header: 'Gain', unit: 'USD', align: 'right', cell: (t) => <Num text={fmtResult(t.gain)} /> },
          { id: 'tax', header: 'Tax estimate', unit: 'USD', align: 'right', cell: (t) => <Num text={fmtMoney(t.tax)} /> },
        ]} />
      <p className="text-label normal-case text-ink-3">An option to decide with her CPA; nothing is sold.</p>
    </div>
  )
}
