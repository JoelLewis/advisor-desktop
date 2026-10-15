import { fmtEasternRange, fmtEasternStamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import type { Directory, Message } from '@/types/workspace'

type Note = Extract<Message, { kind: 'prospect_note' }>

/** A labeled note of a prospect meeting that is not a Meeting record: what happened, in the advisor's words. */
export function ProspectNoteView({ note, directory }: { note: Note; directory: Directory }) {
  return (
    <article aria-label={`Note · ${note.title}`} className="flex min-w-0 flex-col gap-2 border-l-2 border-ink pl-4">
      <p className="text-label uppercase text-ink-2">{`Note · ${note.title} · ${fmtEasternRange(note.start, note.end)}`}</p>
      <p className="whitespace-pre-line text-copy">{note.body}</p>
      <p className="text-label text-ink-3">{`${personIn(directory, note.authorId).name} · ${fmtEasternStamp(note.at)}`}</p>
    </article>
  )
}
