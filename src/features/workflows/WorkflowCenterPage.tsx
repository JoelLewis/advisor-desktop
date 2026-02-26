import { CheckCircle2, Circle, Clock, AlertTriangle, Sparkles, User, Bot, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { DataTable } from '@/components/ui/DataTable'
import { useMyActions, useInProcess, useDelegated, useWorkflowTemplates } from '@/hooks/use-workflows'
import { useUIStore } from '@/store/ui-store'
import { formatDate, cn } from '@/lib/utils'
import { PRIORITY_VARIANTS } from '@/lib/labels'
import type { Task, TaskStatus, ProcessTracker, WorkflowTemplate } from '@/types/workflow'
import type { ColumnDef } from '@tanstack/react-table'

const STATUS_ICON: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertTriangle,
  cancelled: Circle,
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'text-text-tertiary',
  in_progress: 'text-accent-blue',
  completed: 'text-accent-green',
  blocked: 'text-accent-red',
  cancelled: 'text-text-tertiary',
}

const STATUS_BADGE_VARIANT: Record<TaskStatus, 'default' | 'blue' | 'green' | 'red'> = {
  pending: 'default',
  in_progress: 'blue',
  completed: 'green',
  blocked: 'red',
  cancelled: 'default',
}

const PROCESS_TYPE_LABELS: Record<string, string> = {
  account_opening: 'Account Opening',
  acat_transfer: 'ACAT Transfer',
  document_signature: 'Document Signature',
  compliance_review: 'Compliance Review',
  trade_order: 'Trade Order',
}

const taskColumns: ColumnDef<Task, unknown>[] = [
  {
    accessorKey: 'status', header: '',
    cell: ({ row }) => {
      const Icon = STATUS_ICON[row.original.status]
      return <Icon className={cn('h-4 w-4', STATUS_COLOR[row.original.status])} />
    },
    size: 40,
    enableSorting: false,
  },
  {
    accessorKey: 'title', header: 'Task',
    cell: ({ row }) => (
      <div>
        <p className={cn('text-body-strong', row.original.status === 'completed' && 'line-through text-text-tertiary')}>
          {row.original.title}
        </p>
        <p className="mt-0.5 text-caption text-text-secondary line-clamp-1">{row.original.description}</p>
      </div>
    ),
    size: 380,
  },
  {
    accessorKey: 'clientName', header: 'Client',
    cell: ({ row }) => row.original.clientName
      ? <span className="text-caption">{row.original.clientName}</span>
      : <span className="text-caption text-text-tertiary">—</span>,
    size: 140,
  },
  {
    accessorKey: 'priority', header: 'Priority',
    cell: ({ row }) => <Badge variant={PRIORITY_VARIANTS[row.original.priority]}>{row.original.priority}</Badge>,
    size: 90,
  },
  {
    accessorKey: 'category', header: 'Category',
    cell: ({ row }) => <span className="text-caption text-text-secondary">{row.original.category.replace('_', ' ')}</span>,
    size: 110,
  },
  {
    accessorKey: 'dueDate', header: 'Due',
    cell: ({ row }) => {
      const due = new Date(row.original.dueDate)
      const today = new Date('2026-02-25')
      const isOverdue = due < today && row.original.status !== 'completed'
      const isDueToday = due.toDateString() === today.toDateString()

      let label = formatDate(row.original.dueDate)
      let colorClass = ''
      if (isOverdue) {
        label = 'Overdue'
        colorClass = 'text-accent-red font-medium'
      } else if (isDueToday) {
        label = 'Today'
        colorClass = 'text-accent-blue font-medium'
      }

      return <span className={cn('font-mono text-caption', colorClass)}>{label}</span>
    },
    size: 100,
  },
  {
    id: 'delegate', header: '',
    cell: ({ row }) => {
      if (row.original.status === 'completed') return null
      return (
        <button
          onClick={() => {
            useUIStore.getState().setInitialMessage(
              `Delegate task: "${row.original.title}"${row.original.clientName ? ` for ${row.original.clientName}` : ''}. Please handle this and report back.`,
            )
          }}
          className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/10"
        >
          <Sparkles className="h-3 w-3" />
          AI
        </button>
      )
    },
    size: 70,
    enableSorting: false,
  },
]

const delegatedColumns: ColumnDef<Task, unknown>[] = [
  {
    accessorKey: 'assignee', header: 'Assigned To',
    cell: ({ row }) => {
      const isAI = row.original.delegationType === 'ai_agent'
      return (
        <div className="flex items-center gap-2">
          {isAI
            ? <Bot className="h-4 w-4 text-accent-purple" />
            : <User className="h-4 w-4 text-text-secondary" />
          }
          <span className={cn('text-caption', isAI && 'text-accent-purple')}>
            {row.original.assignee}
          </span>
        </div>
      )
    },
    size: 160,
  },
  {
    accessorKey: 'title', header: 'Task',
    cell: ({ row }) => (
      <div>
        <p className={cn('text-body-strong', row.original.status === 'completed' && 'text-text-tertiary')}>
          {row.original.title}
        </p>
        {row.original.clientName && <p className="text-caption text-text-secondary">{row.original.clientName}</p>}
      </div>
    ),
    size: 320,
  },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_BADGE_VARIANT[row.original.status]}>
        {row.original.status.replace('_', ' ')}
      </Badge>
    ),
    size: 110,
  },
  {
    id: 'progress', header: 'Progress',
    cell: ({ row }) => {
      if (row.original.aiProgress === undefined) return <span className="text-caption text-text-tertiary">—</span>
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-surface-tertiary">
            <div
              className="h-full rounded-full bg-accent-purple transition-all"
              style={{ width: `${row.original.aiProgress}%` }}
            />
          </div>
          <span className="font-mono text-caption text-accent-purple">{row.original.aiProgress}%</span>
        </div>
      )
    },
    size: 140,
  },
  {
    accessorKey: 'dueDate', header: 'Due',
    cell: ({ row }) => <span className="font-mono text-caption text-text-secondary">{formatDate(row.original.dueDate)}</span>,
    size: 100,
  },
]

