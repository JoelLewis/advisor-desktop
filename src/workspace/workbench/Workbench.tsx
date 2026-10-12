import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { fmtTimestamp } from '@/kit/measure'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useThread } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { authorName } from '@/workspace/proposal/author-name'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { canPostIn } from '@/workspace/thread/can-post'
import type { Directory } from '@/types/workspace'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { DraftBar } from './DraftBar'
import { LegDetail } from './LegDetail'
import { WorkbenchLegs } from './WorkbenchLegs'
import { WorkbenchSummary } from './WorkbenchSummary'
import { isExcluded, lotsOf, quantityOf } from './edit-draft'
import { useDraftVersion } from './use-draft-version'
import { useSaveShortcut } from './use-save-shortcut'

export function Workbench({ detail, directory }: { detail: ProposalDetail; directory: Directory }) {
  const [params] = useSearchParams()
  const { viewerId } = useViewer()
  const thread = useThread(detail.threadId)
  const draft = useDraftVersion(detail)
  const [expanded, setExpanded] = useState<string>()
  const canEdit = thread.data !== undefined && canPostIn(thread.data.thread, viewerId, directory)
  useSaveShortcut(draft.save, canEdit)
  const from = params.get('from') ?? detail.threadId
  const latest = latestVersionOf(detail)
  const view = draft.view
  const caption = draft.dirty ? 'Legs · draft' : `Legs · v${latest.n}`
  const edit = (symbol: string) => ({
    toggleExclude: () => draft.dispatch({ type: 'toggle_exclude', symbol }),
    quantity: (quantity: number | undefined) => draft.dispatch({ type: 'set_quantity', symbol, quantity }),
    lots: (lotIds: string[]) => draft.dispatch({ type: 'set_lots', symbol, lotIds }),
  })
  const expandedEdit = expanded && canEdit ? edit(expanded) : undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link to={`/t/${encodeURIComponent(from)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Back to the thread</Link>
        <span className="text-label uppercase text-ink-3">Proposal</span>
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{detail.title}</h1>
        <p className="tabular text-label text-ink-3">{`v${latest.n} latest · ${authorName(latest.author, directory)} · ${fmtTimestamp(latest.createdAt)} · fingerprint ${latest.fingerprint}`}</p>
        <ApprovalNote state={detail.approval} />
        <p className="text-body text-ink-2">The workbench never approves. Approval is a recorded act in the thread.</p>
      </header>
      {canEdit ? <DraftBar draft={draft} latestVersion={latest.n} /> : null}
      {thread.data !== undefined && !canEdit ? <p className="text-body text-ink-3">You can read this proposal but not change it.</p> : null}
      <Pane title="Legs" meta={draft.dirty ? 'draft' : `v${latest.n}`}>
        <WorkbenchLegs view={view} caption={caption}
          onExpand={(s) => setExpanded((open) => (open === s ? undefined : s))}
          onToggleExclude={canEdit ? (symbol) => edit(symbol).toggleExclude() : undefined} />
        {expanded ? (
          <LegDetail key={expanded} accountId={detail.accountId} view={view} symbol={expanded}
            excluded={isExcluded(draft.edits, expanded)}
            quantity={quantityOf(draft.edits, expanded)} lotIds={lotsOf(draft.edits, expanded)}
            onToggleExclude={expandedEdit?.toggleExclude} onQuantity={expandedEdit?.quantity} onLots={expandedEdit?.lots}
            refusal={draft.previewError} />
        ) : null}
      </Pane>
      <WorkbenchSummary detail={detail} view={view} />
    </div>
  )
}
