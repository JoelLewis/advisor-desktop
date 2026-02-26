import { useQuery } from '@tanstack/react-query'
import { getRevenueMetrics, getFeeSchedules, getBillingRecords, getRevenueTrend, getRevenueBySegment } from '@/services/revenue'

export function useRevenueMetrics() {
  return useQuery({
    queryKey: ['revenue', 'metrics'],
    queryFn: getRevenueMetrics,
  })
}

export function useFeeSchedules() {
  return useQuery({
    queryKey: ['revenue', 'fees'],
    queryFn: getFeeSchedules,
  })
}

export function useBillingRecords(period?: string) {
  return useQuery({
    queryKey: ['revenue', 'billing', period],
    queryFn: () => getBillingRecords(period ? { period } : undefined),
  })
}

export function useRevenueTrend() {
  return useQuery({
    queryKey: ['revenue', 'trend'],
    queryFn: getRevenueTrend,
  })
}

export function useRevenueBySegment() {
  return useQuery({
    queryKey: ['revenue', 'by-segment'],
    queryFn: getRevenueBySegment,
  })
}
