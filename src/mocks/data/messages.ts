import type { Participant, Thread, Message } from '@/types/messaging'
import { accounts } from './accounts'
import { computeDriftForAccount, modelDisplayName } from '../handlers/pms'
import { requireModelManaged } from '@/lib/mandate'
import { generateRebalanceProposal } from '../handlers/oms'
import { settleBatchWashSales } from '../handlers/batch-wash-sales'
import { estimateTaxOnReturns } from '../handlers/tax-return'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { formatRatePercent } from '@/lib/tax-rules'
import { recognisedResult, taxEstimateDirection } from '@/lib/capital-gains'
import { formatCalendarDate, formatCurrency } from '@/lib/utils'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { roundTo } from '../handlers/utils'

const pct1 = (fraction: number) => `${(fraction * 100).toFixed(1)}%`
const wholeDollars = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`
/** "a", "a and b", "a, b and c". */
const listing = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

/**
 * §0.7 · msg-003, in Robert Johnson's rebalance thread, used to recommend trimming AAPL and MSFT at
 * "3.2% over target" — acc-001's holdings at a figure from nowhere. It now reports acc-002, Robert's
 * individual account, from the engine: its worst asset-class drift against its own model and band,
 * and the trades the tax-aware rebalance proposes.
 *
 * Ledger Task 11 · the trades are the preview's own: settled for §1091 across the taxpayer
 * (`settleBatchWashSales`), so a washed loss is never stated as realised. The note says the
 * rebalance *proposes* them, gives each sale's realised result, gains as well as the INTC loss, and
 * the net, the tax the preview estimates they add to the return, and the date to which selling INTC
 * bars buying it back.
 */
export function johnsonDriftNote() {
  const account = requireModelManaged(accounts.find((a) => a.id === 'acc-002')!)
  const drift = computeDriftForAccount(account)
  const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]!
  const [legs] = settleBatchWashSales([{ account, ...generateRebalanceProposal(account.id, true) }], MOCK_TODAY_ISO)
  if (legs === undefined) throw new Error('acc-002 has no rebalance proposal')
  const [estimate] = estimateTaxOnReturns([{ account, legs }], MOCK_TODAY_ISO)
  if (estimate === undefined) throw new Error('acc-002 has no tax estimate')
  const recognised = (leg: (typeof legs)[number]) => {
    const r = recognisedResult(leg)
    return r.shortTerm + r.longTerm
  }
  const sellLegs = legs.filter((l) => l.side === 'sell')
  const sells = sellLegs.map((l) => {
    const result = recognised(l)
    const outcome = result === 0 ? '' : ` (a ${wholeDollars(Math.abs(result))} ${result < 0 ? 'loss' : 'gain'})`
    return `${l.quantity.toLocaleString('en-US')} ${l.symbol}${outcome}`
  })
  const net = sellLegs.reduce((s, l) => s + recognised(l), 0)
  const buys = [...new Set(legs.filter((l) => l.side === 'buy').map((l) => ASSET_CLASS_LABELS[l.assetClass] ?? l.assetClass))]
  const label = ASSET_CLASS_LABELS[worst.assetClass] ?? worst.assetClass
  const tax = taxEstimateDirection(estimate.net)
  const intc = sellLegs.find((l) => l.symbol === 'INTC')
  const intcWindow = intc?.repurchaseBlockedUntil
    ? ` Selling INTC at a loss bars buying it back in any of the couple's accounts, IRAs included, through ${formatCalendarDate(intc.repurchaseBlockedUntil)}.`
    : ''
  const content = `I ran the drift analysis on Robert's individual account: ${label} is ${pct1(worst.actual)} against the ` +
    `${modelDisplayName(drift.modelId)} model's ${pct1(worst.target)} target, ${(Math.abs(worst.drift) * 100).toFixed(1)} points ` +
    `${worst.drift > 0 ? 'over' : 'under'}, outside its ±${formatRatePercent(drift.driftTolerance)} band. A tax-aware rebalance proposes selling ` +
    `${listing(sells)}, and buying ${listing(buys)}. The sales net a ${wholeDollars(Math.abs(net))} ${net < 0 ? 'loss' : 'gain'}; ` +
    `against the joint return's results so far this year, that is about ${wholeDollars(tax.amount)} of capital-gains tax ${tax.direction} the return.${intcWindow}`
  return { account, drift, worst, label, legs, net, estimate, content }
}

const johnson = johnsonDriftNote()

