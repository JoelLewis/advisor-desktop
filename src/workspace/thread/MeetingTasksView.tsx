import { fmtTimestamp } from '@/kit/measure'
import { TaskTable } from '@/workspace/meeting/TaskTable'
import type { Directory, Message } from '@/types/workspace'
import { Unbroken } from '@/kit/unbroken/Unbroken'

type Tasks = Extract<Message, { kind: 'meeting_tasks' }>

const TITLE = 'Tasks from the filed record'

export function MeetingTasksView({ message, directory }: { message: Tasks; directory: Directory }) {
  return (
    <article aria-label={TITLE} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-2">{TITLE}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-body text-ink-2"><Unbroken text={`From ${message.filedActId}. Tracked here; nobody works them in this demo.`} /></p>
      <TaskTable caption={TITLE} tasks={message.tasks} directory={directory} />
    </article>
  )
}
