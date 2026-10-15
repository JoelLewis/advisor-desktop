type ActivityType =
  | 'trade'
  | 'meeting'
  | 'email'
  | 'call'
  | 'document'
  | 'rebalance'
  | 'ai_action'
  | 'compliance'
  | 'system'

type ActivitySource = 'pms' | 'crm' | 'oms' | 'compliance' | 'ai' | 'manual'

export type ActivityItem = {
  id: string
  type: ActivityType
  source: ActivitySource
  title: string
  description: string
  entityType?: 'client' | 'account' | 'household' | 'portfolio'
  entityId?: string
  entityName?: string
  timestamp: string
  read: boolean
}
