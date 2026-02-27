import { http, HttpResponse, delay } from 'msw'
import { calendarEvents } from '../data/calendar'
import { clients } from '../data/clients'
import { accounts } from '../data/accounts'
import type { MeetingPrep, MeetingPrepItem, MeetingNote, MeetingFollowUp } from '@/types/calendar'
import { formatAUM, notFound } from './utils'

const meetingNotesStore = new Map<string, MeetingNote>()
const meetingFollowUpsStore = new Map<string, MeetingFollowUp[]>()

export const calendarHandlers = [
  http.get('/api/calendar/events', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let events = [...calendarEvents]
    if (from) events = events.filter((e) => e.startTime >= from)
    if (to) events = events.filter((e) => e.startTime <= to)

    return HttpResponse.json(events)
  }),

  http.get('/api/calendar/schedule', ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date') ?? '2026-02-25'

    const dayEvents = calendarEvents.filter((e) =>
      e.startTime.startsWith(date),
    )
    return HttpResponse.json(dayEvents)
  }),

  // GET /api/calendar/events/:eventId/prep — AI-generated meeting prep
  http.get('/api/calendar/events/:eventId/prep', async ({ params }) => {
    await delay(500)
    const event = calendarEvents.find((e) => e.id === params.eventId)
    if (!event) return notFound()

    const client = event.clientId ? clients.find((c) => c.id === event.clientId) : undefined
    const clientAccounts = client ? accounts.filter((a) => a.clientId === client.id) : []
    const totalAUM = clientAccounts.reduce((sum, a) => sum + a.totalValue, 0)

    const portfolioSummary: MeetingPrepItem[] = client
      ? [
          { label: 'Total AUM', value: formatAUM(totalAUM) },
          { label: 'Segment', value: client.segment.charAt(0).toUpperCase() + client.segment.slice(1) },
          { label: 'Risk Profile', value: `${client.riskProfile.tolerance} (${client.riskProfile.score}/100)` },
          { label: 'Accounts', value: String(clientAccounts.length) },
          { label: 'YTD Return', value: '+8.2%', sentiment: 'positive' },
          { label: 'Last Contact', value: '12 days ago' },
        ]
      : [{ label: 'Type', value: 'Internal Meeting' }]

    const talkingPointsByType: Record<string, string[]> = {
      quarterly_review: [
        `Portfolio performance: ${client?.fullName ?? 'Client'}'s portfolio returned +8.2% YTD vs benchmark +7.8%.`,
        `Allocation review: Current allocation is within drift bands. Equity overweight by 1.2%.`,
        `Tax planning: ${totalAUM > 2_000_000 ? '$14K in harvestable losses identified in INTC and VXUS positions.' : 'No significant tax-loss harvesting opportunities at this time.'}`,
        `Upcoming RMD: ${client?.riskProfile.score && client.riskProfile.score > 50 ? 'Not applicable for this client.' : 'Review RMD strategy and distribution timeline.'}`,
        event.notes ? `Advisor notes: ${event.notes}` : 'No pre-meeting notes recorded.',
      ],
      planning: [
        `Financial plan status: Monte Carlo probability at 87% — on track for retirement goal.`,
        `Key life events: ${event.notes ?? 'Review current planning assumptions and timeline.'}`,
        `Insurance review: Current coverage appears adequate based on last assessment.`,
        `Estate planning: Beneficiary designations were last reviewed 18 months ago — recommend updating.`,
      ],
      annual_review: [
        `Annual performance: ${client?.fullName ?? 'Client'}'s portfolio returned +12.4% over the past 12 months.`,
        `IPS review: Investment Policy Statement was last updated ${client ? '14 months ago' : 'N/A'} — overdue for refresh.`,
        `Suitability check: Confirm risk tolerance, time horizon, and financial circumstances are unchanged.`,
        `Fee discussion: Current advisory fee is 0.85% — competitive for relationship size.`,
        `Compliance: Annual review documentation required. Prepare Form ADV Part 2B delivery.`,
      ],
      prospect: [
        `Prospect background: ${event.location ? `Meeting at ${event.location}.` : 'Location TBD.'}`,
        `Prepare firm overview and service model presentation.`,
        `Have sample portfolio proposals ready for different risk profiles.`,
        `Key differentiators: Tax-managed portfolios, comprehensive planning, AI-driven insights.`,
      ],
      ad_hoc: [
        event.notes ?? 'Review any pending action items for this client.',
        `Check for recent portfolio activity or alerts.`,
      ],
      internal: [
        `Review team updates and action items from last meeting.`,
        `Prepare any portfolio or client updates to share.`,
      ],
    }

    const actionItemsByType: Record<string, string[]> = {
      quarterly_review: [
        'Review and approve any pending rebalance trades',
        'Update CRM with meeting notes and next steps',
        'Send follow-up summary email within 24 hours',
        'Schedule next quarterly review',
      ],
      planning: [
        'Update financial plan with any new assumptions',
        'Document any changes to goals or timeline',
        'Review beneficiary designations if life event discussed',
        'Send updated plan summary to client',
      ],
      annual_review: [
        'Complete annual review compliance documentation',
        'Deliver updated Form ADV Part 2B if applicable',
        'Update IPS with any changes to risk tolerance or objectives',
        'Confirm billing rate for upcoming year',
        'Update suitability profile in CRM',
      ],
      prospect: [
        'Send thank-you email with firm overview materials',
        'Prepare customized portfolio proposal if interested',
        'Add to CRM pipeline with next follow-up date',
        'Schedule discovery meeting if initial meeting goes well',
      ],
      ad_hoc: [
        'Document discussion and any decisions made',
        'Follow up on any action items within 48 hours',
      ],
      internal: [
        'Distribute meeting notes to team',
        'Update shared action item tracker',
      ],
    }

    const recentActivity: string[] = client
      ? [
          'Portfolio rebalanced 18 days ago — added international equity exposure',
          `Last advisory fee: ${formatAUM(totalAUM * 0.0085 / 4)} (Q4 billing)`,
          'Document signed: Updated advisory agreement (Jan 15)',
          'AI insight generated: Tax-loss harvesting opportunity identified',
        ]
      : ['No client-specific activity to display for internal meetings.']

    const prep: MeetingPrep = {
      eventId: event.id,
      clientName: event.clientName ?? event.title,
      meetingType: event.meetingType,
      portfolioSummary,
      talkingPoints: talkingPointsByType[event.meetingType] ?? talkingPointsByType['ad_hoc'] ?? [],
      actionItems: actionItemsByType[event.meetingType] ?? actionItemsByType['ad_hoc'] ?? [],
      recentActivity,
      generatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(prep)
  }),

  // GET /api/calendar/events/:eventId/notes — retrieve meeting notes
  http.get('/api/calendar/events/:eventId/notes', async ({ params }) => {
    await delay(200)
    const eventId = params.eventId as string
    const event = calendarEvents.find((e) => e.id === eventId)
    if (!event) return notFound()

    const note = meetingNotesStore.get(eventId) ?? null
    return HttpResponse.json(note)
  }),

  // POST /api/calendar/events/:eventId/notes — save/update meeting notes
  http.post('/api/calendar/events/:eventId/notes', async ({ params, request }) => {
    await delay(300)
    const eventId = params.eventId as string
    const event = calendarEvents.find((e) => e.id === eventId)
    if (!event) return notFound()

    const body = (await request.json()) as { sections: MeetingNote['sections'] }
    const now = new Date().toISOString()
    const existing = meetingNotesStore.get(eventId)

    const note: MeetingNote = {
      id: existing?.id ?? `note-${eventId}`,
      eventId,
      sections: body.sections,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    meetingNotesStore.set(eventId, note)
    return HttpResponse.json(note)
  }),

  // GET /api/calendar/events/:eventId/follow-ups — list follow-ups
  http.get('/api/calendar/events/:eventId/follow-ups', async ({ params }) => {
    await delay(200)
    const eventId = params.eventId as string
    const event = calendarEvents.find((e) => e.id === eventId)
    if (!event) return notFound()

    const followUps = meetingFollowUpsStore.get(eventId) ?? []
    return HttpResponse.json(followUps)
  }),

  // POST /api/calendar/events/:eventId/follow-ups — create follow-up
  http.post('/api/calendar/events/:eventId/follow-ups', async ({ params, request }) => {
    await delay(300)
    const eventId = params.eventId as string
    const event = calendarEvents.find((e) => e.id === eventId)
    if (!event) return notFound()

    const body = (await request.json()) as Pick<MeetingFollowUp, 'title' | 'assignee' | 'dueDate'>
    const existing = meetingFollowUpsStore.get(eventId) ?? []

    const followUp: MeetingFollowUp = {
      id: `fu-${eventId}-${existing.length + 1}`,
      eventId,
      title: body.title,
      assignee: body.assignee,
      dueDate: body.dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    existing.push(followUp)
    meetingFollowUpsStore.set(eventId, existing)
    return HttpResponse.json(followUp)
  }),
]
