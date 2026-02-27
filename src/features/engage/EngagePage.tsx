import { useState, useMemo } from 'react'
import {
  Megaphone, Mail, Phone, Video, Users2, FileText,
  ArrowUpRight, ArrowDownLeft, Sparkles, Globe, Hash,
  Calendar, Send, Shield, ShieldAlert, Plus, Pause, Play,
  Edit3, XCircle,
} from 'lucide-react'
import { TabLayout } from '@/components/ui/TabLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import {
  useAllClientComms, useCampaigns, useSocialOpportunities, useNewsletters,
  useUpdateCampaignStatus, useScheduleSocialPost, useRequestSocialApproval,
} from '@/hooks/use-engage'
import { useAIInsights } from '@/hooks/use-ai'
import { formatDate } from '@/lib/utils'
import { ComposeEmailDialog } from './ComposeEmailDialog'
import { LogCallDialog } from './LogCallDialog'
import { CampaignDialog } from './CampaignDialog'
import type { CommChannel, CommDirection } from '@/types/client-comms'
import type { CampaignStatus, ComplianceStatus, NewsletterStatus, SocialPlatform, SocialType } from '@/types/engage'

const CHANNEL_ICONS: Record<CommChannel, typeof Mail> = {
  email: Mail,
  phone: Phone,
  video: Video,
  in_person: Users2,
  letter: FileText,
}

const DIRECTION_ICON: Record<CommDirection, typeof ArrowUpRight> = {
  outbound: ArrowUpRight,
  inbound: ArrowDownLeft,
}

const CAMPAIGN_STATUS_BADGE: Record<CampaignStatus, 'default' | 'blue' | 'green' | 'yellow'> = {
  draft: 'default',
  scheduled: 'blue',
  active: 'yellow',
  completed: 'green',
}

const COMPLIANCE_STATUS_BADGE: Record<ComplianceStatus, 'default' | 'green' | 'red'> = {
  pending: 'default',
  approved: 'green',
  rejected: 'red',
}

const NEWSLETTER_STATUS_BADGE: Record<NewsletterStatus, 'default' | 'blue' | 'green'> = {
  draft: 'default',
  scheduled: 'blue',
  sent: 'green',
}

const SOCIAL_PLATFORM_ICON: Record<SocialPlatform, typeof Globe> = {
  linkedin: Globe,
  twitter: Hash,
}

const SOCIAL_TYPE_LABEL: Record<SocialType, string> = {
  market_commentary: 'Market Commentary',
  thought_leadership: 'Thought Leadership',
  client_education: 'Client Education',
  firm_update: 'Firm Update',
}

