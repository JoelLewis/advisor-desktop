import { http, HttpResponse, delay } from 'msw'
import { nbas } from '../data/nbas'
import type { BatchActionRequest, NBAActionTemplate, NBAEffectivenessMetrics, NBACategory } from '@/types/nba'
import { notFound } from './utils'

export const nbaHandlers = [
  // GET /api/nba/effectiveness — NBA system effectiveness metrics
  http.get('/api/nba/effectiveness', () => {
    const categories: NBACategory[] = ['rebalancing', 'tax_management', 'planning', 'risk', 'client_service', 'compliance', 'growth']
    const byCategory = categories.map((category) => {
      const catNbas = nbas.filter((n) => n.category === category)
      const total = catNbas.length + Math.floor(Math.random() * 5 + 3) // simulate historical volume
      const accepted = Math.floor(total * (0.55 + Math.random() * 0.3))
      const dismissed = Math.floor((total - accepted) * 0.6)
      const snoozed = total - accepted - dismissed
      return {
        category,
        total,
        accepted,
        dismissed,
        snoozed,
        avgTimeToAction: +(4 + Math.random() * 44).toFixed(1),
        revenueImpact: catNbas.reduce((sum, n) => sum + n.estimatedImpact, 0) * (0.3 + Math.random() * 0.4),
      }
    })

    const totals = byCategory.reduce(
      (acc, c) => ({
        total: acc.total + c.total,
        accepted: acc.accepted + c.accepted,
        dismissed: acc.dismissed + c.dismissed,
        revenue: acc.revenue + c.revenueImpact,
      }),
      { total: 0, accepted: 0, dismissed: 0, revenue: 0 },
    )

    const trend = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'].map((month, i) => {
      const generated = 28 + i * 3 + Math.floor(Math.random() * 5)
      const accepted = Math.floor(generated * (0.5 + i * 0.04))
      return {
        month,
        generated,
        accepted,
        dismissed: generated - accepted - Math.floor(Math.random() * 3),
        completionRate: +(accepted / generated * 100).toFixed(1),
        revenueImpact: 40_000 + i * 12_000 + Math.floor(Math.random() * 10_000),
      }
    })

    const metrics: NBAEffectivenessMetrics = {
      totalActions: totals.total,
      acceptanceRate: +(totals.accepted / totals.total * 100).toFixed(1),
      avgTimeToAction: +byCategory.reduce((s, c) => s + c.avgTimeToAction, 0) / byCategory.length,
      completionRate: +(totals.accepted / totals.total * 100 * 0.92).toFixed(1),
      complianceCompletionRate: 97.3,
      estimatedRevenueImpact: Math.round(totals.revenue),
      byCategory,
      trend,
    }

    return HttpResponse.json(metrics)
  }),

  http.get('/api/nba', ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const priority = url.searchParams.get('priority')
    const dismissed = url.searchParams.get('dismissed')

    let filtered = [...nbas]
    if (category) filtered = filtered.filter((n) => n.category === category)
    if (priority) filtered = filtered.filter((n) => n.priority === priority)
    if (dismissed !== null) {
      filtered = filtered.filter((n) => n.dismissed === (dismissed === 'true'))
    }

    // Sort by composite score descending
    filtered.sort((a, b) => b.scoring.composite - a.scoring.composite)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/nba/groups', () => {
    // Build groups from NBAs that have groupIds
    const groupMap = new Map<string, { id: string; title: string; category: string; clientIds: string[] }>()
    for (const nba of nbas) {
      if (nba.groupId && !groupMap.has(nba.groupId)) {
        groupMap.set(nba.groupId, {
          id: nba.groupId,
          title: nba.title,
          category: nba.category,
          clientIds: nba.clients.map((c) => c.id),
        })
      }
    }
    const groups = [...groupMap.values()].map((g) => ({ ...g, count: g.clientIds.length }))
    return HttpResponse.json(groups)
  }),

  http.post('/api/nba/:id/dismiss', async ({ params, request }) => {
    const nba = nbas.find((n) => n.id === params.id)
    if (!nba) return notFound()

    // Compliance enforcement: non-dismissible without supervisor override
    if (nba.complianceInfo?.nonDismissible && !nba.complianceInfo.supervisorOverride) {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>
      if (body.supervisorOverride) {
        nba.complianceInfo.supervisorOverride = true
        nba.complianceInfo.auditTrail.push({
          action: 'override_granted', timestamp: new Date().toISOString(),
          actor: 'supervisor-override', note: body.reason as string ?? 'Supervisor override',
        })
        nba.dismissed = true
        nba.complianceInfo.auditTrail.push({
          action: 'dismissed', timestamp: new Date().toISOString(),
          actor: 'advisor', note: 'Dismissed with supervisor override',
        })
        return new HttpResponse(null, { status: 204 })
      }
      return HttpResponse.json(
        { error: 'compliance_non_dismissible', message: 'Compliance actions require supervisor override to dismiss.' },
        { status: 403 },
      )
    }

    nba.dismissed = true
    if (nba.complianceInfo) {
      nba.complianceInfo.auditTrail.push({
        action: 'dismissed', timestamp: new Date().toISOString(), actor: 'advisor',
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/nba/:id/snooze', ({ params }) => {
    const nba = nbas.find((n) => n.id === params.id)
    if (nba?.complianceInfo) {
      nba.complianceInfo.auditTrail.push({
        action: 'snoozed', timestamp: new Date().toISOString(), actor: 'advisor',
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /api/nba/:id/templates — AI-generated action templates
  http.get('/api/nba/:id/templates', async ({ params }) => {
    await delay(500)
    const nba = nbas.find((n) => n.id === params.id)
    if (!nba) return notFound()

    const clientNames = nba.clients.map((c) => c.name).join(', ')
    const firstClient = nba.clients[0]?.name ?? 'the client'
    const impact = nba.estimatedImpact > 0
      ? `$${(nba.estimatedImpact / 1000).toFixed(0)}K`
      : null

    const templatesByCategory: Record<string, () => NBAActionTemplate> = {
      rebalancing: () => ({
        talkingPoints: [
          `Portfolio drift has exceeded the ${nba.trigger.value} threshold for ${clientNames}`,
          'Rebalancing now captures the recent equity rally gains and reduces concentration risk',
          impact ? `Estimated portfolio risk reduction impact: ${impact}` : 'Restoring target allocation improves risk-adjusted returns',
          'Tax-loss harvesting can be layered into the rebalance to offset realized gains',
          'Recommend batch execution to minimize market timing differences across accounts',
        ],
        emailDraft: {
          subject: `Portfolio Rebalancing Recommendation — ${firstClient}`,
          body: `Dear ${firstClient},\n\nI'm writing to let you know that your portfolio has drifted from its target allocation due to recent market movements. Specifically, ${nba.trigger.value}.\n\nI recommend we rebalance your portfolio to restore your target allocation. This helps maintain the risk level we agreed upon in your Investment Policy Statement while taking advantage of recent market gains.\n\n${impact ? `The estimated impact of this rebalancing is ${impact}.` : ''}\n\nI'd like to schedule a brief call to walk you through the proposed trades. Would you have 15 minutes this week?\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Drift analysis detected ${nba.trigger.value} deviation from target model across ${nba.clients.length} account(s). Primary driver: equity outperformance shifting allocation above policy band. Recommended action: systematic rebalancing with tax-aware lot selection. Risk reduction: restores portfolio to within policy tolerances.`,
        generatedAt: new Date().toISOString(),
      }),
      tax_management: () => ({
        talkingPoints: [
          `Tax-loss harvesting opportunity identified: ${nba.trigger.value}`,
          impact ? `Estimated tax savings at 37% bracket: ${impact}` : 'Harvesting losses offsets realized gains from earlier in the year',
          'Replacement securities maintain sector exposure while observing wash sale rules',
          'The 30-day wash sale window must be tracked across all accounts for the same tax ID',
          'Document the tax rationale for compliance records before executing',
        ],
        emailDraft: {
          subject: `Tax Management Opportunity — ${firstClient}`,
          body: `Dear ${firstClient},\n\nOur monitoring systems have identified a tax management opportunity in your portfolio. ${nba.description}\n\nBy harvesting these losses now, we can offset realized gains and potentially reduce your tax liability for the year${impact ? ` by approximately ${impact}` : ''}.\n\nWe'll replace the sold positions with similar investments to maintain your portfolio's risk profile while observing wash sale rules.\n\nWould you like to discuss this strategy? I'm available for a brief call at your convenience.\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Unrealized loss detected: ${nba.trigger.value}. Strategy: sell loss position, replace with correlated ETF to maintain sector exposure. Wash sale monitoring across all client accounts required. ${impact ? `Estimated tax benefit: ${impact} at top marginal rate.` : ''} Recommendation: execute before additional price recovery narrows the harvesting window.`,
        generatedAt: new Date().toISOString(),
      }),
      planning: () => ({
        talkingPoints: [
          `Planning trigger: ${nba.trigger.condition.replace(/_/g, ' ')} — ${nba.trigger.value}`,
          nba.description,
          'Review the financial plan assumptions and update projections accordingly',
          'Discuss any changes in goals, timeline, or risk tolerance during the review',
          'Document the planning discussion and any strategy changes for compliance',
        ],
        emailDraft: {
          subject: `Financial Planning Update — ${firstClient}`,
          body: `Dear ${firstClient},\n\nI wanted to reach out regarding an important planning item. ${nba.description}\n\nI'd like to schedule a meeting to review your financial plan, update our projections, and discuss the best path forward.\n\nPlease let me know a few times that work for you this week or next, and I'll send a calendar invitation.\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Planning event: ${nba.trigger.value}. ${nba.suggestedAction}. Impact on long-term plan should be modeled with updated assumptions. Client engagement recommended within 2 weeks.`,
        generatedAt: new Date().toISOString(),
      }),
      risk: () => ({
        talkingPoints: [
          `Risk threshold breached: ${nba.trigger.value}`,
          nba.description,
          'The Investment Policy Statement defines limits that this position exceeds',
          'Present a phased reduction plan to minimize market impact and tax consequences',
          'Consider hedging alternatives (protective puts, collars) if immediate sale is undesirable',
        ],
        emailDraft: {
          subject: `Portfolio Risk Review — ${firstClient}`,
          body: `Dear ${firstClient},\n\nI'm reaching out regarding a risk management item in your portfolio. ${nba.description}\n\nI'd like to review the situation with you and discuss strategies to address this, including systematic diversification options that consider tax implications.\n\nCould we schedule 30 minutes this week to discuss?\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Risk event: ${nba.trigger.value}. ${nba.suggestedAction}. IPS compliance review required. Options: systematic reduction over 3-6 months, hedging overlay, or IPS amendment with documented rationale.`,
        generatedAt: new Date().toISOString(),
      }),
      client_service: () => ({
        talkingPoints: [
          `Service trigger: ${nba.trigger.condition.replace(/_/g, ' ')}`,
          nba.description,
          'Personal outreach strengthens the advisor-client relationship',
          'Use this touchpoint to identify any unspoken needs or concerns',
          'Update CRM with interaction notes and any follow-up items',
        ],
        emailDraft: {
          subject: nba.trigger.condition === 'birthday_approaching'
            ? `Happy Birthday, ${firstClient}!`
            : `Checking In — ${firstClient}`,
          body: nba.trigger.condition === 'birthday_approaching'
            ? `Dear ${firstClient},\n\nWishing you a wonderful birthday! I hope you have a fantastic celebration.\n\nAs always, I'm here if you'd like to discuss anything about your financial plan or portfolio. Looking forward to connecting soon.\n\nWarm regards,\nYour Advisor`
            : `Dear ${firstClient},\n\nI wanted to reach out to check in. ${nba.description}\n\nI'd love to schedule some time to catch up and ensure everything is on track with your financial goals.\n\nPlease let me know if you have any questions or if there's anything I can help with.\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Client service action: ${nba.suggestedAction}. ${nba.trigger.value}. Proactive outreach supports retention and satisfaction goals.`,
        generatedAt: new Date().toISOString(),
      }),
      compliance: () => ({
        talkingPoints: [
          `Compliance requirement: ${nba.trigger.condition.replace(/_/g, ' ')}`,
          nba.description,
          'This action is mandated by firm policy or regulatory requirements',
          'Document all steps taken and maintain an audit trail',
          'Escalate to compliance officer if the deadline cannot be met',
        ],
        emailDraft: {
          subject: `Important: Account Update Required — ${firstClient}`,
          body: `Dear ${firstClient},\n\n${nba.description}\n\nTo ensure your account remains in good standing, we need to complete this process promptly. Please let me know a convenient time for a brief call, or reply with any questions.\n\nThank you for your prompt attention to this matter.\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Compliance action required: ${nba.suggestedAction}. Trigger: ${nba.trigger.value}. Deadline adherence is mandatory. Document completion for audit trail.`,
        generatedAt: new Date().toISOString(),
      }),
      growth: () => ({
        talkingPoints: [
          `Growth opportunity: ${nba.trigger.condition.replace(/_/g, ' ')}`,
          nba.description,
          impact ? `Estimated revenue impact: ${impact}/year` : 'This opportunity supports practice growth goals',
          'Personalize the outreach based on the referral source or prospect profile',
          'Follow up within 5 business days to maintain momentum',
        ],
        emailDraft: {
          subject: `Introduction — ${firstClient}`,
          body: `Dear ${firstClient},\n\n${nba.trigger.condition === 'referral_mention' ? 'Thank you for the kind referral! ' : ''}${nba.description}\n\nI'd welcome the opportunity to discuss how we might help. Could we schedule a brief introductory conversation?\n\nBest regards,\nYour Advisor`,
        },
        analysisSummary: `Growth opportunity: ${nba.suggestedAction}. ${nba.trigger.value}. ${impact ? `Estimated annual revenue impact: ${impact}.` : ''} Timely follow-up is critical for conversion.`,
        generatedAt: new Date().toISOString(),
      }),
    }

    const generator = templatesByCategory[nba.category] ?? templatesByCategory['client_service']!
    return HttpResponse.json(generator())
  }),

  // POST /api/nba/batch — execute batch action on grouped NBAs
  http.post('/api/nba/batch', async ({ request }) => {
    const body = (await request.json()) as BatchActionRequest
    await delay(600)

    // Mark selected NBAs as dismissed
    let processed = 0
    for (const nbaId of body.nbaIds) {
      const nba = nbas.find((n) => n.id === nbaId)
      if (nba) {
        nba.dismissed = true
        processed++
      }
    }

    return HttpResponse.json({
      groupId: body.groupId,
      processed,
      failed: body.nbaIds.length - processed,
      message: `Batch action completed: ${processed} items processed for ${body.action}`,
    })
  }),
]
