import type { Account } from '@/types/account'
import type { AssetClass, Position } from '@/types/portfolio'
import type { HeldAwayAsset } from '@/types/held-away'
import type { Order } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { cashBalanceOf, getPositionsForAccount, seedPositionsForAccount } from '@/mocks/data/positions'
import { allRealizedSales, openWashSaleWindows, type OpenWashSaleWindow, type RealizedSale } from '@/mocks/data/realized-sales'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { orderBook, sessionNow } from '@/mocks/data/workspace-store'
import { generateTaxLots, type CustodianLot } from '@/mocks/handlers/custodian'
import { currencyForAccount, orders } from '@/mocks/handlers/oms'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { convertCurrency, convertToBase } from '@/lib/currency'
import { easternDayOf } from '@/lib/eastern-day'

/**
 * The one household ledger every agent, letter and screen reads: positions and lots per account, held-away
 * accounts, open orders, the day's fills, realized sales and their wash-sale windows, and cash. A view over the
 * session portfolio ledger, the OMS tickets and the staged proposal orders; it stores nothing.
 */

export type QuantityUnit = 'sh' | 'contracts' | 'par'
/** Where an order or a fill comes from: an OMS ticket, or an order staged from an approved proposal version. */
export type LedgerSource = { kind: 'ticket'; orderId: string } | { kind: 'proposal'; stagedOrderId: string; proposalId: string; version: number }

/**
 * An order not yet filled: a working OMS ticket, or a proposal's order waiting for compliance to release it.
 * `estimatedValue` is what it would move between the holding and cash, in the account's currency: a limit order at
 * its limit, a market order at the holding's price or the quote, a proposal's order at its estimate.
 */
export type OpenOrder = {
  id: string; accountId: string; symbol: string; assetClass: AssetClass; side: 'buy' | 'sell'
  quantity: number; quantityUnit: QuantityUnit; status: 'working' | 'pending_compliance'
  estimatedValue: number; limitPrice?: number; enteredAt: string; source: LedgerSource
}
export type LedgerFill = {
  id: string; accountId: string; symbol: string; assetClass: AssetClass; side: 'buy' | 'sell'
  quantity: number; quantityUnit: QuantityUnit; price: number; value: number; at: string; source: LedgerSource
}
/** One account as the ledger reads it on `day`: `fillsOnDay` are that New York day's fills. */
export type AccountLedger = { account: Account; positions: Position[]; lots: CustodianLot[]; cash: number; openOrders: OpenOrder[]; fillsOnDay: LedgerFill[] }
export type HouseholdLedger = {
  householdId: string
  /** The session clock when it was read. */
  asOf: string
  /** The New York day `fillsOnDay` and `washWindows` are read for. */
  day: string
  accounts: AccountLedger[]
  heldAway: HeldAwayAsset[]
  openOrders: OpenOrder[]
  fillsOnDay: LedgerFill[]
  realizedSales: RealizedSale[]
  washWindows: OpenWashSaleWindow[]
  /** Every account's cash, converted to USD. */
  cashUsd: number
}

const BUY_SIDES: ReadonlySet<string> = new Set(['buy', 'purchase', 'buy_to_open', 'buy_to_close', 'buy_to_cover'])
const SELL_SIDES: ReadonlySet<string> = new Set(['sell', 'redemption', 'sell_short', 'sell_to_open', 'sell_to_close'])
const WORKING: ReadonlySet<Order['status']> = new Set(['pending', 'submitted'])

export function ticketSide(order: Order): 'buy' | 'sell' {
  if (BUY_SIDES.has(order.side)) return 'buy'
  if (SELL_SIDES.has(order.side)) return 'sell'
  throw new Error(`Ticket ${order.id} has a side the ledger cannot read: ${order.side}`)
}

