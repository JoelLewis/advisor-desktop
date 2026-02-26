import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react'
import { ActionCard } from './ActionCard'
import { TradeSuggestionCard } from './TradeSuggestionCard'
import { RichCard } from '@/components/ui/RichCard'
import { cn } from '@/lib/utils'
import type { ChatMessage, TradeSuggestion } from '@/types/ai'

type ChatBubbleProps = {
  message: ChatMessage
  onExecuteTrade?: (s: TradeSuggestion) => void
}

export function ChatBubble({ message, onExecuteTrade }: ChatBubbleProps) {
  const [citationsExpanded, setCitationsExpanded] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3.5 py-2.5',
          isUser
            ? 'bg-accent-blue text-white'
            : 'border-l-2 border-l-accent-purple bg-surface-primary',
        )}
      >
        {/* Assistant icon */}
        {!isUser && (
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-purple" />
            <span className="text-[11px] font-medium text-accent-purple">AI Assistant</span>
          </div>
        )}

        {/* Message content */}
        <p className={cn('text-caption leading-relaxed', isUser ? 'text-white' : 'text-text-primary')}>
          {message.content}
        </p>

        {/* Rich cards */}
        {message.richCards?.map((card, i) => (
          <RichCard key={i} data={card} isAIContext={!isUser} />
        ))}

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setCitationsExpanded(!citationsExpanded)}
              className="flex items-center gap-1 text-[11px] text-text-tertiary transition-colors hover:text-text-secondary"
            >
              {citationsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
            </button>
            {citationsExpanded && (
              <div className="mt-1.5 space-y-1">
                {message.citations.map((citation, i) => (
                  <div key={i} className="rounded bg-surface-secondary px-2 py-1.5">
                    <p className="text-[11px] font-medium text-text-secondary">{citation.source}</p>
                    <p className="text-[11px] text-text-tertiary">{citation.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action cards */}
        {message.actions?.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}

        {/* Trade suggestions */}
        {message.tradeSuggestions && message.tradeSuggestions.length > 0 && onExecuteTrade && (
          <div className="mt-2">
            {message.tradeSuggestions.map((suggestion, i) => (
              <TradeSuggestionCard key={i} suggestion={suggestion} onExecute={onExecuteTrade} />
            ))}
          </div>
        )}

        {/* Document preview */}
        {message.documentPreview && (
          <div className="mt-2 rounded-md border border-border-primary bg-surface-secondary p-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent-purple" />
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium">{message.documentPreview.title}</p>
                <p className="text-[11px] text-text-tertiary">{message.documentPreview.type}</p>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-text-secondary line-clamp-2">
              {message.documentPreview.previewText}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <p className={cn('mt-1 text-[10px]', isUser ? 'text-white/60' : 'text-text-tertiary')}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
