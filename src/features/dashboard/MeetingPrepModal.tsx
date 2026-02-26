import { X, Sparkles, Loader2, CheckCircle, MessageSquare, ClipboardList, Activity, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useMeetingPrep } from '@/hooks/use-schedule'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { MeetingType } from '@/types/calendar'

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  annual_review: 'Annual Review',
  quarterly_review: 'Quarterly Review',
  planning: 'Planning',
  prospect: 'Prospect',
  internal: 'Internal',
  ad_hoc: 'Ad Hoc',
}

type MeetingPrepModalProps = {
  eventId: string
  onClose: () => void
}

export function MeetingPrepModal({ eventId, onClose }: MeetingPrepModalProps) {
  const { data: prep, isLoading } = useMeetingPrep(eventId)
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const shareWithTeam = useUIStore((s) => s.shareWithTeam)

  function handleDiscussWithAI() {
    if (!prep) return
    const context = `I'm preparing for a ${MEETING_TYPE_LABELS[prep.meetingType]} with ${prep.clientName}. Key talking points: ${prep.talkingPoints.slice(0, 3).join('; ')}. Help me prepare.`
    setInitialMessage(context)
    onClose()
  }

  function handleShareWithTeam() {
    if (!prep) return
    shareWithTeam({
      variant: 'client_summary',
      entityId: prep.eventId,
      entityName: prep.clientName,
      actionLabel: `Meeting Prep — ${MEETING_TYPE_LABELS[prep.meetingType]}`,
    })
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 animate-scale-in">
        <div className="max-h-[80vh] overflow-hidden rounded-xl border border-border-primary bg-surface-primary shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-primary bg-accent-purple/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent-purple" />
              <div>
                <h3 className="text-body-strong text-text-primary">AI Meeting Prep</h3>
                {prep && (
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-caption text-text-secondary">{prep.clientName}</span>
                    <Badge variant="purple">{MEETING_TYPE_LABELS[prep.meetingType]}</Badge>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(80vh-120px)] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader2 className="h-5 w-5 animate-spin text-accent-purple" />
                <span className="text-body text-text-secondary">Generating meeting prep...</span>
              </div>
            ) : prep ? (
              <div className="divide-y divide-border-primary">
                {/* Portfolio Summary */}
                <div className="px-5 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                    <Activity className="h-3.5 w-3.5" /> Portfolio Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {prep.portfolioSummary.map((item) => (
                      <div key={item.label} className="rounded-md bg-surface-secondary px-3 py-2">
                        <p className="text-[10px] uppercase text-text-tertiary">{item.label}</p>
                        <p className={cn(
                          'font-mono text-caption font-medium',
                          item.sentiment === 'positive' && 'text-accent-green',
                          item.sentiment === 'negative' && 'text-accent-red',
                          !item.sentiment && 'text-text-primary',
                        )}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Talking Points */}
                <div className="px-5 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                    <MessageSquare className="h-3.5 w-3.5" /> Talking Points
                  </h4>
                  <ul className="space-y-2">
                    {prep.talkingPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-caption text-text-secondary">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-[10px] font-medium text-accent-purple">
                          {i + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                <div className="px-5 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                    <ClipboardList className="h-3.5 w-3.5" /> Post-Meeting Action Items
                  </h4>
                  <ul className="space-y-1.5">
                    {prep.actionItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-caption text-text-secondary">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent Activity */}
                <div className="px-5 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                    <Activity className="h-3.5 w-3.5" /> Recent Activity
                  </h4>
                  <ul className="space-y-1.5">
                    {prep.recentActivity.map((item, i) => (
                      <li key={i} className="text-caption text-text-tertiary">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-caption text-text-tertiary">
                Unable to generate meeting prep
              </div>
            )}
          </div>

          {/* Footer */}
          {prep && (
            <div className="flex items-center justify-between border-t border-border-primary bg-surface-secondary px-5 py-3">
              <span className="flex items-center gap-1 text-caption text-text-tertiary">
                <Sparkles className="h-3 w-3 text-accent-purple" />
                AI-generated • {new Date(prep.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscussWithAI}
                  className="flex items-center gap-1.5 rounded-md border border-accent-purple px-3 py-1.5 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Discuss with AI
                </button>
                <button
                  onClick={handleShareWithTeam}
                  className="flex items-center gap-1.5 rounded-md border border-accent-blue px-3 py-1.5 text-caption font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
                >
                  <Users className="h-3.5 w-3.5" />
                  Share with Team
                </button>
                <button
                  onClick={onClose}
                  className="rounded-md bg-accent-purple px-4 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-purple/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
