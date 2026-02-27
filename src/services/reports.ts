import { get, post } from './api-client'
import type { GeneratedReport, ReportConfig, ReportSection } from '@/types/report'

export type ReportTemplateInfo = {
  id: string
  label: string
  defaultSections: ReportSection[]
}

export function getReportTemplates() {
  return get<ReportTemplateInfo[]>('/reports/templates')
}

export function generateReport(config: ReportConfig) {
  return post<GeneratedReport>('/reports/generate', config)
}
