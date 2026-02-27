import { Home } from 'lucide-react'
import { HouseholdListView } from '@/features/clients/HouseholdListView'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { useHouseholds } from '@/hooks/use-households'
import { useAIInsights } from '@/hooks/use-ai'

export function HouseholdListPage() {
  const { data } = useHouseholds()
  const { data: insights } = useAIInsights('households')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3" data-annotation="hh-nav">
        <Home className="h-6 w-6 text-text-secondary" />
        <h1 className="text-page-title">Households</h1>
        {data && (
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-text-secondary">
            {data.total}
          </span>
        )}
      </div>

      {insights && insights.length > 0 && (
        <div data-annotation="hh-ai-insights">
          <AIInsightStack insights={insights} />
        </div>
      )}

      <div data-annotation="hh-table">
        <HouseholdListView />
      </div>
    </div>
  )
}
