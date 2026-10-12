import { describe, it, expect } from 'vitest'
import { harvestWashSaleNote } from '@/mocks/handlers/ai'

const lot = (facts: { repurchaseBlockedUntil?: string; saleWashSaleRisk?: boolean }) => ({
  repurchaseBlockedUntil: facts.repurchaseBlockedUntil ?? null,
  saleWashSaleRisk: facts.saleWashSaleRisk ?? false,
})

describe('the harvesting insight says which §1091 fact applies to its candidates', () => {
  it('a candidate whose own sale would wash is named first: the loss would be deferred', () => {
    expect(harvestWashSaleNote([lot({}), lot({ saleWashSaleRisk: true, repurchaseBlockedUntil: '2026-03-23' })]))
      .toMatch(/^At least one candidate's sale would be a wash sale/)
  })

  it('a candidate under an open window only blocks repurchase', () => {
    expect(harvestWashSaleNote([lot({ repurchaseBlockedUntil: '2026-03-23' })]))
      .toMatch(/^At least one candidate sits inside an active wash-sale window/)
  })

  it('"clear" only when no candidate washes on sale and none is blocked from repurchase', () => {
    expect(harvestWashSaleNote([lot({}), lot({})])).toBe('Wash sale window clear for all candidates.')
  })
})
