import { beforeAll, describe, it, expect } from 'vitest'
import { previewModelTrades, executeModelTrades } from '@/services/trading'
import { getDrift, getPositions } from '@/services/pms'
import { getAccounts } from '@/services/custodian'
import { MODEL_DEFINITIONS, modelImplementationSecurity } from '@/mocks/handlers/pms'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import type { Account } from '@/types/account'
import type { DriftStatus, Position } from '@/types/portfolio'
import type { ModelTradePreview } from '@/types/trading'

/**
 * Task 9 · `POST /api/oms/model-trade/preview` invented every field it served. The account was
 * named `Account acc-003`; the model was always 'Growth Balanced' whatever id was asked for; the
 * drift was `accId.charCodeAt(accId.length - 1) % 5 + 1.2`; and all 47 accounts received the same
 * AAPL sell and AGG/VXUS buys against positions most of them do not hold, each explained by the
 * same "from 47% to 42%".
 *
 * It is now `generateRebalanceTrades` driven with the requested model. These tests pin both halves
 * of that: the preview's own identity fields, and — because the shared engine gained a
 * target-model parameter this task — the engine's own money invariants across the migration space
 * the rebalance endpoint never reaches (47 accounts x 7 models), not only the account-on-its-own-
 * model diagonal Task 8 swept.
 */

const OWN_MODEL = (a: Account) => a.modelId ?? 'mod-001'

/**
 * The book the sweeps read, fetched once per file. Each sweep used to issue its own round-trip per
 * account — x7 for the migration sweeps — about 1,500 requests in this file, each ~1.5ms of
 * fetch + MSW transport against ~0.07ms of engine work. Under full-suite CPU contention the two
 * 377-request migration sweeps crossed the 5s test timeout. The endpoint takes an `accountIds` list
 * (the screen previews several accounts at once), so the whole book is now previewed in one
 * request per model; 'a batched preview is the same answer as previewing each account alone' pins
 * that this changes the transport, not the answer.
 */
type Book = {
  accounts: Account[]
  positions: Map<string, Position[]>
  drift: Map<string, DriftStatus>
  previews: Map<string, Map<string, ModelTradePreview>>
}

let book: Book

beforeAll(async () => {
  const accounts = await getAccounts()
  const ids = accounts.map((a) => a.id)
  const [positions, drift, previews] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await getPositions(id)] as const)),
    Promise.all(ids.map(async (id) => [id, await getDrift(id)] as const)),
    Promise.all(MODEL_DEFINITIONS.map(async (m) => {
      const batch = await previewModelTrades(m.id, ids)
      return [m.id, new Map(batch.map((p) => [p.accountId, p]))] as const
    })),
  ])
  book = { accounts, positions: new Map(positions), drift: new Map(drift), previews: new Map(previews) }
})

function previewOf(account: Account, modelId = OWN_MODEL(account)): ModelTradePreview {
  const preview = book.previews.get(modelId)?.get(account.id)
  if (!preview) throw new Error(`no preview for ${account.id} on ${modelId}`)
  return preview
}

function positionsOf(account: Account): Position[] {
  const positions = book.positions.get(account.id)
  if (!positions) throw new Error(`no positions for ${account.id}`)
  return positions
}

describe('the book snapshot the sweeps read', () => {
  it('a batched preview is the same answer as previewing each account alone', async () => {
    expect(book.accounts.length).toBeGreaterThan(40)
    for (const account of book.accounts) {
      const [single] = await previewModelTrades(OWN_MODEL(account), [account.id])
      expect(single, account.id).toEqual(previewOf(account))
    }
  })
})

/** The model's cash target weight — the same `MODELS` table the engine's drift reads. */
function cashTargetWeight(modelId: string): number {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`no model ${modelId}`)
  return model.assetClasses.find((ac) => ac.assetClass === 'cash')?.targetWeight ?? 0
}

