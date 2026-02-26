import { TabLayout } from '@/components/ui/TabLayout'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { SingleTradeView } from './SingleTradeView'
import { ModelTradeView } from './ModelTradeView'
import { useAIInsights } from '@/hooks/use-ai'

export function TradingPage() {
  const { data: insights } = useAIInsights('trading')

  const tabs = [
    { id: 'single', label: 'Single Trade', content: <SingleTradeView /> },
    { id: 'model', label: 'Model Trade', content: <ModelTradeView /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Trading</h1>
      {insights && insights.length > 0 && (
        <AIInsightStack insights={insights} />
      )}
      <TabLayout tabs={tabs} />
    </div>
  )
}
