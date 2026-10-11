import { http, HttpResponse, delay } from 'msw'
import { getAIResponse, suggestedPrompts, actionTemplates } from '../data/ai'
import { clients } from '../data/clients'
import { households } from '../data/households'
import { accounts } from '../data/accounts'
import { nbas } from '../data/nbas'
import { customPrompts } from './settings'
import type { ChatMessage, ActionConfirmation, DocumentGeneration, ContextBriefingData, BriefingMetric, AIInsight, ActionTemplate, SuggestedPrompt } from '@/types/ai'
import type { CustomPromptCategory } from '@/types/settings'
import type { TaxLot } from '@/types/portfolio'
import { formatAUM, computeTotalAUM } from './utils'
import { now, MOCK_TODAY_ISO } from '@/lib/clock'
import { computeMetrics, computeDriftForAccount } from './pms'
import { generateTaxLots } from './custodian'
import { openWashSaleWindows } from '../data/realised-sales'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { convertToBase } from '@/lib/currency'
import { formatDate } from '@/lib/utils'
import { estimatedTaxBenefit, isHarvestable } from '@/lib/tax-rules'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { getPositionsForAccount } from '../data/positions'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import { orders } from './oms'

/**
 * D22 · tax-loss-harvesting — the book-wide harvestable lot set, walked once here so the dashboard
 * insight's loss figure, its estimated benefit and its account count are three views of the same
 * set rather than three independently hand-typed numbers (previously $47K / $17,400 / 6 accounts,
 * none of which the tax page — which computes from the real lots — agreed with).
 *
 * Currency-aware end to end: `isHarvestable` gates each lot against the USD threshold correctly,
 * and — fix round 1, Important #1 — `gainLoss` is converted to USD at map time here too, the same
 * shape `deriveBookAUM` uses in `pms.ts`. The gate alone being currency-aware was not enough: the
 * lots that pass it still carried native-currency numbers, so acc-043's EUR and acc-044's CHF
 * losses were being summed as if they were dollars and printed with a USD symbol.
 */
function harvestableLotsAcrossBook(): (TaxLot & { accountId: string })[] {
  return accounts
    .filter((account) => isTaxableAccount(account.taxTreatment))
    .flatMap((account) => {
      const currency = account.baseCurrency ?? 'USD'
      return generateTaxLots(account.id, account.totalValue)
        .filter((lot) => isHarvestable(lot.gainLoss, currency, FX_RATES_USD_BASE))
        .map((lot) => ({
          ...lot,
          accountId: account.id,
          gainLoss: convertToBase(lot.gainLoss, currency, FX_RATES_USD_BASE),
        }))
    })
}

function makeBriefing(
  title: string,
  entityType: string,
  metrics: BriefingMetric[],
  highlights: string[],
): ContextBriefingData {
  return { title, entityType, metrics, highlights, asOf: new Date().toISOString() }
}

/**
 * §9.5 · one book-wide "which account is drifted" fact, read by the drift-count claim in the
 * `trading:` chat response and (via `needsRebalance`) the same predicate the rebalance queue and
 * `oms.ts`'s trade generator gate on — so the chat answer can never disagree with the surface a
 * click-through would land on.
 */
function driftedAccountsCount(): number {
  return accounts.filter((a) => computeDriftForAccount(a).needsRebalance).length
}

/**
 * §9.5 · the account carrying the single largest harvestable loss across the book, walked from
 * the same `harvestableLotsAcrossBook()` set the dashboard's "Tax-loss harvesting window" insight
 * uses — so "the largest opportunity is in account X" and the total figure quoted alongside it
 * are two views of one pass over the real lots, not an independently hand-typed household name.
 */
function topHarvestableAccount(harvestable: ReturnType<typeof harvestableLotsAcrossBook>): { accountId: string; accountName: string; amount: number } | null {
  const byAccount = new Map<string, number>()
  for (const lot of harvestable) {
    byAccount.set(lot.accountId, (byAccount.get(lot.accountId) ?? 0) + Math.abs(lot.gainLoss))
  }
  let best: { accountId: string; amount: number } | null = null
  for (const [accountId, amount] of byAccount) {
    if (!best || amount > best.amount) best = { accountId, amount }
  }
  if (!best) return null
  const account = accounts.find((a) => a.id === best!.accountId)
  return { accountId: best.accountId, accountName: account?.name ?? best.accountId, amount: best.amount }
}

