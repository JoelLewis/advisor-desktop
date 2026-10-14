import type { Account } from '@/types/account'
import type { PositionSeed } from '@/types/portfolio'
import type { Fill, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import type { ProposedTrade } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { seedPositionsForAccount } from '@/mocks/data/positions'
import { realizedSales, type RealizedSale } from '@/mocks/data/realized-sales'
import { bookOf, commitMove, ledgerFills, recordedSales, type AccountBook, type LedgerLot } from '@/mocks/data/portfolio-ledger'
import { seedTaxLots } from '@/mocks/handlers/custodian'
import { currencyForAccount } from '@/mocks/handlers/oms'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { convertCurrency } from '@/lib/currency'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { isDuringNyseSession } from '@/lib/trading-calendar'

/** A fill that would break the ledger's invariants. Nothing is committed when one is thrown. */
export class LedgerInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerInvariantError'
  }
}

const EPSILON = 1e-6
const cents = (v: number) => Math.round(v * 100) / 100
const pad4 = (n: number) => String(n).padStart(4, '0')

/** `times[i]` is the time of the i-th fill in fill order (sells first, then buys, each in the orders' order), not of `orders[i]`. */
export type FillInput = { accountId: string; proposalId: string; version: ProposalVersion; orders: readonly StagedOrder[]; times: readonly string[] }

type Take = { lotId: string; shares: number }
type Taken = Take & { lot: LedgerLot }

/** The account's book to move: the ledger's if the session has moved it, else the fixtures', copied. */
function bookToMove(account: Account): AccountBook {
  const moved = bookOf(account.id)
  if (moved) return { positions: moved.positions.map((p) => ({ ...p })), lots: moved.lots.map((l) => ({ ...l })) }
  return {
    positions: seedPositionsForAccount(account.id, account.totalValue).map(({ weight: _weight, ...seed }) => seed),
    lots: seedTaxLots(account.id, account.totalValue).map(({ repurchaseBlockedUntil: _until, ...lot }) => lot),
  }
}

/** A held position fills at its own mark (value per unit); anything else at its quote in the account's currency. */
function unitPrice(account: Account, held: PositionSeed | undefined, symbol: string): number {
  if (held && held.quantity > 0) return held.marketValue / held.quantity
  const quote = usdQuoteFor(symbol)
  if (!quote) throw new LedgerInvariantError(`There is no quote to fill ${symbol} in ${account.id}`)
  return convertCurrency(quote.price, 'USD', currencyForAccount(account.id), FX_RATES_USD_BASE)
}

/**
 * The lots a sell consumes: the approved version's specific identification when it names shares;
 * else the lots it names in sale order; else (an account whose sales are not taxed names none) the
 * position's own lots in the order the book holds them. A taxable sale that names no lots is
 * refused: the lots it sells set the tax, so they are never chosen for it here.
 */
function takesFor(account: Account, version: ProposalVersion, held: PositionSeed, quantity: number, lots: readonly LedgerLot[]): Take[] {
  const facts = version.legFacts.find((f) => f.symbol === held.symbol)
  if (!facts) throw new LedgerInvariantError(`v${version.n} records no lots for its ${held.symbol} sale`)
  if (facts.lots.length > 0) return facts.lots.map((t) => ({ lotId: t.lotId, shares: t.shares }))
  if (facts.lotIds.length === 0 && isTaxableAccount(account.taxTreatment)) {
    throw new LedgerInvariantError(`v${version.n} names no lots for its ${held.symbol} sale in ${account.id}, whose sales are taxed`)
  }
  const inSaleOrder = facts.lotIds.length > 0 ? facts.lotIds : lots.filter((l) => l.positionId === held.id).map((l) => l.id)
  let left = quantity
  return inSaleOrder.flatMap((lotId) => {
    if (left <= EPSILON) return []
    const lot = lots.find((l) => l.id === lotId)
    if (!lot) throw new LedgerInvariantError(`Lot ${lotId} was already consumed`)
    const shares = Math.min(left, lot.quantity)
    left -= shares
    return [{ lotId, shares }]
  })
}

/** Takes the shares from their lots: a lot emptied leaves the book, a lot partly taken keeps its basis pro rata. */
function consume(lots: readonly LedgerLot[], takes: readonly Take[], quantity: number, symbol: string): { lots: LedgerLot[]; taken: Taken[] } {
  const total = takes.reduce((s, t) => s + t.shares, 0)
  if (Math.abs(total - quantity) > EPSILON) throw new LedgerInvariantError(`The ${symbol} lots give ${total} shares for a ${quantity}-share fill`)
  const seen = new Set<string>()
  let next = [...lots]
  const taken = takes.map((t): Taken => {
    if (seen.has(t.lotId)) throw new LedgerInvariantError(`Lot ${t.lotId} is taken twice by one fill`)
    seen.add(t.lotId)
    const lot = next.find((l) => l.id === t.lotId)
    if (!lot) throw new LedgerInvariantError(`Lot ${t.lotId} was already consumed`)
    const remaining = lot.quantity - t.shares
    if (remaining < -EPSILON) throw new LedgerInvariantError(`Lot ${t.lotId} holds ${lot.quantity} shares; the fill takes ${t.shares}`)
    next = remaining <= EPSILON
      ? next.filter((l) => l.id !== lot.id)
      : next.map((l) => (l.id === lot.id ? { ...l, quantity: remaining, costBasis: cents(l.costBasis * (remaining / l.quantity)) } : l))
    return { ...t, lot }
  })
  return { lots: next, taken }
}

