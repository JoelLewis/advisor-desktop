import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { Select } from '@/kit/select/Select'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { fmtDate } from '@/kit/measure'
import { useArchive, useDirectory } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { isClientViewer } from '@/workspace/people/directory-people'
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
  const viewerIsClient = directory.data !== undefined && isClientViewer(directory.data, viewerId)
  const switchedToClient = viewerIsClient && viewerId !== openedAs
  useEffect(() => {
    if (switchedToClient) navigate('/', { replace: true })
  }, [switchedToClient, navigate])
  if (switchedToClient || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the archive…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (viewerIsClient) return <ArchiveNotFound />
  return <Archive directory={directory.data} />
}

function Archive({ directory }: { directory: Directory }) {
  const [params, setParams] = useSearchParams()
  const filters = filtersFrom(params)
  const archive = useArchive(filters)
  const set = (key: keyof ArchiveFilters) => (value: string) => setParams(withFilter(params, key, value), { replace: true })
  if (archive.isError && isNotFound(archive.error)) return <ArchiveNotFound />
  const data = archive.data
  const dates = [{ value: '', label: 'Any date' }, ...(data?.dates ?? []).map((d) => ({ value: d, label: fmtDate(d) }))]
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <VisibilityBand visibility="internal" scale="message" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Archive</h1>
        <p className="text-body text-ink-2">Every recorded act and every message sent to a client, in the order they happened.</p>
      </header>
      {archive.isError ? <p role="alert" className="text-body">{archive.error.message}</p> : null}
      {data ? (
        <>
          <div role="group" aria-label="Archive filters" className="flex flex-wrap items-end gap-4">
            <Select label="Client" layout="stacked" value={filters.clientId ?? ''} onChange={set('clientId')}
              options={[{ value: '', label: 'All clients' }, ...data.clients.map((c) => ({ value: c.id, label: c.name }))]} />
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

function ArchiveNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Archive not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
