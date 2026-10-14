import type { Order } from '@/services/oms'
import type { StagedOrder } from '@/types/workspace-proposal'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { BlotterFilters, BlotterRow, BlotterStatus, BlotterView } from '@/types/reference-blotter'
import { accounts } from '@/mocks/data/accounts'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { proposalById } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { currencyForAccount, orders } from '@/mocks/handlers/oms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { MOCK_NOW_ISO } from '@/lib/clock'

const BUY_SIDES: ReadonlySet<string> = new Set(['buy', 'purchase', 'buy_to_open', 'buy_to_close', 'buy_to_cover'])
const SELL_SIDES: ReadonlySet<string> = new Set(['sell', 'redemption', 'sell_short', 'sell_to_open', 'sell_to_close'])
const TICKET_STATUS: Readonly<Record<Order['status'], BlotterStatus>> = { pending: 'working', submitted: 'working', filled: 'filled', cancelled: 'cancelled' }
const STAGED_STATUS: Readonly<Record<StagedOrder['status'], BlotterStatus>> = {
  pending_compliance: 'pending_compliance', filled: 'filled', withdrawn: 'withdrawn', returned: 'returned',
}

function accountName(id: string): string {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`An order names no account ${id}`)
  return account.name
}

function sideOf(order: Order): 'buy' | 'sell' {
  if (BUY_SIDES.has(order.side)) return 'buy'
  if (SELL_SIDES.has(order.side)) return 'sell'
  throw new Error(`Ticket ${order.id} has a side the blotter cannot read: ${order.side}`)
}

/** Quantity × price; a bond's is par × price ÷ 100; an option's is contracts × price × its multiplier. */
function ticketValue(order: Order): number | undefined {
  if (order.status !== 'filled' || order.filledPrice === undefined) return undefined
  if (order.assetClass === 'fixed_income') {
    if (order.parAmount === undefined) throw new Error(`Bond ticket ${order.id} names no par amount`)
    return (order.parAmount * order.filledPrice) / 100
  }
  if (order.assetClass === 'option') {
    if (order.contractMultiplier === undefined) throw new Error(`Option ticket ${order.id} names no multiplier`)
    return order.filledQuantity * order.filledPrice * order.contractMultiplier
  }
  return order.filledQuantity * order.filledPrice
}

function ticketRow(order: Order): BlotterRow {
  const status = TICKET_STATUS[order.status]
  const price = status === 'filled' ? order.filledPrice : order.limitPrice
  const value = ticketValue(order)
  return {
    id: order.id, accountId: order.accountId, accountName: accountName(order.accountId), symbol: order.symbol, side: sideOf(order), quantity: order.quantity,
    ...(price !== undefined ? { price, priceKind: status === 'filled' ? 'fill' as const : 'limit' as const } : {}),
    ...(value !== undefined ? { value } : {}),
    currency: currencyForAccount(order.accountId), status, source: { kind: 'ticket' }, submittedAt: order.submittedAt,
    ...(order.filledAt ? { filledAt: order.filledAt } : {}),
  }
}

function stagedRow(o: StagedOrder): BlotterRow {
  const proposal = proposalById(o.proposalId)
  if (!proposal) throw new Error(`Staged order ${o.id} names no proposal ${o.proposalId}`)
  const fill = o.status === 'filled' ? ledgerFills().find((f) => f.stagedOrderId === o.id) : undefined
  if (o.status === 'filled' && !fill) throw new Error(`${o.id} is filled with no fill on the ledger`)
  return {
    id: o.id, accountId: o.accountId, accountName: accountName(o.accountId), symbol: o.symbol, side: o.side, quantity: o.quantity,
    ...(fill ? { price: fill.price, priceKind: 'fill' as const, value: fill.value, filledAt: fill.at } : {}),
    currency: o.currency, status: STAGED_STATUS[o.status],
    source: { kind: 'proposal', proposalId: proposal.id, title: proposal.title, version: o.version, threadId: proposal.threadId },
    recId: o.closedByActId ?? o.approvalActId, submittedAt: o.stagedAt,
  }
}

function allRows(): BlotterRow[] {
  return [...orders.map(ticketRow), ...store().staged.map(stagedRow)].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || a.id.localeCompare(b.id))
}

const METHODS: readonly MethodNote[] = [
  { label: 'Orders', modeled: false, text: "Tickets are the order management system's orders. Proposal orders are those staged from an approved version in this session, released by compliance and filled at the day's prices." },
  { label: 'Status', modeled: false, text: 'Working: with the market, not yet filled. Pending compliance: staged from an approval, waiting for release. Withdrawn, returned and canceled orders closed without a fill.' },
  { label: 'Record', modeled: false, text: 'REC is the binding act that closed the order (the release, the return or the withdrawal) or, while it waits, the approval it was staged from.' },
  { label: 'Value', modeled: false, text: "A fill's value is quantity times fill price; a bond's is par times price; an option's is contracts times price times its multiplier. A working order's price is its limit." },
]

export function blotterView(viewerId: string, filters: BlotterFilters): BlotterView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const all = allRows()
  const day = (r: BlotterRow) => r.submittedAt.slice(0, 10)
  const rows = all.filter((r) => (filters.status === undefined || r.status === filters.status)
    && (filters.accountId === undefined || r.accountId === filters.accountId)
    && (filters.since === undefined || day(r) >= filters.since)
    && (filters.until === undefined || day(r) <= filters.until))
  const named = new Map(all.map((r) => [r.accountId, r.accountName]))
  return {
    asOf: MOCK_NOW_ISO, filters, rows,
    accounts: [...named].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    days: [...new Set(all.map(day))].sort(),
    methods: [...METHODS],
  }
}

const STATUS_WORDS: Readonly<Record<BlotterStatus, string>> = {
  working: 'working', pending_compliance: 'pending compliance', filled: 'filled', cancelled: 'canceled', withdrawn: 'withdrawn', returned: 'returned to the advisor',
}

export function blotterQuote(rowId: string): RowQuote | undefined {
  const r = allRows().find((x) => x.id === rowId)
  if (!r) return undefined
  const source = r.source.kind === 'proposal' ? `${r.source.title} v${r.source.version}${r.recId ? `, ${r.recId}` : ''}` : `order management ticket ${r.id}`
  return {
    view: 'blotter', rowId: r.id, subject: { type: 'account', id: r.accountId }, threadTitle: `Orders · ${r.accountName}`,
    claim: `${r.side === 'buy' ? 'A buy' : 'A sale'} of ${r.symbol} in ${r.accountName}: ${STATUS_WORDS[r.status]}.`,
    figures: [
      { label: 'Quantity', value: r.quantity, unit: 'sh', source: 'blotter.rows.quantity' },
      ...(r.value !== undefined && r.currency === 'USD' ? [{ label: 'Value', value: r.value, unit: 'USD' as const, source: 'blotter.rows.value' }] : []),
    ],
    citations: [{ source: `Blotter · ${source}`, asOf: r.filledAt ?? r.submittedAt }],
  }
}
