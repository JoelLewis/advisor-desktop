import { describe, it, expect } from 'vitest'
import { getModels } from '@/services/pms'

/**
 * §9.4 · a benchmark label describes what is computed.
 *
 * `weightsFor` in `pms.ts` never fetches a real external index return series — every model's
 * "benchmark" return is `Σ wb·Rb,i` over that model's *own* `assetClasses` target weights
 * (`benchWeights`). `mod-002` used to label that policy blend "S&P 500" while its blend was 55%
 * US equity, 15% international, 5% emerging markets, 15% fixed income, 5% alternatives, 2%
 * commodities and 3% cash — publishing an "S&P 500" return of ~11.11% against a 14.5% US-equity
 * proxy return. Task 12's Brinson-Fachler arithmetic is untouched here; this only renames what the
 * number is called, and adds `benchmarkKind: 'model_policy'` so a name can't silently imply an
 * external index again.
 *
 * The RiskTab rendering assertions (no "against S&P 500" claim, ex-ante tracking-error wording with
 * its 0.35 correlation assumption) belonged to the retired RiskTab and return in phase 7's risk
 * full view.
 */

describe('§9.4 · a benchmark label describes what is computed', () => {
  it('no model claims a bare external index name while blending multiple asset classes', async () => {
    const models = await getModels()
    expect(models.length).toBeGreaterThan(0)

    // Vacuity guard: the loop below only asserts inside the `classes.length <= 1` branch's
    // complement. If every model happened to be single-asset-class, the loop would pass having
    // asserted nothing — `checked` proves at least one model actually exercised the assertions.
    let checked = 0
    for (const model of models) {
      const classes = model.assetClasses.filter((c) => c.targetWeight > 0)
      if (classes.length <= 1) continue
      checked++
      // A multi-asset blend must not be labelled as a single equity index.
      expect(model.benchmark, model.id).not.toMatch(/^S&P 500$/)
      expect(model.benchmarkKind, model.id).toBe('model_policy')
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('the label names the policy benchmark, so the number and its name agree', async () => {
    const models = await getModels()
    const growth = models.find((m) => m.id === 'mod-002')
    expect(growth).toBeDefined()
    expect(growth!.benchmark).toBe('Growth policy benchmark')
  })
})
