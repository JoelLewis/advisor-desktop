import { Sparkles, Loader2, CheckCircle, MessageSquare, ClipboardList, Activity, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { useMeetingPrep } from '@/hooks/use-schedule'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { MeetingType } from '@/types/calendar'
import type { LucideIcon } from 'lucide-react'

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

function SectionHeader({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">
      <Icon className="h-3.5 w-3.5" /> {children}
    </h4>
  )
}

function sentimentColor(sentiment?: string): string {
  if (sentiment === 'positive') return 'text-accent-green'
  if (sentiment === 'negative') return 'text-accent-red'
  return 'text-text-primary'
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[640px] max-h-[80vh]">
        <DialogHeader className="bg-accent-purple/5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent-purple" />
            <div>
              <DialogTitle>AI Meeting Prep</DialogTitle>
              {prep && (
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-caption text-text-secondary">{prep.clientName}</span>
                  <Badge variant="purple">{MEETING_TYPE_LABELS[prep.meetingType]}</Badge>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(80vh-120px)] overflow-y-auto scrollbar-thin" aria-busy={isLoading}>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-accent-purple" />
              <span className="text-body text-text-secondary">Generating meeting prep...</span>
            </div>
          ) : prep ? (
            <div className="divide-y divide-border-primary">
              <div className="px-5 py-4">
                <SectionHeader icon={Activity}>Portfolio Summary</SectionHeader>
                <div className="grid grid-cols-3 gap-3">
                  {prep.portfolioSummary.map((item) => (
                    <div key={item.label} className="rounded-md bg-surface-secondary px-3 py-2">
                      <p className="text-[10px] uppercase text-text-tertiary">{item.label}</p>
                      <p className={cn('font-mono text-caption font-medium', sentimentColor(item.sentiment))}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-4">
                <SectionHeader icon={MessageSquare}>Talking Points</SectionHeader>
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

              <div className="px-5 py-4">
                <SectionHeader icon={ClipboardList}>Post-Meeting Action Items</SectionHeader>
                <ul className="space-y-1.5">
                  {prep.actionItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-caption text-text-secondary">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-5 py-4">
                <SectionHeader icon={Activity}>Recent Activity</SectionHeader>
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

        {prep && (
          <DialogFooter className="justify-between">
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
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
