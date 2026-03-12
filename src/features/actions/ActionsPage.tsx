import { Zap } from 'lucide-react'
import { TabLayout } from '@/components/ui/TabLayout'
import { NBAFeed } from '@/features/dashboard/NBAFeed'
import { NBAEffectivenessContent } from '@/features/dashboard/NBAEffectivenessContent'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { QueryErrorBanner } from '@/components/ui/QueryErrorBanner'
import { useNBAs } from '@/hooks/use-nbas'
import { useAIInsights } from '@/hooks/use-ai'

export function ActionsPage() {
  const { data: nbas, isError, error, refetch } = useNBAs({ dismissed: 'false' })
  const { data: insights } = useAIInsights('actions')
  const pendingCount = nbas?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-6 w-6 text-text-secondary" />
        <h1 className="text-page-title">Next Best Actions</h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-caption font-medium text-accent-blue">
            {pendingCount}
          </span>
        )}
      </div>

      {isError && (
        <QueryErrorBanner error={error} onRetry={refetch} message="Failed to load actions" />
      )}

      {insights && insights.length > 0 && (
        <AIInsightStack insights={insights} />
      )}

      <div data-annotation="actions-tabs">
        <TabLayout
          tabs={[
            {
              id: 'actions',
              label: 'Actions',
              count: pendingCount,
              content: <NBAFeed />,
            },
            {
              id: 'effectiveness',
              label: 'Effectiveness',
              content: <NBAEffectivenessContent />,
            },
          ]}
          defaultTab="actions"
        />
      </div>
    </div>
  )
}
