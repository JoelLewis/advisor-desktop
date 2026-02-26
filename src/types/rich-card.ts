type RichCardVariant =
  | 'portfolio_overview'
  | 'rebalance_workflow'
  | 'account_summary'
  | 'client_summary'
  | 'household_summary'

type RichCardMetric = {
  label: string
  value: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

type RichCardData = {
  variant: RichCardVariant
  entityId: string
  entityName: string
  metrics?: RichCardMetric[]
  allocation?: { assetClass: string; weight: number }[]
  driftPercent?: number
  needsRebalance?: boolean
  tier?: string
  memberCount?: number
  accountCount?: number
  actionLabel?: string
  actionRoute?: string
}

export type { RichCardVariant, RichCardMetric, RichCardData }
