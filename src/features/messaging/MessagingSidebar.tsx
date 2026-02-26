import { X, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { MessagingContent } from './MessagingContent'
import { useUIStore } from '@/store/ui-store'
import { useThreads } from '@/hooks/use-messaging'

export function MessagingSidebar() {
  const messagingOpen = useUIStore((s) => s.messagingPanelOpen)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)
  const { data: threads } = useThreads()

  if (!messagingOpen) return null

  const totalUnread = threads?.reduce((sum, t) => sum + t.unreadCount, 0) ?? 0

  return (
    <aside className="fixed right-0 top-0 bottom-0 z-40 flex w-[360px] flex-col border-l border-border-primary bg-surface-primary shadow-lg animate-slide-in-right">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border-primary px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent-blue" />
          <span className="text-body-strong">Messages</span>
          {totalUnread > 0 && <Badge variant="blue">{totalUnread}</Badge>}
        </div>
        <button
          onClick={toggleMessaging}
          className="rounded p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <MessagingContent />
    </aside>
  )
}
