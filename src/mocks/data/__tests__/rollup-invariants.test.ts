import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { clients } from '@/mocks/data/clients'
import { householdFees, billingCycles } from '@/mocks/data/billing'
import { feeSchedules, revenueBySegment, revenueMetrics, revenueTrend } from '@/mocks/data/revenue'
import { bookAnalytics } from '@/mocks/data/practice'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { deriveBookAUM, deriveClientAUM, deriveHouseholdAUM, deriveSegmentAUM } from '@/lib/aum'

/**
 * THE GATE — Phase 1 ("Numbers you can trust") definition of done.
 *
 * A six-agent audit found this app's aggregates disagree with their own parts: one household
 * states $43.5M against $30.3M actual, Total AUM has four different values across four screens,
 * and household roll-ups exceed the book total by $14.6M. This test is the property that makes
 * that impossible: every stated total must equal the sum of its parts, to the cent.
 *
 * It is written now — third in the phase — and is EXPECTED TO FAIL until Task 22. That is by
 * design: it fails loudly on every run until the underlying fixtures are corrected, so no later
 * task can quietly regress the invariant it enforces. Do not tune fixtures to satisfy assertions
 * added elsewhere in this file without also fixing the root cause; do not weaken an assertion to
 * make it pass here.
 */

const RATES = FX_RATES_USD_BASE

const BOOK_AUM = 91_320_824.03606

