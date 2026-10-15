# Phase 7b: Showcase Polish and the Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make branch `workspace` ready to replace the live site — only code that runs, every in-app link resolving, the parked items a judge would notice fixed, CI on every push, a README that walks a judge through the demo — then, each time only after asking, fast-forward `main` to it and deploy it to advisor.joelelewis.com.

**Architecture:** Deletion runs from whole files to routes to exports, each step driven by a real tool run: knip 6.39.0 through `pnpm dlx` (production mode finds what only tests keep alive; default mode is the clean gate), plus a manual import graph for what knip cannot see — MSW handler modules registered in `src/mocks/handlers/index.ts` and individual routes inside live handler modules. Two new guardrail tests make the result stay true: every API request a service makes has a handler and every handler route has a caller (`api-routes.test.ts`), and every in-app path literal matches a route in `src/app/routes.tsx` (`route-links.test.ts`, matching through react-router's own `matchRoutes`). The parked FIX items land in four small tasks by area; CI is one GitHub Actions workflow; the README's guided path is pinned by an end-to-end Playwright story that performs exactly its clicks.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2.12, Vitest 4 + Testing Library, Playwright, knip 6.39.0 (via `pnpm dlx`, not a dependency), GitHub Actions, Cloudflare Workers (wrangler 4).

**Spec:** `docs/superpowers/specs/2026-10-14-phase-7b-polish-and-switch-design.md` (binding). Earlier contracts: the Phase 2–7a plans in `docs/superpowers/plans/`, the Phase 4–7a SDD ledgers and the Phase 7a final review (archived in the session scratchpad; every parked item is triaged below).

## Global Constraints

- Work only on branch `workspace`, base `9fd83bb` (`git log --oneline -1` before starting; report BLOCKED if a prerequisite task's commit is missing). Nothing is committed to `main` and nothing is pushed to `main` except in Task 11, after the user says yes.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums (`as const` arrays and unions); ESM; no barrel files. `.tsx` files export only components; helpers, words and types go in `.ts` siblings. Errors are explicit types or `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks (`?? ''` on a value that must exist is a silent fallback).
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`), `pnpm type-check` and `pnpm build`. A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `tsconfig.tsbuildinfo` and `wrangler.jsonc` with `git checkout --` if a tool modifies them. Never symlink `node_modules` between worktrees.
- Dead-code tool: `pnpm dlx knip@6.39.0` (pinned; no new dependency, no knip config file — its vite, vitest and playwright plugins already find the right entries: `index.html` → `src/main.tsx` → the dynamically imported MSW worker `src/mocks/browser.ts`, `src/test/setup.ts`, the vitest test files, `playwright.visual.config.ts` → `e2e-visual/*.spec.ts`, and the config files). `--production` leaves test files out, so it shows what only tests keep alive; plain `pnpm dlx knip@6.39.0` is the clean gate. Removing a dependency that becomes unused is allowed; adding one is not.
- Anything the engine or a reachable handler still reads stays, even when no screen shows it directly (e.g. `data/activities.ts` reads the OMS `orders` store and `driftBatchFacts`; reconciliation reads `generateTransactions`; the blotter reads the legacy OMS tickets). A test that is the only user of deleted code goes with it; a test that pins live behaviour through a deleted surface is re-pointed at the live function, never dropped. The suite count falls; each task's report lists what went and why.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`). Baselines are regenerated only where they changed (`VISUAL_PORT=5195 pnpm visual:update -- <spec>` for the spec that changed), and the implementer opens and looks at every PNG `git status e2e-visual/__baselines__` lists before committing. Tasks 1–4 change no PNG: Task 4 ends by running the whole visual suite with no update.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`). Never read the live clock in `src/mocks` (`new Date()` / `Date.now()` are banned by test). The presenter's jumps move the session clock to Thu 26 Feb and Mon 2 Mar; fills are priced only in the 25 Feb session.
- US spelling in visible copy ("modeled", "realized", "canceled", "color", "analyze", "labeled"), and in every identifier and comment this phase touches (Task 8 sweeps the rest).
- No real person's name for demo people. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002`, Mike Chen `user-003`, Mark Davis `cco-001`, Robert Johnson `cli-001`, Patricia Johnson `cli-002`, Dr. Amanda Pell `prsp-011`. The firm is the fictional **Larkfield Advisory**, a registered investment adviser: never Reg BI framing; a rollover is only "asked about; comparison to follow"; tax items carry "estimate; consult your tax professional"; disclosure timing is labeled firm policy.
- Production UI never imports values from `src/mocks` (`import type` is allowed). The guard in `src/__tests__/guardrails/mocks-boundary.test.ts` stays green and Task 8 widens it.
- No redirects for old main-site routes; unknown routes show the not-found page.
- Preview deploy: `pnpm build && git checkout -- tsconfig.tsbuildinfo && pnpm exec wrangler versions upload --preview-alias workspace --tag <tag> --message "<msg>"` → `https://workspace-advisor-desktop.joel-e-lewis.workers.dev`.
- Production deploy is `pnpm run deploy` (the package script: `pnpm build && wrangler deploy`). Never `pnpm deploy`: that is pnpm's own built-in workspace command (`pnpm help deploy`), not the script.
- The executor asks the user, in chat, and waits for an explicit yes before each of the two irreversible steps in Task 11: (1) fast-forwarding `main` and pushing it; (2) the production deploy. A yes to one is not a yes to the other.
- Commit messages end with the trailer naming the model that wrote the commit: `Co-Authored-By: Claude <model name> <noreply@anthropic.com>` (e.g. `Claude Sonnet 4.5` for an implementer, `Claude Opus 5.5` for the controller).

## Review Focus

1. **The README path walked literally, in its order, on a fresh session.** A judge follows the eight steps on the live site: the release must come before the Pell clock jumps (fills are priced only in the 25 Feb session), the annual review must be held before the jumps, and Resolve and Take must still work after the clock reaches Mon 2 Mar. Each named control must exist where the README says. Test: Task 10, `e2e-visual/readme-path.spec.ts` performs exactly the README's clicks in its order.
2. **A service still calling a route Tasks 2–3 removed, or a handler route left with no caller.** In the browser MSW bypasses unknown requests to the Worker's SPA fallback, which answers HTML, and the screen shows a JSON parse error. Expected: every request a service makes has a handler for its method and path, and every handler route is requested by some service. Test: Task 2, `src/__tests__/guardrails/api-routes.test.ts` (both directions; Task 3 widens the second to every route).
3. **A fresh CI runner.** Linux, UTC, four vCPUs, `CI=true`, an empty store: install must not stop on an unapproved build script, no test may depend on the machine's time zone or locale, and nothing may cross the timeout. Test: Task 9 runs the suite under `TZ=UTC` and `TZ=Asia/Tokyo` before pushing, and the first workflow run on the pushed branch is green.
4. **A link added later that names a route the router lacks, or a thread that does not exist.** The guard fails naming the file and the path. Test: Task 5, `src/__tests__/guardrails/route-links.test.ts` self-tests (an old `/portfolios/trading` path matches nothing; the catch-all is not a match; a written `/t/<id>` must name a seeded thread).
5. **Deep links and unknown paths on the live Worker.** `/t/th-brief`, `/billing` and `/models/mod-005` load the app through the SPA fallback; `/no-such-page` shows "Page not found" with exactly its two starting points. Test: Task 5 unit test of the page; Task 11 checks the live site (bundle hash, deep links, the not-found page).

## What knip and the import graph found (at `9fd83bb`)

`pnpm dlx knip@6.39.0` (default mode, tests as entries): **40 unused files** (25 hooks, 14 services, 1 type file), **110 unused exports**, **158 unused exported types**, **1 unlisted dependency** (`@vitest/coverage-v8`, implied by `vite.config.ts`'s `coverage` block and the `test:coverage` script; the package is not installed, so the script fails today).

`pnpm dlx knip@6.39.0 --production` (tests left out): **65 unused files** — 53 source files (29 hooks, 20 services, 3 lib, 1 type) plus 12 test-support files that production mode cannot see used (`src/test/{render.tsx,server.ts,setup.ts}`, `src/__tests__/guardrails/{contrast,detectors,headings}.ts`, `src/mocks/workspace/__tests__/{proposal,prospect,story}-fixture.ts`, `src/mocks/handlers/__tests__/liquidity-helpers.ts`, `e2e-visual/{layout-checks,workspace-steps}.ts`); **169 unused exports**, **171 unused exported types**.

What knip cannot see, from the import graph and a dry run in a scratch worktree:
- **19 MSW handler modules** that only `handlers/index.ts` imports and whose every route no live service requests: `ai`, `archives`, `calendar`, `documents`, `email-templates`, `engage`, `fx`, `messaging`, `nba`, `notifications`, `onboarding`, `planning`, `proposals`, `prospects`, `reports`, `search`, `settings`, `trading`, `workflows`. Deleting them with the 53 files cascades to **20 more files** (`lib/commission.ts`; `mocks/data/{ai,archives,email-templates,engage,messages,notifications,proposals,workflows}.ts`; `types/{ai,archive,email-template,engage,messaging,notification,report,rich-card,settings,standing-rule,workflow}.ts`).
- **35 unreachable routes inside the five live legacy modules** (crm 8, custodian 3, compliance 2, oms 5, pms 17) and **1 in the workspace modules** (`POST /api/workspace/prospects/:id/proposals/:proposalId/preview`). The reachable legacy routes are exactly: `GET /api/crm/households/:householdId` and `…/held-away` (the workbench's held-away list), `GET /api/custodian/accounts/:accountId`, `…/tax-lots`, `…/realized-sales`, `GET /api/compliance/alerts`, `…/alerts/:alertId/records` (the kit page), `POST /api/oms/rebalance`, `POST /api/oms/orders/pre-check-proposal` (the rebalance embed and the kit), `GET /api/pms/accounts/:accountId/positions`, `…/drift`. Pruning the rest cascades to **3 more files** (`mocks/handlers/event-clock.ts`, `mocks/data/notes.ts`, `types/note.ts`), and leaves `data/nbas.ts` read only by tests except one function (`driftBatchFacts`, read by `data/activities.ts`).
- After the routes, the dry run's default-mode knip reports about **64 unused exports and 142 unused exported types** for Task 4.

The old `e2e/` suite (`playwright.config.ts`, `e2e/smoke.spec.ts`, scripts `test:e2e`, `test:e2e:headed`) asserts a home heading "Advisor Desktop" that the workspace no longer renders (it fails today) and an unknown-route check that Task 5 moves into the visual suite; it goes in Task 1.

**Stale route strings.** Every `/portfolios/...` and `/clients/onboard` string is in `mocks/data/notifications.ts`, `mocks/data/ai.ts`, `mocks/handlers/search.ts` and `mocks/handlers/ai.ts`; no workspace screen reads any of the four, and all four are deleted in Task 1. The NBA routes in `mocks/data/nbas.ts` (`/accounts/acc-…`, `/t/th-brief`, `/t/th-pell`, `/`) already match router patterns and go with the NBA array in Task 4. The only other non-route path literals left in reachable code are the fake `fileUrl: '/docs/*.pdf'` fields in `mocks/data/documents.ts`, which no screen links; Task 5 removes them. A scan of the dry-run tree finds no reachable stale route.

## Triage of the parked items

Sources: `phase4-ledger.md` … `phase7a-ledger.md` and the Phase 7a `final-review.md` "Deferred items: verdicts" table (scratchpad). A line naming several items is split. **FIX** = a judge would notice it on screen, in copy, or reading the code (a wrong statement, a misleading comment, a silent fallback, mixed spelling); **PARK** = a test gap, duplication or style; **CLOSED** = already fixed, or deleted with dead code in this phase. Phase 7a ledger lines duplicate the final-review rows and are listed once, under the review.

| # | Source | Item | Verdict | Reason |
|---|---|---|---|---|
| 1 | P4 T1 | `DraftsPanel` released `staleReason` branch untested | PARK | Test gap only. |
| 2 | P4 T1 | `FillsView` `currency ?? ''` renders a blank unit header on empty fills | FIX | Silent fallback in a component a judge reads; becomes an explicit invariant (Task 8). |
| 3 | P4 T1 | `MessageView.tsx` import order | PARK | Style. |
| 4 | P4 T2 | No guard `cashBalanceOf(a) === a.cashBalance` for unmoved accounts | PARK | Test gap only. |
| 5 | P4 T2 | `withPlanted` helper duplicated across four wash-sale test files | PARK | Test code; one copy goes with `harvest-excludes-washing.test.ts` in Task 1. |
| 6 | P4 T3 | `fills.ts` allocates ids before invariants; a failed release burns ids | CLOSED | `applyFills` commits only after every invariant passes; ids derive from committed fills. |
| 7 | P4 T3 | `takesFor` fallback not gated on taxable accounts | CLOSED | A taxable sale naming no lots throws (`fills.ts:63`). |
| 8 | P4 T3 | `times[i]` applied to the sells-first sequence; doc/impl mismatch | CLOSED | `FillInput`'s doc now states fill order (`fills.ts:29`). |
| 9 | P4 T3 | No `CASH >= 0` assertion in the fills invariants | CLOSED | Overdraw invariant at `fills.ts:229`. |
| 10 | P4 T4 | `nextAt()` consumed twice before `applyFills` | CLOSED | Fills are applied before any time is taken (`compliance-acts.ts:98-102`). |
| 11 | P4 T4 | No guard for an active approval with zero pending orders | PARK | Unreachable: an approval stages at least one order. |
| 12 | P4 T4 | `FILLED` 409 precedes drafting 403 in revise/save | PARK | Plan-mandated order; no screen shows it. |
| 13 | P4 T4 | Tests lack atomicity, return/escalate 400/403/404, viaPresenter, no-act-after-refusal cases | PARK | Test gap only. |
| 14 | P4 T5 | `compliance-acts.ts` duplicate `personById` with unreachable throw; local `isClient` | CLOSED | One lookup with an explicit invariant remains; the helper is gone. |
| 15 | P4 T5 | Tests lack viaPresenter on alert/correspondence acts, >2,000-char rationale | PARK | Test gap only. |
| 16 | P4 T6 | Archive filter edge-case and negative-visibility queue tests | PARK | Test gap only. |
| 17 | P4 T6 | `dispose_alert` archive entries fill the client filter with clients whose threads the viewer can't see | PARK | Firm-only records; every firm viewer may read alert dispositions. |
| 18 | P4 T6 | `supervision.ts` `localeCompare` vs code-unit order; imports a handler module | PARK | Ordering is the same on the seed's ASCII ids; style. |
| 19 | P4 T7 | Brief recompose path after fills "unreachable, untested" | CLOSED | Reachable after a release; pinned by `brief-after-fills-light` and the compliance story step 7. |
| 20 | P4 T8 | `ISO_DAY` accepts impossible dates (2026-02-31) | PARK | Only a lexical filter bound on URL-typed input. |
| 21 | P4 T8 | Presenter endpoint validates the item (400) before the permission (403) | PARK | API ordering no screen shows. |
| 22 | P4 T8 | `useRecordComplianceAct` invalidation untested; `useArchive` key order | PARK | Test gap only. |
| 23 | P4 T9 | `flaggedHarvests` expression repeated | PARK | Duplication. |
| 24 | P4 T9 | Tests lack the substitute-does-not-wash-other-loss and `harvested: false` cases | PARK | Test gap only. |
| 25 | P4 T10 | `ApprovalPanel` returned line renders "()" when `closedByActId` is missing | FIX | Silent fallback (`?? ''`) in visible copy; explicit invariant (Task 8). |
| 26 | P4 T10 | `DEFAULT_VIEWER_ID` could import `PRESENTER_ID` | PARK | Both are `user-001`; style. |
| 27 | P4 T10 | No client-viewer ActRecordSlip provenance test; `ApprovalPanel` growing | PARK | Test gap and size. |
| 28 | P4 T11 | Released/returned states and "Disposed today" rows unexercised | PARK | Test gap only. |
| 29 | P4 T11 | Several active NavLinks when one item has several acts in a day | PARK | Not reachable in the demo's story. |
| 30 | P4 T11 | Desk pane pops in after the directory loads | PARK | Load-time only; baselines settle first. |
| 31 | P4 T11 | `AlertEvidence` trail steps all DONE | CLOSED | The trail lists recorded steps; each is done by definition. |
| 32 | P4 T12 | `DispositionPanel` lacks a doc comment | PARK | Style. |
| 33 | P4 T13 | `ArchivePage` controls absent on first-load error; URL date not in `data.dates`; no error test | PARK | Error-path edges. |
| 34 | P4 T14 | AGG claim and stale as-of frozen into two baselines | CLOSED | Both baselines regenerated after the fixes in Phases 5–7a. |
| 35 | P4 final | AGG harvest "is not foreclosed" with no hedge on substantial identity | CLOSED | `SUBSTITUTE_HEDGE` (`proposal-agent.ts:89`, commit 77603b7). |
| 36 | P4 final (out of scope) | Caveat said "thirty days" for IRA buys, where the disallowance is permanent | CLOSED | Retirement branch now says "disallowed for good, not deferred". |
| 37 | P4 final (out of scope) | acc-012 `NO_SELF_WASH` sentence contradictory beside the caveat | CLOSED | The two sentences now speak of taken losses vs future harvests; no screen drafts acc-012. |
| 38 | P4 final (out of scope) | acc-043 CSBGU0.SW→AGG relies on the symbol-only rule | PARK | acc-043 is in an in-kind transition; no screen proposes for it. |
| 39 | P5 T1 | `calendar.ts:15` from/to filters compare offset strings lexically | CLOSED | `handlers/calendar.ts` is deleted in Task 1. |
| 40 | P5 T1 | Post-now timestamp guard covers `clientComms` only | PARK | Test gap only. |
| 41 | P5 T2 | `AgendaVersionLine` person-author tag reads "Agenda" | CLOSED | Reads "Agent" or "Advisor" (`AgendaVersionLine.tsx:16`). |
| 42 | P5 T2 | meeting-messages test relies on auto reset; seed duplicates evt-010 times | PARK | Test hygiene; guarded. |
| 43 | P5 T3 | `NO_CHANGE` precheck ignores source; runs before DUPLICATE checks | PARK | API ordering. |
| 44 | P5 T4 | Employer-plan regex 401(k)/403(b) only; dead-branch guard; loose rmd regex; stale test title | PARK | No other plan type in the book; style. |
| 45 | P5 T5 | Follow-ups n-17…n-23 carry dues the meeting never stated | FIX | A filed record attributes dates nobody said; the transcript now states each (Task 6). |
| 46 | P5 T5 | `alreadyFiled` wording on the draft path; `meetingDay` repeats a lookup | PARK | Unreached wording; style. |
| 47 | P5 T6 | Duplicate owner/due guard; no unburned-id test | PARK | Duplication; test gap. |
| 48 | P5 T7 | Recap window scope is the household union, not the taxpayer | PARK | Equal for hh-001, the only recap; the engine scopes by taxpayer elsewhere. |
| 49 | P5 T7 | ISO date in the client letter | CLOSED | `clientDate` throughout `client-letter.ts`. |
| 50 | P5 T7 + P5 residual | Third-person filed lines under "Dear Robert" | CLOSED | n-09, n-12, n-14 and n-15 carry Robert's own wording (`toRobert`). |
| 51 | P5 T7 | A second recap possible after send | PARK | Mirrors `draftLetter`; harmless. |
| 52 | P5 T8 | `communicationsOf`/activity don't filter on `sessionNow()` | PARK | No seeded record is after the frozen now. |
| 53 | P5 T8 | `ipsOf` `signedOn` from `updatedAt` | PARK | The seed signs on `updatedAt`; field naming only. |
| 54 | P5 T8 | A past-end scheduled meeting stays "upcoming" | PARK | Only if the clock jumps before the review is held; the story holds it first. |
| 55 | P5 T7 | No spouse-INTC-loss window test; `decisionsWithWindow` duplication | PARK | Test gap; duplication. |
| 56 | P5 T9 | Parser shape repeated; `shapeRefusal` builds the whole view; seven hook scaffolds; 403 on two routes | PARK | Duplication; test gap. |
| 57 | P5 T11 | `carryTargets` could duplicate a household thread; MeetingPanel alert on list failure | PARK | Not reachable with the seed. |
| 58 | P5 T12 | No stacked-layout test | PARK | Test gap only. |
| 59 | P5 T13 | No absence assertion on Patricia's view; household query key hard-coded | PARK | Test gap; style. |
| 60 | P5 T13 | Documents signature cell lowercase | PARK | Consistent with the IPS line's sentence case. |
| 61 | P5 T14 | RecapControl re-ask keeps "drafted" wording | CLOSED | Says "is already in the drafts" (`RecapControl.tsx:53`). |
| 62 | P5 T14 | Asking-ref comment overstates the guard | CLOSED | Comment now matches the ref. |
| 63 | P5 T14 | `reasonId` not keyed by eventId; no-leak regex not body-wide | PARK | One meeting per thread; test scope ruling. |
| 64 | P5 T15 | Recap date "2026-03-22" breaks at a hyphen; lone "pp" wraps | CLOSED | Client dates are in words; units sit in table headers. |
| 65 | P5 T15 | No client-view recap baseline; story step 9 regex | CLOSED | `robert-recap-client-light.png` exists; regex narrowed by ruling. |
| 66 | P5 residual | AgendaEditor status region mounted populated; free-text Add drops focus | CLOSED | Status line always mounted; `focusAfterChange` returns focus. |
| 67 | P5 residual | "(REC-0003)" hyphen break in RecapControl | CLOSED | Wrapped in `Unbroken`. |
| 68 | P5 residual | "Approve a proposal first." after a release | CLOSED | `noLetterReason` names the fill. |
| 69 | P6 T1 | Moderate Conservative → mod-007 is a thin 5-point step to mod-001 | PARK | Ladder σ 6.3 / 9.3 / 9.8 / 12.3 / 13.2% is monotone; reshaping moves every generated account and most reference baselines. |
| 70 | P6 T2 | `threadParty` vs `partyId`; guard regex misses switch/case; 403 text unpinned | PARK | Test gap only. |
| 71 | P6 T3 | `ProspectProposalVersionLine` near-copy of `ProposalVersionLine` | PARK | Plan-mandated duplication. |
| 72 | P6 T3 | "↗" on an in-app link | PARK | Now the app's consistent "opens another view" mark on twelve links; changing it moves most baselines. |
| 73 | P6 T3 | Seed detail hard-codes "15:30 ET" / "Feb 20" | CLOSED | Reads "20 Feb", matching the calendar. |
| 74 | P6 T3 | SYK basis 43.9 vs ~40–42 on 2009-08-17 | PARK | Within a plausible range; a change moves every Pell figure. |
| 75 | P6 T4 | Disclosure fingerprint over document and title only; `adv_2b` special case | PARK | Sufficient for the seeded documents. |
| 76 | P6 T5 | `ASSET_CLASSES` hand-copied; duplicate `statements.find`; leap-day untested | PARK | Throws safely; duplication. |
| 77 | P6 T5 | SYK citation doesn't say "held-away price table" | PARK | The citation names the close and its date. |
| 78 | P6 T6 | `fmtDayMonthYear` is `en-GB` and would print "Sept" | FIX | Today's ICU prints "30 Sept 2025"; a UK locale in a US firm's formatter; locale-free (Task 7). |
| 79 | P6 T6 | Duplicated cast in `parseProspectConstraints` | PARK | Style. |
| 80 | P6 T7 | Rollover "opened once" guard tests any task; due from UTC date | PARK | Test scope; correct today. |
| 81 | P6 T8 | `ONBOARDING_PLAN` hard-codes owner ids; her reply text only via the jump | PARK | Seed design. |
| 82 | P6 T9 | `parseAnswers` cast | PARK | Style. |
| 83 | P6 T9 | `usePartySteps` has no `enabled` flag (404 fetch on non-prospect threads) | CLOSED | Mounted only on prospect threads (`ContextColumn.tsx:55`). |
| 84 | P6 T10 | `ActAsProspect`/`PartyStepsPanel` hand-roll the confirm; `SendProposal` reads `proposals[0]` | PARK | Plan-mandated; one proposal per prospect. |
| 85 | P6 T11 | `ProposalEmbedFrame` not extracted; `ReviseProspectAction` duplicates | PARK | Duplication. |
| 86 | P6 T11 | `TAX_ESTIMATE_NOTE` sits between the rates' doc comment and `TOP_ORDINARY_RATE` | FIX | The rates' documentation now documents the wrong constant (Task 8). |
| 87 | P6 T12 | Disclosures pane delivered-only; hard-coded 403(b) line; link asserted once | PARK | The table is captioned "delivered"; one prospect. |
| 88 | P6 T13 | `PATH_NOTE` default implicit; no external-viewer 404 in prospect-archive test | PARK | Test gap only. |
| 89 | P6 T14 | Dialog focus-return edge; story doesn't wait for the Profile finding | PARK | No such case today; test timing. |
| 90 | 7a T1 | nba-014 "above $5,000,000" test loose | CLOSED | Deleted with `data/nbas.ts` in Task 4. |
| 91 | 7a T2 | No unburned-id test after refusal | PARK | Test gap only. |
| 92 | 7a T3 | `MODELS` comment vs `GLIDE_PATH_MODELS` split | PARK | Style. |
| 93 | 7a note | Aggressive vs Moderate Aggressive model σ nearly identical | PARK | Re-checked after C1: 12.3% vs 13.2%; same cost as row 69. |
| 94 | 7a T4 | acc-002 "above" and a "within" same-band test | CLOSED | `risk.test.ts:139-159`. |
| 95 | 7a T4 | `STATUS_WORDS` identity map | CLOSED | Removed with I1. |
| 96 | 7a T4 | Herfindahl computed twice | PARK | Duplication. |
| 97 | 7a T5 | `ledgerFills().find` per row, O(n²) | PARK | Tens of rows. |
| 98 | 7a T5 | Quote omits Value for non-USD (untested) | PARK | No non-USD order in the story. |
| 99 | 7a T5b | Duplicate `isAssetClass` guard in `proposals.ts` | CLOSED | `handlers/proposals.ts` is deleted in Task 1. |
| 100 | 7a T5b | `currentAllocation` misnamed | CLOSED | Deleted with `handlers/proposals.ts`. |
| 101 | 7a T5b | Literal steepest-step pin | PARK | Test style. |
| 102 | 7a T6 | `firmViewer` pattern repeated across nine handlers | PARK | Duplication. |
| 103 | 7a T6 | 403 for cco-001 on `resolve_break` untested | PARK | Test gap only. |
| 104 | 7a T6 | Dense `getBlotter` params | PARK | Style. |
| 105 | 7a T7 | Blotter row href ignores the row id | PARK | Resolves to the blotter; filtering by order is a feature. |
| 106 | 7a T7 | Taken state local only | PARK | The card in the thread is the record. |
| 107 | 7a T8 | `reference_row` doc comment misplaced in `types/workspace.ts` | FIX | Two stacked comments document the wrong member (Task 8). |
| 108 | 7a T8 | Mocks-boundary guard misses side-effect, dynamic, re-export and bare-`@/mocks` forms | FIX | The guard backs a headline claim; widen it (Task 8). |
| 109 | 7a T8 | Compact reconciliation line terse | PARK | Copy taste. |
| 110 | 7a T9 | Run-rate label and MODELED tag on Practice untested | PARK | Test gap only. |
| 111 | 7a T10 | UI trend and summary not asserted after resolve | PARK | Test gap only. |
| 112 | 7a T10 | Log key uniqueness | PARK | Unique in the seed. |
| 113 | 7a T11 | Ranking test pastes the top row | PARK | Test style. |
| 114 | 7a T11 | Within and over-limit states untested | PARK | Test gap only. |
| 115 | 7a T11 | `from` computed twice | PARK | Duplication. |
| 116 | 7a T11 | `LINK` class duplicated | PARK | Duplication. |
| 117 | 7a T12 | Empty-series chart silently dropped | PARK | No empty series in the book. |
| 118 | 7a T12 | Thin text alternative for the chart | PARK | The table beside it carries the figures. |
| 119 | 7a T12 | Drift band Reading uses `limit` for the rebalance frequency | PARK | Reads correctly on screen. |
| 120 | 7a T13 | `BlotterLink` drops `from` outside `/t/` routes | PARK | Rendered only in threads. |
| 121 | 7a T13 | `fills[0].accountId` for multi-account fills | PARK | A release fills one account. |
| 122 | 7a T13 | `filtersFrom` double read | PARK | Style. |
| 123 | 7a T13 | Non-account subject fallback untested | PARK | Test gap only. |
| 124 | 7a T15 | "Field · detected" sort key | PARK | Sorts correctly on the seed. |
| 125 | 7a T15 | Resolve columnheader gating untested | PARK | Test gap only. |
| 126 | 7a T15 | Orphaned JSDoc in `reference-words.ts` (`versionWords`) | FIX | Two stacked comments; `versionWords` undocumented (Task 8). |
| 127 | 7a T15 | Story step 4: `toBeVisible` before `not.toHaveText` | PARK | Test style. |
| 128 | 7a ruling | Other outside-band reasons (acc-001/002/006/035/046) test-pinned only | PARK | Outside band is the ordinary state the Drift Monitor reports; Mueller needed a reason because a transition is not drift. |
| 129 | Found verifying row 69 | Model descriptions contradict their weights: mod-001 "Core 60/40" holds 55% equity, mod-007 "50/50 equity-bond split" holds 50% equity and 35% bonds | FIX | Shown beside the engine's equity share on the Model page (Task 7). |
| 130 | Found verifying rows 2, 25 | UK spelling in identifiers and comments (`recognisedResult`, `normaliseEdits`, `unauthorised`, `colour`, `labelled`, `cancelled` …) | FIX | Mixed spelling beside US copy reads as carelessness in code review (Task 8). |
| 131 | Found verifying the routes | Fake `fileUrl: '/docs/*.pdf'` paths no screen links | FIX | Non-route path literals in data a judge reads (Task 5). |
| 132 | Found verifying the routes | nba-013 claims FinCEN's adviser AML rule took effect 1 January 2026 | CLOSED | Deleted with the NBA array in Task 4 (no screen showed it). |

Counts: 132 rows — **FIX 11** (rows 2, 25, 45, 78, 86, 107, 108, 126, 129, 130, 131), **PARK 90**, **CLOSED 31**.

FIX items by task: Task 5 — row 131; Task 6 — row 45; Task 7 — rows 78, 129; Task 8 — rows 2, 25, 86, 107, 108, 126, 130.

## Task order and shared files

| Task | Depends on | Shares files with |
|---|---|---|
| 1 Dead legacy files | — | `handlers/index.ts`, `package.json`, `vite.config.ts`, many tests |
| 2 Routes: crm, custodian, compliance, oms; the API-routes guard | 1 | `services/{crm,custodian,compliance,oms}.ts`, hooks, `api-routes.test.ts` |
| 3 Routes: pms and the dead workspace route | 2 | `handlers/pms.ts`, `services/pms.ts`, `hooks/use-portfolio.ts`, `api-routes.test.ts` |
| 4 Unused exports and types; knip clean | 3 | everywhere; `data/nbas.ts` → `data/drift-facts.ts` |
| 5 Links that resolve; the not-found page | 4 | `NotFoundPage.tsx`, `documents.ts`, `route-paths.ts`, `shell.spec.ts` |
| 6 Follow-up dues said in the meeting | 4 | `meeting-transcripts.ts`, `meeting-notes.ts` |
| 7 Dates without a locale; model descriptions | 4 | `kit/measure.ts`, `model-definitions.ts` |
| 8 Code a judge reads | 4 | `FillsView.tsx`, `ApprovalPanel.tsx`, `tax-rules.ts`, `types/workspace.ts`, `reference-words.ts`, `detectors.ts`, many identifiers |
| 9 CI | 4 | `.github/workflows/ci.yml`, `vite.config.ts` |
| 10 README, CONTRIBUTING, the README's story | 5–9 | `README.md`, `CONTRIBUTING.md`, `e2e-visual/readme-path.spec.ts` |
| 11 The switch | all | — |

Serial in one checkout (recommended). Tasks 5–8 touch disjoint files but Task 8's spelling sweep renames identifiers that Tasks 5–7 may read; run 8 after 5–7.

---

### Task 1: Delete the dead legacy files

The old app's hooks, services, types, lib helpers, MSW handler modules and mock data that nothing reachable from `src/main.tsx` uses, with the tests that only they kept alive, and the old `e2e/` suite.

**Files:**
- Delete (19 handler modules): `src/mocks/handlers/{ai,archives,calendar,documents,email-templates,engage,fx,messaging,nba,notifications,onboarding,planning,proposals,prospects,reports,search,settings,trading,workflows}.ts`
- Delete (29 hooks): `src/hooks/{use-activity,use-ai-context,use-ai,use-archives,use-batch-nba,use-client-activity,use-client-comms,use-clients,use-documents,use-email-templates,use-engage,use-fx,use-messaging,use-metrics,use-nbas,use-notes,use-notifications,use-onboarding,use-open-wash-sale-windows,use-orders,use-planning,use-proposals,use-prospects,use-reports,use-schedule,use-settings,use-tax-lots,use-trading,use-workflows}.ts`
- Delete (20 services): `src/services/{ai,archives,calendar,documents,email-templates,engage,fx,messaging,nba,notes,notifications,onboarding,planning,proposals,prospects,reports,search,settings,trading,workflows}.ts`
- Delete (lib, types): `src/lib/{concentration-copy,trade-notional,trade-validation,commission}.ts`, `src/types/{annotation,ai,archive,email-template,engage,messaging,notification,report,rich-card,settings,standing-rule,workflow}.ts`
- Delete (data): `src/mocks/data/{ai,archives,email-templates,engage,messages,notifications,proposals,workflows}.ts`
- Delete (old e2e): `e2e/smoke.spec.ts`, `playwright.config.ts`
- Delete (tests of deleted code only): `src/hooks/__tests__/{use-ai,use-clients,use-nbas}.test.tsx`, `src/lib/__tests__/{commission,concentration-copy,trade-notional,trade-validation}.test.ts`, `src/mocks/data/__tests__/{notifications-invariants,proposals-fee,johnson-thread-copy}.test.ts`, `src/mocks/handlers/__tests__/{ai-citation-invariants,ai-invariants,dashboard-consistency,harvest-excludes-washing,harvest-wash-sale-note,nba-template-confidentiality,reports-invariants,tolerance-label,workflows-invariants}.test.ts`, `src/services/__tests__/nba.test.ts`
- Modify: `src/mocks/handlers/index.ts`, `package.json` (scripts), `vite.config.ts` (coverage block), and the tests in Step 4's table

**Interfaces:**
- Consumes: nothing new.
- Produces: `handlers` in `src/mocks/handlers/index.ts` is `[...crmHandlers, ...pmsHandlers, ...omsHandlers, ...custodianHandlers, ...complianceHandlers, ...workspaceHandlers]`. No other name changes.

- [ ] **Step 1: Record the starting knip output**

Run: `pnpm dlx knip@6.39.0 --no-progress > "$TMPDIR/knip-before.txt"; pnpm dlx knip@6.39.0 --no-progress --production --include files > "$TMPDIR/knip-prod-files-before.txt"`
Expected: the default run lists 40 unused files, 110 exports, 158 types, 1 unlisted dependency; the production file list has 65 entries. If the counts differ, stop and report the difference before deleting anything.

- [ ] **Step 2: Delete the files**

```bash
git rm -q src/mocks/handlers/{ai,archives,calendar,documents,email-templates,engage,fx,messaging,nba,notifications,onboarding,planning,proposals,prospects,reports,search,settings,trading,workflows}.ts
git rm -q src/hooks/{use-activity,use-ai-context,use-ai,use-archives,use-batch-nba,use-client-activity,use-client-comms,use-clients,use-documents,use-email-templates,use-engage,use-fx,use-messaging,use-metrics,use-nbas,use-notes,use-notifications,use-onboarding,use-open-wash-sale-windows,use-orders,use-planning,use-proposals,use-prospects,use-reports,use-schedule,use-settings,use-tax-lots,use-trading,use-workflows}.ts
git rm -q src/services/{ai,archives,calendar,documents,email-templates,engage,fx,messaging,nba,notes,notifications,onboarding,planning,proposals,prospects,reports,search,settings,trading,workflows}.ts
git rm -q src/lib/{concentration-copy,trade-notional,trade-validation,commission}.ts
git rm -q src/types/{annotation,ai,archive,email-template,engage,messaging,notification,report,rich-card,settings,standing-rule,workflow}.ts
git rm -q src/mocks/data/{ai,archives,email-templates,engage,messages,notifications,proposals,workflows}.ts
git rm -q e2e/smoke.spec.ts playwright.config.ts
git rm -q src/hooks/__tests__/{use-ai,use-clients,use-nbas}.test.tsx src/lib/__tests__/{commission,concentration-copy,trade-notional,trade-validation}.test.ts
git rm -q src/mocks/data/__tests__/{notifications-invariants,proposals-fee,johnson-thread-copy}.test.ts
git rm -q src/mocks/handlers/__tests__/{ai-citation-invariants,ai-invariants,dashboard-consistency,harvest-excludes-washing,harvest-wash-sale-note,nba-template-confidentiality,reports-invariants,tolerance-label,workflows-invariants}.test.ts
git rm -q src/services/__tests__/nba.test.ts
```

Replace `src/mocks/handlers/index.ts` with:

```ts
import { crmHandlers } from './crm'
import { pmsHandlers } from './pms'
import { omsHandlers } from './oms'
import { custodianHandlers } from './custodian'
import { complianceHandlers } from './compliance'
import { workspaceHandlers } from './workspace'

export const handlers = [
  ...crmHandlers,
  ...pmsHandlers,
  ...omsHandlers,
  ...custodianHandlers,
  ...complianceHandlers,
  ...workspaceHandlers,
]
```

- [ ] **Step 3: Scripts and the coverage block**

In `package.json` delete the scripts `test:coverage`, `test:e2e` and `test:e2e:headed` (no other script changes). In `vite.config.ts` delete the `coverage: { exclude: [...] }` property of `test` (it implies `@vitest/coverage-v8`, which is not installed).

- [ ] **Step 4: Edit the tests that read a deleted surface**

Run `pnpm type-check` and `pnpm dlx knip@6.39.0 --no-progress --include unresolved` to list them; the expected list and the action for each:

| Test file | Action |
|---|---|
| `src/mocks/__tests__/demo-names.test.ts` | Drop the `@/mocks/data/messages` import and its entry in the scanned sources; the rest stays. |
| `src/mocks/__tests__/event-clock.test.ts` | Delete the `describe('generated ids never meet a seed id', …)` block (it posts to the deleted `/api/settings/ai/prompts`). The `submitTrade` case goes in Task 2. |
| `src/mocks/data/__tests__/activity-invariants.test.ts` | Drop the `@/mocks/data/workflows` import and the assertions on the workflow task inside "the harvest records follow one another …"; the fill, replacement, note and compliance-review assertions stay. |
| `src/mocks/data/__tests__/drift-copy-invariants.test.ts` | Delete the cases on `ntf-010`, "no notification names a model that does not exist" and the `describe('nba-001 over the wire', …)` block (deleted notifications and NBA endpoint). The nba-001 and act-012 cases stay until Task 4. |
| `src/mocks/data/__tests__/prospect-data-truth.test.ts` | Drop the `@/mocks/data/workflows` import and every case on `task-004`; delete the case that posts to `/api/onboarding/calculate-risk`. |
| `src/mocks/handlers/__tests__/loss-sale-window.test.ts` | Delete `it('the model-trade preview carries the same window on the same leg', …)` and the `previewModelTrades` import. |
| `src/mocks/handlers/__tests__/tax-netting-invariants.test.ts` | Delete `describe('the model-trade preview and the rebalance preview state one tax figure', …)` and the `previewModelTrades` import. |
| `src/mocks/handlers/__tests__/tax-return-netting.test.ts` | Delete the three cases that call `previewModelTrades` and its import; every `previewRebalance` case stays. |
| `src/mocks/handlers/__tests__/wash-sale-ira-replacement.test.ts` | Delete `it('the harvesting insight calls the Roth-washed part permanently disallowed …', …)` and the `../ai` dynamic import; the two `lib/tax-rules` cases stay. |
| `src/mocks/handlers/__tests__/model-trade-invariants.test.ts` | Re-point at the live rebalance engine, per the table below. |

`model-trade-invariants.test.ts`: the deleted `/api/oms/model-trade/preview` endpoint was `generateRebalanceTrades` driven with a target model; the live `POST /api/oms/rebalance` takes the same `modelId`. In `beforeAll`, replace `getAccounts()` with the `accounts` fixture (`@/mocks/data/accounts`) mapped through `cashBalanceOf` where a test reads cash, replace `previewModelTrades(m.id, ids)` with `previewRebalance({ accountIds: ids, taxAware: true, modelId: m.id })`, and `previewModelTrades(OWN_MODEL(a), [a.id])` with `previewRebalance({ accountIds: [a.id], taxAware: true, modelId: OWN_MODEL(a) })`; type the maps with `RebalancePreview` (`@/services/oms`) instead of `ModelTradePreview`. Then:

| Describe | Action |
|---|---|
| "the book snapshot the sweeps read" | Delete (the dead endpoint's batching). |
| "the model-trade preview names the account and the model it was actually asked for" | Delete (`accountName`/`modelName` exist only on the dead preview; the rebalance endpoint's 422 for an unknown model is pinned in `rebalance-*.test.ts`). |
| "currentDrift is the account's real drift against the model asked for" | Delete (the dead preview's field). |
| "the proposed trades are the account's own" | Keep, reading `preview.trades`. |
| "the reason names this account's own drift …" | Delete (`sleeveReason` lived in the deleted `handlers/trading.ts`). |
| "§9.3 · the preview and its trades carry the account's own currency" | Keep, reading `preview.currency` and each `trade.currency`. |
| "tax follows the account's own treatment and its own trades" | Keep, reading `preview.taxable` and `preview.estimatedTaxImpact`. |
| "the shared engine's money invariants hold across the whole migration space …" | Keep. |
| "the cap resolution reaches the cash band …" | Keep. |
| "execute reports the orders the preview actually proposed" | Delete (`executeModelTrades`). |

Rewrite the file's header comment to say it pins the shared trade generator across the migration space through `POST /api/oms/rebalance`.

- [ ] **Step 5: Type-check and knip**

Run: `pnpm type-check && pnpm dlx knip@6.39.0 --no-progress --include unresolved && pnpm dlx knip@6.39.0 --no-progress --production --include files`
Expected: type-check clean; no unresolved imports; the production file list holds only the 12 test-support files named in "What knip and the import graph found" (and `playwright.visual.config.ts` if listed — a dev config). A source file still listed is dead: delete it with its tests and rerun.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo`
Expected: PASS. A failing test that fetched a deleted endpoint is handled by the rule in Global Constraints (re-point if it pins live behaviour, else delete) and listed in the report.

```bash
git add -A src e2e package.json vite.config.ts
git commit -m "chore: delete the old app's dead hooks, services, types, handler modules and data, the tests only they kept alive, and the stale e2e suite

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 2: Unreachable routes in crm, custodian, compliance and oms; the API-routes guard

Each live legacy module keeps only the routes a service still requests. A new guard pins that every service request has a handler and every handler has a caller.

**Files:**
- Create: `src/__tests__/guardrails/api-routes.test.ts`, `src/mocks/__tests__/no-live-clock.test.ts`
- Modify: `src/mocks/handlers/{crm,custodian,compliance,oms}.ts`, `src/services/{crm,custodian,compliance,oms}.ts`, `src/hooks/{use-accounts,use-households,use-held-away}.ts`, the tests in Step 6's table
- Delete: `src/mocks/handlers/event-clock.ts`, `src/mocks/__tests__/event-clock.test.ts`, `src/mocks/data/notes.ts`, `src/types/note.ts`, `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts`

**Interfaces:**
- Consumes: `handlers` (`@/mocks/handlers`), `matchRequestUrl` (`msw`), `listSourceFiles` (`src/__tests__/guardrails/detectors.ts`).
- Produces: `getHeldAway(householdId: string): Promise<HeldAwayAsset[]>` in `src/services/crm.ts`; `useHeldAway` calls it. In `api-routes.test.ts` a constant `PRUNED_ROUTES = /^\/api\/(crm|custodian|compliance|oms)\//` that Task 3 deletes.

- [ ] **Step 1: The guard**

Create `src/__tests__/guardrails/api-routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { matchRequestUrl, type RequestHandler } from 'msw'
import type { ProspectStepName } from '@/types/workspace-prospect'
import { listSourceFiles } from './detectors'

/**
 * The services and the MSW handlers agree. Every service function is called with stand-in arguments
 * while the API client records the request instead of sending it; each request must have a handler
 * for its method and path, and each handler route must be requested by some service. A route with no
 * caller is dead code; a request with no handler would reach the Worker's SPA fallback in the browser
 * and fail as HTML.
 */
type Request = { method: string; url: string; via: string }
const requests: Request[] = []
let via = ''

vi.mock('@/services/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api-client')>()
  const record = (method: string) => (path: string) => {
    requests.push({ method, url: `/api${path}`, via })
    return Promise.resolve(undefined)
  }
  return { ...actual, get: record('GET'), post: record('POST'), put: record('PUT') }
})