describe('the model-trade preview names the account and the model it was actually asked for', () => {
  it('acc-003 under mod-003: the account\'s real name and the real model name, not "Account acc-003" / "Growth Balanced"', async () => {
    const [preview] = await previewModelTrades('mod-003', ['acc-003'])
    expect(preview).toBeDefined()
    expect(preview!.accountName).toBe('Robert Johnson Traditional IRA')
    expect(preview!.accountName).not.toBe('Account acc-003')
    expect(preview!.modelId).toBe('mod-003')
    // 'Growth Balanced' is not the name of any model in this book — it was never even a wrong
    // lookup, just a string.
    expect(preview!.modelName).not.toBe('Growth Balanced')
    expect(preview!.modelName).toBe('Conservative Income')
    expect(MODEL_DEFINITIONS.some((m) => m.name === 'Growth Balanced')).toBe(false)
  })

  it('every account gets its own name, and every model id resolves to that model\'s own name', async () => {
    const accounts = await getAccounts()
    expect(accounts.length).toBeGreaterThan(40)
    for (const model of MODEL_DEFINITIONS) {
      const previews = await previewModelTrades(model.id, accounts.map((a) => a.id))
      expect(previews, model.id).toHaveLength(accounts.length)
      for (const preview of previews) {
        const account = accounts.find((a) => a.id === preview.accountId)!
        expect(preview.accountName, preview.accountId).toBe(account.name)
        expect(preview.modelName, `${preview.accountId} ${model.id}`).toBe(model.name)
      }
    }
  })

  it('previewing a MIGRATION names the model asked for, not the one the account is on today', async () => {
    // acc-001 is assigned to mod-001 (Balanced Growth); the screen's purpose is to preview moving
    // it onto another model, so the answer must describe mod-002.
    const accounts = await getAccounts()
    expect(OWN_MODEL(accounts.find((a) => a.id === 'acc-001')!)).toBe('mod-001')
    const [preview] = await previewModelTrades('mod-002', ['acc-001'])
    expect(preview!.modelId).toBe('mod-002')
    expect(preview!.modelName).toBe('Growth')
  })

  it('an unknown model is refused, not silently served under mod-001\'s lineup', async () => {
    await expect(previewModelTrades('mod-999', ['acc-001'])).rejects.toThrow()
  })
})

describe('currentDrift is the account\'s real drift against the model asked for', () => {
  it('for every account previewed on its own model, it is exactly the drift surface\'s own figure', async () => {
    const { accounts } = book
    let checked = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      const drift = book.drift.get(account.id)!
      // Both sides are `maxAbsDrift x 100` off one 4dp-rounded value, so the only slack here is
      // binary-float representation — bounded at ~1e-13, not at the 0.05 a display rounding would
      // need. A hash of the account id, or `totalDrift` in place of `maxAbsDrift`, misses by
      // whole percentage points.
      expect(Math.abs(preview.currentDrift - drift.maxAbsDrift * 100), account.id).toBeLessThan(1e-9)
      checked++
    }
    expect(checked, 'vacuity guard — the loop must have run over the whole book').toBe(accounts.length)
    expect(checked).toBeGreaterThan(40)
  })

  it('it moves when the model moves: acc-001 is 7.05% adrift of its own model and 13.03% adrift of mod-002', async () => {
    const [own] = await previewModelTrades('mod-001', ['acc-001'])
    const [migrated] = await previewModelTrades('mod-002', ['acc-001'])
    const drift = await getDrift('acc-001')
    expect(own!.currentDrift).toBeCloseTo(drift.maxAbsDrift * 100, 9)
    // The two must differ by a material amount — an implementation that ignored `modelId` (as the
    // charCodeAt one did) returns the same number for both.
    expect(Math.abs(migrated!.currentDrift - own!.currentDrift)).toBeGreaterThan(1)
  })

  it('it is not the character-code sequence it used to be', () => {
    const { accounts } = book
    const fabricated = (id: string) => +((id.charCodeAt(id.length - 1) % 5) + 1.2).toFixed(1)
    let differing = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      if (Math.abs(preview.currentDrift - fabricated(account.id)) > 1e-9) differing++
    }
    // Every account, not merely most — the old formula could only ever emit 1.2–5.2.
    expect(differing).toBe(accounts.length)
  })
})

