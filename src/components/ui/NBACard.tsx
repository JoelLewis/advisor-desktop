import { useState } from 'react'
import {
  RefreshCw, DollarSign, Target, AlertTriangle,
  Heart, Shield, TrendingUp, ChevronDown, ChevronUp,
  X, Clock, ArrowRight, Timer, Sparkles, Mail, FileText, MessageSquare, Loader2, Copy, Check,
  ShieldAlert, History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './Badge'
import { useNBATemplates } from '@/hooks/use-nbas'
import type { NBA, NBACategory, NBAEscalationLevel, NBAPriority } from '@/types/nba'

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = MS_PER_HOUR * 24

const CATEGORY_CONFIG: Record<NBACategory, { icon: typeof RefreshCw; label: string; variant: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'default'; actionLabel: string }> = {
  rebalancing: { icon: RefreshCw, label: 'Rebalancing', variant: 'blue', actionLabel: 'Rebalance' },
  tax_management: { icon: DollarSign, label: 'Tax Management', variant: 'green', actionLabel: 'Review Tax Lots' },
  planning: { icon: Target, label: 'Planning', variant: 'purple', actionLabel: 'Review Plan' },
  risk: { icon: AlertTriangle, label: 'Risk', variant: 'red', actionLabel: 'View Risk' },
  client_service: { icon: Heart, label: 'Client Service', variant: 'yellow', actionLabel: 'Contact Client' },
  compliance: { icon: Shield, label: 'Compliance', variant: 'red', actionLabel: 'Complete Review' },
  growth: { icon: TrendingUp, label: 'Growth', variant: 'green', actionLabel: 'View Prospect' },
}

const PRIORITY_CONFIG: Record<NBAPriority, { count: number; dotColor: string; label: string; textColor: string }> = {
  critical: { count: 3, dotColor: 'bg-accent-red', label: 'Critical', textColor: 'text-accent-red' },
  high: { count: 3, dotColor: 'bg-amber-500', label: 'High', textColor: 'text-amber-600' },
  medium: { count: 2, dotColor: 'bg-amber-400', label: 'Medium', textColor: 'text-amber-500' },
  low: { count: 1, dotColor: 'bg-text-tertiary', label: 'Low', textColor: 'text-text-tertiary' },
}

export { CATEGORY_CONFIG }

type UrgencyBucket = 'time_critical' | 'this_week' | 'this_month' | 'when_convenient'

const URGENCY_CONFIG: Record<UrgencyBucket, { label: string; variant: 'red' | 'yellow' | 'blue' | 'default' }> = {
  time_critical: { label: 'Time-Critical', variant: 'red' },
  this_week: { label: 'This Week', variant: 'yellow' },
  this_month: { label: 'This Month', variant: 'blue' },
  when_convenient: { label: 'When Convenient', variant: 'default' },
}

const ESCALATION_CONFIG: Record<NBAEscalationLevel, { label: string; variant: 'red' | 'yellow' | 'default' } | null> = {
  none: null,
  advisor: { label: 'Escalated', variant: 'yellow' },
  supervisor: { label: 'Supervisor Review', variant: 'red' },
  cco: { label: 'CCO Escalation', variant: 'red' },
}

function getUrgencyBucket(urgency: number): UrgencyBucket {
  if (urgency > 80) return 'time_critical'
  if (urgency > 60) return 'this_week'
  if (urgency > 40) return 'this_month'
  return 'when_convenient'
}

const MOCK_NOW = new Date('2026-02-25T12:00:00Z')

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY)
}

function formatComplianceDeadline(deadline: string): { text: string; urgent: boolean } {
  const days = daysBetween(MOCK_NOW, new Date(deadline))
  if (days < 0) return { text: 'Past deadline', urgent: true }
  if (days <= 3) return { text: `${days}d remaining — action required`, urgent: true }
  return { text: `${days}d until deadline`, urgent: days <= 7 }
}

