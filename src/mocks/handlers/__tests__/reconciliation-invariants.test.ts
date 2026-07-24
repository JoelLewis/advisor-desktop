import { describe, it, expect } from 'vitest'
import { getReconTrending } from '@/services/reconciliation'
import { MOCK_TODAY_ISO } from '@/lib/clock'

describe('reconciliation trending invariants', () => {
  it('trending window trails up to today — no point is dated after MOCK_TODAY_ISO', async () => {
    const trending = await getReconTrending()
    for (const point of trending) {
      expect(point.date <= MOCK_TODAY_ISO).toBe(true)
    }
  })

  it('the last point in the trending window is today', async () => {
    const trending = await getReconTrending()
    expect(trending[trending.length - 1]?.date).toBe(MOCK_TODAY_ISO)
  })

  it('returns 30 days of trending data', async () => {
    const trending = await getReconTrending()
    expect(trending).toHaveLength(30)
  })
})
