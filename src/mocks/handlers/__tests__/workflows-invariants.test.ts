import { describe, it, expect } from 'vitest'
import { startWorkflow } from '@/services/workflows'
import { MOCK_TODAY_ISO } from '@/lib/clock'

// Regression test for fix round 2: the dueDate for a workflow started via /api/workflows/start
// was computed as `new Date(Date.now() + 7 * 86400000)` (live system clock) — anchored to
// startOfToday() from src/lib/clock, it must be exactly 7 days after MOCK_TODAY_ISO.
describe('workflow start invariants', () => {
  it('dueDate is 7 days after the frozen clock\'s today, not the live system clock', async () => {
    const task = await startWorkflow({ templateId: 'tpl-001', priority: 'medium' })
    expect(task.dueDate).toBe('2026-03-04') // MOCK_TODAY_ISO (2026-02-25) + 7 days
    expect(task.dueDate > MOCK_TODAY_ISO).toBe(true)
  })
})
