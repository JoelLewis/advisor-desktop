# Phase 1b — Integrity Carry-Forward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the seven integrity-class defects that survived Phase 1, plus two more of the same class discovered while closing them (Tasks 8 and 9 below), — one the phase gate found in itself, six an independent adversarial domain review found — so that no screen in the showcase states a financial figure that contradicts the data layer or asserts a benefit that cannot exist.

**Architecture:** Same as Phase 1. `src/mocks/` **is** the data layer; there is no backend. Every figure a screen shows must be derived from the fixtures at read time, never hand-typed alongside them. Pure derivation lives in `src/lib/` with zero imports; handlers in `src/mocks/handlers/` compose those primitives; components render what the handlers return and compute nothing financial themselves.

**Tech Stack:** React 18 · TypeScript strict · Vite 6 · Tailwind v4 · Radix · Recharts · MSW 2 · Vitest 4 · TanStack Query · pnpm

## Provenance

Every task below traces to a verified finding. Section numbers refer to
`docs/superpowers/reference/phase-1-deferred-findings.md`; controller verification notes are in
`.superpowers/sdd/2026-07-24-phase-1-data-integrity/codex-adversarial-findings.md`.

| Task | Finding | Severity | Verified against live code by |
|---|---|---|---|
| 1 | §5.2 — model-governance hardcoded AUM | Critical (gate miss) | Phase gate + controller |
| 2 | §9.1 — TLH offered inside IRAs | Critical | Controller |
| 3 | §9.2 — compliance certifies unchecked positions | High | Controller |
| 4 | §9.3 — native-currency amounts labelled USD | High | Controller |
| 5 | §9.4 — named benchmark is not the benchmark used | High | Controller |
| 6 | §9.5 — static AI answers contradict canonical data | Medium | Controller |
| 7 | §9.6 — sell cap has a ceiling but no floor | High | Codex; reproduced in controller sweep |
| 8 | §9.7 — cannot buy an unheld class; picks `candidates[0]` | Medium | Controller sweep + Codex |
| 9 | Fabricated model-trade preview (found in Task 4) | Critical | Controller |

## Global Constraints

Every task's requirements implicitly include this section.

1. **Derived, not stored.** A financial figure appears in exactly one place: the function that derives it. If you find yourself typing a number that could be computed from the fixtures, compute it.
2. **One fact, one place.** Two surfaces showing the same fact must read the same function. Adding a second computation of an existing fact is a defect even when both agree today.
3. **Mutation testing is the only accepted verification.** A green suite is not evidence. For every behaviour you fix, break the fixed line, run the suite, confirm a *named* test fails, and restore. Report which test died. **Fourteen instances were found in Phase 1 of tests that passed while certifying the defect they were written to catch** — including one where a full sign inversion passed, and one where the fixed function was reverted verbatim with the whole suite still green. If a mutation survives, your test does not test what you think.
4. **A test that pins a value must also pin its direction.** Asserting a number is necessary and not sufficient; assert what makes it that number rather than its negation.
5. **The four non-USD accounts are `acc-041` (HKD), `acc-042` (SGD), `acc-043` (EUR), `acc-044` (CHF).** They have carried a defect in seven consecutive tasks. Exercise them explicitly in every task that touches money.
6. **Time is frozen.** `MOCK_NOW_ISO = '2026-02-25T12:00:00Z'`, `MOCK_TODAY_ISO = '2026-02-25'`, from `src/lib/clock.ts`. Never call `Date.now()` or `new Date()` with no argument. Never use local-time `getDate`/`setDate` arithmetic on a UTC-anchored value.
7. **Do not weaken an existing test to make your change pass.** If an existing expectation is genuinely wrong, say so explicitly in your report, show the arithmetic proving it wrong, and restate it — never delete it or loosen a bound.
8. **Do not touch `src/mocks/data/__tests__/rollup-invariants.test.ts`.** It is the phase gate, 234 assertions, byte-identical across all of Phase 1. If your change breaks it, your change is wrong.
9. **Run tests with `pnpm test:run`** from the repo root. If it reports zero tests or a dangling-symlink error, run `CI=true pnpm install` first — a stale `node_modules/.modules.yaml` from a removed worktree causes pnpm to abort while looking successful.
10. **Every assertion over a collection needs a vacuity guard.** `.every()`, `.some(... )` inside a loop, and `for (const x of xs)` all pass trivially when the collection is empty. Assert the collection is non-empty *first*. This is not hypothetical: Task 3's "never emit the affirmative pass" mutation survived all 48 tests because the brief's `.every()` ran over an empty array — a false clean pass inside the very test written to prevent one.
11. **Verify your commands can fail.** Before trusting a grep that returns empty, prove it can still find something — run it against a revision where the defect existed. Before trusting an invariant that passes, check it constrains both directions. Phase 1 shipped a gate grep that matched nothing at any revision, and a 47-account sweep whose invariant had a ceiling but no floor.

---

### Task 1: Model governance AUM is derived from the book

**Finding §5.2.** `pms.ts` hand-types `totalAUM` and `assignedAccounts` for all seven models. They sum to **$118,670,000 across 40 accounts**; the derived book is **$91,320,824 across 47**. The screen renders 130% of the book. Phase 1's verification grep scanned only `src/mocks/data` and could never have seen it.

**Files:**
- Modify: `src/mocks/handlers/pms.ts:911, 954, 983, 1011, 1026, 1068, 1083` (the seven hardcoded pairs)
- Modify: `src/features/portfolios/ModelGovernancePage.tsx:288-289` (only if it computes rather than renders)
- Test: `src/mocks/handlers/__tests__/model-governance-invariants.test.ts` (create)

**Interfaces:**
- Consumes: `deriveBookAUM(accounts, FX_RATES_USD_BASE)` from `src/lib/aum.ts` — already used at `pms.ts:47` and `:1121`. `accounts` from `src/mocks/data/accounts.ts`, each carrying `modelId?: string` and `totalValue` in **native** currency.
- Produces: model rows whose `totalAUM` and `assignedAccounts` are derived. Nothing downstream changes shape.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/model-governance-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getModels } from '@/services/pms'
import { getAccounts } from '@/services/custodian'
import { deriveBookAUM } from '@/lib/aum'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

