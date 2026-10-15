import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { Select } from '@/kit/select/Select'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { teamWords } from '@/workspace/people/visibility-words'
import { fmtDayMonthYear } from '@/kit/measure'
import { useArchive, useDirectory } from '@/hooks/use-workspace'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import type { HiddenRedirect } from '@/workspace/full-views/hidden-redirect'
import { isNotFound } from '@/workspace/is-not-found'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory } from '@/types/workspace'
import type { ArchiveFilters } from '@/types/workspace-supervision'
import { ArchiveTable } from './ArchiveTable'
import { KIND_OPTIONS, filtersFrom, withFilter } from './archive-filters'

/** Firm-only books and records: a client is told the archive does not exist, and a switch to a client goes home. */
export function ArchivePage() {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const directory = useDirectory()
  const viewerIsExternal = directory.data !== undefined && isExternalViewerIn(directory.data, viewerId)
  const switchedToClient = viewerIsExternal && viewerId !== openedAs
  useEffect(() => {
    if (switchedToClient) navigate('/', { replace: true, state: { hiddenSubject: 'the Archive', hiddenFrom: viewerId } satisfies HiddenRedirect })
  }, [switchedToClient, navigate, viewerId])
  if (switchedToClient || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the archive…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (viewerIsExternal) return <FullViewNotFound subject="Archive" />
  return <Archive directory={directory.data} />
}

function Archive({ directory }: { directory: Directory }) {
  const [params, setParams] = useSearchParams()
  const filters = filtersFrom(params)
  const archive = useArchive(filters)
  const set = (key: keyof ArchiveFilters) => (value: string) => setParams(withFilter(params, key, value), { replace: true })
  if (archive.isError && isNotFound(archive.error)) return <FullViewNotFound subject="Archive" />
  const data = archive.data
  // A date the URL names stays selectable even when no record falls on it, so the select shows the filter in force.
  const knownDates = [...new Set([...(data?.dates ?? []), ...(filters.from ? [filters.from] : []), ...(filters.to ? [filters.to] : [])])].sort()
  const dates = [{ value: '', label: 'Any date' }, ...knownDates.map((d) => ({ value: d, label: fmtDayMonthYear(d) }))]
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <VisibilityBand visibility="internal" scale="message" words={teamWords([])} />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Archive</h1>
        <p className="text-body text-ink-2">Every recorded act and every message sent to a client or prospect, in the order they happened.</p>
      </header>
      {archive.isError ? <p role="alert" className="text-body">{archive.error.message}</p> : null}
      {data ? (
        <>
          <div role="group" aria-label="Archive filters" className="flex flex-wrap items-end gap-4">
            <Select label="Client or prospect" layout="stacked" value={filters.partyId ?? ''} onChange={set('partyId')}
              options={[{ value: '', label: 'All clients and prospects' }, ...data.parties.map((c) => ({ value: c.id, label: c.name }))]} />
            <Select label="Kind" layout="stacked" value={filters.kind ?? ''} options={KIND_OPTIONS} onChange={set('kind')} />
            <Select label="From" layout="stacked" value={filters.from ?? ''} options={dates} onChange={set('from')} />
            <Select label="To" layout="stacked" value={filters.to ?? ''} options={dates} onChange={set('to')} />
          </div>
          <ArchiveTable entries={data.entries} directory={directory} />
        </>
      ) : archive.isPending ? <p role="status" className="text-body text-ink-3">Loading the archive…</p> : null}
    </div>
  )
}
