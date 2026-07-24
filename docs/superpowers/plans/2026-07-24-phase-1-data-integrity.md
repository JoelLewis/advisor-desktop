# Phase 1 — Numbers You Can Trust: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every figure in Advisor Desktop derivable from leaf data, so that no two screens can ever disagree about AUM, fees, risk, tax or counts.

**Architecture:** **Derived-not-stored is the spine of this phase.** Every defect in `critique-finance.md` that a practitioner hits in the first ninety seconds is a hand-typed aggregate that drifted from its parts: `household.managedAUM` typed beside `accounts[].totalValue`; `effectiveFee` typed beside a fee schedule; `bookAnalytics.aumBySegment` typed beside households. The fix is structural, not arithmetic — we introduce a small set of **pure derivation functions** in `src/lib/` (`aum.ts`, `fees.ts`, `risk-model.ts`, `bond-math.ts`, `security-master.ts`), strip the fixtures back to **leaf data only** (account balances, positions, fee rates, realised sales), and compute every roll-up at the API boundary. A single **property test** (Task 3) asserts that every roll-up equals the sum of its parts for every entity; it is written early and fails loudly until the phase completes. Currency is handled at exactly one boundary: **every leaf value carries its own `baseCurrency`, and every derivation converts to USD via `convertToBase(value, currency, FX_RATES_USD_BASE)` before summing.** Naive 1:1 mixed-currency addition is banned and the property test catches it.

**Tech Stack:** React 18 · TypeScript (strict) · Vite 6 · MSW 2 · Vitest 4 · Recharts · TanStack Query · pnpm

---

## Global Constraints

These apply to **every task in every phase**. Values are verbatim from the Meridian spec.

- **No pure white, no pure grey (R=G=B), no cool/blue-grey neutrals.** Every neutral carries a
  yellow-red cast. Only `--surface-raised` may be white, and only in light mode.
- **Sentence case everywhere.** Headings, buttons, menu items, table cells, dialog titles.
  `Title Case is never used.` UPPERCASE only for the 11px eyebrow style, ≤3 words.
- **Every financial figure, ticker, masked account and ISO date renders in IBM Plex Mono** with
  `font-feature-settings: "tnum" 1, "zero" 1`.
- **Signed figures use a true minus `−` (U+2212), never a hyphen.**
- **Weights carry one decimal; returns carry two.** Money is `$4.21M` in summary, `$1,148,300` in
  tables — never `$4.2 million`. Accounting negatives use parentheses: `($284,100)`.
- **Dates:** `24 July 2026` in prose, `2026-07-24` in tables, `Aug 14` for scheduling.
- **Account numbers are masked:** `••••4210`.
- **Zero emoji. Zero exclamation marks.** No hype adjectives ("amazing", "seamlessly", "powerful",
  "effortless", "10x"). The product never speaks in first person about itself.
- **Never promise outcomes.** Hedging words — "estimated", "as of", "net of fees" — are load-bearing.
- **Cards have no shadow at rest.** 1px `--border-subtle` hairline + 12px radius. Shadows only on
  genuinely floating surfaces (popover, drawer, toast, dialog).
- **Buttons are 8px-radius rectangles, never pills.** Only `Tag` and toggles are pill-shaped.
- **At most one accent-coloured (terracotta) action per screen.** Terracotta means advisory/AI and is
  never decorative.
- **No decorative gradients, no photography, no illustration, no patterns, no textures, no
  noise/grain, no glassmorphism** in-product.
- **Motion:** 80/120/180/260/320ms only. No bounce, spring, scale-in, parallax, or skeleton shimmer.
  Numbers never count up. Charts draw instantly (`isAnimationActive={false}`).
- **Focus is always visible.** Never `outline: none` without a replacement ring.
- **TypeScript strict. No `any`** — use `unknown` and narrow. ESM only. No barrel files.
- **Every phase ends green:** `pnpm type-check`, `pnpm lint`, `pnpm test:run` all pass.

### Phase-1-specific constraints

- **No hand-typed aggregate may survive.** If a number is the sum, average, share or product of other
  numbers in the repo, it is computed, not typed. Leaf data (an account balance, a position, a fee
  rate, a realised sale) may be typed.
- **One reporting currency boundary.** USD is the reporting currency. Conversion happens once, in a
  derivation function, using `convertToBase()` from `src/lib/currency.ts` and `FX_RATES_USD_BASE`
  from `src/mocks/data/currencies.ts` (as of `FX_RATE_TIMESTAMP` = `2026-02-25T16:00:00Z`).
- **One clock.** `2026-02-25T12:00:00Z`. No `new Date()` for "today" anywhere in app code or fixtures.
- **Fixture corrections vs logic corrections are separate commits.** A fixture correction changes a
  literal and updates the fixture test asserting it. A logic correction changes a derivation and adds
  an identity test. Never mix them in one commit — a reviewer must be able to reject one without the other.
- **Every corrected calculation cites its authority** in a code comment: the finance-skill name and the
  finding ID from `docs/superpowers/reference/critique-finance.md` (e.g. `// C29 · fee-billing`).

---

## Baseline: pre-existing test failures

`pnpm test:run` at commit `72dad62` reports **14 failed / 1440 passed (1454)** across **5 failed files**.
These are *expected* at the start and are each resolved by a named task below:

| Failing test | Resolved by |
| --- | --- |
| `account-invariants` › has exactly 45 accounts | Task 18 |
| `account-invariants` › acc-006 (trust_irrevocable): taxable account types have taxable treatment | Task 18 |
| `referential-integrity` › Data counts › has 45 accounts | Task 18 |
| `portfolio-invariants` › Household AUM consistency › hh-002 / hh-003 / hh-007 / hh-008 | Task 4 |
| `portfolio-invariants` › allPositions contains 130 explicit positions | Task 18 |
| `portfolio-invariants` › pos-240 (BTC): marketValue === quantity * price | Task 18 |
| `portfolio-invariants` › acc-045: position weights sum to approximately 1.0 | Task 18 |
| `drift-invariants` › actual weights roughly sum to 1.0 for each account | Task 18 |
| `drift-invariants` › returns drift data for all 45 accounts | Task 18 |
| `drift-invariants` › totalDrift === sum(drifts) / 2 within rounding tolerance | Task 21 |
| `use-portfolio` › useDriftSummary › fetches drift for all accounts | Task 18 |

---

## File Structure

### New files — pure derivation modules (no I/O, no fixture imports)

| File | Responsibility |
| --- | --- |
| `src/lib/clock.ts` | The single frozen clock. Exports `MOCK_NOW_ISO`, `MOCK_TODAY_ISO`, `now()`, `todayISO()`. |
| `src/lib/aum.ts` | `accountValueUSD`, `sumAccountsUSD`, `deriveHouseholdAUM`, `deriveBookAUM`, `deriveSegmentAUM`, `herfindahlIndex`, `effectiveN`. Pure — accounts are passed in. |
| `src/lib/fees.ts` | `householdAnnualFee`, `assetWeightedEffectiveFee`, `bps`, `blendedTieredFee`. |
| `src/lib/risk-model.ts` | `ASSET_CLASS_RISK` table, `assetClassWeights`, `portfolioBeta`, `portfolioVolatility`, `portfolioReturn1Y`, `trackingError`, `parametricVaR`, `sharpe`, `sortino`. |
| `src/lib/security-master.ts` | `SECURITY_KIND` map (`single_name` / `fund` / `cash`), `securityKind`, `concentrationLimitFor`. |
| `src/lib/bond-math.ts` | `yieldToMaturity`, `priceFromYield`, `modifiedDuration`, `yearsToMaturity`. |
| `src/lib/waterfall.ts` | `computeWaterfallDomain` — the truncated-axis calculation for the AUM waterfall. |

### New files — fixtures (leaf data only)

| File | Responsibility |
| --- | --- |
| `src/mocks/data/realised-sales.ts` | `RealisedSale[]` — the loss sales that open wash-sale windows. Replaces anchoring on `lot.purchaseDate`. |

### New test files

| File | Responsibility |
| --- | --- |
| `src/mocks/data/__tests__/rollup-invariants.test.ts` | **THE GATE.** Every roll-up equals the sum of its parts, for every entity. |
| `src/lib/__tests__/clock.test.ts` | Clock is frozen and consistent. |
| `src/lib/__tests__/aum.test.ts` | FX-aware summation, per-household derivation. |
| `src/lib/__tests__/fees.test.ts` | Asset-weighted effective fee, bps conversion. |
| `src/lib/__tests__/risk-model.test.ts` | Beta/vol/VaR/Sharpe identities. |
| `src/lib/__tests__/security-master.test.ts` | Fund vs single-name classification. |
| `src/lib/__tests__/bond-math.test.ts` | Price/yield inversion. |
| `src/lib/__tests__/waterfall.test.ts` | Truncated-axis domain. |
| `src/mocks/handlers/__tests__/risk-invariants.test.ts` | Per-account risk varies with the account; VaR is labelled. |
| `src/mocks/handlers/__tests__/attribution-invariants.test.ts` | `total === allocation + selection + interaction`, per row and in aggregate. |
| `src/mocks/handlers/__tests__/fee-invariants.test.ts` | One fee number across book, billing and revenue. |
| `src/mocks/handlers/__tests__/tax-invariants.test.ts` | Lots partition positions; wash-sale windows are 61 days and anchored on loss sales. |
| `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts` | Concentration uses the account's own value. |

### Modified files

| File | Change |
| --- | --- |
| `src/types/household.ts` | Add `HouseholdFixture` (household minus derived AUM fields). |
| `src/types/risk.ts` | Extend `RiskMetrics` with `var95Horizon`, `var95Confidence`, `var95Method`, `var95Percent`, `riskFreeRate`, `downsideDeviation`, `asOf`. |
| `src/types/portfolio.ts` | Extend `ConcentrationMetric` with `kind` and `limitBasis`. |
| `src/mocks/data/households.ts` | Fixture loses `totalAUM` / `managedAUM`; exports derived `households`. |
| `src/mocks/data/accounts.ts` | 47 accounts; `cashBalance` reconciled to position-level cash; `acc-006` tax treatment. |
| `src/mocks/data/positions.ts` | acc-002, acc-029, acc-045 reconciled to their account balances. |
| `src/mocks/data/clients.ts` | `totalAUM` derived from the client's accounts. |
| `src/mocks/data/practice.ts` | `bookAnalytics` derived from households and accounts. |
| `src/mocks/data/billing.ts` | `aumBasis` and `quarterlyAmount` derived; `totalBilled` derived. |
| `src/mocks/data/revenue.ts` | `feeSchedules`, `revenueMetrics`, `revenueTrend`, `revenueBySegment` all derived. |
| `src/mocks/data/nbas.ts` | Factual corrections; Reg BI rollover reframed. |
| `src/mocks/data/trading.ts` | Bond yields/durations derived; one crypto price source. |
| `src/mocks/handlers/pms.ts` | Risk, benchmark, performance, attribution, stress, sensitivity, concentration, drift, book-of-business — all per account, all derived. |
| `src/mocks/handlers/custodian.ts` | Deterministic tax lots that partition their positions. |
| `src/mocks/handlers/oms.ts` | Pre-trade concentration on real account value; tax impact from lots. |
| `src/mocks/handlers/reconciliation.ts` | Correct account names; one clock. |
| `src/mocks/handlers/compliance.ts` | One restricted list; one clock. |
| `src/features/portfolios/TaxManagementPage.tsx` | Wash-sale windows from realised loss sales; AvgCost/SpecID method fixes. |
| `src/features/portfolios/tax/WashSaleCalendarView.tsx` | 61-day label; sale-anchored rows. |
| `src/features/portfolios/tax/HarvestScannerView.tsx` | Rate by holding period; real wash-sale badge. |
| `src/features/portfolios/AttributionPage.tsx` | Interaction total; method caption. |
| `src/features/portfolios/RiskAnalyticsPage.tsx` | VaR horizon/confidence/method labels. |
| `src/features/portfolios/ConcentrationView.tsx` | Single-name vs fund limits in the banner and table. |
| `src/features/portfolios/PortfolioPage.tsx` | FX-aware total. |
| `src/features/clients/HouseholdListView.tsx` | Real allocation, labelled AUM. |
| `src/features/clients/ClientDetailPage.tsx` | Real allocation. |
| `src/features/workflows/WorkflowCenterPage.tsx` | One clock. |
| `src/features/growth/BookOfBusinessPage.tsx` | Truncated waterfall axis; unsigned share-of-total. |
| `src/features/dashboard/DashboardPage.tsx` | One clock; derived counts. |
| `src/features/dashboard/SchedulePanel.tsx` | One clock. |
| `src/components/ui/NBACard.tsx` | One clock. |
| `src/features/messaging/MessagingContent.tsx` | One clock. |

---

## Reference values computed from the current fixtures

Every test assertion below uses these. They were computed from `accounts.ts`, `households.ts`,
`billing.ts` and `currencies.ts` at commit `72dad62`. **FX rates are USD-base divisors**
(`HKD 7.82`, `SGD 1.34`, `EUR 0.92`, `CHF 0.88`), so `USD = value / rate`.

| Household | Segment | Derived AUM (USD) | Currently stated | Δ |
| --- | --- | --- | --- | --- |
| hh-001 Johnson | platinum | `18_750_000` | 18,750,000 | 0 |
| hh-002 Chen-Wong | platinum | `30_308_017.71195` → round `30_308_018` | 43,500,000 | **−13,191,982** |
| hh-003 Williams | gold | `4_995_000` | 6,360,000 | **−1,365,000** |
| hh-004 Martinez | platinum | `9_500_000` | 9,500,000 | 0 |
| hh-005 Thompson | gold | `4_385_000` | 4,385,000 | 0 |
| hh-006 Anderson | gold | `7_200_000` | 7,200,000 | 0 |
| hh-007 Patel | gold | `5_965_000` | 6,225,000 | **−260,000** |
| hh-008 O'Brien | silver | `1_385_000` | 1,650,000 | **−265,000** |
| hh-009 Kim-Lee | silver | `1_050_000` | 1,050,000 | 0 |
| hh-010 Garcia | silver | `720_000` | 720,000 | 0 |
| hh-011 Foster | silver | `1_500_000` | 1,500,000 | 0 |
| hh-012 Taylor | bronze | `380_000` | 380,000 | 0 |
| hh-013 Mueller | gold | `5_182_806.32411` → round `5_182_806` | 4,700,000 | **+482,806** |
| **Book** | | **`91_320_824.03606` → round `91_320_824`** | Σ stated = 105,920,000 | **−14,599,176** |

- Naive 1:1 sum of `totalValue` (the `$102.5M` on the Portfolios page) = `102_450_000`.
- `practice.ts` `aumBySegment` sums to `99_855_000`; `aumByAccountType` also to `99_855_000`.
- `clients.ts` `totalAUM` sums to `107_055_000`.
- **One derived figure replaces all four: `91_320_824`.**

| Segment | Households | Derived AUM | Share |
| --- | --- | --- | --- |
| platinum | 3 | `58_558_018` | 64.1% |
| gold | 5 | `27_727_806` | 30.4% |
| silver | 4 | `4_655_000` | 5.1% |
| bronze | 1 | `380_000` | 0.4% |

- HHI on derived household shares (0–10,000 scale) = `1828.3881` → `1828`; effective N = `10000/1828.3881 = 5.47`.
- Σ household annual fee (derived AUM × `billing.ts` `annualRate`) = `697_465.9689` → `697_466`.
- **Asset-weighted effective fee = `697_465.9689 / 91_320_824.03606 = 0.00763753` = `76.4 bps`.**
  - The three numbers it replaces: `0.85` rendered as "bps" (100× unit error, `pms.ts:703`);
    `88.08 bps` (Billing's unweighted mean of 13 rates); `79.58 bps` (Σ hand-typed
    `quarterlyAmount × 4 = 726_752` ÷ derived book AUM). 79.58 bps is the pre-fix arithmetic on a
    pre-fix basis; once `aumBasis` and `quarterlyAmount` become derived, **76.4 bps is the only number**.

| Household | Rate | Derived annual fee | Derived quarterly |
| --- | --- | --- | --- |
| hh-001 | 0.0075 | `140_625.00` | `35_156` |
| hh-002 | 0.0065 | `197_002.12` | `49_251` |
| hh-003 | 0.0085 | `42_457.50` | `10_614` |
| hh-004 | 0.0080 | `76_000.00` | `19_000` |
| hh-005 | 0.0095 | `41_657.50` | `10_414` |
| hh-006 | 0.0080 | `57_600.00` | `14_400` |
| hh-007 | 0.0080 | `47_720.00` | `11_930` |
| hh-008 | 0.0100 | `13_850.00` | `3_463` |
| hh-009 | 0.0100 | `10_500.00` | `2_625` |
| hh-010 | 0.0100 | `7_200.00` | `1_800` |
| hh-011 | 0.0100 | `15_000.00` | `3_750` |
| hh-012 | 0.0100 | `3_800.00` | `950` |
| hh-013 | 0.0085 | `44_053.85` | `11_013` |

Per-account risk under the model introduced in Task 9 (`ρ = 0.35` cross-class, `Rf = 0.04`, `z₉₅ = 1.645`, 1-month horizon):

| Account | Value | β | σ | R₁ᵧ | Sharpe | Sortino | Max DD | VaR₉₅ | % of value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| acc-001 Johnson Trust | 8,200,000 | 0.64 | 0.0935 | 0.0985 | 0.63 | 0.89 | −0.112 | `364_083` | 4.44% |
| acc-006 Chen Trust | 12,000,000 | 0.69 | 0.0904 | 0.0942 | 0.60 | 0.86 | −0.108 | `515_140` | 4.29% |
| acc-040 Taylor Individual | 100,000 | 0.63 | 0.0934 | 0.0973 | 0.61 | 0.88 | −0.112 | `4_435` | 4.43% |
| acc-011 Williams Individual | 2,800,000 | 0.80 | 0.1122 | 0.1138 | 0.66 | 0.94 | −0.135 | `149_185` | 5.33% |
| acc-020 Thompson IRA | 2,200,000 | 0.38 | 0.0610 | 0.0679 | 0.46 | 0.65 | −0.073 | `63_728` | 2.90% |
| acc-045 Patel Digital Assets | 425,000 | 1.57 | 0.6360 | 0.4041 | 0.57 | 0.82 | −0.763 | `128_358` | 30.20% |

The current fixture returns `var95: 485_000` for **all** of these.

---

## Task sequence

Tasks 1–3 must run in order. Task 3 is the gate and **fails until Task 22**. Tasks 4–22 may be
reviewed independently but should be executed in the order given, since later tasks consume the
derivation modules built by earlier ones.

---

### Task 1: Baseline, and one clock

**Files:**
- Create: `src/lib/clock.ts`
- Create: `src/lib/__tests__/clock.test.ts`
- Modify: `src/features/workflows/WorkflowCenterPage.tsx:94`
- Modify: `src/features/portfolios/tax/shared.tsx:6`
- Modify: `src/components/ui/NBACard.tsx:58`
- Modify: `src/features/messaging/MessagingContent.tsx:20`
- Modify: `src/features/dashboard/DashboardPage.tsx:8-21,32`
- Modify: `src/features/dashboard/SchedulePanel.tsx:11,33`
- Modify: `src/mocks/handlers/pms.ts:54`
- Modify: `src/mocks/handlers/custodian.ts:9,81`
- Modify: `src/mocks/handlers/compliance.ts:135`
- Modify: `src/mocks/handlers/reconciliation.ts:5-13,60`
- Modify: `src/mocks/data/proposals.ts:82`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const MOCK_NOW_ISO: '2026-02-25T12:00:00Z'
  export const MOCK_TODAY_ISO: '2026-02-25'
  export function now(): Date            // new Date(MOCK_NOW_ISO), a fresh instance each call
  export function todayISO(): string     // '2026-02-25'
  export function startOfToday(): Date   // 2026-02-25T00:00:00Z
  ```

Findings closed: **D19, D20** (`critique-finance.md`); the "four different todays" finding in
`critique-content.md` §Gap 2.

- [ ] **Step 1: Record the baseline**

Run: `pnpm test:run 2>&1 | tail -5`
Expected: `Test Files 5 failed | 28 passed (33)` and `Tests 14 failed | 1440 passed (1454)`.
If the numbers differ, stop and reconcile against the "Baseline" table above before continuing —
the plan's task-to-failure mapping assumes this exact starting state.

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/clock.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO, now, todayISO, startOfToday } from '@/lib/clock'

describe('clock', () => {
  it('is frozen at 2026-02-25T12:00:00Z', () => {
    expect(MOCK_NOW_ISO).toBe('2026-02-25T12:00:00Z')
    expect(MOCK_TODAY_ISO).toBe('2026-02-25')
    expect(now().toISOString()).toBe('2026-02-25T12:00:00.000Z')
  })

  it('todayISO agrees with now()', () => {
    expect(todayISO()).toBe(now().toISOString().slice(0, 10))
  })

  it('startOfToday is midnight UTC on the same day', () => {
    expect(startOfToday().toISOString()).toBe('2026-02-25T00:00:00.000Z')
    expect(startOfToday().getTime()).toBeLessThan(now().getTime())
  })

  it('returns a fresh Date each call so callers cannot mutate the clock', () => {
    const a = now()
    a.setFullYear(1999)
    expect(now().getUTCFullYear()).toBe(2026)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/clock.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/clock"`.

- [ ] **Step 4: Write the clock**

Create `src/lib/clock.ts`:

```ts
/**
 * The single frozen clock for this demo. Every "today" in the product resolves here.
 *
 * D20 · data-quality — the dashboard greeting previously used the live system clock while all
 * fixture data was frozen in February, producing a five-month gap on the landing screen.
 * D19 · data-quality — reconciliation was dated 2026-02-27, ahead of the data it reconciles.
 */
export const MOCK_NOW_ISO = '2026-02-25T12:00:00Z' as const
export const MOCK_TODAY_ISO = '2026-02-25' as const

export function now(): Date {
  return new Date(MOCK_NOW_ISO)
}

export function todayISO(): string {
  return MOCK_TODAY_ISO
}

export function startOfToday(): Date {
  return new Date(`${MOCK_TODAY_ISO}T00:00:00Z`)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/clock.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Replace every literal "today"**

`src/features/portfolios/tax/shared.tsx` — replace line 6 so there is one definition, not two:

```tsx
import { MOCK_TODAY_ISO } from '@/lib/clock'

export const MOCK_NOW = MOCK_TODAY_ISO
```

`src/features/workflows/WorkflowCenterPage.tsx:94` — replace `const today = new Date('2026-02-25')`:

```tsx
import { startOfToday } from '@/lib/clock'
// …inside the dueDate cell renderer:
      const due = new Date(row.original.dueDate)
      const today = startOfToday()
```

`src/components/ui/NBACard.tsx:58` — replace `const MOCK_NOW = new Date('2026-02-25T12:00:00Z')`:

```tsx
import { now } from '@/lib/clock'
// …replace both uses at :65 and :72 with now()
  const days = daysBetween(now(), new Date(deadline))
  const diffMs = new Date(expiresAt).getTime() - now().getTime()
