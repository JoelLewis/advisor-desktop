import type { ProspectRecord } from '@/types/workspace-prospect'

export const PELL_ID = 'prsp-011'
export const PELL_THREAD_ID = 'th-pell'
export const PELL_WORK_THREAD_ID = 'th-pell-work'

/** Dr. Pell at first contact: James Thompson's introduction on Feb 20, coffee this afternoon (evt-004), nothing on file. */
export const SEED_PROSPECTS: readonly ProspectRecord[] = [{
  id: PELL_ID, name: 'Dr. Amanda Pell', salutation: 'Dr. Pell', referredBy: 'cli-008',
  stage: 'contact', stageHistory: [{ stage: 'contact', at: '2026-02-20T14:30:00Z' }],
  threadId: PELL_THREAD_ID, internalThreadId: PELL_WORK_THREAD_ID, eventId: 'evt-004',
  statements: [], disclosures: [], steps: [], tasks: [],
}]