const STANDINS: readonly unknown[] = ['x', 'x', 'x', 'x', 'x']
const STEPS: readonly ProspectStepName[] = ['questionnaire', 'statements', 'accept']
/** Functions whose argument chooses the route are called once per route. */
const ARGUMENT_SETS: ReadonlyMap<string, readonly (readonly unknown[])[]> = new Map([
  ['workspace.takeHerStep', STEPS.map((step) => ['x', 'x', step])],
])
/** Task 3 removes this: until then only these modules' routes must have a caller. */
const PRUNED_ROUTES = /^\/api\/(crm|custodian|compliance|oms)\//

type Route = { method: string; path: string }
const BASE = 'http://localhost'

function routesOf(handlers: readonly RequestHandler[]): Route[] {
  return handlers.flatMap((h) => {
    const { method, path } = h.info as { method?: unknown; path?: unknown }
    // The workspace's 405 catch-all answers every method (a RegExp): it refuses edits, it is not a route a service calls.
    return typeof method === 'string' && typeof path === 'string' ? [{ method, path }] : []
  })
}

const serves = (route: Route, request: Request) =>
  route.method === request.method && matchRequestUrl(new URL(request.url, BASE), route.path, BASE).matches

let routes: Route[] = []

beforeAll(async () => {
  const dir = join(process.cwd(), 'src/services')
  for (const file of readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'api-client.ts')) {
    const service: Record<string, unknown> = await import(/* @vite-ignore */ join(dir, file))
    for (const [name, fn] of Object.entries(service)) {
      if (typeof fn !== 'function') continue
      via = `${file.replace(/\.ts$/, '')}.${name}`
      for (const args of ARGUMENT_SETS.get(via) ?? [STANDINS]) await (fn as (...a: readonly unknown[]) => unknown)(...args)
    }
  }
  const { handlers } = await import('@/mocks/handlers')
  routes = routesOf(handlers)
})

