import { describe, it, expect } from 'vitest'
import { MODEL_DEFINITIONS, modelImplementationSecurity, usdQuoteFor } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'

/**
 * §9.7 · a model's `implementationSymbol` is the security the rebalance engine buys to fill a
 * sleeve the account holds nothing in. Two properties it depends on are enforceable neither by the
 * type system (the field is optional, because `cash` correctly has none) nor by a grep:
 *
 *  1. every non-cash sleeve, in every model, names one; and
 *  2. every symbol named resolves to a real, positive, **USD** price in `positions.ts`.
 *
 * (2) is the one that bites silently. A plausible-looking ticker with no quote behind it produces
 * a zero notional that `oms.ts`'s `estimatedValue > 0` filter drops without a word — which looks
 * exactly like the defect §9.7 fixes, so the engine would appear unchanged for the accounts that
 * matter most.
 */
describe('§9.7 · every model sleeve names a priced implementation security', () => {
  it('has seven models to check', () => {
    // Vacuity guard for every `for (const model of MODEL_DEFINITIONS)` below.
    expect(MODEL_DEFINITIONS.length).toBe(7)
  })

  it('every non-cash sleeve in every model names an implementation symbol', () => {
    const missing: string[] = []
    let sleevesChecked = 0
    for (const model of MODEL_DEFINITIONS) {
      for (const sleeve of model.assetClasses) {
        if (sleeve.assetClass === 'cash') continue
        sleevesChecked++
        if (!sleeve.implementationSymbol) missing.push(`${model.id} ${sleeve.assetClass}`)
      }
    }
    expect(sleevesChecked).toBeGreaterThan(30)
    expect(missing).toEqual([])
  })

  it('cash names none — it is the residual an account settles into, not something the engine buys', () => {
    const cashSleeves = MODEL_DEFINITIONS.flatMap((m) => m.assetClasses.filter((a) => a.assetClass === 'cash'))
    expect(cashSleeves.length).toBe(7)
    expect(cashSleeves.every((s) => s.implementationSymbol === undefined)).toBe(true)
    // ...and `modelImplementationSecurity` therefore refuses to resolve one, which is what stops
    // the engine proposing a "buy CASH" order.
    expect(MODEL_DEFINITIONS.every((m) => modelImplementationSecurity(m.id, 'cash') === undefined)).toBe(true)
  })

  it('an unknown model resolves to no security at all, rather than silently to mod-001 lineup', () => {
    // `resolveModel` falls back to the first model — defensible where the consequence is a
    // rendered target set, and not defensible here, where the consequence is a trade instruction.
    // An account on a model that cannot be found would be told to buy mod-001's Growth-equity
    // lineup with nothing anywhere saying the model was never located. No fixture reaches this,
    // which is exactly why it needs a synthetic check: the fallback is invisible until the day a
    // model id is renamed.
    const knownIds = new Set(MODEL_DEFINITIONS.map((m) => m.id))
    expect(knownIds.has('mod-000-does-not-exist')).toBe(false)
    for (const assetClass of ['us_equity', 'intl_equity', 'fixed_income', 'alternatives']) {
      expect(modelImplementationSecurity('mod-000-does-not-exist', assetClass), assetClass).toBeUndefined()
    }
    // Vacuity guard: the same asset classes DO resolve for a model that exists, so `undefined`
    // above is the unknown model talking and not an unreachable asset class.
    const real = MODEL_DEFINITIONS[0]!
    expect(modelImplementationSecurity(real.id, 'us_equity')).toBeDefined()
  })

  it('every named symbol resolves to a real, positive price', () => {
    const unpriced: string[] = []
    let resolved = 0
    for (const model of MODEL_DEFINITIONS) {
      for (const sleeve of model.assetClasses) {
        if (sleeve.assetClass === 'cash') continue
        const security = modelImplementationSecurity(model.id, sleeve.assetClass)
        if (!security || !(security.price > 0) || !security.name) {
          unpriced.push(`${model.id} ${sleeve.assetClass} -> ${sleeve.implementationSymbol}`)
          continue
        }
        resolved++
        expect(security.symbol).toBe(sleeve.implementationSymbol)
      }
    }
    expect(resolved).toBeGreaterThan(30)
    expect(unpriced).toEqual([])
  })

  it('every named symbol is quoted in USD — no local-currency price leaks into the quote master', () => {
    // The trap this closes: `positions.ts` prices each account's holdings in that account's own
    // currency. 0700.HK is HK$380 and SIE.DE is EUR 185.40; if either reached the quote master,
    // `oms.ts` would convert an already-local price into a second currency. The master is built
    // from USD accounts only, so the check is that no symbol it holds is one that appears
    // *exclusively* in a non-USD account.
    const nonUsdOnly = new Set<string>()
    const usdSymbols = new Set<string>()
    for (const account of accounts) {
      const isUsd = (account.baseCurrency ?? 'USD') === 'USD'
      for (const position of getPositionsForAccount(account.id, account.totalValue)) {
        if (position.symbol === 'CASH') continue
        if (isUsd) usdSymbols.add(position.symbol)
        else nonUsdOnly.add(position.symbol)
      }
    }
    for (const symbol of usdSymbols) nonUsdOnly.delete(symbol)
    expect(nonUsdOnly.size).toBeGreaterThan(0) // vacuity: there really are local-only securities

    const named = MODEL_DEFINITIONS.flatMap((m) => m.assetClasses.map((a) => a.implementationSymbol)).filter(Boolean)
    expect(named.length).toBeGreaterThan(30)
    for (const symbol of named) {
      expect(nonUsdOnly.has(symbol!), `${symbol} is quoted only in a non-USD account`).toBe(false)
      expect(usdSymbols.has(symbol!), `${symbol} has no USD quote`).toBe(true)
    }
  })

  it('each named symbol carries exactly one distinct USD price across the whole book', () => {
    // `USD_SECURITY_QUOTES` is a Map built by overwriting, so two USD accounts disagreeing on a
    // price would silently hand the engine whichever came last.
    const pricesBySymbol = new Map<string, Set<number>>()
    for (const account of accounts) {
      if ((account.baseCurrency ?? 'USD') !== 'USD') continue
      for (const position of getPositionsForAccount(account.id, account.totalValue)) {
        if (position.symbol === 'CASH') continue
        const seen = pricesBySymbol.get(position.symbol) ?? new Set<number>()
        seen.add(position.price)
        pricesBySymbol.set(position.symbol, seen)
      }
    }
    const named = [...new Set(MODEL_DEFINITIONS.flatMap((m) => m.assetClasses.map((a) => a.implementationSymbol)).filter(Boolean))]
    expect(named.length).toBeGreaterThan(0)
    for (const symbol of named) {
      const prices = pricesBySymbol.get(symbol!)
      expect(prices, `${symbol} absent from the USD quote master`).toBeDefined()
      expect([...prices!], `${symbol} priced inconsistently`).toHaveLength(1)
      // The engine reads the same map, so the two can never diverge.
      expect(usdQuoteFor(symbol!)!.price).toBe([...prices!][0])
    }
  })

  it('a model that carries a separate emerging-markets sleeve does not implement intl_equity with a fund that already holds EM', () => {
    // The one deliberate per-model difference: EFA is MSCI EAFE (developed ex-North-America),
    // VXUS is FTSE Global All Cap ex-US and includes emerging markets. A model with its own EM
    // sleeve must use the former or it double-counts the sleeve sitting beside it.
    let withEm = 0
    let withoutEm = 0
    for (const model of MODEL_DEFINITIONS) {
      const intl = model.assetClasses.find((a) => a.assetClass === 'intl_equity')
      if (!intl) continue
      const hasEmSleeve = model.assetClasses.some((a) => a.assetClass === 'emerging_markets')
      if (hasEmSleeve) {
        withEm++
        expect(intl.implementationSymbol, `${model.id}`).toBe('EFA')
      } else {
        withoutEm++
        expect(intl.implementationSymbol, `${model.id}`).toBe('VXUS')
      }
    }
    // Both branches must be exercised, or this asserts a rule against a single case.
    expect(withEm).toBeGreaterThan(0)
    expect(withoutEm).toBeGreaterThan(0)
  })
})