function formatCountdown(expiresAt: string): string | null {
  const diffMs = new Date(expiresAt).getTime() - MOCK_NOW.getTime()
  if (diffMs <= 0) return 'Expired'
  const days = Math.floor(diffMs / MS_PER_DAY)
  const hours = Math.floor((diffMs % MS_PER_DAY) / MS_PER_HOUR)
  if (days > 7) return `${days}d remaining`
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}

function CopyButton({ text, field, copiedField, onCopy }: {
  text: string
  field: string
  copiedField: string | null
  onCopy: (text: string, field: string) => void
}) {
  const isCopied = copiedField === field
  return (
    <button
      onClick={() => onCopy(text, field)}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
    >
      {isCopied
        ? <><Check className="h-2.5 w-2.5 text-accent-green" /> Copied</>
        : <><Copy className="h-2.5 w-2.5" /> Copy</>}
    </button>
  )
}

function countdownColor(countdown: string | null, urgencyBucket: UrgencyBucket): string {
  if (countdown === 'Expired' || urgencyBucket === 'time_critical') return 'text-accent-red'
  return 'text-amber-600'
}

type NBACardProps = {
  nba: NBA
  onDismiss?: (id: string) => void
  onSnooze?: (id: string) => void
  onAction?: (id: string) => void
}

