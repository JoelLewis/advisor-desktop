import { fmtEasternTime, fmtQuantity, fmtWaited } from '@/kit/measure'
import { addressNameOf } from '@/lib/words'
import type { HouseholdMarkers, HouseholdRow, QueueReason } from '@/types/workspace-book'

const counted = (n: number, one: string, many: string) => `${fmtQuantity(n)} ${n === 1 ? one : many}`

/** One reason as the queue says it; every figure through the kit. */
export function reasonWords(reason: QueueReason, asOf: string): string {
  switch (reason.kind) {
    case 'decision': return reason.count === 1 ? 'Decision waiting' : `${counted(reason.count, 'decision', 'decisions')} waiting`
    case 'client_waiting': return `${addressNameOf(reason.clientName)} waiting ${fmtWaited(reason.since, asOf)}`
    case 'meeting': return `${reason.label} ${fmtEasternTime(reason.start)} ET`
    case 'compliance': return counted(reason.count, 'compliance item', 'compliance items')
    case 'task': return `${reason.count === 1 ? 'Task' : counted(reason.count, 'task', 'tasks')} ${reason.overdue ? 'overdue' : 'due today'}`
  }
}

/** Why a household is here today, in one line: "Decision waiting · Robert waiting 8h · review 14:00 ET". Empty when nothing is due. */
export const statusLineOf = (row: HouseholdRow, asOf: string): string => row.reasons.map((r) => reasonWords(r, asOf)).join(' · ')

/** The row's markers as words for tags. */
export function markerWords({ outOfBand, compliance, tasks }: HouseholdMarkers): string[] {
  return [
    ...(outOfBand ? ['OUT OF BAND'] : []),
    ...(compliance > 0 ? [`COMPLIANCE · ${fmtQuantity(compliance)}`] : []),
    ...(tasks > 0 ? [`OPEN ITEMS · ${fmtQuantity(tasks)}`] : []),
  ]
}
