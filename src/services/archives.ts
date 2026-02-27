import { get } from './api-client'
import type { ArchiveRecord, ArchiveSearchParams } from '@/types/archive'

export type ArchiveStats = {
  total: number
  approved: number
  edited: number
  rejected: number
  byType: Record<string, number>
  wormCompliant: number
  oldestRecord: string
  newestRecord: string
}

export function searchArchives(params?: ArchiveSearchParams): Promise<ArchiveRecord[]> {
  const searchParams = new URLSearchParams()
  if (params?.query) searchParams.set('query', params.query)
  if (params?.clientId) searchParams.set('clientId', params.clientId)
  if (params?.docType) searchParams.set('docType', params.docType)
  if (params?.disposition) searchParams.set('disposition', params.disposition)
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
  const qs = searchParams.toString()
  return get<ArchiveRecord[]>(`/compliance/archives${qs ? `?${qs}` : ''}`)
}

export function getArchiveRecord(id: string): Promise<ArchiveRecord> {
  return get<ArchiveRecord>(`/compliance/archives/${id}`)
}

export function getArchiveStats(): Promise<ArchiveStats> {
  return get<ArchiveStats>('/compliance/archives/stats')
}
