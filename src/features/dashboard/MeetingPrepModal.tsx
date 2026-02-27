import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  CheckCircle,
  MessageSquare,
  ClipboardList,
  Activity,
  Users,
  Plus,
  CalendarPlus,
  Wand2,
  Check,
  Circle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { useMeetingPrep } from '@/hooks/use-schedule'
import { useMeetingNotes, useSaveMeetingNotes, useFollowUps, useCreateFollowUp } from '@/hooks/use-meeting-notes'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { MeetingType, MeetingNoteSection } from '@/types/calendar'
import type { LucideIcon } from 'lucide-react'

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  annual_review: 'Annual Review',
  quarterly_review: 'Quarterly Review',
  planning: 'Planning',
  prospect: 'Prospect',
  internal: 'Internal',
  ad_hoc: 'Ad Hoc',
}

type WorkspaceTab = 'prep' | 'notes' | 'wrapup'

type MeetingPrepModalProps = {
  eventId: string
  onClose: () => void
  initialTab?: WorkspaceTab
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

const DEFAULT_SECTIONS: MeetingNoteSection[] = [
  { key: 'discussion', label: 'Discussion', content: '' },
  { key: 'decisions', label: 'Decisions', content: '' },
  { key: 'requests', label: 'Client Requests', content: '' },
  { key: 'followups', label: 'Follow-ups', content: '' },
]

const ASSIGNEE_LABELS: Record<'advisor' | 'csa' | 'ai', string> = {
  advisor: 'Me',
  csa: 'CSA',
  ai: 'AI',
}

// --- Prep Tab ---
function PrepTab({
  prep,
  checkedPoints,
  onTogglePoint,
}: {
  prep: NonNullable<ReturnType<typeof useMeetingPrep>['data']>
  checkedPoints: Set<number>
  onTogglePoint: (idx: number) => void
}) {
  return (
    <div className="divide-y divide-border-primary">
      <div className="px-5 py-4">
        <SectionHeader icon={Activity}>Portfolio Summary</SectionHeader>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
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
              <button
                onClick={() => onTogglePoint(i)}
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-secondary transition-colors hover:border-accent-purple"
                aria-label={checkedPoints.has(i) ? `Uncheck talking point ${i + 1}` : `Check talking point ${i + 1}`}
              >
                {checkedPoints.has(i) && <Check className="h-3 w-3 text-accent-purple" />}
              </button>
              <span className={cn(checkedPoints.has(i) && 'line-through text-text-tertiary')}>{point}</span>
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
              &bull; {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// --- Notes Tab ---
function NotesTab({ eventId }: { eventId: string }) {
  const { data: existingNote, isLoading } = useMeetingNotes(eventId)
  const saveMutation = useSaveMeetingNotes(eventId)
  const [sections, setSections] = useState<MeetingNoteSection[] | null>(null)

  // Initialize sections from server data or defaults
  const activeSections = sections ?? existingNote?.sections ?? DEFAULT_SECTIONS

  function handleSectionChange(key: MeetingNoteSection['key'], content: string) {
    const updated = activeSections.map((s) => (s.key === key ? { ...s, content } : s))
    setSections(updated)
  }

  function handleSave() {
    saveMutation.mutate(activeSections, {
      onSuccess: () => {
        setSections(null) // Reset local state so it re-reads from query
      },
    })
  }

  const hasChanges = sections !== null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-accent-purple" />
        <span className="text-body text-text-secondary">Loading notes...</span>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {activeSections.map((section) => (
        <div key={section.key}>
          <label
            htmlFor={`note-${section.key}`}
            className="mb-1.5 block text-caption font-medium text-text-secondary"
          >
            {section.label}
          </label>
          <textarea
            id={`note-${section.key}`}
            value={section.content}
            onChange={(e) => handleSectionChange(section.key, e.target.value)}
            placeholder={`Enter ${section.label.toLowerCase()}...`}
            rows={3}
            className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-caption text-text-primary placeholder:text-text-tertiary focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple resize-none"
          />
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        {existingNote && (
          <span className="text-[10px] text-text-tertiary">
            Last saved {new Date(existingNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-md px-4 py-1.5 text-caption font-medium transition-colors',
            hasChanges
              ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
              : 'bg-surface-tertiary text-text-tertiary cursor-not-allowed',
          )}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save Notes
        </button>
      </div>
    </div>
  )
}

// --- Wrap-up Tab ---
function WrapUpTab({ eventId, clientName, meetingType }: { eventId: string; clientName: string; meetingType: MeetingType }) {
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps(eventId)
  const createMutation = useCreateFollowUp(eventId)

  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState<'advisor' | 'csa' | 'ai'>('advisor')
  const [dueDate, setDueDate] = useState('')

  function handleGenerateSummary() {
    const context = `Please generate a post-meeting summary for my ${MEETING_TYPE_LABELS[meetingType]} with ${clientName}. Include key discussion points, decisions made, and follow-up actions needed.`
    setInitialMessage(context)
  }

  function handleAddFollowUp() {
    if (!title.trim() || !dueDate) return
    createMutation.mutate(
      { title: title.trim(), assignee, dueDate },
      {
        onSuccess: () => {
          setTitle('')
          setDueDate('')
          setAssignee('advisor')
        },
      },
    )
  }

  return (
    <div className="px-5 py-4 space-y-6">
      {/* Generate Summary */}
      <div>
        <SectionHeader icon={Wand2}>AI Summary</SectionHeader>
        <button
          onClick={handleGenerateSummary}
          className="flex items-center gap-2 rounded-md border border-accent-purple bg-accent-purple/5 px-4 py-2.5 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/10"
        >
          <Sparkles className="h-4 w-4" />
          Generate Meeting Summary
        </button>
        <p className="mt-1.5 text-[10px] text-text-tertiary">
          Opens AI assistant with a pre-filled prompt for this meeting
        </p>
      </div>

      {/* Follow-up Creation */}
      <div>
        <SectionHeader icon={ClipboardList}>Follow-up Tasks</SectionHeader>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow-up task title..."
              className="flex-1 rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-caption text-text-primary placeholder:text-text-tertiary focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple"
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value as 'advisor' | 'csa' | 'ai')}
              className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-caption text-text-primary focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple"
            >
              <option value="advisor">Me</option>
              <option value="csa">CSA</option>
              <option value="ai">AI</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-caption text-text-primary focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple"
            />
            <button
              onClick={handleAddFollowUp}
              disabled={!title.trim() || !dueDate || createMutation.isPending}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-caption font-medium transition-colors',
                title.trim() && dueDate
                  ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                  : 'bg-surface-tertiary text-text-tertiary cursor-not-allowed',
              )}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add
            </button>
          </div>

          {/* Follow-ups list */}
          {followUpsLoading ? (
            <div className="flex items-center gap-2 py-4 text-caption text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading follow-ups...
            </div>
          ) : followUps && followUps.length > 0 ? (
            <ul className="space-y-2">
              {followUps.map((fu) => (
                <li
                  key={fu.id}
                  className="flex items-center gap-3 rounded-md bg-surface-secondary px-3 py-2"
                >
                  {fu.completed ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent-green" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-text-tertiary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-caption', fu.completed ? 'text-text-tertiary line-through' : 'text-text-primary')}>
                      {fu.title}
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {ASSIGNEE_LABELS[fu.assignee]} &middot; Due {new Date(fu.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-caption text-text-tertiary">No follow-ups yet</p>
          )}
        </div>
      </div>

      {/* Schedule Next Meeting */}
      <div className="rounded-md border border-border-primary bg-surface-secondary px-4 py-3">
        <div className="flex items-center gap-2 text-caption text-text-secondary">
          <CalendarPlus className="h-4 w-4 text-accent-blue" />
          <span className="font-medium">Schedule Next Meeting</span>
        </div>
        <p className="mt-1 text-[10px] text-text-tertiary">
          Consider scheduling the next {MEETING_TYPE_LABELS[meetingType].toLowerCase()} with {clientName} to maintain engagement cadence.
        </p>
      </div>
    </div>
  )
}

// --- Main Component ---
export function MeetingPrepModal({ eventId, onClose, initialTab = 'prep' }: MeetingPrepModalProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab)
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set())
  const { data: prep, isLoading } = useMeetingPrep(eventId)
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const shareWithTeam = useUIStore((s) => s.shareWithTeam)

  function handleTogglePoint(idx: number) {
    setCheckedPoints((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

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

  const tabs: { key: WorkspaceTab; label: string }[] = [
    { key: 'prep', label: 'Prep' },
    { key: 'notes', label: 'Notes' },
    { key: 'wrapup', label: 'Wrap-up' },
  ]

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[640px] max-h-[80vh]">
        <DialogHeader className="bg-accent-purple/5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent-purple" />
            <div>
              <DialogTitle>Meeting Workspace</DialogTitle>
              {prep && (
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-caption text-text-secondary">{prep.clientName}</span>
                  <Badge variant="purple">{MEETING_TYPE_LABELS[prep.meetingType]}</Badge>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border-primary px-5" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative px-4 py-2.5 text-caption font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-accent-purple'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-purple" />
              )}
            </button>
          ))}
        </div>

        <div className="max-h-[calc(80vh-180px)] overflow-y-auto scrollbar-thin" aria-busy={isLoading}>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-accent-purple" />
              <span className="text-body text-text-secondary">Generating meeting prep...</span>
            </div>
          ) : prep ? (
            <>
              {activeTab === 'prep' && (
                <PrepTab prep={prep} checkedPoints={checkedPoints} onTogglePoint={handleTogglePoint} />
              )}
              {activeTab === 'notes' && <NotesTab eventId={eventId} />}
              {activeTab === 'wrapup' && (
                <WrapUpTab eventId={eventId} clientName={prep.clientName} meetingType={prep.meetingType} />
              )}
            </>
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
              AI-generated &bull; {new Date(prep.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