export function NBACard({ nba, onDismiss, onSnooze, onAction }: NBACardProps) {
  const [expanded, setExpanded] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { data: templates, isLoading: templatesLoading } = useNBATemplates(templatesOpen ? nba.id : null)
  const config = CATEGORY_CONFIG[nba.category]
  const priority = PRIORITY_CONFIG[nba.priority]
  const Icon = config.icon
  const showExpand = nba.clients.length > 3
  const urgencyBucket = getUrgencyBucket(nba.scoring.urgency)
  const urgencyConfig = URGENCY_CONFIG[urgencyBucket]
  const countdown = nba.expiresAt ? formatCountdown(nba.expiresAt) : null
  const compliance = nba.complianceInfo
  const escalation = compliance ? ESCALATION_CONFIG[compliance.escalationLevel] : null
  const complianceDeadline = compliance?.deadline ? formatComplianceDeadline(compliance.deadline) : null

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={config.variant}>
              <Icon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
            <Badge variant={urgencyConfig.variant}>
              {urgencyConfig.label}
            </Badge>
            {escalation && (
              <Badge variant={escalation.variant}>
                <ShieldAlert className="mr-1 h-3 w-3" />
                {escalation.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-caption font-medium', priority.textColor)}>
              {priority.label}
            </span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: priority.count }).map((_, i) => (
                <span key={i} className={cn('h-1.5 w-1.5 rounded-full', priority.dotColor)} />
              ))}
            </div>
          </div>
        </div>

        {/* Title & description */}
        <h3 className="mt-2 text-body-strong text-text-primary">{nba.title}</h3>
        <p className="mt-1 text-caption text-text-secondary line-clamp-2">{nba.description}</p>

        {/* Countdown timer */}
        {countdown && (
          <div className={cn('mt-2 flex items-center gap-1.5 text-caption font-medium', countdownColor(countdown, urgencyBucket))}>
            <Timer className="h-3 w-3" />
            <span>{countdown}</span>
          </div>
        )}

        {/* Compliance deadline */}
        {complianceDeadline && (
          <div className={cn(
            'mt-2 flex items-center gap-1.5 text-caption font-medium',
            complianceDeadline.urgent ? 'text-accent-red' : 'text-text-secondary',
          )}>
            <ShieldAlert className="h-3 w-3" />
            <span>Compliance deadline: {complianceDeadline.text}</span>
          </div>
        )}

        {/* Client chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {nba.clients.slice(0, expanded ? undefined : 3).map((client) => (
            <button
              key={client.id}
              className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-caption font-medium text-text-secondary transition-colors hover:bg-border-primary hover:text-text-primary"
            >
              {client.name}
            </button>
          ))}
          {showExpand && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-text-tertiary transition-colors hover:text-text-secondary"
            >
              {expanded ? (
                <>Show less <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>+{nba.clients.length - 3} more <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI Templates toggle */}
      <div className="border-t border-border-primary">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="flex w-full items-center gap-1.5 px-4 py-2 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/5"
        >
          <Sparkles className="h-3 w-3" />
          {templatesOpen ? 'Hide' : 'View'} AI Templates
          {templatesOpen ? <ChevronUp className="ml-auto h-3 w-3" /> : <ChevronDown className="ml-auto h-3 w-3" />}
        </button>

        {templatesOpen && (
          <div className="border-t border-border-primary bg-accent-purple/[0.02] px-4 py-3 space-y-3">
            {templatesLoading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-accent-purple" />
                <span className="text-caption text-text-tertiary">Generating templates...</span>
              </div>
            ) : templates ? (
              <>
                {/* Talking Points */}
                <div>
                  <div className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
                    <MessageSquare className="h-3 w-3" /> Talking Points
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {templates.talkingPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-caption text-text-secondary">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-[10px] font-medium text-accent-purple">
                          {i + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Email Draft */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
                      <Mail className="h-3 w-3" /> Email Draft
                    </div>
                    <CopyButton
                      text={`Subject: ${templates.emailDraft.subject}\n\n${templates.emailDraft.body}`}
                      field="email"
                      copiedField={copiedField}
                      onCopy={handleCopy}
                    />
                  </div>
                  <div className="mt-1.5 rounded-md border border-border-primary bg-surface-primary p-2.5">
                    <p className="text-caption font-medium text-text-primary">
                      Subject: {templates.emailDraft.subject}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-caption text-text-secondary leading-relaxed">
                      {templates.emailDraft.body}
                    </p>
                  </div>
                </div>

                {/* Analysis Summary */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
                      <FileText className="h-3 w-3" /> Analysis Summary
                    </div>
                    <CopyButton
                      text={templates.analysisSummary}
                      field="analysis"
                      copiedField={copiedField}
                      onCopy={handleCopy}
                    />
                  </div>
                  <p className="mt-1.5 text-caption text-text-secondary leading-relaxed">
                    {templates.analysisSummary}
                  </p>
                </div>

                {/* AI attribution */}
                <p className="flex items-center gap-1 text-[10px] text-text-tertiary">
                  <Sparkles className="h-2.5 w-2.5 text-accent-purple" />
                  AI-generated · {new Date(templates.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Audit trail (compliance only) */}
      {compliance && auditOpen && (
        <div className="border-t border-border-primary bg-surface-tertiary/50 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
            <History className="h-3 w-3" /> Compliance Audit Trail
          </div>
          <div className="mt-2 space-y-1">
            {compliance.auditTrail.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                <span className="font-mono text-text-tertiary">
                  {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-text-secondary">
                  <span className="font-medium">{entry.action.replace(/_/g, ' ')}</span>
                  {entry.actor !== 'system' && <> by {entry.actor}</>}
                  {entry.note && <> — {entry.note}</>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-border-primary px-4 py-2">
        <div className="flex items-center gap-1">
          {compliance?.nonDismissible && !compliance.supervisorOverride ? (
            <span className="flex items-center gap-1 rounded px-2 py-1 text-caption text-text-tertiary" title="Compliance actions require supervisor override to dismiss">
              <ShieldAlert className="h-3 w-3" /> Non-Dismissible
            </span>
          ) : (
            <button
              onClick={() => onDismiss?.(nba.id)}
              className="flex items-center gap-1 rounded px-2 py-1 text-caption text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
            >
              <X className="h-3 w-3" /> Dismiss
            </button>
          )}
          <button
            onClick={() => onSnooze?.(nba.id)}
            className="flex items-center gap-1 rounded px-2 py-1 text-caption text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
          >
            <Clock className="h-3 w-3" /> Snooze
          </button>
          {compliance && (
            <button
              onClick={() => setAuditOpen(!auditOpen)}
              className="flex items-center gap-1 rounded px-2 py-1 text-caption text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
            >
              <History className="h-3 w-3" /> {auditOpen ? 'Hide' : 'Audit'} Trail
            </button>
          )}
        </div>
        <button
          onClick={() => onAction?.(nba.id)}
          className="flex items-center gap-1 rounded-md bg-accent-blue px-3 py-1 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90"
        >
          {config.actionLabel} <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

