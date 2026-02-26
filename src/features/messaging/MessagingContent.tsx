import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, ArrowLeft, User, Bot } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
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

type MessagingContentProps = {
  headerSlot?: React.ReactNode
}

export function MessagingContent({ headerSlot }: MessagingContentProps) {
  const { data: threads } = useThreads()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const { data: messages } = useMessages(selectedThreadId ?? '')
  const sendMutation = useSendTeamMessage()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    <>
      {/* Sub-header with back button and thread info */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-primary px-4 py-2">
        {selectedThreadId ? (
          <>
            <button
              onClick={() => setSelectedThreadId(null)}
              className="rounded p-1 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="truncate text-caption font-medium text-text-secondary">
              {threads?.find((t) => t.id === selectedThreadId)?.subject ?? 'Thread'}
            </span>
          </>
        ) : (
          <>
            <span className="rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-[11px] font-medium text-accent-blue">
              {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
            </span>
            {headerSlot}
          </>
        )}
      </div>

      {/* Content */}
      {!selectedThreadId ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
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
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages?.map((msg) => (
              <MessageBubble key={msg.id} message={msg} currentUserId="user-001" />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-border-primary p-3">
            <div className="flex items-end gap-2 rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/20">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none max-h-24 scrollbar-thin"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-blue text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-text-tertiary">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </>
  )
}