describe('the proposed trades are the account\'s own', () => {
  it('two accounts on the same model do not receive identical trade lists', async () => {
    const [a] = await previewModelTrades('mod-002', ['acc-001'])
    const [b] = await previewModelTrades('mod-002', ['acc-006'])
    expect(a!.trades.length).toBeGreaterThan(0)
    expect(b!.trades.length).toBeGreaterThan(0)
    expect(JSON.stringify(a!.trades)).not.toBe(JSON.stringify(b!.trades))
    // Stronger than "the numbers differ": the securities themselves differ, because they are the
    // two accounts' own holdings rather than one hardcoded basket.
    expect(a!.trades.map((t) => t.symbol).sort()).not.toEqual(b!.trades.map((t) => t.symbol).sort())
  })

  it('across the whole book, a trade list is shared only by accounts whose holdings are identical', () => {
    // Four pairs in the fixture are the same model at the same total value — acc-013/acc-031
    // (mod-004, $350K), acc-016/acc-023 (mod-003, $1.8M), acc-017/acc-026 (mod-002, $2.2M) and
    // acc-021/acc-038 (mod-004, $500K) — and `getPositionsForAccount` gives such accounts
    // identical holdings. Identical holdings on an identical model *should* produce identical
    // trades; a blanket "no two accounts match" would be asserting something the data does not
    // say. What must be true is the converse: a shared trade list is only ever explained by
    // shared holdings, never by one hardcoded basket.
    const { accounts } = book
    const seen = new Map<string, string>()
    const unexplained: string[] = []
    let nonEmpty = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      if (preview.trades.length === 0) continue
      nonEmpty++
      const key = JSON.stringify(preview.trades)
      const prior = seen.get(key)
      if (!prior) { seen.set(key, account.id); continue }
      const [mine, theirs] = [positionsOf(account), book.positions.get(prior)!]
      const shape = (ps: Position[]) =>
        JSON.stringify(ps.map((p) => [p.symbol, p.quantity, p.marketValue]).sort())
      if (shape(mine) !== shape(theirs)) unexplained.push(`${account.id} matches ${prior} but holds different positions`)
    }
    expect(nonEmpty, 'vacuity guard — accounts with trades must exist').toBeGreaterThan(30)
    expect(unexplained).toEqual([])
    // And the book really is served many different answers, not three sentences and one basket.
    expect(seen.size).toBeGreaterThan(38)
  })

  it('every sell names a security the account actually holds', () => {
    const { accounts } = book
    let checked = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      const positions = positionsOf(account)
      for (const trade of preview.trades) {
        if (trade.side !== 'sell') continue
        checked++
        expect(
          positions.some((p) => p.symbol === trade.symbol),
          `${account.id} sells ${trade.symbol}, which it does not hold`,
        ).toBe(true)
      }
    }
    expect(checked, 'vacuity guard — some sells must exist to check').toBeGreaterThan(5)
  })

  it('no sell exceeds the position held, in money and in share count, at zero tolerance', () => {
    const { accounts } = book
    let checked = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      const positions = positionsOf(account)
      for (const trade of preview.trades) {
        if (trade.side !== 'sell') continue
        const position = positions.find((p) => p.symbol === trade.symbol)!
        checked++
        // `estimatedValue` is a whole currency unit and `marketValue` is the exact cap; the
        // comparison is therefore in money against `Math.round(marketValue)`, with no slack for a
        // share of anything. Task 8's `+ 1` tolerance here was worth one whole USDC — and, on a
        // different leg, would have been worth $87,450 of BTC.
        expect(trade.estimatedValue, `${account.id} ${trade.symbol}`)
          .toBeLessThanOrEqual(Math.round(position.marketValue))
        expect(trade.quantity, `${account.id} ${trade.symbol}`).toBeLessThanOrEqual(position.quantity)
      }
    }
    expect(checked).toBeGreaterThan(5)
  })

  it('every row multiplies out: estimatedValue is exactly round(quantity x price), on both sides', () => {
    const { accounts } = book
    let checked = 0
    for (const account of accounts) {
      const modelId = OWN_MODEL(account)
      const preview = previewOf(account, modelId)
      const positions = positionsOf(account)
      const currency = account.baseCurrency ?? 'USD'
      for (const trade of preview.trades) {
        const held = positions.find((p) => p.symbol === trade.symbol)
        // A buy into a class the account holds nothing of executes against the model's own
        // implementation security, quoted USD and converted into the account's currency once —
        // exactly what §9.7 does, re-derived here rather than read back from the answer.
        const security = modelImplementationSecurity(modelId, trade.assetClass)
        const price = held
          ? held.price
          : convertCurrency(security!.price, 'USD', currency, FX_RATES_USD_BASE)
        checked++
        // The residual of a single `Math.round` is bounded in the unit rounded — whole currency
        // units — so the bound is exact equality, not a percentage of the notional.
        expect(trade.estimatedValue, `${account.id} ${trade.symbol}`).toBe(Math.round(trade.quantity * price))
        expect(trade.quantity, `${account.id} ${trade.symbol}`).toBeGreaterThan(0)
      }
    }
    expect(checked, 'vacuity guard — legs must exist to check').toBeGreaterThan(100)
  })
})

