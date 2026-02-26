import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { useExecuteAction } from '@/hooks/use-ai'
import { cn } from '@/lib/utils'
import type { ActionConfirmation } from '@/types/ai'

type ActionCardProps = {
  action: ActionConfirmation
  onStatusChange?: (id: string, status: ActionConfirmation['status']) => void
}

export function ActionCard({ action, onStatusChange }: ActionCardProps) {
  const [status, setStatus] = useState(action.status)
  const execute = useExecuteAction()

  function handleApprove() {
    setStatus('approved')
    onStatusChange?.(action.id, 'approved')
    execute.mutate(action.id, {
      onSuccess: () => {
        setStatus('executed')
        onStatusChange?.(action.id, 'executed')
      },
    })
  }

  function handleReject() {
    setStatus('rejected')
    onStatusChange?.(action.id, 'rejected')
  }

  return (
    <div className="mt-2 rounded-md border border-accent-purple/20 bg-accent-purple/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-accent-purple">{action.action}</p>
          <p className="mt-0.5 text-caption text-text-secondary">{action.description}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">{action.impact}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-green transition-colors hover:bg-accent-green/10"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-red transition-colors hover:bg-accent-red/10"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </>
          )}

          {status === 'approved' && (
            <span className="flex items-center gap-1 text-caption text-accent-blue">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </span>
          )}

          {status === 'executed' && (
            <span className="flex items-center gap-1 text-caption font-medium text-accent-purple">
              <Check className="h-3.5 w-3.5" />
              Executed
            </span>
          )}

          {status === 'rejected' && (
            <span className={cn('flex items-center gap-1 text-caption text-text-tertiary')}>
              <X className="h-3.5 w-3.5" />
              Rejected
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
