import { useQuery } from '@tanstack/react-query'
import { searchArchives, getArchiveRecord, getArchiveStats } from '@/services/archives'
import type { ArchiveSearchParams } from '@/types/archive'

export function useArchiveSearch(params?: ArchiveSearchParams) {
  return useQuery({
    queryKey: ['archives', params],
    queryFn: () => searchArchives(params),
    staleTime: 60_000,
  })
}

export function useArchiveRecord(id: string) {
  return useQuery({
    queryKey: ['archive', id],
    queryFn: () => getArchiveRecord(id),
    enabled: !!id,
  })
}

export function useArchiveStats() {
  return useQuery({
    queryKey: ['archive-stats'],
    queryFn: getArchiveStats,
    staleTime: 120_000,
  })
}
