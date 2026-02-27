import type { ChatMessage, SuggestedPrompt, ActionConfirmation, DocumentPreview, ActionTemplate, TradeSuggestion } from '@/types/ai'
import type { RichCardData } from '@/types/rich-card'

// ── Context-aware AI responses keyed by screenType + entityType ──

type ResponseTemplate = {
  content: string
  citations?: ChatMessage['citations']
  actions?: ActionConfirmation[]
  documentPreview?: DocumentPreview
  richCards?: RichCardData[]
  tradeSuggestions?: TradeSuggestion[]
}

const responsesByContext: Record<string, ResponseTemplate[]> = {
  'dashboard:': [
    {
      content:
        'Good morning. Your book has $847M AUM across 42 households. Three items need attention today: the Johnson household is 4.2% over-allocated to US equity, Marcus Thompson\'s RMD deadline is in 6 days, and the Patel beneficiary update is awaiting signatures.',
      citations: [
        { source: 'PMS — Drift Report', text: 'Johnson household drift: 4.2% US equity overweight vs IPS target' },
        { source: 'Compliance Calendar', text: 'Thompson RMD deadline: March 3, 2026' },
      ],
      actions: [
        { id: 'act-001', action: 'Review Johnson Rebalance', description: 'Generate rebalance proposal for Johnson household to reduce US equity overweight', impact: 'Affects $12.4M across 3 accounts', status: 'pending' },
      ],
    },
    {
      content:
        'Your portfolio-weighted Sharpe ratio is 1.14, which is above the 0.95 peer median. However, 6 accounts have drifted beyond their IPS thresholds this month — up from 2 last month. I recommend prioritizing the rebalancing queue.',
      citations: [
        { source: 'Analytics — Book Performance', text: 'Book Sharpe: 1.14 vs peer median 0.95' },
        { source: 'PMS — Drift Summary', text: '6 accounts beyond IPS drift threshold' },
      ],
    },
  ],
  'client_detail:client': [
    {
      content:
        'This client\'s portfolio is performing well with a 12.3% TWR YTD, outperforming the blended benchmark by 1.8%. I notice their fixed income allocation has drifted 2.1% below target — likely due to strong equity performance pulling weights up. A small rebalance would bring them back in line without triggering significant tax events.',
      citations: [
        { source: 'PMS — Performance', text: '12.3% TWR YTD vs 10.5% benchmark' },
        { source: 'PMS — Drift Analysis', text: 'Fixed income underweight: 2.1% below IPS target' },
      ],
      actions: [
        { id: 'act-002', action: 'Generate Rebalance Preview', description: 'Preview trades needed to restore target allocation', impact: 'Estimated 3-5 trades, minimal tax impact', status: 'pending' },
      ],
    },
    {
      content:
        'Based on this client\'s recent life events and financial goals, I\'d recommend reviewing their IPS. They mentioned college planning in their last meeting notes, but their current plan doesn\'t include education funding. I can draft an updated IPS section for your review.',
      citations: [
        { source: 'CRM — Meeting Notes (Feb 10)', text: 'Client mentioned eldest starting college in 2028' },
        { source: 'Planning — Current IPS', text: 'No education funding goal currently defined' },
      ],
      documentPreview: {
        id: 'docprev-001',
        title: 'Updated IPS — Education Funding Section',
        type: 'ips',
        previewText: 'Goal: Fund 4 years of undergraduate education for 2 children. Target: $350,000 in 2028 dollars...',
      },
    },
  ],
  'account_detail:account': [
    {
      content:
        'This account has 23 positions with a concentrated position in AAPL representing 8.2% of the portfolio — above the 5% single-stock limit in the IPS. I recommend a gradual reduction over 3-4 months to manage tax impact. There are also 3 positions with short-term losses that could offset the gains.',
      citations: [
        { source: 'PMS — Position Detail', text: 'AAPL position: 8.2% weight vs 5% IPS limit' },
        { source: 'Tax Lots', text: '3 positions with harvestable short-term losses totaling $12,400' },
      ],
      actions: [
        { id: 'act-003', action: 'Create Concentration Reduction Plan', description: 'Generate a phased liquidation plan for the AAPL overweight', impact: 'Reduce AAPL from 8.2% to 5% over 90 days', status: 'pending' },
        { id: 'act-004', action: 'Preview Tax-Loss Harvest', description: 'Identify optimal tax-loss harvesting opportunities', impact: 'Estimated $12,400 in harvestable losses', status: 'pending' },
      ],
    },
  ],
  'household_detail:household': [
    {
      content:
        'This household has $4.8M across 6 accounts. The aggregate allocation is well-balanced, but I see an opportunity for better tax efficiency: the municipal bonds in the taxable account could be swapped with the corporate bonds in the IRA, improving after-tax yield by approximately 0.3% annually.',
      citations: [
        { source: 'PMS — Household Summary', text: 'Aggregate AUM: $4.8M across 6 accounts' },
        { source: 'Tax Analysis', text: 'Asset location optimization: +0.3% after-tax yield' },
      ],
      actions: [
        { id: 'act-005', action: 'Generate Asset Location Swap', description: 'Create paired trades to optimize tax efficiency across accounts', impact: '+0.3% after-tax yield, ~$14,400/year', status: 'pending' },
      ],
    },
  ],
  'portfolios:': [
    {
      content:
        'Across your book, 6 accounts are currently beyond their drift thresholds. The largest drift is in the Johnson Family Trust at 4.2%, followed by the Martinez Joint Account at 3.8%. I can generate a batch rebalance proposal for all drifted accounts.',
      citations: [
        { source: 'PMS — Drift Summary', text: '6 accounts beyond threshold, avg drift 2.9%' },
      ],
      actions: [
        { id: 'act-006', action: 'Batch Rebalance Preview', description: 'Generate rebalance proposals for all 6 drifted accounts', impact: '~45 trades across 6 accounts', status: 'pending' },
      ],
    },
  ],
  'workflows:': [
    {
      content:
        'You have 5 pending tasks, with 2 overdue. The highest priority is the compliance review for the Anderson account — it\'s been waiting 3 days past its SLA. I can draft the compliance response or escalate it to the compliance team.',
      citations: [
        { source: 'Workflow — My Actions', text: '5 pending, 2 overdue, 1 past SLA' },
      ],
      actions: [
        { id: 'act-007', action: 'Draft Compliance Response', description: 'Generate compliance review response for Anderson account', impact: 'Resolves SLA breach, unblocks account opening', status: 'pending' },
      ],
    },
  ],
  'settings:': [
    {
      content:
        'Your AI assistant settings are configured for balanced automation. Currently, I auto-generate meeting prep notes and flag rebalancing opportunities, but require approval before executing trades or sending client communications. Would you like to adjust these thresholds?',
    },
  ],
  'trading:': [
    {
      content:
        'Your trading desk is ready. You have 3 open orders pending execution and 2 accounts with wash sale restrictions active through March 15. The S&P 500 is up 0.4% today with low volatility (VIX 14.2). I can help with pre-trade compliance checks, tax impact analysis, or suggest replacement securities.',
      citations: [
        { source: 'OMS — Open Orders', text: '3 orders pending: 2 limit orders, 1 market order' },
        { source: 'Tax — Wash Sale Calendar', text: '2 securities restricted through March 15, 2026' },
      ],
    },
    {
      content:
        'I see some opportunities across your book today: 4 accounts have drifted beyond their rebalancing thresholds, and there are $18,600 in harvestable losses in the Chen-Wong taxable account. Want me to generate trade suggestions for any of these?',
      citations: [
        { source: 'PMS — Drift Report', text: '4 accounts beyond rebalancing threshold' },
        { source: 'Tax Analysis', text: 'Chen-Wong taxable: $18,600 harvestable losses' },
      ],
    },
  ],
}

