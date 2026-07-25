import { http, HttpResponse } from 'msw'
import type { Order, RebalancePreview, ProposedTrade, ComplianceCheck, TradeRequest, PreTradeCheckRequest, PreTradeViolation } from '@/services/oms'
import { notFound } from './utils'
import { RESTRICTED_SECURITIES, CASH_MINIMUM_PCT } from './compliance'
import { computeDriftForAccount } from './pms'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { openWashSaleWindows } from '../data/realised-sales'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { generateTaxLots } from './custodian'
import { taxRateFor } from '@/features/portfolios/tax/shared'
import type { Position } from '@/types/portfolio'

/** Pooled/individual tech names used by the sector-concentration check below. */
const TECH_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA']
const SECTOR_LIMIT = 0.40

const orders: Order[] = [
  // ── Recent orders for Johnson Family Trust (acc-001) ──
  { id: 'ord-001', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 150, orderType: 'market', status: 'filled', filledQuantity: 150, filledPrice: 268.35, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:02Z', assetClass: 'equity' },
  { id: 'ord-002', accountId: 'acc-001', symbol: 'AGG', side: 'buy', quantity: 500, orderType: 'market', status: 'filled', filledQuantity: 500, filledPrice: 98.42, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:01Z', assetClass: 'equity' },
  { id: 'ord-003', accountId: 'acc-001', symbol: 'NVDA', side: 'sell', quantity: 25, orderType: 'limit', limitPrice: 785.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:31:00Z', assetClass: 'equity' },

  // ── Robert Johnson Individual (acc-002) ──
  // D28 — this fill is the same event as rs-001, so it prices at rs-001's $142,250 / 5,000 shares
  // and acc-002's INTC position now shows the 7,000 shares left after it.
  { id: 'ord-004', accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, orderType: 'market', status: 'filled', filledQuantity: 5000, filledPrice: 28.45, submittedAt: '2026-02-21T10:15:00Z', filledAt: '2026-02-21T10:15:03Z', assetClass: 'equity' },
  { id: 'ord-005', accountId: 'acc-002', symbol: 'QQQ', side: 'buy', quantity: 200, orderType: 'limit', limitPrice: 480.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:35:00Z', assetClass: 'equity' },

  // ── Chen Irrevocable Trust (acc-006) ──
  { id: 'ord-006', accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 800, orderType: 'market', status: 'filled', filledQuantity: 800, filledPrice: 268.40, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:04Z', assetClass: 'equity' },
  { id: 'ord-007', accountId: 'acc-006', symbol: 'TLT', side: 'sell', quantity: 300, orderType: 'market', status: 'filled', filledQuantity: 300, filledPrice: 95.65, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:02Z', assetClass: 'equity' },

  // ── David Williams Individual (acc-011) ──
  { id: 'ord-008', accountId: 'acc-011', symbol: 'SPY', side: 'buy', quantity: 100, orderType: 'market', status: 'submitted', filledQuantity: 0, submittedAt: '2026-02-25T10:00:00Z', assetClass: 'equity' },
  { id: 'ord-009', accountId: 'acc-011', symbol: 'BND', side: 'sell', quantity: 200, orderType: 'market', status: 'cancelled', filledQuantity: 0, submittedAt: '2026-02-24T15:45:00Z', assetClass: 'equity' },

  // ── Michael Martinez Individual (acc-015) ──
  { id: 'ord-010', accountId: 'acc-015', symbol: 'EFA', side: 'buy', quantity: 350, orderType: 'limit', limitPrice: 81.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:45:00Z', assetClass: 'equity' },
  { id: 'ord-011', accountId: 'acc-015', symbol: 'GLD', side: 'sell', quantity: 50, orderType: 'market', status: 'filled', filledQuantity: 50, filledPrice: 215.80, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:01Z', assetClass: 'equity' },
  { id: 'ord-012', accountId: 'acc-015', symbol: 'VNQ', side: 'buy', quantity: 200, orderType: 'market', status: 'filled', filledQuantity: 200, filledPrice: 89.15, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:02Z', assetClass: 'equity' },

  // ── Multi-asset orders ──
  // D26 — a mutual fund order cannot fill at 11:00 ET. Rule 22c-1 requires forward pricing at the
  // next computed NAV, which for VFIAX is 4:00 PM ET (21:00Z), and a $25,000 dollar-amount purchase
  // buys $25,000 / $465.32 shares, not the placeholder 1.
  //
  // 53.72647 — five decimals, because no shorter rounding reconciles: 53.73 multiplies out to
  // $25,001.64, and 53.727 to $25,000.25, while 53.72647 x 465.32 = $25,000.00103, which agrees with
  // `dollarAmount` to the cent. Fractional-share precision beyond the three decimals retail
  // statements usually display is a settlement-layer detail; the arithmetic is the reason here, not
  // a claim about any particular clearing system's record layout.
  { id: 'ord-013', accountId: 'acc-001', symbol: 'VFIAX', side: 'purchase', quantity: 53.72647, orderType: 'market', status: 'filled', filledQuantity: 53.72647, filledPrice: 465.32, submittedAt: '2026-02-23T15:00:00Z', filledAt: '2026-02-23T21:00:00Z', assetClass: 'mutual_fund', dollarAmount: 25000, amountType: 'dollars' },
  { id: 'ord-014', accountId: 'acc-002', symbol: 'UST-10Y', side: 'buy', quantity: 50, orderType: 'limit', limitPrice: 95.25, status: 'filled', filledQuantity: 50, filledPrice: 95.20, submittedAt: '2026-02-22T10:30:00Z', filledAt: '2026-02-22T10:30:05Z', assetClass: 'fixed_income', parAmount: 50000, bondPriceType: 'price', priceOrYield: 95.25 },
  // D27 — spot BTC settled into acc-002, a Schwab brokerage that can only hold the IBIT and ETHE
  // ETFs. It belongs in acc-045, the Coinbase account that actually custodies coins, and at the one
  // BTC price the app knows.
  { id: 'ord-015', accountId: 'acc-045', symbol: 'BTC', side: 'buy', quantity: 0.25, orderType: 'market', status: 'filled', filledQuantity: 0.25, filledPrice: 87_450.00, submittedAt: '2026-02-21T14:15:00Z', filledAt: '2026-02-21T14:15:01Z', assetClass: 'digital_asset', fractionalQuantity: true },
  { id: 'ord-016', accountId: 'acc-006', symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, orderType: 'limit', limitPrice: 8.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T11:00:00Z', assetClass: 'option', underlying: 'AAPL', optionType: 'call', strikePrice: 185, expirationDate: '2026-03-21', contractMultiplier: 100 },
]

/** Roth IRAs and tax-deferred accounts realise no reportable capital gain on a sale. */
function isTaxableAccount(taxTreatment: string): boolean {
  return taxTreatment === 'taxable' || taxTreatment === 'trust_taxable'
}

/**
 * Estimate the capital-gains tax on selling `notional` dollars out of `target`, using the same
 * per-lot generator the tax page reads (`generateTaxLots`) and the same rate function
 * (`taxRateFor`) it applies — a short-term-heavy sell is taxed at `SHORT_TERM_RATE` (37%), not
 * silently at the long-term rate (23.8%) for the entire position. A tax-aware pass sells the
 * lowest-gain-fraction (highest cost basis) lots first to minimise realised gain; a tax-unaware
 * pass sells the lots in their own oldest-first order.
 */
function estimateSaleTax(accountId: string, totalValue: number, target: Position, notional: number, taxAware: boolean): number {
  const lots = generateTaxLots(accountId, totalValue).filter((l) => l.positionId === target.id)
  if (lots.length === 0 || notional <= 0) return 0
  // Minimise realised gain and rank by *tax per dollar sold*, not gain per dollar sold: a
  // low-gain short-term lot (37% rate) can carry more tax than a low-gain long-term lot (23.8%
  // rate), so sorting by gain fraction alone can pick a worse-taxed lot first.
  const taxPerDollar = (l: (typeof lots)[number]) => (l.gainLoss / l.currentValue) * taxRateFor(l.holdingPeriod)
  const ordered = taxAware ? [...lots].sort((a, b) => taxPerDollar(a) - taxPerDollar(b)) : lots

  let remaining = notional
  let tax = 0
  for (const lot of ordered) {
    if (remaining <= 0 || lot.currentValue <= 0) continue
    const portion = Math.min(1, remaining / lot.currentValue)
    const realisedGain = lot.gainLoss * portion
    if (realisedGain > 0) tax += realisedGain * taxRateFor(lot.holdingPeriod)
    remaining -= lot.currentValue * portion
  }
  return Math.max(0, Math.round(tax))
}

/**
 * C26 · rebalancing / tax-efficiency — `taxImpact: taxAware ? 3_800 : 0` made the riskier setting
 * display as free. Tax is estimated per-lot from the account's actual embedded gains at the
 * lot's own holding-period rate, so a tax-unaware rebalance realises MORE than a tax-aware one,
 * never zero — and a Roth IRA or traditional IRA (`isTaxableAccount`) shows zero, always.
 *
 * Trades come from the account's own drift (`computeDriftForAccount`, the same function the
 * drift surface reads) filtered by the caller's own `driftThreshold` (the Rebalance page's
 * control), not a hardcoded 0.005. `d.actual > d.target` — not `d.drift`, which
 * `computeDriftForAccount` already returns as an unsigned magnitude — is what tells an
 * overweight asset class (sell) from an underweight one (buy).
 *
 * Fix round 3 — self-financing applies to the **sell** side only, and only to avoid stranding
 * proceeds that have nowhere to go: `sellScale` caps sells at what the buy side can actually
 * absorb, which correctly falls to **zero** — propose nothing — when there is nothing to buy at
 * all (`totalBuy === 0`; round 2's `totalBuy > 0 &&` guard left this branch unscaled instead,
 * which read as a short sale in a long-only demo on the account's proxy holding for an asset
 * class it's overweight but can't rebalance out of). Buys are **never** capped: an account draws
 * on its own cash reserve to fund a purchase, exactly as it always could — capping buys to match
 * sells (round 2's `buyScale`) needlessly shrank purchases an account had ample cash to make
 * outright, leaving both the overweight-cash and the underweight-target gaps uncorrected.
 *
 * A sell also never exceeds the position actually held (`Math.min(rawNotional,
 * target.marketValue)`) — long-only, no short sales, even before self-financing scaling: the
 * asset-class drift can imply selling more than any one proxy position is worth.
 */
function generateRebalanceTrades(accountId: string, taxAware: boolean, driftThreshold = 0.005): ProposedTrade[] {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return []
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account)
  const taxable = isTaxableAccount(account.taxTreatment)

  const raw = drift.assetClassDrifts
    .filter((d) => d.drift > driftThreshold)
    .flatMap((d) => {
      const candidates = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH')
      const target = candidates[0]
      if (!target) return []
      const side: 'buy' | 'sell' = d.actual > d.target ? 'sell' : 'buy'
      const rawNotional = d.drift * account.totalValue
      const notional = side === 'sell' ? Math.min(rawNotional, target.marketValue) : rawNotional
      return [{ target, side, notional }]
    })

  const totalSell = raw.filter((t) => t.side === 'sell').reduce((s, t) => s + t.notional, 0)
  const totalBuy = raw.filter((t) => t.side === 'buy').reduce((s, t) => s + t.notional, 0)
  const sellScale = totalSell > 0 ? Math.min(1, totalBuy / totalSell) : 1

  return raw
    .map(({ target, side, notional: rawNotional }) => {
      const notional = side === 'sell' ? rawNotional * sellScale : rawNotional
      const taxImpact = side === 'sell' && taxable
        ? estimateSaleTax(account.id, account.totalValue, target, notional, taxAware)
        : 0
      return {
        symbol: target.symbol,
        name: target.name,
        side,
        quantity: Math.round(notional / target.price),
        estimatedValue: Math.round(notional),
        taxImpact,
        washSaleRisk: false,
      }
    })
    .filter((t) => t.estimatedValue > 0)
}

function generateComplianceChecks(): ComplianceCheck[] {
  return [
    { rule: 'Concentration limit (10% single name)', status: 'pass', message: 'No single position exceeds 10% of portfolio' },
    { rule: 'Restricted securities list', status: 'pass', message: 'No restricted securities in proposed trades' },
    { rule: 'Cash reserve minimum (2%)', status: 'pass', message: 'Post-trade cash balance meets minimum reserve' },
    { rule: 'Wash sale (61-day window)', status: 'warning', message: 'VTI sold within 30 days of purchase — verify no wash sale' },
  ]
}

export const omsHandlers = [
  http.get('/api/oms/orders', ({ request }) => {
    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId')
    const status = url.searchParams.get('status')
    const assetClass = url.searchParams.get('assetClass')

    let filtered = orders
    if (accountId) filtered = filtered.filter((o) => o.accountId === accountId)
    if (status) filtered = filtered.filter((o) => o.status === status)
    if (assetClass) filtered = filtered.filter((o) => o.assetClass === assetClass)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/oms/orders/:orderId', ({ params }) => {
    const order = orders.find((o) => o.id === params.orderId)
    if (!order) return notFound()
    return HttpResponse.json(order)
  }),

  http.post('/api/oms/orders', async ({ request }) => {
    const body = await request.json() as TradeRequest
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      accountId: body.accountId,
      symbol: body.symbol,
      side: body.side,
      quantity: body.quantity,
      orderType: body.orderType,
      limitPrice: body.limitPrice,
      stopPrice: body.stopPrice,
      status: 'submitted',
      filledQuantity: 0,
      submittedAt: new Date().toISOString(),
      assetClass: body.assetClass,
      timeInForce: body.timeInForce,
      extendedHours: body.extendedHours,
      underlying: body.underlying,
      optionType: body.optionType,
      strikePrice: body.strikePrice,
      expirationDate: body.expirationDate,
      contractMultiplier: body.contractMultiplier,
      amountType: body.amountType,
      dollarAmount: body.dollarAmount,
      exchangeTargetSymbol: body.exchangeTargetSymbol,
      parAmount: body.parAmount,
      bondPriceType: body.bondPriceType,
      priceOrYield: body.priceOrYield,
      fractionalQuantity: body.fractionalQuantity,
      estimatedValue: body.estimatedValue,
      commission: body.commission,
    }
    orders.push(newOrder)
    return HttpResponse.json(newOrder, { status: 201 })
  }),

  // Pre-trade compliance check
  http.post('/api/oms/orders/pre-check', async ({ request }) => {
    const body = await request.json() as PreTradeCheckRequest
    const violations: PreTradeViolation[] = []
    const sym = body.symbol.toUpperCase()

    // C28 · pre-trade-compliance / order-lifecycle — notional is required and must be a real,
    // positive amount. Zero and negative values are finite too, and a zero-notional order would
    // otherwise pass every check with an affirmative "compliant" result.
    if (typeof body.estimatedValue !== 'number' || !Number.isFinite(body.estimatedValue) || body.estimatedValue <= 0) {
      return HttpResponse.json(
        { error: 'estimatedValue (notional) must be a positive number for a pre-trade check' },
        { status: 400 },
      )
    }
    const estValue = body.estimatedValue

    const account = accounts.find((a) => a.id === body.accountId)
    if (!account) return notFound()
    // C27 · pre-trade-compliance — the account's own market value, in the account's own base
    // currency, not a hardcoded $2,500,000. `accountValueUSD` would mix a USD-converted
    // denominator against `positions`' native-currency `marketValue`/`cashBalance`, inflating
    // every weight in the four non-USD accounts by their FX rate (acc-041 HKD by ~7.8x).
    const accountValue = account.totalValue
    const positions = getPositionsForAccount(account.id, account.totalValue)
    const existingPosition = positions.find((p) => p.symbol === sym)
    const existing = existingPosition?.marketValue ?? 0

    // C23 · diversification — per-kind limit (single-issuer / fund / cash), not a blanket 10%.
    const kind = securityKind(sym, existingPosition?.assetClass ?? 'us_equity')
    const limit = concentrationLimitFor(kind)
    const isBuy = body.side.startsWith('buy') || body.side === 'purchase'
    const postTradeWeight = (existing + (isBuy ? estValue : -estValue)) / accountValue

    if (postTradeWeight > limit * 0.8) {
      violations.push({
        constraint: kind === 'single_name' ? 'Single-issuer concentration limit' : 'Pooled-vehicle concentration limit',
        severity: postTradeWeight > limit ? 'block' : 'warning',
        currentValue: `${(postTradeWeight * 100).toFixed(1)}%`,
        limit: `${(limit * 100).toFixed(1)}%`,
        message: `${sym} would be ${(postTradeWeight * 100).toFixed(1)}% of this account against a ${(limit * 100).toFixed(1)}% IPS limit.`,
      })
    }

    // Restricted securities check — D29: one list, shared with the pre-trade compliance engine.
    if (RESTRICTED_SECURITIES.has(sym)) {
      violations.push({
        constraint: 'Restricted securities list',
        severity: 'block',
        currentValue: sym,
        limit: 'Not permitted',
        message: `${sym} is on the firm restricted securities list. Trading is prohibited.`,
      })
    }

    // Wash sale check — derived from the household's actual realised loss sales (Task 14's
    // 61-day window), not a hand-typed symbol list. A wash sale is triggered by *repurchasing*
    // a security recently sold at a loss, so this applies to buys, and it is scoped to the
    // account's household — the same fact the tax page reads (`realisedSales` carries
    // `householdId`).
    if (isBuy) {
      const openWindow = openWashSaleWindows(MOCK_TODAY_ISO, account.householdId).find((w) => w.symbol === sym)
      if (openWindow) {
        violations.push({
          constraint: 'Wash sale rule (61-day window)',
          severity: 'warning',
          currentValue: `Sold at a loss ${openWindow.saleDate}`,
          limit: '61-day window',
          message: `${sym} was sold at a loss in this household on ${openWindow.saleDate}. Repurchasing before ${openWindow.end} may trigger a wash sale, disallowing the loss.`,
        })
      }
    }

    // Cash reserve check for buys — gated on the actual projected post-trade cash balance, not a
    // raw notional threshold. A buy that leaves cash comfortably above the floor must not warn
    // just because it happened to be a large trade.
    if (isBuy) {
      const postTradeCash = account.cashBalance - estValue
      const postTradeCashPct = (postTradeCash / accountValue) * 100
      if (postTradeCashPct < CASH_MINIMUM_PCT * 100) {
        violations.push({
          constraint: 'Cash reserve minimum (2%)',
          severity: postTradeCash < 0 ? 'block' : 'warning',
          currentValue: `${postTradeCashPct.toFixed(1)}%`,
          limit: `${(CASH_MINIMUM_PCT * 100).toFixed(1)}%`,
          message: `Post-trade cash balance would be ${postTradeCashPct.toFixed(1)}%, below the ${(CASH_MINIMUM_PCT * 100).toFixed(0)}% minimum reserve requirement.`,
        })
      }
    }

    // Sector concentration for known tech stocks — the account's actual technology exposure,
    // not a fixed 38.2%, and gated on the projected post-trade weight (same 0.8x-warn / 1.0x-block
    // ladder as the concentration check above), not a raw notional threshold that fired regardless
    // of whether the sector limit was anywhere close to being breached.
    if (TECH_SYMBOLS.includes(sym) && ['buy', 'buy_to_open'].includes(body.side)) {
      const techWeight = positions
        .filter((p) => TECH_SYMBOLS.includes(p.symbol))
        .reduce((sum, p) => sum + p.marketValue, 0) / accountValue
      const projected = techWeight + estValue / accountValue
      if (projected > SECTOR_LIMIT * 0.8) {
        violations.push({
          constraint: 'Sector concentration (Technology)',
          severity: projected > SECTOR_LIMIT ? 'block' : 'warning',
          currentValue: `${(projected * 100).toFixed(1)}%`,
          limit: `${(SECTOR_LIMIT * 100).toFixed(1)}%`,
          message: `Technology sector allocation would be ${(projected * 100).toFixed(1)}% after this trade (currently ${(techWeight * 100).toFixed(1)}%), against a ${(SECTOR_LIMIT * 100).toFixed(0)}% limit.`,
        })
      }
    }

    return HttpResponse.json({
      passed: violations.every((v) => v.severity !== 'block'),
      violations,
    })
  }),

  http.post('/api/oms/rebalance', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; driftThreshold?: number; taxAware: boolean }
    const previews: RebalancePreview[] = body.accountIds.map((accountId) => {
      // The Rebalance page's drift-threshold control was sent and ignored; `driftThreshold` was
      // in scope one line away.
      const trades = generateRebalanceTrades(accountId, body.taxAware, body.driftThreshold)
      return {
        accountId,
        trades,
        // C26 — the total is the sum of the trades' own tax impacts, not a second literal that
        // could (and did) disagree with them.
        estimatedTaxImpact: trades.reduce((sum, t) => sum + t.taxImpact, 0),
        complianceChecks: generateComplianceChecks(),
      }
    })
    return HttpResponse.json(previews)
  }),

  http.post('/api/oms/rebalance/execute', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; taxAware: boolean }
    const results = body.accountIds.map((accountId) => ({
      accountId,
      status: 'submitted' as const,
      ordersCreated: generateRebalanceTrades(accountId, body.taxAware).length,
      estimatedCompletion: '2026-02-25T16:00:00Z',
    }))
    return HttpResponse.json(results)
  }),
]
