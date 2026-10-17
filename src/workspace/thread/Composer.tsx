import { useId, useState, type FormEvent } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { useDrafts, usePostMessage, useSaveAndSend, useSaveDraft, type KeptDraft } from '@/hooks/use-workspace'
import { NotSentError } from '@/hooks/not-sent-error'
import { cn } from '@/lib/utils'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory, Thread } from '@/types/workspace'
import { composerModeOf, type ComposerMode } from './composer-mode'

export function Composer({ thread, directory }: { thread: Thread; directory: Directory }) {
  const { viewerId } = useViewer()
  const mode = composerModeOf(thread, viewerId, directory)
  switch (mode.kind) {
    case 'read-only':
      return <p className="border-t border-rule pt-4 text-body text-ink-3">You can read this thread but not post in it.</p>
    case 'post':
      return <PostComposer threadId={thread.id} label={mode.label} action={mode.action} />
    case 'draft':
      return <ClientComposer threadId={thread.id} mode={mode} />
  }
}

const DRAFT_SAVED = 'Draft saved — not sent.'

function PostComposer({ threadId, label, action }: { threadId: string; label: string; action: string }) {
  const post = usePostMessage(threadId)
  const announce = useAnnounce()
  return <ComposerForm label={label} action={action} pending={post.isPending} error={post.error}
    submit={(body, done) => post.mutate(body, { onSuccess: () => { done(); announce('Posted.') } })} />
}

/** The riskiest moment: writing something the client will read. The frame is tinted and every word names the client. */
function ClientComposer({ threadId, mode }: { threadId: string; mode: Extract<ComposerMode, { kind: 'draft' }> }) {
  const draft = useSaveDraft(threadId)
  const send = useSaveAndSend(threadId)
  const drafts = useDrafts(threadId, true)
  const announce = useAnnounce()
  // A refused send leaves the text both in the field and in Drafts. The next save or send reuses that draft
  // (revised if the text changed) instead of saving a second copy — while the draft is still there to reuse.
  const [kept, setKept] = useState<KeptDraft | undefined>(undefined)
  const keptDraft = kept && drafts.data?.some((d) => d.id === kept.draftId) ? kept : undefined
  // Each act clears the other's error, so the alert always speaks of the last thing tried.
  const saveDraft: Submit = (body, done) => {
    send.reset()
    draft.mutate({ body, kept: keptDraft }, { onSuccess: () => { setKept(undefined); done(DRAFT_SAVED); announce(DRAFT_SAVED) } })
  }
  const sendNow: Submit = (body, done) => {
    draft.reset()
    send.mutate({ body, kept: keptDraft }, {
      onSuccess: ({ act }) => { setKept(undefined); done(); announce(`Sent to ${mode.addressName} · ${act.id}`) },
      onError: (error) => { if (error instanceof NotSentError) setKept({ draftId: error.draftId, body }) },
    })
  }
  return (
    <ComposerForm label={`Message to ${mode.partyName}`} tinted
      action={mode.canSend ? `Send to ${mode.addressName}` : 'Save draft'}
      secondary={mode.canSend ? { label: 'Save draft', pending: draft.isPending || send.isPending, run: saveDraft } : undefined}
      pending={draft.isPending || send.isPending} error={send.error ?? draft.error}
      submit={mode.canSend ? sendNow : saveDraft} />
  )
}

/** `done` clears the field and returns focus to it; a note, when given, stays under the field until the next edit. */
type Submit = (body: string, done: (note?: string) => void) => void

type ComposerFormProps = {
  label: string
  action: string
  pending: boolean
  error: Error | null
  tinted?: boolean
  secondary?: { label: string; pending: boolean; run: Submit }
  submit: Submit
}

function ComposerForm({ label, action, pending, error, tinted = false, secondary, submit }: ComposerFormProps) {
  const fieldId = useId()
  const [body, setBody] = useState('')
  const [note, setNote] = useState<string | undefined>(undefined)
  const done = (saved?: string) => {
    setBody('')
    setNote(saved)
    requestAnimationFrame(() => document.getElementById(fieldId)?.focus())
  }
  const run = (act: Submit) => { if (body.trim() !== '') act(body, done) }
  const onSubmit = (e: FormEvent) => { e.preventDefault(); run(submit) }
  return (
    <form onSubmit={onSubmit} className={cn('flex flex-col gap-3 border-t border-ink', tinted ? 'bg-shared p-4' : 'pt-4')}>
      <TextInput label={label} value={body} id={fieldId} readOnly={pending}
        onChange={(v) => { setBody(v); setNote(undefined) }} />
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {error ? <p role="alert" className="mr-auto text-body">{error.message}</p> : null}
        {note ? <p className="mr-auto text-body text-ink-2">{note}</p> : null}
        {secondary ? (
          <Button rank="secondary" pending={secondary.pending} disabled={body.trim() === ''}
            onClick={() => run(secondary.run)}>{secondary.label}</Button>
        ) : null}
        <Button type="submit" pending={pending} disabled={body.trim() === ''}>{action}</Button>
      </div>
    </form>
  )
}
