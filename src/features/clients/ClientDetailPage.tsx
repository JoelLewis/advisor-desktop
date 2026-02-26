import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, FileText, Pin, Send } from 'lucide-react'
import { ClientHeader } from '@/components/ui/ClientHeader'
import { TabLayout } from '@/components/ui/TabLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { AllocationChart } from '@/components/ui/AllocationChart'
import { GoalProgressCard } from '@/components/ui/GoalProgressCard'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { ActivityItemRow } from '@/components/ui/ActivityItem'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { useClient } from '@/hooks/use-clients'
import { useAccounts } from '@/hooks/use-accounts'
import { usePlan } from '@/hooks/use-planning'
import { useClientDocuments } from '@/hooks/use-documents'
import { useClientActivities } from '@/hooks/use-client-activity'
import { useClientNotes, useCreateNote } from '@/hooks/use-notes'
import { useAIInsights } from '@/hooks/use-ai'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types/account'
import type { Document, DocumentType } from '@/types/document'
import type { ColumnDef } from '@tanstack/react-table'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'Individual', joint: 'Joint', traditional_ira: 'Traditional IRA',
  roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', '401k': '401(k)',
  roth_401k: 'Roth 401(k)', '529': '529 Plan', trust_revocable: 'Revocable Trust',
  trust_irrevocable: 'Irrevocable Trust', ugma_utma: 'UGMA/UTMA', entity: 'Entity',
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  ips: 'IPS', proposal: 'Proposal', agreement: 'Agreement', statement: 'Statement',
  tax_report: 'Tax Report', correspondence: 'Correspondence', compliance: 'Compliance',
  meeting_notes: 'Meeting Notes', other: 'Other',
}

const accountColumns: ColumnDef<Account, unknown>[] = [
  {
    accessorKey: 'name', header: 'Account',
    cell: ({ row }) => (
      <div>
        <p className="text-body-strong">{row.original.name}</p>
        <p className="font-mono text-caption text-text-tertiary">{row.original.accountNumber}</p>
      </div>
    ), size: 280,
  },
  {
    accessorKey: 'type', header: 'Type',
    cell: ({ row }) => <span className="text-caption">{ACCOUNT_TYPE_LABELS[row.original.type]}</span>,
    size: 140,
  },
  {
    accessorKey: 'totalValue', header: 'Value',
    cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.totalValue, true)}</span>,
    size: 120,
  },
  {
    accessorKey: 'taxTreatment', header: 'Tax',
    cell: ({ row }) => (
      <Badge variant={row.original.taxTreatment === 'tax_free' ? 'green' : row.original.taxTreatment === 'tax_deferred' ? 'yellow' : 'default'}>
        {row.original.taxTreatment.replace('_', ' ')}
      </Badge>
    ),
    size: 110,
  },
  {
    accessorKey: 'isUMA', header: 'UMA',
    cell: ({ row }) => row.original.isUMA ? <Badge variant="purple">UMA</Badge> : null,
    size: 80,
  },
  {
    accessorKey: 'custodian', header: 'Custodian',
    cell: ({ row }) => <span className="text-caption text-text-secondary">{row.original.custodian}</span>,
    size: 100,
  },
]

const documentColumns: ColumnDef<Document, unknown>[] = [
  {
    accessorKey: 'name', header: 'Document',
    cell: ({ row }) => (
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
        <div>
          <p className={cn('text-body-strong', row.original.aiGenerated && 'text-accent-purple')}>{row.original.name}</p>
          {row.original.aiGenerated && (
            <span className="flex items-center gap-1 text-caption text-accent-purple">
              <Sparkles className="h-3 w-3" /> AI Generated
            </span>
          )}
        </div>
      </div>
    ),
    size: 320,
  },
  {
    accessorKey: 'type', header: 'Type',
    cell: ({ row }) => <span className="text-caption">{DOC_TYPE_LABELS[row.original.type]}</span>,
    size: 120,
  },
  {
    accessorKey: 'signatureStatus', header: 'Signature',
    cell: ({ row }) => {
      const v = { not_required: 'default' as const, pending: 'yellow' as const, signed: 'green' as const, expired: 'red' as const }
      return <Badge variant={v[row.original.signatureStatus]}>{row.original.signatureStatus.replace('_', ' ')}</Badge>
    },
    size: 120,
  },
  {
    accessorKey: 'createdAt', header: 'Date',
    cell: ({ row }) => <span className="font-mono text-caption text-text-secondary">{formatDate(row.original.createdAt)}</span>,
    size: 110,
  },
  {
    accessorKey: 'createdBy', header: 'Created By',
    cell: ({ row }) => <span className="text-caption text-text-secondary">{row.original.createdBy}</span>,
    size: 130,
  },
]