// Fallback for unknown contexts
const defaultResponses: ResponseTemplate[] = [
  {
    content:
      'I\'m your AI assistant. I can help with portfolio analysis, rebalancing recommendations, client communications, compliance reviews, and more. What would you like to work on?',
  },
  {
    content:
      'I can analyze portfolio drift, generate rebalance proposals, draft client communications, review compliance requirements, and automate routine workflows. How can I assist you today?',
  },
]

// Keyword-based response matching for specific user questions
const keywordResponses: Array<{ keywords: string[]; response: ResponseTemplate }> = [
  {
    keywords: ['rebalance', 'drift', 'allocation'],
    response: {
      content:
        'I found 6 accounts exceeding their drift thresholds. The most urgent is the Johnson Family Trust with 4.2% total drift. Would you like me to generate rebalance proposals? I can prioritize by drift severity or by account size. Here are specific trade suggestions for the most drifted account:',
      citations: [
        { source: 'PMS — Drift Report', text: '6 accounts beyond IPS drift thresholds' },
      ],
      actions: [
        { id: 'act-010', action: 'Generate Rebalance Proposals', description: 'Create proposals for top 3 drifted accounts', impact: '~25 trades across 3 accounts', status: 'pending' },
      ],
      richCards: [
        {
          variant: 'rebalance_workflow' as const,
          entityId: 'acc-001',
          entityName: 'Johnson Family Trust',
          driftPercent: 4.2,
          needsRebalance: true,
          accountCount: 6,
          actionLabel: 'Start Batch Rebalance',
          actionRoute: '/portfolios/rebalance',
        },
      ],
      tradeSuggestions: [
        {
          symbol: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          side: 'sell',
          quantity: 45,
          rationale: 'Reduce US equity overweight by 2.1% to restore target allocation',
          estimatedValue: 11_250,
          accountId: 'acc-001',
          accountName: 'Johnson Family Trust',
        },
        {
          symbol: 'BND',
          name: 'Vanguard Total Bond Market ETF',
          side: 'buy',
          quantity: 150,
          rationale: 'Increase fixed income to target weight, funded by US equity reduction',
          estimatedValue: 11_100,
          accountId: 'acc-001',
          accountName: 'Johnson Family Trust',
        },
      ],
    },
  },
  {
    keywords: ['tax', 'harvest', 'loss'],
    response: {
      content:
        'I\'ve identified $47,200 in harvestable losses across your book. The largest opportunity is in the Chen-Wong taxable account with $18,600 in short-term losses. I can generate a tax-loss harvesting proposal that includes replacement security suggestions to maintain market exposure.',
      citations: [
        { source: 'Tax Analysis — Book Summary', text: 'Total harvestable losses: $47,200 across 8 accounts' },
      ],
      actions: [
        { id: 'act-011', action: 'Generate TLH Report', description: 'Create comprehensive tax-loss harvesting report', impact: '$47,200 in potential harvested losses', status: 'pending' },
      ],
    },
  },
  {
    keywords: ['rmd', 'distribution', 'required minimum'],
    response: {
      content:
        'Two clients have upcoming RMD deadlines: James Thompson (due March 3) and Richard Anderson (due April 1). Thompson\'s RMD is $34,200 from his Traditional IRA. I can calculate optimal withdrawal strategies considering tax bracket management.',
      citations: [
        { source: 'Compliance Calendar', text: 'Thompson RMD: $34,200 due March 3, 2026' },
        { source: 'Compliance Calendar', text: 'Anderson RMD: $28,100 due April 1, 2026' },
      ],
    },
  },
  {
    keywords: ['meeting', 'prep', 'prepare'],
    response: {
      content:
        'I can prepare a meeting brief for your next client meeting. The brief will include portfolio performance summary, any outstanding action items, recent market context relevant to their holdings, and suggested discussion topics based on their financial plan. Which client are you meeting with?',
    },
  },
  {
    keywords: ['concentration', 'concentrated', 'overweight'],
    response: {
      content:
        'I detected a concentrated position in AAPL at 8.2% — above the 5% single-stock IPS limit. I recommend a phased liquidation over 90 days paired with tax-loss harvesting in correlated positions to offset gains. Here are the suggested trades:',
      citations: [
        { source: 'PMS — Concentration Analysis', text: 'AAPL: 8.2% weight vs 5% IPS single-stock limit' },
        { source: 'Tax Lots', text: '3 positions with harvestable short-term losses totaling $12,400' },
      ],
      tradeSuggestions: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          side: 'sell',
          quantity: 35,
          rationale: 'Phase 1: Reduce concentration from 8.2% to ~6.5%. Sell highest cost-basis lots first to minimize gains.',
          estimatedValue: 6_125,
          accountId: 'acc-001',
          accountName: 'Johnson Family Trust',
        },
        {
          symbol: 'QQQ',
          name: 'Invesco QQQ Trust',
          side: 'buy',
          quantity: 12,
          rationale: 'Replace single-stock exposure with diversified tech ETF to maintain sector allocation',
          estimatedValue: 5_880,
          accountId: 'acc-001',
          accountName: 'Johnson Family Trust',
        },
        {
          symbol: 'VXUS',
          name: 'Vanguard Total Intl Stock ETF',
          side: 'sell',
          quantity: 20,
          rationale: 'Harvest $4,200 short-term loss to offset AAPL gains. Replace with IXUS after 31-day wash sale window.',
          estimatedValue: 1_140,
          accountId: 'acc-001',
          accountName: 'Johnson Family Trust',
        },
      ],
    },
  },
  {
    keywords: ['compliance', 'review', 'audit'],
    response: {
      content:
        'Your compliance dashboard shows 2 items needing attention: 1 overdue account review (Anderson — 3 days past SLA) and 1 pending trade pre-clearance. I can draft the Anderson review or flag the trade for expedited clearance.',
      citations: [
        { source: 'Compliance — Pending Reviews', text: '1 overdue (Anderson), 1 pending pre-clearance' },
      ],
    },
  },
]

