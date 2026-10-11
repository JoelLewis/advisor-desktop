import { useId, useRef } from 'react'
import { Button } from '@/kit/button/Button'
import { fmtTimestamp } from '@/kit/measure'
import { useDrafts, useSendToClient } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { firstNameOf, personIn } from '@/workspace/people/directory-people'
import type { Directory, Draft, Thread } from '@/types/workspace'

type DraftsPanelProps = { thread: Thread; directory: Directory; onSent: (actId: string) => void }

/** Drafts held for the client. Sending one is the binding act; only a viewer the engine permits sees the Send button. */
export function DraftsPanel({ thread, directory, onSent }: DraftsPanelProps) {
  const { viewerId } = useViewer()
  const drafts = useDrafts(thread.id, true)
  const send = useSendToClient(thread.id)
  const sending = useRef(new Set<string>())
  if (!thread.clientId) throw new Error(`Thread "${thread.id}" has no client to send to`)
  const client = personIn(directory, thread.clientId)
  const canSend = (directory.permissions[viewerId] ?? []).includes('send_to_client')

  // A ref, not render state, so a second click in the same frame as the first cannot start a second send.
  const sendDraft = (draftId: string) => {
    if (sending.current.has(draftId)) return
    sending.current.add(draftId)
    send.mutate(draftId, { onSuccess: (act) => onSent(act.id), onSettled: () => sending.current.delete(draftId) })
  }

  if (drafts.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading drafts…</p>
  if (drafts.isError) return <p role="alert" className="py-5 text-body">{drafts.error.message}</p>
  if (drafts.data.length === 0 && !send.error) return null
  return (
    <div className="flex min-w-0 flex-col gap-4 py-5 first:pt-0">
      {drafts.data.map((d) => (
        <DraftView key={d.id} draft={d} directory={directory} sendLabel={canSend ? `Send to ${firstNameOf(client)}` : undefined}
          sending={send.isPending} onSend={() => sendDraft(d.id)} />
      ))}
      {send.error ? <p role="alert" className="text-body">{send.error.message}</p> : null}
    </div>
  )
}

type DraftViewProps = { draft: Draft; directory: Directory; sendLabel?: string; sending: boolean; onSend: () => void }

function DraftView({ draft, directory, sendLabel, sending, onSend }: DraftViewProps) {
  const titleId = useId()
  const author = personIn(directory, draft.authorId)
  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-3 border border-ink p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={titleId} className="text-label uppercase text-ink">Draft · not sent</h2>
        <span className="tabular text-label text-ink-3">{fmtTimestamp(draft.createdAt)}</span>
      </div>
      <p className="whitespace-pre-line text-copy">{draft.body}</p>
      <p className="text-label text-ink-3">{`Drafted by ${author.name}`}</p>
      <div className="flex flex-col items-start gap-3 border-t border-rule pt-3">
        <p className="text-body text-ink-2">
          {sendLabel ? 'Sending is recorded as a binding act by you.' : 'Not sent. Sending is recorded as a binding act by the advisor who sends it.'}
        </p>
        {sendLabel ? <Button disabled={sending} onClick={onSend}>{sendLabel}</Button> : null}
      </div>
    </article>
  )
}
