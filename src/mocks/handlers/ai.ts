import { http, HttpResponse, delay } from 'msw'
import { getAIResponse, suggestedPrompts } from '../data/ai'
import { clients } from '../data/clients'
import { households } from '../data/households'
import { accounts } from '../data/accounts'
import { nbas } from '../data/nbas'
import type { ChatMessage, ActionConfirmation, DocumentGeneration, ContextBriefingData, BriefingMetric, AIInsight } from '@/types/ai'

function formatAUM(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

export const aiHandlers = [
  // POST /api/ai/message — context-aware chat response
  http.post('/api/ai/message', async ({ request }) => {
    const body = (await request.json()) as {
      message: string
      context: { screenType: string; entityType?: string; entityId?: string; entityName?: string }
    }

    await delay(600) // Simulate AI thinking time

    const template = getAIResponse(body.message, body.context.screenType, body.context.entityType)

    const response: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: template.content,
      timestamp: new Date().toISOString(),
      citations: template.citations,
      actions: template.actions,
      documentPreview: template.documentPreview,
    }

    return HttpResponse.json(response)
  }),

  // GET /api/ai/suggestions — suggested prompts for current screen
  http.get('/api/ai/suggestions', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType') ?? 'dashboard'

    const filtered = suggestedPrompts.filter((p) => p.screenType === screenType)
    return HttpResponse.json(filtered)
  }),

  // POST /api/ai/actions/:actionId/execute — execute an AI-suggested action
  http.post('/api/ai/actions/:actionId/execute', async ({ params }) => {
    await delay(400)

    const confirmation: ActionConfirmation = {
      id: params.actionId as string,
      action: 'Executed Action',
      description: 'The action has been processed successfully.',
      impact: 'Changes applied to the relevant accounts.',
      status: 'executed',
    }

    return HttpResponse.json(confirmation)
  }),

  // POST /api/ai/generate-document — generate AI document
  http.post('/api/ai/generate-document', async ({ request }) => {
    const body = (await request.json()) as {
      templateType: string
      clientId: string
      parameters: Record<string, unknown>
    }

    await delay(800)

    const doc: DocumentGeneration = {
      templateType: body.templateType,
      clientId: body.clientId,
      parameters: body.parameters,
      status: 'ready',
      content: `Generated ${body.templateType} document for client ${body.clientId}. This is a preview of the AI-generated content that would be produced by the document generation system.`,
    }

    return HttpResponse.json(doc)
  }),

  // GET /api/ai/context — assembled context briefing for current entity
  http.get('/api/ai/context', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType') ?? 'dashboard'
    const entityId = url.searchParams.get('entityId')

    if (screenType === 'client_detail' && entityId) {
      const client = clients.find((c) => c.id === entityId)
      if (client) {
        const hh = households.find((h) => h.members.some((m) => m.clientId === client.id))
        const clientAccounts = accounts.filter((a) => a.clientId === client.id)
        const briefing: ContextBriefingData = {
          title: client.fullName,
          entityType: 'client',
          metrics: [
            { label: 'Total AUM', value: formatAUM(client.totalAUM) },
            { label: 'Segment', value: client.segment.charAt(0).toUpperCase() + client.segment.slice(1) },
            { label: 'Risk Profile', value: client.riskProfile.tolerance },
            { label: 'Accounts', value: String(clientAccounts.length) },
            { label: 'Household', value: hh?.name ?? 'N/A' },
          ],
          highlights: [
            `Last updated ${client.updatedAt}`,
            `Risk score: ${client.riskProfile.score}/100 (assessed ${client.riskProfile.lastAssessed})`,
          ],
          asOf: new Date().toISOString(),
        }
        return HttpResponse.json(briefing)
      }
    }

    if (screenType === 'account_detail' && entityId) {
      const account = accounts.find((a) => a.id === entityId)
      if (account) {
        const metrics: BriefingMetric[] = [
          { label: 'Account Value', value: formatAUM(account.totalValue) },
          { label: 'Cash', value: formatAUM(account.cashBalance) },
          { label: 'Type', value: account.type.replace(/_/g, ' ') },
          { label: 'Custodian', value: account.custodian },
        ]
        if (account.isUMA && account.sleeves) {
          metrics.push({ label: 'Sleeves', value: String(account.sleeves.length) })
        }
        const briefing: ContextBriefingData = {
          title: account.name,
          entityType: 'account',
          metrics,
          highlights: [
            `Last rebalanced ${account.lastRebalance}`,
            account.modelId ? `Model: ${account.modelId}` : 'No model assigned',
          ],
          asOf: new Date().toISOString(),
        }
        return HttpResponse.json(briefing)
      }
    }

    if (screenType === 'household_detail' && entityId) {
      const hh = households.find((h) => h.id === entityId)
      if (hh) {
        const hhAccounts = accounts.filter((a) => hh.accountIds.includes(a.id))
        const briefing: ContextBriefingData = {
          title: hh.name,
          entityType: 'household',
          metrics: [
            { label: 'Total AUM', value: formatAUM(hh.totalAUM) },
            { label: 'Managed', value: formatAUM(hh.managedAUM) },
            { label: 'Held-Away', value: formatAUM(hh.heldAwayAUM) },
            { label: 'Members', value: String(hh.members.length) },
            { label: 'Accounts', value: String(hhAccounts.length) },
          ],
          highlights: [
            `Primary contact: ${hh.members.find((m) => m.clientId === hh.primaryContactId)?.name ?? 'N/A'}`,
            `Segment: ${hh.segment}`,
          ],
          asOf: new Date().toISOString(),
        }
        return HttpResponse.json(briefing)
      }
    }

    if (screenType === 'portfolios') {
      const totalAUM = accounts.reduce((sum, a) => sum + a.totalValue, 0)
      const briefing: ContextBriefingData = {
        title: 'Portfolio Overview',
        entityType: 'portfolio',
        metrics: [
          { label: 'Total AUM', value: formatAUM(totalAUM) },
          { label: 'Accounts', value: String(accounts.length) },
          { label: 'Households', value: String(households.length) },
        ],
        highlights: [
          `${accounts.filter((a) => a.isUMA).length} UMA accounts`,
          `${accounts.filter((a) => a.status === 'active').length} active accounts`,
        ],
        asOf: new Date().toISOString(),
      }
      return HttpResponse.json(briefing)
    }

    if (screenType === 'dashboard') {
      const totalAUM = accounts.reduce((sum, a) => sum + a.totalValue, 0)
      const briefing: ContextBriefingData = {
        title: 'Practice Summary',
        entityType: 'dashboard',
        metrics: [
          { label: 'AUM', value: formatAUM(totalAUM) },
          { label: 'Clients', value: String(clients.length) },
          { label: 'Households', value: String(households.length) },
          { label: 'Accounts', value: String(accounts.length) },
        ],
        highlights: [],
        asOf: new Date().toISOString(),
      }
      return HttpResponse.json(briefing)
    }

    return HttpResponse.json(null)
  }),

  // GET /api/ai/insights — proactive AI insights per page/entity
  http.get('/api/ai/insights', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType') ?? 'dashboard'
    const entityId = url.searchParams.get('entityId')

    const insights: AIInsight[] = []

    if (screenType === 'dashboard') {
      const totalAUM = accounts.reduce((sum, a) => sum + a.totalValue, 0)
      const activeNBAs = nbas.filter((n) => !n.dismissed)
      const criticalCount = activeNBAs.filter((n) => n.priority === 'critical').length
      const urgentCount = activeNBAs.filter((n) => n.scoring.urgency > 80).length

      insights.push({
        id: 'dash-1',
        severity: 'info',
        title: 'Portfolio Health Summary',
        body: `Managing ${formatAUM(totalAUM)} across ${accounts.length} accounts. ${activeNBAs.length} pending actions identified.`,
        metric: { label: 'Net inflows this month', value: '+$420K' },
      })
      if (criticalCount > 0) {
        insights.push({
          id: 'dash-2',
          severity: 'warning',
          title: `${criticalCount} Critical Action${criticalCount > 1 ? 's' : ''} Require Attention`,
          body: `${urgentCount} time-sensitive items detected across your book. Compliance review and RMD deadlines approaching.`,
          actionLabel: 'View Critical Actions',
          actionAI: 'Show me all critical priority NBAs that need attention today',
        })
      }
      insights.push({
        id: 'dash-3',
        severity: 'opportunity',
        title: 'Tax-Loss Harvesting Window',
        body: 'Market pullback in international equities creates $47K in harvestable losses across 6 client accounts.',
        metric: { label: 'Estimated tax savings', value: '$17,400' },
        actionLabel: 'Review Opportunities',
        actionRoute: '/portfolios/accounts/acc-001/tax',
      })
    }

    if (screenType === 'portfolios') {
      const driftedCount = Math.floor(accounts.length * 0.3)
      insights.push({
        id: 'port-1',
        severity: 'warning',
        title: `${driftedCount} Accounts Exceeding Drift Threshold`,
        body: 'Recent equity rally pushed several portfolios beyond the 3% absolute drift band. Batch rebalancing recommended.',
        metric: { label: 'Aggregate drift impact', value: '$234K' },
        actionLabel: 'Start Batch Rebalance',
        actionRoute: '/portfolios/rebalance',
      })
      insights.push({
        id: 'port-2',
        severity: 'opportunity',
        title: 'Model Update Available',
        body: 'The Moderate Growth model was updated by the investment committee on Feb 20. 14 accounts assigned to this model have not been rebalanced since.',
        actionLabel: 'Review Model Changes',
        actionAI: 'Show me the details of the Moderate Growth model update and which accounts need rebalancing',
      })
    }

    if (screenType === 'client_detail' && entityId) {
      const client = clients.find((c) => c.id === entityId)
      if (client) {
        const daysSinceContact = Math.floor((Date.now() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceContact > 60) {
          insights.push({
            id: `cli-${entityId}-1`,
            severity: 'warning',
            title: 'Contact Gap Detected',
            body: `No recorded contact in ${daysSinceContact} days. Service standard for ${client.tier.label} clients is 90 days.`,
            actionLabel: 'Draft Outreach',
            actionAI: `Draft a check-in email to ${client.fullName} referencing their portfolio performance and upcoming review`,
          })
        }
        if (client.riskProfile.score > 70) {
          insights.push({
            id: `cli-${entityId}-2`,
            severity: 'info',
            title: 'Risk Profile Note',
            body: `${client.fullName} has an aggressive risk profile (${client.riskProfile.score}/100). Current allocation appears aligned with stated tolerance.`,
          })
        }
        insights.push({
          id: `cli-${entityId}-3`,
          severity: 'opportunity',
          title: 'Consolidation Opportunity',
          body: `Held-away assets detected. Consolidating could improve tax efficiency and simplify reporting.`,
          metric: { label: 'Held-away estimate', value: '$180K' },
          actionLabel: 'Discuss with Client',
          actionAI: `Help me prepare talking points for discussing asset consolidation with ${client.fullName}`,
        })
      }
    }

    return HttpResponse.json(insights)
  }),
]