describe('the services and the handlers agree', () => {
  it('reads every service', () => {
    expect(new Set(requests.map((r) => r.via.split('.')[0]))).toEqual(new Set(['compliance', 'crm', 'custodian', 'oms', 'pms', 'reference', 'workspace']))
  })
  it('every request a service makes has a handler for its method and path', () => {
    expect(requests.filter((r) => !routes.some((route) => serves(route, r))).map((r) => `${r.via}: ${r.method} ${r.url}`)).toEqual([])
  })
  it('every handler route is requested by some service', () => {
    const uncalled = routes.filter((route) => PRUNED_ROUTES.test(route.path) && !requests.some((r) => serves(route, r)))
    expect(uncalled.map((r) => `${r.method} ${r.path}`)).toEqual([])
  })
})

const UI_ROOTS = ['src/workspace', 'src/app', 'src/kit', 'src/hooks']
/** A request function (not `ApiClientError`) taken from the API client: only services make requests. */
const REQUEST_IMPORT = /import\s*\{[^}]*\b(get|post|put|del)\b[^}]*\}\s*from\s*['"]@\/services\/api-client['"]/

describe('only services make requests', () => {
  it.each(UI_ROOTS.flatMap(listSourceFiles))('%s imports no request function from the API client', (file) => {
    expect(readFileSync(join(process.cwd(), file), 'utf8')).not.toMatch(REQUEST_IMPORT)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/__tests__/guardrails/api-routes.test.ts --testTimeout 30000`
Expected: FAIL — "every handler route is requested" lists the 18 uncalled routes below (all GET unless marked) plus `GET /api/crm/households/:householdId/held-away` (called from a hook, not a service); "only services make requests" fails on `src/hooks/use-held-away.ts`.

- [ ] **Step 3: Move the held-away request into the service**

In `src/services/crm.ts` add:

```ts
export function getHeldAway(householdId: string) {
  return get<HeldAwayAsset[]>(`/crm/households/${householdId}/held-away`)
}
```

(with `import type { HeldAwayAsset } from '@/types/held-away'`), and in `src/hooks/use-held-away.ts` replace the `get` import and call with `queryFn: () => getHeldAway(householdId)` imported from `@/services/crm`.

- [ ] **Step 4: Delete the uncalled routes and their callers**

Delete these `http.*` entries from the handler arrays, and the service functions and hooks that requested them:

| Module | Routes deleted | Service functions deleted | Hooks deleted |
|---|---|---|---|
| `handlers/crm.ts` | `GET /api/crm/clients`, `GET /api/crm/clients/:clientId`, `GET /api/crm/households`, `GET /api/crm/activities`, `GET /api/crm/clients/:clientId/activities`, `GET` and `POST /api/crm/clients/:clientId/notes`, `GET /api/crm/clients/:clientId/communications` | `getClients`, `getClient`, `getHouseholds`, `getActivities`, `getClientActivities`, `getClientCommunications` | `useHouseholds` |
| `handlers/custodian.ts` | `GET /api/custodian/accounts`, `…/:accountId/balances`, `…/:accountId/transactions` | `getAccounts`, `getTransactions`, `getBalances` | `useAccounts` |
| `handlers/compliance.ts` | `POST /api/compliance/check-trades`, `GET /api/compliance/review-queue` | `getReviewQueue`, `checkTradeCompliance` | — |
| `handlers/oms.ts` | `GET /api/oms/orders`, `GET /api/oms/orders/:orderId`, `POST /api/oms/orders`, `POST /api/oms/orders/pre-check`, `POST /api/oms/rebalance/execute` | `submitTrade`, `getOrders`, `getExecutionStatus`, `submitRebalance`, `executeRebalance`, `preTradeCheck` | — |

Then run `pnpm type-check` and delete every non-exported declaration and import it reports unused (TS6133/TS6192/TS6196) in those four handler modules — e.g. `checkTradesForAccount` in `compliance.ts`, the `notes`/`activities`/`clients`/`clientComms` imports in `crm.ts`, the single-trade pre-check helpers in `oms.ts`. Repeat until clean. Exported leftovers wait for Task 4. Keep `orders` (the blotter's legacy tickets and `data/activities.ts` read it) and `generateTransactions` (reconciliation reads it).

- [ ] **Step 5: The files that die with the routes**

`handlers/event-clock.ts` was used only by the deleted order and note POSTs, and `data/notes.ts` / `types/note.ts` only by the notes routes. Confirm with `pnpm dlx knip@6.39.0 --no-progress --production --include files` (they are listed), then delete them. Move the one live check out of `src/mocks/__tests__/event-clock.test.ts` into a new `src/mocks/__tests__/no-live-clock.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Every non-test source file under `dir`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('§0.5 · records made at runtime take the event clock, never the live one', () => {
  it('no mock reads the system clock', () => {
    for (const file of sourceFiles(resolve(process.cwd(), 'src/mocks'))) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/new Date\(\)/)
      expect(source, file).not.toMatch(/Date\.now\(\)/)
    }
  })
})
```

and delete `event-clock.test.ts` (its other cases tested the deleted counter and order POST; the workspace event clock `nextAt` keeps its own tests in `src/mocks/data/__tests__/`).

- [ ] **Step 6: Tests that read a removed route**

| Test file | Action |
|---|---|
| `src/services/__tests__/crm.test.ts` | Keep the `getHousehold` cases; delete the rest; add `it('getHeldAway returns the household's held-away assets', …)` asserting `(await getHeldAway('hh-001')).every((a) => a.householdId === 'hh-001')` and a non-empty list. |
| `src/mocks/handlers/__tests__/pre-trade-invariants.test.ts` | Delete (the single-ticket pre-check and `check-trades` exist only for the deleted trade ticket; the proposal pre-check keeps `pre-trade-proposal.test.ts`). |
| `src/mocks/handlers/__tests__/pre-trade-proposal.test.ts` | Delete the cases that call `preTradeCheck`, `checkTradeCompliance` or `/api/oms/orders`; keep every `preTradeCheckProposal` case. |
| `src/mocks/handlers/__tests__/rebalance-currency-invariants.test.ts`, `rebalance-merge-invariants.test.ts`, `model-trade-invariants.test.ts` | Replace `getAccounts()` with the `accounts` fixture (`@/mocks/data/accounts`); where a test reads `cashBalance`, use `cashBalanceOf(account)` (`@/mocks/data/positions`), which is what the deleted route served. |
| `src/mocks/handlers/__tests__/tax-invariants.test.ts` | Replace `getTransactions(id)` with `generateTransactions(account.id, account.totalValue)` from `@/mocks/handlers/custodian` (the function the route served and reconciliation still reads). |
| `src/mocks/reference/__tests__/practice.test.ts` | Replace `getClients()` with the `clients` fixture (`@/mocks/data/clients`). |

- [ ] **Step 7: Run the guard and the touched tests**

Run: `pnpm vitest run src/__tests__/guardrails src/services/__tests__ src/mocks/handlers/__tests__ src/mocks/reference/__tests__ src/mocks/__tests__ --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, type-check, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo`
Expected: PASS.

```bash
git add -A src
git commit -m "chore: prune the crm, custodian, compliance and oms routes no service calls; only services make requests, pinned by the API-routes guard

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 3: Unreachable routes in pms, and the dead workspace route

**Files:**
- Modify: `src/mocks/handlers/pms.ts`, `src/services/pms.ts`, `src/hooks/use-portfolio.ts`, `src/mocks/handlers/workspace-prospects.ts`, `src/__tests__/guardrails/api-routes.test.ts`, the tests in Step 4's table

**Interfaces:**
- Consumes: Task 2's guard.
- Produces: `src/services/pms.ts` exports exactly `getPositions`, `getDrift` (and the types still imported); `src/hooks/use-portfolio.ts` exports exactly `usePositions`, `useDrift`. The engine functions the reference views read stay exported: `riskProfileFor`, `attributionFor`, `periodReturnsFor`, `periodYears`, `performanceSeriesFor`, `concentrationFor`, `stressScenariosFor`, `computeDriftForAccount`, `MODEL_BANDS`.

- [ ] **Step 1: Widen the guard**

In `api-routes.test.ts` delete `PRUNED_ROUTES` and its comment, and make the third case check every route:

```ts
  it('every handler route is requested by some service', () => {
    const uncalled = routes.filter((route) => !requests.some((r) => serves(route, r)))
    expect(uncalled.map((r) => `${r.method} ${r.path}`)).toEqual([])
  })
```

Run: `pnpm vitest run src/__tests__/guardrails/api-routes.test.ts --testTimeout 30000`
Expected: FAIL listing the 17 pms routes in Step 2 and `POST /api/workspace/prospects/:id/proposals/:proposalId/preview`.

- [ ] **Step 2: Delete the routes, service functions and hooks**

| Routes deleted from `pmsHandlers` | Service functions deleted | Hooks deleted |
|---|---|---|
| `/api/pms/metrics`, `/drift/summary`, `/accounts/:accountId/{holdings,performance,benchmark,attribution,risk,factors,stress,sensitivity,concentration}`, `/models`, `/models/:modelId`, `/households/:householdId/{positions,drift,allocation}`, `/clients/:clientId/allocation` | `getHoldingGroups`, `getModels`, `getModel`, `getPerformance`, `getBenchmarkComparison`, `getAttribution`, `getRiskMetrics`, `getFactorExposures`, `getStressScenarios`, `getSensitivity`, `getConcentration`, `getMetricsSummary`, `getDriftSummary`, `getHouseholdPositions`, `getHouseholdDrift`, `getHouseholdAllocation`, `getClientAllocation` | every hook in `use-portfolio.ts` but `usePositions` and `useDrift` |

From `handlers/workspace-prospects.ts` delete the `POST /api/workspace/prospects/:id/proposals/:proposalId/preview` route; if `previewProspectRevision` (`mocks/workspace/prospect-proposals.ts`) then has no caller outside tests, delete it and its test cases.

Then `pnpm type-check` and delete what it reports unused in `pms.ts` (e.g. `computeMetrics`'s private constant `NET_FLOWS_MTD`, `deriveAllocationByAssetClass`, `inverseNormalCDF`, the Monte Carlo body, imports of `sharpe`, `sortino`, `downsideDeviation`, `modeledMaxDrawdown`, `RISK_FREE_RATE`) and repeat until clean. Delete `computeMetrics` itself (only the metrics route called it) and its now-unused imports (`nbas`, `calendarEvents`, `complianceAlerts`) if `pms.ts` no longer uses them.

- [ ] **Step 3: Run the guard**

Run: `pnpm vitest run src/__tests__/guardrails/api-routes.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 4: Re-point the tests**

Each removed route's computation that a reference view still reads is tested through the engine function; a route body's own computation (Sharpe, Sortino, drawdown, sensitivity, Monte Carlo, allocation slices, the metrics bar) goes with its tests.

| Test file | Action |
|---|---|
| `src/mocks/handlers/__tests__/risk-invariants.test.ts` | Volatility, beta, tracking error and VaR cases call `riskProfileFor(account)` and `parametricVaR(p.value, p.vol)` (`@/lib/risk-model`); delete the Sharpe, Sortino, downside-deviation, drawdown, sensitivity and Monte Carlo cases and the factor-endpoint shape cases. |
| `src/mocks/handlers/__tests__/concentration-invariants.test.ts` | Call `concentrationFor(account)` for each account instead of `getConcentration(id)`. |
| `src/mocks/handlers/__tests__/attribution-invariants.test.ts` | Call `attributionFor(account, periodYears[period])` instead of `getAttribution(id, period)`; delete cases on the route's response wrapper only. |
| `src/mocks/handlers/__tests__/performance-invariants.test.ts` | Call `performanceSeriesFor(account)` instead of `getPerformance(id)`. |
| `src/mocks/handlers/__tests__/benchmark-identity.test.ts` | Replace `getModels()` with `MODEL_DEFINITIONS` (`@/mocks/data/model-definitions`) and the benchmark route with `periodReturnsFor(account, years)`. |
| `src/mocks/handlers/__tests__/drift-invariants.test.ts` | Replace `getDriftSummary()` with `accounts.filter(isModelManaged).map(computeDriftForAccount)` and `getModels()` with `MODEL_DEFINITIONS`; `getDrift` stays. |
| `src/mocks/reference/__tests__/risk.test.ts` | Delete the four cases that compare the view with the legacy endpoints ("the legacy factors endpoint reads the same engine", and the VaR, stress and concentration comparisons at lines 88–97): with the endpoints gone the view is the engine's only reader, and its own cases above them pin the figures. Drop the `@/services/pms` import. |
| `src/mocks/reference/__tests__/practice.test.ts` | `computeMetrics().totalClients` → `new Set(accounts.map((a) => a.clientId)).size`. |
| `src/hooks/__tests__/use-portfolio.test.tsx` | Keep the `usePositions` and `useDrift` cases; delete the rest. |
| `src/services/__tests__/pms.test.ts` | Keep the `getPositions` and `getDrift` cases; delete the rest. |
| `src/mocks/handlers/__tests__/workspace-prospects-api.test.ts` | Delete the cases on the prospect revision preview route. |

- [ ] **Step 5: Full suite, lint, type-check, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo`
Expected: PASS.

```bash
git add -A src
git commit -m "chore: prune the pms routes and the prospect revision preview no service calls; risk, attribution, performance and concentration tests read the engine

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 4: Unused exports and types — knip clean

**Files:**
- Create: `src/mocks/data/drift-facts.ts`
- Delete: `src/mocks/data/nbas.ts`, `src/types/nba.ts` (if unused after the move), NBA-only tests (Step 3)
- Modify: every file knip names; `src/mocks/data/activities.ts`, `src/mocks/data/workspace-seed.ts`, `src/types/workspace.ts` (`next_action`), `e2e-visual/workspace-steps.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `driftBatchFacts(): { accountCount: number; modelIds: string[]; clients: { id: string; name: string }[]; bands: string[]; lowestBreach: number; highestBreach: number; valueToTradeUsd: number }` in `src/mocks/data/drift-facts.ts` (moved verbatim, with its private helper `accountDriftFacts`). The `next_action` message loses `nbaId`.

- [ ] **Step 1: Run knip both ways**

Run: `pnpm dlx knip@6.39.0 --no-progress > "$TMPDIR/knip-4.txt"; pnpm dlx knip@6.39.0 --no-progress --production --include exports,types > "$TMPDIR/knip-4-prod.txt"`
Expected (from the dry run): about 64 unused exports and 142 unused exported types in the default run.

- [ ] **Step 2: Apply the rule to each symbol**

1. **Default knip names it** (used nowhere outside its file, tests included): if its own file uses it, drop `export`; otherwise delete it. For types: drop `export`, run `pnpm type-check`, and delete any type it then reports unused (TS6196); repeat.
2. **Only production knip names it** (outside its file only tests use it): if its own file uses it, keep it — it is a seam a test pins live behaviour through (e.g. `RATIONALE_MAX`, `LedgerInvariantError`, `SHORT_TERM_RATE`). Otherwise it is dead code a test keeps alive: delete it and the test cases that exist only for it, re-pointing a case at the live function it wraps where one exists. Kept by name, with the reason in the report: `resetWorkspaceStore` (the test setup resets the store after each test), `routes` (tests render the route table), `TOP_ORDINARY_RATE`, `TOP_LONG_TERM_GAINS_RATE`, `TOP_COLLECTIBLES_RATE` (the components a test checks the combined rates against, documented in `tax-rules.ts`).

Expected deletions under rule 2, from the dry run (confirm each with `rg -n "\b<name>\b" src` before deleting): `normaliseMinus` (`kit/measure.ts`), `VISIBILITY_WORDS` (re-point `VisibilityBand.test.tsx` to `visibilityWords(v)`), `deriveSegmentAUM`, `rateFromBps`, `assetWeightedEffectiveFee`, `washesOnSale`, `harvestFxStatus`, `computeCostBasisImpact`, `formatPercent`, `formatDate`, `formatTime` (`lib/utils.ts`), `symbols` (`data/trading.ts`), `formatAUM`, `computeTotalAUM` (`handlers/utils.ts`), `ARCHIVE_KINDS`, `del` (`services/api-client.ts`, and its case in `api-client.test.ts`), the Task 3 leftovers in `lib/risk-model.ts` (`sharpe`, `sortino`, `downsideDeviation`, `modeledMaxDrawdown`, `portfolioReturn1Y`, `RISK_FREE_RATE` if no live caller), and the NBA array (Step 3).

- [ ] **Step 3: The NBA array**

After Task 3 nothing reachable reads `nbas` or the NBA helpers; `data/activities.ts` reads only `driftBatchFacts`. Move `driftBatchFacts` and its private helper `accountDriftFacts` (with their doc comments and imports) into `src/mocks/data/drift-facts.ts`, typing `clients` as `{ id: string; name: string }[]` instead of `NBAClient`; point `data/activities.ts` at it; delete `data/nbas.ts`, and `types/nba.ts` if `pnpm type-check` shows no other reader. Drop `nbaId` from the `next_action` member of `Message` in `src/types/workspace.ts` and from `msg-s08` in `workspace-seed.ts` (no screen reads it, and it would name a record that no longer exists).

| Test file | Action |
|---|---|
| `src/mocks/data/__tests__/{nba-facts,nba-invariants,nba-routes,intc-harvest-copy}.test.ts` | Delete (NBA data only). |
| `src/mocks/data/__tests__/drift-copy-invariants.test.ts` | Keep the act-012 cases, importing `driftBatchFacts` from `@/mocks/data/drift-facts`; delete the nba-001 cases. |
| `src/mocks/data/__tests__/{referential-integrity,prospect-data-truth,meeting-data-truth}.test.ts`, `src/mocks/workspace/__tests__/prospect-store.test.ts`, `src/mocks/data/__tests__/workspace-seed.test.ts` | Delete the cases and expectations that read `nbas` or `nbaId`; the rest stays. |

- [ ] **Step 4: Knip clean**

Run: `pnpm dlx knip@6.39.0 --no-progress`
Expected: exit 0 and no output — no unused files, dependencies, exports or types (`e2e-visual/workspace-steps.ts`'s `PELL_REPLY_TEXT` included: drop its `export`). If a dependency is reported unused, remove it with `pnpm remove <name>`. If an ignore is truly needed, it goes in a `knip.json` with a `"//"` reason beside it, and the report says why; none is expected.

Run: `pnpm dlx knip@6.39.0 --no-progress --production --include files`
Expected: only the 12 test-support files.

- [ ] **Step 5: Nothing visible moved**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo && VISUAL_PORT=5195 pnpm visual`
Expected: PASS, with no baseline updated (deletion changes nothing a screen shows). A visual failure here is a deletion that reached live code: restore it.

- [ ] **Step 6: Commit**

```bash
git add -A src e2e-visual package.json pnpm-lock.yaml
git commit -m "chore: knip clean — unused exports and types removed or made private, the NBA array gone with its tests, drift facts moved to their only reader

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 5: Links that resolve, and the not-found page

**Files:**
- Create: `src/__tests__/guardrails/route-paths.ts`, `src/__tests__/guardrails/route-links.test.ts`
- Modify: `src/app/pages/NotFoundPage.tsx`, `src/app/__tests__/routes.test.tsx`, `src/mocks/data/documents.ts`, `src/types/document.ts`, `e2e-visual/shell.spec.ts`
- Create (baseline): `e2e-visual/__baselines__/not-found-light.png`

**Interfaces:**
- Consumes: `routes` (`@/app/routes`), `matchRoutes` (`react-router-dom`), `listSourceFiles` (`./detectors`), `SEED_THREADS`, `SEED_MESSAGES` (`@/mocks/data/workspace-seed`).
- Produces (`route-paths.ts`): `type FoundPath = { file: string; path: string; interpolated: boolean }`, `pathLiterals(source: string): { path: string; interpolated: boolean }[]`, `inAppPaths(): FoundPath[]`, `routePatternOf(path: string): string | undefined`.

- [ ] **Step 1: The path reader and the matcher**

Create `src/__tests__/guardrails/route-paths.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { matchRoutes } from 'react-router-dom'
import { routes } from '@/app/routes'
import { listSourceFiles } from './detectors'

/** Where in-app paths are written: the UI, and the engine and data a screen shows. Services hold API paths only (Task 2's guard). */
const LINK_ROOTS: readonly string[] = ['src/app', 'src/workspace', 'src/kit', 'src/hooks', 'src/lib', 'src/mocks']
/** A quoted or template literal that begins with "/" and a lowercase letter, or is "/" itself. */
const QUOTED_PATH = /(['"`])(\/(?:[a-z][^'"`\s]*)?)\1/g
const INTERPOLATION = /\$\{[^}]*\}/g
/** What an interpolated segment becomes: any value matches a `:param`. */
const STANDIN = 'x'

const isApiPath = (path: string) => path === '/api' || path.startsWith('/api/')

export type FoundPath = { file: string; path: string; interpolated: boolean }

/** Every path literal in `source`: interpolations replaced by a stand-in, query and hash dropped, API paths left out. */
export function pathLiterals(source: string): { path: string; interpolated: boolean }[] {
  return [...source.matchAll(QUOTED_PATH)].flatMap((m) => {
    const raw = m[2] ?? ''
    const path = raw.replace(INTERPOLATION, STANDIN).replace(/[?#].*$/, '')
    return isApiPath(path) ? [] : [{ path, interpolated: raw !== raw.replace(INTERPOLATION, '') }]
  })
}

export function inAppPaths(): FoundPath[] {
  return LINK_ROOTS.flatMap(listSourceFiles).flatMap((file) =>
    pathLiterals(readFileSync(join(process.cwd(), file), 'utf8')).map((p) => ({ file, ...p })))
}

/** The route pattern `path` takes in the router, or undefined when only the catch-all would take it. */
export function routePatternOf(path: string): string | undefined {
  const matches = matchRoutes(routes, path)
  const leaf = matches?.[matches.length - 1]
  if (!matches || !leaf || leaf.route.path === '*') return undefined
  const segments = matches.flatMap((m) => (m.route.path && m.route.path !== '/' ? [m.route.path] : []))
  return `/${segments.join('/')}`
}
```

- [ ] **Step 2: The guard test**

Create `src/__tests__/guardrails/route-links.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SEED_MESSAGES, SEED_THREADS } from '@/mocks/data/workspace-seed'
import { inAppPaths, pathLiterals, routePatternOf } from './route-paths'

describe('reading path literals', () => {
  it('replaces an interpolation with a stand-in and drops the query', () => {
    expect(pathLiterals('to={`/accounts/${encodeURIComponent(id)}/risk?from=${from}`}')).toEqual([{ path: '/accounts/x/risk', interpolated: true }])
  })
  it('reads single- and double-quoted literals', () => {
    expect(pathLiterals(`a('/blotter'); b("/t/th-brief")`)).toEqual([{ path: '/blotter', interpolated: false }, { path: '/t/th-brief', interpolated: false }])
  })
  it('leaves out API paths', () => expect(pathLiterals("http.get('/api/workspace/threads')")).toEqual([]))
})

describe('matching the router', () => {
  it('names the pattern a path takes', () => {
    expect(routePatternOf('/')).toBe('/')
    expect(routePatternOf('/t/th-brief')).toBe('/t/:threadId')
    expect(routePatternOf('/accounts/acc-002/risk')).toBe('/accounts/:accountId/risk')
    expect(routePatternOf('/supervision/orders/prop-001')).toBe('/supervision/:kind/:id')
  })
  it('the catch-all is not a match: the old main-site paths have none', () => {
    expect(routePatternOf('/portfolios/trading')).toBeUndefined()
    expect(routePatternOf('/portfolios/accounts/acc-005')).toBeUndefined()
    expect(routePatternOf('/clients/onboard/step-2')).toBeUndefined()
  })
})

describe('every in-app link resolves', () => {
  const found = inAppPaths()

  it('reads the app: the Desk, the full views and the reference views are among the paths', () => {
    const paths = new Set(found.map((f) => f.path))
    for (const p of ['/t/x', '/supervision', '/archive', '/blotter', '/accounts/x/attribution', '/models/x', '/households/x', '/prospects/x']) expect(paths).toContain(p)
  })

  it.each(found.map((f) => [f.file, f.path] as const))('%s: %s is a route', (_file, path) => {
    expect(routePatternOf(path)).toBeDefined()
  })

  it('a thread link written out names a seeded thread', () => {
    const threads = new Set(SEED_THREADS.map((t) => t.id))
    const written = found.filter((f) => !f.interpolated && f.path.startsWith('/t/'))
    expect(written.length).toBeGreaterThan(0)
    for (const f of written) expect(threads, `${f.file}: ${f.path}`).toContain(f.path.slice('/t/'.length))
  })

  it('every thread a seeded message links to is seeded', () => {
    const threads = new Set(SEED_THREADS.map((t) => t.id))
    for (const m of SEED_MESSAGES) {
      for (const key of ['targetThreadId', 'meetingThreadId', 'fromThreadId', 'clientThreadId'] as const) {
        const id = (m as Partial<Record<typeof key, unknown>>)[key]
        if (typeof id === 'string') expect(threads, `${m.id}.${key}`).toContain(id)
      }
    }
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm vitest run src/__tests__/guardrails/route-links.test.ts --testTimeout 30000`
Expected: FAIL — the `mocks/data/documents.ts` cases (`/docs/johnson-ips.pdf` and the rest are not routes) and "a thread link written out names a seeded thread" (none is written yet).

- [ ] **Step 4: The documents' fake file paths**

No screen links a document file. Delete `fileUrl` from the `Document` type in `src/types/document.ts` and every `fileUrl: '/docs/….pdf', ` from `src/mocks/data/documents.ts` (`perl -pi -e "s/ fileUrl: '[^']*',//g" src/mocks/data/documents.ts`, then `rg -n fileUrl src` returns nothing).

- [ ] **Step 5: The not-found page names the demo's starting points**

Add to `src/app/__tests__/routes.test.tsx`:

```ts
  it("an unknown path shows the not-found page with the demo's two starting points, and nothing else", async () => {
    renderAt('/portfolios/trading')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    const links = within(main).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([['The workspace', '/'], ['The Brief', '/t/th-brief']])
    expect(within(main).getByRole('list', { name: 'Starting points' })).toBeInTheDocument()
  })
```

Run: `pnpm vitest run src/app/__tests__/routes.test.tsx --testTimeout 30000` → FAIL (the page has one link, "Go to the workspace").

Replace `src/app/pages/NotFoundPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'

const LINK = 'text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

/** Any path the router does not hold. The demo has two places to begin: the workspace and the advisor's Brief. */
export function NotFoundPage() {
  return (
    <Page title="Page not found" eyebrow="Advisor Desktop">
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink-2">There is no page at this address. Start from one of these:</p>
        <ul aria-label="Starting points" className="flex flex-col gap-1">
          <li><Link to="/" className={LINK}>The workspace</Link></li>
          <li><Link to="/t/th-brief" className={LINK}>The Brief</Link></li>
        </ul>
      </div>
    </Page>
  )
}
```

- [ ] **Step 6: Run the unit tests**

Run: `pnpm vitest run src/__tests__/guardrails/route-links.test.ts src/app/__tests__/routes.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: The not-found scene**

The old `e2e/smoke.spec.ts` checked an unknown route in a browser; that check moves here. In `e2e-visual/shell.spec.ts` add to `SCENES`:

```ts
  { name: 'not-found-light', hasContext: false, open: async (page) => { await visit(page, '/portfolios/trading', 'light'); await settle(page) } },
```

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/shell.spec.ts` → the layout checks PASS and the new baseline test FAILS only because `not-found-light.png` does not exist. Then `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts`, and confirm `git status e2e-visual/__baselines__` shows only the new `not-found-light.png`. Open it: the title "Page not found" under the "ADVISOR DESKTOP" eyebrow, the sentence, the two underlined links, light tokens, nothing clipped.

- [ ] **Step 8: Full suite, lint, type-check, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo`
Expected: PASS.

```bash
git add -A src e2e-visual
git commit -m "feat(links): every in-app path literal matches a route, pinned by guard; the not-found page names the workspace and the Brief; documents lose fake file paths

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 6: Follow-up dues said in the meeting (row 45)

Meeting Notes files seven follow-ups with due dates (n-17 … n-23), but only n-17's ("by Monday", t-08) was said. A filed record must not attribute dates nobody stated: the transcript's turns now state each due, and a test pins that every follow-up's due is said in a line it cites.

**Files:**
- Modify: `src/mocks/data/meeting-transcripts.ts` (t-11, t-15, t-18, t-22, t-26), `src/types/workspace-meeting.ts` (the `NoteLine` doc comment)
- Test: `src/mocks/agents/__tests__/meeting-notes.test.ts`
- Baselines: `meeting-after-light.png`, `meeting-after-dark.png` (the transcript beside the notes) and any other the visual run names

**Interfaces:**
- Consumes: `draftNotesFromTranscript`, `JOHNSON_REVIEW_TRANSCRIPT`.
- Produces: no new names; the dues stay `2026-02-26` … `2026-03-13`.

- [ ] **Step 1: The failing test**

In `src/mocks/agents/__tests__/meeting-notes.test.ts` add:

```ts
describe('every follow-up is due when the meeting said', () => {
  /** How the meeting on Wed 25 Feb 2026 names each due date (NYSE trading days after it). */
  const SAID: Readonly<Record<string, RegExp>> = {
    '2026-02-26': /\btomorrow\b/,
    '2026-02-27': /\bby this Friday\b/,
    '2026-03-02': /\bby Monday\b/,
    '2026-03-04': /\bby next Wednesday\b/,
    '2026-03-06': /\bby Friday next week\b/,
    '2026-03-13': /\bby Friday, March thirteenth\b/,
  }
  const followUps = notes.filter((l) => l.section === 'follow_ups')

  it('has the seven follow-ups', () => expect(followUps.map((l) => l.id)).toEqual(['n-17', 'n-18', 'n-19', 'n-20', 'n-21', 'n-22', 'n-23']))

  it.each(followUps.map((l) => [l.id, l] as const))('%s: a line it cites names its due date', (_id, line) => {
    const due = line.due
    if (due === undefined) throw new Error(`${line.id} has no due date`)
    const words = SAID[due]
    if (!words) throw new Error(`${line.id} is due ${due}, a date the meeting never names`)
    expect(line.cites.some((id) => words.test(transcript.get(id)?.text ?? ''))).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/agents/__tests__/meeting-notes.test.ts --testTimeout 30000`
Expected: FAIL for n-18 … n-23; n-17 passes (t-08 says "by Monday").

- [ ] **Step 3: The turns state the dues**

In `src/mocks/data/meeting-transcripts.ts` change these five turns (speaker and ids unchanged):

```ts
  { id: 't-11', speaker: 'user-001', text: "Then I'll review your risk profile and the models on your accounts by Monday, before we trade in them. Nothing is traded in your accounts until that review is done." },
  { id: 't-15', speaker: 'user-001', text: "We will. Mike will run the analysis by Friday next week. It will be an estimate, not tax advice, and I'll contact your CPA by this Friday so they are part of the decision." },
  { id: 't-18', speaker: 'user-001', text: 'Sarah will request the plan fee disclosures and your recent statements by next Wednesday so we can make that comparison.' },
  { id: 't-22', speaker: 'user-001', text: "Sarah will send you our beneficiary checklist tomorrow so you have everything they'll ask for." },
  { id: 't-26', speaker: 'user-001', text: "I'll draft the amendment by Friday, March thirteenth, so we can go through it at the next meeting." },
```

In `src/types/workspace-meeting.ts`, in the `NoteLine` doc comment, replace "also carries its owner — as stated in the meeting, cited — and its due date, an NYSE trading day." with "also carries its owner and its due date (an NYSE trading day), both as the meeting stated them in a line it cites."

- [ ] **Step 4: Run the meeting tests**

Run: `pnpm vitest run src/mocks/agents/__tests__ src/mocks/workspace/__tests__ src/mocks/data/__tests__ src/workspace/__tests__ --testTimeout 30000`
Expected: PASS. A test that pins one of the five old sentences is updated to the new sentence, never loosened.

- [ ] **Step 5: The baselines that show the transcript**

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/meeting-review.spec.ts`
Expected: only screenshot drift, in the scenes that show the transcript (`meeting-after-light`, `meeting-after-dark`). Then `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/meeting-review.spec.ts`, and open every PNG `git status e2e-visual/__baselines__` lists: the five turns read as above, the notes and tasks are unchanged, nothing clipped or overlapped. Run the whole visual suite once (`VISUAL_PORT=5195 pnpm visual`) to confirm no other spec moved.

- [ ] **Step 6: Full suite, lint, type-check, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo`
Expected: PASS.

```bash
git add -A src e2e-visual
git commit -m "fix(meeting): every follow-up's due date is said in the meeting, in a line its note cites

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 7: Dates without a locale; model descriptions that agree with their weights (rows 78, 129)

**Files:**
- Modify: `src/kit/measure.ts` (`fmtDayMonthYear`, `fmtEasternDayTime`), `src/mocks/data/model-definitions.ts` (mod-001, mod-007 descriptions)
- Test: `src/kit/__tests__/measure.test.ts`, `src/mocks/reference/__tests__/models.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `fmtDayMonthYear(iso)` → `"25 Feb 2026"`, `fmtEasternDayTime(iso)` → `"Thu 26 Feb 09:10 ET"` — unchanged outputs for every date the story shows; a September date prints "Sep".

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/measure.test.ts`, inside the existing `fmtDayMonthYear` and `fmtEasternDayTime` describes, add:

```ts
  it('abbreviates every month to three letters, September included', () => {
    expect(fmtDayMonthYear('2025-09-30')).toBe('30 Sep 2025')
    expect(fmtDayMonthYear('2026-12-01')).toBe('1 Dec 2026')
  })
```

```ts
  it('names the New York day, three-letter weekday and month', () => {
    expect(fmtEasternDayTime('2025-09-30T14:00:00.000Z')).toBe('Tue 30 Sep 10:00 ET')
    expect(fmtEasternDayTime('2026-03-03T03:30:00.000Z')).toBe('Mon 2 Mar 22:30 ET')
  })
```

and a guard at the end of the file:

```ts
describe('the kit formats dates without a regional locale', () => {
  it('no formatter in the kit uses en-GB', async () => {
    const { readFileSync } = await import('node:fs')
    expect(readFileSync('src/kit/measure.ts', 'utf8')).not.toContain("'en-GB'")
  })
})
```

In `src/mocks/reference/__tests__/models.test.ts` add:

```ts
it("a model's description carries no figure: the engine's equity share and weights sit beside it", () => {
  for (const m of MODEL_DEFINITIONS) expect(m.description, m.id).not.toMatch(/\d/)
})
```

(importing `MODEL_DEFINITIONS` from `@/mocks/data/model-definitions` if the file does not already).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/measure.test.ts src/mocks/reference/__tests__/models.test.ts --testTimeout 30000`
Expected: FAIL — "30 Sept 2025", "Tue 30 Sept 10:00 ET", the en-GB guard, and mod-001 ("Core 60/40 …") and mod-007 ("Balanced 50/50 …").

- [ ] **Step 3: Locale-free dates**

In `src/kit/measure.ts` replace the `easternDay` formatter and `fmtEasternDayTime`, and the `dayMonthYear` formatter and `fmtDayMonthYear`, with:

```ts
const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const monthAbbreviation = (month: number): string => {
  const word = MONTH_ABBREVIATIONS[month - 1]
  if (!word) throw new Error(`No month ${month}`)
  return word
}

const easternDayParts = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'America/New_York' })
const partOf = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string => {
  const part = parts.find((p) => p.type === type)
  if (!part) throw new Error(`The New York day has no ${type}`)
  return part.value
}

/** A moment on the story's clock as its control names it: "Thu 26 Feb 09:10 ET". */
export function fmtEasternDayTime(iso: string): string {
  const parts = easternDayParts.formatToParts(parseIso(iso))
  return `${partOf(parts, 'weekday')} ${partOf(parts, 'day')} ${monthAbbreviation(Number(partOf(parts, 'month')))} ${fmtEasternTime(iso)} ET`
}
```

```ts
/** A date as the proposal's price line states it: "25 Feb 2026". */
export function fmtDayMonthYear(iso: string): string {
  const d = parseIso(iso)
  return `${d.getUTCDate()} ${monthAbbreviation(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`
}
```

(`parseIso` already exists in the file; keep `fmtEasternDayTime` where `easternDay` was, and `fmtDayMonthYear` where `dayMonthYear` was.)

- [ ] **Step 4: Descriptions in words**

In `src/mocks/data/model-definitions.ts` change two descriptions:

```ts
  // mod-001
  description: 'Core balanced model with a growth tilt',
  // mod-007
  description: 'Balanced model with a smaller equity share than Balanced Growth',
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/kit/__tests__ src/mocks/reference/__tests__ src/workspace/__tests__ --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Nothing on the baselines moved**

Run: `VISUAL_PORT=5195 pnpm visual`
Expected: PASS with no update — the story's dates format exactly as before, and the one Model baseline (`model-light`, mod-005) keeps its description. If a PNG moves, open it and say why in the report before regenerating it.

- [ ] **Step 7: Full suite, lint, type-check, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo`
Expected: PASS.

```bash
git add -A src
git commit -m "fix(copy): dates formatted without a regional locale (no 'Sept'); model descriptions in words that agree with their weights

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 8: Code a judge reads (rows 2, 25, 86, 107, 108, 126, 130)

**Files:**
- Modify: `src/workspace/thread/FillsView.tsx`, `src/workspace/context/ApprovalPanel.tsx`, `src/lib/tax-rules.ts`, `src/types/workspace.ts`, `src/workspace/reference/reference-words.ts`, `src/__tests__/guardrails/detectors.ts`, `src/__tests__/guardrails/mocks-boundary.test.ts`, and every file the spelling sweep names
- Create: `src/workspace/__tests__/fills-view.test.tsx`
- Test: `src/workspace/__tests__/proposal-words.test.ts` (the `returnedLine` cases), `src/__tests__/guardrails/detectors.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `findMocksImports(source: string, { allowDynamic }: { allowDynamic: readonly string[] }): string[]` in `detectors.ts`. Renamed identifiers (Step 6's table) — every caller updated.

- [ ] **Step 1: The failing tests for the two silent fallbacks**

A fills message always carries at least one fill; a returned order always carries the act that returned it. Each component now throws naming the broken invariant instead of rendering a blank unit or "()".

```tsx
// src/workspace/__tests__/fills-view.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FillsView } from '@/workspace/thread/FillsView'
import type { Message } from '@/types/workspace'

type FillsMessage = Extract<Message, { kind: 'fills' }>

describe('FillsView', () => {
  it('refuses a fills message with no fill rather than rendering a blank unit', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const message = { kind: 'fills', id: 'msg-x', threadId: 'th-johnson-review', at: '2026-02-25T15:00:00Z', proposalId: 'prop-001', title: 'Johnson rebalance', version: 1, releaseActId: 'REC-0001', fills: [] } as unknown as FillsMessage
    expect(() => render(<MemoryRouter><FillsView message={message} /></MemoryRouter>)).toThrow('Fills message msg-x carries no fill')
  })
})
```

(The `fills` member is `{ kind: 'fills'; id; threadId; at; proposalId; title; version; releaseActId; fills: Fill[] }`; the cast is there only because the literal is built by hand.)

The returned line moves out of `ApprovalPanel.tsx` into `src/workspace/proposal/approval-words.ts`, where it can be tested without rendering the panel. Add to `src/workspace/__tests__/proposal-words.test.ts`:

```ts
import { returnedLine } from '@/workspace/proposal/approval-words'
import type { StagedOrder } from '@/types/workspace-proposal'

describe('returnedLine', () => {
  const order: StagedOrder = {
    id: 'stg-0001', proposalId: 'prop-001', version: 2, accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, estimatedValue: 100_000,
    currency: 'USD', status: 'returned', stagedAt: '2026-02-25T13:00:00Z', approvalActId: 'REC-0001', closedByActId: 'REC-0002',
  }
  it('names the version and the act that returned it', () => {
    expect(returnedLine(order)).toBe('Compliance returned v2 (REC-0002). Revise it, or approve it again, to stage new orders.')
  })
  it('refuses a returned order that names no act, rather than printing "()"', () => {
    expect(() => returnedLine({ ...order, closedByActId: undefined })).toThrow('Returned order stg-0001 names no act that returned it')
  })
})
```

(merge the imports into the file's existing import block).

Run: `pnpm vitest run src/workspace/__tests__/fills-view.test.tsx src/workspace/__tests__/proposal-words.test.ts --testTimeout 30000` → FAIL (`FillsView` renders; `returnedLine` does not exist).

- [ ] **Step 2: The invariants**

In `FillsView.tsx` replace `const currency = message.fills[0]?.currency ?? ''` and the later `message.fills[0]` reads with:

```tsx
  const first = message.fills[0]
  if (!first) throw new Error(`Fills message ${message.id} carries no fill`)
  const currency = first.currency
```

and render `<BlotterLink accountId={first.accountId} />` unconditionally.

In `src/workspace/proposal/approval-words.ts` add:

```ts
/** The panel's line for an approval compliance returned: the version, and the act that returned it. */
export function returnedLine(order: StagedOrder): string {
  if (order.closedByActId === undefined) throw new Error(`Returned order ${order.id} names no act that returned it`)
  return `Compliance returned v${order.version} (${order.closedByActId}). Revise it, or approve it again, to stage new orders.`
}
```

(with `import type { StagedOrder } from '@/types/workspace-proposal'`), and in `ApprovalPanel.tsx` render `{returned ? <p className="text-body text-ink-2">{returnedLine(returned)}</p> : null}`.

Run: `pnpm vitest run src/workspace/__tests__/fills-view.test.tsx src/workspace/__tests__/proposal-words.test.ts --testTimeout 30000` → PASS.

- [ ] **Step 3: Doc comments where they belong**

- `src/lib/tax-rules.ts`: move `/** The caveat a prospect proposal's tax figures carry. */` and `export const TAX_ESTIMATE_NOTE = …` above the long rates doc comment (the one ending "…is not exactly 0.408 in floating point."), so that comment again sits directly on `TOP_ORDINARY_RATE`.
- `src/types/workspace.ts`: the two stacked comments before `| { kind: 'reconciliation_notice' …` — keep "The Brief's line for reconciliation …" there and move "A row of a reference view quoted into a team thread …" to directly above `| { kind: 'reference_row' …`.
- `src/workspace/reference/reference-words.ts`: move `/** "v2", or "v2 · v3 pending from 2026-04-01". */` from above the `pendingVersionWords` comment to directly above `export const versionWords`.

- [ ] **Step 4: The mocks boundary, every import form**

In `src/__tests__/guardrails/detectors.ts` add:

```ts
/** A module path into the mock engine: `@/mocks`, `@/mocks/…`, or a relative `../mocks/…`. */
const MOCKS_PATH = String.raw`(?:@\/mocks|(?:\.\.\/)+mocks)(?:\/[^'"]*)?`
const MOCKS_FORMS: readonly { form: string; pattern: RegExp }[] = [
  { form: 'value import', pattern: new RegExp(String.raw`^import\s+(?!type\b)[^'"]*?from\s+['"](${MOCKS_PATH})['"]`, 'gm') },
  { form: 'side-effect import', pattern: new RegExp(String.raw`^import\s+['"](${MOCKS_PATH})['"]`, 'gm') },
  { form: 're-export', pattern: new RegExp(String.raw`^export\s+(?!type\b)[^'"]*?from\s+['"](${MOCKS_PATH})['"]`, 'gm') },
  { form: 'dynamic import', pattern: new RegExp(String.raw`\bimport\(\s*['"](${MOCKS_PATH})['"]\s*\)`, 'g') },
]

/** Every way `source` loads a value from the mock engine, except the dynamic imports `allowDynamic` names. Type-only imports are allowed. */
export function findMocksImports(source: string, { allowDynamic }: { allowDynamic: readonly string[] }): string[] {
  return MOCKS_FORMS.flatMap(({ form, pattern }) => [...source.matchAll(pattern)]
    .filter((m) => !(form === 'dynamic import' && allowDynamic.includes(m[1] ?? '')))
    .map((m) => `${form}: ${m[1] ?? ''}`))
}
```

In `detectors.test.ts` add:

```ts
describe('findMocksImports', () => {
  const none = { allowDynamic: [] }
  it('finds a value import, a side-effect import, a re-export and a dynamic import', () => {
    expect(findMocksImports("import { accounts } from '@/mocks/data/accounts'", none)).toEqual(['value import: @/mocks/data/accounts'])
    expect(findMocksImports("import '@/mocks/browser'", none)).toEqual(['side-effect import: @/mocks/browser'])
    expect(findMocksImports("export { handlers } from '../../mocks/handlers'", none)).toEqual(['re-export: ../../mocks/handlers'])
    expect(findMocksImports("const m = await import('@/mocks/browser')", none)).toEqual(['dynamic import: @/mocks/browser'])
    expect(findMocksImports("import { x } from '@/mocks'", none)).toEqual(['value import: @/mocks'])
  })
  it('allows type-only imports and the dynamic imports it is told to', () => {
    expect(findMocksImports("import type { Account } from '@/mocks/data/accounts'\nexport type { X } from '@/mocks/x'", none)).toEqual([])
    expect(findMocksImports("await import('@/mocks/browser')", { allowDynamic: ['@/mocks/browser'] })).toEqual([])
  })
})
```

Replace the body of `mocks-boundary.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findMocksImports, listSourceFiles } from './detectors'

/** The production UI and everything it imports that is not the engine itself. */
const ROOTS = ['src/workspace', 'src/app', 'src/kit', 'src/hooks', 'src/services', 'src/lib', 'src/types', 'src/main.tsx']
/** The one load of the engine production makes: `main.tsx` starts the MSW worker, the demo's server. */
const ALLOWED_DYNAMIC: Readonly<Record<string, readonly string[]>> = { 'src/main.tsx': ['@/mocks/browser'] }
const files = ROOTS.flatMap(listSourceFiles)

describe('production UI reads the engine only through the API', () => {
  it('scans the UI, hooks, services, lib, types and the entry', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files).toContain('src/main.tsx')
  })
  it.each(files)('%s loads no value from src/mocks', (f) => {
    expect(findMocksImports(readFileSync(join(process.cwd(), f), 'utf8'), { allowDynamic: ALLOWED_DYNAMIC[f] ?? [] })).toEqual([])
  })
})
```

Run: `pnpm vitest run src/__tests__/guardrails --testTimeout 30000` → PASS (no production file breaks the boundary today; the widened guard keeps it so).

- [ ] **Step 5: Run the component tests**

Run: `pnpm vitest run src/workspace/__tests__ --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: US spelling in identifiers and comments**

Rename (identifier and every caller, test files included):

| From | To |
|---|---|
| `recognised`, `recognisedResult`, `recognisedNet`, `recognises` | `recognized`, `recognizedResult`, `recognizedNet`, `recognizes` |
| `normaliseConstraints`, `normaliseEdits`, `normaliseDraftEdits` (and comments "normalise(d/s)", "renormalis…") | `normalizeConstraints`, `normalizeEdits`, `normalizeDraftEdits` ("normalize", "renormaliz…") |
| `unauthorised` (`handlers/workspace-http.ts` and callers) | `unauthorized` |
| `COLOUR_TOKENS`, `findColourLiterals`, `colourLiteralsOutsideTokens`, `COLOUR_PREFIX`, `NAMED_COLOUR_VALUE`, `COLOUR_NAMES`, `COLOUR_FROM_VARIABLE`, `COLOUR_FN`, `ARBITRARY_COLOUR` | the same with `COLOR` / `Color` |
| OMS order status `'cancelled'` (`services/oms.ts` `Order['status']`, the order seed, `reference/blotter.ts` `TICKET_STATUS`) | `'canceled'`; delete the blotter's "spells it `cancelled`" comment |

Then fix the remaining comments by hand ("colour" → "color", "labelled" → "labeled", "behaviour" → "behavior", "neighbour" → "neighbor", "honour" → "honor", "favour" → "favor", "centre(d)" → "center(ed)", "cancellable" → "cancelable", "cancelling" → "canceling", "serialised" → "serialized", "summarises" → "summarizes", "optimised" → "optimized", "organis…" → "organiz…", "licence" → "license", "grey" → "gray", "modelled/modelling" → "modeled/modeling", "realised" → "realized", "authorise" → "authorize"). Leave `aria-labelledby` (the DOM attribute) as it is.

Gate (prints nothing):

```bash
perl -ne 'print "$ARGV:$.: $&\n" while /(?i)(recognis|authoris|labell(?!edby)|colour|behaviour|normalis|cancell|\bgrey\b|programme|modell(?!ine)|realis(?!tic)|serialis|summaris|organis|optimis(?!tic)|neighbour|licence|honour|favour|centre)\w*/g; close ARGV if eof' $(git ls-files 'src/**.ts' 'src/**.tsx' 'src/**.css' 'e2e-visual/**.ts')
```

- [ ] **Step 7: Full suite, lint, type-check, build, visual; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo && VISUAL_PORT=5195 pnpm visual`
Expected: PASS with no baseline update (nothing visible changed; the blotter shows "Canceled" as before).

```bash
git add -A src e2e-visual
git commit -m "fix(code): explicit invariants for the fills unit and the returned act, doc comments on the symbols they document, the mocks boundary for every import form, US spelling in identifiers and comments

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 9: CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `vite.config.ts` (`testTimeout`), `pnpm-workspace.yaml` only if Step 4 shows a build the runner refuses

**Interfaces:**
- Consumes: the scripts `lint`, `type-check`, `build`; `packageManager: pnpm@11.9.0`; `pnpm-workspace.yaml`'s `allowBuilds` (`esbuild: true`, `msw: true`, `workerd: false`).
- Produces: workflow name `CI`, file `ci.yml` (Task 10's badge reads it).

- [ ] **Step 1: The suite's timeout, sized for a runner**

The suite is CPU-bound and `maxWorkers: '50%'` gives a four-vCPU runner two workers. In `vite.config.ts`, in `test`, after `maxWorkers`, add:

```ts
    // The same 30s the plans pass on a loaded workstation (`--testTimeout 30000`), for CI's
    // two workers as well: a long UI flow is slow under contention, not stuck. A real hang still
    // fails, and a flaky test is fixed, never retried.
    testTimeout: 30_000,
```

- [ ] **Step 2: No test depends on the machine's time zone or locale**

Run: `TZ=UTC LANG=C pnpm vitest run && TZ=Asia/Tokyo pnpm vitest run`
Expected: PASS both times. A failure is a test or formatter that reads the local zone: fix it to state its zone (as `kit/measure.ts` does), then rerun.

- [ ] **Step 3: The workflow**

Check the current major versions first: `gh api repos/actions/checkout/releases/latest --jq .tag_name`, `gh api repos/actions/setup-node/releases/latest --jq .tag_name`, `gh api repos/pnpm/action-setup/releases/latest --jq .tag_name`; use each one's major (`@vN`). Create `.github/workflows/ci.yml` (shown with checkout v5, setup-node v5, action-setup v4):

```yaml
name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v5
      # No version input: the action reads `packageManager` (pnpm@11.9.0) from package.json.
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          # The LTS line the workstation runs (22.17.0), pinned exactly.
          node-version: 22.17.0
          cache: pnpm
      # pnpm 11 reads allowBuilds from pnpm-workspace.yaml, so install never stops to ask about a build script.
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm vitest run
      - run: pnpm build
```

Visual baselines stay local (pixel-exact; Linux font rendering differs), and nothing here deploys.

- [ ] **Step 4: Push the branch and watch the first run**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo`, commit:

```bash
git add .github/workflows/ci.yml vite.config.ts
git commit -m "ci: lint, type-check, unit tests and build on every push and pull request

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

then push the branch (`git push origin workspace` — the branch, never `main`) and `gh run watch --exit-status $(gh run list --branch workspace --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')`.
Expected: green. If install fails with an ignored or unapproved build (`ERR_PNPM_IGNORED_BUILDS` or a prompt), add that package to `allowBuilds` in `pnpm-workspace.yaml` — `true` only if the build needs its script (e.g. a native binary the suite loads), otherwise `false` — with a comment naming why, commit, push, and watch again. Never `dangerouslyAllowAllBuilds`. A test that times out or fails only on the runner is diagnosed and fixed (CPU contention, zone, locale or path case), never retried or skipped.

---

### Task 10: The README, CONTRIBUTING, and the README's own story

**Files:**
- Create: `e2e-visual/readme-path.spec.ts`
- Modify: `README.md` (rewritten), `CONTRIBUTING.md` (rewritten)

**Interfaces:**
- Consumes: `e2e-visual/workspace-steps.ts` (`visit`, `heading`, `conversation`, `context`, `threadLink`, `embedOf`, `approvalOf`, `approve`, `releaseByShortcut`, `meetingPanel`, `runPrep`, `holdTheMeeting`, `draftNotes`, `fileRecord`, `askForRecap`, `letterDraft`, `deliver`, `recordTheCoffee`, `advanceTo`, `askAgentNamed`, `reviseToTwoTaxYears`, `approveProspect`, `sendToHer`, `deskLink`, `resolveBreakNamed`, `takeToTeamThread`, `viewAs`, `PELL_ACCEPTANCE_TEXT`); the baselines under `e2e-visual/__baselines__/`.
- Produces: the README's eight steps, which the spec performs one for one.

- [ ] **Step 1: The story the README describes**

Create `e2e-visual/readme-path.spec.ts`. Its numbered comments are the README's steps; a README edit that changes a click changes this file in the same commit.

```ts
import { test, expect } from '@playwright/test'
import {
  PELL_ACCEPTANCE_TEXT, advanceTo, approve, approveProspect, askAgentNamed, askForRecap, context, conversation, deliver, deskLink,
  draftNotes, embedOf, fileRecord, heading, holdTheMeeting, letterDraft, meetingPanel, recordTheCoffee, releaseByShortcut,
  resolveBreakNamed, reviseToTwoTaxYears, runPrep, sendToHer, takeToTeamThread, threadLink, viewAs, visit,
} from './workspace-steps'

/** The README's guided path, click for click and in its order, from a fresh session as Adrian Hale. */
test("the README's five-minute path, end to end", async ({ page }) => {
  test.setTimeout(600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const back = () => page.getByRole('link', { name: 'Back to the thread' }).click()

  // 1. The Brief.
  await visit(page, '/', 'light')
  await threadLink(page, 'Brief').click()
  await expect(heading(page)).toHaveText('Brief')
  await expect(page.getByRole('region', { name: 'Ranked summary' })).toBeVisible()

  // 2. The Johnson rebalance and harvest: the finding to the team thread, v1, v2 "harvest only", v3 in the workbench, approved.
  const intc = conversation(page).getByRole('article', { name: /^Harvest Scanner: Intel Corp\. can be sold at a loss today/ })
  await intc.getByRole('button', { name: 'Take to team thread' }).click()
  await threadLink(page, 'Johnson Rebalance Review').click()
  await context(page).getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
  const embed = embedOf(page)
  await expect(embed.getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
  await embed.getByRole('button', { name: 'Revise' }).click()
  const revise = page.getByRole('dialog', { name: 'Revise the proposal' })
  await revise.getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }).check()
  await revise.getByRole('button', { name: 'Ask Proposal Agent to revise' }).click()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v2' })).toBeVisible()
  await embed.getByRole('link', { name: 'Workbench' }).click()
  await expect(heading(page)).toHaveText('Johnson rebalance')
  await page.getByRole('table', { name: 'Legs · v2' }).getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('group', { name: 'Draft version' }).getByRole('status').filter({ hasText: 'Saved as v3 · posted to the thread.' })).toBeVisible()
  await back()
  await approve(page, 3)

  // 3. The compliance release as Mark Davis, through the presenter's shortcut.
  await releaseByShortcut(page)

  // 4. The blotter and the moved book.
  await page.getByRole('link', { name: 'Open in the blotter' }).first().click()
  await expect(heading(page)).toHaveText('Blotter')
  await expect(page.getByRole('table', { name: 'Orders' })).toContainText('FILLED')
  await back()
  await context(page).getByRole('link', { name: /^Robert Johnson Individual/ }).click()
  await expect(page.getByRole('table', { name: 'Holdings' }).getByRole('row', { name: /^INTC/ })).toHaveCount(0)
  await back()
  await threadLink(page, 'Brief').click()
  await expect(page.getByRole('region', { name: 'Ranked summary' })).not.toContainText('Intel Corp. can be sold at a loss today')

  // 5. The Johnson annual review: prep, hold, notes, file, recap.
  await conversation(page).getByRole('article', { name: 'Meeting · Johnson annual review' }).getByRole('link', { name: /Open the meeting thread/ }).click()
  await expect(heading(page)).toHaveText('Johnson annual review')
  await runPrep(page)
  await meetingPanel(page).getByRole('textbox', { name: 'New agenda item' }).fill('ESG alternatives for the trust')
  await meetingPanel(page).getByRole('button', { name: 'Add to agenda', exact: true }).click()
  await expect(meetingPanel(page).getByRole('list', { name: 'Agenda · v2' })).toBeVisible()
  await meetingPanel(page).getByRole('link', { name: /Open the meeting view/ }).click()
  await holdTheMeeting(page)
  await draftNotes(page)
  await fileRecord(page)
  await back()
  await threadLink(page, 'Robert Johnson').click()
  await askForRecap(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('What we decided:')

  // 6. Dr. Pell, from first contact to an onboarding opened.
  await threadLink(page, 'Brief').click()
  await conversation(page).getByRole('article', { name: 'Next best action · Referral: Dr. Amanda Pell' }).getByRole('link', { name: /Open her thread/ }).click()
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await deliver(page, 'Form CRS')
  await recordTheCoffee(page)
  await advanceTo(page, 'reply')
  await threadLink(page, 'Pell · prospect work').click()
  await askAgentNamed(page, 'Prospect Profile')
  await askAgentNamed(page, 'Transfer-In')
  await askAgentNamed(page, 'Proposal Agent')
  await reviseToTwoTaxYears(page)
  await approveProspect(page, 2)
  await threadLink(page, 'Dr. Amanda Pell').click()
  await sendToHer(page, 2)
  await advanceTo(page, 'acceptance')
  await expect(conversation(page)).toContainText(PELL_ACCEPTANCE_TEXT)
  await threadLink(page, 'Pell · prospect work').click()
  await expect(context(page).getByRole('table', { name: 'Onboarding checklist' })).toBeVisible()

  // 7. The reference views, from the Desk pane.
  for (const view of ['Billing', 'Models', 'Practice', 'Blotter'] as const) {
    await deskLink(page, view).click()
    await expect(heading(page)).toHaveText(view)
    await expect(page.getByRole('heading', { name: 'Methods & sources' })).toBeVisible()
    await back()
  }
  await deskLink(page, 'Reconciliation').click()
  await resolveBreakNamed(page, 'brk-002', 'Timing difference', 'Schwab confirmed the 24 Feb cash sweep posted after the file was cut.')
  await back()
  await deskLink(page, 'Risk').click()
  await takeToTeamThread(page, 'Patel Digital Assets Account')
  await back()

  // 8. View as Robert: one thread, his own — his question, the recap and its record.
  await viewAs(page, 'Robert Johnson · Client')
  const threads = page.getByRole('navigation', { name: 'Threads' }).getByRole('link')
  await expect(threads).toHaveCount(1)
  await expect(threads).toHaveAccessibleName('Robert Johnson')
  await threads.click()
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(conversation(page)).toContainText('What we decided:')
})
```

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/readme-path.spec.ts`
Expected: PASS. Where it fails, the app or a locator is wrong, or the order is: fix the app or the locator; if a step cannot work in this order, change the order in both this spec and the README, never loosen an assertion. If "Methods & sources" is not a heading on a view, assert it the way `reference-views.spec.ts` does.

- [ ] **Step 2: The README**

Replace `README.md` with the text below. Check before committing: every bold control name is one the spec clicks; every image path exists (`ls` each); every code path named under "What it enforces" exists at that path.

````markdown
# Advisor Desktop

[![CI](https://github.com/JoelLewis/advisor-desktop/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/JoelLewis/advisor-desktop/actions/workflows/ci.yml)

A multiplayer workspace for the advisors of Larkfield Advisory, a fictional SEC-registered investment adviser: threads where the advisor, the firm's agents, compliance and the client each see only what is theirs to see, and every binding step is a recorded act. Every figure is derived from one mock book or labeled modeled with its method, and the demo's clock is frozen at Wednesday 25 February 2026.

**Live:** https://advisor.joelelewis.com

![The Brief](e2e-visual/__baselines__/brief-light.png)

## Five minutes, click by click

You are Adrian Hale, the advisor. Nobody else acts live: colleagues' history is seeded, agents do the analysis, and **View as** shows what each person can see. Follow the steps in order — the clock only moves forward.

1. **The Brief.** Choose **Brief** in the thread list. The ranked summary leads with what needs attention.
2. **The Johnson rebalance and harvest.**
   - On the Harvest Scanner's Intel finding, choose **Take to team thread**, then open **Johnson Rebalance Review**.
   - In the context column choose **Ask Proposal Agent**: v1 appears in the thread.
   - On the proposal choose **Revise**, tick **Harvest only: sell only lots at a loss** and choose **Ask Proposal Agent to revise**: v2.
   - Choose **Workbench**. In **Legs · v2** move to the QAI row and press **x** to exclude it; press **⌘S** (Ctrl+S) to save v3. Choose **Back to the thread**.
   - In the approval panel tick **I reviewed every leg of v3 and its pre-trade reading.** and choose **Approve v3**. The orders are staged, pending compliance review.

   ![The proposal in its thread](e2e-visual/__baselines__/proposal-thread-light.png)
   ![The workbench](e2e-visual/__baselines__/workbench-light.png)

3. **Compliance releases, as Mark Davis.** In the same panel choose **Demo · act as Mark Davis**, then **Confirm**. The release is recorded as Mark's act, marked as made through the presenter's shortcut, and the orders fill at the day's prices.

   ![The thread after the release](e2e-visual/__baselines__/thread-after-release-light.png)

4. **The blotter and the moved book.** On the fills choose **Open in the blotter**: each order filled, under the release's record. Choose **Back to the thread**, then **Robert Johnson Individual** in the context column: Intel is gone from the holdings. Back in the **Brief**, the Intel harvest has left the summary and its wash-sale window is stated.

   ![The blotter](e2e-visual/__baselines__/blotter-light.png)

5. **The Johnson annual review.** In the Brief, on the meeting line, choose **Open the meeting thread**. Choose **Run prep**, add an item with **New agenda item** and **Add to agenda**, then **Open the meeting view** and **Hold the meeting**. Choose **Draft notes** (hover a citation to light its transcript line), then **File the record** and **Confirm**. Choose **Back to the thread**, open **Robert Johnson**, choose **Ask Client Letter Agent for the recap** and **Send to Robert**.

   ![The notes beside the transcript](e2e-visual/__baselines__/meeting-after-light.png)

6. **Dr. Amanda Pell, first contact to onboarding.** In the Brief, on the referral, choose **Open her thread**. Choose **Deliver Form CRS**, **Record the coffee**, then **Advance to her reply · Thu 26 Feb 09:10 ET**. In **Pell · prospect work** ask **Prospect Profile**, **Transfer-In** and **Proposal Agent**; on the proposal choose **Revise**, set **Staged sale of the concentrated stock** to **Over two tax years** and choose **Ask for v2**; tick the review and **Approve v2**. In **Dr. Amanda Pell** choose **Send v2 to Dr. Pell** (Form ADV Part 2A goes with it), then **Advance to her acceptance · Mon 2 Mar 10:00 ET**. Her onboarding checklist opens in **Pell · prospect work**.

   ![Her thread](e2e-visual/__baselines__/pell-thread-light.png)
   ![The onboarding opened](e2e-visual/__baselines__/pell-onboarding-light.png)

7. **The reference views.** From the Desk pane (or type **/** and a view's name): **Billing**, **Reconciliation** (choose **Resolve brk-002**, a resolution and a rationale, then **Confirm**), **Risk** (choose **Take Patel Digital Assets Account to a team thread**), **Models**, **Practice** and **Blotter**. Each ends with Methods & sources; every modeled figure is tagged MODELED.

   ![Billing](e2e-visual/__baselines__/billing-light.png)
   ![Book risk](e2e-visual/__baselines__/risk-book-light.png)
   ![Reconciliation](e2e-visual/__baselines__/reconciliation-light.png)

8. **View as Robert.** Set **View as** to Robert Johnson · Client. He sees one thread, his own: his question, the recap and its record — nothing of the firm's work.

   ![What Robert sees](e2e-visual/__baselines__/robert-recap-client-light.png)

The path is pinned by an end-to-end test that performs these clicks in this order (`e2e-visual/readme-path.spec.ts`).

## What it enforces

- **Separation of duties.** The advisor approves a proposal; only compliance releases, returns or escalates its orders; only the advisor and client service resolve a reconciliation break. Every other role is refused (`src/mocks/data/people.ts`, the permission table). The presenter's shortcut records Mark Davis's act and says it was made through the shortcut.
- **Who can see what.** A thread is private, firm-only or shared with one client or prospect. One predicate decides who is outside the firm (`src/lib/external-party.ts`); an outsider sees only their own thread, and every firm surface answers them "not found".
- **Acts are append-only, with fingerprints.** An approval, a release, a filed meeting record or a delivered disclosure is a recorded act carrying a fingerprint of what it binds; an act on something that changed since it was read is refused, and nothing edits or deletes a recorded act (the workspace API answers any such attempt 405).
- **Wash sales scoped to the taxpayer.** IRC §1091 is applied lot by lot to the taxpayer — the owner and spouse, their IRAs and Roths included; a trust stands alone — looking thirty days back and forward. A loss washed by a purchase in an IRA or Roth is disallowed for good, not deferred; spot coins held directly are outside the rule (`src/mocks/handlers/tax-return.ts`, `src/lib/wash-sale.ts`).
- **Disclosure timing as firm policy.** Form CRS comes before or with the first recommendation — a proposal cannot be sent until it is delivered — and Form ADV Part 2A goes with the proposal if it has not gone before. Both rules are labeled firm policy (`src/mocks/workspace/prospect-acts.ts`).
- **Agents' claims carry no digits.** An agent's sentence names things in words; every figure travels as a figure with its source and is formatted by the kit, so no number is typed twice.
- **Modeled or derived, and labeled.** Each reference view ends with Methods & sources; a figure from a model (volatility, factor exposure, a quarter-end value) is tagged MODELED with its method; everything else is derived from the book.

## How it is built

- **React 18, TypeScript (strict), Vite 6, Tailwind v4** with the instrument palette as theme tokens, **TanStack Query** for server state, **React Router**.
- **MSW is the server.** Every `/api` request is answered in the browser by a service worker; the engine behind it lives in `src/mocks` (the book, the session portfolio ledger every read goes through, the event clock that stamps each record, the agents and the acts). The UI reads the engine only through the API, a rule a guard test enforces.
- **The kit** (`src/kit`): buttons, tables, dialogs, readings, record slips and formatters, with guardrail tests for palette, contrast, headings, the mocks boundary, routes and API routes (`src/__tests__/guardrails`).
- **Tests:** Vitest and Testing Library for the engine and the UI; Playwright for exact visual baselines and the end-to-end stories (`e2e-visual`). CI runs lint, type-check, the unit suite and the build on every push.

## Run it

```bash
pnpm install
pnpm dev                       # http://localhost:5173
pnpm vitest run                # the unit suite
VISUAL_PORT=5195 pnpm visual   # visual baselines and stories, on their own dev server
```

## Plainly

This is a demonstration. The firm, its people and its clients are invented, every account and figure is mock data, and nothing here is investment, tax or legal advice.

## License

[MIT](LICENSE)
````

- [ ] **Step 3: CONTRIBUTING**

Replace `CONTRIBUTING.md` with:

````markdown
# Contributing to Advisor Desktop

Advisor Desktop is a portfolio demonstration; issues and pull requests are welcome.

## Getting started

```bash
git clone https://github.com/JoelLewis/advisor-desktop.git
cd advisor-desktop
pnpm install
pnpm dev
```

## Conventions

- TypeScript strict, no `any` (use `unknown` and narrow); `type` over `interface`; `as const` unions, no enums; ESM; no barrel files; `@/` maps to `src/`.
- Data flows UI → hook (TanStack Query) → service (`src/services`) → MSW handler → engine (`src/mocks`). The UI never imports a value from `src/mocks`.
- Every displayed figure comes from the engine and is formatted by `src/kit/measure.ts`; agents' claims carry no digits.
- US spelling in copy and code. No real person's name for a demo person.

## Before you open a pull request

```bash
pnpm lint
pnpm type-check
pnpm vitest run
pnpm build
VISUAL_PORT=5195 pnpm visual
```

A change that moves a visual baseline regenerates only that spec's baselines (`VISUAL_PORT=5195 pnpm visual:update -- <spec>`), and every changed PNG is looked at before it is committed.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
````

- [ ] **Step 4: Check the README against the app**

Run: `for f in $(grep -o 'e2e-visual/__baselines__/[a-z0-9-]*\.png' README.md); do test -f "$f" || echo "missing $f"; done; for f in src/mocks/data/people.ts src/lib/external-party.ts src/mocks/handlers/tax-return.ts src/lib/wash-sale.ts src/mocks/workspace/prospect-acts.ts e2e-visual/readme-path.spec.ts; do test -f "$f" || echo "missing $f"; done`
Expected: no output. Then read the README beside the spec once more: each bold control in steps 1–8 is clicked by the spec, in the same order. Run the spelling gate from Task 8 Step 6 over `README.md CONTRIBUTING.md` (prints nothing).

- [ ] **Step 5: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo && VISUAL_PORT=5195 pnpm visual`
Expected: PASS, no baseline update.

```bash
git add README.md CONTRIBUTING.md e2e-visual/readme-path.spec.ts
git commit -m "docs: a judge-first README with the five-minute path click by click, pinned by its own end-to-end story; CONTRIBUTING for the workspace

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 11: The switch

Runs after the final whole-branch review and its fixes. Two steps are irreversible and public; the executor asks the user before each and waits for an explicit yes in chat. A yes to the merge is not a yes to the deploy.

**Files:** none (git, wrangler and checks only).

**Interfaces:**
- Consumes: the whole branch.
- Produces: `main` = `workspace`; advisor.joelelewis.com serving it.

- [ ] **Step 1: Final checks on `workspace`**

```bash
git status --short                       # empty
pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && git checkout -- tsconfig.tsbuildinfo
VISUAL_PORT=5195 pnpm visual
pnpm dlx knip@6.39.0 --no-progress       # no output
grep -n '"preview_urls": true' wrangler.jsonc
git fetch origin
git log --oneline workspace..origin/main # empty: main has nothing workspace lacks
git log --oneline origin/main..workspace | wc -l
```

Expected: everything green; `workspace..origin/main` empty (if not, stop and report — a fast-forward is impossible); the count of commits `main` will gain recorded for the report. Push `workspace` and confirm its latest CI run is green (`gh run list --branch workspace --workflow ci.yml --limit 1`).

- [ ] **Step 2: Refresh the preview**

Run: `pnpm build && git checkout -- tsconfig.tsbuildinfo && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-7b --message "workspace phase 7b: polish and the switch"`
Then open `https://workspace-advisor-desktop.joel-e-lewis.workers.dev/t/th-brief`, `/billing`, `/models/mod-005` and `/no-such-page` and check each heading ("Brief", "Billing", "Ultra-HNW Multi-Strategy", "Page not found").

- [ ] **Step 3: STOP — ask before the merge and push**

Ask the user, in chat, and wait:

> Ready to fast-forward `main` to `workspace` (`<short sha>`, <n> commits ahead, `main` has nothing `workspace` lacks) and push `main` to origin. CI, the unit suite, lint, type-check, the build, the visual suite and knip are green; the preview is refreshed at https://workspace-advisor-desktop.joel-e-lewis.workers.dev. This changes the public repository's default branch. Go ahead?

Do nothing further until the user says yes. Any other answer ends the task here, reported as stopped at Step 3.

- [ ] **Step 4: Fast-forward and push `main`**

```bash
git checkout main
git merge --ff-only workspace
git push origin main
git checkout workspace
gh run watch --exit-status $(gh run list --branch main --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: the merge fast-forwards (no merge commit); the push succeeds; CI on `main` is green. A non-fast-forward refusal stops the task: report it, do not merge any other way.

- [ ] **Step 5: STOP — ask before the production deploy**

Ask the user, in chat, and wait:

> `main` is now `workspace` (`<short sha>`) and CI is green on it. Ready to deploy it to production — advisor.joelelewis.com — with `pnpm run deploy` (build, then `wrangler deploy`; `wrangler.jsonc` keeps `preview_urls: true`). The live site changes for everyone. Go ahead?

Do nothing further until the user says yes. Any other answer ends the task here, reported as stopped at Step 5.

- [ ] **Step 6: Deploy**

```bash
git checkout main
pnpm run deploy
git checkout -- tsconfig.tsbuildinfo
git checkout workspace
```

Expected: wrangler reports the deployment and the custom domain `advisor.joelelewis.com`. `pnpm run deploy`, not `pnpm deploy` (pnpm's built-in workspace command).

- [ ] **Step 7: Verify the live site**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://advisor.joelelewis.com/
for p in /t/th-brief /billing /models/mod-005 /no-such-page; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://advisor.joelelewis.com$p"; done
diff <(curl -sS https://advisor.joelelewis.com/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js') <(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' dist/index.html)
```

Expected: 200 for each (the Worker's SPA fallback serves the app), and the live bundle name equals the local build's. Then open https://advisor.joelelewis.com/t/th-brief, /billing, /models/mod-005 and /no-such-page in a browser and confirm the headings "Brief", "Billing", "Ultra-HNW Multi-Strategy" and "Page not found" (with its two links), and that https://workspace-advisor-desktop.joel-e-lewis.workers.dev still loads (previews still on). Report the deployed version id, the bundle name and the four headings.

---

## Self-review notes (for the executor)

- **Spec coverage.** §1 links → Task 5 (route guard with real router matching, the not-found page; stale strings die with the dead code in Task 1, the fake file paths in Task 5). §2 dead code → Tasks 1–4 (knip both modes plus the import graph; handler routes pinned by the API-routes guard; knip clean at Task 4; the e2e suite in Task 1). §3 CI → Task 9 (workflow, allowBuilds, timeouts, zone/locale runs) and the badge in Task 10. §4 README → Task 10 (two sentences, the eight steps with exact clicks pinned by `readme-path.spec.ts`, baselines in place, the enforced rules, architecture, run it, plainly). §5 parked items → the triage table; FIX items in Tasks 5–8. §6 the switch → Task 11 (two STOPs, `pnpm run deploy`, live verification). Testing → route guard (5), knip clean (4), CI green (9), unit/lint/build every task, visual green with baselines only where changed (5: new not-found; 6: the transcript; 1–4, 7, 8, 10: none).
- **Spec conflicts resolved.** The spec's `pnpm deploy` is pnpm's built-in workspace command; the plan runs the package script with `pnpm run deploy`. The spec's not-found page had no baseline: Task 5 adds one (`not-found-light.png`), which also replaces the deleted `e2e/smoke.spec.ts` check.
- **Names across tasks.** `api-routes.test.ts` (`PRUNED_ROUTES` added in Task 2, removed in Task 3); `route-paths.ts` (`pathLiterals`, `inAppPaths`, `routePatternOf`, `FoundPath`); `getHeldAway`; `driftBatchFacts` in `data/drift-facts.ts`; `findMocksImports`; renamed identifiers per Task 8's table (Tasks 9–11 use none of them).
- **Counted fixtures.** Seed thread ids (`th-brief`, `th-johnson-review`, `th-robert`, `th-johnson-meeting`, `th-pell`, `th-pell-work`) and act ids (`REC-0001` first) assume a fresh store per test, which `src/test/setup.ts` resets after each.