describe('the reason names this account\'s own drift, not a fixed pair of percentages', () => {
  it('every trade quotes the account\'s own weight and the model\'s own target for that sleeve', () => {
    const { accounts } = book
    let checked = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      const drift = book.drift.get(account.id)!
      for (const trade of preview.trades) {
        const sleeve = drift.assetClassDrifts.find((d) => d.assetClass === trade.assetClass)!
        checked++
        expect(trade.reason, `${account.id} ${trade.symbol}`)
          .toContain(`${(sleeve.actual * 100).toFixed(1)}% against a ${(sleeve.target * 100).toFixed(1)}% target`)
        expect(trade.reason).toContain(trade.side === 'sell' ? 'Reduce' : 'Increase')
      }
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('the fixed "from 47% to 42%" sentence appears nowhere in the book', () => {
    const { accounts } = book
    const reasons = new Set<string>()
    for (const account of accounts) {
      for (const trade of previewOf(account).trades) reasons.add(trade.reason)
    }
    expect(reasons.size, 'vacuity guard — reasons must exist').toBeGreaterThan(20)
    for (const reason of reasons) {
      expect(reason).not.toContain('from 47% to 42%')
    }
    // The distinct-reason count is the real claim: three hardcoded sentences served 47 accounts.
    expect(reasons.size).toBeGreaterThan(40)
  })
})

describe('§9.3 · the preview and its trades carry the account\'s own currency', () => {
  it('acc-041 (HKD): the preview and every trade on it are tagged HKD', async () => {
    const [preview] = await previewModelTrades('mod-002', ['acc-041'])
    expect(preview!.currency).toBe('HKD')
    expect(preview!.trades.length).toBeGreaterThan(0)
    expect(preview!.trades.every((t) => t.currency === 'HKD')).toBe(true)
  })

  it('acc-001 (USD) is still USD — the tag is read from the account, not hardcoded to the exotic case', async () => {
    const [preview] = await previewModelTrades('mod-002', ['acc-001'])
    expect(preview!.currency).toBe('USD')
    expect(preview!.trades.length).toBeGreaterThan(0)
    expect(preview!.trades.every((t) => t.currency === 'USD')).toBe(true)
  })

  it('all four non-USD accounts carry their own currency', async () => {
    const expected = { 'acc-041': 'HKD', 'acc-042': 'SGD', 'acc-043': 'EUR', 'acc-044': 'CHF' } as const
    const accounts = await getAccounts()
    let sawATrade = false
    for (const [id, currency] of Object.entries(expected)) {
      const account = accounts.find((a) => a.id === id)!
      const [preview] = await previewModelTrades(OWN_MODEL(account), [id])
      expect(preview!.currency, id).toBe(currency)
      expect(preview!.trades.length, `${id} must propose trades`).toBeGreaterThan(0)
      sawATrade = true
      expect(preview!.trades.every((t) => t.currency === currency), id).toBe(true)
    }
    expect(sawATrade).toBe(true)
  })

  it('a preview with no trades still states its currency and its drift', async () => {
    // acc-003 is 0.31 of a point adrift of its own model — below the engine's threshold, so it
    // proposes nothing, and the tag must not depend on the trade list being non-empty.
    const [preview] = await previewModelTrades('mod-003', ['acc-003'])
    expect(preview!.trades).toHaveLength(0)
    expect(preview!.currency).toBe('USD')
    expect(preview!.currentDrift).toBeGreaterThan(0)
    expect(preview!.estimatedTaxImpact).toBe(0)
  })
})

describe('tax follows the account\'s own treatment and its own trades', () => {
  it('no tax-deferred or tax-free account is shown a capital-gains figure, and taxable ones with sells are', () => {
    const { accounts } = book
    let shelteredWithTrades = 0
    let taxableWithTax = 0
    for (const account of accounts) {
      const preview = previewOf(account)
      const sheltered = account.taxTreatment === 'tax_deferred' || account.taxTreatment === 'tax_free'
      if (sheltered) {
        if (preview.trades.length > 0) shelteredWithTrades++
        expect(preview.estimatedTaxImpact, account.id).toBe(0)
      } else if (preview.estimatedTaxImpact > 0) {
        taxableWithTax++
      }
      expect(preview.estimatedTaxImpact, account.id).toBeGreaterThanOrEqual(0)
    }
    // Both guards matter: the first says the zero above was asserted against accounts that
    // actually traded, the second that a non-zero figure is reachable at all.
    expect(shelteredWithTrades, 'vacuity guard — sheltered accounts must have proposed trades').toBeGreaterThan(3)
    expect(taxableWithTax, 'vacuity guard — some taxable account must realise gains').toBeGreaterThan(3)
  })
})

describe('the shared engine\'s money invariants hold across the whole migration space, not just the diagonal', () => {
  // 47 accounts x 7 models. The rebalance endpoint can only ever exercise each account against
  // its own model; the model-trade screen is what drives every other combination, and it is the
  // reason `generateRebalanceTrades` gained a model parameter at all.
  it('post-trade cash stays within [start, target] and never goes negative, in money at zero tolerance', () => {
    const { accounts } = book
    let combos = 0
    let withTrades = 0
    const failures: string[] = []
    for (const account of accounts) {
      const cashValue = positionsOf(account).find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance
      for (const model of MODEL_DEFINITIONS) {
        const preview = previewOf(account, model.id)
        combos++
        if (preview.trades.length > 0) withTrades++
        const bought = preview.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
        const sold = preview.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
        const endCash = cashValue - bought + sold
        const target = cashTargetWeight(model.id) * account.totalValue
        const lower = Math.min(cashValue, target)
        const upper = Math.max(cashValue, target)
        const where = `${account.id} on ${model.id}`
        // Stated in money with no band: `endCash` is a sum of whole-currency-unit figures and the
        // edges are exact. A weight tolerance here was worth $2,500 on acc-041 and hid a $76
        // breach on acc-033 in Task 8.
        if (endCash < lower) failures.push(`${where}: end cash ${endCash} below ${lower}`)
        if (endCash > upper) failures.push(`${where}: end cash ${endCash} above ${upper}`)
        if (endCash < 0) failures.push(`${where}: end cash ${endCash} is negative`)
      }
    }
    expect(combos).toBe(accounts.length * MODEL_DEFINITIONS.length)
    expect(withTrades, 'vacuity guard — most combinations must actually propose trades').toBeGreaterThan(200)
    expect(failures).toEqual([])
  })

  it('no migration proposes a short sale: every sell is inside its own position, across all 7 models', () => {
    const { accounts } = book
    let checked = 0
    const failures: string[] = []
    for (const account of accounts) {
      const positions = positionsOf(account)
      for (const model of MODEL_DEFINITIONS) {
        for (const trade of previewOf(account, model.id).trades) {
          if (trade.side !== 'sell') continue
          const position = positions.find((p) => p.symbol === trade.symbol)
          checked++
          if (!position) { failures.push(`${account.id}/${model.id}: sells unheld ${trade.symbol}`); continue }
          if (trade.estimatedValue > Math.round(position.marketValue)) {
            failures.push(`${account.id}/${model.id} ${trade.symbol}: ${trade.estimatedValue} > ${Math.round(position.marketValue)}`)
          }
          if (trade.quantity > position.quantity) {
            failures.push(`${account.id}/${model.id} ${trade.symbol}: ${trade.quantity} units > ${position.quantity} held`)
          }
        }
      }
    }
    expect(checked, 'vacuity guard — sells must exist across the migration space').toBeGreaterThan(200)
    expect(failures).toEqual([])
  })
})

describe('the cap resolution reaches the cash band across the whole reachable configuration space', () => {
  // The endpoint sweep above fixes `taxAware` and the drift threshold at what the model-trade
  // screen sends. Both are real parameters of the shared engine — the rebalance wizard exposes a
  // threshold control and a tax toggle — so the space that can actually reach
  // `generateRebalanceTrades` is 47 accounts x 7 models x 2 tax modes x 11 thresholds = 7,238,
  // not 329. Measuring only the 329 is how the previous four-pass cutoff looked adequate.
  const THRESHOLDS = [0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.07, 0.10]

  it('7,238 configurations: no throw, and post-trade cash lands inside the band in money at zero tolerance', () => {
    const { accounts } = book
    const cashByAccount = new Map<string, number>()
    for (const account of accounts) {
      cashByAccount.set(account.id, positionsOf(account).find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance)
    }

    let combos = 0
    let withTrades = 0
    const failures: string[] = []
    for (const account of accounts) {
      const cashValue = cashByAccount.get(account.id)!
      for (const model of MODEL_DEFINITIONS) {
        for (const taxAware of [true, false]) {
          for (const threshold of THRESHOLDS) {
            const where = `${account.id}/${model.id}/tax=${taxAware}/thr=${threshold}`
            combos++
            let trades
            try {
              // The engine throws rather than returning an unvalidated proposal if the cap
              // resolution fails to reach the band. Catching it here turns "it threw" into a
              // named failure instead of aborting the sweep at the first one.
              trades = generateRebalanceTrades(account.id, taxAware, threshold, model.id)
            } catch (error) {
              failures.push(`${where}: threw — ${(error as Error).message}`)
              continue
            }
            if (trades.length > 0) withTrades++
            const bought = trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
            const sold = trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
            const endCash = cashValue - bought + sold
            const target = cashTargetWeight(model.id) * account.totalValue
            if (endCash < Math.min(cashValue, target)) failures.push(`${where}: end cash ${endCash} below ${Math.min(cashValue, target)}`)
            if (endCash > Math.max(cashValue, target)) failures.push(`${where}: end cash ${endCash} above ${Math.max(cashValue, target)}`)
            if (endCash < 0) failures.push(`${where}: end cash ${endCash} is negative`)
          }
        }
      }
    }
    expect(combos).toBe(accounts.length * MODEL_DEFINITIONS.length * 2 * THRESHOLDS.length)
    expect(combos).toBe(7238)
    expect(withTrades, 'vacuity guard — most configurations must actually propose trades').toBeGreaterThan(4000)
    expect(failures).toEqual([])
  })
})

describe('execute reports the orders the preview actually proposed', () => {
  it('ordersCreated is the real trade count, not accountIds.length x 3', async () => {
    const accountIds = ['acc-001', 'acc-006', 'acc-041']
    const previews: ModelTradePreview[] = await previewModelTrades('mod-002', accountIds)
    const expected = previews.reduce((sum, p) => sum + p.trades.length, 0)
    const result = await executeModelTrades('mod-002', accountIds)
    expect(expected).toBeGreaterThan(0)
    // The old formula and the truth must be distinguishable, or this test proves nothing.
    expect(expected).not.toBe(accountIds.length * 3)
    expect(result.ordersCreated).toBe(expected)
  })
})
