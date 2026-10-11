# Design Exploration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four competing, working design directions for Advisor Desktop on one shared,
engine-true scenario, have two reviewers score them, and present one comparison page for Joel to
choose from.

**Architecture:** Phase A fixes four engine/data defects on `main` that the scenario depends on.
Phase B creates a `design-exploration` branch with a shared, read-only lab layer (scenario loader,
contract, registry, routes, screenshot harness). Phase C builds four directions in parallel
worktrees, each confined to `src/lab/<key>/`. Phase D reviews and presents.

**Tech Stack:** React 18, TypeScript (strict), Vite, TanStack Query, React Router 6, MSW, Vitest +
Testing Library, Playwright, Tailwind v4 / vanilla CSS, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-design-exploration-design.md`

## Global Constraints

- Strict TypeScript, no `any` (use `unknown` and narrow), ESM only, `type` over `interface`, no
  enums, no barrel files, no CSS-in-JS, no Sass.
- Every figure shown in the lab comes from the engine via `src/lab/scenario/`; no hand-typed numbers.
- Frozen today is `2026-02-25` (`src/lib/clock.ts`); never read the live clock.
- No new npm dependencies anywhere in this plan.
- `design-exploration` never merges to `main`. Phase A merges to `main` only after Joel approves.
- Direction agents never read: `docs/superpowers/reference/design-system-brief.md`,
  `meridian-components.md`, `meridian-dark-spec.md`, `critique-*.md`, `SYNTHESIS.md`,
  `docs/superpowers/plans/2026-07-24-meridian-overhaul-roadmap.md`, or the Meridian Claude Design
  projects. No direction lands on warm paper + editorial serif.
- Run vitest as `node_modules/.bin/vitest run …` inside worktrees (`pnpm test:run` fails its
  dependency check against a worktree's install).

## Review Focus

1. **A direction loads before the scenario resolves** → it must show a loading state, never `NaN`,
   `$0` or `undefined`; the screenshot harness waits for `data-lab-ready="true"`, so a direction
   that never sets it fails loudly (Task 7 tests the root attributes; Task 9 Step 2 proves the
   harness rejects a root without `data-lab-ready`).
2. **Unknown direction or beat in the URL** (`/lab/foo`, `/lab/terminal/bogus`) → a plain "not
   found" with links back to `/lab`, not a crash (Task 7 tests).
3. **Theme param absent or invalid** (`?theme=purple`) → falls back to `prefers-color-scheme`
   (Task 7 tests `parseLabTheme`).
4. **A direction calls a mutation service** (`submitTrade`, `executeRebalance`, `sendMessage`,
   `createThread`, `dismissNBA`, `snoozeNBA`) and changes shared MSW state, so other directions'
   screenshots differ → forbidden; Task 7 adds a lint-style test that fails if `src/lab/**`
   imports them.
5. **A loss leg with no gains anywhere** (pure harvest) → net tax is 0 and the loss is carried in
   `realisedShortTerm`/`realisedLongTerm`, never a negative tax (Task 4 test).

---

## Phase A — engine fixes on `main`

Work on branch `fix/acc-002-scenario-integrity` from `main` (`git switch -c fix/acc-002-scenario-integrity`).
Tasks 1–4 are sequential (Tasks 3 and 4 both change `ProposedTrade`).

### Task 1: Record the SMH replacement purchase in acc-002

The activity feed (`src/mocks/data/activities.ts:73`), note-002 and compliance alert comp-006 all
say 180 SMH were bought at $245.20 in acc-002 on 2026-02-21 as the INTC replacement, but acc-002
holds no SMH. Add the position, fund it from cash, and give it one honest lot.

**Files:**
- Modify: `src/mocks/data/positions.ts:36` (add after pos-028), `src/mocks/data/accounts.ts:29`
- Modify: `src/mocks/handlers/custodian.ts:247-307` (`generateTaxLots`)
- Test: `src/mocks/data/__tests__/smh-replacement.test.ts`

**Interfaces:**
- Produces: position `pos-265` (acc-002, SMH, 180 sh @ 245.20); `KNOWN_OPEN_DATES: ReadonlyMap<string, string>`
  exported from `custodian.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/mocks/data/__tests__/smh-replacement.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '../accounts'
import { getPositionsForAccount } from '../positions'
import { generateTaxLots } from '@/mocks/handlers/custodian'

const acc = accounts.find((a) => a.id === 'acc-002')!

describe('acc-002 holds the SMH bought on 2026-02-21 as the INTC replacement', () => {
  const positions = getPositionsForAccount(acc.id, acc.totalValue)
  const smh = positions.find((p) => p.symbol === 'SMH')

  it('holds 180 SMH at $245.20', () => {
    expect(smh).toMatchObject({ quantity: 180, price: 245.2, marketValue: 44_136, costBasis: 44_136 })
  })

  it('was funded from cash: positions still sum to the account value, and cash matches cashBalance', () => {
    const sum = positions.reduce((s, p) => s + p.marketValue, 0)
    expect(sum).toBeCloseTo(acc.totalValue, 0)
    expect(positions.find((p) => p.symbol === 'CASH')!.marketValue).toBe(acc.cashBalance)
    expect(acc.cashBalance).toBe(225_504)
  })

  it('has exactly one lot, dated the purchase day, short-term', () => {
    const lots = generateTaxLots(acc.id, acc.totalValue).filter((l) => l.positionId === smh!.id)
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({ purchaseDate: '2026-02-21', quantity: 180, holdingPeriod: 'short', gainLoss: 0 })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/smh-replacement.test.ts`
Expected: FAIL — `smh` is undefined.

- [ ] **Step 3: Add the position and adjust cash**

In `src/mocks/data/positions.ts`, after the pos-028 line and before pos-025 (CASH), add:

```ts
  // Bought 2026-02-21 as the INTC tax-loss-harvest replacement (activities.ts, note-002, comp-006).
  { id: 'pos-265', accountId: 'acc-002', symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity', quantity: 180, price: 245.20, costBasis: 44_136, marketValue: 44_136, gainLoss: 0, gainLossPercent: 0 },
```

Change the pos-025 CASH line's `price`, `costBasis` and `marketValue` from `269_640` to `225_504`.
In `src/mocks/data/accounts.ts:29` change acc-002 `cashBalance: 269_640` to `cashBalance: 225_504`.
Grep for `269_640` and `269,640` across `src/` and update any comment or fixture that restates it.

- [ ] **Step 4: Give positions with a known purchase date one real lot**

In `src/mocks/handlers/custodian.ts`, above `generateTaxLots`, add:

```ts
/**
 * Positions whose purchase date is a recorded fact rather than synthesised. pos-265 is the SMH
 * bought on 2026-02-21 as the INTC replacement; seeding it 3–47 months old would contradict the
 * activity feed, the note and the compliance record that all date it.
 */
export const KNOWN_OPEN_DATES: ReadonlyMap<string, string> = new Map([['pos-265', '2026-02-21']])
```

Inside the `for (const pos of positions)` loop, directly after the `CASH` `continue`, add:

```ts
    const openedOn = KNOWN_OPEN_DATES.get(pos.id)
    if (openedOn) {
      lots.push({
        id: `lot-${pos.id}-0`,
        positionId: pos.id,
        purchaseDate: openedOn,
        quantity: pos.quantity,
        costBasis: pos.costBasis,
        currentValue: pos.marketValue,
        gainLoss: pos.marketValue - pos.costBasis,
        holdingPeriod: 'short',
        washSaleRestricted: restrictedSymbols.has(pos.symbol),
      })
      continue
    }
```

- [ ] **Step 5: Run the new test, then the full suite**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/smh-replacement.test.ts` → PASS.
Run: `node_modules/.bin/vitest run` → investigate every failure. Expected fallout: invariant tests
that pin acc-002 or hh-001 cash, weights, or drift. Update a pinned number only after confirming
the new value follows from the $44,136 cash→SMH move; note each in the commit message.

- [ ] **Step 6: Commit**

