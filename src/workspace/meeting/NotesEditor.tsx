import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { Pane } from '@/kit/layout/Pane'
import { TextInput } from '@/kit/text-input/TextInput'
import { fmtDayMonthYear } from '@/kit/measure'
import { useSaveMeetingNotes } from '@/hooks/use-meetings'
import { authorName } from '@/workspace/proposal/author-name'
import { NOTE_SECTIONS, type MeetingView, type NoteLine, type NoteSection, type TranscriptSpeaker } from '@/types/workspace-meeting'
import type { Directory } from '@/types/workspace'
import { FILED_RECORD_ID, NOTE_SECTION_TITLE } from './note-words'
import { Unbroken } from '@/kit/unbroken/Unbroken'
import { firstNameOf } from '@/lib/words'

type NotesEditorProps = {
  meeting: MeetingView; directory: Directory; editable: boolean
  onCite: (lineId: string | undefined) => void; onDirtyChange: (dirty: boolean) => void; speakerOf: (id: TranscriptSpeaker) => string
}

const comparable = (lines: readonly NoteLine[]) => JSON.stringify(lines.map((l) => ({ ...l, text: l.text.trim() })))

/** The notes draft (or the filed record), by section, each line with its citations; editable until filed. Saving sends the whole draft. */
export function NotesEditor({ meeting, directory, editable, onCite, onDirtyChange, speakerOf }: NotesEditorProps) {
  const source = meeting.filed?.lines ?? meeting.notesDraft
  const [lines, setLines] = useState<NoteLine[]>(source ?? [])
  const [editing, setEditing] = useState<string>()
  const announce = useAnnounce()
  const save = useSaveMeetingNotes(meeting.eventId)
  const dirty = source !== undefined && comparable(lines) !== comparable(source)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  if (!source) return <Pane title="Notes"><p className="text-body text-ink-3">No notes yet. Ask Meeting Notes for a draft.</p></Pane>
  const spoken = new Map((meeting.transcript ?? []).map((l) => [l.id, l.speaker]))
  const speakerFor = (cite: string) => {
    const speaker = spoken.get(cite)
    if (!speaker) throw new Error(`Note cites ${cite}, which the transcript does not have`)
    return speakerOf(speaker)
  }
  const saved = new Map(source.map((l) => [l.id, l]))
  const clientName = (clientId: string) => {
    const attendee = meeting.event.attendees.find((a) => a.id === clientId)
    if (!attendee) throw new Error(`Client wording for ${clientId}, who is not at the meeting`)
    return firstNameOf(attendee.name)
  }
  const setText = (id: string, text: string) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, text } : l)))
  return (
    <Pane title="Notes" meta={meeting.filed ? 'Filed record' : 'Draft · Meeting Notes'}>
      {meeting.filed ? (
        <p id={FILED_RECORD_ID} tabIndex={-1} className="tabular text-body font-semibold"><Unbroken text={`Filed · ${meeting.filed.actId} · fingerprint ${meeting.filed.fingerprint}`} /></p>
      ) : null}
      {NOTE_SECTIONS.map((section) => (
        <NoteSectionList key={section} section={section} lines={lines.filter((l) => l.section === section)} saved={saved} clientName={clientName} directory={directory} editable={editable}
          editing={editing} onEdit={(id) => setEditing((current) => (current === id ? undefined : id))} onText={setText}
          onRemove={(id) => setLines((ls) => ls.filter((l) => l.id !== id))} canRemove={lines.length > 1} onCite={onCite} speakerFor={speakerFor} />
      ))}
      {editable ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button rank="secondary" pending={save.isPending} disabled={!dirty}
            onClick={() => save.mutate(lines.map(({ id, section, text, cites, owner, due }) => ({ id, section, text, cites, ...(owner ? { owner } : {}), ...(due ? { due } : {}) })),
              { onSuccess: () => { setEditing(undefined); announce('Notes saved.') } })}>Save notes</Button>
          {dirty ? <span className="text-label text-ink-3">Unsaved edits</span> : null}
        </div>
      ) : null}
      {save.isError ? <p role="alert" className="text-body">{save.error.message}</p> : null}
    </Pane>
  )
}

type NoteSectionListProps = {
  section: NoteSection; lines: NoteLine[]; saved: ReadonlyMap<string, NoteLine>; clientName: (clientId: string) => string
  directory: Directory; editable: boolean; editing: string | undefined
  onEdit: (id: string) => void; onText: (id: string, text: string) => void; onRemove: (id: string) => void; canRemove: boolean
  onCite: (lineId: string | undefined) => void; speakerFor: (cite: string) => string
}

function NoteSectionList({ section, lines, saved, clientName, directory, editable, editing, onEdit, onText, onRemove, canRemove, onCite, speakerFor }: NoteSectionListProps) {
  const titleId = useId()
  if (lines.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <h3 id={titleId} className="text-label uppercase text-ink-3">{NOTE_SECTION_TITLE[section]}</h3>
      <ul aria-label={NOTE_SECTION_TITLE[section]} className="flex flex-col">
        {lines.map((line) => (
          <li key={line.id} className="group flex min-w-0 flex-col gap-1.5 border-b border-rule py-2 last:border-b-0">
            {editing === line.id
              ? <TextInput label={`Edit ${line.id}`} value={line.text} rows={3} onChange={(text) => onText(line.id, text)} />
              : <p className="text-copy">{line.text}</p>}
            {line.toClient ? <ClientWordingLine line={line} saved={saved.get(line.id)} name={clientName(line.toClient.clientId)} /> : null}
            {line.owner && line.due ? <p className="text-label text-ink-2"><Unbroken text={`${authorName(line.owner, directory)} · due ${fmtDayMonthYear(line.due)}`} /></p> : null}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-label uppercase text-ink-3">Cites</span>
              {line.cites.map((cite) => (
                <Button key={cite} rank="quiet" aria-label={`Cites ${cite} · ${speakerFor(cite)}`} aria-describedby={`transcript-${cite}`}
                  onMouseEnter={() => onCite(cite)} onFocus={() => onCite(cite)} onBlur={() => onCite(undefined)}
                  onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) onCite(undefined) }}>
                  {cite}
                </Button>
              ))}
              {editable ? (
                <span className={cn('ml-auto flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100', editing === line.id && 'opacity-100')}>
                  <Button rank="quiet" aria-label={`${editing === line.id ? 'Done editing' : 'Edit'} ${line.id}`} onClick={() => onEdit(line.id)}>{editing === line.id ? 'Done' : 'Edit'}</Button>
                  <Button rank="quiet" aria-label={`Remove ${line.id}`} disabled={!canRemove} onClick={() => onRemove(line.id)}>Remove</Button>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The wording a client reads in the recap, beneath the firm's line, so the advisor reviews what is filed.
 * Once the line's text differs from the saved one, the engine drops the wording on save: say so.
 */
function ClientWordingLine({ line, saved, name }: { line: NoteLine; saved: NoteLine | undefined; name: string }) {
  if (!line.toClient) return null
  const rewritten = saved !== undefined && saved.text !== line.text.trim()
  return rewritten
    ? <p className="text-label text-ink-2">{`${name}'s wording of this line is dropped when it is saved; the recap will read the line as written.`}</p>
    : <p className="border-l-2 border-rule-2 pl-2 text-body text-ink-2">{`To ${name}: ${line.toClient.text}`}</p>
}
