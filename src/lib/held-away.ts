import type { HeldAwayAsset } from '@/types/held-away'

/**
 * Whether a held-away holding can hold or acquire a security that could be substantially identical
 * to a listed one: not property, not private company stock. The Harvest Scanner, the client letter
 * and the workbench all list held-away accounts by this one test.
 */
export function canHoldSecurities(holding: HeldAwayAsset): boolean {
  return !holding.isPrivateCompanyStock && holding.assetClasses.some((c) => c.assetClass !== 'real_estate')
}
