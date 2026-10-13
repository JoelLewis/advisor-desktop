import { useParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { useDirectory, useThread } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import type { Directory, ThreadDetail } from '@/types/workspace'
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
  const hiddenFromNewViewer = useGoHomeWhenHidden(thread)

  if (hiddenFromNewViewer || thread.isPending || directory.isPending) {
    return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  }
  if (thread.isError) return isNotFound(thread.error) ? <FullViewNotFound subject="Thread" /> : <p role="alert" className="text-body">{thread.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <Thread detail={thread.data} directory={directory.data} />
}

function Thread({ detail: { thread, messages }, directory }: { detail: ThreadDetail; directory: Directory }) {
  const audience = thread.visibility === 'client' ? directory.people.find((p) => p.id === thread.clientId)?.name : undefined
  if (thread.visibility === 'client' && !audience) throw new Error(`The client of thread "${thread.id}" is not in the directory`)
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <VisibilityBand visibility={thread.visibility} scale="thread" audience={audience} />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{thread.title}</h1>
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