describe('model governance reconciles to the book', () => {
  it('assigned accounts across all models equal the accounts that carry a modelId', async () => {
    const [models, accounts] = await Promise.all([getModels(), getAccounts()])
    const assignedInBook = accounts.filter((a) => a.modelId).length
    const claimed = models.reduce((sum, m) => sum + m.assignedAccounts, 0)
    expect(claimed).toBe(assignedInBook)
  })

  it('model AUM sums to the AUM of the accounts assigned to a model, not more than the book', async () => {
    const [models, accounts] = await Promise.all([getModels(), getAccounts()])
    const assigned = accounts.filter((a) => a.modelId)
    const expected = deriveBookAUM(assigned, FX_RATES_USD_BASE)
    const claimed = models.reduce((sum, m) => sum + m.totalAUM, 0)
    // Within a dollar of the derived figure — rounding per model is permitted, invention is not.
    expect(Math.abs(claimed - expected)).toBeLessThanOrEqual(models.length)
    // And the direction that matters: the model book can never exceed the whole book.
    expect(claimed).toBeLessThanOrEqual(deriveBookAUM(accounts, FX_RATES_USD_BASE) + 1)
  })

  it('each model individually matches its own assigned accounts, in USD', async () => {
    const [models, accounts] = await Promise.all([getModels(), getAccounts()])
    for (const model of models) {
      const own = accounts.filter((a) => a.modelId === model.id)
      expect(model.assignedAccounts, `${model.id} account count`).toBe(own.length)
      const expected = deriveBookAUM(own, FX_RATES_USD_BASE)
      expect(Math.abs(model.totalAUM - expected), `${model.id} AUM`).toBeLessThanOrEqual(1)
    }
  })

  it('a non-USD account is converted, not counted at face value', async () => {
    // acc-041 is HKD. If FX were skipped its native totalValue would land in the model total
    // unconverted, inflating it by roughly 7.8x. This pins that conversion happened.
    const [models, accounts] = await Promise.all([getModels(), getAccounts()])
    const hkd = accounts.find((a) => a.id === 'acc-041')!
    const model = models.find((m) => m.id === hkd.modelId)
    if (!model) return
    const own = accounts.filter((a) => a.modelId === model.id)
    expect(model.totalAUM).toBeLessThan(own.reduce((s, a) => s + a.totalValue, 0))
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test:run src/mocks/handlers/__tests__/model-governance-invariants.test.ts`
Expected: FAIL. The sum assertion should report roughly `118670000` against roughly `91320824`, and the count assertion `40` against the real assigned count.

- [ ] **Step 3: Derive the figures**

At each of the seven sites, replace the hardcoded pair. Add one helper above the model list in `pms.ts` and call it from every site — do not inline the same reduce seven times (Global Constraint 2):

```ts
/** §5.2 · model-governance — these were hand-typed and summed to $118.67M across 40 accounts
 *  against a derived book of $91.32M across 47, rendering 130% of the book. Derived from the
 *  same `deriveBookAUM` the book page reads, so the two can never disagree again. */
function modelBookFor(modelId: string): { assignedAccounts: number; totalAUM: number } {
  const own = accounts.filter((a) => a.modelId === modelId)
  return {
    assignedAccounts: own.length,
    totalAUM: Math.round(deriveBookAUM(own, FX_RATES_USD_BASE)),
  }
}
```

Then at each site replace `assignedAccounts: 14, totalAUM: 42_350_000,` with `...modelBookFor('mod-001'),` and so on for `mod-002` … `mod-007`. Keep every other field on those objects unchanged.

- [ ] **Step 4: Run the new test and the full suite**

Run: `pnpm test:run`
Expected: the four new tests pass; **2102 existing tests still pass**. If an existing test asserted one of the old hardcoded figures, that test encoded the defect — restate it against the derived value and say so in your report (Global Constraint 7).

- [ ] **Step 5: Mutation-verify**

Run each and confirm a *named* test fails, then restore:
1. Revert `mod-001` to `assignedAccounts: 14, totalAUM: 42_350_000,` → the per-model test must fail naming `mod-001`.
2. Change `modelBookFor` to skip FX: `own.reduce((s, a) => s + a.totalValue, 0)` → the non-USD test must fail.
3. Change `own` to `accounts` (all accounts, not just assigned) → the sum or count test must fail.

Report which test died for each. A survivor means the test does not test the fix.

- [ ] **Step 6: Check the page renders, not computes**

Read `src/features/portfolios/ModelGovernancePage.tsx:288-289`. If it renders `model.totalAUM` directly, nothing to change — note that in your report. If it recomputes or re-aggregates, delete that computation and render the handler's value.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/handlers/pms.ts src/mocks/handlers/__tests__/model-governance-invariants.test.ts
git commit -m "fix(models): model governance AUM derived from the book, not hand-typed"
```

---

### Task 2: Tax surfaces gate on tax treatment

**Finding §9.1, Critical.** `TaxManagementPage.tsx` has no `account.taxTreatment` gating anywhere. `acc-003` — `taxTreatment: 'tax_deferred'`, Robert Johnson Traditional IRA, $3.55M — is shown harvest opportunities and dollar "estimated tax benefit" figures. A loss realised inside a Traditional IRA produces no current-year deduction (IRS Publication 590-A: do not take IRA investment gains or losses into account while the IRA remains open). Same class as the Task 17 dashboard fix; the per-account surface was never in its scope.

**Files:**
- Modify: `src/features/portfolios/TaxManagementPage.tsx` (harvest scanner, benefit total, cost-basis simulator)
- Modify: `src/features/portfolios/tax/shared.tsx` (add the predicate and the disclosure copy)
- Test: `src/features/portfolios/__tests__/TaxManagementPage.test.tsx` (create or extend)

**Interfaces:**
- Consumes: `isTaxableAccount(taxTreatment)` — currently exported from `src/mocks/handlers/oms.ts` with exactly one consumer. **Move it to `src/lib/security-master.ts` or a new `src/lib/tax-treatment.ts`** so a component may import it without reaching into a handler, and update the `oms.ts` call site to import it from the new home. Do not leave two copies.
- Consumes: `taxRateFor`, `HARVEST_LOSS_THRESHOLD_USD`, `isHarvestable`, `estimatedTaxBenefit` from `src/features/portfolios/tax/shared.tsx`.
- Produces: a gated tax page. No handler shape changes.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { TaxManagementPage } from '../TaxManagementPage'

function renderFor(accountId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/accounts/:accountId/tax" element={<TaxManagementPage />} />
    </Routes>,
    { initialEntries: [`/portfolios/accounts/${accountId}/tax`] },
  )
}

describe('TaxManagementPage gates on tax treatment', () => {
  it('acc-003 (Traditional IRA, tax-deferred) is told harvesting does not apply, and shows no benefit figure', async () => {
    renderFor('acc-003')
    expect(await screen.findByText(/not applicable in a tax-deferred account/i)).toBeInTheDocument()
    // The direction that matters: no dollar benefit is claimed anywhere on the page.
    expect(screen.queryByTestId('estimated-tax-benefit')).not.toBeInTheDocument()
    expect(screen.queryByText(/estimated tax benefit/i)).not.toBeInTheDocument()
  })

  it('acc-004 (Roth IRA, tax-free) is likewise gated', async () => {
    renderFor('acc-004')
    expect(await screen.findByText(/not applicable in a tax-free account/i)).toBeInTheDocument()
    expect(screen.queryByTestId('estimated-tax-benefit')).not.toBeInTheDocument()
  })

  it('acc-005 (individual, taxable) still shows harvest opportunities and a benefit figure', async () => {
    renderFor('acc-005')
    // The gate must not suppress the taxable case — this is the test that fails if you gate everything.
    expect(await screen.findByTestId('estimated-tax-benefit')).toBeInTheDocument()
    expect(screen.queryByText(/not applicable in a tax-/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test:run src/features/portfolios/__tests__/TaxManagementPage.test.tsx`
Expected: the acc-003 and acc-004 tests FAIL (the page currently renders opportunities); the acc-005 test should PASS already.

- [ ] **Step 3: Move the predicate to `lib/`**

Create `src/lib/tax-treatment.ts` with zero imports:

```ts
export type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free'

/** Only a taxable account can realise a deductible loss. A loss inside a traditional IRA or a
 *  Roth is not recognised on the owner's current return (IRS Pub 590-A), and a 529's earnings are
 *  tax-free when used for qualified expenses — so "estimated tax benefit" is not a smaller number
 *  in those accounts, it is a category error. */
export function isTaxableAccount(treatment: TaxTreatment): boolean {
  return treatment === 'taxable'
}

export function harvestingDisclosureFor(treatment: TaxTreatment): string | null {
  if (treatment === 'taxable') return null
  const label = treatment === 'tax_deferred' ? 'tax-deferred' : 'tax-free'
  return `Tax-loss harvesting is not applicable in a ${label} account: losses realised here are not deductible on the owner's current return, so no tax benefit arises.`
}
```

Delete the copy in `src/mocks/handlers/oms.ts` and import from the new module there.

- [ ] **Step 4: Gate the page**

In `TaxManagementPage.tsx`, resolve the account, then branch **before** rendering the scanner, the benefit total, or the cost-basis simulator:

```tsx
const disclosure = harvestingDisclosureFor(account.taxTreatment)
if (disclosure) {
  return (
    <TabLayout ...>
      <Callout tone="info">{disclosure}</Callout>
      {/* Realised gain/loss history still renders — it is a record of what happened, not a
          claim about a benefit. Only the harvesting surfaces are suppressed. */}
      <RealisedActivity accountId={account.id} />
    </TabLayout>
  )
}
```

Add `data-testid="estimated-tax-benefit"` to the benefit figure in the taxable branch.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test:run`
Expected: all three new tests pass, 2102 + Task 1's tests still pass.

- [ ] **Step 6: Mutation-verify**

1. Change `isTaxableAccount` to `return true` → the acc-003 and acc-004 tests must fail.
2. Change `harvestingDisclosureFor` to return the string for taxable accounts too → the acc-005 test must fail. **This is the mutation that matters** — it proves the gate is a gate and not a blanket suppression.
3. Delete the `data-testid` → the acc-005 test must fail.

- [ ] **Step 7: Sweep for other ungated surfaces**

Grep for every component that renders a harvest opportunity or a tax benefit:

```bash
grep -rln "estimatedTaxBenefit\|isHarvestable\|HARVEST_LOSS_THRESHOLD" src/features/
```

For each hit, confirm it either gates on `taxTreatment` or is only reachable from a gated page. **List every file you checked and its verdict in your report** — an unlisted file reads as "not checked". If you find a second ungated surface, fix it in this task.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tax-treatment.ts src/features/portfolios/TaxManagementPage.tsx src/features/portfolios/tax/shared.tsx src/mocks/handlers/oms.ts src/features/portfolios/__tests__/TaxManagementPage.test.tsx
git commit -m "fix(tax): harvesting surfaces gate on tax treatment, not just the dashboard total"
```

---

### Task 3: Compliance claims only what it checked

**Finding §9.2, High.** `compliance.ts:87` enters the concentration loop only `if (trade.side === 'buy')`; `:125` then emits `status: 'pass'` with **"All post-trade positions within their applicable concentration limits."** `acc-002` holds SPY at `weight: 0.448` against a `FUND_LIMIT` of `0.35`, so a proposed AGG buy returns that affirmative pass with SPY 9.8 points over.

The check is correct. The claim it makes about itself is not. Evaluate the whole projected book and distinguish pre-existing breaches from trade-created ones — a compliance officer needs to see both, and narrowing the message alone would hide a real breach behind accurate wording.

**Files:**
- Modify: `src/mocks/handlers/compliance.ts:87-126`
- Test: `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts` (extend)

**Interfaces:**
- Consumes: `securityKind(symbol, assetClass)`, `concentrationLimitFor(kind)`, `FUND_LIMIT`, `SINGLE_NAME_LIMIT`, `CASH_LIMIT` from `src/lib/security-master.ts`.
- Produces: `ComplianceCheck[]` — same type. A new `details.preExisting: boolean` field on concentration checks.

- [ ] **Step 1: Write the failing test**

```ts
describe('§9.2 · compliance reports the whole projected book, not only proposed buys', () => {
  it('acc-002: a clean AGG buy does not certify SPY, which is already over the fund limit', async () => {
    const result = await checkTradeCompliance({
      accountId: 'acc-002',
      trades: [{ symbol: 'AGG', side: 'buy', quantity: 100, estimatedValue: 10_000 }],
    })
    const concentration = result.checks.filter((c) => c.category === 'concentration_limit')
    // The affirmative all-positions pass must not appear while a real breach exists.
    expect(concentration.some((c) => c.status === 'pass' && /All post-trade positions/.test(c.message))).toBe(false)
    // SPY is 44.8% against a 35% fund limit and must be named.
    const spy = concentration.find((c) => c.details?.symbol === 'SPY')
    expect(spy, 'SPY breach must be reported').toBeDefined()
    expect(spy!.details!.preExisting).toBe(true)
    expect(spy!.details!.postTradeWeight).toBeGreaterThan(0.35)
  })

  it('a pre-existing breach is reported as pre-existing, not blamed on the trade', async () => {
    const result = await checkTradeCompliance({
      accountId: 'acc-002',
      trades: [{ symbol: 'AGG', side: 'buy', quantity: 100, estimatedValue: 10_000 }],
    })
    const spy = result.checks.find((c) => c.details?.symbol === 'SPY')!
    expect(spy.message).toMatch(/already|pre-existing|not created by this trade/i)
  })

  it('an account with no breach anywhere still gets a clean affirmative pass', async () => {
    // The direction that matters: this must not become a check that can never pass.
    const result = await checkTradeCompliance({
      accountId: 'acc-006',
      trades: [{ symbol: 'AGG', side: 'buy', quantity: 10, estimatedValue: 1_000 }],
    })
    const concentration = result.checks.filter((c) => c.category === 'concentration_limit')
    expect(concentration.every((c) => c.status === 'pass')).toBe(true)
  })

  it('a trade that creates a breach is distinguished from one that inherits it', async () => {
    const result = await checkTradeCompliance({
      accountId: 'acc-006',
      trades: [{ symbol: 'NVDA', side: 'buy', quantity: 2_000, estimatedValue: 1_560_000 }],
    })
    const nvda = result.checks.find((c) => c.details?.symbol === 'NVDA')!
    expect(nvda.details!.preExisting).toBe(false)
  })
})
```

`acc-006` is the clean control, verified by the controller: 13 explicit positions, largest is SPY at
weight 0.165 against a 35% fund limit. It is deliberately not `acc-013` — that account has no rows in
`positions.ts` at all (it is one of the 30 generated-allocation accounts), so it would have passed the
clean-account test by having nothing to check, which is a false-clean-pass of exactly the kind
Global Constraint 10 exists to prevent. The breach-creating test uses acc-006 too: $1,560,000 of NVDA
in the $12M Chen Trust is 13% against a 10% single-name limit.

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test:run src/mocks/handlers/__tests__/pre-trade-invariants.test.ts`
Expected: the first two FAIL; the third should pass already; the fourth may fail on the missing `preExisting` field.

- [ ] **Step 3: Evaluate the projected book**

Replace the buy-only loop with a projection over every held position plus every proposed buy:

```ts
// §9.2 · pre-trade-compliance — this loop used to visit only proposed buys, then emit
// "All post-trade positions within their applicable concentration limits" when none of them
// tripped. acc-002 holds SPY at 44.8% against a 35% fund limit, so a clean AGG buy certified a
// book with a real breach in it. The projection now covers everything the account will hold.
const projected = new Map<string, { weight: number; assetClass: string; preExisting: boolean }>()
for (const [symbol, position] of Object.entries(positions)) {
  projected.set(symbol, { weight: position.weight, assetClass: position.assetClass, preExisting: true })
}
for (const trade of req.trades) {
  if (trade.side !== 'buy') continue
  const existing = projected.get(trade.symbol)
  const additional = trade.estimatedValue / accountValue
  projected.set(trade.symbol, {
    weight: (existing?.weight ?? 0) + additional,
    assetClass: existing?.assetClass ?? 'us_equity',
    // Pre-existing only if it already breached without this trade's contribution.
    preExisting: (existing?.weight ?? 0) > concentrationLimitFor(securityKind(trade.symbol, existing?.assetClass ?? 'us_equity')),
  })
}
```

Then emit one check per breaching symbol, carrying `preExisting`, and keep the existing warn-at-80%/fail-at-limit ladder unchanged. Word a pre-existing breach so it is not blamed on the trade — e.g. `"SPY is already 44.8% of the account, exceeding the 35% pooled-vehicle limit; this trade does not create the breach."`

Emit the affirmative pass **only** when the projection is entirely clean.

- [ ] **Step 4: Run the full suite**

Run: `pnpm test:run`
Expected: all four new tests pass. Existing pre-trade tests must still pass — if one asserted the affirmative pass on an account with a pre-existing breach, it encoded the defect; restate it and say so.

- [ ] **Step 5: Mutation-verify**

1. Restore `if (trade.side === 'buy')` as the only source of candidates → the acc-002 tests must fail.
2. Hardcode `preExisting: false` → the pre-existing test must fail.
3. Emit the affirmative pass unconditionally → the first acc-002 test must fail.
4. Emit no affirmative pass ever → the clean-account test must fail. **This one proves the check can still succeed.**

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/compliance.ts src/mocks/handlers/__tests__/pre-trade-invariants.test.ts
git commit -m "fix(compliance): certify the whole projected book, and say which breaches predate the trade"
```

---

### Task 4: Rebalance amounts carry their own currency

**Finding §9.3, High.** `formatWithConversion(value, from, opts)` takes `from` as the **source** currency (`use-format-currency.ts:36`). `PreviewTradesStep.tsx:38, 65, 67, 86` passes the literal `'USD'` for notionals that `oms.ts` derived from `account.totalValue` — native currency. acc-043's €909,760 buy displays as $909,760, understating it by roughly $79k; a mixed-currency batch total is dimensionally meaningless.

**Files:**
- Modify: `src/mocks/handlers/oms.ts` (add `currency` to `ProposedTrade` and to the preview)
- Modify: `src/types/` wherever `ProposedTrade` / `RebalancePreview` are declared
- Modify: `src/features/portfolios/rebalance/PreviewTradesStep.tsx:38, 65, 67, 86`
- Modify: `src/features/portfolios/RebalancePage.tsx:175` (batch total)
- Modify: `src/features/portfolios/rebalance/SelectAccountsStep.tsx:153` (same `'USD'`-as-source bug)
- Modify: `src/features/portfolios/rebalance/SelectAccountsStep.tsx:230, 267` (unconverted `totalValue` sums)
- Modify: `src/features/portfolios/models/ModelsView.tsx:24` (unconverted `totalValue` sum)
- Test: `src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx` (create)
- Test: `src/features/portfolios/rebalance/__tests__/SelectAccountsStep.test.tsx` (create)

**Scope amendment 2 (added after Task 3).** `generateComplianceChecks()` at
`src/mocks/handlers/oms.ts:187-194` returns four **fully hardcoded** compliance checks, including a
"VTI sold within 30 days — verify no wash sale" warning that fires for every account whether or not
it holds VTI. It backs `RebalancePreview.complianceChecks`, but `RebalancePage.tsx` never reads that
field — it calls `/api/compliance/check-trades` and renders that instead — so it is currently dead
code rather than a live false certification. It is a landmine for whoever wires the field into a
view later. This task already changes `RebalancePreview`'s shape, so it owns the decision: either
delete the field and the function, or derive the checks from `checkTradeCompliance`. **Deleting is
preferred** — a second compliance path is a "one fact, two places" violation by construction. State
which you chose and why.

**Scope amendment 1 (added after Task 1).** Task 1's implementer surfaced three sites that sum
`a.totalValue` with no FX conversion — `ModelsView.tsx:24`, `SelectAccountsStep.tsx:230` and `:267` —
and I then found a fourth, `SelectAccountsStep.tsx:153`, which passes the literal `'USD'` as the
source currency exactly as `PreviewTradesStep` does. All four are verified. They are the same two
defect classes this task already owns, on a different screen, so they belong here rather than in a
ninth task: a native-currency figure that is summed or displayed as though it were dollars.

**Interfaces:**
- Consumes: `account.baseCurrency` (the field already driving `harvestNeedsFx` in `tax/shared.tsx` — confirm its exact name before use), `FX_RATES_USD_BASE` from `src/mocks/data/currencies.ts`, `useFormatCurrency()` from `src/hooks/use-format-currency.ts`.
- Produces: `ProposedTrade.currency: CurrencyCode` and `RebalancePreview.currency: CurrencyCode`. Downstream consumers must pass these instead of `'USD'`.

- [ ] **Step 1: Write the failing test**

```ts
describe('§9.3 · rebalance previews carry their account currency', () => {
  it('acc-043 (EUR): proposed trades are tagged EUR, not USD', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-043'], taxAware: true })
    expect(preview.currency).toBe('EUR')
    // `.every()` is vacuously true on an empty array — assert there is something to check FIRST.
    // Task 3 shipped exactly this bug: a "never emit the pass" mutation survived all 48 tests
    // because the assertion ran over an empty list.
    expect(preview.trades.length).toBeGreaterThan(0)
    expect(preview.trades.every((t) => t.currency === 'EUR')).toBe(true)
  })

  it('acc-001 (USD) is still USD — the tag is read, not hardcoded to the exotic case', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    expect(preview.currency).toBe('USD')
  })

  it('all four non-USD accounts are tagged with their own currency', async () => {
    const expected = { 'acc-041': 'HKD', 'acc-042': 'SGD', 'acc-043': 'EUR', 'acc-044': 'CHF' } as const
    for (const [id, currency] of Object.entries(expected)) {
      const [preview] = await previewRebalance({ accountIds: [id], taxAware: true })
      expect(preview.currency, id).toBe(currency)
    }
  })

  it('a mixed-currency batch total converts before summing', async () => {
    const previews = await previewRebalance({ accountIds: ['acc-001', 'acc-043'], taxAware: true })
    const naive = previews.reduce((s, p) => s + p.trades.reduce((t, x) => t + x.estimatedValue, 0), 0)
    const converted = previews.reduce(
      (s, p) => s + p.trades.reduce((t, x) => t + convertToUsd(x.estimatedValue, p.currency), 0),
      0,
    )
    // EUR is not at parity in the fixtures, so these must differ — if they are equal, either the
    // conversion is a no-op or acc-043 proposed nothing, and both mean this test proves nothing.
    expect(previews.find((p) => p.currency === 'EUR')!.trades.length).toBeGreaterThan(0)
    expect(Math.abs(converted - naive)).toBeGreaterThan(1000)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test:run` on that file. Expected: FAIL — `preview.currency` is `undefined`.

- [ ] **Step 3: Tag the handler output**

In `oms.ts`, resolve the account's currency once and attach it to the preview and to every proposed trade. Add the field to the type declarations; TypeScript strict mode will then point you at every consumer that must be updated.

- [ ] **Step 4: Fix the display**

In `PreviewTradesStep.tsx`, replace each `formatWithConversion(x, 'USD', …)` with `formatWithConversion(x, preview.currency, …)` — four sites: 38, 65, 67, 86. In `RebalancePage.tsx:175`, convert each preview's total to the reporting currency **before** summing.

- [ ] **Step 4b: Fix the four sites the scope amendment added**

`SelectAccountsStep.tsx:153` renders `formatWithConversion(acc.totalValue, 'USD', …)` where
`acc.totalValue` is native — pass `acc.baseCurrency`.

`SelectAccountsStep.tsx:230`, `:267` and `ModelsView.tsx:24` each compute
`modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)`. Replace each with
`deriveBookAUM(modelAccounts, FX_RATES_USD_BASE)` — the same primitive Task 1 used, imported from
`@/lib/aum` and `@/mocks/data/currencies`. Do not write a fourth reduce.

Add a test asserting that a model containing acc-041 (HKD) reports an AUM strictly below the naive
sum of its accounts' `totalValue`, and that a USD-only model reports a figure equal to it. The second
assertion is what stops a conversion that is applied unconditionally from passing.

- [ ] **Step 5: Run the full suite and mutation-verify**

Run: `pnpm test:run`. Then:
1. Hardcode `currency: 'USD'` in the handler → the acc-043 and four-account tests must fail.
2. Restore `formatWithConversion(x, 'USD', …)` at line 65 → a display test must fail. If none does, **your tests only cover the handler and not the component** — add a render test asserting the rendered string for acc-043 carries a euro amount.
3. Sum before converting in the batch total → the mixed-currency test must fail.
4. Restore the naive reduce at `ModelsView.tsx:24` → the HKD model test must fail.
5. Restore `formatWithConversion(acc.totalValue, 'USD', …)` at `SelectAccountsStep.tsx:153` → a
   SelectAccountsStep render test must fail. If none does, the test covers only the aggregate and
   not the row, and the row is what an advisor reads.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "fix(rebalance): proposed trades carry their account's currency through to display"
```

---

### Task 5: The named benchmark is the benchmark used

**Finding §9.4, High.** `pms.ts:150` declares `mod-002.benchmark = 'S&P 500'` while the model blend is 55% US equity, the rest bonds, international, cash and alternatives — publishing an "S&P 500" return of ~11.11% against a 14.5% US-equity proxy return. Task 12's Brinson-Fachler arithmetic is correct and reconciles; the defect is the benchmark's **identity**, which active return, attribution, and the risk tab's "tracking error against S&P 500" all inherit.

The cheap correct fix is naming. Do not invent index constituent data.

**Files:**
- Modify: `src/mocks/handlers/pms.ts:144, 150, 176, 909, 952, 1081` (the `benchmark` strings) and the tracking-error label source
- Modify: `src/features/portfolios/account-detail/RiskTab.tsx:46`
- Test: `src/mocks/handlers/__tests__/benchmark-identity.test.ts` (create)

**Interfaces:**
- Consumes: the model `assetClasses` target weights already in `pms.ts`.
- Produces: `benchmark` strings that describe what is actually computed, plus a `benchmarkKind: 'model_policy'` discriminator so a future real index can be added without ambiguity.

- [ ] **Step 1: Write the failing test**

```ts
describe('§9.4 · a benchmark label describes what is computed', () => {
  it('no model claims a bare external index name while blending multiple asset classes', async () => {
    const models = await getModels()
    for (const model of models) {
      const classes = model.assetClasses.filter((c) => c.targetWeight > 0)
      if (classes.length <= 1) continue
      // A multi-asset blend must not be labelled as a single equity index.
      expect(model.benchmark, `${model.id}`).not.toMatch(/^S&P 500$/)
      expect(model.benchmarkKind, `${model.id}`).toBe('model_policy')
    }
  })

  it('the label names the policy blend, so the number and its name agree', async () => {
    const models = await getModels()
    const growth = models.find((m) => m.id === 'mod-002')!
    expect(growth.benchmark).toMatch(/model policy/i)
  })

  it('the risk tab does not claim tracking error against an index it never used', async () => {
    // Guards the label at RiskTab.tsx:46 — ex-ante active risk vs model targets is not
    // tracking error against the S&P 500.
    renderRiskTab('acc-002')
    expect(await screen.findByText(/tracking error/i)).toBeInTheDocument()
    expect(screen.queryByText(/against S&P 500/i)).not.toBeInTheDocument()
    expect(screen.getByText(/model policy|model target/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

- [ ] **Step 3: Rename, and add the discriminator**

`mod-002`'s `benchmark` becomes `'Model policy blend (Growth)'`; `mod-001`'s and `mod-007`'s similarly drop the bare index names in favour of the policy description. Add `benchmarkKind: 'model_policy'` to every model. Keep the duplicated declarations at `:909`, `:952`, `:1081` in sync — or better, if they are duplicates of the same list, make the second read the first (Global Constraint 2) and note that in your report.

Update `RiskTab.tsx:46` to say "ex-ante tracking error vs model policy", and state the covariance assumption in the tooltip if one exists.

- [ ] **Step 4: Sweep for the label elsewhere**

```bash
grep -rn "S&P 500" src/ --include=*.ts --include=*.tsx
```

Every remaining hit must be either a security's actual name (`SPDR S&P 500 ETF` — legitimate) or narrative copy that is true. List each hit and its verdict in your report.

- [ ] **Step 5: Run the full suite and mutation-verify**

1. Restore `benchmark: 'S&P 500'` on `mod-002` → the first two tests must fail.
2. Restore the RiskTab label → the third must fail.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "fix(performance): name the benchmark that is actually computed"
```

---

### Task 6: AI answers read the canonical selectors

**Finding §9.5, Medium.** `ai.ts:124, 127, 132, 206` asserts "2 accounts with wash sale restrictions active through March 15", "4 accounts have drifted beyond their rebalancing thresholds", "$47,200 in harvestable losses across 8 accounts", "$18,600 Chen-Wong" — each with a citation naming an internal screen. `realised-sales.ts` yields **four** open windows running through **March 23**; the drift surface flags far more than four accounts; the TLH figures are static while the dashboard derives its own.

A citation naming an internal screen implies a reconciliation that did not happen. This is a direct "one fact, one place" violation.

**Files:**
- Modify: `src/mocks/data/ai.ts` (the static response bodies and their citations)
- Modify: `src/mocks/handlers/ai.ts` (interpolate at read time)
- Modify: `src/mocks/handlers/ai.ts:462-467` (the per-account "Position Concentration Alert" insight)
- Test: `src/mocks/handlers/__tests__/ai-citation-invariants.test.ts` (create)

**Scope amendment (added after Task 2).** Task 2's review found the `/api/ai/insights`
`account_detail` branch pushing a hardcoded harvesting insight for every account; that half was
fixed there. Its sibling at `:462-467` is equally invented and is left for this task, which owns
this file: `title: 'Position Concentration Alert'`, `metric: { value: '8.2%' }`, and body text
claiming a position "exceeding the 5% single-stock IPS limit" — **all three hardcoded for every
account, and the 5% contradicts the real `SINGLE_NAME_LIMIT` of 10% in `src/lib/security-master.ts`.**
Derive the largest position weight and the limit from the account's own positions and
`concentrationLimitFor`, and emit the insight only when a position actually breaches. An account
with no breach must get no alert — assert that, or a "fix" that always fires still passes.

**A method note that governs this task's sweep.** Task 2's sweep grepped for the helper names
(`estimatedTaxBenefit`, `isHarvestable`, `HARVEST_LOSS_THRESHOLD`) and missed the defect above,
because a hardcoded `'$12,400'` in a template string calls none of them. **Grepping for helper
names finds derived defects and is blind to invented ones.** Sweep this file by reading every
template literal and every `metric:` / `value:` / `citations:` field, not by grepping for
functions. Numeric and currency literals are the signal.

**Interfaces:**
- Consumes: `openWashSaleWindows(asOf, householdId?)` from `src/mocks/data/realised-sales.ts`; `computeDriftForAccount` from `src/mocks/handlers/pms.ts`; the harvestable-benefit derivation Task 17 built for the dashboard — **find it and reuse it, do not write a second one**.
- Produces: AI responses whose numbers are interpolated from those functions at request time.

- [ ] **Step 1: Write the failing test**

```ts
describe('§9.5 · AI answers agree with the data they cite', () => {
  it('the wash-sale count and date match openWashSaleWindows', async () => {
    const windows = openWashSaleWindows(MOCK_TODAY_ISO)
    const answer = await askAi('trading')
    const claimedCount = Number(answer.content.match(/(\d+) accounts? with wash sale/)![1])
    expect(claimedCount).toBe(new Set(windows.map((w) => w.accountId)).size)
    const latest = windows.map((w) => w.windowEnd).sort().at(-1)!
    expect(answer.content).toContain(formatDisplayDate(latest))
  })

  it('the drifted-account count matches the drift surface', async () => {
    const accounts = await getAccounts()
    const drifted = accounts.filter((a) => computeDriftForAccount(a).needsRebalance).length
    const answer = await askAi('opportunities')
    expect(Number(answer.content.match(/(\d+) accounts? have drifted/)![1])).toBe(drifted)
  })

  it('every citation figure appears in the answer it supports', async () => {
    // A citation that states a number the answer does not is the failure mode being fixed.
    for (const key of ['trading', 'opportunities', 'tax']) {
      const answer = await askAi(key)
      // Vacuity guard: an answer with no citations, or a citation with no digits, would let this
      // loop pass without comparing anything. Both must be non-empty for the test to mean anything.
      expect(answer.citations.length, `${key} has citations`).toBeGreaterThan(0)
      expect(
        answer.citations.some((c) => /\d/.test(c.text)),
        `${key} has at least one citation stating a number`,
      ).toBe(true)
      for (const citation of answer.citations) {
        const numbers = citation.text.match(/[\d,]+(?:\.\d+)?/g) ?? []
        for (const n of numbers) {
          expect(answer.content, `${key}: citation "${citation.text}"`).toContain(n)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Expected: the wash-sale test reports 2 against 4 and the wrong date; the drift test reports 4 against the real count.

- [ ] **Step 3: Interpolate at read time**

Convert the affected static strings into templates the handler fills from the canonical selectors. Keep the prose; replace only the figures. Every citation's `text` must be built from the same value that goes into the answer body — derive once, use twice.

- [ ] **Step 4: Sweep the rest of `ai.ts`**

Read the whole file. Every remaining hardcoded financial figure is either (a) interpolated, (b) demonstrably still correct against the fixtures — show the arithmetic in your report, or (c) removed. **List every figure you found and which of the three it was.** A figure you did not list reads as one you did not check.

- [ ] **Step 5: Run the full suite and mutation-verify**

1. Hardcode the wash-sale count back to 2 → the first test must fail.
2. Change `openWashSaleWindows` to return `[]` → the first test must fail differently (count 0), proving it reads the selector rather than a constant that happens to match.
3. Point a citation at a number absent from its answer → the third test must fail.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "fix(ai): answers and their citations derive from the data they claim to cite"
```

---

### Task 7: The sell cap gets a floor

**Finding §9.6, High.** Task 22's round-4 cap is `totalSell ≤ totalBuy + max(0, cashTarget − cashActual) × totalValue`. It correctly stops sells pushing cash **above** target. Nothing stops uncapped buys pulling it **below**. acc-043: sells €648,900, buys €909,760, cash 13.69% → **5.56%** against a 10% target.

Recorded with its process point: the controller's 47-account sweep printed these exact figures and passed them, because the invariant asserted a ceiling and no floor.

**Files:**
- Modify: `src/mocks/handlers/oms.ts:161-173`
- Test: `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts` (extend)

**Interfaces:**
- Consumes: `computeDriftForAccount(account)` from `pms.ts`, returning **signed** `drift` (negative = underweight) plus `actual` and `target` per asset class.
- Produces: unchanged shape.

- [ ] **Step 1: Write the failing test**

```ts
describe('§9.6 · buys are capped by available cash above target, symmetric to the sell cap', () => {
  it('acc-043: rebalancing does not drive cash from 13.69% to 5.56% against a 10% target', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-043'], taxAware: true })
    const positions = await getPositions('acc-043')
    const account = (await getAccounts()).find((a) => a.id === 'acc-043')!
    const cash = positions.find((p) => p.symbol === 'CASH')!.marketValue
    const sell = preview.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const buy = preview.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    const endWeight = (cash - buy + sell) / account.totalValue
    const target = (await getDrift('acc-043')).assetClassDrifts.find((d) => d.assetClass === 'cash')!.target
    expect(endWeight).toBeGreaterThanOrEqual(target - 0.0002)
  })

  it('every account: post-trade cash lands within its own target band, from both directions', async () => {
    const accounts = await getAccounts()
    const violations: string[] = []
    for (const account of accounts) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      if (!preview?.trades.length) continue
      const positions = await getPositions(account.id)
      const cash = positions.find((p) => p.symbol === 'CASH')?.marketValue ?? 0
      const sell = preview.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
      const buy = preview.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
      const startW = cash / account.totalValue
      const endW = (cash - buy + sell) / account.totalValue
      const target = (await getDrift(account.id)).assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0
      // FLOOR — the assertion the Phase 1 sweep was missing.
      if (endW < Math.min(startW, target) - 0.0002) {
        violations.push(`${account.id}: cash fell to ${(endW * 100).toFixed(2)}% below min(start ${(startW * 100).toFixed(2)}%, target ${(target * 100).toFixed(2)}%)`)
      }
      // CEILING — the assertion it did make; both must hold.
      if (endW > Math.max(startW, target) + 0.0002) {
        violations.push(`${account.id}: cash rose to ${(endW * 100).toFixed(2)}% above max(start, target)`)
      }
    }
    expect(violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Expected: acc-043 fails; the sweep names acc-043 and possibly others.

- [ ] **Step 3: Add the symmetric cap**

```ts
// §9.6 · rebalancing — the round-4 cap bounded sells by what buys and cash-to-target could
// absorb. The mirror bound was missing: buys draw on cash, and an account may not spend below
// its own cash target to fund them. `buyCapacity` is what sells raise plus the cash genuinely
// available above target.
const cashAboveTarget = Math.max(0, (cashDrift?.actual ?? 0) - (cashDrift?.target ?? 0)) * account.totalValue
const buyCapacity = totalSell + cashAboveTarget
const buyScale = totalBuy > 0 ? Math.min(1, buyCapacity / totalBuy) : 1
```

Apply `buyScale` to buys exactly as `sellScale` applies to sells. **Beware the round-2 regression:** capping buys to match sells alone was wrong and was reverted in round 3 — the `+ cashAboveTarget` term is what makes this correct, because an account may still fund a purchase from genuine surplus cash. acc-006 must still buy the full 912,000 against 540,000 of sells.

- [ ] **Step 4: Run the full suite**

Expected: **acc-006 still 912,000 buys vs 540,000 sells**; acc-030 → 22,500; acc-037 → 30,001; acc-014 → 36,575; acc-032 → 27,075; acc-041/044/045/047 still propose nothing; no sell exceeds any position's market value or quantity. Any of these changing is a regression, not an improvement — investigate before adjusting an expectation.

- [ ] **Step 5: Mutation-verify**

1. Remove `buyScale` → the acc-043 test and the sweep must fail.
2. Change `buyCapacity` to `totalSell` alone (the round-2 bug) → an acc-006 test must fail.
3. Drop the `Math.max(0, …)` floor on `cashAboveTarget` → some account must fail; name it.
4. Delete the ceiling half of the sweep → **it must still fail on a ceiling violation you introduce deliberately**, proving the sweep constrains both directions.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "fix(rebalance): cap buys by cash above target, mirroring the sell cap"
```

---

### Task 8: Rebalancing can reach an unheld asset class

**Finding §9.7, Medium.** `oms.ts:151-153` builds candidates only from positions the account already holds and always takes `candidates[0]`. Two consequences: `acc-041` proposes **nothing** while ~94% international equity against a 15% target; and when the engine does propose, it never chooses *which* security to trade — `acc-002` trims SPY (embedded gain) while INTC sits in the same class with a $45,850 unrealised loss, so the "tax-aware" toggle can pick a materially worse outcome than an obvious loss lot.

**This is the largest task in the plan** — it adds fixture data rather than only correcting it. Model implementation securities are a real data-model addition. If it proves larger than expected, report BLOCKED with what you found rather than half-implementing it.

**Files:**
- Modify: `src/mocks/handlers/pms.ts` (add `implementationSymbol` per asset class to each model)
- Modify: `src/mocks/handlers/oms.ts:148-158` (candidate selection)
- Test: `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts` (extend)

**Interfaces:**
- Consumes: model `assetClasses`, `positions`, `getTaxLots(accountId)` for loss-lot preference.
- Produces: `ProposedTrade` for a symbol the account may not yet hold — confirm no downstream consumer assumes the symbol is already a position. **`PreviewTradesStep` and the compliance check are both candidates for that assumption; check them.**

- [ ] **Step 1: Write the failing test**

```ts
describe('§9.7 · rebalancing reaches classes the account does not yet hold', () => {
  it('acc-041: 94% international equity against a 15% target proposes real trades', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-041'], taxAware: true })
    expect(preview.trades.length).toBeGreaterThan(0)
    expect(preview.trades.some((t) => t.side === 'buy')).toBe(true)
  })

  it('tax-aware selection prefers a loss position within the class over one with a large gain', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const usEquitySells = preview.trades.filter((t) => t.side === 'sell' && ['SPY', 'QQQ', 'INTC'].includes(t.symbol))
    // INTC carries a $45,850 unrealised loss; SPY a $355,206.70 gain. Tax-aware must reach INTC first.
    expect(usEquitySells.some((t) => t.symbol === 'INTC')).toBe(true)
  })

  it('tax-aware off does not silently produce the same selection', async () => {
    // The direction that matters: if both toggle states pick identically, the toggle does nothing
    // and the previous test proves nothing about tax-awareness.
    const [aware] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const [unaware] = await previewRebalance({ accountIds: ['acc-002'], taxAware: false })
    expect(JSON.stringify(aware.trades)).not.toBe(JSON.stringify(unaware.trades))
  })

  it('no proposed sell exceeds the position held, and no buy targets a symbol with no price', async () => {
    const accounts = await getAccounts()
    let tradesChecked = 0
    for (const account of accounts) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      const positions = await getPositions(account.id)
      for (const trade of preview?.trades ?? []) {
        tradesChecked++
        expect(trade.estimatedValue, `${account.id} ${trade.symbol}`).toBeGreaterThan(0)
        if (trade.side === 'sell') {
          const position = positions.find((p) => p.symbol === trade.symbol)
          expect(position, `${account.id} ${trade.symbol} sell with no position`).toBeDefined()
          expect(trade.estimatedValue).toBeLessThanOrEqual(position!.marketValue + 1)
        }
      }
    }
    // Vacuity guard — if the engine proposed nothing anywhere, every assertion above ran zero
    // times and this test would pass while proving nothing.
    expect(tradesChecked).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

- [ ] **Step 3: Give each model an implementation security per asset class**

Add `implementationSymbol` to each model's `assetClasses` entries, choosing symbols that already exist in the price fixtures. Confirm every symbol you name has a price — a buy with no price produces a zero notional that the `estimatedValue > 0` filter silently drops, which would look exactly like the bug you are fixing.

- [ ] **Step 4: Select the candidate deliberately**

For a **buy**: use the held position if there is one, otherwise the model's `implementationSymbol`.
For a **sell** with `taxAware`: prefer positions with unrealised losses, then smallest embedded gain; without `taxAware`, keep the current order so the toggle demonstrably changes behaviour.

- [ ] **Step 5: Run the full suite**

Expected: acc-041, acc-044, acc-045 and acc-047 now propose trades where they previously proposed nothing. **This deliberately changes several Task 22 expectations.** For each one that changes, show the arithmetic proving the new figure correct and restate the test — do not delete it. If acc-006's 912,000/540,000 changes, that is a regression.

- [ ] **Step 6: Mutation-verify**

1. Restore `candidates[0]` → the acc-002 tax-aware test must fail.
2. Restore the held-positions-only filter → the acc-041 test must fail.
3. Make `taxAware` a no-op → the toggle test must fail.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "fix(rebalance): reach unheld model classes, and choose the security deliberately"
```

---

---

### Task 9: The model-trade preview stops inventing its data

**Found during Task 4, verified by the controller.** Not one of the original seven findings — a new
one of the same class, discovered because Task 4's implementer read a call site instead of grepping
for one.

`src/mocks/handlers/trading.ts:44-86` serves `POST /api/oms/model-trade/preview`, which
`ModelTradeView.tsx` renders. Every field is fabricated:

- `accountName: \`Account ${accId}\`` — not the account's real name
- `modelName: 'Growth Balanced'` — hardcoded, ignoring the `modelId` the caller asked for
- `currentDrift: +((accId.charCodeAt(accId.length - 1) % 5) + 1.2).toFixed(1)` — **drift derived
  from a character code of the account id**
- an identical AAPL sell (15 shares, $2,775) and AGG buy (25 units, $2,500) for *every* account,
  with quantities and values that reference no position the account holds
- `reason: 'Reduce US Equity overweight from 47% to 42%'` — the same percentages for every account

This is the Phase 1 charter defect in its purest form, and unlike `generateComplianceChecks()` it is
**live**: the view renders it. It is also the natural home for the currency correctness Task 4
established, since these trades carry no currency either.

**Files:**
- Modify: `src/mocks/handlers/trading.ts:44-86`
- Modify: `src/features/portfolios/ModelTradeView.tsx:344, 370` (currency formatting)
- Test: `src/mocks/handlers/__tests__/model-trade-invariants.test.ts` (create)

**Interfaces:**
- Consumes: `computeDriftForAccount(account)` from `src/mocks/handlers/pms.ts` — the same function
  the drift surface and the rebalance engine read, returning **signed** drift. `getModelGovernance`
  for the model's real name. `getPositionsForAccount` for what the account actually holds.
  `deriveBookAUM` / `FX_RATES_USD_BASE` if you aggregate.
- Produces: `ModelTradePreview[]` — read its real declaration in `src/services/trading.ts` before
  writing any test, and add `currency: CurrencyCode` to the trade shape as Task 4 did for
  `ProposedTrade`.

- [ ] **Step 1: Read the real type first**

Open `src/services/trading.ts` and quote `ModelTradePreview`'s actual declaration into your report.
Do not reconstruct it. Four of this plan's briefs contained a type written from memory that turned
out to be wrong; this step exists because of that.

- [ ] **Step 2: Write the failing tests**

```ts
describe('model-trade preview reads the account, not a hash of its id', () => {
  it('names the account and the model it was actually asked for', async () => {
    const [preview] = await previewModelTrade('mod-003', ['acc-003'])
    expect(preview.accountName).toBe('Robert Johnson Traditional IRA')
    expect(preview.modelName).not.toBe('Growth Balanced')
    expect(preview.modelId).toBe('mod-003')
  })

  it('reports the same drift the drift surface reports', async () => {
    for (const id of ['acc-001', 'acc-011', 'acc-041']) {
      const [preview] = await previewModelTrade('mod-002', [id])
      const drift = await getDrift(id)
      expect(Math.abs(preview.currentDrift - drift.maxAbsDrift * 100), id).toBeLessThan(0.05)
    }
  })

  it('two different accounts do not receive identical trade lists', async () => {
    const [a] = await previewModelTrade('mod-002', ['acc-001'])
    const [b] = await previewModelTrade('mod-002', ['acc-006'])
    expect(a.trades.length).toBeGreaterThan(0)
    expect(b.trades.length).toBeGreaterThan(0)
    expect(JSON.stringify(a.trades)).not.toBe(JSON.stringify(b.trades))
  })

  it('every sell names a security the account actually holds', async () => {
    const accounts = await getAccounts()
    let checked = 0
    for (const account of accounts) {
      const [preview] = await previewModelTrade(account.modelId ?? 'mod-001', [account.id])
      const positions = await getPositions(account.id)
      for (const trade of preview?.trades ?? []) {
        if (trade.side !== 'sell') continue
        checked++
        expect(positions.some((p) => p.symbol === trade.symbol), `${account.id} ${trade.symbol}`).toBe(true)
      }
    }
    expect(checked, 'vacuity guard — some sells must exist to check').toBeGreaterThan(5)
  })

  it('trades carry their account currency', async () => {
    const [preview] = await previewModelTrade('mod-002', ['acc-041'])
    expect(preview.trades.length).toBeGreaterThan(0)
    expect(preview.trades.every((t) => t.currency === 'HKD')).toBe(true)
    const [usd] = await previewModelTrade('mod-002', ['acc-001'])
    expect(usd.trades.every((t) => t.currency === 'USD')).toBe(true)
  })
})
```

- [ ] **Step 3: Run them and confirm they fail** — expect the name, drift, identical-trades and
  holdings assertions all to fail against the current handler.

- [ ] **Step 4: Derive the preview**

Replace the fabricated object with one built from `computeDriftForAccount`, the account's real
name and model, and its actual positions. Reuse the rebalance engine's candidate selection if the
shapes allow — a second, divergent trade generator would be a "one fact, two places" violation
against `generateRebalanceTrades`. If you cannot reuse it, say why in your report.

- [ ] **Step 5: Fix the currency formatting** at `ModelTradeView.tsx:344, 370`, exactly as Task 4
  did for the rebalance wizard.

- [ ] **Step 6: Mutation-verify**

1. Restore the `charCodeAt` drift → the drift test must fail.
2. Restore the hardcoded `'Growth Balanced'` → the naming test must fail.
3. Return the same trade list for every account → the identical-trades test must fail.
4. Emit a sell for a symbol the account does not hold → the holdings test must fail.
5. Hardcode `currency: 'USD'` → the HKD test must fail, and the USD control must still pass.

- [ ] **Step 7: Render the real component, not a replica**

Task 4 shipped two tests that proved a formula while nothing proved the component called it; both
mutations survived until real render tests were added. At least one test here must render
`ModelTradeView` itself and assert on what it displays.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "fix(models): model-trade preview derives from the account, not a hash of its id"
```

## Phase gate

- [ ] Run `pnpm test:run` and **paste the real tail output** — never assert that tests pass. If it reports zero tests, run `CI=true pnpm install` and re-run.
- [ ] Run `pnpm type-check` and `pnpm lint --max-warnings 0`; both must exit 0.
- [ ] Confirm `src/mocks/data/__tests__/rollup-invariants.test.ts` is byte-identical to its Phase 1 form: `git diff phase-1-data-integrity -- src/mocks/data/__tests__/rollup-invariants.test.ts` must be empty.
- [ ] Re-run the §9 verification for each of the eight findings and record which are now closed, with the mutation that proves it.
- [ ] Update `docs/superpowers/reference/phase-1-deferred-findings.md`: mark each closed finding with its commit, and carry forward anything still open **with a named destination**.
- [ ] Record in the register which Phase 1 expectations Tasks 7 and 8 deliberately changed, and why each new figure is correct.
