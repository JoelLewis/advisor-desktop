import { Link, useSearchParams } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { authorName } from '@/workspace/proposal/author-name'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import type { Directory } from '@/types/workspace'
import type { ProposalDetail } from '@/types/workspace-proposal'

export function Workbench({ detail, directory }: { detail: ProposalDetail; directory: Directory }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? detail.threadId
  const latest = latestVersionOf(detail)
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
    </div>
  )
}
