import { Phone, Mail } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Prospect, ProspectStage } from '@/types/prospect'

const STAGE_CONFIG: Record<ProspectStage, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-text-tertiary' },
  discovery: { label: 'Discovery', color: 'bg-accent-blue' },
  proposal: { label: 'Proposal', color: 'bg-accent-purple' },
  decision: { label: 'Decision', color: 'bg-amber-500' },
  onboarding: { label: 'Onboarding', color: 'bg-accent-green' },
}

function daysInStage(prospect: Prospect): number {
  const changed = new Date(prospect.stageChangedAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.round((now - changed) / (1000 * 60 * 60 * 24)))
}

const columns: ColumnDef<Prospect, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <p className="text-body-strong">{row.original.name}</p>
        {row.original.company && (
          <p className="text-caption text-text-tertiary">{row.original.company}</p>
        )}
      </div>
    ),
    size: 220,
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => {
      const cfg = STAGE_CONFIG[row.original.stage]
      return (
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', cfg.color)} />
          <span className="text-body">{cfg.label}</span>
        </div>
      )
    },
    size: 120,
  },
  {
    accessorKey: 'estimatedAUM',
    header: 'Est. AUM',
    cell: ({ row }) => (
      <span className="font-mono text-body">{formatCurrency(row.original.estimatedAUM, true)}</span>
    ),
    size: 130,
  },
  {
    accessorKey: 'probability',
    header: 'Probability',
    cell: ({ row }) => {
      const p = row.original.probability
      return (
        <span className={cn(
          'font-mono text-body font-medium',
          p >= 0.7 ? 'text-accent-green' : p >= 0.4 ? 'text-amber-600' : 'text-text-secondary',
        )}>
          {(p * 100).toFixed(0)}%
        </span>
      )
    },
    size: 100,
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const labels: Record<string, string> = {
        referral: 'Referral',
        event: 'Event',
        website: 'Website',
        cold_outreach: 'Cold Outreach',
        existing_client: 'Existing Client',
      }
      return <Badge variant="default">{labels[row.original.source] ?? row.original.source}</Badge>
    },
    size: 120,
  },
  {
    id: 'daysInStage',
    header: 'Days in Stage',
    accessorFn: (row) => daysInStage(row),
    cell: ({ row }) => {
      const days = daysInStage(row.original)
      return (
        <span className={cn(
          'font-mono text-body',
          days > 30 ? 'text-accent-red font-medium' : days > 14 ? 'text-amber-600' : 'text-text-secondary',
        )}>
          {days}d
        </span>
      )
    },
    size: 110,
  },
  {
    accessorKey: 'nextAction',
    header: 'Next Action',
    cell: ({ row }) => (
      <span className="text-caption text-text-secondary line-clamp-1">{row.original.nextAction}</span>
    ),
    size: 240,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); window.open(`tel:${row.original.phone}`) }}
          className="rounded p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
          title={`Call ${row.original.phone}`}
        >
          <Phone className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.open(`mailto:${row.original.email}`) }}
          className="rounded p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
          title={`Email ${row.original.email}`}
        >
          <Mail className="h-3.5 w-3.5" />
        </button>
      </div>
    ),
    size: 90,
  },
]

export function ProspectListView({ prospects }: { prospects: Prospect[] }) {
  return (
    <DataTable
      data={prospects}
      columns={columns}
      searchColumn="name"
      emptyMessage="No prospects found"
      compact
    />
  )
}
