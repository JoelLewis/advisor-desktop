/* eslint-disable react-refresh/only-export-components -- shared utility components + constants */
import { convertToBase } from '@/lib/currency'
import type { TaxLot } from '@/types/portfolio'
import type { CurrencyCode, FXRateMap } from '@/types/currency'
import type { CostBasisMethod } from '@/lib/cost-basis'

export const HOLDING_LABELS: Record<string, string> = { short: 'Short-Term', long: 'Long-Term' }

/**
 * C11 · tax-loss-harvesting — a flat 37% was applied to every lot and rendered directly beside a
 * "Long" holding-period badge. Long-term losses offset long-term gains at capital-gains rates.
 *
 * These are the top federal marginal rates and exclude state tax. The screen must say so.
 */
export const SHORT_TERM_RATE = 0.37 as const
/** 20% long-term capital gains + 3.8% net investment income tax. */
export const LONG_TERM_RATE = 0.238 as const

/**
 * 0.238 → "23.8%", 0.37 → "37%". Trims a bare ".0" so whole-percent rates read cleanly.
 * Exported so every surface quoting a rate (the tax page, the dashboard insight, NBA templates)
 * formats it identically rather than re-deriving the same trim logic per call site.
 */
export function formatRatePercent(rate: number): string {
  return `${Number((rate * 100).toFixed(1))}%`
}

/**
 * Fix-round-2 review, Minor M1 · a test asserting `RATE_DISCLOSURE` contains `'37%'` and
 * `'23.8%'` passes identically whether the string is templated from the rate constants or
 * hardcoded prose that happens to say the same thing — it cannot distinguish "derived" from
 * "coincidentally correct today". Exporting the builder as a function of its own arguments lets
 * a test drive it with values that appear nowhere else in the codebase (see
 * tax-invariants.test.ts), which a hardcoded string cannot satisfy by coincidence.
 */
export function buildRateDisclosure(shortTermRate: number, longTermRate: number): string {
  return (
    `Estimated at top federal marginal rates — ${formatRatePercent(shortTermRate)} short-term, ` +
    `${formatRatePercent(longTermRate)} long-term including net investment income tax. State ` +
    'tax is not modelled. Estimates only, not tax advice.'
  )
}

// Templated from the constants above, not restated as free text — changing SHORT_TERM_RATE or
// LONG_TERM_RATE previously would not have changed this copy, so the disclosure could silently
// lie about the rates actually applied.
export const RATE_DISCLOSURE = buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE)

export function taxRateFor(holdingPeriod: TaxLot['holdingPeriod']): number {
  return holdingPeriod === 'short' ? SHORT_TERM_RATE : LONG_TERM_RATE
}

export function estimatedTaxBenefit(lot: Pick<TaxLot, 'gainLoss' | 'holdingPeriod'>): number {
  if (lot.gainLoss >= 0) return 0
  return Math.abs(lot.gainLoss) * taxRateFor(lot.holdingPeriod)
}

/**
 * PRE-FLIGHT correction 1 · the harvest threshold (`TaxManagementPage.tsx`) compared each lot's
 * native-currency `gainLoss` directly against a bare `-1000`, applied identically across acc-041
 * (HKD), acc-042 (SGD), acc-043 (EUR) and acc-044 (CHF). HK$1,000 is about US$128 and CHF 1,000
 * about US$1,120, so the same literal meant wildly different real losses per account. The
 * threshold is in USD; convert the lot to USD before comparing. Exported so Task 17 imports this
 * constant rather than hardcoding `-1000` a third time.
 */
export const HARVEST_LOSS_THRESHOLD_USD = -1000 as const

export function isHarvestable(gainLoss: number, currency: CurrencyCode, rates: FXRateMap): boolean {
  return convertToBase(gainLoss, currency, rates) < HARVEST_LOSS_THRESHOLD_USD
}

/**
 * Fix-round-3 review · `isHarvestable` converts through `convertToBase`, which always targets
 * USD (`HARVEST_LOSS_THRESHOLD_USD` is a fixed-USD figure, independent of the user's reporting
 * currency). `convertCurrency` (`lib/currency.ts`) short-circuits `if (from === to) return
 * amount` — so a USD-native account's lots never actually touch the FX rate map, and the harvest
 * computation for that account is exact regardless of whether FX is loading, healthy, or down.
 * All but four fixture accounts (acc-041/042/043/044) are USD-native; gating their harvest
 * availability on the global FX query status (as a prior round of this fix did) suppressed a
 * fully-known figure for the vast majority of the book over an outage that had nothing to do
 * with them.
 */