export function getAIResponse(message: string, screenType: string, entityType?: string): ResponseTemplate {
  // First check keyword matches
  const lowerMessage = message.toLowerCase()
  const keywordMatch = keywordResponses.find((kr) =>
    kr.keywords.some((kw) => lowerMessage.includes(kw)),
  )
  if (keywordMatch) return keywordMatch.response

  // Then check context-specific responses
  const contextKey = `${screenType}:${entityType ?? ''}`
  const contextResponses = responsesByContext[contextKey]
  if (contextResponses && contextResponses.length > 0) {
    // Pick a deterministic response based on message length
    return contextResponses[message.length % contextResponses.length] as ResponseTemplate
  }

  return defaultResponses[message.length % defaultResponses.length] as ResponseTemplate
}

// ── Suggested prompts per screen ──

export const suggestedPrompts: SuggestedPrompt[] = [
  // Dashboard
  { text: 'Summarize my book today', category: 'overview', screenType: 'dashboard' },
  { text: 'Which accounts need rebalancing?', category: 'portfolio', screenType: 'dashboard' },
  { text: 'Show upcoming compliance deadlines', category: 'compliance', screenType: 'dashboard' },
  { text: 'Identify tax-loss harvesting opportunities', category: 'tax', screenType: 'dashboard' },

  // Client Detail
  { text: 'Summarize this client\'s portfolio performance', category: 'portfolio', screenType: 'client_detail' },
  { text: 'Draft a meeting prep brief', category: 'planning', screenType: 'client_detail' },
  { text: 'What life events should I prepare for?', category: 'planning', screenType: 'client_detail' },
  { text: 'Generate a quarterly review report', category: 'reporting', screenType: 'client_detail' },
  { text: 'Generate an investment proposal for this client', category: 'action', screenType: 'client_detail' },

  // Account Detail
  { text: 'Analyze this account\'s drift', category: 'portfolio', screenType: 'account_detail' },
  { text: 'Find tax-loss harvesting opportunities', category: 'tax', screenType: 'account_detail' },
  { text: 'Review concentration risk', category: 'risk', screenType: 'account_detail' },
  { text: 'Generate a rebalance proposal', category: 'portfolio', screenType: 'account_detail' },

  // Household Detail
  { text: 'Optimize asset location across accounts', category: 'tax', screenType: 'household_detail' },
  { text: 'Summarize household performance', category: 'portfolio', screenType: 'household_detail' },
  { text: 'Review estate planning status', category: 'planning', screenType: 'household_detail' },

  // Portfolios
  { text: 'Show all accounts with drift above threshold', category: 'portfolio', screenType: 'portfolios' },
  { text: 'Generate batch rebalance proposals', category: 'portfolio', screenType: 'portfolios' },
  { text: 'Rank accounts by risk-adjusted return', category: 'risk', screenType: 'portfolios' },

  // Workflows
  { text: 'What\'s overdue in my task list?', category: 'workflow', screenType: 'workflows' },
  { text: 'Draft a compliance review response', category: 'compliance', screenType: 'workflows' },
  { text: 'Summarize AI task progress', category: 'workflow', screenType: 'workflows' },

  // Settings
  { text: 'What automation rules are active?', category: 'settings', screenType: 'settings' },
  { text: 'Explain my current AI delegation thresholds', category: 'settings', screenType: 'settings' },

  // Trading
  { text: 'Check for wash sale risks on pending trades', category: 'compliance', screenType: 'trading' },
  { text: 'Estimate tax impact of today\'s trades', category: 'tax', screenType: 'trading' },
  { text: 'Suggest replacement securities for harvested positions', category: 'portfolio', screenType: 'trading' },
  { text: 'Run pre-trade compliance check', category: 'compliance', screenType: 'trading' },

  // Actions
  { text: 'Prioritize my actions for today', category: 'workflow', screenType: 'actions' },
  { text: 'Which critical actions are past due?', category: 'compliance', screenType: 'actions' },
  { text: 'Show batch rebalancing opportunities', category: 'portfolio', screenType: 'actions' },
  { text: 'Summarize NBA acceptance trends', category: 'overview', screenType: 'actions' },

  // Engage
  { text: 'Draft a market update email for platinum clients', category: 'communication', screenType: 'engage' },
  { text: 'Which campaigns had the best open rates?', category: 'overview', screenType: 'engage' },
  { text: 'Suggest social media content for this week', category: 'communication', screenType: 'engage' },
  { text: 'Review compliance status of pending posts', category: 'compliance', screenType: 'engage' },

  // Households (list)
  { text: 'Which households have the most drift?', category: 'portfolio', screenType: 'households' },
  { text: 'Identify households needing annual review', category: 'planning', screenType: 'households' },
  { text: 'Compare household segment performance', category: 'overview', screenType: 'households' },
]

