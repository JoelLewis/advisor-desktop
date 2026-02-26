import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle className="h-12 w-12 text-accent-red" />
      <h1 className="mt-4 text-section-header text-text-primary">Page Error</h1>
      <p className="mt-2 max-w-md text-body text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-md bg-accent-blue px-4 py-2 text-body text-white transition-colors hover:bg-accent-blue/90"
      >
        Reload Page
      </button>
    </div>
  )
}
