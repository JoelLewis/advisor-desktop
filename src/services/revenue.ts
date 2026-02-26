import { get } from './api-client'
import type { RevenueMetrics, FeeSchedule, BillingRecord, RevenueTrend, RevenueBySegment } from '@/types/revenue'

export function getRevenueMetrics() {
  return get<RevenueMetrics>('/revenue/metrics')
}

export function getFeeSchedules() {
  return get<FeeSchedule[]>('/revenue/fees')
}

export function getBillingRecords(params?: Record<string, string>) {
  return get<BillingRecord[]>('/revenue/billing', params)
}

export function getRevenueTrend() {
  return get<RevenueTrend[]>('/revenue/trend')
}

export function getRevenueBySegment() {
  return get<RevenueBySegment[]>('/revenue/by-segment')
}
