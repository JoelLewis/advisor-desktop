import { Tag } from '@/kit/tag/Tag'
import { fmtDayMonthYear } from '@/kit/measure'
import type { HouseholdTask } from '@/types/workspace-household'

/** Follow-ups, open compliance items, open items and signatures, each with its owner and due date. */
export function HouseholdTasks({ tasks }: { tasks: HouseholdTask[] }) {
  if (tasks.length === 0) return <p className="text-body text-ink-3">No open tasks or items.</p>
  return (
    <ul aria-label="Tasks and open items" className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-body">{t.title}</span>
          <span className="text-body text-ink-2">{t.owner}</span>
          <span className="tabular text-body text-ink-3">{t.due ? `due ${fmtDayMonthYear(t.due)}` : 'no due date'}</span>
          {t.overdue ? <Tag tone="solid">OVERDUE</Tag> : null}
        </li>
      ))}
    </ul>
  )
}
