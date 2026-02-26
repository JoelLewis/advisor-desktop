import { ArrowRightLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { TradeSuggestion } from '@/types/ai'

type TradeSuggestionCardProps = {
  suggestion: TradeSuggestion
  onExecute: (s: TradeSuggestion) => void
}

export function TradeSuggestionCard({ suggestion, onExecute }: TradeSuggestionCardProps) {
  return (
    <div className="mt-2 rounded-md border border-border-primary bg-surface-secondary p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption font-bold text-text-primary">{suggestion.symbol}</span>
            <span className="text-[11px] text-text-secondary">{suggestion.name}</span>
            <Badge variant={suggestion.side === 'buy' ? 'green' : 'red'}>
              {suggestion.side === 'buy' ? 'Buy' : 'Sell'}
            </Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-[11px]">
            <span className="text-text-secondary">
              Qty: <span className="font-mono font-medium text-text-primary">{suggestion.quantity.toLocaleString()}</span>
            </span>
            <span className="text-text-secondary">
              Est: <span className="font-mono font-medium text-text-primary">${suggestion.estimatedValue.toLocaleString()}</span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-text-tertiary">{suggestion.rationale}</p>
          <p className="mt-0.5 text-[10px] text-text-tertiary">{suggestion.accountName}</p>
        </div>
      </div>
      <button
        onClick={() => onExecute(suggestion)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Execute Trade
      </button>
    </div>
  )
}
