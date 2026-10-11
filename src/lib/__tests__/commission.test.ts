import { describe, it, expect } from 'vitest'
import { COMMISSION_USD, commissionSchedule } from '@/lib/commission'
import { generateSectionContent } from '@/mocks/data/proposals'

describe('custodian commission schedule', () => {
  it('holds the schedule the old trade ticket charged', () => {
    expect(COMMISSION_USD).toEqual({ equity: 4.95, option: 0.65, mutual_fund: 0, fixed_income: 1, digital_asset: 0 })
  })
  it('states the schedule in words from the same constants', () => {
    expect(commissionSchedule()).toBe('$4.95 per equity or ETF trade, $0.65 per option contract and $1.00 per bond')
  })
  it('the proposal fee section quotes the schedule from here, not a copy', () => {
    expect(generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 5_000_000)).toContain(commissionSchedule())
  })
})
