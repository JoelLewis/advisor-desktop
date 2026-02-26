import { TabLayout } from '@/components/ui/TabLayout'
import { SingleTradeView } from './SingleTradeView'
import { ModelTradeView } from './ModelTradeView'

export function TradingPage() {
  const tabs = [
    { id: 'single', label: 'Single Trade', content: <SingleTradeView /> },
    { id: 'model', label: 'Model Trade', content: <ModelTradeView /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Trading</h1>
      <TabLayout tabs={tabs} />
    </div>
  )
}
