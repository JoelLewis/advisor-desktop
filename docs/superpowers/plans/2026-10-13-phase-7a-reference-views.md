# Phase 7a: Reference Full Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, move the firm's dense reference work into seven full views in the instrument language — billing, reconciliation, risk (account and book), attribution, model governance, practice and a trading blotter — each one step from a thread, every figure derived from the engine or labelled "modeled, not realized" with its method, every row able to become a team-thread conversation, and every view and endpoint answering outsiders "not found".

**Architecture:** One engine module per domain under `src/mocks/reference/` (`billing.ts`, `practice.ts`, `reconciliation.ts`, `models.ts`, `attribution.ts`, `factors.ts`, `risk.ts`, `blotter.ts`) derives each view's read model from the book (`accounts`, `getPositionsForAccount`, the ledger, the workspace store) and the existing pms derivations (`riskProfileFor`, `attributionFor`, `performanceSeriesFor`, now exported); seeded leaf records live in `src/mocks/data/{billing,reconciliation,model-governance}.ts`. Every view function takes the viewer and returns `undefined` to anyone `isFirmViewer` rejects. Firm-only endpoints under `/api/workspace/reference/*` (`handlers/workspace-reference.ts`) serve them; `resolve_break` joins the binding acts on `POST /api/workspace/acts`; `takeToTeamThread` quotes a row (recomputed by the engine from the view and row id) into a team thread as a `reference_row` message. The UI adds one frame (`ReferencePage`, `MethodsAndSources`, `ReferenceGate`, `TakeToTeamThread`), a Desk "Reference" group, command-line destinations, a Brief reconciliation line and nine routes, all with the thread list hidden. The legacy billing, revenue, reconciliation and practice handlers, services, hooks, types and hand-typed data are deleted.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-phase-7a-reference-views-design.md` (binding). Earlier contracts: the Phase 3–6 plans (`docs/superpowers/plans/2026-10-12-phase-3-rebalance-harvest.md` for proposals, staged orders and fills; `2026-10-12-phase-4-compliance-review.md` for binding acts, the Archive and the presenter shortcut; `2026-10-13-phase-6-prospect-proposal.md` for the external-party boundary, the firm, the risk-profile table and the fee schedule) and the Phase 6 SDD ledger rulings (RIA framing, US spelling, firm-policy labels).

## Global Constraints

- Work only on branch `workspace` (base `906c99a` or a later `workspace` commit containing every task this one depends on — check `git log --oneline -1` before starting and report BLOCKED if a prerequisite task's commit is missing). Never commit to `main`. Push only when the controller says so.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums (use `as const` arrays and unions); ESM; no barrel files. `.tsx` files export only components; helpers, words and types go in `.ts` siblings. On macOS's case-insensitive filesystem never place `foo.ts` next to `Foo.tsx`. Errors are explicit types or explicit `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks.
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`) and `pnpm build`. A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `tsconfig.tsbuildinfo` / `wrangler.jsonc` with `git checkout --` if a tool modifies them. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`). Task 8 adds a "Reference" group to the Desk pane, so every existing baseline that shows the thread list drifts from Task 8 onward; **only Task 15** regenerates and reviews baselines (`VISUAL_PORT=5195 pnpm visual:update`, then the implementer opens and looks at every PNG it rewrote). Tasks 1–14 do not run `pnpm visual`.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`). Never read the live clock (`new Date()` / `Date.now()` are banned in `src/mocks` by test; `new Date(<string>)` and `startOfToday()` are fine). Recorded times come from the event clock (`nextAt()`): one minute per event from the frozen now; Phase 6's jumps can move it forward to 26 Feb or 2 Mar, and a break resolved after a jump records the later time. The book's "today" (values, prices, holdings, risk, fees) stays `2026-02-25`. This phase adds no seeded message to `SEED_MESSAGES` (the event clock's sequences must not move); the Brief's reconciliation line is stamped at `MOCK_NOW_ISO` outside the sequence (R15).
- Every displayed figure comes from the engine; the UI never computes a figure and formats only through `src/kit/measure.ts` (Task 8 adds `fmtRate`, `fmtBasisPoints`, `fmtRatio`, `fmtExposure`, `fmtEffect` and `UNIT.bps`). The kit `DataTable`'s `tiesTo` check may sum displayed rows to verify a total; it never displays that sum. A modeled figure is shown with its method: every view ends with **Methods & sources**, and every modeled note carries the tag "MODELED". Row quotes' claims carry no figure (record names keep their own digits, e.g. "Williams 529 Education"); the figures travel as `Figure`s with sources.
- US spelling in every new string and identifier: "modeled", "realized", "analyze", "color" (the spec's "modelled, not realised" is written "modeled, not realized").
- UI uses only kit components (`src/kit/`) for buttons, tables, dialogs, inputs, selects and checkboxes, and only instrument color tokens. The guardrails in `src/__tests__/guardrails/` stay green; Task 8 adds a guard that no production file under `src/workspace`, `src/app`, `src/kit`, `src/hooks` or `src/services` imports a value from `src/mocks` (`import type` is allowed).
- No real person's name. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002` (client service), Mike Chen `user-003` (analyst), Mark Davis `cco-001` (compliance), Robert Johnson `cli-001` (client viewer), Dr. Amanda Pell `prsp-011` (prospect viewer). The firm is the fictional **Larkfield Advisory** (`src/lib/firm.ts`). The model-governance authors "Sarah Kim, CIO" and "David Park, PM" leave the codebase (R9). Nobody but the presenter acts live; seeded history is labelled as such.
- The firm is a registered investment adviser: rollover wording is "Advisers Act fiduciary duty; DOL PTE 2020-02 for an ERISA plan", never Reg BI; a rollover appears only as "asked about; comparison to follow" and nothing recommends one; tax items carry "estimate; consult your tax professional"; state tax is not modeled; never "cleared" or "would exceed" in new text.
- Visibility words exactly: "Only you" / "Firm only · client can't see" / "CLIENT CAN SEE" (and the prospect pair from Phase 6). External viewers (clients and prospects, through the one predicate `isExternalRole` → `isExternalViewer` / `isFirmViewer` / `viewerIsExternal`) get `404` from every new endpoint (`/api/workspace/reference/*`, `resolve_break`, the take endpoint) before the request body is read, and every new page shows "<Subject> not found"; a switch of "View as" to an outsider while a view is open goes home.
- Separation of duties: only the advisor and client service resolve a reconciliation break (`resolve_break`, permission on roles `advisor` and `csa`); any firm viewer with `post_firm` takes a row to a team thread; acts are append-only — nothing edits or deletes a recorded act (the `405` catch-all stays last).
- Task due dates and model dates are NYSE trading days from `src/lib/trading-calendar.ts`.
- Commit messages end with the Co-Authored-By trailer naming the model that wrote the commit (`Co-Authored-By: Claude <that model's name> <noreply@anthropic.com>`, e.g. Sonnet for an implementer, Opus for the controller).

## Review Focus

1. **A repeated or stale resolve.** Adrian double-clicks **Confirm** in "Resolve brk-002?", or Sarah resolves it while Adrian's dialog is open, or someone resolves a break resolved before the session: one act; the second answers `409 ALREADY_RESOLVED` naming the first act (or "before this session"); a fingerprint that is not the break's answers `409 FINGERPRINT_MISMATCH`; nothing else is recorded and the open count drops once. Tests: Task 2 (engine), Task 6 (HTTP), Task 10 (UI double click).
2. **An outsider probing the reference surfaces.** Robert or Dr. Pell requests any `/api/workspace/reference/*` path (with or without a valid id, with or without filters), posts `resolve_break` or a take: `404`, never content and never a `400` that confirms the shape; the pages show "Billing not found" and the rest; the Desk "Reference" group, the command-line destinations and the Brief line are absent for them. Tests: Task 6 (every endpoint, both outsiders), Task 7 (take), Task 8 (Desk, command line), Tasks 9–13 (each page).
3. **Someone without the permission.** Mike (analyst) or Mark (compliance) tries to resolve a break: `403 NOT_PERMITTED`, nothing recorded, and the Resolve button is not offered to them; Mark may still take a break to a team thread, and lands in a thread he is a member of. Tests: Task 2, Task 6, Task 7, Task 10.
4. **The moved book.** After the Phase 4 release fills acc-002: the blotter lists each fill with its proposal, version, fill price, fill time and the release's REC id; acc-002's volatility, factor vector and attribution weights change; billing's past runs and today's household values do not change (history is not rewritten, R3); the Brief re-measures as before. Tests: Tasks 1, 3, 4, 5, 15.
5. **Inputs the views do not hold.** An unknown account or model id → `404` (and "Account not found" / "Model not found"); an unknown attribution period → `400 BAD_PERIOD`; an unknown blotter status, a malformed or reversed date range → `400 BAD_FILTER`; a take of a row the view does not have → `404 NO_ROW`; a repeated take → `200` with the same message, not a second card. Tests: Task 6, Task 7.

## Rulings on the spec

These close gaps the spec leaves open; each task below implements them.

- **R1 · One fee schedule.** Every household is billed on the firm's one published tiered schedule — `tpl-001` "Comprehensive Wealth Management" (1.00% to $2M, 0.85% to $5M, 0.70% to $10M, 0.50% above), the schedule Phase 6 used for Dr. Pell and Form ADV Part 2A discloses — on the household's combined value (householding), each tier's rate on the slice inside it. The hand-typed per-household `annualRate` / `feeType` (a "tiered" label on a flat rate), the breakpoint analyses and the Kim-Lee breakpoint near-miss go: there is no cliff on a marginal schedule. Today's annual fees total $679,305 (74.39 bps). `nba-014` (the Williams rollover) restates its cost at the schedule's marginal rate: the $1.2M would fall almost all in the 0.70% tier, about $8,400 a year against the plan's $5,400, about $3,000 more.
- **R2 · Billing runs.** The firm bills on the first trading day of each quarter on the value at the quarter end before it: runs of 1 Jul 2025, 1 Oct 2025 and 2 Jan 2026. Households whose agreement bills in advance pay for the coming quarter; O'Brien and Garcia, whose agreements bill in arrears, pay for the quarter just ended on the same valuation. An account counts in a run only if it was open by the valuation date. Garcia's exception is made consistent with her terms: her agreement bills in arrears and the custodian's fee file still says advance. The Martinez exception names the 2 Jan run. The O'Brien "missing AUM" and Kim-Lee breakpoint exceptions are removed (one is contradicted by the derived value, the other by R1).
- **R3 · History is not rewritten by today's trades.** Quarter-end values are modeled: each account's value today scaled by its modeled monthly performance series drawn from the holdings as the fixtures state them (`performanceSeriesFor(account, 'fixtures')`), linearly interpolated between the two monthly points around the quarter end, at today's exchange rates. Today's fees read today's value. A release moves neither.
- **R4 · Legacy surfaces deleted.** `/api/billing/*`, `/api/revenue/*`, `/api/reconciliation/*`, `/api/practice/*`, `/api/pms/book-of-business` and `/api/pms/models/governance` go with their services, hooks, types and the hand-typed `data/revenue.ts` and `data/practice.ts` (no screen reads them; keeping them keeps an ungated second copy of every figure). `/api/pms/accounts/:id/factors` stays and reads the factor engine. Their invariant tests move to the engines.
- **R5 · Practice.** Revenue is billing's fees on today's value; AUM, households, clients and accounts are counted from the book; the effective fee is in basis points; tenure is derived from each household's `createdAt`; concentration is the HHI of household shares. Planning revenue, year-over-year growth, the revenue and growth trends, top-growth households, the AUM waterfall, capacity and the hand-typed team activity (which named "Lisa Park" and "Ada") are removed — none has a source in the book.
- **R6 · Reconciliation.** A break records the custodian's difference from the book; the book's side is read off the book (cash: the CASH position; a position: its quantity; market value: the positions' sum; transactions: the transaction stream's count). Checked records: positions = every non-cash position in the book, cash = one balance per account, transactions = every account's stream. Match rate = (checked − open breaks of that kind) ÷ checked. Integrations are the custodians the accounts name (Coinbase, DBS, Fidelity, HSBC, Schwab, UBS, Vanguard) plus MoneyGuidePro; a seeded log explains each sync time and MoneyGuidePro's pending status (it replaces the hand-typed uptime). Six resolved breaks are seeded across the 30 days so the trend reads history; the trend is end-of-day open counts for 29 days plus "now".
- **R7 · `resolve_break`.** A binding act by the advisor or client service (permission `resolve_break`), recorded outside any thread like an alert disposition, subject `{ type: 'recon_break', id }`, carrying the break's fingerprint, a resolution (`book_corrected` | `custodian_corrected` | `timing_difference`) and a rationale (1–2,000 characters after trimming). Any firm viewer reads it in the Archive, under the account's client.
- **R8 · Benchmarks.** The attribution arithmetic is unchanged (the model's target weights at modeled index returns), so each model's benchmark is named for what is computed: a policy benchmark holding each sleeve at its target weight, each sleeve measured by a named index — MSCI USA IMI, MSCI EAFE (or MSCI ACWI ex USA IMI in a model with no separate emerging-markets sleeve), MSCI Emerging Markets, Bloomberg US Aggregate, HFRX Global Hedge Fund, MSCI US IMI Real Estate 25/50, LBMA Gold Price PM, ICE BofA US 3-Month Treasury Bill. Names: "<Model> policy benchmark"; the 529 model's is "Education 529 glide-path benchmark" (its glide path at the current stage). Its equity share equals the model's by construction. "Barclays Agg", "MSCI ACWI" (as a whole-model label), "Custom Blended" and "Age-Based Glide" go.
- **R9 · Governance history.** Seeded history moves to `data/model-governance.ts`: every version is proposed by Mike Chen (`user-003`, analyst) and approved by the Investment Committee; dates move to trading days (four fell on a weekend or holiday); mod-005 v3 (pending) takes effect `2026-04-01`; mod-005 v2 gains its missing "Reduced US equity from 40% to 35%" and its "private equity sleeve (BXPE)" line becomes the QAI hedge-fund-replication sleeve the model actually holds; `lastRebalanceDate` (one on a Sunday, none sourced) is dropped. Read-only in 7a.
- **R10 · Risk score and tolerance.** An account's risk score places its modeled σ on the questionnaire's 0–100 scale: piecewise linear through (0, 0), each band's model σ at the band's midpoint score, and (twice the riskiest band model's σ, 100), clamped at 100 and rounded to whole points like the questionnaire. Tolerance is the client's questionnaire score and its band from `RISK_PROFILE_TABLE`. Status: above / within / below by comparing the two bands. The book page sorts by score minus tolerance score, largest first.
- **R11 · Factor model.** Seven factors (Market, Size, Value, Momentum, Quality, Rates, Credit) with a loading per asset class, labelled model assumptions. The Market loading is the asset class's beta, so an account's market exposure is its beta. Exposure = Σ weight × loading; benchmark exposure = Σ target × loading. Accounts with different asset-class weights get different vectors; identical weights (the generated accounts) share one.
- **R12 · Attribution periods.** MTD, QTD, YTD, 1Y, 3Y, 5Y from the existing period lengths; "inception" (a hand-typed 7.2 years) is not offered. The benchmark line is the account's modeled monthly series against its benchmark's.
- **R13 · Blotter.** Rows are legacy OMS tickets plus the session's staged orders (every status). Status: ticket `pending`/`submitted` → Working, `filled` → Filled, `cancelled` → Cancelled; staged `pending_compliance` → Pending compliance, `filled` → Filled (price, value and time from its fill), `withdrawn`, `returned`. REC id: the act that closed the order (release, return, withdrawal), else the approval it was staged from; tickets have none. A ticket's side reads as buy or sell (`purchase` is a buy). Filters (status, account, since, until) are applied by the engine; the date filter params are `since` / `until` (`from` is the back-link).
- **R14 · Take to team thread.** The UI sends only `{ view, rowId }`; the engine recomputes the quote. The destination is the first internal thread about the row's subject that the viewer is a member of; otherwise the engine opens one titled from the row (members: the viewer, Adrian Hale, Sarah Mitchell). A repeat returns the same card (`200`). Subjects: billing and practice rows → household; risk and attribution → account; models → model; reconciliation → `recon_break`; blotter → the order's account. The button sits on each view's primary rows (billing and practice households, breaks, risk accounts, attribution asset classes, models and model versions, orders); secondary tables (tiers, runs, logs, factors, stress) are readings of the row above.
- **R15 · The Brief's reconciliation line.** A `reconciliation_notice` message in the Brief, stamped `MOCK_NOW_ISO` and seeded beside the Brief's measured messages (not in `SEED_MESSAGES`, so the event clock is unchanged); it renders the live open-break count and cash match rate from the reconciliation endpoint and links to `/reconciliation`.
- **R16 · Wording.** "Modeled, not realized" in US spelling; resolution words "Book corrected", "Custodian corrected", "Timing difference".
- **R17 · Baselines.** Each view light (billing, reconciliation, book risk, account risk, attribution, models, one model, practice, blotter) plus billing dark and book risk dark: eleven new baselines.
- **R18 · Robert's letters.** Both of Robert's letters (the meeting recap and the rebalance letter) end with the signer and then "Larkfield Advisory" (`FIRM_NAME`).
- **R19 · Routes.** `/accounts/:accountId/risk` and `/accounts/:accountId/attribution` are new routes beside the existing account view, which keeps its layout and gains links to them and to its model.

## Task order, shared contracts and parallelism

| Task | Depends on | Shares files or types with | May run in parallel with |
|---|---|---|---|
| 1 Billing and practice engine | — | `src/types/reference.ts` (every later task), `types/workspace.ts` (`Subject`, `FigureUnit`), `figure-format.ts`, `lib/fees.ts`, `handlers/pms.ts` (Tasks 3, 4), `data/billing.ts`, `data/nbas.ts` | — |
| 2 Reconciliation engine and `resolve_break` | 1 | `types/workspace.ts` (`BindingActKind`), `data/people.ts`, `archive.ts`, `act-kind-label.ts`, `workspace-supervision.ts` types | 3, 5 |
| 3 Models: benchmarks, governance, attribution read model | 1 | `handlers/pms.ts` (`MODELS`, `attributionFor`), `data/model-governance.ts` | 2, 5 |
| 4 Risk engine | 3 | `handlers/pms.ts` (`concentrationFor`, `stressScenariosFor`), `reference/factors.ts` | 5 |
| 5 Blotter read model | 1 | `reference/blotter.ts` | 2, 3, 4 |
| 6 Endpoints, services, hooks | 2–5 | `handlers/workspace-reference.ts`, `handlers/workspace.ts`, `services/reference.ts`, `hooks/use-reference.ts` | — |
| 7 Take to team thread | 6 | `types/workspace.ts` (`Message`), `workspace-store.ts`, `reference/quotes.ts`, `reference/take.ts`, `MessageView.tsx`, `CompactMessage.tsx`, `full-views/reference-href.ts` | — |
| 8 Reference frame, Desk, command line, Brief line | 7 | `kit/measure.ts`, `workspace/reference/*` frame, `ThreadList.tsx`, `use-destinations.ts`, `workspace-seed.ts`, `MessageView.tsx` | — |
| 9 Billing and Practice views | 8 | `routes.tsx`, `HouseholdView.tsx` | 10–13 (separate worktrees; `routes.tsx` merges by hand) |
| 10 Reconciliation view | 8 | `routes.tsx` | 9, 11–13 |
| 11 Risk views | 8 | `routes.tsx`, `AccountView.tsx` | 9, 10, 13 |
| 12 Attribution and Models views | 8 | `routes.tsx`, `AccountView.tsx`, `kit/series/SeriesLines.tsx` | 9, 10, 13 |
| 13 Blotter view | 8 | `routes.tsx`, `ApprovalPanel.tsx`, `FillsView.tsx` | 9–12 |
| 14 Phase 6 carry-overs | — | `meeting-notes.ts`, `meeting-recap.ts`, `client-letter.ts`, `prospect-proposal-agent.ts` | any |
| 15 The story end to end and the baselines | all | `e2e-visual/*` | — |

Everything not in the last column is serial. Parallel tasks run in separate worktrees created from a commit that already contains all of their prerequisites; merge them one at a time with the full suite green between merges. Disjoint file lists are not independence: Tasks 11 and 12 both edit `AccountView.tsx` and every view task adds routes to `routes.tsx`; Tasks 2–5 all read `src/types/reference.ts` and Task 1's pms exports. The controller may run everything serially in one checkout instead (recommended: it removes every merge).

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/types/reference.ts` (new) | 1, 7 | `ReferenceView`, `MethodNote`, `RowQuote`, `TakeResult` |
| `src/types/reference-billing.ts`, `src/types/reference-practice.ts` (new) | 1 | billing and practice read models |
| `src/lib/fees.ts` | 1 | `tierSlices` |
| `src/mocks/data/billing.ts` (rewritten) | 1 | fee terms (advance/arrears), runs, exceptions |
| `src/mocks/reference/billing.ts`, `src/mocks/reference/practice.ts` (new) | 1 | the billing and practice engines and their quotes |
| `src/mocks/handlers/pms.ts` | 1, 3, 4 | positions-parameterised profile, exported derivations, benchmark names, concentration and stress as functions |
| `src/types/reference-reconciliation.ts`, `src/mocks/data/reconciliation.ts`, `src/mocks/reference/reconciliation.ts` (new) | 2 | breaks, the integration log, match rates, trend, `resolve_break` |
| `src/types/reference-models.ts`, `src/mocks/data/model-governance.ts`, `src/mocks/reference/models.ts`, `src/mocks/reference/attribution.ts` (new) | 3 | benchmarks, governance history and invariants, attribution read model |
| `src/types/reference-risk.ts`, `src/mocks/reference/factors.ts`, `src/mocks/reference/risk.ts` (new) | 4 | factor loadings, risk score and tolerance, account and book risk |
| `src/types/reference-blotter.ts`, `src/mocks/reference/blotter.ts` (new) | 5 | the blotter read model |
| `src/mocks/handlers/workspace-reference.ts`, `src/services/reference.ts`, `src/hooks/use-reference.ts` (new) | 6, 7 | endpoints, client functions, hooks |
| `src/mocks/reference/quotes.ts`, `src/mocks/reference/take.ts` (new) | 7 | row quotes, take to team thread |
| `src/workspace/full-views/reference-href.ts` (new), `src/workspace/thread/ReferenceRowView.tsx` (new), `src/workspace/reference/TakeToTeamThread.tsx` (new) | 7 | hrefs, the quoted card, the row button |
| `src/workspace/reference/{ReferencePage,MethodsAndSources,ReferenceGate}.tsx`, `src/workspace/reference/reference-words.ts`, `src/workspace/thread/ReconciliationNoticeView.tsx` (new) | 8 | the frame, word maps, the Brief line |
| `src/workspace/reference/{BillingPage,PracticePage}.tsx` (new) | 9 | billing and practice |
| `src/workspace/reference/{ReconciliationPage,ResolveBreak}.tsx` (new) | 10 | reconciliation |
| `src/workspace/reference/{BookRiskPage,AccountRiskPage}.tsx` (new) | 11 | risk |
| `src/kit/series/SeriesLines.tsx`, `src/workspace/reference/{AttributionPage,ModelsPage,ModelPage}.tsx` (new) | 12 | attribution and models |
| `src/workspace/reference/BlotterPage.tsx`, `src/workspace/proposal/BlotterLink.tsx` (new) | 13 | the blotter and its ways in |
| `src/mocks/agents/{meeting-notes,meeting-recap,client-letter,prospect-proposal-agent,transfer-in}.ts`, `src/workspace/prospect/{ProspectApproval,ProspectProposalEmbed}.tsx` | 14 | carry-over wording |
| `e2e-visual/workspace-steps.ts`, `e2e-visual/reference-views.spec.ts` (new) | 15 | the story and its baselines |

---

### Task 1: Billing and practice engine — one fee schedule, quarterly runs on modeled quarter-end values, revenue from billing

Billing's hand-typed rates, cycle multipliers (`× 0.982`, `× 0.965`) and breakpoint analyses, and practice's hand-typed team activity and analytics, give way to two engines that read the book. Every household is billed on the firm's tiered schedule (R1); the three quarterly runs value each account at the quarter end from its modeled series (R2, R3); practice reads its revenue from billing. The legacy billing, revenue and practice surfaces are deleted (R4, R5).

**Files:**
- Create: `src/types/reference.ts`, `src/types/reference-billing.ts`, `src/types/reference-practice.ts`, `src/mocks/reference/billing.ts`, `src/mocks/reference/practice.ts`, `src/mocks/reference/__tests__/billing.test.ts`, `src/mocks/reference/__tests__/practice.test.ts`
- Modify: `src/types/workspace.ts` (`Subject`, `FigureUnit`), `src/workspace/thread/figure-format.ts`, `src/lib/fees.ts`, `src/mocks/data/billing.ts` (rewritten), `src/mocks/handlers/pms.ts` (profile over any positions, exports, `performanceSeriesFor`, book-of-business deleted), `src/mocks/handlers/index.ts`, `src/services/pms.ts`, `src/hooks/use-portfolio.ts`, `src/mocks/data/nbas.ts` (`nba-014`), `src/mocks/data/__tests__/nba-facts.test.ts`, `src/mocks/data/__tests__/rollup-invariants.test.ts`, `src/mocks/handlers/__tests__/fee-invariants.test.ts` (rewritten)
- Delete: `src/mocks/handlers/{billing,revenue,practice}.ts`, `src/services/{billing,revenue,practice}.ts`, `src/hooks/{use-billing,use-revenue,use-practice}.ts`, `src/types/{billing,revenue,practice}.ts`, `src/mocks/data/{revenue,practice}.ts`

**Interfaces:**
- Consumes: `proposalTemplates`, `toFeeTiers` (`@/mocks/data/proposals`); `deriveHouseholdAUM`, `deriveBookAUM`, `accountValueUSD`, `herfindahlIndex`, `effectiveN` (`@/lib/aum`); `blendedTieredFee`, `FeeTier` (`@/lib/fees`); `isFirmViewer` (`@/mocks/workspace/visibility`); `ACCOUNT_TYPE_LABELS` (`@/lib/labels`).
- Produces (later tasks rely on these exactly):

```ts
// src/types/reference.ts
export const REFERENCE_VIEWS: readonly ['billing', 'reconciliation', 'risk', 'attribution', 'models', 'practice', 'blotter']
export type ReferenceView = (typeof REFERENCE_VIEWS)[number]
export const isReferenceView: (value: unknown) => value is ReferenceView
export type MethodNote = { label: string; text: string; modeled: boolean }
export type RowQuote = { view: ReferenceView; rowId: string; subject: Subject; threadTitle: string; claim: string; figures: Figure[]; citations: Citation[] }

// src/types/workspace.ts
Subject['type'] gains 'model' | 'recon_break'; FigureUnit gains 'count'

// src/lib/fees.ts
export type FeeTierSlice = { from: number; upTo: number | null; rate: number; slice: number; fee: number }
export function tierSlices(aum: number, tiers: readonly FeeTier[]): FeeTierSlice[]

// src/mocks/handlers/pms.ts (now exported)
export function riskProfileFor(account: Account, positions?: readonly Position[]): { weights; benchWeights; modelId; benchmarkName; value; beta; vol; ret; benchReturn; benchVol; te }   // value in USD; vol rounded to 4dp
export function attributionFor(account: Account, years: number, positions?: readonly Position[]): Attribution
export function periodReturnsFor(account: Account, years: number, positions?: readonly Position[]): { portfolioReturn: number; benchmarkReturn: number; activeReturn: number }
export function periodYears(): Record<string, number>
export function performanceSeriesFor(account: Account, basis?: 'today' | 'fixtures'): PerformanceSeries[]

// src/mocks/reference/billing.ts
export const FIRM_FEE_SCHEDULE: { name: string; tiers: readonly FeeTier[] }
export function annualFeeOn(value: number): number
export function billingMethodOf(householdId: string): BillingMethod
export function modeledAccountValueAt(account: Account, day: string): number
export function householdBillings(): HouseholdBilling[]
export function billingRuns(): BillingRun[]          // newest first
export function billingView(viewerId: string): BillingView | undefined
export function billingQuote(householdId: string): RowQuote | undefined

// src/mocks/reference/practice.ts
export function practiceView(viewerId: string): PracticeView | undefined
export function practiceQuote(householdId: string): RowQuote | undefined
```

- [ ] **Step 1: Write the failing engine tests**

Create `src/mocks/reference/__tests__/billing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { BILLING_RUNS } from '@/mocks/data/billing'
import { performanceSeriesFor } from '@/mocks/handlers/pms'
import { approvedStoryV3, release } from '@/mocks/workspace/__tests__/story-fixture'
import { accountValueUSD, deriveBookAUM, deriveHouseholdAUM } from '@/lib/aum'
import { blendedTieredFee, tierSlices } from '@/lib/fees'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTradingDay } from '@/lib/trading-calendar'
import { FIRM_FEE_SCHEDULE, annualFeeOn, billingQuote, billingView, modeledAccountValueAt } from '../billing'

function view() {
  const v = billingView('user-001')
  if (!v) throw new Error('Adrian reads billing')
  return v
}
const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}

describe("the firm's schedule", () => {
  it('is tpl-001, tier by tier', () => {
    expect(FIRM_FEE_SCHEDULE.name).toBe('Comprehensive Wealth Management')
    expect(FIRM_FEE_SCHEDULE.tiers).toEqual([
      { upTo: 2_000_000, rate: 0.01 }, { upTo: 5_000_000, rate: 0.0085 }, { upTo: 10_000_000, rate: 0.007 }, { upTo: null, rate: 0.005 },
    ])
  })

  it('applies each tier to the slice inside it: the slices sum to the value and their fees to the blended fee', () => {
    for (const value of [0, 380_000, 2_000_000, 2_000_001, 4_995_000, 10_000_000, 18_750_000, 30_308_018]) {
      const slices = tierSlices(value, FIRM_FEE_SCHEDULE.tiers)
      expect(slices.reduce((s, t) => s + t.slice, 0), String(value)).toBeCloseTo(value, 6)
      expect(slices.reduce((s, t) => s + t.fee, 0), String(value)).toBeCloseTo(blendedTieredFee(value, FIRM_FEE_SCHEDULE.tiers).fee, 6)
    }
  })
})

describe("today's fees", () => {
  it("bills every household on the schedule, on the combined value of its accounts", () => {
    const v = view()
    expect(v.households.map((h) => h.householdId)).toEqual(households.map((h) => h.id))
    for (const h of v.households) {
      expect(h.value, h.householdId).toBeCloseTo(deriveHouseholdAUM(h.householdId, accounts, FX_RATES_USD_BASE), 6)
      expect(h.annualFee, h.householdId).toBeCloseTo(annualFeeOn(h.value), 6)
      expect(h.quarterlyFee, h.householdId).toBeCloseTo(h.annualFee / 4, 6)
      expect(h.effectiveRate, h.householdId).toBeCloseTo(h.annualFee / h.value, 12)
      expect(h.tiers.reduce((s, t) => s + t.fee, 0), h.householdId).toBeCloseTo(h.annualFee, 6)
    }
  })

  it('totals the households, and the billed value is the book: $679,305 a year, 74.39 bps', () => {
    const v = view()
    expect(v.totals.value).toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
    expect(v.totals.annualFee).toBeCloseTo(v.households.reduce((s, h) => s + h.annualFee, 0), 6)
    expect(v.totals.quarterlyFee).toBeCloseTo(v.totals.annualFee / 4, 6)
    expect(Math.round(v.totals.annualFee)).toBe(679_305)
    expect(v.totals.effectiveRate * 10_000).toBeCloseTo(74.39, 2)
  })

  it('Johnson: four tiers on $18,750,000, $124,250 a year', () => {
    const johnson = view().households.find((h) => h.householdId === 'hh-001')
    expect(johnson?.tiers.map((t) => t.slice)).toEqual([2_000_000, 3_000_000, 5_000_000, 8_750_000])
    expect(johnson?.annualFee).toBeCloseTo(124_250, 6)
  })

  it('names the next tier where there is one', () => {
    const v = view()
    expect(v.households.find((h) => h.householdId === 'hh-009')?.nextTier).toEqual({ at: 2_000_000, rate: 0.0085 })
    expect(v.households.find((h) => h.householdId === 'hh-002')?.nextTier).toBeUndefined()
  })

  it("states each household's billing method from its agreement: O'Brien and Garcia bill in arrears", () => {
    const arrears = view().households.filter((h) => h.method === 'arrears').map((h) => h.householdId)
    expect(arrears).toEqual(['hh-008', 'hh-010'])
  })
})

describe('the billing runs', () => {
  it('are the three quarterly runs, newest first, each on a trading day, valued at the quarter end before it', () => {
    const runs = view().runs
    expect(runs.map((r) => [r.id, r.runDate, r.valuationDate])).toEqual([
      ['run-2026-01', '2026-01-02', '2025-12-31'], ['run-2025-10', '2025-10-01', '2025-09-30'], ['run-2025-07', '2025-07-01', '2025-06-30'],
    ])
    for (const r of runs) expect(isTradingDay(r.runDate), r.id).toBe(true)
    expect(runs).toHaveLength(BILLING_RUNS.length)
  })

  it('each run total is the sum of its households; each fee is a quarter of the schedule on the modeled valuation', () => {
    for (const run of view().runs) {
      expect(run.total, run.id).toBeCloseTo(run.households.reduce((s, h) => s + h.fee, 0), 6)
      for (const h of run.households) expect(h.fee, `${run.id} ${h.householdId}`).toBeCloseTo(annualFeeOn(h.valuation) / 4, 6)
    }
  })

  it('values only the accounts open by the valuation date, each at its modeled quarter-end value', () => {
    for (const run of view().runs) {
      for (const h of run.households) {
        const open = accounts.filter((a) => a.householdId === h.householdId && a.openDate <= run.valuationDate)
        expect(h.valuation, `${run.id} ${h.householdId}`).toBeCloseTo(open.reduce((s, a) => s + modeledAccountValueAt(a, run.valuationDate), 0), 4)
      }
    }
  })

  it('an advance household pays for the coming quarter; an arrears household for the quarter just ended', () => {
    const [latest] = view().runs
    expect(latest?.households.find((h) => h.householdId === 'hh-001')).toMatchObject({ method: 'advance', covers: 'Q1 2026' })
    expect(latest?.households.find((h) => h.householdId === 'hh-010')).toMatchObject({ method: 'arrears', covers: 'Q4 2025' })
  })

  it("are not rewritten by a release, and neither are today's values", () => {
    const before = view()
    release(approvedStoryV3())
    const after = view()
    expect(after.runs).toEqual(before.runs)
    expect(after.households.map((h) => h.value)).toEqual(before.households.map((h) => h.value))
  })
})

describe('the modeled quarter-end value', () => {
  it("is today's value on today's date", () => {
    const acc = account('acc-001')
    expect(modeledAccountValueAt(acc, MOCK_TODAY_ISO)).toBeCloseTo(accountValueUSD(acc, FX_RATES_USD_BASE), 6)
  })

  it('lies between the values at the two monthly points around the date', () => {
    const acc = account('acc-001')
    const series = performanceSeriesFor(acc, 'fixtures')
    const last = series[series.length - 1]!
    const i = series.findIndex((p) => p.date >= '2025-12-31')
    const [a, b] = [series[i - 1]!, series[i]!].map((p) => (accountValueUSD(acc, FX_RATES_USD_BASE) * p.value) / last.value)
    const v = modeledAccountValueAt(acc, '2025-12-31')
    expect(v).toBeGreaterThanOrEqual(Math.min(a!, b!))
    expect(v).toBeLessThanOrEqual(Math.max(a!, b!))
  })

  it('refuses a date before the series starts', () => {
    expect(() => modeledAccountValueAt(account('acc-001'), '2023-06-30')).toThrow('does not reach 2023-06-30')
  })
})

describe('exceptions, methods and the boundary', () => {
  it("Garcia's exception matches her terms: her agreement bills in arrears, the custodian's file says advance", () => {
    const garcia = view().exceptions.find((e) => e.householdId === 'hh-010')
    expect(garcia).toMatchObject({ kind: 'schedule_mismatch', runId: 'run-2026-01', householdName: 'Garcia Household' })
    expect(garcia?.description).toMatch(/agreement bills in arrears/)
    expect(garcia?.resolvedAt).toBeUndefined()
  })

  it('no exception speaks of a breakpoint or a missing value', () => {
    for (const e of view().exceptions) expect(e.description, e.id).not.toMatch(/breakpoint|AUM basis|missing/i)
  })

  it('states its methods; the quarter-end values are the one modeled note', () => {
    const notes = view().methods
    expect(notes.map((n) => n.label)).toEqual(['Schedule', "Today's fees", 'Billing runs', 'Quarter-end values'])
    expect(notes.filter((n) => n.modeled).map((n) => n.label)).toEqual(['Quarter-end values'])
    expect(notes.find((n) => n.modeled)?.text).toMatch(/^Modeled, not realized/)
  })

  it('is firm only', () => {
    expect(billingView('cli-001')).toBeUndefined()
    expect(billingView('prsp-011')).toBeUndefined()
    expect(billingView('cco-001')).toBeDefined()
  })

  it('quotes a household: a claim with no figure in it, each figure with its source', () => {
    const q = billingQuote('hh-001')
    expect(q).toMatchObject({ view: 'billing', rowId: 'hh-001', subject: { type: 'household', id: 'hh-001' }, threadTitle: 'Billing · Johnson Household' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Value today', 'USD'], ['Annual fee', 'USD'], ['Effective rate', '%']])
    expect(billingQuote('hh-999')).toBeUndefined()
  })

  it('the hand-typed billing, revenue and practice surfaces are gone', () => {
    for (const path of ['src/mocks/data/revenue.ts', 'src/mocks/data/practice.ts', 'src/mocks/handlers/billing.ts', 'src/mocks/handlers/revenue.ts',
      'src/mocks/handlers/practice.ts', 'src/services/billing.ts', 'src/services/revenue.ts', 'src/services/practice.ts', 'src/types/billing.ts']) {
      expect(existsSync(path), path).toBe(false)
    }
  })
})
```

Create `src/mocks/reference/__tests__/practice.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { computeMetrics } from '@/mocks/handlers/pms'
import { deriveBookAUM } from '@/lib/aum'
import { billingRuns, billingView } from '../billing'
import { practiceQuote, practiceView } from '../practice'

function view() {
  const v = practiceView('user-001')
  if (!v) throw new Error('Adrian reads practice')
  return v
}

describe('practice', () => {
  it("takes its revenue from billing: today's fees and the effective fee", () => {
    const billing = billingView('user-001')
    expect(view().revenue.annual).toBeCloseTo(billing?.totals.annualFee ?? Number.NaN, 6)
    expect(view().revenue.effectiveRate).toBeCloseTo(billing?.totals.effectiveRate ?? Number.NaN, 12)
  })

  it('names the latest billing run, whose total is modeled', () => {
    const [latest] = billingRuns()
    expect(view().revenue.lastRun).toEqual({ id: latest?.id, runDate: latest?.runDate, total: latest?.total })
  })

  it('counts the book from the accounts: $91,320,824 across 13 households and 47 accounts', () => {
    const { book } = view()
    expect(book.value).toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
    expect(Math.round(book.value)).toBe(91_320_824)
    expect(book).toMatchObject({ households: 13, accounts: 47, clients: computeMetrics().totalClients })
  })

  it('every breakdown sums to the book', () => {
    const v = view()
    for (const [name, rows] of [['segment', v.bySegment], ['account type', v.byAccountType], ['custodian', v.byCustodian]] as const) {
      expect(rows.reduce((s, r) => s + r.value, 0), name).toBeCloseTo(v.book.value, 4)
    }
    expect(v.byAccountType.reduce((s, r) => s + r.accounts, 0)).toBe(47)
    expect(v.bySegment.reduce((s, r) => s + r.annualFee, 0)).toBeCloseTo(v.revenue.annual, 6)
    expect(v.bySegment.find((s) => s.segment === 'platinum')).toMatchObject({ households: 3 })
    expect(Math.round(v.bySegment.find((s) => s.segment === 'platinum')?.value ?? 0)).toBe(58_558_018)
  })

  it('derives tenure from when each household joined', () => {
    const v = view()
    expect(v.tenure.reduce((s, t) => s + t.households, 0)).toBe(households.length)
    expect(v.tenure.map((t) => t.bucket)).toEqual(['Under 1 year', '1 to 3 years', '3 to 5 years', '5 to 10 years', '10 years or more'])
    expect(v.households.find((h) => h.householdId === 'hh-013')?.since).toBe('2024-03-15')
  })

  it('states book concentration as the HHI of household shares: 1,828, about 5.5 households', () => {
    const { concentration } = view()
    expect(concentration.hhi).toBe(1828)
    expect(Math.round(concentration.effectiveN * 10) / 10).toBe(5.5)
  })

  it("lists households by value, each one's share of revenue summing to one", () => {
    const rows = view().households
    expect(rows.map((r) => r.value)).toEqual([...rows.map((r) => r.value)].sort((a, b) => b - a))
    expect(rows.reduce((s, r) => s + r.shareOfRevenue, 0)).toBeCloseTo(1, 12)
  })

  it('carries none of the removed hand-typed figures', () => {
    const source = readFileSync('src/mocks/reference/practice.ts', 'utf8')
    expect(source).not.toMatch(/Lisa Park|PLANNING_REVENUE|revenueGrowthYoY|growthTrend|topGrowth|aumWaterfall|targetClients/)
  })

  it('is firm only, and quotes a household', () => {
    expect(practiceView('cli-001')).toBeUndefined()
    expect(practiceView('prsp-011')).toBeUndefined()
    const q = practiceQuote('hh-001')
    expect(q).toMatchObject({ view: 'practice', subject: { type: 'household', id: 'hh-001' }, threadTitle: 'Practice · Johnson Household' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(practiceQuote('hh-999')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/reference/__tests__ --testTimeout 30000`
Expected: FAIL — `../billing` and `../practice` do not exist.

- [ ] **Step 3: Shared types, the figure unit and the tier slices**

Create `src/types/reference.ts`:

```ts
import type { Citation, Figure, Subject } from './workspace'

/** The firm's reference views: dense reading that is not a conversation, each one step from a thread. */
export const REFERENCE_VIEWS = ['billing', 'reconciliation', 'risk', 'attribution', 'models', 'practice', 'blotter'] as const
export type ReferenceView = (typeof REFERENCE_VIEWS)[number]
export const isReferenceView = (value: unknown): value is ReferenceView =>
  typeof value === 'string' && (REFERENCE_VIEWS as readonly string[]).includes(value)

/** How a view's figures are computed. `modeled` marks an assumption or a synthetic series: modeled, not realized. */
export type MethodNote = { label: string; text: string; modeled: boolean }

/**
 * One row of a view as the engine quotes it into a team thread: what it is about, a claim with no figure
 * in it, and its figures with their sources. The engine computes it from the view and the row id alone.
 */
export type RowQuote = { view: ReferenceView; rowId: string; subject: Subject; threadTitle: string; claim: string; figures: Figure[]; citations: Citation[] }
```

In `src/types/workspace.ts` replace the `Subject` and `FigureUnit` lines with:

```ts
export type Subject = { type: 'account' | 'household' | 'client' | 'prospect' | 'draft' | 'proposal' | 'prospect_proposal' | 'alert' | 'message' | 'meeting' | 'model' | 'recon_break'; id: string }
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'd' | 'pts' | 'count'
```

In `src/workspace/thread/figure-format.ts` add to `BY_UNIT` (after `pts`):

```ts
  count: { format: fmtQuantity, unit: '' },
```

Append to `src/lib/fees.ts`:

```ts
export type FeeTierSlice = { from: number; upTo: number | null; rate: number; slice: number; fee: number }

/** The schedule tier by tier: each tier's rate on the slice of `aum` inside it. Σ fee is `blendedTieredFee(aum, tiers).fee`. */
export function tierSlices(aum: number, tiers: readonly FeeTier[]): FeeTierSlice[] {
  let floor = 0
  return tiers.map((tier) => {
    const ceiling = tier.upTo ?? Number.POSITIVE_INFINITY
    const slice = Math.max(0, Math.min(aum, ceiling) - floor)
    const row: FeeTierSlice = { from: floor, upTo: tier.upTo, rate: tier.rate, slice, fee: slice * tier.rate }
    floor = ceiling
    return row
  })
}
```

Run `pnpm tsc -b --noEmit 2>&1 | head -40`; any exhaustive `switch` or `Record` over `Subject['type']` it names gets the two new members (none is expected outside `figure-format.ts`).

- [ ] **Step 4: The pms derivations, over any positions, exported**

In `src/mocks/handlers/pms.ts`:

1. Import `seedPositionsForAccount` beside `getPositionsForAccount` (`import { getPositionsForAccount, seedPositionsForAccount } from '../data/positions'`) and `import type { Account } from '@/types/account'`.
2. Replace `weightsFor`'s signature and first line with:

```ts
function weightsFor(account: Account, positions: readonly Position[] = getPositionsForAccount(account.id, account.totalValue)) {
  const model = MODELS.find((m) => m.id === account.modelId) ?? getModelByIndex(0)
  return {
    weights: assetClassWeights(positions),
```

(the rest of the body unchanged).
3. Make the four derivations exported and positions-aware (bodies otherwise unchanged):

```ts
export function riskProfileFor(account: Account, positions?: readonly Position[]) {
  const { weights, benchWeights, modelId, benchmarkName } = weightsFor(account, positions)
  const oneYear = periodReturnsFor(account, 1, positions)
  // …the returned object as today
}

export function periodYears(): Record<string, number> { /* unchanged body */ }

export function attributionFor(account: Account, years: number, positions?: readonly Position[]): Attribution {
  const p = weightsFor(account, positions)
  // …unchanged
}

export function periodReturnsFor(account: Account, years: number, positions?: readonly Position[]) {
  const a = attributionFor(account, years, positions)
  // …unchanged
}
```

4. Add after `generatePerformanceSeries`:

```ts
/**
 * An account's modeled monthly series. `today` draws it from today's holdings (what the attribution page
 * shows); `fixtures` from the holdings as the fixtures state them, so a release today cannot rewrite the
 * past that billing values quarter ends from.
 */
export function performanceSeriesFor(account: Account, basis: 'today' | 'fixtures' = 'today'): PerformanceSeries[] {
  const p = riskProfileFor(account, basis === 'fixtures' ? seedPositionsForAccount(account.id, account.totalValue) : undefined)
  return generatePerformanceSeries(24, {
    accountId: account.id, modelId: p.modelId, annualReturn: p.ret, annualVol: p.vol, benchReturn: p.benchReturn, benchVol: p.benchVol,
  })
}
```

and make the `/api/pms/accounts/:accountId/performance` handler `return HttpResponse.json(performanceSeriesFor(account))`.
5. Delete the `/api/pms/book-of-business` handler, then the imports `pnpm lint` reports unused (`householdFees`, `householdAnnualFee`, `assetWeightedEffectiveFee`, `computeWaterfallDomain`, `WaterfallBar`, and any of `households`, `deriveHouseholdAUM`, `deriveSegmentAUM` no longer read).

In `src/services/pms.ts` delete `getBookOfBusiness` and the types only it used (`BookSegment`, `CapacityMetrics`, `AUMWaterfallItem`, `BookOfBusiness`); in `src/hooks/use-portfolio.ts` delete `useBookOfBusiness` and its import.

- [ ] **Step 5: Fee terms, runs and exceptions as leaf data; the billing and practice types**

Create `src/types/reference-billing.ts`:

```ts
import type { FeeTierSlice } from '@/lib/fees'
import type { MethodNote } from './reference'

export type BillingMethod = 'advance' | 'arrears'
/** One quarterly run: the day it billed, the quarter end it valued at, and the quarter each method pays for. */
export type BillingRunDate = { id: string; runDate: string; valuationDate: string; advanceQuarter: string; arrearsQuarter: string }
export type BillingExceptionRecord = {
  id: string; householdId: string; runId: string; kind: 'schedule_mismatch' | 'collection_failed'; description: string; openedAt: string; resolvedAt?: string
}

export type HouseholdBilling = {
  householdId: string; householdName: string; segment: string; method: BillingMethod
  /** Today's combined value of the household's accounts, USD. */
  value: number
  annualFee: number; quarterlyFee: number; effectiveRate: number
  tiers: FeeTierSlice[]
  nextTier?: { at: number; rate: number }
  openExceptionIds: string[]
}
export type BillingRunRow = { householdId: string; householdName: string; method: BillingMethod; covers: string; valuation: number; fee: number }
export type BillingRun = BillingRunDate & { households: BillingRunRow[]; total: number; exceptionIds: string[] }
export type BillingException = BillingExceptionRecord & { householdName: string }
export type BillingView = {
  asOf: string
  schedule: { name: string; tiers: { from: number; upTo: number | null; rate: number }[] }
  households: HouseholdBilling[]
  totals: { value: number; annualFee: number; quarterlyFee: number; effectiveRate: number }
  runs: BillingRun[]
  exceptions: BillingException[]
  methods: MethodNote[]
}
```

Create `src/types/reference-practice.ts`:

```ts
import type { MethodNote } from './reference'

export type PracticeHousehold = { householdId: string; name: string; segment: string; since: string; value: number; annualFee: number; effectiveRate: number; shareOfRevenue: number }
export type PracticeView = {
  asOf: string
  book: { value: number; households: number; clients: number; accounts: number }
  revenue: { annual: number; effectiveRate: number; lastRun: { id: string; runDate: string; total: number } }
  bySegment: { segment: string; households: number; value: number; annualFee: number; effectiveRate: number }[]
  byAccountType: { type: string; accounts: number; value: number }[]
  byCustodian: { custodian: string; accounts: number; value: number }[]
  tenure: { bucket: string; households: number }[]
  concentration: { hhi: number; effectiveN: number }
  households: PracticeHousehold[]
  methods: MethodNote[]
}
```

Replace `src/mocks/data/billing.ts` with:

```ts
import type { BillingExceptionRecord, BillingMethod, BillingRunDate } from '@/types/reference-billing'

/**
 * Leaf data only: how each household's agreement bills, the firm's quarterly runs, and the exceptions
 * those runs raised. Every figure — value, fee, run total — is derived in `src/mocks/reference/billing.ts`.
 *
 * Phase 7a · R1 — the hand-typed per-household rates ("tiered" on a flat rate) and breakpoint analyses
 * are gone: every household bills on the firm's one tiered schedule.
 */
export const FEE_TERMS: readonly { householdId: string; method: BillingMethod }[] = [
  { householdId: 'hh-001', method: 'advance' }, { householdId: 'hh-002', method: 'advance' }, { householdId: 'hh-003', method: 'advance' },
  { householdId: 'hh-004', method: 'advance' }, { householdId: 'hh-005', method: 'advance' }, { householdId: 'hh-006', method: 'advance' },
  { householdId: 'hh-007', method: 'advance' }, { householdId: 'hh-008', method: 'arrears' }, { householdId: 'hh-009', method: 'advance' },
  { householdId: 'hh-010', method: 'arrears' }, { householdId: 'hh-011', method: 'advance' }, { householdId: 'hh-012', method: 'advance' },
  { householdId: 'hh-013', method: 'advance' },
]

/** The firm bills on the first trading day of each quarter, on the value at the quarter end before it (R2). */
export const BILLING_RUNS: readonly BillingRunDate[] = [
  { id: 'run-2025-07', runDate: '2025-07-01', valuationDate: '2025-06-30', advanceQuarter: 'Q3 2025', arrearsQuarter: 'Q2 2025' },
  { id: 'run-2025-10', runDate: '2025-10-01', valuationDate: '2025-09-30', advanceQuarter: 'Q4 2025', arrearsQuarter: 'Q3 2025' },
  { id: 'run-2026-01', runDate: '2026-01-02', valuationDate: '2025-12-31', advanceQuarter: 'Q1 2026', arrearsQuarter: 'Q4 2025' },
]

export const BILLING_EXCEPTIONS: readonly BillingExceptionRecord[] = [
  {
    id: 'bex-002', householdId: 'hh-010', runId: 'run-2026-01', kind: 'schedule_mismatch', openedAt: '2026-02-18T14:30:00Z',
    description: "Her advisory agreement bills in arrears; the custodian's fee file still lists her as billed in advance. Correct the custodian file before the April run.",
  },
  {
    id: 'bex-004', householdId: 'hh-004', runId: 'run-2026-01', kind: 'collection_failed', openedAt: '2026-01-05T15:00:00Z', resolvedAt: '2026-01-22T16:00:00Z',
    description: "The 2 January run's fee debit failed: not enough cash in the primary account. Retried and collected on 22 January.",
  },
]
```

- [ ] **Step 6: The billing engine**

Create `src/mocks/reference/billing.ts`:

```ts
import type { Account } from '@/types/account'
import type { PerformanceSeries } from '@/types/performance'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { BillingException, BillingMethod, BillingRun, BillingRunDate, BillingView, HouseholdBilling } from '@/types/reference-billing'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { BILLING_EXCEPTIONS, BILLING_RUNS, FEE_TERMS } from '@/mocks/data/billing'
import { proposalTemplates, toFeeTiers } from '@/mocks/data/proposals'
import { performanceSeriesFor } from '@/mocks/handlers/pms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { accountValueUSD, deriveHouseholdAUM } from '@/lib/aum'
import { blendedTieredFee, tierSlices, type FeeTier } from '@/lib/fees'
import { MOCK_NOW_ISO } from '@/lib/clock'

type Household = (typeof households)[number]

function firmSchedule(): { name: string; tiers: readonly FeeTier[] } {
  const template = proposalTemplates.find((t) => t.id === 'tpl-001')
  if (!template) throw new Error('The firm fee schedule tpl-001 is missing')
  return { name: template.name, tiers: toFeeTiers(template.feeTiers) }
}

/** The firm's one published schedule, the one Form ADV Part 2A discloses, on every household's combined value (R1). */
export const FIRM_FEE_SCHEDULE = firmSchedule()

export const annualFeeOn = (value: number): number => blendedTieredFee(value, FIRM_FEE_SCHEDULE.tiers).fee

export function billingMethodOf(householdId: string): BillingMethod {
  const terms = FEE_TERMS.find((t) => t.householdId === householdId)
  if (!terms) throw new Error(`Household ${householdId} has no fee terms`)
  return terms.method
}

function householdName(householdId: string): string {
  const household = households.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  return household.name
}

// The fixtures-book series never changes in a session, so each account's is drawn once.
const fixturesSeries = new Map<string, readonly PerformanceSeries[]>()
function seriesOf(account: Account): readonly PerformanceSeries[] {
  const known = fixturesSeries.get(account.id)
  if (known) return known
  const drawn = performanceSeriesFor(account, 'fixtures')
  fixturesSeries.set(account.id, drawn)
  return drawn
}

/**
 * Modeled, not realized (R3): today's USD value scaled by the account's fixtures-book series, linearly
 * interpolated between the two monthly points around `day`. The demo keeps no price history.
 */
export function modeledAccountValueAt(account: Account, day: string): number {
  const series = seriesOf(account)
  const last = series[series.length - 1]
  const after = series.findIndex((p) => p.date >= day)
  const before = after > 0 ? series[after - 1] : undefined
  const next = after > 0 ? series[after] : undefined
  if (!last || !before || !next) throw new Error(`The modeled series for ${account.id} does not reach ${day}`)
  const t = (Date.parse(day) - Date.parse(before.date)) / (Date.parse(next.date) - Date.parse(before.date))
  return (accountValueUSD(account, FX_RATES_USD_BASE) * (before.value + (next.value - before.value) * t)) / last.value
}

function householdBilling(h: Household): HouseholdBilling {
  const value = deriveHouseholdAUM(h.id, accounts, FX_RATES_USD_BASE)
  const tiers = tierSlices(value, FIRM_FEE_SCHEDULE.tiers)
  const annualFee = tiers.reduce((s, t) => s + t.fee, 0)
  const inside = tiers.findIndex((t) => t.upTo !== null && value < t.upTo)
  const boundary = inside >= 0 ? tiers[inside]?.upTo : undefined
  const following = inside >= 0 ? FIRM_FEE_SCHEDULE.tiers[inside + 1] : undefined
  return {
    householdId: h.id, householdName: h.name, segment: h.segment, method: billingMethodOf(h.id),
    value, annualFee, quarterlyFee: annualFee / 4, effectiveRate: value > 0 ? annualFee / value : 0, tiers,
    ...(typeof boundary === 'number' && following ? { nextTier: { at: boundary, rate: following.rate } } : {}),
    openExceptionIds: BILLING_EXCEPTIONS.filter((e) => e.householdId === h.id && !e.resolvedAt).map((e) => e.id),
  }
}

export function householdBillings(): HouseholdBilling[] {
  return households.map(householdBilling)
}

function runOf(run: BillingRunDate): BillingRun {
  const rows = households.map((h) => {
    const method = billingMethodOf(h.id)
    const valuation = accounts
      .filter((a) => a.householdId === h.id && a.openDate <= run.valuationDate)
      .reduce((s, a) => s + modeledAccountValueAt(a, run.valuationDate), 0)
    return { householdId: h.id, householdName: h.name, method, covers: method === 'advance' ? run.advanceQuarter : run.arrearsQuarter, valuation, fee: annualFeeOn(valuation) / 4 }
  })
  return {
    ...run, households: rows, total: rows.reduce((s, r) => s + r.fee, 0),
    exceptionIds: BILLING_EXCEPTIONS.filter((e) => e.runId === run.id).map((e) => e.id),
  }
}

/** The quarterly runs, newest first. */
export function billingRuns(): BillingRun[] {
  return [...BILLING_RUNS].sort((a, b) => b.runDate.localeCompare(a.runDate)).map(runOf)
}

function scheduleRows(): BillingView['schedule']['tiers'] {
  let from = 0
  return FIRM_FEE_SCHEDULE.tiers.map((t) => {
    const row = { from, upTo: t.upTo, rate: t.rate }
    from = t.upTo ?? from
    return row
  })
}

const exceptions = (): BillingException[] => BILLING_EXCEPTIONS.map((e) => ({ ...e, householdName: householdName(e.householdId) }))

const METHODS: readonly MethodNote[] = [
  { label: 'Schedule', modeled: false, text: "Every household is billed on the firm's tiered schedule, the schedule Form ADV Part 2A discloses, on the combined value of its accounts. Each tier's rate applies only to the slice of value inside that tier." },
  { label: "Today's fees", modeled: false, text: "Value is each account's value today, from the book; an account held in another currency is converted at today's exchange rate. The annual fee is the schedule on that value; the quarterly fee is a quarter of it." },
  { label: 'Billing runs', modeled: false, text: 'The firm bills on the first trading day of each quarter, on the value at the quarter end before it. A household whose agreement bills in advance pays for the coming quarter; one whose agreement bills in arrears pays for the quarter just ended, on the same valuation. An account counts only if it was open by the valuation date.' },
  { label: 'Quarter-end values', modeled: true, text: "Modeled, not realized: the demo keeps no price history, so each account's quarter-end value is today's value scaled by its modeled monthly performance series, drawn from the holdings as the fixtures state them and interpolated between the two monthly points around the quarter end. Today's trades do not rewrite it." },
]

export function billingView(viewerId: string): BillingView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const rows = householdBillings()
  const value = rows.reduce((s, h) => s + h.value, 0)
  const annualFee = rows.reduce((s, h) => s + h.annualFee, 0)
  return {
    asOf: MOCK_NOW_ISO,
    schedule: { name: FIRM_FEE_SCHEDULE.name, tiers: scheduleRows() },
    households: rows,
    totals: { value, annualFee, quarterlyFee: annualFee / 4, effectiveRate: annualFee / value },
    runs: billingRuns(),
    exceptions: exceptions(),
    methods: [...METHODS],
  }
}

export function billingQuote(householdId: string): RowQuote | undefined {
  const household = households.find((h) => h.id === householdId)
  if (!household) return undefined
  const b = householdBilling(household)
  return {
    view: 'billing', rowId: household.id, subject: { type: 'household', id: household.id }, threadTitle: `Billing · ${household.name}`,
    claim: `${household.name} is billed on the firm's tiered schedule, ${b.method === 'advance' ? 'in advance' : 'in arrears'}.`,
    figures: [
      { label: 'Value today', value: b.value, unit: 'USD', source: 'billing.households.value' },
      { label: 'Annual fee', value: b.annualFee, unit: 'USD', source: 'billing.households.annualFee' },
      { label: 'Effective rate', value: b.effectiveRate, unit: '%', source: 'billing.households.effectiveRate' },
    ],
    citations: [{ source: `Billing · ${FIRM_FEE_SCHEDULE.name} schedule on household value`, asOf: MOCK_NOW_ISO }],
  }
}
```

- [ ] **Step 7: The practice engine**

Create `src/mocks/reference/practice.ts`:

```ts
import type { MethodNote, RowQuote } from '@/types/reference'
import type { PracticeHousehold, PracticeView } from '@/types/reference-practice'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { accountValueUSD, deriveBookAUM, effectiveN, herfindahlIndex } from '@/lib/aum'
import { ACCOUNT_TYPE_LABELS } from '@/lib/labels'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { billingRuns, householdBillings } from './billing'

const YEAR_MS = 365.25 * 86_400_000
const TENURE: readonly { bucket: string; under: number }[] = [
  { bucket: 'Under 1 year', under: 1 }, { bucket: '1 to 3 years', under: 3 }, { bucket: '3 to 5 years', under: 5 },
  { bucket: '5 to 10 years', under: 10 }, { bucket: '10 years or more', under: Number.POSITIVE_INFINITY },
]

/** Sums `value` (and counts) by a key, largest value first. */
function groupBy<T>(rows: readonly T[], key: (row: T) => string, value: (row: T) => number): { key: string; count: number; value: number }[] {
  const groups = new Map<string, { count: number; value: number }>()
  for (const row of rows) {
    const g = groups.get(key(row)) ?? { count: 0, value: 0 }
    groups.set(key(row), { count: g.count + 1, value: g.value + value(row) })
  }
  return [...groups].map(([k, g]) => ({ key: k, ...g })).sort((a, b) => b.value - a.value)
}

function practiceHouseholds(): PracticeHousehold[] {
  const billed = householdBillings()
  const revenue = billed.reduce((s, b) => s + b.annualFee, 0)
  return households.map((h) => {
    const b = billed.find((x) => x.householdId === h.id)
    if (!b) throw new Error(`Household ${h.id} is not billed`)
    return { householdId: h.id, name: h.name, segment: h.segment, since: h.createdAt, value: b.value, annualFee: b.annualFee, effectiveRate: b.effectiveRate, shareOfRevenue: b.annualFee / revenue }
  }).sort((a, b) => b.value - a.value)
}

const METHODS: readonly MethodNote[] = [
  { label: 'Revenue', modeled: false, text: "Annual advisory revenue is the billing view's fees on today's value: the firm's tiered schedule on each household's combined value. The effective fee is that revenue over the book's value, in basis points. Flat planning fees are not in the book and are not shown." },
  { label: 'Latest run', modeled: true, text: "Modeled, not realized: the latest billing run's total rests on quarter-end values drawn from each account's modeled performance series." },
  { label: 'Book', modeled: false, text: "Value, households, clients and accounts are counted from the accounts in the book; an account held in another currency is converted at today's exchange rate." },
  { label: 'Tenure', modeled: false, text: 'Years since each household joined the firm, to today.' },
  { label: 'Concentration', modeled: false, text: 'The Herfindahl-Hirschman index of household shares of the book, on a 0 to 10,000 scale, and its effective number of households (10,000 divided by the index).' },
]

export function practiceView(viewerId: string): PracticeView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const rows = practiceHouseholds()
  const bookValue = deriveBookAUM(accounts, FX_RATES_USD_BASE)
  const annual = rows.reduce((s, r) => s + r.annualFee, 0)
  const [latest] = billingRuns()
  if (!latest) throw new Error('The firm has no billing run')
  const index = herfindahlIndex(rows.map((r) => r.value / bookValue))
  const usd = (a: (typeof accounts)[number]) => accountValueUSD(a, FX_RATES_USD_BASE)
  return {
    asOf: MOCK_NOW_ISO,
    book: { value: bookValue, households: households.length, clients: new Set(accounts.map((a) => a.clientId)).size, accounts: accounts.length },
    revenue: { annual, effectiveRate: annual / bookValue, lastRun: { id: latest.id, runDate: latest.runDate, total: latest.total } },
    bySegment: groupBy(rows, (r) => r.segment, (r) => r.value).map((g) => {
      const fees = rows.filter((r) => r.segment === g.key).reduce((s, r) => s + r.annualFee, 0)
      return { segment: g.key, households: g.count, value: g.value, annualFee: fees, effectiveRate: fees / g.value }
    }),
    byAccountType: groupBy(accounts, (a) => ACCOUNT_TYPE_LABELS[a.type], usd).map((g) => ({ type: g.key, accounts: g.count, value: g.value })),
    byCustodian: groupBy(accounts, (a) => a.custodian, usd).map((g) => ({ custodian: g.key, accounts: g.count, value: g.value })),
    tenure: TENURE.map(({ bucket, under }, i) => ({
      bucket,
      households: households.filter((h) => {
        const years = (Date.parse(MOCK_TODAY_ISO) - Date.parse(h.createdAt)) / YEAR_MS
        return years < under && years >= (TENURE[i - 1]?.under ?? 0)
      }).length,
    })),
    // The index is stated in whole points, as the legacy book page did; effective N comes from the unrounded index.
    concentration: { hhi: Math.round(index), effectiveN: effectiveN(index) },
    households: rows,
    methods: [...METHODS],
  }
}

export function practiceQuote(householdId: string): RowQuote | undefined {
  const row = practiceHouseholds().find((r) => r.householdId === householdId)
  if (!row) return undefined
  return {
    view: 'practice', rowId: row.householdId, subject: { type: 'household', id: row.householdId }, threadTitle: `Practice · ${row.name}`,
    claim: `${row.name} in the book: its value, its fees and its share of the firm's revenue.`,
    figures: [
      { label: 'Value today', value: row.value, unit: 'USD', source: 'practice.households.value' },
      { label: 'Annual fee', value: row.annualFee, unit: 'USD', source: 'practice.households.annualFee' },
      { label: 'Share of revenue', value: row.shareOfRevenue, unit: '%', source: 'practice.households.shareOfRevenue' },
    ],
    citations: [{ source: "Practice · billing's fees on today's value", asOf: MOCK_NOW_ISO }],
  }
}
```

- [ ] **Step 8: Delete the legacy surfaces; restate the Williams rollover cost**

Delete `src/mocks/handlers/{billing,revenue,practice}.ts`, `src/services/{billing,revenue,practice}.ts`, `src/hooks/{use-billing,use-revenue,use-practice}.ts`, `src/types/{billing,revenue,practice}.ts`, `src/mocks/data/{revenue,practice}.ts`; remove `billingHandlers`, `revenueHandlers` and `practiceHandlers` (imports and spreads) from `src/mocks/handlers/index.ts`.

In `src/mocks/data/__tests__/rollup-invariants.test.ts` delete the imports from `@/mocks/data/billing`, `@/mocks/data/revenue` and `@/mocks/data/practice`, the whole `describe('practice analytics', …)` block (its three tests, the AUM waterfall included) and the whole `describe('fees and revenue', …)` block; the practice and billing tests above replace them. Remove any import lint then reports unused.

Replace `src/mocks/handlers/__tests__/fee-invariants.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { deriveBookAUM } from '@/lib/aum'
import { assetWeightedEffectiveFee, bps } from '@/lib/fees'
import { billingView } from '@/mocks/reference/billing'
import { practiceView } from '@/mocks/reference/practice'

const billing = () => {
  const v = billingView('user-001')
  if (!v) throw new Error('Adrian reads billing')
  return v
}

describe('one fee number across every surface', () => {
  it('practice and billing report the same effective fee, 74.4 bps', () => {
    expect(Math.round(bps(billing().totals.effectiveRate) * 10) / 10).toBe(74.4)
    expect(practiceView('user-001')?.revenue.effectiveRate).toBeCloseTo(billing().totals.effectiveRate, 12)
  })

  it('the effective fee is Σ fees ÷ Σ value, not the mean of household rates', () => {
    const rows = billing().households.map((h) => ({ aum: h.value, annualFee: h.annualFee }))
    expect(assetWeightedEffectiveFee(rows)).toBeCloseTo(bps(billing().totals.effectiveRate), 9)
    const unweighted = billing().households.reduce((s, h) => s + h.effectiveRate, 0) / rows.length
    expect(Math.abs(bps(unweighted) - bps(billing().totals.effectiveRate))).toBeGreaterThan(10)
  })

  it('Σ billed value === book value: nobody is billed on a stale basis', () => {
    expect(billing().totals.value).toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
  })
})
```

In `src/mocks/data/nbas.ts` replace `nba-014`'s comment and `description` with:

```ts
    // Compliance §5.4 · fiduciary-standards / fee-disclosure — a rollover adds cost here, never a saving.
    // Phase 7a · R1: the household bills on the firm's tiered schedule, so the $1.2M is priced at the
    // household's marginal tier: $4,995,000 today, so all but $5,000 of it falls in the 0.70% tier
    // ($8,407.50 a year) against a plan cost of $5,400 — about $3,000 more.
    description: "David Williams holds $1.2M in a 401(k) at a former employer (Fidelity). Estimated plan cost is 0.45% ($5,400 a year). On our schedule almost all of it would fall in the household's 0.70% tier, above $5,000,000: about $8,400 a year, so a rollover would raise annual cost by about $3,000. Weigh that against consolidated tax management, household-level rebalancing and planning. Present both options, including leaving the assets in the plan.",
```

In `src/mocks/data/__tests__/nba-facts.test.ts` replace the import of `householdFees` with `import { annualFeeOn, billingView } from '@/mocks/reference/billing'`, and replace the tests "quotes the household's actual advisory rate" and "shows both sides of the cost comparison and the added annual cost" with:

```ts
  it("quotes the household's marginal cost on the firm's schedule", () => {
    const williams = billingView('user-001')?.households.find((h) => h.householdId === 'hh-003')
    if (!williams) throw new Error('Williams is billed')
    const added = annualFeeOn(williams.value + 1_200_000) - annualFeeOn(williams.value)
    expect(Math.round(added / 100) * 100).toBe(8_400)
    expect(rollover.description).toContain('0.70%')
  })

  it('shows both sides of the cost comparison and the added annual cost', () => {
    expect(rollover.description).toContain('0.45%')
    expect(rollover.description).toContain('$8,400')
    expect(rollover.description).toContain('$5,400')
    expect(rollover.description).toContain('$3,000')
  })
```

and in the direction test change the schedule window to `rollover.description.slice(scheduleIdx, scheduleIdx + 140)` with `expect(scheduleWindow).toContain('0.70%')` and `expect(scheduleWindow).toContain('$8,400')` in place of the `0.85%` / `$10,200` lines (the plan window and the verb assertions stay).

- [ ] **Step 9: Run the engine tests and the touched suites**

Run: `pnpm vitest run src/mocks/reference src/mocks/data/__tests__/nba-facts.test.ts src/mocks/data/__tests__/rollup-invariants.test.ts src/mocks/handlers/__tests__ --testTimeout 30000`
Expected: PASS. A failure in `risk-invariants`, `attribution-invariants` or `performance-invariants` means a derivation's body changed beyond its signature; restore the body.

- [ ] **Step 10: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): billing and practice engines — one tiered schedule, quarterly runs on modeled quarter ends, revenue from billing; legacy billing, revenue and practice surfaces removed

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 2: Reconciliation engine — breaks read off the book, match rates from checked records, the integration log, `resolve_break`

The hand-typed match rates (99.7 / 99.4 / 99.8), the sine-wave trend, the uptime figures and the unrecorded resolve endpoint go. A break records the custodian's difference; the book's side is read off the book (R6); rates count checked records against open breaks; the trend is history; a seeded log explains every sync; resolving a break is a binding act in the Archive (R7).

**Files:**
- Create: `src/types/reference-reconciliation.ts`, `src/mocks/data/reconciliation.ts`, `src/mocks/reference/reconciliation.ts`, `src/mocks/reference/__tests__/reconciliation.test.ts`
- Modify: `src/types/workspace.ts` (`BindingActKind`, `BindingAct.outcome`), `src/mocks/data/people.ts` (permission), `src/mocks/workspace/archive.ts`, `src/types/workspace-supervision.ts` (`ARCHIVE_KINDS`), `src/workspace/thread/act-kind-label.ts`, `src/mocks/handlers/index.ts`
- Delete: `src/mocks/handlers/reconciliation.ts`, `src/services/reconciliation.ts`, `src/hooks/use-reconciliation.ts`, `src/types/reconciliation.ts`, `src/mocks/handlers/__tests__/reconciliation-invariants.test.ts`

**Interfaces:**
- Consumes: `RowQuote`, `MethodNote` (Task 1); `cashBalanceOf`, `getPositionsForAccount`; `generateTransactions` (`@/mocks/handlers/custodian`); `recordAct` (`@/mocks/workspace/proposal-acts`); `rationaleRefusal` (`@/mocks/workspace/compliance-acts`); `commitActId`, `nextAt`, `sessionNow`, `store`; `fingerprint` (`@/lib/fingerprint`).
- Produces:

```ts
// src/types/reference-reconciliation.ts
export type BreakField = 'cash_balance' | 'position_quantity' | 'market_value' | 'transaction_count'
export const BREAK_RESOLUTIONS: readonly ['book_corrected', 'custodian_corrected', 'timing_difference']
export type BreakResolution = (typeof BREAK_RESOLUTIONS)[number]
export const isBreakResolution: (value: unknown) => value is BreakResolution
export const RESOLUTION_WORDS: Readonly<Record<BreakResolution, string>>   // 'Book corrected' | 'Custodian corrected' | 'Timing difference'
export type BreakUnit = 'USD' | 'sh' | 'count'
export type MatchKind = 'positions' | 'cash' | 'transactions'
export type IntegrationStatus = 'synced' | 'pending' | 'failed'
export type ReconBreakView, MatchRate, IntegrationView, IntegrationLogEntry, ReconTrendPoint, ReconciliationView, ResolveBreakRequest  // below

// src/types/workspace.ts
BindingActKind gains 'resolve_break'; BindingAct['outcome'] gains BreakResolution

// src/mocks/reference/reconciliation.ts
export function reconciliationView(viewerId: string): ReconciliationView | undefined
export function resolveBreak(viewerId: string, request: ResolveBreakRequest): { ok: true; act: BindingAct } | ResolveFailure
export type ResolveFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export function breakClientId(breakId: string): string | undefined
export function reconciliationQuote(breakId: string): RowQuote | undefined
```

- [ ] **Step 1: Write the failing engine tests**

Create `src/mocks/reference/__tests__/reconciliation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { accounts } from '@/mocks/data/accounts'
import { cashBalanceOf, getPositionsForAccount } from '@/mocks/data/positions'
import { store } from '@/mocks/data/workspace-store'
import { generateTransactions } from '@/mocks/handlers/custodian'
import { archiveFor } from '@/mocks/workspace/archive'
import { eventTime, MOCK_TODAY_ISO } from '@/lib/clock'
import { SEED_LAST_SEQUENCE } from '@/mocks/data/workspace-seed'
import { reconciliationQuote, reconciliationView, resolveBreak } from '../reconciliation'

const ADRIAN = 'user-001'
const SARAH = 'user-002'
const MIKE = 'user-003'
const MARK = 'cco-001'
const RATIONALE = 'Schwab confirmed the 24 Feb cash sweep posted after the file was cut.'

function view(viewerId = ADRIAN) {
  const v = reconciliationView(viewerId)
  if (!v) throw new Error(`${viewerId} reads reconciliation`)
  return v
}
const brk = (id: string) => {
  const b = view().breaks.find((x) => x.id === id)
  if (!b) throw new Error(`no ${id}`)
  return b
}
const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}
const resolve002 = (viewerId = ADRIAN, fingerprint = brk('brk-002').fingerprint) =>
  resolveBreak(viewerId, { breakId: 'brk-002', fingerprint, resolution: 'timing_difference', rationale: RATIONALE })

describe('breaks', () => {
  it("read the book's side off the book, and the custodian's as the book plus its recorded difference", () => {
    expect(brk('brk-002')).toMatchObject({ custodian: 'Schwab', accountName: 'Johnson Family Trust', fieldLabel: 'Cash balance', unit: 'USD', difference: -150, status: 'open' })
    expect(brk('brk-002').book).toBeCloseTo(cashBalanceOf(account('acc-001')), 6)
    expect(brk('brk-002').custodianValue).toBeCloseTo(cashBalanceOf(account('acc-001')) - 150, 6)
    expect(brk('brk-003')).toMatchObject({ custodian: 'Fidelity', symbol: 'EFA', unit: 'sh', book: 14_500, custodianValue: 14_480, status: 'resolved' })
    const acc003 = account('acc-003')
    expect(brk('brk-004')).toMatchObject({ unit: 'count', book: generateTransactions(acc003.id, acc003.totalValue).length })
  })

  it('name only real USD accounts, each at the custodian that holds it', () => {
    for (const b of view().breaks) {
      const a = account(b.accountId)
      expect(a.baseCurrency ?? 'USD', b.id).toBe('USD')
      expect(b.custodian, b.id).toBe(a.custodian)
    }
  })

  it('one is open this morning: brk-002', () => {
    expect(view().breaks.filter((b) => b.status === 'open').map((b) => b.id)).toEqual(['brk-002'])
    expect(view().summary).toMatchObject({ openBreaks: 1, resolvedToday: 0 })
  })
})

describe('match rates', () => {
  it('count checked records against open breaks of their kind', () => {
    const rates = view().summary.rates
    const positions = accounts.reduce((s, a) => s + getPositionsForAccount(a.id, a.totalValue).filter((p) => p.symbol !== 'CASH').length, 0)
    const transactions = accounts.reduce((s, a) => s + generateTransactions(a.id, a.totalValue).length, 0)
    expect(rates).toEqual([
      { kind: 'positions', checked: positions, open: 0, rate: 1 },
      { kind: 'cash', checked: accounts.length, open: 1, rate: (accounts.length - 1) / accounts.length },
      { kind: 'transactions', checked: transactions, open: 0, rate: 1 },
    ])
  })
})

describe('the 30-day trend', () => {
  it("is end-of-day history for 29 days and today's count as it stands", () => {
    const trend = view().trend
    expect(trend).toHaveLength(30)
    expect(trend[0]?.date).toBe('2026-01-27')
    expect(trend[29]?.date).toBe(MOCK_TODAY_ISO)
    expect(trend[29]?.openBreaks).toBe(view().summary.openBreaks)
    const on = (date: string) => trend.find((p) => p.date === date)?.openBreaks
    expect([on('2026-01-27'), on('2026-02-03'), on('2026-02-04'), on('2026-02-10'), on('2026-02-11'), on('2026-02-24')]).toEqual([0, 1, 0, 1, 0, 0])
    expect(trend.find((p) => p.date === '2026-02-03')?.positions).toBeLessThan(1)
  })
})

describe('integrations', () => {
  it("are the custodians the accounts name, then MoneyGuidePro, each with the log that explains it", () => {
    const list = view().integrations
    expect(list.map((i) => i.name)).toEqual(['Coinbase', 'DBS', 'Fidelity', 'HSBC', 'Schwab', 'UBS', 'Vanguard', 'MoneyGuidePro'])
    for (const i of list) expect(i.log.length, i.name).toBeGreaterThan(0)
    expect(list.find((i) => i.name === 'Schwab')).toMatchObject({ status: 'synced', lastSync: '2026-02-25T07:00:00Z', openBreaks: 1 })
    expect(list.find((i) => i.name === 'MoneyGuidePro')).toMatchObject({ kind: 'planning', status: 'pending', lastSync: '2026-02-24T22:00:00Z', openBreaks: 0 })
    expect(list.find((i) => i.name === 'MoneyGuidePro')?.log.at(-1)?.detail).toMatch(/has not returned it/)
  })
})

describe('resolve_break', () => {
  it('is a binding act outside any thread that closes the break', () => {
    const r = resolve002()
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({
      kind: 'resolve_break', actorId: ADRIAN, subject: { type: 'recon_break', id: 'brk-002' }, outcome: 'timing_difference', rationale: RATIONALE,
      at: eventTime(SEED_LAST_SEQUENCE + 1), summary: 'Resolved brk-002 · Johnson Family Trust cash balance: timing difference',
    })
    expect(r.act.threadId).toBeUndefined()
    expect(store().messages.some((m) => m.kind === 'act' && m.actId === r.act.id)).toBe(false)
    expect(brk('brk-002')).toMatchObject({ status: 'resolved', resolvedAt: r.act.at, resolution: { actId: r.act.id, actorName: 'Adrian Hale', resolution: 'timing_difference' } })
    expect(view().summary).toMatchObject({ openBreaks: 0, resolvedToday: 1 })
    expect(view().summary.rates.find((x) => x.kind === 'cash')?.rate).toBe(1)
    expect(view().trend[29]?.openBreaks).toBe(0)
  })

  it('records once: a second resolve, by anyone, names the first act', () => {
    const first = resolve002()
    if (!first.ok) throw new Error(first.message)
    expect(resolve002(SARAH)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_RESOLVED', message: `brk-002 was already resolved (${first.act.id}).` })
    expect(store().acts.filter((a) => a.kind === 'resolve_break')).toHaveLength(1)
  })

  it('refuses a break resolved before this session', () => {
    expect(resolveBreak(ADRIAN, { breakId: 'brk-003', fingerprint: brk('brk-003').fingerprint, resolution: 'custodian_corrected', rationale: RATIONALE }))
      .toMatchObject({ ok: false, status: 409, code: 'ALREADY_RESOLVED', message: 'brk-003 was resolved before this session.' })
  })

  it('refuses a fingerprint that is not the break’s, recording nothing', () => {
    expect(resolve002(ADRIAN, '00000000')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(store().acts).toHaveLength(0)
  })

  it('belongs to the advisor and client service: the analyst and compliance get 403, outsiders 404', () => {
    expect(resolve002(MIKE)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(resolve002(MARK)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(resolve002('cli-001')).toMatchObject({ ok: false, status: 404 })
    expect(resolve002('prsp-011')).toMatchObject({ ok: false, status: 404 })
    expect(resolveBreak(ADRIAN, { breakId: 'brk-999', fingerprint: 'X', resolution: 'book_corrected', rationale: RATIONALE })).toMatchObject({ ok: false, status: 404, code: 'NO_BREAK' })
    expect(resolve002(SARAH)).toMatchObject({ ok: true })
  })

  it('needs a rationale', () => {
    expect(resolveBreak(ADRIAN, { breakId: 'brk-002', fingerprint: brk('brk-002').fingerprint, resolution: 'book_corrected', rationale: '   ' }))
      .toMatchObject({ ok: false, status: 400, code: 'RATIONALE_REQUIRED' })
  })

  it("is in the Archive for any firm viewer, under the account's client", () => {
    const r = resolve002()
    if (!r.ok) throw new Error(r.message)
    const archive = archiveFor(MARK, { kind: 'resolve_break' })
    expect(archive?.entries).toEqual([expect.objectContaining({ kind: 'act', id: r.act.id, partyId: 'cli-001', partyName: 'Robert Johnson' })])
  })
})

describe('the boundary and the quote', () => {
  it('is firm only', () => {
    expect(reconciliationView('cli-001')).toBeUndefined()
    expect(reconciliationView('prsp-011')).toBeUndefined()
  })

  it('quotes a break: the book, the custodian and the difference, with the file it came from', () => {
    const q = reconciliationQuote('brk-002')
    expect(q).toMatchObject({ view: 'reconciliation', subject: { type: 'recon_break', id: 'brk-002' }, threadTitle: 'Reconciliation · brk-002 · Johnson Family Trust' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Book', 'USD'], ['Schwab', 'USD'], ['Difference', 'USD']])
    expect(reconciliationQuote('brk-999')).toBeUndefined()
  })

  it('the hand-typed reconciliation surface is gone', () => {
    for (const path of ['src/mocks/handlers/reconciliation.ts', 'src/services/reconciliation.ts', 'src/hooks/use-reconciliation.ts', 'src/types/reconciliation.ts']) {
      expect(existsSync(path), path).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/reference/__tests__/reconciliation.test.ts --testTimeout 30000`
Expected: FAIL — `../reconciliation` does not exist.

- [ ] **Step 3: Types, the act kind, the permission, the Archive**

Create `src/types/reference-reconciliation.ts`:

```ts
import type { MethodNote } from './reference'

export type BreakField = 'cash_balance' | 'position_quantity' | 'market_value' | 'transaction_count'
export const BREAK_RESOLUTIONS = ['book_corrected', 'custodian_corrected', 'timing_difference'] as const
export type BreakResolution = (typeof BREAK_RESOLUTIONS)[number]
export const isBreakResolution = (value: unknown): value is BreakResolution =>
  typeof value === 'string' && (BREAK_RESOLUTIONS as readonly string[]).includes(value)
export const RESOLUTION_WORDS: Readonly<Record<BreakResolution, string>> = {
  book_corrected: 'Book corrected', custodian_corrected: 'Custodian corrected', timing_difference: 'Timing difference',
}

export type BreakUnit = 'USD' | 'sh' | 'count'
export type MatchKind = 'positions' | 'cash' | 'transactions'
export type IntegrationStatus = 'synced' | 'pending' | 'failed'

/** A break as recorded: the custodian's figure minus the book's. The book's side is read off the book. */
export type ReconBreakRecord = {
  id: string; accountId: string; field: BreakField; symbol?: string; custodianDelta: number; severity: 'low' | 'medium' | 'high'
  detectedAt: string
  /** Seeded history: when it was resolved, before this session. */
  resolvedBeforeSession?: string
}
export type IntegrationLogEntry = { integration: string; at: string; status: IntegrationStatus; detail: string }

export type ReconBreakView = {
  id: string; custodian: string; accountId: string; accountName: string; field: BreakField; fieldLabel: string; symbol?: string; unit: BreakUnit
  book: number; custodianValue: number; difference: number; severity: 'low' | 'medium' | 'high'; detectedAt: string; fingerprint: string
  status: 'open' | 'resolved'; resolvedAt?: string
  /** The binding act that resolved it in this session. */
  resolution?: { actId: string; actorName: string; resolution: BreakResolution; rationale: string }
}
export type MatchRate = { kind: MatchKind; checked: number; open: number; rate: number }
export type IntegrationView = { name: string; kind: 'custodian' | 'planning'; status: IntegrationStatus; lastSync?: string; openBreaks: number; log: IntegrationLogEntry[] }
export type ReconTrendPoint = { date: string; openBreaks: number; positions: number; cash: number; transactions: number }
export type ReconciliationView = {
  asOf: string
  summary: { openBreaks: number; resolvedToday: number; rates: MatchRate[] }
  breaks: ReconBreakView[]
  integrations: IntegrationView[]
  trend: ReconTrendPoint[]
  methods: MethodNote[]
}
export type ResolveBreakRequest = { breakId: string; fingerprint: string; resolution: BreakResolution; rationale: string }
```

In `src/types/workspace.ts`: add `import type { BreakResolution } from './reference-reconciliation'`; change `BindingActKind` to `'approve_proposal' | 'withdraw_approval' | 'send_to_party' | 'deliver_disclosure' | 'accept_proposal' | 'file_meeting_record' | 'resolve_break' | ComplianceActKind`; change `outcome?: AlertOutcome | CorrespondenceOutcome` to `outcome?: AlertOutcome | CorrespondenceOutcome | BreakResolution`.

In `src/mocks/data/people.ts` append `'resolve_break'` to the `advisor` and `csa` permission lists.

In `src/types/workspace-supervision.ts` add `'resolve_break'` to `ARCHIVE_KINDS` after `'file_meeting_record'`. In `src/workspace/thread/act-kind-label.ts` add `resolve_break: 'Resolve break',` after `file_meeting_record`.

In `src/mocks/workspace/archive.ts`: import `{ breakClientId } from '@/mocks/reference/reconciliation'`; in `partyIdOf` add before the final `return`:

```ts
  if (act.subject?.type === 'recon_break') return breakClientId(act.subject.id)
```

and in `archiveFor`'s `readable` replace `: act.kind === 'dispose_alert'` with `: act.kind === 'dispose_alert' || act.kind === 'resolve_break'` (both are recorded outside any thread and any firm viewer reads them).

Run `pnpm tsc -b --noEmit 2>&1 | head -40`: every `Record<BindingActKind, …>` or exhaustive switch it names gets `resolve_break` (only `ACT_KIND_LABEL` is expected).

- [ ] **Step 4: The seeded breaks and the integration log**

Create `src/mocks/data/reconciliation.ts`:

```ts
import type { IntegrationLogEntry, ReconBreakRecord } from '@/types/reference-reconciliation'

/**
 * Leaf data: each break states only how far the custodian's figure sat from the book's; the book's side is
 * read off the book at read time (R6). brk-002 is this morning's open break; the rest are seeded history,
 * resolved before the session, so the 30-day trend reads something real. Every account is a USD account
 * the story does not move.
 */
export const RECON_BREAKS: readonly ReconBreakRecord[] = [
  { id: 'brk-101', accountId: 'acc-011', field: 'cash_balance', custodianDelta: -310, severity: 'low', detectedAt: '2026-01-27T07:00:00Z', resolvedBeforeSession: '2026-01-27T16:05:00Z' },
  { id: 'brk-102', accountId: 'acc-007', field: 'market_value', custodianDelta: 2_400, severity: 'medium', detectedAt: '2026-02-03T07:00:00Z', resolvedBeforeSession: '2026-02-04T14:20:00Z' },
  { id: 'brk-103', accountId: 'acc-029', field: 'market_value', custodianDelta: -880, severity: 'low', detectedAt: '2026-02-09T07:00:00Z', resolvedBeforeSession: '2026-02-11T15:00:00Z' },
  { id: 'brk-104', accountId: 'acc-022', field: 'cash_balance', custodianDelta: 1_000, severity: 'medium', detectedAt: '2026-02-12T07:00:00Z', resolvedBeforeSession: '2026-02-12T18:30:00Z' },
  { id: 'brk-105', accountId: 'acc-045', field: 'market_value', custodianDelta: -1_150, severity: 'low', detectedAt: '2026-02-18T07:00:00Z', resolvedBeforeSession: '2026-02-19T15:40:00Z' },
  { id: 'brk-005', accountId: 'acc-014', field: 'market_value', custodianDelta: -1_250, severity: 'low', detectedAt: '2026-02-23T07:00:00Z', resolvedBeforeSession: '2026-02-23T08:20:00Z' },
  { id: 'brk-003', accountId: 'acc-006', field: 'position_quantity', symbol: 'EFA', custodianDelta: -20, severity: 'medium', detectedAt: '2026-02-24T07:00:00Z', resolvedBeforeSession: '2026-02-24T09:00:00Z' },
  { id: 'brk-004', accountId: 'acc-003', field: 'transaction_count', custodianDelta: -1, severity: 'low', detectedAt: '2026-02-24T07:00:00Z', resolvedBeforeSession: '2026-02-24T07:45:00Z' },
  { id: 'brk-002', accountId: 'acc-001', field: 'cash_balance', custodianDelta: -150, severity: 'medium', detectedAt: '2026-02-25T07:00:00Z' },
]

export const PLANNING_INTEGRATION = 'MoneyGuidePro'

/** Why each feed shows the sync time it does (R6). A feed outside the US syncs on its own market's close. */
export const INTEGRATION_LOG: readonly IntegrationLogEntry[] = [
  { integration: 'Schwab', at: '2026-02-24T07:00:00Z', status: 'synced', detail: 'Nightly positions, cash and transactions file for 23 Feb received and matched.' },
  { integration: 'Schwab', at: '2026-02-25T07:00:00Z', status: 'synced', detail: 'Nightly positions, cash and transactions file for 24 Feb received; one cash break raised (brk-002).' },
  { integration: 'Fidelity', at: '2026-02-25T07:00:00Z', status: 'synced', detail: 'Nightly file for 24 Feb received and matched.' },
  { integration: 'Vanguard', at: '2026-02-25T07:00:00Z', status: 'synced', detail: 'Nightly file for 24 Feb received and matched.' },
  { integration: 'HSBC', at: '2026-02-24T23:00:00Z', status: 'synced', detail: 'Hong Kong file for 24 Feb received overnight, after the Hong Kong close; it syncs hours before the US feeds.' },
  { integration: 'DBS', at: '2026-02-24T23:30:00Z', status: 'synced', detail: 'Singapore file for 24 Feb received overnight, after the Singapore close.' },
  { integration: 'UBS', at: '2026-02-25T05:00:00Z', status: 'synced', detail: 'Zurich file for 24 Feb received at the start of the European day.' },
  { integration: 'Coinbase', at: '2026-02-25T00:05:00Z', status: 'synced', detail: 'Balances snapshot at 00:00 UTC; digital assets trade every day, so the feed closes at midnight UTC.' },
  { integration: PLANNING_INTEGRATION, at: '2026-02-24T22:00:00Z', status: 'synced', detail: 'Plans synced.' },
  { integration: PLANNING_INTEGRATION, at: '2026-02-25T07:00:00Z', status: 'pending', detail: "Nightly export requested; MoneyGuidePro has not returned it (a delay on the provider's side). Planning figures stay as of the 24 Feb 22:00 UTC sync." },
]
```

- [ ] **Step 5: The reconciliation engine**

Create `src/mocks/reference/reconciliation.ts`:

```ts
import type { Account } from '@/types/account'
import type { BindingAct } from '@/types/workspace'
import type { MethodNote, RowQuote } from '@/types/reference'
import {
  RESOLUTION_WORDS, isBreakResolution,
  type BreakField, type BreakUnit, type IntegrationView, type MatchKind, type MatchRate, type ReconBreakRecord,
  type ReconBreakView, type ReconciliationView, type ReconTrendPoint, type ResolveBreakRequest,
} from '@/types/reference-reconciliation'
import { accounts } from '@/mocks/data/accounts'
import { can, personById } from '@/mocks/data/people'
import { cashBalanceOf, getPositionsForAccount } from '@/mocks/data/positions'
import { INTEGRATION_LOG, PLANNING_INTEGRATION, RECON_BREAKS } from '@/mocks/data/reconciliation'
import { commitActId, nextAt, sessionNow, store } from '@/mocks/data/workspace-store'
import { generateTransactions } from '@/mocks/handlers/custodian'
import { rationaleRefusal } from '@/mocks/workspace/compliance-acts'
import { recordAct } from '@/mocks/workspace/proposal-acts'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { fingerprint } from '@/lib/fingerprint'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'

export type ResolveFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
const refuse = (status: ResolveFailure['status'], code: string, message: string): ResolveFailure => ({ ok: false, status, code, message })

const FIELD: Readonly<Record<BreakField, { label: string; unit: BreakUnit; kind: MatchKind }>> = {
  cash_balance: { label: 'Cash balance', unit: 'USD', kind: 'cash' },
  position_quantity: { label: 'Position quantity', unit: 'sh', kind: 'positions' },
  market_value: { label: 'Market value', unit: 'USD', kind: 'positions' },
  transaction_count: { label: 'Transaction count', unit: 'count', kind: 'transactions' },
}
const MATCH_KINDS: readonly MatchKind[] = ['positions', 'cash', 'transactions']
const DAY_MS = 86_400_000

function accountOf(id: string): Account {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`A break names no account ${id}`)
  return account
}

/** The book's side of a break, read off the book as it stands. */
function bookSide(b: ReconBreakRecord, account: Account): number {
  switch (b.field) {
    case 'cash_balance': return cashBalanceOf(account)
    case 'market_value': return getPositionsForAccount(account.id, account.totalValue).reduce((s, p) => s + p.marketValue, 0)
    case 'transaction_count': return generateTransactions(account.id, account.totalValue).length
    case 'position_quantity': {
      const held = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === b.symbol)
      if (!held) throw new Error(`${b.id}: ${account.id} holds no ${b.symbol ?? '(no symbol)'}`)
      return held.quantity
    }
  }
}

function resolutionAct(breakId: string): BindingAct | undefined {
  return store().acts.find((a) => a.kind === 'resolve_break' && a.subject?.type === 'recon_break' && a.subject.id === breakId)
}

function resolutionOf(act: BindingAct): NonNullable<ReconBreakView['resolution']> {
  const actor = personById(act.actorId)
  if (!actor || !isBreakResolution(act.outcome) || act.rationale === undefined) throw new Error(`${act.id} is not a complete resolve_break act`)
  return { actId: act.id, actorName: actor.name, resolution: act.outcome, rationale: act.rationale }
}

function breakView(b: ReconBreakRecord): ReconBreakView {
  const account = accountOf(b.accountId)
  const field = FIELD[b.field]
  const book = bookSide(b, account)
  const custodianValue = book + b.custodianDelta
  const act = resolutionAct(b.id)
  const resolvedAt = act?.at ?? b.resolvedBeforeSession
  return {
    id: b.id, custodian: account.custodian, accountId: account.id, accountName: account.name, field: b.field, fieldLabel: field.label,
    ...(b.symbol ? { symbol: b.symbol } : {}),
    unit: field.unit, book, custodianValue, difference: b.custodianDelta, severity: b.severity, detectedAt: b.detectedAt,
    fingerprint: fingerprint([b.id, account.id, b.field, b.symbol ?? '', book, custodianValue].join('|')),
    status: resolvedAt ? 'resolved' : 'open',
    ...(resolvedAt ? { resolvedAt } : {}),
    ...(act ? { resolution: resolutionOf(act) } : {}),
  }
}

const isOpenAt = (b: ReconBreakView, instant: string) => b.detectedAt <= instant && (b.resolvedAt === undefined || b.resolvedAt > instant)

function checkedRecords(): Readonly<Record<MatchKind, number>> {
  return {
    positions: accounts.reduce((s, a) => s + getPositionsForAccount(a.id, a.totalValue).filter((p) => p.symbol !== 'CASH').length, 0),
    cash: accounts.length,
    transactions: accounts.reduce((s, a) => s + generateTransactions(a.id, a.totalValue).length, 0),
  }
}

function ratesFor(open: readonly ReconBreakView[], checked: Readonly<Record<MatchKind, number>>): MatchRate[] {
  return MATCH_KINDS.map((kind) => {
    const n = open.filter((b) => FIELD[b.field].kind === kind).length
    return { kind, checked: checked[kind], open: n, rate: (checked[kind] - n) / checked[kind] }
  })
}

const rateOf = (rates: readonly MatchRate[], kind: MatchKind) => {
  const found = rates.find((r) => r.kind === kind)
  if (!found) throw new Error(`No ${kind} match rate`)
  return found.rate
}

/** End-of-day open breaks for the 29 days before today, then today as it stands now. */
function trendOf(views: readonly ReconBreakView[], checked: Readonly<Record<MatchKind, number>>): ReconTrendPoint[] {
  const today = Date.parse(`${MOCK_TODAY_ISO}T00:00:00Z`)
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today - (29 - i) * DAY_MS).toISOString().slice(0, 10)
    const open = i === 29 ? views.filter((b) => b.status === 'open') : views.filter((b) => isOpenAt(b, `${date}T23:59:59.999Z`))
    const rates = ratesFor(open, checked)
    return { date, openBreaks: open.length, positions: rateOf(rates, 'positions'), cash: rateOf(rates, 'cash'), transactions: rateOf(rates, 'transactions') }
  })
}

function integrationsOf(views: readonly ReconBreakView[]): IntegrationView[] {
  const custodians = [...new Set(accounts.map((a) => a.custodian))].sort()
  const feeds = [...custodians.map((name) => ({ name, kind: 'custodian' as const })), { name: PLANNING_INTEGRATION, kind: 'planning' as const }]
  return feeds.map(({ name, kind }) => {
    const log = INTEGRATION_LOG.filter((e) => e.integration === name).sort((a, b) => a.at.localeCompare(b.at))
    const latest = log[log.length - 1]
    if (!latest) throw new Error(`Integration ${name} has no log`)
    const lastSync = [...log].reverse().find((e) => e.status === 'synced')?.at
    return { name, kind, status: latest.status, ...(lastSync ? { lastSync } : {}), openBreaks: views.filter((b) => b.status === 'open' && b.custodian === name).length, log }
  })
}

const METHODS: readonly MethodNote[] = [
  { label: 'Book and custodian', modeled: false, text: "A break records how far the custodian's figure sits from the book's. The book's side is read off the book: the cash position, the position's quantity, the positions' market value, or the count of the account's transaction stream." },
  { label: 'Match rates', modeled: false, text: "Checked records are every non-cash position in the book, one cash balance per account, and every account's transactions. A rate is the share of checked records with no open break." },
  { label: 'Trend', modeled: false, text: "End-of-day open breaks for each of the 29 days before today, from each break's detection and resolution times, then today's count as it stands now." },
  { label: 'Integrations', modeled: false, text: "Each feed's status and last sync come from its log. A feed outside the US syncs on its own market's close." },
  { label: 'Resolving', modeled: false, text: 'Resolving a break is a binding act by the advisor or client service, recorded in the Archive with its rationale. Nothing edits or deletes it.' },
]

export function reconciliationView(viewerId: string): ReconciliationView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const views = RECON_BREAKS.map(breakView).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || a.id.localeCompare(b.id))
  const checked = checkedRecords()
  const open = views.filter((b) => b.status === 'open')
  const day = sessionNow().slice(0, 10)
  return {
    asOf: MOCK_NOW_ISO,
    summary: { openBreaks: open.length, resolvedToday: views.filter((b) => b.resolvedAt?.slice(0, 10) === day).length, rates: ratesFor(open, checked) },
    breaks: views,
    integrations: integrationsOf(views),
    trend: trendOf(views, checked),
    methods: [...METHODS],
  }
}

/** R7 · the advisor or client service closes a break, once, against the figures they read. */
export function resolveBreak(viewerId: string, r: ResolveBreakRequest): { ok: true; act: BindingAct } | ResolveFailure {
  const record = RECON_BREAKS.find((b) => b.id === r.breakId)
  if (!record || !isFirmViewer(viewerId)) return refuse(404, 'NO_BREAK', 'Break not found.')
  if (!can(viewerId, 'resolve_break')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor or client service can resolve a break.')
  const badRationale = rationaleRefusal(r.rationale)
  if (badRationale) return badRationale
  if (!isBreakResolution(r.resolution)) return refuse(400, 'BAD_RESOLUTION', 'The resolution is book_corrected, custodian_corrected or timing_difference.')
  const earlier = resolutionAct(record.id)
  if (earlier) return refuse(409, 'ALREADY_RESOLVED', `${record.id} was already resolved (${earlier.id}).`)
  if (record.resolvedBeforeSession) return refuse(409, 'ALREADY_RESOLVED', `${record.id} was resolved before this session.`)
  const view = breakView(record)
  if (view.fingerprint !== r.fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', 'The break changed since you opened it. Open it again.')
  const act: BindingAct = {
    id: commitActId(), kind: 'resolve_break', actorId: viewerId, at: nextAt(), subject: { type: 'recon_break', id: record.id },
    fingerprint: r.fingerprint, rationale: r.rationale.trim(), outcome: r.resolution,
    summary: `Resolved ${record.id} · ${view.accountName} ${view.fieldLabel.toLowerCase()}: ${RESOLUTION_WORDS[r.resolution].toLowerCase()}`,
  }
  recordAct(act)
  return { ok: true, act }
}

/** The client whose account a break is about: the Archive files the act under them. */
export function breakClientId(breakId: string): string | undefined {
  const record = RECON_BREAKS.find((b) => b.id === breakId)
  return record ? accountOf(record.accountId).clientId : undefined
}

export function reconciliationQuote(breakId: string): RowQuote | undefined {
  const record = RECON_BREAKS.find((b) => b.id === breakId)
  if (!record) return undefined
  const b = breakView(record)
  const field = b.fieldLabel.toLowerCase()
  return {
    view: 'reconciliation', rowId: b.id, subject: { type: 'recon_break', id: b.id }, threadTitle: `Reconciliation · ${b.id} · ${b.accountName}`,
    claim: b.status === 'open'
      ? `${b.accountName}: the book's ${field} differs from ${b.custodian}'s.`
      : `${b.accountName}: the book's ${field} differed from ${b.custodian}'s; the break is resolved.`,
    figures: [
      { label: 'Book', value: b.book, unit: b.unit, source: 'reconciliation.breaks.book' },
      { label: b.custodian, value: b.custodianValue, unit: b.unit, source: 'reconciliation.breaks.custodianValue' },
      { label: 'Difference', value: b.difference, unit: b.unit, source: 'reconciliation.breaks.difference' },
    ],
    citations: [{ source: `Reconciliation · ${b.custodian} nightly file`, asOf: b.detectedAt }],
  }
}
```

- [ ] **Step 6: Delete the legacy reconciliation surface**

Delete `src/mocks/handlers/reconciliation.ts`, `src/services/reconciliation.ts`, `src/hooks/use-reconciliation.ts`, `src/types/reconciliation.ts` and `src/mocks/handlers/__tests__/reconciliation-invariants.test.ts` (its trailing-window assertions now live in the trend test above); remove `reconciliationHandlers` from `src/mocks/handlers/index.ts`.

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/mocks/reference src/mocks/workspace/__tests__/archive.test.ts src/mocks/data/__tests__/people.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): reconciliation engine — breaks read off the book, match rates from checked records, the integration log, resolve_break as a recorded act

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 3: Models — benchmarks named for what is computed, governance history with invariants, the attribution read model

The benchmark labels ("Barclays Agg", "MSCI ACWI", "Custom Blended", "Age-Based Glide") describe nothing the engine computes; each model's benchmark becomes its policy benchmark with a named index per sleeve (R8). The hand-typed governance history moves to a data module, gains invariant tests and loses its invented authors, its weekend dates and its past "pending" date (R9). The attribution read model wraps the existing Brinson-Fachler derivation with weights, periods, the benchmark and its modeled line (R12).

**Files:**
- Create: `src/types/reference-models.ts`, `src/types/reference-attribution.ts`, `src/mocks/data/model-governance.ts`, `src/mocks/reference/models.ts`, `src/mocks/reference/attribution.ts`, `src/mocks/reference/__tests__/models.test.ts`, `src/mocks/reference/__tests__/attribution.test.ts`
- Modify: `src/mocks/handlers/pms.ts` (`MODELS[].benchmark`, `MODEL_BANDS` exported, `Attribution.legs`, governance handler deleted), `src/services/pms.ts`, `src/hooks/use-portfolio.ts`, `src/types/portfolio.ts`, `src/services/__tests__/pms.test.ts`, `src/mocks/handlers/__tests__/{benchmark-identity,risk-invariants,attribution-invariants}.test.ts`
- Delete: `src/mocks/handlers/__tests__/model-governance-invariants.test.ts` (moved into `models.test.ts`)

**Interfaces:**
- Consumes: `MODEL_DEFINITIONS`, `attributionFor`, `periodReturnsFor`, `periodYears`, `performanceSeriesFor`, `computeDriftForAccount` (`@/mocks/handlers/pms`); `RISK_PROFILE_TABLE`, `RiskProfile` (`@/lib/risk-profile`); `portfolioVolatility` (`@/lib/risk-model`); `personById`.
- Produces:

```ts
// src/mocks/handlers/pms.ts
export const MODEL_BANDS: Readonly<Record<string, { driftTolerance: number; rebalanceFrequency: RebalanceFrequency }>>
type Attribution = { rows; legs: { assetClass: string; wp: number; wb: number; rp: number; rb: number }[]; totals; benchmarkReturn; benchmarkName }

// src/mocks/reference/models.ts
export const SLEEVE_INDEX: Readonly<Record<AssetClass, string>>
export function modelBenchmark(modelId: string): ModelBenchmark
export function modelVolatility(modelId: string): number
export function equityShareOf(modelId: string): number
export function modelsView(viewerId: string): ModelsView | undefined
export function modelDetail(viewerId: string, modelId: string): ModelDetail | undefined
export function modelQuote(rowId: string): RowQuote | undefined          // rowId 'mod-005' or 'mod-005:v3'

// src/mocks/reference/attribution.ts
export function attributionView(viewerId: string, accountId: string, period: AttributionPeriod): AttributionView | undefined
export function attributionQuote(rowId: string): RowQuote | undefined    // rowId 'acc-002:ytd:us_equity'

// src/types/reference-attribution.ts
export const ATTRIBUTION_PERIODS: readonly { id: AttributionPeriod; label: string }[]
export type AttributionPeriod = 'mtd' | 'qtd' | 'ytd' | '1y' | '3y' | '5y'
export const isAttributionPeriod: (value: unknown) => value is AttributionPeriod
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/reference/__tests__/models.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { personById } from '@/mocks/data/people'
import { MODEL_RISK_PROFILES, MODEL_VERSIONS } from '@/mocks/data/model-governance'
import { MODEL_DEFINITIONS } from '@/mocks/handlers/pms'
import { deriveBookAUM } from '@/lib/aum'
import { RISK_PROFILE_TABLE } from '@/lib/risk-profile'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTradingDay } from '@/lib/trading-calendar'
import { isExternalRole } from '@/lib/external-party'
import { equityShareOf, modelBenchmark, modelDetail, modelQuote, modelsView } from '../models'

const targetsOf = (modelId: string) => new Map((MODEL_DEFINITIONS.find((m) => m.id === modelId)?.assetClasses ?? []).map((a) => [a.assetClass, a.targetWeight]))
const versionsOf = (modelId: string) => MODEL_VERSIONS.filter((v) => v.modelId === modelId).sort((a, b) => a.version - b.version)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('benchmarks are named for what is computed', () => {
  it('each model has its policy benchmark; the 529 model its glide path', () => {
    expect(MODEL_DEFINITIONS.map((m) => [m.id, modelBenchmark(m.id).name, modelBenchmark(m.id).kind])).toEqual([
      ['mod-001', 'Balanced Growth policy benchmark', 'policy_blend'],
      ['mod-002', 'Growth policy benchmark', 'policy_blend'],
      ['mod-003', 'Conservative Income policy benchmark', 'policy_blend'],
      ['mod-004', 'Aggressive Growth policy benchmark', 'policy_blend'],
      ['mod-005', 'Ultra-HNW Multi-Strategy policy benchmark', 'policy_blend'],
      ['mod-006', 'Education 529 glide-path benchmark', 'glide_path'],
      ['mod-007', 'Moderate Balanced policy benchmark', 'policy_blend'],
    ])
  })

  it("holds every sleeve at the model's target weight, so its equity share is the model's", () => {
    for (const m of MODEL_DEFINITIONS) {
      const b = modelBenchmark(m.id)
      expect(new Map(b.components.map((c) => [c.assetClass, c.weight])), m.id).toEqual(new Map([...targetsOf(m.id)].filter(([, w]) => w > 0)))
      expect(b.components.reduce((s, c) => s + c.weight, 0), m.id).toBeCloseTo(1, 12)
      const equity = b.components.filter((c) => ['us_equity', 'intl_equity', 'emerging_markets'].includes(c.assetClass)).reduce((s, c) => s + c.weight, 0)
      expect(equity, m.id).toBeCloseTo(equityShareOf(m.id), 12)
    }
  })

  it('names the index each sleeve is measured by', () => {
    for (const m of MODEL_DEFINITIONS) {
      const index = (ac: string) => modelBenchmark(m.id).components.find((c) => c.assetClass === ac)?.index
      expect(index('fixed_income'), m.id).toBe('Bloomberg US Aggregate')
      expect(index('us_equity'), m.id).toBe('MSCI USA IMI')
      const hasEm = (targetsOf(m.id).get('emerging_markets') ?? 0) > 0
      expect(index('intl_equity'), m.id).toBe(hasEm ? 'MSCI EAFE' : 'MSCI ACWI ex USA IMI')
    }
  })

  it('no stale or invented benchmark label survives in the engine', () => {
    const pms = readFileSync('src/mocks/handlers/pms.ts', 'utf8')
    expect(pms).not.toMatch(/Barclays|Custom Blended|Age-Based Glide|Model policy blend|benchmark: 'MSCI ACWI'/)
  })
})

describe('governance history', () => {
  it("every version's targets sum to one", () => {
    for (const v of MODEL_VERSIONS) expect(v.targets.reduce((s, t) => s + t.targetWeight, 0), `${v.modelId} v${v.version}`).toBeCloseTo(1, 12)
  })

  it('versions run one, two, three…; the current version is the latest approved one and its targets are the model\'s', () => {
    for (const m of MODEL_DEFINITIONS) {
      const versions = versionsOf(m.id)
      expect(versions.map((v) => v.version), m.id).toEqual(versions.map((_, i) => i + 1))
      const approved = versions.filter((v) => v.status === 'approved')
      const current = approved[approved.length - 1]
      expect(new Map(current?.targets.map((t) => [t.assetClass, t.targetWeight])), m.id).toEqual(targetsOf(m.id))
      expect(modelsView('user-001')?.models.find((x) => x.id === m.id)?.currentVersion, m.id).toBe(current?.version)
      for (const pending of versions.filter((v) => v.status === 'pending_approval')) expect(pending.version, m.id).toBeGreaterThan(current?.version ?? 0)
    }
  })

  it('an approved version took effect by today, after its approval, both on trading days; a pending one takes effect later', () => {
    for (const v of MODEL_VERSIONS) {
      const label = `${v.modelId} v${v.version}`
      expect(isTradingDay(v.effectiveDate), label).toBe(true)
      if (v.status === 'approved') {
        expect(v.effectiveDate <= MOCK_TODAY_ISO, label).toBe(true)
        expect(v.approvedOn && isTradingDay(v.approvedOn), label).toBe(true)
        expect((v.approvedOn ?? '') <= v.effectiveDate, label).toBe(true)
      } else {
        expect(v.effectiveDate > MOCK_TODAY_ISO, label).toBe(true)
        expect(v.approvedOn, label).toBeUndefined()
      }
    }
    expect(MODEL_VERSIONS.find((v) => v.modelId === 'mod-005' && v.version === 3)).toMatchObject({ status: 'pending_approval', effectiveDate: '2026-04-01' })
  })

  it("each version's weight changes are exactly the difference from the version before", () => {
    for (const m of MODEL_DEFINITIONS) {
      const versions = versionsOf(m.id)
      for (let i = 1; i < versions.length; i++) {
        const [prev, next] = [versions[i - 1]!, versions[i]!]
        const before = new Map<string, number>(prev.targets.map((t) => [t.assetClass, t.targetWeight]))
        const after = new Map<string, number>(next.targets.map((t) => [t.assetClass, t.targetWeight]))
        const moved = [...new Set([...before.keys(), ...after.keys()])].filter((ac) => (before.get(ac) ?? 0) !== (after.get(ac) ?? 0)).sort()
        const changes = next.changes.filter((c) => c.type === 'weight_change')
        expect(changes.map((c) => c.assetClass).sort(), `${m.id} v${next.version}`).toEqual(moved)
        for (const c of changes) {
          expect(c.oldValue, `${m.id} v${next.version} ${c.assetClass}`).toBe(before.get(c.assetClass ?? '') ?? 0)
          expect(c.newValue, `${m.id} v${next.version} ${c.assetClass}`).toBe(after.get(c.assetClass ?? '') ?? 0)
        }
      }
    }
  })

  it('is proposed by a firm person and approved by the Investment Committee; the invented authors are gone', () => {
    for (const v of MODEL_VERSIONS) {
      const person = personById(v.proposedBy)
      expect(person && !isExternalRole(person.role), `${v.modelId} v${v.version}`).toBe(true)
      if (v.status === 'approved') expect(v.approvedBy).toBe('Investment Committee')
    }
    for (const file of sourceFiles('src')) expect(readFileSync(file, 'utf8'), file).not.toMatch(/Sarah Kim|David Park/)
  })

  it("each model's risk profile is the band that names it in the firm's table", () => {
    for (const band of RISK_PROFILE_TABLE) expect(MODEL_RISK_PROFILES[band.modelId], band.modelId).toBe(band.profile)
  })
})

describe('models in the book', () => {
  it('assigned accounts and value reconcile to the accounts that carry each model, in USD', () => {
    const models = modelsView('user-001')?.models ?? []
    expect(models.reduce((s, m) => s + m.assignedAccounts, 0)).toBe(accounts.filter((a) => a.modelId).length)
    for (const m of models) {
      const own = accounts.filter((a) => a.modelId === m.id)
      expect(m.assignedAccounts, m.id).toBe(own.length)
      expect(m.totalValue, m.id).toBeCloseTo(deriveBookAUM(own, FX_RATES_USD_BASE), 4)
    }
  })

  it("a model's detail lists its targets with vehicles and indexes, its history and its accounts", () => {
    const detail = modelDetail('user-001', 'mod-005')
    expect(detail?.targets.find((t) => t.assetClass === 'alternatives')).toMatchObject({ targetWeight: 0.15, implementationSymbol: 'QAI', index: 'HFRX Global Hedge Fund' })
    expect(detail?.versions.map((v) => [v.version, v.status, v.proposedByName])).toEqual([[1, 'approved', 'Mike Chen'], [2, 'approved', 'Mike Chen'], [3, 'pending_approval', 'Mike Chen']])
    expect(detail?.pendingVersion).toEqual({ version: 3, effectiveDate: '2026-04-01' })
    expect(detail?.accounts.map((a) => a.accountId)).toEqual(accounts.filter((a) => a.modelId === 'mod-005').map((a) => a.id))
    expect(modelDetail('user-001', 'mod-999')).toBeUndefined()
  })

  it('is firm only, states its methods, and quotes a model and a version', () => {
    expect(modelsView('cli-001')).toBeUndefined()
    expect(modelDetail('prsp-011', 'mod-001')).toBeUndefined()
    expect(modelsView('user-001')?.methods.filter((n) => n.modeled).map((n) => n.label)).toEqual(['Volatility'])
    const model = modelQuote('mod-002')
    expect(model).toMatchObject({ view: 'models', subject: { type: 'model', id: 'mod-002' }, threadTitle: 'Model · Growth' })
    const version = modelQuote('mod-005:v3')
    expect(version?.claim).toBe('A pending version of Ultra-HNW Multi-Strategy changes its alternatives and fixed income targets.')
    expect(version?.figures.map((f) => [f.label, f.unit])).toEqual([['Alternatives target', 'pp'], ['Fixed Income target', 'pp']])
    expect(modelQuote('mod-005:v9')).toBeUndefined()
    expect(modelQuote('mod-999')).toBeUndefined()
  })
})
```

Create `src/mocks/reference/__tests__/attribution.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { ATTRIBUTION_PERIODS } from '@/types/reference-attribution'
import { attributionQuote, attributionView } from '../attribution'

const view = (accountId = 'acc-002', period: (typeof ATTRIBUTION_PERIODS)[number]['id'] = 'ytd') => {
  const v = attributionView('user-001', accountId, period)
  if (!v) throw new Error(`no attribution for ${accountId}`)
  return v
}

describe('the attribution read model', () => {
  it('offers six periods; inception, a hand-typed length, is not one', () => {
    expect(view().periods.map((p) => p.id)).toEqual(['mtd', 'qtd', 'ytd', '1y', '3y', '5y'])
  })

  it('reconciles exactly for every period: Σ(A + S + I) is the active return, and Rp − Rb too', () => {
    for (const { id } of ATTRIBUTION_PERIODS) {
      const v = view('acc-002', id)
      const sum = v.rows.reduce((s, r) => s + r.allocation + r.selection + r.interaction, 0)
      expect(sum, id).toBeCloseTo(v.totals.total, 6)
      expect(v.activeReturn, id).toBeCloseTo(v.totals.total, 4)
      expect(v.portfolioReturn - v.benchmarkReturn, id).toBeCloseTo(v.activeReturn, 8)
    }
  })

  it("carries both weight sets, each summing to one, and the benchmark's components", () => {
    const v = view()
    expect(v.rows.reduce((s, r) => s + r.portfolioWeight, 0)).toBeCloseTo(1, 9)
    expect(v.rows.reduce((s, r) => s + r.benchmarkWeight, 0)).toBeCloseTo(1, 9)
    expect(v.benchmark.name).toBe('Growth policy benchmark')
    expect(v).toMatchObject({ accountName: 'Robert Johnson Individual', modelName: 'Growth' })
  })

  it("draws the line from the account's modeled series, ending today; one benchmark line per model", () => {
    const v = view()
    expect(v.series).toHaveLength(25)
    expect(v.series.at(-1)?.date).toBe(MOCK_TODAY_ISO)
    expect(view('acc-011').series.map((p) => p.benchmark)).toEqual(view('acc-040').series.map((p) => p.benchmark))
  })

  it("reflects the moved book: after the release acc-002's weights change", () => {
    const before = view().rows.map((r) => [r.assetClass, r.portfolioWeight])
    release(approvedV1())
    expect(view().rows.map((r) => [r.assetClass, r.portfolioWeight])).not.toEqual(before)
  })

  it('states its caption as methods: Brinson-Fachler, single period, arithmetic, modeled returns', () => {
    const notes = view().methods
    expect(notes.map((n) => n.label)).toEqual(['Model', 'Linking', 'Returns', 'Benchmark', 'Performance line', 'Fees'])
    expect(notes.filter((n) => n.modeled).map((n) => n.label)).toEqual(['Returns', 'Performance line'])
  })

  it('is firm only and knows only real accounts', () => {
    expect(attributionView('cli-001', 'acc-002', 'ytd')).toBeUndefined()
    expect(attributionView('prsp-011', 'acc-002', 'ytd')).toBeUndefined()
    expect(attributionView('user-001', 'acc-999', 'ytd')).toBeUndefined()
  })

  it('quotes an asset-class row: its three effects, in percentage points', () => {
    const q = attributionQuote('acc-002:ytd:us_equity')
    expect(q).toMatchObject({ view: 'attribution', subject: { type: 'account', id: 'acc-002' }, threadTitle: 'Attribution · Robert Johnson Individual' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Allocation', 'pp'], ['Selection', 'pp'], ['Interaction', 'pp'], ['Total', 'pp']])
    expect(attributionQuote('acc-002:inception:us_equity')).toBeUndefined()
    expect(attributionQuote('acc-002:ytd:collectibles')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/reference/__tests__/models.test.ts src/mocks/reference/__tests__/attribution.test.ts --testTimeout 30000`
Expected: FAIL — the modules do not exist.

- [ ] **Step 3: Types**

Create `src/types/reference-models.ts`:

```ts
import type { AssetClass } from './portfolio'
import type { RiskProfile } from '@/lib/risk-profile'
import type { MethodNote } from './reference'

export type BenchmarkComponent = { assetClass: AssetClass; index: string; weight: number }
export type ModelBenchmark = { name: string; kind: 'policy_blend' | 'glide_path'; components: BenchmarkComponent[] }
export type ModelTarget = { assetClass: AssetClass; targetWeight: number }
export type ModelChange = { id: string; type: 'weight_change' | 'security_add' | 'description_change'; description: string; assetClass?: AssetClass; oldValue?: number; newValue?: number }
export type ModelVersionRecord = {
  modelId: string; version: number; status: 'approved' | 'pending_approval'
  /** A firm person's id. */
  proposedBy: string
  approvedBy?: 'Investment Committee'; approvedOn?: string
  effectiveDate: string; changes: ModelChange[]; targets: ModelTarget[]
}
export type ModelSummary = {
  id: string; name: string; description: string; riskProfile: RiskProfile; riskLabel: string; benchmark: ModelBenchmark; equityShare: number
  currentVersion: number; pendingVersion?: { version: number; effectiveDate: string }
  assignedAccounts: number; totalValue: number; driftTolerance: number; rebalanceFrequency: string; volatility: number
}
export type ModelVersionView = ModelVersionRecord & { proposedByName: string }
export type ModelAccountRow = { accountId: string; accountName: string; clientName: string; value: number; maxAbsDrift: number; withinBand: boolean }
export type ModelDetail = ModelSummary & {
  asOf: string
  targets: (ModelTarget & { implementationSymbol?: string; index: string })[]
  versions: ModelVersionView[]; accounts: ModelAccountRow[]; methods: MethodNote[]
}
export type ModelsView = { asOf: string; models: ModelSummary[]; methods: MethodNote[] }
```

Create `src/types/reference-attribution.ts`:

```ts
import type { AssetClass } from './portfolio'
import type { MethodNote } from './reference'
import type { ModelBenchmark } from './reference-models'

export const ATTRIBUTION_PERIODS = [
  { id: 'mtd', label: 'Month to date' }, { id: 'qtd', label: 'Quarter to date' }, { id: 'ytd', label: 'Year to date' },
  { id: '1y', label: 'One year' }, { id: '3y', label: 'Three years' }, { id: '5y', label: 'Five years' },
] as const
export type AttributionPeriod = (typeof ATTRIBUTION_PERIODS)[number]['id']
export const isAttributionPeriod = (value: unknown): value is AttributionPeriod => ATTRIBUTION_PERIODS.some((p) => p.id === value)

export type AttributionRow = {
  assetClass: AssetClass; portfolioWeight: number; benchmarkWeight: number; portfolioReturn: number; benchmarkReturn: number
  allocation: number; selection: number; interaction: number; total: number
}
export type AttributionView = {
  asOf: string; accountId: string; accountName: string; modelId: string; modelName: string; benchmark: ModelBenchmark
  period: AttributionPeriod; periods: { id: AttributionPeriod; label: string }[]
  portfolioReturn: number; benchmarkReturn: number; activeReturn: number
  rows: AttributionRow[]; totals: { allocation: number; selection: number; interaction: number; total: number }
  series: { date: string; portfolio: number; benchmark: number }[]
  methods: MethodNote[]
}
```

- [ ] **Step 4: pms — benchmark names, exported bands, attribution legs; the governance endpoint goes**

In `src/mocks/handlers/pms.ts`:

1. Replace each model's `benchmark` string: mod-001 `'Balanced Growth policy benchmark'`, mod-002 `'Growth policy benchmark'`, mod-003 `'Conservative Income policy benchmark'`, mod-004 `'Aggressive Growth policy benchmark'`, mod-005 `'Ultra-HNW Multi-Strategy policy benchmark'`, mod-006 `'Education 529 glide-path benchmark'`, mod-007 `'Moderate Balanced policy benchmark'` (`benchmarkKind` stays `'model_policy'`). Append to the §9.4 comment above `MODELS`: `Phase 7a · R8 — each label is now the model's policy benchmark: every sleeve at its target weight, measured by the index named for it in src/mocks/reference/models.ts.`
2. `export const MODEL_BANDS` (was `const`).
3. Add `legs` to `Attribution`:

```ts
type Attribution = {
  rows: AttributionResult[]
  /** The same classes as `rows`, in order: the weights and the period returns each effect is computed from. */
  legs: { assetClass: string; wp: number; wb: number; rp: number; rb: number }[]
  totals: { allocation: number; selection: number; interaction: number; total: number }
  benchmarkReturn: number
  benchmarkName: string
}
```

and change `attributionFor`'s last line to `return { rows, legs, totals, benchmarkReturn, benchmarkName: p.benchmarkName }`.
4. Delete the `/api/pms/models/governance` handler. In `src/services/pms.ts` delete `getModelGovernance` and the `ModelGovernanceDetail` import; in `src/hooks/use-portfolio.ts` delete `useModelGovernance`; in `src/types/portfolio.ts` delete `ModelChangeType`, `ModelChangeEntry`, `ModelVersion` and `ModelGovernanceDetail` and their export entries; in `src/services/__tests__/pms.test.ts` delete the `getModelGovernance` import and its `describe`; delete `src/mocks/handlers/__tests__/model-governance-invariants.test.ts`.
5. Update the pinned names: in `benchmark-identity.test.ts` the second test becomes `it('the label names the policy benchmark, so the number and its name agree', …)` with `expect(growth!.benchmark).toBe('Growth policy benchmark')`; in `risk-invariants.test.ts:83` and `attribution-invariants.test.ts:123` expect `'Balanced Growth policy benchmark'`.

- [ ] **Step 5: The governance history as data**

Create `src/mocks/data/model-governance.ts`:

```ts
import type { ModelVersionRecord } from '@/types/reference-models'
import type { RiskProfile } from '@/lib/risk-profile'

/**
 * Seeded Investment Committee history (R9). Every version was proposed by the analyst, Mike Chen
 * (`user-003`), and approved by the committee. Dates are NYSE trading days; the one pending version
 * takes effect after today. Phase 7a moved four dates off weekends and holidays (2025-01-01, 2025-06-01,
 * 2025-09-01 and 2025-11-01), gave mod-005 v2 its missing US equity change and replaced its "private
 * equity sleeve (BXPE)" line, which the model never held, with the QAI sleeve it does.
 */
const MIKE = 'user-003'
const IC = 'Investment Committee' as const
const initial = (id: string) => [{ id, type: 'description_change' as const, description: 'Initial model creation' }]

export const MODEL_VERSIONS: readonly ModelVersionRecord[] = [
  { modelId: 'mod-001', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-005'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.38 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.28 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.07 },
  ] },
  { modelId: 'mod-001', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-06-27', effectiveDate: '2025-07-01', changes: [
    { id: 'chg-003', type: 'weight_change', description: 'Increased US equity from 38% to 40%', assetClass: 'us_equity', oldValue: 0.38, newValue: 0.40 },
    { id: 'chg-004', type: 'weight_change', description: 'Reduced cash from 7% to 5%', assetClass: 'cash', oldValue: 0.07, newValue: 0.05 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.28 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-001', version: 3, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2026-01-14', effectiveDate: '2026-01-15', changes: [
    { id: 'chg-001', type: 'weight_change', description: 'Reduced emerging markets from 5% to 3%', assetClass: 'emerging_markets', oldValue: 0.05, newValue: 0.03 },
    { id: 'chg-002', type: 'weight_change', description: 'Increased fixed income from 28% to 30%', assetClass: 'fixed_income', oldValue: 0.28, newValue: 0.30 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.03 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-002', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-008'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.58 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.03 },
  ] },
  { modelId: 'mod-002', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-09-25', effectiveDate: '2025-10-01', changes: [
    { id: 'chg-006', type: 'weight_change', description: 'Increased international equity from 12% to 15%', assetClass: 'intl_equity', oldValue: 0.12, newValue: 0.15 },
    { id: 'chg-007', type: 'weight_change', description: 'Reduced US equity from 58% to 55%', assetClass: 'us_equity', oldValue: 0.58, newValue: 0.55 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.55 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.03 },
  ] },
  { modelId: 'mod-003', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-011'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.25 }, { assetClass: 'intl_equity', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.50 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
  ] },
  { modelId: 'mod-003', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-08-27', effectiveDate: '2025-09-02', changes: [
    { id: 'chg-009', type: 'weight_change', description: 'Increased fixed income from 50% to 55%', assetClass: 'fixed_income', oldValue: 0.50, newValue: 0.55 },
    { id: 'chg-010', type: 'weight_change', description: 'Reduced US equity from 25% to 20%', assetClass: 'us_equity', oldValue: 0.25, newValue: 0.20 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.20 }, { assetClass: 'intl_equity', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.55 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
  ] },
  { modelId: 'mod-004', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-012'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.50 }, { assetClass: 'intl_equity', targetWeight: 0.20 }, { assetClass: 'emerging_markets', targetWeight: 0.10 },
    { assetClass: 'fixed_income', targetWeight: 0.10 }, { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-005', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-017'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
    { assetClass: 'alternatives', targetWeight: 0.10 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-005', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-05-28', effectiveDate: '2025-06-02', changes: [
    { id: 'chg-015', type: 'security_add', description: 'Added a hedge-fund replication sleeve (QAI) to alternatives', assetClass: 'alternatives' },
    { id: 'chg-016', type: 'weight_change', description: 'Increased alternatives from 10% to 15%', assetClass: 'alternatives', oldValue: 0.10, newValue: 0.15 },
    { id: 'chg-022', type: 'weight_change', description: 'Reduced US equity from 40% to 35%', assetClass: 'us_equity', oldValue: 0.40, newValue: 0.35 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
    { assetClass: 'alternatives', targetWeight: 0.15 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-005', version: 3, status: 'pending_approval', proposedBy: MIKE, effectiveDate: '2026-04-01', changes: [
    { id: 'chg-013', type: 'weight_change', description: 'Proposed increase in alternatives from 15% to 18%', assetClass: 'alternatives', oldValue: 0.15, newValue: 0.18 },
    { id: 'chg-014', type: 'weight_change', description: 'Proposed reduction in fixed income from 20% to 17%', assetClass: 'fixed_income', oldValue: 0.20, newValue: 0.17 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.17 },
    { assetClass: 'alternatives', targetWeight: 0.18 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-006', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-018'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.45 }, { assetClass: 'intl_equity', targetWeight: 0.10 }, { assetClass: 'fixed_income', targetWeight: 0.35 }, { assetClass: 'cash', targetWeight: 0.10 },
  ] },
  { modelId: 'mod-007', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-021'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.10 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-007', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-10-28', effectiveDate: '2025-11-03', changes: [
    { id: 'chg-019', type: 'weight_change', description: 'Increased fixed income from 30% to 35%', assetClass: 'fixed_income', oldValue: 0.30, newValue: 0.35 },
    { id: 'chg-020', type: 'weight_change', description: 'Reduced US equity from 40% to 35%', assetClass: 'us_equity', oldValue: 0.40, newValue: 0.35 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.10 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.35 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
]

/** Each model's risk profile; the firm's risk-profile table names five of them for its bands. */
export const MODEL_RISK_PROFILES: Readonly<Record<string, RiskProfile>> = {
  'mod-001': 'moderate', 'mod-002': 'moderate_aggressive', 'mod-003': 'conservative', 'mod-004': 'aggressive',
  'mod-005': 'moderate_aggressive', 'mod-006': 'moderate', 'mod-007': 'moderate_conservative',
}

/** The education model's benchmark is its glide path at the current stage (R8). */
export const GLIDE_PATH_MODELS: ReadonlySet<string> = new Set(['mod-006'])
```

- [ ] **Step 6: The models engine**

Create `src/mocks/reference/models.ts`:

```ts
import type { AssetClass } from '@/types/portfolio'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { ModelBenchmark, ModelDetail, ModelSummary, ModelsView, ModelTarget, ModelVersionRecord } from '@/types/reference-models'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { personById } from '@/mocks/data/people'
import { GLIDE_PATH_MODELS, MODEL_RISK_PROFILES, MODEL_VERSIONS } from '@/mocks/data/model-governance'
import { MODEL_BANDS, MODEL_DEFINITIONS, computeDriftForAccount } from '@/mocks/handlers/pms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { accountValueUSD, deriveBookAUM } from '@/lib/aum'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { portfolioVolatility } from '@/lib/risk-model'
import { RISK_PROFILE_TABLE } from '@/lib/risk-profile'
import { MOCK_NOW_ISO } from '@/lib/clock'

/** The index each sleeve is measured by (R8). International equity depends on whether the model carries a separate emerging-markets sleeve. */
export const SLEEVE_INDEX: Readonly<Record<AssetClass, string>> = {
  us_equity: 'MSCI USA IMI', intl_equity: 'MSCI EAFE', emerging_markets: 'MSCI Emerging Markets', fixed_income: 'Bloomberg US Aggregate',
  alternatives: 'HFRX Global Hedge Fund', real_estate: 'MSCI US IMI Real Estate 25/50', commodities: 'LBMA Gold Price PM',
  cash: 'ICE BofA US 3-Month Treasury Bill', digital_assets: 'CME CF Bitcoin Reference Rate', private_equity: 'Cambridge Associates US Private Equity',
}
const INTL_WITH_EMERGING_INSIDE = 'MSCI ACWI ex USA IMI'
const EQUITY: ReadonlySet<string> = new Set(['us_equity', 'intl_equity', 'emerging_markets'])
const isAssetClass = (value: string): value is AssetClass => value in SLEEVE_INDEX

function definition(modelId: string) {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`No model ${modelId}`)
  return model
}

function targetsOf(modelId: string): ModelTarget[] {
  return definition(modelId).assetClasses.filter((a) => a.targetWeight > 0).map((a) => {
    if (!isAssetClass(a.assetClass)) throw new Error(`${modelId} targets an unknown asset class ${a.assetClass}`)
    return { assetClass: a.assetClass, targetWeight: a.targetWeight }
  })
}

const hasEmergingSleeve = (modelId: string) => targetsOf(modelId).some((t) => t.assetClass === 'emerging_markets')
const indexFor = (modelId: string, assetClass: AssetClass) =>
  assetClass === 'intl_equity' && !hasEmergingSleeve(modelId) ? INTL_WITH_EMERGING_INSIDE : SLEEVE_INDEX[assetClass]

export function modelBenchmark(modelId: string): ModelBenchmark {
  return {
    name: definition(modelId).benchmark,
    kind: GLIDE_PATH_MODELS.has(modelId) ? 'glide_path' : 'policy_blend',
    components: targetsOf(modelId).map((t) => ({ assetClass: t.assetClass, index: indexFor(modelId, t.assetClass), weight: t.targetWeight })),
  }
}

export const modelVolatility = (modelId: string): number => portfolioVolatility(new Map(targetsOf(modelId).map((t) => [t.assetClass, t.targetWeight])))
export const equityShareOf = (modelId: string): number => targetsOf(modelId).filter((t) => EQUITY.has(t.assetClass)).reduce((s, t) => s + t.targetWeight, 0)

const versionsOf = (modelId: string): ModelVersionRecord[] => MODEL_VERSIONS.filter((v) => v.modelId === modelId).sort((a, b) => a.version - b.version)

function summaryOf(modelId: string): ModelSummary {
  const model = definition(modelId)
  const versions = versionsOf(modelId)
  const current = versions.filter((v) => v.status === 'approved').at(-1)
  if (!current) throw new Error(`${modelId} has no approved version`)
  const pending = versions.find((v) => v.status === 'pending_approval')
  const riskProfile = MODEL_RISK_PROFILES[modelId]
  const band = MODEL_BANDS[modelId]
  const riskLabel = RISK_PROFILE_TABLE.find((b) => b.profile === riskProfile)?.label
  if (!riskProfile || !band || !riskLabel) throw new Error(`${modelId} has no risk profile or drift band`)
  const own = accounts.filter((a) => a.modelId === modelId)
  return {
    id: model.id, name: model.name, description: model.description, riskProfile, riskLabel, benchmark: modelBenchmark(modelId), equityShare: equityShareOf(modelId),
    currentVersion: current.version, ...(pending ? { pendingVersion: { version: pending.version, effectiveDate: pending.effectiveDate } } : {}),
    assignedAccounts: own.length, totalValue: deriveBookAUM(own, FX_RATES_USD_BASE),
    driftTolerance: band.driftTolerance, rebalanceFrequency: band.rebalanceFrequency, volatility: modelVolatility(modelId),
  }
}

const METHODS: readonly MethodNote[] = [
  { label: 'Benchmarks', modeled: false, text: "Each model's policy benchmark holds every sleeve at the model's target weight, each sleeve measured by the index named for it. The education model's benchmark is its glide path at the current stage." },
  { label: 'History', modeled: false, text: "The firm's record of Investment Committee decisions: each version proposed by the analyst and approved by the committee, with the weights it set. A pending version takes effect only once approved. Read-only here." },
  { label: 'Assigned value', modeled: false, text: "Accounts on each model and their value today, from the book; an account held in another currency is converted at today's exchange rate." },
  { label: 'Volatility', modeled: true, text: "Modeled, not realized: the standard deviation of the target weights from the firm's asset-class volatility assumptions, with a 0.35 correlation between classes." },
]

export function modelsView(viewerId: string): ModelsView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  return { asOf: MOCK_NOW_ISO, models: MODEL_DEFINITIONS.map((m) => summaryOf(m.id)), methods: [...METHODS] }
}

export function modelDetail(viewerId: string, modelId: string): ModelDetail | undefined {
  if (!isFirmViewer(viewerId) || !MODEL_DEFINITIONS.some((m) => m.id === modelId)) return undefined
  const model = definition(modelId)
  return {
    ...summaryOf(modelId),
    asOf: MOCK_NOW_ISO,
    targets: targetsOf(modelId).map((t) => {
      const symbol = model.assetClasses.find((a) => a.assetClass === t.assetClass)?.implementationSymbol
      return { ...t, ...(symbol ? { implementationSymbol: symbol } : {}), index: indexFor(modelId, t.assetClass) }
    }),
    versions: versionsOf(modelId).map((v) => {
      const person = personById(v.proposedBy)
      if (!person) throw new Error(`${modelId} v${v.version} names no proposer`)
      return { ...v, proposedByName: person.name }
    }),
    accounts: accounts.filter((a) => a.modelId === modelId).map((a) => {
      const drift = computeDriftForAccount(a)
      const client = clients.find((c) => c.id === a.clientId)
      if (!client) throw new Error(`${a.id} names no client`)
      return { accountId: a.id, accountName: a.name, clientName: client.fullName, value: accountValueUSD(a, FX_RATES_USD_BASE), maxAbsDrift: drift.maxAbsDrift, withinBand: !drift.needsRebalance }
    }),
    methods: [...METHODS],
  }
}

const listOfClasses = (classes: readonly string[]) =>
  classes.length <= 1 ? classes.join('') : `${classes.slice(0, -1).join(', ')} and ${classes[classes.length - 1] ?? ''}`

export function modelQuote(rowId: string): RowQuote | undefined {
  const [modelId, versionPart] = rowId.split(':')
  if (!modelId || !MODEL_DEFINITIONS.some((m) => m.id === modelId)) return undefined
  const summary = summaryOf(modelId)
  const base = { view: 'models' as const, rowId, subject: { type: 'model' as const, id: modelId }, threadTitle: `Model · ${summary.name}` }
  if (versionPart === undefined) {
    return {
      ...base,
      claim: `${summary.name} and the accounts that follow it, against the ${summary.benchmark.name}.`,
      figures: [
        { label: 'Accounts', value: summary.assignedAccounts, unit: 'count', source: 'models.assignedAccounts' },
        { label: 'Value today', value: summary.totalValue, unit: 'USD', source: 'models.totalValue' },
        { label: 'Equity share', value: summary.equityShare, unit: '%', source: 'models.equityShare' },
      ],
      citations: [{ source: `Models · ${summary.name}, current version`, asOf: MOCK_NOW_ISO }],
    }
  }
  const version = versionsOf(modelId).find((v) => `v${v.version}` === versionPart)
  if (!version) return undefined
  const weights = version.changes.filter((c) => c.type === 'weight_change' && c.assetClass && c.oldValue !== undefined && c.newValue !== undefined)
  const classes = weights.map((c) => (ASSET_CLASS_LABELS[c.assetClass ?? ''] ?? '').toLowerCase())
  const state = version.status === 'pending_approval' ? 'A pending version' : 'An approved version'
  return {
    ...base,
    claim: weights.length > 0
      ? `${state} of ${summary.name} ${version.status === 'pending_approval' ? 'changes' : 'changed'} its ${listOfClasses(classes)} targets.`
      : `${state} of ${summary.name}: ${version.changes.map((c) => c.description).join('; ')}.`,
    figures: weights.map((c) => ({ label: `${ASSET_CLASS_LABELS[c.assetClass ?? '']} target`, value: (c.newValue ?? 0) - (c.oldValue ?? 0), unit: 'pp' as const, source: 'models.versions.changes' })),
    citations: [{ source: `Models · Investment Committee record, ${summary.name}`, asOf: version.approvedOn ?? version.effectiveDate }],
  }
}
```

(The version claim with no weight change is the "Initial model creation" line; it carries no figure.)

- [ ] **Step 7: The attribution read model**

Create `src/mocks/reference/attribution.ts`:

```ts
import type { Account } from '@/types/account'
import type { AssetClass } from '@/types/portfolio'
import type { MethodNote, RowQuote } from '@/types/reference'
import { ATTRIBUTION_PERIODS, isAttributionPeriod, type AttributionPeriod, type AttributionView } from '@/types/reference-attribution'
import { accounts } from '@/mocks/data/accounts'
import { MODEL_DEFINITIONS, attributionFor, performanceSeriesFor, periodReturnsFor, periodYears } from '@/mocks/handlers/pms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { SLEEVE_INDEX, modelBenchmark } from './models'

const METHODS: readonly MethodNote[] = [
  { label: 'Model', modeled: false, text: 'Brinson-Fachler: allocation is (wp − wb) × (Rb,i − Rb), selection is wb × (Rp,i − Rb,i), interaction is (wp − wb) × (Rp,i − Rb,i). The three effects sum exactly to the active return.' },
  { label: 'Linking', modeled: false, text: 'Single-period and arithmetic: each period is compounded from annual class returns as one period; sub-periods are not linked.' },
  { label: 'Returns', modeled: true, text: "Modeled, not realized: each asset class's return is a modeled index return, and the account's edge within a class is a modeled assumption. Weights are today's holdings." },
  { label: 'Benchmark', modeled: false, text: "The model's policy benchmark: each sleeve at the model's target weight, measured by the index named for it." },
  { label: 'Performance line', modeled: true, text: "Modeled, not realized: the monthly line is drawn from the account's modeled return and volatility, and the benchmark line from the model's; neither is a record of realized returns." },
  { label: 'Fees', modeled: false, text: 'Gross of fees.' },
]

const isAssetClass = (value: string): value is AssetClass => value in SLEEVE_INDEX

function build(account: Account, period: AttributionPeriod): AttributionView {
  const years = periodYears()[period]
  if (years === undefined) throw new Error(`No period length for ${period}`)
  const model = MODEL_DEFINITIONS.find((m) => m.id === account.modelId)
  if (!model) throw new Error(`${account.id} follows no known model`)
  const a = attributionFor(account, years)
  const r = periodReturnsFor(account, years)
  return {
    asOf: MOCK_NOW_ISO, accountId: account.id, accountName: account.name, modelId: model.id, modelName: model.name, benchmark: modelBenchmark(model.id),
    period, periods: ATTRIBUTION_PERIODS.map((p) => ({ id: p.id, label: p.label })),
    portfolioReturn: r.portfolioReturn, benchmarkReturn: r.benchmarkReturn, activeReturn: r.activeReturn,
    rows: a.rows.map((row, i) => {
      const leg = a.legs[i]
      if (!leg || leg.assetClass !== row.assetClass || !isAssetClass(leg.assetClass)) throw new Error(`Attribution rows and legs disagree at ${i}`)
      return {
        assetClass: leg.assetClass, portfolioWeight: leg.wp, benchmarkWeight: leg.wb, portfolioReturn: leg.rp, benchmarkReturn: leg.rb,
        allocation: row.allocation, selection: row.selection, interaction: row.interaction, total: row.total,
      }
    }),
    totals: a.totals,
    series: performanceSeriesFor(account).map((p) => ({ date: p.date, portfolio: p.value, benchmark: p.benchmark })),
    methods: [...METHODS],
  }
}

export function attributionView(viewerId: string, accountId: string, period: AttributionPeriod): AttributionView | undefined {
  const account = accounts.find((a) => a.id === accountId)
  if (!account || !isFirmViewer(viewerId)) return undefined
  return build(account, period)
}

export function attributionQuote(rowId: string): RowQuote | undefined {
  const [accountId, period, assetClass] = rowId.split(':')
  const account = accounts.find((a) => a.id === accountId)
  if (!account || !isAttributionPeriod(period) || !assetClass) return undefined
  const v = build(account, period)
  const row = v.rows.find((r) => r.assetClass === assetClass)
  if (!row) return undefined
  const label = ATTRIBUTION_PERIODS.find((p) => p.id === period)?.label ?? period
  return {
    view: 'attribution', rowId, subject: { type: 'account', id: account.id }, threadTitle: `Attribution · ${account.name}`,
    claim: `${ASSET_CLASS_LABELS[row.assetClass]} in ${account.name} against the ${v.benchmark.name}: allocation, selection and interaction.`,
    figures: [
      { label: 'Allocation', value: row.allocation, unit: 'pp', source: 'attribution.rows.allocation' },
      { label: 'Selection', value: row.selection, unit: 'pp', source: 'attribution.rows.selection' },
      { label: 'Interaction', value: row.interaction, unit: 'pp', source: 'attribution.rows.interaction' },
      { label: 'Total', value: row.total, unit: 'pp', source: 'attribution.rows.total' },
    ],
    citations: [{ source: `Attribution · Brinson-Fachler, ${label.toLowerCase()}, modeled returns`, asOf: MOCK_NOW_ISO }],
  }
}
```

- [ ] **Step 8: Run the tests**

Run: `pnpm vitest run src/mocks/reference src/mocks/handlers/__tests__ src/services/__tests__ --testTimeout 30000`
Expected: PASS.

- [ ] **Step 9: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): models — policy benchmarks named per sleeve, governance history as data with invariants, the attribution read model

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 4: Risk engine — factor exposures from holdings, a risk score against the client's tolerance, account and book risk

The `/factors` endpoint returned the same seven hand-typed exposures for every account. Exposures now come from each account's asset-class weights through a loading table labelled as model assumptions (R11); a risk score places σ on the questionnaire's scale against the client's tolerance (R10); the account page reads volatility, beta, parametric VaR, tracking error, factors, concentration and stress from the existing derivations; the book page ranks every account against its client.

**Files:**
- Create: `src/types/reference-risk.ts`, `src/mocks/reference/factors.ts`, `src/mocks/reference/risk.ts`, `src/mocks/reference/__tests__/risk.test.ts`
- Modify: `src/mocks/handlers/pms.ts` (`concentrationFor`, `stressScenariosFor` exported; `/factors`, `/concentration`, `/stress` read them)

**Interfaces:**
- Consumes: `riskProfileFor`, `MODEL_DEFINITIONS` (Task 1/3); `modelVolatility` (Task 3); `ASSET_CLASS_RISK`, `parametricVaR`, `portfolioBeta` (`@/lib/risk-model`); `RISK_PROFILE_TABLE`, `bandFor` (`@/lib/risk-profile`).
- Produces:

```ts
// src/mocks/handlers/pms.ts
export function concentrationFor(account: Account): { positions: ConcentrationMetric[]; summary: ConcentrationSummary }
export function stressScenariosFor(account: Account): StressScenario[]

// src/mocks/reference/factors.ts
export const FACTORS: readonly { id: FactorId; label: string }[]
export function loadingOf(assetClass: string, factor: FactorId): number
export function factorRows(weights: ReadonlyMap<string, number>, benchmark: ReadonlyMap<string, number>): FactorRow[]

// src/mocks/reference/risk.ts
export function riskScoreOf(vol: number): number
export function accountRiskView(viewerId: string, accountId: string): AccountRiskView | undefined
export function bookRiskView(viewerId: string): BookRiskView | undefined
export function riskQuote(accountId: string): RowQuote | undefined
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/reference/__tests__/risk.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { riskProfileFor } from '@/mocks/handlers/pms'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { getConcentration, getFactorExposures, getRiskMetrics, getStressScenarios } from '@/services/pms'
import { ASSET_CLASS_RISK, portfolioBeta } from '@/lib/risk-model'
import { modelVolatility } from '../models'
import { FACTORS, factorRows, loadingOf } from '../factors'
import { accountRiskView, bookRiskView, riskQuote, riskScoreOf } from '../risk'

const ASSET_CLASSES = Object.keys(ASSET_CLASS_RISK)
const risk = (accountId: string) => {
  const v = accountRiskView('user-001', accountId)
  if (!v) throw new Error(`no risk for ${accountId}`)
  return v
}
const vector = (accountId: string) => risk(accountId).factors.map((f) => f.exposure)

describe('factor exposures', () => {
  it('a loading for every asset class and every factor; the market loading is the class beta', () => {
    expect(FACTORS.map((f) => f.id)).toEqual(['market', 'size', 'value', 'momentum', 'quality', 'rates', 'credit'])
    for (const ac of ASSET_CLASSES) {
      for (const f of FACTORS) expect(Number.isFinite(loadingOf(ac, f.id)), `${ac} ${f.id}`).toBe(true)
      expect(loadingOf(ac, 'market'), ac).toBe(ASSET_CLASS_RISK[ac]?.beta)
    }
    expect(() => loadingOf('collectibles', 'size')).toThrow('collectibles')
  })

  it("are each account's weights times the loadings; the market exposure is its beta", () => {
    for (const a of accounts) {
      const p = riskProfileFor(a)
      const rows = factorRows(p.weights, p.benchWeights)
      expect(rows.find((r) => r.factor === 'market')?.exposure, a.id).toBeCloseTo(portfolioBeta(p.weights), 12)
      for (const r of rows) {
        expect(r.exposure, `${a.id} ${r.factor}`).toBeCloseTo([...p.weights].reduce((s, [ac, w]) => s + w * loadingOf(ac, r.factor), 0), 12)
        expect(r.benchmark, `${a.id} ${r.factor}`).toBeCloseTo([...p.benchWeights].reduce((s, [ac, w]) => s + w * loadingOf(ac, r.factor), 0), 12)
        expect(r.active, `${a.id} ${r.factor}`).toBeCloseTo(r.exposure - r.benchmark, 12)
      }
    }
  })

  it('no two accounts share a factor vector unless their holdings match by asset class', () => {
    const rows = accounts.map((a) => {
      const p = riskProfileFor(a)
      return { id: a.id, weights: JSON.stringify([...p.weights].sort().map(([ac, w]) => [ac, w.toFixed(9)])), factors: factorRows(p.weights, p.benchWeights).map((f) => f.exposure) }
    })
    rows.forEach((a, i) => rows.slice(i + 1).forEach((b) => {
      const differs = a.factors.some((x, k) => Math.abs(x - (b.factors[k] ?? Number.NaN)) > 1e-9)
      expect(differs, `${a.id} vs ${b.id}`).toBe(a.weights !== b.weights)
    }))
  })

  it('the legacy factors endpoint reads the same engine, per account', async () => {
    const [growth, ira] = await Promise.all([getFactorExposures('acc-002'), getFactorExposures('acc-020')])
    expect(growth.map((f) => f.exposure)).toEqual(vector('acc-002'))
    expect(growth.map((f) => f.exposure)).not.toEqual(ira.map((f) => f.exposure))
  })
})

describe('the risk score against the client tolerance', () => {
  it("puts each band's model at the band's midpoint, zero at zero, and caps at one hundred", () => {
    expect(['mod-003', 'mod-007', 'mod-001', 'mod-002', 'mod-004'].map((m) => riskScoreOf(modelVolatility(m)))).toEqual([13, 33, 48, 66, 88])
    expect(riskScoreOf(0)).toBe(0)
    expect(riskScoreOf(1)).toBe(100)
    const grid = Array.from({ length: 50 }, (_, i) => riskScoreOf(i / 100))
    for (let i = 1; i < grid.length; i++) expect(grid[i]).toBeGreaterThanOrEqual(grid[i - 1] ?? 0)
  })

  it('reads the tolerance from the client questionnaire and compares bands', () => {
    const crypto = risk('acc-045')
    const raj = clients.find((c) => c.id === 'cli-011')
    expect(crypto.posture).toMatchObject({ score: 100, band: 'Aggressive', status: 'above', gap: 100 - (raj?.riskProfile.score ?? 0) })
    expect(crypto.posture.tolerance).toMatchObject({ clientId: 'cli-011', clientName: raj?.fullName, band: 'Moderate', assessedOn: raj?.riskProfile.lastAssessed })
    expect(risk('acc-020').posture.status).toBe('below')
  })
})

describe('account risk', () => {
  it('VaR is parametric, normal, one month, 95%: the legacy figure, from the same σ', async () => {
    for (const id of ['acc-001', 'acc-002', 'acc-045']) {
      const v = risk(id)
      expect(v.var95.value, id).toBe(Math.round(v.value * 1.645 * v.volatility * Math.sqrt(1 / 12)))
      expect(v.var95.percent, id).toBeCloseTo(v.var95.value / v.value, 12)
      expect(v.var95).toMatchObject({ horizon: 'one month', confidence: 0.95, method: 'parametric normal' })
      expect(v.var95.value, id).toBe((await getRiskMetrics(id)).var95)
    }
  })

  it('stress tests replay each scenario on today\'s holdings; concentration is the legacy HHI', async () => {
    const v = risk('acc-001')
    const legacy = await getStressScenarios('acc-001')
    expect(v.stress.map((s) => [s.id, s.impact])).toEqual(legacy.map((s) => [s.id, s.portfolioImpact]))
    for (const s of v.stress) expect(s.impactValue).toBeCloseTo(s.impact * v.value, 6)
    expect(v.concentration.hhi).toBe((await getConcentration('acc-001')).summary.herfindahlIndex)
  })

  it("reflects the moved book: after the release acc-002's volatility and factors change", () => {
    const before = risk('acc-002')
    release(approvedV1())
    const after = risk('acc-002')
    expect(after.volatility).not.toBe(before.volatility)
    expect(after.factors.map((f) => f.exposure)).not.toEqual(before.factors.map((f) => f.exposure))
  })

  it('states its methods, the modeled ones tagged', () => {
    expect(risk('acc-002').methods.map((n) => [n.label, n.modeled])).toEqual([
      ['Volatility and beta', true], ['Value at risk', true], ['Factor exposures', true], ['Concentration', false], ['Stress tests', true], ['Risk score and tolerance', false],
    ])
  })
})

describe('book risk', () => {
  it('lists every account, largest gap above its client tolerance first', () => {
    const book = bookRiskView('user-001')
    expect(book?.rows).toHaveLength(accounts.length)
    const gaps = book?.rows.map((r) => r.posture.gap) ?? []
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a))
    expect(book?.rows[0]?.accountId).toBe('acc-045')
    expect(book?.aboveTolerance).toBe(book?.rows.filter((r) => r.posture.status === 'above').length)
  })
})

describe('the boundary and the quote', () => {
  it('is firm only and knows only real accounts', () => {
    expect(accountRiskView('cli-001', 'acc-002')).toBeUndefined()
    expect(bookRiskView('prsp-011')).toBeUndefined()
    expect(accountRiskView('user-001', 'acc-999')).toBeUndefined()
  })

  it('quotes an account against its client', () => {
    const q = riskQuote('acc-045')
    expect(q).toMatchObject({ view: 'risk', subject: { type: 'account', id: 'acc-045' }, threadTitle: 'Risk · Patel Digital Assets Account' })
    expect(q?.claim).toBe(`Patel Digital Assets Account sits above ${clients.find((c) => c.id === 'cli-011')?.fullName}'s risk tolerance.`)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Risk score', 'pts'], ['Tolerance score', 'pts'], ['Volatility', '%'], ['VaR, one month, 95%', 'USD']])
    expect(riskQuote('acc-999')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/reference/__tests__/risk.test.ts --testTimeout 30000`
Expected: FAIL — `../factors` and `../risk` do not exist.

- [ ] **Step 3: Concentration and stress as functions in pms**

In `src/mocks/handlers/pms.ts`, move the body of the `/api/pms/accounts/:accountId/concentration` handler (from `const positions = …` to the object it returns) into

```ts
/** Position concentration against the IPS limits, with one HHI scale (0–10,000) and its effective N. */
export function concentrationFor(account: Account) {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  // …the existing body, ending:
  return { positions: concentrationMetrics, summary: { /* the existing summary object */ } }
}
```

and the body of the `/stress` handler into `export function stressScenariosFor(account: Account): StressScenario[] { … return scenarios }`; the two handlers become `return HttpResponse.json(concentrationFor(account))` / `return HttpResponse.json(stressScenariosFor(account))` after their 404 checks. Replace the `/factors` handler with:

```ts
  http.get('/api/pms/accounts/:accountId/factors', ({ params }) => {
    const account = findAccount(params.accountId)
    if (!account) return notFound()
    const p = riskProfileFor(account)
    const exposures: FactorExposure[] = factorRows(p.weights, p.benchWeights).map((r) => ({ factor: r.label, exposure: r.exposure, benchmark: r.benchmark }))
    return HttpResponse.json(exposures)
  }),
```

importing `{ factorRows } from '../reference/factors'` (factors.ts imports only `@/lib` and types, so there is no cycle).

- [ ] **Step 4: Types and the factor table**

Create `src/types/reference-risk.ts`:

```ts
import type { MethodNote } from './reference'

export type FactorId = 'market' | 'size' | 'value' | 'momentum' | 'quality' | 'rates' | 'credit'
export type FactorRow = { factor: FactorId; label: string; exposure: number; benchmark: number; active: number }
export type ToleranceStatus = 'above' | 'within' | 'below'
export type RiskPosture = {
  /** The account's σ on the questionnaire's 0–100 scale, whole points. */
  score: number; band: string
  tolerance: { clientId: string; clientName: string; score: number; band: string; assessedOn: string }
  status: ToleranceStatus
  /** score − tolerance score. */
  gap: number
}
export type StressRow = { id: string; name: string; description: string; impact: number; impactValue: number }
export type ConcentrationRow = { symbol: string; name: string; weight: number; limit: number; kind: string; breached: boolean }
export type AccountRiskView = {
  asOf: string; accountId: string; accountName: string; clientName: string; modelId: string; modelName: string; benchmarkName: string
  /** USD. */
  value: number
  volatility: number; beta: number
  var95: { value: number; percent: number; horizon: 'one month'; confidence: number; method: 'parametric normal' }
  trackingError: number
  posture: RiskPosture
  factors: FactorRow[]
  concentration: { hhi: number; effectiveN: number; breaches: number; top: ConcentrationRow[] }
  stress: StressRow[]
  methods: MethodNote[]
}
export type BookRiskRow = { accountId: string; accountName: string; householdName: string; clientName: string; modelName: string; value: number; volatility: number; var95: number; posture: RiskPosture }
export type BookRiskView = { asOf: string; rows: BookRiskRow[]; aboveTolerance: number; methods: MethodNote[] }
```

Create `src/mocks/reference/factors.ts`:

```ts
import type { FactorId, FactorRow } from '@/types/reference-risk'
import { ASSET_CLASS_RISK } from '@/lib/risk-model'

export const FACTORS: readonly { id: FactorId; label: string }[] = [
  { id: 'market', label: 'Market (equity beta)' }, { id: 'size', label: 'Size' }, { id: 'value', label: 'Value' }, { id: 'momentum', label: 'Momentum' },
  { id: 'quality', label: 'Quality' }, { id: 'rates', label: 'Rates (duration)' }, { id: 'credit', label: 'Credit' },
]

/**
 * Model assumptions (R11), not loadings estimated from returns: how much of each style factor one unit of
 * an asset class carries. The market loading is not here; it is the class's beta in `ASSET_CLASS_RISK`.
 */
const STYLE_LOADINGS: Readonly<Record<string, Readonly<Record<Exclude<FactorId, 'market'>, number>>>> = {
  us_equity:        { size: 0.05, value: -0.05, momentum: 0.10, quality: 0.15, rates: -0.05, credit: 0.00 },
  intl_equity:      { size: 0.10, value: 0.20, momentum: 0.05, quality: 0.10, rates: -0.05, credit: 0.00 },
  emerging_markets: { size: 0.20, value: 0.25, momentum: 0.05, quality: -0.10, rates: -0.10, credit: 0.10 },
  fixed_income:     { size: 0.00, value: 0.00, momentum: 0.00, quality: 0.00, rates: 1.00, credit: 0.40 },
  alternatives:     { size: 0.05, value: 0.10, momentum: 0.20, quality: 0.05, rates: 0.20, credit: 0.30 },
  real_estate:      { size: 0.20, value: 0.30, momentum: 0.00, quality: -0.05, rates: 0.50, credit: 0.20 },
  commodities:      { size: 0.00, value: 0.10, momentum: 0.25, quality: 0.00, rates: -0.20, credit: 0.00 },
  cash:             { size: 0.00, value: 0.00, momentum: 0.00, quality: 0.00, rates: 0.05, credit: 0.00 },
  digital_assets:   { size: 0.30, value: -0.40, momentum: 0.60, quality: -0.30, rates: 0.00, credit: 0.00 },
  private_equity:   { size: 0.40, value: 0.20, momentum: 0.00, quality: 0.00, rates: 0.10, credit: 0.30 },
}

export function loadingOf(assetClass: string, factor: FactorId): number {
  const beta = ASSET_CLASS_RISK[assetClass]?.beta
  const style = STYLE_LOADINGS[assetClass]
  if (beta === undefined || !style) throw new Error(`No factor loadings for asset class ${assetClass}`)
  return factor === 'market' ? beta : style[factor]
}

const exposure = (weights: ReadonlyMap<string, number>, factor: FactorId) => [...weights].reduce((s, [ac, w]) => s + w * loadingOf(ac, factor), 0)

/** The account's exposure (its weights × the loadings), its benchmark's (the model's targets × the loadings), and the difference. */
export function factorRows(weights: ReadonlyMap<string, number>, benchmark: ReadonlyMap<string, number>): FactorRow[] {
  return FACTORS.map(({ id, label }) => {
    const own = exposure(weights, id)
    const bench = exposure(benchmark, id)
    return { factor: id, label, exposure: own, benchmark: bench, active: own - bench }
  })
}
```

- [ ] **Step 5: The risk engine**

Create `src/mocks/reference/risk.ts`:

```ts
import type { Account } from '@/types/account'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { AccountRiskView, BookRiskView, RiskPosture, ToleranceStatus } from '@/types/reference-risk'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { households } from '@/mocks/data/households'
import { MODEL_DEFINITIONS, concentrationFor, riskProfileFor, stressScenariosFor } from '@/mocks/handlers/pms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { parametricVaR } from '@/lib/risk-model'
import { RISK_PROFILE_TABLE, bandFor, type RiskProfile } from '@/lib/risk-profile'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { factorRows } from './factors'
import { modelVolatility } from './models'

type Anchor = { vol: number; score: number }

/** (0, 0), each band's model σ at the band's midpoint score, and twice the riskiest model's σ at 100 (R10). */
function anchors(): Anchor[] {
  const bands = RISK_PROFILE_TABLE.map((b) => ({ vol: modelVolatility(b.modelId), score: (b.floor + b.ceiling) / 2 }))
  const top = bands[bands.length - 1]
  if (!top) throw new Error('The risk-profile table is empty')
  const points = [{ vol: 0, score: 0 }, ...bands, { vol: top.vol * 2, score: 100 }]
  points.forEach((p, i) => {
    const prev = points[i - 1]
    if (prev && p.vol <= prev.vol) throw new Error('Each band in the risk-profile table must name a riskier model than the band below it')
  })
  return points
}

/** An account's σ on the questionnaire's 0–100 scale, rounded to whole points like the questionnaire. */
export function riskScoreOf(vol: number): number {
  const points = anchors()
  const i = points.findIndex((p) => p.vol > vol)
  const [a, b] = [points[i - 1], points[i]]
  if (i < 0 || !a || !b) return 100
  return Math.round(a.score + ((vol - a.vol) / (b.vol - a.vol)) * (b.score - a.score))
}

const rank = (profile: RiskProfile) => RISK_PROFILE_TABLE.findIndex((b) => b.profile === profile)

function clientOf(account: Account) {
  const client = clients.find((c) => c.id === account.clientId)
  if (!client) throw new Error(`${account.id} names no client`)
  return client
}

function postureOf(account: Account, vol: number): RiskPosture {
  const client = clientOf(account)
  const score = riskScoreOf(vol)
  const own = bandFor(score)
  const tolerance = bandFor(client.riskProfile.score)
  const step = rank(own.profile) - rank(tolerance.profile)
  const status: ToleranceStatus = step > 0 ? 'above' : step < 0 ? 'below' : 'within'
  return {
    score, band: own.label, status, gap: score - client.riskProfile.score,
    tolerance: { clientId: client.id, clientName: client.fullName, score: client.riskProfile.score, band: tolerance.label, assessedOn: client.riskProfile.lastAssessed },
  }
}

const modelName = (modelId: string) => {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`No model ${modelId}`)
  return model.name
}

const METHODS: readonly MethodNote[] = [
  { label: 'Volatility and beta', modeled: true, text: "Modeled, not realized: σ from the firm's asset-class volatility assumptions with a 0.35 correlation between classes; beta from each class's assumed sensitivity to the global equity market. Weights are today's holdings." },
  { label: 'Value at risk', modeled: true, text: 'Parametric and normal, one month, 95%: value × 1.645 × σ × √(1/12). A modeled loss the account would not exceed in nineteen months of twenty, not a realized one.' },
  { label: 'Factor exposures', modeled: true, text: "Each asset class carries a loading on each factor, a model assumption rather than an estimate from returns; the market loading is the class's beta. An account's exposure is its weights times the loadings; its benchmark's is the model's targets times the loadings." },
  { label: 'Concentration', modeled: false, text: 'The Herfindahl-Hirschman index of position weights (0 to 10,000) and its effective number of positions; limits are the IPS limits for a single issuer, a pooled vehicle and cash.' },
  { label: 'Stress tests', modeled: true, text: "Each scenario's asset-class returns replayed on today's holdings." },
  { label: 'Risk score and tolerance', modeled: false, text: "The account's σ placed on the questionnaire's 0 to 100 scale through the model each band of the firm's risk-profile table names; tolerance is the client's questionnaire score and its band. Above or below means the two fall in different bands." },
]

function accountRisk(account: Account): AccountRiskView {
  const p = riskProfileFor(account)
  const var95 = Math.round(parametricVaR(p.value, p.vol))
  const concentration = concentrationFor(account)
  return {
    asOf: MOCK_NOW_ISO, accountId: account.id, accountName: account.name, clientName: clientOf(account).fullName,
    modelId: p.modelId, modelName: modelName(p.modelId), benchmarkName: p.benchmarkName, value: p.value,
    volatility: p.vol, beta: p.beta,
    var95: { value: var95, percent: var95 / p.value, horizon: 'one month', confidence: 0.95, method: 'parametric normal' },
    trackingError: p.te,
    posture: postureOf(account, p.vol),
    factors: factorRows(p.weights, p.benchWeights),
    concentration: {
      hhi: concentration.summary.herfindahlIndex, effectiveN: concentration.summary.effectiveN, breaches: concentration.summary.breachCount,
      top: concentration.positions.slice(0, 5).map((c) => ({ symbol: c.symbol, name: c.name, weight: c.weight, limit: c.limit, kind: c.kind, breached: c.breached })),
    },
    stress: stressScenariosFor(account).map((s) => ({ id: s.id, name: s.name, description: s.description, impact: s.portfolioImpact, impactValue: s.portfolioImpact * p.value })),
    methods: [...METHODS],
  }
}

export function accountRiskView(viewerId: string, accountId: string): AccountRiskView | undefined {
  const account = accounts.find((a) => a.id === accountId)
  return account && isFirmViewer(viewerId) ? accountRisk(account) : undefined
}

export function bookRiskView(viewerId: string): BookRiskView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const rows = accounts.map((a) => {
    const p = riskProfileFor(a)
    const household = households.find((h) => h.id === a.householdId)
    if (!household) throw new Error(`${a.id} names no household`)
    return {
      accountId: a.id, accountName: a.name, householdName: household.name, clientName: clientOf(a).fullName, modelName: modelName(p.modelId),
      value: p.value, volatility: p.vol, var95: Math.round(parametricVaR(p.value, p.vol)), posture: postureOf(a, p.vol),
    }
  }).sort((a, b) => b.posture.gap - a.posture.gap || a.accountId.localeCompare(b.accountId))
  return { asOf: MOCK_NOW_ISO, rows, aboveTolerance: rows.filter((r) => r.posture.status === 'above').length, methods: [...METHODS] }
}

const STATUS_WORDS: Readonly<Record<ToleranceStatus, string>> = { above: 'above', within: 'within', below: 'below' }

export function riskQuote(accountId: string): RowQuote | undefined {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return undefined
  const v = accountRisk(account)
  return {
    view: 'risk', rowId: account.id, subject: { type: 'account', id: account.id }, threadTitle: `Risk · ${account.name}`,
    claim: `${account.name} sits ${STATUS_WORDS[v.posture.status]} ${v.posture.tolerance.clientName}'s risk tolerance.`,
    figures: [
      { label: 'Risk score', value: v.posture.score, unit: 'pts', source: 'risk.posture.score' },
      { label: 'Tolerance score', value: v.posture.tolerance.score, unit: 'pts', source: 'clients.riskProfile.score' },
      { label: 'Volatility', value: v.volatility, unit: '%', source: 'risk.volatility' },
      { label: 'VaR, one month, 95%', value: v.var95.value, unit: 'USD', source: 'risk.var95.value' },
    ],
    citations: [{ source: `Risk · modeled, not realized; questionnaire of ${v.posture.tolerance.assessedOn}`, asOf: MOCK_NOW_ISO }],
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/mocks/reference src/mocks/handlers/__tests__/risk-invariants.test.ts src/mocks/handlers/__tests__/concentration-invariants.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): risk engine — factor exposures from holdings, a risk score against the client tolerance, account and book risk

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 5: Blotter read model — every order across accounts, tickets and the session's proposal orders, with source and REC id

The blotter reads the legacy OMS tickets and the workspace store's staged orders (every status), joining each filled staged order to its fill on the ledger (R13).

**Files:**
- Create: `src/types/reference-blotter.ts`, `src/mocks/reference/blotter.ts`, `src/mocks/reference/__tests__/blotter.test.ts`

**Interfaces:**
- Consumes: `orders`, `currencyForAccount` (`@/mocks/handlers/oms`); `Order` type (`@/services/oms`); `store().staged`; `ledgerFills()`; `proposalById`.
- Produces:

```ts
// src/types/reference-blotter.ts
export const BLOTTER_STATUSES: readonly ['working', 'pending_compliance', 'filled', 'cancelled', 'withdrawn', 'returned']
export type BlotterStatus = (typeof BLOTTER_STATUSES)[number]
export const isBlotterStatus: (value: unknown) => value is BlotterStatus
export type BlotterSource = { kind: 'ticket' } | { kind: 'proposal'; proposalId: string; title: string; version: number; threadId: string }
export type BlotterRow = { id; accountId; accountName; symbol; side: 'buy' | 'sell'; quantity; price?; priceKind?: 'fill' | 'limit'; value?; currency; status: BlotterStatus; source: BlotterSource; recId?; submittedAt; filledAt? }
export type BlotterFilters = { status?: BlotterStatus; accountId?: string; since?: string; until?: string }
export type BlotterView = { asOf: string; filters: BlotterFilters; rows: BlotterRow[]; accounts: { id: string; name: string }[]; days: string[]; methods: MethodNote[] }

// src/mocks/reference/blotter.ts
export function blotterView(viewerId: string, filters: BlotterFilters): BlotterView | undefined
export function blotterQuote(rowId: string): RowQuote | undefined
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/reference/__tests__/blotter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { orders } from '@/mocks/handlers/oms'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { store } from '@/mocks/data/workspace-store'
import { withdrawApproval } from '@/mocks/workspace/proposal-acts'
import { ADRIAN, approvedV1, ok, release } from '@/mocks/workspace/__tests__/story-fixture'
import type { BlotterFilters } from '@/types/reference-blotter'
import { blotterQuote, blotterView } from '../blotter'

const view = (filters: BlotterFilters = {}) => {
  const v = blotterView(ADRIAN, filters)
  if (!v) throw new Error('Adrian reads the blotter')
  return v
}
const row = (id: string) => view().rows.find((r) => r.id === id)

describe('tickets', () => {
  it('lists every order management ticket, its status read as working, filled or cancelled', () => {
    expect(view().rows.filter((r) => r.source.kind === 'ticket').map((r) => r.id).sort()).toEqual(orders.map((o) => o.id).sort())
    expect(row('ord-003')).toMatchObject({ status: 'working', price: 785, priceKind: 'limit', side: 'sell' })
    expect(row('ord-009')).toMatchObject({ status: 'cancelled' })
    expect(row('ord-001')).toMatchObject({ status: 'filled', price: 268.35, priceKind: 'fill', filledAt: '2026-02-24T14:30:02Z', currency: 'USD' })
    expect(row('ord-001')?.recId).toBeUndefined()
  })

  it('values a fill by what it is: a fund purchase, a bond at par, a coin', () => {
    expect(row('ord-013')).toMatchObject({ side: 'buy' })
    expect(row('ord-013')?.value).toBeCloseTo(25_000, 2)
    expect(row('ord-014')?.value).toBeCloseTo(47_600, 6)
    expect(row('ord-015')?.value).toBeCloseTo(21_862.5, 6)
    expect(row('ord-016')).toMatchObject({ side: 'buy', status: 'working' })
  })
})

describe("the session's proposal orders", () => {
  it('appear when staged: pending compliance, from the proposal and version, under the approval act', () => {
    const a = approvedV1()
    const staged = view().rows.filter((r) => r.source.kind === 'proposal')
    expect(staged.length).toBe(store().staged.length)
    for (const r of staged) {
      expect(r).toMatchObject({ status: 'pending_compliance', recId: a.approvalActId, accountId: 'acc-002', source: { kind: 'proposal', proposalId: a.proposalId, version: 1, threadId: 'th-johnson-review' } })
      expect(r.price).toBeUndefined()
    }
  })

  it('read as filled after the release: the fill price, value and time, under the release act', () => {
    const releaseAct = release(approvedV1())
    const filled = view({ status: 'filled' }).rows.filter((r) => r.source.kind === 'proposal')
    expect(filled).toHaveLength(ledgerFills().length)
    for (const r of filled) {
      const fill = ledgerFills().find((f) => f.stagedOrderId === r.id)
      expect(r).toMatchObject({ recId: releaseAct.id, price: fill?.price, priceKind: 'fill', value: fill?.value, filledAt: fill?.at })
    }
  })

  it('read as withdrawn, under the withdrawal act, when the approver withdraws', () => {
    const a = approvedV1()
    const { act } = ok(withdrawApproval(ADRIAN, a.proposalId))
    for (const r of view().rows.filter((x) => x.source.kind === 'proposal')) expect(r).toMatchObject({ status: 'withdrawn', recId: act.id })
  })
})

describe('filters and order', () => {
  it('filters by status, account and submitted day, newest first', () => {
    expect(view({ status: 'cancelled' }).rows.map((r) => r.id)).toEqual(['ord-009'])
    expect(view({ accountId: 'acc-001' }).rows.every((r) => r.accountId === 'acc-001')).toBe(true)
    expect(view({ since: '2026-02-24', until: '2026-02-24' }).rows.every((r) => r.submittedAt.startsWith('2026-02-24'))).toBe(true)
    const times = view().rows.map((r) => r.submittedAt)
    expect(times).toEqual([...times].sort().reverse())
  })

  it('lists the accounts and days of the whole blotter for the filter controls, whatever the filter', () => {
    const all = view()
    const filtered = view({ status: 'cancelled' })
    expect(filtered.accounts).toEqual(all.accounts)
    expect(filtered.days).toEqual(all.days)
    expect(filtered.filters).toEqual({ status: 'cancelled' })
  })
})

describe('the boundary and the quote', () => {
  it('is firm only', () => {
    expect(blotterView('cli-001', {})).toBeUndefined()
    expect(blotterView('prsp-011', {})).toBeUndefined()
  })

  it('quotes an order to its account', () => {
    const q = blotterQuote('ord-001')
    expect(q).toMatchObject({ view: 'blotter', subject: { type: 'account', id: 'acc-001' }, threadTitle: 'Orders · Johnson Family Trust' })
    expect(q?.claim).toBe('A buy of VTI in Johnson Family Trust: filled.')
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Quantity', 'sh'], ['Value', 'USD']])
    expect(blotterQuote('ord-999')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/reference/__tests__/blotter.test.ts --testTimeout 30000`
Expected: FAIL — `../blotter` does not exist.

- [ ] **Step 3: Types**

Create `src/types/reference-blotter.ts`:

```ts
import type { CurrencyCode } from './currency'
import type { MethodNote } from './reference'

export const BLOTTER_STATUSES = ['working', 'pending_compliance', 'filled', 'cancelled', 'withdrawn', 'returned'] as const
export type BlotterStatus = (typeof BLOTTER_STATUSES)[number]
export const isBlotterStatus = (value: unknown): value is BlotterStatus => typeof value === 'string' && (BLOTTER_STATUSES as readonly string[]).includes(value)

export type BlotterSource = { kind: 'ticket' } | { kind: 'proposal'; proposalId: string; title: string; version: number; threadId: string }
export type BlotterRow = {
  id: string; accountId: string; accountName: string; symbol: string; side: 'buy' | 'sell'; quantity: number
  /** The fill price once filled; a working limit order's limit. */
  price?: number; priceKind?: 'fill' | 'limit'
  value?: number; currency: CurrencyCode; status: BlotterStatus; source: BlotterSource
  /** The binding act that closed the order, else the approval it was staged from. Tickets have none. */
  recId?: string
  submittedAt: string; filledAt?: string
}
export type BlotterFilters = { status?: BlotterStatus; accountId?: string; since?: string; until?: string }
export type BlotterView = { asOf: string; filters: BlotterFilters; rows: BlotterRow[]; accounts: { id: string; name: string }[]; days: string[]; methods: MethodNote[] }
```

- [ ] **Step 4: The blotter engine**

Create `src/mocks/reference/blotter.ts`:

```ts
import type { Order } from '@/services/oms'
import type { StagedOrder } from '@/types/workspace-proposal'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { BlotterFilters, BlotterRow, BlotterStatus, BlotterView } from '@/types/reference-blotter'
import { accounts } from '@/mocks/data/accounts'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { proposalById } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { currencyForAccount, orders } from '@/mocks/handlers/oms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { MOCK_NOW_ISO } from '@/lib/clock'

const BUY_SIDES: ReadonlySet<string> = new Set(['buy', 'purchase', 'buy_to_open', 'buy_to_close', 'buy_to_cover'])
const SELL_SIDES: ReadonlySet<string> = new Set(['sell', 'redemption', 'sell_short', 'sell_to_open', 'sell_to_close'])
const TICKET_STATUS: Readonly<Record<Order['status'], BlotterStatus>> = { pending: 'working', submitted: 'working', filled: 'filled', cancelled: 'cancelled' }
const STAGED_STATUS: Readonly<Record<StagedOrder['status'], BlotterStatus>> = {
  pending_compliance: 'pending_compliance', filled: 'filled', withdrawn: 'withdrawn', returned: 'returned',
}

function accountName(id: string): string {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`An order names no account ${id}`)
  return account.name
}

function sideOf(order: Order): 'buy' | 'sell' {
  if (BUY_SIDES.has(order.side)) return 'buy'
  if (SELL_SIDES.has(order.side)) return 'sell'
  throw new Error(`Ticket ${order.id} has a side the blotter cannot read: ${order.side}`)
}

/** Quantity × price; a bond's is par × price ÷ 100; an option's is contracts × price × its multiplier. */
function ticketValue(order: Order): number | undefined {
  if (order.status !== 'filled' || order.filledPrice === undefined) return undefined
  if (order.assetClass === 'fixed_income') {
    if (order.parAmount === undefined) throw new Error(`Bond ticket ${order.id} names no par amount`)
    return (order.parAmount * order.filledPrice) / 100
  }
  if (order.assetClass === 'option') {
    if (order.contractMultiplier === undefined) throw new Error(`Option ticket ${order.id} names no multiplier`)
    return order.filledQuantity * order.filledPrice * order.contractMultiplier
  }
  return order.filledQuantity * order.filledPrice
}

function ticketRow(order: Order): BlotterRow {
  const status = TICKET_STATUS[order.status]
  const price = status === 'filled' ? order.filledPrice : order.limitPrice
  const value = ticketValue(order)
  return {
    id: order.id, accountId: order.accountId, accountName: accountName(order.accountId), symbol: order.symbol, side: sideOf(order), quantity: order.quantity,
    ...(price !== undefined ? { price, priceKind: status === 'filled' ? 'fill' as const : 'limit' as const } : {}),
    ...(value !== undefined ? { value } : {}),
    currency: currencyForAccount(order.accountId), status, source: { kind: 'ticket' }, submittedAt: order.submittedAt,
    ...(order.filledAt ? { filledAt: order.filledAt } : {}),
  }
}

function stagedRow(o: StagedOrder): BlotterRow {
  const proposal = proposalById(o.proposalId)
  if (!proposal) throw new Error(`Staged order ${o.id} names no proposal ${o.proposalId}`)
  const fill = o.status === 'filled' ? ledgerFills().find((f) => f.stagedOrderId === o.id) : undefined
  if (o.status === 'filled' && !fill) throw new Error(`${o.id} is filled with no fill on the ledger`)
  return {
    id: o.id, accountId: o.accountId, accountName: accountName(o.accountId), symbol: o.symbol, side: o.side, quantity: o.quantity,
    ...(fill ? { price: fill.price, priceKind: 'fill' as const, value: fill.value, filledAt: fill.at } : {}),
    currency: o.currency, status: STAGED_STATUS[o.status],
    source: { kind: 'proposal', proposalId: proposal.id, title: proposal.title, version: o.version, threadId: proposal.threadId },
    recId: o.closedByActId ?? o.approvalActId, submittedAt: o.stagedAt,
  }
}

function allRows(): BlotterRow[] {
  return [...orders.map(ticketRow), ...store().staged.map(stagedRow)].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || a.id.localeCompare(b.id))
}

const METHODS: readonly MethodNote[] = [
  { label: 'Orders', modeled: false, text: "Tickets are the order management system's orders. Proposal orders are those staged from an approved version in this session, released by compliance and filled at the day's prices." },
  { label: 'Status', modeled: false, text: 'Working: with the market, not yet filled. Pending compliance: staged from an approval, waiting for release. Withdrawn, returned and cancelled orders closed without a fill.' },
  { label: 'Record', modeled: false, text: 'REC is the binding act that closed the order (the release, the return or the withdrawal) or, while it waits, the approval it was staged from.' },
  { label: 'Value', modeled: false, text: "A fill's value is quantity times fill price; a bond's is par times price; an option's is contracts times price times its multiplier. A working order's price is its limit." },
]

export function blotterView(viewerId: string, filters: BlotterFilters): BlotterView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const all = allRows()
  const day = (r: BlotterRow) => r.submittedAt.slice(0, 10)
  const rows = all.filter((r) => (filters.status === undefined || r.status === filters.status)
    && (filters.accountId === undefined || r.accountId === filters.accountId)
    && (filters.since === undefined || day(r) >= filters.since)
    && (filters.until === undefined || day(r) <= filters.until))
  const named = new Map(all.map((r) => [r.accountId, r.accountName]))
  return {
    asOf: MOCK_NOW_ISO, filters, rows,
    accounts: [...named].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    days: [...new Set(all.map(day))].sort(),
    methods: [...METHODS],
  }
}

const STATUS_WORDS: Readonly<Record<BlotterStatus, string>> = {
  working: 'working', pending_compliance: 'pending compliance', filled: 'filled', cancelled: 'cancelled', withdrawn: 'withdrawn', returned: 'returned to the advisor',
}

export function blotterQuote(rowId: string): RowQuote | undefined {
  const r = allRows().find((x) => x.id === rowId)
  if (!r) return undefined
  const source = r.source.kind === 'proposal' ? `${r.source.title} v${r.source.version}${r.recId ? `, ${r.recId}` : ''}` : `order management ticket ${r.id}`
  return {
    view: 'blotter', rowId: r.id, subject: { type: 'account', id: r.accountId }, threadTitle: `Orders · ${r.accountName}`,
    claim: `${r.side === 'buy' ? 'A buy' : 'A sale'} of ${r.symbol} in ${r.accountName}: ${STATUS_WORDS[r.status]}.`,
    figures: [
      { label: 'Quantity', value: r.quantity, unit: 'sh', source: 'blotter.rows.quantity' },
      ...(r.value !== undefined && r.currency === 'USD' ? [{ label: 'Value', value: r.value, unit: 'USD' as const, source: 'blotter.rows.value' }] : []),
    ],
    citations: [{ source: `Blotter · ${source}`, asOf: r.filledAt ?? r.submittedAt }],
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/mocks/reference/__tests__/blotter.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): blotter read model — tickets and the session's proposal orders, with source, fill and REC id

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 6: Endpoints, client functions and hooks — every reference view firm-only over HTTP, and `resolve_break` on the acts endpoint

**Files:**
- Create: `src/mocks/handlers/workspace-reference.ts`, `src/services/reference.ts`, `src/hooks/use-reference.ts`, `src/mocks/handlers/__tests__/workspace-reference-api.test.ts`, `src/hooks/__tests__/use-reference.test.tsx`
- Modify: `src/mocks/handlers/workspace.ts` (register the handlers above the 405 catch-all; `resolve_break` case)

**Interfaces:**
- Consumes: every view function from Tasks 1–5; `resolveBreak`; `firmViewer`, `badRequest`, `refusal`, `nonEmptyString`, `readJson` (`./workspace-http`).
- Produces:

| Method and path | Answer |
|---|---|
| `GET /api/workspace/reference/billing` | `BillingView` |
| `GET /api/workspace/reference/practice` | `PracticeView` |
| `GET /api/workspace/reference/reconciliation` | `ReconciliationView` |
| `GET /api/workspace/reference/risk` | `BookRiskView` |
| `GET /api/workspace/reference/risk/:accountId` | `AccountRiskView`, or 404 |
| `GET /api/workspace/reference/attribution/:accountId?period=ytd` | `AttributionView` (period defaults to `ytd`; unknown → `400 BAD_PERIOD`), or 404 |
| `GET /api/workspace/reference/models` | `ModelsView` |
| `GET /api/workspace/reference/models/:modelId` | `ModelDetail`, or 404 |
| `GET /api/workspace/reference/blotter?status&accountId&since&until` | `BlotterView` (bad status, malformed day or `since > until` → `400 BAD_FILTER`) |
| `POST /api/workspace/acts { kind: 'resolve_break', breakId, fingerprint, resolution, rationale }` | `201` the act; refusals per Task 2 |

Every path: no viewer → `401`; an outsider → `404` before the query or body is read.

```ts
// src/services/reference.ts
export const getBilling: (viewer: string) => Promise<BillingView>
export const getPractice: (viewer: string) => Promise<PracticeView>
export const getReconciliation: (viewer: string) => Promise<ReconciliationView>
export const getBookRisk: (viewer: string) => Promise<BookRiskView>
export const getAccountRisk: (viewer: string, accountId: string) => Promise<AccountRiskView>
export const getReferenceAttribution: (viewer: string, accountId: string, period: AttributionPeriod) => Promise<AttributionView>
export const getReferenceModels: (viewer: string) => Promise<ModelsView>
export const getReferenceModel: (viewer: string, modelId: string) => Promise<ModelDetail>
export const getBlotter: (viewer: string, filters: BlotterFilters) => Promise<BlotterView>
export const resolveBreak: (viewer: string, request: ResolveBreakRequest) => Promise<BindingAct>

// src/hooks/use-reference.ts (query keys ['workspace', viewerId, 'reference', …], so every workspace invalidation refreshes them)
export function useBilling(enabled?: boolean)
export function usePractice(enabled?: boolean)
export function useReconciliation(enabled?: boolean)
export function useBookRisk(enabled?: boolean)
export function useAccountRisk(accountId: string, enabled?: boolean)
export function useReferenceAttribution(accountId: string, period: AttributionPeriod, enabled?: boolean)
export function useReferenceModels(enabled?: boolean)
export function useReferenceModel(modelId: string, enabled?: boolean)
export function useBlotter(filters: BlotterFilters, enabled?: boolean)
export function useResolveBreak()     // mutate(request: ResolveBreakRequest) → BindingAct; invalidates the workspace on settle
```

- [ ] **Step 1: Write the failing API test**

Create `src/mocks/handlers/__tests__/workspace-reference-api.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const VIEWS = [
  '/reference/billing', '/reference/practice', '/reference/reconciliation', '/reference/risk', '/reference/risk/acc-002',
  '/reference/attribution/acc-002', '/reference/attribution/acc-002?period=3y', '/reference/models', '/reference/models/mod-005',
  '/reference/blotter', '/reference/blotter?status=filled&accountId=acc-002&since=2026-02-20&until=2026-02-25',
]
const PROBES = [...VIEWS, '/reference/risk/acc-999', '/reference/models/mod-999', '/reference/attribution/acc-002?period=forever', '/reference/blotter?status=bogus']

describe('the reference endpoints', () => {
  it('serve every view to each firm viewer', async () => {
    for (const viewer of ['user-001', 'user-002', 'user-003', 'cco-001']) {
      for (const path of VIEWS) expect((await call('GET', path, viewer)).status, `${viewer} ${path}`).toBe(200)
    }
    expect((await call('GET', '/reference/attribution/acc-002?period=3y', 'user-001')).body.period).toBe('3y')
    expect((await call('GET', '/reference/attribution/acc-002', 'user-001')).body.period).toBe('ytd')
  })

  it('answer an outsider 404 on every path, whatever the id or the filter, and nobody 401', async () => {
    for (const viewer of ['cli-001', 'prsp-011']) {
      for (const path of PROBES) {
        const r = await call('GET', path, viewer)
        expect(r.status, `${viewer} ${path}`).toBe(404)
        expect(JSON.stringify(r.body), `${viewer} ${path}`).not.toMatch(/Household|brk-|policy benchmark/)
      }
    }
    for (const path of VIEWS) expect((await call('GET', path, undefined)).status, path).toBe(401)
  })

  it('refuse what the views do not hold', async () => {
    expect((await call('GET', '/reference/risk/acc-999', 'user-001')).status).toBe(404)
    expect((await call('GET', '/reference/attribution/acc-999', 'user-001')).status).toBe(404)
    expect((await call('GET', '/reference/models/mod-999', 'user-001')).status).toBe(404)
    expect((await call('GET', '/reference/attribution/acc-002?period=inception', 'user-001')).body).toMatchObject({ code: 'BAD_PERIOD' })
    for (const query of ['status=bogus', 'since=yesterday', 'since=2026-02-25&until=2026-02-01']) {
      const r = await call('GET', `/reference/blotter?${query}`, 'user-001')
      expect([r.status, r.body.code], query).toEqual([400, 'BAD_FILTER'])
    }
  })

  it('cannot be edited: a write to a reference path is 405', async () => {
    expect((await call('POST', '/reference/billing', 'user-001', {})).status).toBe(405)
  })
})

describe('resolve_break over HTTP', () => {
  const resolve = async (viewer: string, overrides: Record<string, unknown> = {}) => {
    const { body } = await call('GET', '/reference/reconciliation', 'user-001')
    const fingerprint = body.breaks.find((b: { id: string }) => b.id === 'brk-002').fingerprint
    return call('POST', '/acts', viewer, { kind: 'resolve_break', breakId: 'brk-002', fingerprint, resolution: 'timing_difference', rationale: 'Sweep posted late.', ...overrides })
  }

  it('records once; the second answers 409 naming the first', async () => {
    const first = await resolve('user-002')
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({ kind: 'resolve_break', actorId: 'user-002' })
    expect(await resolve('user-001')).toMatchObject({ status: 409, body: { code: 'ALREADY_RESOLVED' } })
    expect((await call('GET', '/reference/reconciliation', 'user-001')).body.summary.openBreaks).toBe(0)
  })

  it('is 404 to outsiders before the body is read, 403 to the analyst, 400 to a malformed body', async () => {
    expect((await call('POST', '/acts', 'cli-001', { kind: 'resolve_break' })).status).toBe(404)
    expect((await call('POST', '/acts', 'prsp-011', { kind: 'resolve_break' })).status).toBe(404)
    expect(await resolve('user-003')).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
    expect((await resolve('user-001', { resolution: 'shrug' })).status).toBe(400)
    expect((await resolve('user-001', { breakId: undefined })).status).toBe(400)
    expect(store().acts).toHaveLength(0)
  })
})
```

Create `src/hooks/__tests__/use-reference.test.tsx`:

```tsx
import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useReconciliation, useResolveBreak } from '@/hooks/use-reference'

it('a resolve refreshes the reconciliation view', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  const { result } = renderHook(() => ({ view: useReconciliation(), resolve: useResolveBreak() }), { wrapper })
  await waitFor(() => expect(result.current.view.data?.summary.openBreaks).toBe(1))
  const brk = result.current.view.data?.breaks.find((b) => b.id === 'brk-002')
  if (!brk) throw new Error('brk-002 is listed')
  await act(() => result.current.resolve.mutateAsync({ breakId: brk.id, fingerprint: brk.fingerprint, resolution: 'book_corrected', rationale: 'Corrected.' }))
  await waitFor(() => expect(result.current.view.data?.summary.openBreaks).toBe(0))
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-reference-api.test.ts src/hooks/__tests__/use-reference.test.tsx --testTimeout 30000`
Expected: FAIL — the reference paths answer 405 (the catch-all) and the hook module does not exist.

- [ ] **Step 3: The handlers**

Create `src/mocks/handlers/workspace-reference.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { isAttributionPeriod } from '@/types/reference-attribution'
import { isBlotterStatus, type BlotterFilters } from '@/types/reference-blotter'
import { attributionView } from '../reference/attribution'
import { billingView } from '../reference/billing'
import { blotterView } from '../reference/blotter'
import { modelDetail, modelsView } from '../reference/models'
import { practiceView } from '../reference/practice'
import { reconciliationView } from '../reference/reconciliation'
import { accountRiskView, bookRiskView } from '../reference/risk'
import { notFound } from './utils'
import { firmViewer } from './workspace-http'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const served = <T extends Record<string, unknown>>(view: T | undefined) => (view === undefined ? notFound() : HttpResponse.json(view))
const badFilter = (message: string) => HttpResponse.json({ code: 'BAD_FILTER', message }, { status: 400 })

function blotterFilters(url: URL): { ok: true; filters: BlotterFilters } | { ok: false; message: string } {
  const read = (key: string) => url.searchParams.get(key) || undefined
  const [status, accountId, since, until] = [read('status'), read('accountId'), read('since'), read('until')]
  if (status !== undefined && !isBlotterStatus(status)) return { ok: false, message: `${status} is not an order status.` }
  if ((since !== undefined && !ISO_DAY.test(since)) || (until !== undefined && !ISO_DAY.test(until))) return { ok: false, message: 'Dates are YYYY-MM-DD.' }
  if (since !== undefined && until !== undefined && since > until) return { ok: false, message: 'The since date is after the until date.' }
  return { ok: true, filters: { ...(status ? { status } : {}), ...(accountId ? { accountId } : {}), ...(since ? { since } : {}), ...(until ? { until } : {}) } }
}

/** The firm's reference views. An outsider is told each does not exist before its query is read. */
export const workspaceReferenceHandlers = [
  http.get('/api/workspace/reference/billing', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(billingView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/practice', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(practiceView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/reconciliation', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(reconciliationView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/risk', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(bookRiskView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/risk/:accountId', ({ request, params }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(accountRiskView(viewer.viewerId, String(params.accountId))) : viewer.response
  }),
  http.get('/api/workspace/reference/attribution/:accountId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const period = new URL(request.url).searchParams.get('period') ?? 'ytd'
    if (!isAttributionPeriod(period)) return HttpResponse.json({ code: 'BAD_PERIOD', message: 'The period is mtd, qtd, ytd, 1y, 3y or 5y.' }, { status: 400 })
    return served(attributionView(viewer.viewerId, String(params.accountId), period))
  }),
  http.get('/api/workspace/reference/models', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(modelsView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/models/:modelId', ({ request, params }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(modelDetail(viewer.viewerId, String(params.modelId))) : viewer.response
  }),
  http.get('/api/workspace/reference/blotter', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const parsed = blotterFilters(new URL(request.url))
    return parsed.ok ? served(blotterView(viewer.viewerId, parsed.filters)) : badFilter(parsed.message)
  }),
]
```

In `src/mocks/handlers/workspace.ts`: import `{ workspaceReferenceHandlers } from './workspace-reference'`, `{ resolveBreak } from '../reference/reconciliation'` and `{ isBreakResolution } from '@/types/reference-reconciliation'`; add `...workspaceReferenceHandlers,` after `...workspaceProspectHandlers,`; and add to the `POST /api/workspace/acts` switch, before `default`:

```ts
      case 'resolve_break': {
        if (!nonEmptyString(body.breakId) || !nonEmptyString(body.fingerprint) || !isBreakResolution(body.resolution) || typeof body.rationale !== 'string') {
          return badRequest('breakId, fingerprint, a resolution (book_corrected, custodian_corrected or timing_difference) and a rationale are required.')
        }
        const r = resolveBreak(viewer, { breakId: body.breakId, fingerprint: body.fingerprint, resolution: body.resolution, rationale: body.rationale })
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
```

- [ ] **Step 4: Client functions and hooks**

Create `src/services/reference.ts`:

```ts
import { get, post } from './api-client'
import type { BindingAct } from '@/types/workspace'
import type { BillingView } from '@/types/reference-billing'
import type { PracticeView } from '@/types/reference-practice'
import type { ReconciliationView, ResolveBreakRequest } from '@/types/reference-reconciliation'
import type { AccountRiskView, BookRiskView } from '@/types/reference-risk'
import type { AttributionPeriod, AttributionView } from '@/types/reference-attribution'
import type { ModelDetail, ModelsView } from '@/types/reference-models'
import type { BlotterFilters, BlotterView } from '@/types/reference-blotter'

const as = (viewer: string) => ({ 'X-Viewer': viewer })
const at = (path: string) => `/workspace/reference${path}`

export const getBilling = (viewer: string) => get<BillingView>(at('/billing'), undefined, as(viewer))
export const getPractice = (viewer: string) => get<PracticeView>(at('/practice'), undefined, as(viewer))
export const getReconciliation = (viewer: string) => get<ReconciliationView>(at('/reconciliation'), undefined, as(viewer))
export const getBookRisk = (viewer: string) => get<BookRiskView>(at('/risk'), undefined, as(viewer))
export const getAccountRisk = (viewer: string, accountId: string) => get<AccountRiskView>(at(`/risk/${encodeURIComponent(accountId)}`), undefined, as(viewer))
export const getReferenceAttribution = (viewer: string, accountId: string, period: AttributionPeriod) =>
  get<AttributionView>(at(`/attribution/${encodeURIComponent(accountId)}`), { period }, as(viewer))
export const getReferenceModels = (viewer: string) => get<ModelsView>(at('/models'), undefined, as(viewer))
export const getReferenceModel = (viewer: string, modelId: string) => get<ModelDetail>(at(`/models/${encodeURIComponent(modelId)}`), undefined, as(viewer))
export const getBlotter = (viewer: string, filters: BlotterFilters) =>
  get<BlotterView>(at('/blotter'), Object.fromEntries(Object.entries(filters).filter((e): e is [string, string] => typeof e[1] === 'string')), as(viewer))
export const resolveBreak = (viewer: string, request: ResolveBreakRequest) =>
  post<BindingAct>('/workspace/acts', { kind: 'resolve_break', ...request }, as(viewer))
```

Create `src/hooks/use-reference.ts`:

```ts
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/services/reference'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { AttributionPeriod } from '@/types/reference-attribution'
import type { BlotterFilters } from '@/types/reference-blotter'
import type { ResolveBreakRequest } from '@/types/reference-reconciliation'
import { useInvalidateWorkspace } from './use-workspace'

/** Under the workspace prefix, so a release, a resolve or a take refreshes every reference view. */
const key = (viewerId: string, ...rest: unknown[]) => ['workspace', viewerId, 'reference', ...rest]

export function useBilling(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'billing'), queryFn: () => api.getBilling(viewerId), enabled })
}

export function usePractice(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'practice'), queryFn: () => api.getPractice(viewerId), enabled })
}

export function useReconciliation(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'reconciliation'), queryFn: () => api.getReconciliation(viewerId), enabled })
}

export function useBookRisk(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'risk'), queryFn: () => api.getBookRisk(viewerId), enabled })
}

export function useAccountRisk(accountId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'risk', accountId), queryFn: () => api.getAccountRisk(viewerId, accountId), enabled })
}

export function useReferenceAttribution(accountId: string, period: AttributionPeriod, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: key(viewerId, 'attribution', accountId, period), queryFn: () => api.getReferenceAttribution(viewerId, accountId, period),
    enabled, placeholderData: keepPreviousData,
  })
}

export function useReferenceModels(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'models'), queryFn: () => api.getReferenceModels(viewerId), enabled })
}

export function useReferenceModel(modelId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'models', modelId), queryFn: () => api.getReferenceModel(viewerId, modelId), enabled })
}

export function useBlotter(filters: BlotterFilters, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'blotter', filters), queryFn: () => api.getBlotter(viewerId, filters), enabled, placeholderData: keepPreviousData })
}

// Invalidate on settle, not success: a refused resolve (resolved meanwhile) must refresh what is on screen too.
export function useResolveBreak() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (request: ResolveBreakRequest) => api.resolveBreak(viewerId, request), onSettled: invalidate })
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-reference-api.test.ts src/hooks/__tests__/use-reference.test.tsx src/mocks/handlers/__tests__/workspace-write.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): firm-only reference endpoints, resolve_break over HTTP, client functions and hooks

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 7: Take to team thread — a row quoted into the thread about its subject, as a recorded card

Every view's primary rows become conversations (R14): the engine recomputes the row's quote from the view and the row id, finds the internal thread about the row's subject that the viewer is a member of (or opens one) and posts a `reference_row` card, once.

**Files:**
- Create: `src/mocks/reference/quotes.ts`, `src/mocks/reference/take.ts`, `src/mocks/reference/__tests__/take.test.ts`, `src/workspace/full-views/reference-href.ts`, `src/workspace/thread/ReferenceRowView.tsx`, `src/workspace/reference/TakeToTeamThread.tsx`, `src/workspace/__tests__/reference-href.test.ts`, `src/workspace/__tests__/reference-row.test.tsx`
- Modify: `src/types/reference.ts` (`TakeResult`), `src/types/workspace.ts` (`Message`), `src/mocks/data/workspace-store.ts` (counter `thread`), `src/mocks/handlers/workspace-reference.ts` (take endpoint), `src/services/reference.ts`, `src/hooks/use-reference.ts`, `src/workspace/thread/MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`

**Interfaces:**
- Consumes: `billingQuote`, `practiceQuote`, `reconciliationQuote`, `riskQuote`, `attributionQuote`, `modelQuote`, `blotterQuote` (Tasks 1–5); `nextAt`, `nextId`, `nextNumber`, `pad`, `store`; `formatFigure`; `personIn`.
- Produces:

```ts
// src/types/reference.ts
export type TakeResult = { threadId: string; threadTitle: string; messageId: string; created: boolean }

// src/types/workspace.ts — a new Message kind
| { kind: 'reference_row'; id: string; threadId: string; at: string; takenBy: string; view: ReferenceView; rowId: string; subject: Subject; claim: string; figures: Figure[]; citations: Citation[] }

// src/mocks/reference/quotes.ts
export function rowQuote(view: ReferenceView, rowId: string): RowQuote | undefined

// src/mocks/reference/take.ts
export function takeToTeamThread(viewerId: string, view: ReferenceView, rowId: string): { ok: true; created: boolean; thread: Thread; message: ReferenceRowMessage } | TakeFailure

// POST /api/workspace/reference/take { view, rowId } → 201 TakeResult (200 when already taken); 400 bad body; 404 outsider or NO_ROW
// src/services/reference.ts
export const takeToTeamThread: (viewer: string, view: ReferenceView, rowId: string) => Promise<TakeResult>
// src/hooks/use-reference.ts
export function useTakeToTeamThread()   // mutate({ view, rowId }) → TakeResult; invalidates the workspace on settle

// src/workspace/full-views/reference-href.ts
export const billingHref: (householdId?: string, fromThreadId?: string) => string          // /billing?household=…&from=…
export const practiceHref: (fromThreadId?: string) => string
export const reconciliationHref: (fromThreadId?: string) => string
export const bookRiskHref: (fromThreadId?: string) => string
export const accountRiskHref: (accountId: string, fromThreadId?: string) => string          // /accounts/:id/risk
export const accountAttributionHref: (accountId: string, fromThreadId?: string, period?: AttributionPeriod) => string
export const modelsHref: (fromThreadId?: string) => string
export const modelHref: (modelId: string, fromThreadId?: string) => string
export const blotterHref: (filters?: BlotterFilters, fromThreadId?: string) => string       // since/until, never from, for dates
export const REFERENCE_VIEW_TITLE: Readonly<Record<ReferenceView, string>>
export function referenceRowHref(view: ReferenceView, rowId: string, fromThreadId: string): string

// src/workspace/reference/TakeToTeamThread.tsx
export function TakeToTeamThread(props: { view: ReferenceView; rowId: string; rowLabel: string }): JSX.Element
// button accessible name `Take ${rowLabel} to a team thread`, visible text "Take to team thread"; once taken, a link "In <thread title>"
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/reference/__tests__/take.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { MODEL_DEFINITIONS } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { RECON_BREAKS } from '@/mocks/data/reconciliation'
import { MODEL_VERSIONS } from '@/mocks/data/model-governance'
import { REFERENCE_VIEWS, type ReferenceView } from '@/types/reference'
import { blotterView } from '../blotter'
import { attributionView } from '../attribution'
import { rowQuote } from '../quotes'
import { takeToTeamThread } from '../take'

const ADRIAN = 'user-001'
const take = (viewerId: string, view: ReferenceView, rowId: string) => {
  const r = takeToTeamThread(viewerId, view, rowId)
  if (!r.ok) throw new Error(r.message)
  return r
}

describe('take to team thread', () => {
  it("lands in the team thread about the row's subject, once", () => {
    const first = take(ADRIAN, 'risk', 'acc-002')
    expect(first).toMatchObject({ created: true, thread: { id: 'th-johnson-review' } })
    expect(first.message).toMatchObject({ kind: 'reference_row', threadId: 'th-johnson-review', takenBy: ADRIAN, view: 'risk', rowId: 'acc-002', subject: { type: 'account', id: 'acc-002' } })
    expect(first.message.claim).toBe("Robert Johnson Individual sits above Robert Johnson's risk tolerance.")
    const again = take(ADRIAN, 'risk', 'acc-002')
    expect(again).toMatchObject({ created: false, message: { id: first.message.id } })
    expect(store().messages.filter((m) => m.kind === 'reference_row')).toHaveLength(1)
  })

  it('a household row goes to the household thread', () => {
    expect(take(ADRIAN, 'billing', 'hh-001').thread.id).toBe('th-johnson-meeting')
  })

  it('opens a team thread when none is about the subject, and later rows join it', () => {
    const r = take(ADRIAN, 'risk', 'acc-045')
    expect(r.thread).toEqual({ id: 'th-ref-0001', title: 'Risk · Patel Digital Assets Account', visibility: 'internal', memberIds: ['user-001', 'user-002'], agentIds: [], subject: { type: 'account', id: 'acc-045' } })
    expect(take(ADRIAN, 'attribution', 'acc-045:ytd:digital_assets').thread.id).toBe('th-ref-0001')
  })

  it("someone outside the thread's members gets a thread they are in", () => {
    expect(take('cco-001', 'reconciliation', 'brk-002').thread).toMatchObject({ title: 'Reconciliation · brk-002 · Johnson Family Trust', memberIds: ['cco-001', 'user-001', 'user-002'] })
  })

  it('is 404 to outsiders and for a row the view does not have', () => {
    expect(takeToTeamThread('cli-001', 'risk', 'acc-002')).toMatchObject({ ok: false, status: 404 })
    expect(takeToTeamThread('prsp-011', 'billing', 'hh-001')).toMatchObject({ ok: false, status: 404 })
    expect(takeToTeamThread(ADRIAN, 'risk', 'acc-999')).toMatchObject({ ok: false, status: 404, code: 'NO_ROW' })
    expect(store().messages.filter((m) => m.kind === 'reference_row')).toHaveLength(0)
  })

  it('every primary row of every view quotes with no figure in its claim (record names keep their own digits)', () => {
    const rows: [ReferenceView, string][] = [
      ...households.map((h) => ['billing', h.id] as [ReferenceView, string]),
      ...households.map((h) => ['practice', h.id] as [ReferenceView, string]),
      ...RECON_BREAKS.map((b) => ['reconciliation', b.id] as [ReferenceView, string]),
      ...accounts.map((a) => ['risk', a.id] as [ReferenceView, string]),
      ...(attributionView(ADRIAN, 'acc-002', 'ytd')?.rows ?? []).map((r) => ['attribution', `acc-002:ytd:${r.assetClass}`] as [ReferenceView, string]),
      ...MODEL_DEFINITIONS.map((m) => ['models', m.id] as [ReferenceView, string]),
      ...MODEL_VERSIONS.map((v) => ['models', `${v.modelId}:v${v.version}`] as [ReferenceView, string]),
      ...(blotterView(ADRIAN, {})?.rows ?? []).map((r) => ['blotter', r.id] as [ReferenceView, string]),
    ]
    expect(new Set(rows.map(([view]) => view))).toEqual(new Set(REFERENCE_VIEWS))
    for (const [view, rowId] of rows) {
      const q = rowQuote(view, rowId)
      expect(q, `${view} ${rowId}`).toBeDefined()
      const claim = (q?.claim ?? '').replace(/\b529\b/g, '').replace(/UST-10Y|AAPLC185/g, '')
      expect(claim, `${view} ${rowId}`).not.toMatch(/\d/)
      for (const f of q?.figures ?? []) expect(f.source, `${view} ${rowId} ${f.label}`).not.toBe('')
    }
  })
})

describe('the take endpoint', () => {
  const post = (viewer: string, body: unknown) =>
    fetch('/api/workspace/reference/take', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Viewer': viewer }, body: JSON.stringify(body) })

  it('answers 201 then 200 with the same card, 400 to a bad body, 404 to outsiders', async () => {
    const first = await post(ADRIAN, { view: 'risk', rowId: 'acc-045' })
    expect(first.status).toBe(201)
    const result = await first.json()
    expect(result).toEqual({ threadId: 'th-ref-0001', threadTitle: 'Risk · Patel Digital Assets Account', messageId: expect.any(String), created: true })
    const second = await post(ADRIAN, { view: 'risk', rowId: 'acc-045' })
    expect(second.status).toBe(200)
    expect((await second.json()).messageId).toBe(result.messageId)
    expect((await post(ADRIAN, { view: 'tax', rowId: 'x' })).status).toBe(400)
    expect((await post(ADRIAN, { view: 'risk', rowId: 'acc-999' })).status).toBe(404)
    expect((await post('cli-001', { view: 'risk', rowId: 'acc-045' })).status).toBe(404)
  })
})
```

Create `src/workspace/__tests__/reference-href.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accountAttributionHref, billingHref, blotterHref, modelHref, referenceRowHref } from '@/workspace/full-views/reference-href'

describe('reference hrefs', () => {
  it('carry the thread they were opened from, and keep date filters apart from it', () => {
    expect(billingHref('hh-001', 'th-johnson-meeting')).toBe('/billing?household=hh-001&from=th-johnson-meeting')
    expect(blotterHref({ accountId: 'acc-002', since: '2026-02-25' }, 'th-johnson-review')).toBe('/blotter?accountId=acc-002&since=2026-02-25&from=th-johnson-review')
    expect(blotterHref()).toBe('/blotter')
    expect(accountAttributionHref('acc-002', undefined, '1y')).toBe('/accounts/acc-002/attribution?period=1y')
  })

  it('send a quoted row back to its view', () => {
    expect(referenceRowHref('attribution', 'acc-002:qtd:us_equity', 'th-x')).toBe('/accounts/acc-002/attribution?period=qtd&from=th-x')
    expect(referenceRowHref('models', 'mod-005:v3', 'th-x')).toBe(modelHref('mod-005', 'th-x'))
    expect(referenceRowHref('risk', 'acc-045', 'th-x')).toBe('/accounts/acc-045/risk?from=th-x')
    expect(referenceRowHref('reconciliation', 'brk-002', 'th-x')).toBe('/reconciliation?from=th-x')
  })
})
```

Create `src/workspace/__tests__/reference-row.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes, renderWithProviders } from '@/test/render'
import { takeToTeamThread } from '@/services/reference'
import { TakeToTeamThread } from '@/workspace/reference/TakeToTeamThread'

describe('a quoted row in a team thread', () => {
  it('reads as a card from its view, with its figures, its source and the way back', async () => {
    await takeToTeamThread('user-001', 'risk', 'acc-002')
    renderRoutes(routes, '/t/th-johnson-review')
    const card = await screen.findByRole('article', { name: "From Risk: Robert Johnson Individual sits above Robert Johnson's risk tolerance." })
    expect(within(card).getByRole('link', { name: 'Risk' })).toHaveAttribute('href', '/accounts/acc-002/risk?from=th-johnson-review')
    expect(card).toHaveTextContent('taken by Adrian Hale')
    expect(card).toHaveTextContent('Risk score')
    expect(card).toHaveTextContent('VaR, one month, 95%')
  })
})

describe('the Take to team thread button', () => {
  it('takes the row once and then links to the thread', async () => {
    renderWithProviders(<TakeToTeamThread view="risk" rowId="acc-045" rowLabel="Patel Digital Assets Account" />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Patel Digital Assets Account to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Risk · Patel Digital Assets Account' })).toHaveAttribute('href', '/t/th-ref-0001')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/reference/__tests__/take.test.ts src/workspace/__tests__/reference-href.test.ts src/workspace/__tests__/reference-row.test.tsx --testTimeout 30000`
Expected: FAIL — the modules do not exist.

- [ ] **Step 3: The message kind, the counter and the result type**

Append to `src/types/reference.ts`:

```ts
/** Where a take landed: the thread (found or opened) and the card, new or already there. */
export type TakeResult = { threadId: string; threadTitle: string; messageId: string; created: boolean }
```

In `src/types/workspace.ts` add `import type { ReferenceView } from './reference'` and, as the last member of `Message`:

```ts
  /** A row of a reference view quoted into a team thread: its claim, its figures with their sources, recomputed by the engine when taken. */
  | { kind: 'reference_row'; id: string; threadId: string; at: string; takenBy: string; view: ReferenceView; rowId: string; subject: Subject; claim: string; figures: Figure[]; citations: Citation[] }
```

In `src/mocks/data/workspace-store.ts` add `'thread'` to `Counter` and `thread: 0` to `counters` in `seed()`.

- [ ] **Step 4: Quotes and the take**

Create `src/mocks/reference/quotes.ts`:

```ts
import type { ReferenceView, RowQuote } from '@/types/reference'
import { attributionQuote } from './attribution'
import { billingQuote } from './billing'
import { blotterQuote } from './blotter'
import { modelQuote } from './models'
import { practiceQuote } from './practice'
import { reconciliationQuote } from './reconciliation'
import { riskQuote } from './risk'

/** A row of a view, quoted by the engine from the view and the row id alone. */
export function rowQuote(view: ReferenceView, rowId: string): RowQuote | undefined {
  switch (view) {
    case 'billing': return billingQuote(rowId)
    case 'practice': return practiceQuote(rowId)
    case 'reconciliation': return reconciliationQuote(rowId)
    case 'risk': return riskQuote(rowId)
    case 'attribution': return attributionQuote(rowId)
    case 'models': return modelQuote(rowId)
    case 'blotter': return blotterQuote(rowId)
  }
}
```

Create `src/mocks/reference/take.ts`:

```ts
import type { Message, Subject, Thread } from '@/types/workspace'
import type { ReferenceView, RowQuote } from '@/types/reference'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { rowQuote } from './quotes'

export type ReferenceRowMessage = Extract<Message, { kind: 'reference_row' }>
export type TakeFailure = { ok: false; status: 403 | 404; code: string; message: string }
export type Taken = { ok: true; created: boolean; thread: Thread; message: ReferenceRowMessage }

/** A thread opened for a row is the taker's, the advisor's and client service's (R14). */
const OPENED_WITH: readonly string[] = ['user-001', 'user-002']

const sameSubject = (a: Subject | undefined, b: Subject) => a !== undefined && a.type === b.type && a.id === b.id

function openThread(viewerId: string, quote: RowQuote): Thread {
  const thread: Thread = {
    id: `th-ref-${pad(nextNumber('thread'))}`, title: quote.threadTitle, visibility: 'internal',
    memberIds: [...new Set([viewerId, ...OPENED_WITH])], agentIds: [], subject: quote.subject,
  }
  store().threads.push(thread)
  return thread
}

/** The row, quoted into the first team thread about its subject the viewer is a member of (or one opened for it), once. */
export function takeToTeamThread(viewerId: string, view: ReferenceView, rowId: string): Taken | TakeFailure {
  if (!isFirmViewer(viewerId)) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Not found.' }
  if (!can(viewerId, 'post_firm')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only people who post in team threads can take a row to one.' }
  const quote = rowQuote(view, rowId)
  if (!quote) return { ok: false, status: 404, code: 'NO_ROW', message: 'That row is not in the view.' }
  const s = store()
  const thread = s.threads.find((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId) && sameSubject(t.subject, quote.subject)) ?? openThread(viewerId, quote)
  const existing = s.messages.find((m): m is ReferenceRowMessage => m.kind === 'reference_row' && m.threadId === thread.id && m.view === view && m.rowId === rowId)
  if (existing) return { ok: true, created: false, thread, message: existing }
  const message: ReferenceRowMessage = {
    kind: 'reference_row', id: nextId('msg'), threadId: thread.id, at: nextAt(), takenBy: viewerId, view, rowId,
    subject: quote.subject, claim: quote.claim, figures: quote.figures, citations: quote.citations,
  }
  s.messages.push(message)
  return { ok: true, created: true, thread, message }
}
```

- [ ] **Step 5: The endpoint, the client function and the hook**

In `src/mocks/handlers/workspace-reference.ts` import `{ isReferenceView, type TakeResult } from '@/types/reference'`, `{ takeToTeamThread } from '../reference/take'` and `{ badRequest, nonEmptyString, readJson, refusal } from './workspace-http'`, and append to `workspaceReferenceHandlers`:

```ts
  http.post('/api/workspace/reference/take', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    if (!body || !isReferenceView(body.view) || !nonEmptyString(body.rowId)) return badRequest('view (a reference view) and rowId are required.')
    const r = takeToTeamThread(viewer.viewerId, body.view, body.rowId)
    if (!r.ok) return refusal(r)
    const result: TakeResult = { threadId: r.thread.id, threadTitle: r.thread.title, messageId: r.message.id, created: r.created }
    return HttpResponse.json(result, { status: r.created ? 201 : 200 })
  }),
```

Append to `src/services/reference.ts` (adding `ReferenceView`, `TakeResult` to its type imports from `@/types/reference`):

```ts
export const takeToTeamThread = (viewer: string, view: ReferenceView, rowId: string) =>
  post<TakeResult>('/workspace/reference/take', { view, rowId }, as(viewer))
```

Append to `src/hooks/use-reference.ts` (adding `import type { ReferenceView } from '@/types/reference'`):

```ts
export function useTakeToTeamThread() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: ({ view, rowId }: { view: ReferenceView; rowId: string }) => api.takeToTeamThread(viewerId, view, rowId), onSettled: invalidate })
}
```

- [ ] **Step 6: The hrefs, the card and the button**

Create `src/workspace/full-views/reference-href.ts`:

```ts
import type { ReferenceView } from '@/types/reference'
import { isAttributionPeriod, type AttributionPeriod } from '@/types/reference-attribution'
import type { BlotterFilters } from '@/types/reference-blotter'

/** A path with its query; empty values are left out. `from` is always the thread to go back to. */
function withQuery(path: string, query: Readonly<Record<string, string | undefined>>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  const text = params.toString()
  return text ? `${path}?${text}` : path
}

export const billingHref = (householdId?: string, fromThreadId?: string) => withQuery('/billing', { household: householdId, from: fromThreadId })
export const practiceHref = (fromThreadId?: string) => withQuery('/practice', { from: fromThreadId })
export const reconciliationHref = (fromThreadId?: string) => withQuery('/reconciliation', { from: fromThreadId })
export const bookRiskHref = (fromThreadId?: string) => withQuery('/risk', { from: fromThreadId })
export const accountRiskHref = (accountId: string, fromThreadId?: string) => withQuery(`/accounts/${encodeURIComponent(accountId)}/risk`, { from: fromThreadId })
export const accountAttributionHref = (accountId: string, fromThreadId?: string, period?: AttributionPeriod) =>
  withQuery(`/accounts/${encodeURIComponent(accountId)}/attribution`, { period, from: fromThreadId })
export const modelsHref = (fromThreadId?: string) => withQuery('/models', { from: fromThreadId })
export const modelHref = (modelId: string, fromThreadId?: string) => withQuery(`/models/${encodeURIComponent(modelId)}`, { from: fromThreadId })
export const blotterHref = (filters: BlotterFilters = {}, fromThreadId?: string) =>
  withQuery('/blotter', { status: filters.status, accountId: filters.accountId, since: filters.since, until: filters.until, from: fromThreadId })

export const REFERENCE_VIEW_TITLE: Readonly<Record<ReferenceView, string>> = {
  billing: 'Billing', reconciliation: 'Reconciliation', risk: 'Risk', attribution: 'Attribution', models: 'Models', practice: 'Practice', blotter: 'Blotter',
}

/** Where a quoted row lives, opened from the thread it was quoted into. */
export function referenceRowHref(view: ReferenceView, rowId: string, fromThreadId: string): string {
  switch (view) {
    case 'billing': return billingHref(rowId, fromThreadId)
    case 'practice': return practiceHref(fromThreadId)
    case 'reconciliation': return reconciliationHref(fromThreadId)
    case 'risk': return accountRiskHref(rowId, fromThreadId)
    case 'attribution': {
      const [accountId = rowId, period] = rowId.split(':')
      return accountAttributionHref(accountId, fromThreadId, isAttributionPeriod(period) ? period : undefined)
    }
    case 'models': return modelHref(rowId.split(':')[0] ?? rowId, fromThreadId)
    case 'blotter': return blotterHref({}, fromThreadId)
  }
}
```

Create `src/workspace/thread/ReferenceRowView.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { Reading } from '@/kit/reading/Reading'
import { SourceChips } from '@/kit/source-chips/SourceChips'
import { personIn } from '@/workspace/people/directory-people'
import { REFERENCE_VIEW_TITLE, referenceRowHref } from '@/workspace/full-views/reference-href'
import type { Directory, Message } from '@/types/workspace'
import { formatFigure } from './figure-format'

type ReferenceRow = Extract<Message, { kind: 'reference_row' }>

/** A row from a reference view quoted into a team thread: its claim, its figures with their sources, and the way back to the view. */
export function ReferenceRowView({ message, directory }: { message: ReferenceRow; directory: Directory }) {
  const view = REFERENCE_VIEW_TITLE[message.view]
  return (
    <article aria-label={`From ${view}: ${message.claim}`} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-3">
          {'From '}
          <Link to={referenceRowHref(message.view, message.rowId, message.threadId)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{view}</Link>
          {` · taken by ${personIn(directory, message.takenBy).name}`}
        </span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <blockquote className="flex min-w-0 flex-col gap-3 border-l-2 border-rule-2 pl-4">
        <p className="text-copy">{message.claim}</p>
        {message.figures.length > 0 ? (
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {message.figures.map((fig, i) => {
              const { value, unit } = formatFigure(fig)
              return <Reading key={`${i}:${fig.label}`} label={fig.label} value={value} unit={unit} />
            })}
          </div>
        ) : null}
        <SourceChips sources={message.citations.map((c) => ({ label: c.source, asOf: c.asOf }))} />
      </blockquote>
    </article>
  )
}
```

In `src/workspace/thread/MessageView.tsx` import it and add before `default`:

```tsx
    case 'reference_row':
      return <ReferenceRowView message={message} directory={directory} />
```

In `src/workspace/workbench/CompactMessage.tsx` import `REFERENCE_VIEW_TITLE` and add:

```tsx
    case 'reference_row': return <Line who={personIn(directory, message.takenBy).name} at={message.at}>{`From ${REFERENCE_VIEW_TITLE[message.view]}: ${message.claim}`}</Line>
```

Create `src/workspace/reference/TakeToTeamThread.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/kit/button/Button'
import { useTakeToTeamThread } from '@/hooks/use-reference'
import type { ReferenceView, TakeResult } from '@/types/reference'

/** "Take to team thread": the row becomes a quoted card in the team thread about its subject, opened if there is none. */
export function TakeToTeamThread({ view, rowId, rowLabel }: { view: ReferenceView; rowId: string; rowLabel: string }) {
  const take = useTakeToTeamThread()
  const [taken, setTaken] = useState<TakeResult>()
  if (taken) {
    return (
      <Link to={`/t/${encodeURIComponent(taken.threadId)}`} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        {`In ${taken.threadTitle}`}
      </Link>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <Button rank="secondary" aria-label={`Take ${rowLabel} to a team thread`} disabled={take.isPending}
        onClick={() => take.mutate({ view, rowId }, { onSuccess: setTaken })}>
        Take to team thread
      </Button>
      {take.isError ? <span role="alert" className="text-body">{take.error.message}</span> : null}
    </span>
  )
}
```

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/mocks/reference src/workspace/__tests__/reference-href.test.ts src/workspace/__tests__/reference-row.test.tsx src/workspace/__tests__/thread.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): take a row to a team thread — quoted by the engine, into the thread about its subject, once

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 8: The reference frame — page, gate, Methods & sources, formatters, the Desk's Reference group, the command line and the Brief's reconciliation line

One frame every view shares: the way back to its thread, the firm-only band, one title, its readings and **Methods & sources**; one gate that says "not found" to outsiders and goes home on a switch; the measure formatters the views need; the Desk pane's "Reference" group; command-line destinations; and the Brief's reconciliation line (R15). A guard keeps production UI from importing values out of `src/mocks`.

**Files:**
- Create: `src/workspace/reference/ReferencePage.tsx`, `src/workspace/reference/MethodsAndSources.tsx`, `src/workspace/reference/ReferenceGate.tsx`, `src/workspace/reference/reference-words.ts`, `src/workspace/thread/ReconciliationNoticeView.tsx`, `src/kit/__tests__/measure-reference.test.ts`, `src/workspace/__tests__/reference-frame.test.tsx`, `src/__tests__/guardrails/mocks-boundary.test.ts`
- Modify: `src/kit/measure.ts`, `src/workspace/shell/ThreadList.tsx`, `src/app/use-destinations.ts`, `src/types/workspace.ts` (`Message`), `src/mocks/data/workspace-seed.ts`, `src/mocks/data/workspace-store.ts`, `src/workspace/thread/MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/workspace/__tests__/shell.test.tsx`, `src/mocks/workspace/__tests__/brief-remeasure.test.ts`
- Test: also `src/workspace/__tests__/brief-thread.test.tsx` if it counts the Brief's lines

**Interfaces:**
- Consumes: `useReconciliation`, `useReferenceModels` (Task 6); hrefs and `REFERENCE_VIEW_TITLE` (Task 7); `useGoHomeWhenHidden`, `FullViewNotFound`, `isNotFound`.
- Produces:

```ts
// src/kit/measure.ts
export const UNIT: { …; bps: 'bps' }
export const fmtRate: (fraction: number) => string        // 0.0085 → "0.85" (percent, two places)
export const fmtBasisPoints: (fraction: number) => string // 0.0074387 → "74.4"
export const fmtRatio: (v: number) => string              // 0.64 → "0.64"
export const fmtExposure: (v: number) => string           // -0.05 → "−0.05", 0.3 → "+0.30"
export const fmtEffect: (fraction: number) => string      // 0.00123 → "+0.12" (pp, two places)

// src/workspace/reference/ReferencePage.tsx
export function ReferencePage(props: { title: string; from: string | null; lead?: ReactNode; methods: readonly MethodNote[]; children: ReactNode }): JSX.Element
// src/workspace/reference/ReferenceGate.tsx
export function ReferenceGate<T>(props: { query: { isError: boolean; error: Error | null; data: T | undefined }; subject: string; children: (data: T) => ReactNode }): JSX.Element
// src/workspace/reference/MethodsAndSources.tsx — a region named "Methods & sources"; a modeled note carries the tag "MODELED"
// src/workspace/reference/reference-words.ts
export const BILLING_METHOD_WORDS, BLOTTER_STATUS_WORDS, BLOTTER_STATUS_TAG, TOLERANCE_TAG, INTEGRATION_STATUS_TAG, SEVERITY_WORDS, MATCH_KIND_WORDS, FREQUENCY_WORDS, SEGMENT_WORDS
// src/types/workspace.ts — a new Message kind
| { kind: 'reconciliation_notice'; id: string; threadId: string; at: string }
// src/mocks/data/workspace-seed.ts
export const RECONCILIATION_NOTICE: Message   // id 'msg-brecon', the Brief, at MOCK_NOW_ISO
```

- [ ] **Step 1: Write the failing tests**

Create `src/kit/__tests__/measure-reference.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { UNIT, fmtBasisPoints, fmtEffect, fmtExposure, fmtRate, fmtRatio } from '@/kit/measure'

describe('the reference formatters', () => {
  it('format rates, basis points, ratios, exposures and effects', () => {
    expect([fmtRate(0.0085), fmtRate(0.01), fmtRate(0.0074386)]).toEqual(['0.85', '1.00', '0.74'])
    expect(fmtBasisPoints(0.0074386)).toBe('74.4')
    expect(UNIT.bps).toBe('bps')
    expect([fmtRatio(0.64), fmtRatio(1.6)]).toEqual(['0.64', '1.60'])
    expect([fmtExposure(-0.05), fmtExposure(0.3), fmtExposure(0)]).toEqual(['−0.05', '+0.30', '0.00'])
    expect([fmtEffect(0.00123), fmtEffect(-0.0004), fmtEffect(0.00001)]).toEqual(['+0.12', '−0.04', '0.00'])
  })
})
```

Create `src/__tests__/guardrails/mocks-boundary.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles } from './detectors'

const ROOTS = ['src/workspace', 'src/app', 'src/kit', 'src/hooks', 'src/services']
const files = ROOTS.flatMap(listSourceFiles)
/** A value import (not `import type`) whose source is the mock engine. */
const VALUE_IMPORT_FROM_MOCKS = /^import\s+(?!type\b)[^;]*?from\s+['"](?:@\/mocks\/|(?:\.\.\/)+mocks\/)/m

describe('production UI reads the engine only through the API', () => {
  it('scans the UI, hooks and services', () => expect(files.length).toBeGreaterThan(50))
  it.each(files)('%s imports no value from src/mocks', (f) => {
    expect(readFileSync(join(process.cwd(), f), 'utf8')).not.toMatch(VALUE_IMPORT_FROM_MOCKS)
  })
})
```

Create `src/workspace/__tests__/reference-frame.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes, renderWithProviders } from '@/test/render'
import { resolveBreak, getReconciliation } from '@/services/reference'
import { ReferencePage } from '@/workspace/reference/ReferencePage'

const threadNav = () => screen.getByRole('navigation', { name: 'Threads' })
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the reference frame', () => {
  it('links back to the thread, bands the page firm-only, titles it once and ends with Methods & sources', () => {
    renderWithProviders(
      <ReferencePage title="Billing" from="th-johnson-meeting" methods={[{ label: 'Schedule', text: 'Tiered.', modeled: false }, { label: 'Quarter-end values', text: 'Modeled, not realized.', modeled: true }]}>
        <p>Readings</p>
      </ReferencePage>,
    )
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    expect(screen.getByRole('note', { name: "Visibility: Firm only · client can't see" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Billing' })).toBeInTheDocument()
    const methods = screen.getByRole('region', { name: 'Methods & sources' })
    expect(within(methods).getAllByText('MODELED')).toHaveLength(1)
    expect(methods).toHaveTextContent('Quarter-end valuesMODELED')
  })
})

describe('the Desk pane', () => {
  afterEach(() => sessionStorage.clear())

  it("offers the firm the Reference group, beneath the Desk's own links", async () => {
    renderRoutes(routes, '/')
    const reference = await within(threadNav()).findByRole('heading', { level: 2, name: 'Reference' })
    const pane = reference.closest('section') as HTMLElement
    expect(within(pane).getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Billing', '/billing'], ['Reconciliation', '/reconciliation'], ['Risk', '/risk'], ['Models', '/models'], ['Practice', '/practice'], ['Blotter', '/blotter'],
    ])
  })

  it('offers an outsider none of it', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/')
    await within(threadNav()).findByRole('link', { name: 'Robert Johnson' })
    expect(within(threadNav()).queryByRole('heading', { name: 'Reference' })).toBeNull()
  })
})

describe('the command line', () => {
  it('goes to every reference view, each thread account’s risk and attribution, and each model', async () => {
    renderRoutes(routes, '/')
    await within(threadNav()).findByRole('link', { name: 'Brief' })
    await userEvent.keyboard('/')
    const box = await screen.findByRole('combobox', { name: 'Go to' })
    await waitFor(() => expect(box).toHaveFocus())
    await waitFor(() => {
      const names = screen.getAllByRole('option').map((o) => o.textContent)
      for (const name of ['Billing', 'Reconciliation', 'Risk · book', 'Models', 'Practice', 'Blotter', 'Risk · Robert Johnson Individual',
        'Attribution · Robert Johnson Individual', 'Model · Ultra-HNW Multi-Strategy']) expect(names).toContain(name)
    })
  })
})

describe("the Brief's reconciliation line", () => {
  it('reads the open breaks and the cash match rate live, and links to the view', async () => {
    renderRoutes(routes, '/t/th-brief')
    const line = await screen.findByRole('article', { name: 'Reference · Reconciliation' })
    await waitFor(() => expect(line).toHaveTextContent('1 open break · cash matched 97.9%'))
    expect(within(line).getByRole('link', { name: 'Open reconciliation' })).toHaveAttribute('href', '/reconciliation?from=th-brief')
  })

  it('reads none once the break is resolved', async () => {
    const brk = (await getReconciliation('user-001')).breaks.find((b) => b.id === 'brk-002')
    if (!brk) throw new Error('brk-002 is listed')
    await resolveBreak('user-001', { breakId: brk.id, fingerprint: brk.fingerprint, resolution: 'timing_difference', rationale: 'Posted late.' })
    renderRoutes(routes, '/t/th-brief')
    const line = await screen.findByRole('article', { name: 'Reference · Reconciliation' })
    await waitFor(() => expect(line).toHaveTextContent('0 open breaks · cash matched 100.0%'))
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/measure-reference.test.ts src/__tests__/guardrails/mocks-boundary.test.ts src/workspace/__tests__/reference-frame.test.tsx --testTimeout 30000`
Expected: FAIL — the formatters, the frame, the Reference group, the destinations and the Brief line do not exist (the boundary guard passes already; it pins the rule).

- [ ] **Step 3: The formatters**

In `src/kit/measure.ts` change `UNIT` to `{ usd: 'USD', pp: 'pp', pct: '%', shares: 'sh', days: 'd', points: 'pts', bps: 'bps' } as const` and add after `fmtScore`:

```ts
/** A fee or rate in percent, two places: 0.0085 → "0.85". */
export const fmtRate = (fraction: number) => unsigned(fraction, 2, 2, 2)
/** A rate in basis points, one place: 0.0074387 → "74.4". */
export const fmtBasisPoints = (fraction: number) => unsigned(fraction, 1, 1, 4)
/** A ratio such as beta, two places. */
export const fmtRatio = (v: number) => unsigned(v, 2, 2)
/** A factor exposure, signed, two places. */
export const fmtExposure = (v: number) => signed(v, 2, 2)
/** An attribution effect in percentage points, signed, two places: 0.00123 → "+0.12". */
export const fmtEffect = (fraction: number) => signed(fraction, 2, 2, 2)
```

- [ ] **Step 4: The frame, the gate, Methods & sources and the words**

Create `src/workspace/reference/MethodsAndSources.tsx`:

```tsx
import { useId } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import type { MethodNote } from '@/types/reference'

/** How the view's figures were made; a modeled note is tagged, so nothing modeled reads as realized. */
export function MethodsAndSources({ notes }: { notes: readonly MethodNote[] }) {
  const titleId = useId()
  return (
    <Pane title="Methods & sources" titleId={titleId}>
      <dl className="flex min-w-0 flex-col gap-3">
        {notes.map((n) => (
          <div key={n.label} className="flex min-w-0 flex-col gap-1">
            <dt className="flex flex-wrap items-baseline gap-2 text-body font-semibold">{n.label}{n.modeled ? <Tag>MODELED</Tag> : null}</dt>
            <dd className="text-copy text-ink-2">{n.text}</dd>
          </div>
        ))}
      </dl>
    </Pane>
  )
}
```

Create `src/workspace/reference/ReferencePage.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import type { MethodNote } from '@/types/reference'
import { MethodsAndSources } from './MethodsAndSources'

type ReferencePageProps = { title: string; from: string | null; lead?: ReactNode; methods: readonly MethodNote[]; children: ReactNode }

/** Every reference view: the way back to its thread, the firm-only band, one title, its readings, and how they were made. */
export function ReferencePage({ title, from, lead, methods, children }: ReferencePageProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{title}</h1>
        {lead}
      </header>
      {children}
      <MethodsAndSources notes={methods} />
    </div>
  )
}
```

Create `src/workspace/reference/ReferenceGate.tsx`:

```tsx
import type { ReactNode } from 'react'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import { isNotFound } from '@/workspace/is-not-found'

type ReferenceQuery<T> = { isError: boolean; error: Error | null; data: T | undefined }

/** Firm only: an outsider is told the view does not exist, and a switch of "View as" to an outsider goes home. */
export function ReferenceGate<T>({ query, subject, children }: { query: ReferenceQuery<T>; subject: string; children: (data: T) => ReactNode }) {
  const hiddenFromNewViewer = useGoHomeWhenHidden(query)
  const loading = <p role="status" className="text-body text-ink-3">{`Loading ${subject.toLowerCase()}…`}</p>
  if (hiddenFromNewViewer) return loading
  if (query.isError && query.error) return isNotFound(query.error) ? <FullViewNotFound subject={subject} /> : <p role="alert" className="text-body">{query.error.message}</p>
  if (query.data === undefined) return loading
  return <>{children(query.data)}</>
}
```

Create `src/workspace/reference/reference-words.ts`:

```ts
import type { BillingMethod } from '@/types/reference-billing'
import type { BlotterStatus } from '@/types/reference-blotter'
import type { IntegrationStatus, MatchKind } from '@/types/reference-reconciliation'
import type { ToleranceStatus } from '@/types/reference-risk'

export const BILLING_METHOD_WORDS: Readonly<Record<BillingMethod, string>> = { advance: 'In advance', arrears: 'In arrears' }
export const BLOTTER_STATUS_WORDS: Readonly<Record<BlotterStatus, string>> = {
  working: 'Working', pending_compliance: 'Pending compliance', filled: 'Filled', cancelled: 'Cancelled', withdrawn: 'Withdrawn', returned: 'Returned',
}
export const BLOTTER_STATUS_TAG: Readonly<Record<BlotterStatus, string>> = {
  working: 'WORKING', pending_compliance: 'PENDING COMPLIANCE', filled: 'FILLED', cancelled: 'CANCELLED', withdrawn: 'WITHDRAWN', returned: 'RETURNED',
}
export const TOLERANCE_TAG: Readonly<Record<ToleranceStatus, string>> = { above: 'ABOVE TOLERANCE', within: 'WITHIN TOLERANCE', below: 'BELOW TOLERANCE' }
export const INTEGRATION_STATUS_TAG: Readonly<Record<IntegrationStatus, string>> = { synced: 'SYNCED', pending: 'PENDING', failed: 'FAILED' }
export const SEVERITY_WORDS: Readonly<Record<'low' | 'medium' | 'high', string>> = { low: 'Low', medium: 'Medium', high: 'High' }
export const MATCH_KIND_WORDS: Readonly<Record<MatchKind, string>> = { positions: 'Positions', cash: 'Cash', transactions: 'Transactions' }
export const FREQUENCY_WORDS: Readonly<Record<string, string>> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-annual', annual: 'Annual', threshold_only: 'On threshold only',
}
export const SEGMENT_WORDS: Readonly<Record<string, string>> = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }

/** A record's word from a map, or an error naming the value the map does not hold. */
export function wordFor(map: Readonly<Record<string, string>>, key: string): string {
  const word = map[key]
  if (word === undefined) throw new Error(`No word for "${key}"`)
  return word
}
```

- [ ] **Step 5: The Desk's Reference group and the command line**

In `src/workspace/shell/ThreadList.tsx` add, below `DESK`:

```tsx
/** The firm's reference views, one step from every thread. */
const REFERENCE: readonly { to: string; label: string }[] = [
  { to: '/billing', label: 'Billing' }, { to: '/reconciliation', label: 'Reconciliation' }, { to: '/risk', label: 'Risk' },
  { to: '/models', label: 'Models' }, { to: '/practice', label: 'Practice' }, { to: '/blotter', label: 'Blotter' },
]
```

and change `DeskLinks` to render the two panes, the link list factored into a `LinkPane`:

```tsx
function DeskLinks() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  if (!directory.data || isExternalViewerIn(directory.data, viewerId)) return null
  return (
    <>
      <LinkPane title="Desk" links={DESK} />
      <LinkPane title="Reference" links={REFERENCE} />
    </>
  )
}

function LinkPane({ title, links }: { title: string; links: readonly { to: string; label: string }[] }) {
  return (
    <Pane title={title}>
      <ul className="flex flex-col">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => cn('flex border-l-2 py-2 pl-3 pr-2 text-body hover:bg-face', isActive ? 'border-ink bg-face font-semibold' : 'border-transparent')}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </Pane>
  )
}
```

In `src/workspace/__tests__/shell.test.tsx` the two Desk assertions gain the group and its links: `['Desk', 'Reference', 'Private', 'Internal', 'Clients and prospects', 'Agents on this desk']` (and `['Desk', 'Reference', 'Internal', …]` for Mark); the link lists gain `'Billing', 'Reconciliation', 'Risk', 'Models', 'Practice', 'Blotter'` after `'Archive'`.

In `src/app/use-destinations.ts` import `{ useReferenceModels } from '@/hooks/use-reference'` and the hrefs, add above `useDestinations`:

```ts
const REFERENCE_DESTINATIONS: readonly { id: string; label: string; aliases: string[]; href: () => string }[] = [
  { id: 'billing', label: 'Billing', aliases: ['fees', 'billing runs'], href: () => billingHref() },
  { id: 'reconciliation', label: 'Reconciliation', aliases: ['breaks', 'custodian'], href: () => reconciliationHref() },
  { id: 'risk-book', label: 'Risk · book', aliases: ['risk', 'tolerance'], href: () => bookRiskHref() },
  { id: 'models', label: 'Models', aliases: ['model governance', 'benchmarks'], href: () => modelsHref() },
  { id: 'practice', label: 'Practice', aliases: ['revenue', 'book of business'], href: () => practiceHref() },
  { id: 'blotter', label: 'Blotter', aliases: ['orders', 'trades', 'fills'], href: () => blotterHref() },
]
```

read `const models = useReferenceModels(firmViewer).data?.models ?? []` beside the other queries, extend the doc comment ("…each prospect, each proposal's workbench, the reference views and each model, the desk and the kit."), and add before the Supervision entry:

```ts
    ...(firmViewer ? REFERENCE_DESTINATIONS.map((r) => ({ id: r.id, label: r.label, aliases: r.aliases, run: () => navigate(r.href()) })) : []),
    ...(firmViewer ? accounts.flatMap(({ data }) => (data ? [
      { id: `risk-${data.id}`, label: `Risk · ${data.name}`, aliases: ['risk'], run: () => navigate(accountRiskHref(data.id)) },
      { id: `attribution-${data.id}`, label: `Attribution · ${data.name}`, aliases: ['attribution', 'performance'], run: () => navigate(accountAttributionHref(data.id)) },
    ] : [])) : []),
    ...models.map((m) => ({ id: `model-${m.id}`, label: `Model · ${m.name}`, aliases: ['model'], run: () => navigate(modelHref(m.id)) })),
```

- [ ] **Step 6: The Brief's reconciliation line**

In `src/types/workspace.ts` add to `Message`:

```ts
  /** The Brief's line for reconciliation; its counts are read live from the reconciliation view. */
  | { kind: 'reconciliation_notice'; id: string; threadId: string; at: string }
```

In `src/mocks/data/workspace-seed.ts` add (importing `MOCK_NOW_ISO`):

```ts
/**
 * R15 · the Brief's reconciliation line, stamped at the morning's measurement like the Brief's findings and
 * kept out of SEED_MESSAGES, so the event clock's sequences do not move.
 */
export const RECONCILIATION_NOTICE: Message = { kind: 'reconciliation_notice', id: 'msg-brecon', threadId: 'th-brief', at: MOCK_NOW_ISO }
```

and in `src/mocks/data/workspace-store.ts` seed it: `messages: [...briefMessages(), { ...RECONCILIATION_NOTICE }, ...SEED_MESSAGES.map((m) => ({ ...m }))],`.

Create `src/workspace/thread/ReconciliationNoticeView.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { UNIT, fmtQuantity, fmtWeight } from '@/kit/measure'
import { useReconciliation } from '@/hooks/use-reference'
import { reconciliationHref } from '@/workspace/full-views/reference-href'
import type { Message } from '@/types/workspace'

type Notice = Extract<Message, { kind: 'reconciliation_notice' }>

/** The Brief's line for reconciliation: the open breaks and the cash match rate as they stand, and the way to the view. */
export function ReconciliationNoticeView({ notice }: { notice: Notice }) {
  const recon = useReconciliation()
  const cash = recon.data?.summary.rates.find((r) => r.kind === 'cash')
  const open = recon.data?.summary.openBreaks
  return (
    <article aria-label="Reference · Reconciliation" className="flex min-w-0 flex-col gap-2 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">Reference</p>
      <p className="text-copy font-semibold">Reconciliation</p>
      {recon.isError ? <p role="alert" className="text-body">{recon.error.message}</p>
        : open !== undefined && cash ? <p className="tabular text-copy">{`${fmtQuantity(open)} open ${open === 1 ? 'break' : 'breaks'} · cash matched ${fmtWeight(cash.rate)}${UNIT.pct}`}</p>
          : <p role="status" className="text-body text-ink-3">Loading reconciliation…</p>}
      <Link to={reconciliationHref(notice.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Open reconciliation</Link>
    </article>
  )
}
```

In `MessageView.tsx` add `case 'reconciliation_notice': return <ReconciliationNoticeView notice={message} />`; in `CompactMessage.tsx` add `case 'reconciliation_notice': return <Line who="Brief" at={message.at}>Reconciliation</Line>`.

In `src/mocks/workspace/__tests__/brief-remeasure.test.ts` add `m.kind !== 'reconciliation_notice'` to `openBrief`'s filter; run the Brief tests and update any expectation that counts the Brief's lines to the new truth (one more line, first among the lines, at the measurement time).

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/kit src/__tests__ src/workspace/__tests__/reference-frame.test.tsx src/workspace/__tests__/shell.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx src/workspace/__tests__/brief-thread.test.tsx src/mocks/workspace/__tests__/brief-remeasure.test.ts src/mocks/data/__tests__/workspace-seed.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): the reference frame — page, gate, Methods & sources, formatters, the Desk's Reference group, command-line destinations, the Brief's reconciliation line

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 9: The Billing and Practice views

**Files:**
- Create: `src/workspace/reference/BillingPage.tsx`, `src/workspace/reference/PracticePage.tsx`, `src/workspace/__tests__/billing-practice-views.test.tsx`
- Modify: `src/app/routes.tsx` (`billing`, `practice`), `src/workspace/full-views/HouseholdView.tsx` (the way in)

**Interfaces:**
- Consumes: `useBilling`, `usePractice` (Task 6); `ReferenceGate`, `ReferencePage`, `TakeToTeamThread`, words, formatters (Tasks 7–8); `billingHref` (Task 7).
- Produces: routes `/billing` (`?household=` picks the tier breakdown, `?run=` the run detail, `?from=` the back link) and `/practice`; the household view's link "Billing for this household".

- [ ] **Step 1: Write the failing view tests**

Create `src/workspace/__tests__/billing-practice-views.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getBilling, getPractice } from '@/services/reference'
import { fmtBasisPoints, fmtMoney } from '@/kit/measure'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the Billing view', () => {
  afterEach(() => sessionStorage.clear())

  it("reads today's fees, every household on the schedule, the tier breakdown, the runs and the exceptions", async () => {
    const engine = await getBilling('user-001')
    renderRoutes(routes, '/billing?household=hh-001&from=th-johnson-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(fmtMoney(engine.totals.annualFee))
    expect(main).toHaveTextContent('Comprehensive Wealth Management schedule')
    expect(screen.getByRole('table', { name: 'Fee schedule' })).toHaveTextContent('0.85')
    const households = screen.getByRole('table', { name: 'Households' })
    expect(within(households).getByRole('row', { name: /Garcia Household/ })).toHaveTextContent('In arrears')
    const tiers = screen.getByRole('table', { name: 'Tier breakdown · Johnson Household' })
    expect(tiers).toHaveTextContent('8,750,000')
    expect(tiers).toHaveTextContent('124,250')
    expect(screen.getByRole('table', { name: 'Billing runs' })).toHaveTextContent('Q1 2026')
    expect(screen.getByRole('table', { name: 'Run of 2026-01-02' })).toHaveTextContent('Q4 2025')
    expect(screen.getByRole('list', { name: 'Billing exceptions' })).toHaveTextContent('agreement bills in arrears')
    const methods = screen.getByRole('region', { name: 'Methods & sources' })
    expect(methods).toHaveTextContent('Quarter-end valuesMODELED')
  })

  it('picks another household for the tier breakdown', async () => {
    renderRoutes(routes, '/billing')
    await screen.findByRole('heading', { level: 1, name: 'Billing' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Household' }), 'Kim-Lee Household')
    expect(await screen.findByRole('table', { name: 'Tier breakdown · Kim-Lee Household' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Next tier at 2,000,000 USD: 0.85% on the slice above it.')
  })

  it('takes a household to its team thread', async () => {
    renderRoutes(routes, '/billing')
    await screen.findByRole('heading', { level: 1, name: 'Billing' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Johnson Household to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Johnson annual review' })).toHaveAttribute('href', '/t/th-johnson-meeting')
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/billing')
    expect(await screen.findByRole('heading', { level: 1, name: 'Billing not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Comprehensive Wealth Management')
  })

  it('is one step from the household view', async () => {
    renderRoutes(routes, '/households/hh-001?from=th-johnson-meeting')
    expect(await screen.findByRole('link', { name: 'Billing for this household' })).toHaveAttribute('href', '/billing?household=hh-001&from=th-johnson-meeting')
  })
})

describe('the Practice view', () => {
  afterEach(() => sessionStorage.clear())

  it('reads revenue from billing, the book from the accounts, and households by value', async () => {
    const engine = await getPractice('user-001')
    renderRoutes(routes, '/practice')
    expect(await screen.findByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(fmtMoney(engine.revenue.annual))
    expect(main).toHaveTextContent(`${fmtBasisPoints(engine.revenue.effectiveRate)}bps`)
    expect(main).toHaveTextContent('1,828')
    const rows = within(screen.getByRole('table', { name: 'Households by value' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Chen-Wong Household')
    expect(screen.getByRole('table', { name: 'By segment' })).toHaveTextContent('Platinum')
    expect(screen.getByRole('table', { name: 'Tenure' })).toHaveTextContent('5 to 10 years')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('Latest runMODELED')
    expect(main).not.toHaveTextContent(/Lisa Park|waterfall|capacity|growth trend/i)
  })

  it('takes a household to a new team thread', async () => {
    renderRoutes(routes, '/practice')
    await screen.findByRole('heading', { level: 1, name: 'Practice' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Chen-Wong Household to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Practice · Chen-Wong Household' })).toBeInTheDocument()
  })

  it('is not found for Dr. Pell', async () => {
    viewAsOnLoad('prsp-011')
    renderRoutes(routes, '/practice')
    expect(await screen.findByRole('heading', { level: 1, name: 'Practice not found' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/workspace/__tests__/billing-practice-views.test.tsx --testTimeout 30000`
Expected: FAIL — `/billing` and `/practice` render the not-found page.

- [ ] **Step 3: The Billing view**

Create `src/workspace/reference/BillingPage.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Select } from '@/kit/select/Select'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDate, fmtMoney, fmtRate, fmtTimestamp } from '@/kit/measure'
import { useBilling } from '@/hooks/use-reference'
import type { BillingView, HouseholdBilling } from '@/types/reference-billing'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { BILLING_METHOD_WORDS, SEGMENT_WORDS, wordFor } from './reference-words'

export function BillingPage() {
  const billing = useBilling()
  return <ReferenceGate query={billing} subject="Billing">{(view) => <Billing view={view} />}</ReferenceGate>
}

const usd = (v: number) => <Num text={fmtMoney(v)} />

function Billing({ view }: { view: BillingView }) {
  const [params, setParams] = useSearchParams()
  const set = (key: string) => (value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }
  const household = view.households.find((h) => h.householdId === params.get('household')) ?? view.households[0]
  const run = view.runs.find((r) => r.id === params.get('run')) ?? view.runs[0]
  return (
    <ReferencePage title="Billing" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`${view.schedule.name} schedule · billed quarterly · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Annual fees on today's value" value={fmtMoney(view.totals.annualFee)} unit={UNIT.usd} size="readout-md" />
        <Reading label="A quarter" value={fmtMoney(view.totals.quarterlyFee)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Effective rate" value={fmtRate(view.totals.effectiveRate)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Value billed on" value={fmtMoney(view.totals.value)} unit={UNIT.usd} size="readout-md" />
      </div>
      <Pane title="The schedule">
        <DataTable caption="Fee schedule" rows={view.schedule.tiers} getRowId={(t) => `tier-${t.rate}`} noun={{ singular: 'tier', plural: 'tiers' }} density="dense"
          columns={[
            { id: 'from', header: 'From', unit: UNIT.usd, align: 'right', cell: (t) => usd(t.from) },
            { id: 'upTo', header: 'Up to', unit: UNIT.usd, align: 'right', cell: (t) => (t.upTo === null ? 'and above' : usd(t.upTo)) },
            { id: 'rate', header: 'Rate', unit: UNIT.pct, align: 'right', cell: (t) => <Num text={fmtRate(t.rate)} /> },
          ]} />
      </Pane>
      <Pane title="Households" meta="On today's value">
        <DataTable caption="Households" rows={view.households} getRowId={(h) => h.householdId} noun={{ singular: 'household', plural: 'households' }}
          totals={{
            label: 'Total',
            tiesTo: { label: 'Σ household annual fees', expected: view.totals.annualFee, actual: view.households.reduce((s, h) => s + h.annualFee, 0) },
            cells: { value: usd(view.totals.value), annual: usd(view.totals.annualFee), quarterly: usd(view.totals.quarterlyFee) },
          }}
          columns={[
            { id: 'name', header: 'Household', cell: (h) => h.householdName },
            { id: 'segment', header: 'Segment', cell: (h) => wordFor(SEGMENT_WORDS, h.segment) },
            { id: 'method', header: 'Billing', cell: (h) => BILLING_METHOD_WORDS[h.method] },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.value), sortValue: (h) => h.value },
            { id: 'annual', header: 'Annual fee', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.annualFee), sortValue: (h) => h.annualFee },
            { id: 'rate', header: 'Effective', unit: UNIT.pct, align: 'right', cell: (h) => <Num text={fmtRate(h.effectiveRate)} />, sortValue: (h) => h.effectiveRate },
            { id: 'quarterly', header: 'A quarter', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.quarterlyFee) },
            { id: 'exceptions', header: 'Exceptions', cell: (h) => (h.openExceptionIds.length > 0 ? <Tag>{h.openExceptionIds.join(' · ')}</Tag> : null) },
            { id: 'take', header: 'Thread', cell: (h) => <TakeToTeamThread view="billing" rowId={h.householdId} rowLabel={h.householdName} /> },
          ]} />
      </Pane>
      {household ? <TierBreakdown households={view.households} household={household} onPick={set('household')} /> : null}
      <Pane title="Billing runs" meta="Modeled, not realized">
        <DataTable caption="Billing runs" rows={view.runs} getRowId={(r) => r.id} noun={{ singular: 'run', plural: 'runs' }} density="dense"
          columns={[
            { id: 'run', header: 'Run', cell: (r) => fmtDate(r.runDate) },
            { id: 'valued', header: 'Valued at', cell: (r) => fmtDate(r.valuationDate) },
            { id: 'advance', header: 'In advance', cell: (r) => r.advanceQuarter },
            { id: 'arrears', header: 'In arrears', cell: (r) => r.arrearsQuarter },
            { id: 'total', header: 'Total', unit: UNIT.usd, align: 'right', cell: (r) => usd(r.total) },
            { id: 'exceptions', header: 'Exceptions', cell: (r) => r.exceptionIds.join(' · ') },
          ]} />
        {run ? (
          <>
            <Select label="Run" value={run.id} onChange={set('run')} options={view.runs.map((r) => ({ value: r.id, label: `Run of ${fmtDate(r.runDate)}` }))} />
            <DataTable caption={`Run of ${fmtDate(run.runDate)}`} rows={run.households} getRowId={(h) => h.householdId} noun={{ singular: 'household', plural: 'households' }} density="dense"
              totals={{ label: 'Run total', tiesTo: { label: 'Σ household fees', expected: run.total, actual: run.households.reduce((s, h) => s + h.fee, 0) }, cells: { fee: usd(run.total) } }}
              columns={[
                { id: 'name', header: 'Household', cell: (h) => h.householdName },
                { id: 'method', header: 'Billing', cell: (h) => BILLING_METHOD_WORDS[h.method] },
                { id: 'covers', header: 'Covers', cell: (h) => h.covers },
                { id: 'valuation', header: 'Modeled valuation', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.valuation) },
                { id: 'fee', header: 'Fee', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.fee) },
              ]} />
          </>
        ) : null}
      </Pane>
      <Pane title="Exceptions">
        <ul aria-label="Billing exceptions" className="flex flex-col gap-3">
          {view.exceptions.map((e) => (
            <li key={e.id} className="flex min-w-0 flex-col gap-1 border-b border-rule pb-3 last:border-b-0">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-body font-semibold">{`${e.id} · ${e.householdName}`}</span>
                <Tag tone={e.resolvedAt ? 'outline' : 'solid'}>{e.resolvedAt ? 'RESOLVED' : 'OPEN'}</Tag>
                <span className="tabular ml-auto text-label text-ink-3">{`Opened ${fmtTimestamp(e.openedAt)}${e.resolvedAt ? ` · resolved ${fmtTimestamp(e.resolvedAt)}` : ''}`}</span>
              </span>
              <span className="text-copy text-ink-2">{e.description}</span>
            </li>
          ))}
        </ul>
      </Pane>
    </ReferencePage>
  )
}

function TierBreakdown({ households, household, onPick }: { households: HouseholdBilling[]; household: HouseholdBilling; onPick: (id: string) => void }) {
  return (
    <Pane title="Tier breakdown" meta={household.householdName}>
      <Select label="Household" value={household.householdId} onChange={onPick} options={households.map((h) => ({ value: h.householdId, label: h.householdName }))} />
      <DataTable caption={`Tier breakdown · ${household.householdName}`} rows={household.tiers} getRowId={(t) => `tier-${t.rate}`} noun={{ singular: 'tier', plural: 'tiers' }} density="dense"
        totals={{ label: 'Annual fee', tiesTo: { label: 'Σ tier fees', expected: household.annualFee, actual: household.tiers.reduce((s, t) => s + t.fee, 0) }, cells: { fee: usd(household.annualFee) } }}
        columns={[
          { id: 'tier', header: 'Tier', cell: (t) => (t.upTo === null ? `${fmtMoney(t.from)} and above` : `${fmtMoney(t.from)} to ${fmtMoney(t.upTo)}`) },
          { id: 'rate', header: 'Rate', unit: UNIT.pct, align: 'right', cell: (t) => <Num text={fmtRate(t.rate)} /> },
          { id: 'slice', header: 'Slice', unit: UNIT.usd, align: 'right', cell: (t) => usd(t.slice) },
          { id: 'fee', header: 'Fee', unit: UNIT.usd, align: 'right', cell: (t) => usd(t.fee) },
        ]} />
      {household.nextTier ? (
        <p className="tabular text-body text-ink-2">{`Next tier at ${fmtMoney(household.nextTier.at)} ${UNIT.usd}: ${fmtRate(household.nextTier.rate)}${UNIT.pct} on the slice above it.`}</p>
      ) : null}
    </Pane>
  )
}
```

- [ ] **Step 4: The Practice view**

Create `src/workspace/reference/PracticePage.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { UNIT, fmtBasisPoints, fmtDate, fmtMoney, fmtQuantity, fmtRatio, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { usePractice } from '@/hooks/use-reference'
import type { PracticeView } from '@/types/reference-practice'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { SEGMENT_WORDS, wordFor } from './reference-words'

export function PracticePage() {
  const practice = usePractice()
  return <ReferenceGate query={practice} subject="Practice">{(view) => <Practice view={view} />}</ReferenceGate>
}

const usd = (v: number) => <Num text={fmtMoney(v)} />

function Practice({ view }: { view: PracticeView }) {
  const [params] = useSearchParams()
  return (
    <ReferencePage title="Practice" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Revenue and the book of business · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Book value" value={fmtMoney(view.book.value)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Annual revenue" value={fmtMoney(view.revenue.annual)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Effective fee" value={fmtBasisPoints(view.revenue.effectiveRate)} unit={UNIT.bps} size="readout-md" />
        <Reading label="Households" value={fmtQuantity(view.book.households)} size="readout-md" />
        <Reading label="Clients" value={fmtQuantity(view.book.clients)} size="readout-md" />
        <Reading label="Accounts" value={fmtQuantity(view.book.accounts)} size="readout-md" />
      </div>
      <p className="tabular text-body text-ink-2">{`Latest billing run, ${fmtDate(view.revenue.lastRun.runDate)}: ${fmtMoney(view.revenue.lastRun.total)} ${UNIT.usd}, on modeled quarter-end values.`}</p>
      <Pane title="Households">
        <DataTable caption="Households by value" rows={view.households} getRowId={(h) => h.householdId} noun={{ singular: 'household', plural: 'households' }}
          columns={[
            { id: 'name', header: 'Household', cell: (h) => h.name },
            { id: 'segment', header: 'Segment', cell: (h) => wordFor(SEGMENT_WORDS, h.segment) },
            { id: 'since', header: 'Client since', cell: (h) => fmtDate(h.since), sortValue: (h) => h.since },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.value), sortValue: (h) => h.value },
            { id: 'fee', header: 'Annual fee', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.annualFee), sortValue: (h) => h.annualFee },
            { id: 'rate', header: 'Effective', unit: UNIT.bps, align: 'right', cell: (h) => <Num text={fmtBasisPoints(h.effectiveRate)} /> },
            { id: 'share', header: 'Of revenue', unit: UNIT.pct, align: 'right', cell: (h) => <Num text={fmtWeight(h.shareOfRevenue)} />, proportion: (h) => h.shareOfRevenue },
            { id: 'take', header: 'Thread', cell: (h) => <TakeToTeamThread view="practice" rowId={h.householdId} rowLabel={h.name} /> },
          ]} />
      </Pane>
      <Pane title="By segment">
        <DataTable caption="By segment" rows={view.bySegment} getRowId={(s) => s.segment} noun={{ singular: 'segment', plural: 'segments' }} density="dense"
          columns={[
            { id: 'segment', header: 'Segment', cell: (s) => wordFor(SEGMENT_WORDS, s.segment) },
            { id: 'households', header: 'Households', align: 'right', cell: (s) => <Num text={fmtQuantity(s.households)} /> },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (s) => usd(s.value) },
            { id: 'fee', header: 'Annual fee', unit: UNIT.usd, align: 'right', cell: (s) => usd(s.annualFee) },
            { id: 'rate', header: 'Effective', unit: UNIT.bps, align: 'right', cell: (s) => <Num text={fmtBasisPoints(s.effectiveRate)} /> },
          ]} />
      </Pane>
      <div className="grid gap-6 split:grid-cols-2">
        <Pane title="By account type">
          <DataTable caption="By account type" rows={view.byAccountType} getRowId={(r) => r.type} noun={{ singular: 'type', plural: 'types' }} density="dense"
            columns={[
              { id: 'type', header: 'Type', cell: (r) => r.type },
              { id: 'accounts', header: 'Accounts', align: 'right', cell: (r) => <Num text={fmtQuantity(r.accounts)} /> },
              { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => usd(r.value) },
            ]} />
        </Pane>
        <Pane title="By custodian">
          <DataTable caption="By custodian" rows={view.byCustodian} getRowId={(r) => r.custodian} noun={{ singular: 'custodian', plural: 'custodians' }} density="dense"
            columns={[
              { id: 'custodian', header: 'Custodian', cell: (r) => r.custodian },
              { id: 'accounts', header: 'Accounts', align: 'right', cell: (r) => <Num text={fmtQuantity(r.accounts)} /> },
              { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => usd(r.value) },
            ]} />
        </Pane>
        <Pane title="Tenure">
          <DataTable caption="Tenure" rows={view.tenure} getRowId={(t) => t.bucket} noun={{ singular: 'bucket', plural: 'buckets' }} density="dense"
            columns={[
              { id: 'bucket', header: 'With the firm', cell: (t) => t.bucket },
              { id: 'households', header: 'Households', align: 'right', cell: (t) => <Num text={fmtQuantity(t.households)} /> },
            ]} />
        </Pane>
        <Pane title="Concentration">
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <Reading label="HHI of household shares" value={fmtQuantity(view.concentration.hhi)} />
            <Reading label="Effective number of households" value={fmtRatio(view.concentration.effectiveN)} />
          </div>
        </Pane>
      </div>
    </ReferencePage>
  )
}
```

- [ ] **Step 5: Routes and the household view's way in**

In `src/app/routes.tsx` import `BillingPage` and `PracticePage` and add, after the archive route: `{ path: 'billing', element: <BillingPage />, handle: fullWidthHandle },` and `{ path: 'practice', element: <PracticePage />, handle: fullWidthHandle },`.

In `src/workspace/full-views/HouseholdView.tsx` import `billingHref` and add below the members list in the header:

```tsx
        <nav aria-label="Reference" className="flex flex-wrap gap-x-6 gap-y-1">
          <Link to={billingHref(view.id, from)} className={LINK}>Billing for this household</Link>
        </nav>
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/billing-practice-views.test.tsx src/workspace/__tests__/household-client-views.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS (the headings guard now walks `/billing` and `/practice` too).

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): the Billing and Practice views

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 10: The Reconciliation view — breaks, match rates, the trend, the integration log, and Resolve as a binding act

**Files:**
- Create: `src/workspace/reference/ReconciliationPage.tsx`, `src/workspace/reference/ResolveBreak.tsx`, `src/workspace/__tests__/reconciliation-view.test.tsx`
- Modify: `src/app/routes.tsx` (`reconciliation`)

**Interfaces:**
- Consumes: `useReconciliation`, `useResolveBreak` (Task 6); `ConfirmRecord` (`@/workspace/context/ConfirmRecord`); `BREAK_RESOLUTIONS`, `RESOLUTION_WORDS`, `isBreakResolution` (Task 2); the frame (Task 8).
- Produces: route `/reconciliation`; the button "Resolve <break id>" (only for a viewer whose permissions include `resolve_break`) opening the dialog "Resolve <break id>?" with the select "Resolution" and the field "Rationale"; the page status "Resolved · REC-nnnn" once recorded.

- [ ] **Step 1: Write the failing view tests**

Create `src/workspace/__tests__/reconciliation-view.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const breaks = () => screen.getByRole('table', { name: 'Breaks' })

async function open(path = '/reconciliation') {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Reconciliation' })
  return view
}

describe('the Reconciliation view', () => {
  afterEach(() => sessionStorage.clear())

  it('reads the breaks off the book, the match rates, the trend and the log that explains each feed', async () => {
    await open('/reconciliation?from=th-brief')
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-brief')
    const open002 = within(breaks()).getByRole('row', { name: /brk-002/ })
    for (const text of ['Johnson Family Trust', 'Schwab', 'Cash balance', '660,170', '660,020', 'OPEN']) expect(open002).toHaveTextContent(text)
    expect(within(breaks()).getByRole('row', { name: /brk-003/ })).toHaveTextContent('RESOLVED')
    expect(screen.getByRole('table', { name: 'Integrations' })).toHaveTextContent('MoneyGuidePro')
    expect(within(screen.getByRole('table', { name: 'Integrations' })).getByRole('row', { name: /MoneyGuidePro/ })).toHaveTextContent('PENDING')
    expect(screen.getByRole('list', { name: 'Integration log' })).toHaveTextContent('has not returned it')
    const trend = screen.getByRole('table', { name: '30-day trend' })
    expect(trend).toHaveTextContent('2026-01-27')
    expect(trend).toHaveTextContent('2026-02-25')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('Resolving a break is a binding act')
  })

  it('Adrian resolves brk-002 as a binding act; the row and the counts follow', async () => {
    await open()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Resolve brk-002' }))
    const dialog = await screen.findByRole('dialog', { name: 'Resolve brk-002?' })
    expect(dialog).toHaveTextContent('Recorded as a binding act in the Archive.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Resolution' }), 'Custodian corrected')
    await user.type(within(dialog).getByRole('textbox', { name: 'Rationale' }), 'Schwab reissued the 24 Feb cash file.')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent('Resolved · REC-0001'))
    await waitFor(() => expect(within(breaks()).getByRole('row', { name: /brk-002/ })).toHaveTextContent('RESOLVED'))
    expect(within(breaks()).getByRole('row', { name: /brk-002/ })).toHaveTextContent('Custodian corrected · Adrian Hale · REC-0001')
    expect(screen.queryByRole('button', { name: 'Resolve brk-002' })).toBeNull()
    expect(store().acts.filter((a) => a.kind === 'resolve_break')).toHaveLength(1)
  })

  it('offers Resolve to neither the analyst nor compliance', async () => {
    for (const viewer of ['user-003', 'cco-001']) {
      viewAsOnLoad(viewer)
      const { unmount } = await open()
      expect(within(breaks()).getByRole('row', { name: /brk-002/ })).toHaveTextContent('OPEN')
      expect(screen.queryByRole('button', { name: 'Resolve brk-002' })).toBeNull()
      unmount()
      sessionStorage.clear()
    }
  })

  it('takes a break to a team thread', async () => {
    await open()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take brk-002 to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Reconciliation · brk-002 · Johnson Family Trust' })).toBeInTheDocument()
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/reconciliation')
    expect(await screen.findByRole('heading', { level: 1, name: 'Reconciliation not found' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/workspace/__tests__/reconciliation-view.test.tsx --testTimeout 30000`
Expected: FAIL — `/reconciliation` renders the not-found page.

- [ ] **Step 3: The resolve control**

Create `src/workspace/reference/ResolveBreak.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Select } from '@/kit/select/Select'
import { TextInput } from '@/kit/text-input/TextInput'
import { UNIT, fmtMoney, fmtQuantity } from '@/kit/measure'
import { useResolveBreak } from '@/hooks/use-reference'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { BREAK_RESOLUTIONS, RESOLUTION_WORDS, isBreakResolution, type BreakResolution, type ReconBreakView } from '@/types/reference-reconciliation'

const reading = (b: ReconBreakView, v: number) => (b.unit === 'USD' ? `${fmtMoney(v)} ${UNIT.usd}` : b.unit === 'sh' ? `${fmtQuantity(v)} ${UNIT.shares}` : fmtQuantity(v))

/** Resolve: the advisor or client service closes a break as a binding act, against the figures on screen, with a rationale. */
export function ResolveBreak({ brk, onRecorded }: { brk: ReconBreakView; onRecorded: (actId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [resolution, setResolution] = useState<BreakResolution>('timing_difference')
  const [rationale, setRationale] = useState('')
  const resolve = useResolveBreak()
  const pick = (value: string) => {
    if (!isBreakResolution(value)) throw new Error(`${value} is not a resolution`)
    setResolution(value)
  }
  return (
    <>
      <Button rank="secondary" aria-label={`Resolve ${brk.id}`} onClick={() => setOpen(true)}>Resolve</Button>
      <ConfirmRecord open={open} onClose={() => setOpen(false)} title={`Resolve ${brk.id}?`}
        description={`${brk.accountName} · ${brk.fieldLabel}: the book ${reading(brk, brk.book)} against ${brk.custodian} ${reading(brk, brk.custodianValue)}. Recorded as a binding act in the Archive.`}
        mutation={resolve} variables={{ breakId: brk.id, fingerprint: brk.fingerprint, resolution, rationale }} onRecorded={onRecorded}
        blockedReason={rationale.trim() === '' ? 'Write the rationale first.' : undefined}>
        <Select label="Resolution" layout="stacked" value={resolution} onChange={pick} options={BREAK_RESOLUTIONS.map((r) => ({ value: r, label: RESOLUTION_WORDS[r] }))} />
        <TextInput label="Rationale" value={rationale} onChange={setRationale} />
      </ConfirmRecord>
    </>
  )
}
```

- [ ] **Step 4: The page**

Create `src/workspace/reference/ReconciliationPage.tsx`:

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney, fmtQuantity, fmtResult, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useDirectory } from '@/hooks/use-workspace'
import { useReconciliation } from '@/hooks/use-reference'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { RESOLUTION_WORDS, type ReconBreakView, type ReconciliationView } from '@/types/reference-reconciliation'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { ResolveBreak } from './ResolveBreak'
import { TakeToTeamThread } from './TakeToTeamThread'
import { INTEGRATION_STATUS_TAG, MATCH_KIND_WORDS, SEVERITY_WORDS } from './reference-words'

export function ReconciliationPage() {
  const recon = useReconciliation()
  return <ReferenceGate query={recon} subject="Reconciliation">{(view) => <Reconciliation view={view} />}</ReferenceGate>
}

const figure = (b: ReconBreakView, v: number) => <Num text={b.unit === 'USD' ? fmtMoney(v) : fmtQuantity(v)} />

function Reconciliation({ view }: { view: ReconciliationView }) {
  const [params] = useSearchParams()
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const canResolve = directory.data?.permissions[viewerId]?.includes('resolve_break') === true
  const [recorded, setRecorded] = useState<string>()
  return (
    <ReferencePage title="Reconciliation" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Book against custodian · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Open breaks" value={fmtQuantity(view.summary.openBreaks)} size="readout-md" />
        <Reading label="Resolved today" value={fmtQuantity(view.summary.resolvedToday)} size="readout-md" />
        {view.summary.rates.map((r) => (
          <Reading key={r.kind} label={`${MATCH_KIND_WORDS[r.kind]} matched`} value={fmtWeight(r.rate)} unit={UNIT.pct} size="readout-md"
            limit={`${fmtQuantity(r.checked)} checked · ${fmtQuantity(r.open)} open`} />
        ))}
      </div>
      {recorded ? <p role="status" className="text-body">{`Resolved · ${recorded}`}</p> : null}
      <Pane title="Breaks">
        <DataTable caption="Breaks" rows={view.breaks} getRowId={(b) => b.id} noun={{ singular: 'break', plural: 'breaks' }}
          mutedRow={(b) => b.status === 'resolved'}
          columns={[
            { id: 'id', header: 'Break', cell: (b) => b.id },
            { id: 'account', header: 'Account', wrap: true, cell: (b) => b.accountName },
            { id: 'custodian', header: 'Custodian', cell: (b) => b.custodian },
            { id: 'field', header: 'Field', cell: (b) => (b.symbol ? `${b.fieldLabel} · ${b.symbol}` : b.fieldLabel) },
            { id: 'book', header: 'Book', align: 'right', cell: (b) => figure(b, b.book) },
            { id: 'theirs', header: 'Custodian says', align: 'right', cell: (b) => figure(b, b.custodianValue) },
            { id: 'difference', header: 'Difference', align: 'right', cell: (b) => <Num text={fmtResult(b.difference)} /> },
            { id: 'severity', header: 'Severity', cell: (b) => SEVERITY_WORDS[b.severity] },
            { id: 'detected', header: 'Detected', cell: (b) => fmtTimestamp(b.detectedAt), sortValue: (b) => b.detectedAt },
            {
              id: 'status', header: 'Status', wrap: true, cell: (b) => (
                <span className="flex flex-col gap-1">
                  <Tag tone={b.status === 'open' ? 'solid' : 'outline'}>{b.status === 'open' ? 'OPEN' : 'RESOLVED'}</Tag>
                  {b.resolution ? <span className="text-label text-ink-2">{`${RESOLUTION_WORDS[b.resolution.resolution]} · ${b.resolution.actorName} · ${b.resolution.actId}`}</span>
                    : b.resolvedAt ? <span className="text-label text-ink-3">{`Before this session · ${fmtTimestamp(b.resolvedAt)}`}</span> : null}
                </span>
              ),
            },
            {
              id: 'actions', header: 'Actions', cell: (b) => (
                <span className="flex flex-wrap gap-2">
                  {b.status === 'open' && canResolve ? <ResolveBreak brk={b} onRecorded={setRecorded} /> : null}
                  <TakeToTeamThread view="reconciliation" rowId={b.id} rowLabel={b.id} />
                </span>
              ),
            },
          ]} />
      </Pane>
      <Pane title="Integrations">
        <DataTable caption="Integrations" rows={view.integrations} getRowId={(i) => i.name} noun={{ singular: 'integration', plural: 'integrations' }} density="dense"
          columns={[
            { id: 'name', header: 'Feed', cell: (i) => i.name },
            { id: 'kind', header: 'Kind', cell: (i) => (i.kind === 'custodian' ? 'Custodian' : 'Planning') },
            { id: 'status', header: 'Status', cell: (i) => <Tag tone={i.status === 'synced' ? 'outline' : 'solid'}>{INTEGRATION_STATUS_TAG[i.status]}</Tag> },
            { id: 'sync', header: 'Last sync', cell: (i) => (i.lastSync ? fmtTimestamp(i.lastSync) : 'Never') },
            { id: 'open', header: 'Open breaks', align: 'right', cell: (i) => <Num text={fmtQuantity(i.openBreaks)} /> },
          ]} />
        <ol aria-label="Integration log" className="flex flex-col gap-2">
          {view.integrations.flatMap((i) => i.log).sort((a, b) => b.at.localeCompare(a.at)).map((e) => (
            <li key={`${e.integration}-${e.at}`} className="flex min-w-0 flex-wrap items-baseline gap-x-3 text-body">
              <span className="tabular text-label text-ink-3">{fmtTimestamp(e.at)}</span>
              <span className="font-semibold">{e.integration}</span>
              <Tag>{INTEGRATION_STATUS_TAG[e.status]}</Tag>
              <span className="text-ink-2">{e.detail}</span>
            </li>
          ))}
        </ol>
      </Pane>
      <Pane title="30-day trend" meta="End of day; today as it stands">
        <DataTable caption="30-day trend" rows={[...view.trend].reverse()} getRowId={(p) => p.date} noun={{ singular: 'day', plural: 'days' }} density="dense"
          columns={[
            { id: 'date', header: 'Day', cell: (p) => p.date },
            { id: 'open', header: 'Open breaks', align: 'right', cell: (p) => <Num text={fmtQuantity(p.openBreaks)} /> },
            { id: 'positions', header: 'Positions', unit: UNIT.pct, align: 'right', cell: (p) => <Num text={fmtWeight(p.positions)} /> },
            { id: 'cash', header: 'Cash', unit: UNIT.pct, align: 'right', cell: (p) => <Num text={fmtWeight(p.cash)} /> },
            { id: 'transactions', header: 'Transactions', unit: UNIT.pct, align: 'right', cell: (p) => <Num text={fmtWeight(p.transactions)} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

- [ ] **Step 5: The route**

In `src/app/routes.tsx` import `ReconciliationPage` and add `{ path: 'reconciliation', element: <ReconciliationPage />, handle: fullWidthHandle },`.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/reconciliation-view.test.tsx src/workspace/__tests__/archive.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): the Reconciliation view — breaks, match rates, the trend, the integration log, Resolve as a binding act

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 11: The Risk views — the book against each client's tolerance, and one account's risk

**Files:**
- Create: `src/workspace/reference/BookRiskPage.tsx`, `src/workspace/reference/AccountRiskPage.tsx`, `src/workspace/__tests__/risk-views.test.tsx`
- Modify: `src/app/routes.tsx` (`risk`, `accounts/:accountId/risk`), `src/workspace/full-views/AccountView.tsx` (the account's Reference links: Risk, Attribution, Model)

**Interfaces:**
- Consumes: `useBookRisk`, `useAccountRisk`, `useReferenceModels` (Task 6); the frame and words (Task 8); `accountRiskHref`, `accountAttributionHref`, `modelHref` (Task 7).
- Produces: routes `/risk` and `/accounts/:accountId/risk` (subject "Account" for not-found); the account view's `nav` "Reference" with links "Risk", "Attribution" and "Model · <name>".

- [ ] **Step 1: Write the failing view tests**

Create `src/workspace/__tests__/risk-views.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getAccountRisk } from '@/services/reference'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { fmtMoney, fmtWeight } from '@/kit/measure'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('book risk', () => {
  afterEach(() => sessionStorage.clear())

  it('ranks every account against its client tolerance, the largest gap first', async () => {
    renderRoutes(routes, '/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk' })).toBeInTheDocument()
    const rows = within(screen.getByRole('table', { name: 'Accounts against tolerance' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Patel Digital Assets Account')
    expect(rows[1]).toHaveTextContent('ABOVE TOLERANCE')
    expect(within(rows[1] as HTMLElement).getByRole('link', { name: 'Patel Digital Assets Account' })).toHaveAttribute('href', '/accounts/acc-045/risk')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('Value at riskMODELED')
  })

  it('takes an account above tolerance to a team thread', async () => {
    renderRoutes(routes, '/risk')
    await screen.findByRole('heading', { level: 1, name: 'Risk' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Patel Digital Assets Account to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Risk · Patel Digital Assets Account' })).toHaveAttribute('href', '/t/th-ref-0001')
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk not found' })).toBeInTheDocument()
  })
})

describe('account risk', () => {
  afterEach(() => sessionStorage.clear())

  it('reads volatility, beta, VaR, tracking error, the score against tolerance, factors, concentration and stress', async () => {
    const engine = await getAccountRisk('user-001', 'acc-002')
    renderRoutes(routes, '/accounts/acc-002/risk?from=th-johnson-review')
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk · Robert Johnson Individual' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-review')
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(fmtMoney(engine.var95.value))
    expect(main).toHaveTextContent('one month, 95%')
    expect(main).toHaveTextContent('ABOVE TOLERANCE')
    expect(main).toHaveTextContent('Growth policy benchmark')
    expect(screen.getByRole('table', { name: 'Factor exposures' })).toHaveTextContent('Market (equity beta)')
    expect(screen.getByRole('table', { name: 'Stress tests' })).toHaveTextContent('2008 financial crisis')
    expect(screen.getByRole('table', { name: 'Largest positions' })).toHaveTextContent('SPY')
  })

  it('reads the moved book after the release', async () => {
    const before = await getAccountRisk('user-001', 'acc-002')
    release(approvedV1())
    const after = await getAccountRisk('user-001', 'acc-002')
    expect(after.volatility).not.toBe(before.volatility)
    renderRoutes(routes, '/accounts/acc-002/risk')
    await screen.findByRole('heading', { level: 1, name: 'Risk · Robert Johnson Individual' })
    expect(screen.getByRole('main')).toHaveTextContent(`Volatility${fmtWeight(after.volatility)}%`)
  })

  it('is not found for an unknown account and for Dr. Pell', async () => {
    const { unmount } = renderRoutes(routes, '/accounts/acc-999/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
    unmount()
    viewAsOnLoad('prsp-011')
    renderRoutes(routes, '/accounts/acc-002/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  })

  it('is one step from the account view, as are its attribution and its model', async () => {
    renderRoutes(routes, '/accounts/acc-002?from=th-johnson-review')
    const nav = await screen.findByRole('navigation', { name: 'Reference' })
    expect(within(nav).getByRole('link', { name: 'Risk' })).toHaveAttribute('href', '/accounts/acc-002/risk?from=th-johnson-review')
    expect(within(nav).getByRole('link', { name: 'Attribution' })).toHaveAttribute('href', '/accounts/acc-002/attribution?from=th-johnson-review')
    expect(await within(nav).findByRole('link', { name: 'Model · Growth' })).toHaveAttribute('href', '/models/mod-002?from=th-johnson-review')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/workspace/__tests__/risk-views.test.tsx --testTimeout 30000`
Expected: FAIL — the routes and the account view's links do not exist.

- [ ] **Step 3: The book page**

Create `src/workspace/reference/BookRiskPage.tsx`:

```tsx
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney, fmtPoints, fmtQuantity, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useBookRisk } from '@/hooks/use-reference'
import { accountRiskHref } from '@/workspace/full-views/reference-href'
import type { BookRiskView } from '@/types/reference-risk'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { TOLERANCE_TAG } from './reference-words'

export function BookRiskPage() {
  const risk = useBookRisk()
  return <ReferenceGate query={risk} subject="Risk">{(view) => <BookRisk view={view} />}</ReferenceGate>
}

function BookRisk({ view }: { view: BookRiskView }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title="Risk" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Every account against its client's tolerance · modeled, not realized · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Accounts above tolerance" value={fmtQuantity(view.aboveTolerance)} size="readout-md" limit={`of ${fmtQuantity(view.rows.length)} accounts`} />
      </div>
      <Pane title="Accounts">
        <DataTable caption="Accounts against tolerance" rows={view.rows} getRowId={(r) => r.accountId} noun={{ singular: 'account', plural: 'accounts' }}
          mutedRow={(r) => r.posture.status === 'within'}
          columns={[
            { id: 'account', header: 'Account', wrap: true, cell: (r) => <Link to={accountRiskHref(r.accountId, from)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{r.accountName}</Link> },
            { id: 'client', header: 'Client', cell: (r) => r.posture.tolerance.clientName },
            { id: 'model', header: 'Model', cell: (r) => r.modelName },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.value)} />, sortValue: (r) => r.value },
            { id: 'vol', header: 'Volatility', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.volatility)} />, sortValue: (r) => r.volatility },
            { id: 'var', header: 'VaR, 1 month', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.var95)} />, sortValue: (r) => r.var95 },
            { id: 'score', header: 'Score', unit: UNIT.points, align: 'right', cell: (r) => <Num text={fmtPoints(r.posture.score)} />, sortValue: (r) => r.posture.score },
            { id: 'tolerance', header: 'Tolerance', cell: (r) => `${fmtPoints(r.posture.tolerance.score)} · ${r.posture.tolerance.band}` },
            { id: 'status', header: 'Against tolerance', cell: (r) => <Tag tone={r.posture.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[r.posture.status]}</Tag>, sortValue: (r) => r.posture.gap },
            { id: 'take', header: 'Thread', cell: (r) => <TakeToTeamThread view="risk" rowId={r.accountId} rowLabel={r.accountName} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

- [ ] **Step 4: The account page**

Create `src/workspace/reference/AccountRiskPage.tsx`:

```tsx
import { useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtExposure, fmtMoney, fmtPoints, fmtQuantity, fmtRatio, fmtResult, fmtReturn, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useAccountRisk } from '@/hooks/use-reference'
import type { AccountRiskView } from '@/types/reference-risk'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { TOLERANCE_TAG } from './reference-words'

export function AccountRiskPage() {
  const { accountId } = useParams()
  if (!accountId) throw new Error('The account risk route needs an account id')
  return <AccountRiskGate key={accountId} accountId={accountId} />
}

function AccountRiskGate({ accountId }: { accountId: string }) {
  const risk = useAccountRisk(accountId)
  return <ReferenceGate query={risk} subject="Account">{(view) => <AccountRisk view={view} />}</ReferenceGate>
}

function AccountRisk({ view }: { view: AccountRiskView }) {
  const [params] = useSearchParams()
  const { posture } = view
  return (
    <ReferencePage title={`Risk · ${view.accountName}`} from={params.get('from')} methods={view.methods}
      lead={(
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-body text-ink-2">{`${view.clientName} · ${view.modelName} · tracking the ${view.benchmarkName} · modeled, not realized · as of ${fmtTimestamp(view.asOf)}`}</p>
          <TakeToTeamThread view="risk" rowId={view.accountId} rowLabel={view.accountName} />
        </div>
      )}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Volatility" value={fmtWeight(view.volatility)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Beta" value={fmtRatio(view.beta)} size="readout-md" />
        <Reading label="VaR" value={fmtMoney(view.var95.value)} unit={UNIT.usd} size="readout-md" limit={`${fmtWeight(view.var95.percent)}% of value · one month, 95%, parametric normal`} />
        <Reading label="Tracking error" value={fmtWeight(view.trackingError)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Risk score" value={fmtPoints(posture.score)} unit={UNIT.points} size="readout-md"
          limit={`${posture.band} · tolerance ${fmtPoints(posture.tolerance.score)}, ${posture.tolerance.band}, assessed ${posture.tolerance.assessedOn}`} />
      </div>
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone={posture.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[posture.status]}</Tag>
        <span className="text-ink-2">{`${posture.tolerance.clientName}'s questionnaire`}</span>
      </p>
      <Pane title="Factor exposures" meta="Model assumptions">
        <DataTable caption="Factor exposures" rows={view.factors} getRowId={(f) => f.factor} noun={{ singular: 'factor', plural: 'factors' }} density="dense"
          columns={[
            { id: 'factor', header: 'Factor', cell: (f) => f.label },
            { id: 'exposure', header: 'Account', align: 'right', cell: (f) => <Num text={fmtExposure(f.exposure)} /> },
            { id: 'benchmark', header: 'Benchmark', align: 'right', cell: (f) => <Num text={fmtExposure(f.benchmark)} /> },
            { id: 'active', header: 'Active', align: 'right', cell: (f) => <Num text={fmtExposure(f.active)} /> },
          ]} />
      </Pane>
      <Pane title="Concentration">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Reading label="HHI of positions" value={fmtQuantity(view.concentration.hhi)} />
          <Reading label="Effective number of positions" value={fmtRatio(view.concentration.effectiveN)} />
          <Reading label="Positions over their limit" value={fmtQuantity(view.concentration.breaches)} />
        </div>
        <DataTable caption="Largest positions" rows={view.concentration.top} getRowId={(c) => c.symbol} noun={{ singular: 'position', plural: 'positions' }} density="dense"
          columns={[
            { id: 'symbol', header: 'Symbol', cell: (c) => c.symbol },
            { id: 'name', header: 'Name', wrap: true, cell: (c) => c.name },
            { id: 'weight', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (c) => <Num text={fmtWeight(c.weight)} /> },
            { id: 'limit', header: 'Limit', unit: UNIT.pct, align: 'right', cell: (c) => <Num text={fmtWeight(c.limit)} /> },
            { id: 'breached', header: 'Breach', cell: (c) => (c.breached ? <Tag tone="solid">OVER LIMIT</Tag> : null) },
          ]} />
      </Pane>
      <Pane title="Stress tests" meta="Replayed on today's holdings">
        <DataTable caption="Stress tests" rows={view.stress} getRowId={(s) => s.id} noun={{ singular: 'scenario', plural: 'scenarios' }} density="dense"
          columns={[
            { id: 'name', header: 'Scenario', wrap: true, cell: (s) => s.name },
            { id: 'impact', header: 'Impact', unit: UNIT.pct, align: 'right', cell: (s) => <Num text={fmtReturn(s.impact)} /> },
            { id: 'value', header: 'Impact', unit: UNIT.usd, align: 'right', cell: (s) => <Num text={fmtResult(s.impactValue)} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

- [ ] **Step 5: Routes and the account view's Reference links**

In `src/app/routes.tsx` import both pages and add `{ path: 'risk', element: <BookRiskPage />, handle: fullWidthHandle },` and `{ path: 'accounts/:accountId/risk', element: <AccountRiskPage />, handle: fullWidthHandle },`.

In `src/workspace/full-views/AccountView.tsx` import `useReferenceModels` and the three hrefs, add below the imports `const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'`, render `<ReferenceLinks account={account} from={from} />` under the `h1` in `AccountReadings`, and add:

```tsx
/** The account's reference views: its risk, its attribution and its model, each remembering the thread. */
function ReferenceLinks({ account, from }: { account: Account; from: string | null }) {
  const models = useReferenceModels()
  const model = models.data?.models.find((m) => m.id === account.modelId)
  const back = from ?? undefined
  return (
    <nav aria-label="Reference" className="flex flex-wrap gap-x-6 gap-y-1">
      <Link to={accountRiskHref(account.id, back)} className={LINK}>Risk</Link>
      <Link to={accountAttributionHref(account.id, back)} className={LINK}>Attribution</Link>
      <Link to={modelHref(account.modelId, back)} className={LINK}>{model ? `Model · ${model.name}` : 'Model'}</Link>
    </nav>
  )
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/risk-views.test.tsx src/workspace/__tests__/account-view.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): the Risk views — the book against each client's tolerance, one account's risk; the account view's reference links

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 12: The Attribution and Models views, and a kit line chart for the benchmark line

**Files:**
- Create: `src/kit/series/SeriesLines.tsx`, `src/kit/__tests__/SeriesLines.test.tsx`, `src/workspace/reference/AttributionPage.tsx`, `src/workspace/reference/ModelsPage.tsx`, `src/workspace/reference/ModelPage.tsx`, `src/workspace/__tests__/attribution-models-views.test.tsx`
- Modify: `src/app/routes.tsx` (`accounts/:accountId/attribution`, `models`, `models/:modelId`)

**Interfaces:**
- Consumes: `useReferenceAttribution`, `useReferenceModels`, `useReferenceModel` (Task 6); the frame and words (Task 8); `assetClassLabel` (`@/workspace/asset-class-label`); hrefs (Task 7).
- Produces: routes `/accounts/:accountId/attribution` (`?period=` mtd|qtd|ytd|1y|3y|5y, default ytd), `/models`, `/models/:modelId`; kit `SeriesLines`:

```ts
// src/kit/series/SeriesLines.tsx
export function SeriesLines(props: {
  label: string                                       // the image's accessible name
  lines: readonly { name: string; values: readonly number[]; dashed?: boolean }[]   // same length, at least two points
  legend: readonly { name: string; value: string; dashed?: boolean }[]              // values formatted by the caller through measure
}): JSX.Element                                        // throws MeasureError on uneven or too-short series
```

- [ ] **Step 1: Write the failing tests**

Create `src/kit/__tests__/SeriesLines.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeasureError } from '@/kit/measure'
import { SeriesLines } from '@/kit/series/SeriesLines'

describe('SeriesLines', () => {
  it('draws each series as a line on one scale, named, with a legend', () => {
    const { container } = render(
      <SeriesLines label="Growth of 100" legend={[{ name: 'Account', value: '103.00' }, { name: 'Benchmark', value: '102.00', dashed: true }]}
        lines={[{ name: 'Account', values: [100, 101, 103] }, { name: 'Benchmark', values: [100, 100.5, 102], dashed: true }]} />,
    )
    expect(screen.getByRole('img', { name: 'Growth of 100' })).toBeInTheDocument()
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(container.querySelector('polyline.stroke-ink-3')?.getAttribute('stroke-dasharray')).toBe('4 3')
    expect(screen.getByText('Benchmark · 102.00')).toBeInTheDocument()
  })

  it('refuses series of different lengths or of one point', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<SeriesLines label="x" legend={[]} lines={[{ name: 'a', values: [1, 2] }, { name: 'b', values: [1] }]} />)).toThrow(MeasureError)
    expect(() => render(<SeriesLines label="x" legend={[]} lines={[{ name: 'a', values: [1] }]} />)).toThrow(MeasureError)
  })
})
```

Create `src/workspace/__tests__/attribution-models-views.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getReferenceAttribution } from '@/services/reference'
import { fmtReturn } from '@/kit/measure'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the Attribution view', () => {
  afterEach(() => sessionStorage.clear())

  it('reads the Brinson-Fachler rows, the returns, the benchmark and its modeled line', async () => {
    const engine = await getReferenceAttribution('user-001', 'acc-002', 'ytd')
    renderRoutes(routes, '/accounts/acc-002/attribution?from=th-johnson-review')
    expect(await screen.findByRole('heading', { level: 1, name: 'Attribution · Robert Johnson Individual' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(`Active return${fmtReturn(engine.activeReturn)}%`)
    expect(main).toHaveTextContent('Brinson-Fachler · single period, arithmetic, no linking · returns modeled, not realized')
    expect(screen.getByRole('img', { name: 'Modeled growth of 100 · Robert Johnson Individual against the Growth policy benchmark' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Benchmark components' })).toHaveTextContent('Bloomberg US Aggregate')
    expect(screen.getByRole('table', { name: 'Attribution · Year to date' })).toHaveTextContent('US Equity')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('ReturnsMODELED')
  })

  it('changes period over the same derivation', async () => {
    renderRoutes(routes, '/accounts/acc-002/attribution')
    await screen.findByRole('heading', { level: 1, name: 'Attribution · Robert Johnson Individual' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Period' }), 'Three years')
    expect(await screen.findByRole('table', { name: 'Attribution · Three years' })).toBeInTheDocument()
  })

  it('takes an asset-class row to the account team thread', async () => {
    renderRoutes(routes, '/accounts/acc-002/attribution')
    await screen.findByRole('heading', { level: 1, name: 'Attribution · Robert Johnson Individual' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take US Equity to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Johnson Rebalance Review' })).toHaveAttribute('href', '/t/th-johnson-review')
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/accounts/acc-002/attribution')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  })
})

describe('the Models views', () => {
  afterEach(() => sessionStorage.clear())

  it('lists every model with its benchmark, its version and any pending one', async () => {
    renderRoutes(routes, '/models')
    expect(await screen.findByRole('heading', { level: 1, name: 'Models' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Models' })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    const ultra = within(table).getByRole('row', { name: /Ultra-HNW Multi-Strategy/ })
    expect(ultra).toHaveTextContent('v2 · v3 pending from 2026-04-01')
    expect(within(ultra).getByRole('link', { name: 'Ultra-HNW Multi-Strategy' })).toHaveAttribute('href', '/models/mod-005')
    expect(table).toHaveTextContent('Education 529 glide-path benchmark')
  })

  it('reads one model: targets with vehicles and indexes, the committee history, the accounts on it', async () => {
    renderRoutes(routes, '/models/mod-005')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ultra-HNW Multi-Strategy' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Targets' })).toHaveTextContent('HFRX Global Hedge Fund')
    const history = screen.getByRole('table', { name: 'Version history' })
    for (const text of ['Mike Chen', 'Investment Committee', 'PENDING APPROVAL', '2026-04-01', 'Reduced US equity from 40% to 35%']) expect(history).toHaveTextContent(text)
    expect(history).not.toHaveTextContent(/Sarah Kim|David Park|BXPE/)
    expect(screen.getByRole('table', { name: 'Accounts on this model' })).toHaveTextContent('Chen Family Irrevocable Trust')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Ultra-HNW Multi-Strategy v3 to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Model · Ultra-HNW Multi-Strategy' })).toBeInTheDocument()
  })

  it('is not found for an unknown model and for an outsider', async () => {
    const { unmount } = renderRoutes(routes, '/models/mod-999')
    expect(await screen.findByRole('heading', { level: 1, name: 'Model not found' })).toBeInTheDocument()
    unmount()
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/models')
    expect(await screen.findByRole('heading', { level: 1, name: 'Models not found' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/SeriesLines.test.tsx src/workspace/__tests__/attribution-models-views.test.tsx --testTimeout 30000`
Expected: FAIL — the chart, the pages and the routes do not exist.

- [ ] **Step 3: The kit line chart**

Create `src/kit/series/SeriesLines.tsx`:

```tsx
import { MeasureError } from '@/kit/measure'

type Line = { name: string; values: readonly number[]; dashed?: boolean }
type LegendItem = { name: string; value: string; dashed?: boolean }

const WIDTH = 600
const HEIGHT = 160
const PAD = 6

/** Series on one shared scale, drawn as lines with no axes; the legend names each line and its last value, formatted by the caller. */
export function SeriesLines({ label, lines, legend }: { label: string; lines: readonly Line[]; legend: readonly LegendItem[] }) {
  const length = lines[0]?.values.length ?? 0
  if (length < 2 || lines.some((l) => l.values.length !== length)) {
    throw new MeasureError(`"${label}" needs two or more points in every line, the same number in each`)
  }
  const all = lines.flatMap((l) => l.values)
  const min = Math.min(...all)
  const span = Math.max(...all) - min || 1
  const x = (i: number) => PAD + (i * (WIDTH - 2 * PAD)) / (length - 1)
  const y = (v: number) => HEIGHT - PAD - ((v - min) * (HEIGHT - 2 * PAD)) / span
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <svg role="img" aria-label={label} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full">
        {lines.map((l) => (
          <polyline key={l.name} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={l.dashed ? 1.5 : 2}
            strokeDasharray={l.dashed ? '4 3' : undefined} className={l.dashed ? 'stroke-ink-3' : 'stroke-ink'}
            points={l.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-6 gap-y-1 text-label text-ink-2">
        {legend.map((item) => (
          <span key={item.name} className="inline-flex items-baseline gap-2">
            <span aria-hidden="true" className={item.dashed ? 'inline-block w-4 border-t border-dashed border-ink-3' : 'inline-block w-4 border-t-2 border-ink'} />
            <span className="tabular">{`${item.name} · ${item.value}`}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 4: The Attribution page**

Create `src/workspace/reference/AttributionPage.tsx`:

```tsx
import { useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Select } from '@/kit/select/Select'
import { SeriesLines } from '@/kit/series/SeriesLines'
import { UNIT, fmtEffect, fmtPrice, fmtReturn, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useReferenceAttribution } from '@/hooks/use-reference'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { isAttributionPeriod, type AttributionPeriod, type AttributionView } from '@/types/reference-attribution'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'

export function AttributionPage() {
  const { accountId } = useParams()
  const [params] = useSearchParams()
  if (!accountId) throw new Error('The attribution route needs an account id')
  const asked = params.get('period')
  const period: AttributionPeriod = isAttributionPeriod(asked) ? asked : 'ytd'
  return <AttributionGate key={accountId} accountId={accountId} period={period} />
}

function AttributionGate({ accountId, period }: { accountId: string; period: AttributionPeriod }) {
  const attribution = useReferenceAttribution(accountId, period)
  return <ReferenceGate query={attribution} subject="Account">{(view) => <Attribution view={view} />}</ReferenceGate>
}

function Attribution({ view }: { view: AttributionView }) {
  const [params, setParams] = useSearchParams()
  const setPeriod = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('period', value)
    setParams(next, { replace: true })
  }
  const periodLabel = view.periods.find((p) => p.id === view.period)?.label ?? view.period
  const last = view.series[view.series.length - 1]
  return (
    <ReferencePage title={`Attribution · ${view.accountName}`} from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`${view.modelName} · against the ${view.benchmark.name} · gross of fees · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <Select label="Period" value={view.period} onChange={setPeriod} options={view.periods.map((p) => ({ value: p.id, label: p.label }))} />
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Portfolio return" value={fmtReturn(view.portfolioReturn)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Benchmark return" value={fmtReturn(view.benchmarkReturn)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Active return" value={fmtReturn(view.activeReturn)} unit={UNIT.pct} size="readout-md" />
      </div>
      <p className="text-body text-ink-2">Brinson-Fachler · single period, arithmetic, no linking · returns modeled, not realized</p>
      <Pane title="Effects by asset class" meta={periodLabel}>
        <DataTable caption={`Attribution · ${periodLabel}`} rows={view.rows} getRowId={(r) => r.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }}
          totals={{
            label: 'Total',
            cells: {
              allocation: <Num text={fmtEffect(view.totals.allocation)} />, selection: <Num text={fmtEffect(view.totals.selection)} />,
              interaction: <Num text={fmtEffect(view.totals.interaction)} />, total: <Num text={fmtEffect(view.totals.total)} />,
            },
          }}
          columns={[
            { id: 'class', header: 'Asset class', cell: (r) => assetClassLabel(r.assetClass) },
            { id: 'wp', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.portfolioWeight)} /> },
            { id: 'wb', header: 'Benchmark', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.benchmarkWeight)} /> },
            { id: 'rp', header: 'Return', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtReturn(r.portfolioReturn)} /> },
            { id: 'rb', header: 'Index return', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtReturn(r.benchmarkReturn)} /> },
            { id: 'allocation', header: 'Allocation', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.allocation)} /> },
            { id: 'selection', header: 'Selection', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.selection)} /> },
            { id: 'interaction', header: 'Interaction', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.interaction)} /> },
            { id: 'total', header: 'Total', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.total)} />, sortValue: (r) => r.total },
            { id: 'take', header: 'Thread', cell: (r) => <TakeToTeamThread view="attribution" rowId={`${view.accountId}:${view.period}:${r.assetClass}`} rowLabel={assetClassLabel(r.assetClass)} /> },
          ]} />
      </Pane>
      <Pane title="Benchmark line" meta="Modeled, not realized">
        {last ? (
          <SeriesLines label={`Modeled growth of 100 · ${view.accountName} against the ${view.benchmark.name}`}
            lines={[{ name: view.accountName, values: view.series.map((p) => p.portfolio) }, { name: view.benchmark.name, values: view.series.map((p) => p.benchmark), dashed: true }]}
            legend={[{ name: view.accountName, value: fmtPrice(last.portfolio) }, { name: view.benchmark.name, value: fmtPrice(last.benchmark), dashed: true }]} />
        ) : null}
      </Pane>
      <Pane title="The benchmark" meta={view.benchmark.kind === 'glide_path' ? 'Glide path at the current stage' : 'Policy blend'}>
        <DataTable caption="Benchmark components" rows={view.benchmark.components} getRowId={(c) => c.assetClass} noun={{ singular: 'sleeve', plural: 'sleeves' }} density="dense"
          columns={[
            { id: 'sleeve', header: 'Sleeve', cell: (c) => assetClassLabel(c.assetClass) },
            { id: 'index', header: 'Index', cell: (c) => c.index },
            { id: 'weight', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (c) => <Num text={fmtWeight(c.weight)} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

- [ ] **Step 5: The Models pages**

Create `src/workspace/reference/ModelsPage.tsx`:

```tsx
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { UNIT, fmtMoney, fmtQuantity, fmtTimestamp, fmtTolerance, fmtWeight } from '@/kit/measure'
import { useReferenceModels } from '@/hooks/use-reference'
import { modelHref } from '@/workspace/full-views/reference-href'
import type { ModelsView } from '@/types/reference-models'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { FREQUENCY_WORDS, versionWords, wordFor } from './reference-words'

export function ModelsPage() {
  const models = useReferenceModels()
  return <ReferenceGate query={models} subject="Models">{(view) => <Models view={view} />}</ReferenceGate>
}

function Models({ view }: { view: ModelsView }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title="Models" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Model governance · read-only · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <Pane title="Models">
        <DataTable caption="Models" rows={view.models} getRowId={(m) => m.id} noun={{ singular: 'model', plural: 'models' }}
          columns={[
            { id: 'name', header: 'Model', wrap: true, cell: (m) => <Link to={modelHref(m.id, from)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{m.name}</Link> },
            { id: 'risk', header: 'Risk profile', cell: (m) => m.riskLabel },
            { id: 'equity', header: 'Equity', unit: UNIT.pct, align: 'right', cell: (m) => <Num text={fmtWeight(m.equityShare)} />, sortValue: (m) => m.equityShare },
            { id: 'benchmark', header: 'Benchmark', wrap: true, cell: (m) => m.benchmark.name },
            { id: 'version', header: 'Version', cell: (m) => versionWords(m) },
            { id: 'accounts', header: 'Accounts', align: 'right', cell: (m) => <Num text={fmtQuantity(m.assignedAccounts)} /> },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (m) => <Num text={fmtMoney(m.totalValue)} />, sortValue: (m) => m.totalValue },
            { id: 'vol', header: 'Volatility', unit: UNIT.pct, align: 'right', cell: (m) => <Num text={fmtWeight(m.volatility)} /> },
            { id: 'band', header: 'Drift band', unit: UNIT.pp, align: 'right', cell: (m) => <Num text={fmtTolerance(m.driftTolerance)} /> },
            { id: 'rebalance', header: 'Rebalance', cell: (m) => wordFor(FREQUENCY_WORDS, m.rebalanceFrequency) },
            { id: 'take', header: 'Thread', cell: (m) => <TakeToTeamThread view="models" rowId={m.id} rowLabel={m.name} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

Create `src/workspace/reference/ModelPage.tsx`:

```tsx
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney, fmtQuantity, fmtTimestamp, fmtTolerance, fmtWeight } from '@/kit/measure'
import { useReferenceModel } from '@/hooks/use-reference'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { accountFullViewHref } from '@/workspace/full-views/full-view-href'
import type { ModelDetail } from '@/types/reference-models'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { FREQUENCY_WORDS, versionWords, wordFor } from './reference-words'

export function ModelPage() {
  const { modelId } = useParams()
  if (!modelId) throw new Error('The model route needs a model id')
  return <ModelGate key={modelId} modelId={modelId} />
}

function ModelGate({ modelId }: { modelId: string }) {
  const model = useReferenceModel(modelId)
  return <ReferenceGate query={model} subject="Model">{(view) => <Model view={view} />}</ReferenceGate>
}

function Model({ view }: { view: ModelDetail }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title={view.name} from={params.get('from')} methods={view.methods}
      lead={(
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-body text-ink-2">{`${view.description} · ${view.riskLabel} · against the ${view.benchmark.name} · ${versionWords(view)} · as of ${fmtTimestamp(view.asOf)}`}</p>
          <TakeToTeamThread view="models" rowId={view.id} rowLabel={view.name} />
        </div>
      )}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Accounts" value={fmtQuantity(view.assignedAccounts)} size="readout-md" />
        <Reading label="Value" value={fmtMoney(view.totalValue)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Equity" value={fmtWeight(view.equityShare)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Volatility" value={fmtWeight(view.volatility)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Drift band" value={fmtTolerance(view.driftTolerance)} unit={UNIT.pp} size="readout-md" limit={wordFor(FREQUENCY_WORDS, view.rebalanceFrequency)} />
      </div>
      <Pane title="Targets">
        <DataTable caption="Targets" rows={view.targets} getRowId={(t) => t.assetClass} noun={{ singular: 'sleeve', plural: 'sleeves' }} density="dense"
          columns={[
            { id: 'class', header: 'Sleeve', cell: (t) => assetClassLabel(t.assetClass) },
            { id: 'target', header: 'Target', unit: UNIT.pct, align: 'right', cell: (t) => <Num text={fmtWeight(t.targetWeight)} /> },
            { id: 'vehicle', header: 'Vehicle', cell: (t) => t.implementationSymbol ?? 'Cash' },
            { id: 'index', header: 'Benchmark index', cell: (t) => t.index },
          ]} />
      </Pane>
      <Pane title="Version history" meta="Investment Committee record">
        <DataTable caption="Version history" rows={[...view.versions].reverse()} getRowId={(v) => `v${v.version}`} noun={{ singular: 'version', plural: 'versions' }}
          columns={[
            { id: 'version', header: 'Version', cell: (v) => `v${v.version}` },
            { id: 'status', header: 'Status', cell: (v) => <Tag tone={v.status === 'approved' ? 'outline' : 'solid'}>{v.status === 'approved' ? 'APPROVED' : 'PENDING APPROVAL'}</Tag> },
            { id: 'proposed', header: 'Proposed by', cell: (v) => v.proposedByName },
            { id: 'approved', header: 'Approved', cell: (v) => (v.approvedBy && v.approvedOn ? `${v.approvedBy}, ${v.approvedOn}` : 'Not yet') },
            { id: 'effective', header: 'Effective', cell: (v) => v.effectiveDate },
            { id: 'changes', header: 'Changes', wrap: true, cell: (v) => v.changes.map((c) => c.description).join('; ') },
            { id: 'take', header: 'Thread', cell: (v) => <TakeToTeamThread view="models" rowId={`${view.id}:v${v.version}`} rowLabel={`${view.name} v${v.version}`} /> },
          ]} />
      </Pane>
      <Pane title="Accounts on this model">
        <DataTable caption="Accounts on this model" rows={view.accounts} getRowId={(a) => a.accountId} noun={{ singular: 'account', plural: 'accounts' }}
          columns={[
            { id: 'account', header: 'Account', wrap: true, cell: (a) => <Link to={accountFullViewHref(a.accountId, from)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{a.accountName}</Link> },
            { id: 'client', header: 'Client', cell: (a) => a.clientName },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (a) => <Num text={fmtMoney(a.value)} />, sortValue: (a) => a.value },
            { id: 'drift', header: 'Largest drift', unit: UNIT.pp, align: 'right', cell: (a) => <Num text={fmtWeight(a.maxAbsDrift)} /> },
            { id: 'band', header: 'Band', cell: (a) => (a.withinBand ? <Tag>WITHIN BAND</Tag> : <Tag tone="solid">OUTSIDE BAND</Tag>) },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

Add to `src/workspace/reference/reference-words.ts` (importing `ModelSummary` there as a type); both model pages import it:

```ts
/** "v2", or "v2 · v3 pending from 2026-04-01". */
export const versionWords = (m: Pick<ModelSummary, 'currentVersion' | 'pendingVersion'>) =>
  m.pendingVersion ? `v${m.currentVersion} · v${m.pendingVersion.version} pending from ${m.pendingVersion.effectiveDate}` : `v${m.currentVersion}`
```

- [ ] **Step 6: Routes**

In `src/app/routes.tsx` import the three pages and add `{ path: 'accounts/:accountId/attribution', element: <AttributionPage />, handle: fullWidthHandle },`, `{ path: 'models', element: <ModelsPage />, handle: fullWidthHandle },`, `{ path: 'models/:modelId', element: <ModelPage />, handle: fullWidthHandle },`.

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/kit src/workspace/__tests__/attribution-models-views.test.tsx src/workspace/__tests__/risk-views.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): the Attribution and Models views; a kit line chart for the modeled benchmark line

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 13: The Blotter view, and the way in from a thread's staged and filled orders

**Files:**
- Create: `src/workspace/reference/BlotterPage.tsx`, `src/workspace/proposal/BlotterLink.tsx`, `src/workspace/__tests__/blotter-view.test.tsx`
- Modify: `src/app/routes.tsx` (`blotter`), `src/workspace/context/ApprovalPanel.tsx` (staged and filled orders), `src/workspace/thread/FillsView.tsx`

**Interfaces:**
- Consumes: `useBlotter` (Task 6); `BLOTTER_STATUSES`, `isBlotterStatus` (Task 5); `blotterHref` (Task 7); the frame and words (Task 8); `SIDE_WORDS` (`@/workspace/proposal/leg-status`).
- Produces: route `/blotter` (`?status&accountId&since&until&from`); `BlotterLink` — "Open in the blotter", filtered to the account, remembering the thread.

- [ ] **Step 1: Write the failing view tests**

Create `src/workspace/__tests__/blotter-view.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const orders = () => screen.getByRole('table', { name: 'Orders' })

describe('the Blotter view', () => {
  afterEach(() => sessionStorage.clear())

  it('lists the order management tickets with their status, price and value', async () => {
    renderRoutes(routes, '/blotter')
    expect(await screen.findByRole('heading', { level: 1, name: 'Blotter' })).toBeInTheDocument()
    expect(within(orders()).getByRole('row', { name: /ord-003/ })).toHaveTextContent('WORKING')
    expect(within(orders()).getByRole('row', { name: /ord-003/ })).toHaveTextContent('785.00 limit')
    expect(within(orders()).getByRole('row', { name: /ord-014/ })).toHaveTextContent('47,600')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('REC is the binding act')
  })

  it('filters by status through the URL', async () => {
    const { router } = renderRoutes(routes, '/blotter')
    await screen.findByRole('heading', { level: 1, name: 'Blotter' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Cancelled')
    await waitFor(() => expect(router.state.location.search).toBe('?status=cancelled'))
    await waitFor(() => expect(within(orders()).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual([expect.stringContaining('ord-009')]))
  })

  it("shows the session's fills with their proposal, version, fill and the release's REC id", async () => {
    const releaseAct = release(approvedV1())
    renderRoutes(routes, '/blotter?accountId=acc-002&status=filled')
    await screen.findByRole('heading', { level: 1, name: 'Blotter' })
    const rows = within(orders()).getAllByRole('row').slice(1).filter((r) => r.textContent?.includes('Johnson rebalance v1'))
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).toHaveTextContent('FILLED')
      expect(row).toHaveTextContent(releaseAct.id)
      expect(within(row).getByRole('link', { name: 'Johnson rebalance v1' })).toHaveAttribute('href', '/t/th-johnson-review')
    }
  })

  it('is one step from the thread that released the orders', async () => {
    release(approvedV1())
    renderRoutes(routes, '/t/th-johnson-review')
    const links = await screen.findAllByRole('link', { name: 'Open in the blotter' })
    for (const link of links) expect(link).toHaveAttribute('href', '/blotter?accountId=acc-002&from=th-johnson-review')
  })

  it('takes an order to a team thread about its account', async () => {
    renderRoutes(routes, '/blotter')
    await screen.findByRole('heading', { level: 1, name: 'Blotter' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take ord-001 to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Orders · Johnson Family Trust' })).toBeInTheDocument()
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/blotter')
    expect(await screen.findByRole('heading', { level: 1, name: 'Blotter not found' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/workspace/__tests__/blotter-view.test.tsx --testTimeout 30000`
Expected: FAIL — `/blotter` and the thread link do not exist.

- [ ] **Step 3: The page**

Create `src/workspace/reference/BlotterPage.tsx`:

```tsx
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Select } from '@/kit/select/Select'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney, fmtPrice, fmtQuantity, fmtTimestamp } from '@/kit/measure'
import { useBlotter } from '@/hooks/use-reference'
import { SIDE_WORDS } from '@/workspace/proposal/leg-status'
import { BLOTTER_STATUSES, isBlotterStatus, type BlotterFilters, type BlotterView } from '@/types/reference-blotter'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { BLOTTER_STATUS_TAG, BLOTTER_STATUS_WORDS } from './reference-words'

const FILTER_KEYS = ['status', 'accountId', 'since', 'until'] as const

function filtersFrom(params: URLSearchParams): BlotterFilters {
  const read = (key: string) => params.get(key) || undefined
  const status = read('status')
  return {
    ...(isBlotterStatus(status) ? { status } : {}),
    ...(read('accountId') ? { accountId: read('accountId') } : {}),
    ...(read('since') ? { since: read('since') } : {}),
    ...(read('until') ? { until: read('until') } : {}),
  }
}

export function BlotterPage() {
  const [params] = useSearchParams()
  const blotter = useBlotter(filtersFrom(params))
  return <ReferenceGate query={blotter} subject="Blotter">{(view) => <Blotter view={view} />}</ReferenceGate>
}

function Blotter({ view }: { view: BlotterView }) {
  const [params, setParams] = useSearchParams()
  const set = (key: (typeof FILTER_KEYS)[number]) => (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const dayOptions = (none: string) => [{ value: '', label: none }, ...view.days.map((d) => ({ value: d, label: d }))]
  return (
    <ReferencePage title="Blotter" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Every order across accounts · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Select label="Status" value={view.filters.status ?? ''} onChange={set('status')}
          options={[{ value: '', label: 'All statuses' }, ...BLOTTER_STATUSES.map((s) => ({ value: s, label: BLOTTER_STATUS_WORDS[s] }))]} />
        <Select label="Account" value={view.filters.accountId ?? ''} onChange={set('accountId')}
          options={[{ value: '', label: 'All accounts' }, ...view.accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        <Select label="Since" value={view.filters.since ?? ''} onChange={set('since')} options={dayOptions('Any day')} />
        <Select label="Until" value={view.filters.until ?? ''} onChange={set('until')} options={dayOptions('Any day')} />
        <Reading label="Orders shown" value={fmtQuantity(view.rows.length)} />
      </div>
      <Pane title="Orders">
        <DataTable caption="Orders" rows={view.rows} getRowId={(r) => r.id} noun={{ singular: 'order', plural: 'orders' }} density="dense"
          columns={[
            { id: 'id', header: 'Order', cell: (r) => r.id },
            { id: 'submitted', header: 'Submitted', cell: (r) => fmtTimestamp(r.submittedAt), sortValue: (r) => r.submittedAt },
            { id: 'account', header: 'Account', wrap: true, cell: (r) => r.accountName },
            { id: 'side', header: 'Side', cell: (r) => SIDE_WORDS[r.side] },
            { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol },
            { id: 'qty', header: 'Qty', align: 'right', cell: (r) => <Num text={fmtQuantity(r.quantity)} /> },
            { id: 'price', header: 'Price', align: 'right', cell: (r) => (r.price === undefined ? null : <span className="whitespace-nowrap"><Num text={fmtPrice(r.price)} />{r.priceKind === 'limit' ? ' limit' : ''}</span>) },
            { id: 'value', header: 'Value', align: 'right', cell: (r) => (r.value === undefined ? null : <Num text={fmtMoney(r.value)} />) },
            { id: 'currency', header: 'Ccy', cell: (r) => r.currency },
            { id: 'status', header: 'Status', cell: (r) => <Tag tone={r.status === 'filled' ? 'solid' : 'outline'}>{BLOTTER_STATUS_TAG[r.status]}</Tag> },
            {
              id: 'source', header: 'Source', wrap: true, cell: (r) => (r.source.kind === 'ticket' ? 'Ticket' : (
                <Link to={`/t/${encodeURIComponent(r.source.threadId)}`} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{`${r.source.title} v${r.source.version}`}</Link>
              )),
            },
            { id: 'rec', header: 'REC', cell: (r) => r.recId ?? '' },
            { id: 'filled', header: 'Filled', cell: (r) => (r.filledAt ? fmtTimestamp(r.filledAt) : '') },
            { id: 'take', header: 'Thread', cell: (r) => <TakeToTeamThread view="blotter" rowId={r.id} rowLabel={r.id} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
```

- [ ] **Step 4: The way in from a thread**

Create `src/workspace/proposal/BlotterLink.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom'
import { blotterHref } from '@/workspace/full-views/reference-href'

/** The account's orders on the blotter, opened from the thread on screen. */
export function BlotterLink({ accountId }: { accountId: string }) {
  const { threadId } = useParams()
  return (
    <Link to={blotterHref({ accountId }, threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
      Open in the blotter
    </Link>
  )
}
```

In `src/workspace/context/ApprovalPanel.tsx` render `{source ? <BlotterLink accountId={source.accountId} /> : null}` after `<StagedOrderList orders={orders} />`, and in `FilledOrders` render `{fills[0] ? <BlotterLink accountId={fills[0].accountId} /> : null}` after `<FillList … />`. In `src/workspace/thread/FillsView.tsx` render `{message.fills[0] ? <BlotterLink accountId={message.fills[0].accountId} /> : null}` after the "Released by …" paragraph.

- [ ] **Step 5: The route**

In `src/app/routes.tsx` import `BlotterPage` and add `{ path: 'blotter', element: <BlotterPage />, handle: fullWidthHandle },`.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/blotter-view.test.tsx src/workspace/__tests__/after-release.test.tsx src/workspace/__tests__/fills-view.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "feat(reference): the Blotter view, one step from a thread's staged and filled orders

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 14: Phase 6 carry-overs — the rollover line, the firm's name on Robert's letters, and her figures' bases

The Phase 6 final review left three wording residuals: Robert's recap read "Consolidating … asked about; comparison to follow." and was signed without the firm; Dr. Pell's later-year tranche taxes did not say they are at today's rates; and her "about 18% of your assets" and "about 95% in US stocks" lines used different bases without naming them.

**Files:**
- Modify: `src/mocks/agents/meeting-notes.ts` (`n-15`), `src/mocks/agents/meeting-recap.ts`, `src/mocks/agents/client-letter.ts`, `src/mocks/agents/prospect-proposal-agent.ts`, `src/mocks/agents/transfer-in.ts`, `src/workspace/prospect/ProspectApproval.tsx`, `src/workspace/prospect/ProspectProposalEmbed.tsx`
- Test: `src/mocks/workspace/__tests__/meeting-recap.test.ts`, `src/mocks/agents/__tests__/client-letter.test.ts`, `src/mocks/agents/__tests__/meeting-notes.test.ts`, `src/mocks/workspace/__tests__/prospect-proposals.test.ts`, `src/mocks/agents/__tests__/prospect-agents.test.ts`

**Interfaces:**
- Consumes: `FIRM_NAME` (`@/lib/firm`).
- Produces: no new names; the strings below are the contract the e2e reads.

- [ ] **Step 1: Change the pinned strings in the tests first**

1. `meeting-recap.test.ts:40` becomes `expect(draft.body.endsWith('If anything here is not as you remember it, please tell me.\n\nAdrian Hale\nLarkfield Advisory')).toBe(true)`; after line 54 add `expect(body).toContain("A rollover of your Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.")`.
2. `client-letter.test.ts:56` becomes `expect(letter.body.endsWith('Adrian Hale\nLarkfield Advisory')).toBe(true)`.
3. In `meeting-notes.test.ts`, inside `'adds no recommendation nobody made; a rollover is only asked about'`, add after the loop:

```ts
    expect(rollover[0]?.text).toBe("A rollover of your Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.")
    expect(notes.find((l) => l.id === 'n-15')?.text).toBe("A rollover of Robert's Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.")
```

4. In `prospect-proposals.test.ts`: line 52's expectation becomes `'Stryker Corp. (SYK): 1,390 shares, $542,378, about 18% of your total assets across both accounts.'`; in lines 65–66 replace `Moved in kind, you would hold about 95% in US stocks` with `Moved in kind, about 95% of the account you move to us would be in US stocks`, and `Moved in kind, she would hold about 95% in US stocks` with `Moved in kind, about 95% of the account she moves to us would be in US stocks` (the rest of each line unchanged); line 92 becomes `'- 2027: 695 shares, a gain of about $240,700, an estimated federal tax of about $57,300 at today\'s rates.'` (line 91, the current year, unchanged).
5. In `prospect-agents.test.ts:43` the figure label becomes `'Share of her total assets'`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-recap.test.ts src/mocks/agents/__tests__ src/mocks/workspace/__tests__/prospect-proposals.test.ts --testTimeout 30000`
Expected: FAIL on exactly the changed strings.

- [ ] **Step 3: The wording**

In `src/mocks/agents/meeting-notes.ts` replace `n-15` with:

```ts
  { id: 'n-15', section: 'client_requests', text: "A rollover of Robert's Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.", cites: ['t-16', 't-17', 't-18'],
    toClient: toRobert("A rollover of your Vanguard 401(k) and Patricia's TIAA 403(b) was asked about; comparison to follow.") },
```

In `src/mocks/agents/meeting-recap.ts` import `FIRM_NAME` from `@/lib/firm` and replace the paragraph `signerName,` with `` `${signerName}\n${FIRM_NAME}`, ``; in `src/mocks/agents/client-letter.ts` import it and replace `paragraphs.push(signer.name)` with `` paragraphs.push(`${signer.name}\n${FIRM_NAME}`) ``.

In `src/mocks/agents/prospect-proposal-agent.ts`:
- in `clientSummaryOf`'s holdings line, `about ${clientWholePercent(c.concentration.weightOfAssets)} of your assets.` becomes `about ${clientWholePercent(c.concentration.weightOfAssets)} of your total assets across both accounts.`;
- the tranche line becomes:

```ts
    ...c.tranches.map((t) => `- ${t.taxYear}: ${fmtQuantity(t.shares)} shares, a gain of about ${aboutMoney(t.gain)}, an estimated federal tax of about ${aboutMoney(t.tax)}${t.n > 1 ? " at today's rates" : ''}.`),
```

- `inKindVsModelLine` returns:

```ts
  const holder = voice === 'you' ? 'the account you move to us' : 'the account she moves to us'
  const whose = voice === 'you' ? 'your' : 'her'
  return `Moved in kind, about ${clientWholePercent(widest.transferred)} of ${holder} would be in ${label}${including}, against ${clientWholePercent(widest.target)} in the ${c.modelName} model. Reaching the model would take sales, each a tax decision to make with ${whose} CPA.`
```

(removing the old `[who, whose]` line).

In `src/mocks/agents/transfer-in.ts` the figure label `'Share of her assets'` becomes `'Share of her total assets'`. In `ProspectApproval.tsx` and `ProspectProposalEmbed.tsx` the words `% of her assets` become `% of her total assets across both accounts`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/mocks/workspace/__tests__ src/mocks/agents/__tests__ src/workspace/__tests__/prospect-work.test.tsx src/workspace/__tests__/recap.test.tsx src/workspace/__tests__/letter.test.tsx --testTimeout 30000`
Expected: PASS. A UI test that pins the old sentence is updated to the new one, never loosened.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A src
git commit -m "fix(copy): Phase 6 carry-overs — the rollover asked about, the firm's name on Robert's letters, her figures' bases and later-year rates

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 15: The story end to end, and the visual baselines

One presenter: the Phase 4 release → the blotter shows its fills → acc-002's risk and attribution read the moved book → the Brief's reconciliation line → resolve brk-002 → the Archive shows it → book risk → take the out-of-band account to a team thread → an outsider sees none of it. Then every baseline is regenerated and looked at.

**Files:**
- Create: `e2e-visual/reference-views.spec.ts`
- Modify: `e2e-visual/workspace-steps.ts`; existing specs only where they count what this phase added (the Desk's Reference group and its six links); `e2e-visual/__baselines__/*` (regenerated)

**Interfaces:**
- Consumes: the whole phase.
- Produces (`e2e-visual/workspace-steps.ts`):

```ts
export const deskLink: (page: Page, name: 'Supervision' | 'Archive' | 'Billing' | 'Reconciliation' | 'Risk' | 'Models' | 'Practice' | 'Blotter') => Locator
export async function resolveBreakNamed(page: Page, breakId: string, resolution: string, rationale: string): Promise<void>
export async function takeToTeamThread(page: Page, rowLabel: string): Promise<void>
```

- [ ] **Step 1: The steps**

In `e2e-visual/workspace-steps.ts` widen `deskLink`'s `name` to `'Supervision' | 'Archive' | 'Billing' | 'Reconciliation' | 'Risk' | 'Models' | 'Practice' | 'Blotter'`, and append:

```ts
/** Resolve a reconciliation break as a binding act, from the reconciliation view. */
export async function resolveBreakNamed(page: Page, breakId: string, resolution: string, rationale: string) {
  await page.getByRole('button', { name: `Resolve ${breakId}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: `Resolve ${breakId}?` })
  await dialog.getByLabel('Resolution').selectOption({ label: resolution })
  await dialog.getByLabel('Rationale').fill(rationale)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('main')).toContainText(/Resolved · REC-\d{4}/)
}

/** A row of a reference view, taken to its team thread; returns once the link to the thread shows. */
export async function takeToTeamThread(page: Page, rowLabel: string) {
  await page.getByRole('button', { name: `Take ${rowLabel} to a team thread`, exact: true }).click()
  await expect(page.getByRole('link', { name: /^In / }).first()).toBeVisible()
}
```

- [ ] **Step 2: The scenes and the story**

Create `e2e-visual/reference-views.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approve, askProposalAgent, conversation, deskLink, goTo, heading, releaseByShortcut, resolveBreakNamed, settle, takeToTeamThread, threadLink, viewAs, visit, type Theme,
} from './workspace-steps'

type Scene = { name: string; open: (page: Page) => Promise<void> }

const at = (path: string, title: string, theme: Theme = 'light') => async (page: Page) => {
  await visit(page, path, theme)
  await expect(heading(page)).toHaveText(title)
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'billing-light', open: at('/billing?household=hh-001', 'Billing') },
  { name: 'billing-dark', open: at('/billing?household=hh-001', 'Billing', 'dark') },
  { name: 'reconciliation-light', open: at('/reconciliation', 'Reconciliation') },
  { name: 'risk-book-light', open: at('/risk', 'Risk') },
  { name: 'risk-book-dark', open: at('/risk', 'Risk', 'dark') },
  { name: 'risk-account-light', open: at('/accounts/acc-002/risk', 'Risk · Robert Johnson Individual') },
  { name: 'attribution-light', open: at('/accounts/acc-002/attribution', 'Attribution · Robert Johnson Individual') },
  { name: 'models-light', open: at('/models', 'Models') },
  { name: 'model-light', open: at('/models/mod-005', 'Ultra-HNW Multi-Strategy') },
  { name: 'practice-light', open: at('/practice', 'Practice') },
  { name: 'blotter-light', open: at('/blotter', 'Blotter') },
]

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test.describe.configure({ timeout: 120_000 })

    test('baseline at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      await expect(page).toHaveScreenshot(`${scene.name}.png`, SCREENSHOT)
    })

    for (const width of [1024, 1440]) {
      test(`no page-level horizontal scroll and no clipped labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
      })
    }

    test('the page takes the full width: no thread list', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 900 })
      await scene.open(page)
      await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
    })
  })
}

test('one presenter: the release on the blotter, the moved book in risk and attribution, a break resolved and archived, an account taken to a thread', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. acc-002's factor exposures before anything moves.
  await visit(page, '/accounts/acc-002/risk', 'light')
  const factors = page.getByRole('table', { name: 'Factor exposures' })
  const before = await factors.textContent()

  // 2. The Phase 4 release: v1 approved, released by the presenter's shortcut.
  await askProposalAgent(page, 'light')
  await approve(page, 1)
  await releaseByShortcut(page)

  // 3. The blotter shows the fills, from the proposal, under the release's record.
  await page.getByRole('link', { name: 'Open in the blotter' }).first().click()
  await expect(heading(page)).toHaveText('Blotter')
  const orders = page.getByRole('table', { name: 'Orders' })
  await expect(orders).toContainText('Johnson rebalance v1')
  await expect(orders).toContainText('FILLED')
  await expect(orders).toContainText(/REC-\d{4}/)

  // 4. acc-002's risk and attribution read the moved book.
  await goTo(page, 'Risk · Robert Johnson Individual')
  await expect(heading(page)).toHaveText('Risk · Robert Johnson Individual')
  await expect(factors).not.toHaveText(before ?? '')
  await goTo(page, 'Attribution · Robert Johnson Individual')
  await expect(page.getByRole('table', { name: 'Attribution · Year to date' })).toBeVisible()

  // 5. The Brief's reconciliation line → the view → resolve brk-002 as a binding act.
  await visit(page, '/t/th-brief', 'light')
  const line = page.getByRole('article', { name: 'Reference · Reconciliation' })
  await expect(line).toContainText('1 open break')
  await line.getByRole('link', { name: 'Open reconciliation' }).click()
  await expect(heading(page)).toHaveText('Reconciliation')
  await resolveBreakNamed(page, 'brk-002', 'Timing difference', 'Schwab confirmed the 24 Feb cash sweep posted after the file was cut.')
  await expect(page.getByRole('table', { name: 'Breaks' }).getByRole('row', { name: /brk-002/ })).toContainText('RESOLVED')

  // 6. The Archive holds it.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await deskLink(page, 'Archive').click()
  await expect(page.getByRole('table', { name: 'Archive' })).toContainText('Resolved brk-002 · Johnson Family Trust cash balance: timing difference')

  // 7. Book risk: the out-of-band account becomes a team conversation.
  await deskLink(page, 'Risk').click()
  await expect(heading(page)).toHaveText('Risk')
  await takeToTeamThread(page, 'Patel Digital Assets Account')
  await page.getByRole('link', { name: 'In Risk · Patel Digital Assets Account' }).click()
  await expect(heading(page)).toHaveText('Risk · Patel Digital Assets Account')
  await expect(conversation(page).getByRole('article', { name: /^From Risk: Patel Digital Assets Account sits above / })).toBeVisible()
  await expect(threadLink(page, 'Risk · Patel Digital Assets Account')).toBeVisible()

  // 8. An outsider sees none of it.
  await viewAs(page, 'Robert Johnson · Client')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('heading', { name: 'Reference' })).toHaveCount(0)
  for (const [path, subject] of [['/billing', 'Billing'], ['/reconciliation', 'Reconciliation'], ['/risk', 'Risk'], ['/models', 'Models'], ['/practice', 'Practice'], ['/blotter', 'Blotter']]) {
    await visit(page, path, 'light')
    await expect(heading(page)).toHaveText(`${subject} not found`)
  }
})
```

- [ ] **Step 3: Run the new spec against a fresh baseline set**

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/reference-views.spec.ts`
Expected: the story and every layout check PASS; the eleven baseline tests FAIL only because their PNGs do not exist yet. Fix a story failure in the app (or a locator when the app is right), never by loosening an assertion.

- [ ] **Step 4: Update the older specs where they count what this phase added**

Run: `VISUAL_PORT=5195 pnpm visual`
Expected: the older specs fail only on (a) screenshot drift (the Desk pane's Reference group; the Brief's reconciliation line; Robert's letters signed with the firm; the Pell copy) and (b) assertions that count the Desk's links or the Brief's lines. Update (b) to the new truth; leave (a) for Step 5.

- [ ] **Step 5: Regenerate and look at every baseline**

Run: `VISUAL_PORT=5195 pnpm visual:update`
Then open every PNG under `e2e-visual/__baselines__/` that changed (`git status e2e-visual/__baselines__`) and look at it: the Desk pane shows "Reference" with its six links beneath "Desk"; each view shows the firm-only band, one title, readings, its tables and **Methods & sources** with "MODELED" tags; numbers are right-aligned in tabular figures; wide tables scroll inside their pane, never the page; the dark scenes use dark tokens throughout (the line chart's strokes included); nothing is clipped, overlapped or cut off. A wrong-looking PNG is a bug to fix before committing, not a baseline.

- [ ] **Step 6: Run everything once more**

Run: `VISUAL_PORT=5195 pnpm visual && pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add e2e-visual
git commit -m "test(visual): the reference views end to end — the release on the blotter, the moved book in risk and attribution, a break resolved and archived, an account taken to a thread; every baseline regenerated

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- **Spec coverage.** Views and placement → routes in Tasks 9–13 (thread list hidden by `fullWidthHandle`; `?from=` on every href, Task 7); opened from: command line and Desk (Task 8), household view → billing (Task 9), the Brief → reconciliation (Task 8), account view → risk, attribution, model (Task 11), staged/filled panels → blotter (Task 13). Outsiders: 404 from every endpoint (Tasks 1–7 engine gates, Task 6 HTTP), "not found" on every page (Tasks 9–13). Take to team thread → Task 7 (R14). Methods & sources → Task 8 frame, each engine's `methods`. Moved book → Tasks 3, 4, 5 tests and the Task 15 story. Engine: billing and practice → Task 1 (R1–R3, R5); reconciliation and `resolve_break` → Task 2 (R6, R7); risk → Task 4 (R10, R11); attribution and governance → Task 3 (R8, R9, R12); blotter → Task 5 (R13). Carry-overs → Task 14. Testing: engine bullets → Tasks 1–5, 7; UI → Tasks 8–13; end to end and baselines (each view light; billing and risk dark) → Task 15. Out of scope (redirects, README, CI, the merge; editing models; price history; multi-period linking; retired views) → nothing builds them.
- **Names used across tasks.** `REFERENCE_VIEWS`, `ReferenceView`, `MethodNote`, `RowQuote`, `TakeResult` (`src/types/reference.ts`); `billingView`, `billingRuns`, `householdBillings`, `annualFeeOn`, `modeledAccountValueAt`, `FIRM_FEE_SCHEDULE`, `billingQuote`; `practiceView`, `practiceQuote`; `reconciliationView`, `resolveBreak`, `breakClientId`, `reconciliationQuote`; `modelBenchmark`, `modelVolatility`, `equityShareOf`, `modelsView`, `modelDetail`, `modelQuote`; `attributionView`, `attributionQuote`; `factorRows`, `loadingOf`, `FACTORS`; `riskScoreOf`, `accountRiskView`, `bookRiskView`, `riskQuote`; `blotterView`, `blotterQuote`; `rowQuote`, `takeToTeamThread`; pms exports `riskProfileFor`, `attributionFor` (with `legs`), `periodReturnsFor`, `periodYears`, `performanceSeriesFor`, `MODEL_BANDS`, `concentrationFor`, `stressScenariosFor`; services `getBilling` … `getBlotter`, `resolveBreak`, `takeToTeamThread`; hooks `useBilling` … `useBlotter`, `useResolveBreak`, `useTakeToTeamThread`; hrefs `billingHref` … `blotterHref`, `referenceRowHref`, `REFERENCE_VIEW_TITLE`; UI `ReferencePage`, `ReferenceGate`, `MethodsAndSources`, `TakeToTeamThread`, `ReferenceRowView`, `ReconciliationNoticeView`, `ResolveBreak`, `BlotterLink`, kit `SeriesLines`. Each is defined in the task its Interfaces block names and imported by that name afterwards.
- **Message kinds.** `reference_row` (Task 7) and `reconciliation_notice` (Task 8) each get a case in `MessageView.tsx` (whose `unknownKind` fails to compile without one) and in `CompactMessage.tsx`.
- **Counted fixtures.** Tests that count threads (`th-ref-0001` is the first opened thread), act ids (`REC-0001` the first act) or the Brief's lines assume a fresh store per test, which `src/test/setup.ts` resets after each.