```bash
git add -A src/mocks
git commit -m "fix(data): acc-002 holds the SMH bought as the INTC replacement

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Rebalances never sell periodic-liquidity funds

BXPE (Blackstone Private Equity) is a semi-liquid evergreen fund: redemptions happen only at
periodic repurchase windows, capped as a share of NAV. The engine proposes selling all of it at
market.

**Files:**
- Modify: `src/lib/security-master.ts` (add after `FUND_ONLY_CLASSES`)
- Modify: `src/mocks/handlers/oms.ts:257` (`held` filter in `generateRebalanceTrades`)
- Test: `src/lib/__tests__/security-master.test.ts` (append), `src/mocks/handlers/__tests__/liquidity-invariants.test.ts`

**Interfaces:**
- Produces: `isMarketTradable(symbol: string): boolean` from `@/lib/security-master`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/__tests__/security-master.test.ts` (add `isMarketTradable` to its existing import from `@/lib/security-master`):

```ts
describe('isMarketTradable', () => {
  it('BXPE redeems only at periodic windows, so it is not market-tradable', () => {
    expect(isMarketTradable('BXPE')).toBe(false)
  })
  it('listed ETFs and stocks are market-tradable', () => {
    for (const s of ['SPY', 'INTC', 'IBIT', 'SMH']) expect(isMarketTradable(s)).toBe(true)
  })
})
```

```ts
// src/mocks/handlers/__tests__/liquidity-invariants.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { generateRebalanceTrades, computeDriftForAccountById } from './liquidity-helpers'

describe('a rebalance never proposes a market sale of a periodic-liquidity fund', () => {
  it('no account in the book proposes a BXPE leg, tax-aware or not', () => {
    for (const a of accounts) {
      for (const taxAware of [true, false]) {
        const legs = generateRebalanceTrades(a.id, taxAware)
        expect(legs.filter((l) => l.symbol === 'BXPE'), `${a.id} taxAware=${taxAware}`).toEqual([])
      }
    }
  })

  it('acc-002 still reports its private-equity drift — the holding is visible, just not sold', () => {
    const drift = computeDriftForAccountById('acc-002')
    expect(drift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!.actual).toBeGreaterThan(0)
  })
})
```

Create the tiny helper the test imports, so the test reads cleanly:

```ts
// src/mocks/handlers/__tests__/liquidity-helpers.ts
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '../pms'
export { generateRebalanceTrades } from '../oms'

export function computeDriftForAccountById(id: string) {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`unknown account ${id}`)
  return computeDriftForAccount(account)
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `node_modules/.bin/vitest run src/lib/__tests__/security-master.test.ts src/mocks/handlers/__tests__/liquidity-invariants.test.ts`
Expected: FAIL — `isMarketTradable` is not exported; BXPE legs found for acc-002 and acc-006.

- [ ] **Step 3: Implement**

In `src/lib/security-master.ts`, after `FUND_ONLY_CLASSES`:

```ts
/**
 * Semi-liquid evergreen vehicles: redeemable only at periodic repurchase windows, each capped as
 * a share of NAV (BXPE: quarterly). A rebalance cannot sell them at market, so the engine leaves
 * them in place and lets the drift surface report the exposure.
 */
const PERIODIC_LIQUIDITY_SYMBOLS = new Set(['BXPE'])

export function isMarketTradable(symbol: string): boolean {
  return !PERIODIC_LIQUIDITY_SYMBOLS.has(symbol)
}
```

In `src/mocks/handlers/oms.ts`, add `isMarketTradable` to the existing `@/lib/security-master`
import, and change line 257 to:

```ts
      const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
```

- [ ] **Step 4: Run the tests, then the full suite**

Targeted run → PASS. Full `node_modules/.bin/vitest run`: tests pinning acc-006's rebalance figures
(e.g. the $540,000 sells in the `generateRebalanceTrades` doc comment) may move because BXPE no
longer contributes sells. Update each pinned figure only after confirming the difference equals the
removed BXPE leg, and update the doc comment in `oms.ts` that quotes it.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib src/mocks
git commit -m "fix(rebalance): never propose a market sale of a periodic-liquidity fund

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Compute wash-sale risk instead of hard-coding `false`

**Files:**
- Create: `src/lib/wash-sale.ts`
- Modify: `src/services/oms.ts:92-103` (`ProposedTrade`), `src/mocks/handlers/oms.ts` (`toTrade`, ~line 403)
- Test: `src/lib/__tests__/wash-sale.test.ts`, `src/mocks/handlers/__tests__/wash-sale-risk-invariants.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type LossSaleWindow = { symbol: string; start: string; end: string }
  type Acquisition = { symbol: string; date: string }
  function hasWashSaleRisk(leg: { symbol: string; side: 'buy' | 'sell'; realisesLoss: boolean },
    openLossWindows: readonly LossSaleWindow[], recentAcquisitions: readonly Acquisition[], asOfISO: string): boolean
  function isoDaysBefore(asOfISO: string, days: number): string
  ```

- [ ] **Step 1: Write the failing unit tests**

```ts
// src/lib/__tests__/wash-sale.test.ts
import { describe, it, expect } from 'vitest'
import { hasWashSaleRisk, isoDaysBefore } from '@/lib/wash-sale'

const window = { symbol: 'INTC', start: '2026-01-22', end: '2026-03-23' }