export function harvestNeedsFx(baseCurrency: CurrencyCode): boolean {
  return baseCurrency !== 'USD'
}

/**
 * Fix-round-2 review, Minor M2 · `useCurrencyConverter` exposes `isReady` and `isError`
 * specifically so a caller can tell "still loading" apart from "never going to load" — a single
 * `fxUnavailable` boolean collapsed both into one, so a component that only ever knows "not
 * ready" can't tell an advisor which one it's looking at. A discriminated union keeps that
 * distinction from being re-collapsed at any call site that adopts it.
 */
export type FxStatus = 'ready' | 'loading' | 'error'

export function fxStatusFrom(isReady: boolean, isError: boolean): FxStatus {
  if (isReady) return 'ready'
  if (isError) return 'error'
  return 'loading'
}

/**
 * Fix-round-3 review · the single place every harvest-availability-dependent surface (the
 * opportunity list itself, the summary card, the scanner tab) must derive its status from, so
 * they can't drift apart into a third, independently-wrong answer. Only the accounts that
 * `harvestNeedsFx` actually depend on the live FX query; everyone else reads `'ready'`
 * regardless of the global `fxStatus`.
 */
export function harvestFxStatus(baseCurrency: CurrencyCode, fxStatus: FxStatus): FxStatus {
  return harvestNeedsFx(baseCurrency) ? fxStatus : 'ready'
}

export type MethodImpact = { realizedGain: number; shortTermGain: number; longTermGain: number }

/**
 * C13/C14 · tax-efficiency — cost-basis method simulation: sells the top 10% (by quantity) of
 * each position under the given method and reports the realised gain/loss it would produce,
 * split by holding period.
 *
 * Fix-round-1 review: this was originally an inline closure inside `TaxManagementPage`'s
 * `useMemo`, which meant nothing in the repo imported it and it was untestable — the reviewer
 * reverted the whole fix, left the component syntactically broken, and the suite still reported
 * the identical 31-failure baseline. Lifted out to a pure, importable function so C13's fix has
 * real coverage instead of code-inspection-only sign-off.
 */
export function computeCostBasisImpact(taxLots: readonly TaxLot[], method: CostBasisMethod): MethodImpact {
  const byPosition = new Map<string, TaxLot[]>()
  for (const lot of taxLots) {
    const existing = byPosition.get(lot.positionId) ?? []
    existing.push(lot)
    byPosition.set(lot.positionId, existing)
  }

  let totalGain = 0, stGain = 0, ltGain = 0
  for (const [, lots] of byPosition) {
    const totalQty = lots.reduce((s, l) => s + l.quantity, 0)
    const sellQty = Math.ceil(totalQty * 0.1)

    // C13 · under average cost every share carries an identical basis, so a 10% sale realises
    // exactly 10% of the unrealised gain, with holding period allocated FIFO across the sold
    // shares.
    if (method === 'AvgCost') {
      const totalBasis = lots.reduce((s, l) => s + l.costBasis, 0)
      const totalValue = lots.reduce((s, l) => s + l.currentValue, 0)
      const avgBasis = totalBasis / totalQty
      const avgPrice = totalValue / totalQty
      const gain = (avgPrice - avgBasis) * sellQty
      totalGain += gain
      const fifo = [...lots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
      let remainingAvg = sellQty
      for (const lot of fifo) {
        if (remainingAvg <= 0) break
        const fromLot = Math.min(remainingAvg, lot.quantity)
        const share = (fromLot / sellQty) * gain
        if (lot.holdingPeriod === 'short') stGain += share
        else ltGain += share
        remainingAvg -= fromLot
      }
      continue
    }

    let sorted: TaxLot[]
    switch (method) {
      case 'FIFO': sorted = [...lots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate)); break
      case 'LIFO': sorted = [...lots].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)); break
      // C14 · tax-efficiency — HIFO is a standing lot-selection instruction *under* Spec ID,
      // which is how custodians actually offer it. There is no separate "SpecID algorithm".
      case 'HIFO': sorted = [...lots].sort((a, b) => (b.costBasis / b.quantity) - (a.costBasis / a.quantity)); break
    }
    let remaining = sellQty
    for (const lot of sorted) {
      if (remaining <= 0) break
      const sellFromLot = Math.min(remaining, lot.quantity)
      const fraction = sellFromLot / lot.quantity
      const gain = lot.gainLoss * fraction
      totalGain += gain
      if (lot.holdingPeriod === 'short') stGain += gain
      else ltGain += gain
      remaining -= sellFromLot
    }
  }
  return { realizedGain: totalGain, shortTermGain: stGain, longTermGain: ltGain }
}
