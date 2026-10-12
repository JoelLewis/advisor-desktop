import { Link, useParams } from 'react-router-dom'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { useDirectory, useProposal, useThread } from '@/hooks/use-workspace'
import { Composer } from '@/workspace/thread/Composer'
import { CompactMessage } from './CompactMessage'

/** The proposal's team thread, live beside the workbench: the same queries as the thread page, so both update together. */
export function WorkbenchThreadColumn() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench needs a proposal id')
  const proposal = useProposal(proposalId)
  if (proposal.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (proposal.isError) return null
  return <ThreadFeed threadId={proposal.data.threadId} />
}

function ThreadFeed({ threadId }: { threadId: string }) {
  const thread = useThread(threadId)
  const directory = useDirectory()
  if (thread.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (thread.isError) return <p role="alert" className="text-body">{thread.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const { thread: t, messages } = thread.data
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body font-semibold">{t.title}</span>
        <Link to={`/t/${encodeURIComponent(t.id)}`} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Open the thread</Link>
      </div>
      <VisibilityBand visibility={t.visibility} scale="message" />
      <ol aria-label="Thread feed" className="flex min-w-0 flex-col">
        {messages.map((m) => (
          <li key={m.id} className="min-w-0 border-b border-rule py-3 first:pt-0 last:border-b-0">
            <CompactMessage message={m} directory={directory.data} />
          </li>
        ))}
      </ol>
      <Composer thread={t} directory={directory.data} />
    </div>
  )
}
