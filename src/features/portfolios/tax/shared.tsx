/* eslint-disable react-refresh/only-export-components -- shared utility components + constants */
import { cn } from '@/lib/utils'

export const HOLDING_LABELS: Record<string, string> = { short: 'Short-Term', long: 'Long-Term' }

export const MOCK_NOW = '2026-02-25'

const TH_ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={cn('px-4 py-2.5 text-caption font-medium text-text-secondary', TH_ALIGN[align])}>
      {children}
    </th>
  )
}