export function ClientDetailPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const id = clientId ?? ''
  const { data: client, isLoading } = useClient(id)
  const { data: accounts } = useAccounts(clientId ? { clientId } : undefined)
  const { data: plan } = usePlan(id)
  const { data: documents } = useClientDocuments(id)
  const { data: activities } = useClientActivities(id)
  const { data: notes } = useClientNotes(id)
  const createNote = useCreateNote(id)
  const { data: insights } = useAIInsights('client_detail', id || undefined)
  const [noteText, setNoteText] = useState('')

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>
  }

  if (!client) {
    return <div className="py-12 text-center text-text-tertiary">Client not found</div>
  }

  // Derive allocation from accounts (simplified)
  const allocation = [
    { assetClass: 'us_equity', weight: 0.42 },
    { assetClass: 'intl_equity', weight: 0.12 },
    { assetClass: 'fixed_income', weight: 0.28 },
    { assetClass: 'alternatives', weight: 0.10 },
    { assetClass: 'cash', weight: 0.08 },
  ]

  function handleAddNote() {
    if (!noteText.trim()) return
    createNote.mutate(noteText.trim())
    setNoteText('')
  }

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="space-y-6">
          <Card className="border-l-[3px] border-l-accent-purple">
            <CardContent className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
              <div>
                <p className="text-body-strong text-accent-purple">AI Summary</p>
                <p className="mt-1 text-body text-text-secondary">
                  {client.fullName} is a {client.tier.label} client with {formatCurrency(client.totalAUM, true)} under management.
                  Risk profile is {client.riskProfile.tolerance} (score: {client.riskProfile.score}/100).
                  {plan && ` Aggregate goal probability is ${Math.round(plan.aggregateProbability * 100)}%.`}
                  {plan?.goals.some((g) => g.status === 'at_risk') && ' Some goals are at risk — review recommended.'}
                </p>
              </div>
            </CardContent>
          </Card>
          {insights && insights.length > 0 && (
            <AIInsightStack insights={insights} />
          )}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>Asset Allocation</CardHeader>
              <CardContent>
                <AllocationChart data={allocation} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>Financial Goals</CardHeader>
              <CardContent className="space-y-3">
                {plan?.goals.map((goal) => (
                  <GoalProgressCard key={goal.id} goal={goal} compact />
                )) ?? (
                  <p className="py-8 text-center text-caption text-text-tertiary">No plan on file</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'accounts', label: 'Accounts', count: accounts?.length,
      content: (
        <Card>
          <DataTable
            data={accounts ?? []}
            columns={accountColumns}
            onRowClick={(acc) => navigate(`/portfolios/accounts/${acc.id}`)}
            emptyMessage="No accounts"
          />
        </Card>
      ),
    },
    {
      id: 'planning', label: 'Planning',
      content: (
        <div className="space-y-4">
          {plan ? (
            <>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body-strong">Aggregate Probability</p>
                      <p className="text-caption text-text-secondary">Meeting all goals simultaneously</p>
                    </div>
                    <div className="font-mono text-page-title text-accent-green">
                      {Math.round(plan.aggregateProbability * 100)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                {plan.goals.map((goal) => (
                  <GoalProgressCard key={goal.id} goal={goal} />
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-text-tertiary">
                No financial plan on file
              </CardContent>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'documents', label: 'Documents', count: documents?.length,
      content: (
        <Card>
          <DataTable
            data={documents ?? []}
            columns={documentColumns}
            compact
            emptyMessage="No documents on file"
          />
        </Card>
      ),
    },
    {
      id: 'activity', label: 'Activity', count: activities?.length,
      content: (
        <Card>
          {activities && activities.length > 0 ? (
            <div className="divide-y divide-border-primary">
              {activities.map((item) => (
                <ActivityItemRow
                  key={item.id}
                  item={item}
                  onClick={(a) => {
                    if (a.entityType === 'account' && a.entityId) navigate(`/portfolios/accounts/${a.entityId}`)
                  }}
                />
              ))}
            </div>
          ) : (
            <CardContent className="py-12 text-center text-text-tertiary">
              No activity recorded
            </CardContent>
          )}
        </Card>
      ),
    },
    {
      id: 'notes', label: 'Notes', count: notes?.length,
      content: (
        <div className="space-y-4">
          {/* Add note form */}
          <Card>
            <CardContent>
              <div className="flex gap-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
                  rows={2}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || createNote.isPending}
                  className="self-end rounded-md bg-accent-blue px-3 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notes list */}
          {notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <Card key={note.id} className={cn(note.aiGenerated && 'border-l-[3px] border-l-accent-purple')}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {note.pinned && (
                          <span className="mb-1 flex items-center gap-1 text-caption font-medium text-accent-blue">
                            <Pin className="h-3 w-3" /> Pinned
                          </span>
                        )}
                        <p className="text-body text-text-primary">{note.content}</p>
                        <div className="mt-2 flex items-center gap-3 text-caption text-text-tertiary">
                          <span>{note.createdBy}</span>
                          <span>{formatDate(note.createdAt)}</span>
                          {note.aiGenerated && (
                            <span className="flex items-center gap-1 text-accent-purple">
                              <Sparkles className="h-3 w-3" /> AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-text-tertiary">
                No notes yet
              </CardContent>
            </Card>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <ClientHeader client={client} />
      <TabLayout tabs={tabs} />
    </div>
  )
}
