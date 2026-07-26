# Phase 1 — deferred findings

This is the Phase 1 gate register. It records what Phase 1 deliberately did **not** do, with a named
destination for every item, plus the evidence that the phase's own gate is green.

A finding with no destination is a finding that disappears. Nothing below says only "deferred".

**How to read it.** Every Critical and High finding in `critique-finance.md` is either closed by a
Phase 1 task or listed here with a reason and a destination. Medium and Low findings not listed are
out of scope for this phase by design. Section 7 carries the Minor findings raised by the tasks
themselves during execution; section 5 carries findings the gate discovered that appear in no task's
closed list.

---

## 1. Gate evidence

Commitment made when this task was scoped: the gate must show **real command output**, not an
assertion that tests pass. A gate that reports success without evidence is worse than no gate,
because it is quoted later as proof. Pasted verbatim.

### 1.1 The roll-up gate — `pnpm vitest run src/mocks/data/__tests__/rollup-invariants.test.ts`

```
 RUN  v4.0.18 /Users/joellewis/code/advisor-desktop

 ✓ src/mocks/data/__tests__/rollup-invariants.test.ts (234 tests) 37ms

 Test Files  1 passed (1)
      Tests  234 passed (234)
   Start at  20:32:57
   Duration  1.13s (transform 253ms, setup 465ms, import 11ms, tests 37ms, environment 528ms)
```

### 1.2 Full suite — `pnpm test:run`

```
 ✓ src/lib/__tests__/risk-model.test.ts (16 tests) 5ms
 ✓ src/lib/__tests__/concentration-copy.test.ts (5 tests) 3ms
 ✓ src/features/portfolios/trade-fields/__tests__/shared.test.ts (7 tests) 3ms
 ✓ src/features/growth/__tests__/daysInStage.test.ts (4 tests) 3ms
 ✓ src/lib/__tests__/waterfall.test.ts (3 tests) 3ms
 ✓ src/features/reconciliation/__tests__/formatTimeAgo.test.ts (8 tests) 3ms

 Test Files  71 passed (71)
      Tests  2102 passed (2102)
   Start at  20:33:32
   Duration  12.97s (transform 3.73s, setup 25.32s, import 6.32s, tests 21.38s, environment 27.26s)
```

Process exit code `0`.

### 1.3 `pnpm type-check` and `pnpm lint`

```
TYPECHECK_EXIT=0
LINT_EXIT=0
--- typecheck log ---
$ tsc --noEmit
--- lint log ---
$ eslint src --ext .ts,.tsx --max-warnings 0
```

Both produced no diagnostics. `lint` runs with `--max-warnings 0`, so exit `0` means zero warnings
as well as zero errors.

### 1.4 Baseline failure reconciliation

