import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageSquare, ArrowLeft, User, Bot } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useUIStore } from '@/store/ui-store'
import { useThreads, useMessages, useSendMessage as useSendTeamMessage } from '@/hooks/use-messaging'
import { cn } from '@/lib/utils'
import type { Thread, Message } from '@/types/messaging'

const ROLE_COLORS: Record<string, string> = {
  advisor: 'bg-accent-blue',
  csa: 'bg-accent-green',
  analyst: 'bg-amber-500',
  compliance: 'bg-accent-red',
  ai_agent: 'bg-accent-purple',
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date('2026-02-25T12:00:00Z')
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
  if (diffHours < 48) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ThreadListItem({ thread, onClick }: { thread: Thread; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md border border-border-primary p-3 text-left transition-colors hover:bg-surface-tertiary"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary">
        <MessageSquare className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-body-strong">{thread.subject}</span>
          {thread.unreadCount > 0 && (
            <Badge variant="blue">{thread.unreadCount}</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-caption text-text-secondary">{thread.lastMessage}</p>
        <div className="mt-1 flex items-center gap-2 text-caption text-text-tertiary">
          <div className="flex -space-x-1">
            {thread.participants.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className={cn('flex h-4 w-4 items-center justify-center rounded-full text-white', ROLE_COLORS[p.role] ?? 'bg-text-tertiary')}
                title={p.name}
                style={{ fontSize: '8px' }}
              >
                {p.role === 'ai_agent' ? <Bot className="h-2.5 w-2.5" /> : p.name.charAt(0)}
              </div>
            ))}
          </div>
          <span>{formatTime(thread.lastMessageAt)}</span>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isOwn = message.senderId === currentUserId
  return (
    <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : '')}>
      {!isOwn && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={cn(
        'max-w-[80%] rounded-lg px-3 py-2',
        isOwn ? 'bg-accent-blue text-white' : 'bg-surface-tertiary text-text-primary',
      )}>
        <p className="text-caption">{message.content}</p>
        <p className={cn('mt-1 text-caption', isOwn ? 'text-white/60' : 'text-text-tertiary')} style={{ fontSize: '10px' }}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}

export function MessagingSidebar() {
  const messagingOpen = useUIStore((s) => s.messagingPanelOpen)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)
  const { data: threads } = useThreads()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const { data: messages } = useMessages(selectedThreadId ?? '')
  const sendMutation = useSendTeamMessage()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!messagingOpen) return null

  const totalUnread = threads?.reduce((sum, t) => sum + t.unreadCount, 0) ?? 0

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || !selectedThreadId) return
    sendMutation.mutate(
      { threadId: selectedThreadId, content: trimmed },
      { onSuccess: () => setInput('') },
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className="fixed right-0 top-0 bottom-0 z-40 flex w-[360px] flex-col border-l border-border-primary bg-surface-primary shadow-lg animate-slide-in-right">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border-primary px-4">
        <div className="flex items-center gap-2">
          {selectedThreadId && (
            <button
              onClick={() => setSelectedThreadId(null)}
              className="rounded p-1 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <MessageSquare className="h-5 w-5 text-accent-blue" />
          <span className="text-body-strong">
            {selectedThreadId ? threads?.find((t) => t.id === selectedThreadId)?.subject ?? 'Thread' : 'Messages'}
          </span>
          {!selectedThreadId && totalUnread > 0 && <Badge variant="blue">{totalUnread}</Badge>}
        </div>
        <button
          onClick={toggleMessaging}
          className="rounded p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {!selectedThreadId ? (
        // Thread list
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {threads?.map((thread) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              onClick={() => setSelectedThreadId(thread.id)}
            />
          ))}
          {(!threads || threads.length === 0) && (
            <p className="py-12 text-center text-caption text-text-tertiary">No messages</p>
          )}
        </div>
      ) : (
        // Messages view
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages?.map((msg) => (
              <MessageBubble key={msg.id} message={msg} currentUserId="user-001" />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border-primary p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-md border border-border-secondary bg-surface-secondary px-3 py-2 text-caption text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-blue text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