describe('hasWashSaleRisk (IRC §1091, same-symbol approximation)', () => {
  it('a buy inside an open loss-sale window for the same symbol is at risk', () => {
    expect(hasWashSaleRisk({ symbol: 'INTC', side: 'buy', realisesLoss: false }, [window], [], '2026-02-25')).toBe(true)
  })
  it('a buy of a different symbol is not', () => {
    expect(hasWashSaleRisk({ symbol: 'SMH', side: 'buy', realisesLoss: false }, [window], [], '2026-02-25')).toBe(false)
  })
  it('a buy after the window closed is not', () => {
    expect(hasWashSaleRisk({ symbol: 'INTC', side: 'buy', realisesLoss: false }, [window], [], '2026-03-24')).toBe(false)
  })
  it('a loss sale with the same symbol acquired in the prior 30 days is at risk', () => {
    expect(hasWashSaleRisk({ symbol: 'TLT', side: 'sell', realisesLoss: true }, [], [{ symbol: 'TLT', date: '2026-02-01' }], '2026-02-25')).toBe(true)
  })
  it('a loss sale whose last acquisition is 31 days back is not', () => {
    expect(hasWashSaleRisk({ symbol: 'TLT', side: 'sell', realisesLoss: true }, [], [{ symbol: 'TLT', date: '2026-01-25' }], '2026-02-25')).toBe(false)
  })
  it('a gain sale is never at risk', () => {
    expect(hasWashSaleRisk({ symbol: 'TLT', side: 'sell', realisesLoss: false }, [], [{ symbol: 'TLT', date: '2026-02-20' }], '2026-02-25')).toBe(false)
  })
  it('isoDaysBefore crosses month boundaries in UTC', () => {
    expect(isoDaysBefore('2026-03-01', 30)).toBe('2026-01-30')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node_modules/.bin/vitest run src/lib/__tests__/wash-sale.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/wash-sale.ts`**

```ts
/**
 * IRC §1091 disallows a loss when substantially identical securities are acquired within 30 days
 * before or after the sale. "Substantially identical" is approximated as the same symbol: INTC and
 * SMH are distinct, which is the household's own compliance ruling (comp-006).
 */
export type LossSaleWindow = { symbol: string; start: string; end: string }
export type Acquisition = { symbol: string; date: string }
export type WashSaleLeg = { symbol: string; side: 'buy' | 'sell'; realisesLoss: boolean }

const DAY_MS = 86_400_000

export function isoDaysBefore(asOfISO: string, days: number): string {
  return new Date(Date.parse(`${asOfISO}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10)
}

export function hasWashSaleRisk(
  leg: WashSaleLeg,
  openLossWindows: readonly LossSaleWindow[],
  recentAcquisitions: readonly Acquisition[],
  asOfISO: string,
): boolean {
  if (leg.side === 'buy') {
    return openLossWindows.some((w) => w.symbol === leg.symbol && w.start <= asOfISO && asOfISO <= w.end)
  }
  if (!leg.realisesLoss) return false
  const from = isoDaysBefore(asOfISO, 30)
  return recentAcquisitions.some((a) => a.symbol === leg.symbol && a.date >= from && a.date <= asOfISO)
}
```

Run the unit test → PASS.

- [ ] **Step 4: Write the failing engine invariant**

```ts
// src/mocks/handlers/__tests__/wash-sale-risk-invariants.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { generateRebalanceTrades } from '../oms'
import { generateTaxLots } from '../custodian'
import { hasWashSaleRisk } from '@/lib/wash-sale'
import { MOCK_TODAY_ISO } from '@/lib/clock'

function householdAcquisitions(householdId: string) {
  return accounts.filter((a) => a.householdId === householdId).flatMap((a) => {
    const bySymbol = new Map(getPositionsForAccount(a.id, a.totalValue).map((p) => [p.id, p.symbol]))
    return generateTaxLots(a.id, a.totalValue).map((l) => ({ symbol: bySymbol.get(l.positionId)!, date: l.purchaseDate }))
  })
}

describe('washSaleRisk on every proposed leg equals §1091 recomputed independently', () => {
  it('holds for every account, tax-aware', () => {
    for (const a of accounts) {
      const windows = openWashSaleWindows(MOCK_TODAY_ISO, a.householdId)
      const acquisitions = householdAcquisitions(a.householdId)
      for (const leg of generateRebalanceTrades(a.id, true)) {
        const realisesLoss = leg.realisedShortTerm + leg.realisedLongTerm < 0
        expect(leg.washSaleRisk, `${a.id} ${leg.side} ${leg.symbol}`)
          .toBe(hasWashSaleRisk({ symbol: leg.symbol, side: leg.side, realisesLoss }, windows, acquisitions, MOCK_TODAY_ISO))
      }
    }
  })

  it('acc-002 proposes no INTC buy while the household INTC window is open', () => {
    expect(generateRebalanceTrades('acc-002', true).some((l) => l.symbol === 'INTC' && l.side === 'buy')).toBe(false)
  })
})
```

This test reads `realisedShortTerm`/`realisedLongTerm`, which Task 4 adds. Do Step 5 here and Task
4 Step 3 together: implement Task 4's per-leg realisation first if you prefer; either order, both
tasks' tests must pass before Task 4's commit. Commit Task 3 only after Step 6 passes.

- [ ] **Step 5: Wire it into the engine**

In `src/mocks/handlers/oms.ts`: import `hasWashSaleRisk` from `@/lib/wash-sale`. At the top of
`generateRebalanceTrades` (after `const currency = …`) add:

```ts
  const lossWindows = openWashSaleWindows(MOCK_TODAY_ISO, account.householdId)
  const acquisitions = accounts.filter((a) => a.householdId === account.householdId).flatMap((a) => {
    const symbolOf = new Map(getPositionsForAccount(a.id, a.totalValue).map((p) => [p.id, p.symbol]))
    return generateTaxLots(a.id, a.totalValue).map((l) => ({ symbol: symbolOf.get(l.positionId) ?? '', date: l.purchaseDate }))
  })
```

In `toTrade`, replace `washSaleRisk: false,` with:

```ts
        washSaleRisk: hasWashSaleRisk(
          { symbol: target.symbol, side, realisesLoss: realised.shortTerm + realised.longTerm < 0 },
          lossWindows, acquisitions, MOCK_TODAY_ISO,
        ),
```

(`realised` is introduced in Task 4 Step 3.)

- [ ] **Step 6: Run both tests and the full suite** → PASS; then commit together with Task 4 (see Task 4 Step 6).

### Task 4: Net realised gains and losses before estimating tax

`estimateSaleTax` ignores losses (`if (realisedGain > 0)`) and the preview sums per-leg tax, so
acc-002's INTC loss never offsets its SPY gain. US netting (§1222): net short-term and long-term
separately, then offset a net loss in one character against a net gain in the other.

**Files:**
- Create: `src/lib/capital-gains.ts`
- Modify: `src/services/oms.ts:80-103` (`RebalancePreview`, `ProposedTrade`)
- Modify: `src/mocks/handlers/oms.ts:87-106` (`estimateSaleTax` → `realiseSale`), `toTrade`, `/api/oms/rebalance` handler (~line 711-727)
- Modify: `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts:160-170` (the sum invariant becomes the netting invariant)
- Test: `src/lib/__tests__/capital-gains.test.ts`, `src/mocks/handlers/__tests__/tax-netting-invariants.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // @/lib/capital-gains
  function netCapitalGainsTax(shortTerm: number, longTerm: number, rateFor: (p: 'short' | 'long') => number): number
  // ProposedTrade gains: realisedShortTerm: number; realisedLongTerm: number   (signed, account currency)
  // RebalancePreview gains: grossTaxOnGains: number   (sum of legs' taxImpact, before netting)
  // RebalancePreview.estimatedTaxImpact: now the NETTED figure
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/capital-gains.test.ts
import { describe, it, expect } from 'vitest'
import { netCapitalGainsTax } from '@/lib/capital-gains'

const rate = (p: 'short' | 'long') => (p === 'short' ? 0.37 : 0.238)

describe('netCapitalGainsTax (IRC §1222 netting)', () => {
  it('taxes each character at its own rate when both are gains', () => {
    expect(netCapitalGainsTax(1_000, 2_000, rate)).toBe(Math.round(370 + 476))
  })
  it('a long-term loss offsets a short-term gain', () => {
    expect(netCapitalGainsTax(10_000, -4_000, rate)).toBe(Math.round(6_000 * 0.37))
  })
  it('a short-term loss offsets a long-term gain', () => {
    expect(netCapitalGainsTax(-3_000, 10_000, rate)).toBe(Math.round(7_000 * 0.238))
  })
  it('a pure harvest (losses only) owes nothing — never a negative tax', () => {
    expect(netCapitalGainsTax(-5_000, -45_850, rate)).toBe(0)
  })
  it('losses larger than gains net to zero tax', () => {
    expect(netCapitalGainsTax(2_000, -9_000, rate)).toBe(0)
  })
})
```

```ts
// src/mocks/handlers/__tests__/tax-netting-invariants.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { previewRebalance, type RebalancePreview } from '@/services/oms'
import { netCapitalGainsTax } from '@/lib/capital-gains'
import { taxRateFor } from '@/features/portfolios/tax/shared'

// The MSW server is started for every test file by src/test/setup.ts.
let preview: RebalancePreview | undefined
beforeAll(async () => {
  ;[preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
})

describe('the rebalance preview nets realised gains and losses', () => {

  it('the INTC sale realises a loss', () => {
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.realisedShortTerm + intc.realisedLongTerm).toBeLessThan(0)
    expect(intc.taxImpact).toBe(0)
  })

  it('estimatedTaxImpact is the netted tax on summed short- and long-term results', () => {
    const st = preview!.trades.reduce((s, t) => s + t.realisedShortTerm, 0)
    const lt = preview!.trades.reduce((s, t) => s + t.realisedLongTerm, 0)
    expect(preview!.estimatedTaxImpact).toBe(netCapitalGainsTax(st, lt, taxRateFor))
  })

  it('netting lowers the bill below the gross per-leg tax when a loss is realised', () => {
    expect(preview!.grossTaxOnGains).toBe(preview!.trades.reduce((s, t) => s + t.taxImpact, 0))
    expect(preview!.estimatedTaxImpact).toBeLessThan(preview!.grossTaxOnGains)
  })

  it('a buy realises nothing', () => {
    for (const t of preview!.trades.filter((x) => x.side === 'buy')) {
      expect([t.realisedShortTerm, t.realisedLongTerm]).toEqual([0, 0])
    }
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `node_modules/.bin/vitest run src/lib/__tests__/capital-gains.test.ts src/mocks/handlers/__tests__/tax-netting-invariants.test.ts`
Expected: FAIL — module missing; `realisedShortTerm` undefined.

- [ ] **Step 3: Implement**

`src/lib/capital-gains.ts`:

```ts
export type HoldingCharacter = 'short' | 'long'

/**
 * IRC §1222: net short-term and long-term results within each character, then offset a net loss
 * in one against a net gain in the other. A net loss overall owes nothing here; the excess
 * carries forward and is reported by the caller, never shown as a negative tax.
 */
export function netCapitalGainsTax(shortTerm: number, longTerm: number, rateFor: (p: HoldingCharacter) => number): number {
  let st = shortTerm
  let lt = longTerm
  if (st < 0 && lt > 0) { lt = Math.max(0, lt + st); st = 0 }
  else if (lt < 0 && st > 0) { st = Math.max(0, st + lt); lt = 0 }
  return Math.round(Math.max(0, st) * rateFor('short') + Math.max(0, lt) * rateFor('long'))
}
```

In `src/services/oms.ts`, add to `ProposedTrade` (after `taxImpact`):

```ts
  /** Realised result of this leg by holding period, signed (loss < 0), account currency. 0 for buys. */
  realisedShortTerm: number
  realisedLongTerm: number
```

and to `RebalancePreview` (after `estimatedTaxImpact`, and reword its comment):

```ts
  /** Sum of the legs' `taxImpact` — tax on gains before losses are netted. */
  grossTaxOnGains: number
```

with `estimatedTaxImpact`'s comment stating it is the §1222-netted figure.

In `src/mocks/handlers/oms.ts`, replace `estimateSaleTax` (lines 87–106) with:

```ts
type RealisedSale = { shortTerm: number; longTerm: number; tax: number }
const NOTHING_REALISED: RealisedSale = { shortTerm: 0, longTerm: 0, tax: 0 }

function realiseSale(accountId: string, totalValue: number, target: Position, notional: number, taxAware: boolean): RealisedSale {
  const lots = generateTaxLots(accountId, totalValue).filter((l) => l.positionId === target.id)
  if (lots.length === 0 || notional <= 0) return NOTHING_REALISED
  const taxPerDollar = (l: (typeof lots)[number]) => (l.gainLoss / l.currentValue) * taxRateFor(l.holdingPeriod)
  const ordered = taxAware ? [...lots].sort((a, b) => taxPerDollar(a) - taxPerDollar(b)) : lots

  let remaining = notional
  let shortTerm = 0
  let longTerm = 0
  let tax = 0
  for (const lot of ordered) {
    if (remaining <= 0 || lot.currentValue <= 0) continue
    const portion = Math.min(1, remaining / lot.currentValue)
    const realised = lot.gainLoss * portion
    if (lot.holdingPeriod === 'short') shortTerm += realised
    else longTerm += realised
    if (realised > 0) tax += realised * taxRateFor(lot.holdingPeriod)
    remaining -= lot.currentValue * portion
  }
  return { shortTerm: Math.round(shortTerm), longTerm: Math.round(longTerm), tax: Math.max(0, Math.round(tax)) }
}
```

Keep the existing doc comment above it (it still describes the lot ordering). Grep for other
`estimateSaleTax` callers and switch them to `realiseSale(...).tax`.

In `toTrade`, replace the `taxImpact` computation with:

```ts
      const realised = side === 'sell' && taxable && target.position
        ? realiseSale(account.id, account.totalValue, target.position, estimatedValue, taxAware)
        : NOTHING_REALISED
```

and in the returned object use `taxImpact: realised.tax, realisedShortTerm: realised.shortTerm, realisedLongTerm: realised.longTerm,`.

In the `/api/oms/rebalance` handler, replace the `estimatedTaxImpact` line with:

```ts
        // §1222 — net short- and long-term results across legs before applying rates; the gross
        // figure is kept so a surface can show what netting saved.
        estimatedTaxImpact: netCapitalGainsTax(
          trades.reduce((s, t) => s + t.realisedShortTerm, 0),
          trades.reduce((s, t) => s + t.realisedLongTerm, 0),
          taxRateFor,
        ),
        grossTaxOnGains: trades.reduce((sum, t) => sum + t.taxImpact, 0),
```

Run `pnpm exec tsc --noEmit`; every other producer of `ProposedTrade` (e.g. `src/mocks/handlers/trading.ts`) must now
set `realisedShortTerm`/`realisedLongTerm` — set them from the same `realiseSale` result where a
sell is taxed, or `0` where the leg is a buy or the account is not taxable.

- [ ] **Step 4: Update the superseded invariant**

In `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts` around line 168, the assertion
`estimatedTaxImpact ≈ sum of taxImpact` now describes `grossTaxOnGains`. Change it to assert
`preview!.grossTaxOnGains` equals the sum, and add `expect(preview!.estimatedTaxImpact).toBeLessThanOrEqual(preview!.grossTaxOnGains)`.

- [ ] **Step 5: Check UI consumers**

Grep `estimatedTaxImpact` under `src/features`. Each label that reads "Estimated tax" stays
correct (it is now the netted estimate). Where a surface sums `taxImpact` across legs itself
instead of reading `estimatedTaxImpact`, switch it to `estimatedTaxImpact` and adjust its test.

- [ ] **Step 6: Run everything and commit Tasks 3 + 4**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build` → all green.

```bash
git add -A src
git commit -m "fix(tax): net realised gains and losses, and compute wash-sale risk per leg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Land Phase A on `main` (gated on Joel)

- [ ] **Step 1:** Run the full suite twice (`node_modules/.bin/vitest run`), `pnpm lint`, `pnpm build`. Record results.
- [ ] **Step 2:** Request a code review of `main..fix/acc-002-scenario-integrity` (superpowers:requesting-code-review), with the finance-skills `tax-loss-harvesting` and `rebalancing` skills as the domain reference.
- [ ] **Step 3:** Show Joel the review and the new acc-002 numbers (net tax before/after). **Ask before** fast-forwarding `main` and pushing.
- [ ] **Step 4:** On approval: `git switch main && git merge --ff-only fix/acc-002-scenario-integrity && git push origin main && git branch -d fix/acc-002-scenario-integrity`.

---

## Phase B — lab foundation on `design-exploration`

`git switch -c design-exploration main` (after Task 5). Tasks 6–9 run in the main session or
sequential subagents; no parallelism (they define the shared contract).

### Task 6: The de-Meridianed audit brief

**Files:**
- Create: `docs/superpowers/exploration/audit-brief.md`

- [ ] **Step 1: Distil**

Read `docs/superpowers/reference/SYNTHESIS.md` and the five `critique-*.md` files. Write
`audit-brief.md` as a list of **problems stated as requirements**, grouped: Data density & tables;
Number formatting; Charts; Hierarchy & navigation; Copy & voice; Accessibility & keyboard; AI
surfaces; Domain correctness. Each item: one-line requirement, one-line evidence (screen + what
was wrong), never a prescribed visual answer. Drop every item that only makes sense inside
Meridian (e.g. "use Instrument Serif for …", "no card shadows at rest").

- [ ] **Step 2: Verify no answers leaked**

Run:
```bash
grep -niE "meridian|instrument (serif|sans)|plex|cream|espresso|paper|hairline|earth accent|sentence case|no pills|tag component" docs/superpowers/exploration/audit-brief.md
```
Expected: no output. Rewrite any hit as the underlying problem.

- [ ] **Step 3: Commit** — `git add docs/superpowers/exploration && git commit -m "docs(exploration): audit brief — problems without Meridian's answers"` (with the Co-Authored-By trailer).

### Task 7: Lab contract, registry, routes and guardrails

**Files:**
- Create: `src/lab/contract.ts`, `src/lab/registry.ts`, `src/lab/shell/parse-lab-theme.ts`,
  `src/lab/shell/use-lab-theme.ts`, `src/lab/shell/LabIndex.tsx`, `src/lab/shell/LabDirectionRoute.tsx`,
  `src/lab/shell/LabNotFound.tsx`, `src/lab/{terminal,instrument,spatial,multiplayer}/Direction.tsx`
- Modify: `src/app/routes.tsx` (add two top-level routes outside `AppShell`)
- Test: `src/lab/__tests__/lab-routes.test.tsx`, `src/lab/__tests__/parse-lab-theme.test.ts`,
  `src/lab/__tests__/lab-guardrails.test.ts`

**Interfaces:**
- Produces (`src/lab/contract.ts` — **no imports**, so Playwright can import it by relative path):
  ```ts
  export const DIRECTION_KEYS = ['terminal', 'instrument', 'spatial', 'multiplayer'] as const
  export type DirectionKey = (typeof DIRECTION_KEYS)[number]
  export const BEATS = ['surface', 'understand', 'construct', 'approve', 'inform', 'density'] as const
  export type Beat = (typeof BEATS)[number]
  export type LabTheme = 'light' | 'dark'
  export type DirectionProps = { beat: Beat; theme: LabTheme }
  export function isDirectionKey(v: string | undefined): v is DirectionKey
  export function isBeat(v: string | undefined): v is Beat
  ```
- Produces (`src/lab/registry.ts`):
  ```ts
  export type LabDirection = { key: DirectionKey; title: string; stance: string; Component: LazyExoticComponent<ComponentType<DirectionProps>> }
  export const LAB_DIRECTIONS: ReadonlyMap<DirectionKey, LabDirection>
  ```
- Produces: `parseLabTheme(param: string | null, prefersDark: boolean): LabTheme`; `useLabTheme(): LabTheme`.
- Direction root contract (every `Direction.tsx`): render a root element with
  `data-lab={key}`, `data-theme-mode={theme}`, and `data-lab-ready="true"` **only** once scenario
  data has rendered.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lab/__tests__/parse-lab-theme.test.ts
import { describe, it, expect } from 'vitest'
import { parseLabTheme } from '@/lab/shell/parse-lab-theme'

describe('parseLabTheme', () => {
  it('honours an explicit param', () => {
    expect(parseLabTheme('dark', false)).toBe('dark')
    expect(parseLabTheme('light', true)).toBe('light')
  })
  it('falls back to the system preference for a missing or invalid param', () => {
    expect(parseLabTheme(null, true)).toBe('dark')
    expect(parseLabTheme('purple', false)).toBe('light')
  })
})
```

```tsx
// src/lab/__tests__/lab-routes.test.tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { LabIndex } from '@/lab/shell/LabIndex'
import { LabDirectionRoute } from '@/lab/shell/LabDirectionRoute'
import { DIRECTION_KEYS } from '@/lab/contract'

function renderLab(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/lab" element={<LabIndex />} />
      <Route path="/lab/:direction/:beat?" element={<LabDirectionRoute />} />
    </Routes>,
    { initialEntries: [path] },
  )
}

describe('lab routes', () => {
  it('the index links every direction', () => {
    renderLab('/lab')
    for (const key of DIRECTION_KEYS) {
      expect(screen.getByRole('link', { name: new RegExp(key, 'i') })).toHaveAttribute('href', `/lab/${key}/surface`)
    }
  })

  it.each(DIRECTION_KEYS)('%s renders its root with the contract attributes', async (key) => {
    renderLab(`/lab/${key}/surface?theme=dark`)
    const root = await screen.findByTestId(`lab-root-${key}`)
    expect(root).toHaveAttribute('data-lab', key)
    expect(root).toHaveAttribute('data-theme-mode', 'dark')
  })

  it('an unknown direction shows not-found with a way back', () => {
    renderLab('/lab/foo/surface')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all directions/i })).toHaveAttribute('href', '/lab')
  })

  it('an unknown beat shows not-found', () => {
    renderLab('/lab/terminal/bogus')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })

  it('a missing beat defaults to surface', async () => {
    renderLab('/lab/terminal')
    expect(await screen.findByTestId('lab-root-terminal')).toBeInTheDocument()
  })
})
```

```ts
// src/lab/__tests__/lab-guardrails.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const LAB = join(process.cwd(), 'src/lab')
const MUTATIONS = ['submitTrade', 'executeRebalance', 'executeModelTrades', 'sendMessage', 'createThread', 'dismissNBA', 'snoozeNBA', 'executeBatchAction', 'useSendMessage', 'useCreateThread', 'useDismissNBA', 'useSnoozeNBA']
const FORBIDDEN_IMPORTS = ['@/components/', '@/features/']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('lab guardrails', () => {
  const files = sourceFiles(LAB)

  it('no lab file calls a mutation (shared MSW state must stay identical across directions)', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of MUTATIONS) expect(new RegExp(`\\b${m}\\b`).test(src), `${f} uses ${m}`).toBe(false)
    }
  })

  it('no lab file imports the old UI (directions start clean)', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const p of FORBIDDEN_IMPORTS) expect(src.includes(`'${p}`), `${f} imports ${p}`).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `node_modules/.bin/vitest run src/lab` → FAIL, modules missing.

- [ ] **Step 3: Implement contract, theme, registry, shell**

`src/lab/contract.ts`:

```ts
export const DIRECTION_KEYS = ['terminal', 'instrument', 'spatial', 'multiplayer'] as const
export type DirectionKey = (typeof DIRECTION_KEYS)[number]

export const BEATS = ['surface', 'understand', 'construct', 'approve', 'inform', 'density'] as const
export type Beat = (typeof BEATS)[number]

export type LabTheme = 'light' | 'dark'
export type DirectionProps = { beat: Beat; theme: LabTheme }

export function isDirectionKey(v: string | undefined): v is DirectionKey {
  return (DIRECTION_KEYS as readonly string[]).includes(v ?? '')
}

export function isBeat(v: string | undefined): v is Beat {
  return (BEATS as readonly string[]).includes(v ?? '')
}
```

`src/lab/shell/parse-lab-theme.ts`:

```ts
import type { LabTheme } from '@/lab/contract'

export function parseLabTheme(param: string | null, prefersDark: boolean): LabTheme {
  if (param === 'light' || param === 'dark') return param
  return prefersDark ? 'dark' : 'light'
}
```

`src/lab/shell/use-lab-theme.ts`:

```ts
import { useSearchParams } from 'react-router-dom'
import type { LabTheme } from '@/lab/contract'
import { parseLabTheme } from './parse-lab-theme'

export function useLabTheme(): LabTheme {
  const [params] = useSearchParams()
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return parseLabTheme(params.get('theme'), prefersDark)
}
```

`src/lab/registry.ts`:

```ts
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { DirectionKey, DirectionProps } from './contract'

export type LabDirection = {
  key: DirectionKey
  title: string
  stance: string
  Component: LazyExoticComponent<ComponentType<DirectionProps>>
}

const entries: LabDirection[] = [
  { key: 'terminal', title: 'Terminal', stance: 'The advisor as a professional operator: dense, keyboard-first, dark-first.', Component: lazy(() => import('./terminal/Direction')) },
  { key: 'instrument', title: 'Instrument', stance: 'Swiss/engineering precision: every figure a measurement with its unit.', Component: lazy(() => import('./instrument/Direction')) },
  { key: 'spatial', title: 'Spatial', stance: 'Calm, high-end modern product: depth, restraint, detail on focus.', Component: lazy(() => import('./spatial/Direction')) },
  { key: 'multiplayer', title: 'Multiplayer', stance: 'Humans, agents and the client completing jobs together in threads.', Component: lazy(() => import('./multiplayer/Direction')) },
]

export const LAB_DIRECTIONS: ReadonlyMap<DirectionKey, LabDirection> = new Map(entries.map((e) => [e.key, e]))
```

Each placeholder `src/lab/<key>/Direction.tsx` (replace `<key>` literally in each of the four files):

```tsx
import type { DirectionProps } from '@/lab/contract'

export default function Direction({ beat, theme }: DirectionProps) {
  return (
    <div data-testid="lab-root-<key>" data-lab="<key>" data-theme-mode={theme}>
      <p>Placeholder — {beat}</p>
    </div>
  )
}
```

`src/lab/shell/LabNotFound.tsx`:

```tsx
import { Link } from 'react-router-dom'

export function LabNotFound() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui' }}>
      <h1>Not found</h1>
      <Link to="/lab">All directions</Link>
    </main>
  )
}
```

`src/lab/shell/LabIndex.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { LAB_DIRECTIONS } from '@/lab/registry'

export function LabIndex() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 720 }}>
      <h1>Design exploration</h1>
      <ul>
        {[...LAB_DIRECTIONS.values()].map((d) => (
          <li key={d.key}>
            <Link to={`/lab/${d.key}/surface`}>{d.title} ({d.key})</Link> — {d.stance}
          </li>
        ))}
      </ul>
    </main>
  )
}
```

`src/lab/shell/LabDirectionRoute.tsx`:

```tsx
import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { isBeat, isDirectionKey } from '@/lab/contract'
import { LAB_DIRECTIONS } from '@/lab/registry'
import { useLabTheme } from './use-lab-theme'
import { LabNotFound } from './LabNotFound'

export function LabDirectionRoute() {
  const { direction, beat = 'surface' } = useParams()
  const theme = useLabTheme()
  if (!isDirectionKey(direction) || !isBeat(beat)) return <LabNotFound />
  const { Component } = LAB_DIRECTIONS.get(direction)!
  return (
    <Suspense fallback={null}>
      <Component beat={beat} theme={theme} />
    </Suspense>
  )
}
```

In `src/app/routes.tsx`, add the lazy imports beside the others:

```ts
const LabIndex = lazy(() => import('@/lab/shell/LabIndex').then((m) => ({ default: m.LabIndex })))
const LabDirectionRoute = lazy(() => import('@/lab/shell/LabDirectionRoute').then((m) => ({ default: m.LabDirectionRoute })))
```

and add as **siblings of** the `'/'` route object in the `createBrowserRouter([...])` array:

```ts
  { path: '/lab', element: suspense(<LabIndex />), errorElement: <RouteErrorPage /> },
  { path: '/lab/:direction/:beat?', element: suspense(<LabDirectionRoute />), errorElement: <RouteErrorPage /> },
```

- [ ] **Step 4: Run tests, lint, build** → `node_modules/.bin/vitest run src/lab && pnpm lint && pnpm build` all PASS.
- [ ] **Step 5: Commit** — `feat(lab): contract, registry, routes and guardrails for the design exploration` (+ trailer).

### Task 8: The shared scenario loader

**Files:**
- Create: `src/lab/scenario/scenario.ts`, `src/lab/scenario/load-scenario.ts`, `src/lab/scenario/use-scenario.ts`
- Test: `src/lab/scenario/__tests__/load-scenario.test.ts`, `src/lab/scenario/__tests__/use-scenario.test.tsx`

**Interfaces:**
- Consumes: services `getAccount`, `getTaxLots`, `getOpenWashSaleWindows` (custodian); `getPositions`,
  `getDrift` (pms); `previewRebalance`, `preTradeCheck` (oms); `getNBAs` (nba); `getThreads`,
  `getMessages` (messaging); `getClient`, `getHousehold`, `getClientCommunications` (crm).
- Produces:
  ```ts
  // scenario.ts
  export const SCENARIO: { accountId: 'acc-002'; clientId: 'cli-001'; householdId: 'hh-001'; advisorId: 'user-001'; teamThreadId: 'thread-001'; nbaIds: readonly string[] }
  export type ScenarioLot = TaxLot & { symbol: string; name: string }
  export type ScenarioData = { account; client; household; positions; drift; lots: ScenarioLot[]; washSaleWindows;
    nbas; rebalance: RebalancePreview; preTradeChecks: ReadonlyMap<string, PreTradeCheckResult>;
    teamThread: Thread; teamMessages: Message[]; clientComms }   // field types are the services' own return types
  export class ScenarioError extends Error {}
  // load-scenario.ts
  export function loadScenario(): Promise<ScenarioData>
  export function joinLotsToPositions(lots: TaxLot[], positions: Position[]): ScenarioLot[]
  // use-scenario.ts
  export type ScenarioState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: ScenarioData }
  export function useScenario(): ScenarioState
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lab/scenario/__tests__/load-scenario.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { loadScenario, joinLotsToPositions } from '@/lab/scenario/load-scenario'
import type { ScenarioData } from '@/lab/scenario/scenario'
import { MOCK_TODAY_ISO } from '@/lib/clock'

let s: ScenarioData
beforeAll(async () => { s = await loadScenario() })

describe('the acc-002 scenario, pinned to the engine', () => {
  it('is Robert Johnson’s taxable individual account in the Johnson household', () => {
    expect(s.account).toMatchObject({ id: 'acc-002', taxTreatment: 'taxable', modelId: 'mod-002', costBasisMethod: 'specific_id' })
    expect(s.client.fullName).toBe('Robert Johnson')
    expect(s.household.id).toBe('hh-001')
  })

  it('beat 1 — drift is past the model band', () => {
    expect(s.drift.driftTolerance).toBe(0.05)
    expect(s.drift.maxAbsDrift).toBeGreaterThan(s.drift.driftTolerance * 2)
  })

  it('beat 2 — lots carry symbols, include an INTC loss, and include the SMH replacement', () => {
    const intc = s.lots.filter((l) => l.symbol === 'INTC')
    expect(intc.length).toBeGreaterThan(0)
    expect(intc.reduce((sum, l) => sum + l.gainLoss, 0)).toBeLessThan(0)
    expect(s.lots.find((l) => l.symbol === 'SMH')).toMatchObject({ purchaseDate: '2026-02-21', holdingPeriod: 'short' })
  })

  it('beat 2 — the household INTC wash-sale window is open today', () => {
    const w = s.washSaleWindows.find((x) => x.symbol === 'INTC')!
    expect(w.start <= MOCK_TODAY_ISO && MOCK_TODAY_ISO <= w.end).toBe(true)
  })

  it('beat 3 — the preview harvests INTC, never buys it back, and leaves BXPE alone', () => {
    const t = s.rebalance.trades
    expect(t.some((x) => x.symbol === 'INTC' && x.side === 'sell')).toBe(true)
    expect(t.some((x) => x.symbol === 'INTC' && x.side === 'buy')).toBe(false)
    expect(t.some((x) => x.symbol === 'BXPE')).toBe(false)
    expect(s.rebalance.estimatedTaxImpact).toBeLessThan(s.rebalance.grossTaxOnGains)
  })

  it('beat 3 — every proposed leg has a pre-trade check result', () => {
    for (const t of s.rebalance.trades) expect(s.preTradeChecks.has(t.symbol)).toBe(true)
  })

  it('surfaces the INTC harvest and batch-rebalance NBAs and the team thread', () => {
    expect(s.nbas.map((n) => n.id)).toEqual(expect.arrayContaining(['nba-001', 'nba-002']))
    expect(s.teamThread.subject).toBe('Johnson Rebalance Review')
    expect(s.teamMessages.length).toBeGreaterThan(0)
  })
})

describe('joinLotsToPositions', () => {
  it('drops a lot whose position is unknown rather than inventing a symbol', () => {
    const lots = [{ id: 'l1', positionId: 'missing', purchaseDate: '2025-01-01', quantity: 1, costBasis: 1, currentValue: 1, gainLoss: 0, holdingPeriod: 'long' as const, washSaleRestricted: false }]
    expect(joinLotsToPositions(lots, [])).toEqual([])
  })
})
```

```tsx
// src/lab/scenario/__tests__/use-scenario.test.tsx
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { useScenario } from '@/lab/scenario/use-scenario'

describe('useScenario', () => {
  it('starts loading, then is ready', async () => {
    const client = createTestQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useScenario(), { wrapper })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })
})
```

- [ ] **Step 2: Run to verify they fail** → `node_modules/.bin/vitest run src/lab/scenario` FAIL, modules missing.

- [ ] **Step 3: Implement**

`src/lab/scenario/scenario.ts`:

```ts
import type { getAccount, getOpenWashSaleWindows } from '@/services/custodian'
import type { getDrift, getPositions } from '@/services/pms'
import type { PreTradeCheckResult, RebalancePreview } from '@/services/oms'
import type { getNBAs } from '@/services/nba'
import type { getClient, getHousehold, getClientCommunications } from '@/services/crm'
import type { Message, Thread } from '@/types/messaging'
import type { TaxLot } from '@/types/portfolio'

type Resolved<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>

export const SCENARIO = {
  accountId: 'acc-002',
  clientId: 'cli-001',
  householdId: 'hh-001',
  advisorId: 'user-001',
  teamThreadId: 'thread-001',
  nbaIds: ['nba-001', 'nba-002', 'nba-012'],
} as const

export type ScenarioLot = TaxLot & { symbol: string; name: string }

export type ScenarioData = {
  account: Resolved<typeof getAccount>
  client: Resolved<typeof getClient>
  household: Resolved<typeof getHousehold>
  positions: Resolved<typeof getPositions>
  drift: Resolved<typeof getDrift>
  lots: ScenarioLot[]
  washSaleWindows: Resolved<typeof getOpenWashSaleWindows>
  nbas: Resolved<typeof getNBAs>
  rebalance: RebalancePreview
  preTradeChecks: ReadonlyMap<string, PreTradeCheckResult>
  teamThread: Thread
  teamMessages: Message[]
  clientComms: Resolved<typeof getClientCommunications>
}

export class ScenarioError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScenarioError'
  }
}
```

If `getNBAs` returns a wrapper rather than an array (check `src/services/nba.ts:4`), unwrap it in
`loadScenario` and type `nbas` as the element array.

`src/lab/scenario/load-scenario.ts`:

```ts
import { getAccount, getTaxLots, getOpenWashSaleWindows } from '@/services/custodian'
import { getDrift, getPositions } from '@/services/pms'
import { preTradeCheck, previewRebalance } from '@/services/oms'
import { getNBAs } from '@/services/nba'
import { getMessages, getThreads } from '@/services/messaging'
import { getClient, getClientCommunications, getHousehold } from '@/services/crm'
import type { Position, TaxLot } from '@/types/portfolio'
import { SCENARIO, ScenarioError, type ScenarioData, type ScenarioLot } from './scenario'

export function joinLotsToPositions(lots: TaxLot[], positions: Position[]): ScenarioLot[] {
  const byId = new Map(positions.map((p) => [p.id, p]))
  return lots.flatMap((lot) => {
    const p = byId.get(lot.positionId)
    return p ? [{ ...lot, symbol: p.symbol, name: p.name }] : []
  })
}

export async function loadScenario(): Promise<ScenarioData> {
  const { accountId, clientId, householdId, teamThreadId, nbaIds } = SCENARIO
  const [account, client, household, positions, drift, taxLots, washSaleWindows, nbas, threads, teamMessages, clientComms, previews] =
    await Promise.all([
      getAccount(accountId), getClient(clientId), getHousehold(householdId), getPositions(accountId), getDrift(accountId),
      getTaxLots(accountId), getOpenWashSaleWindows(accountId), getNBAs(), getThreads(), getMessages(teamThreadId),
      getClientCommunications(clientId), previewRebalance({ accountIds: [accountId], taxAware: true }),
    ])

  const rebalance = previews.find((p) => p.accountId === accountId)
  if (!rebalance) throw new ScenarioError(`no rebalance preview returned for ${accountId}`)
  const teamThread = threads.find((t) => t.id === teamThreadId)
  if (!teamThread) throw new ScenarioError(`team thread ${teamThreadId} not found`)

  const checks = await Promise.all(
    rebalance.trades.map(async (t) => [t.symbol, await preTradeCheck({
      accountId, symbol: t.symbol, side: t.side, quantity: t.quantity, estimatedValue: t.estimatedValue,
    })] as const),
  )

  return {
    account, client, household, positions, drift, washSaleWindows, teamMessages, clientComms, rebalance, teamThread,
    lots: joinLotsToPositions(taxLots, positions),
    nbas: nbas.filter((n) => (nbaIds as readonly string[]).includes(n.id)),
    preTradeChecks: new Map(checks),
  }
}
```

`src/lab/scenario/use-scenario.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { loadScenario } from './load-scenario'
import type { ScenarioData } from './scenario'

export type ScenarioState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: ScenarioData }

export function useScenario(): ScenarioState {
  const q = useQuery({ queryKey: ['lab', 'scenario'], queryFn: loadScenario, staleTime: Infinity })
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'error', error: q.error }
  return { status: 'ready', data: q.data }
}
```

- [ ] **Step 4: Run** `node_modules/.bin/vitest run src/lab && pnpm lint && pnpm build` → PASS. Fix any service-shape mismatch the compiler reports by reading the service, never by casting.
- [ ] **Step 5: Commit** — `feat(lab): shared acc-002 scenario loader pinned to the engine` (+ trailer).

### Task 9: Screenshot harness

**Files:**
- Create: `playwright.lab.config.ts`, `e2e-lab/lab-screens.spec.ts`
- Modify: `package.json` scripts (add `"lab:screens": "playwright test -c playwright.lab.config.ts"`), `.gitignore` if Playwright output dirs need excluding

- [ ] **Step 1: Write the config and spec**

```ts
// playwright.lab.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-lab',
  reporter: 'list',
  workers: 4,
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1440, height: 900 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'pnpm dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
})
```

```ts
// e2e-lab/lab-screens.spec.ts
import { test, expect } from '@playwright/test'
import { BEATS, DIRECTION_KEYS } from '../src/lab/contract'

const only = process.env.LAB_DIRECTION
const keys = only ? DIRECTION_KEYS.filter((k) => k === only) : DIRECTION_KEYS

for (const key of keys) {
  for (const beat of BEATS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${key} · ${beat} · ${theme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme })
        await page.goto(`/lab/${key}/${beat}?theme=${theme}`)
        await expect(page.locator(`[data-lab="${key}"][data-lab-ready="true"]`)).toBeVisible({ timeout: 15_000 })
        await page.screenshot({ path: `docs/superpowers/exploration/screens/${key}/${beat}-${theme}.png`, fullPage: true })
      })
    }
  }
}
```

- [ ] **Step 2: Verify it fails against placeholders**

Run: `LAB_DIRECTION=terminal pnpm lab:screens`
Expected: FAIL — placeholders never set `data-lab-ready`. This is the guard that a real direction
must render scenario data before it counts.

- [ ] **Step 3: Commit** — `test(lab): screenshot harness gated on data-lab-ready` (+ trailer). Record the SHA: `git rev-parse HEAD` → this is **SETUP_SHA** for Phase C.

---

## Phase C — four directions in parallel

### Task 10: Create four worktrees from SETUP_SHA

- [ ] **Step 1:**

```bash
for k in terminal instrument spatial multiplayer; do
  git worktree add -b "lab/$k" "../advisor-desktop-lab-$k" design-exploration
  (cd "../advisor-desktop-lab-$k" && pnpm install --frozen-lockfile)
done
git worktree list
```

Expected: four worktrees, each at SETUP_SHA (`git -C ../advisor-desktop-lab-terminal log --oneline -1`).

Do **not** use the Agent tool's `isolation: "worktree"` — it branches from `main`, not `design-exploration`.

### Task 11: Build each direction (four parallel subagents)

Dispatch four subagents in one message, one per row below, each with the prompt template filled
in. They share no writable files; they read the same frozen contract.

| key | worktree | stance (verbatim from spec) | bet |
|---|---|---|---|
| `terminal` | `../advisor-desktop-lab-terminal` | The advisor as a professional operator: dense, keyboard-first, dark-first. Bloomberg lineage, modern and legible rather than retro. | Experts read density as respect. |
| `instrument` | `../advisor-desktop-lab-instrument` | Swiss/engineering precision — Braun, Teenage Engineering, lab equipment. Strict grid, monochrome plus one signal colour, every figure presented as a measurement with its unit. | When numbers are the product, the interface should be a precision instrument. |
| `spatial` | `../advisor-desktop-lab-spatial` | Calm, high-end modern product — the Linear / Arc school. Depth, layering, purposeful motion, extreme restraint; detail appears as focus arrives. | The memorable thing is a pro tool that feels calm. |
| `multiplayer` | `../advisor-desktop-lab-multiplayer` | The work happens in conversation. Human team, agent team and the client share one or more threads; intelligent interactive components are embedded where a step needs them, moving the job forward across research, trading, reporting and evaluation. | AI-native advisory is a team of humans and agents completing jobs together, not a dashboard with a chatbot. |

**Prompt template** (fill `{key}`, `{worktree}`, `{stance}`, `{bet}`, `{SETUP_SHA}`):

> You are designing and building the **{key}** direction of a four-way design exploration for
> Advisor Desktop, a wealth-management advisor workstation that is a public portfolio showcase
> judged by people who know wealth management and people who review a lot of interfaces. Generic
> competence reads as failure; domain errors are reputational.
>
> **Work only in `{worktree}`.** First run `git -C {worktree} log --oneline -1` and confirm it is
> `{SETUP_SHA}`; if not, stop and report BLOCKED.
>
> **Stance:** {stance} **Bet:** {bet} Push the stance to a distinctive, opinionated conclusion — a
> safe middle is a loss. You may not land on warm paper with an editorial serif.
>
> **Read first:** `docs/superpowers/specs/2026-10-10-design-exploration-design.md` (the spec),
> `docs/superpowers/exploration/audit-brief.md` (problems you must solve), `src/lab/contract.ts`,
> `src/lab/scenario/scenario.ts`, `src/lab/scenario/load-scenario.ts`. **Never open**
> `docs/superpowers/reference/**`, `docs/superpowers/plans/2026-07-24-*`, or any Meridian file.
>
> **Skills:** load `impeccable:frontend-design` before writing UI and `dataviz` before any chart;
> use `design:design-system` to shape your tokens.
>
> **Build:** replace `src/lab/{key}/Direction.tsx` and add files only under `src/lab/{key}/`. Render
> all six beats (`surface`, `understand`, `construct`, `approve`, `inform`, `density`) per the spec's
> "shared scenario" section, in light and dark (`theme` prop). Get every figure from `useScenario()`
> (`@/lab/scenario/use-scenario`); never type a number. Use `formatCurrency`/`formatPercent` from
> `@/lib/utils` or your own formatter built on `Intl.NumberFormat` — one formatter for the whole
> direction. Approval and sending are local component state; never call a mutation service. You
> may import from `@/lab/*`, `@/lib/*`, `@/types/*`, `@/services/*`, `@/hooks/*` (queries only);
> never from `@/components/*` or `@/features/*`. Scope all styles under `[data-lab="{key}"]`; no
> global selectors; fonts via a Google Fonts `<link>` your root injects, or woff2 files in your
> folder; no new dependencies.
>
> **Root contract:** your root element has `data-testid="lab-root-{key}"`, `data-lab="{key}"`,
> `data-theme-mode={theme}`, and `data-lab-ready="true"` only after scenario data has rendered.
> While loading show a designed loading state; on error show the error message.
>
> **Domain (all directions):** INTC is harvested and not repurchased inside the window ending
> 2026-03-23; BXPE cannot be sold at market — say so where the advisor would look for it; show
> short- vs long-term on lots; show net tax and what netting saved (`grossTaxOnGains` vs
> `estimatedTaxImpact`); approval is a named human's distinct, recorded act; the client message
> carries plain-language figures and a disclosure. {If key = multiplayer, add:} Also meet the
> spec's three multiplayer constraints: visible archive/supervisory review, human approval for
> anything binding, and an unmistakable client-thread boundary.
>
> **Deliver:** `src/lab/{key}/DESIGN.md` (type, colour tokens, density, number formatting, chart
> grammar, motion, light/dark, voice, and a one-paragraph case for winning). Then verify:
> `node_modules/.bin/vitest run src/lab`, `pnpm lint`, `pnpm build`, and
> `LAB_DIRECTION={key} pnpm lab:screens` — all must pass; look at your own screenshots in
> `docs/superpowers/exploration/screens/{key}/` and fix what you would be embarrassed by. Commit on
> branch `lab/{key}` with messages ending in the Co-Authored-By trailer. Report: what you built, the
> one decision you are proudest of, the one weakness you know about, and the commit SHA.

- [ ] **Step 1:** Dispatch the four subagents (one message, four Agent calls, background).
- [ ] **Step 2:** As each returns, check its report for BLOCKED; verify its branch: `git -C {worktree} log --oneline SETUP_SHA..HEAD` and `git -C {worktree} diff --stat SETUP_SHA -- . ':!src/lab/{key}' ':!docs/superpowers/exploration/screens/{key}'` → **must be empty** (it touched nothing outside its folder).

### Task 12: Integrate

- [ ] **Step 1:** `git switch design-exploration && for k in terminal instrument spatial multiplayer; do git merge --no-ff "lab/$k" -m "merge: $k direction"; done`
- [ ] **Step 2:** `node_modules/.bin/vitest run && pnpm lint && pnpm build && pnpm lab:screens` → all PASS, 48 screenshots.
- [ ] **Step 3:** Commit any screenshot refresh; `git worktree remove ../advisor-desktop-lab-$k` for each; keep the `lab/*` branches until Joel picks.

---

## Phase D — review and present

### Task 13: Two reviewers, all four directions each (parallel)

Both read the spec, the audit brief, each `src/lab/<key>/DESIGN.md`, the code under `src/lab/<key>/`,
and the 48 screenshots. Both return a JSON block per direction:
`{ key, scores: { [criterion]: 1-5 }, strengths: [3 strings], strongestObjection: string, defects: [{ beat, severity: 'blocker'|'major'|'minor', what }] }`.

- [ ] **Step 1: Dispatch the finance & compliance reviewer** with this brief: "Clone or update
  `https://github.com/JoelLewis/finance_skills` into the scratchpad and read
  `plugins/wealth-management/skills/{tax-loss-harvesting,rebalancing}/SKILL.md`,
  `plugins/compliance/skills/{books-and-records,reg-bi,fiduciary-standards,advertising-compliance}/SKILL.md`,
  `plugins/trading-operations/skills/pre-trade-compliance/SKILL.md`. Score each direction on:
  lot & wash-sale correctness; short/long-term treatment; BXPE illiquidity handled; net-tax
  presentation; human approval as a recorded act; client-boundary integrity; disclosure adequacy;
  every displayed figure traceable to `useScenario()` (grep for numeric literals in JSX)."
- [ ] **Step 2: Dispatch the design reviewer** with this brief: "Load `impeccable:critique` and
  `design:design-critique`. Score each direction on: distinctiveness/memorability; craft (type,
  spacing, alignment); density handling on the `density` beat; number formatting consistency;
  chart grammar; light/dark parity; accessibility (contrast, focus, keyboard — run the app at
  `/lab/<key>/<beat>` and tab through); how well each audit-brief requirement is met."
- [ ] **Step 3:** Save both outputs to `docs/superpowers/exploration/reviews/{finance,design}.json`; commit.

### Task 14: Comparison page

- [ ] **Step 1:** Load the `artifact-design` and `dataviz` skills.
- [ ] **Step 2:** Build one HTML page in the scratchpad: per beat, the four directions' screenshots side by side with a light/dark toggle; per direction, its DESIGN.md summary, both scorecards, the strongest objection from each reviewer, and listed blockers; a final section, clearly labelled "Claude's recommendation", with the reasoning. Upload the 48 screenshots as artifact assets.
- [ ] **Step 3:** Publish as a private Artifact; give Joel the link.

### Task 15: Close out

- [ ] **Step 1:** Update memory `advisor-desktop-showcase.md`: exploration ran, where the screens and reviews live, awaiting Joel's pick.
- [ ] **Step 2:** Ask Joel to choose. The choice starts a new brainstorming → spec cycle for the production migration and a replacement for roadmap phases 3–7.