// ── AI Action Templates ──

export const actionTemplates: ActionTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Rebalance Account',
    description: 'Generate a rebalancing proposal to restore target allocation',
    category: 'portfolio',
    icon: 'RefreshCw',
    params: [
      { key: 'account', label: 'Account', type: 'entity', required: true, entityType: 'account' },
      { key: 'method', label: 'Method', type: 'select', required: true, options: ['Minimum Trades', 'Tax-Optimized', 'Cash-Neutral'], defaultValue: 'Tax-Optimized' },
      { key: 'threshold', label: 'Drift Threshold (%)', type: 'number', required: false, defaultValue: '3' },
    ],
    estimatedTime: '2 min',
    executionRoute: '/portfolios/rebalance',
  },
  {
    id: 'tpl-002',
    name: 'Tax-Loss Harvest',
    description: 'Scan for harvestable losses and suggest replacement securities',
    category: 'portfolio',
    icon: 'Scissors',
    params: [
      { key: 'account', label: 'Account', type: 'entity', required: true, entityType: 'account' },
      { key: 'minLoss', label: 'Minimum Loss ($)', type: 'number', required: false, defaultValue: '1000' },
      { key: 'includeShortTerm', label: 'Include Short-Term', type: 'select', required: false, options: ['Yes', 'No'], defaultValue: 'Yes' },
    ],
    estimatedTime: '1 min',
  },
  {
    id: 'tpl-003',
    name: 'Draft Client Email',
    description: 'AI-draft a professional email to a client on any topic',
    category: 'communication',
    icon: 'Mail',
    params: [
      { key: 'client', label: 'Client', type: 'entity', required: true, entityType: 'client' },
      { key: 'topic', label: 'Topic', type: 'select', required: true, options: ['Quarterly Review', 'Rebalancing Proposal', 'Market Update', 'Meeting Follow-Up', 'RMD Reminder', 'Custom'] },
      { key: 'customTopic', label: 'Custom Topic', type: 'text', required: false },
      { key: 'tone', label: 'Tone', type: 'select', required: false, options: ['Professional', 'Warm', 'Urgent'], defaultValue: 'Professional' },
    ],
    estimatedTime: '30 sec',
  },
  {
    id: 'tpl-004',
    name: 'Schedule Meeting',
    description: 'Find optimal meeting time and generate agenda',
    category: 'planning',
    icon: 'Calendar',
    params: [
      { key: 'client', label: 'Client', type: 'entity', required: true, entityType: 'client' },
      { key: 'type', label: 'Meeting Type', type: 'select', required: true, options: ['Annual Review', 'Quarterly Review', 'Planning', 'Ad Hoc'] },
      { key: 'preferredDate', label: 'Preferred Date', type: 'date', required: false },
    ],
    estimatedTime: '1 min',
  },
  {
    id: 'tpl-005',
    name: 'Generate Report',
    description: 'Create a client-ready performance or planning report',
    category: 'communication',
    icon: 'FileText',
    params: [
      { key: 'client', label: 'Client', type: 'entity', required: true, entityType: 'client' },
      { key: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['Performance Summary', 'Tax Report', 'Estate Summary', 'Financial Plan Update'] },
      { key: 'period', label: 'Period', type: 'select', required: false, options: ['MTD', 'QTD', 'YTD', '1Y', 'Inception'], defaultValue: 'QTD' },
    ],
    estimatedTime: '2 min',
  },
  {
    id: 'tpl-006',
    name: 'Update Risk Profile',
    description: 'Re-assess client risk tolerance and update IPS alignment',
    category: 'compliance',
    icon: 'Shield',
    params: [
      { key: 'client', label: 'Client', type: 'entity', required: true, entityType: 'client' },
      { key: 'reason', label: 'Reason for Update', type: 'select', required: true, options: ['Life Event', 'Market Conditions', 'Scheduled Review', 'Client Request'] },
    ],
    estimatedTime: '3 min',
  },
  {
    id: 'tpl-007',
    name: 'Submit Trade',
    description: 'Pre-fill a trade ticket with AI-validated parameters',
    category: 'trading',
    icon: 'ArrowRightLeft',
    params: [
      { key: 'account', label: 'Account', type: 'entity', required: true, entityType: 'account' },
      { key: 'symbol', label: 'Symbol', type: 'text', required: true },
      { key: 'side', label: 'Side', type: 'select', required: true, options: ['Buy', 'Sell'] },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    ],
    estimatedTime: '30 sec',
    executionRoute: '/portfolios/trading',
  },
  {
    id: 'tpl-008',
    name: 'Create Compliance Note',
    description: 'Document a compliance observation or exception',
    category: 'compliance',
    icon: 'ClipboardCheck',
    params: [
      { key: 'account', label: 'Account', type: 'entity', required: true, entityType: 'account' },
      { key: 'noteType', label: 'Type', type: 'select', required: true, options: ['Suitability Review', 'Exception Approval', 'Trade Rationale', 'Client Instruction'] },
      { key: 'details', label: 'Details', type: 'text', required: true },
    ],
    estimatedTime: '1 min',
  },
]
