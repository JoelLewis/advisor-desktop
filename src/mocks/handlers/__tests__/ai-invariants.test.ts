import { describe, it, expect } from 'vitest'
import { getAIInsights } from '@/services/ai'
import { clients } from '@/mocks/data/clients'
import { MOCK_NOW_ISO } from '@/lib/clock'

// Regression test for fix round 2: the "Contact Gap Detected" insight's daysSinceContact was
// computed against the live system clock (Date.now()) while comparing to a frozen fixture
// updatedAt — anchored to now() from src/lib/clock, it must match a day count derived from the
// same frozen clock, not the real wall-clock date.
describe('AI insight invariants — contact gap', () => {
  it('daysSinceContact is computed from the frozen clock, not the live system clock', async () => {
    const client = clients.find((c) => c.id === 'cli-001')
    if (!client) throw new Error('fixture cli-001 not found')

    const expectedDays = Math.floor(
      (new Date(MOCK_NOW_ISO).getTime() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
    )
    expect(expectedDays).toBeGreaterThan(60) // sanity: this client should trigger the insight

    const insights = await getAIInsights('client_detail', client.id)
    const contactGap = insights.find((i) => i.title === 'Contact Gap Detected')
    expect(contactGap).toBeDefined()
    expect(contactGap?.body).toContain(`${expectedDays} days`)
  })
})
