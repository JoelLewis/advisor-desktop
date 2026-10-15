import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { fmtDate, fmtDayMonthYear, fmtEasternDayTime, fmtMoney, fmtPoints, fmtQuantity, fmtResult } from '@/kit/measure'
import { useDirectory } from '@/hooks/use-workspace'
import { useProspect } from '@/hooks/use-prospect-work'
import { isNotFound } from '@/workspace/is-not-found'
import { personIn } from '@/workspace/people/directory-people'
import { authorName } from '@/workspace/proposal/author-name'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import type { Directory } from '@/types/workspace'
import { DISCLOSURE_TITLES, type ProspectProposalDetail, type ProspectProposalVersion, type ProspectView } from '@/types/workspace-prospect'
import { OnboardingChecklist } from './OnboardingChecklist'
import { DISCLOSURE_TIMING, STAGE_WORDS } from './prospect-words'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

export function ProspectPage() {
  const { prospectId } = useParams()
  if (!prospectId) throw new Error('The prospect route needs a prospect id')
  return <ProspectGate key={prospectId} prospectId={prospectId} />
}

/** Firm-only: an outsider is told the prospect is not found, and a switch of "View as" to one goes home. */
function ProspectGate({ prospectId }: { prospectId: string }) {
  const prospect = useProspect(prospectId)
  const directory = useDirectory()
  const hiddenFromNewViewer = useGoHomeWhenHidden(prospect, 'this prospect')
  if (hiddenFromNewViewer || prospect.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the prospect…</p>
  if (prospect.isError) return isNotFound(prospect.error) ? <FullViewNotFound subject="Prospect" /> : <p role="alert" className="text-body">{prospect.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <ProspectRecordPage view={prospect.data} directory={directory.data} />
}

function versionState(detail: ProspectProposalDetail, v: ProspectProposalVersion): string {
  if (detail.accepted?.version === v.n) return 'Accepted'
  if (detail.sent?.version === v.n) return 'Sent'
  if (detail.approval?.version === v.n) return 'Approved'
  return '—'
}

function ProspectRecordPage({ view, directory }: { view: ProspectView; directory: Directory }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" party="prospect" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Tag tone="solid">{STAGE_WORDS[view.stage]}</Tag>
          {view.referrerName ? <span className="text-body text-ink-2">{`Referred by ${view.referrerName}`}</span> : null}
          <Link to={`/t/${encodeURIComponent(view.threadId)}`} className={LINK}>Her thread</Link>
          <Link to={`/t/${encodeURIComponent(view.internalThreadId)}`} className={LINK}>Prospect work</Link>
        </div>
      </header>
      <Pane title="Stage">
        <ol aria-label="Stage history" className="flex flex-col gap-1">
          {view.stageHistory.map((h) => <li key={`${h.stage}-${h.at}`} className="tabular text-body">{`${STAGE_WORDS[h.stage]} · ${fmtEasternDayTime(h.at)}`}</li>)}
        </ol>
      </Pane>
      <Pane title="Disclosures">
        <DataTable caption="Disclosures delivered" rows={view.disclosures} getRowId={(d) => d.document} noun={{ singular: 'disclosure', plural: 'disclosures' }} density="dense"
          columns={[
            { id: 'document', header: 'Document', wrap: true, cell: (d) => DISCLOSURE_TITLES[d.document] },
            { id: 'timing', header: 'Due', wrap: true, cell: (d) => DISCLOSURE_TIMING[d.document] },
            { id: 'at', header: 'Delivered', cell: (d) => <span className="tabular">{fmtEasternDayTime(d.at)}</span>, sortValue: (d) => d.at },
            { id: 'record', header: 'Record', cell: (d) => <span className="tabular">{d.actId}</span> },
            { id: 'by', header: 'By', cell: (d) => personIn(directory, d.deliveredBy).name },
          ]} />
      </Pane>
      <Pane title="Questionnaire and model">
        {view.profile && view.questionnaire ? (
          <p className="tabular text-body">{`Score ${fmtPoints(view.profile.score)} · ${view.profile.profileLabel} band (${view.profile.floor}–${view.profile.ceiling}) · ${view.profile.modelName} · answered ${fmtEasternDayTime(view.questionnaire.receivedAt)}`}</p>
        ) : <p className="text-body text-ink-2">Her questionnaire is not on file yet.</p>}
      </Pane>
      <Pane title="Transfer">
        {view.transfer ? (
          <div className="flex flex-col gap-2">
            <DataTable caption="Transfer summary" rows={view.transfer.lines} getRowId={(l) => l.symbol} noun={{ singular: 'holding', plural: 'holdings' }} density="dense"
              columns={[
                { id: 'holding', header: 'Holding', wrap: true, cell: (l) => `${l.name} (${l.symbol})` },
                { id: 'shares', header: 'Shares', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} /> },
                { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.marketValue)} /> },
                { id: 'unrealized', header: 'Unrealized', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtResult(l.unrealized)} /> },
                { id: 'tax', header: 'Tax if sold now', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.taxIfSoldNow)} /> },
              ]} />
            <p className="tabular text-body">{`Transfers ${fmtMoney(view.transfer.transferValue)} USD of ${fmtMoney(view.transfer.totalAssets)} USD; the 403(b) stays held away (rollover: asked about; comparison to follow).`}</p>
            <p className="text-label normal-case text-ink-3">{`Prices as of ${fmtDayMonthYear(view.transfer.pricesAsOf)} close. Tax figures are estimates; state tax is not modeled; consult your tax professional.`}</p>
          </div>
        ) : <p className="text-body text-ink-2">Her statements are not on file yet.</p>}
      </Pane>
      <Pane title="Proposal">
        {view.proposals.length === 0 ? <p className="text-body text-ink-2">No proposal yet.</p> : view.proposals.map((p) => (
          <DataTable key={p.id} caption={`Versions · ${p.title}`} rows={p.versions} getRowId={(v) => String(v.n)} noun={{ singular: 'version', plural: 'versions' }} density="dense"
            columns={[
              { id: 'n', header: 'Version', cell: (v) => <span className="tabular">{`v${v.n}`}</span>, sortValue: (v) => v.n },
              { id: 'author', header: 'Author', cell: (v) => authorName(v.author, directory) },
              { id: 'created', header: 'Created', cell: (v) => <span className="tabular">{fmtEasternDayTime(v.createdAt)}</span> },
              { id: 'change', header: 'Change', wrap: true, cell: (v) => v.changeSummary },
              { id: 'fingerprint', header: 'Fingerprint', cell: (v) => <span className="tabular">{v.fingerprint}</span> },
              { id: 'state', header: 'State', cell: (v) => versionState(p, v) },
            ]} />
        ))}
      </Pane>
      {view.tasks.length > 0 ? (
        <Pane title="Follow-up">
          <ul className="flex flex-col gap-1">{view.tasks.map((t) => <li key={t.id} className="tabular text-body">{`${t.text} · ${personIn(directory, t.ownerId).name} · due ${fmtDate(t.due)}`}</li>)}</ul>
        </Pane>
      ) : null}
      {view.onboarding ? (
        <Pane title="Onboarding">
          <OnboardingChecklist view={view} directory={directory} canDeliver={false} onRecorded={() => undefined} />
        </Pane>
      ) : null}
    </div>
  )
}