/** An option ticket counts contracts and a bond ticket states par; everything else is shares. */
export function ticketQuantity(order: Order): { quantity: number; quantityUnit: QuantityUnit } {
  if (order.assetClass === 'option') return { quantity: order.quantity, quantityUnit: 'contracts' }
  if (order.assetClass === 'fixed_income') {
    if (order.parAmount === undefined) throw new Error(`Bond ticket ${order.id} names no par amount`)
    return { quantity: order.parAmount, quantityUnit: 'par' }
  }
  return { quantity: order.quantity, quantityUnit: 'sh' }
}

/** A price times what it buys: a bond's is par × price ÷ 100; an option's is contracts × price × its multiplier. */
function valueAt(order: Order, price: number, quantity: number): number {
  if (order.assetClass === 'fixed_income') {
    if (order.parAmount === undefined) throw new Error(`Bond ticket ${order.id} names no par amount`)
    return (order.parAmount * price) / 100
  }
  if (order.assetClass === 'option') {
    if (order.contractMultiplier === undefined) throw new Error(`Option ticket ${order.id} names no multiplier`)
    return quantity * price * order.contractMultiplier
  }
  return quantity * price
}

/** A filled ticket's value at its fill price; none for a ticket that did not fill. */
export function ticketValue(order: Order): number | undefined {
  if (order.status !== 'filled' || order.filledPrice === undefined) return undefined
  return valueAt(order, order.filledPrice, order.filledQuantity)
}

function accountOf(accountId: string): Account {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`No account ${accountId}`)
  return account
}

/** The class a symbol belongs to in this account: as held, as the fixtures held it, as quoted, or (an option) its underlying's. */
function assetClassIn(account: Account, symbol: string, positions: readonly Position[], underlying?: string): AssetClass {
  const of = (s: string) => positions.find((p) => p.symbol === s)?.assetClass
    ?? seedPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === s)?.assetClass
    ?? usdQuoteFor(s)?.assetClass
  const found = of(symbol) ?? (underlying === undefined ? undefined : of(underlying))
  if (!found) throw new Error(`The ledger has no asset class for ${symbol} in ${account.id}`)
  return found
}

function workingValue(order: Order, positions: readonly Position[]): number {
  const held = positions.find((p) => p.symbol === order.symbol)?.price
  const quoted = usdQuoteFor(order.symbol)?.price
  const price = order.limitPrice ?? held ?? (quoted === undefined ? undefined : convertCurrency(quoted, 'USD', currencyForAccount(order.accountId), FX_RATES_USD_BASE))
  if (price === undefined) throw new Error(`Working ticket ${order.id} has no limit and no quote for ${order.symbol}`)
  return valueAt(order, price, order.quantity)
}

function openOrdersOf(account: Account, positions: readonly Position[]): OpenOrder[] {
  const tickets = orders.filter((o) => o.accountId === account.id && WORKING.has(o.status)).map((o): OpenOrder => ({
    id: o.id, accountId: o.accountId, symbol: o.symbol, assetClass: assetClassIn(account, o.symbol, positions, o.underlying),
    side: ticketSide(o), ...ticketQuantity(o), status: 'working', estimatedValue: workingValue(o, positions),
    ...(o.limitPrice !== undefined ? { limitPrice: o.limitPrice } : {}), enteredAt: o.submittedAt, source: { kind: 'ticket', orderId: o.id },
  }))
  const staged = orderBook().staged.filter((o) => o.accountId === account.id && o.status === 'pending_compliance').map((o): OpenOrder => ({
    id: o.id, accountId: o.accountId, symbol: o.symbol, assetClass: assetClassIn(account, o.symbol, positions),
    side: o.side, quantity: o.quantity, quantityUnit: 'sh', status: 'pending_compliance', estimatedValue: o.estimatedValue,
    enteredAt: o.stagedAt, source: { kind: 'proposal', stagedOrderId: o.id, proposalId: o.proposalId, version: o.version },
  }))
  return [...tickets, ...staged].sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || a.id.localeCompare(b.id))
}

