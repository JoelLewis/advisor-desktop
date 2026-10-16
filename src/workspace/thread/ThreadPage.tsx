import { useParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { useDirectory, useThread } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import type { Directory, ThreadDetail } from '@/types/workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { threadTitleFor } from '@/workspace/people/roster'
import { bandWordsOf } from '@/workspace/people/visibility-words'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { Composer } from './Composer'
import { MessageView } from './MessageView'

export function ThreadPage() {
  const { threadId } = useParams()
  if (!threadId) throw new Error('The thread route needs a thread id')
  return <ThreadView key={threadId} threadId={threadId} />
}

function ThreadView({ threadId }: { threadId: string }) {
  const thread = useThread(threadId)
  const directory = useDirectory()
  const hiddenFromNewViewer = useGoHomeWhenHidden(thread, 'this thread')

  if (hiddenFromNewViewer || thread.isPending || directory.isPending) {
    return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  }
  if (thread.isError) return isNotFound(thread.error) ? <FullViewNotFound subject="Thread" /> : <p role="alert" className="text-body">{thread.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <Thread detail={thread.data} directory={directory.data} />
}

function Thread({ detail: { thread, messages, audience, roster }, directory }: { detail: ThreadDetail; directory: Directory }) {
  const { viewerId } = useViewer()
  const viewerIsExternal = isExternalViewerIn(directory, viewerId)
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <VisibilityBand visibility={thread.visibility} scale="thread" words={bandWordsOf(audience, viewerIsExternal)} />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{threadTitleFor(thread, viewerIsExternal)}</h1>
        <p role="note" aria-label="Who can see" className="text-body text-ink-2">
          <span aria-hidden="true" className="text-ink-3">Who can see: </span>{roster.join(', ')}
        </p>
      </header>
      {messages.length === 0 ? <p className="text-body text-ink-3">No messages yet.</p> : (
        <ol aria-label="Messages" className="flex min-w-0 flex-col">
          {messages.map((m) => (
            <li key={m.id} className="min-w-0 border-b border-rule py-5 first:pt-0 last:border-b-0">
              <MessageView message={m} thread={thread} directory={directory} />
            </li>
          ))}
        </ol>
      )}
      <Composer thread={thread} directory={directory} />
    </div>
  )
}