describe('GATE — every roll-up equals the sum of its parts', () => {
  describe('currency integrity', () => {
    /**
     * `convertCurrency` (src/lib/currency.ts:53) resolves a missing rate as `rates[from] ?? 1`
     * — an account whose baseCurrency has no entry in the rate map silently converts 1:1. That
     * is the exact bug class this phase exists to eliminate (naive 1:1 mixed-currency summation),
     * just arriving through a missing-rate door instead of a missing-conversion door. It would
     * produce a plausible-looking wrong total with no error anywhere in the pipeline. This
     * assertion turns that silent fallback into a loud, named failure.
     */
    it.each(
      accounts
        .filter((a) => a.baseCurrency && a.baseCurrency !== 'USD')
        .map((a) => [a.id, a.name, a] as const),
    )(
      '%s (%s): baseCurrency resolves to a real, positive FX rate (no silent 1:1 fallback)',
      (_id, _name, account) => {
        const currency = account.baseCurrency!
        const rate = (RATES as Record<string, number>)[currency]
        expect(
          rate,
          `account ${account.id} (${account.name}) has baseCurrency "${currency}", which has ` +
            `no entry in FX_RATES_USD_BASE. convertCurrency() would silently fall back to a ` +
            `1:1 rate for this ${account.totalValue.toLocaleString('en-US')} ${currency} account ` +
            `— add "${currency}" to FX_RATES_USD_BASE or fix the fixture's baseCurrency.`,
        ).toBeDefined()
        expect(
          rate,
          `account ${account.id} (${account.name}): FX rate for ${currency} is ${rate}, which ` +
            `is not a finite positive number. A zero or negative rate would corrupt every ` +
            `roll-up that includes this account.`,
        ).toBeGreaterThan(0)
      },
    )
  })

  describe('AUM', () => {
    it('the book total is 91,320,824.04 USD, FX-applied', () => {
      const actual = deriveBookAUM(accounts, RATES)
      expect(
        actual,
        `deriveBookAUM(accounts) = ${actual.toLocaleString('en-US')} USD, expected ` +
          `${BOOK_AUM.toLocaleString('en-US')} USD (delta ${(actual - BOOK_AUM).toLocaleString('en-US')}).`,
      ).toBeCloseTo(BOOK_AUM, 4)
    })

    it.each(households.map((h) => [h.id, h.name, h] as const))(
      '%s (%s): managedAUM === Σ its accounts, FX-applied',
      (_id, _name, household) => {
        const derived = deriveHouseholdAUM(household.id, accounts, RATES)
        const delta = household.managedAUM - derived
        expect(
          household.managedAUM,
          `${household.id} (${household.name}): fixture states managedAUM = ` +
            `${household.managedAUM.toLocaleString('en-US')}, but its accounts ` +
            `(${household.accountIds.join(', ')}) sum to ${derived.toLocaleString('en-US')} ` +
            `FX-applied — a delta of ${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(derived, 4)
      },
    )

    it.each(households.map((h) => [h.id, h.name, h] as const))(
      '%s (%s): totalAUM === managedAUM + heldAwayAUM',
      (_id, _name, household) => {
        const expected = household.managedAUM + household.heldAwayAUM
        const delta = household.totalAUM - expected
        expect(
          household.totalAUM,
          `${household.id} (${household.name}): fixture states totalAUM = ` +
            `${household.totalAUM.toLocaleString('en-US')}, but managedAUM ` +
            `(${household.managedAUM.toLocaleString('en-US')}) + heldAwayAUM ` +
            `(${household.heldAwayAUM.toLocaleString('en-US')}) = ${expected.toLocaleString('en-US')} ` +
            `— a delta of ${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(expected, 4)
      },
    )

    it('Σ household managedAUM === book AUM (no account orphaned, none double-counted)', () => {
      const rolled = households.reduce((s, h) => s + h.managedAUM, 0)
      const book = deriveBookAUM(accounts, RATES)
      const delta = rolled - book
      expect(
        rolled,
        `Σ household.managedAUM across all ${households.length} households = ` +
          `${rolled.toLocaleString('en-US')}, but deriveBookAUM(accounts) = ` +
          `${book.toLocaleString('en-US')} — a delta of ${delta.toLocaleString('en-US')} USD. ` +
          `Household roll-ups either exceed or fall short of the book total: an account is ` +
          `either double-counted across households, orphaned from all households, or a ` +
          `household's managedAUM figure is simply wrong.`,
      ).toBeCloseTo(book, 4)
    })

    it('every account belongs to exactly one household accountIds list', () => {
      const listed = households.flatMap((h) => h.accountIds)
      const listedSet = new Set(listed)
      const accountSet = new Set(accounts.map((a) => a.id))

      const duplicates = listed.filter((id, i) => listed.indexOf(id) !== i)
      expect(
        listedSet.size,
        `${duplicates.length} account id(s) appear in more than one household's accountIds ` +
          `list (double-counted): ${[...new Set(duplicates)].join(', ')}`,
      ).toBe(listed.length)

      const missingFromHouseholds = [...accountSet].filter((id) => !listedSet.has(id))
      const missingFromAccounts = [...listedSet].filter((id) => !accountSet.has(id))
      expect(
        listedSet,
        `household accountIds lists and the accounts fixture disagree. ` +
          `Accounts orphaned (not in any household's accountIds): ` +
          `[${missingFromHouseholds.join(', ') || 'none'}]. ` +
          `Account ids referenced by a household but absent from accounts fixture: ` +
          `[${missingFromAccounts.join(', ') || 'none'}].`,
      ).toEqual(accountSet)
    })

    it.each(clients.map((c) => [c.id, c.fullName, c] as const))(
      '%s (%s): client totalAUM === Σ its accounts, FX-applied',
      (_id, _name, client) => {
        const derived = deriveClientAUM(client.id, accounts, RATES)
        const delta = client.totalAUM - derived
        expect(
          client.totalAUM,
          `${client.id} (${client.fullName}): fixture states totalAUM = ` +
            `${client.totalAUM.toLocaleString('en-US')}, but their accounts sum to ` +
            `${derived.toLocaleString('en-US')} FX-applied — a delta of ` +
            `${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(derived, 4)
      },
    )

    it('Σ client totalAUM === book AUM', () => {
      const rolled = clients.reduce((s, c) => s + c.totalAUM, 0)
      const book = deriveBookAUM(accounts, RATES)
      const delta = rolled - book
      expect(
        rolled,
        `Σ client.totalAUM across all ${clients.length} clients = ${rolled.toLocaleString('en-US')}, ` +
          `but deriveBookAUM(accounts) = ${book.toLocaleString('en-US')} — a delta of ` +
          `${delta.toLocaleString('en-US')} USD.`,
      ).toBeCloseTo(book, 4)
    })
  })

  describe('practice analytics', () => {
    it('bookAnalytics.aumBySegment === derived segment AUM', () => {
      const derived = deriveSegmentAUM(households, accounts, RATES)
      for (const row of bookAnalytics.aumBySegment) {
        const match = derived.find((d) => d.segment === row.segment)
        expect(match, `segment "${row.segment}" (from bookAnalytics.aumBySegment) has no matching entry in deriveSegmentAUM(households, accounts, RATES) output`).toBeDefined()
        const delta = row.aum - match!.aum
        expect(
          row.aum,
          `bookAnalytics.aumBySegment["${row.segment}"].aum = ${row.aum.toLocaleString('en-US')}, ` +
            `but derived segment AUM = ${match!.aum.toLocaleString('en-US')} — a delta of ` +
            `${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(match!.aum, 4)
        expect(
          row.count,
          `bookAnalytics.aumBySegment["${row.segment}"].count = ${row.count}, but ` +
            `${match!.householdCount} households actually carry segment "${row.segment}".`,
        ).toBe(match!.householdCount)
      }
      const summed = bookAnalytics.aumBySegment.reduce((s, r) => s + r.aum, 0)
      const book = deriveBookAUM(accounts, RATES)
      expect(
        summed,
        `Σ bookAnalytics.aumBySegment[].aum = ${summed.toLocaleString('en-US')}, but ` +
          `deriveBookAUM(accounts) = ${book.toLocaleString('en-US')} — a delta of ` +
          `${(summed - book).toLocaleString('en-US')} USD.`,
      ).toBeCloseTo(book, 4)
    })

    it('bookAnalytics.aumByAccountType sums to the book total', () => {
      const summedAUM = bookAnalytics.aumByAccountType.reduce((s, r) => s + r.aum, 0)
      const book = deriveBookAUM(accounts, RATES)
      expect(
        summedAUM,
        `Σ bookAnalytics.aumByAccountType[].aum = ${summedAUM.toLocaleString('en-US')}, but ` +
          `deriveBookAUM(accounts) = ${book.toLocaleString('en-US')} — a delta of ` +
          `${(summedAUM - book).toLocaleString('en-US')} USD.`,
      ).toBeCloseTo(book, 4)
      const summedCount = bookAnalytics.aumByAccountType.reduce((s, r) => s + r.count, 0)
      expect(
        summedCount,
        `Σ bookAnalytics.aumByAccountType[].count = ${summedCount}, but there are ` +
          `${accounts.length} accounts in the accounts fixture.`,
      ).toBe(accounts.length)
    })

    it('the AUM waterfall reconciles to the book total', async () => {
      const { getBookOfBusiness } = await import('@/services/pms')
      const book = await getBookOfBusiness()
      const deltas = book.aumWaterfall.filter((b) => b.kind === 'delta')
      const start = book.aumWaterfall.find((b) => b.label === 'Starting AUM')!
      const end = book.aumWaterfall.find((b) => b.label === 'Current AUM')!
      expect(start.value + deltas.reduce((s, d) => s + d.value, 0)).toBe(end.value)
      expect(end.value).toBe(Math.round(deriveBookAUM(accounts, RATES)))
      expect(book.totalAUM).toBe(91_320_824)
      expect(book.concentrationHHI).toBe(1828)
      expect(book.concentrationEffectiveN).toBe(5.5)
      expect(book.retentionRate).toBe(92.3)
      expect(book.organicGrowthRate).toBe(1.6)
      expect(book.segments.find((s) => s.segment === 'platinum')).toMatchObject({
        householdCount: 3, aum: 58_558_018,
      })
    })
  })

  describe('positions', () => {
    it.each(accounts.map((a) => [a.id, a.name, a] as const))(
      '%s (%s): Σ position marketValue === account totalValue',
      (_id, _name, account) => {
        const positions = getPositionsForAccount(account.id, account.totalValue)
        const sum = positions.reduce((s, p) => s + p.marketValue, 0)
        const delta = sum - account.totalValue
        expect(
          sum,
          `${account.id} (${account.name}): Σ marketValue across ${positions.length} positions = ` +
            `${sum.toLocaleString('en-US')}, but account.totalValue = ` +
            `${account.totalValue.toLocaleString('en-US')} — a delta of ` +
            `${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(account.totalValue, 0)
      },
    )

    it.each(accounts.map((a) => [a.id, a.name, a] as const))(
      '%s (%s): Σ position weight === 1.000',
      (_id, _name, account) => {
        const positions = getPositionsForAccount(account.id, account.totalValue)
        const sum = positions.reduce((s, p) => s + p.weight, 0)
        expect(
          sum,
          `${account.id} (${account.name}): Σ weight across ${positions.length} positions = ` +
            `${sum.toFixed(4)}, expected 1.0000 (delta ${(sum - 1).toFixed(4)}).`,
        ).toBeCloseTo(1, 2)
      },
    )

    it.each(accounts.map((a) => [a.id, a.name, a] as const))(
      '%s (%s): cashBalance === Σ marketValue of cash positions',
      (_id, _name, account) => {
        const positions = getPositionsForAccount(account.id, account.totalValue)
        const cash = positions
          .filter((p) => p.assetClass === 'cash')
          .reduce((s, p) => s + p.marketValue, 0)
        const delta = account.cashBalance - cash
        expect(
          account.cashBalance,
          `${account.id} (${account.name}): account.cashBalance = ` +
            `${account.cashBalance.toLocaleString('en-US')}, but Σ marketValue of cash-class ` +
            `positions = ${cash.toLocaleString('en-US')} — a delta of ` +
            `${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(cash, 0)
      },
    )

    it.each(accounts.filter((a) => a.isUMA).map((a) => [a.id, a] as const))(
      '%s: Σ sleeve value === account totalValue',
      (_id, account) => {
        const sleeveSum = account.sleeves!.reduce((s, sl) => s + sl.value, 0)
        const delta = sleeveSum - account.totalValue
        expect(
          sleeveSum,
          `${account.id} (${account.name}): Σ sleeve.value across ${account.sleeves!.length} ` +
            `sleeves = ${sleeveSum.toLocaleString('en-US')}, but account.totalValue = ` +
            `${account.totalValue.toLocaleString('en-US')} — a delta of ` +
            `${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(account.totalValue, 0)
      },
    )
  })

  describe('fees and revenue', () => {
    it.each(householdFees.map((f) => [f.householdId, f] as const))(
      '%s: aumBasis === derived household AUM',
      (householdId, fee) => {
        const derived = deriveHouseholdAUM(householdId, accounts, RATES)
        const delta = fee.aumBasis - derived
        expect(
          fee.aumBasis,
          `${householdId} (${fee.householdName}): householdFees.aumBasis = ` +
            `${fee.aumBasis.toLocaleString('en-US')}, but deriveHouseholdAUM(${householdId}) = ` +
            `${derived.toLocaleString('en-US')} — a delta of ${delta.toLocaleString('en-US')} USD. ` +
            `Fees are being billed against a stated AUM that disagrees with the household's ` +
            `actual accounts.`,
        ).toBeCloseTo(derived, 4)
      },
    )

    it.each(householdFees.map((f) => [f.householdId, f] as const))(
      '%s: quarterlyAmount === aumBasis × annualRate ÷ 4',
      (_id, fee) => {
        const expected = (fee.aumBasis * fee.annualRate) / 4
        const delta = fee.quarterlyAmount - expected
        expect(
          fee.quarterlyAmount,
          `${fee.householdId} (${fee.householdName}): quarterlyAmount = ` +
            `${fee.quarterlyAmount.toLocaleString('en-US')}, but aumBasis (` +
            `${fee.aumBasis.toLocaleString('en-US')}) × annualRate (${fee.annualRate}) ÷ 4 = ` +
            `${expected.toLocaleString('en-US')} — a delta of ${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(expected, 4)
      },
    )

    it('there is one fee schedule per household', () => {
      const feeHouseholdIds = householdFees.map((f) => f.householdId).sort()
      const householdIds = households.map((h) => h.id).sort()
      expect(
        feeHouseholdIds,
        `householdFees covers [${feeHouseholdIds.join(', ')}] but households fixture has ` +
          `[${householdIds.join(', ')}].`,
      ).toEqual(householdIds)

      const scheduleHouseholdIds = feeSchedules.map((f) => f.householdId).sort()
      expect(
        scheduleHouseholdIds,
        `feeSchedules covers [${scheduleHouseholdIds.join(', ')}] but households fixture has ` +
          `[${householdIds.join(', ')}].`,
      ).toEqual(householdIds)
    })

    it('feeSchedules annualRevenue === householdFees quarterlyAmount × 4', () => {
      for (const schedule of feeSchedules) {
        const fee = householdFees.find((f) => f.householdId === schedule.householdId)!
        const expected = fee.quarterlyAmount * 4
        const delta = schedule.annualRevenue - expected
        expect(
          schedule.annualRevenue,
          `${schedule.householdId} (${schedule.householdName}): feeSchedules.annualRevenue = ` +
            `${schedule.annualRevenue.toLocaleString('en-US')}, but householdFees.quarterlyAmount ` +
            `(${fee.quarterlyAmount.toLocaleString('en-US')}) × 4 = ${expected.toLocaleString('en-US')} ` +
            `— a delta of ${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(expected, 4)
      }
    })

    it('the current billing cycle totalBilled === Σ household quarterly fees', () => {
      const current = billingCycles.find((c) => c.period === 'Q1 2026')!
      const summed = householdFees.reduce((s, f) => s + f.quarterlyAmount, 0)
      const delta = current.totalBilled - summed
      expect(
        current.totalBilled,
        `billingCycles["Q1 2026"].totalBilled = ${current.totalBilled.toLocaleString('en-US')}, ` +
          `but Σ householdFees.quarterlyAmount = ${summed.toLocaleString('en-US')} — a delta of ` +
          `${delta.toLocaleString('en-US')} USD.`,
      ).toBeCloseTo(summed, 4)
      expect(
        current.householdsCount,
        `billingCycles["Q1 2026"].householdsCount = ${current.householdsCount}, but there are ` +
          `${households.length} households.`,
      ).toBe(households.length)
    })

    it('revenueBySegment === advisory fees grouped by household segment', () => {
      const segmentOf = new Map(households.map((h) => [h.id, h.segment]))
      const expected = new Map<string, { revenue: number; clientCount: number }>()
      for (const fee of householdFees) {
        const seg = segmentOf.get(fee.householdId)!
        const e = expected.get(seg) ?? { revenue: 0, clientCount: 0 }
        e.revenue += fee.quarterlyAmount * 4
        e.clientCount += 1
        expected.set(seg, e)
      }
      for (const row of revenueBySegment) {
        const exp = expected.get(row.segment)!
        const delta = row.revenue - exp.revenue
        expect(
          row.revenue,
          `revenueBySegment["${row.segment}"].revenue = ${row.revenue.toLocaleString('en-US')}, ` +
            `but Σ (quarterlyAmount × 4) for households in "${row.segment}" = ` +
            `${exp.revenue.toLocaleString('en-US')} — a delta of ${delta.toLocaleString('en-US')} USD.`,
        ).toBeCloseTo(exp.revenue, 4)
        expect(
          row.clientCount,
          `revenueBySegment["${row.segment}"].clientCount = ${row.clientCount}, but ` +
            `${exp.clientCount} households actually carry segment "${row.segment}".`,
        ).toBe(exp.clientCount)
      }
    })

    it('totalRecurringRevenue === Σ advisory fees + planning revenue', () => {
      const advisory = householdFees.reduce((s, f) => s + f.quarterlyAmount * 4, 0)
      expect(
        revenueMetrics.totalRecurringRevenue,
        `revenueMetrics.totalRecurringRevenue (${revenueMetrics.totalRecurringRevenue.toLocaleString('en-US')}) ` +
          `should exceed Σ advisory fees alone (${advisory.toLocaleString('en-US')}) since it also ` +
          `includes planning revenue.`,
      ).toBeGreaterThan(advisory)
      const expectedAvg = Math.round(revenueMetrics.totalRecurringRevenue / households.length)
      expect(
        revenueMetrics.avgRevenuePerHousehold,
        `revenueMetrics.avgRevenuePerHousehold = ${revenueMetrics.avgRevenuePerHousehold}, but ` +
          `totalRecurringRevenue (${revenueMetrics.totalRecurringRevenue.toLocaleString('en-US')}) ÷ ` +
          `${households.length} households = ${expectedAvg}.`,
      ).toBe(expectedAvg)
    })

    it('the revenue trend has no zero-revenue month and no actual beyond the clock', () => {
      for (const point of revenueTrend) {
        expect(point.revenue === undefined || point.revenue > 0).toBe(true)
        if (point.revenue !== undefined) expect(point.period <= '2026-01').toBe(true)
        if (point.period >= '2026-02') expect(point.revenue).toBeUndefined()
      }
      expect(revenueTrend.filter((p) => p.revenue !== undefined)).toHaveLength(12)
      expect(revenueTrend[revenueTrend.length - 1]!.projected).toBe(69_563)
      expect(revenueTrend.find((p) => p.period === '2026-01')!.revenue).toBe(68_535)
    })
  })
})
