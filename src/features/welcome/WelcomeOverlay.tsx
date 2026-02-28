import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Compass, ArrowRight } from 'lucide-react'
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

  return createPortal(
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
            <p className="text-caption text-text-secondary">by Joel Lewis</p>
          </div>
        </div>

        {/* Thesis */}
        <p className="text-body text-text-secondary leading-relaxed">
          Fifteen years of opinions about what wealth management software gets wrong, distilled into a clickable prototype. Built in seven days, about ten hours of effort, and less than $100 in AI tokens.
        </p>

        {/* Three product opinions */}
        <div className="mt-4 space-y-2">
          {[
            { label: 'Collaboration as default', desc: 'Team servicing is visible, not bolted on' },
            { label: 'AI as teammate', desc: 'Same workflows for humans and agents' },
            { label: 'Modern asset coverage', desc: 'Equities to crypto, multi-currency, global' },
          ].map((opinion) => (
            <div key={opinion.label} className="flex items-baseline gap-2">
              <span className="shrink-0 text-accent-purple text-body leading-none">&bull;</span>
              <p className="text-caption text-text-secondary">
                <span className="font-medium text-text-primary">{opinion.label}</span>
                {' \u2014 '}
                {opinion.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Build context */}
        <p className="mt-4 text-caption text-text-tertiary">
          Best on desktop and tablet &middot; React + TypeScript &middot; Claude Code
        </p>

        {/* CTAs */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={exploreWithGuide}
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2"
          >
            <Compass className="h-4 w-4" />
            Explore with Guide
          </button>
          <button
            onClick={dismiss}
            className="flex items-center gap-2 rounded-lg border border-border-primary px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2"
          >
            Dive In
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
