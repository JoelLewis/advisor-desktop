import { Link } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { fmtTimestamp } from '@/kit/measure'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import { PretradeNotes } from '@/workspace/proposal/PretradeNotes'
import { ProposalLegsTable } from '@/workspace/proposal/ProposalLegsTable'
import { RestrictionList } from '@/workspace/proposal/RestrictionList'
import { FillList } from '@/workspace/proposal/FillList'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { StagedOrderList } from '@/workspace/proposal/StagedOrderList'
import { taxScope } from '@/workspace/proposal/tax-scope'
import type { Directory } from '@/types/workspace'
import type { OrdersItem } from '@/types/workspace-supervision'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'
const TERM = 'text-label uppercase text-ink-3'

/** The record of what was approved, as compliance reviews it. Nothing here re-runs a check. */
export function OrdersEvidence({ item, directory }: { item: OrdersItem; directory: Directory }) {
  const approver = personIn(directory, item.approval.approverId)
  const v = item.version
  const s = v.summary
  // As the workbench's tape: the return's year to date, short plus long (collectibles are part of long).
  const ytd = v.preview.ytdRealisedOnReturn
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="Approval record">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
          <dt className={TERM}>Version</dt><dd className="tabular">{`v${v.n}`}</dd>
          <dt className={TERM}>Fingerprint</dt><dd className="tabular">{item.approval.fingerprint}</dd>
          <dt className={TERM}>Approved by</dt><dd>{`${approver.name}, ${ROLE_LABEL[approver.role]}`}</dd>
          <dt className={TERM}>At</dt><dd className="tabular">{fmtTimestamp(item.approval.at)}</dd>
          <dt className={TERM}>Record</dt><dd className="tabular">{item.approval.actId}</dd>
        </dl>
        {item.latestVersion > v.n ? <p className="text-body text-ink-2">{`v${item.latestVersion} is newer and unapproved; these orders are from v${v.n}.`}</p> : null}
        <p className="text-body text-ink-2">This is the record of what was approved. The checks are not run again here.</p>
      </Pane>
      <OrdersStatus item={item} />
      <Pane title="Approved legs"><ProposalLegsTable version={v} caption={`Approved legs · v${v.n}`} /></Pane>
      <Pane title="Tax effect" meta="return-level estimate against this year's results">
        <TaxTape gains={s.gains} losses={s.losses} netShortTerm={s.netShortTerm} netLongTerm={s.netLongTerm}
          grossTax={s.grossTax} netTax={s.netTax} scope={taxScope(v.preview)} rateBasis={RATE_DISCLOSURE}
          yearToDate={ytd ? ytd.shortTerm + ytd.longTerm : undefined} />
      </Pane>
      <Pane title="Pre-trade reading"><PretradeNotes pretrade={v.pretrade} /></Pane>
      <RestrictionList restrictions={v.preview.repurchaseRestrictions} />
      <div className="flex flex-wrap gap-4">
        <Link to={`/t/${encodeURIComponent(item.threadId)}`} className={LINK}>Team thread <span aria-hidden="true">↗</span></Link>
        <Link to={proposalWorkbenchHref(item.proposalId, item.threadId)} className={LINK}>Workbench <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  )
}

function OrdersStatus({ item }: { item: OrdersItem }) {
  if (item.approval.status === 'released') {
    return (
      <Pane title="Filled">
        <p className="flex flex-wrap items-baseline gap-2 text-body"><Tag tone="solid">FILLED</Tag><span className="text-ink-2">Released and filled at the day&apos;s prices.</span></p>
        <FillList fills={item.fills} label="Fills" withTime />
      </Pane>
    )
  }
  if (item.approval.status === 'returned') {
    return <p className="flex flex-wrap items-baseline gap-2 text-body"><Tag>RETURNED</Tag><span className="text-ink-2">Returned to the advisor; the approval is withdrawn.</span></p>
  }
  const pending = item.staged.filter((o) => o.status === 'pending_compliance')
  return (
    <Pane title="Staged orders">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="hatch">PENDING COMPLIANCE REVIEW</Tag>
        {item.escalation ? <Tag tone="solid">ESCALATED</Tag> : null}
      </p>
      <StagedOrderList orders={pending} />
    </Pane>
  )
}
