import { describe, it, expect } from 'vitest'
import { getHouseholdAllocation, getClientAllocation } from '@/services/pms'

describe('allocations are per entity, not per segment template', () => {
  it('two platinum households do not render identical allocations', async () => {
    const johnson = await getHouseholdAllocation('hh-001')
    const chenWong = await getHouseholdAllocation('hh-002')
    expect(johnson).not.toEqual(chenWong)
  })

  it('household allocation weights sum to 1', async () => {
    const allocation = await getHouseholdAllocation('hh-002')
    expect(allocation.reduce((s, a) => s + a.weight, 0)).toBeCloseTo(1, 2)
  })

  it('household allocation values sum to the household managed AUM', async () => {
    const allocation = await getHouseholdAllocation('hh-002')
    expect(allocation.reduce((s, a) => s + a.value, 0)).toBeCloseTo(30_308_018, -1)
  })

  it('client allocation covers only that client accounts', async () => {
    const robert = await getClientAllocation('cli-001')
    const patricia = await getClientAllocation('cli-002')
    expect(robert).not.toEqual(patricia)
    expect(robert.reduce((s, a) => s + a.value, 0)).toBeCloseTo(16_250_000, -1)
    expect(patricia.reduce((s, a) => s + a.value, 0)).toBeCloseTo(2_500_000, -1)
  })
})
