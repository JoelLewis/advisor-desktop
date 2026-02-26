import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, ChevronDown, Users, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { AllocationChart } from '@/components/ui/AllocationChart'
import { Skeleton } from '@/components/ui/Skeleton'
import { useHouseholds } from '@/hooks/use-households'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Household } from '@/types/household'
import type { ClientSegment } from '@/types/client'

const SEGMENT_BADGE_VARIANT: Record<ClientSegment, 'purple' | 'yellow' | 'default' | 'blue'> = {
  platinum: 'purple',
  gold: 'yellow',
  silver: 'default',
  bronze: 'blue',
}

type SortKey = 'aum' | 'name' | 'members'

const ALLOCATION_TEMPLATES: Record<ClientSegment, { assetClass: string; weight: number }[]> = {
  platinum: [
    { assetClass: 'us_equity', weight: 0.35 },
    { assetClass: 'intl_equity', weight: 0.15 },
    { assetClass: 'fixed_income', weight: 0.20 },
    { assetClass: 'alternatives', weight: 0.15 },
    { assetClass: 'private_equity', weight: 0.10 },
    { assetClass: 'cash', weight: 0.05 },
  ],
  gold: [
    { assetClass: 'us_equity', weight: 0.40 },
    { assetClass: 'intl_equity', weight: 0.12 },
    { assetClass: 'fixed_income', weight: 0.25 },
    { assetClass: 'alternatives', weight: 0.10 },
    { assetClass: 'real_estate', weight: 0.08 },
    { assetClass: 'cash', weight: 0.05 },
  ],
  silver: [
    { assetClass: 'us_equity', weight: 0.45 },
    { assetClass: 'intl_equity', weight: 0.10 },
    { assetClass: 'fixed_income', weight: 0.30 },
    { assetClass: 'real_estate', weight: 0.05 },
    { assetClass: 'cash', weight: 0.10 },
  ],
  bronze: [
    { assetClass: 'us_equity', weight: 0.50 },
    { assetClass: 'fixed_income', weight: 0.30 },
    { assetClass: 'cash', weight: 0.20 },
  ],
}

function segmentBreakdownText(households: Household[]): string {
  const counts: Record<ClientSegment, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 }
  for (const hh of households) {
    counts[hh.segment] += 1
  }
  const parts: string[] = []
  if (counts.platinum > 0) parts.push(`${counts.platinum} Platinum`)
  if (counts.gold > 0) parts.push(`${counts.gold} Gold`)
  if (counts.silver > 0) parts.push(`${counts.silver} Silver`)
  if (counts.bronze > 0) parts.push(`${counts.bronze} Bronze`)
  return parts.join(' \u00B7 ')
}

function sortHouseholds(households: Household[], sortKey: SortKey): Household[] {
  const sorted = [...households]
  switch (sortKey) {
    case 'aum':
      sorted.sort((a, b) => b.totalAUM - a.totalAUM)
      break
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'members':
      sorted.sort((a, b) => b.members.length - a.members.length)
      break
  }
  return sorted
}

export function HouseholdListView() {
  const { data, isLoading } = useHouseholds()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('aum')

  const households = useMemo(() => data?.items ?? [], [data?.items])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    const list = term
      ? households.filter((hh) => hh.name.toLowerCase().includes(term))
      : households
    return sortHouseholds(list, sortKey)
  }, [households, search, sortKey])

  const totalAUM = useMemo(() => households.reduce((sum, hh) => sum + hh.totalAUM, 0), [households])
  const avgAUM = households.length > 0 ? totalAUM / households.length : 0

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 max-w-md" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Households" value={String(households.length)} />
        <MetricCard label="Total AUM" value={formatCurrency(totalAUM, true)} />
        <MetricCard label="Avg AUM / HH" value={formatCurrency(avgAUM, true)} />
        <MetricCard label="Segments" value={segmentBreakdownText(households)} />
      </div>

      {/* Search + Sort Controls */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search households..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-primary py-2 pl-9 pr-3 text-body placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-secondary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          <option value="aum">Sort by AUM</option>
          <option value="name">Sort by Name</option>
          <option value="members">Sort by Members</option>
        </select>
      </div>

      {/* Household Cards */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-2 text-body text-text-secondary">No households found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((hh) => {
            const isExpanded = expandedIds.has(hh.id)
            return (
              <Card key={hh.id}>
                {/* Header row */}
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => toggleExpanded(hh.id)}
                    className="flex shrink-0 items-center justify-center rounded p-1 hover:bg-surface-tertiary"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-text-tertiary transition-transform',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  </button>
                  <button
                    onClick={() => navigate(`/households/${hh.id}`)}
                    className="text-body-strong text-text-primary hover:text-accent-blue hover:underline"
                  >
                    {hh.name}
                  </button>
                  <Badge variant={SEGMENT_BADGE_VARIANT[hh.segment]}>
                    {hh.segment.charAt(0).toUpperCase() + hh.segment.slice(1)}
                  </Badge>
                  <span className="flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-text-secondary">
                    <Users className="h-3 w-3" />
                    {hh.members.length} {hh.members.length === 1 ? 'member' : 'members'}
                  </span>
                  <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-text-secondary">
                    {hh.accountIds.length} {hh.accountIds.length === 1 ? 'account' : 'accounts'}
                  </span>
                  <span className="ml-auto font-mono text-body font-medium text-text-primary">
                    {formatCurrency(hh.totalAUM, true)}
                  </span>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border-primary p-4 animate-fade-in">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-6">
                      {/* Members */}
                      <div>
                        <h4 className="mb-2 text-caption font-medium uppercase tracking-wide text-text-tertiary">
                          Members
                        </h4>
                        <div className="space-y-2">
                          {hh.members.map((member) => (
                            <div key={member.clientId} className="flex items-center gap-3">
                              <Link
                                to={`/clients/${member.clientId}`}
                                className="text-body text-accent-blue hover:underline"
                              >
                                {member.name}
                              </Link>
                              <Badge variant="default">
                                {member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)}
                              </Badge>
                              <span className="text-caption text-text-tertiary">
                                {formatDate(member.dateOfBirth)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Account summary */}
                      <div>
                        <h4 className="mb-2 text-caption font-medium uppercase tracking-wide text-text-tertiary">
                          Accounts
                        </h4>
                        <div className="space-y-1">
                          {hh.accountIds.map((accId) => (
                            <div key={accId} className="flex items-center gap-2">
                              <span className="font-mono text-caption text-text-secondary">{accId}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-caption text-text-tertiary">
                          Managed: {formatCurrency(hh.managedAUM, true)} | Held Away: {formatCurrency(hh.heldAwayAUM, true)}
                        </p>
                      </div>

                      {/* Mini Allocation Chart */}
                      <div>
                        <h4 className="mb-2 text-caption font-medium uppercase tracking-wide text-text-tertiary">
                          Allocation
                        </h4>
                        <AllocationChart
                          data={ALLOCATION_TEMPLATES[hh.segment]}
                          size="sm"
                          showLegend={false}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
