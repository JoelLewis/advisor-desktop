import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Maximize2, Minimize2, Send, Sparkles, MessageSquare, Mail } from 'lucide-react'
import { ChatBubble } from './ChatBubble'
import { SuggestedPrompts } from './SuggestedPrompts'
import { ActionTemplateGrid } from './ActionTemplateGrid'
import { ContextBriefing } from './ContextBriefing'
import { ClientCommsTab } from './ClientCommsTab'
import { TradeTicketDialog } from '@/features/portfolios/TradeTicketDialog'
import { MessagingContent } from '@/features/messaging/MessagingContent'
import { useUIStore } from '@/store/ui-store'
import { useNavigationStore } from '@/store/navigation-store'
import { useSendMessage } from '@/hooks/use-ai'
import { cn } from '@/lib/utils'
import type { ChatMessage, ChatContext, TradeSuggestion } from '@/types/ai'

type PanelTab = 'ai' | 'messages' | 'client'

const TAB_CONFIG: { id: PanelTab; icon: typeof Sparkles; label: string; activeColor: string }[] = [
  { id: 'ai', icon: Sparkles, label: 'AI', activeColor: 'bg-accent-purple/10 text-accent-purple' },
  { id: 'messages', icon: MessageSquare, label: 'Messages', activeColor: 'bg-accent-blue/10 text-accent-blue' },
  { id: 'client', icon: Mail, label: 'Client', activeColor: 'bg-accent-green/10 text-accent-green' },
]

function deriveScreenType(pathname: string): string {
  if (pathname.startsWith('/clients/') && pathname.includes('/')) return 'client_detail'
  if (pathname.startsWith('/clients')) return 'clients'
  if (pathname.startsWith('/portfolios/trading')) return 'trading'
  if (pathname.startsWith('/portfolios/accounts/')) return 'account_detail'
  if (pathname.startsWith('/portfolios')) return 'portfolios'
  if (pathname.startsWith('/households/')) return 'household_detail'
  if (pathname.startsWith('/workflows')) return 'workflows'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'dashboard'
}

export function AIChatPanel() {
  const panelWidth = useUIStore((s) => s.aiPanelWidth)
  const setPanelWidth = useUIStore((s) => s.setAIPanelWidth)
  const togglePanel = useUIStore((s) => s.toggleAIPanel)
  const initialMessage = useUIStore((s) => s.aiInitialMessage)
  const clearInitialMessage = useUIStore((s) => s.clearInitialMessage)
  const panelTab = useUIStore((s) => s.panelTab)
  const setPanelTab = useUIStore((s) => s.setPanelTab)
  const entityContext = useNavigationStore((s) => s.entityContext)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [tradePrefill, setTradePrefill] = useState<TradeSuggestion | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendMutation = useSendMessage()

  const screenType = deriveScreenType(window.location.pathname)

  const buildContext = useCallback((): ChatContext => ({
    screenType,
    entityType: entityContext.type === 'workflow' ? undefined : (entityContext.type ?? undefined),
    entityId: entityContext.id ?? undefined,
    entityName: entityContext.name ?? undefined,
  }), [screenType, entityContext])

  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    sendMutation.mutate(
      { message: trimmed, context: buildContext() },
      {
        onSuccess: (response) => {
          setMessages((prev) => [...prev, response])
        },
      },
    )
  }, [sendMutation, buildContext])

  const pendingShareCard = useUIStore((s) => s.pendingShareCard)
  const setPendingShareCard = useUIStore((s) => s.setPendingShareCard)

  // Consume initial message when panel opens with one
  useEffect(() => {
    if (initialMessage) {
      handleSend(initialMessage)
      clearInitialMessage()
    }
  }, [initialMessage, handleSend, clearInitialMessage])

  // Consume pending share card — send as a user message with richCards attached
  useEffect(() => {
    if (pendingShareCard && panelTab === 'ai') {
      const userMessage: ChatMessage = {
        id: `msg-share-${Date.now()}`,
        role: 'user',
        content: `Analyze ${pendingShareCard.entityName}`,
        timestamp: new Date().toISOString(),
        richCards: [pendingShareCard],
      }
      setMessages((prev) => [...prev, userMessage])
      sendMutation.mutate(
        { message: `Analyze ${pendingShareCard.entityName}`, context: buildContext() },
        { onSuccess: (response) => setMessages((prev) => [...prev, response]) },
      )
      setPendingShareCard(null)
    }
  }, [pendingShareCard, panelTab, setPendingShareCard, buildContext, sendMutation])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const contextLabel = entityContext.name
    ? `Viewing: ${entityContext.name}`
    : screenType.replace('_', ' ')

  return (
    <aside
      className="fixed right-0 top-0 bottom-0 z-40 flex flex-col border-l border-border-primary bg-surface-primary shadow-lg animate-slide-in-right"
      style={{ width: panelWidth }}
    >
      {/* Header with tabs */}
      <div className="shrink-0 border-b border-border-primary">
        <div className="flex h-topbar items-center justify-between px-4">
          <div className="flex items-center gap-1">
            {TAB_CONFIG.map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-caption font-medium transition-colors',
                    panelTab === tab.id
                      ? tab.activeColor
                      : 'text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary',
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanelWidth(panelWidth === 400 ? 600 : 400)}
              className="flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
              aria-label={panelWidth === 400 ? 'Expand panel' : 'Collapse panel'}
            >
              {panelWidth === 400 ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={togglePanel}
              className="flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {panelTab === 'ai' && (
        <>
          {/* Context chip */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border-primary px-4 py-2">
            <span className="rounded-full bg-accent-purple/10 px-2.5 py-0.5 text-[11px] font-medium text-accent-purple">
              {contextLabel}
            </span>
          </div>

          {/* Context briefing */}
          <ContextBriefing screenType={screenType} entityId={entityContext.id ?? undefined} />

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {messages.length === 0 ? (
              <div>
                <ActionTemplateGrid screenType={screenType} />
                <SuggestedPrompts screenType={screenType} onSelect={handleSend} />
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} onExecuteTrade={setTradePrefill} />
                ))}
                {sendMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-lg border-l-2 border-l-accent-purple bg-surface-primary px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-purple [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-purple [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-purple [animation-delay:300ms]" />
                      </div>
                      <span className="text-caption text-text-tertiary">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-border-primary p-3">
            <div className="flex items-end gap-2 rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 focus-within:border-accent-purple/50 focus-within:ring-1 focus-within:ring-accent-purple/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI anything..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none max-h-24 scrollbar-thin"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || sendMutation.isPending}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-purple text-white transition-colors hover:bg-accent-purple/90 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {panelTab === 'messages' && <MessagingContent />}

      {panelTab === 'client' && (
        <ClientCommsTab
          clientId={entityContext.id ?? undefined}
          clientName={entityContext.name ?? undefined}
        />
      )}

      {/* Trade ticket dialog triggered by AI trade suggestions */}
      {tradePrefill && (
        <TradeTicketDialog
          open={true}
          onClose={() => setTradePrefill(null)}
          accountId={tradePrefill.accountId}
          accountName={tradePrefill.accountName}
          prefill={{
            symbol: tradePrefill.symbol,
            side: tradePrefill.side,
            quantity: tradePrefill.quantity,
          }}
        />
      )}
    </aside>
  )
}
