import { eventTime } from '@/lib/clock'

/**
 * §0.5 · the time and id of every record a handler creates at runtime: an order, a dismissal, an
 * approval, a sent message. Each record takes the next `eventTime` sequence, so records made in one
 * session carry distinct, ordered times after the frozen now, and the live clock is never read.
 */
let sequence = 0
let recordNumber = 0

export function nextEventTime(): string {
  sequence += 1
  return eventTime(sequence)
}

/** A unique, increasing number for the id of a record created at runtime. */
export function nextRecordNumber(): number {
  recordNumber += 1
  return recordNumber
}
