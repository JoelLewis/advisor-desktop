import { Sparkles } from 'lucide-react'
import { useSuggestedPrompts } from '@/hooks/use-ai'
import { cn } from '@/lib/utils'

type SuggestedPromptsProps = {
  screenType: string
  onSelect: (text: string) => void
}

export function SuggestedPrompts({ screenType, onSelect }: SuggestedPromptsProps) {
  const { data: prompts } = useSuggestedPrompts(screenType)

  if (!prompts || prompts.length === 0) return null

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/10">
          <Sparkles className="h-6 w-6 text-accent-purple" />
        </div>
        <p className="text-body-strong text-text-primary">How can I help?</p>
        <p className="text-caption text-text-secondary">
          Ask me anything about your clients, portfolios, or workflows.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        {prompts.map((prompt) => {
          const isCustom = prompt.source === 'custom'
          return (
            <button
              key={prompt.text}
              onClick={() => onSelect(prompt.text)}
              className={cn(
                'rounded-lg border bg-surface-primary px-3 py-2.5 text-left text-caption text-text-secondary transition-colors hover:border-accent-purple/30 hover:bg-accent-purple/5 hover:text-text-primary',
                isCustom ? 'border-l-2 border-accent-purple/40 border-t-border-primary border-r-border-primary border-b-border-primary' : 'border-border-primary',
              )}
            >
              {isCustom && (
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-accent-purple">Custom</span>
              )}
              {prompt.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
