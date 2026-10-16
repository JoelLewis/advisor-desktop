import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { useActs, useDirectory, useThread } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { threadParty } from '@/workspace/people/thread-party'
import { ProspectWorkPanel } from '@/workspace/prospect/ProspectWorkPanel'
import { PartyStepsPanel } from '@/workspace/prospect/PartyStepsPanel'
import { ProspectPanel } from '@/workspace/prospect/ProspectPanel'
import { canPostIn } from '@/workspace/thread/can-post'
import { actAnchorId } from './act-anchor'
import { ActsPanel } from './ActsPanel'
import { ApprovalPanel } from './ApprovalPanel'
import { AskAgents } from './AskAgents'
import { DraftsPanel } from './DraftsPanel'
import { FullViews } from './FullViews'
import { MeetingPanel } from './MeetingPanel'
import { ThreadAgents } from './ThreadAgents'

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
  const viewerIsExternal = isExternalViewerIn(dir, viewerId)
  const agents = dir.agents.filter((a) => t.agentIds.includes(a.id))
  const subject = t.subject
  return (
    <div className="flex min-w-0 flex-col divide-y divide-rule">
      {viewerIsExternal ? null : <ThreadAgents thread={t} directory={dir} />}
      {t.visibility === 'client' && threadParty(t) === 'prospect' && t.partyId !== undefined && !viewerIsExternal
        ? <ProspectPanel prospectId={t.partyId} directory={dir} onRecorded={setSentActId} /> : null}
      {t.visibility === 'client' && threadParty(t) === 'prospect' && t.partyId !== undefined && viewerIsExternal
        ? <PartyStepsPanel prospectId={t.partyId} onRecorded={setSentActId} /> : null}
      {t.visibility !== 'client' && !viewerIsExternal ? <ApprovalPanel thread={t} directory={dir} onRecorded={setSentActId} /> : null}
      {t.visibility === 'internal' && !viewerIsExternal ? <MeetingPanel thread={t} directory={dir} onRecorded={setSentActId} /> : null}
      {t.visibility === 'internal' && t.subject?.type === 'prospect' && !viewerIsExternal
        ? <ProspectWorkPanel prospectId={t.subject.id} directory={dir} onRecorded={setSentActId} /> : null}
      {t.visibility === 'client' && !viewerIsExternal
        ? <DraftsPanel thread={t} directory={dir} onSent={setSentActId} /> : null}
      {acts.isPending ? <p role="status" className="py-5 text-body text-ink-3">Loading the record…</p>
        : acts.isError ? <p role="alert" className="py-5 text-body">{acts.error.message}</p>
        : <ActsPanel acts={acts.data} directory={dir} viewerIsExternal={viewerIsExternal} />}
      {t.visibility !== 'client' && agents.length > 0 ? <AskAgents thread={t} agents={agents} canPost={canPostIn(t, viewerId, dir)} /> : null}
      {subject && !viewerIsExternal ? <FullViews subject={subject} threadId={t.id} /> : null}
    </div>
  )
}
