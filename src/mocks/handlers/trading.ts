import { http, HttpResponse } from 'msw'
import { symbols, getOptionChainData } from '../data/trading'
import { accounts } from '../data/accounts'
import { generateRebalanceTrades, currencyForAccount, type ProposedTradeLeg } from './oms'
import { computeDriftForAccount, MODEL_DEFINITIONS } from './pms'
import { notFound, roundTo } from './utils'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { netCapitalGainsTax } from '@/lib/capital-gains'
import { taxRateFor } from '@/features/portfolios/tax/shared'
import type { ModelTradePreview } from '@/types/trading'

/**
 * The model-trade screen has no tax-awareness toggle — unlike the rebalance wizard, which exposes
 * one and defaults it on. Rather than leave the setting implicit, this names the choice: previews
 * are generated tax-aware, matching that default, so a sell is drawn from the account's
 * lowest-tax-per-dollar lots first. The alternative (tax-unaware) realises strictly more gain, and
 * silently choosing the worse of the two for a screen that displays an "Est. Tax Impact" total is
 * not a defensible default.
 */
const MODEL_TRADE_TAX_AWARE = true

/**
 * Why a trade is proposed, in words, from the sleeve drift that actually produced it — the account's
 * own weight against this model's own target, both carried on the leg by the engine.
 *
 * The figures are per account and per sleeve, which is the whole correction: the previous string
 * announced "from 47% to 42%" to all 47 accounts regardless of what any of them held. Weights are
 * shown to 1dp, the precision every other drift readout in the app uses.
 */
function sleeveReason(leg: ProposedTradeLeg): string {
  const label = ASSET_CLASS_LABELS[leg.assetClass] ?? leg.assetClass
  const actual = (leg.actualWeight * 100).toFixed(1)
  const target = (leg.targetWeight * 100).toFixed(1)
  return leg.side === 'sell'
    ? `Reduce ${label} overweight: ${actual}% against a ${target}% target`
    : `Increase ${label} underweight: ${actual}% against a ${target}% target`
}

