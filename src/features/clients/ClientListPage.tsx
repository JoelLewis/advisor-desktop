import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabLayout } from '@/components/ui/TabLayout'
import { useClients } from '@/hooks/use-clients'
import { useHouseholds } from '@/hooks/use-households'
import { formatCurrency } from '@/lib/utils'
import { HouseholdListView } from './HouseholdListView'
import type { Client, ClientSegment } from '@/types/client'

const SEGMENT_VARIANT: Record<ClientSegment, 'blue' | 'yellow' | 'default'> = {
  platinum: 'blue',
  gold: 'yellow',
  silver: 'default',
  bronze: 'default',
}

const columns: ColumnDef<Client, unknown>[] = [
  {
    accessorKey: 'fullName',
    header: 'Client',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.original.fullName} src={row.original.photo} size="sm" />
        <div>
          <p className="text-body-strong">{row.original.fullName}</p>
          <p className="text-caption text-text-tertiary">{row.original.occupation}</p>
        </div>
      </div>
    ),
    size: 280,
  },
  {
    accessorKey: 'segment',
    header: 'Tier',
    cell: ({ row }) => (
      <Badge variant={SEGMENT_VARIANT[row.original.segment]}>{row.original.tier.label}</Badge>
    ),
    size: 100,
  },
  {
    accessorKey: 'totalAUM',
    header: 'AUM',
    cell: ({ row }) => (
      <span className="font-mono text-body">{formatCurrency(row.original.totalAUM, true)}</span>
    ),
    size: 120,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-caption text-text-secondary">{row.original.email}</span>
    ),
    size: 240,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="font-mono text-caption text-text-secondary">{row.original.phone}</span>
    ),
    size: 140,
  },
  {
    accessorKey: 'householdId',
    header: 'Household',
    cell: ({ row }) => (
      <span className="text-caption text-text-secondary">{row.original.householdId}</span>
    ),
    size: 120,
  },
]

function ClientsTabContent() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useClients()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border-primary bg-surface-primary py-2 pl-9 pr-3 text-body placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card>
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            searchValue={search}
            searchColumn="fullName"
            onRowClick={(client) => navigate(`/clients/${client.id}`)}
            emptyMessage="No clients found"
            className="max-h-[calc(100vh-340px)]"
          />
        </Card>
      )}
    </div>
  )
}

export function ClientListPage() {
  const { data: clientData } = useClients()
  const { data: householdData } = useHouseholds()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-text-secondary" />
          <h1 className="text-page-title">Clients</h1>
          {clientData && (
            <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-text-secondary">
              {clientData.total}
            </span>
          )}
        </div>
      </div>

      <TabLayout
        tabs={[
          {
            id: 'clients',
            label: 'Clients',
            count: clientData?.total,
            content: <ClientsTabContent />,
          },
          {
            id: 'households',
            label: 'Households',
            count: householdData?.total,
            content: <HouseholdListView />,
          },
        ]}
        defaultTab="clients"
      />
    </div>
  )
}
