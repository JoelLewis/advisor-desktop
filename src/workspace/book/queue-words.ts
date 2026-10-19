import { fmtEasternTime, fmtQuantity, fmtWaited } from '@/kit/measure'
import { addressNameOf } from '@/lib/words'
import type { HouseholdRow, QueueReason } from '@/types/workspace-book'

/** A non-breaking space, so a time never parts from its zone at a line end. */
const NBSP = '\u00A0'

const counted = (n: number, one: string, many: string) => `${fmtQuantity(n)} ${n === 1 ? one : many}`

/** One reason as the queue says it; every figure through the kit. */
export function reasonWords(reason: QueueReason, asOf: string): string {
  switch (reason.kind) {
    case 'decision': return reason.count === 1 ? 'Decision waiting' : `${counted(reason.count, 'decision', 'decisions')} waiting`
    case 'client_waiting': return `${addressNameOf(reason.clientName)} waiting ${fmtWaited(reason.since, asOf)}`
    case 'meeting': return `${reason.label} ${fmtEasternTime(reason.start)}${NBSP}ET`
    case 'compliance': return counted(reason.count, 'compliance item', 'compliance items')
    case 'task': return `${reason.count === 1 ? 'Task' : counted(reason.count, 'task', 'tasks')} ${reason.overdue ? 'overdue' : 'due today'}`
  }
}

const capitalized = (line: string): string => line.charAt(0).toUpperCase() + line.slice(1)

/** Why a household is here today, in one sentence-case line: "Decision waiting · Robert waiting 8h · review 14:00 ET". Empty when nothing is due. */
export const statusLineOf = (row: HouseholdRow, asOf: string): string => capitalized(row.reasons.map((r) => reasonWords(r, asOf)).join(' · '))

/** The row's markers as words for tags. A count the status line already names (compliance items) is not repeated as a tag. */
export function markerWords({ markers: { outOfBand, compliance, tasks }, reasons }: Pick<HouseholdRow, 'markers' | 'reasons'>): string[] {
  const statedInLine = reasons.some((r) => r.kind === 'compliance')
  return [
    ...(outOfBand ? ['OUT OF BAND'] : []),
    ...(compliance > 0 && !statedInLine ? [`COMPLIANCE · ${fmtQuantity(compliance)}`] : []),
    ...(tasks > 0 ? [`OPEN ITEMS · ${fmtQuantity(tasks)}`] : []),
  ]
}
