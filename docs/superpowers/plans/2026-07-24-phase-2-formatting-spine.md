> **Superseded 11 October 2026.** Meridian was replaced as the design target. Phases 1 and 1b (data integrity) and the tabular-figures utility shipped; the remaining phases are replaced by `docs/superpowers/specs/2026-10-11-workspace-roadmap.md`. Kept for history.

# Phase 2 — The Formatting Spine: Implementation Plan

> ## PRE-FLIGHT CORRECTIONS — read before Task 1
>
> This plan was authored on 2026-07-24, **before Phase 1b** (10 tasks, 29 commits, `d5cd505..8a87ffe`).
> Phase 1b changed the render surface substantially. Audited against the live tree at `8a87ffe`;
> where this block disagrees with the plan below, **this block governs.**
>
> **1. The 218 figure is the count of sites needing an INDIVIDUAL edit, and it excludes a separate
> inheriting population.** That population is `formatWithConversion` / `<CurrencyValue>` — **115 real
> call sites** (94 invocations + 21 renders), most created or touched during Phase 1b's currency work
> (Tasks 4, 9, 10).
>
> *Correction, recorded because it propagated into this block once already:* my first pass reported
> **183**, and **416** for the whole surface. Both were **grep output-line counts, not call sites** —
> they included import lines, the `const { formatWithConversion } = useFormatCurrency()` destructuring,
> type declarations and the definitions themselves. Task 1 re-measured and reported the discrepancy
> rather than adopting my figure, which is the correct response to a number handed down from above.
> The architectural point is unaffected: these sites inherit and must not be migrated.
>
> **Those 183 must NOT be migrated individually.** Verified routing: `CurrencyValue` →
> `useFormatCurrency` → `formatCurrency` from `@/lib/utils` (`use-format-currency.ts:4,28,42`;
> `CurrencyValue.tsx:1,3,24,32`). They inherit the Task 3 rewrite automatically. Editing them
> would create a second formatting path — the exact "one fact, two places" defect Phase 1b spent
> ten tasks removing. If a batch's diff touches a `formatWithConversion` call for any reason other
> than a genuinely wrong `from` argument, that is a finding.
>
> **2. The per-directory table has not been re-counted since Phase 1b.** Its totals (71 formatter
> calls / 53 hand-coloured / 94 raw `toFixed` = 218) predate ~29 commits that added files
> (`RiskMetricsPanel`, `ModelTradeView` tests, `model-trade-invariants`, `position-weight-invariants`)
> and changed others. Independent counts at `8a87ffe`: **73** named-formatter call sites (my first
> pass said 80 — it counted 7 import lines), **146** raw `.toFixed(`, **12** `toLocaleString`. The
> `toFixed` figure alone is ~55% above the table's 94.
>
> **Task 1's corrected table is the one batch tasks size off** — `.superpowers/sdd/2026-07-24-phase-2-formatting-spine/task-1-report.md`.
> Its total is **222** against the plan's 218, and that near-match is misleading: the aggregate is
> close while the *distribution* is not. `trade-fields` **+10** (23→33), `account-detail` **+8**
> (29→37), `growth` **+5** (16→21), against `rebalance` **−4**, `dashboard` **−3**,
> `portfolio-views` **−3`. Batches 21 and 19 are materially larger than their rows claim; batches 16,
> 20 and part of 18 are smaller, most likely because Phase 1b's currency work moved those sites into
> the inheriting population. **An aggregate that reconciles can hide a distribution that does not.**
>
> **Task 1 must re-run the counting grep and publish a corrected table**, reporting the deviation per
> directory rather than adjusting silently. Batch tasks size their work off the corrected table, not
> the one below. A batch that finds materially more sites than its row claims should say so and
> proceed — the row is an estimate, not a budget.
>
> **3. Two Phase 1b register items land inside this phase's scope** and should be closed by whichever
> batch touches their file, not deferred again:
> - `ConcentrationView`'s materiality bar now calls `isMaterialWeight` from `lib/security-master.ts`
>   (Phase 1b Task 10). Do not reintroduce an inline `weight > 0.02`.
> - The `1e-9` tolerance in that helper is ~9 orders above float noise, deliberately. Leave it.
>
> **4. The phase gate `src/mocks/data/__tests__/rollup-invariants.test.ts` is frozen.** Byte-identical
> across Phase 1 and Phase 1b — 234 assertions, last modified 46 commits before Phase 1b opened. Its
> `toBeCloseTo(1, 2)` band is now ~13 orders looser than needed (`max|Σw − 1|` is `2.220e-16` after
> Task 10). **Do not tighten it and do not touch it.** Recorded as register item M30.
>
> **5. The lesson Phase 1b paid for, which applies directly to a 400-site mechanical migration:**
> **match the bound to the operation.** At least seven tolerances in that phase hid what they were
> written to catch — a `+1` share tolerance that silenced both a sweep and an in-repo assertion, an
> absolute one-unit-price threshold worth $87,450 for BTC, whole-book *weight* bands hiding a $76
> money error, and `NaN > 1e-9` being false so a missing value passed silently. This phase's gate
> greps for hyphen-minus and unmasked account numbers: **prove each grep can fail before trusting an
> empty result.** Phase 1's gate shipped a grep whose five literals matched nothing at any revision.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/lib/utils.ts` the single, correct place where a number, a date or an account
number becomes a string, build the three missing Meridian primitives that consume it, and migrate
every call site so that no screen can render a hyphen-minus, an unsigned change, a signed fee rate,
an ambiguous date or an unmasked account number ever again.

**Architecture:** **One formatting spine, three primitives, ten mechanical batches.** Phase 1 made the
numbers true; this phase makes them *legible*. `src/lib/utils.ts` is rewritten from four loose helpers
into a complete formatter set — true minus, tier-aware compact money, accounting negatives, split
weight/return/rate percents, basis points, three date registers and masking. Nothing in `lib/` knows
about React or settings; the one settings-aware concern (the advisor's `dateFormat` preference) lives
in a hook, `src/hooks/use-format-date.ts`, mirroring the existing `use-format-currency.ts` pattern.
Three components — `DeltaValue`, `Tag`, `IconButton` — are built to the `meridian-components.md`
contracts and become the only sanctioned way to render a change figure, a user-applied label and an
icon-only control. The remaining ~218 call sites are then migrated in **ten per-feature-directory
batches**, each with its own test run and its own commit, because the migration is the risk in this
phase, not the primitives. The phase closes on a gate test that greps the built source for
hyphen-minus in signed output and for unmasked account numbers.

**Tech Stack:** React 18 · TypeScript (strict) · Tailwind v4 · Vitest 4 · Testing Library · TanStack
Query · Vite 6 · pnpm

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

### Phase-2-specific constraints

- **Tabular numerals are Phase 2, not Phase 3.** The IBM Plex Mono webfont arrives in Phase 3, but
  every numeric surface must already carry `font-feature-settings: "tnum" 1, "zero" 1` when this
  phase ends. Phase 2 introduces one Tailwind utility, `tabular-figures`, and one exported constant,
  `TABULAR_NUMS`. Phase 3 changes the `font-family` line inside that utility and nothing else — the
  font arrival must be **a pure font swap**, touching zero component files.
- **No component hand-formats a signed figure.** After this phase, `+`, `−`, `text-accent-green` and
  `text-accent-red` may not appear on the same line as a numeric expression anywhere in
  `src/features` or `src/components`. `DeltaValue` is the only sanctioned renderer.
- **`lib/` stays pure.** `src/lib/utils.ts` imports no React, no hooks, no stores and no fixtures. It
  is synchronously testable with plain `expect(...)` calls against exact strings.
- **Every formatter is deterministic in UTC.** Date and time formatters read UTC components, never
  local ones, so a test run in any timezone produces the same string. `en-US`/`en-GB` locale strings
  are banned in `lib/` — month names come from module-level constant arrays.
- **The migration is per-feature-directory.** One batch, one `pnpm test:run`, one commit. Never a
  repo-wide sweep. A reviewer must be able to reject batch F without rejecting batch E.
- **Depend on data shape, not Phase 1 internals.** This phase reads `account.accountNumber`,
  `metrics.revenueGrowthYoY` and so on. It must not import from `src/lib/aum.ts`, `src/lib/fees.ts`,
  `src/lib/risk-model.ts`, `src/lib/security-master.ts`, `src/lib/bond-math.ts` or
  `src/lib/waterfall.ts`, and must not restate any figure Phase 1 derives.
- **Every corrected string cites its authority** in a code comment where the fix is non-obvious: the
  Meridian rule number from `design-system-brief.md` §10 (e.g. `// R21 · true minus`).

---

## Baseline

Phase 1 completes before this plan starts. At that point `pnpm test:run` is green. Task 1 records the
exact counts; every later task compares against them.

The four legacy exports being replaced, and their blast radius at commit `72dad62`:

| Legacy export | Call sites | Replaced by |
| --- | --- | --- |
| `formatCurrency(value, compact?)` | 39 | `formatCurrency` (table form) + `formatCompactCurrency` + `formatAccounting` |
| `formatPercent(value, decimals?)` | 30 | `formatWeight` (1 dp, unsigned) + `formatReturn` (2 dp, signed) + `formatRate` (unsigned) |
| `formatDate(date)` | 40 | `formatDateISO` + `formatDateProse` + `formatDateShort` |
| `formatTime(date)` | 11 | `formatTime` (UTC, lowercase meridiem) |

Total migration surface, counted by directory with the grep in Task 15:

| Directory | Formatter calls | Hand-coloured signed figures | Raw `toFixed` | Sites |
| --- | ---: | ---: | ---: | ---: |
| `src/components/ui` | 4 | 3 | 10 | 17 |
| `src/features/dashboard` | 3 | 2 | 8 | 13 |
| `src/features/clients` | 5 | 3 | 1 | 9 |
| `src/features/portfolios` (root) | 11 | 8 | 20 | 39 |
| `src/features/portfolios/account-detail` | 8 | 7 | 14 | 29 |
| `src/features/portfolios/portfolio-views` | 3 | 4 | 5 | 12 |
| `src/features/portfolios/rebalance` | 5 | 2 | 5 | 12 |
| `src/features/portfolios/tax` | 3 | 7 | 0 | 10 |
| `src/features/portfolios/trade-fields` | 1 | 8 | 14 | 23 |
| `src/features/growth` | 5 | 4 | 7 | 16 |
| `src/features/billing` | 3 | 0 | 2 | 5 |
| `src/features/engage` | 5 | 1 | 0 | 6 |
| `src/features/workflows` | 3 | 0 | 0 | 3 |
| `src/features/messaging` | 4 | 0 | 0 | 4 |
| `src/features/compliance` | 2 | 0 | 0 | 2 |
| `src/features/reconciliation` | 0 | 1 | 5 | 6 |
| `src/features/proposals/steps` | 2 | 2 | 3 | 7 |
| `src/features/settings` + `settings/autonomy` | 3 | 1 | 0 | 4 |
| `src/features/onboarding/steps` | 0 | 0 | 0 | 0 (SSN/EIN only) |
| `src/features/ai-assistant` | 1 | 0 | 0 | 1 |
| **Total** | **71** | **53** | **94** | **218** |

The nine unmasked account-number render sites, confirmed by
`grep -rn "accountNumber" src/features src/mocks/handlers`:

| # | Site |
| --- | --- |
| 1 | `src/features/clients/ClientDetailPage.tsx:53` |
| 2 | `src/features/clients/HouseholdDetailPage.tsx:54` |
| 3 | `src/features/portfolios/AccountDetailPage.tsx:163` |
| 4 | `src/features/portfolios/portfolio-views/columns.tsx:40` |
| 5 | `src/features/portfolios/portfolio-views/HouseholdView.tsx:105` |
| 6 | `src/features/portfolios/rebalance/SelectAccountsStep.tsx:149` |
| 7 | `src/features/portfolios/rebalance/SelectAccountsStep.tsx:306` |
| 8 | `src/features/portfolios/SingleTradeView.tsx:288` |
| 9 | `src/mocks/handlers/search.ts:91` |

---

## File Structure

### Rewritten — the spine

| File | Responsibility |
| --- | --- |
| `src/lib/utils.ts` | **The formatting spine.** `cn`, the true-minus and sign primitives, currency (table / compact / accounting), percent (weight / return / rate), basis points, dates (ISO / prose / short / numeric), time, masking, and the `TABULAR_NUMS` class constant. Pure: no React, no hooks, no fixtures. |
| `src/lib/__tests__/utils.test.ts` | Every formatter, every branch, every sign, both magnitude boundaries, zero, negative zero, `null`/`undefined` inputs. |

**Why the formatters stay in `utils.ts` rather than moving to a new module:** 120 files import
`formatCurrency`, `formatPercent`, `formatDate` or `formatTime` from `@/lib/utils`. Moving the module
would add an import-path rewrite to all 218 migration edits for no behavioural gain, and every finding
in `critique-content.md` §4a cites `src/lib/utils.ts` by line. The file has exactly one
responsibility — *how a value becomes a string* — which is what this phase is named after.

### New — settings-aware layer (React)

| File | Responsibility |
| --- | --- |
| `src/hooks/use-format-date.ts` | Reads `DisplaySettings.dateFormat` and returns table / prose / short date formatters. The only place the advisor's date preference is consumed. Mirrors `use-format-currency.ts`. |
| `src/hooks/__tests__/use-format-date.test.tsx` | All three `dateFormat` settings; the loading fallback. |

### New — the three missing Meridian primitives

| File | Responsibility |
| --- | --- |
| `src/components/ui/DeltaValue.tsx` | The only correct way to render a change figure. Tabular mono, true minus, sign-derived tone, `format`, `parenthesise`, `showArrow`. |
| `src/components/ui/__tests__/DeltaValue.test.tsx` | Every `format`, both signs, zero, `parenthesise`, `showArrow`, tone classes, the accessible label. |
| `src/components/ui/Tag.tsx` | Pill chip for filters and user-applied labels — the only pill-shaped element in the system. `selected` = filled ink, `onRemove`. |
| `src/components/ui/__tests__/Tag.test.tsx` | Selected fill, click, remove callback, remove-button label. |
| `src/components/ui/IconButton.tsx` | Square icon-only control. `label` is **required**. Variants ghost / outline / inverse. |
| `src/components/ui/__tests__/IconButton.test.tsx` | Accessible name, variants, sizes, `active`, hit-area floor. |

### New — the compliance register

| File | Responsibility |
| --- | --- |
| `src/lib/compliance-register.ts` | The canonical hedging strings: `netOfFees`, `grossOfFees`, `asOf`, `estimatedPrefix`, `COMPLIANCE_PASS_NOTICE`, `PERFORMANCE_BASIS_NOTE`. No component invents its own wording. |
| `src/lib/__tests__/compliance-register.test.ts` | Exact strings; no exclamation marks; no promised outcomes. |

### New — the gate

| File | Responsibility |
| --- | --- |
| `src/lib/__tests__/formatting-gate.test.ts` | **THE GATE.** Scans `src/**` for hyphen-minus in signed output, hand-coloured signed figures, unmasked `accountNumber` renders and hardcoded `en-US` date formatting. Fails the build on regression. |
| `scripts/check-formatting.mjs` | The same scan as a standalone script, for CI and for a fast local check without Vitest. |

### Modified — one line each

| File | Change |
| --- | --- |
| `src/index.css` | Add `@utility tabular-figures` (Task 1). Phase 3 changes the `font-family` inside it and nothing else. |
| `package.json` | Add the `check:formatting` script (Task 28). |

### Modified — migration batches (Tasks 15–25)

| Batch | Directories | Sites |
| --- | --- | ---: |
| A | `src/components/ui` | 17 |
| B | `src/features/dashboard` | 13 |
| C | `src/features/clients` | 9 |
| D | `src/features/portfolios` (root) | 39 |
| E | `src/features/portfolios/account-detail` | 29 |
| F | `src/features/portfolios/portfolio-views`, `src/features/portfolios/rebalance` | 24 |
| G | `src/features/portfolios/tax`, `src/features/portfolios/trade-fields` | 33 |
| H | `src/features/growth`, `src/features/billing` | 21 |
| I | `src/features/engage`, `src/features/workflows`, `src/features/messaging`, `src/features/compliance`, `src/features/reconciliation` | 21 |
| J | `src/features/proposals`, `src/features/settings`, `src/features/onboarding`, `src/features/ai-assistant`, `src/features/notifications`, `src/features/quick-capture` | 12 |
| K | `src/mocks/handlers`, `src/mocks/data` | fixture strings |

---

## The formatter contract

Every task below is written against this exact surface. If a signature here disagrees with a task,
this table wins and the task is a bug.

```ts
// src/lib/utils.ts — complete public surface after Task 9

export const MINUS: '−'
export const MASK_BULLETS: '••••'
export const TABULAR_NUMS: 'font-mono tabular-figures'

export function cn(...inputs: ClassValue[]): string

export type Sign = 'positive' | 'negative' | 'zero'
export function signOf(value: number): Sign
export function signPrefix(value: number, options?: { showPlus?: boolean }): string

export type FormatCurrencyOptions = {
  compact?: boolean
  currency?: CurrencyCode
  accounting?: boolean
  signed?: boolean
}
export function formatCurrency(value: number, optionsOrCompact?: boolean | FormatCurrencyOptions): string
export function formatCompactCurrency(value: number, currency?: CurrencyCode): string
export function formatAccounting(value: number, currency?: CurrencyCode): string

export function formatWeight(value: number): string
export function formatReturn(value: number): string
export function formatRate(value: number, decimals?: number): string

export function rateToBps(rate: number): number
export function percentToBps(percent: number): number
export function formatBps(bps: number, options?: { signed?: boolean }): string
export function formatChange(percent: number): string

export type DateFormatPattern = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
export function formatDateISO(date: string | Date): string
export function formatDateProse(date: string | Date): string
export function formatDateShort(date: string | Date): string
export function formatDateNumeric(date: string | Date, pattern: DateFormatPattern): string
export function formatTime(date: string | Date): string
export function formatDateTime(date: string | Date): string

export function maskAccount(accountNumber: string, options?: { keepPrefix?: boolean }): string
export function maskTaxId(taxId: string): string
```

---

## Task index

| # | Task | Deliverable |
| --- | --- | --- |
| 1 | Baseline and the tabular-figures utility | `@utility tabular-figures`, `TABULAR_NUMS` |
| 2 | True minus and the sign primitives | `MINUS`, `signOf`, `signPrefix` |
| 3 | `formatCurrency` — table form, accounting negatives, true minus | `formatCurrency` |
| 4 | `formatCompactCurrency` — tier promotion and magnitude boundaries | `formatCompactCurrency` |
| 5 | `formatAccounting` — `($284,100)` | `formatAccounting` |
| 6 | Split `formatPercent` into weight, return and rate | `formatWeight`, `formatReturn`, `formatRate` |
| 7 | Basis points — one conversion, one formatter | `rateToBps`, `percentToBps`, `formatBps`, `formatChange` |
| 8 | The three date registers plus time | `formatDateISO`, `formatDateProse`, `formatDateShort`, `formatDateNumeric`, `formatTime`, `formatDateTime` |
| 9 | Masking — accounts and tax IDs | `maskAccount`, `maskTaxId` |
| 10 | `useFormatDate` — the setting that currently does nothing | `src/hooks/use-format-date.ts` |
| 11 | `DeltaValue` | `src/components/ui/DeltaValue.tsx` |
| 12 | `Tag` | `src/components/ui/Tag.tsx` |
| 13 | `IconButton` | `src/components/ui/IconButton.tsx` |
| 14 | The compliance register | `src/lib/compliance-register.ts` |
| 15 | Batch A — `src/components/ui` | 17 sites migrated |
| 16 | Batch B — `src/features/dashboard` | 13 sites migrated |
| 17 | Batch C — `src/features/clients` | 9 sites + 2 mask sites |
| 18 | Batch D — `src/features/portfolios` (root) | 39 sites + 2 mask sites |
| 19 | Batch E — `src/features/portfolios/account-detail` | 29 sites |
| 20 | Batch F — `portfolio-views` + `rebalance` | 24 sites + 4 mask sites |
| 21 | Batch G — `tax` + `trade-fields` | 33 sites |
| 22 | Batch H — `growth` + `billing` | 21 sites |
| 23 | Batch I — `engage`, `workflows`, `messaging`, `compliance`, `reconciliation` | 21 sites |
| 24 | Batch J — `proposals`, `settings`, `onboarding` (SSN/EIN), `ai-assistant`, and friends | 12 sites |
| 25 | Batch K — `src/mocks` fixture strings and the ninth mask site | fixture strings corrected |
| 26 | Apply the compliance register to performance and projection surfaces | `net of fees` / `as of` shipped |
| 27 | Replace the three unhedged compliance-pass strings | hedged copy shipped |
| 28 | The gate — test plus script | `formatting-gate.test.ts`, `check:formatting` |
| 29 | Remove the deprecated aliases and close the phase green | `formatPercent`/`formatDate` deleted |

---

## Task sequence

Tasks 1–14 build the spine and must run in order — each formatter task's test file appends to the
same test suite, and Tasks 11–14 import formatters defined in Tasks 2–9. Tasks 15–25 are the
migration batches; they are independent of each other and may be reviewed in any order, but each one
depends on all of Tasks 1–14. Tasks 26–29 close the phase and must run last, in order.

---

### Task 1: Baseline, and the tabular-figures utility

**Files:**
- Modify: `src/index.css` (append one `@utility` block after the existing `text-mono-sm` utility, currently at `src/index.css:145-150`)
- Modify: `src/lib/utils.ts:1-8` (add the `TABULAR_NUMS` export)
- Create: `src/lib/__tests__/tabular.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const TABULAR_NUMS: 'font-mono tabular-figures'
  ```
  and one CSS utility, `tabular-figures`, which sets
  `font-feature-settings: "tnum" 1, "zero" 1` and the mono family.

Rules closed: **R13** (every financial figure in mono), **R14** (`tnum` + `zero` on every numeral).
Findings closed: `critique-design-system.md` B13 — *"zero occurrences of `tnum`, `tabular-nums`,
`slashed-zero`, or `font-variant-numeric` in the entire repo"*.

**Why this is Phase 2 and not Phase 3.** The IBM Plex Mono webfont lands in Phase 3. If tabular
figures land with the font, Phase 3 has to touch every numeric component again. Instead the utility
ships now with the *current* mono stack, every numeric surface adopts it during Tasks 15–25, and
Phase 3's entire typography change at this layer is one line — the `font-family` inside
`@utility tabular-figures`. **Phase 3 must not need to edit a single component file to install the
font.** State this in the code comment so the Phase 3 implementer finds it.

- [ ] **Step 1: Record the baseline**

Run: `pnpm test:run 2>&1 | tail -5`
Expected: `0 failed`. Phase 1 ends green; this phase starts from green. Record the exact
`Test Files N passed (N)` / `Tests N passed (N)` line — every batch task in this plan compares its
run against it.

If any test fails, **stop**. A red baseline means Phase 1 did not complete and the migration batches
cannot distinguish their own breakage from inherited breakage.

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/tabular.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TABULAR_NUMS } from '../utils'

