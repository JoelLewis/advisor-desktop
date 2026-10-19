import { DataTable } from '@/kit/data-table/DataTable'
import { fmtDayMonthYear } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import type { Directory } from '@/types/workspace'
import type { MeetingTask } from '@/types/workspace-meeting'

const STATE_WORDS: Readonly<Record<MeetingTask['state'], string>> = { open: 'Open', done: 'Done' }

/** Follow-up tasks: what, who, by when (an NYSE trading day), and where each stands. */
export function TaskTable({ caption, tasks, directory }: { caption: string; tasks: MeetingTask[]; directory: Directory }) {
  return (
    <DataTable caption={caption} rows={tasks} getRowId={(t) => t.id} total={tasks.length} noun={{ singular: 'task', plural: 'tasks' }}
      columns={[
        { id: 'task', header: 'Task', wrap: true, cell: (t) => t.title },
        { id: 'owner', header: 'Owner', cell: (t) => authorName(t.owner, directory), sortValue: (t) => authorName(t.owner, directory) },
        { id: 'due', header: 'Due', cell: (t) => fmtDayMonthYear(t.due), sortValue: (t) => t.due },
        { id: 'state', header: 'State', cell: (t) => STATE_WORDS[t.state] },
      ]} />
  )
}
