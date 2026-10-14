import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { useReviseAgenda } from '@/hooks/use-meetings'
import type { AgendaItem, AgendaItemInput, MeetingView } from '@/types/workspace-meeting'
import type { AgendaFinding } from './agenda-findings'
import { focusAfterChange, type AgendaControl, type FocusIntent, type FocusRequest } from './agenda-focus'

type AgendaEditorProps = { meeting: MeetingView; findings: AgendaFinding[]; editable: boolean }

const asInput = ({ id, title, source }: AgendaItem): AgendaItemInput => ({ id, title, source })
const swap = <T,>(list: readonly T[], i: number, j: number): T[] => list.map((x, k) => (k === i ? list[j]! : k === j ? list[i]! : x))
const controlKey = (itemId: string, control: AgendaControl) => `${itemId}:${control}`

/** The current agenda. Editable, each change — a move, a drop, an addition — is sent as the whole new agenda and becomes a new version. */
export function AgendaEditor({ meeting, findings, editable }: AgendaEditorProps) {
  const current = meeting.agenda[meeting.agenda.length - 1]
  const revise = useReviseAgenda(meeting.eventId)
  const [title, setTitle] = useState('')
  const [announced, setAnnounced] = useState(false)
  const [focusRequest, setFocusRequest] = useState<FocusRequest>()
  const busy = useRef(false)
  const editor = useRef<HTMLDivElement>(null)
  const statusLine = useRef<HTMLParagraphElement>(null)
  const findingsId = useId()
  const items = current?.items ?? []

  // Once the new version arrives, focus returns to the control the change came from (or its nearest live neighbor).
  useEffect(() => {
    if (!focusRequest || !current || current.n <= focusRequest.fromVersion) return
    const target = focusAfterChange(focusRequest, current.items)
    const control = target && editor.current?.querySelector<HTMLButtonElement>(`[data-agenda-control="${CSS.escape(controlKey(target.itemId, target.control))}"]`)
    if (control) control.focus()
    else statusLine.current?.focus()
    setFocusRequest(undefined)
  }, [current, focusRequest])

  const send = (next: AgendaItemInput[], focus?: FocusIntent, onDone?: () => void) => {
    if (busy.current) return
    busy.current = true
    revise.mutate(next, {
      onSuccess: () => {
        setAnnounced(true)
        if (focus) setFocusRequest({ ...focus, fromVersion: current?.n ?? 0 })
        onDone?.()
      },
      onSettled: () => { busy.current = false },
    })
  }
  const onAgenda = new Set(items.flatMap((i) => (i.source.kind === 'finding' ? [i.source.messageId] : [])))
  // A finding goes on the agenda under the title agenda v1 gave it, else under its claim.
  const v1Titles = new Map((meeting.agenda[0]?.items ?? []).flatMap((i) => (i.source.kind === 'finding' ? [[i.source.messageId, i.title] as const] : [])))
  const titleOf = (f: AgendaFinding) => v1Titles.get(f.messageId) ?? f.claim
  const unplaced = findings.filter((f) => !onAgenda.has(f.messageId))
  const announcement = announced && current ? `Agenda v${current.n}: ${current.changeSummary}` : ''
  return (
    <div ref={editor} className="flex min-w-0 flex-col gap-4">
      {current ? (
        <ol aria-label={`Agenda · v${current.n}`} className="flex list-decimal flex-col pl-5">
          {items.map((item, i) => {
            const isFirst = i === 0
            const isLast = i === items.length - 1
            const isOnly = items.length === 1
            return (
              <li key={item.id} className="border-b border-rule py-2 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-body">{item.title}</span>
                  {editable ? (
                    <span className="flex gap-1">
                      <Button data-agenda-control={controlKey(item.id, 'up')} rank="quiet" aria-label={`Move “${item.title}” up`} disabled={isFirst}
                        title={isFirst ? 'Already first on the agenda' : undefined}
                        onClick={() => send(swap(items, i, i - 1).map(asInput), { kind: 'move', itemId: item.id, control: 'up' })}>Move up</Button>
                      <Button data-agenda-control={controlKey(item.id, 'down')} rank="quiet" aria-label={`Move “${item.title}” down`} disabled={isLast}
                        title={isLast ? 'Already last on the agenda' : undefined}
                        onClick={() => send(swap(items, i, i + 1).map(asInput), { kind: 'move', itemId: item.id, control: 'down' })}>Move down</Button>
                      <Button data-agenda-control={controlKey(item.id, 'drop')} rank="quiet" aria-label={`Drop “${item.title}”`} disabled={isOnly}
                        title={isOnly ? 'The agenda keeps at least one item' : undefined}
                        onClick={() => send(items.filter((x) => x.id !== item.id).map(asInput), { kind: 'drop', index: i })}>Drop</Button>
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : <p className="text-body text-ink-3">No agenda yet. Run prep, or add the first item.</p>}
      {/* Mounted from the start and filled on change, so the first change is announced; empty, it takes no space. */}
      <p ref={statusLine} tabIndex={-1} role="status" className={announcement ? 'text-label text-ink-2' : 'sr-only'}>{announcement}</p>
      {editable ? (
        <div className="flex flex-col items-start gap-2">
          <TextInput label="New agenda item" rows={1} value={title} onChange={setTitle} />
          <Button rank="secondary" disabled={title.trim() === '' || revise.isPending}
            onClick={() => send([...items.map(asInput), { title, source: { kind: 'advisor' } }], { kind: 'add_text', priorIds: items.map((i) => i.id) }, () => setTitle(''))}>Add to agenda</Button>
        </div>
      ) : null}
      {editable && unplaced.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 id={findingsId} className="text-label uppercase text-ink-3">Findings not on the agenda</h3>
          <ul aria-labelledby={findingsId} className="flex flex-col gap-2">
            {unplaced.map((f) => (
              <li key={f.messageId} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body text-ink-2">{f.claim}</span>
                <Button rank="quiet" aria-label={`Add to agenda: ${titleOf(f)}`}
                  onClick={() => send([...items.map(asInput), { title: titleOf(f), source: { kind: 'finding', messageId: f.messageId } }], { kind: 'add', messageId: f.messageId })}>Add</Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
    </div>
  )
}
