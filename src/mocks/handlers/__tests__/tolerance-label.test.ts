import { describe, it, expect } from 'vitest'
import { getContextBriefing } from '@/services/ai'
import { createProposal } from '@/services/proposals'
import { clients } from '@/mocks/data/clients'
import { bandFor } from '@/lib/risk-profile'

// Phase 7a Task 5b — one tolerance label per client: every surface reads the questionnaire score
// through the firm's band table, never the stored `riskProfile.tolerance` word. cli-002 is stored
// 'conservative' at 35 (Moderate Conservative); cli-004 'moderate' at 60 (Moderate Aggressive).
const scoreOf = (id: string) => {
  const client = clients.find((c) => c.id === id)
  if (!client) throw new Error(`fixture ${id} not found`)
  return client.riskProfile.score
}

describe('the client tolerance label is the band of the questionnaire score', () => {
  it('in the client briefing', async () => {
    for (const id of ['cli-002', 'cli-004']) {
      const briefing = await getContextBriefing('client_detail', id)
      expect(briefing?.metrics.find((m) => m.label === 'Risk Profile')?.value, id).toBe(bandFor(scoreOf(id)).label)
    }
    expect(bandFor(scoreOf('cli-002')).label).toBe('Moderate Conservative')
  })

  it("in a proposal's client data, with the objective and allocation of that band", async () => {
    const draft = await createProposal('tpl-001', 'cli-004')
    expect(draft.clientData.riskTolerance).toBe('Moderate Aggressive')
    expect(draft.clientData.investmentObjective).toBe('Capital Appreciation')
    // mod-002, the Moderate Aggressive band's model: 55 US, 15 + 5 international, 15 bonds, 5 + 2 alternatives, 3 cash.
    expect(draft.clientData.currentAllocation).toEqual([
      { assetClass: 'US Equity', weight: 55 }, { assetClass: 'International Equity', weight: 20 }, { assetClass: 'Fixed Income', weight: 15 },
      { assetClass: 'Alternatives', weight: 7 }, { assetClass: 'Cash', weight: 3 },
    ])
  }, 30_000)
})
