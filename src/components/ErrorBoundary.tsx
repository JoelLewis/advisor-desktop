import { Component } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { error, showDetails } = this.state

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary p-4">
        <div className="w-full max-w-lg rounded-lg border border-border-primary bg-surface-primary p-8 shadow-xs">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-accent-red" />

            <h1 className="mt-4 text-section-header text-text-primary">
              Something went wrong
            </h1>

            <p className="mt-2 max-w-md text-body text-text-secondary">
              {error?.message || 'An unexpected error occurred. Please try reloading the page.'}
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 rounded-md bg-accent-blue px-4 py-2 text-body text-white transition-colors hover:bg-accent-blue/90"
            >
              Reload Page
            </button>

            <button
              type="button"
              onClick={this.toggleDetails}
              className="mt-4 inline-flex items-center gap-1 text-caption text-text-tertiary transition-colors hover:text-text-secondary"
            >
              {showDetails ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Show Details
            </button>

            {showDetails && error?.stack && (
              <pre className="mt-3 w-full max-h-48 overflow-auto rounded-md bg-surface-tertiary p-4 text-left text-mono-sm text-text-secondary">
                <code>{error.stack}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    )
  }
}
