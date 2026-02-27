import { useState, useMemo } from 'react'
import { Search, Shield, FileText, CheckCircle2, Pencil, XCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import { useArchiveSearch, useArchiveStats } from '@/hooks/use-archives'
import { formatDate, cn } from '@/lib/utils'
import {
  ARCHIVE_DOC_TYPES,
  ARCHIVE_DOC_TYPE_LABELS,
  ADVISOR_DISPOSITIONS,
} from '@/types/archive'
import type { ArchiveRecord, ArchiveDocType, AdvisorDisposition, ArchiveSearchParams } from '@/types/archive'

const DISPOSITION_CONFIG: Record<AdvisorDisposition, { label: string; variant: 'green' | 'yellow' | 'red'; icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', variant: 'green', icon: CheckCircle2 },
  edited: { label: 'Edited', variant: 'yellow', icon: Pencil },
  rejected: { label: 'Rejected', variant: 'red', icon: XCircle },
}

function DiffView({ original, final, editSummary }: { original: string; final: string; editSummary?: string }) {
  if (original === final) {
    return (
      <div className="rounded-md border border-border-primary bg-surface-secondary p-3">
        <p className="mb-1 text-caption font-medium text-accent-green">No edits — approved as generated</p>
        <pre className="whitespace-pre-wrap font-mono text-[11px] text-text-secondary">{final}</pre>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {editSummary && (
        <div className="rounded-md border border-accent-yellow/30 bg-accent-yellow/5 px-3 py-2">
          <p className="text-caption font-medium text-accent-yellow">Edit Summary</p>
          <p className="mt-0.5 text-caption text-text-secondary">{editSummary}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-accent-red/20 bg-accent-red/5 p-3">
          <p className="mb-1 text-caption font-medium text-accent-red">AI Original</p>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-text-secondary">{original}</pre>
        </div>
        <div className="rounded-md border border-accent-green/20 bg-accent-green/5 p-3">
          <p className="mb-1 text-caption font-medium text-accent-green">Final Version</p>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-text-secondary">{final}</pre>
        </div>
      </div>
    </div>
  )
}

function ArchiveRow({ record }: { record: ArchiveRecord }) {
  const [expanded, setExpanded] = useState(false)
  const config = DISPOSITION_CONFIG[record.disposition]
  const Icon = config.icon

  return (
    <div className="border-b border-border-primary last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-tertiary"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-body-strong">{record.title}</p>
            {record.worm && (
              <span className="flex items-center gap-0.5 rounded bg-accent-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-blue" title="Write Once Read Many — immutable compliance record">
                <Lock className="h-2.5 w-2.5" /> WORM
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-caption text-text-tertiary">
            <span>{record.clientName}</span>
            <span>{record.advisorName}</span>
            <span className="font-mono">{formatDate(record.createdAt)}</span>
          </div>
        </div>
        <Badge variant="default">{ARCHIVE_DOC_TYPE_LABELS[record.documentType]}</Badge>
        <Badge variant={config.variant}>
          <Icon className="mr-1 h-3 w-3" />{config.label}
        </Badge>
        <span className="text-caption text-text-tertiary">{record.aiModel}</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-text-tertiary" /> : <ChevronDown className="h-4 w-4 text-text-tertiary" />}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border-primary bg-surface-secondary px-4 py-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div>
              <p className="text-caption font-medium text-text-secondary">AI Model</p>
              <p className="text-caption text-text-primary">{record.aiModel}</p>
            </div>
            <div>
              <p className="text-caption font-medium text-text-secondary">Data Sources</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {record.dataSources.map((src) => (
                  <span key={src} className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] text-text-secondary">{src}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-caption font-medium text-text-secondary">Retention Policy</p>
              <p className="text-caption text-text-primary">{record.retentionPolicy}</p>
            </div>
            <div>
              <p className="text-caption font-medium text-text-secondary">Retention Expires</p>
              <p className="font-mono text-caption text-text-primary">{formatDate(record.retentionExpiresAt)}</p>
            </div>
          </div>

          {/* Diff view */}
          <DiffView
            original={record.originalContent}
            final={record.finalContent}
            editSummary={record.editSummary}
          />
        </div>
      )}
    </div>
  )
}

export function ArchivePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState<ArchiveDocType | ''>('')
  const [dispositionFilter, setDispositionFilter] = useState<AdvisorDisposition | ''>('')

  const searchParams = useMemo<ArchiveSearchParams>(() => {
    const params: ArchiveSearchParams = {}
    if (searchQuery.trim()) params.query = searchQuery.trim()
    if (docTypeFilter) params.docType = docTypeFilter
    if (dispositionFilter) params.disposition = dispositionFilter
    return params
  }, [searchQuery, docTypeFilter, dispositionFilter])

  const { data: records, isLoading } = useArchiveSearch(searchParams)
  const { data: stats } = useArchiveStats()

  if (isLoading && !records) {
    return <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-96" /></div>
  }

  const metrics = stats ? [
    { label: 'Total Records', value: String(stats.total) },
    { label: 'Approved', value: String(stats.approved) },
    { label: 'Edited', value: String(stats.edited) },
    { label: 'Rejected', value: String(stats.rejected) },
    { label: 'WORM Compliant', value: `${stats.wormCompliant}/${stats.total}` },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-purple/10">
          <Shield className="h-5 w-5 text-accent-purple" />
        </div>
        <div>
          <h1 className="text-page-title">Books & Records Archive</h1>
          <p className="text-caption text-text-secondary">
            Immutable archive of all AI-generated documents with advisor disposition tracking
          </p>
        </div>
      </div>

      {stats && <DenseMetricsBar metrics={metrics} />}

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, client, advisor, or content..."
                className="w-full rounded-md border border-border-secondary bg-surface-primary py-2 pl-9 pr-3 text-caption text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
              />
            </div>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value as ArchiveDocType | '')}
              className="rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-caption text-text-primary"
            >
              <option value="">All Types</option>
              {ARCHIVE_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{ARCHIVE_DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={dispositionFilter}
              onChange={(e) => setDispositionFilter(e.target.value as AdvisorDisposition | '')}
              className="rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-caption text-text-primary"
            >
              <option value="">All Dispositions</option>
              {ADVISOR_DISPOSITIONS.map((d) => (
                <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader action={
          <span className="text-caption text-text-secondary">
            {records?.length ?? 0} records
          </span>
        }>
          <div className="flex items-center gap-2">
            <FileText className={cn('h-4 w-4', records && records.length > 0 ? 'text-accent-purple' : 'text-text-tertiary')} />
            Archive Records
          </div>
        </CardHeader>
        {records && records.length > 0 ? (
          <div>
            {records.map((record) => (
              <ArchiveRow key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <CardContent className="py-12 text-center text-text-tertiary">
            {searchQuery || docTypeFilter || dispositionFilter
              ? 'No records match your filters'
              : 'No archive records'}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
