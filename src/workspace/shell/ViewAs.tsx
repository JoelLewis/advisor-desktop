import { Select } from '@/kit/select/Select'
import { useViewAsDirectory } from '@/hooks/use-workspace'
import { personWithRole } from '@/workspace/people/role-label'
import { useViewer } from '@/workspace/viewer/use-viewer'

export function ViewAs() {
  const { viewerId, setViewerId } = useViewer()
  const directory = useViewAsDirectory()
  if (directory.isPending) return <span role="status" className="text-label text-ink-3">Loading people…</span>
  if (directory.isError) return <span role="alert" className="text-body">{directory.error.message}</span>
  const options = directory.data.people.map((p) => ({ value: p.id, label: personWithRole(p) }))
  return <Select label="View as" value={viewerId} options={options} onChange={setViewerId} />
}
