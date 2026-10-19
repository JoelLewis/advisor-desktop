import type { TaxTreatment } from '@/types/account'

export type { TaxTreatment }

/**
 * A loss realized inside a traditional IRA or a Roth is not
 * recognized on the owner's current return (IRS Pub 590-A: do not take IRA investment gains or
 * losses into account while the IRA remains open), and a 529's earnings are tax-free when used
 * for qualified expenses. In both cases "estimated tax benefit" is not a smaller number, it is a
 * category error — there is no realization event to harvest.
 *
 * `trust_taxable` (an irrevocable trust, e.g. acc-006) is deliberately included: the trust itself
 * files a return and pays its own tax, so a loss realized in it is exactly as deductible as one in
 * a taxable individual account. A predicate that matched only `'taxable'` would silently drop the
 * trust's real harvestable losses.
 */
export function isTaxableAccount(treatment: TaxTreatment): boolean {
  return treatment === 'taxable' || treatment === 'trust_taxable'
}