const adrian: Participant = { id: 'user-001', name: 'Adrian Hale', role: 'advisor' }
const sarah: Participant = { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' }
const mike: Participant = { id: 'user-003', name: 'Mike Chen', role: 'analyst' }
const lisa: Participant = { id: 'user-004', name: 'Lisa Park', role: 'compliance' }
const ada: Participant = { id: 'user-005', name: 'Ada', role: 'ai_agent' }

export const teamMembers: Participant[] = [adrian, sarah, mike, lisa, ada]

export const threads: Thread[] = [
  {
    id: 'thread-001',
    subject: 'Johnson Rebalance Review',
    participants: [adrian, sarah, mike],
    lastMessage: johnson.content,
    lastMessageAt: '2026-02-25T10:45:00Z',
    unreadCount: 2,
    entityContext: { type: 'client', id: 'cli-001', name: 'Robert Johnson' },
  },
  {
    id: 'thread-002',
    subject: 'Chen Trust Tax Strategy',
    participants: [adrian, mike, ada],
    lastMessage: 'Ada identified three additional TLH candidates in the Chen trust. Net estimated savings: $14,200. Details attached.',
    lastMessageAt: '2026-02-24T16:30:00Z',
    unreadCount: 1,
    entityContext: { type: 'account', id: 'acc-006', name: 'Chen Family Trust' },
  },
  {
    id: 'thread-003',
    subject: 'Q1 Performance Review',
    participants: [adrian, sarah, mike, ada],
    lastMessage: 'Draft review decks are ready for the top 10 households. I flagged two accounts where TWR lags benchmark by more than 200bps.',
    lastMessageAt: '2026-02-24T14:00:00Z',
    unreadCount: 0,
  },
  {
    id: 'thread-004',
    subject: 'New Client Onboarding - Williams',
    participants: [adrian, sarah, lisa],
    lastMessage: 'Suitability questionnaire received and approved. We can proceed with account opening once the IPS is signed.',
    lastMessageAt: '2026-02-23T11:15:00Z',
    unreadCount: 0,
    entityContext: { type: 'client', id: 'cli-004', name: 'David Williams' },
  },
  {
    id: 'thread-005',
    subject: 'Compliance Alert: Anderson Account',
    participants: [adrian, lisa, ada],
    lastMessage: 'Source-of-funds documentation cleared. No further action required on the $250K wire.',
    lastMessageAt: '2026-02-24T17:00:00Z',
    unreadCount: 3,
    entityContext: { type: 'client', id: 'cli-009', name: 'Richard Anderson' },
  },
]

export const threadMessages: Record<string, Message[]> = {
  'thread-001': [
    {
      id: 'msg-001',
      threadId: 'thread-001',
      senderId: 'user-001',
      content: 'Team, the Johnson household is overdue for a rebalance. Can someone pull the current drift numbers?',
      timestamp: '2026-02-25T09:00:00Z',
      read: true,
    },
    {
      id: 'msg-002',
      threadId: 'thread-001',
      senderId: 'user-002',
      content: 'On it. The last rebalance was November — I\'ll pull positions from PMS and compare against the IPS targets.',
      timestamp: '2026-02-25T09:15:00Z',
      read: true,
    },
    {
      id: 'msg-003',
      threadId: 'thread-001',
      senderId: 'user-003',
      content: johnson.content,
      timestamp: '2026-02-25T10:45:00Z',
      attachments: [
        {
          type: 'account_card' as const,
          entityId: johnson.account.id,
          entityName: johnson.account.name,
          preview: `Drift: ${johnson.worst.drift > 0 ? '+' : '−'}${(Math.abs(johnson.worst.drift) * 100).toFixed(1)}% ${johnson.label}`,
          richData: {
            variant: 'portfolio_overview' as const,
            entityId: johnson.account.id,
            entityName: johnson.account.name,
            metrics: [{ label: 'AUM', value: formatCurrency(johnson.account.totalValue, true) }],
            allocation: johnson.drift.assetClassDrifts
              .filter((d) => d.actual > 0)
              .map((d) => ({ assetClass: d.assetClass, weight: roundTo(d.actual, 3) })),
            driftPercent: roundTo(johnson.drift.maxAbsDrift * 100, 1),
            needsRebalance: johnson.drift.needsRebalance,
          },
        },
      ],
      read: false,
    },
  ],
  'thread-002': [
    {
      id: 'msg-004',
      threadId: 'thread-002',
      senderId: 'user-001',
      content: 'We executed TLH on the Chen trust last week. Are there any remaining opportunities before quarter-end?',
      timestamp: '2026-02-24T14:00:00Z',
      read: true,
    },
    {
      id: 'msg-005',
      threadId: 'thread-002',
      senderId: 'user-003',
      content: 'Let me check the unrealized loss report. Give me an hour.',
      timestamp: '2026-02-24T14:20:00Z',
      read: true,
    },
    {
      id: 'msg-006',
      threadId: 'thread-002',
      senderId: 'user-003',
      content: 'Found a couple positions with short-term losses. Sending to Ada for wash-sale rule validation.',
      timestamp: '2026-02-24T15:45:00Z',
      read: true,
    },
    {
      id: 'msg-007',
      threadId: 'thread-002',
      senderId: 'user-005',
      content: 'Ada identified three additional TLH candidates in the Chen trust. Net estimated savings: $14,200. Details attached.',
      timestamp: '2026-02-24T16:30:00Z',
      attachments: [
        { type: 'document', entityId: 'doc-007', entityName: 'TLH Analysis — Chen Trust', preview: '3 candidates, $14.2K estimated savings' },
      ],
      read: false,
    },
  ],
  'thread-003': [
    {
      id: 'msg-008',
      threadId: 'thread-003',
      senderId: 'user-001',
      content: 'Q1 is wrapping up. Can we get performance review decks started for the top households? Prioritize platinum and gold tiers.',
      timestamp: '2026-02-24T09:00:00Z',
      read: true,
    },
    {
      id: 'msg-009',
      threadId: 'thread-003',
      senderId: 'user-005',
      content: 'I\'ve generated draft performance summaries for all platinum households. TWR calculations are current through yesterday\'s close.',
      timestamp: '2026-02-24T11:30:00Z',
      read: true,
    },
    {
      id: 'msg-010',
      threadId: 'thread-003',
      senderId: 'user-002',
      content: 'Thanks Ada. I\'ll review and schedule the client meetings. Adrian, any households you want to handle personally?',
      timestamp: '2026-02-24T12:00:00Z',
      read: true,
    },
    {
      id: 'msg-011',
      threadId: 'thread-003',
      senderId: 'user-003',
      content: 'Draft review decks are ready for the top 10 households. I flagged two accounts where TWR lags benchmark by more than 200bps.',
      timestamp: '2026-02-24T14:00:00Z',
      attachments: [
        { type: 'client_card', entityId: 'cli-006', entityName: 'Michael Martinez', preview: 'TWR: -2.4% vs benchmark' },
        { type: 'client_card', entityId: 'cli-011', entityName: 'Raj Patel', preview: 'TWR: -2.1% vs benchmark' },
      ],
      read: true,
    },
  ],
  'thread-004': [
    {
      id: 'msg-012',
      threadId: 'thread-004',
      senderId: 'user-001',
      content: 'David Williams is ready to proceed with the 401(k) rollover. Sarah, can you handle the ACAT paperwork? Lisa, we\'ll need a suitability sign-off.',
      timestamp: '2026-02-22T10:00:00Z',
      read: true,
    },
    {
      id: 'msg-013',
      threadId: 'thread-004',
      senderId: 'user-002',
      content: 'ACAT form prepared. I\'ll need David\'s most recent Fidelity statement. Sending him a secure upload link now.',
      timestamp: '2026-02-22T14:30:00Z',
      attachments: [
        { type: 'nba_card', entityId: 'nba-004', entityName: '401(k) Rollover — Williams', preview: '$380K from Fidelity' },
      ],
      read: true,
    },
    {
      id: 'msg-014',
      threadId: 'thread-004',
      senderId: 'user-004',
      content: 'Suitability questionnaire received and approved. We can proceed with account opening once the IPS is signed.',
      timestamp: '2026-02-23T11:15:00Z',
      read: true,
    },
  ],
  'thread-005': [
    {
      id: 'msg-015',
      threadId: 'thread-005',
      senderId: 'user-005',
      content: 'Compliance alert: A $250,000 incoming wire was received in the Anderson joint account. Source-of-funds documentation is required per AML policy.',
      timestamp: '2026-02-24T14:00:00Z',
      attachments: [
        {
          type: 'account_card' as const,
          entityId: 'acc-022',
          entityName: 'Anderson Joint Brokerage',
          preview: '$250K incoming wire',
          richData: {
            variant: 'account_summary' as const,
            entityId: 'acc-022',
            entityName: 'Anderson Joint Brokerage',
            metrics: [{ label: 'Value', value: '$2.4M' }],
            driftPercent: 1.1,
          },
        },
      ],
      read: false,
    },
    {
      id: 'msg-016',
      threadId: 'thread-005',
      senderId: 'user-001',
      content: 'Richard mentioned this is from a property sale. Lisa, what documentation do we need?',
      timestamp: '2026-02-24T14:30:00Z',
      read: false,
    },
    {
      id: 'msg-017',
      threadId: 'thread-005',
      senderId: 'user-004',
      content: 'We need the closing statement from the real estate transaction and a signed source-of-funds declaration. I\'ll send the template to Richard directly.',
      timestamp: '2026-02-24T15:00:00Z',
      read: false,
    },
    {
      id: 'msg-018',
      threadId: 'thread-005',
      senderId: 'user-004',
      content: 'Source-of-funds documentation cleared. No further action required on the $250K wire.',
      timestamp: '2026-02-24T17:00:00Z',
      attachments: [
        { type: 'document', entityId: 'doc-016', entityName: 'Anderson SOF Declaration', preview: 'Cleared — property sale proceeds' },
      ],
      read: false,
    },
  ],
}
