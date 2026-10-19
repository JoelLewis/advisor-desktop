import { SegmentedControl } from '@/kit/segmented/SegmentedControl'
import { useDirectory } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { BOOK_MODE_OPTIONS } from './book-mode'
import { DeskLinks } from './DeskLinks'
import { HouseholdsColumn } from './HouseholdsColumn'
import { ThreadList } from './ThreadList'
import { ThreadListSkeleton } from './ThreadListSkeleton'
import { useBookMode } from './use-book-mode'

/** The left column. The firm's: a switch between the book of households and the conversations, then Firm and Reports. An outsider's: their one conversation. */
export function BookColumn() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const [mode, setMode] = useBookMode(viewerId)
  if (directory.isPending) return <ThreadListSkeleton />
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const external = isExternalViewerIn(directory.data, viewerId)
  if (external) return <ThreadList external />
  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl label="Show" options={BOOK_MODE_OPTIONS} value={mode} onChange={setMode} />
      {mode === 'households' ? <HouseholdsColumn /> : <ThreadList external={false} />}
      <DeskLinks />
    </div>
  )
}
