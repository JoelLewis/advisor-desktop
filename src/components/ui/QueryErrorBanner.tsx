import { AlertCircle, RefreshCw } from 'lucide-react'

type QueryErrorBannerProps = {
  error: Error | null
  onRetry?: () => void
  message?: string
}

export function QueryErrorBanner({ error, onRetry, message }: QueryErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent-red/30 bg-accent-red/5 px-4 py-3">
      <AlertCircle className="h-5 w-5 shrink-0 text-accent-red" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-accent-red">
          {message ?? 'Failed to load data'}
        </p>
        {error?.message && (
          <p className="mt-0.5 truncate text-caption text-text-secondary">{error.message}</p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-accent-red/30 px-3 py-1.5 text-caption font-medium text-accent-red transition-colors hover:bg-accent-red/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}
