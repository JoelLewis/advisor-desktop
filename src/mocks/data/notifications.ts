import type { Notification } from '@/types/notification'
import { now } from '@/lib/clock'
import { driftBatchFacts } from './nbas'
import { modelDisplayName } from '../handlers/pms'

/** §0.7 · ntf-010 named a "Growth Equity" model that does not exist and a flat 3% band. */
function growthBatchBody(): string {
  const modelId = 'mod-002'
  const facts = driftBatchFacts()
  const count = facts.modelIds.filter((id) => id === modelId).length
  const band = facts.bands.find((b) => b.startsWith(`${modelDisplayName(modelId)} `))
  return `${count} accounts on the ${modelDisplayName(modelId)} model are outside its band (${band}). Batch rebalance recommended.`
}

function daysAgo(n: number): string {
  const d = now()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(9, 30, 0, 0)
  return d.toISOString()
}

function hoursAgo(n: number): string {
  const d = now()
  d.setUTCHours(d.getUTCHours() - n)
  return d.toISOString()
}

function minutesAgo(n: number): string {
  const d = now()
  d.setUTCMinutes(d.getUTCMinutes() - n)
  return d.toISOString()
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  // Compliance
  {
    id: 'ntf-001',
    category: 'compliance',
    priority: 'critical',
    title: 'IPS Breach — Chen-Wong Household',
    body: 'Fixed income allocation at 42% exceeds 35% IPS limit. Immediate review required.',
    timestamp: minutesAgo(12),
    read: false,
    dismissed: false,
    actionLabel: 'View Account',
    actionRoute: '/portfolios/accounts/acc-005',
    entityType: 'household',
    entityId: 'hh-002',
    entityName: 'Chen-Wong',
    source: 'Compliance Engine',
  },
  {
    id: 'ntf-002',
    category: 'compliance',
    priority: 'high',
    title: 'RMD Deadline Approaching — Margaret Thompson',
    body: 'Required Minimum Distribution due in 14 days. $42,300 must be distributed from IRA.',
    timestamp: hoursAgo(2),
    read: false,
    dismissed: false,
    actionLabel: 'View Client',
    actionRoute: '/clients/cli-003',
    entityType: 'client',
    entityId: 'cli-003',
    entityName: 'Margaret Thompson',
    source: 'Planning Module',
  },
  {
    id: 'ntf-003',
    category: 'compliance',
    priority: 'medium',
    title: 'ADV Part 2 Annual Update Pending',
    body: 'Annual ADV Part 2 brochure update due within 120 days. 3 material changes detected.',
    timestamp: daysAgo(1),
    read: true,
    dismissed: false,
    source: 'Compliance Engine',
  },

  // Trades
  {
    id: 'ntf-004',
    category: 'trades',
    priority: 'high',
    title: 'Trade Execution Failed — AAPL Buy',
    body: '500 shares AAPL limit order expired unfilled. Price moved above $198.50 limit.',
    timestamp: minutesAgo(45),
    read: false,
    dismissed: false,
    actionLabel: 'Modify Order',
    actionRoute: '/portfolios/trading',
    entityType: 'account',
    entityId: 'acc-001',
    entityName: 'Davis Family Trust',
    source: 'OMS',
  },
  {
    id: 'ntf-005',
    category: 'trades',
    priority: 'medium',
    title: 'Rebalance Complete — 8 Accounts',
    body: 'Model "Growth Equity" rebalance executed. 47 trades filled, $2.3M notional. 0 rejects.',
    timestamp: hoursAgo(3),
    read: false,
    dismissed: false,
    actionLabel: 'View Trades',
    actionRoute: '/portfolios/trading',
    source: 'Rebalance Engine',
  },
  {
    id: 'ntf-006',
    category: 'trades',
    priority: 'low',
    title: 'Mutual Fund NAV Settlement',
    body: 'VFIAX purchase settled at $421.32 NAV. 118.7 shares credited to Martinez account.',
    timestamp: daysAgo(1),
    read: true,
    dismissed: false,
    entityType: 'account',
    entityId: 'acc-008',
    entityName: 'Martinez IRA',
    source: 'Custodian',
  },

  // Workflows
  {
    id: 'ntf-007',
    category: 'workflows',
    priority: 'high',
    title: 'ACAT Transfer Stuck — NIGO',
    body: 'Patel household incoming transfer flagged NIGO. Missing signature on TOA form page 3.',
    timestamp: hoursAgo(1),
    read: false,
    dismissed: false,
    actionLabel: 'View Workflow',
    actionRoute: '/workflows',
    entityType: 'household',
    entityId: 'hh-007',
    entityName: 'Patel',
    source: 'Custodian',
  },
  {
    id: 'ntf-008',
    category: 'workflows',
    priority: 'medium',
    title: 'Account Opening Approved',
    body: 'New Roth IRA for Sarah Chen approved by compliance. Ready for funding.',
    timestamp: hoursAgo(5),
    read: true,
    dismissed: false,
    entityType: 'client',
    entityId: 'cli-006',
    entityName: 'Sarah Chen',
    source: 'Onboarding',
  },

  // NBA
  {
    id: 'ntf-009',
    category: 'nba',
    priority: 'high',
    title: 'Tax-Loss Harvest Opportunity',
    // PRE-FLIGHT correction 7 (fourth site) / fix round 1, Important #3 — the previous copy
    // implied a flat 37% against a $49,730 loss base ($18,400): removed. The account count ("3")
    // was also removed rather than fixed in place — it doesn't match any real derivation (9
    // accounts have a single harvestable lot over $10K; 25 have an aggregate harvestable loss over
    // $10K; the dashboard's own book-wide count is different again), and this file only imports
    // `@/types/notification` and `@/lib/clock` — wiring in a handler-level tax-lot generator here
    // would be a real layering change, not a copy fix. A number no derivation produces, sitting
    // next to a screen that produces a different one, is worse than no number.
    body: 'Several accounts have unrealized losses >$10K with no wash sale risk. Tax savings depend on each lot\'s holding period.',
    timestamp: hoursAgo(1),
    read: false,
    dismissed: false,
    actionLabel: 'View NBAs',
    actionRoute: '/actions',
    source: 'NBA Engine',
  },
  {
    id: 'ntf-010',
    category: 'nba',
    priority: 'medium',
    title: 'Batch Rebalance Opportunity',
    body: growthBatchBody(),
    timestamp: hoursAgo(4),
    read: false,
    dismissed: false,
    actionLabel: 'View NBAs',
    actionRoute: '/actions',
    source: 'NBA Engine',
  },

  // AI
  {
    id: 'ntf-011',
    category: 'ai',
    priority: 'medium',
    title: 'Meeting Brief Generated',
    body: 'AI prepared quarterly review brief for Davis household. 4 discussion topics, 2 action items.',
    timestamp: hoursAgo(2),
    read: false,
    dismissed: false,
    actionLabel: 'Open AI Panel',
    entityType: 'household',
    entityId: 'hh-001',
    entityName: 'Davis',
    source: 'AI Assistant',
  },
  {
    id: 'ntf-012',
    category: 'ai',
    priority: 'low',
    title: 'Document Draft Ready',
    body: 'IPS update draft for Thompson household completed. Awaiting advisor review.',
    timestamp: daysAgo(1),
    read: true,
    dismissed: false,
    source: 'AI Assistant',
  },

  // Team
  {
    id: 'ntf-013',
    category: 'team',
    priority: 'medium',
    title: 'CSA Note: Williams Follow-up',
    body: 'Lisa (CSA) added note: "Client called about beneficiary change. Needs advisor callback."',
    timestamp: minutesAgo(30),
    read: false,
    dismissed: false,
    actionLabel: 'View Client',
    actionRoute: '/clients/cli-010',
    entityType: 'client',
    entityId: 'cli-010',
    entityName: 'Robert Williams',
    source: 'Team',
  },
  {
    id: 'ntf-014',
    category: 'team',
    priority: 'low',
    title: 'Delegation Complete',
    body: 'AI completed delegated task: "Draft quarterly performance summary for Johnson household."',
    timestamp: hoursAgo(6),
    read: true,
    dismissed: false,
    source: 'AI Assistant',
  },

  // Client
  {
    id: 'ntf-015',
    category: 'client',
    priority: 'high',
    title: 'Large Withdrawal Request — Garcia',
    body: 'Michael Garcia requested $250K wire transfer from taxable account. Exceeds typical pattern.',
    timestamp: minutesAgo(20),
    read: false,
    dismissed: false,
    actionLabel: 'View Client',
    actionRoute: '/clients/cli-004',
    entityType: 'client',
    entityId: 'cli-004',
    entityName: 'Michael Garcia',
    source: 'Custodian',
  },
  {
    id: 'ntf-016',
    category: 'client',
    priority: 'medium',
    title: 'New Document Uploaded',
    body: 'Estate planning documents uploaded by Anderson household. 3 files pending review.',
    timestamp: hoursAgo(3),
    read: false,
    dismissed: false,
    actionLabel: 'View Documents',
    actionRoute: '/clients/cli-007',
    entityType: 'client',
    entityId: 'cli-007',
    entityName: 'David Anderson',
    source: 'Document Vault',
  },
  {
    id: 'ntf-017',
    category: 'client',
    priority: 'low',
    title: 'Birthday Reminder — Sarah Chen',
    body: 'Client birthday on March 15. Consider sending personalized note.',
    timestamp: daysAgo(2),
    read: true,
    dismissed: false,
    entityType: 'client',
    entityId: 'cli-006',
    entityName: 'Sarah Chen',
    source: 'CRM',
  },
  {
    id: 'ntf-018',
    category: 'client',
    priority: 'medium',
    title: 'Life Event Detected — Martinez',
    body: 'Public records indicate property sale for Martinez household. Review financial plan impact.',
    timestamp: daysAgo(1),
    read: false,
    dismissed: false,
    actionLabel: 'View Client',
    actionRoute: '/clients/cli-005',
    entityType: 'client',
    entityId: 'cli-005',
    entityName: 'Carlos Martinez',
    source: 'Data Enrichment',
  },
]
