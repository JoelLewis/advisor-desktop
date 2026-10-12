import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Tag } from '@/kit/tag/Tag'
import { TextInput } from '@/kit/text-input/TextInput'
import { fmtTimestamp } from '@/kit/measure'
import { useDrafts, useProposals, useReviseDraft, useSendToClient } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { firstNameOf, personIn } from '@/workspace/people/directory-people'
import type { Directory, Draft, Thread } from '@/types/workspace'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { ContextSection } from './ContextSection'
import { LetterControl } from './LetterControl'
import { draftOrigin } from './draft-origin'

type DraftsPanelProps = { thread: Thread; directory: Directory; onSent: (actId: string) => void }

/** Drafts held for the client. Sending one is the binding act; only a viewer the engine permits sees the Send button. */
export function DraftsPanel({ thread, directory, onSent }: DraftsPanelProps) {
  const { viewerId } = useViewer()
  const drafts = useDrafts(thread.id, true)
  const proposals = useProposals()
  const send = useSendToClient()
  const sending = useRef(new Set<string>())
  if (!thread.clientId) throw new Error(`Thread "${thread.id}" has no client to send to`)
  const client = personIn(directory, thread.clientId)
  const acts = directory.permissions[viewerId] ?? []
  const canSend = acts.includes('send_to_client')
  const canDraft = acts.includes('draft_for_client')

  // A ref, not render state, so a second click in the same frame as the first cannot start a second send.
  // A refused send (a stale letter) refetches, so the draft shows why it was refused.
  const sendDraft = (draftId: string) => {
    if (sending.current.has(draftId)) return
    sending.current.add(draftId)
    send.mutate(draftId, {
      onSuccess: (act) => onSent(act.id),
      onError: () => { void drafts.refetch(); void proposals.refetch() },
      onSettled: () => sending.current.delete(draftId),
    })
  }

  if (drafts.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading drafts…</p>
  if (drafts.isError) return <p role="alert" className="py-5 text-body">{drafts.error.message}</p>
  if (!canDraft && drafts.data.length === 0 && !send.error) return null
  const clientFirstName = firstNameOf(client)
  return (
    <ContextSection title={`Drafts for ${clientFirstName}`}>
      {canDraft ? <LetterControl thread={thread} /> : null}
      {drafts.data.map((d) => (
        <DraftView key={d.id} draft={d} directory={directory} threadId={thread.id} canEdit={canDraft}
          staleReason={d.stale ? staleReason(d, proposals.data) : undefined}
          sendLabel={canSend ? `Send to ${clientFirstName}` : undefined} sending={send.isPending} onSend={() => sendDraft(d.id)} />
      ))}
      {send.error ? <p role="alert" className="text-body">{send.error.message}</p> : null}
    </ContextSection>
  )
}

/** Why a letter's basis is no longer the approval, read from where the approval stands now. */
function staleReason(draft: Draft, proposals: ProposalDetail[] | undefined): string {
  const from = `v${draft.basis?.version ?? ''}`
  const approval = proposals?.find((p) => p.id === draft.basis?.proposalId)?.approval
  const why = approval?.kind === 'approved' && approval.version !== draft.basis?.version ? `The approval moved to v${approval.version}; this letter is from ${from}.`
    : approval?.kind === 'unapproved' ? `The approval of ${from} was withdrawn.`
    : `${from} is no longer the approved version.`
  return `${why} Ask the Client Letter Agent for a new letter.`
}

type DraftViewProps = {
  draft: Draft; directory: Directory; threadId: string; canEdit: boolean; staleReason?: string
  sendLabel?: string; sending: boolean; onSend: () => void
}

function DraftView({ draft, directory, threadId, canEdit, staleReason, sendLabel, sending, onSend }: DraftViewProps) {
  const titleId = useId()
  const reasonId = useId()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft.body)
  const revise = useReviseDraft(threadId)
  const save = () => revise.mutate({ draftId: draft.id, body: text }, { onSuccess: () => setEditing(false) })
  const startEditing = () => { setText(draft.body); setEditing(true) }
  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-3 border border-ink p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={titleId} className="text-label uppercase text-ink">Draft · not sent</h3>
        <span className="tabular text-label text-ink-3">{fmtTimestamp(draft.createdAt)}</span>
      </div>
      {staleReason ? (
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">STALE</Tag>
          <span id={reasonId}>{staleReason}</span>
        </p>
      ) : null}
      {editing ? (
        <div className="flex flex-col gap-2">
          <TextInput label="Edit the letter" value={text} rows={14} onChange={setText} />
          <div className="flex gap-3">
            <Button onClick={save} disabled={revise.isPending || text.trim() === ''}>Save edit</Button>
            <Button rank="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
          {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
        </div>
      ) : <p className="whitespace-pre-line text-copy">{draft.body}</p>}
      <p className="text-label text-ink-3">{draftOrigin(draft, directory)}</p>
      <div className="flex flex-col items-start gap-3 border-t border-rule pt-3">
        <p className="text-body text-ink-2">
          {sendLabel ? 'Sending is recorded as a binding act by you.' : 'Only the advisor of record can send this. Sending is recorded as a binding act.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {canEdit && !editing && staleReason === undefined ? <Button rank="secondary" onClick={startEditing}>Edit</Button> : null}
          {sendLabel ? (
            <Button disabled={sending || staleReason !== undefined || editing} aria-describedby={staleReason ? reasonId : undefined} onClick={onSend}>
              {sendLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
