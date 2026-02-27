import { useQuery, useMutation } from '@tanstack/react-query'
import { getReportTemplates, generateReport } from '@/services/reports'
import type { ReportConfig } from '@/types/report'

export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: getReportTemplates,
    staleTime: 300_000,
  })
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: (config: ReportConfig) => generateReport(config),
  })
}
