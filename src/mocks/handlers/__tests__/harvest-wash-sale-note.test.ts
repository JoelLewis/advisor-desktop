import { describe, it, expect } from 'vitest'
import { harvestWashSaleNote } from '@/mocks/handlers/ai'

const lot = (facts: { repurchaseBlockedUntil?: string; deferredShares?: number; disallowedShares?: number }) => ({
  repurchaseBlockedUntil: facts.repurchaseBlockedUntil ?? null,
  saleWash: { deferredShares: facts.deferredShares ?? 0, disallowedShares: facts.disallowedShares ?? 0 },
})

const DEFERRED = 'deferred into the replacement\'s basis'
const DISALLOWED = 'permanently disallowed'

describe('the harvesting insight says which §1091 fact applies to its candidates', () => {
  it('a candidate whose own sale would wash is named first', () => {
    expect(harvestWashSaleNote([lot({}), lot({ deferredShares: 180, repurchaseBlockedUntil: '2026-03-22' })]))
      .toMatch(/^At least one candidate's sale would be a wash sale, in part or in whole/)
  })

  it('a taxable replacement defers the washed loss, and is never called a permanent loss', () => {
    const note = harvestWashSaleNote([lot({ deferredShares: 180 })])
    expect(note).toContain(DEFERRED)
    expect(note).not.toContain(DISALLOWED)
  })

  it('an IRA or Roth replacement disallows the washed loss permanently, and is never called deferred', () => {
    const note = harvestWashSaleNote([lot({ disallowedShares: 100 })])
    expect(note).toContain(`bought in an IRA or Roth, that part of the loss is ${DISALLOWED}`)
    expect(note).not.toContain('deferred')
  })

  it('both outcomes are named when both apply', () => {
    const note = harvestWashSaleNote([lot({ disallowedShares: 100, deferredShares: 180 })])
    expect(note).toContain(DISALLOWED)
    expect(note).toContain(DEFERRED)
  })

  it('a candidate under an open window only blocks repurchase', () => {
    expect(harvestWashSaleNote([lot({ repurchaseBlockedUntil: '2026-03-22' })]))
      .toMatch(/^At least one candidate sits inside an active wash-sale window/)
  })

  it('"clear" only when no candidate washes on sale and none is blocked from repurchase', () => {
    expect(harvestWashSaleNote([lot({}), lot({})])).toBe('Wash sale window clear for all candidates.')
  })
})
