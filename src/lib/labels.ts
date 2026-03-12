import type { AccountType, TaxTreatment } from '@/types/account'

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

export const ACCOUNT_TYPE_SHORT_LABELS: Record<AccountType, string> = {
  individual: 'Individual', joint: 'Joint', traditional_ira: 'Trad IRA',
  roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', '401k': '401(k)',
  roth_401k: 'Roth 401(k)', '529': '529', trust_revocable: 'Rev Trust',
  trust_irrevocable: 'Irrev Trust', ugma_utma: 'UGMA/UTMA', entity: 'Entity',
  inherited_ira: 'Inherited IRA', simple_ira: 'SIMPLE IRA',
}

export function taxTreatmentBadgeVariant(treatment: TaxTreatment): 'green' | 'yellow' | 'purple' | 'default' {
  if (treatment === 'tax_free') return 'green'
  if (treatment === 'tax_deferred') return 'yellow'
  if (treatment === 'trust_taxable') return 'purple'
  return 'default'
}

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  taxable: 'Taxable',
  tax_deferred: 'Tax Deferred',
  tax_free: 'Tax Free',
  trust_taxable: 'Trust (Compressed)',
}

export const PRIORITY_VARIANTS = {
  critical: 'red' as const,
  high: 'yellow' as const,
  medium: 'blue' as const,
  low: 'default' as const,
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
