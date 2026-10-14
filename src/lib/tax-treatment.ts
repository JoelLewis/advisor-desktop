import type { TaxTreatment } from '@/types/account'

export type { TaxTreatment }

/**
 * §9.1 · tax-loss-harvesting — a loss realized inside a traditional IRA or a Roth is not
 * recognised on the owner's current return (IRS Pub 590-A: do not take IRA investment gains or
 * losses into account while the IRA remains open), and a 529's earnings are tax-free when used
 * for qualified expenses. In both cases "estimated tax benefit" is not a smaller number, it is a
 * category error — there is no realization event to harvest.
 *
 * `trust_taxable` (an irrevocable trust, e.g. acc-006) is deliberately included: the trust itself
 * files a return and pays its own tax, so a loss realized in it is exactly as deductible as one in
 * a taxable individual account. `oms.ts`'s rebalance tax estimator already drew this same line
 * (`taxTreatment === 'taxable' || taxTreatment === 'trust_taxable'`) before this predicate moved
 * here, and `ai.ts`'s `HARVEST_ELIGIBLE_TREATMENTS` — the Task 17 dashboard fix this task is the
 * per-account counterpart to — draws it identically. A predicate that only matched `'taxable'`
 * would silently degrade acc-006 from "gate suppresses the false claim" to "gate suppresses a real
 * one" — the second, silent failure mode this task exists to avoid on the individual-account side.
 */
export function isTaxableAccount(treatment: TaxTreatment): boolean {
  return treatment === 'taxable' || treatment === 'trust_taxable'
}

/**
 * Returns the disclosure copy for a tax-advantaged account, or `null` when the account is one a
 * deductible loss can actually be realized in. Callers gate harvesting surfaces on this returning
 * non-null rather than re-deriving the same taxable/not-taxable split a second way.
 */
export function harvestingDisclosureFor(treatment: TaxTreatment): string | null {
  if (isTaxableAccount(treatment)) return null
  const label = treatment === 'tax_deferred' ? 'tax-deferred' : 'tax-free'
  return `Tax-loss harvesting is not applicable in a ${label} account: losses realized here are not deductible on the owner's current return, so no tax benefit arises.`
}
