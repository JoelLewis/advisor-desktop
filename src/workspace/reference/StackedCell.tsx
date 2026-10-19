import type { ReactNode } from 'react'

/** A table cell of two lines, the primary in the row's ink and the secondary muted beneath it, then any quiet action. */
export function StackedCell({ primary, secondary, action }: { primary: ReactNode; secondary?: ReactNode; action?: ReactNode }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span>{primary}</span>
      {secondary ? <span className="text-table-dense text-ink-3">{secondary}</span> : null}
      {action}
    </span>
  )
}
