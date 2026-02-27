import { useState, useEffect, useCallback } from 'react'
import { Compass, ArrowRight, Monitor } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'

const STORAGE_KEY = 'advisor-desktop-welcomed'

function hasBeenWelcomed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function markWelcomed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // localStorage unavailable — silently continue
  }
}

type WelcomeOverlayProps = {
  /** When true, force-show regardless of localStorage (used by About button) */
  forceOpen?: boolean
  /** Called when the overlay is dismissed (for external state management) */
  onDismiss?: () => void
}

export function WelcomeOverlay({ forceOpen, onDismiss }: WelcomeOverlayProps = {}) {
  const [visible, setVisible] = useState(false)
  const toggleAnnotations = useUIStore((s) => s.toggleAnnotations)

  // First-visit auto-show
  useEffect(() => {
    if (!hasBeenWelcomed()) {
      setVisible(true)
    }
  }, [])

  // External trigger
  useEffect(() => {
    if (forceOpen) setVisible(true)
  }, [forceOpen])

  const dismiss = useCallback(() => {
    markWelcomed()
    setVisible(false)
    onDismiss?.()
  }, [onDismiss])

  const exploreWithGuide = useCallback(() => {
    markWelcomed()
    setVisible(false)
    onDismiss?.()
    requestAnimationFrame(() => {
      toggleAnnotations()
    })
  }, [toggleAnnotations, onDismiss])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Advisor Desktop"
    >
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border-primary bg-surface-primary p-8 shadow-2xl animate-scale-in">
        {/* Logo mark */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple text-white font-semibold text-lg">
            AD
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Advisor Desktop</h1>
            <p className="text-caption text-text-secondary">A reference design by Joel Lewis</p>
          </div>
        </div>

        {/* Thesis */}
        <p className="text-body text-text-secondary leading-relaxed">
          What if you could design an advisor desktop unconstrained by legacy back-office systems?
        </p>

        {/* Device context */}
        <div className="mt-3 flex items-center gap-1.5 text-caption text-text-tertiary">
          <Monitor className="h-3.5 w-3.5" />
          <span>Designed for desktop &amp; tablet (1024px+)</span>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            '20+ pages',
            '130+ API endpoints',
            '5 asset classes',
            'Multi-currency',
          ].map((stat) => (
            <span
              key={stat}
              className="rounded-full border border-border-primary bg-surface-secondary px-3 py-1 text-caption font-medium text-text-secondary"
            >
              {stat}
            </span>
          ))}
        </div>

        {/* Build context */}
        <p className="mt-4 text-caption text-text-tertiary">
          Built in 1 week &middot; React + TypeScript &middot; Claude Code
        </p>

        {/* CTAs */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={exploreWithGuide}
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2"
          >
            <Compass className="h-4 w-4" />
            Explore with Guide
          </button>
          <button
            onClick={dismiss}
            className="flex items-center gap-2 rounded-lg border border-border-primary px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2"
          >
            Dive In
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