export const tradingHandlers = [
  // Symbol search — supports optional ?assetClass= filter
  http.get('/api/oms/symbols', ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toUpperCase() ?? ''
    const assetClass = url.searchParams.get('assetClass')
    if (!q) return HttpResponse.json([])

    let pool = symbols
    if (assetClass) {
      pool = pool.filter((s) => s.assetClass === assetClass)
    }

    const matches = pool
      .filter((s) => s.symbol.toUpperCase().includes(q) || s.name.toUpperCase().includes(q))
      .slice(0, 10)
    return HttpResponse.json(matches)
  }),

  // Option chain
  http.get('/api/oms/options/chain/:underlying', ({ params, request }) => {
    const underlying = (params.underlying as string).toUpperCase()
    const url = new URL(request.url)
    const expiration = url.searchParams.get('expiration')

    const chain = getOptionChainData(underlying)
    if (!chain) return HttpResponse.json({ error: 'No options available for this underlying' }, { status: 404 })

    if (expiration) {
      const filtered = {
        ...chain,
        expirations: chain.expirations.filter((e) => e.expirationDate === expiration),
      }
      return HttpResponse.json(filtered)
    }

    return HttpResponse.json(chain)
  }),

  // Model trade preview
  //
  // Task 9 · every field here was invented: the account was named `Account acc-003`, the model was
  // always 'Growth Balanced' whatever was asked for, the drift was a character code of the account
  // id (`accId.charCodeAt(…) % 5 + 1.2`), and all 47 accounts received the same three trades — an
  // AAPL sell and AGG/VXUS buys — against positions most of them do not hold, each explained by
  // "from 47% to 42%".
  //
  // The whole thing is now `generateRebalanceTrades`, driven with the **requested** model rather
  // than each account's own. That reuse is the point, not an economy: the rebalance wizard and this
  // screen propose trades for the same account against the same model, so two generators would be
  // free to disagree on screen about what that account should trade. Everything §9.6/§9.7 and Task
  // 8 established — long-only sells bounded by the position, `boundedTradeQty` share counts,
  // `estimatedValue = round(quantity × price)`, per-lot tax at the lot's own holding-period rate,
  // and the two-sided post-trade cash band — therefore holds here by construction rather than by a
  // second implementation of it.
  http.post('/api/oms/model-trade/preview', async ({ request }) => {
    const body = (await request.json()) as { modelId: string; accountIds: string[] }
    const model = MODEL_DEFINITIONS.find((m) => m.id === body.modelId)
    // Not a fallback. `resolveModel`'s `?? mod-001` is defensible where an unknown id degrades a
    // *display*; here it would silently issue mod-001's trades under another model's name.
    if (!model) return HttpResponse.json({ error: `Unknown model ${body.modelId}` }, { status: 404 })

    const previews: ModelTradePreview[] = []
    for (const accountId of body.accountIds) {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) return notFound()
      // The screen previews migrating an account **onto** `model`, which may not be the model it
      // is assigned to today, so both the drift and the trades are measured against `model.id`.
      //
      // Recorded, deliberately not optimised: this computes the drift that `generateRebalanceTrades`
      // computes again internally, so each preview derives it twice. It is pure and cheap (the whole
      // 7,238-configuration sweep runs in under two seconds), and threading a precomputed
      // `DriftStatus` into the engine would widen its signature to save nothing a user can perceive.
      // The single source of truth matters here and is intact — both calls are the same function
      // with the same arguments, so they cannot disagree; only the work is duplicated, not the fact.
      const drift = computeDriftForAccount(account, model.id)
      const trades = generateRebalanceTrades(account.id, MODEL_TRADE_TAX_AWARE, undefined, model.id)
      previews.push({
        accountId: account.id,
        accountName: account.name,
        modelId: model.id,
        modelName: model.name,
        currency: currencyForAccount(account.id),
        // Percentage points, and `maxAbsDrift` rather than `totalDrift`: the worst single
        // asset-class breach is what a model band actually gates on and what every other drift
        // readout in the app renders. `maxAbsDrift` is already rounded to 4dp, so ×100 is exact to
        // 2dp — the `roundTo` only clears the binary-float tail (0.0523 × 100 = 5.229999999999999).
        currentDrift: roundTo(drift.maxAbsDrift * 100, 2),
        trades: trades.map((t) => ({
          symbol: t.symbol,
          name: t.name,
          assetClass: t.assetClass,
          side: t.side,
          quantity: t.quantity,
          estimatedValue: t.estimatedValue,
          currency: t.currency,
          reason: sleeveReason(t),
        })),
        // §1222-netted from the trades' own realised results, not a second literal that can
        // disagree with them — the same rule `/api/oms/rebalance` follows.
        estimatedTaxImpact: netCapitalGainsTax(
          trades.reduce((s, t) => s + t.realisedShortTerm, 0),
          trades.reduce((s, t) => s + t.realisedLongTerm, 0),
          taxRateFor,
        ),
      })
    }
    return HttpResponse.json(previews)
  }),

  // Model trade execute
  http.post('/api/oms/model-trade/execute', async ({ request }) => {
    const body = (await request.json()) as { modelId: string; accountIds: string[] }
    const model = MODEL_DEFINITIONS.find((m) => m.id === body.modelId)
    if (!model) return HttpResponse.json({ error: `Unknown model ${body.modelId}` }, { status: 404 })
    // `accountIds.length * 3` assumed the three fabricated trades every account used to receive.
    // The confirmation screen reports this count to the advisor, so it counts the orders the
    // preview actually proposed — the same generator, the same arguments.
    const ordersCreated = body.accountIds.reduce(
      (sum, accountId) => sum + generateRebalanceTrades(accountId, MODEL_TRADE_TAX_AWARE, undefined, model.id).length,
      0,
    )
    return HttpResponse.json({ status: 'submitted', ordersCreated })
  }),
]
