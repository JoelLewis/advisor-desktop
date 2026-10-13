import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { useReviseAgenda } from '@/hooks/use-meetings'
import type { AgendaItem, AgendaItemInput, MeetingView } from '@/types/workspace-meeting'
import type { AgendaFinding } from './agenda-findings'

type AgendaEditorProps = { meeting: MeetingView; findings: AgendaFinding[]; editable: boolean }

const asInput = ({ id, title, source }: AgendaItem): AgendaItemInput => ({ id, title, source })
const swap = <T,>(list: readonly T[], i: number, j: number): T[] => list.map((x, k) => (k === i ? list[j]! : k === j ? list[i]! : x))

/** The current agenda. Editable, each change — a move, a drop, an addition — is sent as the whole new agenda and becomes a new version. */
export function AgendaEditor({ meeting, findings, editable }: AgendaEditorProps) {
  const current = meeting.agenda[meeting.agenda.length - 1]
  const revise = useReviseAgenda(meeting.eventId)
  const [title, setTitle] = useState('')
  const busy = useRef(false)
  const findingsId = useId()
  const items = current?.items ?? []
  const send = (next: AgendaItemInput[], onDone?: () => void) => {
    if (busy.current) return
    busy.current = true
    revise.mutate(next, { onSuccess: () => onDone?.(), onSettled: () => { busy.current = false } })
  }
  const onAgenda = new Set(items.flatMap((i) => (i.source.kind === 'finding' ? [i.source.messageId] : [])))
  // A finding goes on the agenda under the title agenda v1 gave it, else under its claim.
  const v1Titles = new Map((meeting.agenda[0]?.items ?? []).flatMap((i) => (i.source.kind === 'finding' ? [[i.source.messageId, i.title] as const] : [])))
  const titleOf = (f: AgendaFinding) => v1Titles.get(f.messageId) ?? f.claim
  const unplaced = findings.filter((f) => !onAgenda.has(f.messageId))
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {current ? (
        <ol aria-label={`Agenda · v${current.n}`} className="flex list-decimal flex-col pl-5">
          {items.map((item, i) => (
            <li key={item.id} className="border-b border-rule py-2 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-body">{item.title}</span>
                {editable ? (
                  <span className="flex gap-1">
                    <Button rank="quiet" aria-label={`Move “${item.title}” up`} disabled={i === 0 || revise.isPending}
                      onClick={() => send(swap(items, i, i - 1).map(asInput))}>Move up</Button>
                    <Button rank="quiet" aria-label={`Move “${item.title}” down`} disabled={i === items.length - 1 || revise.isPending}
                      onClick={() => send(swap(items, i, i + 1).map(asInput))}>Move down</Button>
                    <Button rank="quiet" aria-label={`Drop “${item.title}”`} disabled={items.length === 1 || revise.isPending}
                      onClick={() => send(items.filter((x) => x.id !== item.id).map(asInput))}>Drop</Button>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="text-body text-ink-3">No agenda yet. Run prep, or add the first item.</p>}
      {editable ? (
        <div className="flex flex-col items-start gap-2">
          <TextInput label="New agenda item" rows={1} value={title} onChange={setTitle} />
          <Button rank="secondary" disabled={title.trim() === '' || revise.isPending}
            onClick={() => send([...items.map(asInput), { title, source: { kind: 'advisor' } }], () => setTitle(''))}>Add to agenda</Button>
        </div>
      ) : null}
      {editable && unplaced.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 id={findingsId} className="text-label uppercase text-ink-3">Findings not on the agenda</h3>
          <ul aria-labelledby={findingsId} className="flex flex-col gap-2">
            {unplaced.map((f) => (
              <li key={f.messageId} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body text-ink-2">{f.claim}</span>
                <Button rank="quiet" aria-label={`Add to agenda: ${titleOf(f)}`} disabled={revise.isPending}
                  onClick={() => send([...items.map(asInput), { title: titleOf(f), source: { kind: 'finding', messageId: f.messageId } }])}>Add</Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
    </div>
  )
}
