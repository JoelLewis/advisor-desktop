import { describe, it, expect } from 'vitest'
import { getModelGovernance } from '@/services/pms'
import { getAccounts } from '@/services/custodian'
import { deriveBookAUM } from '@/lib/aum'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

// §5.2 uses `getModelGovernance()` (-> GET /pms/models/governance), not `getModels()`
// (-> GET /pms/models). `getModels()` returns `ModelAssignment[]` — id/name/benchmark/
// description/assetClasses only, no `assignedAccounts` or `totalAUM` field to assert on.
// The governance endpoint is where the seven hand-typed pairs actually live.
describe('model governance reconciles to the book', () => {
  it('assigned accounts across all models equal the accounts that carry a modelId', async () => {
    const [models, accounts] = await Promise.all([getModelGovernance(), getAccounts()])
    const assignedInBook = accounts.filter((a) => a.modelId).length
    const claimed = models.reduce((sum, m) => sum + m.assignedAccounts, 0)
    expect(claimed).toBe(assignedInBook)
  })

  it('model AUM sums to the AUM of the accounts assigned to a model, not more than the book', async () => {
    const [models, accounts] = await Promise.all([getModelGovernance(), getAccounts()])
    const assigned = accounts.filter((a) => a.modelId)
    const expected = deriveBookAUM(assigned, FX_RATES_USD_BASE)
    const claimed = models.reduce((sum, m) => sum + m.totalAUM, 0)
    // Within a dollar of the derived figure — rounding per model is permitted, invention is not.
    expect(Math.abs(claimed - expected)).toBeLessThanOrEqual(models.length)
    // And the direction that matters: the model book can never exceed the whole book.
    expect(claimed).toBeLessThanOrEqual(deriveBookAUM(accounts, FX_RATES_USD_BASE) + 1)
  })

  it('each model individually matches its own assigned accounts, in USD', async () => {
    const [models, accounts] = await Promise.all([getModelGovernance(), getAccounts()])
    for (const model of models) {
      const own = accounts.filter((a) => a.modelId === model.id)
      expect(model.assignedAccounts, `${model.id} account count`).toBe(own.length)
      const expected = deriveBookAUM(own, FX_RATES_USD_BASE)
      expect(Math.abs(model.totalAUM - expected), `${model.id} AUM`).toBeLessThanOrEqual(1)
    }
  })

  it('a non-USD account is converted, not counted at face value', async () => {
    // acc-041 is HKD. If FX were skipped its native totalValue would land in the model total
    // unconverted, inflating it by roughly 7.8x. This pins that conversion happened.
    const [models, accounts] = await Promise.all([getModelGovernance(), getAccounts()])
    const hkd = accounts.find((a) => a.id === 'acc-041')!
    const model = models.find((m) => m.id === hkd.modelId)
    if (!model) return
    const own = accounts.filter((a) => a.modelId === model.id)
    expect(model.totalAUM).toBeLessThan(own.reduce((s, a) => s + a.totalValue, 0))
  })
})