function fillsOn(account: Account, positions: readonly Position[], day: string): LedgerFill[] {
  const tickets = orders.filter((o) => o.accountId === account.id && o.status === 'filled' && o.filledAt !== undefined && easternDayOf(o.filledAt) === day).map((o): LedgerFill => {
    const value = ticketValue(o)
    if (value === undefined || o.filledPrice === undefined || o.filledAt === undefined) throw new Error(`Filled ticket ${o.id} states no fill`)
    return {
      id: o.id, accountId: o.accountId, symbol: o.symbol, assetClass: assetClassIn(account, o.symbol, positions, o.underlying), side: ticketSide(o), ...ticketQuantity(o),
      price: o.filledPrice, value, at: o.filledAt, source: { kind: 'ticket', orderId: o.id },
    }
  })
  const released = ledgerFills().filter((f) => f.accountId === account.id && easternDayOf(f.at) === day).map((f): LedgerFill => ({
    id: f.id, accountId: f.accountId, symbol: f.symbol, assetClass: assetClassIn(account, f.symbol, positions), side: f.side, quantity: f.quantity, quantityUnit: 'sh',
    price: f.price, value: f.value, at: f.at, source: { kind: 'proposal', stagedOrderId: f.stagedOrderId, proposalId: f.proposalId, version: f.version },
  }))
  return [...tickets, ...released].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
}

const sessionDay = (): string => easternDayOf(sessionNow())

export function accountLedger(accountId: string, day: string = sessionDay()): AccountLedger {
  const account = accountOf(accountId)
  const positions = getPositionsForAccount(account.id, account.totalValue)
  return {
    account, positions, lots: generateTaxLots(account.id, account.totalValue), cash: cashBalanceOf(account),
    openOrders: openOrdersOf(account, positions), fillsOnDay: fillsOn(account, positions, day),
  }
}

export function householdLedger(householdId: string, day: string = sessionDay()): HouseholdLedger {
  if (!householdFixtures.some((h) => h.id === householdId)) throw new Error(`No household ${householdId}`)
  const own = accounts.filter((a) => a.householdId === householdId).map((a) => accountLedger(a.id, day))
  return {
    householdId, asOf: sessionNow(), day, accounts: own,
    heldAway: heldAwayAssets.filter((h) => h.householdId === householdId),
    openOrders: own.flatMap((a) => a.openOrders).sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || a.id.localeCompare(b.id)),
    fillsOnDay: own.flatMap((a) => a.fillsOnDay).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)),
    realizedSales: allRealizedSales().filter((s) => s.householdId === householdId),
    washWindows: openWashSaleWindows(day, householdId),
    cashUsd: own.reduce((s, a) => s + convertToBase(a.cash, currencyForAccount(a.account.id), FX_RATES_USD_BASE), 0),
  }
}

/** An open order as a proposal counts it: what it moves once filled. `name` is the holding's or the quote's, when either names it. */
type WorkingMove = {
  orderId: string; symbol: string; name?: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; assetClass: AssetClass; limitPrice?: number
}

/**
 * The open orders a proposal for this account counts as filled: every working ticket, and every other proposal's
 * orders pending compliance release. A proposal's own pending orders are its legs, so `exceptProposalId` leaves them out.
 */
export function workingMovesOf(accountId: string, exceptProposalId?: string): WorkingMove[] {
  const { positions, openOrders } = accountLedger(accountId)
  return openOrders
    .filter((o) => !(o.source.kind === 'proposal' && o.source.proposalId === exceptProposalId))
    .map((o) => {
      const name = positions.find((p) => p.symbol === o.symbol)?.name ?? usdQuoteFor(o.symbol)?.name
      return {
        orderId: o.id, symbol: o.symbol, ...(name !== undefined ? { name } : {}), side: o.side, quantity: o.quantity,
        estimatedValue: o.estimatedValue, assetClass: o.assetClass, ...(o.limitPrice !== undefined ? { limitPrice: o.limitPrice } : {}),
      }
    })
}