/** A position restated from its lots at a new value; its lots re-marked so their values sum to it. */
function restate(position: PositionSeed, lots: readonly LedgerLot[], quantity: number, marketValue: number): { position: PositionSeed; lots: LedgerLot[] } {
  const own = lots.filter((l) => l.positionId === position.id)
  const inLots = own.reduce((s, l) => s + l.quantity, 0)
  if (Math.abs(inLots - quantity) > EPSILON) throw new LedgerInvariantError(`${position.symbol}: the lots hold ${inLots} against a ${quantity} position`)
  const value = cents(marketValue)
  let allocated = 0
  const marked = new Map(own.map((l, i) => {
    const currentValue = i === own.length - 1 ? cents(value - allocated) : cents(value * (l.quantity / quantity))
    allocated += currentValue
    return [l.id, { ...l, currentValue, gainLoss: cents(currentValue - l.costBasis) }]
  }))
  const costBasis = cents(own.reduce((s, l) => s + l.costBasis, 0))
  const gainLoss = cents(value - costBasis)
  return {
    position: { ...position, quantity, marketValue: value, costBasis, gainLoss, gainLossPercent: costBasis > 0 ? gainLoss / costBasis : 0 },
    lots: lots.map((l) => marked.get(l.id) ?? l),
  }
}

function moveCash(positions: readonly PositionSeed[], delta: number): PositionSeed[] {
  return positions.map((p) => {
    if (p.symbol !== 'CASH') return p
    const value = cents(p.marketValue + delta)
    return { ...p, price: value, marketValue: value, costBasis: value, gainLoss: 0, gainLossPercent: 0 }
  })
}

/** One realized sale per holding period the sale touches, numbered from `firstNumber`; none in an account whose sales are not taxed. */
function realizedSalesOf(account: Account, fill: Fill, taken: readonly Taken[], trade: ProposedTrade, replacement: string | undefined, firstNumber: number): RealizedSale[] {
  if (!isTaxableAccount(account.taxTreatment)) return []
  const groups = (['short', 'long'] as const)
    .map((period) => ({ period, takes: taken.filter((t) => t.lot.holdingPeriod === period) }))
    .filter((g) => g.takes.length > 0)
  let proceedsLeft = fill.value
  return groups.map((g, i): RealizedSale => {
    const shares = g.takes.reduce((s, t) => s + t.shares, 0)
    const proceeds = i === groups.length - 1 ? cents(proceedsLeft) : cents(fill.value * (shares / fill.quantity))
    proceedsLeft -= proceeds
    const costBasis = cents(g.takes.reduce((s, t) => s + t.lot.costBasis * (t.shares / t.lot.quantity), 0))
    const realizedGainLoss = Math.round(proceeds - costBasis)
    const washed = g.period === 'short' ? trade.washedLoss?.shortTerm ?? 0 : trade.washedLoss?.longTerm ?? 0
    return {
      id: `rs-${String(firstNumber + i).padStart(3, '0')}`,
      accountId: account.id, householdId: account.householdId, symbol: fill.symbol, name: fill.name, saleDate: fill.at.slice(0, 10),
      quantity: shares, proceeds, costBasis, realizedGainLoss, holdingPeriod: g.period,
      ...(washed < 0 ? { washedLoss: washed } : {}),
      ...(replacement !== undefined && realizedGainLoss < 0 ? { replacementSymbol: replacement } : {}),
    }
  })
}

/**
 * Released orders fill at the frozen day's prices and move the account's book. Sells
 * settle first, then buys, each in the version's order. The move is committed whole, or — when any
 * invariant would break (a lot consumed twice, a share count that does not reconcile, a fill outside
 * the NYSE session, cash overdrawn) — not at all. Fill and sale numbers follow those already
 * committed, so a refused move numbers nothing.
 */
