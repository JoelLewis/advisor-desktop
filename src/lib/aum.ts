import { convertToBase } from '@/lib/currency'
import type { CurrencyCode, FXRateMap } from '@/types/currency'

/**
 * AUM derivation. Nothing in this module reads a fixture — accounts and FX rates are always
 * passed in — so it is pure, cheap to test, and safe to import from both app and mock layers.
 *
 * Household `managedAUM` was hand-typed
 * and disagreed with the sum of its accounts for 5 of 13 households, and mixed currencies were
 * summed 1:1 (Chen-Wong stated $43.5M against $30.3M of actual FX-applied account value).
 * Conversion now happens at exactly one boundary.
 */
export type AUMAccount = {
  id: string
  householdId: string
  clientId: string
  totalValue: number
  baseCurrency?: CurrencyCode
}

export function accountValueUSD(account: AUMAccount, rates: FXRateMap): number {
  if (!account.baseCurrency || account.baseCurrency === 'USD') return account.totalValue
  return convertToBase(account.totalValue, account.baseCurrency, rates)
}

export function sumAccountsUSD(accounts: readonly AUMAccount[], rates: FXRateMap): number {
  return accounts.reduce((sum, a) => sum + accountValueUSD(a, rates), 0)
}

export function deriveHouseholdAUM(
  householdId: string,
  accounts: readonly AUMAccount[],
  rates: FXRateMap,
): number {
  return sumAccountsUSD(accounts.filter((a) => a.householdId === householdId), rates)
}

export function deriveClientAUM(
  clientId: string,
  accounts: readonly AUMAccount[],
  rates: FXRateMap,
): number {
  return sumAccountsUSD(accounts.filter((a) => a.clientId === clientId), rates)
}

export function deriveBookAUM(accounts: readonly AUMAccount[], rates: FXRateMap): number {
  return sumAccountsUSD(accounts, rates)
}

/**
 * The product previously carried two HHI scales (0–10,000 on Book of
 * Business, 0–1 on account concentration). This is the single scale: shares are fractions of 1,
 * the result is 0–10,000, and `effectiveN` is the companion figure that makes it readable.
 * At 13 households the mathematical floor is 769, which is why 1828 must be reported alongside
 * an effective-N of 5.5 rather than described as "moderate concentration" on its own.
 */
export function herfindahlIndex(shares: readonly number[]): number {
  return shares.reduce((sum, s) => sum + (s * 100) ** 2, 0)
}

export function effectiveN(hhi: number): number {
  return hhi === 0 ? 0 : 10_000 / hhi
}
