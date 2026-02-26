export type ReconStatus = 'synced' | 'pending' | 'break' | 'error'

export type BreakSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ReconBreak = {
  id: string
  integrationName: string
  field: string
  expectedValue: string
  actualValue: string
  severity: BreakSeverity
  detectedAt: string
  resolvedAt?: string
}

export type IntegrationHealth = {
  name: string
  status: ReconStatus
  lastSync: string
  breakCount: number
  /** Uptime as a percentage over the last 30 days */
  uptime: number
}
