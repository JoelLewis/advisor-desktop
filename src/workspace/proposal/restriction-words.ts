import { fmtDayMonthYear } from '@/kit/measure'
import type { RepurchaseRestriction } from '@/services/oms'

export function restrictionSource({ source }: RepurchaseRestriction): string {
  return source.kind === 'recorded'
    ? `recorded · sale of ${fmtDayMonthYear(source.saleDate)} in ${source.accountName}`
    : `projected · this proposal's sale in ${source.accountName}`
}
