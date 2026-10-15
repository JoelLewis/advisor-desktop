import { Select } from '@/kit/select/Select'
import { useViewAsDirectory } from '@/hooks/use-workspace'
import { personWithRole } from '@/workspace/people/role-label'
import { useViewer } from '@/workspace/viewer/use-viewer'

/** The widest option the loaded select holds, so the placeholder wraps and measures as the select will. */
const WIDEST_OPTION = 'Sarah Mitchell · Client service'

/** The View as control before its people arrive: the same label and box, empty, so the header does not move when they do. */
function ViewAsPlaceholder() {
  return (
    <span role="status" className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
      <span aria-hidden="true" className="text-label tracking-normal text-ink-3">View as</span>
      <span aria-hidden="true" className="inline-flex min-h-9 coarse:min-h-11 max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap border border-transparent py-1.5 pl-3 pr-8 text-body font-semibold text-transparent">{WIDEST_OPTION}</span>
      <span className="sr-only">Loading people…</span>
    </span>
  )
}

export function ViewAs() {
  const { viewerId, setViewerId } = useViewer()
  const directory = useViewAsDirectory()
  if (directory.isPending) return <ViewAsPlaceholder />
  if (directory.isError) return <span role="alert" className="text-body">{directory.error.message}</span>
  const options = directory.data.people.map((p) => ({ value: p.id, label: personWithRole(p) }))
  return <Select label="View as" value={viewerId} options={options} onChange={setViewerId} />
}