export function applyFills({ accountId, proposalId, version, orders, times }: FillInput): Fill[] {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new LedgerInvariantError(`There is no account ${accountId}`)
  if (times.length !== orders.length) throw new LedgerInvariantError(`${orders.length} orders were given ${times.length} fill times`)
  const outside = times.find((at) => !isDuringNyseSession(at))
  if (outside) throw new LedgerInvariantError(`A fill at ${outside} is outside the NYSE session`)
  const sequence = [...orders].sort((a, b) => Number(a.side === 'buy') - Number(b.side === 'buy'))
  let { positions, lots } = bookToMove(account)
  const valueBefore = positions.reduce((s, p) => s + p.marketValue, 0)
  const fills: Fill[] = []
  const sales: RealizedSale[] = []

  sequence.forEach((order, i) => {
    const at = times[i]
    if (at === undefined) throw new LedgerInvariantError(`No fill time for ${order.id}`)
    const trade = version.preview.trades.find((t) => t.symbol === order.symbol && t.side === order.side)
    if (!trade) throw new LedgerInvariantError(`${order.id} is not a leg of v${version.n}`)
    const held = positions.find((p) => p.symbol === order.symbol && p.symbol !== 'CASH')
    const price = unitPrice(account, held, order.symbol)
    const base = { id: `fill-${pad4(ledgerFills().length + fills.length + 1)}`, stagedOrderId: order.id, proposalId, version: version.n, accountId, symbol: order.symbol, name: trade.name, quantity: order.quantity, price, currency: order.currency, at }

    if (order.side === 'sell') {
      if (!held) throw new LedgerInvariantError(`${accountId} sells ${order.symbol} but holds none`)
      if (order.quantity > held.quantity + EPSILON) throw new LedgerInvariantError(`${accountId} sells ${order.quantity} ${order.symbol} but holds ${held.quantity}`)
      const whole = Math.abs(order.quantity - held.quantity) <= EPSILON
      const fill: Fill = { ...base, side: 'sell', value: whole ? held.marketValue : cents(order.quantity * price) }
      const consumed = consume(lots, takesFor(account, version, held, order.quantity, lots), order.quantity, order.symbol)
      lots = consumed.lots
      if (whole) {
        if (lots.some((l) => l.positionId === held.id)) throw new LedgerInvariantError(`${order.symbol} was sold whole but lots remain`)
        positions = positions.filter((p) => p.id !== held.id)
      } else {
        const restated = restate(held, lots, held.quantity - order.quantity, held.marketValue - fill.value)
        positions = positions.map((p) => (p.id === held.id ? restated.position : p))
        lots = restated.lots
      }
      const replacement = version.harvestSubstitutions.find((s) => s.harvested && s.foreclosed.symbol === order.symbol)?.bought.symbol
      sales.push(...realizedSalesOf(account, fill, consumed.taken, trade, replacement, realizedSales.length + recordedSales().length + sales.length + 1))
      positions = moveCash(positions, fill.value)
      fills.push(fill)
      return
    }

    const fill: Fill = { ...base, side: 'buy', value: cents(order.quantity * price) }
    const assetClass = held?.assetClass ?? usdQuoteFor(order.symbol)?.assetClass
    if (!assetClass) throw new LedgerInvariantError(`There is no asset class for ${order.symbol}`)
    const position: PositionSeed = held ?? {
      id: `pos-${accountId}-${order.symbol}`, accountId, symbol: order.symbol, name: trade.name, assetClass,
      quantity: 0, price, costBasis: 0, marketValue: 0, gainLoss: 0, gainLossPercent: 0,
    }
    lots = [...lots, {
      id: `lot-${position.id}-${fill.id}`, positionId: position.id, purchaseDate: at.slice(0, 10), quantity: order.quantity,
      costBasis: fill.value, currentValue: fill.value, gainLoss: 0, holdingPeriod: 'short',
    }]
    const restated = restate(position, lots, position.quantity + order.quantity, position.marketValue + fill.value)
    lots = restated.lots
    positions = held
      ? positions.map((p) => (p.id === held.id ? restated.position : p))
      : [...positions.filter((p) => p.symbol !== 'CASH'), restated.position, ...positions.filter((p) => p.symbol === 'CASH')]
    positions = moveCash(positions, -fill.value)
    fills.push(fill)
  })

  const valueAfter = positions.reduce((s, p) => s + p.marketValue, 0)
  if (Math.abs(valueAfter - valueBefore) > 0.01 * Math.max(1, fills.length)) {
    throw new LedgerInvariantError(`${accountId}'s value moved from ${valueBefore} to ${valueAfter}; fills move money between holdings, never in or out`)
  }
  const ids = lots.map((l) => l.id)
  if (new Set(ids).size !== ids.length) throw new LedgerInvariantError(`${accountId} holds a lot twice`)
  const cash = positions.find((p) => p.symbol === 'CASH')
  if (!cash) throw new LedgerInvariantError(`${accountId} has no cash position for its fills to settle through`)
  if (cash.marketValue < -0.01) throw new LedgerInvariantError(`${accountId}'s fills would overdraw its cash to ${cash.marketValue}`)
  commitMove(accountId, { positions, lots }, sales, fills)
  return fills
}
