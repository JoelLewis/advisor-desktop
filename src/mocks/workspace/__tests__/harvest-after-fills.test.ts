import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { sessionNow } from '@/mocks/data/workspace-store'
import { harvestOpportunities, runHarvestScanner } from '@/mocks/agents/harvest-scanner'
import { accountLedger } from '../household-ledger'
import { approvedStoryV3, release } from './story-fixture'

const robert = () => {
  const a = accounts.find((x) => x.id === 'acc-002')
  if (!a) throw new Error('acc-002')
  return a
}

describe("the Harvest Scanner reads the day's fills", () => {
  it('offers AGG for harvest before the release', () => {
    expect(harvestOpportunities(robert()).map((o) => o.position.symbol)).toContain('AGG')
  })
  it('does not offer what the firm bought today, and says it was bought today', () => {
    release(approvedStoryV3())
    expect(accountLedger('acc-002').fillsOnDay.some((f) => f.side === 'buy' && f.symbol === 'AGG')).toBe(true)
    expect(harvestOpportunities(robert()).map((o) => o.position.symbol)).not.toContain('AGG')
    const findings = runHarvestScanner({ asOf: sessionNow(), subject: { type: 'account', id: 'acc-002' } })
    expect(findings.find((f) => f.topic.kind === 'harvest_allowed' && f.topic.symbol === 'AGG')).toBeUndefined()
    expect(findings.find((f) => f.topic.kind === 'bought_today' && f.topic.symbol === 'AGG')).toMatchObject({
      attention: 'info',
      claim: 'iShares Core US Aggregate Bond ETF was bought today in this account; selling it at a loss now would undo that trade and the purchase would wash the loss, so it is not offered for harvest.',
      figures: [{ label: 'Bought today · AGG', unit: 'sh', source: 'ledger.fillsOnDay.quantity' }],
    })
  })
})