function ClientCommsTab() {
  const { data, isLoading } = useAllClientComms()
  const [channelFilter, setChannelFilter] = useState<CommChannel | 'all'>('all')
  const [directionFilter, setDirectionFilter] = useState<CommDirection | 'all'>('all')
  const [composeOpen, setComposeOpen] = useState(false)
  const [logCallOpen, setLogCallOpen] = useState(false)

  const filtered = useMemo(() => {
    let items = data?.items ?? []
    if (channelFilter !== 'all') items = items.filter((c) => c.channel === channelFilter)
    if (directionFilter !== 'all') items = items.filter((c) => c.direction === directionFilter)
    return items
  }, [data, channelFilter, directionFilter])

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setComposeOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90"
        >
          <Mail className="h-3.5 w-3.5" />
          Compose Email
        </button>
        <button
          onClick={() => setLogCallOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border-secondary px-3 py-1.5 text-caption font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
        >
          <Phone className="h-3.5 w-3.5" />
          Log Call
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-caption text-text-tertiary">Channel:</span>
        {(['all', 'email', 'phone', 'video', 'in_person', 'letter'] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            className={`rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
              channelFilter === ch
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-secondary hover:bg-surface-tertiary'
            }`}
          >
            {ch === 'all' ? 'All' : ch === 'in_person' ? 'In-Person' : ch.charAt(0).toUpperCase() + ch.slice(1)}
          </button>
        ))}
        <div className="mx-2 h-4 border-l border-border-primary" />
        <span className="text-caption text-text-tertiary">Direction:</span>
        {(['all', 'inbound', 'outbound'] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => setDirectionFilter(dir)}
            className={`rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
              directionFilter === dir
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-secondary hover:bg-surface-tertiary'
            }`}
          >
            {dir === 'all' ? 'All' : dir.charAt(0).toUpperCase() + dir.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-primary text-caption font-medium text-text-tertiary">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 w-16">Ch.</th>
                <th className="px-4 py-3 w-12">Dir.</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 max-w-xs">Summary</th>
                <th className="px-4 py-3 w-28">Date</th>
                <th className="px-4 py-3 w-10">AI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((comm) => {
                const ChannelIcon = CHANNEL_ICONS[comm.channel]
                const DirIcon = DIRECTION_ICON[comm.direction]
                return (
                  <tr key={comm.id} className="border-b border-border-primary last:border-b-0 transition-colors hover:bg-surface-tertiary">
                    <td className="px-4 py-3 text-body font-medium text-text-primary whitespace-nowrap">{comm.clientName}</td>
                    <td className="px-4 py-3"><ChannelIcon className="h-4 w-4 text-text-tertiary" /></td>
                    <td className="px-4 py-3">
                      <DirIcon className={`h-4 w-4 ${comm.direction === 'inbound' ? 'text-accent-blue' : 'text-accent-green'}`} />
                    </td>
                    <td className="px-4 py-3 text-body text-text-primary">{comm.subject}</td>
                    <td className="px-4 py-3 text-caption text-text-secondary max-w-xs truncate">{comm.summary}</td>
                    <td className="px-4 py-3 text-caption text-text-tertiary whitespace-nowrap">{formatDate(comm.timestamp)}</td>
                    <td className="px-4 py-3">
                      {comm.aiGenerated && <Sparkles className="h-3.5 w-3.5 text-accent-purple" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-caption text-text-tertiary">No communications match your filters</div>
        )}
      </Card>

      <ComposeEmailDialog open={composeOpen} onClose={() => setComposeOpen(false)} />
      <LogCallDialog open={logCallOpen} onClose={() => setLogCallOpen(false)} />
    </div>
  )
}

function CampaignsTab() {
  const { data, isLoading } = useCampaigns()
  const updateStatus = useUpdateCampaignStatus()
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false)

  if (isLoading) return <Skeleton className="h-96" />

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setCampaignDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((camp) => (
          <Card key={camp.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-body-strong text-text-primary">{camp.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={CAMPAIGN_STATUS_BADGE[camp.status]}>{camp.status}</Badge>
                    <span className="text-caption text-text-tertiary">{camp.channel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {camp.nbaTriggered && (
                    <Badge variant="purple">
                      <Sparkles className="mr-1 h-3 w-3" />
                      NBA
                    </Badge>
                  )}
                  {camp.complianceApproved ? (
                    <Shield className="h-4 w-4 text-accent-green" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-text-tertiary" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase text-text-tertiary">Audience</p>
                  <p className="font-mono text-body">{camp.audienceCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-text-tertiary">Sent</p>
                  <p className="font-mono text-body">{camp.sentCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-text-tertiary">Open Rate</p>
                  <p className="font-mono text-body">{camp.openRate > 0 ? `${camp.openRate}%` : '\u2014'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-text-tertiary">Click Rate</p>
                  <p className="font-mono text-body">{camp.clickRate > 0 ? `${camp.clickRate}%` : '\u2014'}</p>
                </div>
              </div>
              {camp.scheduledDate && (
                <div className="flex items-center gap-1 text-caption text-text-tertiary">
                  <Calendar className="h-3 w-3" />
                  Scheduled: {formatDate(camp.scheduledDate)}
                </div>
              )}
              {/* Action buttons based on status */}
              {camp.status !== 'completed' && (
                <div className="flex items-center gap-2 border-t border-border-primary pt-3">
                  {camp.status === 'draft' && (
                    <>
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: camp.id, status: 'scheduled' })}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
                      >
                        <Send className="h-3 w-3" />
                        Send
                      </button>
                    </>
                  )}
                  {(camp.status === 'scheduled' || camp.status === 'active') && (
                    <button
                      onClick={() => updateStatus.mutate({ id: camp.id, status: 'draft' })}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CampaignDialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} />
    </div>
  )
}

function SocialTab() {
  const { data, isLoading } = useSocialOpportunities()
  const schedulePost = useScheduleSocialPost()
  const requestApproval = useRequestSocialApproval()

  if (isLoading) return <Skeleton className="h-96" />

  const items = data?.items ?? []

  return (
    <div className="space-y-3">
      {items.map((opp) => {
        const PlatformIcon = SOCIAL_PLATFORM_ICON[opp.platform]
        return (
          <Card key={opp.id}>
            <CardContent>
              <div className="flex items-start gap-3">
                <PlatformIcon className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-body-strong text-text-primary">{opp.title}</h3>
                      {opp.aiGenerated && <Sparkles className="h-3.5 w-3.5 text-accent-purple" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{SOCIAL_TYPE_LABEL[opp.type]}</Badge>
                      <Badge variant={COMPLIANCE_STATUS_BADGE[opp.complianceStatus]}>{opp.complianceStatus}</Badge>
                    </div>
                  </div>
                  <p className="text-caption text-text-secondary">{opp.suggestedContent}</p>
                  <div className="flex items-center justify-between">
                    {opp.scheduledDate ? (
                      <div className="flex items-center gap-1 text-caption text-text-tertiary">
                        <Calendar className="h-3 w-3" />
                        Scheduled: {formatDate(opp.scheduledDate)}
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="flex items-center gap-2">
                      {opp.complianceStatus === 'approved' && !opp.scheduledDate && (
                        <button
                          onClick={() => schedulePost.mutate(opp.id)}
                          disabled={schedulePost.isPending}
                          className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
                        >
                          <Calendar className="h-3 w-3" />
                          Schedule Post
                        </button>
                      )}
                      {opp.complianceStatus !== 'approved' && opp.complianceStatus !== 'pending' && (
                        <button
                          onClick={() => requestApproval.mutate(opp.id)}
                          disabled={requestApproval.isPending}
                          className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                        >
                          <Shield className="h-3 w-3" />
                          Request Approval
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function NewslettersTab() {
  const { data, isLoading } = useNewsletters()
  if (isLoading) return <Skeleton className="h-96" />

  const items = data?.items ?? []

  return (
    <div className="space-y-3">
      {items.map((nl) => (
        <Card key={nl.id}>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-text-secondary" />
                <div>
                  <h3 className="text-body-strong text-text-primary">{nl.title}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={NEWSLETTER_STATUS_BADGE[nl.status]}>{nl.status}</Badge>
                    <span className="text-caption text-text-tertiary">{nl.audienceSegment.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase text-text-tertiary">Audience</p>
                  <p className="font-mono text-body">{nl.audienceCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase text-text-tertiary">Open Rate</p>
                  <p className="font-mono text-body">{nl.openRate > 0 ? `${nl.openRate}%` : '\u2014'}</p>
                </div>
                {nl.scheduledDate && (
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase text-text-tertiary">Scheduled</p>
                    <p className="text-caption text-text-secondary">{formatDate(nl.scheduledDate)}</p>
                  </div>
                )}
                {nl.sentDate && (
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase text-text-tertiary">Sent</p>
                    <p className="text-caption text-text-secondary">{formatDate(nl.sentDate)}</p>
                  </div>
                )}
                {/* Action buttons */}
                {nl.status !== 'sent' && (
                  <div className="flex items-center gap-2">
                    {nl.status === 'draft' && (
                      <>
                        <button className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary">
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                        <button className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-blue transition-colors hover:bg-accent-blue/10">
                          <Play className="h-3 w-3" />
                          Schedule
                        </button>
                      </>
                    )}
                    {nl.status === 'scheduled' && (
                      <button className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary">
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function EngagePage() {
  const { data: commsData } = useAllClientComms()
  const { data: campaignsData } = useCampaigns()
  const { data: socialData } = useSocialOpportunities()
  const { data: newsletterData } = useNewsletters()
  const { data: insights } = useAIInsights('engage')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-text-secondary" />
        <h1 className="text-page-title">Engage</h1>
      </div>

      {insights && insights.length > 0 && (
        <AIInsightStack insights={insights} />
      )}

      <TabLayout
        tabs={[
          {
            id: 'comms',
            label: 'Client Comms',
            count: commsData?.total,
            content: <ClientCommsTab />,
          },
          {
            id: 'campaigns',
            label: 'Campaigns',
            count: campaignsData?.total,
            content: <CampaignsTab />,
          },
          {
            id: 'social',
            label: 'Social',
            count: socialData?.total,
            content: <SocialTab />,
          },
          {
            id: 'newsletters',
            label: 'Newsletters',
            count: newsletterData?.total,
            content: <NewslettersTab />,
          },
        ]}
        defaultTab="comms"
      />
    </div>
  )
}
