/**
 * Fixed-income analytics. Pure — no I/O, no fixture imports — same shape as `@/lib/risk-model`
 * and `@/lib/fees`.
 *
 * C19 · fixed-income-sovereign — the 2-year Treasury was quoted at 99.45 with a 4.625% coupon and
 * a stated 4.35% yield. A bond trading at a discount must yield MORE than its coupon (price and
 * yield move inversely); the correct figure is ~4.92%. C20 · fixed-income-municipal — the same
 * inversion, opposite sign: CA-GO-32 at 105.25 with a 5.00% coupon must yield LESS than its
 * coupon (~4.07%), not more.
 *
 * Semiannual compounding, whole coupon periods, no accrued interest — stated so the
 * simplification is visible rather than implied.
 */
const DAYS_PER_YEAR = 365.25
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Years between `asOf` and `maturityDate`, both `YYYY-MM-DD`. Never call with `new Date()` — the
 * caller must pass a frozen "as of" date (see `@/lib/clock`). */
export function yearsToMaturity(maturityDate: string, asOf: string): number {
  const maturityMs = new Date(`${maturityDate}T00:00:00Z`).getTime()
  const asOfMs = new Date(`${asOf}T00:00:00Z`).getTime()
  return (maturityMs - asOfMs) / (DAYS_PER_YEAR * MS_PER_DAY)
}

/** Clean price per 100 of par, given an annual yield and coupon rate (both in percent). */
export function priceFromYield(
  ytmPct: number,
  couponPct: number,
  years: number,
  frequency = 2,
): number {
  const periods = Math.max(1, Math.round(years * frequency))
  const couponPerPeriod = couponPct / frequency
  const yieldPerPeriod = ytmPct / frequency / 100
  let presentValue = 0
  for (let t = 1; t <= periods; t++) {
    presentValue += couponPerPeriod / (1 + yieldPerPeriod) ** t
  }
  return presentValue + 100 / (1 + yieldPerPeriod) ** periods
}

/**
 * Yield to maturity, solved by bisection. `priceFromYield` is strictly decreasing in yield
 * (higher discount rate → lower present value), so bisection over a wide bracket converges to
 * the unique root: 200 iterations over [0.0001%, 40%] is exact to well under 1e-9.
 */
export function yieldToMaturity(
  price: number,
  couponPct: number,
  years: number,
  frequency = 2,
): number {
  let lo = 0.0001
  let hi = 40
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (priceFromYield(mid, couponPct, years, frequency) > price) {
      // Price is still above target at `mid` → yield needs to go higher to bring price down.
      lo = mid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/**
 * Modified duration: the Macaulay duration (present-value-weighted average time to each cash
 * flow, in years) divided by `(1 + y/k)`. A positive number of years measuring approximate
 * percentage price sensitivity to a 1-point change in yield. Longer maturity and lower coupon
 * both raise duration, holding yield fixed — a bond with more of its value in a single distant
 * payment (the principal) is more sensitive to the discount rate.
 */
export function modifiedDuration(
  ytmPct: number,
  couponPct: number,
  years: number,
  frequency = 2,
): number {
  const periods = Math.max(1, Math.round(years * frequency))
  const couponPerPeriod = couponPct / frequency
  const yieldPerPeriod = ytmPct / frequency / 100
  const price = priceFromYield(ytmPct, couponPct, years, frequency)

  let macaulayWeightedSum = 0
  for (let t = 1; t <= periods; t++) {
    const timeInYears = t / frequency
    const cashFlowPv = couponPerPeriod / (1 + yieldPerPeriod) ** t
    macaulayWeightedSum += timeInYears * cashFlowPv
  }
  const principalTimeInYears = periods / frequency
  macaulayWeightedSum += principalTimeInYears * (100 / (1 + yieldPerPeriod) ** periods)

  const macaulayDuration = macaulayWeightedSum / price
  return macaulayDuration / (1 + yieldPerPeriod)
}
