import { describe, it, expect } from 'vitest'
import { getSupervisionRecords } from '@/services/compliance'
import { can, personById } from '@/mocks/data/people'

describe('§0.3 · supervision records reference the CCO by directory id', () => {
  it.each([['comp-004', 'sr-001'], ['comp-006', 'sr-002'], ['comp-002', 'sr-003']])('%s → %s is reviewed by cco-001, Mark Davis', async (alertId, recordId) => {
    const records = await getSupervisionRecords('user-001', alertId)
    const record = records.find((r) => r.id === recordId)!
    expect(record.reviewerId).toBe('cco-001')
    expect(record.reviewer).toBe(`${personById('cco-001')!.name} (CCO)`)
    expect(record.reviewer).toBe('Mark Davis (CCO)')
  })

  it('every reviewer may dispose of an alert', async () => {
    for (const alertId of ['comp-002', 'comp-004', 'comp-006']) {
      for (const record of await getSupervisionRecords('user-001', alertId)) expect(can(record.reviewerId, 'dispose_alert'), record.id).toBe(true)
    }
  })
})
