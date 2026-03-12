import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  CheckCheck,
  Bell,
  Shield,
  ArrowRightLeft,
  GitBranch,
  Zap,
  Sparkles,
  Users,
  UserCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useMarkRead,
  useDismissNotification,
  useMarkAllRead,
} from '@/hooks/use-notifications'
import type { Notification, NotificationCategory } from '@/types/notification'

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; icon: typeof Bell; color: string }> = {
  compliance: { label: 'Compliance', icon: Shield, color: 'text-accent-red' },
  trades: { label: 'Trades', icon: ArrowRightLeft, color: 'text-accent-blue' },
  workflows: { label: 'Workflows', icon: GitBranch, color: 'text-text-secondary' },
  nba: { label: 'NBA', icon: Zap, color: 'text-amber-500' },
  ai: { label: 'AI', icon: Sparkles, color: 'text-accent-purple' },
  team: { label: 'Team', icon: Users, color: 'text-accent-blue' },
  client: { label: 'Client', icon: UserCircle, color: 'text-accent-green' },
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-l-accent-red bg-red-50/50',
  high: 'border-l-amber-500',
  medium: 'border-l-accent-blue',
  low: 'border-l-border-primary',
}

type NotificationCenterProps = {
  open: boolean
  onClose: () => void
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all')
  const { data, isLoading } = useNotifications(
    activeCategory === 'all' ? undefined : activeCategory,
  )
  const markReadMutation = useMarkRead()
  const dismissMutation = useDismissNotification()
  const markAllReadMutation = useMarkAllRead()
  const navigate = useNavigate()

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate(activeCategory === 'all' ? undefined : activeCategory)
  }, [markAllReadMutation, activeCategory])

  const handleNotificationClick = useCallback(
    (notif: Notification) => {
      if (!notif.read) {
        markReadMutation.mutate(notif.id)
      }
      if (notif.actionRoute) {
        navigate(notif.actionRoute)
        onClose()
      }
    },
    [markReadMutation, navigate, onClose],
  )

  const handleDismiss = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      dismissMutation.mutate(id)
    },
    [dismissMutation],
  )

  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus the panel when it opens
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  const items = data?.items ?? []
  const unreadCount = data?.unreadCount ?? 0

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        tabIndex={-1}
        className="fixed right-2 top-[calc(var(--spacing-topbar)+4px)] z-50 flex w-[420px] max-h-[calc(100vh-80px)] flex-col rounded-lg border border-border-primary bg-surface-primary shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-text-secondary" />
            <span className="text-body-sm font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-red px-1.5 text-mono-sm text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 rounded px-2 py-1 text-caption text-accent-blue transition-colors hover:bg-accent-blue/10"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border-primary px-3 py-2">
          <CategoryTab
            label="All"
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {(Object.keys(CATEGORY_CONFIG) as NotificationCategory[]).map((cat) => (
            <CategoryTab
              key={cat}
              label={CATEGORY_CONFIG[cat].label}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-surface-tertiary" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-text-tertiary">
              <Bell className="h-8 w-8" />
              <p className="text-body font-medium">All clear</p>
              <p className="text-caption">No notifications right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-primary">
              {items.map((notif) => (
                <NotificationRow
                  key={notif.id}
                  notification={notif}
                  onClick={() => handleNotificationClick(notif)}
                  onDismiss={(e) => handleDismiss(e, notif.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-caption transition-colors',
        active
          ? 'bg-accent-blue text-white'
          : 'text-text-secondary hover:bg-surface-tertiary',
      )}
    >
      {label}
    </button>
  )
}

function NotificationRow({
  notification: n,
  onClick,
  onDismiss,
}: {
  notification: Notification
  onClick: () => void
  onDismiss: (e: React.MouseEvent) => void
}) {
  const config = CATEGORY_CONFIG[n.category]
  const Icon = config.icon
  const priorityStyle = PRIORITY_STYLES[n.priority] ?? ''

  const timeAgo = formatTimeAgo(n.timestamp)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-surface-secondary',
        priorityStyle,
        !n.read && 'bg-accent-blue/[0.03]',
      )}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 shrink-0', config.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              'text-body-sm leading-tight',
              n.read ? 'text-text-secondary' : 'font-medium text-text-primary',
            )}
          >
            {n.title}
          </span>
          {!n.read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-blue" />
          )}
        </div>
        <p className="mt-0.5 text-caption text-text-tertiary line-clamp-2">{n.body}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-1 text-mono-sm text-text-tertiary">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
          {n.priority === 'critical' && (
            <span className="flex items-center gap-0.5 text-mono-sm text-accent-red">
              <AlertTriangle className="h-3 w-3" />
              Critical
            </span>
          )}
          {n.source && (
            <span className="text-mono-sm text-text-tertiary">{n.source}</span>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface-tertiary hover:text-text-secondary group-hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </button>
  )
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay}d ago`
}
