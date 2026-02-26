export const ASSET_CLASS_COLORS: Record<string, string> = {
  us_equity: '#2563EB',
  intl_equity: '#3B82F6',
  emerging_markets: '#60A5FA',
  fixed_income: '#059669',
  alternatives: '#7C3AED',
  real_estate: '#D97706',
  commodities: '#DC2626',
  cash: '#94A3B8',
  digital_assets: '#F59E0B',
  private_equity: '#0891B2',
}

export const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity',
  intl_equity: 'Intl Equity',
  emerging_markets: 'Emerging Markets',
  fixed_income: 'Fixed Income',
  alternatives: 'Alternatives',
  real_estate: 'Real Estate',
  commodities: 'Commodities',
  cash: 'Cash',
  digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

/** Returns white or dark text color based on background luminance for chart readability. */
export function contrastTextColor(hexBg: string): string {
  const hex = hexBg.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#0F172A' : '#FFFFFF'
}