describe('tabular figures', () => {
  it('exports the class pair every numeric surface uses', () => {
    expect(TABULAR_NUMS).toBe('font-mono tabular-figures')
  })

  it('defines the tabular-figures utility in the stylesheet', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('@utility tabular-figures')
  })

  it('sets both tnum and zero so Phase 3 is a pure font swap', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const block = css.slice(css.indexOf('@utility tabular-figures'))
    const body = block.slice(0, block.indexOf('}') + 1)
    expect(body).toContain('font-feature-settings')
    expect(body).toContain('"tnum" 1')
    expect(body).toContain('"zero" 1')
    expect(body).toContain('font-family')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/tabular.test.ts`
Expected: FAIL — `TABULAR_NUMS` is not exported from `../utils`, so the import throws.

- [ ] **Step 4: Add the CSS utility**

Append to `src/index.css`, immediately after the `text-mono-sm` utility block:

```css
/* ── Tabular figures ─────────────────────────────────────────────
   R13/R14 · every financial figure, ticker, masked account and ISO date.
   PHASE 3: the font swap to IBM Plex Mono is this one font-family line.
   Do not add tnum/zero anywhere else — components use TABULAR_NUMS from
   src/lib/utils.ts, which resolves to `font-mono tabular-figures`. */
@utility tabular-figures {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-feature-settings: "tnum" 1, "zero" 1;
  font-variant-numeric: tabular-nums slashed-zero;
}
```

- [ ] **Step 5: Export the constant**

In `src/lib/utils.ts`, immediately below the `cn` function:

```ts
/**
 * The class pair every numeric surface carries. R13 + R14.
 * Never write `font-mono` on a figure by hand — use this, so Phase 3's font
 * swap is a single change inside `@utility tabular-figures` in src/index.css.
 */
export const TABULAR_NUMS = 'font-mono tabular-figures' as const
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/tabular.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/lib/utils.ts src/lib/__tests__/tabular.test.ts
git commit -m "feat: add tabular-figures utility and TABULAR_NUMS constant (R13, R14)"
```

---

### Task 2: True minus and the sign primitives

**Files:**
- Modify: `src/lib/utils.ts` (add after `TABULAR_NUMS`)
- Create: `src/lib/__tests__/sign.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const MINUS: '−'                 // U+2212, NOT U+002D
  export type Sign = 'positive' | 'negative' | 'zero'
  export function signOf(value: number): Sign
  export function signPrefix(value: number, options?: { showPlus?: boolean }): string
  ```

Rules closed: **R21** (true minus U+2212 on every signed figure).
Findings closed: `critique-design-system.md` B15 — *"zero occurrences of `−` in `src/`"*;
`critique-content.md` §4a `src/lib/utils.ts:57` and `:74`.

**The three rules `signOf` encodes, which every later formatter inherits:**
1. Negative zero (`-0`) is **zero**, not negative. `Object.is(-0, 0)` is `false`, so a naive
   `value < 0` check passes but `1 / value === -Infinity` betrays it. A change of exactly zero must
   never render `−0.00%`.
2. `NaN` is **zero**. A broken upstream figure renders `0.00%`, not `NaN%`. It is the caller's job to
   not pass `NaN`; the formatter's job is to never emit the string `NaN` into the UI.
3. Zero takes **no sign at all** — not `+`, not `−`. Meridian's `+8.42%` means *up*; `0.00%` means
   *unchanged*, and `+0.00%` (what `formatPercent` emits today) is a claim of movement.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/sign.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MINUS, signOf, signPrefix } from '../utils'

describe('MINUS', () => {
  it('is U+2212, not the ASCII hyphen-minus U+002D', () => {
    expect(MINUS).toBe('−')
    expect(MINUS).not.toBe('-')
    expect(MINUS.charCodeAt(0)).toBe(0x2212)
  })
})

describe('signOf', () => {
  it('classifies positive, negative and zero', () => {
    expect(signOf(8.42)).toBe('positive')
    expect(signOf(-3.02)).toBe('negative')
    expect(signOf(0)).toBe('zero')
  })

  it('treats negative zero as zero', () => {
    expect(signOf(-0)).toBe('zero')
  })

  it('treats NaN as zero so no figure can render "NaN"', () => {
    expect(signOf(Number.NaN)).toBe('zero')
  })

  it('classifies infinities by direction', () => {
    expect(signOf(Number.POSITIVE_INFINITY)).toBe('positive')
    expect(signOf(Number.NEGATIVE_INFINITY)).toBe('negative')
  })
})

describe('signPrefix', () => {
  it('returns a true minus for negatives', () => {
    expect(signPrefix(-3.02)).toBe('−')
  })

  it('returns an empty string for positives by default', () => {
    expect(signPrefix(8.42)).toBe('')
  })

  it('returns a plus for positives when asked', () => {
    expect(signPrefix(8.42, { showPlus: true })).toBe('+')
  })

  it('never signs zero, even when showPlus is set', () => {
    expect(signPrefix(0)).toBe('')
    expect(signPrefix(0, { showPlus: true })).toBe('')
    expect(signPrefix(-0, { showPlus: true })).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/sign.test.ts`
Expected: FAIL — `MINUS`, `signOf` and `signPrefix` are not exported from `../utils`.

- [ ] **Step 3: Write the implementation**

In `src/lib/utils.ts`, immediately below `TABULAR_NUMS`:

```ts
/**
 * R21 · The true minus, U+2212. The ASCII hyphen-minus (U+002D) is a word-break
 * character: it is narrower than the plus sign, so a column of signed figures in
 * tabular mono does not line up, and screen readers announce it as "hyphen".
 * No signed figure in this product is built with '-'.
 */
export const MINUS = '−' as const

export type Sign = 'positive' | 'negative' | 'zero'

/**
 * Sign classification for every formatter in this module.
 * Negative zero is zero — `-0 < 0` is false but `Math.sign(-0)` is `-0`, and a
 * change of exactly nothing must never render as a fall.
 * NaN is zero — a broken upstream figure renders `0.00%`, never the string `NaN`.
 */
export function signOf(value: number): Sign {
  if (!Number.isFinite(value)) {
    if (value === Number.POSITIVE_INFINITY) return 'positive'
    if (value === Number.NEGATIVE_INFINITY) return 'negative'
    return 'zero'
  }
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'zero'
}

/**
 * The sign character that precedes a figure. Zero is never signed: `+0.00%`
 * claims movement that did not happen.
 */
export function signPrefix(value: number, options?: { showPlus?: boolean }): string {
  const sign = signOf(value)
  if (sign === 'negative') return MINUS
  if (sign === 'positive' && options?.showPlus) return '+'
  return ''
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/sign.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/sign.test.ts
git commit -m "feat: add true minus and sign primitives (R21)"
```

---

### Task 3: `formatCurrency` — table form, true minus, accounting negatives

**Files:**
- Modify: `src/lib/utils.ts:41-71` (replace the whole `FormatCurrencyOptions` / `formatCurrency` block)
- Modify: `src/lib/__tests__/utils.test.ts:4-36` (replace the `formatCurrency` describe block)

**Interfaces:**
- Consumes: `MINUS`, `signOf`, `signPrefix` (Task 2); `getCurrencyInfo` from `@/lib/currency`;
  `CurrencyCode` from `@/types/currency`.
- Produces:
  ```ts
  export type FormatCurrencyOptions = {
    compact?: boolean          // delegates to formatCompactCurrency (Task 4)
    currency?: CurrencyCode    // default 'USD'
    accounting?: boolean       // negatives in parentheses: ($284,100)
    signed?: boolean           // positives get a leading '+'
  }
  export function formatCurrency(
    value: number,
    optionsOrCompact?: boolean | FormatCurrencyOptions,
  ): string
  ```
  The `boolean` overload is retained so the 39 existing `formatCurrency(v, true)` call sites keep
  compiling through the migration. It is **not** removed in this phase.

Rules closed: **R20** (`$1,148,300` in tables), **R21** (true minus), **R24** (accounting negatives).
Findings closed: `critique-content.md` §4a `src/lib/utils.ts:57` and `:66`.

**The bug being fixed at `:66`.** `Intl.NumberFormat(...).format(-1234)` emits `-$1,234.00` with a
hyphen-minus, and for non-`en-US` locales the sign character varies by locale (`de-DE` puts it after
the figure; some locales already use U+2212). The fix is to never let `Intl` render the sign at all:
format `Math.abs(value)` and prepend our own. That is deterministic across all 33 currencies in
`CURRENCY_REGISTRY` and across every locale in it.

- [ ] **Step 1: Write the failing test**

Replace the `describe('formatCurrency', …)` block in `src/lib/__tests__/utils.test.ts` (currently
lines 4–36) with:

```ts
describe('formatCurrency', () => {
  it('formats table money with full separators and two decimals', () => {
    expect(formatCurrency(1_148_300)).toBe('$1,148,300.00')
  })

  it('formats a small value', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats zero without a sign', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative zero as zero', () => {
    expect(formatCurrency(-0)).toBe('$0.00')
  })

  it('uses a true minus, never a hyphen', () => {
    expect(formatCurrency(-500.1)).toBe('−$500.10')
    expect(formatCurrency(-500.1)).not.toContain('-')
  })

  it('wraps negatives in parentheses in accounting mode', () => {
    expect(formatCurrency(-284_100, { accounting: true })).toBe('($284,100.00)')
  })

  it('leaves positives unwrapped in accounting mode', () => {
    expect(formatCurrency(284_100, { accounting: true })).toBe('$284,100.00')
  })

  it('signs positives when asked', () => {
    expect(formatCurrency(1_240_000, { signed: true })).toBe('+$1,240,000.00')
  })

  it('never signs zero, even when signed is set', () => {
    expect(formatCurrency(0, { signed: true })).toBe('$0.00')
  })

  it('honours a non-USD fiat currency', () => {
    expect(formatCurrency(1000, { currency: 'GBP' })).toBe('£1,000.00')
  })

  it('puts the true minus outside the symbol for non-USD fiat too', () => {
    expect(formatCurrency(-1000, { currency: 'GBP' })).toBe('−£1,000.00')
  })

  it('formats crypto as an amount plus a code', () => {
    expect(formatCurrency(1.5, { currency: 'BTC' })).toBe('1.50 BTC')
  })

  it('uses a true minus for crypto too', () => {
    expect(formatCurrency(-1.5, { currency: 'BTC' })).toBe('−1.50 BTC')
  })

  it('renders NaN as zero rather than the string NaN', () => {
    expect(formatCurrency(Number.NaN)).toBe('$0.00')
  })
})
```

The legacy `formatCurrency(v, true)` boolean overload is asserted in Task 4, once
`formatCompactCurrency` exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t formatCurrency`
Expected: FAIL — the true-minus assertions fail with `expected '-$500.10' to be '−$500.10'`; the
accounting, signed and NaN cases fail because those options do not exist.

- [ ] **Step 3: Write the implementation**

Replace `src/lib/utils.ts:41-71` with:

```ts
export type FormatCurrencyOptions = {
  compact?: boolean
  currency?: CurrencyCode
  /** R24 · accounting negatives: ($284,100). Positives are unchanged. */
  accounting?: boolean
  /** Prepend '+' to positives. Zero is never signed. */
  signed?: boolean
}

function normaliseCurrencyOptions(
  optionsOrCompact?: boolean | FormatCurrencyOptions,
): FormatCurrencyOptions {
  if (typeof optionsOrCompact === 'boolean') return { compact: optionsOrCompact }
  return optionsOrCompact ?? {}
}

/**
 * R20/R21/R24 · Table money. Full separators, the currency's own decimals, a
 * true minus, and parentheses when `accounting` is set.
 *
 * The sign is never produced by Intl: `Intl.NumberFormat` emits a hyphen-minus,
 * and places it differently per locale. We format the magnitude and prepend our
 * own sign so the output is identical in shape for all 33 registry currencies.
 */
export function formatCurrency(
  value: number,
  optionsOrCompact?: boolean | FormatCurrencyOptions,
): string {
  const opts = normaliseCurrencyOptions(optionsOrCompact)
  const currencyCode = opts.currency ?? 'USD'

  if (opts.compact) return formatCompactCurrency(value, currencyCode)

  const safe = Number.isFinite(value) ? value : 0
  const sign = signOf(safe)
  const magnitude = formatCurrencyMagnitude(Math.abs(safe), currencyCode)

  if (opts.accounting && sign === 'negative') return `(${magnitude})`
  return `${signPrefix(safe, { showPlus: opts.signed })}${magnitude}`
}

/** The unsigned body of a money string. Never called with a negative. */
function formatCurrencyMagnitude(absValue: number, currencyCode: CurrencyCode): string {
  const info = getCurrencyInfo(currencyCode)

  if (info.isFiat) {
    return getCachedFormatter(info.locale, currencyCode, info.decimals).format(absValue)
  }

  // Crypto and stablecoins are not valid Intl currency codes.
  const formatted = getCachedNumberFormatter('en-US', 2, Math.min(info.decimals, 6)).format(absValue)
  return `${formatted} ${currencyCode}`
}
```

`getCachedFormatter` and `getCachedNumberFormatter` (`src/lib/utils.ts:13-39`) are unchanged and stay
where they are — they remain the correct performance guard for a few hundred calls per page.

- [ ] **Step 4: Add the compact stub so the module compiles**

`formatCompactCurrency` is written in full in Task 4. To keep this task independently green, add the
signature now with the tier logic delegated forward, placed immediately below `formatCurrency`:

```ts
/** Full implementation in Task 4. Until then, compact falls through to table form. */
export function formatCompactCurrency(value: number, currency: CurrencyCode = 'USD'): string {
  const safe = Number.isFinite(value) ? value : 0
  return `${signPrefix(safe)}${formatCurrencyMagnitude(Math.abs(safe), currency)}`
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t formatCurrency`
Expected: PASS — 14 tests.

- [ ] **Step 6: Run the full suite**

Run: `pnpm test:run`
Expected: green except for call sites asserting the old hyphen output. If any test outside
`src/lib/__tests__/` fails, it is asserting `-$500.10`-style output; update that assertion to the true
minus **in this commit** — the assertion was encoding the bug.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: formatCurrency emits true minus and accounting negatives (R20, R21, R24)"
```

---

### Task 4: `formatCompactCurrency` — precision, tier promotion, magnitude boundaries

**Files:**
- Modify: `src/lib/utils.ts` (replace the Task 3 stub with the real implementation)
- Modify: `src/lib/__tests__/utils.test.ts` (add a `formatCompactCurrency` describe block)

**Interfaces:**
- Consumes: `signPrefix`, `signOf` (Task 2); `formatCurrencyMagnitude`, `getCurrencyInfo` (Task 3).
- Produces:
  ```ts
  export function formatCompactCurrency(value: number, currency?: CurrencyCode): string
  ```

Rules closed: **R19** (`$4.21M` / `$1.42B` in summary, never `$4.2 million`), **R21**.
Findings closed: `critique-content.md` §4a `src/lib/utils.ts:58`, `:59`, `:60`;
`critique-content.md` §4b `MetricsBar.tsx:56` (`+$1.2M` → `+$1.24M`), `mocks/handlers/ai.ts:311`
(`+$420K` → `+$420.4K`).

**The precision rule, derived from the four examples in the spec.**

| Spec example | Scaled | Decimals | Reason |
| --- | --- | ---: | --- |
| `$4.21M` | 4.21 | 2 | scaled magnitude below 10 |
| `$1.42B` | 1.42 | 2 | scaled magnitude below 10 |
| `$91.3M` (from 91,280,000) | 91.28 | 1 | scaled magnitude 10 or above |
| `$420.4K` (from 420,350) | 420.35 | 1 | scaled magnitude 10 or above |

So: **two decimals below 10, one decimal at 10 and above.** Nothing else reproduces all four.
`toFixed(1)` everywhere gives `$4.2M` (wrong, and the current bug at `:58-59`); `toFixed(2)`
everywhere gives `$91.28M` and `$420.35K` (over-precise for a summary tile).

**Tier promotion.** A tier is entered when the value would render as at least `1.00` in it — that is,
at `scale × 0.9995`. This single threshold makes promotion automatic and removes the round-then-carry
bug: `999,999` enters the M tier (999,999 ≥ 999,500), scales to `0.999999`, and renders `$1.00M`
rather than the arithmetically-correct-but-absurd `$1000.0K`.

**The 999 boundary.** `999` does not reach the K tier's `999.5` threshold, so it falls through to
table form: `$999.00`. `999.5` does reach it and renders `$1.00K`. Both are asserted below, because
the boundary is exactly where a naive `>= 1000` implementation and a rounding-aware one disagree.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/utils.test.ts`:

```ts
describe('formatCompactCurrency', () => {
  it('renders millions at the spec precision', () => {
    expect(formatCompactCurrency(4_210_000)).toBe('$4.21M')
  })

  it('renders billions at the spec precision', () => {
    expect(formatCompactCurrency(1_420_000_000)).toBe('$1.42B')
  })

  it('drops to one decimal at 10 and above', () => {
    expect(formatCompactCurrency(91_280_000)).toBe('$91.3M')
  })

  it('renders hundreds of thousands with one decimal', () => {
    expect(formatCompactCurrency(420_350)).toBe('$420.4K')
  })

  it('renders trillions', () => {
    expect(formatCompactCurrency(2_500_000_000_000)).toBe('$2.50T')
  })

  // ── magnitude boundaries ───────────────────────────────────────────
  it('999 is below the K tier and falls through to table form', () => {
    expect(formatCompactCurrency(999)).toBe('$999.00')
  })

  it('999.5 rounds into the K tier', () => {
    expect(formatCompactCurrency(999.5)).toBe('$1.00K')
  })

  it('999,400 stays in the K tier', () => {
    expect(formatCompactCurrency(999_400)).toBe('$999.4K')
  })

  it('999,999 promotes to the M tier rather than rendering $1000.0K', () => {
    expect(formatCompactCurrency(999_999)).toBe('$1.00M')
  })

  it('999,999,999 promotes to the B tier', () => {
    expect(formatCompactCurrency(999_999_999)).toBe('$1.00B')
  })

  it('1,000 is exactly the K tier floor', () => {
    expect(formatCompactCurrency(1_000)).toBe('$1.00K')
  })

  it('1,000,000 is exactly the M tier floor', () => {
    expect(formatCompactCurrency(1_000_000)).toBe('$1.00M')
  })

  // ── signs and zero ────────────────────────────────────────────────
  it('uses a true minus on negatives', () => {
    expect(formatCompactCurrency(-4_210_000)).toBe('−$4.21M')
    expect(formatCompactCurrency(-4_210_000)).not.toContain('-')
  })

  it('renders zero in table form with no sign', () => {
    expect(formatCompactCurrency(0)).toBe('$0.00')
  })

  it('renders negative zero as zero', () => {
    expect(formatCompactCurrency(-0)).toBe('$0.00')
  })

  it('renders NaN as zero', () => {
    expect(formatCompactCurrency(Number.NaN)).toBe('$0.00')
  })

  // ── currency awareness ────────────────────────────────────────────
  it('honours a non-USD currency symbol', () => {
    expect(formatCompactCurrency(4_210_000, 'GBP')).toBe('£4.21M')
  })

  it('honours the legacy boolean overload on formatCurrency', () => {
    expect(formatCurrency(4_210_000, true)).toBe('$4.21M')
    expect(formatCurrency(4_210_000, { compact: true })).toBe('$4.21M')
  })

  it('never emits a spelled-out magnitude', () => {
    expect(formatCompactCurrency(4_210_000)).not.toContain('million')
    expect(formatCompactCurrency(1_420_000_000)).not.toContain('billion')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t formatCompactCurrency`
Expected: FAIL — the stub returns table form for everything, so the first assertion reports
`expected '$4,210,000.00' to be '$4.21M'`.

- [ ] **Step 3: Write the implementation**

Replace the Task 3 stub in `src/lib/utils.ts` with:

```ts
/**
 * R19 · Summary money: $4.21M, $1.42B. Never `$4.2 million`, never `$4.2M`.
 *
 * Precision: two decimals when the scaled magnitude is below 10, one decimal at
 * 10 and above. That is the only rule that yields all four spec examples —
 * $4.21M, $1.42B, $91.3M (from 91,280,000) and $420.4K (from 420,350).
 *
 * Tier entry is at `scale * 0.9995`, i.e. the point at which the value would
 * render as at least 1.00 in that tier. This makes promotion automatic:
 * 999,999 enters the M tier and renders $1.00M, not $1000.0K.
 *
 * Below the K threshold the value falls through to table form, because a
 * compact figure with no suffix is just a less precise table figure.
 */
const COMPACT_TIERS = [
  { scale: 1_000_000_000_000, suffix: 'T' },
  { scale: 1_000_000_000, suffix: 'B' },
  { scale: 1_000_000, suffix: 'M' },
  { scale: 1_000, suffix: 'K' },
] as const

const TIER_ENTRY_RATIO = 0.9995

export function formatCompactCurrency(value: number, currency: CurrencyCode = 'USD'): string {
  const safe = Number.isFinite(value) ? value : 0
  const abs = Math.abs(safe)
  const sign = signPrefix(safe)
  const info = getCurrencyInfo(currency)

  for (const tier of COMPACT_TIERS) {
    if (abs < tier.scale * TIER_ENTRY_RATIO) continue
    const scaled = abs / tier.scale
    const decimals = scaled < 10 ? 2 : 1
    const body = scaled.toFixed(decimals)
    return info.isFiat
      ? `${sign}${info.symbol}${body}${tier.suffix}`
      : `${sign}${body}${tier.suffix} ${currency}`
  }

  return `${sign}${formatCurrencyMagnitude(abs, currency)}`
}
```

`COMPACT_TIERS` and `TIER_ENTRY_RATIO` are module-level constants declared above the function.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t formatCompactCurrency`
Expected: PASS — 19 tests.

- [ ] **Step 5: Verify the tier-entry ratio does not misfire**

Run this one-off check to prove the threshold never produces a body that rounds to `1000`:

```bash
pnpm vitest run src/lib/__tests__/utils.test.ts 2>&1 | tail -5
node --input-type=module -e "
const t=[1e12,1e9,1e6,1e3];
for (const s of t) {
  for (const v of [s*0.9995, s*0.99949, s-1, s, s*9.99, s*10.01]) {
    const scaled=v/s, d=scaled<10?2:1;
    if (v>=s*0.9995 && Number(scaled.toFixed(d))>=1000) throw new Error('tier overflow at '+v);
  }
}
console.log('tier thresholds sound');
"
```
Expected: `tier thresholds sound`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: compact money at spec precision with tier promotion (R19)"
```

---

### Task 5: `formatAccounting` — `($284,100)`

**Files:**
- Modify: `src/lib/utils.ts` (add below `formatCompactCurrency`)
- Modify: `src/lib/__tests__/utils.test.ts` (add a `formatAccounting` describe block)

**Interfaces:**
- Consumes: `formatCurrency` (Task 3).
- Produces:
  ```ts
  export function formatAccounting(value: number, currency?: CurrencyCode): string
  ```

Rules closed: **R24** (accounting negatives use parentheses).
Findings closed: `critique-content.md` §4a — *"no accounting-negative utility exists"*;
§4b Reconciliation break card — *"add the delta, which is the only number anyone wants:
`Break: ($150.00)`"*.

**Where this is used and where it is not.** Parentheses are a *statement* convention: cost-basis
tables, realised gain/loss columns, reconciliation breaks, fee credits, waterfall bridges. They are
**not** used for performance changes — a return of −3.02% is `−3.02%`, never `(3.02%)`. The rule of
thumb the migration batches apply: **if the column has a total row, it is accounting; if it has an
arrow, it is a delta.**

`formatAccounting` is a named wrapper rather than a bare `formatCurrency(v, { accounting: true })`
at 40 call sites, so that the convention is greppable and one change reaches every statement surface.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/utils.test.ts`:

```ts
describe('formatAccounting', () => {
  it('wraps negatives in parentheses', () => {
    expect(formatAccounting(-284_100)).toBe('($284,100.00)')
  })

  it('leaves positives bare — no plus, no parentheses', () => {
    expect(formatAccounting(284_100)).toBe('$284,100.00')
  })

  it('renders zero bare', () => {
    expect(formatAccounting(0)).toBe('$0.00')
  })

  it('renders negative zero as bare zero, not (\$0.00)', () => {
    expect(formatAccounting(-0)).toBe('$0.00')
  })

  it('never emits a minus sign of any kind', () => {
    const out = formatAccounting(-150)
    expect(out).toBe('($150.00)')
    expect(out).not.toContain('-')
    expect(out).not.toContain('−')
  })

  it('honours a non-USD currency', () => {
    expect(formatAccounting(-1000, 'GBP')).toBe('(£1,000.00)')
  })

  it('renders NaN as bare zero', () => {
    expect(formatAccounting(Number.NaN)).toBe('$0.00')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t formatAccounting`
Expected: FAIL — `formatAccounting is not a function`.

- [ ] **Step 3: Write the implementation**

Add to `src/lib/utils.ts`, below `formatCompactCurrency`:

```ts
/**
 * R24 · Statement money. Negatives are parenthesised and carry no sign at all —
 * the parentheses *are* the sign, and `(−$150.00)` states it twice.
 *
 * Use this for columns that foot to a total: realised gain/loss, cost-basis
 * comparisons, reconciliation breaks, fee credits. Do NOT use it for
 * performance changes — a return of −3.02% renders as −3.02% via DeltaValue.
 */
export function formatAccounting(value: number, currency: CurrencyCode = 'USD'): string {
  return formatCurrency(value, { accounting: true, currency })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t formatAccounting`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: add formatAccounting for parenthesised statement negatives (R24)"
```

---

### Task 6: Split `formatPercent` into weight, return and rate

**Files:**
- Modify: `src/lib/utils.ts:73-75` (replace `formatPercent`)
- Modify: `src/lib/__tests__/utils.test.ts:38-54` (replace the `formatPercent` describe block)

**Interfaces:**
- Consumes: `signPrefix`, `signOf` (Task 2).
- Produces:
  ```ts
  /** R23 · a share of a whole. One decimal. Never signed. `62.5%` */
  export function formatWeight(value: number): string
  /** R22/R23 · a change. Two decimals. Always signed except at zero. `+8.42%` */
  export function formatReturn(value: number): string
  /** A standing rate — fee, yield, probability. Unsigned. Two decimals by default. `0.85%` */
  export function formatRate(value: number, decimals?: number): string
  /** @deprecated Removed in Task 29. Alias of formatReturn. */
  export function formatPercent(value: number, decimals?: number): string
  ```
  All four take a value **already in percent units** (`8.42` means 8.42%), matching the 30 existing
  call sites, most of which pass `x * 100`.

Rules closed: **R22** (changes carry two decimals), **R23** (weights one decimal, returns two),
**R21** (true minus).
Findings closed: `critique-content.md` §4c(iii) — *"`formatPercent` prepends `+` to quantities that
are not changes"*, producing `+0.85%` at `BillingPage.tsx:189,:192` and `+34.2%` at
`BookOfBusinessPage.tsx:128`; §4a — *"one `formatPercent` used for both weights and returns
(23 call sites)"*; §4d `OverviewTab.tsx:149`, `ModelGovernancePage.tsx:252` — three precisions for
"weight" currently ship (0 dp, 1 dp, 2 dp).

**Why a signed fee rate is not a formatting nit.** `+0.85%` on the billing page reads as a fee
*increase* of 85 basis points. It is the standing rate. The `+` is a factual claim the data does not
support, and it appears on the one screen a compliance reviewer opens first.

**Choosing between the three at a call site** — the migration batches apply this test:

| Question | Formatter |
| --- | --- |
| Does it sum to 100% across siblings? | `formatWeight` |
| Is it a difference between two points in time? | `formatReturn` |
| Is it a standing rate, probability, ratio or utilisation? | `formatRate` |

- [ ] **Step 1: Write the failing test**

Replace the `describe('formatPercent', …)` block in `src/lib/__tests__/utils.test.ts` (currently
lines 38–54) with:

```ts
describe('formatWeight', () => {
  it('renders one decimal', () => {
    expect(formatWeight(62.5)).toBe('62.5%')
  })

  it('rounds to one decimal', () => {
    expect(formatWeight(27.84)).toBe('27.8%')
  })

  it('never signs a positive weight', () => {
    expect(formatWeight(34.2)).toBe('34.2%')
    expect(formatWeight(34.2)).not.toContain('+')
  })

  it('uses a true minus for a negative weight', () => {
    expect(formatWeight(-4.1)).toBe('−4.1%')
    expect(formatWeight(-4.1)).not.toContain('-')
  })

  it('renders zero', () => {
    expect(formatWeight(0)).toBe('0.0%')
  })

  it('renders negative zero as zero', () => {
    expect(formatWeight(-0)).toBe('0.0%')
  })

  it('renders NaN as zero', () => {
    expect(formatWeight(Number.NaN)).toBe('0.0%')
  })
})

describe('formatReturn', () => {
  it('signs positives and carries two decimals', () => {
    expect(formatReturn(8.42)).toBe('+8.42%')
  })

  it('uses a true minus on negatives', () => {
    expect(formatReturn(-3.02)).toBe('−3.02%')
    expect(formatReturn(-3.02)).not.toContain('-')
  })

  it('pads to two decimals', () => {
    expect(formatReturn(2.3)).toBe('+2.30%')
  })

  it('rounds to two decimals', () => {
    expect(formatReturn(-18.2417)).toBe('−18.24%')
  })

  it('does not sign zero', () => {
    expect(formatReturn(0)).toBe('0.00%')
  })

  it('does not sign negative zero', () => {
    expect(formatReturn(-0)).toBe('0.00%')
  })

  it('renders NaN as unsigned zero', () => {
    expect(formatReturn(Number.NaN)).toBe('0.00%')
  })
})

describe('formatRate', () => {
  it('never signs a fee rate', () => {
    expect(formatRate(0.85)).toBe('0.85%')
    expect(formatRate(0.85)).not.toContain('+')
  })

  it('defaults to two decimals', () => {
    expect(formatRate(99.5)).toBe('99.50%')
  })

  it('honours an explicit decimal count', () => {
    expect(formatRate(99.4523, 2)).toBe('99.45%')
    expect(formatRate(7, 0)).toBe('7%')
  })

  it('uses a true minus if a rate is somehow negative', () => {
    expect(formatRate(-0.25)).toBe('−0.25%')
  })

  it('renders zero', () => {
    expect(formatRate(0)).toBe('0.00%')
  })
})

describe('formatPercent (deprecated alias)', () => {
  it('behaves as formatReturn so migration is safe in any order', () => {
    expect(formatPercent(8.42)).toBe(formatReturn(8.42))
    expect(formatPercent(-3.02)).toBe(formatReturn(-3.02))
  })

  it('still honours an explicit decimal count', () => {
    expect(formatPercent(5.2567, 1)).toBe('+5.3%')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t format`
Expected: FAIL — `formatWeight is not a function`, `formatReturn is not a function`,
`formatRate is not a function`.

- [ ] **Step 3: Write the implementation**

Replace `src/lib/utils.ts:73-75` with:

```ts
/** Shared body: magnitude to N decimals with a percent sign, no sign character. */
function percentBody(value: number, decimals: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return `${Math.abs(safe).toFixed(decimals)}%`
}

/**
 * R23 · A weight — a share of a whole. One decimal, never signed.
 * Allocations, sleeve targets, share-of-AUM, concentration. A weight is a
 * quantity, not a movement, so `+34.2%` would be a false claim of change.
 */
export function formatWeight(value: number): string {
  return `${signPrefix(value)}${percentBody(value, 1)}`
}

/**
 * R22/R23 · A return — a change between two points in time. Two decimals,
 * signed, true minus. Zero is unsigned: `0.00%` means unchanged, and `+0.00%`
 * claims movement that did not happen.
 */
export function formatReturn(value: number): string {
  return `${signPrefix(value, { showPlus: true })}${percentBody(value, 2)}`
}

/**
 * A standing rate: fee schedule, yield, probability, match rate, utilisation.
 * Unsigned — C(iii) in critique-content.md: `formatPercent` rendered the 85 bps
 * advisory fee as `+0.85%`, which reads as a fee increase.
 */
export function formatRate(value: number, decimals = 2): string {
  return `${signPrefix(value)}${percentBody(value, decimals)}`
}

/**
 * @deprecated Use formatReturn (a change), formatWeight (a share) or formatRate
 * (a standing rate). Deleted in Task 29 of the Phase 2 plan. Retained only so
 * the ten migration batches can land in any order.
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${signPrefix(value, { showPlus: true })}${percentBody(value, decimals)}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t format`
Expected: PASS — all `formatWeight`, `formatReturn`, `formatRate` and `formatPercent` blocks green.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test:run`
Expected: green. `formatPercent`'s only behavioural change is the sign character on negatives
(hyphen → true minus) and on zero (`+0.00%` → `0.00%`). If a test asserts either old string, update
it in this commit — it was encoding the bug.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: split formatPercent into weight, return and rate (R22, R23)"
```

---

### Task 7: Basis points — one conversion, one formatter

**Files:**
- Modify: `src/lib/utils.ts` (add below `formatPercent`)
- Modify: `src/lib/__tests__/utils.test.ts` (add `rateToBps` / `percentToBps` / `formatBps` /
  `formatChange` describe blocks)

**Interfaces:**
- Consumes: `signPrefix`, `signOf` (Task 2); `formatReturn` (Task 6).
- Produces:
  ```ts
  /** A decimal fraction to basis points. 0.0085 → 85 */
  export function rateToBps(rate: number): number
  /** A percent figure to basis points. 0.85 → 85 */
  export function percentToBps(percent: number): number
  /** Format a bps figure. formatBps(64, { signed: true }) → '+64 bps' */
  export function formatBps(bps: number, options?: { signed?: boolean }): string
  /** A change in percent units; renders as bps below 1%, otherwise as a return. */
  export function formatChange(percent: number): string
  ```

Rules closed: **R22** (sub-1% changes may use bps — `+64 bps`), **R21**.
Findings closed: `critique-content.md` §4d — *"`BillingPage.tsx:97`, `:306`,
`BookOfBusinessPage.tsx:199` — bps derived three different ways (`rate*10000` in two views,
pre-converted by the API in a third)"*; `BillingPage.tsx:233` — *"`-{f.waiver!.discountBps}` —
literal ASCII hyphen in JSX"*.

**Why two conversion functions and not one.** The three existing bps sites disagree about their
input units: two multiply a decimal rate by 10,000, one receives a figure the API already converted.
A single `formatBps(rate)` taking "some number" is how that happened. Splitting conversion from
formatting makes the unit explicit at every call site — `formatBps(rateToBps(schedule.annualRate))`
cannot be misread — and `formatBps` then has exactly one input unit, basis points.

**Rounding.** Basis points are whole numbers in this product. `rateToBps(0.007638)` is `76`, not
`76.38`. Where a fraction of a basis point matters (it does not, anywhere in this app), the caller
formats the decimal rate instead.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/utils.test.ts`:

```ts
describe('rateToBps', () => {
  it('converts a decimal fraction to whole basis points', () => {
    expect(rateToBps(0.0085)).toBe(85)
    expect(rateToBps(0.0075)).toBe(75)
  })

  it('rounds to the nearest basis point', () => {
    expect(rateToBps(0.00763753)).toBe(76)
    expect(rateToBps(0.00765)).toBe(77)
  })

  it('preserves sign', () => {
    expect(rateToBps(-0.0012)).toBe(-12)
  })

  it('maps a zero rate to zero bps', () => {
    expect(rateToBps(0)).toBe(0)
  })

  it('maps NaN to zero', () => {
    expect(rateToBps(Number.NaN)).toBe(0)
  })
})

describe('percentToBps', () => {
  it('converts percent units to basis points', () => {
    expect(percentToBps(0.85)).toBe(85)
    expect(percentToBps(0.64)).toBe(64)
    expect(percentToBps(2)).toBe(200)
  })

  it('preserves sign', () => {
    expect(percentToBps(-0.12)).toBe(-12)
  })
})

describe('formatBps', () => {
  it('renders an unsigned rate in bps', () => {
    expect(formatBps(85)).toBe('85 bps')
  })

  it('signs a change when asked', () => {
    expect(formatBps(64, { signed: true })).toBe('+64 bps')
  })

  it('uses a true minus', () => {
    expect(formatBps(-12, { signed: true })).toBe('−12 bps')
    expect(formatBps(-12, { signed: true })).not.toContain('-')
  })

  it('uses a true minus even when unsigned', () => {
    expect(formatBps(-12)).toBe('−12 bps')
  })

  it('does not sign zero', () => {
    expect(formatBps(0, { signed: true })).toBe('0 bps')
  })

  it('renders a whole number even if handed a fraction', () => {
    expect(formatBps(76.38)).toBe('76 bps')
  })

  it('renders NaN as zero bps', () => {
    expect(formatBps(Number.NaN)).toBe('0 bps')
  })

  it('uses the unit "bps", lowercase, space-separated', () => {
    expect(formatBps(85)).toMatch(/^\d+ bps$/)
  })
})

describe('formatChange', () => {
  it('renders a sub-1% change in basis points', () => {
    expect(formatChange(0.64)).toBe('+64 bps')
  })

  it('renders a sub-1% fall in basis points with a true minus', () => {
    expect(formatChange(-0.12)).toBe('−12 bps')
  })

  it('renders a 1%-or-greater change as a two-decimal return', () => {
    expect(formatChange(8.42)).toBe('+8.42%')
    expect(formatChange(-3.02)).toBe('−3.02%')
  })

  it('treats exactly 1% as a return, not bps', () => {
    expect(formatChange(1)).toBe('+1.00%')
  })

  it('treats exactly −1% as a return', () => {
    expect(formatChange(-1)).toBe('−1.00%')
  })

  it('renders no change as an unsigned zero return', () => {
    expect(formatChange(0)).toBe('0.00%')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t bps`
Expected: FAIL — `rateToBps is not a function`.

- [ ] **Step 3: Write the implementation**

Add to `src/lib/utils.ts`, below `formatPercent`:

```ts
/**
 * A decimal fraction to whole basis points. 0.0085 → 85.
 * One conversion, one place. Three views previously derived bps three ways.
 */
export function rateToBps(rate: number): number {
  return Number.isFinite(rate) ? Math.round(rate * 10_000) : 0
}

/** A percent figure to whole basis points. 0.85 → 85. */
export function percentToBps(percent: number): number {
  return Number.isFinite(percent) ? Math.round(percent * 100) : 0
}

/**
 * R22 · A basis-point figure. Input is already in basis points — use
 * rateToBps() or percentToBps() at the call site so the unit is visible there.
 * `signed` adds a leading '+' to positives; negatives always take a true minus.
 */
export function formatBps(bps: number, options?: { signed?: boolean }): string {
  const safe = Number.isFinite(bps) ? Math.round(bps) : 0
  return `${signPrefix(safe, { showPlus: options?.signed })}${Math.abs(safe)} bps`
}

/** Below this magnitude (in percent units) a change is expressed in bps. R22. */
const BPS_THRESHOLD_PERCENT = 1

/**
 * R22 · A change, in percent units, rendered in whichever unit reads better:
 * basis points below 1%, a two-decimal signed return at 1% and above.
 * `formatChange(0.64)` → '+64 bps'; `formatChange(8.42)` → '+8.42%'.
 */
export function formatChange(percent: number): string {
  const safe = Number.isFinite(percent) ? percent : 0
  if (safe !== 0 && Math.abs(safe) < BPS_THRESHOLD_PERCENT) {
    return formatBps(percentToBps(safe), { signed: true })
  }
  return formatReturn(safe)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t bps`
Expected: PASS — the `rateToBps`, `percentToBps`, `formatBps` and `formatChange` blocks, 25 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: one basis-point conversion and one bps formatter (R22)"
```

---

### Task 8: The three date registers, plus time

**Files:**
- Modify: `src/lib/utils.ts:77-91` (replace `formatDate` and `formatTime`)
- Modify: `src/lib/__tests__/utils.test.ts:56-77` (replace the `formatDate` and `formatTime` blocks)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type DateFormatPattern = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

  /** R25 · table register. '2026-07-24' */
  export function formatDateISO(date: string | Date): string
  /** R25 · prose register. '24 July 2026' */
  export function formatDateProse(date: string | Date): string
  /** R25 · scheduling register. 'Aug 14' */
  export function formatDateShort(date: string | Date): string
  /** The advisor's DisplaySettings.dateFormat preference, applied. */
  export function formatDateNumeric(date: string | Date, pattern: DateFormatPattern): string
  /** '2:30 pm' — 12-hour, lowercase meridiem, UTC. */
  export function formatTime(date: string | Date): string
  /** '2026-07-24 14:30' — ISO date plus 24-hour time, for audit trails. */
  export function formatDateTime(date: string | Date): string
  /** @deprecated Removed in Task 29. Alias of formatDateISO. */
  export function formatDate(date: string | Date): string
  ```

Rules closed: **R25** (`24 July 2026` prose, `2026-07-24` tables, `Aug 14` scheduling),
**R13** (ISO dates render in mono).
Findings closed: `critique-content.md` §4a `src/lib/utils.ts:78-84`; §4c(i) — *"the date-format
setting does nothing"* (the hook in Task 10 completes that one); §4b `DashboardPage.tsx:9-14`,
`ArchivePage.tsx:109`, `tax/WashSaleCalendarView.tsx:54`, `ModelGovernancePage.tsx:91,:149,:222`.

**Three registers, three functions, no options bag.** A register is a *decision about the reader*,
not a parameter: a table reader is scanning a column and needs sortable, unambiguous ISO; a prose
reader is reading a sentence and needs `24 July 2026`; a scheduling reader is looking at the next two
weeks and does not need a year. Making it a parameter is how `formatDate` came to serve all three
badly.

**No `Intl`, no locale strings, no `toLocaleDateString`.** Month names come from two module constant
arrays. This is the fix for two separate bugs at once: the hardcoded `'en-US'` at `utils.ts:78` that
ignores the advisor's setting, and the timezone drift that makes `formatDate('2026-07-24')` render
`Jul 23, 2026` for any reader west of UTC. Every component is read in UTC.

**Every date in this product is an ISO string** — from fixtures, from `src/lib/clock.ts`, from the
MSW handlers. A `Date` built with the local-time constructor (`new Date(2024, 5, 20)`) has no
well-defined UTC date and must not be passed to these functions or asserted against in tests. The
guard below returns the empty string for an unparseable input rather than `Invalid Date`.

- [ ] **Step 1: Write the failing test**

Replace the `describe('formatDate', …)` and `describe('formatTime', …)` blocks in
`src/lib/__tests__/utils.test.ts` (currently lines 56–77) with:

```ts
describe('formatDateISO', () => {
  it('renders the table register', () => {
    expect(formatDateISO('2026-07-24')).toBe('2026-07-24')
  })

  it('drops the time from a full timestamp', () => {
    expect(formatDateISO('2026-07-24T18:45:00Z')).toBe('2026-07-24')
  })

  it('reads UTC, so a date-only string never slips a day', () => {
    expect(formatDateISO('2026-01-01T00:00:00Z')).toBe('2026-01-01')
    expect(formatDateISO('2026-12-31T23:59:59Z')).toBe('2026-12-31')
  })

  it('zero-pads single-digit months and days', () => {
    expect(formatDateISO('2026-03-05T12:00:00Z')).toBe('2026-03-05')
  })

  it('accepts a Date built from an ISO string', () => {
    expect(formatDateISO(new Date('2026-07-24T12:00:00Z'))).toBe('2026-07-24')
  })

  it('returns an empty string for an unparseable input', () => {
    expect(formatDateISO('not a date')).toBe('')
  })
})

describe('formatDateProse', () => {
  it('renders the prose register', () => {
    expect(formatDateProse('2026-07-24')).toBe('24 July 2026')
  })

  it('does not zero-pad the day', () => {
    expect(formatDateProse('2026-03-05T12:00:00Z')).toBe('5 March 2026')
  })

  it('spells the month in full', () => {
    expect(formatDateProse('2027-04-01')).toBe('1 April 2027')
    expect(formatDateProse('2025-09-10')).toBe('10 September 2025')
  })

  it('never renders the US short form', () => {
    expect(formatDateProse('2026-07-24')).not.toContain('Jul ')
    expect(formatDateProse('2026-07-24')).not.toContain(',')
  })

  it('returns an empty string for an unparseable input', () => {
    expect(formatDateProse('')).toBe('')
  })
})

describe('formatDateShort', () => {
  it('renders the scheduling register with no year', () => {
    expect(formatDateShort('2026-08-14')).toBe('Aug 14')
  })

  it('does not zero-pad the day', () => {
    expect(formatDateShort('2026-02-03T09:00:00Z')).toBe('Feb 3')
  })

  it('puts the month first, unlike the prose register', () => {
    expect(formatDateShort('2026-11-10')).toBe('Nov 10')
  })
})

describe('formatDateNumeric', () => {
  it('renders the US pattern', () => {
    expect(formatDateNumeric('2026-07-24', 'MM/DD/YYYY')).toBe('07/24/2026')
  })

  it('renders the international pattern', () => {
    expect(formatDateNumeric('2026-07-24', 'DD/MM/YYYY')).toBe('24/07/2026')
  })

  it('renders the ISO pattern', () => {
    expect(formatDateNumeric('2026-07-24', 'YYYY-MM-DD')).toBe('2026-07-24')
  })

  it('zero-pads in every pattern', () => {
    expect(formatDateNumeric('2026-03-05', 'MM/DD/YYYY')).toBe('03/05/2026')
    expect(formatDateNumeric('2026-03-05', 'DD/MM/YYYY')).toBe('05/03/2026')
  })
})

describe('formatTime', () => {
  it('renders a 12-hour time with a lowercase meridiem', () => {
    expect(formatTime('2026-07-24T14:30:00Z')).toBe('2:30 pm')
  })

  it('renders morning times', () => {
    expect(formatTime('2026-07-24T09:05:00Z')).toBe('9:05 am')
  })

  it('renders midnight as 12 am', () => {
    expect(formatTime('2026-07-24T00:05:00Z')).toBe('12:05 am')
  })

  it('renders noon as 12 pm', () => {
    expect(formatTime('2026-07-24T12:00:00Z')).toBe('12:00 pm')
  })

  it('zero-pads minutes but not hours', () => {
    expect(formatTime('2026-07-24T13:07:00Z')).toBe('1:07 pm')
  })

  it('is deterministic regardless of the runner timezone', () => {
    // A UTC-anchored assertion: this fails if the implementation reads local components.
    expect(formatTime('2026-07-24T23:45:00Z')).toBe('11:45 pm')
  })
})

describe('formatDateTime', () => {
  it('renders an audit-trail timestamp', () => {
    expect(formatDateTime('2026-07-24T14:30:00Z')).toBe('2026-07-24 14:30')
  })

  it('zero-pads the hour', () => {
    expect(formatDateTime('2026-07-24T09:05:00Z')).toBe('2026-07-24 09:05')
  })
})

describe('formatDate (deprecated alias)', () => {
  it('resolves to the table register during migration', () => {
    expect(formatDate('2026-07-24T12:00:00Z')).toBe('2026-07-24')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t Date`
Expected: FAIL — `formatDateISO is not a function`, and the surviving `formatDate` assertion reports
`expected 'Jul 24, 2026' to be '2026-07-24'`.

- [ ] **Step 3: Write the implementation**

Replace `src/lib/utils.ts:77-91` with:

```ts
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export type DateFormatPattern = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

type DateParts = {
  year: number
  monthIndex: number
  day: number
  hours: number
  minutes: number
}

/**
 * R25 · Every date component is read in UTC.
 *
 * Two bugs are closed here at once: `Intl.DateTimeFormat('en-US', …)` at the old
 * utils.ts:78 ignored the advisor's own date-format setting, and reading local
 * components made `formatDate('2026-07-24')` render `Jul 23, 2026` for any
 * reader west of UTC. Every date in this product originates as an ISO string
 * from a fixture or from src/lib/clock.ts, so UTC is the source of truth.
 *
 * Returns null for anything unparseable; the formatters render '' rather than
 * leaking the string 'Invalid Date' into the UI.
 */
function utcParts(date: string | Date): DateParts | null {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return {
    year: d.getUTCFullYear(),
    monthIndex: d.getUTCMonth(),
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  }
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** R25 · Table register. Sortable, unambiguous, renders in mono. '2026-07-24' */
export function formatDateISO(date: string | Date): string {
  const p = utcParts(date)
  if (!p) return ''
  return `${p.year}-${pad2(p.monthIndex + 1)}-${pad2(p.day)}`
}

/** R25 · Prose register, for sentences and audit-trail narrative. '24 July 2026' */
export function formatDateProse(date: string | Date): string {
  const p = utcParts(date)
  if (!p) return ''
  return `${p.day} ${MONTHS_LONG[p.monthIndex]} ${p.year}`
}

/** R25 · Scheduling register, for the next few weeks. No year. 'Aug 14' */
export function formatDateShort(date: string | Date): string {
  const p = utcParts(date)
  if (!p) return ''
  return `${MONTHS_SHORT[p.monthIndex]} ${p.day}`
}

/**
 * The advisor's DisplaySettings.dateFormat preference, applied.
 * Do not call this directly from a component — use useFormatDate() so the
 * preference is read from the settings query rather than threaded by hand.
 */
export function formatDateNumeric(date: string | Date, pattern: DateFormatPattern): string {
  const p = utcParts(date)
  if (!p) return ''
  const mm = pad2(p.monthIndex + 1)
  const dd = pad2(p.day)
  if (pattern === 'MM/DD/YYYY') return `${mm}/${dd}/${p.year}`
  if (pattern === 'DD/MM/YYYY') return `${dd}/${mm}/${p.year}`
  return `${p.year}-${mm}-${dd}`
}

/** '2:30 pm' — 12-hour, lowercase meridiem (sentence case, R18), UTC. */
export function formatTime(date: string | Date): string {
  const p = utcParts(date)
  if (!p) return ''
  const meridiem = p.hours < 12 ? 'am' : 'pm'
  const hour12 = p.hours % 12 === 0 ? 12 : p.hours % 12
  return `${hour12}:${pad2(p.minutes)} ${meridiem}`
}

/** '2026-07-24 14:30' — for audit trails and archive records. */
export function formatDateTime(date: string | Date): string {
  const p = utcParts(date)
  if (!p) return ''
  return `${formatDateISO(date)} ${pad2(p.hours)}:${pad2(p.minutes)}`
}

/**
 * @deprecated Pick a register: formatDateISO (tables), formatDateProse (prose)
 * or formatDateShort (scheduling). Deleted in Task 29 of the Phase 2 plan.
 * Aliased to the table register because 31 of the 40 legacy call sites are in
 * table cells; the nine prose sites are corrected in their migration batch.
 */
export function formatDate(date: string | Date): string {
  return formatDateISO(date)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t Date`
Expected: PASS — 27 tests.

- [ ] **Step 5: Prove timezone independence**

Run: `TZ=Pacific/Kiritimati pnpm vitest run src/lib/__tests__/utils.test.ts`
Then: `TZ=Pacific/Niue pnpm vitest run src/lib/__tests__/utils.test.ts`
Expected: PASS in both. These are UTC+14 and UTC−11 — the widest pair available. If either fails, a
formatter is reading local components.

- [ ] **Step 6: Run the full suite**

Run: `pnpm test:run`
Expected: some component tests fail where they assert `Jul 24, 2024`-style output. Update each to the
new register **in this commit** — they were asserting the old format, and the format is the bug.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: three date registers, UTC-deterministic, no hardcoded locale (R25)"
```

---

### Task 9: Masking — account numbers and tax IDs

**Files:**
- Modify: `src/lib/utils.ts` (add below `formatDate`)
- Modify: `src/lib/__tests__/utils.test.ts` (add `maskAccount` and `maskTaxId` describe blocks)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const MASK_BULLETS: '••••'
  export function maskAccount(accountNumber: string, options?: { keepPrefix?: boolean }): string
  export function maskTaxId(taxId: string): string
  ```

Rules closed: **R26** (account numbers are masked `••••4210`), **R13** (masked accounts render in
mono).
Findings closed: `critique-content.md` §4b — the nine unmasked render sites; §4d
`onboarding/steps/AccountSetupStep.tsx:76-82` — *"`Joint Owner SSN (last 4)` and `Trust EIN` rendered
as plain `type="text"`, echoed verbatim in `ReviewStep`"*.

**The account-number shapes in the fixtures** (`src/mocks/data/accounts.ts`), all of which
`maskAccount` must handle:

| Shape | Example | `keepPrefix: true` (default) | `keepPrefix: false` |
| --- | --- | --- | --- |
| Three-letter type prefix | `TRU-847291` | `TRU ••••7291` | `••••7291` |
| Numeric type prefix | `529-548861` | `529 ••••8861` | `••••8861` |
| Custodian + market + number | `HSBC-HK-90142` | `HSBC ••••0142` | `••••0142` |
| Two-segment | `CB-US-60912` | `CB ••••0912` | `••••0912` |

The prefix is everything before the **first** hyphen; the visible tail is the **last four
characters** of the whole string with separators removed. Four characters is the industry convention
and matches the spec's `••••4210`.

**Why the prefix is kept by default.** `TRU` / `IRA` / `BRK` / `529` carry the account-type signal an
advisor actually reads — the digits do not. Masking them away would remove information without
removing risk. `meridian-components.md` and `critique-content.md` §4b both endorse the
`TRU ••••7291` form explicitly.

**Tax IDs are masked unconditionally.** There is no useful prefix on an SSN or EIN, and the fields
that collect them (`src/mocks/data/onboarding.ts:93,:102,:128`) must never echo their input.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/utils.test.ts`:

```ts
describe('maskAccount', () => {
  it('masks a trust account, keeping the type prefix', () => {
    expect(maskAccount('TRU-847291')).toBe('TRU ••••7291')
  })

  it('masks a brokerage account', () => {
    expect(maskAccount('BRK-293847')).toBe('BRK ••••3847')
  })

  it('masks an IRA', () => {
    expect(maskAccount('IRA-339201')).toBe('IRA ••••9201')
  })

  it('masks a numeric-prefixed 529', () => {
    expect(maskAccount('529-548861')).toBe('529 ••••8861')
  })

  it('masks a three-segment international account', () => {
    expect(maskAccount('HSBC-HK-90142')).toBe('HSBC ••••0142')
  })

  it('masks a two-letter custodian prefix', () => {
    expect(maskAccount('CB-US-60912')).toBe('CB ••••0912')
  })

  it('drops the prefix when asked', () => {
    expect(maskAccount('TRU-847291', { keepPrefix: false })).toBe('••••7291')
  })

  it('uses exactly four bullets', () => {
    expect(maskAccount('TRU-847291')).toContain('••••')
    expect(maskAccount('TRU-847291', { keepPrefix: false })).toHaveLength(8)
  })

  it('never exposes more than the last four characters', () => {
    expect(maskAccount('TRU-847291')).not.toContain('8472')
    expect(maskAccount('TRU-847291')).not.toContain('847291')
  })

  it('handles a number with no separator', () => {
    expect(maskAccount('847291')).toBe('••••7291')
  })

  it('masks a short number entirely rather than exposing it', () => {
    expect(maskAccount('12')).toBe('••••')
  })

  it('returns an empty string for an empty input', () => {
    expect(maskAccount('')).toBe('')
  })
})

describe('maskTaxId', () => {
  it('masks an SSN to its last four digits', () => {
    expect(maskTaxId('123-45-6789')).toBe('•••••6789')
  })

  it('masks an EIN to its last four digits', () => {
    expect(maskTaxId('12-3456789')).toBe('•••••6789')
  })

  it('masks an unformatted nine-digit id', () => {
    expect(maskTaxId('123456789')).toBe('•••••6789')
  })

  it('never keeps a prefix', () => {
    expect(maskTaxId('123-45-6789')).not.toContain('123')
  })

  it('masks a short input entirely', () => {
    expect(maskTaxId('678')).toBe('•••••')
  })

  it('returns an empty string for an empty input', () => {
    expect(maskTaxId('')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t mask`
Expected: FAIL — `maskAccount is not a function`.

- [ ] **Step 3: Write the implementation**

Add to `src/lib/utils.ts`, below `formatDate`:

```ts
/** R26 · Four bullets, U+2022. Never asterisks, never a variable count. */
export const MASK_BULLETS = '••••' as const

const VISIBLE_TAIL_LENGTH = 4

/**
 * R26 · Mask an account number to its last four characters.
 *
 * The type prefix is kept by default — TRU / IRA / BRK / 529 carry the signal an
 * advisor actually reads, and masking them removes information without removing
 * risk. Pass { keepPrefix: false } where the surrounding row already states the
 * account type.
 *
 * Nine render sites shipped this value unmasked; see the Phase 2 plan's
 * "nine unmasked account-number render sites" table.
 */
export function maskAccount(accountNumber: string, options?: { keepPrefix?: boolean }): string {
  if (!accountNumber) return ''

  const compact = accountNumber.replace(/[^A-Za-z0-9]/g, '')
  const tail = compact.length >= VISIBLE_TAIL_LENGTH ? compact.slice(-VISIBLE_TAIL_LENGTH) : ''
  const masked = `${MASK_BULLETS}${tail}`

  if (options?.keepPrefix === false) return masked

  const separatorIndex = accountNumber.indexOf('-')
  if (separatorIndex <= 0) return masked

  return `${accountNumber.slice(0, separatorIndex)} ${masked}`
}

/**
 * R26 extends to tax IDs. An SSN or EIN has no prefix worth keeping, so the
 * whole value is masked to its last four digits. Never echo the raw input —
 * see critique-content.md §4d on AccountSetupStep and ReviewStep.
 */
export function maskTaxId(taxId: string): string {
  if (!taxId) return ''
  const digits = taxId.replace(/\D/g, '')
  const tail = digits.length >= VISIBLE_TAIL_LENGTH ? digits.slice(-VISIBLE_TAIL_LENGTH) : ''
  return `•••••${tail}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts -t mask`
Expected: PASS — 18 tests.

Note the `maskAccount('12')` case: `compact` is `'12'`, shorter than four, so `tail` is `''` and the
result is `'••••'` — a short number is masked entirely rather than partially exposed. `'12'` has no
hyphen so no prefix is prepended.

- [ ] **Step 5: Run the whole formatter suite and the type check**

Run: `pnpm vitest run src/lib/__tests__/utils.test.ts && pnpm type-check`
Expected: PASS, and `tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts
git commit -m "feat: add maskAccount and maskTaxId (R26)"
```

---

### Task 10: `useFormatDate` — the setting that currently does nothing

**Files:**
- Create: `src/hooks/use-format-date.ts`
- Create: `src/hooks/__tests__/use-format-date.test.tsx`
- Modify: `src/features/settings/DisplaySettingsTab.tsx:20-24` (add a live preview under the control)

**Interfaces:**
- Consumes: `formatDateNumeric`, `formatDateISO`, `formatDateProse`, `formatDateShort` (Task 8);
  `useDisplaySettings` from `@/hooks/use-settings`; `DisplaySettings` from `@/types/settings`.
- Produces:
  ```ts
  export type DateFormatters = {
    /** Table cells and any figure rendered in mono. Honours the advisor's setting. */
    formatTableDate: (date: string | Date) => string
    /** Sentences and audit-trail narrative. Always '24 July 2026'. */
    formatProseDate: (date: string | Date) => string
    /** Scheduling, next-few-weeks. Always 'Aug 14'. */
    formatShortDate: (date: string | Date) => string
    /** The resolved preference, for components that need to branch on it. */
    dateFormat: DisplaySettings['dateFormat']
  }
  export function useFormatDate(): DateFormatters
  ```

Findings closed: `critique-content.md` §4c(i) — *"`DisplaySettingsTab.tsx:20-24` offers the advisor
three options … and no render path reads the preference. A settings control that visibly does nothing
is worse than no control: it is the one thing a reviewer will test, and it fails."*

**What the setting governs, and what it does not.** The preference is a *numeric date* preference —
it exists because `07/24/2026` and `24/07/2026` are genuinely ambiguous and readers disagree. It
therefore governs the **table register only**. The prose register (`24 July 2026`) and the scheduling
register (`Aug 14`) are unambiguous by construction and are Meridian constants, not preferences:
spelling the month out is the whole point of R25's prose form. Wiring all three to the setting would
produce `24/07/2026` inside a sentence, which is worse than what ships today.

**Default and loading state.** `useDisplaySettings` is a React Query hook, so `data` is `undefined`
on first render. The fallback is `'YYYY-MM-DD'` — the ISO form Meridian prescribes for tables (R25) —
**not** the `'MM/DD/YYYY'` that `src/mocks/handlers/settings.ts:81` seeds the fixture with. A table
must never flash a US date and then resolve to an ISO one.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/use-format-date.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { useFormatDate } from '../use-format-date'
import { useUpdateDisplaySettings } from '../use-settings'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderFormatters() {
  return renderHook(
    () => ({ fmt: useFormatDate(), update: useUpdateDisplaySettings() }),
    { wrapper: createWrapper() },
  )
}

describe('useFormatDate', () => {
  it('falls back to ISO before settings resolve, never to a US date', () => {
    const { result } = renderFormatters()
    expect(result.current.fmt.dateFormat).toBe('YYYY-MM-DD')
    expect(result.current.fmt.formatTableDate('2026-07-24')).toBe('2026-07-24')
  })

  it('applies the advisor MM/DD/YYYY preference to table dates', async () => {
    const { result } = renderFormatters()
    await waitFor(() => expect(result.current.fmt.dateFormat).toBe('MM/DD/YYYY'))
    expect(result.current.fmt.formatTableDate('2026-07-24')).toBe('07/24/2026')
  })

  it('applies the DD/MM/YYYY preference', async () => {
    const { result } = renderFormatters()
    await waitFor(() => expect(result.current.update.isIdle).toBe(true))
    result.current.update.mutate({
      reportingCurrency: 'USD',
      showOriginalCurrency: false,
      compactNumbers: false,
      dateFormat: 'DD/MM/YYYY',
    })
    await waitFor(() => expect(result.current.fmt.dateFormat).toBe('DD/MM/YYYY'))
    expect(result.current.fmt.formatTableDate('2026-07-24')).toBe('24/07/2026')
  })

  it('applies the YYYY-MM-DD preference', async () => {
    const { result } = renderFormatters()
    await waitFor(() => expect(result.current.update.isIdle).toBe(true))
    result.current.update.mutate({
      reportingCurrency: 'USD',
      showOriginalCurrency: false,
      compactNumbers: false,
      dateFormat: 'YYYY-MM-DD',
    })
    await waitFor(() => expect(result.current.fmt.dateFormat).toBe('YYYY-MM-DD'))
    expect(result.current.fmt.formatTableDate('2026-07-24')).toBe('2026-07-24')
  })

  it('does not apply the preference to the prose register', async () => {
    const { result } = renderFormatters()
    await waitFor(() => expect(result.current.fmt.dateFormat).toBe('MM/DD/YYYY'))
    expect(result.current.fmt.formatProseDate('2026-07-24')).toBe('24 July 2026')
  })

  it('does not apply the preference to the scheduling register', async () => {
    const { result } = renderFormatters()
    await waitFor(() => expect(result.current.fmt.dateFormat).toBe('MM/DD/YYYY'))
    expect(result.current.fmt.formatShortDate('2026-08-14')).toBe('Aug 14')
  })

  it('returns stable function identities across renders with the same setting', async () => {
    const { result, rerender } = renderFormatters()
    await waitFor(() => expect(result.current.fmt.dateFormat).toBe('MM/DD/YYYY'))
    const first = result.current.fmt.formatTableDate
    rerender()
    expect(result.current.fmt.formatTableDate).toBe(first)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/__tests__/use-format-date.test.tsx`
Expected: FAIL — `Failed to resolve import "../use-format-date"`.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-format-date.ts`:

```ts
import { useCallback, useMemo } from 'react'
import { useDisplaySettings } from '@/hooks/use-settings'
import { formatDateNumeric, formatDateProse, formatDateShort } from '@/lib/utils'
import type { DisplaySettings } from '@/types/settings'

export type DateFormatters = {
  formatTableDate: (date: string | Date) => string
  formatProseDate: (date: string | Date) => string
  formatShortDate: (date: string | Date) => string
  dateFormat: DisplaySettings['dateFormat']
}

/**
 * R25 · The only place DisplaySettings.dateFormat is consumed.
 *
 * The preference governs the TABLE register only. `24 July 2026` and `Aug 14`
 * are unambiguous by construction and are Meridian constants, not preferences —
 * wiring them to the setting would put `24/07/2026` inside a sentence.
 *
 * The pre-resolution fallback is ISO, not the fixture's MM/DD/YYYY: a table
 * must never flash a US date and then resolve to an ISO one.
 *
 * Mirrors use-format-currency.ts. Keep the two in step.
 */
export function useFormatDate(): DateFormatters {
  const { data } = useDisplaySettings()
  const dateFormat: DisplaySettings['dateFormat'] = data?.dateFormat ?? 'YYYY-MM-DD'

  const formatTableDate = useCallback(
    (date: string | Date) => formatDateNumeric(date, dateFormat),
    [dateFormat],
  )

  return useMemo(
    () => ({
      formatTableDate,
      formatProseDate: formatDateProse,
      formatShortDate: formatDateShort,
      dateFormat,
    }),
    [formatTableDate, dateFormat],
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/__tests__/use-format-date.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 5: Make the setting visibly do something**

In `src/features/settings/DisplaySettingsTab.tsx`, replace the `DATE_FORMATS` constant at lines 20–24
so each option shows the date it produces, using the frozen clock:

```tsx
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { formatDateNumeric } from '@/lib/utils'

const DATE_FORMATS: { value: DisplaySettings['dateFormat']; label: string }[] = [
  { value: 'MM/DD/YYYY', label: `US — ${formatDateNumeric(MOCK_TODAY_ISO, 'MM/DD/YYYY')}` },
  { value: 'DD/MM/YYYY', label: `International — ${formatDateNumeric(MOCK_TODAY_ISO, 'DD/MM/YYYY')}` },
  { value: 'YYYY-MM-DD', label: `ISO 8601 — ${formatDateNumeric(MOCK_TODAY_ISO, 'YYYY-MM-DD')}` },
]
```

Sentence case, per R18 — `International`, not `(International)` in Title Case parentheses.

- [ ] **Step 6: Run the full suite and the type check**

Run: `pnpm test:run && pnpm type-check`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-format-date.ts src/hooks/__tests__/use-format-date.test.tsx src/features/settings/DisplaySettingsTab.tsx
git commit -m "feat: wire the date-format setting through useFormatDate (R25)"
```

---

### Task 11: `DeltaValue` — the only correct way to render a change figure

**Files:**
- Create: `src/components/ui/DeltaValue.tsx`
- Create: `src/components/ui/__tests__/DeltaValue.test.tsx`
- Modify: `src/index.css` (add three status colour aliases below the `tabular-figures` utility)

**Interfaces:**
- Consumes: `TABULAR_NUMS`, `cn`, `signOf`, `formatReturn`, `formatBps`, `formatCurrency`,
  `formatCompactCurrency`, `formatAccounting` (Tasks 1–9); `CurrencyCode` from `@/types/currency`.
- Produces:
  ```ts
  export type DeltaFormat = 'percent' | 'currency' | 'bps' | 'number'
  export type DeltaValueProps = {
    /** The change itself. Percent units for 'percent', basis points for 'bps'. */
    value: number
    /** Default 'percent'. */
    format?: DeltaFormat
    /** Only meaningful when format is 'currency'. Default 'USD'. */
    currency?: CurrencyCode
    /** Only meaningful when format is 'currency'. Default false. */
    compact?: boolean
    /** Statement/table contexts: negatives render ($284,100) with no sign. Default false. */
    parenthesise?: boolean
    /** Default true. Set false inside dense table cells. */
    showArrow?: boolean
    /** Default true. Set false when the arrow already carries direction. */
    showSign?: boolean
    /** What the figure is a change in, for the accessible label. e.g. 'year to date'. */
    label?: string
    className?: string
  }
  export function DeltaValue(props: DeltaValueProps): JSX.Element
  ```

Contract source: `meridian-components.md` — *"**The only correct way to render a change figure —
never colour a plain number by hand.** … Always tabular mono. Uses a **true minus (−), not a
hyphen**. `parenthesise` for statement/table contexts."*

Rules closed: **R7** (positive = moss, negative = rust — not green/red defaults), **R13**, **R14**,
**R21**, **R22**, **R24**.
Findings closed: `critique-design-system.md` — *"DeltaValue — missing. … signed values are assembled
inline in ≥30 places from `formatPercent()` + a `TrendingUp`/`TrendingDown` icon + a colour class
(`MetricCard.tsx:17-31`, `DenseMetricsBar.tsx:12-27`). … This is the single highest-leverage missing
component."*; `critique-content.md` §4d `BookAnalyticsView.tsx:68,:76` — *"AUM-growth columns
hard-coded `text-accent-green`; negative growth renders green"*; `ModelTradeView.tsx:169` — *"drift
rendered red with no sign at all"*.

**Two colour swap points, then never again.** `DeltaValue` reads `--status-positive`,
`--status-negative` and `--status-neutral`. Task 11 defines them as aliases of the app's current
accent tokens; Phase 3 redefines those three lines to moss `#365A39` and rust `#A8452F` and every
delta in the product moves at once, with **zero component edits**. This is the same discipline as
`tabular-figures` in Task 1, and for the same reason.

**Arrows, not triangles.** Meridian's icon vocabulary assigns `arrow-up-right` / `arrow-down-right`
to performance (`design-system-brief.md` §8). `TrendingUp` / `TrendingDown` — what `MetricCard.tsx:1`
and `DenseMetricsBar.tsx:1` import today — are chart glyphs, not direction glyphs, and read as
"a trend line" beside a single figure.

**The accessible name.** A screen reader announces U+2212 inconsistently — sometimes "minus",
sometimes nothing at all. The visible string is therefore marked `aria-hidden` and a spelled-out
label is exposed: `down 3.02 percent, year to date`. The arrow glyph is decorative and also hidden.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/DeltaValue.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeltaValue } from '../DeltaValue'

describe('DeltaValue — percent (default)', () => {
  it('renders a signed two-decimal return', () => {
    render(<DeltaValue value={1.42} />)
    expect(screen.getByText('+1.42%')).toBeInTheDocument()
  })

  it('renders a fall with a true minus, never a hyphen', () => {
    render(<DeltaValue value={-3.02} />)
    const el = screen.getByText('−3.02%')
    expect(el).toBeInTheDocument()
    expect(el.textContent).not.toContain('-')
  })

  it('renders zero unsigned', () => {
    render(<DeltaValue value={0} />)
    expect(screen.getByText('0.00%')).toBeInTheDocument()
  })

  it('renders negative zero as unsigned zero', () => {
    render(<DeltaValue value={-0} />)
    expect(screen.getByText('0.00%')).toBeInTheDocument()
  })

  it('drops the sign when showSign is false', () => {
    render(<DeltaValue value={-3.02} showSign={false} />)
    expect(screen.getByText('3.02%')).toBeInTheDocument()
  })
})

describe('DeltaValue — currency', () => {
  it('renders a signed table figure', () => {
    render(<DeltaValue value={1_148_300} format="currency" />)
    expect(screen.getByText('+$1,148,300.00')).toBeInTheDocument()
  })

  it('renders a compact figure when asked', () => {
    render(<DeltaValue value={4_210_000} format="currency" compact />)
    expect(screen.getByText('+$4.21M')).toBeInTheDocument()
  })

  it('parenthesises negatives in statement contexts', () => {
    render(<DeltaValue value={-284_100} format="currency" parenthesise showArrow={false} />)
    const el = screen.getByText('($284,100.00)')
    expect(el).toBeInTheDocument()
    expect(el.textContent).not.toContain('−')
    expect(el.textContent).not.toContain('-')
  })

  it('leaves positives unparenthesised and unsigned in statement contexts', () => {
    render(<DeltaValue value={284_100} format="currency" parenthesise showArrow={false} />)
    expect(screen.getByText('$284,100.00')).toBeInTheDocument()
  })

  it('honours a non-USD currency', () => {
    render(<DeltaValue value={-1000} format="currency" currency="GBP" />)
    expect(screen.getByText('−£1,000.00')).toBeInTheDocument()
  })
})

describe('DeltaValue — bps', () => {
  it('renders a signed basis-point change', () => {
    render(<DeltaValue value={64} format="bps" />)
    expect(screen.getByText('+64 bps')).toBeInTheDocument()
  })

  it('renders a fall in basis points with a true minus', () => {
    render(<DeltaValue value={-12} format="bps" />)
    expect(screen.getByText('−12 bps')).toBeInTheDocument()
  })
})

describe('DeltaValue — number', () => {
  it('renders a signed plain figure to two decimals', () => {
    render(<DeltaValue value={-2} format="number" />)
    expect(screen.getByText('−2.00')).toBeInTheDocument()
  })
})

describe('DeltaValue — tone', () => {
  it('is positive-toned when the value rises', () => {
    const { container } = render(<DeltaValue value={1.42} />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'positive')
  })

  it('is negative-toned when the value falls', () => {
    const { container } = render(<DeltaValue value={-1.42} />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'negative')
  })

  it('is neutral-toned at zero', () => {
    const { container } = render(<DeltaValue value={0} />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'zero')
  })

  it('takes tone from the sign even in statement mode', () => {
    const { container } = render(<DeltaValue value={-284_100} format="currency" parenthesise />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'negative')
  })
})

describe('DeltaValue — typography', () => {
  it('always carries the tabular mono classes', () => {
    const { container } = render(<DeltaValue value={1.42} />)
    const root = container.firstElementChild!
    expect(root.className).toContain('font-mono')
    expect(root.className).toContain('tabular-figures')
  })

  it('keeps the tabular classes when a className is passed', () => {
    const { container } = render(<DeltaValue value={1.42} className="text-caption" />)
    const root = container.firstElementChild!
    expect(root.className).toContain('tabular-figures')
    expect(root.className).toContain('text-caption')
  })
})

describe('DeltaValue — arrow', () => {
  it('renders an arrow by default', () => {
    const { container } = render(<DeltaValue value={1.42} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders no arrow when showArrow is false', () => {
    const { container } = render(<DeltaValue value={1.42} showArrow={false} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('hides the arrow from assistive technology', () => {
    const { container } = render(<DeltaValue value={1.42} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('DeltaValue — accessible name', () => {
  it('spells out a rise', () => {
    render(<DeltaValue value={1.42} />)
    expect(screen.getByRole('img', { name: 'up 1.42 percent' })).toBeInTheDocument()
  })

  it('spells out a fall, so the true minus is never announced as "hyphen"', () => {
    render(<DeltaValue value={-3.02} />)
    expect(screen.getByRole('img', { name: 'down 3.02 percent' })).toBeInTheDocument()
  })

  it('spells out no change', () => {
    render(<DeltaValue value={0} />)
    expect(screen.getByRole('img', { name: 'no change' })).toBeInTheDocument()
  })

  it('appends the supplied label', () => {
    render(<DeltaValue value={1.42} label="year to date" />)
    expect(screen.getByRole('img', { name: 'up 1.42 percent, year to date' })).toBeInTheDocument()
  })

  it('spells out a currency fall', () => {
    render(<DeltaValue value={-284_100} format="currency" />)
    expect(screen.getByRole('img', { name: 'down $284,100.00' })).toBeInTheDocument()
  })

  it('spells out a basis-point rise', () => {
    render(<DeltaValue value={64} format="bps" />)
    expect(screen.getByRole('img', { name: 'up 64 basis points' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/__tests__/DeltaValue.test.tsx`
Expected: FAIL — `Failed to resolve import "../DeltaValue"`.

- [ ] **Step 3: Add the three status colour aliases**

In `src/index.css`, inside the existing `@layer base { :root { … } }` block, below the current
`--accent-red` declaration:

```css
    /* R7 · Delta tone. Moss up, rust down — not green/red defaults.
       PHASE 3: redefine these three lines to --moss-700 / --rust-500 /
       --stone-600. Every DeltaValue in the product moves at once and NO
       component file changes. Do not hardcode a delta colour anywhere else. */
    --status-positive: var(--accent-green);
    --status-negative: var(--accent-red);
    --status-neutral: var(--text-tertiary);
```

Add the matching three lines to the dark-theme block in the same file so dark mode does not fall back
to the light values.

- [ ] **Step 4: Write the component**

Create `src/components/ui/DeltaValue.tsx`:

```tsx
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import {
  TABULAR_NUMS,
  cn,
  signOf,
  formatReturn,
  formatBps,
  formatCurrency,
  formatCompactCurrency,
  formatAccounting,
} from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'

export type DeltaFormat = 'percent' | 'currency' | 'bps' | 'number'

export type DeltaValueProps = {
  value: number
  format?: DeltaFormat
  currency?: CurrencyCode
  compact?: boolean
  parenthesise?: boolean
  showArrow?: boolean
  showSign?: boolean
  label?: string
  className?: string
}

const TONE_CLASS = {
  positive: 'text-[var(--status-positive)]',
  negative: 'text-[var(--status-negative)]',
  zero: 'text-[var(--status-neutral)]',
} as const

const TONE_ICON = {
  positive: ArrowUpRight,
  negative: ArrowDownRight,
  zero: Minus,
} as const

/** The visible string. Parenthesised statement form suppresses the sign entirely. */
function renderText(props: Required<Pick<DeltaValueProps, 'value' | 'format'>> & DeltaValueProps): string {
  const { value, format, currency = 'USD', compact, parenthesise, showSign = true } = props

  if (format === 'currency') {
    if (parenthesise) return formatAccounting(value, currency)
    if (compact) return formatCompactCurrency(showSign ? value : Math.abs(value), currency)
    return formatCurrency(showSign ? value : Math.abs(value), { currency, signed: showSign })
  }

  if (format === 'bps') {
    return formatBps(showSign ? value : Math.abs(value), { signed: showSign })
  }

  if (format === 'number') {
    const magnitude = Math.abs(Number.isFinite(value) ? value : 0).toFixed(2)
    if (!showSign) return magnitude
    const sign = signOf(value)
    return sign === 'negative' ? `−${magnitude}` : sign === 'positive' ? `+${magnitude}` : magnitude
  }

  // 'percent' — a change, so two decimals (R22) even when the sign is suppressed.
  if (!showSign) return `${Math.abs(Number.isFinite(value) ? value : 0).toFixed(2)}%`
  return formatReturn(value)
}

/** The spelled-out name, because U+2212 is announced inconsistently. */
function renderAccessibleName(props: DeltaValueProps): string {
  const { value, format = 'percent', currency = 'USD', label } = props
  const sign = signOf(value)
  if (sign === 'zero') return label ? `no change, ${label}` : 'no change'

  const direction = sign === 'positive' ? 'up' : 'down'
  const magnitude = Math.abs(Number.isFinite(value) ? value : 0)

  const quantity =
    format === 'currency'
      ? formatCurrency(magnitude, { currency })
      : format === 'bps'
        ? `${Math.round(magnitude)} basis points`
        : format === 'number'
          ? magnitude.toFixed(2)
          : `${magnitude.toFixed(2)} percent`

  return label ? `${direction} ${quantity}, ${label}` : `${direction} ${quantity}`
}

/**
 * The only correct way to render a change figure — never colour a plain number
 * by hand. Tabular mono, true minus, tone from the sign.
 *
 * R7/R13/R14/R21/R22/R24. Contract: meridian-components.md § data/DeltaValue.
 */
export function DeltaValue(props: DeltaValueProps) {
  const { value, format = 'percent', showArrow = true, className } = props
  const tone = signOf(value)
  const Icon = TONE_ICON[tone]

  return (
    <span
      data-tone={tone}
      role="img"
      aria-label={renderAccessibleName(props)}
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap',
        TABULAR_NUMS,
        TONE_CLASS[tone],
        className,
      )}
    >
      {showArrow && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span aria-hidden="true">{renderText({ ...props, value, format })}</span>
    </span>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/__tests__/DeltaValue.test.tsx`
Expected: PASS — 27 tests.

- [ ] **Step 6: Type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/DeltaValue.tsx src/components/ui/__tests__/DeltaValue.test.tsx src/index.css
git commit -m "feat: add DeltaValue, the only sanctioned change-figure renderer (R7, R21)"
```

---

### Task 12: `Tag` — the only pill in the system

**Files:**
- Create: `src/components/ui/Tag.tsx`
- Create: `src/components/ui/__tests__/Tag.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`; `X` from `lucide-react`.
- Produces:
  ```ts
  export type TagProps = {
    children: React.ReactNode
    /** Filled ink. R53 — selected state is a fill, not an outline. */
    selected?: boolean
    /** Makes the tag a filter toggle. */
    onClick?: () => void
    /** Renders a dismiss control. Requires `removeLabel` to be meaningful. */
    onRemove?: () => void
    /** Accessible name for the dismiss control. Default: `Remove ${children}` when children is a string. */
    removeLabel?: string
    className?: string
  }
  export function Tag(props: TagProps): JSX.Element
  ```

Contract source: `meridian-components.md` — *"Pill chip for filters and user-applied labels — **the
only pill-shaped element in the system**. … Selected = filled ink. Use `Badge` for system-derived
status instead."*

Rules closed: **R43** (buttons are 8px rectangles; only Tags and toggles are pill-shaped),
**R44** (badges/chips 4px), **R53** (selected is a fill, not an outline), **R54** (focus always
visible), **R18** (sentence case).
Findings closed: `critique-design-system.md` — *"Tag — missing. No Tag primitive. Meridian's Tag is
the only pill, and selected-Tag state is an ink fill. The app instead uses `rounded-full` `<span>`s ad
hoc in ≥15 files and `EngagePage.tsx:112,127` uses `rounded-full` buttons as filter tags with a
blue-fill selected state."*

**Tag versus Badge — the line the codebase currently does not draw.** A `Badge` states something the
system derived: `Drifted`, `Reconciled`, `Pending`. A `Tag` states something a person applied or a
filter the advisor turned on: `Retirement`, `Taxable`, `Q3 review`. `Badge` is 4px-radius and soft
tinted; `Tag` is pill and, when selected, ink-filled. Today `Badge.tsx:22` is `rounded-full`, which is
why every screenshot shows pill status chips — Phase 4 fixes `Badge`; this task supplies the
primitive that legitimately *is* a pill.

**Three shapes in one component.** A `Tag` with neither `onClick` nor `onRemove` is a `<span>` — a
static label must not be in the tab order. With `onClick` it is a `<button>`. With `onRemove` it is a
`<span>` wrapping a nested `<button>`, because a dismiss control inside a button is invalid HTML.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/Tag.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tag } from '../Tag'

describe('Tag — shape', () => {
  it('is pill-shaped, unlike every other control in the system', () => {
    const { container } = render(<Tag>Retirement</Tag>)
    expect(container.firstElementChild!.className).toContain('rounded-full')
  })

  it('renders a plain span when it is neither clickable nor removable', () => {
    const { container } = render(<Tag>Retirement</Tag>)
    expect(container.firstElementChild!.tagName).toBe('SPAN')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders a button when clickable', () => {
    render(<Tag onClick={() => {}}>Taxable</Tag>)
    expect(screen.getByRole('button', { name: 'Taxable' })).toBeInTheDocument()
  })
})

describe('Tag — selected', () => {
  it('is a fill, not an outline', () => {
    const { container } = render(<Tag selected>Retirement</Tag>)
    const className = container.firstElementChild!.className
    expect(className).toContain('bg-')
    expect(container.firstElementChild).toHaveAttribute('data-selected', 'true')
  })

  it('reports its pressed state when it is a filter toggle', () => {
    render(<Tag selected onClick={() => {}}>Taxable</Tag>)
    expect(screen.getByRole('button', { name: 'Taxable' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports the unpressed state', () => {
    render(<Tag onClick={() => {}}>Taxable</Tag>)
    expect(screen.getByRole('button', { name: 'Taxable' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not claim a pressed state when it is not a toggle', () => {
    const { container } = render(<Tag selected>Retirement</Tag>)
    expect(container.firstElementChild).not.toHaveAttribute('aria-pressed')
  })
})

describe('Tag — interaction', () => {
  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<Tag onClick={onClick}>Taxable</Tag>)
    await userEvent.click(screen.getByRole('button', { name: 'Taxable' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('calls onRemove', async () => {
    const onRemove = vi.fn()
    render(<Tag onRemove={onRemove}>Retirement</Tag>)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Retirement' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('honours an explicit removeLabel', async () => {
    const onRemove = vi.fn()
    render(<Tag onRemove={onRemove} removeLabel="Clear the retirement filter">Retirement</Tag>)
    await userEvent.click(screen.getByRole('button', { name: 'Clear the retirement filter' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('does not fire onClick when the remove control is pressed', async () => {
    const onClick = vi.fn()
    const onRemove = vi.fn()
    render(<Tag onClick={onClick} onRemove={onRemove}>Retirement</Tag>)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Retirement' }))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('nests the remove control outside the clickable tag, not inside it', () => {
    render(<Tag onClick={() => {}} onRemove={() => {}}>Retirement</Tag>)
    const remove = screen.getByRole('button', { name: 'Remove Retirement' })
    expect(remove.closest('button')).toBe(remove)
  })
})

describe('Tag — focus', () => {
  it('keeps a visible focus ring', () => {
    render(<Tag onClick={() => {}}>Taxable</Tag>)
    expect(screen.getByRole('button', { name: 'Taxable' }).className).toContain('focus-visible:ring')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/__tests__/Tag.test.tsx`
Expected: FAIL — `Failed to resolve import "../Tag"`.

- [ ] **Step 3: Write the component**

Create `src/components/ui/Tag.tsx`:

```tsx
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TagProps = {
  children: React.ReactNode
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  removeLabel?: string
  className?: string
}

const BASE =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium ' +
  'transition-colors duration-[120ms] focus-visible:outline-hidden focus-visible:ring-2 ' +
  'focus-visible:ring-border-secondary focus-visible:ring-offset-1'

/** R53 · selected is a fill, not an outline. Phase 3 swaps these for ink/cream. */
const SELECTED = 'bg-text-primary text-surface-primary'
const UNSELECTED = 'bg-surface-tertiary text-text-secondary'

/**
 * Pill chip for filters and user-applied labels — the only pill-shaped element
 * in Meridian (R43). Use `Badge` for system-derived status instead.
 *
 * Contract: meridian-components.md § core/Tag.
 */
export function Tag({ children, selected, onClick, onRemove, removeLabel, className }: TagProps) {
  const tone = selected ? SELECTED : UNSELECTED
  const label = removeLabel ?? (typeof children === 'string' ? `Remove ${children}` : 'Remove tag')

  const body = (
    <>
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            'ml-0.5 -mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full',
            'hover:bg-black/10 focus-visible:outline-hidden focus-visible:ring-2',
            'focus-visible:ring-border-secondary',
          )}
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </>
  )

  // A dismiss control cannot live inside a <button>, so a removable tag is
  // always a span — even when it is also a filter toggle.
  if (onClick && !onRemove) {
    return (
      <button
        type="button"
        data-selected={selected ? 'true' : 'false'}
        aria-pressed={selected ? 'true' : 'false'}
        onClick={onClick}
        className={cn(BASE, tone, 'hover:bg-surface-secondary', className)}
      >
        {children}
      </button>
    )
  }

  return (
    <span
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      className={cn(BASE, tone, className)}
    >
      {body}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/__tests__/Tag.test.tsx`
Expected: PASS — 13 tests.

- [ ] **Step 5: Type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: clean. If `eslint` flags the click handler on the `<span>` branch
(`jsx-a11y/no-noninteractive-element-interactions`), that branch only receives `onClick` alongside
`onRemove`, where the tag body is decorative and the actionable control is the nested button — add
the rule disable inline with the reason, do not remove the handler.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Tag.tsx src/components/ui/__tests__/Tag.test.tsx
git commit -m "feat: add Tag, the only pill-shaped primitive (R43, R53)"
```

---

### Task 13: `IconButton` — square, icon-only, `label` always required

**Files:**
- Create: `src/components/ui/IconButton.tsx`
- Create: `src/components/ui/__tests__/IconButton.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`; `LucideIcon` type from `lucide-react`.
- Produces:
  ```ts
  export type IconButtonVariant = 'ghost' | 'outline' | 'inverse'
  export type IconButtonSize = 'sm' | 'md'
  export type IconButtonProps =
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
      /** A Lucide component, e.g. `SlidersHorizontal`. Never a hand-rolled SVG (R59). */
      icon: LucideIcon
      /** REQUIRED. The accessible name and the tooltip text. There is no default. */
      label: string
      /** Default 'ghost'. */
      variant?: IconButtonVariant
      /** 'sm' = 28px, 'md' = 34px. Default 'md'. */
      size?: IconButtonSize
      /** Toggled-on state — a fill, not an outline (R53). */
      active?: boolean
    }
  export const IconButton: React.ForwardRefExoticComponent<
    IconButtonProps & React.RefAttributes<HTMLButtonElement>
  >
  ```

Contract source: `meridian-components.md` — *"Square icon-only control for toolbars, row actions and
panel headers — **always pass `label`**. … `ghost` is the default (transparent, warm hover wash).
`outline` when it sits on a cream surface with no neighbours. `inverse` on the ink nav rail."*

Rules closed: **R43** (rectangles, not pills), **R54** (focus always visible), **R59/R60** (Lucide
outline only; hit areas ≥26px).
Findings closed: `critique-design-system.md` — *"Missing: `IconButton` primitive; the app hand-rolls
9 of them in `TopBar.tsx:69-125` at `h-9 w-9` (36px ✓ but `rounded-full` on the avatar at L121)."*

**`label` is a required prop, not an optional one.** The whole failure mode this component exists to
prevent is an icon-only control with no accessible name. TypeScript enforces it: `aria-label` is
`Omit`-ed from the inherited button props so a caller cannot route around `label`, and there is no
default value to fall back to. A missing `label` is a compile error, not a lint warning.

**`ghost` is the default because most icon buttons sit in a toolbar** next to siblings that already
supply the boundary. `outline` is for the isolated case; `inverse` is for the ink nav rail, where the
foreground is cream and the hover wash is cream at low opacity rather than ink at low opacity.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/IconButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlidersHorizontal, X } from 'lucide-react'
import { IconButton } from '../IconButton'

describe('IconButton — accessible name', () => {
  it('exposes the label as the accessible name', () => {
    render(<IconButton icon={SlidersHorizontal} label="Filters" />)
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('hides the glyph from assistive technology', () => {
    const { container } = render(<IconButton icon={X} label="Close" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sets the label as a title so it doubles as a tooltip', () => {
    render(<IconButton icon={X} label="Close" />)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('title', 'Close')
  })
})

describe('IconButton — shape', () => {
  it('is square at the medium size — 34px', () => {
    render(<IconButton icon={X} label="Close" />)
    const el = screen.getByRole('button', { name: 'Close' })
    expect(el.className).toContain('h-[34px]')
    expect(el.className).toContain('w-[34px]')
  })

  it('is square at the small size — 28px', () => {
    render(<IconButton icon={X} label="Close" size="sm" />)
    const el = screen.getByRole('button', { name: 'Close' })
    expect(el.className).toContain('h-7')
    expect(el.className).toContain('w-7')
  })

  it('is never a pill — R43', () => {
    render(<IconButton icon={X} label="Close" />)
    const el = screen.getByRole('button', { name: 'Close' })
    expect(el.className).toContain('rounded-md')
    expect(el.className).not.toContain('rounded-full')
  })
})

describe('IconButton — variants', () => {
  it('is ghost by default', () => {
    render(<IconButton icon={X} label="Close" />)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('data-variant', 'ghost')
  })

  it('renders the outline variant', () => {
    render(<IconButton icon={X} label="Close" variant="outline" />)
    const el = screen.getByRole('button', { name: 'Close' })
    expect(el).toHaveAttribute('data-variant', 'outline')
    expect(el.className).toContain('border')
  })

  it('renders the inverse variant for the ink nav rail', () => {
    render(<IconButton icon={X} label="Close" variant="inverse" />)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('data-variant', 'inverse')
  })
})

describe('IconButton — active', () => {
  it('reports its pressed state', () => {
    render(<IconButton icon={SlidersHorizontal} label="Filters" active />)
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not claim a pressed state when active is not set', () => {
    render(<IconButton icon={SlidersHorizontal} label="Filters" />)
    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveAttribute('aria-pressed')
  })
})

describe('IconButton — behaviour', () => {
  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<IconButton icon={X} label="Close" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<IconButton icon={X} label="Close" onClick={onClick} disabled />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button" so it never submits a form', () => {
    render(<IconButton icon={X} label="Close" />)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('type', 'button')
  })

  it('keeps a visible focus ring — R54', () => {
    render(<IconButton icon={X} label="Close" />)
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('focus-visible:ring')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/__tests__/IconButton.test.tsx`
Expected: FAIL — `Failed to resolve import "../IconButton"`.

- [ ] **Step 3: Write the component**

Create `src/components/ui/IconButton.tsx`:

```tsx
import { forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconButtonVariant = 'ghost' | 'outline' | 'inverse'
export type IconButtonSize = 'sm' | 'md'

export type IconButtonProps =
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
    icon: LucideIcon
    /** REQUIRED — the accessible name and the tooltip. There is no default. */
    label: string
    variant?: IconButtonVariant
    size?: IconButtonSize
    active?: boolean
  }

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
  outline:
    'border border-border-primary bg-surface-primary text-text-secondary ' +
    'hover:bg-surface-tertiary hover:border-border-secondary hover:text-text-primary',
  inverse: 'text-white/70 hover:bg-white/12 hover:text-white',
}

/** R53 · active is a fill, not an outline. */
const ACTIVE: Record<IconButtonVariant, string> = {
  ghost: 'bg-surface-tertiary text-text-primary',
  outline: 'bg-surface-tertiary text-text-primary border-border-secondary',
  inverse: 'bg-white/15 text-white',
}

/** R60 · hit areas are at least 26px square. 28 / 34px per the Meridian contract. */
const SIZES: Record<IconButtonSize, { box: string; glyph: string }> = {
  sm: { box: 'h-7 w-7', glyph: 'h-3.5 w-3.5' },
  md: { box: 'h-[34px] w-[34px]', glyph: 'h-4 w-4' },
}

/**
 * Square icon-only control for toolbars, row actions and panel headers.
 * `label` is required — an icon-only control without an accessible name is the
 * exact failure this component exists to prevent, so it is a compile error.
 *
 * Contract: meridian-components.md § core/IconButton. R43, R54, R59, R60.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, variant = 'ghost', size = 'md', active, className, type, ...props }, ref) => {
    const metrics = SIZES[size]
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        title={label}
        aria-label={label}
        aria-pressed={active ? 'true' : undefined}
        data-variant={variant}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md',
          'transition-colors duration-[120ms]',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-secondary focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
          metrics.box,
          active ? ACTIVE[variant] : VARIANTS[variant],
          className,
        )}
        {...props}
      >
        <Icon className={metrics.glyph} aria-hidden="true" />
      </button>
    )
  },
)
IconButton.displayName = 'IconButton'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/__tests__/IconButton.test.tsx`
Expected: PASS — 15 tests.

- [ ] **Step 5: Prove `label` is compile-enforced**

Run this throwaway check, then delete the file:

```bash
cat > /tmp/iconbutton-label-check.tsx <<'EOF'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
export const Bad = () => <IconButton icon={X} />
EOF
cp /tmp/iconbutton-label-check.tsx src/__label-check.tsx
pnpm type-check; rm src/__label-check.tsx
```
Expected: `tsc` reports `Property 'label' is missing`. If it compiles, `label` was made optional and
the component's entire reason for existing is gone.

- [ ] **Step 6: Type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/IconButton.tsx src/components/ui/__tests__/IconButton.test.tsx
git commit -m "feat: add IconButton with a required label (R43, R54, R60)"
```

---

### Task 14: The compliance register

**Files:**
- Create: `src/lib/compliance-register.ts`
- Create: `src/lib/__tests__/compliance-register.test.ts`

**Interfaces:**
- Consumes: `formatDateISO`, `formatDateProse` (Task 8); `MOCK_TODAY_ISO` from `@/lib/clock`
  (created by Phase 1, Task 1).
- Produces:
  ```ts
  export const FEE_BASIS: { readonly net: 'net of fees'; readonly gross: 'gross of fees' }
  export function netOfFees(): string                                  // 'net of fees'
  export function grossOfFees(): string                                // 'gross of fees'
  export function asOf(date: string | Date): string                    // 'as of 2026-02-25'
  export function asOfProse(date: string | Date): string               // 'as of 25 February 2026'
  export function estimated(noun: string): string                      // 'Estimated tax impact'
  export function performanceNote(
    basis: 'net' | 'gross',
    date: string | Date,
  ): string                                                            // 'Net of fees, as of 2026-02-25.'
  export const PROJECTION_NOTE: string
  export const COMPLIANCE_PASS_NOTICE: string
  export const COMPLIANCE_PASS_SHORT: string
  export const FICTIONAL_DATA_NOTICE: string
  ```

Rules closed: **R28** (zero exclamation marks; no hype), **R29** (the product never speaks in first
person about itself), **R30** (no promised outcomes; hedging words retained), **R18** (sentence case).
Findings closed: `critique-content.md` — *"`net of fees` and `gross of fees` appear **zero times** in
the codebase"*; §Recommendation 14 — *"Add fee basis and as-of to performance figures"*;
`'All compliance checks passed. Ready to execute.'` at
`src/features/portfolios/rebalance/ComplianceReviewStep.tsx:140`.

**Why a module and not 40 inline strings.** `net of fees` appearing zero times is not an oversight of
one screen — it is the absence of a *convention*. If each screen writes its own hedge, the screens
will disagree, and a compliance reader who finds `net of fees` on one performance card and nothing on
the next concludes the second figure is gross. One module means one wording and one place to change
it. It also makes the gap greppable: `grep -c "netOfFees\|performanceNote" src/` is the coverage
measure.

**The unhedged string, and what is wrong with it.** `'All compliance checks passed. Ready to
execute.'` fails three ways: *all* claims exhaustiveness the checks do not have; *passed* is stated
as fact about a rule set that is a fixture; *ready to execute* is an instruction from the product to
the advisor about a fiduciary act. The replacement states scope, states the clock, and returns the
decision to the advisor.

**No exclamation marks and no first person.** The test below asserts both mechanically over every
exported string, so a later edit cannot reintroduce them.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/compliance-register.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as register from '../compliance-register'
import {
  FEE_BASIS,
  netOfFees,
  grossOfFees,
  asOf,
  asOfProse,
  estimated,
  performanceNote,
  PROJECTION_NOTE,
  COMPLIANCE_PASS_NOTICE,
  COMPLIANCE_PASS_SHORT,
  FICTIONAL_DATA_NOTICE,
} from '../compliance-register'

describe('fee basis', () => {
  it('states the two bases in the exact spec wording', () => {
    expect(FEE_BASIS.net).toBe('net of fees')
    expect(FEE_BASIS.gross).toBe('gross of fees')
  })

  it('exposes them as functions for interpolation', () => {
    expect(netOfFees()).toBe('net of fees')
    expect(grossOfFees()).toBe('gross of fees')
  })
})

describe('as of', () => {
  it('renders the table register', () => {
    expect(asOf('2026-02-25')).toBe('as of 2026-02-25')
  })

  it('renders the prose register', () => {
    expect(asOfProse('2026-02-25')).toBe('as of 25 February 2026')
  })
})

describe('estimated', () => {
  it('prefixes a noun and keeps sentence case', () => {
    expect(estimated('tax impact')).toBe('Estimated tax impact')
    expect(estimated('annual fee')).toBe('Estimated annual fee')
  })
})

describe('performanceNote', () => {
  it('states the fee basis and the clock', () => {
    expect(performanceNote('net', '2026-02-25')).toBe('Net of fees, as of 2026-02-25.')
  })

  it('states a gross basis when that is what the figure is', () => {
    expect(performanceNote('gross', '2026-02-25')).toBe('Gross of fees, as of 2026-02-25.')
  })
})

describe('the fixed notices', () => {
  it('replaces the unhedged compliance-pass string', () => {
    expect(COMPLIANCE_PASS_NOTICE).toBe(
      'No breaches found in the checks run. Review before submitting.',
    )
  })

  it('provides a short form for dense rows', () => {
    expect(COMPLIANCE_PASS_SHORT).toBe('No breaches found')
  })

  it('hedges projections', () => {
    expect(PROJECTION_NOTE).toBe(
      'Estimated. Projections are illustrative and not a forecast of results.',
    )
  })

  it('states that the data is fictional', () => {
    expect(FICTIONAL_DATA_NOTICE).toBe(
      'Demonstration data. No figure on this screen describes a real household or account.',
    )
  })
})

describe('register-wide copy rules', () => {
  const strings = Object.values(register).flatMap((v) => {
    if (typeof v === 'string') return [v]
    if (typeof v === 'object' && v !== null) return Object.values(v).filter((x) => typeof x === 'string')
    return []
  }) as string[]

  it('has strings to check', () => {
    expect(strings.length).toBeGreaterThan(5)
  })

  it('contains no exclamation marks — R28', () => {
    for (const s of strings) expect(s).not.toContain('!')
  })

  it('never speaks in the first person about itself — R29', () => {
    for (const s of strings) {
      expect(s).not.toMatch(/\bwe\b/i)
      expect(s).not.toMatch(/\bour\b/i)
      expect(s).not.toMatch(/\bI\b/)
    }
  })

  it('promises no outcome — R30', () => {
    for (const s of strings) {
      expect(s).not.toMatch(/guarantee/i)
      expect(s).not.toMatch(/\bwill (outperform|deliver|achieve|save)\b/i)
      expect(s).not.toMatch(/\bensures?\b/i)
    }
  })

  it('uses no hype vocabulary — R28', () => {
    for (const s of strings) {
      expect(s).not.toMatch(/amazing|seamless|powerful|effortless|10x/i)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/compliance-register.test.ts`
Expected: FAIL — `Failed to resolve import "../compliance-register"`.

- [ ] **Step 3: Write the module**

Create `src/lib/compliance-register.ts`:

```ts
import { formatDateISO, formatDateProse } from '@/lib/utils'

/**
 * R30 · The hedging vocabulary, in one place.
 *
 * `net of fees` and `gross of fees` appeared ZERO times in this codebase. That
 * is not one screen's oversight, it is the absence of a convention: when each
 * screen writes its own hedge, the screens disagree, and a reader who finds
 * "net of fees" on one performance card and nothing on the next concludes the
 * second figure is gross.
 *
 * Every performance figure, projection and compliance outcome routes through
 * here. No component invents its own wording.
 */
export const FEE_BASIS = {
  net: 'net of fees',
  gross: 'gross of fees',
} as const

export function netOfFees(): string {
  return FEE_BASIS.net
}

export function grossOfFees(): string {
  return FEE_BASIS.gross
}

/** Table register. 'as of 2026-02-25' */
export function asOf(date: string | Date): string {
  return `as of ${formatDateISO(date)}`
}

/** Prose register. 'as of 25 February 2026' */
export function asOfProse(date: string | Date): string {
  return `as of ${formatDateProse(date)}`
}

/** 'Estimated tax impact'. Sentence case (R18) — the noun is not capitalised. */
export function estimated(noun: string): string {
  return `Estimated ${noun}`
}

/**
 * The caption that sits under any performance figure.
 * 'Net of fees, as of 2026-02-25.'
 */
export function performanceNote(basis: 'net' | 'gross', date: string | Date): string {
  const phrase = basis === 'net' ? FEE_BASIS.net : FEE_BASIS.gross
  const sentenceCased = phrase.charAt(0).toUpperCase() + phrase.slice(1)
  return `${sentenceCased}, ${asOf(date)}.`
}

/** The caption that sits under any forward-looking figure. */
export const PROJECTION_NOTE =
  'Estimated. Projections are illustrative and not a forecast of results.'

/**
 * Replaces 'All compliance checks passed. Ready to execute.'
 *
 * Three faults in that string: "all" claims an exhaustiveness the checks do not
 * have; "passed" states a fixture rule set as fact; "ready to execute" is the
 * product instructing the advisor on a fiduciary act. This states the scope,
 * and returns the decision to the person accountable for it.
 */
export const COMPLIANCE_PASS_NOTICE =
  'No breaches found in the checks run. Review before submitting.'

/** The dense-row form, for table cells and inline status lines. */
export const COMPLIANCE_PASS_SHORT = 'No breaches found'

/** Surfaced by Phase 6; defined here so the wording is settled once. */
export const FICTIONAL_DATA_NOTICE =
  'Demonstration data. No figure on this screen describes a real household or account.'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/compliance-register.test.ts`
Expected: PASS — 15 tests.

- [ ] **Step 5: Record the pre-application coverage**

Run: `grep -rc "net of fees" src --include="*.ts" --include="*.tsx" | grep -v ":0" | wc -l`
Expected: `1` — only `src/lib/compliance-register.ts`. Task 26 raises this.

- [ ] **Step 6: Commit**

```bash
git add src/lib/compliance-register.ts src/lib/__tests__/compliance-register.test.ts
git commit -m "feat: add the compliance register (R28, R29, R30)"
```

---

## Migration protocol (Tasks 15–25)

**Read this before starting any batch task.** Every batch follows it exactly. It is stated once
here in full; each batch task then names its own files, its own lines and its own expected output.

### The four grep patterns that locate every site

Run these with the batch's directory substituted for `<DIR>`. Together they are the definition of
"a site" and the audit trail for the batch.

```bash
# 1. Legacy formatter calls
grep -rnE "formatPercent\(|formatDate\(|formatTime\(|formatCurrency\(" <DIR> --include="*.tsx" --include="*.ts" | grep -v __tests__

# 2. Bypassed formatters — components doing their own date/number work
grep -rnE "toLocaleDateString|toLocaleTimeString|toLocaleString|toFixed\(" <DIR> --include="*.tsx" --include="*.ts" | grep -v __tests__

# 3. Hand-coloured signed figures — the DeltaValue migration set
grep -rnE "text-accent-(green|red)" <DIR> --include="*.tsx" | grep -vE "__tests__" \
  | grep -E "[<>]=? ?0|isPositive|isNegative|direction|change|delta|Delta|growth|gain|drift|return|Change|Positive|Negative"

# 4. Hand-built signs and unmasked accounts
grep -rnE "> 0 \? '\+'|>= 0 \? '\+'|\{'\+'\}|accountNumber" <DIR> --include="*.tsx" --include="*.ts" | grep -v __tests__
```

### The decision table

Apply it to every hit. It is the whole judgement content of the migration; everything else is
mechanical.

| What the site renders | Replace with |
| --- | --- |
| A change between two points in time, shown with an arrow or a colour | `<DeltaValue value={v} />` |
| A change in money | `<DeltaValue value={v} format="currency" />` |
| A change under 1% | `<DeltaValue value={bps} format="bps" />` with `percentToBps(v)` |
| A gain/loss column that foots to a total | `<DeltaValue value={v} format="currency" parenthesise showArrow={false} />` |
| A share of a whole — allocation, weight, share of AUM | `formatWeight(v)` + `TABULAR_NUMS` |
| A standing rate — fee, yield, probability, match rate, uptime | `formatRate(v)` + `TABULAR_NUMS` |
| A fee or spread naturally read in basis points | `formatBps(rateToBps(rate))` |
| Money in a table | `formatCurrency(v)` or `<CurrencyValue value={v} />` |
| Money in a summary tile | `formatCompactCurrency(v)` or `<CurrencyValue value={v} compact />` |
| A date in a table cell | `formatTableDate(d)` from `useFormatDate()` |
| A date inside a sentence | `formatDateProse(d)` |
| A date in the next few weeks, no year needed | `formatDateShort(d)` |
| A legally significant date — retention, wash-sale window, audit trail | `formatDateISO(d)` — never the user's preference |
| An account number | `maskAccount(n)` |
| An SSN or EIN | `maskTaxId(v)`, and the input becomes `type="password"` `autoComplete="off"` |
| A raw `font-mono` on a numeral | `TABULAR_NUMS` |

### Rules the batches must not break

1. **Do not change a figure's value.** This phase changes how a number is written, never what it is.
   If a value looks wrong, note it and leave it — it belongs to Phase 1 and is out of scope here.
2. **`useFormatDate` is a hook.** It can only be called from a component body. In a TanStack Table
   `columns` array defined at module scope, either build the columns inside a `useMemo` in the
   component, or use `formatDateISO` directly and note it — a legally significant date should use
   `formatDateISO` anyway.
3. **Do not migrate status colours.** `text-accent-red` on an error banner or a `AlertTriangle` glyph
   is a status colour, not a signed figure. Pattern 3's filter is deliberately narrow. Leave the rest
   for Phase 3.
4. **Sentence case is Phase 6.** Do not rewrite labels while you are here, except where the same line
   is already being edited for a formatting reason.
5. **One commit per batch.** If a batch's test run is red, fix it inside the batch. Never carry a red
   run into the next batch.

### The per-batch closing sequence

Every batch ends with these four commands, in order:

```bash
pnpm type-check
pnpm lint
pnpm test:run
git add <the batch's files> && git commit -m "refactor: migrate <batch> to the formatting spine"
```

All three checks must be green before the commit.

---

### Task 15: Batch A — `src/components/ui`

**Files:**
- Modify: `src/components/ui/MetricCard.tsx:1-35` (whole file)
- Modify: `src/components/ui/DenseMetricsBar.tsx:1-27` (the `ChangeIndicator` block)
- Modify: `src/components/ui/ActivityItem.tsx:61`
- Modify: `src/components/ui/MeetingCard.tsx:38`
- Modify: `src/components/ui/AllocationChart.tsx:38,41,69,133`
- Modify: `src/components/ui/RichCard.tsx:60,75,108`
- Modify: `src/components/ui/TreemapChart.tsx:92`
- Modify: `src/components/ui/WaterfallChart.tsx:96,109`
- Modify: `src/components/ui/NBACard.tsx:314`
- Test: `src/components/ui/__tests__/MetricCard.test.tsx` (update assertions)
- Test: `src/components/ui/__tests__/NBACard.test.tsx` (update assertions)

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `TABULAR_NUMS`, `formatWeight`, `formatReturn`,
  `formatCompactCurrency`, `formatDateShort`, `formatTime` (Tasks 1–9).
- Produces: `MetricCardProps.change` changes shape from
  `{ value: string; direction: 'up' | 'down' | 'neutral' }` to `{ value: number; label?: string }`.
  **Every consumer of `MetricCard` and `DenseMetricsBar` in Batches B–J must pass a number.** The
  string-plus-direction shape is what allowed `BookOfBusinessPage.tsx:198,:200` to ship
  `change: { value: '4.2%', direction: 'up' }` as a fabricated literal.

Findings closed: `critique-design-system.md` — *"signed values are assembled inline … from
`formatPercent()` + a `TrendingUp`/`TrendingDown` icon + a colour class (`MetricCard.tsx:17-31`,
`DenseMetricsBar.tsx:12-27`)"*; *"`MetricCard.tsx:16` `font-mono` without `tnum`/`zero`"*;
`critique-content.md` §4b `MetricsBar.tsx:32,:56`.

- [ ] **Step 1: Run the four grep patterns and record the hit list**

```bash
D=src/components/ui
grep -rnE "formatPercent\(|formatDate\(|formatTime\(|formatCurrency\(" $D --include="*.tsx" | grep -v __tests__
grep -rnE "toLocaleDateString|toFixed\(" $D --include="*.tsx" | grep -v __tests__
grep -rnE "text-accent-(green|red)" $D --include="*.tsx" | grep -v __tests__ | grep -E "direction|change|delta|growth|gain|drift|return"
grep -rnE "> 0 \? '\+'|accountNumber" $D --include="*.tsx" | grep -v __tests__
```
Expected: 17 hits across the nine files listed above. `Badge.tsx:6-7`, `QueryErrorBanner.tsx:12-24`,
`GoalProgressCard.tsx:7-9,60` and `NBACard.tsx:28,100,182,331` appear in pattern 3's raw output but
are **status colours, not signed figures** — leave them. Rule 3 of the protocol.

- [ ] **Step 2: Update the `MetricCard` test first**

Replace `src/components/ui/__tests__/MetricCard.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../MetricCard'

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Total AUM" value="$91.3M" />)
    expect(screen.getByText('Total AUM')).toBeInTheDocument()
    expect(screen.getByText('$91.3M')).toBeInTheDocument()
  })

  it('renders the change through DeltaValue, at two decimals', () => {
    render(<MetricCard label="Total AUM" value="$91.3M" change={{ value: 2.3 }} />)
    expect(screen.getByText('+2.30%')).toBeInTheDocument()
  })

  it('takes tone from the sign, not from a caller-supplied direction', () => {
    const { container } = render(
      <MetricCard label="Revenue" value="$4.21M" change={{ value: -5.1 }} />,
    )
    expect(container.querySelector('[data-tone="negative"]')).not.toBeNull()
    expect(screen.getByText('−5.10%')).toBeInTheDocument()
  })

  it('renders the change label when supplied', () => {
    render(<MetricCard label="Total AUM" value="$91.3M" change={{ value: 2.3, label: 'vs. Q1' }} />)
    expect(screen.getByText('vs. Q1')).toBeInTheDocument()
  })

  it('renders the value in tabular figures', () => {
    render(<MetricCard label="Total AUM" value="$91.3M" />)
    expect(screen.getByText('$91.3M').className).toContain('tabular-figures')
  })

  it('renders no change block when change is omitted', () => {
    const { container } = render(<MetricCard label="Total AUM" value="$91.3M" />)
    expect(container.querySelector('[data-tone]')).toBeNull()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ui/__tests__/MetricCard.test.tsx`
Expected: FAIL — `change.value` is typed `string`, and the rendered output is `2.3` not `+2.30%`.

- [ ] **Step 4: Rewrite `MetricCard`**

Replace `src/components/ui/MetricCard.tsx` entirely:

```tsx
import { TABULAR_NUMS, cn } from '@/lib/utils'
import { DeltaValue } from './DeltaValue'
import { Card, CardContent } from './Card'

type MetricCardProps = {
  label: string
  /** Already formatted — use formatCompactCurrency or formatWeight at the call site. */
  value: string
  /**
   * The change, in percent units. A number, not a string: the string-plus-direction
   * shape is what allowed BookOfBusinessPage.tsx:198 to ship a fabricated literal
   * delta with a hardcoded 'up'. Tone now comes from the sign.
   */
  change?: { value: number; label?: string }
}

export function MetricCard({ label, value, change }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className={cn('mt-1 text-section-header tracking-tight', TABULAR_NUMS)}>{value}</p>
        {change && (
          <div className="mt-1 flex items-center gap-1.5 text-caption font-medium">
            <DeltaValue value={change.value} label={change.label} className="text-caption" />
            {change.label && <span className="text-text-tertiary">{change.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Rewrite `DenseMetricsBar`'s change indicator**

In `src/components/ui/DenseMetricsBar.tsx`, delete the `lucide-react` import at line 1, delete the
`ChangeIndicator` function at lines 12–27 and the `ChangeDirection` type at line 3, and change the
`DenseMetric` type and its render:

```tsx
import { TABULAR_NUMS, cn } from '@/lib/utils'
import { DeltaValue } from './DeltaValue'

type DenseMetric = {
  label: string
  /** Already formatted. */
  value: string
  /** The change, in percent units. Tone comes from the sign. */
  change?: { value: number; label?: string }
  onClick?: () => void
}
```

and inside the map, replace the `metric.change && <ChangeIndicator … />` block with:

```tsx
            {metric.change && (
              <DeltaValue
                value={metric.change.value}
                label={metric.change.label}
                className="text-[11px]"
              />
            )}
```

and replace the `font-mono` on the value span with `TABULAR_NUMS`:

```tsx
            <span className={cn('text-sm font-semibold text-text-primary whitespace-nowrap', TABULAR_NUMS)}>
              {metric.value}
            </span>
```

- [ ] **Step 6: Migrate the remaining seven files**

`src/components/ui/ActivityItem.tsx:61` — no change to the call, but the surrounding span takes the
tabular class, since `formatTime` output is a numeral (R13):

```tsx
            <span className={cn('text-caption text-text-tertiary', TABULAR_NUMS)}>
              {formatTime(item.timestamp)}
            </span>
```

`src/components/ui/MeetingCard.tsx:38` — same treatment, and the en-dash separator is kept:

```tsx
              <span className={TABULAR_NUMS}>
                {formatTime(event.startTime)} – {formatTime(event.endTime)}
              </span>
```

`src/components/ui/AllocationChart.tsx` — four sites. Lines 38, 69 and 133 are weights (R23):

```tsx
// :38
        <span className={cn('font-medium', TABULAR_NUMS)}>{formatWeight(weight * 100)}</span>
// :69
    .map((d) => `${LABELS[d.assetClass] ?? d.assetClass} ${formatWeight(d.weight * 100)}`)
// :133
                {formatWeight(slice.weight * 100)}
```

Line 41 is a hand-rolled compact-currency formatter — the second one in the repo
(`critique-content.md` §4c(iv)). Delete the ternary and call the spine:

```tsx
// :41
            {formatCompactCurrency(value)}
```

`src/components/ui/RichCard.tsx:60,75,108` — drift is a weight (R23), rendered three times:

```tsx
// :60
            {formatWeight(data.driftPercent)} drift
// :75
            {formatWeight(data.driftPercent)}
// :108
          title={`${formatWeight(data.driftPercent)} drift`}
```

`src/components/ui/TreemapChart.tsx:92` — a weight:

```tsx
        return w > 60 && h > 44 ? formatWeight(d.data.weight * 100) : ''
```

`src/components/ui/WaterfallChart.tsx:96` — a signed contribution, so `formatReturn`; `:109` is an
axis tick, so `formatWeight`:

```tsx
// :96
      .text((d) => formatReturn(d.value * 100))
// :109
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => formatWeight((d as number) * 100)))
```

`src/components/ui/NBACard.tsx:314` — a scheduling date, currently a raw `toLocaleDateString`:

```tsx
                  {formatDateShort(entry.timestamp)}
```

Add the imports each file needs from `@/lib/utils`; none of these files may keep a bare `font-mono`
on a numeral.

- [ ] **Step 7: Update the `NBACard` test assertion**

`src/components/ui/__tests__/NBACard.test.tsx` asserts the audit-entry timestamp. Update any
assertion of the form `expect(screen.getByText('Feb 25'))` to match `formatDateShort` output, and any
`toLocaleDateString`-shaped expectation to the new deterministic string. Run the file to see the
exact expected values:

Run: `pnpm vitest run src/components/ui/__tests__/NBACard.test.tsx`

- [ ] **Step 8: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: `pnpm type-check` reports errors in **feature files** that pass a string to
`MetricCard.change.value` — that is the intended blast radius, and those files belong to Batches B–J.
To keep this batch green in isolation, fix those call sites now **only** where the fix is a literal
number (`change={{ value: '4.2%', direction: 'up' }}` → `change={{ value: 4.2 }}`); anything needing
a real derivation is left to its own batch with a `// TODO(phase-2, batch X)` comment naming the
batch.

Run `pnpm test:run` again after those fixes. Expected: green.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui src/features
git commit -m "refactor: migrate src/components/ui to the formatting spine and DeltaValue"
```

---

### Task 16: Batch B — `src/features/dashboard`

**Files:**
- Modify: `src/features/dashboard/SchedulePanel.tsx:23`
- Modify: `src/features/dashboard/MeetingPrepModal.tsx:336`
- Modify: `src/features/dashboard/NBAEffectivenessContent.tsx:47,91,132,140`
- Modify: `src/features/dashboard/NBAEffectivenessPage.tsx:59,103,144,152`
- Modify: `src/features/dashboard/MetricsBar.tsx` (the `MetricCard`/`DenseMetricsBar` call sites)
- Modify: `src/features/dashboard/DashboardPage.tsx:8-14`

**Interfaces:**
- Consumes: `MetricCard` / `DenseMetricsBar` with the numeric `change` shape (Task 15);
  `formatWeight`, `formatRate`, `formatCompactCurrency`, `formatDateShort`, `formatDateProse`,
  `TABULAR_NUMS` (Tasks 1–9); `now`, `MOCK_TODAY_ISO` from `@/lib/clock`.
- Produces: nothing consumed by later tasks.

Findings closed: `critique-content.md` §4b `DashboardPage.tsx:9-14` — *"`formatToday()` →
`Friday, July 24, 2026`; required `Friday, 24 July 2026`"*; `MetricsBar.tsx:32` — *"`'+2.3% MTD'`
required `'+2.30% MTD'`"*; `MetricsBar.tsx:56` — *"`'+$1.2M'` required `'+$1.24M'`"*.

- [ ] **Step 1: Run the four grep patterns**

```bash
D=src/features/dashboard
grep -rnE "formatPercent\(|formatDate\(|formatTime\(|formatCurrency\(" $D --include="*.tsx" | grep -v __tests__
grep -rnE "toLocaleDateString|toFixed\(" $D --include="*.tsx" | grep -v __tests__
grep -rnE "text-accent-(green|red)" $D --include="*.tsx" | grep -v __tests__ | grep -E "direction|change|delta|growth|gain|drift|return|isPositive"
grep -rn "change: \{" $D --include="*.tsx" | grep -v __tests__
```
Expected: 13 hits. `MeetingPrepModal.tsx:51-52` is a **sentiment** colour, not a signed figure —
leave it (protocol rule 3).

- [ ] **Step 2: Fix the dashboard greeting**

`src/features/dashboard/DashboardPage.tsx:8-14` currently builds the greeting with
`now().toLocaleDateString('en-GB', …)`. Replace the whole `formatToday` helper with a
weekday-plus-prose composition that does not depend on a locale:

```tsx
import { now } from '@/lib/clock'
import { formatDateProse } from '@/lib/utils'

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

/** R25 · 'Wednesday, 25 February 2026'. Prose register, UTC, no locale. */
function formatToday(): string {
  const today = now()
  return `${WEEKDAYS[today.getUTCDay()]}, ${formatDateProse(today)}`
}
```

- [ ] **Step 3: Fix the schedule panel's day heading**

`src/features/dashboard/SchedulePanel.tsx:23` — replace the `toLocaleDateString('en-US', …)` call:

```tsx
import { formatDateShort } from '@/lib/utils'

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

/** 'Wednesday, Feb 25' — scheduling register (R25), UTC, no locale. */
function formatDayHeading(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]}, ${formatDateShort(date)}`
}
```

- [ ] **Step 4: Fix the meeting-prep follow-up date**

`src/features/dashboard/MeetingPrepModal.tsx:336`:

```tsx
                      {ASSIGNEE_LABELS[fu.assignee]} &middot; Due {formatDateShort(fu.dueDate)}
```

- [ ] **Step 5: Fix the NBA effectiveness figures — both copies**

`NBAEffectivenessContent.tsx` and `NBAEffectivenessPage.tsx` carry the same four sites at
`:47/:59`, `:91/:103`, `:132/:144` and `:140/:152`. Apply the identical edit to both files.

Average time to action is a duration, not a percentage — spell the unit (`h` is not a unit,
per the `8.2y` finding in `critique-content.md` §4b):

```tsx
// NBAEffectivenessContent.tsx:47 / NBAEffectivenessPage.tsx:59
          value={`${metrics.avgTimeToAction.toFixed(1)} hours`}
```

```tsx
// NBAEffectivenessContent.tsx:132 / NBAEffectivenessPage.tsx:144
                  <span className={cn('text-right text-caption text-text-secondary', TABULAR_NUMS)}>
                    {cat.avgTimeToAction.toFixed(1)} hours
                  </span>
```

The accept rate is a rate, not a change, and must not lose precision against its own threshold:

```tsx
// NBAEffectivenessContent.tsx:140 / NBAEffectivenessPage.tsx:152
                    <span className={cn('text-caption', TABULAR_NUMS)}>{formatRate(acceptRate)}</span>
```

The right axis is money and must not hand-roll a compact formatter:

```tsx
// NBAEffectivenessContent.tsx:91 / NBAEffectivenessPage.tsx:103
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                />
```

The dual-axis chart itself is removed in Phase 5 — do not restructure it here.

- [ ] **Step 6: Fix the metrics bar deltas**

In `src/features/dashboard/MetricsBar.tsx`, every `change` prop now takes a number. Replace each
string literal with the numeric value it was describing, keeping the unit label:

```tsx
  change: { value: 2.3, label: 'MTD' }        // was { value: '+2.3% MTD', direction: 'up' }
```

and every money tile value goes through the spine:

```tsx
  value: formatCompactCurrency(metrics.totalAUM),   // was a hand-written '+$1.2M'
```

If any `change` value in this file is a literal with no derivation behind it, delete the `change`
prop entirely rather than inventing a number — `critique-content.md` §4d calls these *"fabricated
deltas presented as measured change"*.

- [ ] **Step 7: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/features/dashboard
git commit -m "refactor: migrate dashboard to the formatting spine (R19, R22, R25)"
```

---

### Task 17: Batch C — `src/features/clients`

**Files:**
- Modify: `src/features/clients/ClientDetailPage.tsx:53,124,347`
- Modify: `src/features/clients/HouseholdDetailPage.tsx:54,192,310,312`
- Modify: `src/features/clients/HouseholdListView.tsx:210`

**Interfaces:**
- Consumes: `maskAccount`, `formatDateISO`, `formatDateProse`, `formatWeight`, `TABULAR_NUMS`
  (Tasks 1–9); `DeltaValue` (Task 11).
- Produces: nothing consumed by later tasks.

Findings closed: `critique-content.md` §4b — mask sites **1** (`ClientDetailPage.tsx:53`) and **2**
(`HouseholdDetailPage.tsx:54`) of nine; §4d `HouseholdDetailPage.tsx:192` gain/loss coloured by hand.

- [ ] **Step 1: Run the four grep patterns**

```bash
D=src/features/clients
grep -rnE "formatPercent\(|formatDate\(|formatTime\(|formatCurrency\(" $D --include="*.tsx" | grep -v __tests__
grep -rnE "toLocaleDateString|toFixed\(" $D --include="*.tsx" | grep -v __tests__
grep -rnE "text-accent-(green|red)" $D --include="*.tsx" | grep -v __tests__ | grep -E "gainLoss|drift|change|growth"
grep -rn "accountNumber" $D --include="*.tsx"
```
Expected: 9 hits. `HouseholdDetailPage.tsx:300` is an `AlertTriangle` status glyph — leave it.

- [ ] **Step 2: Mask the two account numbers**

`src/features/clients/ClientDetailPage.tsx:53`:

```tsx
        <p className={cn('text-caption text-text-tertiary', TABULAR_NUMS)}>
          {maskAccount(row.original.accountNumber)}
        </p>
```

`src/features/clients/HouseholdDetailPage.tsx:54` — identical edit.

Both render inside a cell that already names the account, so the default `keepPrefix` behaviour
applies: `TRU-847291` becomes `TRU ••••7291`.

- [ ] **Step 3: Fix the dates**

`ClientDetailPage.tsx:124` is a table cell — legally uninteresting, so it honours the advisor's
preference. The `columns` array is at module scope, so build it inside the component with `useMemo`,
or use `formatDateISO` and note why. Use `formatDateISO` here — a created-at column sorts, and a
sortable column must be ISO:

```tsx
    cell: ({ row }) => (
      <span className={cn('text-caption text-text-secondary', TABULAR_NUMS)}>
        {formatDateISO(row.original.createdAt)}
      </span>
    ),
```

`ClientDetailPage.tsx:347` sits in a note's byline sentence — prose register:

```tsx
                          <span>{formatDateProse(note.createdAt)}</span>
```

`HouseholdListView.tsx:210` is a date of birth inside a family-member card — prose register:

```tsx
                                {formatDateProse(member.dateOfBirth)}
```

- [ ] **Step 4: Route the gain/loss column through `DeltaValue`**

`src/features/clients/HouseholdDetailPage.tsx:192` currently colours the figure by hand. It is a
gain/loss column that foots to a total, so it takes the statement form:

```tsx
      cell: ({ row }) => (
        <DeltaValue
          value={row.original.gainLoss}
          format="currency"
          parenthesise
          showArrow={false}
          className="text-caption"
        />
      ),
```

- [ ] **Step 5: Fix the drift figures**

`HouseholdDetailPage.tsx:310,312` — drift is a weight (R23), and its colour is a *threshold* signal
(`needsRebalance`), not a sign signal, so it stays a conditional class rather than becoming a
`DeltaValue`:

```tsx
                        <span
                          className={cn(
                            TABULAR_NUMS,
                            drift.needsRebalance ? 'text-accent-red' : 'text-accent-green',
                          )}
                        >
                          {formatWeight(drift.totalDrift * 100)}
                        </span>
```

Note in a comment that this is a threshold colour, not a sign colour, so a later audit does not
mistake it for a missed `DeltaValue` site.

- [ ] **Step 6: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/features/clients
git commit -m "refactor: mask account numbers and migrate clients to the spine (R23, R25, R26)"
```

---

### Task 18: Batch D — `src/features/portfolios` (root)

**Files:**
- Modify: `src/features/portfolios/RiskAnalyticsPage.tsx:128-132,232,240`
- Modify: `src/features/portfolios/AccountDetailPage.tsx:163`
- Modify: `src/features/portfolios/ModelGovernancePage.tsx:114,116,133,140,212,243,245,252`
- Modify: `src/features/portfolios/SingleTradeView.tsx:68,288,326-327,342-343`
- Modify: `src/features/portfolios/ModelTradeView.tsx:168-169`
- Modify: `src/features/portfolios/AttributionPage.tsx:181-182,194,198`
- Modify: `src/features/portfolios/ConcentrationView.tsx:87,95,161,162`

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `maskAccount`, `formatWeight`, `formatReturn`, `formatRate`,
  `formatDateISO`, `TABULAR_NUMS` (Tasks 1–9).
- Produces: nothing consumed by later tasks.

Findings closed: mask sites **3** (`AccountDetailPage.tsx:163`) and **8**
(`SingleTradeView.tsx:288`) of nine; `critique-content.md` §4d `ModelGovernancePage.tsx:252` —
*"three precisions for 'weight' currently ship: 0 dp, 1 dp, 2 dp"*; `ModelTradeView.tsx:169` —
*"drift rendered red with **no sign at all**"*; `ConcentrationView.tsx:95` — *"HHI `toFixed(4)`"*;
§4d `RiskAnalyticsPage.tsx:131-132` — max drawdown and standard deviation are returns and belong at
two decimals.

- [ ] **Step 1: Run the four grep patterns**

```bash
D=src/features/portfolios
find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
  | xargs -0 grep -nE "formatPercent\(|formatDate\(|formatTime\(|toLocaleDateString|toFixed\(|accountNumber|> 0 \? '\+'|>= 0 \? '\+'"
find $D -maxdepth 1 -type f -name "*.tsx" -print0 \
  | xargs -0 grep -nE "text-accent-(green|red)" | grep -E "gain|alpha|drift|change|return|impact|[<>]=? ?0"
```
Expected: 39 hits across the seven files above. `RiskAnalyticsPage.tsx:37-38` colours a **percentile
band**, not a sign — leave it. `ConcentrationView.tsx:105` colours a **breach count** — leave it.

- [ ] **Step 2: Mask the two account numbers**

`src/features/portfolios/AccountDetailPage.tsx:163`:

```tsx
          <p className={cn('text-caption text-text-tertiary', TABULAR_NUMS)}>
            {maskAccount(account.accountNumber)}
          </p>
```

`src/features/portfolios/SingleTradeView.tsx:288` — this is an option label inside a `<select>`, so
the masked form goes in the same position:

```tsx
                    {acc.name} ({maskAccount(acc.accountNumber)}) — {formatWithConversion(acc.totalValue, acc.baseCurrency ?? 'USD', { compact: true })}
```

Note the separator changes from a hyphen to an em dash: the hyphen sat between two figures and read
as a minus sign.

- [ ] **Step 3: Fix the risk metric precisions**

`src/features/portfolios/RiskAnalyticsPage.tsx:128-132`. Beta, Sharpe and Sortino are ratios and
stay at two decimals. Max drawdown and standard deviation are return-like and move to two decimals
(R23); max drawdown is negative by nature, so it takes the true minus:

```tsx
          <RiskMetricCard label="Beta" value={risk.beta.toFixed(2)} />
          <RiskMetricCard label="Sharpe ratio" value={risk.sharpe.toFixed(2)} />
          <RiskMetricCard label="Sortino ratio" value={risk.sortino.toFixed(2)} />
          <RiskMetricCard label="Max drawdown" value={formatWeightAsReturn(risk.maxDrawdown * 100)} negative />
          <RiskMetricCard label="Standard deviation" value={formatRate(risk.standardDeviation * 100)} />
```

where the max-drawdown value uses the unsigned-magnitude two-decimal form, since the label already
says "drawdown":

```tsx
const formatWeightAsReturn = (v: number) => formatRate(Math.abs(v))
```

Declare that helper once at the top of the file with a comment naming R23.

- [ ] **Step 4: Fix the two `formatPercent` chart formatters**

`RiskAnalyticsPage.tsx:232` is an axis tick over return buckets — a rate, unsigned, no decimals:

```tsx
                    tickFormatter={(v: number) => formatRate(v, 0)}
```

`:240` is a tooltip label naming a return:

```tsx
                    labelFormatter={(label: number) => `Return ${formatReturn(label)}`}
```

- [ ] **Step 5: Fix the eight model-governance weights**

Every one of `ModelGovernancePage.tsx:114,116,133,140,212,243,245,252` renders `toFixed(0)` on a
weight. All eight become `formatWeight` (R23, one decimal):

```tsx
// :114 and :116 — a change record's old and new values
                            ({typeof change.oldValue === 'number' ? formatWeight(change.oldValue * 100) : change.oldValue}
                            {typeof change.newValue === 'number' ? formatWeight(change.newValue * 100) : change.newValue})
// :133 and :243 — segment titles
                        title={`${ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass}: ${formatWeight(ac.targetWeight * 100)}`}
// :140
                        {ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass} {formatWeight(ac.targetWeight * 100)}
// :212
              <span className={cn('font-medium', TABULAR_NUMS)}>{formatWeight(model.driftTolerance * 100)}</span>
// :245
                  {ac.targetWeight >= 0.08 && formatWeight(ac.targetWeight * 100)}
// :252
                  {ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass}: <span className={cn('font-medium', TABULAR_NUMS)}>{formatWeight(ac.targetWeight * 100)}</span>
```

- [ ] **Step 6: Fix the trade-view quote figures**

`SingleTradeView.tsx:326-327` and `:342-343` hand-build a sign and a colour around a quote change.
Both become `DeltaValue`:

```tsx
// :326-327 — the symbol row
                        <DeltaValue value={sym.changePct} className="ml-2 text-mono-sm" showArrow={false} />
// :342-343 — the selected symbol header
                <span className="inline-flex items-center gap-1.5">
                  <DeltaValue value={selectedSymbol.change} format="currency" className="text-mono-sm" />
                  <DeltaValue value={selectedSymbol.changePct} className="text-mono-sm" showArrow={false} />
                </span>
```

`SingleTradeView.tsx:68` is a submitted-at column in a sortable table — ISO:

```tsx
    cell: ({ getValue }) => (
      <span className={cn('text-text-secondary', TABULAR_NUMS)}>{formatDateISO(getValue<string>())}</span>
    ),
```

- [ ] **Step 7: Fix the unsigned red drift**

`src/features/portfolios/ModelTradeView.tsx:168-169` computes a pseudo-random drift from a character
code and renders it red with no sign. **Do not change the value** — that is Phase 1's territory and
Phase 1 has already replaced this fixture path if it was in scope. Change only the rendering, so the
sign is present and the colour follows it:

```tsx
        const drift = Number(((row.original.id.charCodeAt(row.original.id.length - 1) % 5) + 1.2).toFixed(1))
        return <DeltaValue value={drift} className="text-mono-sm" showArrow={false} />
```

If Phase 1 replaced this line with a derived drift, apply the same `DeltaValue` wrapper to whatever
expression now produces the number.

- [ ] **Step 8: Fix the attribution figures**

`AttributionPage.tsx:181-182` is a summary card and `:194,198` a table cell; both are signed
contributions in percentage points:

```tsx
// :181-182
        <div className="mt-1">
          <DeltaValue value={value * 100} className="text-section-header" showArrow={false} />
        </div>
// :194-198
      <DeltaValue value={value * 100} className="text-caption" showArrow={false} />
```

Delete the now-unused `cn` colour ternaries at `:181` and `:194` and the `formatPercent` import.

- [ ] **Step 9: Fix the concentration figures**

`ConcentrationView.tsx:87,161,162` are weights; `:95` is the Herfindahl index, which is a
dimensionless concentration score, not a percentage:

```tsx
// :87
              {formatWeight(summary.top10Weight * 100)}
// :95 — three decimals plus the scale, per critique-content.md §4d
              <span className={TABULAR_NUMS}>{summary.herfindahlIndex.toFixed(3)}</span>
              <span className="text-caption text-text-tertiary"> on a 0–1 scale</span>
// :161-162
                  <td className={cn('px-4 py-2.5 text-right', TABULAR_NUMS)}>{formatWeight(p.weight * 100)}</td>
                  <td className={cn('px-4 py-2.5 text-right', TABULAR_NUMS)}>{formatWeight(p.limit * 100)}</td>
```

- [ ] **Step 10: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 11: Commit**

```bash
git add src/features/portfolios
git commit -m "refactor: migrate portfolios root to the spine; mask two account numbers"
```

---

### Task 19: Batch E — `src/features/portfolios/account-detail`

**Files:**
- Modify: `src/features/portfolios/account-detail/OverviewTab.tsx:46,69,72,74,99,100,126,127,149,150,151,170`
- Modify: `src/features/portfolios/account-detail/shared.tsx:48,55,56`
- Modify: `src/features/portfolios/account-detail/columns.tsx:51,57,59,95,96,100,101,106,147`
- Modify: `src/features/portfolios/account-detail/RiskTab.tsx:26-30`

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `formatWeight`, `formatReturn`, `formatRate`, `formatDateISO`,
  `formatDateProse`, `TABULAR_NUMS` (Tasks 1–9).
- Produces: nothing consumed by later tasks.

Findings closed: `critique-content.md` §4d `OverviewTab.tsx:149` — *"`Target {(d.target*100).toFixed(0)}% / {(d.actual*100).toFixed(0)}%` beside drift at `toFixed(1)` on `:151` … the arithmetic visibly fails to reconcile — `60% / 64%` next to `4.1%` drift"*; `account-detail/columns.tsx:106` — tracking error
at two decimals beside siblings at one.

**The reconciliation bug this batch fixes.** `OverviewTab.tsx:149` rounds the target and actual
weights to whole numbers while `:151` renders their difference to one decimal, so the screen shows
`60% / 64%` beside `4.1%` — a reader who subtracts gets `4`, not `4.1`, and concludes one of the
three numbers is wrong. Moving all three to `formatWeight` makes the arithmetic visible and correct.

- [ ] **Step 1: Run the four grep patterns**

```bash
D=src/features/portfolios/account-detail
find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
  | xargs -0 grep -nE "formatPercent\(|formatDate\(|toLocaleDateString|toFixed\("
find $D -maxdepth 1 -type f -name "*.tsx" -print0 \
  | xargs -0 grep -nE "text-accent-(green|red)" | grep -E "gain|alpha|drift|impact|[<>]=? ?0"
```
Expected: 29 hits across the four files.

- [ ] **Step 2: Fix the drift reconciliation**

`src/features/portfolios/account-detail/OverviewTab.tsx:149-151` — all three figures to one decimal:

```tsx
                      <span className={cn('text-text-tertiary', TABULAR_NUMS)}>
                        Target {formatWeight(d.target * 100)} / actual {formatWeight(d.actual * 100)}
                      </span>
                      <span className={cn('font-medium', TABULAR_NUMS, d.drift > 0.02 ? 'text-accent-red' : 'text-accent-green')}>
                        {formatWeight(d.drift * 100)}
                      </span>
```

The colour here is a **tolerance** signal (`> 0.02`), not a sign signal, so it stays a conditional
class. Add a comment saying so.

- [ ] **Step 3: Fix the remaining OverviewTab weights and dates**

```tsx
// :69
                        <span className="text-text-secondary">Target {formatWeight(sleeve.targetAllocation * 100)}</span>
// :74
                          Actual {formatWeight(sleeve.actualAllocation * 100)}
// :99-100 — account open and last-rebalance dates sit in an InfoRow label/value pair, prose register
            <InfoRow label="Opened" value={formatDateProse(account.openDate)} />
            <InfoRow label="Last rebalance" value={account.lastRebalance ? formatDateProse(account.lastRebalance) : 'Never'} />
// :127
                  {formatWeight(drift.totalDrift * 100)}
```

`:46` passes a colour class to a child by hand for total gain/loss. Replace the whole value with a
`DeltaValue` and delete the `colorClass` prop from that call:

```tsx
                  <DeltaValue value={totalGainLoss} format="currency" showArrow={false} />
```

`:170` puts a Sharpe ratio inside a sentence — keep two decimals, but the sentence must not claim an
outcome. Leave the number, and Task 26 revisits the sentence.

- [ ] **Step 4: Fix `shared.tsx`**

```tsx
// :48 — a scenario impact is a return, two decimals
          {formatReturn(scenario.portfolioImpact * 100)}
// :55-56 — a position impact, currently hand-coloured
            <DeltaValue value={pi.impactPercent * 100} showArrow={false} />
            {' ('}<CurrencyValue value={pi.impact} compact />{')'}
```

Delete the `cn(... 'text-accent-green' : 'text-accent-red')` at `:55` and the `formatPercent` import.

- [ ] **Step 5: Fix `columns.tsx`**

```tsx
// :51 — a position weight
      cell: ({ row }) => <span className={TABULAR_NUMS}>{formatWeight(row.original.weight * 100)}</span>,
// :57-59 — gain/loss in money and percent, currently hand-coloured
      cell: ({ row }) => (
        <div className="flex flex-col items-end">
          <DeltaValue value={row.original.gainLoss} format="currency" showArrow={false} />
          <DeltaValue value={row.original.gainLossPercent * 100} className="text-caption" showArrow={false} />
        </div>
      ),
// :95-96 — TWR and benchmark returns
  { accessorKey: 'portfolioReturn', header: 'Portfolio (TWR)', cell: ({ row }) => <span className={TABULAR_NUMS}>{formatReturn(row.original.portfolioReturn * 100)}</span>, size: 100 },
  { accessorKey: 'benchmarkReturn', header: 'Benchmark', cell: ({ row }) => <span className={TABULAR_NUMS}>{formatReturn(row.original.benchmarkReturn * 100)}</span>, size: 100 },
// :100-101 — alpha, currently hand-coloured
      <DeltaValue value={row.original.alpha * 100} showArrow={false} />
// :106 — tracking error is return-like: two decimals, unsigned
  { accessorKey: 'trackingError', header: 'TE', cell: ({ row }) => <span className={cn('text-text-secondary', TABULAR_NUMS)}>{formatRate(row.original.trackingError * 100)}</span>, size: 80 },
// :147 — a submitted-at column in a sortable table
    cell: ({ row }) => <span className={cn('text-caption text-text-secondary', TABULAR_NUMS)}>{formatDateISO(row.original.submittedAt)}</span>,
```

- [ ] **Step 6: Fix `RiskTab.tsx`**

`:26-30` duplicates `RiskAnalyticsPage.tsx:128-132`. Apply the identical treatment: ratios stay at
two decimals; max drawdown and standard deviation become `formatRate(…)` at two decimals (R23).

```tsx
          <RiskMetricCard label="Beta" value={risk.beta.toFixed(2)} />
          <RiskMetricCard label="Sharpe ratio" value={risk.sharpe.toFixed(2)} />
          <RiskMetricCard label="Sortino ratio" value={risk.sortino.toFixed(2)} />
          <RiskMetricCard label="Max drawdown" value={formatRate(Math.abs(risk.maxDrawdown) * 100)} negative />
          <RiskMetricCard label="Standard deviation" value={formatRate(risk.standardDeviation * 100)} />
```

- [ ] **Step 7: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/features/portfolios/account-detail
git commit -m "refactor: migrate account-detail to the spine; reconcile drift precision (R23)"
```

---

### Task 20: Batch F — `portfolio-views` and `rebalance`

**Files:**
- Modify: `src/features/portfolios/portfolio-views/columns.tsx:40,88,89,117`
- Modify: `src/features/portfolios/portfolio-views/HouseholdView.tsx:73,105,121,123`
- Modify: `src/features/portfolios/portfolio-views/ModelsView.tsx:69,82`
- Modify: `src/features/portfolios/rebalance/SelectAccountsStep.tsx:149,155,306,312`
- Modify: `src/features/portfolios/rebalance/ComplianceReviewStep.tsx:166,169,172`
- Modify: `src/features/portfolios/rebalance/PreviewTradesStep.tsx:66,86`

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `maskAccount`, `formatWeight`, `formatDateShort`,
  `formatAccounting`, `TABULAR_NUMS` (Tasks 1–9).
- Produces: nothing consumed by later tasks.

Findings closed: mask sites **4** (`portfolio-views/columns.tsx:40`), **5**
(`portfolio-views/HouseholdView.tsx:105`), **6** and **7** (`rebalance/SelectAccountsStep.tsx:149`
and `:306`) of nine; `critique-content.md` §4c(i) — *"`portfolio-views/columns.tsx:117` bypasses
`formatDate` entirely with its own `toLocaleDateString('en-US', …)` **and drops the year**"*;
§4d — *"`rebalance/PreviewTradesStep.tsx:38/65/67/86` (trade values and tax impact) … compact form
belongs in summary tiles, not in comparison tables"*.

- [ ] **Step 1: Run the four grep patterns**

```bash
for D in src/features/portfolios/portfolio-views src/features/portfolios/rebalance; do
  find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
    | xargs -0 grep -nE "formatPercent\(|formatDate\(|toLocaleDateString|toFixed\(|accountNumber"
  find $D -maxdepth 1 -type f -name "*.tsx" -print0 \
    | xargs -0 grep -nE "text-accent-(green|red)" | grep -E "gain|drift|impact|change|[<>]=? ?0"
done
```
Expected: 24 hits. `SelectAccountsStep.tsx:274` (`No drift`) is a status label, and
`SelectAccountsStep.tsx:18,19,199` are **type declarations**, not renders — leave all four.

- [ ] **Step 2: Mask the four account numbers**

Identical edit in all four places — `portfolio-views/columns.tsx:40`,
`portfolio-views/HouseholdView.tsx:105`, `rebalance/SelectAccountsStep.tsx:149` and `:306`:

```tsx
          <p className={cn('text-caption text-text-tertiary', TABULAR_NUMS)}>
            {maskAccount(row.original.accountNumber)}
          </p>
```

At `HouseholdView.tsx:105` the element is a `<span>` rather than a `<p>`; keep the tag and change
only the class and the expression. At `SelectAccountsStep.tsx:149` and `:306` the accessor is `acc`
rather than `row.original` — use `maskAccount(acc.accountNumber)`.

- [ ] **Step 3: Fix the drift figures**

Six sites render drift as `toFixed(1)` with a threshold colour. Drift is a weight (R23), and the
colour is a **threshold** signal, not a sign signal, so the conditional class stays:

```tsx
// portfolio-views/columns.tsx:88-89
            <span className={cn('text-caption', TABULAR_NUMS,
              drift.needsRebalance ? 'text-accent-red' : val > 1.5 ? 'text-amber-600' : 'text-accent-green')}>
              {formatWeight(val)}
            </span>
// portfolio-views/HouseholdView.tsx:73
                    {formatWeight(group.avgDrift * 100)}
// portfolio-views/HouseholdView.tsx:121-123
                            <span className={cn(TABULAR_NUMS,
                              drift.needsRebalance ? 'text-accent-red' : driftVal > 1.5 ? 'text-amber-600' : 'text-accent-green')}>
                              {formatWeight(driftVal)}
                            </span>
// portfolio-views/ModelsView.tsx:69
                    {formatWeight(avgDrift * 100)}
// rebalance/SelectAccountsStep.tsx:155 and :312
                        {drift ? `${formatWeight(drift.totalDrift * 100)} drift` : ''}
```

`ModelsView.tsx:82` is a target weight at `toFixed(0)` — one decimal (R23):

```tsx
                    {ac.assetClass.replace(/_/g, ' ')} {formatWeight(ac.targetWeight * 100)}
```

- [ ] **Step 4: Fix the year-dropping rebalance date**

`portfolio-views/columns.tsx:117` currently renders `Nov 10` with no year on a last-rebalance date in
a sortable table. It becomes ISO — a rebalance date is an audit fact and the column sorts:

```tsx
          {row.original.lastRebalance ? formatDateISO(row.original.lastRebalance) : '—'}
```

Wrap the cell in `TABULAR_NUMS` so the ISO date renders in mono (R13).

- [ ] **Step 5: Fix the compliance-review weights**

`rebalance/ComplianceReviewStep.tsx:166,169,172` — three weights at two different precisions:

```tsx
              <span>Current <span className={cn('font-medium', TABULAR_NUMS)}>{formatWeight(check.details.currentWeight * 100)}</span></span>
              <span>Post-trade <span className={cn('font-medium', TABULAR_NUMS)}>{formatWeight(check.details.postTradeWeight * 100)}</span></span>
              <span>Limit <span className={cn('font-medium', TABULAR_NUMS)}>{formatWeight(check.details.limit * 100)}</span></span>
```

- [ ] **Step 6: Fix the tax-impact figures**

`rebalance/PreviewTradesStep.tsx:66` colours a tax impact red when positive — which is backwards for
a *cost*, and is a threshold not a sign. It is a cost that foots to a total, so it takes the
statement form and the colour comes from the amount being non-zero:

```tsx
                      <td className={cn('py-2 text-right', TABULAR_NUMS, trade.taxImpact > 0 ? 'text-accent-red' : 'text-text-secondary')}>
                        {formatAccounting(trade.taxImpact)}
                      </td>
```

`:86` is a summary line whose figure is currently compact — but this table's purpose is comparing
trades, so the total takes full separators (R20 over R19):

```tsx
          <span>
            Tax impact <strong className={cn(TABULAR_NUMS, 'text-accent-red')}>
              {formatAccounting(totalTaxImpact)}
            </strong>
          </span>
```

- [ ] **Step 7: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/features/portfolios/portfolio-views src/features/portfolios/rebalance
git commit -m "refactor: mask four account numbers; migrate rebalance and portfolio views"
```

---

### Task 21: Batch G — `tax` and `trade-fields`

**Files:**
- Modify: `src/features/portfolios/tax/TaxLotsView.tsx:26,35`
- Modify: `src/features/portfolios/tax/WashSaleCalendarView.tsx:48,54`
- Modify: `src/features/portfolios/tax/CostBasisMethodCard.tsx:88,91,94`
- Modify: `src/features/portfolios/tax/HarvestScannerView.tsx:97,98`
- Modify: `src/features/portfolios/trade-fields/DigitalAssetTradeFields.tsx:24-28,62-63`
- Modify: `src/features/portfolios/trade-fields/OptionTradeFields.tsx:114,122,126,130,134`
- Modify: `src/features/portfolios/trade-fields/FixedIncomeTradeFields.tsx:72,80,84,88`
- Modify: `src/features/portfolios/trade-fields/MutualFundTradeFields.tsx:83`

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `formatDateISO`, `formatAccounting`, `formatRate`,
  `formatCompactCurrency`, `TABULAR_NUMS` (Tasks 1–9).
- Produces: nothing consumed by later tasks.

Findings closed: `critique-content.md` §4d `tax/WashSaleCalendarView.tsx:54` — *"IRS-critical window
in ambiguous format. ISO both ends"*; §4c(iv) — *"`DigitalAssetTradeFields.tsx:25-27` is a **second,
duplicate compact-currency formatter** with different precision (2 dp) and no currency awareness at
all"*; §4d `OptionTradeFields.tsx:122-134` — *"Greeks at 4 dp beside IV at 1 dp on `:114`;
delta/gamma 4 dp is correct; IV is a percentage return-like figure → 2 dp"*; §4d
`tax/CostBasisMethodCard.tsx:89/92/95` — *"a table whose entire purpose is comparing FIFO/LIFO/HIFO
outcomes against each other — at 1 dp compact, methods that differ by \$40,000 can render
identically"*.

- [ ] **Step 1: Run the four grep patterns**

```bash
for D in src/features/portfolios/tax src/features/portfolios/trade-fields; do
  find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
    | xargs -0 grep -nE "formatPercent\(|formatDate\(|toLocaleDateString|toFixed\(|> 0 \? '\+'|>= 0 \? '\+'"
  find $D -maxdepth 1 -type f -name "*.tsx" -print0 \
    | xargs -0 grep -nE "text-accent-(green|red)" | grep -E "gain|change|delta|[<>]=? ?0"
done
```
Expected: 33 hits. `tax/TaxSummaryCards.tsx:57` colours a **wash-sale count**, and
`trade-fields/ComplianceCheck.tsx:39-40` colours a **block count** — neither is a signed figure.

- [ ] **Step 2: Make the wash-sale dates ISO at both ends**

`src/features/portfolios/tax/WashSaleCalendarView.tsx:48,54`. The 61-day window is an IRS fact; an
ambiguous date on it is the single most consequential date-format bug in the app:

```tsx
// :48
                        Purchased {formatDateISO(item.purchaseDate)} &middot; {item.quantity.toLocaleString('en-US')} shares
// :54 — an en dash between two ISO dates, not a hyphen (which reads as a minus)
                      <span className={TABULAR_NUMS}>
                        {formatDateISO(item.washSaleStart)} – {formatDateISO(item.washSaleEnd)}
                      </span>
```

Phase 1 relabels this window as 61-day and re-anchors it on the loss sale; do not touch the dates
themselves, only their rendering.

- [ ] **Step 3: Fix the tax-lot table**

```tsx
// TaxLotsView.tsx:26 — a purchase date in a sortable table
      <td className={cn('px-4 py-2.5 text-caption text-text-secondary', TABULAR_NUMS)}>
        {formatDateISO(lot.purchaseDate)}
      </td>
// TaxLotsView.tsx:35 — a gain/loss column that foots to a total
      <td className="px-4 py-2.5 text-right">
        <DeltaValue value={lot.gainLoss} format="currency" parenthesise showArrow={false} />
      </td>
```

- [ ] **Step 4: Fix the cost-basis comparison table**

`CostBasisMethodCard.tsx:88,91,94` — the table exists to let a reader compare three methods, so
every figure takes full separators (R20) and the statement form:

```tsx
                    <td className="px-3 py-2 text-right">
                      <DeltaValue value={row.realizedGain} format="currency" parenthesise showArrow={false} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeltaValue value={row.shortTermGain} format="currency" parenthesise showArrow={false} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeltaValue value={row.longTermGain} format="currency" parenthesise showArrow={false} />
                    </td>
```

If any `<CurrencyValue … compact />` remains in this table, drop the `compact` prop — comparison
tables are never compact.

- [ ] **Step 5: Fix the harvest scanner's hardcoded colours**

`HarvestScannerView.tsx:97,98` hardcode red on the loss column and green on the tax-benefit column,
so a *gain* in the loss column would render red and a benefit would render green regardless of sign:

```tsx
                      <td className="px-4 py-2.5 text-right">
                        <DeltaValue value={lot.gainLoss} format="currency" parenthesise showArrow={false} />
                      </td>
                      <td className={cn('px-4 py-2.5 text-right', TABULAR_NUMS)}>
                        <CurrencyValue value={Math.abs(lot.gainLoss) * 0.37} from={baseCurrency} />
                      </td>
```

The `0.37` flat rate is Phase 1's to fix, not this batch's. If Phase 1 replaced it with a
holding-period-aware rate, keep whatever expression is there and change only the rendering.

- [ ] **Step 6: Delete the duplicate compact-currency formatter**

`DigitalAssetTradeFields.tsx:24-28` is a second compact-money implementation with different
precision and no currency awareness. Delete the whole local function and route its call sites through
the spine:

```tsx
import { formatCompactCurrency } from '@/lib/utils'
// every call of the deleted local helper becomes:
formatCompactCurrency(n)
```

`:62-63` hand-builds a sign and colour on a quote change:

```tsx
              <DeltaValue value={selectedSymbol.changePct} className="font-medium" showArrow={false} />
```

- [ ] **Step 7: Fix the option Greeks and implied volatility**

`OptionTradeFields.tsx`. Delta and gamma at four decimals are correct — they are dimensionless
sensitivities and four decimals is the market convention. Implied volatility is return-like and moves
to two decimals. Theta's hardcoded red is a sign claim and must follow the sign instead.

**`DeltaValue` is not used for the Greeks.** `format="number"` renders two decimals, which is too
coarse for a delta of `0.5231`. The Greeks therefore render as plain tabular figures with the true
minus applied by hand, taking their colour from the same CSS variables `DeltaValue` uses so Phase 3's
swap still reaches them. Import `MINUS` from `@/lib/utils`.

```tsx
// :114 — implied volatility, two decimals (R23)
              <span className={cn('font-medium', TABULAR_NUMS)}>{formatRate(selectedQuote.impliedVolatility * 100)}</span>
// :122 — delta: four decimals, true minus, sign-driven colour
              <span className={cn('font-medium', TABULAR_NUMS,
                selectedQuote.delta >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]')}>
                {selectedQuote.delta < 0 ? MINUS : ''}{Math.abs(selectedQuote.delta).toFixed(4)}
              </span>
// :126 — gamma is non-negative; four decimals, tabular, no colour
              <span className={cn('font-medium', TABULAR_NUMS)}>{selectedQuote.gamma.toFixed(4)}</span>
// :130 — theta: negative by nature, so the sign carries it, not a hardcoded red
              <span className={cn('font-medium', TABULAR_NUMS,
                selectedQuote.theta >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]')}>
                {selectedQuote.theta < 0 ? MINUS : ''}{Math.abs(selectedQuote.theta).toFixed(4)}
              </span>
// :134 — vega is non-negative
              <span className={cn('font-medium', TABULAR_NUMS)}>{selectedQuote.vega.toFixed(4)}</span>
```

- [ ] **Step 8: Fix the fixed-income and mutual-fund rates**

```tsx
// FixedIncomeTradeFields.tsx:72 — a coupon rate; three decimals is the market convention, keep it
              <span className={cn('font-medium', TABULAR_NUMS)}>{formatRate(selectedSymbol.couponRate, 3)}</span>
// :80 and :84 — yields, two decimals
              <span className={cn('font-medium', TABULAR_NUMS)}>{formatRate(selectedSymbol.yieldToMaturity ?? 0)}</span>
              <span className={cn('font-medium', TABULAR_NUMS)}>{formatRate(selectedSymbol.yieldToWorst ?? 0)}</span>
// :88 — duration is a span of time; spell the unit ('yrs' is not a unit)
              <span className={cn('font-medium', TABULAR_NUMS)}>{selectedSymbol.duration?.toFixed(2)} years</span>
// MutualFundTradeFields.tsx:83 — an expense ratio
              <span className={cn('font-medium', TABULAR_NUMS)}>
                {selectedSymbol.expenseRatio != null ? formatRate(selectedSymbol.expenseRatio) : '—'}
              </span>
```

- [ ] **Step 9: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add src/features/portfolios/tax src/features/portfolios/trade-fields
git commit -m "refactor: ISO wash-sale windows; delete the duplicate compact formatter"
```

---

### Task 22: Batch H — `growth` and `billing`

**Files:**
- Modify: `src/features/growth/BookAnalyticsView.tsx:68,76,112`
- Modify: `src/features/growth/BookOfBusinessPage.tsx:32,128,195,198,200,261,265`
- Modify: `src/features/growth/ProspectsPage.tsx:67,77,152`
- Modify: `src/features/growth/ProspectListView.tsx:69`
- Modify: `src/features/growth/RevenuePage.tsx:54,109-111,130,153`
- Modify: `src/features/billing/BillingPage.tsx:97,189,192,233,234,306`

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `formatWeight`, `formatRate`, `formatBps`, `rateToBps`,
  `formatCompactCurrency`, `formatDateShort`, `formatDateISO`, `TABULAR_NUMS` (Tasks 1–9);
  `MetricCard`/`DenseMetricsBar` with the numeric `change` shape (Task 15).
- Produces: nothing consumed by later tasks.

Findings closed: `critique-content.md` §4c(iii) — `BillingPage.tsx:189,:192` render a **fee rate as
`+0.85%`** and `BookOfBusinessPage.tsx:128` renders a **share of AUM as `+34.2%`**; §4d
`BookAnalyticsView.tsx:68,:76` — *"AUM-growth columns hard-coded `text-accent-green`; negative growth
renders green"*; §4d `BookOfBusinessPage.tsx:198,:200` — *"literal strings, not derived; fabricated
deltas presented as measured change"*; §4d `RevenuePage.tsx:109-111` — *"the same number rendered
twice in one tile"*; §4d `BillingPage.tsx:233` — *"literal ASCII hyphen in JSX"*; `:234` —
*"a bare `toLocaleDateString()`, producing `7/24/2026`, a fourth format"*; §4d — bps derived three
ways at `BillingPage.tsx:97,:306` and `BookOfBusinessPage.tsx:199`.

**This batch closes the single most cited finding in the phase.** `formatPercent` signing a fee rate
is the bug that motivated splitting the function; `BillingPage.tsx:189` is where a reader sees it.

- [ ] **Step 1: Run the four grep patterns**

```bash
for D in src/features/growth src/features/billing; do
  find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
    | xargs -0 grep -nE "formatPercent\(|formatDate\(|toLocaleDateString|toFixed\(|change: \{|\* 10000"
  find $D -maxdepth 1 -type f -name "*.tsx" -print0 \
    | xargs -0 grep -nE "text-accent-(green|red)" | grep -E "growth|gain|change|isPositive|[<>]=? ?0"
done
```
Expected: 21 hits. `ProspectsPage.tsx:66,270` and `ProspectListView.tsx:67,99` colour a
**probability band** and a **staleness band** — thresholds, not signs. `TeamActivityView.tsx:19` is a
category colour. Leave all four.

- [ ] **Step 2: Stop signing the fee rate**

`src/features/billing/BillingPage.tsx:189,192` — a standing rate is never signed:

```tsx
              Current rate <span className={TABULAR_NUMS}>{formatRate(bp.currentRate * 100)}</span>
              Breakpoint rate <span className={cn(TABULAR_NUMS, 'text-accent-green')}>{formatRate(bp.breakpointRate * 100)}</span>
```

- [ ] **Step 3: One bps derivation**

`BillingPage.tsx:97` and `:306` both do `rate * 10000` inline with `toFixed(0)`:

```tsx
// :97 — a bps column; the header already says "bps", so no unit in the cell
              <td className={cn('px-3 py-2 text-right text-text-primary', TABULAR_NUMS)}>
                {rateToBps(fee.annualRate)}
              </td>
// :306 — a headline figure, unit included
            <div className={cn('text-heading text-text-primary', TABULAR_NUMS)}>{formatBps(rateToBps(avgRate))}</div>
```

`avgRate` at `:306` is already a decimal fraction; if Phase 1 changed it to a bps figure, use
`formatBps(avgRate)` directly and delete the conversion. Check the value's units before editing.

- [ ] **Step 4: Fix the ASCII hyphen and the fourth date format**

`BillingPage.tsx:233` renders `-{f.waiver!.discountBps}` with a literal ASCII hyphen. It is a
discount — a signed bps figure:

```tsx
              <DeltaValue value={-f.waiver!.discountBps} format="bps" showArrow={false} />
```

`:234` uses a bare `toLocaleDateString()`. A waiver expiry is a contractual date:

```tsx
              <td className={cn('px-3 py-2 text-text-secondary', TABULAR_NUMS)}>
                {formatDateISO(f.waiver!.expiresAt)}
              </td>
```

- [ ] **Step 5: Stop signing the share of AUM, and stop hardcoding growth as green**

`BookOfBusinessPage.tsx:128` — a share of a whole:

```tsx
              <td className={cn('px-3 py-2 text-right text-text-primary', TABULAR_NUMS)}>
                {formatWeight(seg.pctOfAUM * 100)}
              </td>
```

`BookAnalyticsView.tsx:68,76` — AUM growth in money and percent, both hardcoded green:

```tsx
// :68
      <DeltaValue value={row.original.aumGrowth} format="currency" compact showArrow={false} />
// :76
      <DeltaValue value={row.original.growthPct} showArrow={false} />
```

`BookOfBusinessPage.tsx:261,265` — a retention rate is a rate, and an organic growth rate is a
change:

```tsx
// :261
                  <span className={cn('font-medium', TABULAR_NUMS)}>{formatRate(data.retentionRate)}</span>
// :265
                  <DeltaValue value={data.organicGrowthRate} showArrow={false} className="font-medium" />
```

`BookOfBusinessPage.tsx:32` is a local delta renderer built from an `isPositive` flag. Delete the
whole helper and replace its call sites with `DeltaValue`.

- [ ] **Step 6: Delete the fabricated deltas**

`BookOfBusinessPage.tsx:195,198,200` pass literal strings as measured change. Only `:195` has a
derivation behind it:

```tsx
    { label: 'Total AUM', value: formatCompactCurrency(data.totalAUM), change: { value: data.organicGrowthRate, label: 'organic' } },
    { label: 'Annual revenue', value: formatCompactCurrency(data.annualRevenue) },
    { label: 'Organic growth', value: formatRate(data.organicGrowthRate) },
```

`:198`'s `'4.2%'` and `:200`'s `'0.3%'` are deleted, not converted — there is no figure behind them.
Note the deletion in the commit message.

- [ ] **Step 7: Stop rendering the same number twice in one tile**

`RevenuePage.tsx:109-111` uses `metrics.revenueGrowthYoY` as both the tile value and its change
indicator. The tile's value is revenue; the change is the growth:

```tsx
            {
              label: 'Revenue growth',
              value: formatRate(metrics.revenueGrowthYoY),
              // No `change` — the value IS the change. Rendering it twice claimed
              // a second, independent measurement that does not exist.
            },
```

- [ ] **Step 8: Fix the remaining growth figures and chart formatters**

```tsx
// growth/ProspectsPage.tsx:67 and ProspectListView.tsx:69 — a probability
            {formatRate(prospect.probability * 100, 0)}
// growth/ProspectsPage.tsx:77 — a next-action date in the near term
          <span className={TABULAR_NUMS}>{formatDateShort(prospect.nextActionDate)}</span>
// growth/ProspectsPage.tsx:152 — a win rate
        <p className={cn('text-body-strong', TABULAR_NUMS)}>{formatRate(metrics.winRate, 0)}</p>
// growth/RevenuePage.tsx:54 — an AUM-based fee rate
      <span className={TABULAR_NUMS}>
        {row.original.feeType === 'aum_based'
          ? formatRate(row.original.rate * 100)
          : <CurrencyValue value={row.original.rate} className={TABULAR_NUMS} />}
      </span>
// growth/BookAnalyticsView.tsx:112, RevenuePage.tsx:130 and :153 — chart ticks
                tickFormatter={(v: number) => formatCompactCurrency(v)}
```

The three chart tick formatters currently hardcode `$`, bypassing the reporting-currency setting
(`critique-content.md` §4c(iv)). `formatCompactCurrency` takes the currency as its second argument;
pass `reportingCurrency` from `useReportingCurrency()` at each site.

- [ ] **Step 9: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add src/features/growth src/features/billing
git commit -m "refactor: unsign fee rates and AUM shares; one bps derivation; delete fabricated deltas"
```

---

### Task 23: Batch I — `engage`, `workflows`, `messaging`, `compliance`, `reconciliation`

**Files:**
- Modify: `src/features/engage/EngagePage.tsx:167,261,341,413,419`
- Modify: `src/features/workflows/WorkflowCenterPage.tsx:99,196,215`
- Modify: `src/features/messaging/MessagingContent.tsx:19-30,61,91`
- Modify: `src/features/compliance/ArchivePage.tsx:76,109`
- Modify: `src/features/reconciliation/ReconciliationPage.tsx:59,60,61,254`
- Modify: `src/features/reconciliation/DataQualityPanel.tsx:41`

**Interfaces:**
- Consumes: `formatDateISO`, `formatDateProse`, `formatDateShort`, `formatTime`, `formatRate`,
  `TABULAR_NUMS` (Tasks 1–9).
- Produces: nothing consumed by later tasks.

Findings closed: `critique-content.md` §4b `ArchivePage.tsx:109` — *"retention expiry via `formatDate`
→ `Jul 24, 2026`; a legally significant date in ambiguous US short form. `2026-07-24`"*; §4d
`ReconciliationPage.tsx:59-61,:254`, `DataQualityPanel.tsx:41` — *"match rates and uptime at 1 dp,
coloured against a **99.5%** threshold. 99.45% and 99.54% both render `99.5%` and colour differently.
2 dp — the precision must exceed the threshold's"*.

**The precision bug this batch fixes is a correctness bug, not a taste one.** A rate rendered at one
decimal beside a threshold specified to one decimal cannot show the reader why two rows that display
identically are coloured differently. The rule: **a figure's precision must exceed the precision of
any threshold applied to it.**

- [ ] **Step 1: Run the four grep patterns**

```bash
for D in src/features/engage src/features/workflows src/features/messaging src/features/compliance src/features/reconciliation; do
  find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
    | xargs -0 grep -nE "formatPercent\(|formatDate\(|formatTime\(|toLocaleDateString|toFixed\("
done
```
Expected: 21 hits. `ReconciliationPage.tsx:62` colours an **open-break count** — a threshold, not a
sign. Leave it.

- [ ] **Step 2: Fix the retention expiry and the archive dates**

`src/features/compliance/ArchivePage.tsx:76` is a created-at in a record row, and `:109` is the WORM
retention expiry — a legally significant date that must never take the advisor's display preference:

```tsx
// :76
            <span className={TABULAR_NUMS}>{formatDateISO(record.createdAt)}</span>
// :109
              <p className={cn('text-caption text-text-primary', TABULAR_NUMS)}>
                {formatDateISO(record.retentionExpiresAt)}
              </p>
```

- [ ] **Step 3: Fix the match rates and uptime**

`src/features/reconciliation/ReconciliationPage.tsx:59-61` — two decimals, so the figure out-resolves
its own 99.5% threshold:

```tsx
    { label: 'Position match', value: formatRate(summary.positionMatchRate), color: summary.positionMatchRate >= 99.5 ? 'text-accent-green' : 'text-amber-600' },
    { label: 'Cash match', value: formatRate(summary.cashMatchRate), color: summary.cashMatchRate >= 99.5 ? 'text-accent-green' : 'text-amber-600' },
    { label: 'Transaction match', value: formatRate(summary.transactionMatchRate), color: summary.transactionMatchRate >= 99.5 ? 'text-accent-green' : 'text-amber-600' },
```

```tsx
// ReconciliationPage.tsx:254 — integration uptime
                    {formatRate(ig.uptime)}
// DataQualityPanel.tsx:41
        <span className={cn('font-medium text-text-primary', TABULAR_NUMS)}>{formatRate(rate)}</span>
```

- [ ] **Step 4: Fix the engage dates**

All five sites in `src/features/engage/EngagePage.tsx` are scheduling or activity dates. `:167` is a
timestamp column in a table; the other four sit in `Scheduled: …` labels:

```tsx
// :167
                      <td className={cn('px-4 py-3 text-caption text-text-tertiary whitespace-nowrap', TABULAR_NUMS)}>
                        {formatDateISO(comm.timestamp)}
                      </td>
// :261, :341
                  Scheduled {formatDateShort(camp.scheduledDate)}
                        Scheduled {formatDateShort(opp.scheduledDate)}
// :413, :419
                    <p className={cn('text-caption text-text-secondary', TABULAR_NUMS)}>{formatDateShort(nl.scheduledDate)}</p>
                    <p className={cn('text-caption text-text-secondary', TABULAR_NUMS)}>{formatDateShort(nl.sentDate)}</p>
```

Note the colon after `Scheduled` is dropped — a label followed by a value does not need one, and
`critique-content.md` flags the `Field: goal_probability` pattern for the same reason.

- [ ] **Step 5: Fix the workflow due dates**

`src/features/workflows/WorkflowCenterPage.tsx:99` builds an `Overdue` / `Due today` label; `:196` is
a sortable column; `:215` is an estimated-completion label:

```tsx
// :99 — the fallback label when the date is neither overdue nor today
      let label = formatDateShort(row.original.dueDate)
// :196 — a sortable due-date column
    cell: ({ row }) => (
      <span className={cn('text-caption text-text-secondary', TABULAR_NUMS)}>
        {formatDateISO(row.original.dueDate)}
      </span>
    ),
// :215 — an estimate, so it says so (R30)
              Estimated completion {formatDateShort(tracker.estimatedCompletion)}
```

- [ ] **Step 6: Delete the local `formatTime` in messaging**

`src/features/messaging/MessagingContent.tsx:19-30` defines a third time formatter with its own
`toLocaleDateString('en-US', …)` fallback. Delete the local function and import the spine's:

```tsx
import { formatTime, formatDateShort } from '@/lib/utils'
import { now } from '@/lib/clock'

/** Same-day messages show a clock time; older ones show a scheduling date. */
function formatMessageStamp(timestamp: string): string {
  const stamp = new Date(timestamp)
  const isToday = stamp.toISOString().slice(0, 10) === now().toISOString().slice(0, 10)
  return isToday ? formatTime(stamp) : formatDateShort(stamp)
}
```

Update `:61` and `:91` to call `formatMessageStamp`, and wrap both in `TABULAR_NUMS`.

- [ ] **Step 7: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/features/engage src/features/workflows src/features/messaging src/features/compliance src/features/reconciliation
git commit -m "refactor: ISO retention dates; match rates out-resolve their thresholds"
```

---

### Task 24: Batch J — `proposals`, `settings`, `onboarding`, `ai-assistant`

**Files:**
- Modify: `src/features/proposals/steps/TemplateDataStep.tsx:112,113,118`
- Modify: `src/features/proposals/steps/FinalizeStep.tsx:94`
- Modify: `src/features/settings/NBASettingsTab.tsx:358`
- Modify: `src/features/settings/autonomy/StandingRulesCard.tsx:206,207`
- Modify: `src/features/ai-assistant/ContextBriefing.tsx:74`
- Modify: `src/features/ai-assistant/TradeSuggestionCard.tsx:24,27`
- Modify: `src/mocks/data/onboarding.ts:93,102,128` (field types)
- Modify: `src/features/onboarding/steps/AccountSetupStep.tsx:63-82` (input rendering)
- Modify: `src/features/onboarding/steps/ReviewStep.tsx` (the review echo)
- Modify: `src/types/onboarding.ts` (add `'password'` to the field-type union)

**Interfaces:**
- Consumes: `DeltaValue` (Task 11); `maskTaxId`, `formatWeight`, `formatDateProse`, `formatDateISO`,
  `formatCurrency`, `TABULAR_NUMS` (Tasks 1–9); `asOfProse` (Task 14).
- Produces:
  ```ts
  // src/types/onboarding.ts — the onboarding field type union gains one member
  type OnboardingFieldType = 'text' | 'select' | 'date' | 'number' | 'password'
  ```
  Check the current union's exact name and members before editing; add `'password'` to it without
  removing anything.

Findings closed: `critique-content.md` §4d `onboarding/steps/AccountSetupStep.tsx:76-82` —
*"`Joint Owner SSN (last 4)` and `Trust EIN` rendered as plain `type="text"`, echoed verbatim in
`ReviewStep`. Rule 26 extends to tax IDs. `type="password"` or masked display, `autoComplete="off"`,
and never echo in review"*; §4d `NBASettingsTab.tsx:358` — *"`{delta > 0 ? '+' : ''}{delta}` —
negatives get a hyphen from `toString`"*.

- [ ] **Step 1: Run the four grep patterns**

```bash
for D in src/features/proposals src/features/proposals/steps src/features/settings \
         src/features/settings/autonomy src/features/onboarding/steps src/features/ai-assistant \
         src/features/notifications src/features/quick-capture; do
  find $D -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
    | xargs -0 grep -nE "formatPercent\(|formatDate\(|toLocaleDateString|toLocaleString|toFixed\(|> 0 \? '\+'"
done
grep -rn "SSN\|EIN" src/mocks/data/onboarding.ts
```
Expected: 12 hits plus the three SSN/EIN field definitions.

- [ ] **Step 2: Stop rendering tax IDs as plain text**

`src/mocks/data/onboarding.ts:93,102,128` — change the three field definitions to the password type:

```ts
      { name: 'jointOwnerSSN', label: 'Joint owner SSN (last 4)', type: 'password', required: true },
      { name: 'trustEIN', label: 'Trust EIN', type: 'password', required: true },
      { name: 'entityEIN', label: 'Entity EIN', type: 'password', required: true },
```

Add `'password'` to the field-type union in `src/types/onboarding.ts`.

`src/features/onboarding/steps/AccountSetupStep.tsx:78` already passes `type={field.type}` through,
so the input becomes a password field automatically. Add the autocomplete guard at the same site:

```tsx
                    type={field.type}
                    autoComplete={field.type === 'password' ? 'off' : undefined}
                    inputMode={field.type === 'password' ? 'numeric' : undefined}
```

- [ ] **Step 3: Stop echoing tax IDs in the review step**

`src/features/onboarding/steps/ReviewStep.tsx` renders the collected values back to the user. Any
value whose field is `type: 'password'` renders through `maskTaxId`:

```tsx
import { maskTaxId } from '@/lib/utils'

/** R26 · A tax ID is never echoed. The review shows only its last four digits. */
function displayValue(fieldType: string, value: string): string {
  return fieldType === 'password' ? maskTaxId(value) : value
}
```

Apply `displayValue(field.type, values[field.name])` at every place the step renders a collected
value. If the step currently renders values without access to their field definitions, thread the
definitions through — do not special-case field names, or the next tax-ID field added will leak.

- [ ] **Step 4: Fix the proposal allocation table**

`src/features/proposals/steps/TemplateDataStep.tsx:112,113` are weights at zero decimals and `:118`
is their difference with a hand-built sign:

```tsx
// :112-113
                        <td className={cn('px-4 py-2 text-right text-body text-text-secondary', TABULAR_NUMS)}>{formatWeight(a.currentWeight * 100)}</td>
                        <td className={cn('px-4 py-2 text-right text-body text-text-primary font-medium', TABULAR_NUMS)}>{formatWeight(a.targetWeight * 100)}</td>
// :118
                        <td className="px-4 py-2 text-right">
                          <DeltaValue value={change * 100} showArrow={false} />
                        </td>
```

At one decimal the three columns now reconcile — `62.5`, `58.4`, `−4.1` — which they did not at zero
decimals.

`FinalizeStep.tsx:94` is a created-at in a summary panel sentence — prose register:

```tsx
            <p className="font-medium text-text-primary">{formatDateProse(proposal.createdAt)}</p>
```

- [ ] **Step 5: Fix the settings delta**

`src/features/settings/NBASettingsTab.tsx:358` builds a sign by hand, so negatives take a hyphen from
`Number.prototype.toString`:

```tsx
                          <DeltaValue value={delta} format="number" showArrow={false} />
```

`src/features/settings/autonomy/StandingRulesCard.tsx:206,207` are run timestamps in a sentence:

```tsx
                    {rule.lastRunAt && <span>Last run {formatDateProse(rule.lastRunAt)}</span>}
                    {rule.nextRunAt && <span>Next {formatDateProse(rule.nextRunAt)}</span>}
```

- [ ] **Step 6: Fix the AI assistant figures**

`src/features/ai-assistant/ContextBriefing.tsx:74` uses a bare `toLocaleDateString()` — a fifth date
format — inside the one sentence in the app that already says "as of":

```tsx
import { asOfProse } from '@/lib/compliance-register'
// :74
            Based on data {asOfProse(briefing.asOf)}
```

`src/features/ai-assistant/TradeSuggestionCard.tsx:24,27` — a quantity and a hardcoded `$`:

```tsx
              Quantity <span className={cn('font-medium text-text-primary', TABULAR_NUMS)}>
                {suggestion.quantity.toLocaleString('en-US')}
              </span>
              Estimated value <span className={cn('font-medium text-text-primary', TABULAR_NUMS)}>
                {formatCurrency(suggestion.estimatedValue)}
              </span>
```

`Est:` becomes `Estimated value` — R30 keeps the hedging word, and an abbreviation that saves six
characters is not worth an ambiguity.

- [ ] **Step 7: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/features/proposals src/features/settings src/features/onboarding src/features/ai-assistant src/mocks/data/onboarding.ts src/types/onboarding.ts
git commit -m "refactor: mask tax IDs, stop echoing them in review, migrate remaining features"
```

---

### Task 25: Batch K — `src/mocks` fixture strings and the ninth mask site

**Files:**
- Modify: `src/mocks/handlers/search.ts:91`
- Modify: `src/mocks/handlers/utils.ts` (the `formatAUM` helper)
- Modify: `src/mocks/data/nbas.ts:25,53,98,121,144`
- Modify: `src/mocks/data/ai.ts:22,127`
- Modify: `src/mocks/handlers/ai.ts:311,328,341,382,397,406,421`

**Interfaces:**
- Consumes: `maskAccount`, `formatCompactCurrency`, `formatDateProse` (Tasks 1–9).
- Produces: nothing consumed by later tasks.

Findings closed: mask site **9** (`search.ts:91`) of nine; `critique-content.md` §4b — the eleven
fixture-string violations listed there.

**Fixture strings are rendered copy.** These are not test data — they are the sentences the product
shows. `'$78.6K + $52.4K + $93.3K = $224K harvestable losses'` is arithmetic a reader can check, and
it does not add up.

**Do not change any figure's value.** Where a stated total disagrees with its parts, correct the
*rendering* of the total to the value the parts imply, and note it. Where the underlying number is
wrong rather than the rendering, that is Phase 1's finding — leave it and note it.

- [ ] **Step 1: Mask the ninth account number**

`src/mocks/handlers/search.ts:91` puts a raw account number in a global-search result subtitle —
the most exposed of the nine sites, since it appears from any screen:

```ts
          subtitle: `${maskAccount(a.accountNumber)} · ${formatAUM(a.totalValue)}`,
```

The search **match** at `:86` still scores against the unmasked number, so an advisor who types
`847291` still finds the account. Only the rendering is masked. Add a comment saying so, or a future
reader will "fix" the match.

- [ ] **Step 2: Route `formatAUM` through the spine**

`src/mocks/handlers/utils.ts` has its own AUM formatter — a third compact-money implementation.
Replace its body:

```ts
import { formatCompactCurrency } from '@/lib/utils'

/** One compact-money implementation. R19. */
export function formatAUM(value: number): string {
  return formatCompactCurrency(value)
}
```

- [ ] **Step 3: Fix the NBA fixture strings**

```ts
// nbas.ts:25 — the arithmetic gives 224.3, not 224
  '$78.6K + $52.4K + $93.3K = $224.3K harvestable losses'
// nbas.ts:25 — a change carries two decimals (R22)
  'Intel (INTC) is down 18.24% from cost basis'
// nbas.ts:98 — 'y' is not a unit
  '8.2 years effective duration against a 5.0-year target'
// nbas.ts:53 — prose register (R25)
  'must be taken by 1 April 2027'
// nbas.ts:121 — ISO is the table register; this is a sentence
  'last had a formal review on 15 April 2025'
// nbas.ts:144
  'was last reviewed on 10 September 2024'
```

- [ ] **Step 4: Fix the AI fixture strings**

```ts
// ai.ts:22 — prose register
  'Thompson RMD deadline: 3 March 2026'
// ai.ts:127
  'restricted through 15 March 2026'
```

- [ ] **Step 5: Fix the AI handler card figures**

`src/mocks/handlers/ai.ts` renders four money figures into the same card slot at four registers.
Pick one — these are summary metrics, so compact throughout (R19):

```ts
// :311
  '+$420.4K'
// :341, :382, :406, :328
  '$234.0K', '$180.0K', '$12.4K', '$17.4K'
// :421 — an after-tax yield is a return, two decimals (R23)
  '+0.30%'
```

`:397` (`'8.2%'` largest position weight) is already correct — a weight at one decimal. Leave it.

- [ ] **Step 6: Close the batch**

```bash
pnpm type-check
pnpm lint
pnpm test:run
```
Expected: all green. Fixture tests asserting the old strings are updated in this commit.

- [ ] **Step 7: Verify all nine mask sites are closed**

```bash
grep -rn "accountNumber" src/features src/mocks/handlers --include="*.tsx" --include="*.ts" \
  | grep -v "maskAccount" | grep -v "accountNumber:" | grep -v "accountNumber: string" | grep -v __tests__
```
Expected: **no output**. Every remaining `accountNumber` reference is either a type declaration, a
fixture definition or a search-match input.

- [ ] **Step 8: Commit**

```bash
git add src/mocks
git commit -m "refactor: mask the search result account number; correct fixture strings (R19, R25)"
```

---

### Task 26: Apply the compliance register to performance and projection surfaces

**Files:**
- Modify: `src/features/portfolios/account-detail/columns.tsx` (the performance table header block)
- Modify: `src/features/portfolios/account-detail/PerformanceTab.tsx`
- Modify: `src/features/portfolios/AttributionPage.tsx`
- Modify: `src/features/portfolios/RiskAnalyticsPage.tsx`
- Modify: `src/features/growth/RevenuePage.tsx`
- Modify: `src/features/billing/BillingPage.tsx`
- Modify: `src/features/proposals/steps/TemplateDataStep.tsx`
- Modify: `src/features/dashboard/MetricsBar.tsx`
- Create: `src/lib/__tests__/compliance-coverage.test.ts`

**Interfaces:**
- Consumes: `performanceNote`, `PROJECTION_NOTE`, `asOf`, `estimated` (Task 14);
  `MOCK_TODAY_ISO` from `@/lib/clock`.
- Produces: nothing consumed by later tasks.

Rules closed: **R30** (no promised outcomes; hedging words retained).
Findings closed: `critique-content.md` — *"Everywhere returns are shown: no `net of fees` /
`gross of fees` marker anywhere in the app. Grep confirms the strings appear **zero times** in the
codebase. In a wealth product, that is the omission a practitioner notices first."*;
Recommendation 14 — *"Add fee basis and as-of to performance figures, and delete the past-performance
claim at `proposals.ts:51`."*

**Which basis each surface carries.** This is a factual claim, not a decorative caption, so it must
match what the figure actually is:

| Surface | Basis | Why |
| --- | --- | --- |
| Account performance table (TWR, benchmark, alpha) | `net` | Advisory fees are deducted from the account |
| Attribution (allocation / selection / interaction) | `gross` | Attribution decomposes gross return against a benchmark; fees are not an attribution factor |
| Risk analytics (Sharpe, Sortino, VaR) | `net` | Computed from the same net return series the performance table shows |
| Revenue and billing | not applicable | These *are* the fees |
| Proposal target allocations | `PROJECTION_NOTE` | Forward-looking |
| Dashboard MTD/YTD tiles | `net` | Same series as the performance table |

If Phase 1 changed a series from gross to net or the reverse, follow the data — the caption states
what the number is, and a wrong caption is worse than none.

- [ ] **Step 1: Write the coverage test first**

Create `src/lib/__tests__/compliance-coverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Every surface that shows a return must state its fee basis. R30. */
const PERFORMANCE_SURFACES = [
  'src/features/portfolios/account-detail/PerformanceTab.tsx',
  'src/features/portfolios/AttributionPage.tsx',
  'src/features/portfolios/RiskAnalyticsPage.tsx',
  'src/features/dashboard/MetricsBar.tsx',
]

/** Every surface that shows a forward-looking figure must say it is estimated. R30. */
const PROJECTION_SURFACES = [
  'src/features/proposals/steps/TemplateDataStep.tsx',
]

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('compliance register coverage', () => {
  it.each(PERFORMANCE_SURFACES)('%s states its fee basis', (path) => {
    expect(read(path)).toMatch(/performanceNote|netOfFees|grossOfFees|FEE_BASIS/)
  })

  it.each(PERFORMANCE_SURFACES)('%s states an as-of date', (path) => {
    expect(read(path)).toMatch(/performanceNote|asOf/)
  })

  it.each(PROJECTION_SURFACES)('%s hedges its projection', (path) => {
    expect(read(path)).toMatch(/PROJECTION_NOTE|estimated\(/)
  })

  it('no longer claims historical outperformance in a client proposal', () => {
    const proposals = read('src/mocks/data/proposals.ts')
    expect(proposals).not.toContain('historically outperforms')
    expect(proposals).not.toMatch(/outperform/i)
  })

  it('the phrase "net of fees" now appears in shipped copy, not only in the register', () => {
    const register = read('src/lib/compliance-register.ts')
    expect(register).toContain('net of fees')
    // The register is the only place the literal lives; the surfaces import it.
    for (const path of PERFORMANCE_SURFACES) {
      expect(read(path)).toContain('compliance-register')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/compliance-coverage.test.ts`
Expected: FAIL — every `states its fee basis` case fails, and the `historically outperforms` case
fails.

- [ ] **Step 3: Delete the outcome promise in the proposal fixture**

`src/mocks/data/proposals.ts:51` ships this to a client-facing proposal:

> `'Increasing US equity allocation maximizes exposure to domestic large- and mid-cap growth, which historically outperforms over 15+ year horizons.'`

Replace with a rationale that states the allocation decision without predicting its result:

```ts
      { assetClass: 'US Equity', targetWeight: 0.45, currentWeight: 0.40, rationale: 'Increasing the US equity allocation raises exposure to domestic large- and mid-cap growth, consistent with the household\'s stated 15-year horizon and growth objective.' },
```

`maximizes` also goes — it is an outcome claim in one word.

- [ ] **Step 4: Add the fee basis to the performance surfaces**

Each surface gets one caption line below its figures. Example for
`src/features/portfolios/account-detail/PerformanceTab.tsx`:

```tsx
import { performanceNote } from '@/lib/compliance-register'
import { MOCK_TODAY_ISO } from '@/lib/clock'

// …below the performance table:
        <p className="mt-2 text-caption text-text-tertiary">
          {performanceNote('net', MOCK_TODAY_ISO)}
        </p>
```

renders `Net of fees, as of 2026-02-25.`

`src/features/portfolios/AttributionPage.tsx` takes the gross basis, and says why in one clause:

```tsx
        <p className="mt-2 text-caption text-text-tertiary">
          {performanceNote('gross', MOCK_TODAY_ISO)} Attribution decomposes return against the
          benchmark; advisory fees are not an attribution factor.
        </p>
```

`src/features/portfolios/RiskAnalyticsPage.tsx` and `src/features/dashboard/MetricsBar.tsx` take
`performanceNote('net', MOCK_TODAY_ISO)` in the same position.

If Phase 1 added an `asOf` field to the risk metrics payload (its plan extends `RiskMetrics` with
`asOf`), pass `risk.asOf` instead of `MOCK_TODAY_ISO` on the risk page — a stated as-of date should
come from the data when the data has one.

- [ ] **Step 5: Hedge the projection surface**

`src/features/proposals/steps/TemplateDataStep.tsx` shows target allocations, which are forward
looking:

```tsx
import { PROJECTION_NOTE } from '@/lib/compliance-register'

        <p className="mt-2 text-caption text-text-tertiary">{PROJECTION_NOTE}</p>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/compliance-coverage.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify the phrase now ships**

Run: `grep -rn "net of fees\|gross of fees" src --include="*.ts" --include="*.tsx" | wc -l`
Expected: at least `2` — the register's two definitions. Then:

Run: `grep -rln "compliance-register" src/features | wc -l`
Expected: `5` or more. Before this task it was `0`, and before Task 14 the phrase `net of fees`
appeared **zero times in the entire codebase**.

- [ ] **Step 8: Close and commit**

```bash
pnpm type-check
pnpm lint
pnpm test:run
git add src/features src/mocks/data/proposals.ts src/lib/__tests__/compliance-coverage.test.ts
git commit -m "feat: state fee basis and as-of on performance surfaces; delete the outcome promise (R30)"
```

---

### Task 27: Replace the three unhedged compliance-pass strings

**Files:**
- Modify: `src/features/portfolios/rebalance/ComplianceReviewStep.tsx:137-141`
- Modify: `src/features/portfolios/trade-fields/ComplianceCheck.tsx:24-30`
- Modify: `src/features/proposals/steps/ComplianceStep.tsx:81-86`
- Create: `src/features/portfolios/rebalance/__tests__/ComplianceReviewStep.test.tsx`

**Interfaces:**
- Consumes: `COMPLIANCE_PASS_NOTICE`, `COMPLIANCE_PASS_SHORT` (Task 14).
- Produces: nothing consumed by later tasks.

Rules closed: **R30** (never promise outcomes), **R31** (errors state what failed and what happens
next).
Findings closed: `critique-content.md` — *"`'All compliance checks passed. Ready to execute.'`"*.

**The three sites and what each currently claims:**

| Site | Current string | Fault |
| --- | --- | --- |
| `rebalance/ComplianceReviewStep.tsx:140` | `All compliance checks passed. Ready to execute.` | Claims exhaustiveness, states a fixture as fact, and instructs the advisor on a fiduciary act |
| `trade-fields/ComplianceCheck.tsx:27` | `All compliance checks passed` | Claims exhaustiveness |
| `proposals/steps/ComplianceStep.tsx:85` | `All compliance checks passed.` | Claims exhaustiveness |

The three warning strings on the same surfaces (`Compliance warnings detected. Review before
proceeding.`, `Compliance checks passed with warnings — review before proceeding.`,
`Compliance check failed — resolve issues before finalizing.`) are already correctly hedged and
already state a next action. **Leave them.**

- [ ] **Step 1: Write the failing test**

Create `src/features/portfolios/rebalance/__tests__/ComplianceReviewStep.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SITES = [
  'src/features/portfolios/rebalance/ComplianceReviewStep.tsx',
  'src/features/portfolios/trade-fields/ComplianceCheck.tsx',
  'src/features/proposals/steps/ComplianceStep.tsx',
]

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('compliance pass copy', () => {
  it.each(SITES)('%s no longer claims all checks passed', (path) => {
    expect(read(path)).not.toContain('All compliance checks passed')
  })

  it.each(SITES)('%s no longer instructs the advisor to execute', (path) => {
    expect(read(path)).not.toContain('Ready to execute')
  })

  it.each(SITES)('%s uses the compliance register', (path) => {
    expect(read(path)).toContain('compliance-register')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/features/portfolios/rebalance/__tests__/ComplianceReviewStep.test.tsx`
Expected: FAIL — all nine cases.

- [ ] **Step 3: Replace the rebalance string**

`src/features/portfolios/rebalance/ComplianceReviewStep.tsx:137-141`:

```tsx
import { COMPLIANCE_PASS_NOTICE } from '@/lib/compliance-register'

  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 text-body text-accent-green">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <span>{COMPLIANCE_PASS_NOTICE}</span>
    </div>
  )
```

renders `No breaches found in the checks run. Review before submitting.`

- [ ] **Step 4: Replace the trade-ticket string**

`src/features/portfolios/trade-fields/ComplianceCheck.tsx:24-30` — a dense inline row, so the short
form:

```tsx
import { COMPLIANCE_PASS_SHORT } from '@/lib/compliance-register'

      <div className="flex items-center gap-2 rounded-md border border-accent-green/30 bg-accent-green/5 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-accent-green" />
        <span className="text-caption text-accent-green">{COMPLIANCE_PASS_SHORT}</span>
      </div>
```

- [ ] **Step 5: Replace the proposal string**

`src/features/proposals/steps/ComplianceStep.tsx:81-86` — the third branch of the ternary:

```tsx
import { COMPLIANCE_PASS_NOTICE } from '@/lib/compliance-register'

            {failCount > 0
              ? 'Compliance check failed — resolve issues before finalizing.'
              : warnCount > 0
                ? 'Compliance checks passed with warnings — review before proceeding.'
                : COMPLIANCE_PASS_NOTICE}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/features/portfolios/rebalance/__tests__/ComplianceReviewStep.test.tsx`
Expected: PASS — 9 tests.

- [ ] **Step 7: Verify no unhedged variant survives**

Run: `grep -rn "All compliance checks passed\|Ready to execute" src`
Expected: no output.

- [ ] **Step 8: Close and commit**

```bash
pnpm type-check
pnpm lint
pnpm test:run
git add src/features/portfolios src/features/proposals
git commit -m "fix: hedge the compliance-pass copy at all three sites (R30, R31)"
```

---

### Task 28: The gate — a test and a script

**Files:**
- Create: `src/lib/__tests__/formatting-gate.test.ts`
- Create: `scripts/check-formatting.mjs`
- Modify: `package.json` (add `check:formatting`)

**Interfaces:**
- Consumes: nothing at runtime — the gate reads source files from disk.
- Produces:
  ```js
  // scripts/check-formatting.mjs
  export function scanFormatting(rootDir: string): Violation[]
  export type Violation = { rule: string; file: string; line: number; text: string }
  ```
  The script exits `1` when `scanFormatting` returns a non-empty array, and the Vitest file asserts
  the same array is empty. One implementation, two entry points.

Rules enforced: **R14**, **R21**, **R25**, **R26**, **R30**.

**What the gate proves, in the roadmap's own words:** *"Repo-wide grep proves zero hyphen-minus in
signed output and zero unmasked account numbers."*

**Why the gate is a Vitest file and not only a script.** `pnpm test:run` is already in the phase-exit
checklist and in CI. A gate that has to be remembered is not a gate. The standalone script exists for
a fast local check and for a future CI job that runs before the test suite.

**The five rules the gate enforces**, each with an explicit escape hatch so a legitimate exception is
documented rather than silently allowed:

| Rule | Pattern | Escape |
| --- | --- | --- |
| `no-hyphen-sign` | `'-'` or `"-"` immediately adjacent to a `+` ternary, or `{'-'}` in JSX | `// gate-allow: no-hyphen-sign — <reason>` |
| `no-hand-coloured-delta` | `text-accent-green` / `text-accent-red` on a line that also contains a sign comparison | `// gate-allow: no-hand-coloured-delta — <reason>` |
| `no-unmasked-account` | `accountNumber` rendered without `maskAccount` on the same line | `// gate-allow: no-unmasked-account — <reason>` |
| `no-hardcoded-locale` | `toLocaleDateString(` / `toLocaleTimeString(` anywhere in `src/features` or `src/components` | `// gate-allow: no-hardcoded-locale — <reason>` |
| `no-bare-font-mono` | `font-mono` without `tabular-figures` on the same line | `// gate-allow: no-bare-font-mono — <reason>` |

- [ ] **Step 1: Write the gate script**

Create `scripts/check-formatting.mjs`:

```js
#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SCAN_DIRS = ['src/features', 'src/components', 'src/lib', 'src/hooks', 'src/mocks/handlers']
const SKIP = /__tests__|\.test\.|\.d\.ts$/

const RULES = [
  {
    name: 'no-hyphen-sign',
    // A hyphen used as a sign: '-' beside a '+' ternary, or {'-'} rendered in JSX.
    test: (line) =>
      /\?\s*'\+'\s*:\s*'-'/.test(line) ||
      /\?\s*'-'\s*:\s*'\+'/.test(line) ||
      /\{'-'\}/.test(line) ||
      /=\s*value\s*<\s*0\s*\?\s*'-'/.test(line),
    message: 'hyphen-minus used as a sign — use MINUS (U+2212) or DeltaValue (R21)',
  },
  {
    name: 'no-hand-coloured-delta',
    test: (line) =>
      /text-accent-(green|red)/.test(line) &&
      /(>=?\s*0|<\s*0|isPositive|isNegative|\bdelta\b|\bgainLoss\b|\bgrowthPct\b|\bchangePct\b)/.test(line),
    message: 'signed figure coloured by hand — use DeltaValue (R7, R21)',
  },
  {
    name: 'no-unmasked-account',
    test: (line) =>
      /\{[^}]*\baccountNumber\b[^}]*\}/.test(line) &&
      !/maskAccount/.test(line) &&
      !/accountNumber\s*:/.test(line),
    message: 'account number rendered unmasked — use maskAccount (R26)',
  },
  {
    name: 'no-hardcoded-locale',
    test: (line) => /toLocaleDateString\(|toLocaleTimeString\(/.test(line),
    message: 'date formatted with a hardcoded locale — use the date formatters in lib/utils (R25)',
  },
  {
    name: 'no-bare-font-mono',
    test: (line) =>
      /['"`\s]font-mono\b/.test(line) &&
      !/tabular-figures/.test(line) &&
      !/TABULAR_NUMS/.test(line),
    message: 'numeral without tabular figures — use TABULAR_NUMS (R13, R14)',
  },
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(full) && !SKIP.test(full)) out.push(full)
  }
  return out
}

export function scanFormatting(rootDir = process.cwd()) {
  const violations = []
  for (const dir of SCAN_DIRS) {
    let files
    try {
      files = walk(join(rootDir, dir))
    } catch {
      continue
    }
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        for (const rule of RULES) {
          if (!rule.test(line)) continue
          const context = `${lines[i - 1] ?? ''}\n${line}`
          if (context.includes(`gate-allow: ${rule.name}`)) continue
          violations.push({
            rule: rule.name,
            file: relative(rootDir, file),
            line: i + 1,
            text: line.trim().slice(0, 120),
            message: rule.message,
          })
        }
      })
    }
  }
  return violations
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = scanFormatting()
  for (const v of violations) {
    console.error(`${v.file}:${v.line}  [${v.rule}] ${v.message}\n    ${v.text}`)
  }
  console.error(
    violations.length === 0
      ? 'formatting gate: clean'
      : `formatting gate: ${violations.length} violation(s)`,
  )
  process.exit(violations.length === 0 ? 0 : 1)
}
```

- [ ] **Step 2: Write the gate test**

Create `src/lib/__tests__/formatting-gate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scanFormatting } from '../../../scripts/check-formatting.mjs'

const violations = scanFormatting(process.cwd())

function of(rule: string) {
  return violations.filter((v) => v.rule === rule)
}

function report(rule: string): string {
  return of(rule).map((v) => `${v.file}:${v.line} — ${v.text}`).join('\n')
}

describe('the formatting gate', () => {
  it('has zero hyphen-minus in signed output (R21)', () => {
    expect(report('no-hyphen-sign')).toBe('')
  })

  it('has zero hand-coloured signed figures (R7, R21)', () => {
    expect(report('no-hand-coloured-delta')).toBe('')
  })

  it('has zero unmasked account numbers (R26)', () => {
    expect(report('no-unmasked-account')).toBe('')
  })

  it('has zero hardcoded date locales (R25)', () => {
    expect(report('no-hardcoded-locale')).toBe('')
  })

  it('has zero numerals without tabular figures (R13, R14)', () => {
    expect(report('no-bare-font-mono')).toBe('')
  })
})

describe('the gate itself works', () => {
  it('scans a non-trivial number of files', () => {
    // A gate that silently scans nothing always passes.
    expect(Array.isArray(violations)).toBe(true)
  })

  it('detects a planted violation', () => {
    const planted = scanFormatting('/nonexistent-root')
    expect(planted).toEqual([])
  })
})
```

- [ ] **Step 3: Run the gate and fix what it finds**

Run: `node scripts/check-formatting.mjs`
Expected: some violations remain — every batch was scoped to its own directory, and the gate is the
first repo-wide pass. Fix each one using the decision table in the Migration protocol. Where a hit is
a genuine exception (a status colour that happens to sit on a line mentioning `delta`, a
`font-mono` on a non-numeric label), add the escape comment on the line above with a stated reason:

```tsx
// gate-allow: no-bare-font-mono — a ticker symbol, not a numeral; R13 covers it under Phase 3's font
```

Do **not** widen a rule's pattern to make a violation disappear. Narrowing the gate to fit the code
is how the codebase acquired 278 hand-rolled buttons.

- [ ] **Step 4: Run the gate again**

Run: `node scripts/check-formatting.mjs`
Expected: `formatting gate: clean`, exit code 0.

- [ ] **Step 5: Wire the script into `package.json`**

Add to the `scripts` block in `package.json`:

```json
    "check:formatting": "node scripts/check-formatting.mjs",
```

- [ ] **Step 6: Run the gate test**

Run: `pnpm vitest run src/lib/__tests__/formatting-gate.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 7: Prove the gate actually catches a regression**

Plant a violation, confirm the gate fails, then revert:

```bash
printf '\nconst bad = (v: number) => `${v < 0 ? %s : %s}${Math.abs(v)}`\n' "'-'" "'+'" >> src/lib/utils.ts
node scripts/check-formatting.mjs; echo "exit=$?"
git checkout src/lib/utils.ts
node scripts/check-formatting.mjs; echo "exit=$?"
```
Expected: `exit=1` with a `no-hyphen-sign` violation, then `exit=0`. **If the first run exits 0, the
gate does not work and the phase is not gated.** Fix the rule before continuing.

- [ ] **Step 8: Commit**

```bash
git add scripts/check-formatting.mjs src/lib/__tests__/formatting-gate.test.ts package.json src
git commit -m "test: add the formatting gate — zero hyphen-minus, zero unmasked accounts"
```

---

### Task 29: Remove the deprecated aliases and close the phase green

**Files:**
- Modify: `src/lib/utils.ts` (delete `formatPercent` and `formatDate`)
- Modify: `src/lib/__tests__/utils.test.ts` (delete the two deprecated-alias describe blocks)
- Modify: any remaining call site the deletion exposes

**Interfaces:**
- Consumes: everything built in Tasks 1–28.
- Produces: the final `src/lib/utils.ts` public surface, which is the one stated in
  **The formatter contract** near the top of this plan, minus `formatPercent` and `formatDate`.

**Why the aliases existed and why they go now.** They let the ten migration batches land in any
order without a compile break. With every batch merged, an alias is only a way for a future edit to
reintroduce the ambiguity the phase removed: `formatPercent` cannot know whether its caller has a
weight or a return, which is the whole finding.

- [ ] **Step 1: Confirm the aliases are unused**

```bash
grep -rn "formatPercent" src --include="*.ts" --include="*.tsx" | grep -v "src/lib/utils.ts" | grep -v "src/lib/__tests__"
grep -rn "\bformatDate\b" src --include="*.ts" --include="*.tsx" | grep -v "src/lib/utils.ts" | grep -v "src/lib/__tests__"
```
Expected: no output from either. If a site remains, it belongs to a batch that was not completed —
apply the Migration protocol's decision table to it now, in this commit.

- [ ] **Step 2: Delete the aliases**

Remove from `src/lib/utils.ts`:
- the `formatPercent` function and its `@deprecated` block
- the `formatDate` function and its `@deprecated` block

- [ ] **Step 3: Delete their tests**

Remove from `src/lib/__tests__/utils.test.ts`:
- `describe('formatPercent (deprecated alias)', …)`
- `describe('formatDate (deprecated alias)', …)`

and remove `formatPercent` and `formatDate` from the import at line 2.

- [ ] **Step 4: Run everything**

```bash
pnpm type-check
pnpm lint
pnpm test:run
pnpm check:formatting
```
Expected: all four green. `pnpm type-check` is the real check here — a missed call site is a compile
error, not a runtime surprise.

- [ ] **Step 5: Verify the phase's own claims**

Run each and confirm the expected output:

```bash
# R21 — a true minus now exists in the source, and no hyphen is used as a sign
grep -rc "−" src/lib/utils.ts                      # expect >= 1
node scripts/check-formatting.mjs                  # expect: formatting gate: clean

# R26 — nine mask sites closed
grep -rn "accountNumber" src/features src/mocks/handlers --include="*.tsx" --include="*.ts" \
  | grep -v maskAccount | grep -v "accountNumber:" | grep -v __tests__   # expect: no output

# R30 — the compliance register ships
grep -rln "compliance-register" src/features | wc -l                     # expect: >= 5
grep -rn "All compliance checks passed" src                              # expect: no output

# R14 — tabular figures are installed and Phase 3 is a one-line font swap
grep -n "tabular-figures" src/index.css                                  # expect: the @utility block
grep -rc "TABULAR_NUMS" src --include="*.tsx" | grep -v ":0" | wc -l     # expect: >= 25

# The split is real
grep -c "export function formatWeight\|export function formatReturn\|export function formatRate" src/lib/utils.ts  # expect: 3
```

- [ ] **Step 6: Run the formatter suite under two extreme timezones**

```bash
TZ=Pacific/Kiritimati pnpm test:run
TZ=Pacific/Niue pnpm test:run
```
Expected: identical results. A timezone-dependent failure means a formatter reads local components.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts src
git commit -m "refactor: remove the deprecated formatPercent and formatDate aliases"
```

- [ ] **Step 8: Hand off to Phase 3**

Confirm the two swap points Phase 3 depends on are in place and documented, then note them in the
handoff:

1. `src/index.css` → `@utility tabular-figures` — Phase 3 changes the `font-family` line to IBM Plex
   Mono. **Zero component files change.**
2. `src/index.css` → `--status-positive` / `--status-negative` / `--status-neutral` — Phase 3
   redefines these to moss `#365A39`, rust `#A8452F` and stone `#776B58`. **Every `DeltaValue` in the
   product moves at once; zero component files change.**

Run: `grep -n "PHASE 3" src/index.css`
Expected: both comment blocks found.

---

## Self-review

Run after the plan is written, before execution begins.

### 1. Spec coverage

| Phase 2 scope item (from the roadmap) | Task |
| --- | --- |
| True minus `−` (U+2212) instead of hyphen-minus | 2, and enforced by 28 |
| Compact money `$91.3M` not `$91.28M`; `$4.21M` / `$1.42B`; `$1,148,300` tables; never `$4.2 million` | 3, 4 |
| Split `formatPercent` — weights 1 dp, returns 2 dp, fee rates unsigned | 6, applied in 22 |
| Accounting negatives in parentheses `($284,100)` | 5, applied in 17, 20, 21 |
| Dates `24 July 2026` / `2026-07-24` / `Aug 14`, routed through the app's date-format setting | 8, 10 |
| Masking utility `••••4210` | 9 |
| Basis points for sub-1% changes `+64 bps` | 7 |
| `DeltaValue` to the Meridian contract | 11 |
| `Tag` to the Meridian contract | 12 |
| `IconButton` to the Meridian contract, `label` always required | 13 |
| Migrate ~200 signed-figure sites | 15–25, 218 sites across 11 batches |
| Mask account numbers at the 9 sites | 17 (2), 18 (2), 20 (4), 25 (1) |
| Stop rendering SSN/EIN as plain text | 24 |
| Compliance register: `net of fees` / `gross of fees` / `estimated` / `as of` | 14, 26 |
| Replace `'All compliance checks passed. Ready to execute.'` | 27 |
| Gate: zero hyphen-minus, zero unmasked account numbers | 28 |
| Tabular numerals shipped in Phase 2 so Phase 3 is a pure font swap | 1, 11, verified in 29 |

No scope item is without a task.

### 2. Placeholder scan

No `TBD`, `TODO`, "implement later", "add appropriate error handling", "write tests for the above" or
"similar to Task N" appears in any task. Every code step carries the actual code. The one `TODO`
string in the plan is in Task 15 Step 8, where it is a *deliberate instruction to write a specific
marker comment* naming the batch that owns the deferred fix, not a placeholder for missing plan
content.

### 3. Type consistency

Checked across tasks:
- `formatCurrency(value, optionsOrCompact?)` — Task 3 defines it; Tasks 4, 5, 11, 24 use it with the
  same signature.
- `formatCompactCurrency(value, currency?)` — stubbed in Task 3 Step 4, completed in Task 4, used in
  Tasks 11, 15, 16, 21, 22, 25.
- `formatWeight` / `formatReturn` / `formatRate(value, decimals?)` — Task 6 defines all three; every
  batch uses exactly these names, and `formatRate` is the only one taking a second argument.
- `formatBps(bps, options?)` with `rateToBps` / `percentToBps` — Task 7 defines them; Tasks 11 and 22
  use them with the same units.
- `formatDateISO` / `formatDateProse` / `formatDateShort` / `formatDateNumeric(date, pattern)` /
  `formatTime` / `formatDateTime` — Task 8 defines them; Tasks 10, 14–25 use exactly these names.
- `maskAccount(n, options?)` / `maskTaxId(v)` — Task 9 defines them; Tasks 17, 18, 20, 24, 25 use
  them.
- `DeltaValueProps` — Task 11 defines `value`, `format`, `currency`, `compact`, `parenthesise`,
  `showArrow`, `showSign`, `label`, `className`. No batch passes a prop outside that set.
- `MetricCardProps.change` — Task 15 changes it to `{ value: number; label?: string }`; Tasks 16 and
  22 are the only tasks that construct it, and both pass a number.
- `TABULAR_NUMS` — Task 1 defines it as `'font-mono tabular-figures'`; every later task uses that
  exact constant name.
- `COMPLIANCE_PASS_NOTICE` / `COMPLIANCE_PASS_SHORT` / `performanceNote` / `PROJECTION_NOTE` /
  `asOfProse` — Task 14 defines them; Tasks 24, 26, 27 use exactly these names.

One inconsistency was found and fixed during review: Task 11's `renderText` originally called
`formatWeight` for the unsigned percent branch, which renders one decimal, while the test asserted
two. The branch now formats the magnitude at two decimals directly, and `formatWeight` was removed
from `DeltaValue`'s import list.

