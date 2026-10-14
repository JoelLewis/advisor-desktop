import type { AccountType } from '@/types/account'
import type { AssetClass } from '@/types/portfolio'

export const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity',
  intl_equity: 'Intl Equity',
  emerging_markets: 'Emerging Mkts',
  fixed_income: 'Fixed Income',
  alternatives: 'Alternatives',
  real_estate: 'Real Estate',
  commodities: 'Commodities',
  cash: 'Cash',
  digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

/** Asset classes as a client reads them in a letter or a proposal. */
export const CLIENT_ASSET_CLASS_WORDS: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US stocks', intl_equity: 'international stocks', emerging_markets: 'emerging-market stocks', fixed_income: 'bonds',
  alternatives: 'alternative strategies', real_estate: 'real estate', commodities: 'commodities', cash: 'cash',
  digital_assets: 'digital-asset funds', private_equity: 'private equity',
}

/** Full names for asset classes in running prose, where the column abbreviations would read oddly. */
export const ASSET_CLASS_PROSE_LABELS: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US Equity',
  intl_equity: 'International Equity',
  emerging_markets: 'Emerging Markets',
  fixed_income: 'Fixed Income',
  alternatives: 'Alternatives',
  real_estate: 'Real Estate',
  commodities: 'Commodities',
  cash: 'Cash',
  digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'Individual',
  joint: 'Joint',
  traditional_ira: 'Traditional IRA',
  roth_ira: 'Roth IRA',
  sep_ira: 'SEP IRA',
  '401k': '401(k)',
  roth_401k: 'Roth 401(k)',
  '529': '529 Plan',
  trust_revocable: 'Revocable Trust',
  trust_irrevocable: 'Irrevocable Trust',
  ugma_utma: 'UGMA/UTMA',
  entity: 'Entity',
  inherited_ira: 'Inherited IRA',
  simple_ira: 'SIMPLE IRA',
}
