import type { Currency, Percentage } from './common'
import type { AssetClass } from './portfolio'

export type HeldAwayAssetClass = {
  assetClass: AssetClass
  percentage: Percentage
}

export type HeldAwayAsset = {
  id: string
  clientId: string
  householdId: string
  institutionName: string
  accountType: string
  estimatedValue: Currency
  lastUpdated: string
  assetClasses: HeldAwayAssetClass[]
  consolidationOpportunity: boolean
  /** Shares of a company that is not listed: never substantially identical to a listed security. */
  isPrivateCompanyStock?: boolean
}

export type ProposalStatus = 'draft' | 'presented' | 'accepted' | 'declined'

export type ConsolidationProposal = {
  id: string
  householdId: string
  heldAwayAssetIds: string[]
  estimatedFeeSavings: Currency
  estimatedTaxEfficiency: Percentage
  proposalStatus: ProposalStatus
  createdAt: string
}
