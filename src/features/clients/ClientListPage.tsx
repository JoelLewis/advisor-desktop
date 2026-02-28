import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useClients } from '@/hooks/use-clients'
import { useHouseholds } from '@/hooks/use-households'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import type { Client, ClientSegment } from '@/types/client'

const SEGMENT_VARIANT: Record<ClientSegment, 'blue' | 'yellow' | 'default'> = {
  platinum: 'blue',
  gold: 'yellow',
  silver: 'default',
  bronze: 'default',
}

const TIER_RANK: Record<ClientSegment, number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
}

function makeColumns(householdNames: Map<string, string>): ColumnDef<Client, unknown>[] {
  return [
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
      sortingFn: (a, b) =>
        TIER_RANK[a.original.segment] - TIER_RANK[b.original.segment],
      size: 100,
    },
    {
      accessorKey: 'totalAUM',
      header: 'AUM',
      cell: ({ row }) => (
        <CurrencyValue value={row.original.totalAUM} compact className="font-mono text-body" />
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
      cell: ({ row }) => {
        const hhId = row.original.householdId
        const name = householdNames.get(hhId) ?? hhId
        return (
          <Link
            to={`/households/${hhId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-caption text-accent-blue hover:underline"
          >
            {name}
          </Link>
        )
      },
      size: 160,
    },
  ]
}

export function ClientListPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useClients()
  const { data: households } = useHouseholds()
  const navigate = useNavigate()

  const householdNames = useMemo(() => {
    const map = new Map<string, string>()
    if (households?.items) {
      for (const hh of households.items) map.set(hh.id, hh.name)
    }
    return map
  }, [households])

  const columns = useMemo(() => makeColumns(householdNames), [householdNames])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-text-secondary" />
          <h1 className="text-page-title">Clients</h1>
          {data && (
            <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-text-secondary">
              {data.total}
            </span>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border-primary bg-surface-primary py-2 pl-9 pr-3 text-body placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
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
