import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { useActs, useDirectory, useThread } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { isClientViewer } from '@/workspace/people/directory-people'
import { canPostIn } from '@/workspace/thread/can-post'
import { actAnchorId } from './act-anchor'
import { ActsPanel } from './ActsPanel'
import { ApprovalPanel } from './ApprovalPanel'
import { AskAgents } from './AskAgents'
import { DraftsPanel } from './DraftsPanel'
import { FullViews } from './FullViews'
import { WhoCanSee } from './WhoCanSee'

export function ContextColumn() {
  const { threadId } = useParams()
  if (!threadId) throw new Error('The thread context needs a thread id')
  return <ThreadContext key={threadId} threadId={threadId} />
}

function ThreadContext({ threadId }: { threadId: string }) {
  const { viewerId } = useViewer()
  const thread = useThread(threadId)
  const directory = useDirectory()
  const acts = useActs(threadId)
  const focusAfter = useFocusAfter()
  const [sentActId, setSentActId] = useState<string>()
  const sentSlipShown = sentActId !== undefined && (acts.data?.some((a) => a.id === sentActId) ?? false)

  // Focus moves to the new act's slip once the refreshed acts have put it on screen.
  useEffect(() => {
    if (sentActId && sentSlipShown) focusAfter(actAnchorId(sentActId))
  }, [sentActId, sentSlipShown, focusAfter])

  // The thread itself reports load errors and unseen threads; the context column stays quiet.
  if (thread.isError || directory.isError) return null
  if (thread.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the context…</p>

  const { thread: t } = thread.data
  const dir = directory.data
  const viewerIsClient = isClientViewer(dir, viewerId)
  const agents = dir.agents.filter((a) => t.agentIds.includes(a.id))
  const accountId = t.subject?.type === 'account' ? t.subject.id : undefined
  return (
    <div className="flex min-w-0 flex-col divide-y divide-rule">
      <WhoCanSee thread={t} directory={dir} viewerIsClient={viewerIsClient} />
      {t.visibility !== 'client' && !viewerIsClient ? <ApprovalPanel thread={t} directory={dir} onRecorded={setSentActId} /> : null}
      {t.visibility === 'client' && !viewerIsClient
        ? <DraftsPanel thread={t} directory={dir} onSent={setSentActId} /> : null}
      {acts.isPending ? <p role="status" className="py-5 text-body text-ink-3">Loading the record…</p>
        : acts.isError ? <p role="alert" className="py-5 text-body">{acts.error.message}</p>
        : <ActsPanel acts={acts.data} directory={dir} viewerIsClient={viewerIsClient} />}
      {t.visibility !== 'client' && agents.length > 0 ? <AskAgents thread={t} agents={agents} canPost={canPostIn(t, viewerId, dir)} /> : null}
      {accountId && !viewerIsClient ? <FullViews accountId={accountId} threadId={t.id} /> : null}
    </div>
  )
}
