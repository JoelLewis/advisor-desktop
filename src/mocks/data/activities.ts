import type { ActivityItem } from '@/types/activity'
import { driftBatchFacts } from './drift-facts'
import { accounts } from './accounts'
import { getPositionsForAccount } from './positions'
import { realizedSales } from './realized-sales'
import { orders } from '../handlers/oms'
import { KNOWN_OPEN_DATES } from '../handlers/custodian'
import { accountDisplayName } from '@/lib/account-display'

/**
 * The INTC harvest and its SMH replacement, from the records that state them: rs-001 and
 * its fill (ord-004) for the sale, pos-265 and its recorded open date for the purchase. The feed
 * said "Sold 500 shares … Realized loss: $6,820" against a 5,000-share, −$32,750 sale.
 */
const rs001 = realizedSales.find((s) => s.id === 'rs-001')!
const ord004 = orders.find((o) => o.id === 'ord-004')!
const ord017 = orders.find((o) => o.id === 'ord-017')
const acc002 = accounts.find((a) => a.id === rs001.accountId)!
const smh = getPositionsForAccount(acc002.id, acc002.totalValue).find((p) => p.id === 'pos-265')!

/** The SMH replacement, as its ticket filled, on the day pos-265 records it opened. */
function smhPurchaseTimestamp(): string {
  const filled = ord017?.filledAt
  if (filled === undefined) throw new Error('The SMH replacement has no filled ticket (ord-017)')
  if (filled.slice(0, 10) !== KNOWN_OPEN_DATES.get(smh.id)) throw new Error(`SMH replacement at ${filled} is not on pos-265's open date`)
  return filled
}
const dollarsAndCents = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const activities: ActivityItem[] = [
  {
    id: 'act-001', type: 'rebalance', source: 'pms',
    title: 'Batch rebalance completed — 5 accounts',
    description: 'Executed 23 trades across 5 accounts. Net tax impact: -$4,200 (harvested losses).',
    // Was 13:45Z today, after the frozen now (12:00Z, 7:00 ET) and before the market opened.
    timestamp: '2026-02-24T20:45:00Z', read: false,
  },
  {
    id: 'act-002', type: 'system', source: 'pms',
    title: 'Pre-market — S&P 500 futures up 0.3%',
    description: 'Futures indicate positive open. Key earnings: HD, LOW this week.',
    // Was 13:30Z, after the frozen now; a pre-market note at 6:30 ET precedes it.
    timestamp: '2026-02-25T11:30:00Z', read: true,
  },
  {
    id: 'act-003', type: 'compliance', source: 'compliance',
    title: 'Large wire alert — Anderson account',
    description: '$250,000 incoming wire to Richard Anderson · Individual (…6649). Source-of-funds documentation required.',
    entityType: 'client', entityId: 'cli-009', entityName: 'Richard Anderson',
    timestamp: '2026-02-24T15:10:00Z', read: false,
  },
  {
    id: 'act-004', type: 'document', source: 'crm',
    title: 'Document signed — Patel beneficiary update',
    description: 'Raj Patel signed beneficiary designation form via DocuSign.',
    entityType: 'client', entityId: 'cli-011', entityName: 'Raj Patel',
    timestamp: '2026-02-24T14:22:00Z', read: true,
  },
  {
    id: 'act-005', type: 'trade', source: 'oms',
    title: `Trade executed — ${rs001.symbol} sell for tax harvest`,
    description: `Sold ${rs001.quantity.toLocaleString('en-US')} shares ${rs001.symbol} at ${dollarsAndCents(rs001.proceeds / rs001.quantity)} in ${accountDisplayName(acc002)}. ` +
      `Realized ${rs001.holdingPeriod}-term loss: $${Math.abs(rs001.realizedGainLoss).toLocaleString('en-US')}.`,
    entityType: 'client', entityId: 'cli-001', entityName: 'Robert Johnson',
    timestamp: ord004.filledAt!, read: true,
  },
  {
    id: 'act-006', type: 'ai_action', source: 'ai',
    title: 'AI generated meeting brief — Williams review',
    description: 'Meeting preparation brief generated for Williams Household semi-annual review (Feb 26).',
    entityType: 'household', entityId: 'hh-003', entityName: 'Williams Household',
    timestamp: '2026-02-24T15:00:00Z', read: false,
  },
  {
    id: 'act-007', type: 'meeting', source: 'crm',
    title: 'Meeting completed — Thompson RMD planning',
    description: 'Discussed first RMD strategy and Roth conversion options. Action items captured.',
    entityType: 'client', entityId: 'cli-008', entityName: 'James Thompson',
    timestamp: '2026-02-24T20:15:00Z', read: true,
  },
  {
    id: 'act-009', type: 'email', source: 'crm',
    title: 'Email sent — Chen quarterly update',
    description: 'Quarterly performance update email sent to Margaret Chen.',
    entityType: 'client', entityId: 'cli-003', entityName: 'Margaret Chen',
    timestamp: '2026-02-23T16:45:00Z', read: true,
  },
  {
    id: 'act-010', type: 'call', source: 'crm',
    title: 'Call logged — Patel new baby discussion',
    description: 'Raj Patel called to discuss financial planning for the new baby. Created a life-event follow-up.',
    entityType: 'client', entityId: 'cli-011', entityName: 'Raj Patel',
    timestamp: '2026-02-23T15:30:00Z', read: true,
  },
  {
    id: 'act-011', type: 'trade', source: 'oms',
    title: `Order filled — ${smh.symbol} purchase (tax harvest replacement)`,
    description: `Purchased ${smh.quantity.toLocaleString('en-US')} shares ${smh.symbol} at ${dollarsAndCents(smh.costBasis / smh.quantity)} in ${accountDisplayName(acc002)} as the ${rs001.symbol} replacement.`,
    entityType: 'client', entityId: 'cli-001', entityName: 'Robert Johnson',
    // Bought five minutes after the INTC fill (ord-004), on the date pos-265 records it opened.
    timestamp: smhPurchaseTimestamp(), read: true,
  },
  {
    id: 'act-012', type: 'system', source: 'pms',
    // The count and the bands come from the drift engine.
    title: `Drift alert — ${driftBatchFacts().accountCount} accounts outside their model's band`,
    description: `${driftBatchFacts().accountCount} client accounts are outside their own model's drift band (${driftBatchFacts().bands.join(', ')}).`,
    timestamp: '2026-02-23T13:00:00Z', read: true,
  },
  {
    id: 'act-013', type: 'document', source: 'crm',
    title: 'New document uploaded — Foster investor profile update',
    description: 'William Foster uploaded an updated investor profile form. Pending review.',
    entityType: 'client', entityId: 'cli-017', entityName: 'William Foster',
    timestamp: '2026-02-20T21:00:00Z', read: true,
  },
  {
    id: 'act-014', type: 'compliance', source: 'compliance',
    title: 'Compliance review cleared — Martinez trade',
    description: 'Pre-trade compliance check passed for Michael Martinez rebalance order.',
    entityType: 'client', entityId: 'cli-006', entityName: 'Michael Martinez',
    timestamp: '2026-02-20T19:30:00Z', read: true,
  },
  {
    id: 'act-015', type: 'meeting', source: 'crm',
    title: 'Meeting scheduled — Anderson follow-up (Mar 5)',
    description: 'Quarterly review follow-up scheduled with Richard & Susan Anderson.',
    entityType: 'household', entityId: 'hh-006', entityName: 'Anderson Household',
    timestamp: '2026-02-20T19:00:00Z', read: true,
  },
  {
    id: 'act-016', type: 'call', source: 'crm',
    title: '401(k) rollover — asked about; comparison to follow',
    description: 'David Williams asked about rolling over his Fidelity 401(k). Nothing is recommended until the comparison with staying in the plan is done.',
    entityType: 'client', entityId: 'cli-004', entityName: 'David Williams',
    timestamp: '2026-02-20T18:30:00Z', read: true,
  },
  {
    id: 'act-017', type: 'rebalance', source: 'pms',
    title: 'Rebalance preview generated — Chen portfolio',
    description: 'Tax-aware rebalance preview for Margaret Chen. 8 trades proposed, $2,100 estimated tax impact.',
    entityType: 'client', entityId: 'cli-003', entityName: 'Margaret Chen',
    timestamp: '2026-02-20T17:30:00Z', read: true,
  },
  {
    id: 'act-018', type: 'system', source: 'pms',
    title: 'Daily reconciliation complete — all systems synced',
    description: '0 breaks detected. All custodial data reconciled.',
    timestamp: '2026-02-20T17:00:00Z', read: true,
  },
  {
    id: 'act-019', type: 'email', source: 'crm',
    title: 'Email received — Thompson referral details',
    description: 'James Thompson sent contact details for Dr. Amanda Pell.',
    entityType: 'client', entityId: 'cli-008', entityName: 'James Thompson',
    timestamp: '2026-02-20T14:30:00Z', read: true,
  },
  {
    id: 'act-020', type: 'system', source: 'crm',
    title: 'Reminder dismissed — Taylor CD maturity',
    description: 'CD maturity reminder for Nancy Taylor dismissed (already handled).',
    entityType: 'client', entityId: 'cli-018', entityName: 'Nancy Taylor',
    timestamp: '2026-02-20T16:00:00Z', read: true,
  },
]
