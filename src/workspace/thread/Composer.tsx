import { useId, useState, type FormEvent } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { useCreateDraft, usePostMessage } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory, Thread } from '@/types/workspace'
import { composerModeOf } from './composer-mode'

export function Composer({ thread, directory }: { thread: Thread; directory: Directory }) {
  const { viewerId } = useViewer()
  const mode = composerModeOf(thread, viewerId, directory)
  switch (mode.kind) {
    case 'read-only':
      return <p className="border-t border-rule pt-4 text-body text-ink-3">You can read this thread but not post in it.</p>
    case 'post':
      return <PostComposer threadId={thread.id} action={mode.action} />
    case 'draft':
      return <DraftComposer threadId={thread.id} addressName={mode.addressName} />
  }
}

function PostComposer({ threadId, action }: { threadId: string; action: string }) {
  const post = usePostMessage(threadId)
  return <ComposerForm label="Message" action={action} pending={post.isPending} error={post.error}
    submit={(body, onSaved) => post.mutate(body, { onSuccess: onSaved })} />
}

function DraftComposer({ threadId, addressName }: { threadId: string; addressName: string }) {
  const draft = useCreateDraft(threadId)
  return <ComposerForm label="Draft" action="Save draft" pending={draft.isPending} error={draft.error}
    placeholder={`Write a draft for ${addressName} (not sent until you send it)`} savedNote="Draft saved — not sent."
    submit={(body, onSaved) => draft.mutate(body, { onSuccess: onSaved })} />
}

type ComposerFormProps = {
  label: string
  action: string
  pending: boolean
  error: Error | null
  placeholder?: string
  savedNote?: string
  submit: (body: string, onSaved: () => void) => void
}

function ComposerForm({ label, action, pending, error, placeholder, savedNote, submit }: ComposerFormProps) {
  const announce = useAnnounce()
  const fieldId = useId()
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState(false)
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (body.trim() === '') return
    submit(body, () => { setBody(''); setSaved(true); announce(savedNote ?? 'Posted.'); requestAnimationFrame(() => document.getElementById(fieldId)?.focus()) })
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-ink pt-4">
      <TextInput label={label} value={body} id={fieldId} placeholder={placeholder} readOnly={pending}
        onChange={(v) => { setBody(v); setSaved(false) }} />
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {error ? <p role="alert" className="mr-auto text-body">{error.message}</p> : null}
        {saved && savedNote ? <p className="mr-auto text-body text-ink-2">{savedNote}</p> : null}
        <Button type="submit" pending={pending} disabled={body.trim() === ''}>{action}</Button>
      </div>
    </form>
  )
}
