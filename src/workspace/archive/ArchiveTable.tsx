import { Link } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { supervisionHref } from '@/workspace/supervision/supervision-items'
import type { Directory } from '@/types/workspace'
import type { ArchiveEntry } from '@/types/workspace-supervision'
import { ARCHIVE_KIND_LABEL } from './archive-filters'

const LINK = 'underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

function recordedBy(entry: ArchiveEntry, directory: Directory): string {
  if (entry.kind === 'sent_message') return personIn(directory, entry.message.authorId).name
  const name = personIn(directory, entry.act.actorId).name
  return entry.act.viaPresenter ? `${name} · via the presenter shortcut` : name
}

function EntryLink({ entry }: { entry: ArchiveEntry }) {
  if (entry.threadId && entry.threadTitle) return <Link to={`/t/${encodeURIComponent(entry.threadId)}`} className={LINK}>{entry.threadTitle}</Link>
  if (entry.kind === 'act' && entry.act.subject?.type === 'alert') return <Link to={supervisionHref('alert', entry.act.subject.id)} className={LINK}>Supervision</Link>
  return <NotApplicable />
}

export function ArchiveTable({ entries, directory }: { entries: ArchiveEntry[]; directory: Directory }) {
  return (
    <DataTable caption="Archive" rows={entries} getRowId={(e) => `${e.kind}:${e.id}`} noun={{ singular: 'record', plural: 'records' }} density="dense"
      columns={[
        { id: 'at', header: 'At', cell: (e) => fmtTimestamp(e.at), sortValue: (e) => e.at },
        { id: 'record', header: 'Record', cell: (e) => (e.kind === 'act' ? e.act.id : e.actId) },
        { id: 'kind', header: 'Kind', cell: (e) => ARCHIVE_KIND_LABEL[e.kind === 'act' ? e.act.kind : 'sent_message'] },
        { id: 'summary', header: 'Summary', wrap: true, cell: (e) => (e.kind === 'act' ? e.act.summary : `Message to ${e.clientName}`) },
        { id: 'actor', header: 'Recorded by', cell: (e) => recordedBy(e, directory) },
        { id: 'fingerprint', header: 'Fingerprint', cell: (e) => (e.kind === 'act' ? e.act.fingerprint : e.fingerprint) },
        { id: 'thread', header: 'Thread', cell: (e) => <EntryLink entry={e} /> },
      ]} />
  )
}
