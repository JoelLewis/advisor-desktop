import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useDirectory, useSupervision } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { isClientViewer } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory } from '@/types/workspace'
import { ItemDetail } from './ItemDetail'
import { SupervisionQueue } from './SupervisionQueue'
import { findItem, isItemKind } from './supervision-items'

/** Firm-only: a client is told Supervision does not exist, and a switch to a client goes home. */
export function SupervisionPage() {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const directory = useDirectory()
  const viewerIsClient = directory.data !== undefined && isClientViewer(directory.data, viewerId)
  const switchedToClient = viewerIsClient && viewerId !== openedAs
  useEffect(() => {
    if (switchedToClient) navigate('/', { replace: true })
  }, [switchedToClient, navigate])
  if (switchedToClient || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading supervision…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (viewerIsClient) return <SupervisionNotFound />
  return <Supervision directory={directory.data} />
}

function Supervision({ directory }: { directory: Directory }) {
  const { viewerId } = useViewer()
  const { kind, id } = useParams()
  const queue = useSupervision()
  if (queue.isError) return isNotFound(queue.error) ? <SupervisionNotFound /> : <p role="alert" className="text-body">{queue.error.message}</p>
  if (queue.isPending) return <p role="status" className="text-body text-ink-3">Loading supervision…</p>
  const found = kind !== undefined && id !== undefined && isItemKind(kind) ? findItem(queue.data, kind, id) : undefined
  const disposes = (directory.permissions[viewerId] ?? []).includes('release_orders')
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Supervision</h1>
        <p className="text-body text-ink-2">
          {disposes
            ? 'Staged orders wait here: nothing executes until compliance releases it. Each disposition is a binding act with your rationale.'
            : 'You can read the queue; only compliance records a disposition.'}
        </p>
      </header>
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <div className="col-span-12 min-w-0 split:col-span-4">
          <SupervisionQueue queue={queue.data} directory={directory} />
        </div>
        <div className="col-span-12 min-w-0 split:col-span-8">
          {found ? <ItemDetail key={`${found.item.kind}:${found.item.id}`} found={found} directory={directory} />
            : kind !== undefined ? <p className="text-body text-ink-2">This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed.</p>
            : <p className="text-body text-ink-3">Choose an item from the queue.</p>}
        </div>
      </div>
    </div>
  )
}

function SupervisionNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Supervision not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
