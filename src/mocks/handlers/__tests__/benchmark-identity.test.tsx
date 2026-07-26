import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { getModels, getRiskMetrics } from '@/services/pms'
import { RiskTab } from '@/features/portfolios/account-detail/RiskTab'

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
 * Filename note: the Task 5 brief asked for `benchmark-identity.test.ts`, but the RiskTab
 * assertion below has to render a component, which requires JSX — a `.ts` file can't contain it.
 * This is `.tsx` instead; there is no sibling `.ts` file.
 */

// `RiskTab.tsx:46` builds its sentence out of several sibling JSX expressions —
// `{' '}against {risk.benchmark} is {...}%.` — so the words "against" and "S&P 500" (or whatever
// `risk.benchmark` is) never sit in the same text node. A regex like /against S&P 500/i run through
// `screen.getByText` would therefore match nothing whether or not the bug is present — the exact
// vacuous-test shape Global Constraint 10 exists to catch. Concatenating the rendered container's
// own `textContent` normalises across that element boundary before matching.
function normalizedText(container: HTMLElement): string {
  return (container.textContent ?? '').replace(/\s+/g, ' ')
}

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

  it('the label names the policy blend, so the number and its name agree', async () => {
    const models = await getModels()
    const growth = models.find((m) => m.id === 'mod-002')
    expect(growth).toBeDefined()
    expect(growth!.benchmark).toMatch(/model policy/i)
  })

  it('the risk tab does not claim tracking error against an index it never used', async () => {
    // Guards the label at RiskTab.tsx:46 — ex-ante active risk vs the model's own target weights
    // is not tracking error against the S&P 500. acc-002 carries mod-002, the model this bug was
    // found on.
    const risk = await getRiskMetrics('acc-002')
    const { container } = render(
      <RiskTab
        risk={risk}
        factors={undefined}
        stress={undefined}
        formatWithConversion={(value) => `$${value.toFixed(2)}`}
      />,
    )

    expect(await screen.findByText(/tracking error/i)).toBeInTheDocument()
    const text = normalizedText(container)
    expect(text).not.toMatch(/against s&p 500/i)
    expect(text).toMatch(/model polic(y|ies)/i)
  })

  // The test above only pins the *value* of `risk.benchmark` — both its assertions are satisfied
  // by that string alone, regardless of what surrounding prose RiskTab writes around it. It does
  // not exercise the "ex-ante" characterisation prose at all: that copy could be deleted entirely
  // and the suite above would stay green. This test targets the prose itself, independent of the
  // benchmark string's value.
  it('characterises the tracking-error figure as ex-ante and states its correlation assumption', async () => {
    // `trackingError()` in `risk-model.ts` is a forward-looking active-risk statistic — active
    // weights run through a fixed cross-asset-class correlation assumption (0.35) — not a measured
    // dispersion of realised returns. The copy has to say so, not just name the benchmark correctly.
    const risk = await getRiskMetrics('acc-002')
    const { container } = render(
      <RiskTab
        risk={risk}
        factors={undefined}
        stress={undefined}
        formatWithConversion={(value) => `$${value.toFixed(2)}`}
      />,
    )
    const text = normalizedText(container)
    expect(text).toMatch(/ex-ante tracking/i)
    expect(text).toMatch(/0\.35 correlation/i)
  })
})
