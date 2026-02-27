export const REPORT_TEMPLATES = ['portfolio_review', 'performance_summary', 'tax_summary', 'financial_plan_update'] as const
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number]

export const REPORT_PERIODS = ['mtd', 'qtd', 'ytd', '1y', '3y', 'custom'] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]

export const REPORT_SECTIONS = [
  'executive_summary',
  'portfolio_overview',
  'performance_analysis',
  'asset_allocation',
  'holdings_detail',
  'transactions',
  'tax_summary',
  'planning_progress',
  'market_commentary',
  'recommendations',
] as const
export type ReportSection = (typeof REPORT_SECTIONS)[number]

export type ReportConfig = {
  template: ReportTemplate
  period: ReportPeriod
  sections: ReportSection[]
  clientId?: string
  householdId?: string
}

export type GeneratedReport = {
  id: string
  title: string
  generatedAt: string
  sections: { id: ReportSection; title: string; content: string }[]
}