The pre-flight audit recorded **31** failing tests at the time Task 23 was scoped: 21 in
`rollup-invariants.test.ts` (Task 18's deliberate gate), plus `account-invariants` ×2,
`portfolio-invariants` ×3, `referential-integrity` ×1, `drift-invariants` ×3, `use-portfolio` ×1.
Owners were Task 18 (eight) and Task 21 (two).

**Post-Task-22 figure: zero.** No survivors, so no survivor needs naming. The target was not
adjusted.

### 1.5 One mutation spot-check

A green suite is not evidence that a fix works; only a mutation that kills a named test is. The
gate re-verified the merge-defect guard rather than taking the merge commit's word for it:
reverting `Math.abs` at `src/mocks/handlers/oms.ts:150` — the exact defect Task 21 × Task 22
introduced — killed **2 of the 3** tests in `rebalance-merge-invariants.test.ts`:

```
 FAIL  src/mocks/handlers/__tests__/rebalance-merge-invariants.test.ts > rebalance consumes
 signed drift correctly (Task 21 x Task 22 merge boundary) > across the whole book, buys are not
 a rounding error against sells
AssertionError: expected 0 to be greater than 0.8
 ❯ src/mocks/handlers/__tests__/rebalance-merge-invariants.test.ts:41:34

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

`oms.ts` was restored; `git diff --stat` is empty and the file's 3 tests pass again.

---

## 2. Step 3 verification greps — which ones actually work

A grep that returns empty because its pattern is wrong looks identical to a grep that returns empty
because the code is clean. Each gate grep below was therefore run twice: once against the branch
base `72dad62`, where the defect existed, to prove the pattern still matches something; and once
against `HEAD`.

| # | Pattern | Matches at base `72dad62`? | At HEAD | Verdict |
|---|---|---|---|---|
| G1 | `91_300_000\|102_450_000\|99_855_000\|107_055_000\|105_920_000` | **No** | none | **INERT — see §5.1** |
| G2 | `managedAUM: [0-9_]` in `src/mocks/data` | yes (13 in `households.ts`) | none | live, clean |
| G3 | `totalAUM: [0-9_]` in `src/mocks/data` | yes (13 in `clients.ts`) | none | live, clean — but **scope too narrow, see §5.2** |
| G4 | `effectiveFee\b` minus `effectiveFeeBps` | yes (4 sites) | none | live, clean |
| G5 | `0.85 bps\|{data.effectiveFee} bps` | yes (`BookOfBusinessPage.tsx:199`) | 1 comment only | live, clean once comments excluded |
| G6 | `new Date('2026-` / `new Date("2026-` | yes (8 sites) | 1 comment only | live, clean once comments excluded |
| G7 | `30-day wash` (case-insensitive) | yes (4 sites) | **2 live strings** | live, **not clean — see §5.3** |
| G8 | `* 0.37` in `*.tsx` | yes (`HarvestScannerView.tsx:36` **and** `:98`) | none | live, clean; both sites confirmed |

**G5 and G6 as written are permanent false positives.** Each matches one explanatory code comment —
`src/mocks/handlers/pms.ts:1125` and `src/mocks/handlers/reconciliation.ts:106` — that documents the
defect it replaced. A gate that always reports a hit trains its reader to ignore it. Both are clean
when the pattern excludes comment lines; use these forms:

```bash
grep -rn "0.85 bps\|{data.effectiveFee} bps" src \
  | grep -vE "^[^:]+:[0-9]+:\s*(//|\*|/\*)"
grep -rn "new Date('2026-\|new Date(\"2026-" src --include="*.ts" --include="*.tsx" \
  | grep -v __tests__ | grep -v "src/lib/clock.ts" \
  | grep -vE "^[^:]+:[0-9]+:\s*(//|\*|/\*)"
```

**The pre-flight's third `30-day wash` site is closed.** `src/mocks/handlers/compliance.ts` now reads
`Wash sale window (61-day)` and `"…within the 61-day wash sale window."` — fixed in `1af7cf8`. Two
sites remain; see §5.3.

---

## 3. Deferred Critical

| # | Finding | Reason | Destination |
| --- | --- | --- | --- |
| Compliance §5.1 | Monte Carlo, stress and sensitivity shown with no hypothetical-performance disclosure (SEC Marketing Rule 206(4)-1(d)(6)) | Phase 1 made the numbers internally consistent and added assumption labels; the *disclosure register* (`net of fees`, `gross of fees`, `estimated`, `as of`) is Phase 2's named deliverable and must land as one system, not per-screen | Phase 2 |
| Compliance §5.2 | `proposals.ts:120` "improve expected annual return by approximately 40-80 basis points" — a hardcoded, unsupported performance claim in a client-facing document | Removing it is a copy decision the roadmap assigns to Phase 6, which also owns `proposals.ts:51`'s "historically outperforms over 15+ year horizons". Grounding it instead would require a capital-market assumption set that does not exist in the repo | Phase 6 |
| C1 (partial) | Multi-period attribution requires geometric linking (Carino / Menchero / GRAP) | Phase 1 removed the arithmetic scale-factor stretch and labelled the model as single-period. Full sub-period geometric linking needs a period return series per asset class, which the fixture layer does not carry | Phase 5 (chart system) |

**Correction to the task brief.** The brief's template filed **C1 under Deferred High**. C1 is
**Critical** in `critique-finance.md` (verified by direct enumeration of the severity column). It is
listed above, under Critical, where it belongs.

---

## 4. Deferred High

| # | Finding | Reason | Destination |
| --- | --- | --- | --- |
| C15 | Option gamma is inverted — minimised at the money, maximised in the wings. Still live: `src/mocks/data/trading.ts:188` computes `0.01 + \|0.5 − \|delta\|\| * 0.02` | Requires a Black-Scholes surface; `trading.ts` options are a self-contained module that no Phase 1 roll-up consumes | Phase 7 |
| C16 | Option theta understated ~17× | Same module, same reason | Phase 7 |
| C31 | Risk profiling averages capacity and tolerance into one score, so a short-horizon client can be scored Aggressive | Needs a suitability model with hard constraints and a binding from the recommended model string to a real `mod-00N` id — a new entity, not an arithmetic fix | Phase 7 |
| D7 | `acc-041` / `acc-043` / `acc-044` (Hong Kong, European, Swiss) sit on US-benchmarked models and breach drift permanently. Verified still live: `acc-041`→`mod-002`, `acc-043`→`mod-003`, `acc-044`→`mod-004` | Requires new model definitions with international benchmarks plus governance versions for each — new entities | Phase 7 |
| D8 | `acc-045` (100% spot crypto) on `mod-002` Growth, giving 90.5% drift on `digital_assets`. Verified still live: `acc-045`→`mod-002` | Same: needs a digital-asset model in the library | Phase 7 |
| Compliance §5.3 | Performance shown without gross/net labelling or an as-of date | Phase 1 added `asOf` to the risk, attribution and book payloads; the *register* that renders them consistently is Phase 2 | Phase 2 |
| Compliance §5.6 | `cr-001` / `cr-002` / `cr-005` suitability rules are unimplemented, so no code path can produce `'fail'` and the finalisation gate is unconditionally open | Requires the IPS entity the app references but does not have, plus a gate redesign | Phase 7 |
| Compliance §5.7 | AI output is not written to the WORM archive | The roadmap assigns "Surface the WORM Books & Records Archive" and AI accountability to Phase 7 | Phase 7 |
| Compliance §5.8 | Batch NBA dismissal skips the `nonDismissible` / `supervisorOverride` check and writes no audit trail | Roadmap assigns AI accountability and undo to Phase 7 | Phase 7 |
| **Compliance §5.9** | **The advisor can toggle the `compliance` category off the NBA feed entirely and apply a "Revenue" preset (`impact 35, confidence 30, urgency 10`) that re-ranks the queue toward revenue, with no change log and no supervisory notification.** Verified still live in `src/features/settings/NBASettingsTab.tsx` (`label: 'Revenue'` at :56; `compliance` category toggle at :60) | **Omitted from the task brief's register entirely.** Same family as §5.8 — a compliance control with no audit trail — and the same owner: AI accountability and supervisory records | Phase 7 |

---

## 5. Carry-forwards the gate itself found

These exist in no task's "findings closed" list and in no prior deferral. They are recorded here
because the gate found them, not because a task reported them.

### 5.1 Gate grep G1 is inert and always has been — **destination: Phase 2**

`grep -rn "91_300_000\|102_450_000\|99_855_000\|107_055_000\|105_920_000" src` is specified in the
Phase 1 plan as the check for "no hardcoded aggregate AUM anywhere". **None of those five literals
occurs in any revision of this repository, in any format** — not with underscores, not without
(`91300000`…), not as decimal millions (`91.3`, `102.45`…). Confirmed against both `72dad62` and
`HEAD`.

The grep therefore cannot fail and never could. It is a check that certifies nothing — the same
false-clean-pass defect class this branch was created to eliminate, occurring in the branch's own
gate. The aggregate-AUM contradiction it was meant to guard was real and *was* closed, but by G2 and
G3 (the `households.ts` / `clients.ts` hand-typed roll-ups) and by `rollup-invariants.test.ts`, which
asserts `deriveBookAUM(accounts, RATES) === 91_320_824.03606`. That test is the real guard.

**Action:** delete G1 from the gate script, or replace it with a pattern proven to match at
`72dad62`. Do not carry an inert grep forward as though it were coverage.

### 5.2 The model-governance library still carries hand-typed `totalAUM` and `assignedAccounts` that contradict the book — **destination: Phase 2**

Gate grep G3 scans only `src/mocks/data`. It misses `src/mocks/handlers/pms.ts`, where the
`/api/pms/models/governance` route hardcodes both figures for all seven models
(`pms.ts:911, 954, 983, 1011, 1026, 1068, 1083`):

| Model | Claimed `assignedAccounts` | Accounts actually bearing that `modelId` |
|---|---|---|
| mod-001 Balanced Growth | 14 | 1 |
| mod-002 Growth | 8 | 17 |
| mod-003 Conservative Income | 6 | 11 |
| mod-004 Aggressive Growth | 4 | 10 |
| mod-005 Ultra-HNW Multi-Strategy | 3 | 1 |
| mod-006 Education 529 | 3 | 3 ✓ |
| mod-007 Moderate Balanced | 2 | 4 |

Claimed `totalAUM` sums to **$118,670,000** across 40 claimed accounts. The book is
**$91,320,824.04** across **47** accounts — the assertion the Phase 1 gate itself makes. The model
library therefore claims **130% of the entire book**.

This is user-facing, not fixture-internal. `ModelGovernancePage.tsx:288-289` reduces both fields into
summary tiles (`totalAccounts`, `totalAUM`) and renders them alongside per-model rows at `:191`,
`:195` and `:227`.

This is the same defect class as roadmap scope item 11 ("contradictory counts", Task 17) and item 2
("one source of truth for AUM", Tasks 2/4), on a surface neither task reached. The fix is mechanical
— derive both from `accounts` via `deriveBookAUM` and a `modelId` group-by, exactly as
`households.ts` and `clients.ts` now do — but it is a code change, so it belongs to a phase and not
to this gate.

**Also widen G3** to `grep -rn "totalAUM: [0-9_]" src --include="*.ts"`, not just `src/mocks/data`.
As scoped it could never have seen this.

### 5.3 Two "30-day wash sale" strings survive Task 14's 61-day rename — **destination: Phase 6**

A wash-sale window is 61 days (30 before, the day of, 30 after). Task 14 renamed the rule and fixed
`compliance.ts`, but two client- and advisor-visible strings still say 30:

- `src/mocks/data/nbas.ts:52` — "…sold NVDA at a loss on Feb 10. The **30-day wash sale window**
  closes Mar 12."
- `src/mocks/handlers/nba.ts:188` — "The **30-day wash sale window** must be tracked across all
  accounts for the same tax ID"

Both are copy, not arithmetic — the engine is correct. `nbas.ts:52` additionally hardcodes a closing
date ("Mar 12") that a 61-day window would not produce. Phase 6 owns voice and copy and should take
both, but flagged here as a **factual** error in a regulated domain rather than a stylistic one: it
is the kind of detail a compliance-literate reviewer checks first.

### 5.4 Already closed — cited, not padded

Three pre-flight carry-forwards turned out to be fixed before the gate ran. They are recorded as
closed with their commit, rather than restated as open to make this register look thorough:

| Carry-forward | Status | Commit |
|---|---|---|
| `compliance.ts`'s blanket 10% concentration limit | **Closed.** `compliance.ts:25` now documents that limits live in `security-master.ts`, "not a blanket 10% restated here" | `1af7cf8` |
| The account-vs-household wash-sale scoping split | **Closed** — pre-trade checks are household-scoped | `1af7cf8` |
| `oms.ts:147`'s hand-typed `washSaleSymbols` | **Closed** — the constant no longer exists in `oms.ts` | `1af7cf8` |

One residual: `compliance.ts:204` still describes a fixture alert as "approaching **10% single-name
guideline**". That is descriptive copy on one seeded alert, not a code limit, and is consistent with
`security-master.ts`'s equity limit. **Accepted, will not fix** — changing it would make the seeded
alert's narrative inconsistent with its own trigger.

### 5.5 `critique-finance.md`'s own "Finding counts" table does not reconcile — **destination: Phase 2**

See §8. The document Phase 1 is measured against has a self-inconsistent scoreboard. Recorded as a
finding against the reference material, not against the code.

---

## 6. Process finding — parallel branches must be compared by type surface, not file list

**This one is not a code defect. It is a defect in how the phase was run, and it will recur.**

Tasks 20, 21 and 22 were built on parallel branches. Task 21 changed `DriftStatus.drift` from an
unsigned magnitude to a **signed** value, where negative means underweight. Task 22's rebalance
engine was written against the unsigned version: it filtered candidates with `d.drift > driftThreshold`
and sized them with `d.drift * totalValue`.

Each branch passed its own review, on its own tests, correctly. The defect existed in neither branch.
It was created by the merge: with signed drift, `d.drift > driftThreshold` is false for every
underweight asset class, so every underweight class silently dropped out of every proposal and **41
of 47 accounts produced all-sell rebalances**. A rebalance engine that only ever sells is not a
subtle numerical error; it is the product not working, and no test on either branch could see it.

Fixed in merge commit `71c2109` with `Math.abs` at both sites, guarded by
`src/mocks/handlers/__tests__/rebalance-merge-invariants.test.ts` (3 tests; 3 boundary mutations each
verified to kill them, and re-verified independently by this gate — §1.5).

**The lesson, and the actionable rule.** The pre-merge safety check compared the two branches'
**source file lists**, found them disjoint, and concluded the tasks were safe to parallelise. They
were not. They shared a **type**. `DriftStatus` was declared in one file, produced in a second and
consumed in a third; a file-list comparison cannot see that, and neither can a per-branch review,
because per-branch review is exactly the thing a merge defect defeats.

> **Any future phase that parallelises tasks must compare the type/contract surface — the set of
> exported types, function signatures and semantic invariants each branch reads or writes — not the
> set of files each branch touches. Disjoint file lists are not evidence of independence.**

A weaker corollary worth stating explicitly: a semantic change to an existing type (magnitude →
signed) is invisible to `tsc`, because the type is still `number`. Where a branch changes the
*meaning* of a value without changing its type, it must either change the type too (a branded type,
or a rename such as `driftSigned`) or serialise against every consumer. **Destination: the Phase 2
plan's parallelisation step.**

---

## 7. Deferred Minor register

All 29 Minor findings recorded across `progress.md` (`grep -i "minor (deferred)"`), each with a
destination. Several are deliberately marked **accepted, will not fix** with a reason — that is a
destination; "deferred" alone is not.

### Task 1 — one clock

| # | Finding | Destination |
|---|---|---|
| M1 | `proposals.ts` `deriveTimeHorizon` and `QuickCaptureDialog.tsx` have no dedicated regression test | Phase 7 (both are touched by the suitability/IPS work that C31 and §5.6 require; testing them before that redesign would test code about to change) |
| M2 | `formatTimeAgo` / `daysInStage` duplicated across component pairs — both copies fixed, not deduped | Phase 4 (component system and enforcement owns shared-helper extraction) |
| M3 | `ProspectsPage.tsx:132` inline day-count has no test (same pattern as the adjacent tested `daysInStage`) | Phase 4, with M2 — test the extracted helper once rather than the three call sites |
| M4 | `reconciliation.ts:67-68` uses `getDate`/`setDate` on a UTC-anchored value; not TZ-independent by construction | **Phase 2**, with M28 — see the note below on why the existing test cannot catch this |
| M5 | Task 1's report says 21 `Date.now()` sites remain; its own itemised list sums to 22 | **Accepted, will not fix.** Verified at HEAD: `grep -rn "Date.now()" src --include="*.ts" --include="*.tsx" \| grep -v __tests__` returns **22**. The itemised list was right and the prose figure was a typo; the classification was correct. Corrected here, in the register that outlives the report |
| M6 | `reconciliation.ts:59-65` deviation comment doesn't use the canonical `// D19 · data-quality` citation format | **Accepted, will not fix** — cosmetic, and the comment is accurate and locatable as written |

### Task 2 — derived AUM

| # | Finding | Destination |
|---|---|---|
| M7 | 5 `eslint-disable no-loss-of-precision` in `aum.test.ts`; 2 literals differ from true float64 by 2.33e-10 | **Accepted, will not fix.** Harmless against the `toBeCloseTo` 1e-7 tolerance. Trimming to 13–14 significant digits would have been cleaner, but rewriting passing assertions to remove a suppression risks changing what they assert |

### Task 3 — roll-up gate

| # | Finding | Destination |
|---|---|---|
| M8 | Weight-sum tolerance `toBeCloseTo(1, 2)` (±0.005) is looser than the USD tolerance (±0.00005) | **Phase 2.** Inherited from the brief; 46 rows pass under it. Worth tightening once Phase 2 fixes the display precision that motivated the loose bound — a ±0.005 weight tolerance can hide a 0.5% allocation error |

### Task 5 — AUM waterfall

| # | Finding | Destination |
|---|---|---|
| M9 | `computeWaterfallDomain` has no empty-bars guard; `Math.min(...[])` → ±Infinity | **Phase 5** (chart system). No current caller can pass an empty array, so this is a latent robustness gap, not a live defect — but Phase 5 rebuilds the chart layer and will add callers |
| M10 | `pms.ts:641-642` and `:586-589` each compute a pure function twice instead of binding once | **Accepted, will not fix** — inherited from the brief; no correctness or measurable performance impact |
| M11 | `fees.ts` / `waterfall.ts` pure functions are covered only indirectly via the gate, with no isolated unit tests | **Phase 2.** Indirect coverage through the roll-up gate is real coverage, but it localises poorly: a failure reports as a roll-up mismatch rather than naming the function |

### Task 7 — asset-weighted effective fee

| # | Finding | Destination |
|---|---|---|
| M12 | `BillingPage.tsx` `isLoading` omits the book query, so the Effective-fee tile can flash "—". Verified still live: `BillingPage.tsx:255` is `cyclesLoading \|\| feesLoading`; `useBookOfBusiness()` at `:252` captures no `isLoading` | **Phase 3** (Meridian foundation owns loading and skeleton states) |
| M13 | `bps` / `rateFromBps` / `blendedTieredFee` have no non-test consumers yet; C33 (`proposals.ts`) still open | **Phase 6**, with Compliance §5.2 — `proposals.ts` is the intended consumer and Phase 6 owns that file's copy and arithmetic together |

### Task 8 — revenue trend

| # | Finding | Destination |
|---|---|---|
| M14 | Visual gap between the last solid and first dashed chart point (no bridging dual-value point) | **Phase 5** (chart system) |
| M15 | `revenueMetrics.asOf` is populated but not consumed by `RevenuePage.tsx`. Verified still live — no `asOf` reference in that file | **Phase 2** — this is precisely the "as-of date" half of Compliance §5.3; the payload is ready and the disclosure register will consume it |

### Task 9 — risk model

| # | Finding | Destination |
|---|---|---|
| M16 | Duplicated variance loop between `portfolioVolatility` and `trackingError` (~8 lines) | **Accepted, will not fix** — two named financial quantities that happen to share an inner loop; extracting it would obscure both |
| M17 | No tests for the FALLBACK asset class, empty weights, or `parametricVaR(0, …)` paths | **Phase 2.** Edge-path coverage, not a live defect — no fixture reaches these branches today |
| M18 | Brief said 13 tests, the suite has 16 | **Accepted, will not fix** — immaterial; the suite is a superset of what the brief required |

### Task 10 — per-account risk

| # | Finding | Destination |
|---|---|---|
| M19 | `acc-040` `var95Percent` renders 4.44% against the table's 4.43% (4435/100000 = 0.04435 exactly, a half-up vs half-even rounding split) | **Phase 2.** A genuine on-screen contradiction, but a rounding-policy one — Phase 2's formatting spine must set one rounding mode for the whole app, and fixing this site alone would just move the inconsistency |
| M20 | `SensitivityAnalysis` field still named `monteCarlo` though nothing is simulated | **Phase 7**, with Compliance §5.1 — the disclosure work must decide whether this becomes a real simulation or is renamed; renaming it now would pre-empt that decision. *(M20 and M26 are the same finding, recorded twice in `progress.md`; counted once here and once below to keep the total honest at 29.)* |
| M21 | `riskProfileFor` returns unread `weights` / `benchWeights` | **Accepted, will not fix** — the fields are part of a coherent return shape and cost nothing |
| M22 | `periodYears()` `Record<string, number>` forces a cast at `pms.ts:387` | **Phase 2**, with the unvalidated period union (§7 note below) — same root cause, and both are fixed by one `as const` union |
| M23 | Cash rows render in the positive colour in the stress scenario | **Phase 3** (Meridian foundation owns semantic colour) |
| M24 | `StressScenarioRow` currency basis (same C36 family, pre-existing) | **Phase 2** — the formatting spine owns currency basis labelling |
| M25 | `reports.ts:23` carries a stale hardcoded "Alpha" column in canned report markdown. Verified still live | **Phase 6.** Note this string also hardcodes six performance figures and the claim "The portfolio outperformed across all time periods" — the same Marketing Rule family as Compliance §5.2, and Phase 6 should treat it as such, not as a column rename |
| M26 | `SensitivityAnalysis.monteCarlo` misnomer (nothing simulated, no longer user-facing) | Duplicate of M20 — Phase 7 |

### Task 11 — concentration with look-through

| # | Finding | Destination |
|---|---|---|
| M27 | `ConcentrationMetric` in `types/portfolio.ts` is dead code, kept in sync per the brief's instruction. Verified still live: declared at `types/portfolio.ts:95` and re-exported at `:159`, while `services/pms.ts:75` declares the type actually used | **Phase 4** (component system and enforcement owns dead-type removal). Two declarations of one shape, manually kept in sync, is a future divergence waiting to happen |

### Task 22 — rebalance and pre-trade

| # | Finding | Destination |
|---|---|---|
| M28 | **`TradeTicketDialog` notional tests are one-sided.** They assert only that "trade blocked" appears. An over-large notional also blocks, so mutating `contractMultiplier: 100` → `10000` survives the suite. Under-valuation — the false-clean-pass defect class this branch exists to eliminate — is fully guarded; over-valuation yields a conservative false block | **Phase 2.** Fix: assert the reported **concentration percentage**, not merely the block. This is the fourteenth-plus instance on this branch of a test that passes while certifying the defect it was written to catch, and it is the one that remains open — it should be first in Phase 2, not last |
| M29 | **Accounts overweight cash whose underweight asset classes contain no held position propose nothing** — `acc-041`, `acc-044`, `acc-045`, `acc-047`; `acc-003` and `acc-020` marginally | **Phase 7.** Correct under the engine's long-only, trade-only-what-you-already-hold design, so this is not a bug against the current spec. But an advisor looking at an account that is visibly overweight cash and receiving an empty proposal has no way to tell "nothing to do" from "the engine cannot express this trade". Phase 7 owns the model library (D7, D8), which is where the missing instrument would come from; it should either seed a buyable proxy per asset class or render an explicit "no eligible instrument held" state. Recorded as a **product gap**, not a settled decision |

### Notes on two Minors that need more than a row

**M4 / the local-time `date.setDate` transaction dates.** Two sites remain:
`src/mocks/handlers/reconciliation.ts:114` and `src/mocks/handlers/custodian.ts:160`. These are
TZ-unstable in principle. The pre-flight measured the exposure: **793 of 950 generated dates shift
under `Africa/Casablanca`, while 0 shift under UTC, Los Angeles or Tokyo.** The consequence matters
more than the defect: **the existing three-zone test cannot catch this class of bug**, because all
three of its zones are among the ones where nothing shifts. Phase 2 should either add a zone with a
positive-offset DST transition (`Africa/Casablanca`, `Europe/Dublin`) or convert both sites to UTC
arithmetic. A test that passes in every zone it checks, while the bug lives in the zones it does not,
is the same defect class as M28.

**The unvalidated period union.** `src/mocks/handlers/pms.ts:649` reads
`url.searchParams.get('period') ?? 'ytd'` with no validation against the permitted set, then indexes
a `Record<string, number>` with it. An unrecognised period silently yields `undefined` rather than a
400. Grouped with M22 — one `as const` union fixes both. **Destination: Phase 2.**

**`SELECTION_EDGE` lives in a handler while `ASSET_CLASS_RISK` lives in `lib/`.** Confirmed:
`SELECTION_EDGE` is declared at `src/mocks/handlers/pms.ts:217` and consumed at `:350`;
`ASSET_CLASS_RISK` lives in `src/lib/risk-model.ts` with its own test file. Two model constants of
the same kind on opposite sides of the lib/handler boundary, only one of which is unit-testable.
**Destination: Phase 4** (component system and enforcement), with M27.

**The 30 generated-allocation accounts** and **the error-state summary card that asserts a measured
zero** are carried forward as previously recorded. **Destination: Phase 2** — both are display-layer
consequences that the formatting spine and empty/error-state work will resolve together.

**44 fractional-`costBasis` residual tax lots.** Carried forward as recorded. **Destination:
Phase 2**, with M19 — same rounding-policy root cause.

**Attribution effects rendered as 4dp percentages rather than basis points.** Carried forward as
recorded. **Destination: Phase 2** (formatting spine), as previously assigned.

---

## 8. Coverage summary — and a correction to the source document

**`critique-finance.md`'s own "Finding counts" table does not reconcile with its own findings.** It
claims:

| Severity | Calculation | Data realism | Compliance / AI | Total |
|---|---|---|---|---|
| Critical | 13 | 9 | 4 | **26** |
| High | 13 | 15 | 4 | **32** |
| Medium | 8 | 10 | 1 | **19** |
| Low | 0 | 3 | 0 | **3** |
| **Total** | **34** | **37** | **9** | **80** |

Enumerating the findings directly gives something else. The document contains **C1–C36** and
**D1–D36** — 72 table rows, no duplicates, no gaps — with severities read from the severity column:

| Severity | C + D findings (verified) | Compliance §5 items | Reconciles with the claimed total? |
|---|---|---|---|
| Critical | **23** | 9 items, not individually severity-rated | 23 + 4 = 27 ≠ 26 |
| High | **31** | — | 31 + 4 = 35 ≠ 32 |
| Medium | **16** | — | 16 + 1 = 17 ≠ 19 |
| Low | **2** | — | 2 + 0 = 2 ≠ 3 |
| **Total** | **72** | **9** | 81 ≠ 80 |

The claimed per-section totals are wrong too: "Calculation 34" and "Data realism 37" against 36 C
findings and 36 D findings. No decomposition reconciles.

This is worth stating plainly, because Phase 1's entire purpose was eliminating figures that
contradict themselves, and **the scoreboard Phase 1 is graded against is one of them.** The task
brief's register template inherited the 26/32 figures directly, and then contradicted itself again:
its "High: 23 closed, 9 deferred" line sits above a Deferred High table with **10** rows.

Reported below against the **verified** enumeration. The 9 Compliance §5 items are counted as their
own set, since `critique-finance.md` severity-rates them only in aggregate.

### Verified coverage

| Set | Total | Deferred (listed above) | Recorded closed in Phase 1 |
|---|---|---|---|
| Critical (C/D) | 23 | 1 — C1 (partial) | 22 |
| High (C/D) | 31 | 5 — C15, C16, C31, D7, D8 | 26 |
| **Critical + High (C/D)** | **54** | **6** | **48** |
| Compliance §5 | 9 | 7 — §5.1, §5.2, §5.3, §5.6, §5.7, §5.8, §5.9 | 2 — §5.4 (Task 19), §5.5 / C33 |

**Total Critical + High + Compliance: 63 items; 13 deferred, each with a named destination above; 50
recorded closed.**

### The honest caveat on "closed"

The 48 and the 2 are **as recorded in `progress.md` by the task that closed each finding**. This gate
independently verified:

- the full suite, type-check and lint (§1);
- the roll-up gate's 234 assertions (§1.1);
- one mutation kill on the merge-defect guard (§1.5);
- all eight Step 3 greps against a revision where the defect existed, which is what exposed §5.1,
  §5.2 and §5.3 (§2);
- that each deferred finding listed in §3 and §4 is genuinely still open in the code — C15 at
  `trading.ts:188`, D7/D8 at `accounts.ts`, §5.9 at `NBASettingsTab.tsx`;
- that three pre-flight carry-forwards were already closed, with commits (§5.4).

It did **not** re-derive all 48 closed C/D findings from first principles. Where this register says
"closed", it means "a task recorded it closed and the phase gate is green", not "the gate re-proved
it". That distinction is the difference between a register and a claim, and given that fourteen
separate instances were found on this branch of tests passing while certifying the defect they were
written to catch, it should not be read as stronger than it is.
