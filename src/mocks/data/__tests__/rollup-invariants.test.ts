import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { clients } from '@/mocks/data/clients'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { deriveBookAUM, deriveClientAUM, deriveHouseholdAUM } from '@/lib/aum'

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
})