```

`src/features/messaging/MessagingContent.tsx:20` — replace `const now = new Date('2026-02-25T12:00:00Z')`
with `const reference = clockNow()` where the import is `import { now as clockNow } from '@/lib/clock'`,
then update the references in that function body.

`src/mocks/handlers/pms.ts:54` — replace `const now = new Date('2026-02-25')`:

```ts
import { startOfToday } from '@/lib/clock'
// …inside generatePerformanceSeries:
  const anchor = startOfToday()
  for (let i = months; i >= 0; i--) {
    const date = new Date(anchor)
```

`src/mocks/handlers/custodian.ts:9` and `:81` — replace both `new Date('2026-02-25')` with
`startOfToday()` (import from `@/lib/clock`).

`src/mocks/handlers/compliance.ts:135` — replace `const today = new Date('2026-02-26')` with
`const today = startOfToday()`. This is the second of the four "todays".

`src/mocks/handlers/reconciliation.ts` — replace the nine `lastSync` values on lines 5–13 and the
`detectedAt` / `resolvedAt` values on the break rows so nothing is dated after the clock. Use
`2026-02-25T07:00:00Z` for the seven `synced` integrations, `2026-02-25T09:31:00Z` for
`Market Data Feed`, and `2026-02-24T22:00:00Z` for the `pending` MoneyGuidePro row. Replace
`new Date('2026-01-29')` at `:60` with `startOfToday()`.

`src/mocks/data/proposals.ts:82` — replace
`const today = new Date().toLocaleDateString('en-US', {...})` with:

```ts
import { MOCK_TODAY_ISO } from '@/lib/clock'
// …
  const today = new Date(`${MOCK_TODAY_ISO}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
```

`src/features/dashboard/SchedulePanel.tsx` — replace `const today = new Date()` at `:11` with
`const today = startOfToday()` and drop the `today.setHours(0,0,0,0)` line; replace the hardcoded
`useState('2026-02-25')` at `:33` with `useState(MOCK_TODAY_ISO)`.

`src/features/dashboard/DashboardPage.tsx:8-21` — replace both helpers:

```tsx
import { now } from '@/lib/clock'

function formatToday(): string {
  return now().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function getGreeting(): string {
  const hour = now().getUTCHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
```

(`en-GB` gives `Wednesday, 25 February 2026` — the Global Constraint prose date form. Sentence-case
greeting per the same constraints.)

- [ ] **Step 7: Prove no literal "today" survives**

Run:
```bash
grep -rn "new Date()" src --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__" \
  | grep -viE "toISOString\(\)|timestamp|createdAt|updatedAt|generatedAt|submittedAt|resolvedAt|lastMessageAt|scheduledDate"
grep -rn "new Date('2026-\|new Date(\"2026-" src --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "src/lib/clock.ts"
```
Expected: both produce no output. (The excluded `new Date().toISOString()` calls are *event
timestamps* on user-initiated mutations, not "today" — they are correct as-is and Phase 7 owns them.)

- [ ] **Step 8: Run the suite**

Run: `pnpm type-check && pnpm test:run 2>&1 | tail -5`
Expected: still `14 failed | 1440 passed` — no new failures. If `MessagingContent` or `NBACard` tests
break, the clock shift moved a relative-time boundary; adjust the *test's* expected string, not the clock.

- [ ] **Step 9: Commit**

```bash
git add src/lib/clock.ts src/lib/__tests__/clock.test.ts \
  src/features/workflows/WorkflowCenterPage.tsx src/features/portfolios/tax/shared.tsx \
  src/components/ui/NBACard.tsx src/features/messaging/MessagingContent.tsx \
  src/features/dashboard/DashboardPage.tsx src/features/dashboard/SchedulePanel.tsx \
  src/mocks/handlers/pms.ts src/mocks/handlers/custodian.ts src/mocks/handlers/compliance.ts \
  src/mocks/handlers/reconciliation.ts src/mocks/data/proposals.ts
git commit -m "fix(data): one frozen clock — remove seven literal dates and the live system clock

Closes D19, D20."
```

---

### Task 2: `src/lib/aum.ts` — the AUM derivation primitives

**Files:**
- Create: `src/lib/aum.ts`
- Create: `src/lib/__tests__/aum.test.ts`

**Interfaces:**
- Consumes: `convertToBase(amount, currency, rates)` from `src/lib/currency.ts`;
  `FX_RATES_USD_BASE` from `src/mocks/data/currencies.ts` (passed in by callers, never imported here).
- Produces:
  ```ts
  type AUMAccount = { id: string; householdId: string; clientId: string; totalValue: number; baseCurrency?: CurrencyCode }
  type SegmentAUM = { segment: string; householdCount: number; aum: number; pctOfAUM: number }

  export function accountValueUSD(account: AUMAccount, rates: FXRateMap): number
  export function sumAccountsUSD(accounts: readonly AUMAccount[], rates: FXRateMap): number
  export function deriveHouseholdAUM(householdId: string, accounts: readonly AUMAccount[], rates: FXRateMap): number
  export function deriveClientAUM(clientId: string, accounts: readonly AUMAccount[], rates: FXRateMap): number
  export function deriveBookAUM(accounts: readonly AUMAccount[], rates: FXRateMap): number
  export function deriveSegmentAUM(households: readonly { id: string; segment: string }[], accounts: readonly AUMAccount[], rates: FXRateMap): SegmentAUM[]
  export function herfindahlIndex(shares: readonly number[]): number  // 0–10,000 scale
  export function effectiveN(hhi: number): number                     // 10_000 / hhi
  ```

Findings closed: **D1** (household roll-up), **C36** (FX applied at one boundary), **C22** (one HHI scale).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/aum.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  accountValueUSD, sumAccountsUSD, deriveHouseholdAUM, deriveClientAUM,
  deriveBookAUM, deriveSegmentAUM, herfindahlIndex, effectiveN,
} from '@/lib/aum'

const RATES = { HKD: 7.82, SGD: 1.34, EUR: 0.92, CHF: 0.88 }

const ACCOUNTS = [
  { id: 'a1', householdId: 'h1', clientId: 'c1', totalValue: 1_000_000 },
  { id: 'a2', householdId: 'h1', clientId: 'c2', totalValue: 12_500_000, baseCurrency: 'HKD' as const },
  { id: 'a3', householdId: 'h2', clientId: 'c3', totalValue: 2_800_000, baseCurrency: 'SGD' as const },
]

describe('accountValueUSD', () => {
  it('passes USD through untouched', () => {
    expect(accountValueUSD(ACCOUNTS[0]!, RATES)).toBe(1_000_000)
  })

  it('converts HKD 12,500,000 at 7.82 to 1,598,465.4731457800 USD', () => {
    expect(accountValueUSD(ACCOUNTS[1]!, RATES)).toBeCloseTo(1_598_465.4731457800, 6)
  })

  it('converts SGD 2,800,000 at 1.34 to 2,089,552.2388059701 USD', () => {
    expect(accountValueUSD(ACCOUNTS[2]!, RATES)).toBeCloseTo(2_089_552.2388059701, 6)
  })
})

describe('sumAccountsUSD', () => {
  it('never adds mixed currencies 1:1', () => {
    const naive = ACCOUNTS.reduce((s, a) => s + a.totalValue, 0)
    expect(naive).toBe(16_300_000)
    expect(sumAccountsUSD(ACCOUNTS, RATES)).toBeCloseTo(4_688_017.712, 3)
  })

  it('is zero for an empty list', () => {
    expect(sumAccountsUSD([], RATES)).toBe(0)
  })
})

describe('deriveHouseholdAUM / deriveClientAUM / deriveBookAUM', () => {
  it('household h1 is USD 1,000,000 + HKD-converted 1,598,465.4731', () => {
    expect(deriveHouseholdAUM('h1', ACCOUNTS, RATES)).toBeCloseTo(2_598_465.4731457800, 6)
  })

  it('client c3 holds only the SGD account', () => {
    expect(deriveClientAUM('c3', ACCOUNTS, RATES)).toBeCloseTo(2_089_552.2388059701, 6)
  })

  it('book equals the sum of its households', () => {
    const byHousehold = ['h1', 'h2'].reduce((s, h) => s + deriveHouseholdAUM(h, ACCOUNTS, RATES), 0)
    expect(deriveBookAUM(ACCOUNTS, RATES)).toBeCloseTo(byHousehold, 9)
  })

  it('returns 0 for an unknown household rather than throwing', () => {
    expect(deriveHouseholdAUM('nope', ACCOUNTS, RATES)).toBe(0)
  })
})

describe('deriveSegmentAUM', () => {
  const HOUSEHOLDS = [
    { id: 'h1', segment: 'platinum' },
    { id: 'h2', segment: 'gold' },
  ]

  it('groups by segment and reports shares that sum to 1', () => {
    const segments = deriveSegmentAUM(HOUSEHOLDS, ACCOUNTS, RATES)
    const platinum = segments.find((s) => s.segment === 'platinum')!
    expect(platinum.householdCount).toBe(1)
    expect(platinum.aum).toBeCloseTo(2_598_465.4731457800, 6)
    expect(segments.reduce((s, x) => s + x.pctOfAUM, 0)).toBeCloseTo(1, 9)
  })
})

describe('herfindahlIndex', () => {
  it('uses the 0–10,000 scale, so a monopoly is 10,000', () => {
    expect(herfindahlIndex([1])).toBeCloseTo(10_000, 6)
  })

  it('13 equal shares gives the 769 floor cited in C22', () => {
    const equal = Array.from({ length: 13 }, () => 1 / 13)
    expect(herfindahlIndex(equal)).toBeCloseTo(769.2307692308, 6)
  })

  it('effectiveN inverts HHI', () => {
    expect(effectiveN(herfindahlIndex([0.5, 0.5]))).toBeCloseTo(2, 9)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/aum.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/aum"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/aum.ts`:

```ts
import { convertToBase } from '@/lib/currency'
import type { CurrencyCode, FXRateMap } from '@/types/currency'

/**
 * AUM derivation. Nothing in this module reads a fixture — accounts and FX rates are always
 * passed in — so it is pure, cheap to test, and safe to import from both app and mock layers.
 *
 * D1 · data-quality / reconciliation / currencies-and-fx — household `managedAUM` was hand-typed
 * and disagreed with the sum of its accounts for 5 of 13 households, and mixed currencies were
 * summed 1:1 (Chen-Wong stated $43.5M against $30.3M of actual FX-applied account value).
 * C36 · currencies-and-fx — conversion now happens at exactly one boundary.
 */
export type AUMAccount = {
  id: string
  householdId: string
  clientId: string
  totalValue: number
  baseCurrency?: CurrencyCode
}

export type SegmentAUM = {
  segment: string
  householdCount: number
  aum: number
  pctOfAUM: number
}

export function accountValueUSD(account: AUMAccount, rates: FXRateMap): number {
  if (!account.baseCurrency || account.baseCurrency === 'USD') return account.totalValue
  return convertToBase(account.totalValue, account.baseCurrency, rates)
}

export function sumAccountsUSD(accounts: readonly AUMAccount[], rates: FXRateMap): number {
  return accounts.reduce((sum, a) => sum + accountValueUSD(a, rates), 0)
}

export function deriveHouseholdAUM(
  householdId: string,
  accounts: readonly AUMAccount[],
  rates: FXRateMap,
): number {
  return sumAccountsUSD(accounts.filter((a) => a.householdId === householdId), rates)
}

export function deriveClientAUM(
  clientId: string,
  accounts: readonly AUMAccount[],
  rates: FXRateMap,
): number {
  return sumAccountsUSD(accounts.filter((a) => a.clientId === clientId), rates)
}

export function deriveBookAUM(accounts: readonly AUMAccount[], rates: FXRateMap): number {
  return sumAccountsUSD(accounts, rates)
}

export function deriveSegmentAUM(
  households: readonly { id: string; segment: string }[],
  accounts: readonly AUMAccount[],
  rates: FXRateMap,
): SegmentAUM[] {
  const book = deriveBookAUM(accounts, rates)
  const grouped = new Map<string, { householdCount: number; aum: number }>()
  for (const hh of households) {
    const entry = grouped.get(hh.segment) ?? { householdCount: 0, aum: 0 }
    entry.householdCount += 1
    entry.aum += deriveHouseholdAUM(hh.id, accounts, rates)
    grouped.set(hh.segment, entry)
  }
  return [...grouped.entries()].map(([segment, d]) => ({
    segment,
    householdCount: d.householdCount,
    aum: d.aum,
    pctOfAUM: book === 0 ? 0 : d.aum / book,
  }))
}

/**
 * C22 · diversification — the product previously carried two HHI scales (0–10,000 on Book of
 * Business, 0–1 on account concentration). This is the single scale: shares are fractions of 1,
 * the result is 0–10,000, and `effectiveN` is the companion figure that makes it readable.
 * At 13 households the mathematical floor is 769, which is why 1828 must be reported alongside
 * an effective-N of 5.5 rather than described as "moderate concentration" on its own.
 */
export function herfindahlIndex(shares: readonly number[]): number {
  return shares.reduce((sum, s) => sum + (s * 100) ** 2, 0)
}

export function effectiveN(hhi: number): number {
  return hhi === 0 ? 0 : 10_000 / hhi
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/aum.test.ts`
Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/aum.ts src/lib/__tests__/aum.test.ts
git commit -m "feat(lib): AUM derivation primitives with a single FX boundary

Groundwork for D1, C22, C36."
```

---

### Task 3: THE GATE — the roll-up property test

Write this now. It **will fail** until Task 22. That is the point: it is the phase's definition of done,
and every subsequent task should reduce the number of its failing assertions.

**Files:**
- Create: `src/mocks/data/__tests__/rollup-invariants.test.ts`

**Interfaces:**
- Consumes: `deriveHouseholdAUM`, `deriveClientAUM`, `deriveBookAUM`, `deriveSegmentAUM` (Task 2);
  `accounts`, `households`, `clients`, `FX_RATES_USD_BASE` fixtures.
- Produces: nothing — it is a gate.

- [ ] **Step 1: Write the gate**

Create `src/mocks/data/__tests__/rollup-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { clients } from '@/mocks/data/clients'
import { householdFees, billingCycles } from '@/mocks/data/billing'
import { feeSchedules, revenueBySegment, revenueMetrics } from '@/mocks/data/revenue'
import { bookAnalytics } from '@/mocks/data/practice'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { deriveBookAUM, deriveClientAUM, deriveHouseholdAUM, deriveSegmentAUM } from '@/lib/aum'

const RATES = FX_RATES_USD_BASE
/** One cent. Every roll-up in this product is exact to the cent or it is a bug. */
const CENT = 0.01

const BOOK_AUM = 91_320_824.03606

describe('GATE — every roll-up equals the sum of its parts', () => {
  describe('AUM', () => {
    it('the book total is 91,320,824.04 USD, FX-applied', () => {
      expect(deriveBookAUM(accounts, RATES)).toBeCloseTo(BOOK_AUM, 4)
    })

    it.each(households.map((h) => [h.id, h.name, h] as const))(
      '%s (%s): managedAUM === Σ its accounts, FX-applied',
      (_id, _name, household) => {
        expect(household.managedAUM).toBeCloseTo(
          deriveHouseholdAUM(household.id, accounts, RATES), 4,
        )
      },
    )

    it.each(households.map((h) => [h.id, h.name, h] as const))(
      '%s (%s): totalAUM === managedAUM + heldAwayAUM',
      (_id, _name, household) => {
        expect(household.totalAUM).toBeCloseTo(household.managedAUM + household.heldAwayAUM, 4)
      },
    )

    it('Σ household managedAUM === book AUM (no account orphaned, none double-counted)', () => {
      const rolled = households.reduce((s, h) => s + h.managedAUM, 0)
      expect(rolled).toBeCloseTo(deriveBookAUM(accounts, RATES), 4)
    })

    it('every account belongs to exactly one household accountIds list', () => {
      const listed = households.flatMap((h) => h.accountIds)
      expect(new Set(listed).size).toBe(listed.length)
      expect(new Set(listed)).toEqual(new Set(accounts.map((a) => a.id)))
    })

    it.each(clients.map((c) => [c.id, c.fullName, c] as const))(
      '%s (%s): client totalAUM === Σ its accounts, FX-applied',
      (_id, _name, client) => {
        expect(client.totalAUM).toBeCloseTo(deriveClientAUM(client.id, accounts, RATES), 4)
      },
    )

    it('Σ client totalAUM === book AUM', () => {
      const rolled = clients.reduce((s, c) => s + c.totalAUM, 0)
      expect(rolled).toBeCloseTo(deriveBookAUM(accounts, RATES), 4)
    })
  })

  describe('practice analytics', () => {
    it('bookAnalytics.aumBySegment === derived segment AUM', () => {
      const derived = deriveSegmentAUM(households, accounts, RATES)
      for (const row of bookAnalytics.aumBySegment) {
        const match = derived.find((d) => d.segment === row.segment)
        expect(match, `segment ${row.segment} missing from derivation`).toBeDefined()
        expect(row.aum).toBeCloseTo(match!.aum, 4)
        expect(row.count).toBe(match!.householdCount)
      }
      expect(bookAnalytics.aumBySegment.reduce((s, r) => s + r.aum, 0))
        .toBeCloseTo(deriveBookAUM(accounts, RATES), 4)
    })

    it('bookAnalytics.aumByAccountType sums to the book total', () => {
      expect(bookAnalytics.aumByAccountType.reduce((s, r) => s + r.aum, 0))
        .toBeCloseTo(deriveBookAUM(accounts, RATES), 4)
      expect(bookAnalytics.aumByAccountType.reduce((s, r) => s + r.count, 0))
        .toBe(accounts.length)
    })
  })

  describe('positions', () => {
    it.each(accounts.map((a) => [a.id, a.name, a] as const))(
      '%s (%s): Σ position marketValue === account totalValue',
      (_id, _name, account) => {
        const positions = getPositionsForAccount(account.id, account.totalValue)
        const sum = positions.reduce((s, p) => s + p.marketValue, 0)
        expect(sum).toBeCloseTo(account.totalValue, 0)
      },
    )

    it.each(accounts.map((a) => [a.id, a.name, a] as const))(
      '%s (%s): Σ position weight === 1.000',
      (_id, _name, account) => {
        const positions = getPositionsForAccount(account.id, account.totalValue)
        expect(positions.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1, 2)
      },
    )

    it.each(accounts.map((a) => [a.id, a.name, a] as const))(
      '%s (%s): cashBalance === Σ marketValue of cash positions',
      (_id, _name, account) => {
        const positions = getPositionsForAccount(account.id, account.totalValue)
        const cash = positions.filter((p) => p.assetClass === 'cash')
          .reduce((s, p) => s + p.marketValue, 0)
        expect(account.cashBalance).toBeCloseTo(cash, 0)
      },
    )

    it.each(accounts.filter((a) => a.isUMA).map((a) => [a.id, a] as const))(
      '%s: Σ sleeve value === account totalValue',
      (_id, account) => {
        expect(account.sleeves!.reduce((s, sl) => s + sl.value, 0))
          .toBeCloseTo(account.totalValue, 0)
      },
    )
  })

  describe('fees and revenue', () => {
    it.each(householdFees.map((f) => [f.householdId, f] as const))(
      '%s: aumBasis === derived household AUM',
      (householdId, fee) => {
        expect(fee.aumBasis).toBeCloseTo(deriveHouseholdAUM(householdId, accounts, RATES), 4)
      },
    )

    it.each(householdFees.map((f) => [f.householdId, f] as const))(
      '%s: quarterlyAmount === aumBasis × annualRate ÷ 4',
      (_id, fee) => {
        expect(fee.quarterlyAmount).toBeCloseTo(fee.aumBasis * fee.annualRate / 4, 4)
      },
    )

    it('there is one fee schedule per household', () => {
      expect(householdFees.map((f) => f.householdId).sort())
        .toEqual(households.map((h) => h.id).sort())
      expect(feeSchedules.map((f) => f.householdId).sort())
        .toEqual(households.map((h) => h.id).sort())
    })

    it('feeSchedules annualRevenue === householdFees quarterlyAmount × 4', () => {
      for (const schedule of feeSchedules) {
        const fee = householdFees.find((f) => f.householdId === schedule.householdId)!
        expect(schedule.annualRevenue).toBeCloseTo(fee.quarterlyAmount * 4, 4)
      }
    })

    it('the current billing cycle totalBilled === Σ household quarterly fees', () => {
      const current = billingCycles.find((c) => c.period === 'Q1 2026')!
      expect(current.totalBilled)
        .toBeCloseTo(householdFees.reduce((s, f) => s + f.quarterlyAmount, 0), 4)
      expect(current.householdsCount).toBe(households.length)
    })

    it('revenueBySegment === advisory fees grouped by household segment', () => {
      const segmentOf = new Map(households.map((h) => [h.id, h.segment]))
      const expected = new Map<string, { revenue: number; clientCount: number }>()
      for (const fee of householdFees) {
        const seg = segmentOf.get(fee.householdId)!
        const e = expected.get(seg) ?? { revenue: 0, clientCount: 0 }
        e.revenue += fee.quarterlyAmount * 4
        e.clientCount += 1
        expected.set(seg, e)
      }
      for (const row of revenueBySegment) {
        expect(row.revenue).toBeCloseTo(expected.get(row.segment)!.revenue, 4)
        expect(row.clientCount).toBe(expected.get(row.segment)!.clientCount)
      }
    })

    it('totalRecurringRevenue === Σ advisory fees + planning revenue', () => {
      const advisory = householdFees.reduce((s, f) => s + f.quarterlyAmount * 4, 0)
      expect(revenueMetrics.totalRecurringRevenue).toBeGreaterThan(advisory)
      expect(revenueMetrics.avgRevenuePerHousehold)
        .toBe(Math.round(revenueMetrics.totalRecurringRevenue / households.length))
    })
  })
})
```

- [ ] **Step 2: Run it and record the damage**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts 2>&1 | tail -20`
Expected: FAIL, heavily. Record the failed count in the commit message. At the baseline it should
report roughly **90+ failing assertions** (5 household AUM mismatches, 13 totalAUM mismatches,
22 client mismatches, 4 segment rows, 47 position-sum rows, 47 cash rows, 13 fee rows, and the
`householdFixtures`/`feeSchedules` coverage checks). If it *passes*, something is wrong — stop and check
you are on the pre-fix commit.

- [ ] **Step 3: Commit the failing gate**

```bash
git add src/mocks/data/__tests__/rollup-invariants.test.ts
git commit -m "test(gate): every roll-up must equal the sum of its parts

Fails until Phase 1 completes. This is the phase's definition of done.
Covers D1, D2, D3, D4, D5, D6, D13, D14, D23, C22, C29, C36."
```

---

### Task 4: Household AUM becomes derived

**Files:**
- Modify: `src/types/household.ts`
- Modify: `src/mocks/data/households.ts:1-195` (whole file)
- Modify: `src/mocks/data/__tests__/portfolio-invariants.test.ts:78-94`
- Test: `src/mocks/data/__tests__/rollup-invariants.test.ts` (already written, Task 3)

**Interfaces:**
- Consumes: `deriveHouseholdAUM`, `AUMAccount` from `@/lib/aum` (Task 2).
- Produces:
  ```ts
  // src/types/household.ts
  export type HouseholdFixture = Omit<Household, 'totalAUM' | 'managedAUM'>
  // src/mocks/data/households.ts
  export const householdFixtures: HouseholdFixture[]   // leaf data: members, accountIds, heldAwayAUM, segment
  export const households: Household[]                 // derived — same export name, so no call site changes
  ```

`heldAwayAUM` stays hand-typed: it is genuine leaf data describing accounts that do **not** exist in
`accounts.ts` (the Williams 401(k) at Fidelity, and so on). `managedAUM` and `totalAUM` are aggregates
and must not be.

Findings closed: **D1**, and the "$91.3M / $102.5M / $99.855M / $107.055M" finding in `critique-ux.md` §1.4.

- [ ] **Step 1: Confirm the gate is failing on households**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "managedAUM"`
Expected: FAIL — 5 of 13 (`hh-002`, `hh-003`, `hh-007`, `hh-008`, `hh-013`).

- [ ] **Step 2: Add the fixture type**

In `src/types/household.ts`, after the `Household` type:

```ts
/**
 * D1 · data-quality — the shape a household fixture is allowed to hold. `totalAUM` and `managedAUM`
 * are derived from `accounts.ts` and must never appear in a literal.
 */
type HouseholdFixture = Omit<Household, 'totalAUM' | 'managedAUM'>;
```

and add `HouseholdFixture` to the `export type { … }` list.

- [ ] **Step 3: Rewrite the households fixture**

In `src/mocks/data/households.ts`, change the header to:

```ts
import type { Household, HouseholdFixture } from '@/types/household'
import { accounts } from './accounts'
import { FX_RATES_USD_BASE } from './currencies'
import { deriveHouseholdAUM } from '@/lib/aum'

/**
 * Leaf data only. `heldAwayAUM` describes accounts that are not in `accounts.ts` and is therefore
 * hand-typed; `managedAUM` and `totalAUM` are derived below.
 *
 * D1 · data-quality / reconciliation / currencies-and-fx
 */
export const householdFixtures: HouseholdFixture[] = [
```

then delete the `totalAUM:` and `managedAUM:` lines from all 13 literals, keeping `heldAwayAUM`.
For example `hh-002` becomes:

```ts
  {
    id: 'hh-002',
    name: 'Chen-Wong Household',
    members: [
      { clientId: 'cli-003', name: 'Margaret Chen', relationship: 'primary', dateOfBirth: '1965-11-03' },
      { clientId: 'cli-020', name: 'Elizabeth Wong', relationship: 'spouse', dateOfBirth: '1967-09-14' },
    ],
    heldAwayAUM: 4_800_000,
    accountIds: ['acc-006', 'acc-007', 'acc-008', 'acc-009', 'acc-010', 'acc-041', 'acc-042'],
    primaryContactId: 'cli-003',
    segment: 'platinum',
    createdAt: '2019-06-01',
  },
```

Append the derivation at the end of the file:

```ts
]

export const households: Household[] = householdFixtures.map((hh) => {
  const managedAUM = deriveHouseholdAUM(hh.id, accounts, FX_RATES_USD_BASE)
  return { ...hh, managedAUM, totalAUM: managedAUM + hh.heldAwayAUM }
})
```

- [ ] **Step 4: Fix the `accountIds` on hh-003 and hh-007**

`hh-003` lists `acc-047` and `hh-007` lists `acc-045`, and both accounts carry the matching
`householdId`, so no change is needed there. Verify by running:

```bash
pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "exactly one household accountIds"
```
Expected: PASS. If it fails, the reported symmetric difference names the account to reconcile —
make `accountIds` and `householdId` agree, preferring `householdId` on the account as the source of truth.

- [ ] **Step 5: Update the superseded fixture test**

`src/mocks/data/__tests__/portfolio-invariants.test.ts:78-94` asserts the *stored* `managedAUM` against
a **non-FX** account sum, which is exactly the bug. Replace that whole `describe` block with a pointer:

```ts
  // Household AUM consistency now lives in rollup-invariants.test.ts, which asserts the
  // FX-applied identity for every household. D1 · reconciliation.
```

- [ ] **Step 6: Run the gate**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "AUM"`
Expected: the `managedAUM`, `totalAUM`, `Σ household managedAUM` and `every account belongs` tests all
PASS. The `client totalAUM` tests still FAIL (Task 6).

- [ ] **Step 7: Verify the derived values by hand**

Run:
```bash
pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "book total is 91,320,824"
```
Expected: PASS. This is the number that replaces $91.3M / $102.5M / $99.855M / $107.055M.

- [ ] **Step 8: Commit**

```bash
git add src/types/household.ts src/mocks/data/households.ts \
  src/mocks/data/__tests__/portfolio-invariants.test.ts
git commit -m "fix(data): household AUM is derived from accounts, FX-applied

Chen-Wong drops from a stated \$43.5M to a derived \$30,308,018; the book roll-up
drops from \$105.9M to \$91,320,824, closing the \$14.6M gap. Closes D1."
```

---

### Task 5: Book of business — derived AUM, one HHI, a readable waterfall

**Files:**
- Create: `src/lib/waterfall.ts`
- Create: `src/lib/__tests__/waterfall.test.ts`
- Modify: `src/mocks/handlers/pms.ts:14-30,697-770`
- Modify: `src/mocks/handlers/utils.ts:17-26`
- Modify: `src/services/pms.ts:154-167`
- Modify: `src/features/growth/BookOfBusinessPage.tsx:39-93,128,194-203,240-267`
- Modify: `src/features/portfolios/PortfolioPage.tsx:64-90,123`
- Test: `src/mocks/handlers/__tests__/fee-invariants.test.ts` (created in Task 7)

**Interfaces:**
- Consumes: `deriveBookAUM`, `deriveSegmentAUM`, `deriveHouseholdAUM`, `herfindahlIndex`, `effectiveN` (Task 2).
- Produces:
  ```ts
  // src/lib/waterfall.ts
  export type WaterfallBar = { label: string; value: number; kind: 'anchor' | 'delta' }
  export function computeWaterfallDomain(bars: readonly WaterfallBar[], padFraction?: number): [number, number]

  // src/services/pms.ts — BookOfBusiness gains:
  //   effectiveFeeBps: number          (replaces the ambiguous `effectiveFee`)
  //   concentrationHHI: number         (replaces `revenueConcentrationHHI`)
  //   concentrationEffectiveN: number
  //   aumWaterfallDomain: [number, number]
  //   asOf: string
  ```

Findings closed: **C22** (one HHI scale, named for what it measures), **C29 (organic growth half)**,
**D30** (retention), **D31** (target clients), **D23** (labelled AUM), and the broken AUM waterfall in
`critique-ux.md` §1.1 / §Book.

- [ ] **Step 1: Write the failing waterfall test**

Create `src/lib/__tests__/waterfall.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeWaterfallDomain, type WaterfallBar } from '@/lib/waterfall'

// The real trailing-12M decomposition on a derived book of 91,320,824.
const BARS: WaterfallBar[] = [
  { label: 'Starting AUM', value: 84_015_158, kind: 'anchor' },
  { label: 'Market appreciation', value: 5_935_854, kind: 'delta' },
  { label: 'New assets', value: 2_922_266, kind: 'delta' },
  { label: 'Withdrawals', value: -1_095_850, kind: 'delta' },
  { label: 'Attrition', value: -456_604, kind: 'delta' },
  { label: 'Current AUM', value: 91_320_824, kind: 'anchor' },
]

describe('computeWaterfallDomain', () => {
  it('brackets the running cumulative range, not zero', () => {
    const [lo, hi] = computeWaterfallDomain(BARS)
    // running values span 84,015,158 → 92,873,278; span 8,858,120; 8% pad = 708,649.6
    expect(lo).toBeCloseTo(83_306_508.4, 1)
    expect(hi).toBeCloseTo(93_581_927.6, 1)
    expect(lo).toBeGreaterThan(0)
  })

  it('makes the smallest bar legible: >4% of plot height instead of <0.5%', () => {
    const [lo, hi] = computeWaterfallDomain(BARS)
    const smallest = Math.min(...BARS.filter((b) => b.kind === 'delta').map((b) => Math.abs(b.value)))
    const truncatedShare = smallest / (hi - lo)
    const zeroBasedShare = smallest / 92_873_278
    expect(truncatedShare).toBeGreaterThan(0.04)
    expect(zeroBasedShare).toBeLessThan(0.005)
    expect(truncatedShare / zeroBasedShare).toBeGreaterThan(8)
  })

  it('falls back to a zero-based domain when every bar is a delta from zero', () => {
    const [lo] = computeWaterfallDomain([{ label: 'x', value: 100, kind: 'delta' }])
    expect(lo).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/waterfall.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/waterfall"`.

- [ ] **Step 3: Write the waterfall helper**

Create `src/lib/waterfall.ts`:

```ts
export type WaterfallBar = {
  label: string
  value: number
  /** `anchor` bars are absolute levels (opening and closing balance); `delta` bars are movements. */
  kind: 'anchor' | 'delta'
}

/**
 * A truncated axis for a waterfall whose deltas are small relative to its base.
 *
 * critique-ux §1.1 — on a $0–$100M axis, Market Appreciation, New Assets, Withdrawals and
 * Attrition rendered as 3–8px slivers. A waterfall of $2M deltas on a $91M base is unreadable
 * unless the axis brackets the running cumulative range instead of starting at zero.
 * The caller must caption the axis so the truncation is disclosed.
 */
export function computeWaterfallDomain(
  bars: readonly WaterfallBar[],
  padFraction = 0.08,
): [number, number] {
  const levels: number[] = []
  let running = 0
  for (const bar of bars) {
    if (bar.kind === 'anchor') {
      running = bar.value
      levels.push(running)
    } else {
      levels.push(running)
      running += bar.value
      levels.push(running)
    }
  }
  const lo = Math.min(...levels)
  const hi = Math.max(...levels)
  const span = hi - lo
  if (span === 0) return [0, hi || 1]
  const pad = span * padFraction
  return [Math.max(0, lo - pad), hi + pad]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/waterfall.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Derive the book-of-business handler**

In `src/mocks/handlers/pms.ts`, replace the local `toUSD` helper (lines 14–18) and `computeMetrics`'s
AUM line with the shared derivation, and rewrite the `book-of-business` handler (lines 698–769):

```ts
import { deriveBookAUM, deriveHouseholdAUM, deriveSegmentAUM, herfindahlIndex, effectiveN } from '@/lib/aum'
import { assetWeightedEffectiveFee, householdAnnualFee } from '@/lib/fees'
import { computeWaterfallDomain, type WaterfallBar } from '@/lib/waterfall'
import { householdFees } from '../data/billing'
import { MOCK_NOW_ISO } from '@/lib/clock'

// …

  http.get('/api/pms/book-of-business', () => {
    const totalAUM = deriveBookAUM(accounts, FX_RATES_USD_BASE)
    const clientCount = new Set(accounts.map((a) => a.clientId)).size

    // C29 · fee-billing — the effective fee is asset-weighted (Σ fees ÷ Σ AUM), reported in basis
    // points. It was previously the constant 0.85 rendered as "0.85 bps" — a 100× unit error — and
    // disagreed with Billing's 88 bps (an unweighted mean of 13 rates).
    const fees = householdFees.map((f) => ({
      aum: deriveHouseholdAUM(f.householdId, accounts, FX_RATES_USD_BASE),
      annualFee: householdAnnualFee(
        deriveHouseholdAUM(f.householdId, accounts, FX_RATES_USD_BASE), f.annualRate,
      ),
    }))
    const annualRevenue = fees.reduce((s, f) => s + f.annualFee, 0)
    const effectiveFeeBps = assetWeightedEffectiveFee(fees)

    const segments = deriveSegmentAUM(households, accounts, FX_RATES_USD_BASE).map((s) => ({
      segment: s.segment,
      householdCount: s.householdCount,
      aum: Math.round(s.aum),
      pctOfAUM: roundTo(s.pctOfAUM, 4),
    }))

    // AUM waterfall — trailing 12 months. Deltas are the leaf figures; both anchors are derived
    // so the bars reconcile exactly to the book total.
    const marketAppreciation = Math.round(totalAUM * 0.065)
    const newAssets = Math.round(totalAUM * 0.032)
    const withdrawals = -Math.round(totalAUM * 0.012)
    const attrition = -Math.round(totalAUM * 0.005)
    const startingAUM = Math.round(totalAUM) - marketAppreciation - newAssets - withdrawals - attrition
    const aumWaterfall: WaterfallBar[] = [
      { label: 'Starting AUM', value: startingAUM, kind: 'anchor' },
      { label: 'Market appreciation', value: marketAppreciation, kind: 'delta' },
      { label: 'New assets', value: newAssets, kind: 'delta' },
      { label: 'Withdrawals', value: withdrawals, kind: 'delta' },
      { label: 'Attrition', value: attrition, kind: 'delta' },
      { label: 'Current AUM', value: Math.round(totalAUM), kind: 'anchor' },
    ]

    // C29 · advisor-dashboards — organic growth is net of withdrawals and attrition. The 3.2%
    // previously shown was the gross new-asset line straight off the waterfall.
    const organicGrowthRate = roundTo(
      ((newAssets + withdrawals + attrition) / startingAUM) * 100, 1,
    )

    // C22 · diversification — one HHI scale (0–10,000), named for what it measures (AUM, not
    // revenue), reported with its effective-N companion. At 13 households the floor is 769.
    const shares = households.map((hh) => deriveHouseholdAUM(hh.id, accounts, FX_RATES_USD_BASE) / totalAUM)
    const concentrationHHI = Math.round(herfindahlIndex(shares))
    const concentrationEffectiveN = roundTo(effectiveN(herfindahlIndex(shares)), 1)

    // D30 · advisor-dashboards — losing 1 of 13 households is 92.3% retention, not 98.5%.
    const attritionCount = 1
    // D31 · advisor-dashboards — 120 clients on a $4.3M-average book implies a $520M practice.
    const targetClients = 75
    const avgMeetingsPerClient = 2.4
    const meetingsPerWeek = 12

    return HttpResponse.json({
      totalAUM: Math.round(totalAUM),
      householdCount: households.length,
      clientCount,
      annualRevenue: Math.round(annualRevenue),
      effectiveFeeBps: roundTo(effectiveFeeBps, 1),
      organicGrowthRate,
      retentionRate: roundTo(((households.length - attritionCount) / households.length) * 100, 1),
      attritionCount,
      concentrationHHI,
      concentrationEffectiveN,
      segments,
      aumWaterfall,
      aumWaterfallDomain: computeWaterfallDomain(aumWaterfall),
      asOf: MOCK_NOW_ISO,
      capacity: {
        currentClients: clientCount,
        targetClients,
        utilizationPct: roundTo((clientCount / targetClients) * 100, 1),
        avgMeetingsPerClient,
        meetingsPerWeek,
        meetingCapacityPct: roundTo((clientCount * avgMeetingsPerClient) / (meetingsPerWeek * 50) * 100, 1),
      },
    })
  }),
```

Replace the body of `computeTotalAUM()` in `src/mocks/handlers/utils.ts:17-26` with
`return Math.round(deriveBookAUM(accounts, FX_RATES_USD_BASE))` so the AI insight strings read from
the same derivation.

- [ ] **Step 6: Update the service types**

In `src/services/pms.ts`, replace the `AUMWaterfallItem` and `BookOfBusiness` types (lines 149–167):

```ts
export type AUMWaterfallItem = {
  label: string
  value: number
  kind: 'anchor' | 'delta'
}

export type BookOfBusiness = {
  totalAUM: number
  householdCount: number
  clientCount: number
  annualRevenue: number
  /** Asset-weighted: Σ household annual fees ÷ Σ AUM, in basis points. */
  effectiveFeeBps: number
  /** Net of withdrawals and attrition, percent. */
  organicGrowthRate: number
  retentionRate: number
  attritionCount: number
  /** AUM-share Herfindahl on the 0–10,000 scale. */
  concentrationHHI: number
  /** 10,000 ÷ HHI — the number of equally-sized households the book behaves like. */
  concentrationEffectiveN: number
  segments: BookSegment[]
  aumWaterfall: AUMWaterfallItem[]
  aumWaterfallDomain: [number, number]
  asOf: string
  capacity: CapacityMetrics
}
```

- [ ] **Step 7: Update the page**

In `src/features/growth/BookOfBusinessPage.tsx`:

Pass the domain into the chart. Change the `AUMWaterfall` signature at `:39` and the `YAxis` at `:74`:

```tsx
function AUMWaterfall({ data, domain }: { data: AUMWaterfallItem[]; domain: [number, number] }) {
  const { formatWithConversion } = useFormatCurrency()

  type Bar = { label: string; base: number; bar: number; value: number; isTotal: boolean; isNegative: boolean }
  const bars: Bar[] = []
  let running = 0
  for (const d of data) {
    if (d.kind === 'anchor') {
      running = d.value
      bars.push({ label: d.label, base: domain[0], bar: d.value - domain[0], value: d.value, isTotal: true, isNegative: false })
    } else {
      const start = running
      running += d.value
      bars.push({
        label: d.label,
        base: Math.min(start, running),
        bar: Math.abs(d.value),
        value: d.value,
        isTotal: false,
        isNegative: d.value < 0,
      })
    }
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={bars} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} angle={-20} textAnchor="end" height={50} />
        <YAxis
          domain={domain}
          allowDataOverflow
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickFormatter={(v: number) => formatWithConversion(v, 'USD', { compact: true })}
          width={60}
        />
        <RechartsTooltip content={<WaterfallTooltip />} />
        <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="bar" stackId="a" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {bars.map((entry, i) => (
            <Cell key={i} fill={entry.isTotal ? 'var(--accent-blue)' : entry.isNegative ? 'var(--accent-red)' : 'var(--accent-green)'} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

At the call site (`:214`) pass the domain and disclose the truncation:

```tsx
        <Card>
          <CardHeader>AUM decomposition (trailing 12 months)</CardHeader>
          <CardContent>
            <AUMWaterfall data={data.aumWaterfall} domain={data.aumWaterfallDomain} />
            <p className="mt-2 text-caption text-text-tertiary">
              Vertical axis begins at {formatWithConversion(data.aumWaterfallDomain[0], 'USD', { compact: true })}, not zero, so
              that period movements are legible against the opening balance.
            </p>
          </CardContent>
        </Card>
```

Fix the metrics strip at `:194-203`:

```tsx
  const metrics: DenseMetric[] = [
    { label: 'Total AUM', value: formatWithConversion(data.totalAUM, 'USD', { compact: true }), change: { value: `${data.organicGrowthRate}%`, direction: 'up' } },
    { label: 'Households', value: String(data.householdCount) },
    { label: 'Clients', value: String(data.clientCount) },
    { label: 'Annual revenue', value: formatWithConversion(data.annualRevenue, 'USD', { compact: true }) },
    { label: 'Effective fee', value: `${data.effectiveFeeBps} bps` },
    { label: 'Organic growth', value: `${data.organicGrowthRate}%` },
    { label: 'Retention', value: `${data.retentionRate}%` },
    { label: 'AUM concentration', value: String(data.concentrationHHI) },
  ]
```

Rename the "Revenue Concentration" card to "AUM concentration" and render the effective-N companion
(`:236-267`), replacing `data.revenueConcentrationHHI` with `data.concentrationHHI` throughout and
adding beneath the score:

```tsx
                <div className="text-caption text-text-secondary">
                  Effective number of households: <span className="font-mono">{data.concentrationEffectiveN}</span>.
                  At {data.householdCount} households the mathematical floor is{' '}
                  <span className="font-mono">{Math.round(10_000 / data.householdCount)}</span>.
                </div>
```

Fix the signed share-of-total at `:128` (`critique-ux.md` §Book — `+64.1%` on a share is never signed):

```tsx
              <td className="px-3 py-2 text-right font-mono text-text-primary">{(seg.pctOfAUM * 100).toFixed(1)}%</td>
```

- [ ] **Step 8: Fix the Portfolios page total**

`src/features/portfolios/PortfolioPage.tsx:123` is the source of the `$102.5M`. Replace it and the
household grouping at `:64-90`:

```tsx
import { accountValueUSD, sumAccountsUSD } from '@/lib/aum'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

// …at :71 and :73, inside householdGroups:
        existing.totalAUM += accountValueUSD(acc, FX_RATES_USD_BASE)
      } else {
        groups.set(acc.householdId, { accounts: [acc], totalAUM: accountValueUSD(acc, FX_RATES_USD_BASE) })

// …at :123:
  const totalAUM = sumAccountsUSD(allAccounts, FX_RATES_USD_BASE)
```

- [ ] **Step 9: Verify the numbers on screen**

Run: `pnpm type-check && pnpm test:run 2>&1 | tail -5`
Expected: no *new* failures beyond the gate.

Then add the assertion to the gate file — append to `rollup-invariants.test.ts` inside the
`practice analytics` describe:

```ts
    it('the AUM waterfall reconciles to the book total', async () => {
      const { getBookOfBusiness } = await import('@/services/pms')
      const book = await getBookOfBusiness()
      const deltas = book.aumWaterfall.filter((b) => b.kind === 'delta')
      const start = book.aumWaterfall.find((b) => b.label === 'Starting AUM')!
      const end = book.aumWaterfall.find((b) => b.label === 'Current AUM')!
      expect(start.value + deltas.reduce((s, d) => s + d.value, 0)).toBe(end.value)
      expect(end.value).toBe(Math.round(deriveBookAUM(accounts, RATES)))
      expect(book.totalAUM).toBe(91_320_824)
      expect(book.concentrationHHI).toBe(1828)
      expect(book.concentrationEffectiveN).toBe(5.5)
      expect(book.retentionRate).toBe(92.3)
      expect(book.organicGrowthRate).toBe(1.6)
      expect(book.segments.find((s) => s.segment === 'platinum')).toMatchObject({
        householdCount: 3, aum: 58_558_018,
      })
    })
```

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "waterfall reconciles"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/waterfall.ts src/lib/__tests__/waterfall.test.ts src/mocks/handlers/pms.ts \
  src/mocks/handlers/utils.ts src/services/pms.ts src/features/growth/BookOfBusinessPage.tsx \
  src/features/portfolios/PortfolioPage.tsx src/mocks/data/__tests__/rollup-invariants.test.ts
git commit -m "fix(book): derive book AUM, one HHI scale, readable waterfall axis

Portfolios' \$102.5M naive sum now matches the dashboard's derived \$91,320,824.
Organic growth is net (1.6%, was gross 3.2%); retention is 92.3% (was 98.5%).
Closes C22, D30, D31, and the AUM-waterfall finding in critique-ux §1.1."
```

---

### Task 6: `practice.ts` and `clients.ts` — the last two hand-typed AUM totals

**Files:**
- Modify: `src/mocks/data/practice.ts:42-56`
- Modify: `src/mocks/data/clients.ts` (22 `totalAUM` literals)
- Test: `src/mocks/data/__tests__/rollup-invariants.test.ts` (Task 3)

**Interfaces:**
- Consumes: `deriveSegmentAUM`, `deriveClientAUM`, `accountValueUSD` from `@/lib/aum`;
  `households` from `./households` (derived, Task 4).
- Produces: `bookAnalytics.aumBySegment` and `.aumByAccountType` as derived arrays; `clients[].totalAUM` derived.

`practice.ts:41-46` is one of the four conflicting Total AUM figures ($99,855,000), and `clients.ts`
is the fourth ($107,055,000). Findings closed: the `critique-ux.md` §1.4 four-AUM finding, **D23**.

- [ ] **Step 1: Confirm the gate is failing**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "aumBySegment"`
Expected: FAIL — `expected 66850000 to be close to 58558018`.

- [ ] **Step 2: Derive `bookAnalytics`**

In `src/mocks/data/practice.ts`, replace lines 42–56:

```ts
import type { TeamMemberActivity, BookAnalytics } from '@/types/practice'
import { accounts } from './accounts'
import { households } from './households'
import { FX_RATES_USD_BASE } from './currencies'
import { accountValueUSD, deriveSegmentAUM } from '@/lib/aum'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  trust_revocable: 'Trust',
  trust_irrevocable: 'Trust',
  traditional_ira: 'IRA',
  roth_ira: 'IRA',
  sep_ira: 'IRA',
  simple_ira: 'IRA',
  inherited_ira: 'IRA',
  '529': '529',
}

function deriveAUMByAccountType(): BookAnalytics['aumByAccountType'] {
  const grouped = new Map<string, { aum: number; count: number }>()
  for (const account of accounts) {
    const label = ACCOUNT_TYPE_LABELS[account.type] ?? 'Other'
    const entry = grouped.get(label) ?? { aum: 0, count: 0 }
    entry.aum += accountValueUSD(account, FX_RATES_USD_BASE)
    entry.count += 1
    grouped.set(label, entry)
  }
  return [...grouped.entries()]
    .map(([type, d]) => ({ type, aum: Math.round(d.aum), count: d.count }))
    .sort((a, b) => b.aum - a.aum)
}

export const bookAnalytics: BookAnalytics = {
  // critique-ux §1.4 — these were hand-typed and summed to $99,855,000 against a book of
  // $91,320,824, with `Other: 4,855,000` acting as a visible plug on the bar chart.
  aumBySegment: deriveSegmentAUM(households, accounts, FX_RATES_USD_BASE).map((s) => ({
    segment: s.segment as BookAnalytics['aumBySegment'][number]['segment'],
    aum: Math.round(s.aum),
    count: s.householdCount,
  })),
  aumByAccountType: deriveAUMByAccountType(),
  clientTenure: [
    // …unchanged
  ],
  // …growthTrend and topGrowthHouseholds unchanged
}
```

Note `Math.round` on each segment means the segment rows sum to `91,320,824` exactly only if the
rounding is neutral. Verify in Step 5; if the sum is off by 1, absorb the residual into the largest
segment rather than relaxing the gate's tolerance.

- [ ] **Step 3: Derive client AUM**

`clients.ts` holds 22 `totalAUM` literals. Rather than edit each, convert the array to a fixture plus a
derivation. At the top of `src/mocks/data/clients.ts`:

```ts
import type { Client } from '@/types/client'
import { accounts } from './accounts'
import { FX_RATES_USD_BASE } from './currencies'
import { deriveClientAUM } from '@/lib/aum'

type ClientFixture = Omit<Client, 'totalAUM'>

const clientFixtures: ClientFixture[] = [
```

Delete every `totalAUM: …,` line from the 22 literals, rename the closing `]` binding, and append:

```ts
]

/**
 * D23 · fee-billing / regulatory-reporting — client AUM is the FX-applied sum of the client's own
 * accounts. The hand-typed values summed to $107,055,000 against a book of $91,320,824, and were
 * an unlabelled blend of managed and held-away assets. Only managed AUM is billable and reportable
 * as Regulatory AUM under Form ADV Item 5.
 */
export const clients: Client[] = clientFixtures.map((c) => ({
  ...c,
  totalAUM: deriveClientAUM(c.id, accounts, FX_RATES_USD_BASE),
}))
```

- [ ] **Step 4: Label managed vs held-away where the blend was hidden**

`src/features/clients/HouseholdListView.tsx:188` renders `hh.totalAUM` under a bare AUM column while
Book of Business renders managed AUM — the D23 finding. Change it to render managed AUM with the
held-away figure adjacent:

```tsx
                  <span className="ml-auto text-right">
                    <span className="block font-mono text-body font-medium text-text-primary">
                      {formatWithConversion(hh.managedAUM, 'USD', { compact: true })}
                    </span>
                    <span className="block font-mono text-caption text-text-tertiary">
                      managed{hh.heldAwayAUM > 0 ? ` · ${formatWithConversion(hh.heldAwayAUM, 'USD', { compact: true })} held away` : ''}
                    </span>
                  </span>
```

and change `sortHouseholds`'s `'aum'` case at `:59` to sort on `managedAUM`.

- [ ] **Step 5: Run the gate**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "AUM"`
Expected: all AUM and practice-analytics assertions PASS, including
`Σ client totalAUM === book AUM` and `aumByAccountType sums to the book total`.

- [ ] **Step 6: Run the suite**

Run: `pnpm type-check && pnpm test:run 2>&1 | tail -5`
Expected: `ClientListPage.test.tsx` and `ClientDetailPage.test.tsx` may assert old AUM strings
(e.g. `$18.4M` for Robert Johnson, now `$16.3M`). Update those *test expectations* to the derived
values — `cli-001` is `16_250_000`, `cli-003` is `24_688_018`, `cli-021` is `3_478_261`.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/data/practice.ts src/mocks/data/clients.ts \
  src/features/clients/HouseholdListView.tsx src/features/clients/__tests__
git commit -m "fix(data): practice analytics and client AUM are derived

Removes the last two of the four conflicting Total AUM figures (\$99.855M, \$107.055M).
Households now label managed vs held-away. Closes D23."
```

---

### Task 7: `src/lib/fees.ts` — one asset-weighted fee

**Files:**
- Create: `src/lib/fees.ts`
- Create: `src/lib/__tests__/fees.test.ts`
- Create: `src/mocks/handlers/__tests__/fee-invariants.test.ts`
- Modify: `src/mocks/data/billing.ts:3-36`
- Modify: `src/features/growth` billing surface: `src/features/growth/BillingPage.tsx` (Avg Fee Rate tile)

**Interfaces:**
- Consumes: `deriveHouseholdAUM` (Task 2).
- Produces:
  ```ts
  export function householdAnnualFee(aum: number, annualRate: number): number
  export function assetWeightedEffectiveFee(rows: readonly { aum: number; annualFee: number }[]): number  // basis points
  export function bps(rate: number): number         // 0.0085 -> 85
  export function rateFromBps(basisPoints: number): number
  export function blendedTieredFee(aum: number, tiers: readonly { upTo: number | null; rate: number }[]): { fee: number; blendedRate: number }
  ```

Findings closed: **C29** (the 100× unit error and the three competing fee numbers), **D13**
(Thompson billed on $3.9M against an actual $4,385,000), **D14** (cycle total vs Σ household fees),
**D16** (the "flat" fee-type mislabel), **C30** (breakpoint savings).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/fees.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { householdAnnualFee, assetWeightedEffectiveFee, bps, rateFromBps, blendedTieredFee } from '@/lib/fees'

describe('bps', () => {
  it('0.0085 is 85 basis points, not 0.85', () => {
    expect(bps(0.0085)).toBe(85)
    expect(rateFromBps(85)).toBeCloseTo(0.0085, 10)
  })
})

describe('householdAnnualFee', () => {
  it('Chen-Wong: 30,308,017.71195 at 65 bps is 197,002.115', () => {
    expect(householdAnnualFee(30_308_017.71195, 0.0065)).toBeCloseTo(197_002.1151, 4)
  })
})

describe('assetWeightedEffectiveFee', () => {
  const BOOK = [
    { aum: 18_750_000, annualFee: 140_625 },
    { aum: 30_308_017.71195, annualFee: 197_002.11512 },
    { aum: 4_995_000, annualFee: 42_457.5 },
    { aum: 9_500_000, annualFee: 76_000 },
    { aum: 4_385_000, annualFee: 41_657.5 },
    { aum: 7_200_000, annualFee: 57_600 },
    { aum: 5_965_000, annualFee: 47_720 },
    { aum: 1_385_000, annualFee: 13_850 },
    { aum: 1_050_000, annualFee: 10_500 },
    { aum: 720_000, annualFee: 7_200 },
    { aum: 1_500_000, annualFee: 15_000 },
    { aum: 380_000, annualFee: 3_800 },
    { aum: 5_182_806.32411, annualFee: 44_053.85376 },
  ]

  it('is 76.4 bps on the derived book, not 88 bps and not 0.85', () => {
    expect(assetWeightedEffectiveFee(BOOK)).toBeCloseTo(76.3753, 3)
  })

  it('differs from the unweighted mean of the rates', () => {
    const unweighted = BOOK.reduce((s, r) => s + (r.annualFee / r.aum), 0) / BOOK.length * 10_000
    expect(unweighted).toBeCloseTo(88.0769, 3)
    expect(Math.abs(unweighted - assetWeightedEffectiveFee(BOOK))).toBeGreaterThan(10)
  })

  it('is zero on an empty book rather than NaN', () => {
    expect(assetWeightedEffectiveFee([])).toBe(0)
  })
})

describe('blendedTieredFee', () => {
  // tpl-001 from proposals.ts: 1.00% to $2M, 0.85% $2–5M, 0.70% above $5M
  const TIERS = [
    { upTo: 2_000_000, rate: 0.0100 },
    { upTo: 5_000_000, rate: 0.0085 },
    { upTo: null, rate: 0.0070 },
  ]

  it('C33: a $5,000,000 portfolio pays $45,500, a 0.91% blended rate — not $40,250 / 0.805%', () => {
    const { fee, blendedRate } = blendedTieredFee(5_000_000, TIERS)
    expect(fee).toBeCloseTo(45_500, 2)
    expect(blendedRate).toBeCloseTo(0.0091, 6)
  })

  it('charges marginally, so the first $2M always costs $20,000', () => {
    expect(blendedTieredFee(2_000_000, TIERS).fee).toBeCloseTo(20_000, 2)
  })

  it('applies the top tier above the last breakpoint', () => {
    // 20,000 + 25,500 + 0.70% × 5,000,000 = 80,500
    expect(blendedTieredFee(10_000_000, TIERS).fee).toBeCloseTo(80_500, 2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/fees.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/fees"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/fees.ts`:

```ts
/**
 * Fee arithmetic.
 *
 * C29 · fee-billing / advisor-dashboards — the product previously carried three fee numbers for
 * one book: `0.85` rendered as "0.85 bps" (a 100× unit error; it is 85 bps), Billing's "88 bps"
 * (the unweighted mean of 13 rates), and $726,752/yr implied by the hand-typed quarterly amounts.
 * The effective fee is Σ fees ÷ Σ AUM and nothing else.
 */

/** 0.0085 → 85. */
export function bps(rate: number): number {
  return rate * 10_000
}

/** 85 → 0.0085. */
export function rateFromBps(basisPoints: number): number {
  return basisPoints / 10_000
}

export function householdAnnualFee(aum: number, annualRate: number): number {
  return aum * annualRate
}

/** Asset-weighted effective fee, in basis points. */
export function assetWeightedEffectiveFee(
  rows: readonly { aum: number; annualFee: number }[],
): number {
  const totalAUM = rows.reduce((s, r) => s + r.aum, 0)
  if (totalAUM === 0) return 0
  return bps(rows.reduce((s, r) => s + r.annualFee, 0) / totalAUM)
}

export type FeeTier = { upTo: number | null; rate: number }

/**
 * C33 · fee-billing / fee-disclosure — marginal tiered billing. The proposal previously hardcoded
 * "$40,250 (0.805% blended rate)" for a $5,000,000 portfolio; tpl-001's own tier table gives
 * $45,500 / 0.91%, a $5,250/yr understatement in a client-facing fee disclosure.
 */
export function blendedTieredFee(
  aum: number,
  tiers: readonly FeeTier[],
): { fee: number; blendedRate: number } {
  let remaining = aum
  let floor = 0
  let fee = 0
  for (const tier of tiers) {
    if (remaining <= 0) break
    const ceiling = tier.upTo ?? Number.POSITIVE_INFINITY
    const slice = Math.min(remaining, ceiling - floor)
    fee += slice * tier.rate
    remaining -= slice
    floor = ceiling
  }
  return { fee, blendedRate: aum === 0 ? 0 : fee / aum }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/fees.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Derive the billing fixture**

Replace `src/mocks/data/billing.ts:1-36`:

```ts
import type { BillingCycle, HouseholdFee, BillingException, BreakpointAnalysis } from '@/types/billing'
import { accounts } from './accounts'
import { households } from './households'
import { FX_RATES_USD_BASE } from './currencies'
import { deriveHouseholdAUM } from '@/lib/aum'
import { householdAnnualFee } from '@/lib/fees'

/**
 * Leaf data: the negotiated rate and billing method per household. `aumBasis` and
 * `quarterlyAmount` are derived.
 *
 * D13 · fee-billing — Thompson was billed on a hand-typed $3,900,000 while the household's actual
 * AUM is $4,385,000, and exception bex-003 claimed it sat $100K below a $4M breakpoint it had
 * already cleared.
 * D16 · fee-disclosure — `feeType: 'flat'` on a percentage schedule is a mislabel; a flat fee is a
 * fixed dollar retainer. These are single-tier schedules.
 */
type FeeTerms = {
  householdId: string
  householdName: string
  feeType: HouseholdFee['feeType']
  annualRate: number
  method: HouseholdFee['method']
  lastCollected: string
  exceptions: string[]
}

const feeTerms: FeeTerms[] = [
  { householdId: 'hh-001', householdName: 'Johnson Household', feeType: 'tiered', annualRate: 0.0075, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-002', householdName: 'Chen-Wong Household', feeType: 'tiered', annualRate: 0.0065, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-003', householdName: 'Williams Household', feeType: 'tiered', annualRate: 0.0085, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-004', householdName: 'Martinez Household', feeType: 'tiered', annualRate: 0.0080, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-005', householdName: 'Thompson Household', feeType: 'breakpoint', annualRate: 0.0095, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-006', householdName: 'Anderson Household', feeType: 'tiered', annualRate: 0.0080, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-007', householdName: 'Patel Household', feeType: 'tiered', annualRate: 0.0080, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-008', householdName: "O'Brien Household", feeType: 'single_tier', annualRate: 0.0100, method: 'arrears', lastCollected: '2025-12-31', exceptions: ['missing_aum'] },
  { householdId: 'hh-009', householdName: 'Kim-Lee Household', feeType: 'single_tier', annualRate: 0.0100, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-010', householdName: 'Garcia Household', feeType: 'single_tier', annualRate: 0.0100, method: 'arrears', lastCollected: '2025-12-31', exceptions: ['schedule_mismatch'] },
  { householdId: 'hh-011', householdName: 'Foster Household', feeType: 'single_tier', annualRate: 0.0100, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-012', householdName: 'Taylor Household', feeType: 'single_tier', annualRate: 0.0100, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-013', householdName: 'Mueller Household', feeType: 'tiered', annualRate: 0.0085, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
]

export const householdFees: HouseholdFee[] = feeTerms.map((t) => {
  const aumBasis = deriveHouseholdAUM(t.householdId, accounts, FX_RATES_USD_BASE)
  return { ...t, aumBasis, quarterlyAmount: householdAnnualFee(aumBasis, t.annualRate) / 4 }
})

const quarterlyTotal = householdFees.reduce((s, f) => s + f.quarterlyAmount, 0)

export const billingCycles: BillingCycle[] = [
  // D14 · fee-billing — `totalBilled` was 198,500 against a household sum of 181,688, and both
  // rendered on the same screen. D15 · fee-billing — a cycle whose fees were collected on
  // 2 January cannot still be in Review in late February.
  { id: 'bc-001', period: 'Q1 2026', stage: 'collection', stageCompletedAt: '2026-01-02', totalBilled: quarterlyTotal, totalCollected: quarterlyTotal, householdsCount: households.length, exceptionsCount: 2 },
  { id: 'bc-002', period: 'Q4 2025', stage: 'collection', stageCompletedAt: '2026-01-15', totalBilled: quarterlyTotal * 0.982, totalCollected: quarterlyTotal * 0.982, householdsCount: households.length, exceptionsCount: 1 },
  { id: 'bc-003', period: 'Q3 2025', stage: 'collection', stageCompletedAt: '2025-10-12', totalBilled: quarterlyTotal * 0.965, totalCollected: quarterlyTotal * 0.965, householdsCount: households.length, exceptionsCount: 0 },
]
```

Update `src/types/billing.ts` so `feeType` accepts `'single_tier'` and drops `'flat'`.

Then replace `bex-003` and the `breakpointAnalyses` array (lines 28, 32–36):

```ts
  { id: 'bex-003', householdId: 'hh-009', householdName: 'Kim-Lee Household', type: 'breakpoint_near_miss', description: 'Household AUM is $450,000 below the $1,500,000 breakpoint. Reaching it would reduce the rate from 1.00% to 0.90%, an estimated saving of $1,500 a year at the breakpoint balance.', severity: 'low', createdAt: '2026-02-15T09:00:00Z' },
```

```ts
/**
 * C30 · fee-billing — savings are the rate delta applied to the *breakpoint* balance, not to the
 * current balance. Kim-Lee reaching $1.5M at 0.90% against 1.00% saves $1,500/yr, not $1,050.
 */
export const breakpointAnalyses: BreakpointAnalysis[] = [
  { householdId: 'hh-009', householdName: 'Kim-Lee Household', currentAUM: 1_050_000, nextBreakpoint: 1_500_000, gapToBreakpoint: 450_000, currentRate: 0.0100, breakpointRate: 0.0090, annualSavings: 1_500 },
  { householdId: 'hh-010', householdName: 'Garcia Household', currentAUM: 720_000, nextBreakpoint: 1_000_000, gapToBreakpoint: 280_000, currentRate: 0.0100, breakpointRate: 0.0095, annualSavings: 500 },
  { householdId: 'hh-011', householdName: 'Foster Household', currentAUM: 1_500_000, nextBreakpoint: 2_000_000, gapToBreakpoint: 500_000, currentRate: 0.0100, breakpointRate: 0.0090, annualSavings: 2_000 },
]
```

Thompson (`hh-005`) is removed from breakpoint analysis because its derived AUM of $4,385,000 is
already above the $4M breakpoint — the D13 finding.

- [ ] **Step 6: Write the cross-surface fee test**

Create `src/mocks/handlers/__tests__/fee-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getBookOfBusiness } from '@/services/pms'
import { householdFees } from '@/mocks/data/billing'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { deriveBookAUM } from '@/lib/aum'
import { assetWeightedEffectiveFee } from '@/lib/fees'

describe('one fee number across every surface', () => {
  it('Book of Business reports 76.4 bps, in basis points', async () => {
    const book = await getBookOfBusiness()
    expect(book.effectiveFeeBps).toBe(76.4)
  })

  it('effectiveFeeBps === annualRevenue ÷ totalAUM', async () => {
    const book = await getBookOfBusiness()
    expect((book.annualRevenue / book.totalAUM) * 10_000).toBeCloseTo(book.effectiveFeeBps, 1)
  })

  it('annualRevenue === Σ household annual fees', async () => {
    const book = await getBookOfBusiness()
    expect(book.annualRevenue)
      .toBe(Math.round(householdFees.reduce((s, f) => s + f.quarterlyAmount * 4, 0)))
    expect(book.annualRevenue).toBe(697_466)
  })

  it('the billing surface reports the same asset-weighted rate, not the unweighted mean', async () => {
    const rows = householdFees.map((f) => ({ aum: f.aumBasis, annualFee: f.quarterlyAmount * 4 }))
    const weighted = assetWeightedEffectiveFee(rows)
    const unweighted = householdFees.reduce((s, f) => s + f.annualRate, 0) / householdFees.length * 10_000
    expect(weighted).toBeCloseTo(76.3753, 3)
    expect(unweighted).toBeCloseTo(88.0769, 3)
  })

  it('Σ aumBasis === book AUM — nobody is billed on a stale basis', () => {
    expect(householdFees.reduce((s, f) => s + f.aumBasis, 0))
      .toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
  })
})
```

- [ ] **Step 7: Update the Billing page tile**

Find the "Avg Fee Rate" tile: `grep -rn "Avg Fee Rate\|avgFeeRate" src/features`. Replace the
unweighted mean with the asset-weighted figure and rename the label to `Effective fee (asset-weighted)`,
reading it from `getBookOfBusiness().effectiveFeeBps` so there is exactly one source.

- [ ] **Step 8: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/fee-invariants.test.ts src/mocks/data/__tests__/rollup-invariants.test.ts -t "fees and revenue"`
Expected: the fee assertions PASS; the `revenueBySegment` / `feeSchedules` assertions still FAIL (Task 8).

- [ ] **Step 9: Commit**

```bash
git add src/lib/fees.ts src/lib/__tests__/fees.test.ts src/mocks/data/billing.ts \
  src/types/billing.ts src/mocks/handlers/__tests__/fee-invariants.test.ts src/features/growth
git commit -m "fix(fees): one asset-weighted effective fee at 76.4 bps

Removes the 100x unit error (0.85 'bps'), Billing's 88 bps unweighted mean, and the
hand-typed quarterly amounts. Closes C29, C30, D13, D14, D15, D16."
```

---

### Task 8: Revenue derived, and the Revenue Trend flatline

**Files:**
- Modify: `src/mocks/data/revenue.ts:1-113` (whole file)
- Test: `src/mocks/data/__tests__/rollup-invariants.test.ts` (Task 3)

**Interfaces:**
- Consumes: `householdFees` (Task 7); `households`; `MOCK_TODAY_ISO` (Task 1).
- Produces: `feeSchedules` (13 rows, one per household), `revenueMetrics`, `revenueTrend`
  (12 actual months + 3 projected, **no zero-revenue months**), `revenueBySegment`.

Findings closed: the Revenue Trend flatline (`revenue.ts:102-103`, `critique-ux.md` §1.1);
the missing 13th household in `feeSchedules`; the `avgRevenuePerHousehold` divide-by-12 bug.

- [ ] **Step 1: Confirm the failure**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "one fee schedule per household"`
Expected: FAIL — `feeSchedules` has 12 entries and omits `hh-013`.

- [ ] **Step 2: Rewrite the fixture as a derivation**

Replace the whole of `src/mocks/data/revenue.ts`:

```ts
import type { FeeSchedule, BillingRecord, RevenueMetrics, RevenueTrend, RevenueBySegment } from '@/types/revenue'
import { householdFees } from './billing'
import { households } from './households'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/**
 * Every figure here derives from `householdFees`, which derives from account balances.
 * The only leaf input is `PLANNING_REVENUE_ANNUAL` — flat-fee planning engagements that are not
 * AUM-based and therefore are not derivable from the book.
 */
const PLANNING_REVENUE_ANNUAL = 124_950

const segmentOf = new Map(households.map((h) => [h.id, h.segment]))

export const feeSchedules: FeeSchedule[] = householdFees.map((fee, i) => ({
  id: `fee-${String(i + 1).padStart(3, '0')}`,
  householdId: fee.householdId,
  householdName: fee.householdName,
  feeType: 'aum_based',
  rate: fee.annualRate,
  annualRevenue: fee.quarterlyAmount * 4,
  tier: segmentOf.get(fee.householdId)!,
}))

const advisoryRevenueAnnual = feeSchedules.reduce((s, f) => s + f.annualRevenue, 0)
const totalRecurringRevenue = advisoryRevenueAnnual + PLANNING_REVENUE_ANNUAL
const monthlyRunRate = totalRecurringRevenue / 12

// ── Billing records: 12 complete months ending the month before MOCK_TODAY ──
const ACTUAL_PERIODS = [
  '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07',
  '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01',
] as const
const PROJECTED_PERIODS = ['2026-02', '2026-03', '2026-04'] as const

function generateBillingRecords(): BillingRecord[] {
  const records: BillingRecord[] = []
  let recordId = 1
  for (const fee of feeSchedules) {
    const monthlyBase = fee.annualRevenue / 12
    for (const period of ACTUAL_PERIODS) {
      const seed = fee.householdId.charCodeAt(3) + period.charCodeAt(5)
      const variation = 1 + ((seed % 7) - 3) * 0.005
      records.push({
        id: `bill-${String(recordId).padStart(3, '0')}`,
        householdId: fee.householdId,
        period,
        amount: Math.round(monthlyBase * variation * 100) / 100,
        feeType: fee.feeType,
        status: period === '2026-01' && fee.householdId === 'hh-012' ? 'overdue' : 'collected',
      })
      recordId++
    }
  }
  return records
}

export const billingRecords: BillingRecord[] = generateBillingRecords()

export const revenueMetrics: RevenueMetrics = {
  totalRecurringRevenue,
  // MOCK_TODAY is 2026-02-25: February is 25/28 elapsed and therefore an estimate, not an actual.
  mtdRevenue: Math.round(monthlyRunRate * 25 / 28),
  ytdRevenue: Math.round(monthlyRunRate) + Math.round(monthlyRunRate * 25 / 28),
  avgRevenuePerHousehold: Math.round(totalRecurringRevenue / households.length),
  revenueGrowthYoY: 8.3,
  asOf: MOCK_TODAY_ISO,
}

/**
 * critique-ux §1.1 — the previous series wrote `revenue: 0` for 2026-04 and 2026-05, months that
 * were future when authored and are now past, so the headline revenue chart fell to zero and
 * flatlined. Actual months are complete months only; anything from the current month onward is a
 * projection with `revenue` omitted.
 */
export const revenueTrend: RevenueTrend[] = [
  ...ACTUAL_PERIODS.map((period, i) => ({
    period,
    revenue: Math.round(monthlyRunRate * (0.94 + 0.06 * i / (ACTUAL_PERIODS.length - 1))),
  })),
  ...PROJECTED_PERIODS.map((period, i) => ({
    period,
    projected: Math.round(monthlyRunRate * (1.005 + 0.005 * i)),
  })),
]

export const revenueBySegment: RevenueBySegment[] = (() => {
  const grouped = new Map<string, { revenue: number; clientCount: number }>()
  for (const fee of feeSchedules) {
    const seg = segmentOf.get(fee.householdId)!
    const entry = grouped.get(seg) ?? { revenue: 0, clientCount: 0 }
    entry.revenue += fee.annualRevenue
    entry.clientCount += 1
    grouped.set(seg, entry)
  }
  return [...grouped.entries()].map(([segment, d]) => ({
    segment: segment as RevenueBySegment['segment'],
    revenue: d.revenue,
    clientCount: d.clientCount,
  }))
})()
```

Add `asOf: string` to the `RevenueMetrics` type and make `RevenueTrend.revenue` optional
(`revenue?: number`) in `src/types/revenue.ts`.

- [ ] **Step 3: Assert the trend never falls to zero**

Append to `src/mocks/data/__tests__/rollup-invariants.test.ts` inside `fees and revenue`:

```ts
    it('the revenue trend has no zero-revenue month and no actual beyond the clock', () => {
      const { revenueTrend } = require('@/mocks/data/revenue') as typeof import('@/mocks/data/revenue')
      for (const point of revenueTrend) {
        expect(point.revenue === undefined || point.revenue > 0).toBe(true)
        if (point.revenue !== undefined) expect(point.period <= '2026-01').toBe(true)
        if (point.period >= '2026-02') expect(point.revenue).toBeUndefined()
      }
      expect(revenueTrend.filter((p) => p.revenue !== undefined)).toHaveLength(12)
      expect(revenueTrend.at(-1)!.projected).toBe(69_563)
      expect(revenueTrend.find((p) => p.period === '2026-01')!.revenue).toBe(68_535)
    })
```

(Use a static `import { revenueTrend } from '@/mocks/data/revenue'` at the top of the file rather than
`require`, to keep ESM-only; the inline form above is shown for locality.)

- [ ] **Step 4: Run**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "fees and revenue"`
Expected: all PASS. `totalRecurringRevenue` is `822_416`; `avgRevenuePerHousehold` is `63_263`;
`revenueBySegment` is platinum `413_627.12`/3, gold `233_488.85`/5, silver `46_550`/4, bronze `3_800`/1.

- [ ] **Step 5: Check the chart renders**

Run: `pnpm test:run 2>&1 | tail -5`, then `pnpm dev` and open `/growth/revenue`. The trend line must
rise monotonically from `$64,423` to `$68,535` and hand off to a dashed projection — no drop to zero.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/data/revenue.ts src/types/revenue.ts src/mocks/data/__tests__/rollup-invariants.test.ts
git commit -m "fix(revenue): derive revenue from the fee schedule; kill the trend flatline

Adds the missing 13th household, fixes avgRevenuePerHousehold (was /12), and replaces
the two zero-revenue future months that made the headline chart fall to \$0."
```

---

### Task 9: `src/lib/risk-model.ts` — risk that varies with the portfolio

**Files:**
- Create: `src/lib/risk-model.ts`
- Create: `src/lib/__tests__/risk-model.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  ```ts
  export type AssetClassRisk = { beta: number; vol: number; return1Y: number }
  export const ASSET_CLASS_RISK: Record<string, AssetClassRisk>
  export const RISK_FREE_RATE: 0.04
  export const CROSS_CLASS_CORRELATION: 0.35
  export const Z_95: 1.645

  export function assetClassWeights(positions: readonly { assetClass: string; weight: number }[]): Map<string, number>
  export function portfolioBeta(weights: ReadonlyMap<string, number>): number
  export function portfolioVolatility(weights: ReadonlyMap<string, number>): number
  export function portfolioReturn1Y(weights: ReadonlyMap<string, number>): number
  export function trackingError(portfolio: ReadonlyMap<string, number>, benchmark: ReadonlyMap<string, number>): number
  export function parametricVaR(value: number, annualVol: number, horizonMonths?: number, z?: number): number
  export function sharpe(return1Y: number, vol: number): number
  export function sortino(return1Y: number, downsideDeviation: number): number
  export function downsideDeviation(vol: number): number
  export function modelledMaxDrawdown(vol: number): number
  ```

Findings closed: **C4** (Sharpe ~2× the value implied by the app's own return and σ), **C5** (VaR
constant across every account, unlabelled), **C6** (excess return mislabelled "alpha"; tracking error
reported per horizon).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/risk-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  ASSET_CLASS_RISK, RISK_FREE_RATE, Z_95,
  assetClassWeights, portfolioBeta, portfolioVolatility, portfolioReturn1Y,
  trackingError, parametricVaR, sharpe, sortino, downsideDeviation, modelledMaxDrawdown,
} from '@/lib/risk-model'

// A 60/40-ish book: acc-001's actual asset-class mix.
const ACC_001 = [
  { assetClass: 'us_equity', weight: 0.470 },
  { assetClass: 'intl_equity', weight: 0.065 },
  { assetClass: 'emerging_markets', weight: 0.023 },
  { assetClass: 'fixed_income', weight: 0.280 },
  { assetClass: 'commodities', weight: 0.039 },
  { assetClass: 'real_estate', weight: 0.041 },
  { assetClass: 'cash', weight: 0.081 },
]

describe('assetClassWeights', () => {
  it('normalises so weights always sum to exactly 1', () => {
    // acc-045's fixture weights sum to 0.925 — D4.
    const w = assetClassWeights([
      { assetClass: 'digital_assets', weight: 0.700 },
      { assetClass: 'cash', weight: 0.225 },
    ])
    expect([...w.values()].reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12)
    expect(w.get('digital_assets')).toBeCloseTo(0.7 / 0.925, 12)
  })

  it('merges duplicate asset classes', () => {
    const w = assetClassWeights([
      { assetClass: 'us_equity', weight: 0.3 },
      { assetClass: 'us_equity', weight: 0.2 },
      { assetClass: 'cash', weight: 0.5 },
    ])
    expect(w.size).toBe(2)
    expect(w.get('us_equity')).toBeCloseTo(0.5, 12)
  })
})

describe('portfolio statistics', () => {
  const w = assetClassWeights(ACC_001)

  it('beta is the weighted average of asset-class betas', () => {
    expect(portfolioBeta(w)).toBeCloseTo(0.64, 2)
  })

  it('volatility accounts for imperfect correlation, so it is below the weighted average of vols', () => {
    const weightedAvgVol = [...w.entries()].reduce((s, [ac, x]) => s + x * ASSET_CLASS_RISK[ac]!.vol, 0)
    expect(portfolioVolatility(w)).toBeCloseTo(0.0935, 4)
    expect(portfolioVolatility(w)).toBeLessThan(weightedAvgVol)
  })

  it('a single-asset-class portfolio has exactly that class volatility', () => {
    const single = assetClassWeights([{ assetClass: 'us_equity', weight: 1 }])
    expect(portfolioVolatility(single)).toBeCloseTo(ASSET_CLASS_RISK.us_equity!.vol, 12)
  })

  it('trailing 1Y return is the weighted average of asset-class returns', () => {
    expect(portfolioReturn1Y(w)).toBeCloseTo(0.0985, 4)
  })
})

describe('parametricVaR', () => {
  it('C5: scales with portfolio value — a $100K IRA and a $12M trust cannot share a VaR', () => {
    const vol = 0.0935
    expect(parametricVaR(100_000, vol)).toBeCloseTo(4_435, 0)
    expect(parametricVaR(12_000_000, vol)).toBeCloseTo(532_246, 0)
    expect(parametricVaR(12_000_000, vol) / parametricVaR(100_000, vol)).toBeCloseTo(120, 6)
  })

  it('is z95 x monthly sigma x value at the default 1-month horizon', () => {
    expect(parametricVaR(1_000_000, 0.12))
      .toBeCloseTo(1_000_000 * Z_95 * 0.12 / Math.sqrt(12), 6)
  })

  it('scales with the square root of the horizon', () => {
    expect(parametricVaR(1_000_000, 0.12, 12) / parametricVaR(1_000_000, 0.12, 1))
      .toBeCloseTo(Math.sqrt(12), 9)
  })
})

describe('sharpe and sortino', () => {
  it('C4: the app reported 1.34 against its own 12.4% return and 11.8% sigma; the identity gives 0.71', () => {
    expect(sharpe(0.124, 0.118)).toBeCloseTo(0.7119, 4)
    expect(RISK_FREE_RATE).toBe(0.04)
  })

  it('sortino exceeds sharpe because downside deviation is below total volatility', () => {
    expect(downsideDeviation(0.0935)).toBeCloseTo(0.06545, 5)
    expect(sortino(0.0985, downsideDeviation(0.0935)))
      .toBeGreaterThan(sharpe(0.0985, 0.0935))
  })

  it('modelled max drawdown is negative and scales with volatility', () => {
    expect(modelledMaxDrawdown(0.118)).toBeCloseTo(-0.1416, 4)
    expect(modelledMaxDrawdown(0.636)).toBeLessThan(modelledMaxDrawdown(0.061))
  })
})

describe('trackingError', () => {
  it('is zero when the portfolio matches its benchmark exactly', () => {
    const w = assetClassWeights([{ assetClass: 'us_equity', weight: 0.6 }, { assetClass: 'fixed_income', weight: 0.4 }])
    expect(trackingError(w, w)).toBeCloseTo(0, 12)
  })

  it('C6: is one annualised statistic, and it grows with active weight', () => {
    const bench = assetClassWeights([{ assetClass: 'us_equity', weight: 0.6 }, { assetClass: 'fixed_income', weight: 0.4 }])
    const near = assetClassWeights([{ assetClass: 'us_equity', weight: 0.65 }, { assetClass: 'fixed_income', weight: 0.35 }])
    const far = assetClassWeights([{ assetClass: 'us_equity', weight: 0.95 }, { assetClass: 'fixed_income', weight: 0.05 }])
    expect(trackingError(far, bench)).toBeGreaterThan(trackingError(near, bench))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/risk-model.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/risk-model"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/risk-model.ts`:

```ts
/**
 * A small, disclosed, per-account risk model.
 *
 * C5 · forward-risk / historical-risk — every account previously returned the same
 * `var95: 485_000`, which renders as a 485% loss on a $100K account and is unlabelled on an $8.2M
 * one. VaR must scale with portfolio value and carry a horizon, a confidence level and a method.
 * C4 · performance-metrics — the reported Sharpe of 1.34 implied a ~19.8% return against the same
 * API's 12.4%; SR = (Rp − Rf)/σp computed from the same series gives 0.71.
 * C6 · performance-metrics / performance-reporting — tracking error is one annualised statistic,
 * not a different number per horizon, and R_p − R_b is *active return*, not Jensen's alpha.
 *
 * Assumptions are constants here so they can be rendered as disclosure text next to the numbers.
 */
export type AssetClassRisk = {
  /** Sensitivity to the global equity market. */
  beta: number
  /** Annualised standard deviation of returns. */
  vol: number
  /** Trailing one-year realised total return. */
  return1Y: number
}

export const ASSET_CLASS_RISK: Record<string, AssetClassRisk> = {
  us_equity:        { beta: 1.00, vol: 0.155, return1Y: 0.145 },
  intl_equity:      { beta: 0.88, vol: 0.170, return1Y: 0.098 },
  emerging_markets: { beta: 1.15, vol: 0.220, return1Y: 0.082 },
  fixed_income:     { beta: 0.15, vol: 0.055, return1Y: 0.042 },
  alternatives:     { beta: 0.45, vol: 0.090, return1Y: 0.061 },
  real_estate:      { beta: 0.80, vol: 0.175, return1Y: 0.071 },
  commodities:      { beta: 0.35, vol: 0.180, return1Y: 0.088 },
  cash:             { beta: 0.00, vol: 0.005, return1Y: 0.048 },
  digital_assets:   { beta: 1.60, vol: 0.650, return1Y: 0.412 },
  private_equity:   { beta: 1.20, vol: 0.230, return1Y: 0.112 },
}

const FALLBACK: AssetClassRisk = { beta: 1.00, vol: 0.150, return1Y: 0.080 }

export const RISK_FREE_RATE = 0.04 as const
export const CROSS_CLASS_CORRELATION = 0.35 as const
export const Z_95 = 1.645 as const
/** Downside deviation as a fraction of total volatility, under a symmetric-return assumption. */
const DOWNSIDE_FRACTION = 0.70
/** Modelled trailing-3-year maximum drawdown as a multiple of annualised volatility. */
const MAX_DRAWDOWN_MULTIPLE = 1.2

function risk(assetClass: string): AssetClassRisk {
  return ASSET_CLASS_RISK[assetClass] ?? FALLBACK
}

/** Collapse positions to normalised asset-class weights that always sum to 1. */
export function assetClassWeights(
  positions: readonly { assetClass: string; weight: number }[],
): Map<string, number> {
  const total = positions.reduce((s, p) => s + p.weight, 0)
  const weights = new Map<string, number>()
  if (total === 0) return weights
  for (const p of positions) {
    weights.set(p.assetClass, (weights.get(p.assetClass) ?? 0) + p.weight / total)
  }
  return weights
}

export function portfolioBeta(weights: ReadonlyMap<string, number>): number {
  let beta = 0
  for (const [ac, w] of weights) beta += w * risk(ac).beta
  return beta
}

export function portfolioReturn1Y(weights: ReadonlyMap<string, number>): number {
  let r = 0
  for (const [ac, w] of weights) r += w * risk(ac).return1Y
  return r
}

/** σp = √(ΣᵢΣⱼ wᵢwⱼσᵢσⱼρᵢⱼ), with ρ = 1 within an asset class and 0.35 across. */
export function portfolioVolatility(weights: ReadonlyMap<string, number>): number {
  const entries = [...weights.entries()]
  let variance = 0
  for (const [ai, wi] of entries) {
    for (const [aj, wj] of entries) {
      const rho = ai === aj ? 1 : CROSS_CLASS_CORRELATION
      variance += wi * wj * risk(ai).vol * risk(aj).vol * rho
    }
  }
  return Math.sqrt(Math.max(variance, 0))
}

/** Annualised active risk against a benchmark's asset-class weights. */
export function trackingError(
  portfolio: ReadonlyMap<string, number>,
  benchmark: ReadonlyMap<string, number>,
): number {
  const classes = new Set([...portfolio.keys(), ...benchmark.keys()])
  const active = [...classes].map((ac) =>
    [ac, (portfolio.get(ac) ?? 0) - (benchmark.get(ac) ?? 0)] as const,
  )
  let variance = 0
  for (const [ai, wi] of active) {
    for (const [aj, wj] of active) {
      const rho = ai === aj ? 1 : CROSS_CLASS_CORRELATION
      variance += wi * wj * risk(ai).vol * risk(aj).vol * rho
    }
  }
  return Math.sqrt(Math.max(variance, 0))
}

/** Parametric (variance-covariance) VaR. Positive number = expected loss. */
export function parametricVaR(
  value: number,
  annualVol: number,
  horizonMonths = 1,
  z: number = Z_95,
): number {
  return value * z * annualVol * Math.sqrt(horizonMonths / 12)
}

export function sharpe(return1Y: number, vol: number): number {
  return vol === 0 ? 0 : (return1Y - RISK_FREE_RATE) / vol
}

export function downsideDeviation(vol: number): number {
  return vol * DOWNSIDE_FRACTION
}

export function sortino(return1Y: number, dd: number): number {
  return dd === 0 ? 0 : (return1Y - RISK_FREE_RATE) / dd
}

export function modelledMaxDrawdown(vol: number): number {
  return -MAX_DRAWDOWN_MULTIPLE * vol
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/risk-model.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk-model.ts src/lib/__tests__/risk-model.test.ts
git commit -m "feat(lib): per-portfolio risk model with disclosed assumptions

Groundwork for C4, C5, C6."
```

---

### Task 10: Wire per-account risk into the API and label it on screen

**Files:**
- Modify: `src/types/risk.ts`
- Modify: `src/mocks/handlers/pms.ts:49-67,243-259,288-311,313-408`
- Modify: `src/features/portfolios/RiskAnalyticsPage.tsx:119-135`
- Create: `src/mocks/handlers/__tests__/risk-invariants.test.ts`

**Interfaces:**
- Consumes: everything from `@/lib/risk-model` (Task 9); `getPositionsForAccount`; `MODELS`; `accountValueUSD` (Task 2).
- Produces:
  ```ts
  // src/types/risk.ts — RiskMetrics gains:
  //   var95Percent: number        // VaR as a fraction of portfolio value
  //   var95Horizon: '1 month'
  //   var95Confidence: 0.95
  //   var95Method: 'parametric'
  //   downsideDeviation: number
  //   riskFreeRate: number
  //   benchmark: string
  //   trackingError: number
  //   asOf: string
  // BenchmarkComparison: `alpha` renamed to `activeReturn`; `trackingError` moves to RiskMetrics.
  ```

Findings closed: **C4**, **C5**, **C6**, **C7** (Monte Carlo drawn from one distribution),
**C8** (AGG rallied in 2008), **C9** (stress reconciles to holdings), **C34** (performance series
consistent with the stated σ), **C36** (FX applied to the account value used by risk).

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/risk-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getRiskMetrics, getBenchmarkComparison, getStressScenarios, getSensitivity } from '@/services/pms'
import { RISK_FREE_RATE, Z_95 } from '@/lib/risk-model'

describe('risk metrics are per account', () => {
  it('C5: VaR scales with the account — Taylor $100K vs Chen Trust $12M', async () => {
    const taylor = await getRiskMetrics('acc-040')
    const chen = await getRiskMetrics('acc-006')
    expect(taylor.var95).toBe(4_435)
    expect(chen.var95).toBe(515_140)
    expect(chen.var95 / taylor.var95).toBeGreaterThan(100)
  })

  it('C5: VaR carries a horizon, a confidence level, a method and a percent-of-value', async () => {
    const risk = await getRiskMetrics('acc-001')
    expect(risk.var95Horizon).toBe('1 month')
    expect(risk.var95Confidence).toBe(0.95)
    expect(risk.var95Method).toBe('parametric')
    expect(risk.var95Percent).toBeCloseTo(0.0444, 4)
    expect(risk.var95).toBe(364_083)
  })

  it('C5: VaR never exceeds the account value', async () => {
    for (const id of ['acc-001', 'acc-006', 'acc-011', 'acc-020', 'acc-040', 'acc-045']) {
      const risk = await getRiskMetrics(id)
      expect(risk.var95Percent).toBeLessThan(1)
    }
  })

  it('C4: sharpe === (portfolio 1Y return − risk-free) ÷ σ, using the same series the app shows', async () => {
    const risk = await getRiskMetrics('acc-001')
    const bench = await getBenchmarkComparison('acc-001')
    const oneYear = bench.find((b) => b.period === '1y')!
    expect(risk.riskFreeRate).toBe(RISK_FREE_RATE)
    expect(risk.sharpe).toBeCloseTo(
      (oneYear.portfolioReturn - RISK_FREE_RATE) / risk.standardDeviation, 2,
    )
    expect(risk.sharpe).toBe(0.63)
    expect(risk.standardDeviation).toBe(0.0935)
    expect(risk.beta).toBe(0.64)
  })

  it('risk differs between a bond-heavy IRA and a crypto account', async () => {
    const thompsonIRA = await getRiskMetrics('acc-020')
    const crypto = await getRiskMetrics('acc-045')
    expect(thompsonIRA.standardDeviation).toBe(0.061)
    expect(crypto.standardDeviation).toBe(0.636)
    expect(crypto.beta).toBeGreaterThan(thompsonIRA.beta * 3)
  })

  it('C6: the benchmark table reports active return and names its benchmark; TE is one number', async () => {
    const bench = await getBenchmarkComparison('acc-001')
    const risk = await getRiskMetrics('acc-001')
    for (const row of bench) {
      expect(row.activeReturn).toBeCloseTo(row.portfolioReturn - row.benchmarkReturn, 6)
      expect(row).not.toHaveProperty('alpha')
      expect(row).not.toHaveProperty('trackingError')
    }
    expect(risk.benchmark).toBe('S&P 500 / Agg 60/40')
    expect(risk.trackingError).toBeCloseTo(0.0126, 4)
  })
})

describe('stress scenarios reconcile to holdings', () => {
  it('C9: Σ position impact === portfolioImpact × account value', async () => {
    const scenarios = await getStressScenarios('acc-001')
    for (const s of scenarios) {
      const summed = s.positionImpacts.reduce((acc, p) => acc + p.impact, 0)
      const headline = s.portfolioImpact * s.positionImpacts.reduce((acc, p) => acc + p.currentValue, 0)
      expect(summed).toBeCloseTo(headline, 0)
    }
  })

  it('C8: core aggregate bonds rallied Sep-08 to Mar-09, so AGG impact is positive', async () => {
    const scenarios = await getStressScenarios('acc-001')
    const crisis = scenarios.find((s) => s.id === 'stress-001')!
    const agg = crisis.positionImpacts.find((p) => p.symbol === 'AGG')!
    expect(agg.impactPercent).toBeGreaterThan(0)
    expect(crisis.portfolioImpact).toBeCloseTo(-0.2774, 3)
  })

  it('C9: a crypto-only account is not shown VTI, AGG and GLD rows', async () => {
    const scenarios = await getStressScenarios('acc-045')
    const symbols = scenarios[0]!.positionImpacts.map((p) => p.symbol)
    expect(symbols).not.toContain('VTI')
    expect(symbols).not.toContain('AGG')
  })
})

describe('monte carlo', () => {
  it('C7: percentiles and histogram come from the same distribution', async () => {
    const { monteCarlo } = await getSensitivity('acc-001')
    expect(monteCarlo.expectedReturn).toBeCloseTo(0.0985, 4)
    expect(monteCarlo.volatility).toBeCloseTo(0.0935, 4)
    // p5 = exp of (mu + z5*sigma) applied to the account value; recover sigma from p5 and p95
    const p5 = monteCarlo.percentiles.find((p) => p.percentile === 5)!.value
    const p95 = monteCarlo.percentiles.find((p) => p.percentile === 95)!.value
    const impliedSigma = ((p95 - p5) / (2 * Z_95)) / monteCarlo.baseValue
    expect(impliedSigma).toBeCloseTo(monteCarlo.volatility, 3)
  })

  it('C7: does not claim 10,000 simulations for a closed-form curve', async () => {
    const { monteCarlo } = await getSensitivity('acc-001')
    expect(monteCarlo.method).toBe('closed-form lognormal')
    expect(monteCarlo).not.toHaveProperty('simulations')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/risk-invariants.test.ts`
Expected: FAIL — the first assertion reports `expected 485000 to be 4435`.

- [ ] **Step 3: Extend the types**

In `src/types/risk.ts`, replace `RiskMetrics`:

```ts
type RiskMetrics = {
  /** Portfolio sensitivity to the global equity market (1.0 = market). */
  beta: number;
  /** (R₁ᵧ − risk-free) ÷ σ, from the same return series the performance tab shows. */
  sharpe: number;
  /** (R₁ᵧ − risk-free) ÷ downside deviation. */
  sortino: number;
  /** Modelled trailing-3-year peak-to-trough decline. */
  maxDrawdown: Percentage;
  /** Annualised standard deviation of returns. */
  standardDeviation: Percentage;
  downsideDeviation: Percentage;
  riskFreeRate: Percentage;
  /** Estimated loss not exceeded with `var95Confidence` probability over `var95Horizon`. */
  var95: Currency;
  var95Percent: Percentage;
  var95Horizon: string;
  var95Confidence: number;
  var95Method: 'parametric' | 'historical' | 'monte_carlo';
  /** Name of the benchmark that beta and tracking error are measured against. */
  benchmark: string;
  /** One annualised active-risk statistic, not a per-horizon value. */
  trackingError: Percentage;
  asOf: string;
};
```

In `src/types/performance.ts`, rename `BenchmarkComparison.alpha` to `activeReturn` and delete
`trackingError` from it. Update the two consuming components found by
`grep -rn "\.alpha\b\|trackingError" src/features src/components`.

- [ ] **Step 4: Derive risk in the handler**

In `src/mocks/handlers/pms.ts`, add the imports and a shared helper, then replace the risk,
benchmark, performance, stress and sensitivity handlers:

```ts
import {
  ASSET_CLASS_RISK, RISK_FREE_RATE, Z_95, assetClassWeights, portfolioBeta, portfolioVolatility,
  portfolioReturn1Y, trackingError, parametricVaR, sharpe, sortino, downsideDeviation,
  modelledMaxDrawdown,
} from '@/lib/risk-model'
import { accountValueUSD } from '@/lib/aum'
import { MOCK_NOW_ISO, startOfToday } from '@/lib/clock'

/** C36 · currencies-and-fx — risk and sensitivity read a USD value, not the raw local-currency one. */
function accountUSD(account: typeof accounts[0]): number {
  return accountValueUSD(account, FX_RATES_USD_BASE)
}

function riskProfileFor(account: typeof accounts[0]) {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const weights = assetClassWeights(positions)
  const model = MODELS.find((m) => m.id === account.modelId) ?? getModelByIndex(0)
  const benchWeights = new Map(model.assetClasses.map((a) => [a.assetClass, a.targetWeight]))
  const vol = roundTo(portfolioVolatility(weights), 4)
  const ret = roundTo(portfolioReturn1Y(weights), 4)
  return {
    weights,
    benchWeights,
    benchmarkName: model.benchmark,
    value: accountUSD(account),
    beta: roundTo(portfolioBeta(weights), 2),
    vol,
    ret,
    benchReturn: roundTo(portfolioReturn1Y(benchWeights), 4),
    te: roundTo(trackingError(weights, benchWeights), 4),
  }
}
```

Replace the risk handler (lines 288–298):

```ts
  http.get('/api/pms/accounts/:accountId/risk', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const p = riskProfileFor(account)
    const dd = roundTo(downsideDeviation(p.vol), 4)
    const var95 = Math.round(parametricVaR(p.value, p.vol))

    const metrics: RiskMetrics = {
      beta: p.beta,
      sharpe: roundTo(sharpe(p.ret, p.vol), 2),
      sortino: roundTo(sortino(p.ret, dd), 2),
      maxDrawdown: roundTo(modelledMaxDrawdown(p.vol), 3),
      standardDeviation: p.vol,
      downsideDeviation: dd,
      riskFreeRate: RISK_FREE_RATE,
      var95,
      var95Percent: roundTo(var95 / p.value, 4),
      var95Horizon: '1 month',
      var95Confidence: 0.95,
      var95Method: 'parametric',
      benchmark: p.benchmarkName,
      trackingError: p.te,
      asOf: MOCK_NOW_ISO,
    }
    return HttpResponse.json(metrics)
  }),
```

Replace the benchmark handler (lines 248–259) so the periods scale one derived pair of returns
rather than being a constant table:

```ts
  http.get('/api/pms/accounts/:accountId/benchmark', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const p = riskProfileFor(account)

    // Period scaling of an annual figure. Sub-annual rows are the compounded fraction of the
    // one-year return, not an arbitrary multiplier.
    const YEARS: Record<string, number> = {
      mtd: 1 / 12, qtd: 0.25, ytd: 2 / 12, '1y': 1, '3y': 3, '5y': 5, inception: 7.2,
    }
    const compound = (annual: number, years: number) =>
      roundTo(years >= 1 ? (1 + annual) ** years - 1 : (1 + annual) ** years - 1, 4)

    const comparisons: BenchmarkComparison[] = Object.entries(YEARS).map(([period, years]) => {
      const portfolioReturn = compound(p.ret, years)
      const benchmarkReturn = compound(p.benchReturn, years)
      return {
        period: period as BenchmarkComparison['period'],
        portfolioReturn,
        benchmarkReturn,
        // C6 · performance-reporting — this is active (excess) return, not Jensen's alpha.
        activeReturn: roundTo(portfolioReturn - benchmarkReturn, 4),
      }
    })
    return HttpResponse.json(comparisons)
  }),
```

Replace `generatePerformanceSeries` (lines 49–67) so the monthly series is drawn from the account's
own σ — **C34**, which noted the previous uniform `[−2%, +4%]` draw could not produce the stated
−14.2% drawdown:

```ts
/** Box–Muller from a seeded uniform stream, so the series is deterministic per account. */
function seededNormal(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function generatePerformanceSeries(
  months: number, accountId: string, annualReturn: number, annualVol: number,
): PerformanceSeries[] {
  const rand = createSeededRandom(hashSeed(accountId))
  const series: PerformanceSeries[] = []
  const muM = annualReturn / 12
  const sigmaM = annualVol / Math.sqrt(12)
  let portfolioValue = 100
  let benchmarkValue = 100
  const anchor = startOfToday()
  for (let i = months; i >= 0; i--) {
    const date = new Date(anchor)
    date.setMonth(date.getMonth() - i)
    portfolioValue *= 1 + muM + sigmaM * seededNormal(rand)
    benchmarkValue *= 1 + muM * 0.92 + sigmaM * 0.95 * seededNormal(rand)
    series.push({
      date: date.toISOString().slice(0, 10),
      value: roundTo(portfolioValue, 2),
      benchmark: roundTo(benchmarkValue, 2),
    })
  }
  return series
}
```

and update its call site (line 245):

```ts
  http.get('/api/pms/accounts/:accountId/performance', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const p = riskProfileFor(account)
    return HttpResponse.json(generatePerformanceSeries(24, account.id, p.ret, p.vol))
  }),
```

Replace the stress handler (lines 313–352) so impacts come from actual holdings — **C8**, **C9**:

```ts
/**
 * C8 · historical-risk — the Bloomberg Aggregate was flat-to-positive Sep-08 → Mar-09; the
 * flight-to-quality Treasury rally is the single most famous fixed-income fact about 2008.
 * C9 · historical-risk — impacts are computed from the account's own holdings, so the position
 * rows reconcile to the headline by construction.
 */
const STRESS_FACTORS: { id: string; name: string; description: string; factors: Record<string, number> }[] = [
  {
    id: 'stress-001', name: '2008 financial crisis',
    description: 'Replay of September 2008 – March 2009 factor returns',
    factors: { us_equity: -0.45, intl_equity: -0.50, emerging_markets: -0.55, fixed_income: 0.03, alternatives: -0.20, real_estate: -0.42, commodities: -0.30, cash: 0.00, digital_assets: -0.60, private_equity: -0.35 },
  },
  {
    id: 'stress-002', name: 'Rising rate shock (+300bp)',
    description: 'Parallel 300 basis-point increase in the yield curve',
    factors: { us_equity: -0.10, intl_equity: -0.09, emerging_markets: -0.12, fixed_income: -0.18, alternatives: -0.04, real_estate: -0.22, commodities: -0.03, cash: 0.01, digital_assets: -0.15, private_equity: -0.14 },
  },
  {
    id: 'stress-003', name: 'Pandemic selloff (March 2020)',
    description: 'Replay of February – March 2020 factor returns',
    factors: { us_equity: -0.34, intl_equity: -0.33, emerging_markets: -0.31, fixed_income: -0.03, alternatives: -0.12, real_estate: -0.40, commodities: -0.25, cash: 0.00, digital_assets: -0.50, private_equity: -0.28 },
  },
]

  http.get('/api/pms/accounts/:accountId/stress', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const positions = getPositionsForAccount(account.id, account.totalValue)
    const totalWeight = positions.reduce((s, p) => s + p.weight, 0)

    const scenarios: StressScenario[] = STRESS_FACTORS.map((scenario) => {
      const positionImpacts = positions
        .filter((p) => p.assetClass !== 'cash')
        .map((p) => {
          const impactPct = scenario.factors[p.assetClass] ?? 0
          return {
            positionId: p.id,
            symbol: p.symbol,
            name: p.name,
            currentValue: p.marketValue,
            projectedValue: p.marketValue * (1 + impactPct),
            impact: p.marketValue * impactPct,
            impactPercent: impactPct,
          }
        })
      const covered = positionImpacts.reduce((s, p) => s + p.currentValue, 0)
      const portfolioImpact = covered === 0 ? 0
        : roundTo(positionImpacts.reduce((s, p) => s + p.impact, 0) / covered, 4)
      return { ...scenario, portfolioImpact, positionImpacts }
    })
    // totalWeight is retained for the disclosure caption in RiskAnalyticsPage.
    void totalWeight
    return HttpResponse.json(scenarios)
  }),
```

Replace the Monte Carlo block inside the sensitivity handler (lines 381–406) — **C7**:

```ts
      monteCarlo: (() => {
        const p = riskProfileFor(account)
        const mu = p.ret
        const sigma = p.vol
        const value = p.value
        const zFor = (pct: number) => {
          // Acklam's inverse normal CDF, accurate to ~1e-9 over (0,1).
          const q = pct / 100
          const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
          const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
          const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
          const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
          const pLow = 0.02425
          if (q < pLow) {
            const u = Math.sqrt(-2 * Math.log(q))
            return (((((c[0]! * u + c[1]!) * u + c[2]!) * u + c[3]!) * u + c[4]!) * u + c[5]!) /
              ((((d[0]! * u + d[1]!) * u + d[2]!) * u + d[3]!) * u + 1)
          }
          if (q > 1 - pLow) return -zFor(100 - pct)
          const u = q - 0.5
          const r = u * u
          return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * u /
            (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
        }
        const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99].map((pct) => ({
          percentile: pct,
          value: roundTo(value * (1 + mu + sigma * zFor(pct)), 2),
        }))
        const histogram = Array.from({ length: 30 }, (_, i) => {
          const returnBucket = roundTo(mu - 3 * sigma + i * (6 * sigma / 29), 4)
          const density = Math.exp(-0.5 * ((returnBucket - mu) / sigma) ** 2)
          return { returnBucket, frequency: Math.round(density * 1000) }
        })
        return {
          // C7 · forward-risk — one distribution drives both the table and the chart, and the
          // method is stated rather than asserting 10,000 simulations that never ran.
          method: 'closed-form lognormal' as const,
          horizon: '1Y',
          expectedReturn: mu,
          volatility: sigma,
          baseValue: value,
          percentiles,
          histogram,
        }
      })(),
```

Change `getAccountValueById` (line 139) to return the USD value so the sensitivity ladders inherit
the FX fix (**C36**):

```ts
function getAccountValueById(accountId: string | readonly string[] | undefined): number {
  const account = findAccount(accountId)
  return account ? accountUSD(account) : 1_000_000
}
```

Update `MonteCarloResult` in `src/services/pms.ts:53-58` to match the new shape.

- [ ] **Step 5: Label the numbers on screen**

In `src/features/portfolios/RiskAnalyticsPage.tsx`, replace the metrics grid (lines 125–135):

```tsx
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <RiskMetricCard label={`Beta vs ${risk.benchmark}`} value={risk.beta.toFixed(2)} />
          <RiskMetricCard label="Sharpe ratio" value={risk.sharpe.toFixed(2)} />
          <RiskMetricCard label="Sortino ratio" value={risk.sortino.toFixed(2)} />
          <RiskMetricCard label="Max drawdown (modelled, 3y)" value={`${(risk.maxDrawdown * 100).toFixed(1)}%`} negative />
          <RiskMetricCard label="Standard deviation (annualised)" value={`${(risk.standardDeviation * 100).toFixed(1)}%`} />
          <RiskMetricCard
            label="Value at risk"
            value={formatWithConversion(risk.var95, 'USD', { compact: true })}
            negative
          />
        </div>
        <p className="text-caption text-text-tertiary">
          Value at risk is an estimate: {(risk.var95Confidence * 100).toFixed(0)}% confidence,
          {' '}{risk.var95Horizon} horizon, {risk.var95Method} method
          {' '}({(risk.var95Percent * 100).toFixed(2)}% of account value). Sharpe uses a
          {' '}{(risk.riskFreeRate * 100).toFixed(1)}% risk-free rate. Tracking error against
          {' '}{risk.benchmark} is {(risk.trackingError * 100).toFixed(2)}%. As of{' '}
          {formatDate(risk.asOf)}. Hypothetical — not a prediction.
        </p>
```

Also change the account selector at `:113` to show the USD-converted value, so the HKD account no
longer reads "$12.5M":

```tsx
              {acc.name} ({formatWithConversion(accountValueUSD(acc, FX_RATES_USD_BASE), 'USD', { compact: true })})
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/mocks/handlers/__tests__/risk-invariants.test.ts`
Expected: PASS — 11 tests. If `var95` differs by ±1 from `4_435` / `364_083` / `515_140`, the
rounding order differs from the reference computation: round σ to 4dp **before** computing VaR.

Run: `pnpm vitest run src/mocks/handlers/__tests__/performance-invariants.test.ts`
Expected: the existing file may assert the old constant benchmark table; update its expectations
to the derived per-account values in the same commit.

- [ ] **Step 7: Commit**

```bash
git add src/types/risk.ts src/types/performance.ts src/mocks/handlers/pms.ts \
  src/services/pms.ts src/features/portfolios/RiskAnalyticsPage.tsx \
  src/mocks/handlers/__tests__/risk-invariants.test.ts \
  src/mocks/handlers/__tests__/performance-invariants.test.ts
git commit -m "fix(risk): per-account risk, labelled VaR, reconciling stress

VaR on Nancy Taylor's \$100K IRA is \$4,435; on the \$12M Chen Trust it is \$515,140.
Both were \$485,000. Sharpe drops from 1.34 to 0.63, matching the app's own return
and sigma. Closes C4, C5, C6, C7, C8, C9, C34, C36."
```

---

### Task 11: Concentration with fund look-through

**Files:**
- Create: `src/lib/security-master.ts`
- Create: `src/lib/__tests__/security-master.test.ts`
- Modify: `src/types/portfolio.ts` (`ConcentrationMetric`)
- Modify: `src/mocks/handlers/pms.ts:410-442`
- Modify: `src/services/pms.ts:67-88`
- Modify: `src/features/portfolios/ConcentrationView.tsx:56-80`
- Modify: `src/mocks/handlers/__tests__/concentration-invariants.test.ts`

**Interfaces:**
- Consumes: `herfindahlIndex`, `effectiveN` (Task 2).
- Produces:
  ```ts
  export type SecurityKind = 'single_name' | 'fund' | 'cash'
  export function securityKind(symbol: string, assetClass: string): SecurityKind
  export function concentrationLimitFor(kind: SecurityKind): number
  export const SINGLE_NAME_LIMIT: 0.10
  export const FUND_LIMIT: 0.35
  export const CASH_LIMIT: 0.15
  // ConcentrationMetric gains: kind: SecurityKind; limitBasis: string
  // ConcentrationSummary gains: singleNameHHI, effectiveN, largestSingleName
  ```

Finding closed: **C23** — the 10% single-*name* limit was applied to broad index ETFs, so `acc-001`
reported VTI at 27.8% and AGG at 14.4% as IPS breaches while NVDA at 13.9% in `acc-011` sat
undifferentiated.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/security-master.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { securityKind, concentrationLimitFor, SINGLE_NAME_LIMIT, FUND_LIMIT, CASH_LIMIT } from '@/lib/security-master'

describe('securityKind', () => {
  it.each(['VTI', 'SPY', 'QQQ', 'AGG', 'BND', 'TLT', 'TIP', 'EFA', 'VWO', 'VXUS', 'BNDX', 'LQD', 'VCIT', 'GLD', 'VNQ', 'QAI', 'IBIT', 'ETHE', 'BXPE', 'VFIAX'])(
    '%s is a fund', (symbol) => {
      expect(securityKind(symbol, 'us_equity')).toBe('fund')
    },
  )

  it.each(['NVDA', 'AAPL', 'MSFT', 'INTC'])('%s is a single name', (symbol) => {
    expect(securityKind(symbol, 'us_equity')).toBe('single_name')
  })

  it('CASH is cash regardless of the symbol table', () => {
    expect(securityKind('CASH', 'cash')).toBe('cash')
  })

  it('treats an unknown symbol in a fund-only asset class as a fund', () => {
    expect(securityKind('ZZZZ', 'alternatives')).toBe('fund')
  })

  it('treats an unknown equity symbol as a single name — the conservative default', () => {
    expect(securityKind('ZZZZ', 'us_equity')).toBe('single_name')
  })
})

describe('concentrationLimitFor', () => {
  it('C23: applies 10% to single names, 35% to funds and 15% to cash', () => {
    expect(concentrationLimitFor('single_name')).toBe(SINGLE_NAME_LIMIT)
    expect(concentrationLimitFor('fund')).toBe(FUND_LIMIT)
    expect(concentrationLimitFor('cash')).toBe(CASH_LIMIT)
    expect(SINGLE_NAME_LIMIT).toBe(0.10)
    expect(FUND_LIMIT).toBe(0.35)
    expect(CASH_LIMIT).toBe(0.15)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/security-master.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/security-master"`.

- [ ] **Step 3: Write the security master**

Create `src/lib/security-master.ts`:

```ts
/**
 * C23 · diversification / investment-policy — a 10% single-*name* limit applied to broad index
 * ETFs made VTI (27.8%), SPY and AGG read as IPS breaches, which tells an advisor the tool does
 * not know what an ETF is. Single-issuer limits apply to individual securities; funds get a
 * separate, higher fund-level limit. NVDA at 13.9% in acc-011 is then the only breach in the
 * book — which is the genuine, and far more compelling, concentration story.
 */
export type SecurityKind = 'single_name' | 'fund' | 'cash'

/** Pooled vehicles held anywhere in the fixtures. */
const FUND_SYMBOLS = new Set([
  'VTI', 'SPY', 'QQQ', 'VOO', 'IVV', 'VXUS', 'VWO', 'EFA', 'IEFA',
  'AGG', 'BND', 'BNDX', 'TLT', 'TIP', 'LQD', 'VCIT', 'SCHZ', 'MUB',
  'GLD', 'SLV', 'VNQ', 'QAI', 'IBIT', 'ETHE', 'BXPE', 'SMH',
  'VFIAX', 'VTMGX', 'PRWCX', 'VWENX', 'PIMIX',
])

/** Asset classes that cannot hold a single issuer position in this dataset. */
const FUND_ONLY_CLASSES = new Set(['alternatives', 'real_estate', 'commodities', 'private_equity'])

export const SINGLE_NAME_LIMIT = 0.10 as const
export const FUND_LIMIT = 0.35 as const
export const CASH_LIMIT = 0.15 as const

export function securityKind(symbol: string, assetClass: string): SecurityKind {
  if (assetClass === 'cash' || symbol === 'CASH') return 'cash'
  if (FUND_SYMBOLS.has(symbol)) return 'fund'
  if (FUND_ONLY_CLASSES.has(assetClass)) return 'fund'
  return 'single_name'
}

export function concentrationLimitFor(kind: SecurityKind): number {
  switch (kind) {
    case 'cash': return CASH_LIMIT
    case 'fund': return FUND_LIMIT
    case 'single_name': return SINGLE_NAME_LIMIT
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/security-master.test.ts`
Expected: PASS — 26 tests.

- [ ] **Step 5: Rewrite the concentration handler**

Replace `src/mocks/handlers/pms.ts:410-442`:

```ts
  http.get('/api/pms/accounts/:accountId/concentration', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const positions = getPositionsForAccount(account.id, account.totalValue)

    const sorted = [...positions].sort((a, b) => b.weight - a.weight)
    const concentrationMetrics = sorted.map((pos) => {
      const kind = securityKind(pos.symbol, pos.assetClass)
      const limit = concentrationLimitFor(kind)
      return {
        positionId: pos.id,
        symbol: pos.symbol,
        name: pos.name,
        assetClass: pos.assetClass,
        marketValue: pos.marketValue,
        weight: pos.weight,
        kind,
        limit,
        limitBasis: kind === 'single_name' ? 'Single issuer (IPS)'
          : kind === 'fund' ? 'Pooled vehicle (IPS)'
          : 'Cash and equivalents (IPS)',
        breached: pos.weight > limit,
      }
    })

    const singleNames = concentrationMetrics.filter((c) => c.kind === 'single_name')
    const totalWeight = positions.reduce((s, p) => s + p.weight, 0) || 1
    const top10Weight = sorted.slice(0, 10).reduce((s, p) => s + p.weight, 0)

    return HttpResponse.json({
      positions: concentrationMetrics,
      summary: {
        top10Weight: roundTo(top10Weight, 3),
        // C22 · diversification — one HHI scale across the product (0–10,000), with effective N.
        herfindahlIndex: Math.round(herfindahlIndex(positions.map((p) => p.weight / totalWeight))),
        effectiveN: roundTo(effectiveN(herfindahlIndex(positions.map((p) => p.weight / totalWeight))), 1),
        singleNameWeight: roundTo(singleNames.reduce((s, c) => s + c.weight, 0), 3),
        largestSingleName: singleNames[0]
          ? { symbol: singleNames[0].symbol, weight: singleNames[0].weight }
          : null,
        breachCount: concentrationMetrics.filter((c) => c.breached).length,
        totalPositions: positions.length,
      },
    })
  }),
```

Update the matching types in `src/services/pms.ts:67-88` (`kind`, `limitBasis`, `effectiveN`,
`singleNameWeight`, `largestSingleName`) and `ConcentrationMetric` in `src/types/portfolio.ts`.

- [ ] **Step 6: Update the view**

In `src/features/portfolios/ConcentrationView.tsx`, replace the breach banner (lines 68–80) so it
names what breached and against which limit:

```tsx
      {breachCount > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-body text-amber-800">
            {positions.filter((p) => p.breached).map((p) => `${p.symbol} at ${(p.weight * 100).toFixed(1)}%`).join(', ')}
            {' '}exceeds the {(positions.find((p) => p.breached)!.limit * 100).toFixed(0)}%{' '}
            {positions.find((p) => p.breached)!.kind === 'single_name' ? 'single-issuer' : 'pooled-vehicle'} limit.
          </p>
        </div>
      ) : (
        <p className="text-caption text-text-secondary">
          No position exceeds its IPS limit. Single issuers are limited to{' '}
          {(SINGLE_NAME_LIMIT * 100).toFixed(0)}% and pooled vehicles to {(FUND_LIMIT * 100).toFixed(0)}%.
          Largest single issuer: {summary.largestSingleName
            ? `${summary.largestSingleName.symbol} at ${(summary.largestSingleName.weight * 100).toFixed(1)}%`
            : 'none'}.
        </p>
      )}
```

Add a `Type` column to the positions table rendering `p.kind === 'single_name' ? 'Single issuer' : p.kind === 'fund' ? 'Fund' : 'Cash'`,
and show `p.limitBasis` in the limit cell's title attribute.

- [ ] **Step 7: Update the existing invariants test**

In `src/mocks/handlers/__tests__/concentration-invariants.test.ts`, replace the
`herfindahlIndex === sum(weight^2)` and `cash positions have a higher limit (0.15)` tests, and add:

```ts
  it('C23: acc-001 has no breach — VTI at 27.8% is a fund, not a single issuer', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.breachCount).toBe(0)
    const vti = data.positions.find((p) => p.symbol === 'VTI')!
    expect(vti.kind).toBe('fund')
    expect(vti.weight).toBeCloseTo(0.278, 3)
    expect(vti.limit).toBe(0.35)
    expect(vti.breached).toBe(false)
  })

  it('C23: acc-011 breaches on NVDA at 13.9% and nothing else', async () => {
    const data = await getConcentration('acc-011')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol)).toEqual(['NVDA'])
    expect(breaches[0]!.weight).toBeCloseTo(0.139, 3)
    expect(breaches[0]!.kind).toBe('single_name')
    expect(breaches[0]!.limit).toBe(0.10)
  })

  it('C22: HHI is on the 0-10,000 scale with an effective-N companion', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.herfindahlIndex).toBeGreaterThan(100)
    expect(data.summary.effectiveN).toBeCloseTo(10_000 / data.summary.herfindahlIndex, 0)
  })
```

- [ ] **Step 8: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/concentration-invariants.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/security-master.ts src/lib/__tests__/security-master.test.ts \
  src/types/portfolio.ts src/mocks/handlers/pms.ts src/services/pms.ts \
  src/features/portfolios/ConcentrationView.tsx \
  src/mocks/handlers/__tests__/concentration-invariants.test.ts
git commit -m "fix(concentration): fund look-through; single-issuer limits apply to issuers

acc-001 goes from '2 positions exceed IPS concentration limits' (VTI, AGG) to zero.
acc-011's NVDA at 13.9% becomes the only breach in the book. Closes C23, C22."
```

---

### Task 12: Brinson attribution that adds up

**Files:**
- Modify: `src/mocks/handlers/pms.ts:261-286`
- Modify: `src/features/portfolios/AttributionPage.tsx:27-29,63-70,120-125`
- Create: `src/mocks/handlers/__tests__/attribution-invariants.test.ts`

**Interfaces:**
- Consumes: `riskProfileFor` (Task 10); `ASSET_CLASS_RISK` (Task 9).
- Produces:
  ```ts
  // AttributionResult unchanged in shape; the response gains an envelope:
  export type AttributionResponse = {
    model: 'Brinson-Fachler'
    linking: 'single-period arithmetic'
    period: string
    benchmark: string
    basis: 'gross of fees'
    asOf: string
    rows: AttributionResult[]
    totals: { allocation: number; selection: number; interaction: number; total: number }
    activeReturn: number
  }
  ```

Findings closed: **C3** (the interaction effect was never summed, so the three cards did not add up),
**C2** (attribution now reconciles to the benchmark table's active return), and **C1 in part** — the
arithmetic scale-factor stretch (`mtd 0.15, qtd 0.35, ytd 1.0, 1y 1.8`) is removed and the method is
labelled. Full geometric (Carino) linking across sub-periods is **deferred** — see the register in Task 23.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/attribution-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getAttribution, getBenchmarkComparison } from '@/services/pms'

describe('Brinson attribution identity', () => {
  it('C3: every row satisfies total === allocation + selection + interaction', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    expect(result.rows.length).toBeGreaterThan(0)
    for (const row of result.rows) {
      expect(row.total).toBeCloseTo(row.allocation + row.selection + row.interaction, 6)
    }
  })

  it('C3: the totals block includes interaction, so the summary cards add up', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    const { allocation, selection, interaction, total } = result.totals
    expect(allocation + selection + interaction).toBeCloseTo(total, 6)
    expect(interaction).not.toBe(0)
  })

  it('C2: Rp − Rb === Σ(A + S + I) — attribution reconciles to active return', async () => {
    for (const period of ['mtd', 'qtd', 'ytd', '1y']) {
      const result = await getAttribution('acc-001', period)
      const bench = await getBenchmarkComparison('acc-001')
      const row = bench.find((b) => b.period === period)!
      expect(result.activeReturn).toBeCloseTo(row.activeReturn, 4)
      expect(result.totals.total).toBeCloseTo(row.activeReturn, 4)
    }
  })

  it('C1: periods are not a linear stretch of the YTD figure', async () => {
    const ytd = await getAttribution('acc-001', 'ytd')
    const oneYear = await getAttribution('acc-001', '1y')
    expect(oneYear.totals.total / ytd.totals.total).not.toBeCloseTo(1.8, 2)
  })

  it('states the model, the linking, the benchmark and the fee basis', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    expect(result.model).toBe('Brinson-Fachler')
    expect(result.linking).toBe('single-period arithmetic')
    expect(result.basis).toBe('gross of fees')
    expect(result.benchmark).toBe('S&P 500 / Agg 60/40')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/attribution-invariants.test.ts`
Expected: FAIL — `result.rows is undefined` (the handler currently returns a bare array).

- [ ] **Step 3: Derive attribution from the same returns as the benchmark**

Replace `src/mocks/handlers/pms.ts:261-286`:

```ts
  http.get('/api/pms/accounts/:accountId/attribution', ({ params, request }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const url = new URL(request.url)
    const period = url.searchParams.get('period') ?? 'ytd'
    const years: Record<string, number> = { mtd: 1 / 12, qtd: 0.25, ytd: 2 / 12, '1y': 1 }
    const y = years[period] ?? 1

    const p = riskProfileFor(account)
    const classes = new Set([...p.weights.keys(), ...p.benchWeights.keys()])

    /**
     * C3 · performance-attribution — Brinson-Fachler, computed for one period, with the
     * interaction effect retained and totalled. The previous implementation summed only
     * allocation and selection, so the three summary cards were 0.20% short of active return.
     * C2 · performance-attribution — effects are derived from the same asset-class returns that
     * drive the benchmark comparison, so Rp − Rb = Σ(A + S + I) holds by construction.
     * C1 · performance-attribution — periods are compounded from the annual return rather than
     * multiplied by an arbitrary scale factor. Sub-period geometric linking is not modelled;
     * the response says so.
     */
    const scaled = (annual: number) => (1 + annual) ** y - 1
    const benchTotal = scaled(portfolioReturn1Y(p.benchWeights))

    const rows: AttributionResult[] = [...classes].map((ac) => {
      const wp = p.weights.get(ac) ?? 0
      const wb = p.benchWeights.get(ac) ?? 0
      const rb = scaled(ASSET_CLASS_RISK[ac]?.return1Y ?? 0)
      // Selection is modelled as a small, deterministic manager effect per asset class.
      const rp = rb + scaled(SELECTION_EDGE[ac] ?? 0)
      return {
        assetClass: ac as AttributionResult['assetClass'],
        allocation: roundTo((wb - wb + (wp - wb)) * (rb - benchTotal), 6),
        selection: roundTo(wb * (rp - rb), 6),
        interaction: roundTo((wp - wb) * (rp - rb), 6),
        total: 0,
      }
    }).map((r) => ({ ...r, total: roundTo(r.allocation + r.selection + r.interaction, 6) }))

    const totals = rows.reduce(
      (acc, r) => ({
        allocation: acc.allocation + r.allocation,
        selection: acc.selection + r.selection,
        interaction: acc.interaction + r.interaction,
        total: acc.total + r.total,
      }),
      { allocation: 0, selection: 0, interaction: 0, total: 0 },
    )

    return HttpResponse.json({
      model: 'Brinson-Fachler',
      linking: 'single-period arithmetic',
      period,
      benchmark: p.benchmarkName,
      basis: 'gross of fees',
      asOf: MOCK_NOW_ISO,
      rows,
      totals: {
        allocation: roundTo(totals.allocation, 6),
        selection: roundTo(totals.selection, 6),
        interaction: roundTo(totals.interaction, 6),
        total: roundTo(totals.total, 6),
      },
      activeReturn: roundTo(totals.total, 6),
    })
  }),
```

Add above the handler list:

```ts
/** Deterministic per-asset-class manager selection edge, annualised. */
const SELECTION_EDGE: Record<string, number> = {
  us_equity: 0.008, intl_equity: 0.002, emerging_markets: -0.002, fixed_income: -0.001,
  alternatives: 0.003, real_estate: 0.000, commodities: 0.001, cash: 0.000,
  digital_assets: 0.010, private_equity: 0.004,
}
```

The `1y` benchmark row in Task 10 already equals `portfolioReturn1Y(p.weights) − portfolioReturn1Y(p.benchWeights)`.
For the identity in the C2 test to hold exactly, make the benchmark handler compute its
`portfolioReturn` as `benchTotal + Σ rows.total` rather than independently. Apply that change in
`src/mocks/handlers/pms.ts` benchmark handler by extracting a shared
`attributionFor(account, years)` helper used by both handlers.

- [ ] **Step 4: Update the page**

In `src/features/portfolios/AttributionPage.tsx`, delete `sumField` (lines 27–29) and read the
server's totals. Replace lines 63–70:

```tsx
  const rows = attribution?.rows ?? []
  const totals = attribution?.totals ?? { allocation: 0, selection: 0, interaction: 0, total: 0 }
  const waterfallData = rows.map((a) => ({
    label: ASSET_CLASS_LABELS[a.assetClass] ?? a.assetClass,
    value: a.total,
  }))
```

Replace the summary cards (lines 120–125) with four cards plus the method caption:

```tsx
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <SummaryCard label="Allocation effect" value={totals.allocation} />
        <SummaryCard label="Selection effect" value={totals.selection} />
        <SummaryCard label="Interaction effect" value={totals.interaction} />
        <SummaryCard label="Total active return" value={totals.total} />
      </div>
      <p className="text-caption text-text-tertiary">
        {attribution?.model}, {attribution?.linking}. Benchmark: {attribution?.benchmark}.{' '}
        {attribution?.basis === 'gross of fees' ? 'Gross of fees.' : 'Net of fees.'} As of{' '}
        {attribution ? formatDate(attribution.asOf) : '—'}. Allocation + selection + interaction
        equals total active return.
      </p>
```

and replace every `(attribution ?? [])` in the table body with `rows`.

- [ ] **Step 5: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/attribution-invariants.test.ts`
Expected: PASS — 5 tests.

Run: `pnpm test:run 2>&1 | tail -5` — check `use-portfolio.test.tsx`'s `useAttribution` expectation,
which asserts an array; update it to the envelope shape.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/pms.ts src/features/portfolios/AttributionPage.tsx \
  src/mocks/handlers/__tests__/attribution-invariants.test.ts src/hooks/__tests__/use-portfolio.test.tsx
git commit -m "fix(attribution): restore the interaction term and the Brinson identity

The three summary cards were 0.20% short of active return because interaction was
never summed. Attribution now derives from the same returns as the benchmark table,
so Rp - Rb = sum(A + S + I). Closes C3, C2; partially C1."
```

---

### Task 13: Tax lots that partition their positions

**Files:**
- Modify: `src/mocks/handlers/custodian.ts:8-101`
- Create: `src/mocks/handlers/__tests__/tax-invariants.test.ts`

**Interfaces:**
- Consumes: `getPositionsForAccount`; `startOfToday` (Task 1); `realisedSales` (Task 14 — import added there).
- Produces: `generateTaxLots(accountId, totalValue): TaxLot[]` — deterministic, and
  `Σ lot.quantity === position.quantity`, `Σ lot.costBasis === position.costBasis`,
  `Σ lot.currentValue === position.marketValue`, `Σ lot.gainLoss === position.gainLoss`.

Findings closed: **C12** (random cost multipliers, lots that do not sum to the position, a hardcoded
`washSaleRestricted: false` that put a green "Clear" badge on every row, and non-determinism between
page loads), **D33** (fully random transactions).

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/tax-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTaxLots, getTransactions } from '@/services/custodian'
import { getPositions } from '@/services/pms'

const ACCOUNTS = ['acc-001', 'acc-002', 'acc-011', 'acc-020', 'acc-029']

describe('tax lots partition their positions', () => {
  it.each(ACCOUNTS)('%s: lots sum to their position on every dimension', async (accountId) => {
    const [lots, positions] = await Promise.all([getTaxLots(accountId), getPositions(accountId)])
    for (const position of positions.filter((p) => p.symbol !== 'CASH')) {
      const forPosition = lots.filter((l) => l.positionId === position.id)
      expect(forPosition.length, `${position.symbol} has no lots`).toBeGreaterThan(0)
      expect(forPosition.reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(position.quantity, 6)
      expect(forPosition.reduce((s, l) => s + l.costBasis, 0)).toBeCloseTo(position.costBasis, 0)
      expect(forPosition.reduce((s, l) => s + l.currentValue, 0)).toBeCloseTo(position.marketValue, 0)
      expect(forPosition.reduce((s, l) => s + l.gainLoss, 0)).toBeCloseTo(position.gainLoss, 0)
    }
  })

  it('C12: lots are deterministic across calls', async () => {
    const first = await getTaxLots('acc-001')
    const second = await getTaxLots('acc-001')
    expect(second).toEqual(first)
  })

  it('C12: gainLoss === currentValue − costBasis for every lot', async () => {
    const lots = await getTaxLots('acc-002')
    for (const lot of lots) {
      expect(lot.gainLoss).toBeCloseTo(lot.currentValue - lot.costBasis, 0)
    }
  })

  it('C12: holdingPeriod follows the purchase date against the clock', async () => {
    const lots = await getTaxLots('acc-001')
    for (const lot of lots) {
      const months = (new Date('2026-02-25').getTime() - new Date(lot.purchaseDate).getTime())
        / (1000 * 60 * 60 * 24 * 365.25 / 12)
      expect(lot.holdingPeriod).toBe(months > 12 ? 'long' : 'short')
    }
  })

  it('D33: transactions are deterministic and priced consistently with the position', async () => {
    const first = await getTransactions('acc-001')
    const second = await getTransactions('acc-001')
    expect(second).toEqual(first)
    for (const txn of first.filter((t) => t.type === 'buy' || t.type === 'sell')) {
      expect(txn.price).toBeGreaterThan(0)
      expect(Math.abs(txn.amount)).toBeCloseTo(txn.quantity! * txn.price!, 0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/tax-invariants.test.ts`
Expected: FAIL — the sums do not match, and the determinism test fails.

- [ ] **Step 3: Rewrite the lot generator**

Replace `src/mocks/handlers/custodian.ts:69-101`:

```ts
import { startOfToday } from '@/lib/clock'

/**
 * C12 · tax-loss-harvesting / data-quality — lots must partition their position. The previous
 * generator drew `costMultiplier = 0.7 + Math.random() * 0.5`, so lot basis was unrelated to the
 * position's own `costBasis` and `gainLoss`, the lots did not sum to the position, and the whole
 * tax module changed on every page load.
 */
function seeded(str: string): () => number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let state = Math.abs(h) || 1
  return () => {
    state = (state * 1664525 + 1013904223) | 0
    return (state >>> 0) / 0x1_0000_0000
  }
}

/** Split 1.0 into `n` deterministic fractions that sum to exactly 1. */
function fractions(rand: () => number, n: number): number[] {
  const raw = Array.from({ length: n }, () => 0.5 + rand())
  const total = raw.reduce((s, v) => s + v, 0)
  const parts = raw.map((v) => v / total)
  // Absorb floating-point residual into the last part so the sum is exact.
  const residual = 1 - parts.reduce((s, v) => s + v, 0)
  parts[parts.length - 1]! += residual
  return parts
}

function generateTaxLots(accountId: string, totalValue: number): TaxLot[] {
  const positions = getPositionsForAccount(accountId, totalValue)
  const anchor = startOfToday()
  const lots: TaxLot[] = []

  for (const pos of positions) {
    if (pos.symbol === 'CASH') continue
    const rand = seeded(`${accountId}:${pos.id}`)
    const lotCount = 1 + Math.floor(rand() * 3) // 1–3
    const shares = fractions(rand, lotCount)

    // Older lots first, so FIFO and LIFO orderings are meaningful.
    const ages = Array.from({ length: lotCount }, () => 3 + Math.floor(rand() * 45))
      .sort((a, b) => b - a)

    let allocatedQty = 0
    let allocatedBasis = 0
    let allocatedValue = 0
    for (let i = 0; i < lotCount; i++) {
      const isLast = i === lotCount - 1
      const share = shares[i]!
      const purchaseDate = new Date(anchor)
      purchaseDate.setMonth(purchaseDate.getMonth() - ages[i]!)

      const quantity = isLast ? pos.quantity - allocatedQty
        : Math.round(pos.quantity * share * 1e6) / 1e6
      const costBasis = isLast ? pos.costBasis - allocatedBasis
        : Math.round(pos.costBasis * share)
      const currentValue = isLast ? pos.marketValue - allocatedValue
        : Math.round(pos.marketValue * share)

      allocatedQty += quantity
      allocatedBasis += costBasis
      allocatedValue += currentValue

      lots.push({
        id: `lot-${pos.id}-${i}`,
        positionId: pos.id,
        purchaseDate: purchaseDate.toISOString().slice(0, 10),
        quantity,
        costBasis,
        currentValue,
        gainLoss: currentValue - costBasis,
        holdingPeriod: ages[i]! > 12 ? 'long' : 'short',
        // Set in Task 14 from the household's realised loss sales.
        washSaleRestricted: false,
      })
    }
  }
  return lots
}
```

- [ ] **Step 4: Make transactions deterministic**

Replace `generateTransactions` (lines 8–67) so it draws from the account's own positions and prices,
using the same `seeded(accountId)` stream, and dates every fee description consistently with its
period. Key changes: `const rand = seeded(\`txn:${accountId}\`)` at the top; replace every
`Math.random()` with `rand()`; replace the `symbols` array with
`const held = getPositionsForAccount(accountId, totalValue).filter((p) => p.symbol !== 'CASH')` and
pick `const pos = held[Math.floor(rand() * held.length)]!`, using `pos.symbol` and `pos.price`;
change `'Advisory fee — Q4 2025'` to a description derived from the transaction's own quarter.

- [ ] **Step 5: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/tax-invariants.test.ts`
Expected: PASS — 9 tests. (The `holdingPeriod` test may need `ages[i]! > 12` adjusted to account for
the month-arithmetic boundary; if a lot exactly 12 months old is classified `short`, that is correct —
IRC §1222 requires *more than* one year.)

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/custodian.ts src/mocks/handlers/__tests__/tax-invariants.test.ts
git commit -m "fix(tax): lots partition their positions and are deterministic

Lot cost basis was random and unrelated to the position's own basis, so lots never
summed to the position and the tax module changed on every page load.
Closes C12, D33."
```

---

### Task 14: Wash-sale windows anchored on realised loss sales

**Files:**
- Create: `src/mocks/data/realised-sales.ts`
- Modify: `src/mocks/handlers/custodian.ts` (add the realised-sales endpoint; set `washSaleRestricted`)
- Modify: `src/services/custodian.ts`
- Create: `src/hooks/use-realised-sales.ts`
- Modify: `src/features/portfolios/TaxManagementPage.tsx:28-38,128-143,193-256`
- Modify: `src/features/portfolios/tax/WashSaleCalendarView.tsx` (whole file)
- Modify: `src/mocks/handlers/compliance.ts:36-38` (`RECENT_SELLS` reads the fixture)
- Modify: `src/mocks/handlers/oms.ts:151` (rule name)
- Modify: `src/mocks/handlers/__tests__/tax-invariants.test.ts`

**Interfaces:**
- Consumes: `accounts`, `households`, `MOCK_TODAY_ISO`.
- Produces:
  ```ts
  export type RealisedSale = {
    id: string
    accountId: string
    householdId: string
    symbol: string
    saleDate: string          // ISO date
    quantity: number
    proceeds: number
    costBasis: number
    realisedGainLoss: number  // negative = a loss sale, which opens a wash-sale window
    holdingPeriod: 'short' | 'long'
  }
  export const realisedSales: RealisedSale[]
  export function washSaleWindow(saleDate: string): { start: string; end: string; days: 61 }
  export function openWashSaleWindows(asOf: string, householdId?: string): (RealisedSale & { start: string; end: string; daysRemaining: number })[]
  ```

Findings closed: **C10** — the calendar anchored on `lot.purchaseDate` passed into a parameter named
`saleDate` (conceptually inverted: a window is opened by a loss *sale*), labelled the 61-day window
"30-Day", and displayed every recently-bought lot including profitable ones. Also the
terminology items in `critique-finance.md` §4 for the 30/61-day label and the
"Tax-loss harvesting window" rule name at `oms.ts:54`.

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/handlers/__tests__/tax-invariants.test.ts`:

```ts
import { realisedSales, washSaleWindow, openWashSaleWindows } from '@/mocks/data/realised-sales'

describe('wash sale windows', () => {
  it('C10: the window is 61 days — 30 before, the sale date, 30 after', () => {
    const window = washSaleWindow('2026-02-10')
    expect(window.start).toBe('2026-01-11')
    expect(window.end).toBe('2026-03-12')
    expect(window.days).toBe(61)
    const spanDays = (new Date(window.end).getTime() - new Date(window.start).getTime())
      / (1000 * 60 * 60 * 24)
    expect(spanDays + 1).toBe(61)
  })

  it('C10: only loss sales open a window', () => {
    for (const sale of realisedSales) {
      expect(typeof sale.realisedGainLoss).toBe('number')
    }
    const open = openWashSaleWindows('2026-02-25')
    expect(open.length).toBeGreaterThan(0)
    for (const w of open) expect(w.realisedGainLoss).toBeLessThan(0)
  })

  it('C10: Margaret Chen sold NVDA at a loss on 2026-02-10; the window closes 2026-03-12', () => {
    const open = openWashSaleWindows('2026-02-25', 'hh-002')
    const nvda = open.find((w) => w.symbol === 'NVDA')!
    expect(nvda.saleDate).toBe('2026-02-10')
    expect(nvda.end).toBe('2026-03-12')
    expect(nvda.daysRemaining).toBe(15)
  })

  it('C10: windows are scoped across every account in the household, including IRAs', () => {
    const open = openWashSaleWindows('2026-02-25', 'hh-001')
    const intc = open.find((w) => w.symbol === 'INTC')!
    expect(intc.accountId).toBe('acc-002')
    // The household's IRAs are in scope for the same symbol — the IRA wash-sale trap.
    expect(realisedSales.filter((s) => s.householdId === 'hh-001').length).toBeGreaterThan(0)
  })

  it('C10: a window that has already closed is not reported as open', () => {
    expect(openWashSaleWindows('2026-06-01')).toHaveLength(0)
  })
})

describe('washSaleRestricted reflects a real restriction', () => {
  it('C12: a lot whose symbol has an open household window is restricted', async () => {
    const lots = await getTaxLots('acc-002')
    const positions = await getPositions('acc-002')
    const intcPositionId = positions.find((p) => p.symbol === 'INTC')!.id
    const intcLots = lots.filter((l) => l.positionId === intcPositionId)
    expect(intcLots.every((l) => l.washSaleRestricted)).toBe(true)
  })

  it('C12: not every lot is Clear', async () => {
    const lots = await getTaxLots('acc-002')
    expect(lots.some((l) => l.washSaleRestricted)).toBe(true)
    expect(lots.some((l) => !l.washSaleRestricted)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/tax-invariants.test.ts -t "wash sale"`
Expected: FAIL — `Failed to resolve import "@/mocks/data/realised-sales"`.

- [ ] **Step 3: Create the realised-sales fixture**

Create `src/mocks/data/realised-sales.ts`:

```ts
/**
 * C10 · tax-loss-harvesting (IRC §1091) / rebalancing — a wash-sale window is opened by a realised
 * loss **sale**, not by a purchase. The previous calendar anchored on `lot.purchaseDate` and passed
 * it into a parameter literally named `saleDate`, so every recently-bought lot — including
 * profitable ones — was displayed as an open wash-sale window.
 *
 * Leaf data: the firm's realised sales for the trailing quarter. Windows are derived.
 */
export type RealisedSale = {
  id: string
  accountId: string
  householdId: string
  symbol: string
  name: string
  saleDate: string
  quantity: number
  proceeds: number
  costBasis: number
  /** Negative values are loss sales and open a wash-sale window. */
  realisedGainLoss: number
  holdingPeriod: 'short' | 'long'
}

export const realisedSales: RealisedSale[] = [
  { id: 'rs-001', accountId: 'acc-002', householdId: 'hh-001', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-21', quantity: 5_000, proceeds: 142_250, costBasis: 175_000, realisedGainLoss: -32_750, holdingPeriod: 'long' },
  { id: 'rs-002', accountId: 'acc-007', householdId: 'hh-002', symbol: 'NVDA', name: 'NVIDIA Corp.', saleDate: '2026-02-10', quantity: 300, proceeds: 234_000, costBasis: 262_500, realisedGainLoss: -28_500, holdingPeriod: 'short' },
  { id: 'rs-003', accountId: 'acc-015', householdId: 'hh-004', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-18', quantity: 4_000, proceeds: 113_800, costBasis: 138_667, realisedGainLoss: -24_867, holdingPeriod: 'long' },
  { id: 'rs-004', accountId: 'acc-011', householdId: 'hh-003', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', saleDate: '2026-01-08', quantity: 1_200, proceeds: 98_760, costBasis: 92_500, realisedGainLoss: 6_260, holdingPeriod: 'long' },
  { id: 'rs-005', accountId: 'acc-022', householdId: 'hh-006', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', saleDate: '2026-02-05', quantity: 900, proceeds: 86_220, costBasis: 94_500, realisedGainLoss: -8_280, holdingPeriod: 'short' },
]

const DAY_MS = 1000 * 60 * 60 * 24

function shiftDays(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** IRC §1091: 30 days before the sale, the sale date itself, and 30 days after. */
export function washSaleWindow(saleDate: string): { start: string; end: string; days: 61 } {
  return { start: shiftDays(saleDate, -30), end: shiftDays(saleDate, 30), days: 61 }
}

export type OpenWashSaleWindow = RealisedSale & {
  start: string
  end: string
  daysRemaining: number
}

export function openWashSaleWindows(asOf: string, householdId?: string): OpenWashSaleWindow[] {
  const asOfMs = new Date(`${asOf}T00:00:00Z`).getTime()
  return realisedSales
    .filter((s) => s.realisedGainLoss < 0)
    .filter((s) => householdId === undefined || s.householdId === householdId)
    .map((s) => {
      const { start, end } = washSaleWindow(s.saleDate)
      return {
        ...s, start, end,
        daysRemaining: Math.ceil((new Date(`${end}T00:00:00Z`).getTime() - asOfMs) / DAY_MS),
      }
    })
    .filter((w) => w.daysRemaining >= 0)
    .sort((a, b) => a.end.localeCompare(b.end))
}
```

- [ ] **Step 4: Expose it and wire `washSaleRestricted`**

In `src/mocks/handlers/custodian.ts`, add the endpoint and set the flag:

```ts
import { accounts } from '../data/accounts'
import { openWashSaleWindows } from '../data/realised-sales'
import { MOCK_TODAY_ISO } from '@/lib/clock'

// …inside generateTaxLots, replace `washSaleRestricted: false`:
        washSaleRestricted: restrictedSymbols.has(pos.symbol),
```

with, above the position loop:

```ts
  const account = accounts.find((a) => a.id === accountId)
  // C12 · tax-loss-harvesting — scoped to the whole household, including IRAs and 401(k)s,
  // because a repurchase in any of them triggers §1091 (the "IRA wash-sale trap").
  const restrictedSymbols = new Set(
    openWashSaleWindows(MOCK_TODAY_ISO, account?.householdId).map((w) => w.symbol),
  )
```

and add the handler:

```ts
  http.get('/api/custodian/accounts/:accountId/realised-sales', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(openWashSaleWindows(MOCK_TODAY_ISO, account.householdId))
  }),
```

In `src/services/custodian.ts` add:

```ts
import type { OpenWashSaleWindow } from '@/mocks/data/realised-sales'

export function getRealisedSales(accountId: string) {
  return get<OpenWashSaleWindow[]>(`/custodian/accounts/${accountId}/realised-sales`)
}
```

Create `src/hooks/use-realised-sales.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { getRealisedSales } from '@/services/custodian'

export function useRealisedSales(accountId: string) {
  return useQuery({
    queryKey: ['realised-sales', accountId],
    queryFn: () => getRealisedSales(accountId),
    enabled: !!accountId,
  })
}
```

- [ ] **Step 5: Rewrite the calendar**

In `src/features/portfolios/TaxManagementPage.tsx`, delete `getWashSaleWindow` (lines 28–38) and the
`washSaleWindows` memo (lines 128–143). Replace with:

```tsx
import { useRealisedSales } from '@/hooks/use-realised-sales'
// …
  const { data: washSaleWindows } = useRealisedSales(id)
// …pass through:
        <TaxSummaryCards
          stats={stats}
          washSaleWindowsCount={washSaleWindows?.length ?? 0}
          …
        />
// …
      {view === 'calendar' && <WashSaleCalendarView windows={washSaleWindows ?? []} />}
```

Change the tab label at `:25` from `'Wash Sale Calendar'` to `'Wash sale calendar'` (sentence case).

Replace `src/features/portfolios/tax/WashSaleCalendarView.tsx` entirely:

```tsx
import { AlertTriangle, Calendar } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import type { OpenWashSaleWindow } from '@/mocks/data/realised-sales'

type WashSaleCalendarViewProps = {
  windows: OpenWashSaleWindow[]
}

export function WashSaleCalendarView({ windows }: WashSaleCalendarViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary" />
          {/* C10 · tax-loss-harvesting — 30 days before + the sale date + 30 days after. */}
          61-day wash sale windows
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-caption text-text-secondary">
          Opened by a realised loss sale in any account in this household, including IRAs and
          employer plans. Repurchasing a substantially identical security inside the window
          disallows the loss under IRC §1091.
        </p>
        {windows.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary">
            No open wash sale windows in this household.
          </div>
        ) : (
          <div className="space-y-3">
            {windows.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between rounded-md border px-4 py-3',
                  item.daysRemaining <= 7 ? 'border-amber-300 bg-amber-50' : 'border-border-primary',
                )}
              >
                <div className="flex items-center gap-4">
                  {item.daysRemaining <= 7 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <div>
                    <p className="font-mono text-body-strong">{item.symbol}</p>
                    <p className="text-caption text-text-tertiary">
                      Sold {item.quantity.toLocaleString()} shares on {formatDate(item.saleDate)} ·
                      realised loss {formatCurrency(item.realisedGainLoss)} · {item.holdingPeriod}-term
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-caption text-text-secondary">
                    {formatDate(item.start)} — {formatDate(item.end)}
                  </p>
                  <p className={cn(
                    'font-mono text-caption font-medium',
                    item.daysRemaining <= 7 ? 'text-amber-600' : 'text-text-tertiary',
                  )}>
                    {item.daysRemaining}d remaining
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Remove the duplicate sell list and rename the OMS rule**

In `src/mocks/handlers/compliance.ts`, replace the hand-typed `RECENT_SELLS` (lines 36–38) with a
derivation from the fixture:

```ts
import { realisedSales } from '../data/realised-sales'

// C10 — one source for realised loss sales.
const RECENT_SELLS: Record<string, Record<string, string>> = realisedSales
  .filter((s) => s.realisedGainLoss < 0)
  .reduce<Record<string, Record<string, string>>>((acc, s) => {
    acc[s.accountId] = { ...(acc[s.accountId] ?? {}), [s.symbol]: s.saleDate }
    return acc
  }, {})
```

In `src/mocks/handlers/oms.ts`, rename the pre-check rule at `:151` from
`'Wash sale rule (30-day window)'` to `'Wash sale rule (61-day window)'` and change
`limit: '30-day window'` to `limit: '61-day window'`; in `generateComplianceChecks` (`:54`) rename
`'Tax-loss harvesting window'` to `'Wash sale (61-day window)'` — the two are different concepts and
the rule being checked is the wash sale.

- [ ] **Step 7: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/tax-invariants.test.ts`
Expected: PASS. Then `pnpm type-check`.

- [ ] **Step 8: Commit**

```bash
git add src/mocks/data/realised-sales.ts src/mocks/handlers/custodian.ts \
  src/services/custodian.ts src/hooks/use-realised-sales.ts \
  src/features/portfolios/TaxManagementPage.tsx \
  src/features/portfolios/tax/WashSaleCalendarView.tsx \
  src/mocks/handlers/compliance.ts src/mocks/handlers/oms.ts \
  src/mocks/handlers/__tests__/tax-invariants.test.ts
git commit -m "fix(tax): anchor wash-sale windows on realised loss sales, label them 61 days

The calendar previously anchored on lot.purchaseDate passed into a parameter named
saleDate, showing profitable recently-bought lots as open windows under a '30-Day'
header. Windows are now household-scoped, including IRAs. Closes C10."
```

---

### Task 15: Tax-loss harvesting at the applicable rate

**Files:**
- Modify: `src/features/portfolios/tax/HarvestScannerView.tsx:36,98`
- Modify: `src/features/portfolios/TaxManagementPage.tsx:94-126,174-176`
- Modify: `src/features/portfolios/tax/CostBasisMethodCard.tsx` (method list and copy)
- Modify: `src/mocks/handlers/__tests__/tax-invariants.test.ts`

**Interfaces:**
- Consumes: `TaxLot` (with correct `holdingPeriod` from Task 13).
- Produces:
  ```ts
  // src/features/portfolios/tax/shared.tsx
  export const SHORT_TERM_RATE: 0.37   // top federal ordinary
  export const LONG_TERM_RATE: 0.238   // 20% LTCG + 3.8% NIIT
  export function estimatedTaxBenefit(lot: Pick<TaxLot, 'gainLoss' | 'holdingPeriod'>): number
  ```

Findings closed: **C11** (a flat 37% applied to every lot, rendered beside a "Long" badge),
**C13** (`AvgCost` took lots in arbitrary order), **C14** (`SpecID` hardcoded as loss-maximising and
offered on individual equities), **D22 in part** (the dashboard's `$17,400 = $47,000 × 0.37`).

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/handlers/__tests__/tax-invariants.test.ts`:

```ts
import { estimatedTaxBenefit, SHORT_TERM_RATE, LONG_TERM_RATE } from '@/features/portfolios/tax/shared'

describe('tax-loss harvesting rates', () => {
  it('C11: short-term losses offset at the ordinary rate, long-term at capital-gains + NIIT', () => {
    expect(SHORT_TERM_RATE).toBe(0.37)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(estimatedTaxBenefit({ gainLoss: -10_000, holdingPeriod: 'short' })).toBeCloseTo(3_700, 2)
    expect(estimatedTaxBenefit({ gainLoss: -10_000, holdingPeriod: 'long' })).toBeCloseTo(2_380, 2)
  })

  it('C11: a gain produces no harvesting benefit', () => {
    expect(estimatedTaxBenefit({ gainLoss: 10_000, holdingPeriod: 'long' })).toBe(0)
  })

  it('C11: a $224,000 long-term loss is a $53,312 benefit, not a $82,880 one', () => {
    expect(estimatedTaxBenefit({ gainLoss: -224_000, holdingPeriod: 'long' })).toBeCloseTo(53_312, 2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/tax-invariants.test.ts -t "harvesting rates"`
Expected: FAIL — `estimatedTaxBenefit is not exported`.

- [ ] **Step 3: Add the rate helper**

Append to `src/features/portfolios/tax/shared.tsx`:

```tsx
import type { TaxLot } from '@/types/portfolio'

/**
 * C11 · tax-loss-harvesting — a flat 37% was applied to every lot and rendered directly beside a
 * "Long" holding-period badge. Long-term losses offset long-term gains at capital-gains rates.
 *
 * These are the top federal marginal rates and exclude state tax. The screen must say so.
 */
export const SHORT_TERM_RATE = 0.37 as const
/** 20% long-term capital gains + 3.8% net investment income tax. */
export const LONG_TERM_RATE = 0.238 as const

export const RATE_DISCLOSURE =
  'Estimated at top federal marginal rates — 37% short-term, 23.8% long-term including net ' +
  'investment income tax. State tax is not modelled. Estimates only, not tax advice.'

export function taxRateFor(holdingPeriod: TaxLot['holdingPeriod']): number {
  return holdingPeriod === 'short' ? SHORT_TERM_RATE : LONG_TERM_RATE
}

export function estimatedTaxBenefit(lot: Pick<TaxLot, 'gainLoss' | 'holdingPeriod'>): number {
  if (lot.gainLoss >= 0) return 0
  return Math.abs(lot.gainLoss) * taxRateFor(lot.holdingPeriod)
}
```

- [ ] **Step 4: Use it in the scanner**

In `src/features/portfolios/tax/HarvestScannerView.tsx`:

Replace the selected-lots banner (`:36`) so the aggregate is the sum of per-lot benefits:

```tsx
import { HOLDING_LABELS, Th, estimatedTaxBenefit, RATE_DISCLOSURE } from './shared'

// The prop `selectedHarvestAmount` becomes `selectedLotObjects: TaxLot[]`; compute both figures here.
  const selectedLoss = selectedLotObjects.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
  const selectedBenefit = selectedLotObjects.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
// …
              <p className="text-caption text-text-secondary">
                Harvestable loss{' '}
                <span className="font-mono font-medium">{formatWithConversion(selectedLoss, baseCurrency, { compact: true })}</span>
                {' · '}estimated tax benefit{' '}
                <span className="font-mono font-medium text-accent-green">{formatWithConversion(selectedBenefit, baseCurrency, { compact: true })}</span>
              </p>
```

Replace the per-row cell (`:98`):

```tsx
                      <td className="px-4 py-2.5 text-right font-mono text-accent-green">
                        <CurrencyValue value={estimatedTaxBenefit(lot)} from={baseCurrency} />
                      </td>
```

Rename the column header from `Est. Tax Savings` to `Est. tax benefit` and add the disclosure under
the table:

```tsx
          <p className="px-4 py-3 text-caption text-text-tertiary">{RATE_DISCLOSURE}</p>
```

- [ ] **Step 5: Fix the cost-basis method simulation**

In `src/features/portfolios/TaxManagementPage.tsx`, replace the `switch` in `computeImpact`
(lines 100–106) and the surrounding loop:

```tsx
        // C13 · tax-efficiency — under average cost every share carries an identical basis, so a
        // 10% sale realises exactly 10% of the unrealised gain, with holding period allocated FIFO.
        if (method === 'AvgCost') {
          const totalBasis = lots.reduce((s, l) => s + l.costBasis, 0)
          const totalValue = lots.reduce((s, l) => s + l.currentValue, 0)
          const avgBasis = totalBasis / totalQty
          const avgPrice = totalValue / totalQty
          const gain = (avgPrice - avgBasis) * sellQty
          totalGain += gain
          // Holding period is allocated FIFO across the sold shares.
          const fifo = [...lots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
          let remainingAvg = sellQty
          for (const lot of fifo) {
            if (remainingAvg <= 0) break
            const fromLot = Math.min(remainingAvg, lot.quantity)
            const share = (fromLot / sellQty) * gain
            if (lot.holdingPeriod === 'short') stGain += share
            else ltGain += share
            remainingAvg -= fromLot
          }
          continue
        }

        let sorted: TaxLot[]
        switch (method) {
          case 'FIFO': sorted = [...lots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate)); break
          case 'LIFO': sorted = [...lots].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)); break
          // C14 · tax-efficiency — HIFO is a standing lot-selection instruction *under* Spec ID,
          // which is how custodians actually offer it. There is no separate "SpecID algorithm".
          case 'HIFO': sorted = [...lots].sort((a, b) => (b.costBasis / b.quantity) - (a.costBasis / a.quantity)); break
        }
```

Update `COST_BASIS_METHODS` in `src/features/portfolios/tax/CostBasisMethodCard.tsx` to
`['FIFO', 'LIFO', 'HIFO', 'AvgCost'] as const` — dropping `SpecID` as a pseudo-algorithm — and add a
caption: *"HIFO and LIFO are standing lot-selection instructions under specific identification.
Average cost is available only for mutual funds and DRIP-eligible shares."* Gate the `AvgCost` option
on the account: hide it when `account.costBasisMethod !== 'average_cost'`.

Delete the now-unused `selectedHarvestAmount` computation at `:174-176` and pass the selected lot
objects instead.

- [ ] **Step 6: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/tax-invariants.test.ts && pnpm type-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/portfolios/tax src/features/portfolios/TaxManagementPage.tsx \
  src/mocks/handlers/__tests__/tax-invariants.test.ts
git commit -m "fix(tax): harvest at the applicable rate; fix average-cost and Spec ID

37% ordinary was applied to every lot, including rows badged 'Long'. Average cost
now realises a pro-rata share of the unrealised gain with FIFO holding periods.
Closes C11, C13, C14."
```

---

### Task 16: Real per-entity allocations

**Files:**
- Modify: `src/features/clients/HouseholdListView.tsx:24-53,231-238`
- Modify: `src/features/clients/ClientDetailPage.tsx:134-139,202`
- Modify: `src/mocks/handlers/pms.ts` (add a client allocation endpoint)
- Modify: `src/services/pms.ts`
- Modify: `src/hooks/use-portfolio.ts`

**Interfaces:**
- Consumes: `useHouseholdAllocation(householdId)` (already exists, `src/hooks/use-portfolio.ts:121`).
- Produces:
  ```ts
  // src/services/pms.ts
  export function getClientAllocation(clientId: string): Promise<AllocationSlice[]>
  // src/hooks/use-portfolio.ts
  export function useClientAllocation(clientId: string)
  ```

Finding closed: the `critique-dataviz.md` / SYNTHESIS finding that `ALLOCATION_TEMPLATES` and
`CLIENT_ALLOCATION` are constants rendered as if they were real per-entity data. Chen-Wong,
Johnson and Martinez currently render byte-identical donuts because they share a segment.

- [ ] **Step 1: Write the failing test**

Create `src/features/clients/__tests__/allocation-is-real.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { getHouseholdAllocation, getClientAllocation } from '@/services/pms'

describe('allocations are per entity, not per segment template', () => {
  it('two platinum households do not render identical allocations', async () => {
    const johnson = await getHouseholdAllocation('hh-001')
    const chenWong = await getHouseholdAllocation('hh-002')
    expect(johnson).not.toEqual(chenWong)
  })

  it('household allocation weights sum to 1', async () => {
    const allocation = await getHouseholdAllocation('hh-002')
    expect(allocation.reduce((s, a) => s + a.weight, 0)).toBeCloseTo(1, 2)
  })

  it('household allocation values sum to the household managed AUM', async () => {
    const allocation = await getHouseholdAllocation('hh-002')
    expect(allocation.reduce((s, a) => s + a.value, 0)).toBeCloseTo(30_308_018, -1)
  })

  it('client allocation covers only that client accounts', async () => {
    const robert = await getClientAllocation('cli-001')
    const patricia = await getClientAllocation('cli-002')
    expect(robert).not.toEqual(patricia)
    expect(robert.reduce((s, a) => s + a.value, 0)).toBeCloseTo(16_250_000, -1)
    expect(patricia.reduce((s, a) => s + a.value, 0)).toBeCloseTo(2_500_000, -1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/features/clients/__tests__/allocation-is-real.test.tsx`
Expected: FAIL — `getClientAllocation is not exported`.

- [ ] **Step 3: Add the client allocation endpoint**

In `src/mocks/handlers/pms.ts`, next to the household allocation handler (`:460`):

```ts
  http.get('/api/pms/clients/:clientId/allocation', ({ params }) => {
    const clientAccounts = accounts.filter((a) => a.clientId === params.clientId)
    if (clientAccounts.length === 0) return notFound()

    const byClass = new Map<string, number>()
    for (const acc of clientAccounts) {
      for (const pos of getPositionsForAccount(acc.id, acc.totalValue)) {
        byClass.set(pos.assetClass, (byClass.get(pos.assetClass) ?? 0)
          + toUSD(pos.marketValue, acc.baseCurrency))
      }
    }
    const total = [...byClass.values()].reduce((s, v) => s + v, 0)
    return HttpResponse.json(
      [...byClass.entries()]
        .map(([assetClass, value]) => ({
          assetClass, weight: roundTo(value / total, 3), value: Math.round(value),
        }))
        .sort((a, b) => b.value - a.value),
    )
  }),
```

Sort the existing household allocation response the same way so both charts order slices by size.

In `src/services/pms.ts`:

```ts
export function getClientAllocation(clientId: string) {
  return get<AllocationSlice[]>(`/pms/clients/${clientId}/allocation`)
}
```

(promote `AllocationSlice` from the local `type` at `:123` to an exported one), and in
`src/hooks/use-portfolio.ts`:

```ts
export function useClientAllocation(clientId: string) {
  return useQuery({
    queryKey: ['client-allocation', clientId],
    queryFn: () => getClientAllocation(clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  })
}
```

- [ ] **Step 4: Replace the constants**

In `src/features/clients/HouseholdListView.tsx`, delete `ALLOCATION_TEMPLATES` (lines 24–53) and
render the real allocation only for the expanded row (so it is fetched lazily):

```tsx
import { useHouseholdAllocation } from '@/hooks/use-portfolio'

function HouseholdAllocation({ householdId }: { householdId: string }) {
  const { data, isLoading } = useHouseholdAllocation(householdId)
  if (isLoading) return <Skeleton className="h-24 w-24 rounded-full" />
  if (!data || data.length === 0) {
    return <p className="text-caption text-text-tertiary">No positions to allocate.</p>
  }
  return <AllocationChart data={data} size="sm" showLegend={false} />
}
```

and at `:231-238`:

```tsx
                      <div>
                        <SectionHeading>Allocation</SectionHeading>
                        <HouseholdAllocation householdId={hh.id} />
                      </div>
```

In `src/features/clients/ClientDetailPage.tsx`, delete `CLIENT_ALLOCATION` (lines 134–139) and at
`:202`:

```tsx
              <ClientAllocation clientId={id} />
```

with, alongside the other local components:

```tsx
function ClientAllocation({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientAllocation(clientId)
  if (isLoading) return <Skeleton className="h-48" />
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-caption text-text-tertiary">No positions to allocate.</p>
  }
  return <AllocationChart data={data} />
}
```

- [ ] **Step 5: Run**

Run: `pnpm vitest run src/features/clients/__tests__/allocation-is-real.test.tsx && pnpm type-check`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/features/clients src/mocks/handlers/pms.ts src/services/pms.ts src/hooks/use-portfolio.ts
git commit -m "fix(charts): real per-entity allocations replace segment templates

ALLOCATION_TEMPLATES rendered one donut per segment, so three platinum households
were byte-identical. CLIENT_ALLOCATION was one constant for all 22 clients."
```

---

### Task 17: One count per fact on the dashboard

**Files:**
- Modify: `src/mocks/handlers/pms.ts:20-30` (`computeMetrics`)
- Modify: `src/services/pms.ts:98-105` (`MetricsSummary`)
- Modify: `src/mocks/handlers/ai.ts:301-331`
- Modify: `src/features/dashboard/DashboardPage.tsx:28-34`
- Modify: `src/features/dashboard/MetricsBar.tsx:27-60`
- Create: `src/mocks/handlers/__tests__/dashboard-consistency.test.ts`

**Interfaces:**
- Consumes: `nbas`, `complianceAlerts`, `calendarEvents`, `openWashSaleWindows` (Task 14),
  `estimatedTaxBenefit` (Task 15).
- Produces:
  ```ts
  // MetricsSummary gains asOf; every count is derived:
  //   pendingTasks   = nbas.filter(n => !n.dismissed).length
  //   alertCount     = complianceAlerts.filter(a => a.reviewStatus !== 'approved' && !a.resolvedAt).length
  //   criticalCount  = nbas.filter(n => !n.dismissed && n.priority === 'critical').length
  //   meetingsToday  = calendar events on MOCK_TODAY_ISO
  //   netFlowsMTD    = one figure, used by both the KPI strip and the AI insight
  ```

Findings closed: **D21** (three self-contradictions above the fold), **D22** (two harvestable totals
differing by 4.8× on the same screen), and the contradictory-count findings in `critique-content.md` §Gap 2.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/dashboard-consistency.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getMetricsSummary } from '@/services/pms'
import { getAIInsights } from '@/services/ai'
import { nbas } from '@/mocks/data/nbas'

describe('the dashboard does not contradict itself', () => {
  it('D21: pendingTasks === the number of undismissed NBAs the feed will show', async () => {
    const metrics = await getMetricsSummary()
    const active = nbas.filter((n) => !n.dismissed).length
    expect(metrics.pendingTasks).toBe(active)
    expect(metrics.pendingTasks).toBe(20)
  })

  it('D21: the insight body quotes the same count as the KPI strip', async () => {
    const metrics = await getMetricsSummary()
    const insights = await getAIInsights('dashboard')
    const summary = insights.find((i) => i.id === 'dash-1')!
    expect(summary.body).toContain(`${metrics.pendingTasks} pending actions`)
  })

  it('D21: the critical-action headline and body quote the same number', async () => {
    const insights = await getAIInsights('dashboard')
    const critical = insights.find((i) => i.id === 'dash-2')
    if (!critical) return
    const headline = Number(/^(\d+)/.exec(critical.title)![1])
    const body = Number(/^(\d+)/.exec(critical.body)![1])
    expect(body).toBe(headline)
    expect(headline).toBe(2)
  })

  it('D21: net flows appear once, in one figure', async () => {
    const metrics = await getMetricsSummary()
    const insights = await getAIInsights('dashboard')
    const summary = insights.find((i) => i.id === 'dash-1')!
    expect(summary.metric?.value).toBe(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        .format(metrics.netFlowsMTD),
    )
  })

  it('D22: the harvestable-loss insight matches the estimated benefit at the applicable rates', async () => {
    const insights = await getAIInsights('dashboard')
    const tlh = insights.find((i) => i.id === 'dash-3')!
    const loss = Number(/\$([\d,]+) in harvestable/.exec(tlh.body)![1]!.replace(/,/g, ''))
    const benefit = Number(/\$([\d,]+)/.exec(tlh.metric!.value)![1]!.replace(/,/g, ''))
    // The benefit must be below the short-term rate ceiling and above the long-term floor.
    expect(benefit).toBeLessThanOrEqual(Math.round(loss * 0.37))
    expect(benefit).toBeGreaterThanOrEqual(Math.round(loss * 0.238))
  })

  it('alertCount === the number of unresolved compliance alerts', async () => {
    const metrics = await getMetricsSummary()
    expect(metrics.alertCount).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/dashboard-consistency.test.ts`
Expected: FAIL — `expected 14 to be 20`.

- [ ] **Step 3: Derive the metrics**

Replace `computeMetrics()` in `src/mocks/handlers/pms.ts:20-30`:

```ts
import { nbas } from '../data/nbas'
import { complianceAlerts } from '../data/compliance-alerts'   // or the array exported by handlers/compliance.ts
import { calendarEvents } from '../data/calendar'
import { MOCK_TODAY_ISO, MOCK_NOW_ISO } from '@/lib/clock'

/**
 * D21 · advisor-dashboards — every count previously hardcoded here contradicted the module that
 * owned it: `pendingTasks: 14` against 20 NBAs, `alertCount: 3` against 7 compliance alerts, and
 * `netFlowsMTD: 1_250_000` against the AI insight's "+$420K".
 */
const NET_FLOWS_MTD = 1_250_000

function computeMetrics(): MetricsSummary {
  const activeNBAs = nbas.filter((n) => !n.dismissed)
  const openAlerts = complianceAlerts.filter((a) => !a.resolvedAt && a.reviewStatus !== 'approved')
  return {
    totalAUM: Math.round(deriveBookAUM(accounts, FX_RATES_USD_BASE)),
    totalClients: new Set(accounts.map((a) => a.clientId)).size,
    pendingTasks: activeNBAs.length,
    criticalCount: activeNBAs.filter((n) => n.priority === 'critical').length,
    meetingsToday: calendarEvents.filter((e) => e.startTime.startsWith(MOCK_TODAY_ISO)).length,
    alertCount: openAlerts.length,
    netFlowsMTD: NET_FLOWS_MTD,
    asOf: MOCK_NOW_ISO,
  }
}
```

If `complianceAlerts` is not currently exported from `src/mocks/handlers/compliance.ts`, export it
there (`export const complianceAlerts: ComplianceAlert[] = [...]`) rather than duplicating the array.
Likewise for `calendarEvents` in `src/mocks/data/calendar.ts`.

Add `criticalCount: number` and `asOf: string` to `MetricsSummary` in `src/services/pms.ts:98-105`.

- [ ] **Step 4: Make the insights read the same numbers**

In `src/mocks/handlers/ai.ts:301-331`:

```ts
import { estimatedTaxBenefit } from '@/features/portfolios/tax/shared'
import { openWashSaleWindows } from '../data/realised-sales'

    if (screenType === 'dashboard') {
      const metrics = computeMetrics()
      const activeNBAs = nbas.filter((n) => !n.dismissed)
      const criticalCount = metrics.criticalCount

      insights.push({
        id: 'dash-1',
        severity: 'info',
        title: 'Portfolio health summary',
        body: `${formatAUM(metrics.totalAUM)} across ${accounts.length} accounts as of ${formatDate(metrics.asOf)}. ${metrics.pendingTasks} pending actions identified.`,
        metric: {
          label: 'Net inflows this month',
          value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics.netFlowsMTD),
        },
      })

      if (criticalCount > 0) {
        insights.push({
          id: 'dash-2',
          severity: 'warning',
          title: `${criticalCount} critical action${criticalCount > 1 ? 's' : ''} outstanding`,
          // D21 — the headline said "2 Critical Actions" while the body said "3 time-sensitive
          // items". One count, one fact.
          body: `${criticalCount} item${criticalCount > 1 ? 's' : ''} carrying a deadline across your book. Compliance review and RMD deadlines are the earliest.`,
          actionLabel: 'View critical actions',
          actionAI: 'Show me all critical priority NBAs that need attention today',
        })
      }

      // D22 — one harvestable figure, derived, with the benefit computed at the applicable rate
      // rather than a flat 37%.
      const harvestable = harvestableLotsAcrossBook()
      const harvestableLoss = harvestable.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      const harvestableBenefit = harvestable.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
      insights.push({
        id: 'dash-3',
        severity: 'opportunity',
        title: 'Tax-loss harvesting window',
        body: `${formatAUM(harvestableLoss)} in harvestable losses across ${new Set(harvestable.map((l) => l.accountId)).size} client accounts, with ${openWashSaleWindows(MOCK_TODAY_ISO).length} open wash sale windows.`,
        metric: {
          label: 'Estimated tax benefit',
          value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(harvestableBenefit),
        },
        actionLabel: 'Review opportunities',
        actionRoute: '/portfolios/accounts/acc-001/tax',
      })
    }
```

Add `harvestableLotsAcrossBook()` next to the handler, walking `accounts` and calling the exported
lot generator from `custodian.ts` (export `generateTaxLots` for this), filtering `gainLoss < -1000`
and tagging each lot with its `accountId`.

Also update `ai.ts:441` so the `actions` screen quotes `metrics.pendingTasks` and
`metrics.criticalCount`, not its own recount.

- [ ] **Step 5: Fix the page header and KPI strip**

`src/features/dashboard/DashboardPage.tsx:28-34` — the hardcoded `4 meetings, 14 pending actions`:

```tsx
export function DashboardPage() {
  const { data: insights } = useAIInsights('dashboard')
  const { data: metrics } = useMetrics()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title">{getGreeting()}, Sarah</h1>
        <p className="mt-1 text-body text-text-secondary">
          {formatToday()}
          {metrics ? ` — ${metrics.meetingsToday} meetings, ${metrics.pendingTasks} pending actions` : ''}
        </p>
      </div>
```

`src/features/dashboard/MetricsBar.tsx` — the hand-typed sub-labels are their own contradictions.
Replace `change: { value: '3 due today', direction: 'neutral' }` on Pending Tasks with
`change: { value: \`${data.criticalCount} critical\`, direction: 'neutral' }`, and delete the
`'1 critical'` sub-label on Alerts and the `'+$1.2M'` sub-label on Net Flows (the latter restates the
value it sits under). Change labels to sentence case: `Pending tasks`, `Meetings today`,
`Net flows MTD`.

- [ ] **Step 6: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/dashboard-consistency.test.ts`
Expected: PASS — 6 tests. Then `pnpm vitest run src/features/dashboard` and update
`DashboardPage.test.tsx` expectations from `14` to `20`.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/handlers/pms.ts src/mocks/handlers/ai.ts src/mocks/handlers/compliance.ts \
  src/mocks/data/calendar.ts src/services/pms.ts src/features/dashboard \
  src/mocks/handlers/__tests__/dashboard-consistency.test.ts
git commit -m "fix(dashboard): derive every count; remove three above-the-fold contradictions

PENDING TASKS 14 vs '20 pending actions identified'; '2 Critical Actions' vs
'3 time-sensitive items'; NET FLOWS MTD \$1.3M vs '+\$420K'. Closes D21, D22."
```

---

### Task 18: Fixture corrections — positions, balances, sleeves, identities

This is a **fixture** task: it changes literals, not logic. It closes the largest block of remaining
gate failures and the eleven pre-existing test failures from the baseline.

**Files:**
- Modify: `src/mocks/data/accounts.ts` (cash balances, `acc-006` tax treatment, sleeve values)
- Modify: `src/mocks/data/positions.ts` (`acc-002`, `acc-029`, `acc-045`, `pos-240`)
- Modify: `src/mocks/data/trading.ts` (crypto prices, NVDA/AAPL quotes, GS rating)
- Modify: `src/mocks/handlers/reconciliation.ts:18-21` (break account names)
- Modify: `src/mocks/handlers/compliance.ts:5-9` and `src/mocks/handlers/oms.ts:134` (one restricted list)
- Modify: `src/mocks/handlers/oms.ts:12,29,31` (order corrections)
- Modify: `src/mocks/data/__tests__/account-invariants.test.ts`, `referential-integrity.test.ts`,
  `portfolio-invariants.test.ts`, `src/mocks/handlers/__tests__/drift-invariants.test.ts`,
  `src/hooks/__tests__/use-portfolio.test.tsx` (counts 45 → 47, 130 → 140)

Findings closed: **D2**, **D3**, **D4**, **D5**, **D6**, **D17**, **D24**, **D25**, **D26**, **D27**,
**D28**, **D29**, **D34**, **D35**.

- [ ] **Step 1: See which gate assertions this task owns**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts -t "positions"`
Expected: FAIL on `acc-002` (positions sum $4,832,000 vs $4,500,000), `acc-029` ($600,000 vs
$340,000), `acc-045` (weights 0.925), and on **every** account's cash assertion (`cashBalance` is
exactly 2.00% of `totalValue` for all 47 while position-level cash is 8–22%).

- [ ] **Step 2: Reconcile positions to balances (D2, D3, D4)**

`acc-002` — `positions.ts:20-30`. The nine positions sum to `$4,832,000` against `accounts.ts:11`'s
`$4,500,000`. Scale the non-cash positions down and set CASH so the total is exact. Keep the INTC
loss narrative intact (it drives nba-002 and rs-001). Concretely: multiply each non-cash
`marketValue`, `costBasis` and `gainLoss` by `4_500_000 / 4_832_000 = 0.93129...`, recompute
`quantity = marketValue / price` rounded to the nearest share, then re-derive `marketValue` from the
rounded quantity, and set the CASH position to the residual so the account totals exactly
`4_500_000`. Recompute every `weight` as `marketValue / 4_500_000` to 3dp and every
`gainLossPercent` as `gainLoss / costBasis` to 3dp.

`acc-029` — `positions.ts:112-119`. The comment says "$600K" but `accounts.ts:55` says `$340,000`.
The 529 narrative (nba-016's glide path) needs the account, not the balance, so **scale the positions
to $340,000** using the same procedure and update the section comment to
`// ─── acc-029: Patel 529 Education ($340K, mod-006 Education) ───`.

`acc-045` — `positions.ts:217-226`. Weights sum to `0.925` and values to `$393,630` against
`$425,000`. Add the missing `$31,370` to the CASH position and set every weight to
`marketValue / 425_000` to 3dp so they sum to 1.000.

`pos-240` — the failing `marketValue === quantity * price` assertion. Recompute `marketValue` from
`quantity * price` and re-derive `gainLoss` and `gainLossPercent`.

- [ ] **Step 3: Reconcile cash (D5)**

`cashBalance` is exactly 2.00% of `totalValue` on all 47 accounts, while the CASH position in the
explicit fixtures is 8.1%–22.3% — `acc-001` reports three different cash figures (`cashBalance`
$164,000, position CASH $660,170, sleeve Cash $820,000). Replace each `cashBalance` literal with the
account's actual CASH position value:

```ts
// acc-001: cashBalance: 660_170   (was 164_000; position pos-012)
// acc-002: cashBalance: <residual from step 2>
// acc-003: cashBalance: 367_170   (pos-038)
// acc-006: cashBalance: 1_012_470 (pos-062)
// acc-011: cashBalance: 120_210   (pos-079)
// acc-015: cashBalance: 101_365   (pos-090)
// acc-020: cashBalance: 220_840   (pos-108)
// acc-029: cashBalance: <2% -> the scaled CASH position from step 2>
```

For the 30-odd accounts served by the *generated* positions (`positions.ts:250-268`), the generator
already emits `cash = totalValue * 0.02`, so their existing `cashBalance` values are already correct
— leave them.

- [ ] **Step 4: Reconcile the UMA sleeves (D6)**

`acc-001` sleeves (`accounts.ts:6-9`) claim 45/30/15/10 with `Alternatives $1,230,000 / Blackstone`
while the account holds **zero** alternatives positions and its model `mod-001` targets 5% alts.
Rebuild both UMA sleeve sets from the account's actual positions grouped into the sleeve's asset
classes:

```ts
// acc-001 — from pos-001..pos-012, grouped: equity (VTI/AAPL/MSFT/NVDA/EFA/VWO) 4,582,290;
// fixed income (AGG/BND/TLT) 2,295,560; real assets (GLD/VNQ) 662,360; cash 660,170.
  isUMA: true, sleeves: [
    { id: 'slv-001', name: 'Core equity', strategy: 'Global equity', manager: 'Internal', targetAllocation: 0.55, actualAllocation: 0.559, value: 4_582_290 },
    { id: 'slv-002', name: 'Core fixed income', strategy: 'Investment grade', manager: 'PIMCO', targetAllocation: 0.30, actualAllocation: 0.280, value: 2_295_560 },
    { id: 'slv-003', name: 'Real assets', strategy: 'Real estate and commodities', manager: 'Internal', targetAllocation: 0.10, actualAllocation: 0.081, value: 662_360 },
    { id: 'slv-004', name: 'Cash', strategy: 'Money market', manager: 'Internal', targetAllocation: 0.05, actualAllocation: 0.081, value: 660_170 },
  ],
```

Do the same for `acc-006` from `pos-050..pos-062`. Verify each set sums to the account's
`totalValue` — the gate asserts it.

- [ ] **Step 5: Fix the reconciliation break identities (D17)**

`src/mocks/handlers/reconciliation.ts:18-21`. All four rows name the wrong account, and two name
accounts that do not exist in the dataset at all:

```ts
  { id: 'brk-002', integrationName: 'Schwab Custodian', accountId: 'acc-001', accountName: 'Johnson Family Trust', field: 'cash_balance', expectedValue: '$660,170.00', actualValue: '$660,020.00', severity: 'medium', detectedAt: '2026-02-25T07:00:00Z' },
  { id: 'brk-003', integrationName: 'Fidelity Custodian', accountId: 'acc-006', accountName: 'Chen Family Irrevocable Trust', field: 'position_quantity', expectedValue: '14,500 (EFA)', actualValue: '14,480 (EFA)', severity: 'medium', detectedAt: '2026-02-24T07:00:00Z', resolvedAt: '2026-02-24T09:00:00Z' },
  { id: 'brk-004', integrationName: 'Schwab Custodian', accountId: 'acc-003', accountName: 'Robert Johnson Traditional IRA', field: 'transaction_count', expectedValue: '14', actualValue: '13', severity: 'low', detectedAt: '2026-02-24T07:00:00Z', resolvedAt: '2026-02-24T07:45:00Z' },
  { id: 'brk-005', integrationName: 'Vanguard Custodian', accountId: 'acc-014', accountName: 'Williams 529 Education', field: 'market_value', expectedValue: '$385,000.00', actualValue: '$383,750.00', severity: 'low', detectedAt: '2026-02-23T07:00:00Z', resolvedAt: '2026-02-23T08:20:00Z' },
```

Move `brk-001` (a MoneyGuidePro `goal_probability` difference) out of the break queue — a planning-tool
probability is not a custodial reconciliation break (**D18**). Change its `integrationName` row in
`integrations` to carry `breakCount: 0` and delete `brk-001`, or relabel the row's `field` to
`integration_health` and add `type: 'integration_health'` to `ReconBreak` and filter it out of the
break-queue view. Prefer deletion — Phase 7 owns the integration-health log.

- [ ] **Step 6: One restricted list (D29)**

Delete the array literal at `src/mocks/handlers/oms.ts:134` and import the compliance list:

```ts
import { RESTRICTED_SECURITIES } from './compliance'
// …
    if (RESTRICTED_SECURITIES.has(sym)) {
```

Export `RESTRICTED_SECURITIES` from `src/mocks/handlers/compliance.ts` and correct its contents and
rationale — `BBBY` was delisted in 2023 and an RIA's restricted list is driven by MNPI and
access-person holdings, not investment-banking relationships:

```ts
/**
 * D29 · pre-trade-compliance / conflicts-of-interest — one list, used by both the trade ticket and
 * the pre-trade engine. "Investment banking relationship" is a broker-dealer construct; an RIA's
 * restricted list is driven by MNPI, access-person holdings and firm-wide restrictions.
 */
export const RESTRICTED_SECURITIES = new Set([
  'META', 'GOOG', 'GOOGL', // Access person holds a reportable position
  'COIN',                   // Material non-public information — engagement in progress
  'GME', 'AMC',             // Firm-wide restriction — heightened volatility designation
])
```

- [ ] **Step 7: Order corrections (D26, D27, D28)**

`src/mocks/handlers/oms.ts:29` — `ord-013` fills a mutual fund at 11:00 ET with `quantity: 1`.
Mutual funds price once daily at 4:00 PM ET (Rule 22c-1) and the app's own UI says so:

```ts
  { id: 'ord-013', accountId: 'acc-001', symbol: 'VFIAX', side: 'purchase', quantity: 53.73, orderType: 'market', status: 'filled', filledQuantity: 53.73, filledPrice: 465.32, submittedAt: '2026-02-23T15:00:00Z', filledAt: '2026-02-23T21:00:00Z', assetClass: 'mutual_fund', dollarAmount: 25000, amountType: 'dollars' },
```

`:31` — `ord-015` buys spot BTC in `acc-002`, a Schwab brokerage that holds IBIT/ETHE. Move it to the
crypto account: `accountId: 'acc-045'`, and set `filledPrice: 87_450` to match the single crypto price
source (see Step 8).

`:12` — `ord-004` sold 5,000 INTC in `acc-002` on 2026-02-21 while the position still shows 12,000
shares with the full −$78,600 loss (**D28**). With `realised-sales.ts` now holding `rs-001` for the
same event, reduce the `acc-002` INTC position to `7,000` shares (`marketValue` and `costBasis`
scaled accordingly) so the executed fill is reflected, and update nba-002's description to the
post-sale figure.

- [ ] **Step 8: One price per security (D24, D25, D34, D35, D27)**

`trading.ts:10` quotes NVDA at `$870.00` while `positions.ts:8` holds it at `$780.00`; AAPL is
`$185.00` vs `$195.40`. Set the trading quotes to the position prices — positions are the book of
record. Set every crypto `lastPrice` in `trading.ts:70-79` and every crypto position price to a single
table, and correct `currencies.ts`'s implied crypto rates to match it (`BTC: 1/87_450`,
`SOL: 1/142.50`, `AVAX: 1/38.75`). Change `GS-28`'s `creditRating` from `'A+'` to `'BBB+'` (**D34**).
Change `costBasisMethod` to `'not_applicable'` on the nine Roth IRAs and three 529s (**D35**) — add
that member to the union in `src/types/account.ts`.

- [ ] **Step 9: `acc-006` tax treatment**

The baseline failure `acc-006 (trust_irrevocable): taxable account types have taxable treatment` is a
**test** error, not a data error: an irrevocable trust is taxed at trust rates and the fixture
correctly says `trust_taxable`. Fix the test — in
`src/mocks/data/__tests__/account-invariants.test.ts`, move `trust_irrevocable` out of `taxableTypes`
into a new `trustTaxableTypes` block asserting `taxTreatment === 'trust_taxable'`.

- [ ] **Step 10: Update the count assertions**

- `account-invariants.test.ts:19` — `toHaveLength(45)` → `toHaveLength(47)`
- `referential-integrity.test.ts` — `has 45 accounts` → 47
- `portfolio-invariants.test.ts:8` — `toHaveLength(130)` → `toHaveLength(140)`
- `drift-invariants.test.ts:60` — `toHaveLength(45)` → `toHaveLength(47)`
- `use-portfolio.test.tsx` — `useDriftSummary` count → 47

- [ ] **Step 11: Run everything**

Run: `pnpm type-check && pnpm test:run 2>&1 | tail -5`
Expected: the eleven baseline fixture failures are gone. The gate's `positions` and `fees` blocks
now pass in full. `drift-invariants` › `totalDrift === sum(drifts) / 2` may still fail — Task 21 owns it.

- [ ] **Step 12: Commit**

```bash
git add src/mocks/data src/mocks/handlers src/types/account.ts
git commit -m "fix(data): reconcile positions, cash, sleeves and identities to their accounts

acc-002 positions summed to \$4,832,000 against a \$4,500,000 balance; the Patel 529
to \$600,000 against \$340,000; acc-045 weights to 0.925. All four reconciliation
breaks named the wrong account and two named accounts that do not exist.
Closes D2, D3, D4, D5, D6, D17, D18, D24, D25, D26, D27, D28, D29, D34, D35."
```

---

### Task 19: Narrative fixture corrections, and the Reg BI rollover

**Files:**
- Modify: `src/mocks/data/nbas.ts:86-95,97-105,109-117,183-194,265-273,25,40,144,165`
- Modify: `src/mocks/data/proposals.ts:214-220`
- Modify: `src/mocks/handlers/proposals.ts:27` (fee illustration)
- Create: `src/mocks/data/__tests__/nba-facts.test.ts`

**Interfaces:**
- Consumes: `blendedTieredFee` (Task 7); `accounts`, `positions`, `households`, `householdFees`.
- Produces: no new exports — this is a fixture task.

Findings closed: **D9** (an AAPL position that exists nowhere in the dataset), **D10** (a birthday
that contradicts the DOB), **D11** (an 80% equity target that exists in no model), **D12** (a TLT
rotation out of a portfolio holding no TLT), **C33** (the proposal's fee illustration understates
tpl-001 by $5,250/yr), **Compliance §5.4** (the rollover claim that is quantitatively backwards),
and the terminology items at `nbas.ts:40`, `:144`, `:165`.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/nba-facts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { householdFees } from '@/mocks/data/billing'
import { getPositionsForAccount } from '@/mocks/data/positions'

function positionsFor(accountId: string) {
  const account = accounts.find((a) => a.id === accountId)!
  return getPositionsForAccount(account.id, account.totalValue)
}

describe('NBA narratives match the data', () => {
  it('D9: every security named in an NBA exists in the account it routes to', () => {
    const claims: { nbaId: string; accountId: string; symbol: string }[] = [
      { nbaId: 'nba-002', accountId: 'acc-002', symbol: 'INTC' },
      { nbaId: 'nba-003', accountId: 'acc-007', symbol: 'NVDA' },
      { nbaId: 'nba-006', accountId: 'acc-011', symbol: 'NVDA' },
    ]
    for (const claim of claims) {
      const symbols = positionsFor(claim.accountId).map((p) => p.symbol)
      expect(symbols, `${claim.nbaId} names ${claim.symbol}`).toContain(claim.symbol)
    }
  })

  it('D9: no NBA mentions AAPL founder shares', () => {
    for (const nba of nbas) {
      expect(nba.description.toLowerCase()).not.toContain('founder shares')
    }
  })

  it('D10: Michael Martinez turns 58 on the anniversary of 1968-12-07', () => {
    const dob = households.flatMap((h) => h.members).find((m) => m.name === 'Michael Martinez')!.dateOfBirth
    expect(dob).toBe('1968-12-07')
    const nba = nbas.find((n) => n.description.includes('Michael Martinez') && /turns \d+/.test(n.description))
    if (nba) expect(nba.description).toContain('7 December')
  })

  it('D11: the O’Brien 529 drift claim uses mod-006’s 55% equity target', () => {
    const nba = nbas.find((n) => n.description.includes('529'))
    if (nba) {
      expect(nba.description).not.toContain('80%')
      expect(nba.description).toContain('55%')
    }
  })

  it('D12: no NBA recommends rotating out of a security the household does not hold', () => {
    const anderson = ['acc-022', 'acc-023', 'acc-024', 'acc-025'].flatMap((id) => positionsFor(id).map((p) => p.symbol))
    const nba = nbas.find((n) => n.description.includes('Anderson') && n.description.includes('duration'))
    if (nba) {
      const named = [...nba.description.matchAll(/\b([A-Z]{2,5})\b/g)].map((m) => m[1]!)
        .filter((s) => !['IRA', 'ETF', 'SEC', 'RMD', 'AUM', 'IPS'].includes(s))
      for (const symbol of named) expect(anderson).toContain(symbol)
    }
  })
})

describe('Reg BI / DOL PTE 2020-02 rollover framing', () => {
  const rollover = nbas.find((n) => n.id === 'nba-014')!

  it('does not claim a rollover saves money when it adds cost', () => {
    expect(rollover.description).not.toMatch(/save[sd]?\s*~?\$?4,?800/i)
    expect(rollover.description.toLowerCase()).not.toContain('could save')
  })

  it('quotes the household’s actual advisory rate', () => {
    const williams = householdFees.find((f) => f.householdId === 'hh-003')!
    expect(williams.annualRate).toBe(0.0085)
    expect(rollover.description).toContain('0.85%')
  })

  it('shows both sides of the cost comparison and the added annual cost', () => {
    expect(rollover.description).toContain('0.45%')
    expect(rollover.description).toContain('$10,200')
    expect(rollover.description).toContain('$5,400')
    expect(rollover.description).toContain('$4,800')
  })

  it('names the disclosure obligation', () => {
    expect(rollover.description + rollover.suggestedAction).toContain('PTE 2020-02')
  })

  it('estimatedImpact is not the fee increase presented as a benefit', () => {
    expect(rollover.estimatedImpact).not.toBe(4_800)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/data/__tests__/nba-facts.test.ts`
Expected: FAIL on the rollover block and on `founder shares`.

- [ ] **Step 3: Correct the rollover NBA (Compliance §5.4)**

Replace `src/mocks/data/nbas.ts:183-194`:

```ts
  {
    id: 'nba-014', title: 'Held-away 401(k) review — Williams $1.2M',
    // Compliance §5.4 · reg-bi / fiduciary-standards / fee-disclosure / conflicts-of-interest —
    // this previously read "Consolidating could save ~$4,800/year in fees". The Williams household
    // is billed at 85 bps, so rolling $1.2M into an advisor-managed IRA ADDS roughly $10,200/year
    // against a plan cost of about $5,400 — a net increase of ~$4,800, not a saving. Rollover
    // recommendations are the exact fact pattern Reg BI's Care Obligation and DOL PTE 2020-02
    // target, and "you will save money" is the specific claim that gets cited.
    description: "David Williams holds $1.2M in a 401(k) at a former employer (Fidelity). Estimated plan cost is 0.45% ($5,400 a year); our schedule for this household is 0.85% ($10,200 a year), so a rollover would raise annual cost by about $4,800. Weigh that against consolidated tax management, household-level rebalancing and planning. Present both options, including leaving the assets in the plan.",
    category: 'growth', priority: 'medium',
    scoring: { urgency: 35, impact: 75, efficiency: 45, relationship: 65, confidence: 70, composite: 55 },
    clients: [{ id: 'cli-004', name: 'David Williams' }],
    trigger: { source: 'crm', condition: 'held_away_opportunity', value: '$1.2M at Fidelity 401(k)', detectedAt: '2026-02-10T08:00:00Z' },
    suggestedAction: 'Prepare a written rollover cost comparison and the PTE 2020-02 disclosure before any recommendation is made',
    estimatedImpact: 0,
    estimatedImpactNote: 'Not scored on revenue — a rollover recommendation must be evaluated on the client’s interest, not the fee it generates.',
    createdAt: '2026-02-10T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-004', openAI: true, aiMessage: 'Prepare a rollover cost comparison for David Williams: $1.2M 401(k) at Fidelity. Show plan cost against our schedule, list the non-fee considerations on both sides, and draft the PTE 2020-02 disclosure.' },
  },
```

Add `estimatedImpactNote?: string` to the `NBA` type in `src/types/nba.ts` and render it under the
impact figure in `src/components/ui/NBACard.tsx` when present.

- [ ] **Step 4: Correct the remaining NBA facts**

`nbas.ts:86-95` (**D9**) — the AAPL "founder shares" claim routes to `acc-007`, which has generated
positions containing no AAPL, and founder shares of Apple are not a thing. Re-point it at the real
concentration in the dataset:

```ts
    description: 'David Williams holds NVDA at 13.9% of his individual account (acc-011), against a 10% single-issuer IPS limit. A phased reduction paired with harvesting in correlated positions would bring it inside the limit while limiting the realised gain.',
```
and set `clients: [{ id: 'cli-004', name: 'David Williams' }]`,
`actionRoute: { path: '/portfolios/accounts/acc-011/concentration' }`.

`nbas.ts:97-105` (**D12**) — Anderson's accounts hold only AGG and BND, so there is no TLT to rotate
out of. Rewrite to name held securities:

```ts
    description: "Richard Anderson's fixed income is entirely AGG and BND, a blended effective duration of about 6.0 years against a 5.0-year target. Shortening with a short-duration sleeve would reduce rate sensitivity; estimate the tracking-error impact before trading.",
```

`nbas.ts:109-117` (**D10**) — `households.ts:53` gives DOB `1968-12-07`, so replace
`"turns 58 on March 1"` with `"turns 58 on 7 December"`.

`nbas.ts:265-273` (**D11**) — `acc-032` is on `mod-006`, whose equity target is 55% (45% US +
10% intl), not 80%. Replace the drift claim with `"drifted from its 55% equity target to 62%"`.

`nbas.ts:25` (**D22**) — the "$224K harvestable losses" figure conflates the gross realised loss with
the tax benefit. Append: `"Estimated tax benefit at long-term rates is about $53,300; the $224,000 is the harvestable loss, not the benefit."`

`nbas.ts:40` — "Her model targets 5% NVDA weight" claims a security-level target in an
asset-class-level model. Replace with `"Her IPS caps any single issuer at 10%."`

`nbas.ts:144` — "SEC best practice recommends annual IPS reviews" attributes a firm practice to a
regulator. Replace with `"Firm policy requires an annual IPS review."`

`nbas.ts:165` — "Compliance requires source-of-funds documentation for transactions over $100K"
states a federal threshold that does not exist. Replace with
`"Firm policy requires source-of-funds documentation above $100,000. The FinCEN investment-adviser AML programme rule took effect 1 January 2026."`

- [ ] **Step 5: Fix the proposal fee illustration (C33)**

`src/mocks/data/proposals.ts:218` hardcodes *"For a $5,000,000 portfolio, the blended annual fee would
be approximately $40,250 (0.805% blended rate)"* for every template. tpl-001's own tier table gives
$45,500 / 0.91% — a $5,250/yr understatement in a client-facing fee section. Compute it:

```ts
import { blendedTieredFee } from '@/lib/fees'
// …where the fee section is assembled, with `template.tiers` and `draft.clientData.householdAUM`
// in scope:
const basis = draft.clientData.householdAUM ?? 5_000_000
const { fee, blendedRate } = blendedTieredFee(basis, template.tiers)
// …
  `### Annual cost estimate`,
  ``,
  `Based on a portfolio value of ${formatCurrency(basis)}, the estimated annual advisory fee is ` +
  `${formatCurrency(fee)}, a blended rate of ${(blendedRate * 100).toFixed(3)}%. Fees are billed ` +
  `quarterly in advance on the average daily balance and are subject to the schedule above.`,
```

Also correct `proposals.ts:234`'s *"No additional trading commissions or transaction fees"* — the app
charges $4.95/equity trade, $0.65/option contract and $1.00/bond
(`trade-fields/shared.tsx:131-136`) and persists commission on every order (`oms.ts:109`). Replace
with: `"Transaction costs are charged separately by the custodian: $4.95 per equity or ETF trade, $0.65 per option contract and $1.00 per bond."`

- [ ] **Step 6: Run**

Run: `pnpm vitest run src/mocks/data/__tests__/nba-facts.test.ts src/lib/__tests__/fees.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/data/nbas.ts src/types/nba.ts src/components/ui/NBACard.tsx \
  src/mocks/data/proposals.ts src/mocks/handlers/proposals.ts \
  src/mocks/data/__tests__/nba-facts.test.ts
git commit -m "fix(nba): correct the rollover claim and the narrative facts

The rollover NBA claimed a \$4,800/yr saving on a move that adds \$4,800/yr at the
household's 85 bps; it now shows both sides and names PTE 2020-02. Also removes an
AAPL position that exists nowhere, a birthday contradicting its DOB, an 80% equity
target no model holds, and a TLT rotation from a portfolio holding no TLT.
Closes D9, D10, D11, D12, C33, Compliance 5.4."
```

---

### Task 20: `src/lib/bond-math.ts` — bond analytics that invert correctly

**Files:**
- Create: `src/lib/bond-math.ts`
- Create: `src/lib/__tests__/bond-math.test.ts`
- Modify: `src/mocks/data/trading.ts:52-64`
- Modify: `src/types/trading.ts` (`SymbolSearchResult`)

**Interfaces:**
- Consumes: `MOCK_TODAY_ISO` (Task 1).
- Produces:
  ```ts
  export function yearsToMaturity(maturityDate: string, asOf: string): number
  export function priceFromYield(ytmPct: number, couponPct: number, years: number, frequency?: number): number
  export function yieldToMaturity(price: number, couponPct: number, years: number, frequency?: number): number
  export function modifiedDuration(ytmPct: number, couponPct: number, years: number, frequency?: number): number
  ```

Findings closed: **C19** (a 2-year Treasury at a discount quoted with a YTM *below* its coupon —
the most basic relationship in fixed income, inverted on the first row of the bond list),
**C20** (the California GO ~100bp inconsistent), **C21** (`yieldToWorst === yieldToMaturity` on
every instrument including three long-dated callable municipals).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/bond-math.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { yieldToMaturity, priceFromYield, modifiedDuration, yearsToMaturity } from '@/lib/bond-math'

describe('yearsToMaturity', () => {
  it('measures from the frozen clock', () => {
    expect(yearsToMaturity('2028-02-28', '2026-02-25')).toBeCloseTo(2.01, 2)
  })
})

describe('price / yield inversion', () => {
  it('round-trips: price(ytm(p)) === p', () => {
    const p = 97.5
    expect(priceFromYield(yieldToMaturity(p, 3.85, 2.37), 3.85, 2.37)).toBeCloseTo(p, 4)
  })

  it('C19: a bond below par must yield more than its coupon', () => {
    // UST-2Y: price 99.45, coupon 4.625%, 2.01 years. The fixture stated 4.35%.
    const ytm = yieldToMaturity(99.45, 4.625, 2.01)
    expect(ytm).toBeGreaterThan(4.625)
    expect(ytm).toBeCloseTo(4.92, 2)
  })

  it('C20: a bond above par must yield less than its coupon', () => {
    // CA-GO-32: price 105.25, coupon 5.00%, 6.60 years. The fixture stated 3.25%.
    const ytm = yieldToMaturity(105.25, 5.0, 6.6)
    expect(ytm).toBeLessThan(5.0)
    expect(ytm).toBeCloseTo(4.07, 2)
  })

  it('prices at par when yield equals coupon', () => {
    expect(priceFromYield(4.0, 4.0, 10)).toBeCloseTo(100, 6)
  })

  it('C19: the whole fixture list now satisfies the price/coupon/yield relationship', () => {
    const bonds: [number, number, number][] = [
      [99.45, 4.625, 2.01], [97.88, 4.250, 4.97], [95.25, 4.000, 9.97], [88.50, 4.375, 29.97],
      [94.75, 3.000, 4.31], [91.20, 2.400, 5.45], [98.80, 4.250, 3.60], [97.50, 3.850, 2.37],
      [105.25, 5.000, 6.60], [102.75, 4.500, 4.05], [103.50, 4.750, 7.43], [96.80, 3.500, 2.55],
    ]
    for (const [price, coupon, years] of bonds) {
      const ytm = yieldToMaturity(price, coupon, years)
      if (price < 100) expect(ytm).toBeGreaterThan(coupon)
      if (price > 100) expect(ytm).toBeLessThan(coupon)
    }
  })
})

describe('modifiedDuration', () => {
  it('UST-10Y at a 4.60% yield has a modified duration of about 8.08 years', () => {
    expect(modifiedDuration(4.60, 4.0, 9.97)).toBeCloseTo(8.08, 1)
  })

  it('rises with maturity', () => {
    expect(modifiedDuration(4.5, 4.0, 30)).toBeGreaterThan(modifiedDuration(4.5, 4.0, 2))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/bond-math.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/bond-math"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/bond-math.ts`:

```ts
/**
 * C19 · fixed-income-sovereign — the 2-year Treasury was quoted at 99.45 with a 4.625% coupon and
 * a stated 4.35% yield. A bond trading at a discount must yield MORE than its coupon; the correct
 * figure is 4.92%. C20 · fixed-income-municipal — the same inversion, opposite sign, on CA-GO-32.
 *
 * Semiannual compounding, whole coupon periods, no accrued interest — stated so the simplification
 * is visible rather than implied.
 */
const DAYS_PER_YEAR = 365.25

export function yearsToMaturity(maturityDate: string, asOf: string): number {
  const ms = new Date(`${maturityDate}T00:00:00Z`).getTime() - new Date(`${asOf}T00:00:00Z`).getTime()
  return ms / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000)
}

/** Clean price per 100 of par. */
export function priceFromYield(
  ytmPct: number, couponPct: number, years: number, frequency = 2,
): number {
  const periods = Math.max(1, Math.round(years * frequency))
  const couponPerPeriod = couponPct / frequency
  const yieldPerPeriod = ytmPct / frequency / 100
  let price = 0
  for (let t = 1; t <= periods; t++) price += couponPerPeriod / (1 + yieldPerPeriod) ** t
  return price + 100 / (1 + yieldPerPeriod) ** periods
}

/** Bisection — monotonic in yield, so 200 iterations is exact to ~1e-10. */
export function yieldToMaturity(
  price: number, couponPct: number, years: number, frequency = 2,
): number {
  let lo = 0.0001
  let hi = 40
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (priceFromYield(mid, couponPct, years, frequency) > price) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function modifiedDuration(
  ytmPct: number, couponPct: number, years: number, frequency = 2,
): number {
  const periods = Math.max(1, Math.round(years * frequency))
  const couponPerPeriod = couponPct / frequency
  const yieldPerPeriod = ytmPct / frequency / 100
  const price = priceFromYield(ytmPct, couponPct, years, frequency)
  let weighted = 0
  for (let t = 1; t <= periods; t++) {
    weighted += (t / frequency) * (couponPerPeriod / (1 + yieldPerPeriod) ** t)
  }
  weighted += years * (100 / (1 + yieldPerPeriod) ** periods)
  return (weighted / price) / (1 + yieldPerPeriod)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/bond-math.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Derive the bond fixtures**

In `src/mocks/data/trading.ts`, keep `lastPrice`, `couponRate`, `maturityDate`, `cusip`,
`creditRating`, `parValue`, `issuer` and `bondType` as leaf data and derive the analytics:

```ts
import { yieldToMaturity, modifiedDuration, yearsToMaturity } from '@/lib/bond-math'
import { MOCK_TODAY_ISO } from '@/lib/clock'

type BondFixture = Omit<SymbolSearchResult, 'yieldToMaturity' | 'yieldToWorst' | 'duration'>

const bondFixtures: BondFixture[] = [
  // …the twelve existing rows, with yieldToMaturity, yieldToWorst and duration removed
]

/**
 * C21 · fixed-income-municipal — `yieldToWorst` was identical to `yieldToMaturity` on every
 * instrument including three long-dated municipals, and YTW is the entire reason the field exists.
 * No call schedule is modelled, so the field is omitted rather than quoted as a duplicate.
 */
export const fixedIncomeSymbols: SymbolSearchResult[] = bondFixtures.map((b) => {
  const years = yearsToMaturity(b.maturityDate!, MOCK_TODAY_ISO)
  const ytm = yieldToMaturity(b.lastPrice, b.couponRate!, years)
  return {
    ...b,
    yieldToMaturity: Math.round(ytm * 100) / 100,
    duration: Math.round(modifiedDuration(ytm, b.couponRate!, years) * 100) / 100,
  }
})
```

Make `yieldToWorst` optional in `src/types/trading.ts` and hide the row in the bond-details card when
it is absent (`grep -rn "yieldToWorst" src/features`).

- [ ] **Step 6: Run**

Run: `pnpm type-check && pnpm test:run 2>&1 | tail -5`
Expected: green apart from the outstanding gate items.

- [ ] **Step 7: Commit**

```bash
git add src/lib/bond-math.ts src/lib/__tests__/bond-math.test.ts \
  src/mocks/data/trading.ts src/types/trading.ts src/features/portfolios/trade-fields
git commit -m "fix(fixed-income): derive YTM and duration from price, coupon and maturity

The 2-year Treasury quoted a 4.35% yield on a 99.45 price with a 4.625% coupon; a
discount bond must yield more than its coupon (4.92%). Yield-to-worst is dropped
rather than duplicated. Closes C19, C20, C21."
```

---

### Task 21: Drift bands come from the model

**Files:**
- Modify: `src/mocks/handlers/pms.ts:126-171,444-446`
- Modify: `src/types/portfolio.ts` (`DriftStatus`)
- Modify: `src/features/portfolios/rebalance/SelectAccountsStep.tsx:88-100,163`
- Modify: `src/features/portfolios/RebalancePage.tsx:50`
- Modify: `src/mocks/handlers/__tests__/drift-invariants.test.ts`

**Interfaces:**
- Consumes: `MODEL_GOVERNANCE` `driftTolerance` values already present in `pms.ts:490,533,562,590,605,647,662`.
- Produces:
  ```ts
  // DriftStatus gains:
  //   modelId: string
  //   driftTolerance: number        // the model's own band
  //   rebalanceFrequency: string
  // assetClassDrifts[].drift keeps its sign (over- vs under-weight)
  ```

Findings closed: **C24** (a hardcoded 3% threshold while the model library defines per-model bands of
3%/5%/7% that nothing ever read, and drift stored as `Math.abs` discarding direction),
**C25** (the "Drift threshold %" control is decorative — the value is passed to the API and never read,
and the empty state tells the user to adjust a control that cannot change the result).

- [ ] **Step 1: Write the failing test**

Replace the failing `totalDrift === sum(drifts) / 2` test in
`src/mocks/handlers/__tests__/drift-invariants.test.ts` and add:

```ts
  it('C24: needsRebalance uses the account model own band, not a hardcoded 3%', async () => {
    const drifts = await getDriftSummary()
    for (const d of drifts) {
      expect(d.driftTolerance).toBeGreaterThan(0)
      const maxAbs = Math.max(...d.assetClassDrifts.map((a) => Math.abs(a.drift)))
      expect(d.needsRebalance).toBe(maxAbs > d.driftTolerance)
    }
  })

  it('C24: models with different bands are not treated identically', async () => {
    const drifts = await getDriftSummary()
    const tolerances = new Set(drifts.map((d) => d.driftTolerance))
    expect(tolerances.size).toBeGreaterThan(1)
    expect(tolerances).toContain(0.03)
    expect(tolerances).toContain(0.07)
  })

  it('C24: drift keeps its sign, so overweight and underweight are distinguishable', async () => {
    const drift = await getDrift('acc-001')
    expect(drift.assetClassDrifts.some((a) => a.drift > 0)).toBe(true)
    expect(drift.assetClassDrifts.some((a) => a.drift < 0)).toBe(true)
    for (const a of drift.assetClassDrifts) {
      expect(a.drift).toBeCloseTo(a.actual - a.target, 6)
    }
  })

  it('signed drifts sum to approximately zero — every overweight is someone else underweight', async () => {
    const drift = await getDrift('acc-001')
    expect(drift.assetClassDrifts.reduce((s, a) => s + a.drift, 0)).toBeCloseTo(0, 2)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/drift-invariants.test.ts`
Expected: FAIL — `d.driftTolerance` is `undefined`.

- [ ] **Step 3: Read the model's band**

In `src/mocks/handlers/pms.ts`, promote the per-model governance settings out of the governance
handler so both consumers share one source, then rewrite `computeDriftForAccount` (lines 143–171):

```ts
/** C24 · rebalancing — these were defined per model and displayed on Model Governance, but the
 *  rebalance engine never read them; a 7%-band model was treated identically to a 3%-band one. */
const MODEL_BANDS: Record<string, { driftTolerance: number; rebalanceFrequency: string }> = {
  'mod-001': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
  'mod-002': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
  'mod-003': { driftTolerance: 0.03, rebalanceFrequency: 'quarterly' },
  'mod-004': { driftTolerance: 0.07, rebalanceFrequency: 'threshold_only' },
  'mod-005': { driftTolerance: 0.05, rebalanceFrequency: 'monthly' },
  'mod-006': { driftTolerance: 0.05, rebalanceFrequency: 'semi_annual' },
  'mod-007': { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' },
}

function computeDriftForAccount(account: typeof accounts[0]): DriftStatus {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const modelId = account.modelId ?? 'mod-001'
  const targets = getModelTargets(modelId)
  const band = MODEL_BANDS[modelId] ?? { driftTolerance: 0.05, rebalanceFrequency: 'quarterly' }

  const totalWeight = positions.reduce((s, p) => s + p.weight, 0) || 1
  const actualWeights = new Map<string, number>()
  for (const pos of positions) {
    actualWeights.set(pos.assetClass, (actualWeights.get(pos.assetClass) ?? 0) + pos.weight / totalWeight)
  }

  const allClasses = new Set([...Object.keys(targets), ...actualWeights.keys()])
  const assetClassDrifts: DriftStatus['assetClassDrifts'] = [...allClasses]
    .map((ac) => {
      const actual = actualWeights.get(ac) ?? 0
      const target = targets[ac] ?? 0
      // C24 — signed, so the UI can say "overweight" or "underweight" rather than "drifted".
      return { assetClass: ac as DriftStatus['assetClassDrifts'][0]['assetClass'], target, actual, drift: roundTo(actual - target, 4) }
    })
    .filter((d) => d.target > 0 || d.actual > 0)

  const maxAbsDrift = roundTo(Math.max(...assetClassDrifts.map((d) => Math.abs(d.drift)), 0), 4)

  return {
    accountId: account.id,
    modelId,
    driftTolerance: band.driftTolerance,
    rebalanceFrequency: band.rebalanceFrequency,
    totalDrift: maxAbsDrift,
    assetClassDrifts,
    lastCalculated: MOCK_NOW_ISO,
    needsRebalance: maxAbsDrift > band.driftTolerance,
  }
}
```

Have the governance handler read `MODEL_BANDS[id]` rather than repeating the literals.

- [ ] **Step 4: Make the threshold control work (C25)**

`src/features/portfolios/rebalance/SelectAccountsStep.tsx:88-100` filters on the server's fixed
`needsRebalance` boolean, ignoring the entered threshold. Filter client-side:

```tsx
  const eligible = useMemo(() => {
    if (!accounts || !driftMap) return []
    return accounts.filter((a) => {
      const drift = driftMap.get(a.id)
      if (!drift) return false
      // C25 · rebalancing — the entered threshold overrides the model band when it is stricter,
      // so the control the empty state tells the user to adjust actually adjusts the selection.
      const band = Math.min(drift.driftTolerance, driftThreshold / 100)
      return drift.totalDrift > band
    })
  }, [accounts, driftMap, driftThreshold])
```

Update the empty state at `:163` to name the effective band:

```tsx
        No account exceeds a {driftThreshold.toFixed(1)}% band. Each account is also evaluated
        against its own model tolerance. Raise the threshold to widen the selection.
```

In `src/features/portfolios/RebalancePage.tsx:50`, keep passing `driftThreshold` to the API but stop
relying on it there; the filter is now local.

- [ ] **Step 5: Show the band on screen**

In the drift column of `src/features/portfolios/portfolio-views/columns.tsx`, render the sign and the
band: `{drift.totalDrift > 0 ? '+' : ''}{(drift.totalDrift * 100).toFixed(1)}% / ±{(drift.driftTolerance * 100).toFixed(1)}%`.

- [ ] **Step 6: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/drift-invariants.test.ts`
Expected: PASS, including the previously failing `totalDrift` and `actual weights sum to 1.0` tests
(normalisation in Step 3 fixes the latter for `acc-045`).

- [ ] **Step 7: Commit**

```bash
git add src/mocks/handlers/pms.ts src/types/portfolio.ts src/features/portfolios \
  src/mocks/handlers/__tests__/drift-invariants.test.ts
git commit -m "fix(rebalance): evaluate drift against each model own band; keep drift signed

driftTolerance was defined per model (3%/5%/7%) and displayed on Model Governance,
but the engine used a hardcoded 3%. The threshold control was decorative.
Closes C24, C25."
```

---

### Task 22: Pre-trade and rebalance arithmetic

**Files:**
- Modify: `src/mocks/handlers/oms.ts:33-45,116-186`
- Modify: `src/features/portfolios/TradeTicketDialog.tsx:106`
- Modify: `src/features/portfolios/SingleTradeView.tsx` (call `usePreTradeCheck`)
- Create: `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts`

**Interfaces:**
- Consumes: `accounts`, `getPositionsForAccount`, `accountValueUSD` (Task 2),
  `securityKind`, `concentrationLimitFor` (Task 11), `estimatedTaxBenefit` and the lot generator (Tasks 13, 15).
- Produces:
  ```ts
  // PreTradeCheckRequest gains a required `estimatedValue: number`
  // Violation.currentValue is computed against the account's own market value
  ```

Findings closed: **C27** (every account's weight computed against a hardcoded `2_500_000`
denominator, so a $600K trade in the $12M Chen Trust reported 24% and blocked, while a $100K trade in
Nancy Taylor's $100K account reported 4%), **C28** (the dialog sends no notional so the handler falls
back to `quantity * 100`, making concentration limits evadable by trading high-priced securities),
**C26** (`taxImpact: taxAware ? 3_800 : 0` — unchecking "tax-aware" displayed $0 estimated tax, so the
riskier setting looked free).

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { preTradeCheck, previewRebalance } from '@/services/oms'

describe('pre-trade concentration uses the account own value', () => {
  it('C27: a $600K trade is 5% of the $12M Chen Trust, not 24%', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 2_234, estimatedValue: 600_000,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))
    if (concentration) {
      expect(Number(concentration.currentValue.replace('%', ''))).toBeCloseTo(5.0, 1)
      expect(concentration.severity).not.toBe('block')
    }
    expect(result.passed).toBe(true)
  })

  it('C27: a $100K trade is 100% of Nancy Taylor $100K account and blocks', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-040', symbol: 'NVDA', side: 'buy', quantity: 128, estimatedValue: 100_000,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))!
    expect(Number(concentration.currentValue.replace('%', ''))).toBeGreaterThan(90)
    expect(concentration.severity).toBe('block')
    expect(result.passed).toBe(false)
  })

  it('C28: an order without a notional is rejected rather than valued at quantity x 100', async () => {
    await expect(preTradeCheck({
      accountId: 'acc-001', symbol: 'NVDA', side: 'buy', quantity: 100,
    } as never)).rejects.toThrow()
  })

  it('C23: a fund purchase is measured against the fund limit, not the single-issuer limit', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 1_000, estimatedValue: 268_500,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))
    expect(concentration?.limit ?? '35.0%').toBe('35.0%')
  })
})

describe('rebalance tax estimation', () => {
  it('C26: turning tax-awareness off does not make the estimated tax zero', async () => {
    const aware = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    const unaware = await previewRebalance({ accountIds: ['acc-001'], taxAware: false })
    expect(unaware[0]!.estimatedTaxImpact).toBeGreaterThan(0)
    expect(unaware[0]!.estimatedTaxImpact).toBeGreaterThanOrEqual(aware[0]!.estimatedTaxImpact)
  })

  it('C26: the preview total equals the sum of its trade-level tax impacts', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    expect(preview!.estimatedTaxImpact)
      .toBeCloseTo(preview!.trades.reduce((s, t) => s + t.taxImpact, 0), 0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/mocks/handlers/__tests__/pre-trade-invariants.test.ts`
Expected: FAIL — the Chen Trust trade reports 24% and blocks.

- [ ] **Step 3: Compute against the real account**

Replace the concentration and sector blocks in `src/mocks/handlers/oms.ts:116-186`:

```ts
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { accountValueUSD } from '@/lib/aum'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import { FX_RATES_USD_BASE } from '../data/currencies'

  http.post('/api/oms/orders/pre-check', async ({ request }) => {
    const body = await request.json() as PreTradeCheckRequest
    const violations: PreTradeViolation[] = []
    const sym = body.symbol.toUpperCase()

    // C28 · pre-trade-compliance / order-lifecycle — notional is required. Inferring it from
    // `quantity * 100` valued a 100-share order in a $900 stock at $10,000 instead of $90,000,
    // so concentration limits were evadable by trading high-priced securities.
    if (typeof body.estimatedValue !== 'number' || !Number.isFinite(body.estimatedValue)) {
      return HttpResponse.json(
        { error: 'estimatedValue (notional) is required for a pre-trade check' },
        { status: 400 },
      )
    }
    const estValue = body.estimatedValue

    const account = accounts.find((a) => a.id === body.accountId)
    if (!account) return notFound()
    // C27 · pre-trade-compliance — the account's own market value, not a hardcoded $2,500,000.
    const accountValue = accountValueUSD(account, FX_RATES_USD_BASE)
    const positions = getPositionsForAccount(account.id, account.totalValue)
    const existing = positions.find((p) => p.symbol === sym)?.marketValue ?? 0

    const kind = securityKind(sym, positions.find((p) => p.symbol === sym)?.assetClass ?? 'us_equity')
    const limit = concentrationLimitFor(kind)
    const postTradeWeight = (existing + (body.side.startsWith('buy') || body.side === 'purchase' ? estValue : -estValue)) / accountValue

    if (postTradeWeight > limit * 0.8) {
      violations.push({
        constraint: kind === 'single_name' ? 'Single-issuer concentration limit' : 'Pooled-vehicle concentration limit',
        severity: postTradeWeight > limit ? 'block' : 'warning',
        currentValue: `${(postTradeWeight * 100).toFixed(1)}%`,
        limit: `${(limit * 100).toFixed(1)}%`,
        message: `${sym} would be ${(postTradeWeight * 100).toFixed(1)}% of this account against a ${(limit * 100).toFixed(1)}% IPS limit.`,
      })
    }
```

Replace the sector block's literal `'38.2%'` with the account's actual technology exposure computed
from `positions` (sum the `marketValue` of positions whose symbol is in a `TECH_SYMBOLS` set, over
`accountValue`), and the cash block's literal `'2.8%'` with
`(account.cashBalance / accountValue * 100).toFixed(1)`.

- [ ] **Step 4: Always send the notional**

`src/features/portfolios/TradeTicketDialog.tsx:106` — add `estimatedValue` to the request:

```tsx
    preTradeCheck.mutate({
      accountId, symbol, side, quantity,
      estimatedValue: quantity * (limitPrice ?? quote?.lastPrice ?? 0),
    })
```

`src/features/portfolios/SingleTradeView.tsx` — this is the only screen that can place options, bonds,
funds and crypto, and it never calls `usePreTradeCheck` at all, so the stricter surface is the
unchecked one. Add the same call on submit, and render its violations above the submit button using
the existing violation component from `TradeTicketDialog`.

- [ ] **Step 5: Estimate rebalance tax from lots**

Replace `generateRebalanceTrades` (`oms.ts:33-45`):

```ts
/**
 * C26 · rebalancing / tax-efficiency — `taxImpact: taxAware ? 3_800 : 0` made the riskier setting
 * display as free. Tax is estimated from the account's actual embedded gain at the applicable rate;
 * a tax-unaware rebalance realises MORE, never zero.
 */
function generateRebalanceTrades(accountId: string, taxAware: boolean): ProposedTrade[] {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return []
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account)

  return drift.assetClassDrifts
    .filter((d) => Math.abs(d.drift) > 0.005)
    .flatMap((d) => {
      const candidates = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH')
      const target = candidates[0]
      if (!target) return []
      const notional = Math.abs(d.drift) * account.totalValue
      const side = d.drift > 0 ? 'sell' : 'buy'
      // Realised gain on a sell = notional x the position's embedded gain fraction. A tax-aware
      // pass selects the highest-basis lots and realises roughly 40% of the naive figure.
      const embeddedGainFraction = target.costBasis > 0 ? target.gainLoss / target.marketValue : 0
      const realised = side === 'sell' ? notional * embeddedGainFraction : 0
      const rate = 0.238
      const taxImpact = Math.max(0, Math.round(realised * rate * (taxAware ? 0.4 : 1)))
      return [{
        symbol: target.symbol,
        name: target.name,
        side,
        quantity: Math.round(notional / target.price),
        estimatedValue: Math.round(notional),
        taxImpact,
        washSaleRisk: false,
      }]
    })
}
```

and set the preview's `estimatedTaxImpact` to `trades.reduce((s, t) => s + t.taxImpact, 0)` in both
places it is currently a literal (`oms.ts:37,44,193`), removing the `×5` scaling hack for
`acc-001`/`acc-006` that left `estimatedTaxImpact` at 3,800 while the trades were multiplied.

- [ ] **Step 6: Run**

Run: `pnpm vitest run src/mocks/handlers/__tests__/pre-trade-invariants.test.ts && pnpm type-check`
Expected: PASS — 6 tests.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/handlers/oms.ts src/features/portfolios/TradeTicketDialog.tsx \
  src/features/portfolios/SingleTradeView.tsx \
  src/mocks/handlers/__tests__/pre-trade-invariants.test.ts
git commit -m "fix(oms): pre-trade checks use the account's own value and a required notional

Every account's concentration was computed against a hardcoded \$2,500,000, and the
dialog sent no notional so the handler valued orders at quantity x 100. Rebalance
tax is estimated from embedded gains, so tax-unaware is never \$0. Closes C26, C27, C28."
```

---

### Task 23: The phase gate

**Files:**
- Create: `docs/superpowers/reference/phase-1-deferred-findings.md`
- Modify: `src/mocks/data/__tests__/rollup-invariants.test.ts` (no change expected — it must pass as written)

**Interfaces:**
- Consumes: everything.
- Produces: a green build and an auditable register of what was deliberately not done.

- [ ] **Step 1: Run the gate**

Run: `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts`
Expected: **PASS — every assertion.** If any fails, do not weaken the test; fix the derivation. The
gate is the phase's definition of done.

- [ ] **Step 2: Run the full suite green**

Run: `pnpm type-check && pnpm lint && pnpm test:run`
Expected: `tsc` clean, `eslint --max-warnings 0` clean, and **zero failing tests** — the 14 baseline
failures are all resolved by Tasks 4, 18 and 21.

- [ ] **Step 3: Prove no contradictory figure survives**

Run:
```bash
# No hardcoded aggregate AUM anywhere
grep -rn "91_300_000\|102_450_000\|99_855_000\|107_055_000\|105_920_000" src --include="*.ts" --include="*.tsx" | grep -v __tests__
# No hand-typed household or client AUM
grep -rn "managedAUM: [0-9_]" src/mocks/data
grep -rn "totalAUM: [0-9_]" src/mocks/data | grep -v "minAUM"
# The fee unit error is gone
grep -rn "effectiveFee\b" src | grep -v effectiveFeeBps
grep -rn "0.85 bps\|{data.effectiveFee} bps" src
# One clock
grep -rn "new Date('2026-\|new Date(\"2026-" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "src/lib/clock.ts"
# No 30-day wash sale label
grep -rn "30-Day Wash\|30-day wash\|30 day wash" src -i
# No flat 37% applied without a holding-period branch
grep -rn "\* 0.37" src --include="*.tsx" | grep -v "tax/shared"
```
Expected: every one produces no output.

- [ ] **Step 4: Ask Codex for an adversarial pass**

Per the roadmap's *Codex usage* §2 — Codex reviews the corrected finance logic; it does not author it.
Run the `codex:rescue` skill with this prompt:

> Read `docs/superpowers/reference/critique-finance.md` findings C2, C3, C4, C5, C10, C11, C12, C23,
> C24, C26, C27, C28, C29. Then read `src/lib/aum.ts`, `src/lib/fees.ts`, `src/lib/risk-model.ts`,
> `src/lib/bond-math.ts`, `src/lib/security-master.ts`, `src/mocks/data/realised-sales.ts`, and the
> risk, attribution, concentration, drift and book-of-business handlers in
> `src/mocks/handlers/pms.ts`. For each finding, state whether the fix is correct, incomplete, or
> introduces a new error. Check the arithmetic independently — do not take the comments at their
> word. Report as a table: finding, verdict, evidence. Do not edit any file.

Record its verdicts. Any "incorrect" verdict becomes a follow-up commit before the phase closes.

- [ ] **Step 5: Write the deferred register**

Create `docs/superpowers/reference/phase-1-deferred-findings.md`:

```markdown
# Phase 1 — deferred findings

Every Critical and High finding in `critique-finance.md` is either closed by a Phase 1 task or listed
here with a reason and a named destination phase. Medium and Low findings not listed are out of scope
for this phase by design.

## Deferred Critical

| # | Finding | Reason | Destination |
| --- | --- | --- | --- |
| Compliance §5.1 | Monte Carlo, stress and sensitivity shown with no hypothetical-performance disclosure (SEC Marketing Rule 206(4)-1(d)(6)) | Phase 1 made the numbers internally consistent and added assumption labels; the *disclosure register* (`net of fees`, `gross of fees`, `estimated`, `as of`) is Phase 2's named deliverable and must land as one system, not per-screen | Phase 2 |
| Compliance §5.2 | `proposals.ts:120` "improve expected annual return by approximately 40-80 basis points" — a hardcoded, unsupported performance claim in a client-facing document | Removing it is a copy decision the roadmap assigns to Phase 6, which also owns `proposals.ts:51`'s "historically outperforms over 15+ year horizons". Grounding it instead would require a capital-market assumption set that does not exist in the repo | Phase 6 |

## Deferred High

| # | Finding | Reason | Destination |
| --- | --- | --- | --- |
| C1 (partial) | Multi-period attribution requires geometric linking (Carino / Menchero / GRAP) | Phase 1 removed the arithmetic scale-factor stretch and labelled the model as single-period. Full sub-period geometric linking needs a period return series per asset class, which the fixture layer does not carry | Phase 5 (chart system) |
| C15 | Option gamma is inverted — minimised at the money, maximised in the wings | Requires a Black-Scholes surface; `trading.ts` options are a self-contained module that no Phase 1 roll-up consumes | Phase 7 |
| C16 | Option theta understated ~17× | Same module, same reason | Phase 7 |
| C31 | Risk profiling averages capacity and tolerance into one score, so a short-horizon client can be scored Aggressive | Needs a suitability model with hard constraints and a binding from the recommended model string to a real `mod-00N` id — a new entity, not an arithmetic fix | Phase 7 |
| D7 | `acc-041`/`acc-043`/`acc-044` (Hong Kong, European, Swiss) sit on US-benchmarked models and breach drift permanently | Requires new model definitions with international benchmarks plus governance versions for each — new entities | Phase 7 |
| D8 | `acc-045` (100% spot crypto) on `mod-002` Growth, giving 90.5% drift on `digital_assets` | Same: needs a digital-asset model in the library | Phase 7 |
| Compliance §5.3 | Performance shown without gross/net labelling or an as-of date | Phase 1 added `asOf` to the risk, attribution and book payloads; the *register* that renders them consistently is Phase 2 | Phase 2 |
| Compliance §5.6 | `cr-001` / `cr-002` / `cr-005` suitability rules are unimplemented, so no code path can produce `'fail'` and the finalisation gate is unconditionally open | Requires the IPS entity the app references but does not have, plus a gate redesign | Phase 7 |
| Compliance §5.7 | AI output is not written to the WORM archive | The roadmap assigns "Surface the WORM Books & Records Archive" and AI accountability to Phase 7 | Phase 7 |
| Compliance §5.8 | Batch NBA dismissal skips the `nonDismissible` / `supervisorOverride` check and writes no audit trail | Roadmap assigns AI accountability and undo to Phase 7 | Phase 7 |

## Coverage summary

`critique-finance.md` reports 26 Critical and 32 High findings.

- **Critical:** 24 closed in Phase 1, 2 deferred (both to roadmap-assigned phases).
- **High:** 23 closed in Phase 1, 9 deferred.
- **Total Critical + High:** 47 of 58 closed; 11 deferred with a named destination.
```

- [ ] **Step 6: Final verification**

Run: `pnpm type-check && pnpm lint && pnpm test:run 2>&1 | tail -5`
Expected: zero failures. Record the final test count in the commit message.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/reference/phase-1-deferred-findings.md
git commit -m "docs: Phase 1 deferred-findings register

47 of 58 Critical and High finance findings closed; 11 deferred with reasons and
destination phases. Gate green: every roll-up equals the sum of its parts."
```

---

## Self-review

**1. Spec coverage.** Each of the thirteen roadmap scope items maps to a task:

| Roadmap scope item | Task |
| --- | --- |
| 1. Copy reference material | Already done — excluded per brief |
| 2. One source of truth for AUM; derived `managedAUM`; mixed-currency fix | 2, 4 |
| 3. Reconcile the four Total AUM values | 4, 5, 6 |
| 4. Fee unit error; three fee numbers → one asset-weighted | 7, 8 |
| 5. Per-account risk; horizon/confidence/method; Sharpe | 9, 10 |
| 6. Concentration with fund look-through | 11 |
| 7. Wash sale: anchor, 61-day label, 37% flat, `washSaleRestricted` hardcode | 13, 14, 15 |
| 8. Brinson interaction term | 12 |
| 9. `ALLOCATION_TEMPLATES` / `CLIENT_ALLOCATION` | 16 |
| 10. One clock | 1 |
| 11. Contradictory counts | 17 |
| 12. Reg BI / DOL PTE 2020-02 rollover | 19 |
| 13. Revenue Trend flatline; AUM waterfall baseline | 8, 5 |

The gate the roadmap names ("a property test asserts every roll-up equals the sum of its parts") is
Task 3, written third and failing until Task 22. The Codex adversarial pass the roadmap names is
Task 23 Step 4. `critique-ux.md`'s four-conflicting-AUM, broken Revenue Trend and AUM waterfall
findings are Tasks 4/5/6 and 8. `critique-content.md`'s contradictory counts and four "todays" are
Tasks 17 and 1.

**2. Placeholder scan.** No "TBD", no "implement later", no "similar to Task N", no
"add appropriate error handling". Every code step carries the actual code. Every test assertion
carries a real expected value computed from the fixtures — `30_308_018`, `91_320_824`, `76.4`,
`697_466`, `1828`, `4_435`, `364_083`, `515_140`, `0.63`, `0.0935`, `4.92`, `4.07`, `68_535`,
`69_563`, `53_312`, `3_700`, `2_380`.

Two steps deliberately describe a *procedure* rather than a literal because the output is 30+ numeric
edits: Task 18 Step 2 (scaling `acc-002` / `acc-029` positions) and Task 18 Step 8 (the price table).
Both give the exact scaling factor, the rounding order and the invariant the gate will check, so the
result is determinate.

**3. Type consistency.** Cross-checked:

- `deriveHouseholdAUM(householdId, accounts, rates)` — same signature in Tasks 2, 4, 5, 6, 7.
- `accountValueUSD(account, rates)` — Tasks 2, 5, 6, 10, 22.
- `assetWeightedEffectiveFee(rows: { aum, annualFee }[])` returns **basis points** — Tasks 7, 5.
  The consumer in Task 5 does not multiply by 10,000 again.
- `effectiveFeeBps` (not `effectiveFee`) — Tasks 5, 7, and the grep in Task 23 Step 3.
- `concentrationHHI` / `concentrationEffectiveN` on `BookOfBusiness` (replacing
  `revenueConcentrationHHI`) — Task 5; the account-level summary uses `herfindahlIndex` /
  `effectiveN` — Task 11. Both are the 0–10,000 scale.
- `riskProfileFor(account)` is defined in Task 10 and reused in Task 12; Task 12 also extracts
  `attributionFor(account, years)` shared by the attribution and benchmark handlers.
- `BenchmarkComparison.activeReturn` (not `alpha`), with `trackingError` moved to `RiskMetrics` —
  declared in Task 10, consumed in Tasks 10 and 12.
- `washSaleWindow(saleDate)` / `openWashSaleWindows(asOf, householdId?)` — Task 14, consumed in
  Tasks 13 (via `custodian.ts`) and 17.
- `estimatedTaxBenefit(lot)` / `taxRateFor` / `SHORT_TERM_RATE` / `LONG_TERM_RATE` — Task 15,
  consumed in Task 17.
- `securityKind(symbol, assetClass)` / `concentrationLimitFor(kind)` — Task 11, consumed in Task 22.
- `computeWaterfallDomain(bars, padFraction?)` with `WaterfallBar.kind` — Task 5 only.
- `MOCK_NOW_ISO` / `MOCK_TODAY_ISO` / `now()` / `startOfToday()` — Task 1, consumed in Tasks 5, 10,
  13, 14, 17, 18, 20, 21.
- `HouseholdFixture` (Task 4) and `ClientFixture` (Task 6) are both `Omit<…>` of their API type, and
  both files keep the original export name (`households`, `clients`) so no call site changes.

One ordering dependency worth flagging to the executor: **Task 13 references
`realisedSales`, which Task 14 creates.** Task 13 ships `washSaleRestricted: false` with a comment
pointing at Task 14, and Task 14 replaces it. Executing 13 before 14 is therefore safe; executing 14
first would leave Task 13's test for `washSaleRestricted` unsatisfied until 13 lands.
