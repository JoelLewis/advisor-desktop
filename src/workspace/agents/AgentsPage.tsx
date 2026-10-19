import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useDirectory } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { AgentScope } from '@/workspace/people/AgentScope'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useViewer } from '@/workspace/viewer/use-viewer'

/** Every agent on the desk and what each can and can't do. Agents measure, draft and check; people decide, approve and send. */
export function AgentsPage() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  if (directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the agents…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (isExternalViewerIn(directory.data, viewerId)) return <FullViewNotFound subject="Agents" />
  return (
    <div className="flex max-w-[46rem] min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Agents</h1>
        <p className="text-copy text-ink-2">Agents measure, draft and check. People decide, approve and send, and every act is recorded under a person&apos;s name.</p>
      </div>
      <ul aria-label="Agents" className="flex flex-col gap-5">
        {directory.data.agents.map((a) => <li key={a.id} className="border-b border-rule pb-4 last:border-b-0"><AgentScope agent={a} /></li>)}
      </ul>
    </div>
  )
}
