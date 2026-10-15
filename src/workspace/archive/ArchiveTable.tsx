import { Link } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { fmtEasternStamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { PATH_NOTE } from '@/workspace/prospect/prospect-words'
import { supervisionHref } from '@/workspace/supervision/supervision-items'
import type { Directory } from '@/types/workspace'
import type { ArchiveEntry } from '@/types/workspace-supervision'
import { TABLE_LINK_TARGET } from '@/kit/link-target'

const LINK = `${TABLE_LINK_TARGET} underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

function recordedBy(entry: ArchiveEntry, directory: Directory): string {
  if (entry.kind === 'sent_message') return personIn(directory, entry.message.authorId).name
  const name = personIn(directory, entry.act.actorId).name
  return entry.act.viaPresenter ? `${name} · ${PATH_NOTE[entry.act.viaPresenter.path ?? 'shortcut']}` : name
}

function Recorded({ entry, directory }: { entry: ArchiveEntry; directory: Directory }) {
  return <><span className="block whitespace-nowrap tabular">{fmtEasternStamp(entry.at)}</span><span className="block">{recordedBy(entry, directory)}</span></>
}

/** The record id leads, so books-and-records keep their reference beside what was done. */
function Summary({ entry }: { entry: ArchiveEntry }) {
  const recordId = entry.kind === 'act' ? entry.act.id : entry.actId
  const text = entry.kind === 'act' ? entry.act.summary : `Message to ${entry.partyName}`
  return <><span className="tabular">{recordId}</span>{` · ${text}`}</>
}

function EntryLink({ entry }: { entry: ArchiveEntry }) {
  if (entry.threadId && entry.threadTitle) return <Link to={`/t/${encodeURIComponent(entry.threadId)}`} className={LINK}>{entry.threadTitle}</Link>
  if (entry.kind === 'act' && entry.act.subject?.type === 'alert') return <Link to={supervisionHref('alert', entry.act.subject.id)} className={LINK}>Supervision</Link>
  return <NotApplicable />
}

export function ArchiveTable({ entries, directory }: { entries: ArchiveEntry[]; directory: Directory }) {
  return (
    <DataTable caption="Archive" rows={entries} getRowId={(e) => `${e.kind}:${e.id}`} noun={{ singular: 'record', plural: 'records' }} density="dense"
      empty="Recorded acts appear here: approvals, releases, filings, deliveries and resolutions."
      columns={[
        { id: 'at', header: 'Recorded', wrap: true, cell: (e) => <Recorded entry={e} directory={directory} />, sortValue: (e) => e.at },
        { id: 'summary', header: 'Summary', wrap: true, cell: (e) => <Summary entry={e} /> },
        { id: 'fingerprint', header: 'Fingerprint', cell: (e) => (e.kind === 'act' ? e.act.fingerprint : e.fingerprint) },
        { id: 'thread', header: 'Thread', cell: (e) => <EntryLink entry={e} /> },
      ]} />
  )
}