const templateColumns: ColumnDef<WorkflowTemplate, unknown>[] = [
  {
    accessorKey: 'name', header: 'Template',
    cell: ({ row }) => (
      <div>
        <p className="text-body-strong">{row.original.name}</p>
        <p className="text-caption text-text-secondary">{row.original.description}</p>
      </div>
    ),
    size: 360,
  },
  {
    accessorKey: 'category', header: 'Category',
    cell: ({ row }) => <Badge variant="default">{row.original.category}</Badge>,
    size: 130,
  },
  {
    accessorKey: 'steps', header: 'Steps',
    cell: ({ row }) => <span className="font-mono text-caption">{row.original.steps.length} steps</span>,
    size: 80,
  },
  {
    id: 'estTime', header: 'Est. Time',
    cell: ({ row }) => {
      const totalMin = row.original.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0)
      const hours = Math.floor(totalMin / 60)
      const mins = totalMin % 60
      return <span className="font-mono text-caption text-text-secondary">{hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}m` : ''}</span>
    },
    size: 100,
  },
]

function ProcessCard({ tracker }: { tracker: ProcessTracker }) {
  return (
    <Card className={cn(tracker.isNigo && 'border-l-[3px] border-l-accent-red')}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-body-strong">{tracker.entityName}</p>
              {tracker.isNigo && <Badge variant="red">NIGO</Badge>}
            </div>
            <p className="text-caption text-text-secondary">{PROCESS_TYPE_LABELS[tracker.type] ?? tracker.type}</p>
          </div>
          {tracker.estimatedCompletion && (
            <span className="font-mono text-caption text-text-tertiary">
              Est. {formatDate(tracker.estimatedCompletion)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {tracker.stages.map((stage, i) => {
            const isActive = i + 1 === tracker.currentStage
            const isComplete = stage.status === 'completed'
            return (
              <div key={i} className="flex flex-1 items-center">
                <div className="flex-1">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      isComplete ? 'bg-accent-green' : isActive ? 'bg-accent-blue' : 'bg-surface-tertiary',
                    )}
                  />
                  <p className={cn(
                    'mt-1 text-[10px] leading-tight',
                    isActive ? 'font-medium text-accent-blue' : isComplete ? 'text-accent-green' : 'text-text-tertiary',
                  )}>
                    {stage.name}
                  </p>
                  {isActive && stage.responsibleParty && (
                    <p className="text-[10px] text-text-secondary">{stage.responsibleParty}</p>
                  )}
                  {stage.nigoReason && (
                    <p className="text-[10px] font-medium text-accent-red">{stage.nigoReason}</p>
                  )}
                </div>
                {i < tracker.stages.length - 1 && (
                  <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-text-tertiary" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkflowCenterPage() {
  const { data: myActions, isLoading: loadingActions } = useMyActions()
  const { data: processes, isLoading: loadingProc } = useInProcess()
  const { data: delegated, isLoading: loadingDeleg } = useDelegated()
  const { data: templates } = useWorkflowTemplates()

  if (loadingActions || loadingProc || loadingDeleg) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const pendingActions = myActions?.filter((t) => t.status !== 'completed') ?? []
  const activeProcesses = processes ?? []
  const delegatedTasks = delegated ?? []
  const nigoCount = activeProcesses.filter((p) => p.isNigo).length
  const activeAICount = delegatedTasks.filter((t) => t.delegationType === 'ai_agent' && t.status === 'in_progress').length

  const tabs = [
    {
      id: 'my-actions', label: 'My Actions', count: pendingActions.length,
      content: (
        <Card>
          <DataTable
            data={myActions ?? []}
            columns={taskColumns}
            compact
            emptyMessage="No actions pending"
          />
        </Card>
      ),
    },
    {
      id: 'in-process', label: 'In-Process', count: activeProcesses.length,
      content: (
        <div className="space-y-4">
          {nigoCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-accent-red/20 bg-accent-red/5 px-4 py-2">
              <AlertTriangle className="h-4 w-4 text-accent-red" />
              <span className="text-caption font-medium text-accent-red">
                {nigoCount} process{nigoCount > 1 ? 'es' : ''} flagged NIGO — requires attention
              </span>
            </div>
          )}
          {activeProcesses.length > 0 ? (
            activeProcesses.map((proc) => (
              <ProcessCard key={proc.id} tracker={proc} />
            ))
          ) : (
            <Card><CardContent className="py-12 text-center text-text-tertiary">No active processes</CardContent></Card>
          )}
        </div>
      ),
    },
    {
      id: 'delegated', label: 'Delegated', count: delegatedTasks.length,
      content: (
        <Card>
          <DataTable
            data={delegatedTasks}
            columns={delegatedColumns}
            compact
            emptyMessage="No delegated tasks"
          />
        </Card>
      ),
    },
    {
      id: 'templates', label: 'Templates', count: templates?.length,
      content: (
        <Card>
          <DataTable
            data={templates ?? []}
            columns={templateColumns}
            compact
            emptyMessage="No templates"
          />
        </Card>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">Workflow Center</h1>
        <div className="flex items-center gap-3">
          {nigoCount > 0 && (
            <Badge variant="red">{nigoCount} NIGO</Badge>
          )}
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent-purple" />
            <span className="text-caption text-accent-purple">
              {activeAICount} AI tasks active
            </span>
          </div>
        </div>
      </div>

      <TabLayout tabs={tabs} />
    </div>
  )
}
