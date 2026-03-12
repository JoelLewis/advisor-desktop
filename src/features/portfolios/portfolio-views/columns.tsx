import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ACCOUNT_TYPE_SHORT_LABELS, TAX_TREATMENT_LABELS, taxTreatmentBadgeVariant } from '@/lib/labels'
import type { Account } from '@/types/account'
import type { CurrencyCode } from '@/types/currency'
import type { DriftStatus } from '@/types/portfolio'
import type { ColumnDef } from '@tanstack/react-table'

export function makeDriftColumns(
  driftMap: Map<string, DriftStatus>,
  selectedIds: Set<string>,
  onToggleSelect: (id: string) => void,
  onRebalance: (accountId: string) => void,
  fmtConvert: (value: number, from: CurrencyCode, opts?: { compact?: boolean }) => string,
): ColumnDef<Account, unknown>[] {
  return [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => {
        const drift = driftMap.get(row.original.id)
        if (!drift?.needsRebalance) return null
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleSelect(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border-secondary accent-accent-blue"
          />
        )
      },
      size: 40,
    },
    {
      accessorKey: 'name', header: 'Account',
      cell: ({ row }) => (
        <div>
          <p className="text-body-strong">{row.original.name}</p>
          <p className="font-mono text-caption text-text-tertiary">{row.original.accountNumber}</p>
        </div>
      ),
      size: 260,
    },
    {
      accessorKey: 'type', header: 'Type',
      cell: ({ row }) => <span className="text-caption">{ACCOUNT_TYPE_SHORT_LABELS[row.original.type]}</span>,
      size: 100,
    },
    {
      accessorKey: 'totalValue', header: 'Value',
      cell: ({ row }) => (
        <span className="font-mono">
          {fmtConvert(row.original.totalValue, row.original.baseCurrency ?? 'USD', { compact: true })}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'taxTreatment', header: 'Tax',
      cell: ({ row }) => (
        <Badge variant={taxTreatmentBadgeVariant(row.original.taxTreatment)}>
          {TAX_TREATMENT_LABELS[row.original.taxTreatment]}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: 'isUMA', header: 'UMA',
      cell: ({ row }) => row.original.isUMA ? <Badge variant="purple">UMA</Badge> : null,
      size: 70,
    },
    {
      accessorKey: 'custodian', header: 'Custodian',
      cell: ({ row }) => <span className="text-caption text-text-secondary">{row.original.custodian}</span>,
      size: 90,
    },
    {
      id: 'drift',
      header: 'Drift',
      cell: ({ row }) => {
        const drift = driftMap.get(row.original.id)
        if (!drift) return <span className="text-caption text-text-tertiary">--</span>
        const val = drift.totalDrift * 100
        return (
          <div className="flex items-center gap-1.5">
            {drift.needsRebalance && <AlertTriangle className="h-3.5 w-3.5 text-accent-red" />}
            <span className={`font-mono text-caption ${drift.needsRebalance ? 'text-accent-red' : val > 1.5 ? 'text-amber-600' : 'text-accent-green'}`}>
              {val.toFixed(1)}%
            </span>
          </div>
        )
      },
      size: 80,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const drift = driftMap.get(row.original.id)
        if (!drift?.needsRebalance) return null
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onRebalance(row.original.id) }}
            className="rounded bg-accent-blue px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-blue/90"
          >
            Rebalance
          </button>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'lastRebalance', header: 'Last Rebal',
      cell: ({ row }) => (
        <span className="font-mono text-caption text-text-secondary">
          {row.original.lastRebalance ? new Date(row.original.lastRebalance).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014'}
        </span>
      ),
      size: 90,
    },
  ]
}
