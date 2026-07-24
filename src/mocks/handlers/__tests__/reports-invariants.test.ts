import { describe, it, expect } from 'vitest'
import { generateReport } from '@/services/reports'

describe('report generation invariants', () => {
  it('titles the report with the frozen clock\'s date, not the live system clock', async () => {
    const report = await generateReport({
      template: 'portfolio_review',
      period: 'ytd',
      sections: ['executive_summary'],
    })
    // MOCK_NOW_ISO is 2026-02-25 — en-US short date is "2/25/2026".
    expect(report.title).toContain('2/25/2026')
  }, 10_000)
})
