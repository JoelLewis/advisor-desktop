import type { CountedWorkingOrder } from '@/types/workspace-proposal'
import { workingOrderWords } from './working-order-words'

/** The working orders a version counted as filled, so a reviewer sees why its legs leave them alone. */
export function WorkingOrdersNote({ orders }: { orders: readonly CountedWorkingOrder[] }) {
  if (orders.length === 0) return null
  const which = orders.length === 1 ? 'the working order' : 'the working orders'
  return <p className="text-body text-ink-2">{`Counts ${which} already open in this account as filled: ${orders.map((o) => workingOrderWords(o)).join('; ')}.`}</p>
}
