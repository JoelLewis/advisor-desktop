import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'
import { LINK_TARGET } from '@/kit/link-target'
import { useDirectory, useThreads } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { OUTSIDER_THREAD_TITLE } from '@/workspace/people/roster'
import { useViewer } from '@/workspace/viewer/use-viewer'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

type StartingPoint = { to: string; label: string }

/**
 * Where a lost viewer can begin. The firm has two places: the workspace and the advisor's Brief. A client or a
 * prospect has only their own conversation. Until the directory says which the viewer is, only the workspace.
 */
function useStartingPoints(): StartingPoint[] {
  const { viewerId } = useViewer()
  const directory = useDirectory().data
  const threads = useThreads().data
  if (!directory) return [{ to: '/', label: 'The workspace' }]
  if (!isExternalViewerIn(directory, viewerId)) return [{ to: '/', label: 'The workspace' }, { to: '/t/th-brief', label: 'The Brief' }]
  return (threads ?? []).map((t) => ({ to: `/t/${t.id}`, label: OUTSIDER_THREAD_TITLE }))
}

/** Any path the router does not hold. */
export function NotFoundPage() {
  const { brand } = useViewer()
  const starts = useStartingPoints()
  return (
    <Page title="Page not found" eyebrow={brand.name}>
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink-2">There is no page at this address. Start from one of these:</p>
        <ul aria-label="Starting points" className="flex flex-col gap-1">
          {starts.map((s) => <li key={s.to}><Link to={s.to} className={LINK}>{s.label}</Link></li>)}
        </ul>
      </div>
    </Page>
  )
}
