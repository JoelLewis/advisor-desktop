import { http, HttpResponse, delay } from 'msw'
import { getAIResponse, suggestedPrompts, actionTemplates } from '../data/ai'
import { clients } from '../data/clients'
import { households } from '../data/households'
import { accounts } from '../data/accounts'
import { nbas } from '../data/nbas'
import { customPrompts } from './settings'
import type { ChatMessage, ActionConfirmation, DocumentGeneration, ContextBriefingData, BriefingMetric, AIInsight, ActionTemplate, SuggestedPrompt } from '@/types/ai'
import type { CustomPromptCategory } from '@/types/settings'
import { formatAUM, computeTotalAUM } from './utils'

function makeBriefing(
  title: string,
  entityType: string,
  metrics: BriefingMetric[],
  highlights: string[],
): ContextBriefingData {
  return { title, entityType, metrics, highlights, asOf: new Date().toISOString() }
}

export const aiHandlers = [
  http.post('/api/ai/message', async ({ request }) => {
    const body = (await request.json()) as {
      message: string
      context: { screenType: string; entityType?: string; entityId?: string; entityName?: string }
    }

    await delay(600)

    const template = getAIResponse(body.message, body.context.screenType, body.context.entityType)

    const response: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: template.content,
      timestamp: new Date().toISOString(),
      citations: template.citations,
      actions: template.actions,
      documentPreview: template.documentPreview,
      richCards: template.richCards,
      tradeSuggestions: template.tradeSuggestions,
    }

    return HttpResponse.json(response)
  }),

  http.get('/api/ai/suggestions', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType') ?? 'dashboard'

    const screenCategoryMap: Record<string, CustomPromptCategory[]> = {
      dashboard: ['portfolio', 'communication', 'planning'],
      actions: ['portfolio', 'compliance', 'communication'],
      client_detail: ['communication', 'planning', 'compliance'],
      account_detail: ['portfolio', 'trading', 'compliance'],
      household_detail: ['portfolio', 'planning', 'communication'],
      households: ['portfolio', 'planning'],
      portfolios: ['portfolio', 'trading'],
      trading: ['trading', 'portfolio'],
      engage: ['communication', 'planning'],
      workflows: ['compliance', 'communication'],
    }

    const builtIn: SuggestedPrompt[] = suggestedPrompts
      .filter((p) => p.screenType === screenType)
      .map((p) => ({ ...p, source: 'built_in' as const }))

    const allowedCategories = screenCategoryMap[screenType] ?? []
    const custom: SuggestedPrompt[] = Array.from(customPrompts.values())
      .filter((cp) => allowedCategories.includes(cp.category))
      .map((cp) => ({
        text: cp.text,
        category: cp.category,
        screenType,
        source: 'custom' as const,
      }))

    const merged = [...builtIn, ...custom].slice(0, 8)
    return HttpResponse.json(merged)
  }),

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

  http.get('/api/ai/context', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType') ?? 'dashboard'
    const entityId = url.searchParams.get('entityId')

    if (screenType === 'client_detail' && entityId) {
      const client = clients.find((c) => c.id === entityId)
      if (client) {
        const hh = households.find((h) => h.members.some((m) => m.clientId === client.id))
        const clientAccounts = accounts.filter((a) => a.clientId === client.id)
        return HttpResponse.json(makeBriefing(
          client.fullName,
          'client',
          [
            { label: 'Total AUM', value: formatAUM(client.totalAUM) },
            { label: 'Segment', value: client.segment.charAt(0).toUpperCase() + client.segment.slice(1) },
            { label: 'Risk Profile', value: client.riskProfile.tolerance },
            { label: 'Accounts', value: String(clientAccounts.length) },
            { label: 'Household', value: hh?.name ?? 'N/A' },
          ],
          [
            `Last updated ${client.updatedAt}`,
            `Risk score: ${client.riskProfile.score}/100 (assessed ${client.riskProfile.lastAssessed})`,
          ],
        ))
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
        return HttpResponse.json(makeBriefing(
          account.name,
          'account',
          metrics,
          [
            `Last rebalanced ${account.lastRebalance}`,
            account.modelId ? `Model: ${account.modelId}` : 'No model assigned',
          ],
        ))
      }
    }

    if (screenType === 'household_detail' && entityId) {
      const hh = households.find((h) => h.id === entityId)
      if (hh) {
        const hhAccounts = accounts.filter((a) => hh.accountIds.includes(a.id))
        return HttpResponse.json(makeBriefing(
          hh.name,
          'household',
          [
            { label: 'Total AUM', value: formatAUM(hh.totalAUM) },
            { label: 'Managed', value: formatAUM(hh.managedAUM) },
            { label: 'Held-Away', value: formatAUM(hh.heldAwayAUM) },
            { label: 'Members', value: String(hh.members.length) },
            { label: 'Accounts', value: String(hhAccounts.length) },
          ],
          [
            `Primary contact: ${hh.members.find((m) => m.clientId === hh.primaryContactId)?.name ?? 'N/A'}`,
            `Segment: ${hh.segment}`,
          ],
        ))
      }
    }

    if (screenType === 'trading') {
      return HttpResponse.json(makeBriefing(
        'Trading Desk',
        'trading',
        [
          { label: 'Book AUM', value: formatAUM(computeTotalAUM()) },
          { label: 'Open Orders', value: '3' },
          { label: "Today's Trades", value: '7' },
          { label: 'Wash Sale Restricted', value: '2 securities' },
        ],
        [
          'VIX at 14.2 — low volatility environment',
          '2 limit orders approaching trigger price',
        ],
      ))
    }

    if (screenType === 'portfolios') {
      return HttpResponse.json(makeBriefing(
        'Portfolio Overview',
        'portfolio',
        [
          { label: 'Total AUM', value: formatAUM(computeTotalAUM()) },
          { label: 'Accounts', value: String(accounts.length) },
          { label: 'Households', value: String(households.length) },
        ],
        [
          `${accounts.filter((a) => a.isUMA).length} UMA accounts`,
          `${accounts.filter((a) => a.status === 'active').length} active accounts`,
        ],
      ))
    }

    if (screenType === 'actions') {
      const activeNBAs = nbas.filter((n) => !n.dismissed)
      const criticalCount = activeNBAs.filter((n) => n.priority === 'critical').length
      const highCount = activeNBAs.filter((n) => n.priority === 'high').length
      const urgentCount = activeNBAs.filter((n) => n.scoring.urgency > 80).length
      return HttpResponse.json(makeBriefing(
        'Actions Overview',
        'actions',
        [
          { label: 'Pending Actions', value: String(activeNBAs.length) },
          { label: 'Critical', value: String(criticalCount) },
          { label: 'High Priority', value: String(highCount) },
          { label: 'Time-Sensitive', value: String(urgentCount) },
        ],
        [
          `${criticalCount + highCount} actions require prompt attention`,
          'Acceptance rate trending at 72% this month',
        ],
      ))
    }

    if (screenType === 'engage') {
      return HttpResponse.json(makeBriefing(
        'Engage Overview',
        'engage',
        [
          { label: 'Recent Comms', value: '17' },
          { label: 'Active Campaigns', value: '1' },
          { label: 'Scheduled', value: '2' },
          { label: 'Avg Open Rate', value: '68%' },
        ],
        [
          '3 AI-generated emails sent this week',
          'RMD Reminder campaign completed with 82% open rate',
        ],
      ))
    }

    if (screenType === 'households') {
      return HttpResponse.json(makeBriefing(
        'Households Overview',
        'households',
        [
          { label: 'Households', value: String(households.length) },
          { label: 'Total AUM', value: formatAUM(households.reduce((s, h) => s + h.totalAUM, 0)) },
          { label: 'Avg Members', value: (households.reduce((s, h) => s + h.members.length, 0) / households.length).toFixed(1) },
        ],
        [
          `${households.filter((h) => h.segment === 'platinum').length} platinum households`,
          'Asset location optimization available for 4 households',
        ],
      ))
    }

    if (screenType === 'dashboard') {
      return HttpResponse.json(makeBriefing(
        'Practice Summary',
        'dashboard',
        [
          { label: 'AUM', value: formatAUM(computeTotalAUM()) },
          { label: 'Clients', value: String(clients.length) },
          { label: 'Households', value: String(households.length) },
          { label: 'Accounts', value: String(accounts.length) },
        ],
        [],
      ))
    }

    return HttpResponse.json(null)
  }),

  http.get('/api/ai/insights', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType') ?? 'dashboard'
    const entityId = url.searchParams.get('entityId')

    const insights: AIInsight[] = []

    if (screenType === 'dashboard') {
      const activeNBAs = nbas.filter((n) => !n.dismissed)
      const criticalCount = activeNBAs.filter((n) => n.priority === 'critical').length
      const urgentCount = activeNBAs.filter((n) => n.scoring.urgency > 80).length

      insights.push({
        id: 'dash-1',
        severity: 'info',
        title: 'Portfolio Health Summary',
        body: `Managing ${formatAUM(computeTotalAUM())} across ${accounts.length} accounts. ${activeNBAs.length} pending actions identified.`,
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

    if (screenType === 'account_detail' && entityId) {
      const account = accounts.find((a) => a.id === entityId)
      if (account) {
        insights.push({
          id: `acc-${entityId}-1`,
          severity: 'warning',
          title: 'Position Concentration Alert',
          body: `This account has a position exceeding the 5% single-stock IPS limit. Review and consider a phased reduction plan.`,
          metric: { label: 'Largest position weight', value: '8.2%' },
          actionLabel: 'View Concentration',
          actionAI: `Analyze concentration risk in ${account.name} and suggest trades to reduce single-stock exposure`,
        })
        insights.push({
          id: `acc-${entityId}-2`,
          severity: 'opportunity',
          title: 'Tax-Loss Harvesting Opportunity',
          body: 'Short-term losses available in 3 positions could offset recent gains. Wash sale window clear for all candidates.',
          metric: { label: 'Harvestable losses', value: '$12,400' },
          actionLabel: 'Review Harvest',
          actionRoute: `/portfolios/accounts/${entityId}/tax`,
        })
      }
    }

    if (screenType === 'household_detail' && entityId) {
      const hh = households.find((h) => h.id === entityId)
      if (hh) {
        insights.push({
          id: `hh-${entityId}-1`,
          severity: 'opportunity',
          title: 'Asset Location Optimization',
          body: 'Municipal bonds in the taxable account could swap with corporate bonds in the IRA for better after-tax yield.',
          metric: { label: 'After-tax yield improvement', value: '+0.3%' },
          actionLabel: 'Generate Swap Proposal',
          actionAI: `Generate an asset location optimization proposal for the ${hh.name} household`,
        })
        insights.push({
          id: `hh-${entityId}-2`,
          severity: 'info',
          title: 'Household Snapshot',
          body: `${hh.members.length} members, ${hh.accountIds.length} accounts. Aggregate allocation within IPS bands. Next scheduled review in 45 days.`,
        })
      }
    }

    if (screenType === 'actions') {
      const activeNBAs = nbas.filter((n) => !n.dismissed)
      const criticalCount = activeNBAs.filter((n) => n.priority === 'critical').length
      insights.push({
        id: 'act-1',
        severity: 'info',
        title: 'Action Queue Summary',
        body: `${activeNBAs.length} pending actions across ${new Set(activeNBAs.map((n) => n.category)).size} categories. ${criticalCount} marked critical.`,
        metric: { label: 'Batch opportunities', value: '3 groups' },
      })
      if (criticalCount > 0) {
        insights.push({
          id: 'act-2',
          severity: 'warning',
          title: 'Compliance Actions Approaching Deadline',
          body: 'Several compliance-related actions have hard regulatory deadlines. Prioritize these to avoid escalation.',
          actionLabel: 'Filter Critical',
          actionAI: 'Show me all critical priority actions with upcoming deadlines',
        })
      }
    }

    if (screenType === 'engage') {
      insights.push({
        id: 'eng-1',
        severity: 'opportunity',
        title: 'Campaign Performance Highlight',
        body: 'The RMD Reminder Wave achieved 82% open rate — significantly above the 68% average. Consider replicating this approach for upcoming tax-related outreach.',
        metric: { label: 'Best performing channel', value: 'Email + SMS' },
      })
      insights.push({
        id: 'eng-2',
        severity: 'info',
        title: 'Content Calendar Gap',
        body: 'No social media posts scheduled for the next 7 days. 3 AI-drafted posts are pending compliance review.',
        actionLabel: 'Review Pending Posts',
        actionAI: 'Show me all social media content pending compliance approval',
      })
    }

    if (screenType === 'trading') {
      insights.push({
        id: 'trade-1',
        severity: 'info',
        title: 'Market Conditions',
        body: 'S&P 500 +0.4% today, VIX 14.2 (low vol). Treasury yields stable. No significant earnings announcements affecting your book positions.',
        metric: { label: 'Book beta-adjusted exposure', value: '1.02x' },
      })
      insights.push({
        id: 'trade-2',
        severity: 'warning',
        title: 'Wash Sale Window Active',
        body: '2 securities (VXUS, EFA) have active wash sale restrictions through March 15. Any buy orders in these or substantially identical securities will trigger wash sale rules.',
        actionLabel: 'View Restricted Securities',
        actionAI: 'Show me all securities with active wash sale restrictions and their expiration dates',
      })
    }

    return HttpResponse.json(insights)
  }),

  http.get('/api/ai/templates', ({ request }) => {
    const url = new URL(request.url)
    const screenType = url.searchParams.get('screenType')

    const screenCategoryMap: Record<string, ActionTemplate['category'][]> = {
      dashboard: ['portfolio', 'communication', 'planning'],
      actions: ['portfolio', 'compliance', 'communication'],
      client_detail: ['communication', 'planning', 'compliance'],
      account_detail: ['portfolio', 'trading', 'compliance'],
      household_detail: ['portfolio', 'planning', 'communication'],
      households: ['portfolio', 'planning'],
      portfolios: ['portfolio', 'trading'],
      trading: ['trading', 'portfolio'],
      engage: ['communication', 'planning'],
      workflows: ['compliance', 'communication'],
    }

    const allowedCategories = screenType ? screenCategoryMap[screenType] : undefined
    const filtered = allowedCategories
      ? actionTemplates.filter((t) => allowedCategories.includes(t.category))
      : actionTemplates

    return HttpResponse.json(filtered)
  }),

  http.post('/api/ai/templates/:templateId/execute', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    await delay(500)

    const template = actionTemplates.find((t) => t.id === params.templateId)
    const templateName = template?.name ?? 'Action'

    return HttpResponse.json({
      success: true,
      message: `${templateName} executed successfully.`,
      details: `Processed with parameters: ${Object.entries(body).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      executionRoute: template?.executionRoute,
    })
  }),
]