/** "March 15, 2026" — long-month style, matching `proposals.ts`'s date prose. */
function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

/**
 * §9.5 · the static response bodies in `data/ai.ts` carry `{{TOKEN}}` placeholders rather than
 * hand-typed figures. Filling them in here, at request time, from the canonical selectors above
 * means the number that lands in `content` and the number that lands in its `citations` are
 * always the same value — derived once (see the `facts` map below), used everywhere the token
 * appears, rather than two independently hand-typed numbers that happen to agree today.
 */
function interpolateFacts<T>(value: T, facts: Record<string, string>): T {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => facts[key] ?? match) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => interpolateFacts(v, facts)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = interpolateFacts(v, facts)
    return out as T
  }
  return value
}

export const aiHandlers = [
  http.post('/api/ai/message', async ({ request }) => {
    const body = (await request.json()) as {
      message: string
      context: { screenType: string; entityType?: string; entityId?: string; entityName?: string }
    }

    await delay(600)

    const template = getAIResponse(body.message, body.context.screenType, body.context.entityType)

    // §9.5 · one fact, one place — every figure below is read from the same selector the screen
    // it cites would show, so a token that appears in both `content` and a `citations[].text`
    // (e.g. `{{DRIFT_COUNT}}`) always resolves to the identical value.
    const washWindows = openWashSaleWindows(MOCK_TODAY_ISO)
    const sortedWashSaleEnds = washWindows.map((w) => w.end).sort()
    const latestWashSaleEnd = sortedWashSaleEnds[sortedWashSaleEnds.length - 1]
    const pendingOrders = orders.filter((o) => o.status === 'pending')
    const harvestable = harvestableLotsAcrossBook()
    const topHarvest = topHarvestableAccount(harvestable)

    const facts: Record<string, string> = {
      OPEN_ORDERS_COUNT: String(pendingOrders.length),
      LIMIT_ORDERS_COUNT: String(pendingOrders.filter((o) => o.orderType === 'limit').length),
      MARKET_ORDERS_COUNT: String(pendingOrders.filter((o) => o.orderType === 'market').length),
      WASH_SALE_COUNT: String(new Set(washWindows.map((w) => w.accountId)).size),
      WASH_SALE_DATE: latestWashSaleEnd ? formatLongDate(latestWashSaleEnd) : 'no open windows',
      DRIFT_COUNT: String(driftedAccountsCount()),
      TLH_TOTAL: formatAUM(harvestable.reduce((s, l) => s + Math.abs(l.gainLoss), 0)),
      TLH_ACCOUNT_COUNT: String(new Set(harvestable.map((l) => l.accountId)).size),
      TOP_HARVEST_ACCOUNT: topHarvest?.accountName ?? 'no account',
      TOP_HARVEST_AMOUNT: topHarvest ? formatAUM(topHarvest.amount) : '$0',
    }

    const filled = interpolateFacts(template, facts)

    const response: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: filled.content,
      timestamp: new Date().toISOString(),
      citations: filled.citations,
      actions: filled.actions,
      documentPreview: filled.documentPreview,
      richCards: filled.richCards,
      tradeSuggestions: filled.tradeSuggestions,
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
      // §9.5 · "Open Orders" and "Trade Restrictions" previously hand-typed 3 and "2 securities" —
      // this briefing sits on the same screen as the chat's wash-sale/open-orders claims, so it
      // now reads the same `orders` list and `openWashSaleWindows` result they do.
      const openOrders = orders.filter((o) => o.status === 'pending')
      const restrictedAccounts = new Set(openWashSaleWindows(MOCK_TODAY_ISO).map((w) => w.accountId)).size
      return HttpResponse.json(makeBriefing(
        'Trading Desk',
        'trading',
        [
          { label: 'Book AUM', value: formatAUM(computeTotalAUM()) },
          { label: 'Open Orders', value: String(openOrders.length) },
          { label: "Today's Trades", value: '7' },
          { label: 'Trade Restrictions', value: `${restrictedAccounts} account${restrictedAccounts === 1 ? '' : 's'}` },
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
      // D21 — the KPI strip and the insight body previously counted NBAs independently
      // (`pendingTasks: 14` in `pms.ts` vs. this handler's own `activeNBAs.length`). Both now
      // read `computeMetrics()`, so "pending actions" is one fact quoted in two places.
      const metrics = computeMetrics()

      insights.push({
        id: 'dash-1',
        severity: 'info',
        title: 'Portfolio health summary',
        // Fix round 1, minor — `metrics.asOf` was added to the interface and populated but never
        // read anywhere, so it was dead. Rendered here rather than removed: it is the one place on
        // the dashboard that dates the figures above it.
        body: `Managing ${formatAUM(metrics.totalAUM)} across ${accounts.length} accounts as of ${formatDate(metrics.asOf)}. ${metrics.pendingTasks} pending actions identified.`,
        metric: {
          label: 'Net inflows this month',
          value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics.netFlowsMTD),
        },
      })
      if (metrics.criticalCount > 0) {
        insights.push({
          id: 'dash-2',
          severity: 'warning',
          title: `${metrics.criticalCount} critical action${metrics.criticalCount > 1 ? 's' : ''} outstanding`,
          // D21 — the headline previously said "2 Critical Actions" while the body said "3
          // time-sensitive items", counting urgency-scored NBAs instead of critical-priority ones.
          // One count, one fact: both read `metrics.criticalCount`.
          body: `${metrics.criticalCount} item${metrics.criticalCount > 1 ? 's' : ''} carrying a deadline across your book. Compliance review and RMD deadlines are the earliest.`,
          actionLabel: 'View critical actions',
          actionAI: 'Show me all critical priority NBAs that need attention today',
        })
      }

      // D22 — one harvestable-loss figure, walked once by `harvestableLotsAcrossBook`, with the
      // benefit computed lot-by-lot at the rate its own holding period earns (PRE-FLIGHT
      // correction 7) rather than a flat 37% that disagreed with the tax page this insight links
      // to — acc-001's five harvestable lots are all long-term, so that page computes 23.8% on
      // exactly those losses.
      const harvestable = harvestableLotsAcrossBook()
      const harvestableLoss = harvestable.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      const harvestableBenefit = harvestable.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
      insights.push({
        id: 'dash-3',
        severity: 'opportunity',
        title: 'Tax-loss harvesting window',
        body: `${formatAUM(harvestableLoss)} in harvestable losses across ${new Set(harvestable.map((l) => l.accountId)).size} client accounts, with ${openWashSaleWindows(MOCK_TODAY_ISO).length} open wash sale windows.`,
        metric: {
          label: 'Estimated tax benefit',
          value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(harvestableBenefit),
        },
        actionLabel: 'Review opportunities',
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
        const daysSinceContact = Math.floor((now().getTime() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
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
        // §9.5 (scope amendment) — this insight pushed a hardcoded '8.2%' weight against an
        // invented "5% single-stock limit" for every account, always. The real single-name limit
        // is `SINGLE_NAME_LIMIT` (10%, security-master.ts) — funds and cash carry their own,
        // higher limits (`concentrationLimitFor`) and are not single-stock concentration risk.
        // Only single-name positions are considered, and only the largest breach (if any) is
        // reported; an account with no breach — e.g. acc-006, whose largest position is a 16.5%
        // SPY allocation, a fund — gets no alert at all.
        const breach = getPositionsForAccount(account.id, account.totalValue)
          .map((p) => ({ ...p, kind: securityKind(p.symbol, p.assetClass), limit: concentrationLimitFor(securityKind(p.symbol, p.assetClass)) }))
          .filter((p) => p.kind === 'single_name' && p.weight > p.limit)
          .sort((a, b) => b.weight - a.weight)[0]
        if (breach) {
          insights.push({
            id: `acc-${entityId}-1`,
            severity: 'warning',
            title: 'Position Concentration Alert',
            body: `${breach.symbol} is ${(breach.weight * 100).toFixed(1)}% of this account, exceeding the ${(breach.limit * 100).toFixed(0)}% single-stock IPS limit. Review and consider a phased reduction plan.`,
            metric: { label: 'Largest position weight', value: `${(breach.weight * 100).toFixed(1)}%` },
            actionLabel: 'View Concentration',
            actionAI: `Analyze concentration risk in ${account.name} and suggest trades to reduce single-stock exposure`,
          })
        }
        // §9.1 (Task 2, review round 2) — this canned insight was pushed for every account with
        // no `taxTreatment` check, hardcoded rather than derived, so the "grep for the shared
        // helper names" sweep in this file's `harvestableLotsAcrossBook` never found it. Confirmed
        // live on acc-003 (Traditional IRA) and acc-014 (529, tax-free). Same predicate as
        // everywhere else this gate is applied.
        if (isTaxableAccount(account.taxTreatment)) {
          // §9.5 (coordinator follow-up) — the gate above was fixed in Task 2, but the body was
          // not: every taxable account saw the same '3 positions', the same '$12,400', and an
          // unconditional "wash sale window clear for all candidates" — the most-visited AI
          // surface in the product stating figures it couldn't support. Filters the same
          // book-wide harvestable-lot walk the dashboard's D22 insight and the chat response above
          // both read (`harvestableLotsAcrossBook`) down to this account, and reads
          // `TaxLot.washSaleRestricted` — itself derived from `openWashSaleWindows` inside
          // `generateTaxLots` (custodian.ts) — rather than asserting the window is clear
          // unconditionally. No harvestable losses means no insight, not a $0 one.
          const accountHarvestable = harvestableLotsAcrossBook().filter((l) => l.accountId === entityId)
          if (accountHarvestable.length > 0) {
            const positionCount = new Set(accountHarvestable.map((l) => l.positionId)).size
            const loss = accountHarvestable.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
            const hasRestricted = accountHarvestable.some((l) => l.washSaleRestricted)
            insights.push({
              id: `acc-${entityId}-2`,
              severity: 'opportunity',
              title: 'Tax-Loss Harvesting Opportunity',
              body: `${positionCount} position${positionCount === 1 ? '' : 's'} with harvestable losses could offset recent gains. ${
                hasRestricted
                  ? 'At least one candidate sits inside an active wash-sale window — confirm clearance before repurchasing the same or a substantially identical security.'
                  : 'Wash sale window clear for all candidates.'
              }`,
              metric: {
                label: 'Harvestable losses',
                value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(loss),
              },
              actionLabel: 'Review Harvest',
              actionRoute: `/portfolios/accounts/${entityId}/tax`,
            })
          }
        }
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
      // D21 — this screen used to recount active/critical NBAs itself rather than reading
      // `computeMetrics()`, the single place `pendingTasks`/`criticalCount` are derived.
      const metrics = computeMetrics()
      const activeNBAs = nbas.filter((n) => !n.dismissed)
      insights.push({
        id: 'act-1',
        severity: 'info',
        title: 'Action queue summary',
        body: `${metrics.pendingTasks} pending actions across ${new Set(activeNBAs.map((n) => n.category)).size} categories. ${metrics.criticalCount} marked critical.`,
        metric: { label: 'Batch opportunities', value: '3 groups' },
      })
      if (metrics.criticalCount > 0) {
        insights.push({
          id: 'act-2',
          severity: 'warning',
          title: 'Compliance actions approaching deadline',
          body: 'Several compliance-related actions have hard regulatory deadlines. Prioritize these to avoid escalation.',
          actionLabel: 'Filter critical',
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
      // §9.5 · previously named a fabricated "VXUS — Johnson IRA" window and an unverifiable
      // "EFA — compliance hold." Read from `openWashSaleWindows` instead — the same selector the
      // chat's trading-desk answer and the wash-sale calendar citation read — so this insight
      // can't name a restriction the account's own screen doesn't show.
      const activeWashWindows = openWashSaleWindows(MOCK_TODAY_ISO)
      if (activeWashWindows.length > 0) {
        const detail = activeWashWindows
          .map((w) => `${w.symbol} in ${accounts.find((a) => a.id === w.accountId)?.name ?? w.accountId} (through ${formatDate(w.end)})`)
          .join('; ')
        insights.push({
          id: 'trade-2',
          severity: 'warning',
          title: 'Trade Restrictions Active',
          body: `${activeWashWindows.length} account${activeWashWindows.length === 1 ? '' : 's'} carrying an active wash-sale restriction: ${detail}. Check restrictions before placing orders in these or substantially identical securities.`,
          actionLabel: 'View Restricted Securities',
          actionAI: 'Show me all securities with active trade restrictions and their details',
        })
      }
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
