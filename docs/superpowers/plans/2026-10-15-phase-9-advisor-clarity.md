# Phase 9: Advisor Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An advisor sitting down cold can tell in ten seconds, in plain words, who will read what they are about to write; the workspace speaks a practitioner's language; the flagship rebalance visibly catches and records a suitability gap; and the two client letters read like a person wrote them.

**Architecture:** Who-sees-what becomes one set of words computed in one place (`src/workspace/people/visibility-words.ts`) from an audience the engine serves with each thread (`ThreadDetail.audience`); the kit's band draws only the mark, the tint and the words it is given. The suitability catch is engine work: one function (`modelAboveTolerance`, `src/mocks/workspace/suitability.ts`) feeds the proposal's pre-trade results, the Pre-trade Check agent, the Drift Monitor's Brief finding and the approval refusal, and the reason travels on the approval act and its record. Vocabulary and copy changes are guarded from Task 1 by a test that reads every user-facing string literal in `src` and fails while a retired word remains, switched on word by word as each task removes it.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4 tokens, TanStack Query 5, React Router 6, MSW 2 as the server, Vitest 4 + Testing Library, Playwright visual baselines with `@axe-core/playwright` 4.13.0 on every scene, knip 6.39.0 via `pnpm dlx`, wrangler 4, the `typescript` compiler API (already a dev dependency) for the new guard.

**Spec:** `docs/superpowers/specs/2026-10-15-phase-9-advisor-clarity-design.md` (binding). Its inputs: `docs/audits/2026-10-15-advisor-clarity-critique.md` (priority issues 1–5 and the minors) and `docs/audits/2026-10-15-language-findings.md` (the glossary, the inconsistencies with file:line, and the top 10 copy changes).

## Global Constraints

- Work only on branch `workspace`, base = the commit that adds this plan (its parent is `f0e331b`). `git log --oneline -1` before starting; report BLOCKED if a prerequisite task's commit is missing. Nothing is committed to `main`; `main` is out of scope. Implementers never push; the controller pushes `workspace`.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums (`as const` arrays and unions); ESM; no barrel files. `.tsx` files export only components; helpers, words and types go in `.ts` siblings. Errors are explicit types or `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks (`?? ''` on a value that must exist is a silent fallback).
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`), `pnpm type-check`, `pnpm build` and `pnpm dlx knip@6.39.0 --no-progress` (no output). A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `wrangler.jsonc` with `git checkout -- wrangler.jsonc` if a tool modifies it. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`, `threshold: 0`). Regenerate only the specs whose baselines the task changes (`VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/<spec>.spec.ts`); then `git status --short e2e-visual/__baselines__` lists what moved, and the implementer opens every listed PNG with the Read tool and looks at it before committing. A PNG that moved outside the task's "Baselines" list is a bug in the task (or the list is wrong): stop and say which in the report. A listed PNG that did not move is fine; say so. Each task ends with a full `VISUAL_PORT=5195 pnpm visual` (every scene, the stories, the README path) green.
- axe stays green: every visual scene runs `expectNoAxeViolations` (`e2e-visual/axe.ts`). A task never disables a rule to make a scene pass. A new scene calls it right after its `toHaveScreenshot`.
- Every spec a task breaks is fixed in that task: a locator that names a renamed control is updated in `e2e-visual/workspace-steps.ts` or the spec, never loosened. `readme-path.spec.ts` stays green after every task; Task 14 rewrites the README and its spec together.
- No dependency is added in this phase.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`), which is **07:00 ET**. Never read the live clock in `src/mocks` (banned by test). The presenter's jumps move the session clock to Thu 26 Feb and Mon 2 Mar; fills are priced only in the 25 Feb session.
- Human times show in Eastern Time through `fmtEasternStamp` ("25 Feb 07:00 ET"; "07:00 ET" in a same-day context). Human dates use `fmtDayMonthYear` ("27 Mar 2026"); client letters keep `clientDate` ("March 28, 2026"). UTC appears only inside a record slip's Audit details, labeled "UTC" (`fmtUtcStamp`, imported by `src/kit/record-slip/RecordSlip.tsx` only; `src/__tests__/guardrails/one-clock.test.ts` stays green).
- The seed-times guard (`src/mocks/__tests__/seed-times.test.ts`) stays green: every seeded act falls on a working day at a plausible time.
- A link or button inside a dense table cell uses the hit-area pattern from `src/kit/link-target.ts`: `TABLE_LINK_TARGET` for links, `TABLE_HIT_AREA` for buttons. A standalone link uses `LINK_TARGET`.
- The announcer is the single spoken channel: anything said to a screen reader goes through `useAnnounce()` (`src/kit/announcer/use-announce.ts`). No new `aria-live` region and no `role="status"` used to speak a result.
- US spelling in all copy, identifiers and comments ("modeled", "realized", "canceled", "color", "labeled", "analyze").
- Agent claims contain no hand-typed digits. Every figure travels as a `Figure` and is formatted by the kit. From Task 10 a claim may also carry a figure's kit-formatted text (`figureText`, `src/kit/figure-text.ts`) for one of its own figures; any other digit fails `handTypedDigits` (`src/test/claim-digits.ts`).
- Domain copy: a rollover is only asked about, with a comparison to follow (any new wording keeps that meaning: "You asked about moving … We'll compare the options and come back to you"); tax amounts are estimates and the reader is told to check with their tax professional; no Reg BI framing (the firm is **Larkfield Advisory**, a fictional SEC-registered investment adviser; "Larkfield" in short); disclosure timing is labeled firm policy.
- No real person's name for any demo person. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002`, Mike Chen `user-003`, Mark Davis `cco-001`, Robert Johnson `cli-001`, Patricia Johnson `cli-002`, Dr. Amanda Pell `prsp-011`.
- Production UI never imports values from `src/mocks` (`import type` is allowed); `src/__tests__/guardrails/mocks-boundary.test.ts` stays green. A constant both sides need (the suitability reasons, the short firm name) lives in `src/lib`.
- The external-party boundary is unchanged: `src/mocks/workspace/__tests__/external-boundary.test.ts` stays green, an outsider still sees only their own thread, and no field this phase adds to a response an outsider can read carries firm-only data (no fingerprint, no record id, no agent, no colleague's provenance).
- Every in-app path literal matches a route (`route-links.test.ts`); every service request has a handler and every handler a caller (`api-routes.test.ts`).
- From Task 1, `src/__tests__/guardrails/retired-words.test.ts` runs: a retired word switched on must not appear in any user-facing string of `src`; a word not yet switched on must still appear (so the switch is never forgotten and the guard is never vacuous).
- Commit messages end with the trailer naming the model that wrote the commit: implementers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; the controller `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Preview deploy (Task 14, controller only): `pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-9 --message "workspace phase 9: advisor clarity"` → `https://workspace-advisor-desktop.joel-e-lewis.workers.dev`. No production deploy in this phase.

## Review Focus

1. **A newer version after a reason was chosen.** The advisor picks a suitability reason for v2, then saves v3 in the workbench. The approval panel must not carry v2's reason (or its note) over to v3: the reason, like the review tick, belongs to one version. Test: Task 8, `approval.test.tsx` "a new version clears the chosen reason and the note".
2. **The approval withdrawn.** The suitability line leaves the Brief's Needs a decision once v3 is approved with a reason; when Adrian withdraws that approval, nothing is approved any more and the line must come back. Test: Task 8, `brief-suitability.test.ts` "the line returns to Needs a decision when the approval is withdrawn".
3. **An outsider reading their own records.** Robert and Dr. Pell must never see a fingerprint, a record id, UTC or an Audit details disclosure on any slip in their thread, including the slips of acts made through the presenter's shortcut or a clock jump, and their roster must name "Larkfield compliance (review)" without naming Mark Davis. Tests: Task 6, `record-slip-audit.test.tsx` "an outsider's slip has no Audit details"; Task 3, `roster.test.ts` "an outsider's roster names compliance but no compliance person".
4. **Send from the composer fails after the draft is saved.** The client-visible composer's "Send to Robert" saves a draft and then sends it. If the send is refused (the draft went stale, or a permission changed), the draft must stay in the drafts panel and the composer must say plainly that it was saved but not sent, never drop the text silently. Test: Task 4, `composer-send.test.tsx` "a refused send keeps the draft and says it was not sent".
5. **A team thread about a household, and one about nobody.** "Johnson annual review" is about a household of two clients; the band must name both ("Larkfield team · Robert and Patricia can't see this"). A team thread about no client (a reference row about a model, or a thread with no subject) must read "Larkfield team · no client can see this", never an empty name. Tests: Task 2, `thread-audience.test.ts` "a household thread names every client in it" and "a thread about no client names nobody".

---

## Spec decisions this plan makes explicit

- **"Send to <first name>" uses the house's address name.** `addressNameOf` already names people on buttons and in letters: "Robert" for Robert Johnson, "Dr. Pell" for Dr. Amanda Pell. The spec's "first name" is read as that form, so the composer, the drafts panel and the existing "Send v2 to Dr. Pell" agree. The same form names outsiders in a team band ("Larkfield team · Dr. Pell can't see this"). (Tasks 2, 4.)
- **The composer's primary button sends.** In a client-visible thread a viewer with `send_to_party` gets a primary **Send to Robert** that saves the text as a draft and sends it as one recorded act from the drafts flow, and a secondary **Save draft**. A viewer who may draft but not send (Sarah Mitchell) gets only **Save draft**. A send refused after the save leaves the draft in the panel with a plain error. (Task 4.)
- **"Don't repurchase until <date>" names the first clear day.** The wash-sale window's last day is 27 Mar 2026 (a buy on that day still washes the loss), so "Don't repurchase until 27 Mar" would invite a purchase inside the window. The one phrase keeps the spec's wording and names the day after the window's last day (28 Mar 2026), as the client letter already does ("from March 28, 2026 you may buy it again"). The workbench column, the restriction list, agent citations and both letters use it. (Tasks 9, 11.)
- **The check lives on proposals, not on the OMS ticket.** `evaluateProposal` (`src/mocks/handlers/compliance.ts`) is shared with the trade ticket and the Rebalance flow; the model-above-tolerance check is appended by `withSuitability` where a proposal version is built and where the Pre-trade Check agent runs, so the ticket's behavior and `pre-trade-invariants.test.ts` are unchanged. (Task 7.)
- **The Brief line is a Drift Monitor finding, grouped on read.** The Brief's findings are measured with the book; whether the proposal is approved is session state. The Drift Monitor reports the gap (topic `model_above_tolerance`, Needs a decision); the thread handler moves that item to Context on every read once the account's proposal has an approval with a recorded reason, the same way Today is composed on read. (Tasks 7, 8.)
- **The best-interest record never needs the reason.** Only prospect proposals file a best-interest record, and a prospect proposal's model is by construction the model of her questionnaire's band, so the check cannot fire there. A test pins that (so the spec's "where it applies" is shown to be never), instead of adding a field nothing writes. (Task 8.)
- **Account display names are for people reading tables, headings and links.** Headings, table cells and links read "Robert Johnson · Individual (…3847)". Agent claims, thread titles and act summaries keep the account's digit-free name, because claims carry no hand-typed digits and thread titles are what the command line and the thread list match on. (Task 13.)
- **Only "Thread context" is renamed among the side-column labels.** The spec's table renames it to **Details**. "Live thread" (workbench and meeting) and the meeting's "Household reference" are not in the spec and stay; parked in the coverage table.
- **An outsider's thread and list.** Their thread's title reads "Your conversation with Larkfield"; their list's one group is titled "Larkfield Advisory" so the group and the row do not repeat each other. (Task 3.)

## Coverage

Every critique issue, every minor, and each of the language findings' top 10, with the task that closes it or the reason it is parked.

| Item | Finding | Task |
|---|---|---|
| Critique 1 | Who-sees-what has three vocabularies and one quiet signal | 2 (one vocabulary, band tint, legend gone), 3 (roster under the title), 4 (loud client composer) |
| Critique 2 | The client-side visibility line is not honest | 3 |
| Critique 3 | Invented vocabulary an advisor has to decode | 5 (swaps), 6 ("binding" retired, Audit details) |
| Critique 4 | The story contradicts its own suitability check | 7 (the check, the agents, the Brief line), 8 (the reason, recorded everywhere) |
| Critique 5 | The client-facing letters read like a system wrote them | 9 |
| Minor | The header names the product, not the person | 3 |
| Minor | The home steps are insider shorthand | 12 |
| Minor | The demo devices are labeled three ways; the frozen-date line goes false | 12 |
| Minor | The wash-sale window has several names; "Wash-sale taxpayer" pane | 11 |
| Minor | "Staged" means two things | 11 |
| Minor | Guardrail contortions leak into copy | 10 |
| Minor | Small wording fixes (single-fund, Closed today, Remove, Conversation) | 11 |
| Critique questions | 10-second test; do the patterns need to exist; drop binding/carry/reading; catch suitability; product name | Answered by the spec's decisions: 2–4 (ten seconds), 2 (patterns kept as a secondary mark), 5–6, 7–8, 3 (outsiders see Larkfield) |
| Top 10 · 1 | One visibility vocabulary, honest to clients | 2, 3 |
| Top 10 · 2 | Retire "binding"; Audit trail; acceptance wording | 6 |
| Top 10 · 3 | Rewrite the two client letters | 9 |
| Top 10 · 4 | Fix the suitability contradiction | 7, 8 |
| Top 10 · 5 | Swap the system nouns | 5 |
| Top 10 · 6 | Label all demo devices the same way; remove demo instructions from product copy; true home date line | 12 |
| Top 10 · 7 | One phrase for the wash-sale window | 11 |
| Top 10 · 8 | Disambiguate "staged"; one waiting-state label in the panel, Supervision and the blotter filter | 11 |
| Top 10 · 9 | Hide audit plumbing; accounts as "Owner · Type (…last 4)" | 6 (slip and archive row), 13 (account names). Internal ids elsewhere (citation sources such as `rs-001` and `doc-001`, the `n-01` names on note controls, "Staged from v3 · REC-0002") are **parked**: the spec moves ids into Audit details only on the record slip and the archive row |
| Top 10 · 10 | Contortions forced by guardrails; small labels; agent scope grammar | 10 (figure parts, "the value the engine states"), 11 (Est. additional tax, single-fund, Closed today, Remove, Conversation), 5 (scope grammar) |
| Language finding (not top 10) | "Live thread" and "Household reference" labels | **Parked**: not in the spec's table (see the decision above) |
| Language finding (not top 10) | Archive "Kind" lists each send twice; blotter as-of after fills; REC-0003 15:17 vs 15:18; seed slips (AAPL, AML, trust type); Brief covers one account | **Parked**: not in the spec; content and data fixes outside advisor clarity |

## Task order and shared files

| Task | Depends on | Shares files with |
|---|---|---|
| 1 Retired-words guard | — | new `src/__tests__/guardrails/retired-words.ts`, `retired-words.test.ts` (every later task flips one entry) |
| 2 Who sees what: one vocabulary | 1 | `src/types/workspace.ts`, `src/mocks/workspace/party.ts`, `handlers/workspace.ts`, `src/kit/visibility/*`, `src/styles/app.css`, `contrast.test.ts`, `ThreadList.tsx`, `ThreadListSkeleton.tsx`, `ThreadPage.tsx`, `LiveThreadFeed.tsx`, every page with a band, `KitSections.tsx`, `src/lib/firm.ts`, `prospect-proposal.spec.ts` |
| 3 Roster, honest outsiders, header | 2 | `ThreadPage.tsx`, `ThreadList.tsx`, `ContextColumn.tsx`, `WhoCanSee.tsx` (→ `ThreadAgents.tsx`), `WorkspaceShell.tsx`, `readme-path.spec.ts`, `shell.spec.ts` |
| 4 The client-visible composer | 3 | `Composer.tsx`, `composer-mode.ts`, `DraftsPanel.tsx`, `hooks/use-workspace.ts`, `shell.spec.ts`, `workspace-steps.ts` |
| 5 Plain vocabulary swaps | 4 | `CarryControl.tsx`, `CarriedFindingView.tsx`, `TakeToTeamThread.tsx`, `routes.tsx`, `FullViews.tsx`, `MeetingPage.tsx`, `ThreadList.tsx`, `ThreadListSkeleton.tsx`, `AgentScope.tsx`, `people.ts`, `ApprovalPanel.tsx`, `OrdersEvidence.tsx`, `meeting-prep.ts`, `home-steps.ts`, `workspace-steps.ts` |
| 6 Records, Audit trail, Audit details | 5 | `act-kind-label.ts`, `ActsPanel.tsx`, `ActRecordSlip.tsx`, `RecordSlip.tsx`, `ArchiveTable.tsx`, `SupervisionQueue.tsx`, `archive-filters.ts`, `DraftsPanel.tsx`, `CompactMessage.tsx`, `blotter.ts`, `reconciliation.ts` |
| 7 The suitability check | 6 | `src/services/oms.ts`, `proposal-engine.ts`, `pretrade-check.ts`, `drift-monitor.ts`, `brief-topic.ts`, `brief-groups.ts`, `src/types/workspace.ts` |
| 8 The approval reason | 7 | `src/lib/suitability.ts`, `src/types/workspace.ts`, `workspace-proposal.ts`, `proposal-acts.ts`, `handlers/workspace.ts`, `services/workspace.ts`, `hooks/use-workspace.ts`, `ApprovalPanel.tsx`, `approve-blocker.ts`, `act-provenance.ts`, `ArchiveTable.tsx`, `OrdersEvidence.tsx`, `workspace-steps.ts` |
| 9 Client letters | 8 | `meeting-recap.ts`, `recap.ts`, `meeting-notes.ts`, `prospect-proposal-agent.ts`, `tax-rules.ts`, `client-letter.ts`, new `src/lib/calendar-day.ts`, `meeting-review.spec.ts` |
| 10 Figure parts in claims | 9 | `src/kit/measure.ts`, new `src/kit/figure-text.ts`, `figure-format.ts`, `src/types/workspace.ts`, `meeting-prep.ts`, `AccountsTable.tsx`, three agent test files |
| 11 One wash-sale phrase, "staged" split, small labels | 10 | new `src/kit/repurchase.ts`, `WorkbenchLegs.tsx`, `WorkbenchSummary.tsx`, `RestrictionList.tsx`, `RestrictionRulers.tsx`, `harvest-scanner.ts`, `drift-monitor.ts`, `meeting-prep.ts`, `client-letter.ts`, `ApprovalPanel.tsx`, `OrdersEvidence.tsx`, `SupervisionQueue.tsx`, `reference-words.ts`, `compliance.ts`, `AgendaEditor.tsx`, `WorkspaceShell.tsx`, `TaxReadings.tsx`, prospect files, `workspace-steps.ts` |
| 12 Demo devices and the home page | 11 | `ProspectClock.tsx`, `MeetingControls.tsx`, `WorkspaceHome.tsx`, `home-steps.ts`, `SupervisionQueue.tsx`, `ReconciliationPage.tsx`, `workspace-steps.ts` |
| 13 Account display names | 12 | new `src/lib/account-display.ts`, `AccountView.tsx`, `FullViews.tsx`, `household-views.ts`, `risk.ts`, `attribution.ts`, `blotter.ts`, `reconciliation.ts`, `brief-today.ts`, `supervision.ts`, `reference-views.spec.ts`, `readme-path.spec.ts`, `phone.spec.ts`, `shell.spec.ts`, `compliance-review.spec.ts` |
| 14 README, the README path, every check, preview | all | `README.md`, `readme-path.spec.ts` |

One serial checkout. Tasks 2–6 each touch the thread list, the thread page or the context column the next one also touches; 5, 8 and 11 all edit `ApprovalPanel.tsx`; nearly every task moves shared baselines. No two tasks run in parallel.

## Baselines by task

59 baselines exist at `f0e331b` (`e2e-visual/__baselines__/`). "List scenes" are the scenes that show the thread list: `home-light`, `home-dark`, `home-mid-story-light`, `key-sheet-light`, `command-line-1440x600-light`, `adrian-johnson-finding-*`, `robert-thread-*`, `account-full-view-light`, `brief-*`, `proposal-thread-*`, `robert-letter-*`, `archive-light`, `thread-after-release-light`, `brief-after-fills-light`, `meeting-thread-light`, `robert-recap-light`, `robert-recap-client-light`, `pell-thread-light`, `pell-thread-prospect-light`, `pell-work-light`, `pell-onboarding-light`, `phone-home-light`. "Thread scenes" are those that show a thread page: `adrian-johnson-finding-*`, `robert-thread-*`, `brief-*`, `proposal-thread-*`, `robert-letter-*`, `thread-after-release-light`, `brief-after-fills-light`, `meeting-thread-light`, `robert-recap-light`, `robert-recap-client-light`, `pell-thread-light`, `pell-thread-prospect-light`, `pell-work-light`, `pell-onboarding-light`, `phone-brief-light`, `phone-thread-light`, `phone-context-light`.

| Task | Changes | Must not change | New |
|---|---|---|---|
| 1 | none | all | — |
| 2 | all except the two at right (list headings and legend, bands with words and tint on every thread, reference, full-view, meeting, workbench and archive page, the kit gallery's bands) | `not-found-light`, `supervision-light`, `supervision-dark` | — |
| 3 | thread scenes (roster under the title; Who can see leaves the context column); `robert-thread-*`, `robert-letter-*`, `robert-recap-client-light`, `pell-thread-prospect-light` also for the header and the outsider's title | every other | — |
| 4 | thread scenes whose composer a firm viewer sees (`adrian-johnson-finding-*`, `brief-*`, `proposal-thread-*`, `thread-after-release-light`, `brief-after-fills-light`, `meeting-thread-light`, `robert-recap-light`, `pell-thread-light`, `pell-work-light`, `pell-onboarding-light`, `phone-thread-light`), `workbench-*`, `meeting-before-*`, `meeting-after-*` | every other | `adrian-robert-thread-light` |
| 5 | list scenes (Firm, Reports, Agents), thread scenes with a context column (Details, Related records, Can/Can't), `brief-*` and `phone-brief-light` (Share to), reference views with a share button (`billing-*`, `practice-light`, `models-light`, `risk-book-*`, `reconciliation-light`, `blotter-light`, `resolve-dialog-320-light` behind its dialog), `supervision-*` (Pre-trade check pane), `meeting-thread-light` (prep wording), `meeting-before-*`, `meeting-after-*` (Related records), `kit-*` (the gallery's approval tick) | `not-found-light`, `account-full-view-light` | — |
| 6 | thread scenes with a context column (Audit trail heading), every scene with a record slip (`thread-after-release-light`, `robert-letter-*`, `meeting-after-*`, `robert-recap-client-light`, `pell-thread-light`, `pell-thread-prospect-light`, `pell-onboarding-light`), `archive-light`, `supervision-*`, `kit-*` | `home-*`, `not-found-light`, reference views | — |
| 7 | `brief-*`, `brief-after-fills-light`, `phone-brief-light`, `adrian-johnson-finding-*`, `proposal-thread-*`, `workbench-*`, `thread-after-release-light`, `supervision-*` | every other | — |
| 8 | `proposal-thread-*`, `thread-after-release-light`, `supervision-*`, `archive-light`, `brief-after-fills-light` | every other | — |
| 9 | `robert-recap-light`, `robert-recap-client-light`, `meeting-after-*` (the "To Robert" wordings in the filed notes), `pell-thread-light`, `pell-thread-prospect-light`, `pell-onboarding-light` | every other | — |
| 10 | `meeting-thread-light`, `meeting-before-*`, `household-light`, `client-light` (the accounts table's ties-to line) | every other | — |
| 11 | `workbench-*`, `proposal-thread-*`, `thread-after-release-light`, `supervision-*`, `blotter-light`, `brief-*`, `phone-brief-light`, `adrian-johnson-finding-*`, `meeting-thread-light`, `meeting-before-*`, `robert-letter-*`, `pell-work-light`, `pell-onboarding-light`, `key-sheet-light` | `home-*`, `not-found-light`, `kit-*` | — |
| 12 | `home-light`, `home-dark`, `home-mid-story-light`, `phone-home-light`, `meeting-before-*`, `pell-thread-light`, `reconciliation-light`, `supervision-*` only if its orders group is empty in the scene | every other | — |
| 13 | `account-full-view-light`, `household-light`, `client-light`, `risk-account-light`, `attribution-light`, `risk-book-*`, `blotter-light`, `reconciliation-light`, `resolve-dialog-320-light`, `supervision-*`, scenes with an account link under Related records (`adrian-johnson-finding-*`, `brief-*`, `proposal-thread-*`, `thread-after-release-light`, `brief-after-fills-light`, `phone-context-light`), `phone-risk-book-light` | every other | — |
| 14 | none | all | — |

---

### Task 1: The retired-words guard

A test that reads every user-facing string in `src` (string literals, template literals and JSX text, outside tests, comments, imports, literal types and `new …Error(…)` arguments) and checks each retired word. A word is either **retired** (it must not appear) or **still in use** (it must still appear, so the task that removes it has to flip it, and the guard can never pass vacuously). In this task every word is still in use; Tasks 2, 5 and 6 flip them.

**Files:**
- Create: `src/__tests__/guardrails/retired-words.ts`, `src/__tests__/guardrails/retired-words.test.ts`

**Interfaces:**
- Consumes: `listSourceFiles` from `src/__tests__/guardrails/detectors.ts`; the `typescript` compiler API.
- Produces: `RETIRED_WORDS: readonly RetiredWord[]` with `RetiredWord = { word: string; pattern: RegExp; retired: boolean; skip?: (file: string) => boolean }`; `userFacingStrings(source: string, fileName: string): { text: string; line: number }[]`; `retiredWordHits(entry: RetiredWord): string[]`. Later tasks change only an entry's `retired` from `false` to `true`.

- [ ] **Step 1: The extractor's own test, failing**

Create `src/__tests__/guardrails/retired-words.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { RETIRED_WORDS, retiredWordHits, userFacingStrings } from './retired-words'

describe('userFacingStrings', () => {
  const source = [
    "import { x } from './binding'",
    "type Kind = 'binding'",
    '// a binding comment',
    "const a = 'Take to'",
    'const b = `Take ${name} to a team thread`',
    "const c = <p>Binding acts</p>",
    "if (!ok) throw new Error('the binding act is missing')",
    "const d = new MeasureError('binding')",
  ].join('\n')
  const texts = userFacingStrings(source, 'fixture.tsx').map((s) => s.text)

  it('reads string literals, templates with their holes, and JSX text', () => {
    expect(texts).toEqual(['Take to', 'Take … to a team thread', 'Binding acts'])
  })
  it('names the line each string is on', () => {
    expect(userFacingStrings(source, 'fixture.tsx').find((s) => s.text === 'Binding acts')?.line).toBe(6)
  })
})

describe('retired words', () => {
  it.each(RETIRED_WORDS.filter((w) => w.retired).map((w) => [w.word, w] as const))('"%s" appears in no user-facing string', (_, entry) => {
    expect(retiredWordHits(entry)).toEqual([])
  })
  it.each(RETIRED_WORDS.filter((w) => !w.retired).map((w) => [w.word, w] as const))(
    '"%s" is still in use; the task that removes it switches it on',
    (_, entry) => expect(retiredWordHits(entry).length).toBeGreaterThan(0),
  )
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run src/__tests__/guardrails/retired-words.test.ts --testTimeout 30000`
Expected: FAIL with "Failed to resolve import './retired-words'".

- [ ] **Step 3: The extractor and the list**

Create `src/__tests__/guardrails/retired-words.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { listSourceFiles } from './detectors'

/**
 * A word the spec retires from what people read. `retired` is false while the word is still in the source and
 * true once the task that removes it has switched it on; both states are tested, so a removal without the switch
 * fails, and so does a switch without the removal.
 */
export type RetiredWord = { word: string; pattern: RegExp; retired: boolean; skip?: (file: string) => boolean }

export const RETIRED_WORDS: readonly RetiredWord[] = [
  {
    word: 'the old visibility words',
    pattern: /\bOnly you\b|\bFirm only\b|CAN SEE|\b(?:client|prospect) can't see\b|\bClients and prospects\b|CLIENTS AND PROSPECTS|^(?:Private|Internal)$|\bShared with (?:you|the client)\b/,
    retired: false,
    // A sleeve's manager is "Internal" in the book's data: a name, not a visibility word.
    skip: (file) => file.startsWith('src/mocks/data/'),
  },
  { word: 'binding', pattern: /\bbinding\b/i, retired: false },
  { word: 'Take to', pattern: /\bTaken?\b(?: …)? to\b/, retired: false },
  { word: 'carried', pattern: /\b[Cc]arried (?:by|from)\b/, retired: false },
  { word: 'Thread context', pattern: /\bThread context\b/, retired: false },
  { word: 'Full views', pattern: /\b[Ff]ull views?\b/, retired: false },
  { word: 'MAY NOT', pattern: /^(?:MAY|MAY NOT|may|may not)$/, retired: false },
]

const isErrorConstruction = (node: ts.Node): boolean =>
  ts.isNewExpression(node) && /Error$/.test(node.expression.getText())

function insideErrorOrModuleOrType(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (isErrorConstruction(n) || ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n)) return true
  }
  return false
}

/** Every string a person can read in this source: literals, templates (holes read as "…") and JSX text. */
export function userFacingStrings(source: string, fileName: string): { text: string; line: number }[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const found: { text: string; line: number }[] = []
  const add = (node: ts.Node, text: string) => {
    const trimmed = text.replace(/\s+/g, ' ').trim()
    if (trimmed && !insideErrorOrModuleOrType(node)) found.push({ text: trimmed, line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1 })
  }
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text)
    else if (ts.isTemplateExpression(node)) {
      add(node, [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('…'))
      return
    } else if (ts.isJsxText(node)) add(node, node.text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

const SOURCE_FILES = listSourceFiles('src').filter((f) => !f.startsWith('src/test/') && !f.startsWith('src/__tests__/'))

/** Where a retired word still reads, as "file:line: text". */
export function retiredWordHits(entry: RetiredWord): string[] {
  return SOURCE_FILES.filter((f) => !entry.skip?.(f)).flatMap((f) =>
    userFacingStrings(readFileSync(join(process.cwd(), f), 'utf8'), f)
      .filter((s) => entry.pattern.test(s.text))
      .map((s) => `${f}:${s.line}: ${s.text}`))
}
```

`listSourceFiles` already skips every `__tests__` directory; the filter drops `src/test` and the guardrails themselves.

- [ ] **Step 4: Run it to make sure it passes**

Run: `pnpm vitest run src/__tests__/guardrails/retired-words.test.ts --testTimeout 30000`
Expected: PASS. The extractor's two tests pass, there are no retired entries yet, and each of the seven words is still found (for example "binding" in `src/workspace/context/ActsPanel.tsx`, "Take to" in `src/workspace/thread/CarryControl.tsx`, "MAY NOT" in `src/workspace/people/AgentScope.tsx`). If one is not found, its pattern is wrong: fix the pattern, not the expectation.

- [ ] **Step 5: Every check, then commit**

Run the end-of-task checks (Global Constraints). Baselines: none move.

```bash
git add src/__tests__/guardrails/retired-words.ts src/__tests__/guardrails/retired-words.test.ts
git commit -m "test(guardrails): retired words fail once switched on, and must still be present until then

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Who sees what, in one vocabulary (critique 1; top 10 · 1)

The thread list's groups become **Just me**, **Larkfield team** and **Client conversations**; the legend goes. Every band says who reads what sits under it, naming people; a client-visible band gets a filled tint from a new token. The engine serves each thread's audience, so the band can name the clients a team thread is about.

**Files:**
- Modify: `src/lib/firm.ts`, `src/types/workspace.ts` (`ThreadAudience`, `ThreadDetail`), `src/mocks/workspace/party.ts`, `src/mocks/handlers/workspace.ts` (the thread GET), `src/kit/visibility/visibility.ts`, `src/kit/visibility/VisibilityBand.tsx`, `src/styles/app.css`, `src/__tests__/guardrails/contrast.test.ts`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/shell/ThreadListSkeleton.tsx`, `src/workspace/thread/ThreadPage.tsx`, `src/workspace/thread/LiveThreadFeed.tsx`, `src/workspace/meeting/MeetingPage.tsx`, `src/workspace/meeting/TranscriptNotes.tsx`, `src/workspace/full-views/HouseholdView.tsx`, `src/workspace/full-views/ClientView.tsx`, `src/workspace/prospect/ProspectPage.tsx`, `src/workspace/reference/ReferencePage.tsx`, `src/workspace/archive/ArchivePage.tsx`, `src/workspace/supervision/CorrespondenceEvidence.tsx`, `src/app/pages/kit/KitSections.tsx`, `src/kit/__tests__/VisibilityBand.test.tsx`, `src/__tests__/guardrails/retired-words.ts`, `e2e-visual/prospect-proposal.spec.ts`
- Create: `src/workspace/people/visibility-words.ts`, `src/mocks/workspace/__tests__/thread-audience.test.ts`, `src/workspace/__tests__/visibility-words.test.ts`
- Delete: `src/workspace/shell/VisibilityLegend.tsx`

**Interfaces:**
- Consumes: `addressNameOf`, `joinWords` (`src/lib/words.ts`); `partyOfThread`, `partyOf` (`src/mocks/workspace/party.ts`).
- Produces:
  - `FIRM_SHORT_NAME = 'Larkfield'` in `src/lib/firm.ts`.
  - `type ThreadAudience = { kind: 'owner' } | { kind: 'team'; about: string[] } | { kind: 'party'; name: string }` and `ThreadDetail = { thread: Thread; messages: Message[]; audience: ThreadAudience }` in `src/types/workspace.ts`.
  - `audienceOf(thread: Thread): ThreadAudience` in `src/mocks/workspace/party.ts`.
  - In `src/workspace/people/visibility-words.ts`: `THREAD_GROUP_TITLE: Readonly<Record<Visibility, string>>`, `JUST_YOU`, `OUTSIDER_BAND`, `teamWords(about: readonly string[]): string`, `partyWords(fullName: string): string`, `bandWordsOf(audience: ThreadAudience, viewerIsExternal: boolean): string`, `rowWordsOf(thread: Thread, directory: Directory, viewerIsExternal: boolean): string`.
  - Kit: `VisibilityBand({ visibility, words, scale })` (no `audience`, no `party`); `visibilityWords` and the kit's `Party` type are removed. Token `--ws-shared` / Tailwind `bg-shared`.

- [ ] **Step 1: The engine's audience, failing test**

Create `src/mocks/workspace/__tests__/thread-audience.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { audienceOf } from '../party'

const thread = (id: string) => {
  const t = store().threads.find((x) => x.id === id)
  if (!t) throw new Error(`no thread ${id}`)
  return t
}

describe('audienceOf', () => {
  beforeEach(() => resetWorkspaceStore())

  it('a private thread is its owner alone', () => expect(audienceOf(thread('th-brief'))).toEqual({ kind: 'owner' }))
  it('a client thread is read by its party', () => {
    expect(audienceOf(thread('th-robert'))).toEqual({ kind: 'party', name: 'Robert Johnson' })
    expect(audienceOf(thread('th-pell'))).toEqual({ kind: 'party', name: 'Dr. Amanda Pell' })
  })
  it("a team thread about an account names the account's owner", () => {
    expect(audienceOf(thread('th-johnson-review'))).toEqual({ kind: 'team', about: ['Robert Johnson'] })
  })
  it('a household thread names every client in it', () => {
    expect(audienceOf(thread('th-johnson-meeting'))).toEqual({ kind: 'team', about: ['Robert Johnson', 'Patricia Johnson'] })
  })
  it("a prospect's team thread names her", () => {
    expect(audienceOf(thread('th-pell-work'))).toEqual({ kind: 'team', about: ['Dr. Amanda Pell'] })
  })
  it('a thread about no client names nobody', () => {
    expect(audienceOf({ id: 'th-x', title: 'Models', visibility: 'internal', memberIds: ['user-001'], agentIds: [], subject: { type: 'model', id: 'mod-002' } }))
      .toEqual({ kind: 'team', about: [] })
    expect(audienceOf({ id: 'th-y', title: 'Notes', visibility: 'internal', memberIds: ['user-001'], agentIds: [] })).toEqual({ kind: 'team', about: [] })
  })
})
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/thread-audience.test.ts --testTimeout 30000`
Expected: FAIL with "audienceOf is not a function" (or the missing export).

- [ ] **Step 2: The audience, and the thread GET serves it**

In `src/types/workspace.ts`, beside `ThreadDetail`:

```ts
/** Who reads a thread besides the firm, as the band says it: its owner alone, the team (about these clients, by full name), or its party. */
export type ThreadAudience = { kind: 'owner' } | { kind: 'team'; about: string[] } | { kind: 'party'; name: string }
export type ThreadDetail = { thread: Thread; messages: Message[]; audience: ThreadAudience }
```

In `src/mocks/workspace/party.ts` (add the imports `accounts` from `@/mocks/data/accounts`, and `Subject`, `ThreadAudience` as types):

```ts
/** The clients (or the prospect) a team thread is about, by full name: an account's owner, a household's clients, a client, a prospect. */
function outsidersAbout(subject: Subject | undefined): string[] {
  switch (subject?.type) {
    case 'account': {
      const account = accounts.find((a) => a.id === subject.id)
      const owner = account && clients.find((c) => c.id === account.clientId)
      if (!owner) throw new Error(`Account ${subject.id} names no client`)
      return [owner.fullName]
    }
    case 'household': return clients.filter((c) => c.householdId === subject.id).map((c) => c.fullName)
    case 'client':
    case 'prospect': {
      const party = partyOf(subject.id)
      if (!party) throw new Error(`No client or prospect ${subject.id}`)
      return [party.name]
    }
    default: return []
  }
}

export function audienceOf(thread: Thread): ThreadAudience {
  if (thread.visibility === 'private') return { kind: 'owner' }
  if (thread.visibility === 'client') return { kind: 'party', name: partyOfThread(thread).name }
  return { kind: 'team', about: outsidersAbout(thread.subject) }
}
```

In `src/mocks/handlers/workspace.ts`, the `GET /api/workspace/threads/:id` handler builds `const detail: ThreadDetail = { thread, messages, audience: audienceOf(thread) }`. An outsider only ever reaches a client thread, so they only ever receive their own name.

Add to `src/mocks/workspace/__tests__/external-boundary.test.ts` a case that fetches `th-robert` as `cli-001` and `th-pell` as `prsp-011` through the handler (use the file's existing fetch helper) and expects `audience` to be `{ kind: 'party', name: <their own name> }`.

Run: `pnpm vitest run src/mocks/workspace/__tests__/thread-audience.test.ts src/mocks/workspace/__tests__/external-boundary.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 3: The words, failing test**

Create `src/workspace/__tests__/visibility-words.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { OUTSIDER_BAND, THREAD_GROUP_TITLE, bandWordsOf, teamWords } from '@/workspace/people/visibility-words'

describe('visibility words', () => {
  it('the thread list groups name who reads them', () => {
    expect(THREAD_GROUP_TITLE).toEqual({ private: 'Just me', internal: 'Larkfield team', client: 'Client conversations' })
  })
  it('a firm viewer reads the band in names', () => {
    expect(bandWordsOf({ kind: 'owner' }, false)).toBe('Just you')
    expect(bandWordsOf({ kind: 'team', about: ['Robert Johnson'] }, false)).toBe("Larkfield team · Robert can't see this")
    expect(bandWordsOf({ kind: 'team', about: ['Robert Johnson', 'Patricia Johnson'] }, false)).toBe("Larkfield team · Robert and Patricia can't see this")
    expect(bandWordsOf({ kind: 'team', about: ['Dr. Amanda Pell'] }, false)).toBe("Larkfield team · Dr. Pell can't see this")
    expect(bandWordsOf({ kind: 'team', about: [] }, false)).toBe('Larkfield team · no client can see this')
    expect(bandWordsOf({ kind: 'party', name: 'Robert Johnson' }, false)).toBe('Robert Johnson can read this')
  })
  it('an outsider is told the truth: the team, and compliance review', () => {
    expect(OUTSIDER_BAND).toBe('You and the Larkfield team. Messages are kept and reviewed by compliance, as the law requires.')
    expect(bandWordsOf({ kind: 'party', name: 'Robert Johnson' }, true)).toBe(OUTSIDER_BAND)
  })
  it('a team band with nobody named never reads an empty name', () => expect(teamWords([])).not.toMatch(/·\s+can't/))
})
```

Run: `pnpm vitest run src/workspace/__tests__/visibility-words.test.ts --testTimeout 30000`
Expected: FAIL with the missing module.

- [ ] **Step 4: The words**

`src/lib/firm.ts` gains:

```ts
/** The firm as its people and its clients say it in a sentence: "the Larkfield team". */
export const FIRM_SHORT_NAME = 'Larkfield'
```

Create `src/workspace/people/visibility-words.ts`:

```ts
import { FIRM_SHORT_NAME } from '@/lib/firm'
import { addressNameOf, joinWords } from '@/lib/words'
import type { Directory, Thread, ThreadAudience, Visibility } from '@/types/workspace'

/** The thread list's groups, named for who reads the threads in them. Prospects' threads sit with the clients'. */
export const THREAD_GROUP_TITLE: Readonly<Record<Visibility, string>> = {
  private: 'Just me', internal: `${FIRM_SHORT_NAME} team`, client: 'Client conversations',
}

export const JUST_YOU = 'Just you'

/** What a client or a prospect is told about who reads their conversation: the whole truth, compliance included. */
export const OUTSIDER_BAND = `You and the ${FIRM_SHORT_NAME} team. Messages are kept and reviewed by compliance, as the law requires.`

/** A team band, naming the clients who cannot read it as a button would address them. */
export const teamWords = (about: readonly string[]): string =>
  about.length === 0 ? `${FIRM_SHORT_NAME} team · no client can see this` : `${FIRM_SHORT_NAME} team · ${joinWords(about.map(addressNameOf))} can't see this`

export const partyWords = (fullName: string): string => `${fullName} can read this`

export function bandWordsOf(audience: ThreadAudience, viewerIsExternal: boolean): string {
  switch (audience.kind) {
    case 'owner': return JUST_YOU
    case 'team': return teamWords(audience.about)
    case 'party': return viewerIsExternal ? OUTSIDER_BAND : partyWords(audience.name)
  }
}

/** The thread list row's description for a screen reader: its group's words, naming the party of a client thread. */
export function rowWordsOf(thread: Thread, directory: Directory, viewerIsExternal: boolean): string {
  if (thread.visibility === 'private') return JUST_YOU
  if (thread.visibility === 'internal') return THREAD_GROUP_TITLE.internal
  if (viewerIsExternal) return OUTSIDER_BAND
  const party = directory.people.find((p) => p.id === thread.partyId)
  if (!party) throw new Error(`The party of thread "${thread.id}" is not in the directory`)
  return partyWords(party.name)
}
```

Run: `pnpm vitest run src/workspace/__tests__/visibility-words.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 5: The tint token**

In `src/styles/app.css`, inside the token block, add `--ws-shared` to `:root`, to the `prefers-color-scheme: dark` block and to `:root[data-theme="dark"]` (the two dark blocks must stay identical), and map it under `@theme` beside `--color-band`:

```css
  --ws-shared: oklch(0.915 0.03 230);   /* :root (light) */
  --ws-shared: oklch(0.255 0.03 230);   /* both dark blocks */
  --color-shared: var(--ws-shared);     /* @theme */
```

In `src/__tests__/guardrails/contrast.test.ts`: `const SURFACES = ['bg', 'face', 'band', 'shared'] as const`, and add `'shared'` to the `arrayContaining` list of the "every token is defined in light and dark" test.

Run: `pnpm vitest run src/__tests__/guardrails/contrast.test.ts --testTimeout 30000`
Expected: PASS: every text color at least 4.5:1 and every mark at least 3:1 on the tint, in both themes. If `ink-3` falls short on the tint, move the tint's lightness away from the ink by 0.005 at a time (lighter in light, darker in dark), keeping hue 230 and chroma 0.03, and rerun.

- [ ] **Step 6: The kit band draws the words it is given**

`src/kit/visibility/visibility.ts` keeps `Visibility` and `VISIBILITY_RULE` and drops `Party` and `visibilityWords`. `src/kit/visibility/VisibilityBand.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { VISIBILITY_RULE, type Visibility } from './visibility'

type BandProps = { visibility: Visibility; words: string; scale?: 'thread' | 'message' }

/**
 * Who reads what sits under the band, in the words the caller gives it, with the visibility mark beside them as a
 * second cue. A client-visible band is filled, so the moment a client will read is the loudest thing on the page.
 */
export function VisibilityBand({ visibility, words, scale = 'thread' }: BandProps) {
  const shared = visibility === 'client'
  return (
    <div role="note" aria-label={`Visibility: ${words}`} data-visibility={visibility} data-scale={scale}
      className={cn('flex items-center gap-3', shared && 'bg-shared px-3', shared && (scale === 'thread' ? 'py-2' : 'py-1'))}>
      <div aria-hidden="true" className={cn('w-8 shrink-0', VISIBILITY_RULE[visibility])} />
      <span aria-hidden="true" className={cn(scale === 'thread' ? 'text-body' : 'text-label normal-case', shared ? 'font-semibold text-ink' : 'text-ink-2')}>{words}</span>
    </div>
  )
}
```

Rewrite `src/kit/__tests__/VisibilityBand.test.tsx` to the new props: the note's name is `Visibility: <words>`, `data-visibility` is set, the words are `aria-hidden`, and only `visibility="client"` carries the `bg-shared` class.

- [ ] **Step 7: Every band gets its words**

| File | The band now |
|---|---|
| `src/workspace/thread/ThreadPage.tsx` | `<VisibilityBand visibility={thread.visibility} scale="thread" words={bandWordsOf(audience, isExternalViewerIn(directory, viewerId))} />`, with `audience` from `ThreadDetail` and `viewerId` from `useViewer()`. The `audience`/`party` lookup and its throw go. |
| `src/workspace/thread/LiveThreadFeed.tsx` | `words={bandWordsOf(thread.data.audience, false)}` (a firm column) |
| `src/workspace/meeting/MeetingPage.tsx` | `words={household.data ? teamWords(household.data.members.map((m) => m.name)) : THREAD_GROUP_TITLE.internal}` (never "no client" while the household loads) |
| `src/workspace/full-views/HouseholdView.tsx` | `words={teamWords(view.members.map((m) => m.name))}` |
| `src/workspace/full-views/ClientView.tsx` | `words={teamWords([view.name])}` |
| `src/workspace/prospect/ProspectPage.tsx` | `words={teamWords([view.name])}` |
| `src/workspace/reference/ReferencePage.tsx`, `src/workspace/archive/ArchivePage.tsx` | `words={teamWords([])}` |
| `src/workspace/supervision/CorrespondenceEvidence.tsx` | client band `words={partyWords(item.partyName)}`; internal band `words={teamWords([item.partyName])}` |
| `src/app/pages/kit/KitSections.tsx` | literal sample words: `'Just you'`, `"Larkfield team · Robert can't see this"`, `` `${account.name} can read this` `` (the gallery shows the kit, not the workspace's rules) |

`src/workspace/meeting/TranscriptNotes.tsx`: the transcript pane's `meta="Firm only"` becomes `meta={THREAD_GROUP_TITLE.internal}` ("Larkfield team").

- [ ] **Step 8: The thread list without a legend**

`src/workspace/shell/ThreadList.tsx`:
- `GROUPS` becomes `(['private', 'internal', 'client'] as const).map((visibility) => ({ visibility, title: THREAD_GROUP_TITLE[visibility] }))`; the `VisibilityLegend` / `ExternalVisibilityLegend` line and their import go. An outsider's one group keeps `EXTERNAL_GROUP_TITLE` for now (Task 3 changes it).
- `ThreadRow` takes `directory` and `viewerIsExternal` and its sr-only description reads `` `Visibility: ${rowWordsOf(t, directory, viewerIsExternal)}` ``. The `VisibilityMark` stays above the title.

`src/workspace/shell/ThreadListSkeleton.tsx`: titles from `THREAD_GROUP_TITLE`; the `<VisibilityLegend />` line goes, so the skeleton keeps the loaded list's heights. Delete `src/workspace/shell/VisibilityLegend.tsx`.

Update the unit tests that named the old words (`rg -n "Only you|Firm only|CAN SEE|can't see|Clients and prospects|Private|Internal|Shared with you" src --glob '**/__tests__/**'`) to the new words; `shell.test.tsx` and `context.test.tsx` are the likely ones.

- [ ] **Step 9: Switch the guard on**

In `src/__tests__/guardrails/retired-words.ts` set `retired: true` on "the old visibility words".

Run: `pnpm vitest run src/__tests__/guardrails src/workspace src/kit src/mocks/workspace --testTimeout 30000`
Expected: PASS. A hit names its file and line: change that copy to the new words, never the pattern.

- [ ] **Step 10: The stories and the baselines**

`e2e-visual/prospect-proposal.spec.ts:116`: `page.getByRole('note', { name: 'Visibility: Dr. Amanda Pell can read this' })`. Search the specs for any other old word (`rg -n "Only you|Firm only|CAN SEE|Clients and prospects|'Private'|'Internal'" e2e-visual`) and update each.

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/reference-views.spec.ts e2e-visual/kit.spec.ts e2e-visual/phone.spec.ts e2e-visual/dialogs.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG. Check: the list reads Just me / Larkfield team / Client conversations with no legend; a client thread's band is filled and names the client; the Johnson review band reads "Larkfield team · Robert can't see this"; the annual review's names Robert and Patricia; Billing's reads "no client can see this"; Robert's own view reads the compliance sentence; dark scenes keep the tint legible. `not-found-light` and `supervision-*` must not move. Then `VISUAL_PORT=5195 pnpm visual` (all green, axe included).

- [ ] **Step 11: Every check, then commit**

```bash
git add -A src e2e-visual
git status --short   # only this task's files
git commit -m "feat(visibility): one vocabulary naming people, a filled client band, the legend gone; the engine serves each thread's audience

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The roster under the title, honest outsiders, and their header (critique 1, 2; minor: header)

The "Who can see" list moves from the context column to one line under each thread's title. An outsider's roster names "Larkfield compliance (review)". An outsider's header reads "Larkfield Advisory" and their own name, and their thread is titled "Your conversation with Larkfield".

**Files:**
- Create: `src/workspace/people/roster.ts`, `src/workspace/__tests__/roster.test.ts`, `src/workspace/context/ThreadAgents.tsx`, `src/workspace/shell/Brand.tsx`, `src/workspace/shell/brand-words.ts`
- Modify: `src/workspace/thread/ThreadPage.tsx`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/context/ContextColumn.tsx`, `src/workspace/shell/WorkspaceShell.tsx`, `src/workspace/__tests__/shell.test.tsx`, `src/workspace/__tests__/context.test.tsx`, `e2e-visual/shell.spec.ts`, `e2e-visual/readme-path.spec.ts`, `e2e-visual/rebalance-job.spec.ts`, `e2e-visual/meeting-review.spec.ts`, `e2e-visual/prospect-proposal.spec.ts`
- Delete: `src/workspace/context/WhoCanSee.tsx`

**Interfaces:**
- Consumes: `FIRM_NAME`, `FIRM_SHORT_NAME` (`src/lib/firm.ts`); `personIn`, `isExternalViewerIn` (`directory-people.ts`); `personWithRole` (`role-label.ts`); `APP_NAME` (`src/app/document-title.ts`).
- Produces: `rosterOf(thread: Thread, directory: Directory, viewerIsExternal: boolean): string[]`; `OUTSIDER_THREAD_TITLE = 'Your conversation with Larkfield'` and `threadTitleFor(thread: Thread, viewerIsExternal: boolean): string` in `src/workspace/people/roster.ts`; `brandOf(directory: Directory | undefined, viewerId: string): { name: string; viewerName?: string }` in `src/workspace/shell/brand-words.ts`; `<Brand />`; `<ThreadAgents />`.

- [ ] **Step 1: The roster, failing test**

Create `src/workspace/__tests__/roster.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rosterOf, threadTitleFor } from '@/workspace/people/roster'
import type { Directory, Thread } from '@/types/workspace'

const directory: Directory = {
  people: [
    { id: 'user-001', name: 'Adrian Hale', role: 'advisor' }, { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' },
    { id: 'cco-001', name: 'Mark Davis', role: 'compliance' }, { id: 'cli-001', name: 'Robert Johnson', role: 'client' },
  ],
  agents: [], permissions: {},
}
const robert: Thread = { id: 'th-robert', title: 'Robert Johnson', visibility: 'client', partyId: 'cli-001', memberIds: ['cli-001', 'user-001', 'user-002'], agentIds: [] }
const brief: Thread = { id: 'th-brief', title: 'Brief', visibility: 'private', ownerId: 'user-001', memberIds: ['user-001'], agentIds: [] }

describe('rosterOf', () => {
  it('names each reader and their role, and compliance supervising a firm-side view', () => {
    expect(rosterOf(robert, directory, false)).toEqual([
      'Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Mark Davis · Compliance (supervision)',
    ])
  })
  it("an outsider's roster names compliance but no compliance person", () => {
    const roster = rosterOf(robert, directory, true)
    expect(roster).toEqual(['Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Larkfield compliance (review)'])
    expect(roster.join(' ')).not.toContain('Mark Davis')
  })
  it('a private thread is its owner alone', () => expect(rosterOf(brief, directory, false)).toEqual(['Adrian Hale · Advisor']))
})

describe('threadTitleFor', () => {
  it('addresses an outsider; the firm reads the thread title', () => {
    expect(threadTitleFor(robert, true)).toBe('Your conversation with Larkfield')
    expect(threadTitleFor(robert, false)).toBe('Robert Johnson')
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/roster.test.ts --testTimeout 30000`
Expected: FAIL with the missing module.

- [ ] **Step 2: The roster and the title**

Create `src/workspace/people/roster.ts`:

```ts
import { FIRM_SHORT_NAME } from '@/lib/firm'
import type { Directory, Thread } from '@/types/workspace'
import { personIn } from './directory-people'
import { personWithRole } from './role-label'

export const OUTSIDER_THREAD_TITLE = `Your conversation with ${FIRM_SHORT_NAME}`

/**
 * Everyone who reads the thread, one name each: its members, then compliance, who supervises every firm and client
 * thread. An outsider is told compliance reviews their messages, without being handed a colleague's name.
 */
export function rosterOf(thread: Thread, directory: Directory, viewerIsExternal: boolean): string[] {
  const memberIds = [...new Set([...(thread.ownerId ? [thread.ownerId] : []), ...thread.memberIds])]
  const members = memberIds.map((id) => personWithRole(personIn(directory, id)))
  if (thread.visibility === 'private') return members
  if (viewerIsExternal) return [...members, `${FIRM_SHORT_NAME} compliance (review)`]
  const supervisors = directory.people.filter((p) => p.role === 'compliance' && !memberIds.includes(p.id))
  return [...members, ...supervisors.map((p) => `${p.name} · Compliance (supervision)`)]
}

/** The thread's title as its viewer reads it: an outsider's own conversation is addressed to them. */
export const threadTitleFor = (thread: Thread, viewerIsExternal: boolean): string => (viewerIsExternal ? OUTSIDER_THREAD_TITLE : thread.title)
```

Run: `pnpm vitest run src/workspace/__tests__/roster.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 3: Under the title; out of the context column**

`src/workspace/thread/ThreadPage.tsx`, in `Thread`'s header, after the band:

```tsx
<h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{threadTitleFor(thread, viewerIsExternal)}</h1>
<p aria-label="Who can see" className="text-body text-ink-2">
  <span aria-hidden="true" className="text-ink-3">Who can see: </span>{rosterOf(thread, directory, viewerIsExternal).join(', ')}
</p>
```

Create `src/workspace/context/ThreadAgents.tsx` from the agents half of `WhoCanSee.tsx` (a `ContextSection` titled "Agents" listing `<AgentScope>` for the thread's agents, rendered only for a firm viewer and only when the thread has agents). In `ContextColumn.tsx` replace `<WhoCanSee … />` with `{viewerIsExternal ? null : <ThreadAgents thread={t} directory={dir} />}`. Delete `WhoCanSee.tsx`.

`src/workspace/shell/ThreadList.tsx`: an outsider's row shows `threadTitleFor(t, true)`, and their one group's title becomes `FIRM_NAME` ("Larkfield Advisory"); `EXTERNAL_GROUP_TITLE` goes.

Add to `src/workspace/__tests__/context.test.tsx` (or `thread.test.tsx`, beside the existing Robert view-as tests, with `viewAsOnLoad('cli-001')`): on `/t/th-robert` as Robert, the heading is "Your conversation with Larkfield", the "Who can see" line contains "Larkfield compliance (review)" and not "Mark Davis"; as Adrian, the line contains "Mark Davis · Compliance (supervision)" and the context column has no "Who can see" heading.

- [ ] **Step 4: The header names the firm and the person for an outsider**

Create `src/workspace/shell/brand-words.ts`:

```ts
import { APP_NAME } from '@/app/document-title'
import { FIRM_NAME } from '@/lib/firm'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import type { Directory } from '@/types/workspace'

/** The product to the firm; to a client or a prospect, the firm they deal with, and their own name. */
export function brandOf(directory: Directory | undefined, viewerId: string): { name: string; viewerName?: string } {
  if (!directory || !isExternalViewerIn(directory, viewerId)) return { name: APP_NAME }
  const viewer = directory.people.find((p) => p.id === viewerId)
  if (!viewer) throw new Error(`Viewer ${viewerId} is not in their own directory`)
  return { name: FIRM_NAME, viewerName: viewer.name }
}
```

Create `src/workspace/shell/Brand.tsx` rendering, inside `<div className="flex items-baseline gap-3">`, the existing home `<Link>` (same classes) with `brand.name`, then `brand.viewerName` as `<span className="text-body text-ink-2">` when present. `WorkspaceShell.tsx` renders `<Brand />` in place of the `Advisor Desktop` link.

Add to `src/workspace/__tests__/shell.test.tsx`: as Adrian the banner's home link is "Advisor Desktop"; with `sessionStorage.setItem('ws-viewer', 'cli-001')` it is "Larkfield Advisory" and the banner contains "Robert Johnson".

- [ ] **Step 5: The stories**

- `e2e-visual/readme-path.spec.ts` step 8: `await expect(threads).toHaveAccessibleName('Your conversation with Larkfield')`.
- Every outsider scene or story that waits for the heading `Robert Johnson` or `Dr. Amanda Pell` as that person (`robertOnHisThread` in `shell.spec.ts`, `robertLetter` in `rebalance-job.spec.ts`, `robertRecapClient` in `meeting-review.spec.ts`, `pellThreadAsHer` in `prospect-proposal.spec.ts`) waits for "Your conversation with Larkfield" instead.
- Any story that clicks the banner's `Advisor Desktop` link while viewing as an outsider clicks `Larkfield Advisory`.
- A story that read "Who can see" in the context column (`rg -n "Who can see" e2e-visual`) reads `page.getByLabel('Who can see')`.

- [ ] **Step 6: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the roster sits on one line under each title and wraps cleanly; the context column starts with its next section; Robert's header reads "LARKFIELD ADVISORY" (the link keeps its caps style) and "Robert Johnson", his title "Your conversation with Larkfield". Then the full suite, the end-of-task checks, and:

```bash
git add -A src e2e-visual
git commit -m "feat(threads): who can see under every title; outsiders told compliance reviews, and shown the firm and their own name

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The client-visible composer (critique 1 "make the client moment loud")

In a client-visible thread the composer's frame is tinted, its field reads "Message to Robert Johnson", and its primary button reads **Send to Robert**: it saves the text as a draft and sends it, one recorded act. **Save draft** stays as the secondary button. A team thread's button reads **Post to the team**. The drafts panel uses the same naming.

**Files:**
- Modify: `src/workspace/thread/composer-mode.ts`, `src/workspace/thread/Composer.tsx`, `src/hooks/use-workspace.ts`, `src/workspace/context/DraftsPanel.tsx`, `src/workspace/__tests__/context.test.tsx`, `src/workspace/__tests__/viewer-cache.test.tsx`, `src/workspace/__tests__/workbench-layout.test.tsx`, `e2e-visual/shell.spec.ts`, `e2e-visual/workspace-steps.ts`
- Create: `src/workspace/__tests__/composer-send.test.tsx`

**Interfaces:**
- Consumes: `api.createDraft(viewer, threadId, body)` and `api.sendToParty(viewer, draftId)` (`src/services/workspace.ts`); `addressNameOf` (`src/lib/words.ts`); `useAnnounce`.
- Produces:
  - `ComposerMode = { kind: 'post'; action: 'Post to the team' | 'Post' | 'Send' } | { kind: 'draft'; partyName: string; addressName: string; canSend: boolean } | { kind: 'read-only' }`.
  - `useSaveAndSend(threadId: string)`: a mutation whose `mutationFn(body)` creates the draft and sends it, returning `{ draftId: string; act: BindingAct }`; on a refused send it throws `NotSentError` (`class NotSentError extends Error { draftId: string }`), defined in `src/hooks/not-sent-error.ts`.

- [ ] **Step 1: Failing tests**

Create `src/workspace/__tests__/composer-send.test.tsx` (the idioms of `context.test.tsx`: `renderRoutes(routes, '/t/th-robert')`, `server.use(...)` to refuse a request):

```tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'

const open = async () => {
  renderRoutes(routes, '/t/th-robert')
  return screen.findByRole('textbox', { name: 'Message to Robert Johnson' })
}

describe('the client-visible composer', () => {
  it('names the client, and its primary button sends', async () => {
    const user = userEvent.setup()
    await user.type(await open(), 'Your review is booked for Friday.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    const messages = await screen.findByRole('list', { name: 'Messages' })
    await waitFor(() => expect(within(messages).getByText('Your review is booked for Friday.')).toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Message to Robert Johnson' })).toHaveValue('')
  })

  it('Save draft keeps it for later, unsent', async () => {
    const user = userEvent.setup()
    await user.type(await open(), 'Draft for later.')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByRole('article', { name: 'Draft · not sent' })).toHaveTextContent('Draft for later.')
  })

  it('a refused send keeps the draft and says it was not sent', async () => {
    server.use(http.post('/api/workspace/acts', () => HttpResponse.json({ code: 'STALE', message: 'This letter is stale.' }, { status: 409 })))
    const user = userEvent.setup()
    await user.type(await open(), 'Kept, not sent.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Saved as a draft; not sent: This letter is stale.')
    expect(await screen.findByRole('article', { name: 'Draft · not sent' })).toHaveTextContent('Kept, not sent.')
  })

  it('a team thread posts to the team', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    expect(await screen.findByRole('button', { name: 'Post to the team' })).toBeInTheDocument()
  })
})
```

Add to the same file a case viewing as Sarah Mitchell (`sessionStorage.setItem('ws-viewer', 'user-002')` before render): the field is "Message to Robert Johnson" and there is a **Save draft** button and no **Send to Robert** button.

Run: `pnpm vitest run src/workspace/__tests__/composer-send.test.tsx --testTimeout 30000`
Expected: FAIL (no textbox named "Message to Robert Johnson").

- [ ] **Step 2: The mode**

`src/workspace/thread/composer-mode.ts`:

```ts
export type ComposerMode =
  | { kind: 'post'; action: 'Post to the team' | 'Post' | 'Send' }
  | { kind: 'draft'; partyName: string; addressName: string; canSend: boolean }
  | { kind: 'read-only' }

export function composerModeOf(thread: Thread, viewerId: string, directory: Directory): ComposerMode {
  const acts = directory.permissions[viewerId] ?? []
  if (thread.visibility === 'client') {
    if (thread.partyId === viewerId) return { kind: 'post', action: 'Send' }
    if (!acts.includes('draft_for_client')) return { kind: 'read-only' }
    const party = directory.people.find((p) => p.id === thread.partyId)
    if (!party) throw new Error(`The party of thread "${thread.id}" is not in the directory`)
    return { kind: 'draft', partyName: party.name, addressName: addressNameOf(party.name), canSend: acts.includes('send_to_party') }
  }
  const belongs = thread.memberIds.includes(viewerId) || thread.ownerId === viewerId
  if (!belongs || !acts.includes('post_firm')) return { kind: 'read-only' }
  return { kind: 'post', action: thread.visibility === 'internal' ? 'Post to the team' : 'Post' }
}
```

`canPostIn` (`can-post.ts`) is unchanged: it still asks for `kind === 'post'`.

- [ ] **Step 3: Save and send, as one mutation**

Create `src/hooks/not-sent-error.ts`:

```ts
/** The draft was saved but the send was refused: the draft waits in the drafts panel. */
export class NotSentError extends Error {
  constructor(readonly draftId: string, reason: string) {
    super(`Saved as a draft; not sent: ${reason}`)
    this.name = 'NotSentError'
  }
}
```

In `src/hooks/use-workspace.ts`, beside `useCreateDraft`:

```ts
export function useSaveAndSend(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async (body: string) => {
      const draft = await api.createDraft(viewerId, threadId, body)
      try {
        return { draftId: draft.id, act: await api.sendToParty(viewerId, draft.id) }
      } catch (error) {
        throw new NotSentError(draft.id, error instanceof Error ? error.message : String(error))
      }
    },
    onSettled: invalidate,
  })
}
```

`api.createDraft` returns the saved `Draft` and `api.sendToParty` the `BindingAct`; a refusal throws `ApiClientError` (`src/services/api-client.ts`) whose message is the engine's.

- [ ] **Step 4: The composer**

`src/workspace/thread/Composer.tsx`: the `draft` case renders `<ClientComposer threadId={thread.id} mode={mode} />`:

```tsx
function ClientComposer({ threadId, mode }: { threadId: string; mode: Extract<ComposerMode, { kind: 'draft' }> }) {
  const draft = useCreateDraft(threadId)
  const send = useSaveAndSend(threadId)
  const announce = useAnnounce()
  return (
    <ComposerForm label={`Message to ${mode.partyName}`} tinted
      action={mode.canSend ? `Send to ${mode.addressName}` : 'Save draft'}
      secondary={mode.canSend ? { label: 'Save draft', pending: draft.isPending, run: (body, done) => draft.mutate(body, { onSuccess: () => { done(); announce('Draft saved — not sent.') } }) } : undefined}
      pending={draft.isPending || send.isPending} error={send.error ?? draft.error}
      submit={(body, done) => (mode.canSend
        ? send.mutate(body, { onSuccess: ({ act }) => { done(); announce(`Sent to ${mode.addressName} · ${act.id}`) } })
        : draft.mutate(body, { onSuccess: () => { done(); announce('Draft saved — not sent.') } }))} />
  )
}
```

`ComposerForm` gains `tinted?: boolean` (the form's classes add `bg-shared p-4` and keep `border-t border-ink`) and `secondary?: { label: string; pending: boolean; run: (body: string, done: () => void) => void }`, rendered as `<Button rank="secondary" …>` before the primary; `done` clears the field and returns focus to it, as `onSaved` does today (move the existing `announce(savedNote ?? 'Posted.')` into the callers so each says its own result once). The post composer keeps label "Message" and announces "Posted." The placeholder "Write a draft for … (not sent until you send it)" goes: the label and the button now say it.

`src/workspace/context/DraftsPanel.tsx`: the section title becomes `` `Drafts · message to ${party.name}` ``; its Send button already reads `Send to ${addressNameOf(party.name)}`.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/composer-send.test.tsx src/workspace/__tests__/context.test.tsx src/workspace/__tests__/viewer-cache.test.tsx src/workspace/__tests__/workbench-layout.test.tsx --testTimeout 30000`
Expected: `composer-send` PASS. The other three fail where they name the textbox "Draft", the button "Post", or a lone "Send to Robert": update them to "Message to Robert Johnson", "Post to the team", and a "Send to Robert" scoped to the draft article (`within(screen.getByRole('article', { name: 'Draft · not sent' }))`). Rerun: PASS.

- [ ] **Step 6: The stories, a new scene, the baselines**

- `e2e-visual/shell.spec.ts` success path: fill `page.getByRole('textbox', { name: 'Message to Robert Johnson' })`, click **Save draft**, then `page.getByRole('article', { name: 'Draft · not sent' }).getByRole('button', { name: 'Send to Robert' })`.
- `e2e-visual/workspace-steps.ts`: `sendLetter` already scopes to `letterDraft(page)`; check every other `'Send to Robert'` locator in the specs (`rg -n "Send to Robert" e2e-visual`) is scoped to `letterDraft(page)`.
- New scene in `shell.spec.ts`'s `SCENES`: `{ name: 'adrian-robert-thread-light', hasContext: true, open: async (page) => { await visit(page, '/t/th-robert', 'light'); await settle(page) } }`. It runs axe like its neighbors.

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG and the new one: Robert's thread as Adrian shows the filled band, the filled composer "Message to Robert Johnson" with **Save draft** and **Send to Robert**; team threads show **Post to the team**; Dr. Pell's thread as Adrian shows **Send to Dr. Pell**. Then the full suite and the end-of-task checks.

- [ ] **Step 7: Commit**

```bash
git add -A src e2e-visual
git commit -m "feat(composer): a client thread's composer names the client and sends; a team thread's posts to the team

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Plain vocabulary swaps (critique 3; top 10 · 5; top 10 · 10 agent scope grammar)

**Files:**
- Modify: `src/workspace/thread/CarryControl.tsx`, `src/workspace/thread/CarriedFindingView.tsx`, `src/workspace/reference/TakeToTeamThread.tsx`, `src/app/routes.tsx`, `src/workspace/context/FullViews.tsx`, `src/workspace/meeting/MeetingPage.tsx`, `src/workspace/thread/embeds/DriftEmbed.tsx`, `src/workspace/thread/embeds/RebalanceEmbed.tsx`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/shell/ThreadListSkeleton.tsx`, `src/workspace/people/AgentScope.tsx`, `src/mocks/data/people.ts`, `src/workspace/context/ApprovalPanel.tsx`, `src/workspace/supervision/OrdersEvidence.tsx`, `src/mocks/workspace/presenter.ts`, `src/workspace/workbench/CompactMessage.tsx`, `src/mocks/agents/meeting-prep.ts`, `src/mocks/data/proposals-store.ts`, `src/workspace/workbench/Workbench.tsx`, `src/workspace/workbench/WorkbenchSummary.tsx`, `src/app/pages/KitPage.tsx`, `src/app/pages/kit/KitSections.tsx`, `src/app/pages/kit/use-kit-data.ts`, `src/workspace/shell/home-steps.ts`, `src/__tests__/guardrails/retired-words.ts`, the unit tests that name the old words, `e2e-visual/workspace-steps.ts`, `e2e-visual/shell.spec.ts`, `e2e-visual/reference-views.spec.ts`, `e2e-visual/readme-path.spec.ts`
- Create: `src/workspace/__tests__/vocabulary.test.tsx`

**Interfaces:**
- Consumes: Task 2's `THREAD_GROUP_TITLE`; Task 3's `ThreadAgents`.
- Produces: the words later tasks and the README use: **Share to ▾**, "Shared to <thread>.", "shared by", **Details** (the context column's label, and so the `complementary` landmark's name), **Related records**, **Open account**, the list panes **Firm** and **Reports**, **Agents**, scope verbs **Can** / **Can't**, the approval tick "I reviewed every leg of v<n> and its pre-trade check results."

- [ ] **Step 1: Failing test**

Create `src/workspace/__tests__/vocabulary.test.tsx` (as Adrian, fresh store):

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

describe('the practice words', () => {
  it('the list says Firm, Reports and Agents; agents say what they can and cannot do', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    const list = await screen.findByRole('navigation', { name: 'Threads' })
    expect(within(list).getByRole('heading', { name: 'Firm' })).toBeInTheDocument()
    expect(within(list).getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(within(list).getByRole('heading', { name: 'Agents' })).toBeInTheDocument()
    expect(within(list).getAllByText("Can't").length).toBeGreaterThan(0)
  })
  it('the context column is Details, with Related records', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    const details = await screen.findByRole('complementary', { name: 'Details' })
    expect(within(details).getByRole('heading', { name: 'Related records' })).toBeInTheDocument()
  })
  it('a Brief finding is shared, and says where it went', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/t/th-brief')
    const finding = (await screen.findAllByRole('article', { name: /^Harvest Scanner: The remaining Intel/ }))[0]!
    await user.click(within(finding).getByRole('button', { name: 'Share to' }))
    await user.click(within(finding).getByRole('menuitem', { name: 'Johnson Rebalance Review' }))
    expect(await within(finding).findByText('Shared to Johnson Rebalance Review.')).toBeInTheDocument()
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/vocabulary.test.tsx --testTimeout 30000`
Expected: FAIL (no heading "Firm").

- [ ] **Step 2: The swaps**

| File | Old | New |
|---|---|---|
| `CarryControl.tsx` | button `Take to ▾`; menu `aria-label="Take to"`; `` `Taken to ${…}.` `` (line and announcement) | `Share to ▾`; `aria-label="Share to"`; `` `Shared to ${…}.` `` |
| `TakeToTeamThread.tsx` | `` aria-label={`Take ${rowLabel} to a team thread`} ``; text `Take to team thread`; `` `Taken to ${…}.` `` | `` `Share ${rowLabel} to a team thread` ``; `Share to team thread`; `` `Shared to ${…}.` `` |
| `CarriedFindingView.tsx` | `` `Carried from ${from}: …` ``; `` ` · carried by ${carrier}` `` | `` `Shared from ${from}: …` ``; `` ` · shared by ${carrier}` `` |
| `routes.tsx` | `label: 'Thread context'` | `label: 'Details'` |
| `FullViews.tsx` (four sections) and `MeetingPage.tsx` | `title="Full views"` | `title="Related records"` |
| `DriftEmbed.tsx`, `RebalanceEmbed.tsx` | `Open full view` | `Open account` |
| `DriftEmbed.tsx` | `Loading the drift reading…` | `Loading the drift…` |
| `RebalanceEmbed.tsx` | `The engine returned no rebalance preview for …` | `No rebalance preview is available for …` |
| `ThreadList.tsx`, `ThreadListSkeleton.tsx` | panes `Desk`, `Reference`; `Agents on this desk` | `Firm`, `Reports`; `Agents` |
| `AgentScope.tsx` | verbs `may`, `may not` (shown in caps by the label class) | `Can`, `Can't` |
| `people.ts` | Transfer-In may `'read her statements'`, `'set moving each holding in kind against selling it, with the gain and a tax estimate'`; Meeting Prep may `'measure the household'` | `'read the prospect's statements'`, `'weigh moving each holding in kind against selling it, with the gain and a tax estimate'`; `"measure the household's accounts"` |
| `ApprovalPanel.tsx` | `` `I reviewed every leg of v${n} and its pre-trade reading.` ``; `` aria-label={`Pre-trade reading of v${n}`} `` | `` `I reviewed every leg of v${n} and its pre-trade check results.` ``; `` `Pre-trade check results · v${n}` `` |
| `OrdersEvidence.tsx` | `<Pane title="Pre-trade reading">` | `<Pane title="Pre-trade check">` |
| `presenter.ts` | `…its legs, tax effect, pre-trade reading and repurchase restrictions…` | `…its legs, tax effect, pre-trade check results and repurchase restrictions…` |
| `CompactMessage.tsx` | `Shared the drift reading.` | `Shared the drift against the model.` |
| `meeting-prep.ts:53` | `; the readings below are of the moved book.` | `; the figures below include today's trades.` |
| `proposals-store.ts:79`, `Workbench.tsx:83` | `…a new one from the moved book.` | `…a new one from the updated holdings.` |
| `Workbench.tsx:56` | `· the engine refused the draft` | `· the draft was refused` |
| `WorkbenchSummary.tsx:15` | `Shown once the engine previews the draft.` | `Shown once the draft is previewed.` |
| `KitPage.tsx:13` | `Loading the account from the engine…` | `Loading the account…` |
| `use-kit-data.ts:29` | `The engine holds no approved compliance review for this account` | `No approved compliance review is on file for this account` |
| `KitSections.tsx:115` | `…its pre-trade reading.` | `…its pre-trade check results.` |
| `home-steps.ts` (step 2) | `Take the Intel finding to the team thread` | `Share the Intel finding to the team thread` (Task 12 rewrites the steps) |
| `home-steps.ts` (step 4 title) | `The blotter and the moved book` | `The blotter and the updated holdings` |

Keep identifiers (`CarryControl`, `TakeToTeamThread`, `carriedBy`, the `carried` message kind, `/carry` routes): the spec retires words people read, not names in code.

Update the unit tests that name the old words: `rg -n "Take to|Taken to|Carried from|carried by|Thread context|Full views|Open full view|Agents on this desk|'Desk'|'Reference'|pre-trade reading|MAY" src --glob '**/__tests__/**'`.

- [ ] **Step 3: Switch the guard on, run the tests**

In `retired-words.ts` set `retired: true` on "Take to", "carried", "Thread context", "Full views" and "MAY NOT".

Run: `pnpm vitest run src/__tests__/guardrails src/workspace src/mocks --testTimeout 30000`
Expected: PASS, `vocabulary.test.tsx` included.

- [ ] **Step 4: The stories**

`e2e-visual/workspace-steps.ts`:

```ts
export const context = (page: Page) => page.getByRole('complementary', { name: 'Details' })
```

and in `approve`, the checkbox name `` `I reviewed every leg of v${version} and its pre-trade check results.` ``. `takeFindingTo` (renamed `shareFindingTo`, with its callers):

```ts
/** A finding shared to a thread through its "Share to" menu. */
export async function shareFindingTo(finding: Locator, threadTitle: string) {
  await finding.getByRole('button', { name: 'Share to', exact: true }).click()
  await finding.getByRole('menu', { name: 'Share to' }).getByRole('menuitem', { name: threadTitle, exact: true }).click()
  await expect(finding.getByText(`Shared to ${threadTitle}.`)).toBeVisible()
}
```

`takeToTeamThread` becomes `shareToTeamThread` with `` `Share ${rowLabel} to a team thread` ``. `shell.spec.ts:157` clicks `Open account`. `reference-views.spec.ts:112` looks for the heading `Reports`. `readme-path.spec.ts` imports the renamed helpers. `rg -n "Take to|Taken|Open full view|'Reference'|Thread context" e2e-visual` must print nothing afterward.

- [ ] **Step 5: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/reference-views.spec.ts e2e-visual/kit.spec.ts e2e-visual/dialogs.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: Firm / Reports / Agents in the list; DETAILS over the context column; RELATED RECORDS; CAN and CAN'T on agent cards; **Share to ▾** on Brief findings; "Share to team thread" on reference rows. `not-found-light` and `account-full-view-light` must not move. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(copy): practice words for the system's: Share to, shared by, Details, Related records, Firm and Reports, Can and Can't

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Every act is a record; Audit trail; Audit details (critique 3; top 10 · 2, 9)

"Binding" is retired. Each act reads as a record; **Approval** and **Release** keep their names as sign-offs. Dr. Pell's acceptance reads "Proposal accepted (agreement awaiting signature)". The firm's context section is **Audit trail**. Record ids, fingerprints and UTC move into an **Audit details** disclosure on the record slip and the archive row; an outsider's slip has none.

**Files:**
- Modify: `src/workspace/thread/act-kind-label.ts`, `src/workspace/context/ActsPanel.tsx`, `src/workspace/thread/ActRecordSlip.tsx`, `src/kit/record-slip/RecordSlip.tsx`, `src/kit/__tests__/RecordSlip.test.tsx`, `src/app/pages/kit/KitSections.tsx`, `src/workspace/archive/ArchiveTable.tsx`, `src/workspace/archive/archive-filters.ts`, `src/workspace/supervision/SupervisionQueue.tsx`, `src/workspace/supervision/SupervisionPage.tsx`, `src/workspace/supervision/DispositionPanel.tsx`, `src/workspace/context/DraftsPanel.tsx`, `src/workspace/prospect/DisclosureTimeline.tsx`, `src/workspace/prospect/OnboardingChecklist.tsx`, `src/workspace/prospect/ProspectApproval.tsx`, `src/workspace/reference/ResolveBreak.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/mocks/reference/blotter.ts`, `src/mocks/reference/reconciliation.ts`, `src/__tests__/guardrails/retired-words.ts`, the unit tests that name "binding" or "Binding acts", `e2e-visual/compliance-review.spec.ts`, `e2e-visual/meeting-review.spec.ts`, `e2e-visual/rebalance-job.spec.ts`
- Create: `src/workspace/__tests__/record-slip-audit.test.tsx`

**Interfaces:**
- Consumes: `BindingAct`, `BindingActKind` (type names stay; only the words change).
- Produces: `RECORD_KIND_LABEL: Readonly<Record<BindingActKind, string>>` (replaces `ACT_KIND_LABEL`); `SIGN_OFFS: ReadonlySet<BindingActKind>`; `actWording` keeps its shape (`{ kind, title, archive, trailLabel }`); `RecordSlip` props `{ kind; title; recordedBy; at; archive; audit?: { recordId: string; fingerprint?: string }; children? }`.

- [ ] **Step 1: Failing test**

Create `src/workspace/__tests__/record-slip-audit.test.tsx`, seeding a sent message the way `thread.test.tsx` does (`createDraft` then `sendToParty` from `@/services/workspace`, as `user-001`):

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { createDraft, sendToParty } from '@/services/workspace'

const sendOne = async () => {
  const draft = await createDraft('user-001', 'th-robert', 'Your review is booked for Friday.')
  return sendToParty('user-001', draft.id)
}

describe('the record slip', () => {
  it("the firm's slip is a record, with its id, UTC and fingerprint under Audit details", async () => {
    const act = await sendOne()
    renderRoutes(routes, '/t/th-robert')
    const trail = await screen.findByRole('region', { name: 'Audit trail' })
    const slip = within(trail).getAllByRole('article')[0]!
    expect(slip).toHaveTextContent('Message sent · record')
    const audit = within(slip).getByText('Audit details').closest('details')!
    expect(audit).not.toHaveAttribute('open')
    expect(audit).toHaveTextContent(act.id)
    expect(audit).toHaveTextContent('UTC')
    expect(audit).toHaveTextContent(act.fingerprint)
  })
  it("an outsider's slip has no Audit details", async () => {
    const act = await sendOne()
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/t/th-robert')
    const records = await screen.findByRole('region', { name: 'Records' })
    expect(records).not.toHaveTextContent('Audit details')
    expect(records).not.toHaveTextContent(act.id)
    expect(records).not.toHaveTextContent(act.fingerprint)
    expect(records).not.toHaveTextContent('UTC')
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/record-slip-audit.test.tsx --testTimeout 30000`
Expected: FAIL (no region "Audit trail").

- [ ] **Step 2: The words of a record**

`src/workspace/thread/act-kind-label.ts`:

```ts
export const RECORD_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approval',
  withdraw_approval: 'Approval withdrawn',
  send_to_party: 'Message sent',
  deliver_disclosure: 'Disclosure delivered',
  accept_proposal: 'Proposal accepted (agreement awaiting signature)',
  file_meeting_record: 'Meeting record filed',
  resolve_break: 'Break resolved',
  release_orders: 'Release',
  return_to_advisor: 'Returned to advisor',
  escalate: 'Escalated',
  dispose_alert: 'Alert closed',
  review_correspondence: 'Correspondence reviewed',
}

/** The two sign-offs: the advisor's approval and compliance's release. Everything else is a record. */
export const SIGN_OFFS: ReadonlySet<BindingActKind> = new Set<BindingActKind>(['approve_proposal', 'release_orders'])

export function actWording(act: BindingAct, actor: Person, forParty: boolean): ActWording {
  if (!forParty) {
    const label = RECORD_KIND_LABEL[act.kind]
    return { kind: `${label} · ${SIGN_OFFS.has(act.kind) ? 'sign-off' : 'record'}`, title: act.summary, archive: 'Supervisory review', trailLabel: label }
  }
  // …the outsider's cases as before, except accept_proposal's title: 'You accepted the proposal (agreement awaiting signature)'
}
```

`archive-filters.ts` and `SupervisionQueue.tsx` import `RECORD_KIND_LABEL` in place of `ACT_KIND_LABEL`.

- [ ] **Step 3: The slip and its Audit details**

`src/kit/record-slip/RecordSlip.tsx`:

```tsx
type RecordSlipProps = {
  kind: string; title: string; recordedBy: { name: string; role: string }; at: string; archive: string
  /** The books-and-records detail: shown to the firm, folded; an outsider's slip is given none. */
  audit?: { recordId: string; fingerprint?: string }
  children?: ReactNode
}

export function RecordSlip({ kind, title, recordedBy, at, archive, audit, children }: RecordSlipProps) {
  const titleId = useId()
  return (
    <article aria-labelledby={titleId} className="border border-dashed border-ink-2 bg-face p-4">
      <span className="text-label uppercase text-ink-2">{kind}</span>
      <h3 id={titleId} className="mt-1 text-body font-semibold">{title}</h3>
      {children ? <div className="mt-2 text-body">{children}</div> : null}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-2 text-label">
        <dt className="tracking-normal text-ink-3">Recorded by</dt><dd className="normal-case">{`${recordedBy.name}, ${recordedBy.role}`}</dd>
        <dt className="tracking-normal text-ink-3">At</dt><dd className="tabular normal-case">{fmtEasternStamp(at)}</dd>
        <dt className="tracking-normal text-ink-3">Archive</dt><dd className="normal-case">{archive}</dd>
      </dl>
      {audit ? (
        <details className="mt-2">
          <summary className="min-h-6 cursor-pointer text-label text-ink-3 coarse:min-h-11">Audit details</summary>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label">
            <dt className="tracking-normal text-ink-3">Record ID</dt><dd className="tabular normal-case">{audit.recordId}</dd>
            <dt className="tracking-normal text-ink-3">UTC</dt><dd className="tabular normal-case">{fmtUtcStamp(at)}</dd>
            {audit.fingerprint ? <><dt className="tracking-normal text-ink-3">Fingerprint</dt><dd className="tabular normal-case">{audit.fingerprint}</dd></> : null}
          </dl>
        </details>
      ) : null}
    </article>
  )
}
```

`ActRecordSlip.tsx` passes `audit={viewerIsExternal ? undefined : { recordId: act.id, fingerprint: act.fingerprint }}`. `KitSections.tsx` passes `audit={{ recordId: record.id }}`. Rewrite `RecordSlip.test.tsx` to the new props: the kind line, Audit details folded with the record id, UTC and fingerprint inside, and no Audit details when `audit` is absent.

`ActsPanel.tsx`: `title={viewerIsExternal ? 'Records' : 'Audit trail'}`.

- [ ] **Step 4: The archive row**

`src/workspace/archive/ArchiveTable.tsx`: the Fingerprint column goes; the Summary cell becomes

```tsx
function Summary({ entry }: { entry: ArchiveEntry }) {
  const recordId = entry.kind === 'act' ? entry.act.id : entry.actId
  const fingerprint = entry.kind === 'act' ? entry.act.fingerprint : entry.fingerprint
  const text = entry.kind === 'act' ? entry.act.summary : `Message to ${entry.partyName}`
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span>{text}</span>
      <details>
        <summary className={`${TABLE_HIT_AREA} cursor-pointer text-label text-ink-3`}>Audit details</summary>
        <span className="tabular text-label text-ink-2">{`Record ${recordId} · fingerprint ${fingerprint}`}</span>
      </details>
    </span>
  )
}
```

(import `TABLE_HIT_AREA` from `@/kit/link-target`). Update `archive.test.tsx` to read the summary text and the folded record id.

- [ ] **Step 5: Every other "binding"**

| File | New text |
|---|---|
| `DraftsPanel.tsx:119` | `'Sending is recorded under your name.'` / `'Only the advisor of record can send this. Sending is recorded.'` |
| `DisclosureTimeline.tsx:41` | `"Delivery is recorded: the record names you, the document and the time, and she sees it in her thread."` |
| `OnboardingChecklist.tsx:43` | `"Delivery is recorded: the record names you, the document and the time."` |
| `ProspectApproval.tsx:52` | `"Approval is a recorded sign-off; the best-interest record is filed with it, firm only."` |
| `ResolveBreak.tsx:32` | `…. Recorded in the Archive.` |
| `DispositionPanel.tsx:52` | `"Recorded in your name, with this rationale."` |
| `SupervisionPage.tsx:52` | `'Staged orders wait here: nothing executes until compliance releases them. Each disposition is recorded with your rationale.'` (also fixes "it" → "them") |
| `CompactMessage.tsx:19` | `` `Recorded · …` `` in place of `` `Binding act recorded · …` `` |
| `blotter.ts:95` | `'REC is the record that closed the order (the release, the return or the withdrawal) or, while it waits, the approval it was staged from.'` |
| `reconciliation.ts:149` | `'Resolving a break is recorded by the advisor or client service in the Archive, with its rationale. Nothing edits or deletes it.'` |

Set `retired: true` on "binding" in `retired-words.ts`. Update the unit tests: `rg -n -i "binding|Binding acts|Send to client or prospect · binding|Accept proposal" src --glob '**/__tests__/**'` (for example `thread.test.tsx:182` → `'Message sent · record'`, `context.test.tsx:88` → section `'Audit trail'`).

Run: `pnpm vitest run src/__tests__/guardrails src/workspace src/kit src/mocks --testTimeout 30000`
Expected: PASS, `record-slip-audit.test.tsx` included.

- [ ] **Step 6: The stories**

- `compliance-review.spec.ts:34`: `toContainText('Released the orders staged from v1 of the Johnson rebalance')`.
- `meeting-review.spec.ts:239`, Robert's own last item: `await expect(conversation(page).getByRole('listitem').last()).not.toContainText(/REC-\d{4}|fingerprint|UTC|Audit details/)`; the `firmRecord` regex check beside it stays.
- `rebalance-job.spec.ts:190`: the comment and the check say Robert's slip carries no fingerprint (`not.toContainText(/fingerprint|REC-\d{4}/)` on his slip).
- Any story that read a record id off a slip's corner (`rg -n "Record ID|REC-" e2e-visual`) opens Audit details first (`slip.getByText('Audit details').click()`) or reads the id from the line that still states it ("Filed · REC-…", "Resolved · REC-…").

- [ ] **Step 7: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/kit.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: AUDIT TRAIL heads the record section; slips read "APPROVAL · SIGN-OFF", "MESSAGE SENT · RECORD", "PROPOSAL ACCEPTED (AGREEMENT AWAITING SIGNATURE) · RECORD", with "Audit details" folded under each firm slip and none on Robert's or Dr. Pell's; the archive has no Fingerprint column. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(records): binding retired; every act a record, approval and release the sign-offs; ids, UTC and fingerprints under Audit details, never for outsiders

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The suitability check (critique 4; top 10 · 4)

A new pre-trade check kind, `model_above_tolerance`, fires when a proposal's target model sits in a riskier band than the client's tolerance. It is a warning, never a block. The proposal's pre-trade results carry it, the Pre-trade Check agent reports it in a digit-free claim, and the Drift Monitor puts it in the Brief's Needs a decision.

**Files:**
- Create: `src/mocks/workspace/suitability.ts`, `src/mocks/workspace/__tests__/suitability.test.ts`
- Modify: `src/services/oms.ts` (`ProposalConstraint`, `ProposalViolation`), `src/mocks/workspace/proposal-engine.ts:220`, `src/mocks/agents/pretrade-check.ts`, `src/mocks/agents/drift-monitor.ts`, `src/mocks/agents/brief-topic.ts`, `src/mocks/workspace/brief-groups.ts`, `src/types/workspace.ts` (`BriefItem`), `src/mocks/agents/__tests__/agents.test.ts`, `src/mocks/workspace/__tests__/brief-groups.test.ts`, `src/mocks/workspace/__tests__/brief.test.ts`, `src/workspace/__tests__/brief-thread.test.tsx`, `e2e-visual/rebalance-job.spec.ts`

**Interfaces:**
- Consumes: `bandFor`, `RISK_PROFILE_TABLE`, `ProfileBand` (`src/lib/risk-profile.ts`); `riskScoreOf` (`src/mocks/reference/risk-score.ts`); `modelVolatility` (`src/mocks/reference/models.ts`); `modelDisplayName` (`src/mocks/handlers/pms.ts`); `GLIDE_PATH_MODELS` (`src/mocks/data/model-governance.ts`); `fmtPoints` (`src/kit/measure.ts`).
- Produces:
  - `ToleranceGap = { modelName: string; modelBand: ProfileBand; modelScore: number; clientName: string; tolerance: ProfileBand }`; `modelAboveTolerance(account: Account): ToleranceGap | undefined`; `toleranceViolation(gap: ToleranceGap): ProposalViolation`; `withSuitability(result: PreTradeCheckProposalResult, account: Account): PreTradeCheckProposalResult`; `needsSuitabilityReason(pretrade: PreTradeCheckProposalResult): boolean`.
  - `ProposalConstraint` gains `'model_above_tolerance'`; `ProposalViolation` gains `tolerance?: { modelName: string; modelBand: string; modelScore: number; clientName: string; toleranceBand: string; floor: number; ceiling: number }`.
  - `BriefTopic` gains `{ kind: 'model_above_tolerance'; accountId: string; model: string; clientName: string; tolerance: string }`; `BriefItem` gains `awaitsApprovalOf?: string` (an account id; Task 8 reads it).

- [ ] **Step 1: Failing test**

Create `src/mocks/workspace/__tests__/suitability.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { isModelManaged } from '@/lib/mandate'
import { GLIDE_PATH_MODELS } from '@/mocks/data/model-governance'
import { modelAboveTolerance, needsSuitabilityReason, withSuitability } from '../suitability'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'

const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}

describe('model above tolerance', () => {
  beforeEach(() => resetWorkspaceStore())

  it("Growth sits above Robert Johnson's Moderate tolerance", () => {
    const gap = modelAboveTolerance(account('acc-002'))
    expect(gap).toMatchObject({ modelName: 'Growth', clientName: 'Robert Johnson' })
    expect(gap?.modelBand.label).toBe('Moderate Aggressive')
    expect(gap?.tolerance.label).toBe('Moderate')
  })

  it('every Johnson version carries it as a warning on no leg, and nothing blocks because of it', () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    const check = v1.pretrade.violations.find((v) => v.category === 'model_above_tolerance')
    expect(check).toMatchObject({ severity: 'warning', legs: [], tolerance: { modelName: 'Growth', clientName: 'Robert Johnson', toleranceBand: 'Moderate' } })
    expect(check?.message).toMatch(/^Growth sits above Robert Johnson's Moderate tolerance/)
    expect(needsSuitabilityReason(v1.pretrade)).toBe(true)
    const others = v1.pretrade.violations.filter((v) => v.category !== 'model_above_tolerance')
    expect(v1.pretrade.passed).toBe(others.every((v) => v.severity !== 'block'))
  })

  it('a model within the tolerance adds nothing', () => {
    const within = accounts.filter(isModelManaged).find((a) => !GLIDE_PATH_MODELS.has(a.modelId) && modelAboveTolerance(a) === undefined)
    if (!within) throw new Error('the book has no account inside its tolerance')
    const empty = { accountId: within.id, passed: true, violations: [], legs: [], projectedCash: 0, projectedCashPct: 0, minimumCash: 0 }
    expect(withSuitability(empty, within)).toEqual(empty)
  })

  it('a glide path and a custom mandate are never measured against the tolerance', () => {
    for (const a of accounts.filter((x) => !isModelManaged(x) || GLIDE_PATH_MODELS.has(x.modelId))) expect(modelAboveTolerance(a), a.id).toBeUndefined()
  })
})
```

(If `isModelManaged` lives elsewhere than `src/lib/mandate`, import it from where `src/mocks/workspace/__tests__/proposals.test.ts` imports it.)

Run: `pnpm vitest run src/mocks/workspace/__tests__/suitability.test.ts --testTimeout 30000`
Expected: FAIL with the missing module.

- [ ] **Step 2: The check**

In `src/services/oms.ts`, add `| 'model_above_tolerance'` to `ProposalConstraint`, and to `ProposalViolation`:

```ts
  /** The model-above-tolerance check: the model and the client's tolerance it was measured against. */
  tolerance?: { modelName: string; modelBand: string; modelScore: number; clientName: string; toleranceBand: string; floor: number; ceiling: number }
```

Create `src/mocks/workspace/suitability.ts`:

```ts
import type { Account } from '@/types/account'
import type { PreTradeCheckProposalResult, ProposalViolation } from '@/services/oms'
import { clients } from '@/mocks/data/clients'
import { GLIDE_PATH_MODELS } from '@/mocks/data/model-governance'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { modelVolatility } from '@/mocks/reference/models'
import { riskScoreOf } from '@/mocks/reference/risk-score'
import { RISK_PROFILE_TABLE, bandFor, type ProfileBand } from '@/lib/risk-profile'
import { fmtPoints } from '@/kit/measure'

export type ToleranceGap = { modelName: string; modelBand: ProfileBand; modelScore: number; clientName: string; tolerance: ProfileBand }

const rankOf = (band: ProfileBand) => RISK_PROFILE_TABLE.findIndex((b) => b.profile === band.profile)

/**
 * Whether the account's model sits in a riskier band than its client's tolerance. The model's band is its σ on the
 * questionnaire's scale (`riskScoreOf`), read through the same table as the client's score. A glide path changes its
 * mix by design and a custom mandate has no model, so neither is measured.
 */
export function modelAboveTolerance(account: Account): ToleranceGap | undefined {
  if (account.mandate !== 'model' || GLIDE_PATH_MODELS.has(account.modelId)) return undefined
  const client = clients.find((c) => c.id === account.clientId)
  if (!client) throw new Error(`${account.id} names no client`)
  const modelScore = riskScoreOf(modelVolatility(account.modelId))
  const modelBand = bandFor(modelScore)
  const tolerance = bandFor(client.riskProfile.score)
  if (rankOf(modelBand) <= rankOf(tolerance)) return undefined
  return { modelName: modelDisplayName(account.modelId), modelBand, modelScore, clientName: client.fullName, tolerance }
}

export function toleranceViolation(gap: ToleranceGap): ProposalViolation {
  const pts = (n: number) => `${fmtPoints(n)} pts`
  return {
    category: 'model_above_tolerance',
    constraint: "Model above the client's risk tolerance",
    severity: 'warning',
    currentValue: `${gap.modelBand.label}, ${pts(gap.modelScore)}`,
    limit: `${gap.tolerance.label}, ${fmtPoints(gap.tolerance.floor)}–${pts(gap.tolerance.ceiling)}`,
    message: `${gap.modelName} sits above ${gap.clientName}'s ${gap.tolerance.label} tolerance: the model scores ${pts(gap.modelScore)} against a ${gap.tolerance.label} band of ${fmtPoints(gap.tolerance.floor)}–${pts(gap.tolerance.ceiling)}. Approving it needs a suitability reason.`,
    legs: [],
    preExisting: true,
    tolerance: {
      modelName: gap.modelName, modelBand: gap.modelBand.label, modelScore: gap.modelScore, clientName: gap.clientName,
      toleranceBand: gap.tolerance.label, floor: gap.tolerance.floor, ceiling: gap.tolerance.ceiling,
    },
  }
}

/** A proposal's pre-trade results with the tolerance check added. `evaluateProposal` itself, shared with the trade ticket, is untouched. */
export function withSuitability(result: PreTradeCheckProposalResult, account: Account): PreTradeCheckProposalResult {
  const gap = modelAboveTolerance(account)
  return gap ? { ...result, violations: [...result.violations, toleranceViolation(gap)] } : result
}

export const needsSuitabilityReason = (pretrade: PreTradeCheckProposalResult): boolean =>
  pretrade.violations.some((v) => v.category === 'model_above_tolerance')
```

In `src/mocks/workspace/proposal-engine.ts` at the `evaluateProposal` call (line 220), after the existing `if (!pretrade) throw …`, use `withSuitability(pretrade, account)` for the version's `pretrade` (the account record is the one `requireModelManaged(account)` already reads in that function).

If importing `@/mocks/reference/models` from here creates an import cycle (vitest reports "Cannot access … before initialization"), move `modelAboveTolerance` and `ToleranceGap` into `src/mocks/reference/suitability-gap.ts` beside `risk-score.ts` and import them from there; no dynamic import, and the interface does not change.

Run: `pnpm vitest run src/mocks/workspace/__tests__/suitability.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 3: The Pre-trade Check agent reports it**

In `src/mocks/agents/pretrade-check.ts`: `const result = …evaluateProposal(…)`; after the `if (!result)` line, `const checked = withSuitability(result, account)` and use `checked` below. `describe` gains the case:

```ts
    case 'model_above_tolerance': {
      const t = v.tolerance
      if (!t) throw new Error('A model_above_tolerance violation carries no tolerance facts')
      return { who: hasDigit(t.modelName) ? 'The model' : t.modelName, label: t.modelName, phrase: `sits above ${t.clientName}'s ${t.toleranceBand} tolerance` }
    }
```

(with `const hasDigit = (text: string) => /\d/.test(text)` at the top, as `claim-name.ts` has it), and its figures, in the `figures` branch:

```ts
    if (v.category === 'model_above_tolerance' && v.tolerance) {
      figures.push({ label: `${v.tolerance.modelName} risk score`, value: v.tolerance.modelScore, unit: 'pts', source: 'riskScoreOf(modelVolatility)' })
      figures.push({ label: `${v.tolerance.clientName}'s tolerance ceiling`, value: v.tolerance.ceiling, unit: 'pts', source: 'clients.riskProfile.score · RISK_PROFILE_TABLE' })
    }
```

(the existing weight figures are skipped for this category). The claim is `Warning: Growth sits above Robert Johnson's Moderate tolerance.`

Add to `src/mocks/agents/__tests__/agents.test.ts`:

```ts
it("Pre-trade Check reports Growth above Robert Johnson's Moderate tolerance, digit-free, with both scores as figures", () => {
  const findings = runPretradeCheck({ asOf: MOCK_NOW_ISO, subject: { type: 'account', id: 'acc-002' } })
  const gap = findings.find((f) => f.claim === "Warning: Growth sits above Robert Johnson's Moderate tolerance.")
  expect(gap?.figures.map((f) => [f.label, f.unit])).toEqual([['Growth risk score', 'pts'], ["Robert Johnson's tolerance ceiling", 'pts']])
  expect(gap?.claim).not.toMatch(/\d/)
})
```

(import `runPretradeCheck` and `MOCK_NOW_ISO` if the file does not already).

- [ ] **Step 4: The Brief's Needs a decision**

`src/mocks/agents/brief-topic.ts` adds `| { kind: 'model_above_tolerance'; accountId: string; model: string; clientName: string; tolerance: string }`.

`src/mocks/agents/drift-monitor.ts`, after the first finding is built and before `offModel`:

```ts
  const gap = modelAboveTolerance(account)
  if (gap) {
    const model = /\d/.test(gap.modelName) ? 'The model' : gap.modelName
    findings.push({
      claim: `${model} sits above ${gap.clientName}'s ${gap.tolerance.label} tolerance; a rebalance to it needs a recorded suitability reason.`,
      attention: 'attention',
      citations: [{ source: `Risk tolerance · ${gap.clientName}'s questionnaire against ${gap.modelName}'s risk score`, asOf }],
      topic: { kind: 'model_above_tolerance', accountId: account.id, model, clientName: gap.clientName, tolerance: gap.tolerance.label },
      figures: [
        { label: `${gap.modelName} risk score`, value: gap.modelScore, unit: 'pts', source: 'riskScoreOf(modelVolatility)' },
        { label: `${gap.clientName}'s tolerance ceiling`, value: gap.tolerance.ceiling, unit: 'pts', source: 'clients.riskProfile.score · RISK_PROFILE_TABLE' },
      ],
    })
  }
```

`src/types/workspace.ts`: `BriefItem` gains `/** Engine: the account whose approved proposal settles this item (Task 8 moves it to Context then). */ awaitsApprovalOf?: string`.

`src/mocks/workspace/brief-groups.ts`:
- `briefGroupOf`: `topic.kind === 'out_of_band' || topic.kind === 'harvest_allowed' || topic.kind === 'model_above_tolerance' ? 'decide' : 'context'`.
- `KEY_FIGURE` adds `'model_above_tolerance'`.
- `briefLine` adds `case 'model_above_tolerance': return \`${topic.model} sits above ${topic.clientName}'s ${topic.tolerance} tolerance\``.
- In `briefItems`, the item spreads `...(finding.topic.kind === 'model_above_tolerance' ? { awaitsApprovalOf: finding.topic.accountId } : {})`.

Add to `src/mocks/workspace/__tests__/brief-groups.test.ts` (and fix the counts its existing cases assert):

```ts
it("the morning's Needs a decision: the drift, then Growth above Robert's tolerance, then Intel", () => {
  const summary = briefMessages().find((m) => m.kind === 'brief_summary')
  if (summary?.kind !== 'brief_summary') throw new Error('no summary')
  expect(summary.decide.map((i) => i.title ?? i.readings[0]!.line)).toEqual([
    'US Equity is outside its tolerance band', "Growth sits above Robert Johnson's Moderate tolerance", 'Intel Corp.',
  ])
  expect(summary.decide[1]).toMatchObject({ awaitsApprovalOf: 'acc-002' })
})
```

(If the asset-class or security wording differs from the current Brief, take the exact strings from `brief-thread.test.tsx`; the point is the order and the new middle line.)

- [ ] **Step 5: Run the engine and UI tests**

Run: `pnpm vitest run src/mocks src/workspace --testTimeout 30000`
Expected: PASS after updating the tests that count the Brief's decide items, the Drift Monitor's findings on acc-002, or a version's violations (`rg -n "decide\)\.toHaveLength|decide.length|violations\)\.toHaveLength" src --glob '**/__tests__/**'`). Each change to an expectation is the new finding or the new warning, nothing else.

- [ ] **Step 6: Stories, baselines, every check, commit**

`e2e-visual/rebalance-job.spec.ts:109` still expects the first decision to be the drift; add `await expect(page.getByRole('region', { name: 'Needs a decision' })).toContainText("Growth sits above Robert Johnson's Moderate tolerance")` beside it.

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the Brief's Needs a decision is three items, the second "Growth sits above Robert Johnson's Moderate tolerance" with its score figure and OUT; the proposal's pre-trade list has the WARN line; the workbench's pre-trade notes too; Mark's orders evidence lists it. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(suitability): a pre-trade warning when the model sits above the client's tolerance; the agents and the Brief say so

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The approval reason, recorded everywhere (critique 4; top 10 · 4)

When the check is present, approving needs a suitability reason chosen from three, with an optional note. The engine refuses an approval without one. The reason is recorded on the approval act and the approval record, shown on the slip, in the archive row and in Mark's evidence, and it settles the Brief's line.

**Files:**
- Create: `src/lib/suitability.ts`, `src/test/suitability-fixture.ts`, `src/mocks/workspace/__tests__/brief-suitability.test.ts`
- Modify: `src/types/workspace.ts` (`BindingAct.suitability`), `src/types/workspace-proposal.ts` (`ApprovalRecord.suitability`), `src/mocks/workspace/proposal-acts.ts`, `src/mocks/handlers/workspace.ts`, `src/services/workspace.ts`, `src/hooks/use-workspace.ts`, `src/mocks/workspace/suitability.ts`, `src/mocks/workspace/brief-groups.ts`, `src/workspace/context/ApprovalPanel.tsx`, `src/workspace/context/approve-blocker.ts`, `src/workspace/thread/act-provenance.ts`, `src/workspace/archive/ArchiveTable.tsx`, `src/workspace/supervision/OrdersEvidence.tsx`, `src/mocks/workspace/__tests__/proposal-acts.test.ts`, `src/mocks/workspace/__tests__/prospect-proposals.test.ts`, `src/workspace/__tests__/approval.test.tsx`, `src/workspace/__tests__/approve-blocker.test.ts`, every test that approves a Johnson version (Step 6), `e2e-visual/workspace-steps.ts`

**Interfaces:**
- Consumes: Task 7's `needsSuitabilityReason`, `BriefItem.awaitsApprovalOf`; `Select`, `TextInput` (kit).
- Produces:
  - `src/lib/suitability.ts`: `SUITABILITY_REASONS`, `SuitabilityReasonId`, `SuitabilityReason = { reason: SuitabilityReasonId; note?: string }`, `SUITABILITY_NOTE_MAX = 500`, `isSuitabilityReasonId(v: unknown): v is SuitabilityReasonId`, `suitabilityLine(s: SuitabilityReason): string`.
  - `approveProposal(viewerId, proposalId, version, fingerprint, suitability?: SuitabilityReason)` (engine and service); `useApproveProposal` variables gain `suitability?: SuitabilityReason`.
  - `suitablyApprovedAccounts(): ReadonlySet<string>` (`suitability.ts`); `settleApproved(summary: BriefSummary, approved: ReadonlySet<string>): BriefSummary` (`brief-groups.ts`, `BriefSummary = Extract<Message, { kind: 'brief_summary' }>`).
  - `approveBlocker({ blocked, hasLegs, attested, reasonMissing })`.
  - Test fixtures: `JOHNSON_REASON: SuitabilityReason`, `reasonFor(version: Pick<ProposalVersion, 'pretrade'>): SuitabilityReason | undefined`.

- [ ] **Step 1: The reasons**

Create `src/lib/suitability.ts`:

```ts
/** Why an advisor approves a model above the client's tolerance. One is chosen; a note may add to it. Shared by the engine and the UI. */
export const SUITABILITY_REASONS = [
  { id: 'ips_permits_growth', label: 'The IPS permits a growth allocation for this account' },
  { id: 'client_acknowledged_risk', label: 'Client acknowledged the higher risk in writing' },
  { id: 'household_within_tolerance', label: 'Part of a household plan that is within tolerance overall' },
] as const

export type SuitabilityReasonId = (typeof SUITABILITY_REASONS)[number]['id']
export type SuitabilityReason = { reason: SuitabilityReasonId; note?: string }
export const SUITABILITY_NOTE_MAX = 500

export const isSuitabilityReasonId = (v: unknown): v is SuitabilityReasonId => SUITABILITY_REASONS.some((r) => r.id === v)

/** The reason as the record states it: "Suitability reason · <reason>[ · <note>]". */
export function suitabilityLine({ reason, note }: SuitabilityReason): string {
  const found = SUITABILITY_REASONS.find((r) => r.id === reason)
  if (!found) throw new Error(`No suitability reason "${reason}"`)
  return `Suitability reason · ${found.label}${note ? ` · ${note}` : ''}`
}
```

Create `src/test/suitability-fixture.ts`:

```ts
import type { SuitabilityReason } from '@/lib/suitability'
import type { ProposalVersion } from '@/types/workspace-proposal'

export const JOHNSON_REASON: SuitabilityReason = { reason: 'ips_permits_growth' }

/** The reason a test's approval needs: one when the version carries the tolerance check, none otherwise. */
export const reasonFor = (version: Pick<ProposalVersion, 'pretrade'>): SuitabilityReason | undefined =>
  version.pretrade.violations.some((v) => v.category === 'model_above_tolerance') ? JOHNSON_REASON : undefined
```

`BindingAct` gains `/** Why the advisor approved a model above the client's tolerance. */ suitability?: SuitabilityReason`; `ApprovalRecord` gains `suitability?: SuitabilityReason` (both `import type` from `@/lib/suitability`).

- [ ] **Step 2: The engine refuses, then records; failing tests**

Add to `src/mocks/workspace/__tests__/proposal-acts.test.ts`:

```ts
describe('the suitability reason', () => {
  beforeEach(() => resetWorkspaceStore())

  it('refuses an approval without a reason while the model sits above the tolerance', () => {
    const p = seedJohnsonProposal()
    expect(approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint))
      .toMatchObject({ ok: false, status: 409, code: 'REASON_REQUIRED' })
    expect(store().acts).toHaveLength(0)
  })
  it('records the reason and its note on the act and the approval record', () => {
    const p = seedJohnsonProposal()
    const r = approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, { reason: 'client_acknowledged_risk', note: 'Signed 12 Feb.' })
    if (!r.ok) throw new Error(r.message)
    expect(r.act.suitability).toEqual({ reason: 'client_acknowledged_risk', note: 'Signed 12 Feb.' })
    expect(store().approvals[0]!.suitability).toEqual({ reason: 'client_acknowledged_risk', note: 'Signed 12 Feb.' })
  })
  it('refuses an over-long note', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-001', p.id, 1, fp, { reason: 'ips_permits_growth', note: 'x'.repeat(501) })).toMatchObject({ ok: false, status: 400, code: 'BAD_NOTE' })
  })
  it('refuses a reason for a version inside the tolerance', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    // The same stored version without the check, as a model inside the tolerance would be; its fingerprint is unchanged.
    v1.pretrade = { ...v1.pretrade, violations: v1.pretrade.violations.filter((v) => v.category !== 'model_above_tolerance') }
    expect(approveProposal('user-001', p.id, 1, v1.fingerprint, { reason: 'ips_permits_growth' })).toMatchObject({ ok: false, status: 409, code: 'NO_SUITABILITY_GAP' })
  })
})
```

and, in `src/mocks/workspace/__tests__/prospect-proposals.test.ts`, the pin for the best-interest record:

```ts
it("a prospect proposal's model is her band's own model, so the tolerance check never applies to it", () => {
  // build v1 the way this file's other cases do, then:
  expect(bandFor(riskScoreOf(modelVolatility(v1.modelId))).profile).toBe(bandFor(v1.score).profile)
})
```

(imports: `bandFor` from `@/lib/risk-profile`, `riskScoreOf` from `@/mocks/reference/risk-score`, `modelVolatility` from `@/mocks/reference/models`.) The handler's 400 for an unknown reason id is tested in Step 4.

Run: `pnpm vitest run src/mocks/workspace/__tests__/proposal-acts.test.ts --testTimeout 30000`
Expected: FAIL: the first new case approves (no refusal yet).

- [ ] **Step 3: The engine**

`src/mocks/workspace/proposal-acts.ts` `approveProposal(viewerId, proposalId, version, fingerprint, suitability?: SuitabilityReason)`, after the `BLOCKED` and `NO_LEGS` checks:

```ts
  const needsReason = needsSuitabilityReason(v.pretrade)
  if (needsReason && !suitability) {
    return { ok: false, status: 409, code: 'REASON_REQUIRED', message: `v${version} puts the account on a model above the client's tolerance; choose a suitability reason to approve it.` }
  }
  if (!needsReason && suitability) {
    return { ok: false, status: 409, code: 'NO_SUITABILITY_GAP', message: `v${version} sits within the client's tolerance; there is no suitability reason to record.` }
  }
  if (suitability?.note !== undefined && (suitability.note.trim() === '' || suitability.note.length > SUITABILITY_NOTE_MAX)) {
    return { ok: false, status: 400, code: 'BAD_NOTE', message: `Write the note in 1 to ${SUITABILITY_NOTE_MAX} characters, or leave it out.` }
  }
```

`ActFailure['status']` gains `400` if it lacks it. The act and the approval record both spread `...(suitability ? { suitability } : {})`.

Extend the first new case (the refusal): after it, `expect(approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, { reason: 'ips_permits_growth' }).ok).toBe(true)`, so a refusal leaves nothing in the way.

Run: `pnpm vitest run src/mocks/workspace/__tests__/proposal-acts.test.ts --testTimeout 30000`
Expected: the three new cases PASS; the file's older cases now fail with `REASON_REQUIRED`: pass `JOHNSON_REASON` in each (Step 6 lists the rest of the suite).

- [ ] **Step 4: The API, the service, the hook**

`src/mocks/handlers/workspace.ts`, the account-proposal branch of `approve_proposal`:

```ts
        const suitability = parseSuitability(body.suitability)
        if (!suitability.ok) return badRequest(suitability.message)
        const r = approveProposal(viewer, body.proposalId, body.version, body.fingerprint, suitability.value)
```

with, in the same file:

```ts
function parseSuitability(value: unknown): { ok: true; value?: SuitabilityReason } | { ok: false; message: string } {
  if (value === undefined) return { ok: true }
  if (typeof value !== 'object' || value === null) return { ok: false, message: 'suitability must be an object.' }
  const { reason, note } = value as Record<string, unknown>
  if (!isSuitabilityReasonId(reason)) return { ok: false, message: 'suitability.reason must be one of the listed reasons.' }
  if (note !== undefined && typeof note !== 'string') return { ok: false, message: 'suitability.note must be text.' }
  return { ok: true, value: { reason, ...(note !== undefined ? { note } : {}) } }
}
```

Add a handler case to the file's existing handler tests (where `approve_proposal` is posted): an unknown `reason` answers 400.

`src/services/workspace.ts`:

```ts
export const approveProposal = (viewer: string, proposalId: string, version: number, fingerprint: string, suitability?: SuitabilityReason) =>
  post<BindingAct>('/workspace/acts', { kind: 'approve_proposal', proposalId, version, fingerprint, ...(suitability ? { suitability } : {}) }, as(viewer))
```

`useApproveProposal`: variables `{ proposalId; version; fingerprint; suitability?: SuitabilityReason }`, passed through.

- [ ] **Step 5: The approval panel; failing UI tests first**

Add to `src/workspace/__tests__/approval.test.tsx` (its existing setup asks the Proposal Agent for v1 on `/t/th-johnson-review`):

```tsx
async function openV1() {
  const user = userEvent.setup()
  renderRoutes(routes, '/t/th-johnson-review')
  await user.click(await screen.findByRole('button', { name: 'Ask Proposal Agent' }))
  const panel = await screen.findByRole('region', { name: 'Approval · Johnson rebalance' })
  await within(panel).findByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' })
  return { user, panel }
}

it('asks for a suitability reason, then records it', async () => {
  const { user, panel } = await openV1()
  await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' }))
  expect(within(panel).getByRole('button', { name: 'Approve v1' })).toBeDisabled()
  expect(within(panel).getByText('Choose a suitability reason above to approve.')).toBeInTheDocument()
  await user.selectOptions(within(panel).getByLabelText('Suitability reason'), 'The IPS permits a growth allocation for this account')
  await user.type(within(panel).getByRole('textbox', { name: 'Note (optional)' }), 'IPS section 4.')
  await user.click(within(panel).getByRole('button', { name: 'Approve v1' }))
  const slip = await screen.findByRole('article', { name: /^Approved v1 of the Johnson rebalance/ })
  expect(slip).toHaveTextContent('Suitability reason · The IPS permits a growth allocation for this account · IPS section 4.')
})

it('a new version clears the chosen reason and the note', async () => {
  const { user, panel } = await openV1()
  await user.selectOptions(within(panel).getByLabelText('Suitability reason'), 'Client acknowledged the higher risk in writing')
  await user.type(within(panel).getByRole('textbox', { name: 'Note (optional)' }), 'Signed 12 Feb.')
  const embed = screen.getByRole('region', { name: 'Proposal · Johnson rebalance' })
  await user.click(within(embed).getByRole('button', { name: 'Revise' }))
  const revise = await screen.findByRole('dialog', { name: 'Revise the proposal' })
  await user.click(within(revise).getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }))
  await user.click(within(revise).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
  await within(panel).findByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade check results.' })
  expect(within(panel).getByLabelText('Suitability reason')).toHaveValue('')
  expect(within(panel).getByRole('textbox', { name: 'Note (optional)' })).toHaveValue('')
})
```

`approve-blocker.test.ts` gains `approveBlocker({ blocked: false, hasLegs: true, attested: true, reasonMissing: true })` → `'Choose a suitability reason above to approve.'`, and its other cases pass `reasonMissing: false`.

Run: `pnpm vitest run src/workspace/__tests__/approval.test.tsx src/workspace/__tests__/approve-blocker.test.ts --testTimeout 30000`
Expected: FAIL (no "Suitability reason" field).

`approve-blocker.ts`:

```ts
export function approveBlocker({ blocked, hasLegs, attested, reasonMissing }: { blocked: boolean; hasLegs: boolean; attested: boolean; reasonMissing: boolean }): string | undefined {
  if (blocked) return 'The pre-trade check blocks this version, so it cannot be approved.'
  if (!hasLegs) return 'This version has no legs to approve.'
  if (!attested) return 'Confirm your review above to approve.'
  if (reasonMissing) return 'Choose a suitability reason above to approve.'
  return undefined
}
```

`ApprovalPanel.tsx`, in `ProposalApproval`: a reason that belongs to one version, like the tick:

```tsx
  const [chosenReason, setChosenReason] = useState<{ version: number; reason: SuitabilityReasonId | ''; note: string }>()
  const needsReason = needsSuitabilityReasonIn(latest)
  const chosen = chosenReason?.version === latest.n ? chosenReason : { version: latest.n, reason: '' as const, note: '' }
  const suitability: SuitabilityReason | undefined = needsReason && chosen.reason !== ''
    ? { reason: chosen.reason, ...(chosen.note.trim() ? { note: chosen.note.trim() } : {}) } : undefined
```

with `const needsSuitabilityReasonIn = (v: ProposalVersion) => v.pretrade.violations.some((x) => x.category === 'model_above_tolerance')` beside `readingLines` (production UI cannot import the engine's helper). `approveBlocker` gets `reasonMissing: needsReason && suitability === undefined`. Below `<PretradeReading>` and above the Approve button, when `needsReason`:

```tsx
<div className="flex w-full flex-col gap-2">
  <Select label="Suitability reason" layout="stacked" value={chosen.reason}
    options={[{ value: '', label: 'Choose a reason' }, ...SUITABILITY_REASONS.map((r) => ({ value: r.id, label: r.label }))]}
    onChange={(value) => setChosenReason({ ...chosen, reason: isSuitabilityReasonId(value) ? value : '' })} />
  <TextInput label="Note (optional)" value={chosen.note} rows={2} onChange={(note) => setChosenReason({ ...chosen, note })} />
</div>
```

The approve call passes `suitability`. On success, `setChosenReason(undefined)` beside `setAttestedVersion(undefined)`.

Run the two test files again. Expected: PASS.

- [ ] **Step 6: Recorded everywhere**

- `act-provenance.ts`: `...(act.suitability ? [suitabilityLine(act.suitability)] : [])` before the presenter's line.
- `ArchiveTable.tsx` `Summary`: under the summary text, for an act entry with `suitability`, `<span className="text-label text-ink-2">{suitabilityLine(entry.act.suitability)}</span>`.
- `OrdersEvidence.tsx`, the Approval record `dl`, after "Approved by": `{item.approval.suitability ? <><dt className={TERM}>Suitability reason</dt><dd>{suitabilityLine(item.approval.suitability).replace(/^Suitability reason · /, '')}</dd></> : null}`.
- `src/mocks/workspace/suitability.ts`:

```ts
/** Accounts whose proposal is approved (or released) with a recorded suitability reason. */
export function suitablyApprovedAccounts(): ReadonlySet<string> {
  const s = store()
  return new Set(s.approvals
    .filter((a) => (a.status === 'active' || a.status === 'released') && a.suitability !== undefined)
    .flatMap((a) => s.proposals.filter((p) => p.id === a.proposalId).map((p) => p.accountId)))
}
```

- `brief-groups.ts`:

```ts
export type BriefSummary = Extract<Message, { kind: 'brief_summary' }>

/** Composed on read: an item that waits on an approval moves to the head of Context once that approval records its reason. */
export function settleApproved(summary: BriefSummary, approved: ReadonlySet<string>): BriefSummary {
  const settled = (i: BriefItem) => i.awaitsApprovalOf !== undefined && approved.has(i.awaitsApprovalOf)
  return { ...summary, decide: summary.decide.filter((i) => !settled(i)), context: [...summary.decide.filter(settled), ...summary.context] }
}
```

- `handlers/workspace.ts`, the Brief branch: `[briefToday(viewer), ...briefOrder(inThread).map((m) => (m.kind === 'brief_summary' ? settleApproved(m, suitablyApprovedAccounts()) : m))]`.

Create `src/mocks/workspace/__tests__/brief-suitability.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { briefMessages } from '../brief'
import { settleApproved, type BriefSummary } from '../brief-groups'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { suitablyApprovedAccounts } from '../suitability'
import { JOHNSON_REASON } from '@/test/suitability-fixture'
import { seedJohnsonProposal } from './proposal-fixture'

const summaryNow = (): BriefSummary => {
  const s = briefMessages().find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('no summary')
  return settleApproved(s, suitablyApprovedAccounts())
}
const decides = (s: BriefSummary) => s.decide.some((i) => i.awaitsApprovalOf === 'acc-002')

describe("the Brief's suitability line", () => {
  beforeEach(() => resetWorkspaceStore())

  it('needs a decision until the proposal is approved with a reason, then sits at the head of Context', () => {
    expect(decides(summaryNow())).toBe(true)
    const p = seedJohnsonProposal()
    const r = approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    if (!r.ok) throw new Error(r.message)
    expect(decides(summaryNow())).toBe(false)
    expect(summaryNow().context[0]?.awaitsApprovalOf).toBe('acc-002')
  })
  it('the line returns to Needs a decision when the approval is withdrawn', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    expect(withdrawApproval('user-001', p.id).ok).toBe(true)
    expect(decides(summaryNow())).toBe(true)
  })
})
```

Every other approval in the suite passes a reason: in each file of `rg -l "approveProposal\(" src --glob '**/__tests__/**'` (it includes `story-fixture.ts`), a Johnson approval passes `JOHNSON_REASON`; an approval of a version built for another account passes `reasonFor(version)`. `src/hooks/__tests__/use-workspace-supervision.test.tsx` and the UI tests that call the service do the same with the service's new fifth argument.

Run: `pnpm vitest run --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: The stories**

`e2e-visual/workspace-steps.ts`:

```ts
export const SUITABILITY_REASON = 'The IPS permits a growth allocation for this account'

export async function approve(page: Page, version: number) {
  const approval = approvalOf(page)
  await approval.getByRole('checkbox', { name: `I reviewed every leg of v${version} and its pre-trade check results.` }).check()
  await approval.getByLabel('Suitability reason').selectOption({ label: SUITABILITY_REASON })
  await approval.getByRole('button', { name: `Approve v${version}` }).click()
  await expect(approval).toContainText(`v${version} is approved`)
  await expect(approval).toContainText('PENDING COMPLIANCE REVIEW')
}
```

`compliance-review.spec.ts` `briefAfterFills`: also `await expect(page.getByRole('region', { name: 'Context' })).toContainText("Growth sits above Robert Johnson's Moderate tolerance")`.

- [ ] **Step 8: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the approval panel shows the reason select and the optional note under the pre-trade results (`proposal-thread-*`); the approval slip after release carries "Suitability reason · …" (`thread-after-release-light`); Mark's approval record has the reason row (`supervision-*`); the archive row has its reason line; the Brief after fills has the line folded under Context. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(suitability): approving a model above tolerance needs a recorded reason, shown on the slip, in the archive and to compliance; it settles the Brief's line

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Client letters that read like a person wrote them (critique 5; top 10 · 3)

The recap is addressed to every client who attended ("Dear Robert and Patricia"), and its lines are plain requests and promises. Dr. Pell's proposal letter opens with her goals and her Stryker concern, then the proposal, and drops the collectibles sentence.

**Files:**
- Create: `src/lib/calendar-day.ts`, `src/lib/__tests__/calendar-day.test.ts`
- Modify: `src/mocks/agents/meeting-recap.ts`, `src/mocks/workspace/recap.ts`, `src/mocks/agents/meeting-notes.ts`, `src/mocks/agents/prospect-proposal-agent.ts`, `src/lib/tax-rules.ts`, `src/lib/__tests__/tax-rate-basis.test.ts`, `src/mocks/agents/client-letter.ts`, `src/mocks/workspace/__tests__/meeting-recap.test.ts`, `src/mocks/agents/__tests__/meeting-notes.test.ts`, `src/mocks/workspace/__tests__/prospect-proposals.test.ts` (or wherever `clientSummaryOf` is asserted: `rg -ln "This is our proposal|clientSummary" src --glob '**/__tests__/**'`), `src/workspace/__tests__/meeting-view.test.tsx`, `e2e-visual/meeting-review.spec.ts`

**Interfaces:**
- Consumes: `clientDate` (`src/kit/measure.ts`), `joinWords`, `firstNameOf` (`src/lib/words.ts`), `riskQuestions` (`src/mocks/data/onboarding.ts`), `taxCharacterOf` (`src/lib/security-master.ts`).
- Produces: `dayAfter(isoDay: string): string` (`src/lib/calendar-day.ts`; Task 11 uses it); `RecapInput = { addresseeId: string; greetingNames: string[]; filing: MeetingFiling; signerName: string; windowSentence?: string }`; `buildClientRateDisclosure(basis: TaxRateBasis, options: { collectibles: boolean }): string`.

- [ ] **Step 1: The day after, failing test, then the function**

Create `src/lib/__tests__/calendar-day.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dayAfter } from '@/lib/calendar-day'

describe('dayAfter', () => {
  it('steps one calendar day, across months and years', () => {
    expect(dayAfter('2026-03-27')).toBe('2026-03-28')
    expect(dayAfter('2026-02-28')).toBe('2026-03-01')
    expect(dayAfter('2026-12-31')).toBe('2027-01-01')
  })
  it('refuses anything that is not a calendar day', () => {
    expect(() => dayAfter('2026-02-30')).toThrow('not a calendar day: 2026-02-30')
    expect(() => dayAfter('2026-03-27T12:00:00Z')).toThrow('not a calendar day')
  })
})
```

Create `src/lib/calendar-day.ts`:

```ts
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** The calendar day after `isoDay` ("2026-03-27" → "2026-03-28"): the first day a wash-sale window no longer covers. */
export function dayAfter(isoDay: string): string {
  const match = DAY.exec(isoDay)
  if (!match) throw new Error(`not a calendar day: ${isoDay}`)
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error(`not a calendar day: ${isoDay}`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
```

`client-letter.ts` drops its local `dayAfter` and imports this one (behavior unchanged).

Run: `pnpm vitest run src/lib/__tests__/calendar-day.test.ts src/mocks/agents/__tests__/client-letter.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 2: The recap, failing tests**

In `src/mocks/workspace/__tests__/meeting-recap.test.ts`, which already has `heldAndDrafted()`, `file()` and `ok(...)`, add (imports: `latestIntelWindowEnd` from `../draft-staleness`, `dayAfter` from `@/lib/calendar-day`, `clientDate` from `@/kit/measure`):

```ts
const recapBody = () => {
  heldAndDrafted()
  file()
  return ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.body
}
const firstClearDate = () => {
  const end = latestIntelWindowEnd('cli-001')
  if (end === undefined) throw new Error('Robert has no open Intel window')
  return clientDate(dayAfter(end))
}

it('greets both spouses who attended, and thanks them both', () => {
  const body = recapBody()
  expect(body).toMatch(/^Dear Robert and Patricia,\n\nThank you both for meeting with me today\./)
})
it('asks plainly, and promises in the first person', () => {
  const body = recapBody()
  expect(body).toContain(`- Please don't buy Intel shares in any of your accounts until ${firstClearDate()}.`)
  expect(body).toContain("- We'll model Roth conversion amounts for the years before your required distributions begin and share them with your CPA. The amounts will be estimates; please check them with your tax professional.")
  expect(body).toContain("- You asked about moving your Vanguard 401(k) and Patricia's TIAA 403(b). We'll compare the options and come back to you.")
  expect(body).not.toMatch(/You will not|comparison to follow|consult your tax professional/)
})
it('puts the Intel date before the Intel line it governs', () => {
  const body = recapBody()
  expect(body.indexOf("Please don't buy Intel shares")).toBeLessThan(body.indexOf('The Intel restriction covers'))
})
it('still carries only decisions and requests: no transcript, no note, no colleague', () => {
  const body = recapBody()
  expect(body).not.toMatch(/Sarah Mitchell|Mike Chen|transcript|t-\d\d|n-\d\d/)
})
```

The date is the day after the latest open Intel window's last day: after the morning's harvest that window ends 27 March, so the e2e recap names March 28, 2026. The existing first case's `'Dear Robert,\n\nThank you both…'` becomes `'Dear Robert and Patricia,\n\nThank you both…'`.

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-recap.test.ts --testTimeout 30000`
Expected: FAIL ("Dear Robert,").

- [ ] **Step 3: The recap**

`src/mocks/agents/meeting-recap.ts`: `RecapInput` replaces `greetingName` and `withOthers` with `greetingNames: string[]` (the addressee first). The greeting and thanks:

```ts
    `Dear ${joinWords(greetingNames)},`,
    `Thank you${greetingNames.length === 2 ? ' both' : greetingNames.length > 2 ? ' all' : ''} for meeting with me today. Here is what we agreed.`,
```

and the window sentence goes **before** the first decision about Intel: `lines.splice(about === -1 ? lines.length : about, 0, \`- ${windowSentence}\`)`. Update the doc comment ("It precedes the first decision about Intel…").

`src/mocks/workspace/recap.ts`:

```ts
/** The Intel instruction, in the client's words: the first day a purchase no longer washes the latest open Intel sale. */
const intelWindowSentence = (end: string) => `Please don't buy Intel shares in any of your accounts until ${clientDate(dayAfter(end))}.`
```

(the `sales` count argument goes, and with it `openIntelWindows` here if nothing else uses it in the file), and:

```ts
  const attending = [client, ...clients.filter((c) => c.id !== client.id && c.householdId === meeting.householdId && event.attendees.some((a) => a.id === c.id))]
  const letter = writeMeetingRecap({
    addresseeId: client.id, greetingNames: attending.map((c) => firstNameOf(c.fullName)), filing: meeting.filed, signerName: signer.name,
    windowSentence: windowEnd === undefined ? undefined : intelWindowSentence(windowEnd),
  })
```

`src/mocks/agents/meeting-notes.ts`, the wordings filed for Robert (the firm's `text` of each line is unchanged):

| Line | `toRobert(…)` |
|---|---|
| n-09 | `"The Intel restriction covers Patricia's accounts and the IRAs too and, as firm policy, your held-away Vanguard 401(k), because the rule for employer plans is unsettled. Reinvested Intel dividends count as buying."` |
| n-12 | `"You'll contact the Vanguard plan administrator to correct the beneficiary, and we'll send you our beneficiary checklist."` |
| n-14 | `"We'll model Roth conversion amounts for the years before your required distributions begin and share them with your CPA. The amounts will be estimates; please check them with your tax professional."` |
| n-15 | `"You asked about moving your Vanguard 401(k) and Patricia's TIAA 403(b). We'll compare the options and come back to you."` |
| n-16 (new) | `"We'll look at ESG alternatives for the trust; a change would need a signed amendment to the investment policy statement."` |

n-15 keeps the rollover's meaning: it was asked about, and a comparison follows; no recommendation. Update `meeting-notes.test.ts` and `meeting-view.test.tsx` where they quote these wordings.

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-recap.test.ts src/mocks/agents/__tests__/meeting-notes.test.ts src/workspace/__tests__/meeting-view.test.tsx src/workspace/__tests__/recap.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 4: Dr. Pell's letter, failing test**

Add to `src/mocks/workspace/__tests__/prospect-proposals.test.ts`, which builds her proposal with `withHerReply()` and `created()` (as its case at line 47 does):

```ts
const letter = () => {
  withHerReply()
  return created().versions[0]?.clientSummary ?? ''
}

it('opens with her goals and her Stryker concern, then the proposal', () => {
  const summary = letter()
  const [greeting, , opening] = summary.split('\n')
  expect(greeting).toBe('Dear Dr. Pell,')
  expect(opening).toBe(
    'Thank you for your questionnaire and your statements. You told us your goal is to maximize long-term growth over a horizon of more than 20 years, '
    + 'and you asked us what to do about your large, low-basis Stryker Corp. position. Here is what we propose.')
  expect(summary).not.toContain('This is our proposal.')
})
it('drops the collectibles sentence; tax lines are estimates to check with her tax professional', () => {
  const summary = letter()
  expect(summary).not.toMatch(/collectible|precious-metal/i)
  expect(summary).toContain('(an estimate; please check with your tax professional)')
  expect(summary).not.toContain('consult your tax professional')
})
it('says the rollover was asked about and a comparison follows', () => {
  const summary = letter()
  expect(summary).toContain("You asked about moving your TIAA 403(b). We'll compare the options and come back to you.")
})
```

Run it. Expected: FAIL ("This is our proposal.").

- [ ] **Step 5: The letter**

`src/lib/tax-rules.ts`:

```ts
/** `collectibles`: whether the letter's holdings include any; a reader who holds none is not told their rate. */
export function buildClientRateDisclosure(basis: TaxRateBasis, { collectibles }: { collectibles: boolean }): string {
  const niit = basis.includes.includes('niit') ? `, including the ${formatRatePercent(NIIT_RATE)} net investment income tax` : ''
  const state = basis.excludes.includes('state') ? ' State tax is not modeled.' : ''
  const collectibleRate = collectibles ? ` (${formatRatePercent(basis.collectibleLongTerm)} on collectibles, including physically backed precious-metal funds)` : ''
  return `These estimates use top federal rates${niit}: ${formatRatePercent(basis.shortTerm)} on short-term gains and ${formatRatePercent(basis.longTerm)} on long-term gains${collectibleRate}.${state} They are estimates, not tax advice.`
}
```

`client-letter.ts` passes `{ collectibles: true }` (its paragraphs are unchanged in this task). Update `tax-rate-basis.test.ts`: its existing expectation passes `{ collectibles: true }`, and a new case checks `{ collectibles: false }` has no "collectibles".

`src/mocks/agents/prospect-proposal-agent.ts` `clientSummaryOf`:

```ts
/** Her answer to one question, as the questionnaire words it, for a sentence ("Maximize long-term growth" → "maximize long-term growth"). */
function answerWords(record: ProspectRecord, questionId: string): string {
  const answer = record.questionnaire?.answers.find((a) => a.questionId === questionId)
  const label = answer && riskQuestions.find((q) => q.id === questionId)?.options[answer.selectedOption]?.label
  if (!label) throw new Error(`Prospect ${record.id} has no answer to ${questionId}`)
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`
}
```

and the letter's head becomes:

```ts
    `Dear ${record.salutation},`,
    '',
    `Thank you for your questionnaire and your statements. You told us your goal is to ${answerWords(record, 'rq-03')} over a horizon of ${answerWords(record, 'rq-01')}`
      + `${c.concentration ? `, and you asked us what to do about your large, low-basis ${c.concentration.name} position` : ''}. Here is what we propose.`,
    '',
    `We propose our ${c.modelName} model, the one your answers point to: about ${clientWholePercent(mix.stocks)} in stocks and ${clientWholePercent(1 - mix.stocks)} in bonds, alternatives, commodities and cash.`,
```

In the same function: both `(estimate; consult your tax professional)` become `(an estimate; please check with your tax professional)`; the held-away line becomes `` `You asked about moving your ${h.custodian} 403(b). We'll compare the options and come back to you.` ``; and `buildClientRateDisclosure(TAX_RATE_BASIS, { collectibles: c.transfer.some((l) => taxCharacterOf(l.symbol) === 'collectible') })`. Every figure is still the version's, formatted by the kit; no digit is typed in the code (the "20" is her answer's label from the questionnaire's data).

Run: `pnpm vitest run src/lib src/mocks --testTimeout 30000`
Expected: PASS after updating the cases that quoted the old letter.

- [ ] **Step 6: The stories, baselines, every check, commit**

`e2e-visual/meeting-review.spec.ts:84`: `await expect(letterDraft(page)).toContainText("Please don't buy Intel shares in any of your accounts until March 28, 2026.")`. `askForRecap` in `workspace-steps.ts` still waits for "What you asked us:".

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the recap greets "Dear Robert and Patricia,", the Intel line comes first under What we decided, the rollover line reads as asked about with a comparison to follow; Dr. Pell's sent letter opens with her goals and Stryker; the filed notes in `meeting-after-*` show the new "To Robert:" wordings. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(letters): the recap greets both spouses and asks plainly; Dr. Pell's letter opens with her goals and Stryker, without the collectibles rate

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Figure parts in claims (minor: guardrail contortions; top 10 · 10)

The rule bans hand-typed digits, not numbers. A claim may carry one of its own figures as the kit formats it, so Meeting Prep says "in 2031, at age 73" instead of "in the year the citation states". The household table's total says what it ties to.

**Files:**
- Create: `src/kit/figure-text.ts`, `src/test/claim-digits.ts`, `src/test/__tests__/claim-digits.test.ts`
- Modify: `src/kit/measure.ts` (`fmtYear`), `src/kit/__tests__/measure.test.ts`, `src/types/workspace.ts` (`FigureUnit` gains `'year'`), `src/workspace/thread/figure-format.ts`, `src/workspace/__tests__/figure-format.test.ts`, `src/workspace/thread/AgentFindingView.tsx`, `src/workspace/thread/BriefSummaryView.tsx`, `src/workspace/thread/ReferenceRowView.tsx`, `src/mocks/agents/meeting-prep.ts`, `src/mocks/agents/__tests__/agents.test.ts`, `src/mocks/agents/__tests__/harvest-scanner.test.ts`, `src/mocks/agents/__tests__/meeting-prep.test.ts`, `src/workspace/household/AccountsTable.tsx`

**Interfaces:**
- Consumes: the kit formatters in `src/kit/measure.ts`.
- Produces: `fmtYear(year: number): string`; `formatFigure(fig: Figure): FormattedFigure` and `figureText(fig: Figure): string` in `src/kit/figure-text.ts` (moved from `figure-format.ts`, which keeps `marksBreach`, `findingStatus`, `FindingStatus`); `handTypedDigits(claim: string, figures: readonly Figure[]): string[]` in `src/test/claim-digits.ts`.

- [ ] **Step 1: Failing tests**

`src/kit/__tests__/measure.test.ts` gains:

```ts
it('fmtYear writes a calendar year with no separator, and refuses anything else', () => {
  expect(fmtYear(2031)).toBe('2031')
  expect(() => fmtYear(2031.5)).toThrow('not a calendar year: 2031.5')
  expect(() => fmtYear(31)).toThrow('not a calendar year: 31')
})
```

Create `src/test/__tests__/claim-digits.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { handTypedDigits } from '@/test/claim-digits'
import type { Figure } from '@/types/workspace'

const year: Figure = { label: 'First required distribution · Robert', value: 2031, unit: 'year', source: 'firstRmdYear' }
const age: Figure = { label: 'Age at the first required distribution · Robert', value: 73, unit: 'count', source: 'requiredBeginningAge' }

describe('handTypedDigits', () => {
  it("allows a claim's own figures, as the kit formats them", () => {
    expect(handTypedDigits("Required distributions from Robert's traditional IRA begin in 2031, at age 73.", [year, age])).toEqual([])
  })
  it('catches a number that is not one of its figures', () => {
    expect(handTypedDigits('begin in 2032, at age 73', [year, age])).toEqual(['2032'])
    expect(handTypedDigits('begin in 2031', [])).toEqual(['2031'])
  })
})
```

Run: `pnpm vitest run src/kit/__tests__/measure.test.ts src/test/__tests__/claim-digits.test.ts --testTimeout 30000`
Expected: FAIL (no `fmtYear`, no module).

- [ ] **Step 2: The year, the figure's text, the guard helper**

`src/kit/measure.ts`:

```ts
/** A calendar year, as a year reads: "2031", never "2,031". */
export function fmtYear(year: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) throw new MeasureError(`not a calendar year: ${year}`)
  return String(year)
}
```

`src/types/workspace.ts`: `FigureUnit` gains `| 'year'`.

Create `src/kit/figure-text.ts` by moving `FormattedFigure`, `BY_UNIT`, `TOLERANCE_SOURCES` and `formatFigure` out of `src/workspace/thread/figure-format.ts`, adding `year: { format: fmtYear, unit: '' }` to `BY_UNIT`, and:

```ts
/** A figure as it reads inside a sentence: its value and unit, formatted by the kit. The only digits a claim may carry. */
export function figureText(fig: Figure): string {
  const { value, unit } = formatFigure(fig)
  return unit ? `${value} ${unit}` : value
}
```

(`import type { Figure, FigureUnit } from '@/types/workspace'`, a type-only import.) `AgentFindingView.tsx`, `BriefSummaryView.tsx`, `ReferenceRowView.tsx` and `figure-format.test.ts` import `formatFigure` from `@/kit/figure-text`. Any other `Record<FigureUnit, …>` the type-check reports gets its `year` entry.

Create `src/test/claim-digits.ts`:

```ts
import type { Figure } from '@/types/workspace'
import { figureText } from '@/kit/figure-text'

/** The digits a claim types by hand: whatever is left once each of its own figures, as the kit writes it, is taken out. */
export function handTypedDigits(claim: string, figures: readonly Figure[]): string[] {
  const parts = figures.map(figureText).sort((a, b) => b.length - a.length)
  const rest = parts.reduce((text, part) => text.split(part).join(' '), claim)
  return rest.match(/\d+/g) ?? []
}
```

Swap the claim guards to it: `agents.test.ts:21` `expect(handTypedDigits(f.claim, f.figures)).toEqual([])`, and the same in the digit-free cases of `harvest-scanner.test.ts` and `meeting-prep.test.ts` (which keeps stripping its `PLAN_NAMES` first: `handTypedDigits(f.claim.replace(PLAN_NAMES, ''), f.figures)`). Run the two Step 1 files: PASS.

- [ ] **Step 3: Meeting Prep says the year and the age**

Add to `meeting-prep.test.ts`:

```ts
it("says when Robert's required distributions begin, with the year and the age as figures", () => {
  const rmd = titled(findings, 'Roth conversions before required distributions')
  expect(rmd.claim).toBe("Required distributions from Robert's traditional IRA begin in 2031, at age 73; the years before then are when Roth conversions can be modeled, as an estimate for the clients' tax professional to confirm.")
  expect(handTypedDigits(rmd.claim, rmd.figures)).toEqual([])
  expect(rmd.citations[0]?.source).toContain('born 22 Mar 1958')
})
```

(`findings` and `titled` are the file's own: Meeting Prep run on `hh-001` at `MOCK_NOW_ISO`.) Run it: FAIL ("in the year the citation states").

`src/mocks/agents/meeting-prep.ts` `rmd`:

```ts
  const timing = owners.map(({ member }) => {
    const first = firstNameOf(member.name)
    const year: Figure = { label: `First required distribution · ${first}`, value: firstRmdYear(member.dateOfBirth), unit: 'year', source: 'firstRmdYear(dateOfBirth)' }
    const age: Figure = { label: `Age at the first required distribution · ${first}`, value: requiredBeginningAge(member.dateOfBirth), unit: 'count', source: 'requiredBeginningAge(dateOfBirth)' }
    return { phrase: `${first}'s traditional IRA begin in ${figureText(year)}, at age ${figureText(age)}`, figures: [year, age] }
  })
  return {
    claim: `Required distributions from ${joinWords(timing.map((t) => t.phrase))}; the years before then are when Roth conversions can be modeled, as an estimate for the clients' tax professional to confirm.`,
    attention: 'info',
    figures: [...timing.flatMap((t) => t.figures), ...owners.map(({ account }) => ({ label: account.name, value: valueOf(account), unit: 'USD' as const, source: 'positions.marketValue' }))],
    citations: owners.map(({ member }) => ({
      source: `Required beginning · ${member.name}, born ${fmtDayMonthYear(member.dateOfBirth)} · first required distribution for ${firstRmdYear(member.dateOfBirth)} (age ${requiredBeginningAge(member.dateOfBirth)}, SECURE 2.0)`,
      asOf,
    })),
    agendaTitle: 'Roth conversions before required distributions',
  }
```

Run: `pnpm vitest run src/mocks/agents --testTimeout 30000`. Expected: PASS.

- [ ] **Step 4: "the value the engine states"**

`src/workspace/household/AccountsTable.tsx:31`: `tiesTo: { label: \`the total on record, ${fmtMoney(totalValue)} USD\`, expected: totalValue, actual: rowsTotal }`. The kit prints "ties to the total on record, 18,750,000 USD". Update the household/client view test that quoted the old label.

- [ ] **Step 5: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/meeting-review.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: Meeting Prep's Roth finding reads "begin in 2031, at age 73" with the year and age among its figures; the household's total line reads "ties to the total on record, …". Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(claims): a claim may say its own figure as the kit writes it; Meeting Prep says the year and the age

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: One wash-sale phrase, "staged" split in two, the small labels (minors; top 10 · 7, 8, 10)

**Files:**
- Create: `src/kit/repurchase.ts`, `src/kit/__tests__/repurchase.test.ts`
- Modify (wash sale): `src/workspace/workbench/WorkbenchLegs.tsx`, `src/workspace/workbench/WorkbenchSummary.tsx`, `src/workspace/proposal/RestrictionList.tsx`, `src/workspace/workbench/RestrictionRulers.tsx`, `src/mocks/agents/harvest-scanner.ts`, `src/mocks/agents/drift-monitor.ts`, `src/mocks/agents/meeting-prep.ts`, `src/mocks/agents/client-letter.ts`, `src/mocks/workspace/draft-staleness.ts`
- Modify (waiting state and phased sale): `src/workspace/context/ApprovalPanel.tsx`, `src/workspace/supervision/OrdersEvidence.tsx`, `src/workspace/proposal/StagedOrderList.tsx`, `src/workspace/supervision/SupervisionQueue.tsx`, `src/workspace/reference/reference-words.ts`, `src/mocks/reference/blotter.ts`, `src/workspace/prospect/ReviseProspectDialog.tsx`, `src/workspace/prospect/ProspectProposalEmbed.tsx`, `src/workspace/prospect/prospect-words.ts`, `src/mocks/agents/prospect-proposal-agent.ts`
- Modify (labels): `src/mocks/handlers/compliance.ts`, `src/mocks/reference/risk.ts`, `src/workspace/meeting/AgendaEditor.tsx`, `src/workspace/shell/WorkspaceShell.tsx`, `src/workspace/proposal/TaxReadings.tsx`
- Modify (tests and stories): the unit tests that quote any changed string, `e2e-visual/workspace-steps.ts`, `e2e-visual/rebalance-job.spec.ts`, `e2e-visual/prospect-proposal.spec.ts`

**Interfaces:**
- Consumes: Task 9's `dayAfter`; `fmtDayMonthYear`.
- Produces: `dontRepurchaseUntil(lastWashDay: string): string` and `firstClearDay(lastWashDay: string): string` (`src/kit/repurchase.ts`); the waiting label **Pending compliance release** and its tag `PENDING COMPLIANCE RELEASE`; the phrase **Phased sale**.

- [ ] **Step 1: The phrase, failing test, then the function**

Create `src/kit/__tests__/repurchase.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dontRepurchaseUntil, firstClearDay } from '@/kit/repurchase'

describe('the one wash-sale phrase', () => {
  it('names the first day a purchase no longer washes the loss: the day after the window', () => {
    expect(firstClearDay('2026-03-27')).toBe('28 Mar 2026')
    expect(dontRepurchaseUntil('2026-03-27')).toBe("Don't repurchase until 28 Mar 2026")
  })
})
```

Create `src/kit/repurchase.ts`:

```ts
import { dayAfter } from '@/lib/calendar-day'
import { fmtDayMonthYear } from './measure'

/** The first day a repurchase no longer washes the loss: the day after the window's last day. */
export const firstClearDay = (lastWashDay: string): string => fmtDayMonthYear(dayAfter(lastWashDay))

/** The one way the app says a wash-sale window, wherever it says it. */
export const dontRepurchaseUntil = (lastWashDay: string): string => `Don't repurchase until ${firstClearDay(lastWashDay)}`
```

Run: `pnpm vitest run src/kit/__tests__/repurchase.test.ts --testTimeout 30000`. Expected: PASS.

- [ ] **Step 2: Every place the window is said**

| File | Old | New |
|---|---|---|
| `WorkbenchLegs.tsx:35` | header `No buy-back to`, cell `fmtDayMonthYear(r.restrictedTo)` | header `Don't repurchase until`, cell `firstClearDay(r.restrictedTo)` |
| `WorkbenchSummary.tsx:42` | pane `Wash-sale taxpayer` | `Wash-sale restrictions` |
| `RestrictionList.tsx` | title `Repurchase restrictions · wash-sale taxpayer`; `` `no repurchase through ${fmtDayMonthYear(r.until)}` `` | `Wash-sale restrictions`; `dontRepurchaseUntil(r.until)` |
| `RestrictionRulers.tsx:17` | `Repurchase restrictions` | `Wash-sale restrictions` (the rulers still draw the window to its last day) |
| `harvest-scanner.ts:96` citation | `` `Wash-sale window · a sale of ${p.symbol} on ${D} restricts buying it back through ${E}` `` | `` `Wash-sale window · ${p.symbol} sold on ${D} · ${dontRepurchaseUntil(window.end)}` `` |
| `harvest-scanner.ts:114`, `drift-monitor.ts` (replacement hold), `meeting-prep.ts:77` citations | `` `…loss sale of ${D}, open through ${fmtDayMonthYear(w.end)}` `` | `` `…loss sale of ${D} · ${dontRepurchaseUntil(w.end)}` `` |
| `client-letter.ts`, the harvested-loss paragraph | `please don't buy ${t.name} back ${where}, on or before ${clientDate(until)}; from ${clientDate(dayAfter(until))} you may buy it again.` | `please don't repurchase ${t.name} ${where} until ${clientDate(dayAfter(until))}.` |
| `client-letter.ts`, the dividends paragraph | `please turn that off through ${clientDate(window.end)}` | `please turn that off until ${clientDate(dayAfter(window.end))}` |
| `draft-staleness.ts:54-56` | "…runs through …" | stated undefined: `` `This recap gives no Intel date, but Intel can't be repurchased until ${now === undefined ? 'no date' : clientDate(dayAfter(now))}. Ask for a new recap.` ``; now undefined: `` `This recap says not to buy Intel until ${clientDate(dayAfter(stated))}, but no window is open now. Ask for a new recap.` ``; both: `` `This recap says not to buy Intel until ${clientDate(dayAfter(stated))}, but the date is now ${clientDate(dayAfter(now))}. Ask for a new recap.` `` |

Claims keep their words ("…until its window closes"): a claim carries no hand-typed date, and its citation now says the date in the one phrase. Update the tests that quote these strings (`rg -n "open through|restricts buying|No buy-back|no repurchase through|Wash-sale taxpayer|Repurchase restrictions|on or before|runs through" src --glob '**/__tests__/**'`).

- [ ] **Step 3: One waiting state; the phased sale**

| File | Old | New |
|---|---|---|
| `ApprovalPanel.tsx` `StagedOrders` | `<Tag tone="hatch">PENDING COMPLIANCE REVIEW</Tag>`, `Staged, not released.`, `` `Staged from v${v} · ${actId}` `` | `<Tag tone="hatch">PENDING COMPLIANCE RELEASE</Tag>`, the sentence goes, `` `From v${v} · approval ${actId}` `` |
| `OrdersEvidence.tsx` `OrdersStatus` | pane `Staged orders`, tag `PENDING COMPLIANCE REVIEW` | pane `Pending compliance release`, tag `PENDING COMPLIANCE RELEASE` |
| `StagedOrderList.tsx:8` | caption `Staged orders` | `Orders pending compliance release` |
| `SupervisionQueue.tsx` | group `Orders awaiting release`; `"No orders are waiting. Today's are under Disposed today."` | `Pending compliance release`; `"No orders are waiting. Today's are under Closed today."` |
| `SupervisionQueue.tsx` | group `Disposed today`, empty `Nothing disposed of yet today.` | `Closed today`, `Nothing closed yet today.` |
| `reference-words.ts:11,14` | filter `Pending compliance`; tag `PENDING COMPLIANCE` | `Pending compliance release`; `PENDING COMPLIANCE RELEASE` |
| `blotter.ts:94` method note | `Pending compliance: staged from an approval, waiting for release…` | `Pending compliance release: from an approval, waiting for compliance to release it…` |
| `ReviseProspectDialog.tsx:26` | `Staged sale of the concentrated stock` | `Phased sale of the concentrated stock` |
| `prospect-words.ts:43` | `Not staged` | `Not phased` |
| `prospect-words.ts:40` `RATIONALE_DRAFT` | `any sale is staged with her CPA` | `any sale is phased over tax years with her CPA` |
| `ProspectProposalEmbed.tsx:88` | `` `Staged sale option · v${n}` `` | `` `Phased sale over ${TRANCHE_WORDS[tranches]} tax years · v${n}` `` with `TRANCHE_WORDS = { 2: 'two', 3: 'three' } as const` read from the version's tranche count |
| `prospect-proposal-agent.ts:26,28` | `Documented a staged sale of …`; `Removed the staged sale; …` | `Documented a phased sale of …`; `Removed the phased sale; …` |

`SupervisionPage.tsx:52`'s "Staged orders wait here" becomes "Orders pending compliance release wait here: nothing executes until compliance releases them. Each disposition is recorded with your rationale."

- [ ] **Step 4: The small labels**

| File | Old | New |
|---|---|---|
| `compliance.ts:116,131` | `'pooled-vehicle'`; `'Pooled-vehicle concentration limit'` | `'single-fund'`; `'Single-fund concentration limit'` |
| `risk.ts` concentration method note | `…for a single issuer, a pooled vehicle and cash.` | `…for a single issuer, a single fund and cash.` |
| `AgendaEditor.tsx:80-82` | `` aria-label={`Drop “${title}”`} ``, text `Drop` | `` `Remove “${title}”` ``, `Remove` (the internal `'drop'` keys stay) |
| `WorkspaceShell.tsx:42` | key label `Main` | `Conversation` |
| `TaxReadings.tsx:15` | `` `Est. tax ${estimate.direction} the return` `` | `TAX_LABEL[estimate.direction]` with `const TAX_LABEL = { 'added to': 'Est. additional tax', 'saved on': 'Est. tax saved' } as const` |

Run: `pnpm vitest run --testTimeout 30000`. Expected: PASS after updating the tests that quoted the old strings (`rg -n "pooled|Pooled|Drop “|'Main'|Est\. tax added|Staged|PENDING COMPLIANCE|Disposed today|Not staged" src --glob '**/__tests__/**'`).

- [ ] **Step 5: The stories**

- `workspace-steps.ts` `approve`: `toContainText('PENDING COMPLIANCE RELEASE')`; `reviseToTwoTaxYears`: `dialog.getByLabel('Phased sale of the concentrated stock')` and `proposal.getByRole('table', { name: 'Phased sale over two tax years · v2' })`.
- `rebalance-job.spec.ts:161,203`: `/From v3 · approval REC-/`.
- `rg -n "Staged|staged|PENDING COMPLIANCE REVIEW|Disposed|Drop|pooled" e2e-visual` and fix each locator that names a changed control.

- [ ] **Step 6: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/reference-views.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the workbench column reads "Don't repurchase until" with 28 Mar 2026 on INTC; WASH-SALE RESTRICTIONS panes; PENDING COMPLIANCE RELEASE in the panel, Mark's queue and the blotter; "Phased sale over two tax years · v2" in Pell's work thread; Remove on agenda items; "Conversation" in the key sheet; "Est. additional tax" or "Est. tax saved" on the proposal. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(copy): one wash-sale phrase naming the first clear day; pending compliance release and the phased sale; single-fund, closed, remove, conversation, additional tax

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Demo devices and the home page (minors; top 10 · 6)

Every demo device reads "Demo · …". The home page's date line stays true after the clock moves. Each home step says why it matters before what to click. Product copy stops giving tour instructions.

**Files:**
- Modify: `src/workspace/prospect/ProspectClock.tsx`, `src/workspace/meeting/MeetingControls.tsx`, `src/workspace/shell/WorkspaceHome.tsx`, `src/workspace/shell/home-steps.ts`, `src/workspace/supervision/SupervisionQueue.tsx`, `src/workspace/reference/ReconciliationPage.tsx`, `src/workspace/__tests__/home.test.tsx`, the unit tests that name the changed controls, `e2e-visual/workspace-steps.ts`, `e2e-visual/prospect-proposal.spec.ts`, `e2e-visual/meeting-review.spec.ts`, `e2e-visual/readme-path.spec.ts`

**Interfaces:**
- Consumes: Task 8's approval reason (named in step 2's words); Task 11's "Phased sale".
- Produces: the controls the README names: **Demo · hold the meeting**, **Demo · skip to her reply · Thu 26 Feb 09:10 ET**, **Demo · skip to her acceptance · Mon 2 Mar 10:00 ET**, the context section **Demo · clock**; `HOME_STEPS` (same ids, new words).

- [ ] **Step 1: Failing test**

Add to `src/workspace/__tests__/home.test.tsx`:

```tsx
it('the date line stays true after the clock moves, and every step says why before what to click', async () => {
  renderRoutes(routes, '/')
  expect(await screen.findByText(/Starts at 25 Feb 2026; the presenter can move the clock forward\./)).toBeInTheDocument()
  expect(screen.queryByText(/frozen/)).not.toBeInTheDocument()
  const steps = screen.getByRole('list', { name: 'The five-minute path' })
  expect(steps).not.toHaveTextContent(/\bv3\b|exclude QAI|Take /)
  expect(steps).toHaveTextContent('Demo ·')
})
```

Run: `pnpm vitest run src/workspace/__tests__/home.test.tsx --testTimeout 30000`. Expected: FAIL ("frozen").

- [ ] **Step 2: The devices**

| File | Old | New |
|---|---|---|
| `ProspectClock.tsx` | `<ContextSection title="Clock">` | `<ContextSection title="Demo · clock">` |
| `ProspectClock.tsx` | `` `Advance to her ${jump.to} · ` `` | `` `Demo · skip to her ${jump.to} · ` `` |
| `MeetingControls.tsx:59` | button `Hold the meeting` | `Demo · hold the meeting` (the dialog title "Hold the meeting?" and its confirm button stay) |
| `MeetingControls.tsx` dialog description | `The session clock moves to the end of the meeting, …` | `A demo step: the session clock moves to the end of the meeting, …` |
| `SupervisionQueue.tsx:32` | `'Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve).'` | `'Orders appear here once an advisor approves a proposal.'` (and the doc comment no longer calls the sentences tour copy) |
| `ReconciliationPage.tsx:57` | `` `Before this session · ${fmtEasternStamp(b.resolvedAt)}` `` | `` `Resolved earlier · ${fmtEasternStamp(b.resolvedAt)}` `` |

`WorkspaceHome.tsx:29-31`:

```tsx
<p className="text-body text-ink-3">
  {`A demonstration: ${FIRM_NAME} and everyone in it are fictional, and nothing here is investment, tax or legal advice. Starts at ${fmtDayMonthYear(MOCK_TODAY_ISO)}; the presenter can move the clock forward.`}
</p>
```

- [ ] **Step 3: The steps, why first**

`src/workspace/shell/home-steps.ts` (ids, `to` and link labels unchanged except where noted):

```ts
export const HOME_STEPS: readonly HomeStep[] = [
  { id: 'brief', title: 'The Brief', detail: "Start where the agents left the day: what is on the calendar, what needs your decision and why. Choose Brief.", to: '/t/th-brief', linkLabel: 'Open the Brief' },
  { id: 'rebalance', title: 'The Johnson rebalance and harvest', detail: "Turn the Intel tax loss into a trade the team can check: share the finding to the team thread, ask the Proposal Agent, revise it to sell only at a loss, leave the QAI fund out in the workbench, then approve with a suitability reason, because Growth sits above Robert's tolerance.", to: '/t/th-johnson-review', linkLabel: 'Open Johnson Rebalance Review' },
  { id: 'release', title: 'Compliance releases, as Mark Davis', detail: "Nothing trades until compliance releases it. Choose Demo · act as Mark Davis: the release is recorded as his, and the orders fill at the day's prices.", to: '/t/th-johnson-review', linkLabel: 'Release the orders' },
  { id: 'blotter', title: 'The blotter and the updated holdings', detail: "See that each order filled under the release's record, and that Intel has left the holdings and the Brief's decisions.", to: '/blotter', linkLabel: 'Open the blotter' },
  { id: 'meeting', title: 'The Johnson annual review', detail: 'Prepare, hold and file the meeting so the record and the recap agree: prep, Demo · hold the meeting, draft and file the notes, then send Robert and Patricia the recap.', to: '/t/th-johnson-meeting', linkLabel: 'Open Johnson annual review' },
  { id: 'pell', title: 'Dr. Amanda Pell, first contact to onboarding', detail: 'Take a referral to a signed-up client, with each disclosure on time: Form CRS before the coffee (firm policy), her reply, a phased sale over two tax years, her acceptance.', to: '/t/th-pell', linkLabel: 'Open her thread' },
  { id: 'reference', title: 'The reports', detail: 'Check the book from the firm side: Billing, Models, Practice and the Blotter; resolve a reconciliation break; share a risk row to a team thread.', to: '/reconciliation', linkLabel: 'Open Reconciliation' },
  { id: 'view_as', title: 'View as Robert', detail: 'See what the client sees: set View as to Robert Johnson · Client. One conversation, his own, and the truth about who reads it.', to: '/t/th-robert', linkLabel: 'Open his thread' },
]
```

Update the doc comment (the README's eight steps; Task 14 keeps the two in agreement).

Run: `pnpm vitest run src/workspace --testTimeout 30000`. Expected: PASS after updating the tests that named "Advance to her", "Hold the meeting" (the first button), "Clock" or the old step words.

- [ ] **Step 4: The stories**

`e2e-visual/workspace-steps.ts`:

```ts
const JUMP_LABEL = { reply: 'Demo · skip to her reply · Thu 26 Feb 09:10 ET', acceptance: 'Demo · skip to her acceptance · Mon 2 Mar 10:00 ET' } as const

export async function holdTheMeeting(page: Page, atDialog?: AtDialog) {
  await page.getByRole('button', { name: 'Demo · hold the meeting', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Hold the meeting?' })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Hold the meeting', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Draft notes', exact: true })).toBeVisible()
}
```

`recordTheCoffee`: the region is `'Demo · clock'`. `prospect-proposal.spec.ts:189,200` name the jumps by the new labels. `rg -n "Advance to her|'Clock'|'Hold the meeting'" e2e-visual` prints only the dialog's own title and confirm.

- [ ] **Step 5: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/reference-views.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the home page's date line and the eight steps, each leading with why; DEMO · CLOCK and the skip button on Dr. Pell's thread; "Demo · hold the meeting" on the meeting view; "Resolved earlier · …" in Reconciliation. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(demo): every demo device says Demo; the home date line stays true; each step says why before what to click

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Account display names (top 10 · 9)

A person reading a heading, a table cell or a link reads an account as its owner, its type and the last four digits of its number: "Robert Johnson · Individual (…3847)". A named account keeps its name: "Johnson Family Trust (…7291)". Agent claims, thread titles and act summaries keep the digit-free name.

**Files:**
- Create: `src/lib/account-display.ts`, `src/lib/__tests__/account-display.test.ts`
- Modify: `src/workspace/full-views/AccountView.tsx`, `src/workspace/context/FullViews.tsx`, `src/mocks/workspace/household-views.ts`, `src/mocks/reference/risk.ts`, `src/mocks/reference/attribution.ts`, `src/mocks/reference/blotter.ts`, `src/mocks/reference/reconciliation.ts`, `src/mocks/workspace/brief-today.ts`, `src/mocks/workspace/supervision.ts`, the tests that quote account names on these surfaces, `e2e-visual/reference-views.spec.ts`, `e2e-visual/readme-path.spec.ts`, `e2e-visual/phone.spec.ts`, `e2e-visual/shell.spec.ts`, `e2e-visual/compliance-review.spec.ts`

**Interfaces:**
- Consumes: `ACCOUNT_TYPE_LABELS` (`src/lib/labels.ts`); `Account` (`src/types/account.ts`).
- Produces: `accountDisplayName(account: Pick<Account, 'name' | 'type' | 'accountNumber'>): string`. The engine's display fields (`accountName` on `AccountRiskView`, book risk rows, `AttributionView`, blotter rows, reconciliation breaks, Today's release line, `OrdersItem`) carry it; a claim built from one of those views is built from `account.name` instead.

- [ ] **Step 1: Failing test, then the function**

Create `src/lib/__tests__/account-display.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accountDisplayName } from '@/lib/account-display'
import { accounts } from '@/mocks/data/accounts'

describe('accountDisplayName', () => {
  it('reads owner · type (…last four)', () => {
    expect(accountDisplayName({ name: 'Robert Johnson Individual', type: 'individual', accountNumber: 'BRK-293847' })).toBe('Robert Johnson · Individual (…3847)')
    expect(accountDisplayName({ name: 'Robert Johnson Traditional IRA', type: 'traditional_ira', accountNumber: 'IRA-339201' })).toBe('Robert Johnson · Traditional IRA (…9201)')
  })
  it('a named account keeps its name', () => {
    expect(accountDisplayName({ name: 'Johnson Family Trust', type: 'trust_revocable', accountNumber: 'TRU-847291' })).toBe('Johnson Family Trust (…7291)')
  })
  it('every account in the book has a display name', () => {
    for (const a of accounts) expect(accountDisplayName(a), a.id).toMatch(/ \(…\d{4}\)$/)
  })
  it('refuses a number without four digits', () => {
    expect(() => accountDisplayName({ name: 'X', type: 'individual', accountNumber: 'BRK-12' })).toThrow('BRK-12 has no last four digits')
  })
})
```

Create `src/lib/account-display.ts`:

```ts
import type { Account } from '@/types/account'
import { ACCOUNT_TYPE_LABELS } from './labels'

/**
 * An account as an advisor names it: "Robert Johnson · Individual (…3847)", the last four digits from its number.
 * A named account ("Johnson Family Trust") keeps its name. For people reading; claims and titles keep `name`.
 */
export function accountDisplayName({ name, type, accountNumber }: Pick<Account, 'name' | 'type' | 'accountNumber'>): string {
  const lastFour = accountNumber.replace(/\D/g, '').slice(-4)
  if (lastFour.length !== 4) throw new Error(`Account number ${accountNumber} has no last four digits`)
  const typeLabel = ACCOUNT_TYPE_LABELS[type]
  const owner = name.endsWith(` ${typeLabel}`) ? name.slice(0, -(typeLabel.length + 1)) : undefined
  return `${owner ? `${owner} · ${typeLabel}` : name} (…${lastFour})`
}
```

Run: `pnpm vitest run src/lib/__tests__/account-display.test.ts --testTimeout 30000`. Expected: PASS (the book-wide case fails only if an account number has fewer than four digits: report it rather than change the data).

- [ ] **Step 2: The surfaces**

| File | Change |
|---|---|
| `AccountView.tsx:74` | `<h1 …>{accountDisplayName(account)}</h1>` (the document title follows the heading) |
| `FullViews.tsx` `AccountViews` | the link text `accountDisplayName(account.data)` |
| `household-views.ts:40` | the household row's `name: accountDisplayName(account)` (the row is display-only; `AccountsTable.tsx` reads it unchanged) |
| `risk.ts:90,118` | `accountName: accountDisplayName(account)`; `quoteClaim` (line 127) is called with `account.name`, so a quoted row's claim stays digit-free |
| `attribution.ts:31` | `accountName: accountDisplayName(account)` |
| `blotter.ts` `accountName(id)` | returns `accountDisplayName(account)` |
| `reconciliation.ts:73` | `accountName: accountDisplayName(account)`; the act summary "Resolved brk-002 · …" keeps `account.name` |
| `brief-today.ts:22` | `accountName: accountDisplayName(account)` |
| `supervision.ts:27` | `accountName: accountDisplayName(account)` |

Run: `pnpm vitest run --testTimeout 30000`. Expected: PASS after updating the tests that quoted these names on these surfaces (`rg -n "Robert Johnson Individual|Patel Digital Assets Account" src --glob '**/__tests__/**'`; a test about a claim, a thread title or an act summary keeps the old name, and `agents.test.ts` and `take.test.ts` must not need a change). The command line's destinations come from thread titles and route titles: if a destination is built from an engine view's `accountName`, it now reads the display name; the story steps below follow.

- [ ] **Step 3: The stories**

- `reference-views.spec.ts:22-23,81-84`: `'Risk · Robert Johnson · Individual (…3847)'` and `'Attribution · Robert Johnson · Individual (…3847)'` (both the scene titles and `goTo`).
- `readme-path.spec.ts:62`, `compliance-review.spec.ts:181`, `phone.spec.ts:107`: the link `/^Robert Johnson · Individual \(…3847\)/`; `phone.spec.ts:108` and `shell.spec.ts:158` the heading `'Robert Johnson · Individual (…3847)'`.
- `takeToTeamThread`'s row label "Patel Digital Assets Account" (now `shareToTeamThread`): the button's name is built from the row's label; if the row label became the display name, pass the display name (`rg -n "Patel Digital Assets" e2e-visual`).

- [ ] **Step 4: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/reference-views.spec.ts e2e-visual/dialogs.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: account headings, Related records links, Book risk, Blotter, Reconciliation and Mark's orders read "Owner · Type (…last 4)"; tables still fit at 1440 px and the phone scene does not scroll sideways (the reflow spec checks it). Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(accounts): people read an account as owner, type and last four digits; claims and titles keep its name

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The README, its path, every check, and the preview

The README's words follow the app's, its path includes the suitability reason, and `readme-path.spec.ts` performs it click for click. Then everything runs. The controller refreshes the preview and pushes; the implementer does neither.

**Files:**
- Modify: `README.md`, `e2e-visual/readme-path.spec.ts`

**Interfaces:**
- Consumes: every earlier task; `HOME_STEPS` (the README and the home page say the same eight things); the helpers in `e2e-visual/workspace-steps.ts` (`shareFindingTo`, `shareToTeamThread`, `approve`, `SUITABILITY_REASON`, `holdTheMeeting`, `advanceTo`, `recordTheCoffee`, `reviseToTwoTaxYears`).
- Produces: the README.

- [ ] **Step 1: The README**

In `README.md`:
- Line 5: "…and every binding step is a recorded act." → "…and every step that counts is a recorded act." "the demo's clock is frozen at Wednesday 25 February 2026" → "the demo's clock starts at Wednesday 25 February 2026 and only the presenter moves it."
- Step 1: add "The second decision is Growth sitting above Robert Johnson's Moderate tolerance."
- Step 2: "choose **Take to** › **Johnson Rebalance Review**" → "choose **Share to** › **Johnson Rebalance Review**". The last bullet becomes: "In the approval panel tick **I reviewed every leg of v3 and its pre-trade check results.**, set **Suitability reason** to **The IPS permits a growth allocation for this account** (the pre-trade check warns that Growth sits above Robert's tolerance), and choose **Approve v3**. The orders wait for compliance: **Pending compliance release**."
- Step 4: title "The blotter and the updated holdings"; "then **Robert Johnson Individual** in the context column" → "then **Robert Johnson · Individual (…3847)** under **Related records**"; add "Growth's line has moved under **Context**: the approval recorded its reason."
- Step 5: "choose **Hold the meeting** and **Hold the meeting** again in its dialog" → "choose **Demo · hold the meeting** and **Hold the meeting** in its dialog"; the recap: "…**Ask Client Letter Agent for the recap** and **Send to Robert**. It greets Robert and Patricia."
- Step 6: "**Advance to her reply · Thu 26 Feb 09:10 ET**" → "**Demo · skip to her reply · Thu 26 Feb 09:10 ET**"; "set **Staged sale of the concentrated stock**" → "set **Phased sale of the concentrated stock**"; "her 403(b) rollover is only asked about, comparison to follow" → "her 403(b) rollover is only asked about, with a comparison to follow"; "**Advance to her acceptance · Mon 2 Mar 10:00 ET**" → "**Demo · skip to her acceptance · Mon 2 Mar 10:00 ET**".
- Step 7: "Under **Reference** in the thread list" → "Under **Reports** in the thread list"; "**Take Patel Digital Assets Account to a team thread**" → "**Share Patel Digital Assets Account to a team thread**" (with the row label as Task 13 left it).
- Step 8: "He sees one thread, his own: …" → "His header reads Larkfield Advisory and his name. He sees one conversation, his own, titled **Your conversation with Larkfield**, which tells him the Larkfield team reads it and compliance reviews it: his question, the recap and its record, and nothing of the firm's work."
- "What it enforces", **Who can see what**: add "Every thread says who reads it in names, under its title and in its band: Just you, the Larkfield team (naming the clients who can't see it), or the client by name; a client is told that compliance reviews their messages (`src/workspace/people/visibility-words.ts`, `src/workspace/people/roster.ts`)."
- New bullet after **Separation of duties**: "- **Suitability caught, and recorded.** A proposal whose model sits in a riskier band than the client's tolerance carries a pre-trade warning; approving it needs a suitability reason, recorded on the approval, shown to compliance and in the Archive, and it settles the Brief's line (`src/mocks/workspace/suitability.ts`, `src/mocks/workspace/proposal-acts.ts`)."
- **Agents' claims carry no digits.**: "…so no number is typed twice. A claim may say one of its own figures as the kit writes it ("in 2031, at age 73"); any other digit fails the guard (`src/test/claim-digits.ts`)."
- New bullet: "- **Plain words, guarded.** Words the app retired (the old visibility labels, "binding", "Take to", "carried", "Thread context", "Full views", "MAY NOT") fail a test if they come back into anything a person reads (`src/__tests__/guardrails/retired-words.test.ts`)."
- **One clock.** "UTC appears only in a record slip, labeled, beside its fingerprint" → "UTC appears only in a record slip's Audit details, labeled, beside its fingerprint".

Check each bold control name against the app (the spec in Step 2 clicks it) and `ls` every image path the README names.

- [ ] **Step 2: The spec performs it**

`e2e-visual/readme-path.spec.ts` (the numbered comments are the README's steps):
- Step 1, after the Intel check: `await expect(page.getByRole('region', { name: 'Needs a decision' })).toContainText("Growth sits above Robert Johnson's Moderate tolerance")`.
- Step 2: `shareFindingTo(intc, 'Johnson Rebalance Review')`; after `await approve(page, 3)`: `await expect(context(page).getByRole('region', { name: 'Audit trail' })).toContainText(\`Suitability reason · ${SUITABILITY_REASON}\`)`.
- Step 4: the account link `/^Robert Johnson · Individual \(…3847\)/`; at the Brief, `await expect(page.getByRole('region', { name: 'Needs a decision' })).not.toContainText('Growth sits above')` and `await expect(page.getByRole('region', { name: 'Context' })).toContainText("Growth sits above Robert Johnson's Moderate tolerance")`.
- Step 5: after the recap is sent, `await expect(conversation(page)).toContainText('Dear Robert and Patricia,')`.
- Step 7: the comment says Reports; `shareToTeamThread`.
- Step 8: `await expect(page.getByRole('banner')).toContainText('Larkfield Advisory')`, `await expect(threads).toHaveAccessibleName('Your conversation with Larkfield')`, and `await expect(page.getByLabel('Who can see')).toContainText('Larkfield compliance (review)')`.
- Every `home()` in the spec still clicks the banner's `Advisor Desktop` link (Adrian is the viewer until step 8).

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/readme-path.spec.ts`
Expected: PASS. Where it fails, the app, the locator or the order is wrong: fix the app or the locator, or change the order in both the README and the spec; never loosen an assertion.

- [ ] **Step 3: Everything**

```bash
git status --short                       # only this task's files
pnpm vitest run --testTimeout 30000
TZ=Asia/Tokyo pnpm vitest run src/kit src/mocks/workspace --testTimeout 30000
pnpm lint && pnpm type-check && pnpm build
pnpm dlx knip@6.39.0 --no-progress       # no output
VISUAL_PORT=5195 pnpm visual             # every scene, axe on each, the stories, the README path
git status --short e2e-visual/__baselines__   # empty: nothing moved in this task
ls e2e-visual/__baselines__ | wc -l           # 60: the 59 at f0e331b plus adrian-robert-thread-light
```

Expected: all green. Confirm the guard: `pnpm vitest run src/__tests__/guardrails/retired-words.test.ts` lists all seven words as retired and passing, none "still in use". Record the suite counts in the report.

- [ ] **Step 4: Commit**

```bash
git add README.md e2e-visual/readme-path.spec.ts
git commit -m "docs(readme): the five-minute path in plain words, with the suitability reason; the README spec performs it

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: The preview and the push (controller only)**

```bash
pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-9 --message "workspace phase 9: advisor clarity"
git checkout -- wrangler.jsonc 2>/dev/null; git status --short    # empty
git push origin workspace
```

Open `https://workspace-advisor-desktop.joel-e-lewis.workers.dev/`, `/t/th-brief`, `/t/th-robert` and, with View as Robert Johnson · Client, `/t/th-robert` again, and check: the home date line and steps; the Brief's three decisions with Growth second; Robert's thread as Adrian with the filled band and the **Send to Robert** composer; as Robert, the Larkfield Advisory header, his name, "Your conversation with Larkfield" and the compliance sentence. Record the version id wrangler printed.

---

## Self-review notes (for the executor)

- **Spec coverage.** §1 Who sees what → Task 2 (group names, band words naming people, the legend and old words gone, the tint token that passes contrast), Task 3 (the roster under the title; outsiders' compliance sentence, roster line, header and title; the boundary unchanged), Task 4 (the client composer's label and Send, the drafts panel's naming, "Post to the team"). §2 Plain vocabulary → Task 5 (the swap table; reading, moved book and the engine removed), Task 6 ("binding" retired, records and sign-offs, Dr. Pell's acceptance, Audit details on the slip and the archive row, none for outsiders), Task 13 (account names). §3 The suitability catch → Task 7 (the check kind, the bands from `bandFor` and the risk score, a warning in words with kit figures, the Pre-trade Check's digit-free claim, the Brief's line), Task 8 (the reason list and note, refusal without one, recorded on the act, the approval record, the slip, the archive and Mark's evidence; the Brief line settled; the best-interest record pinned as never needing it; agents flag, only the advisor approves, compliance sees the reason). §4 Client letters → Task 9. §5 Copy pass → Task 12 (home steps, demo devices, the date line), Task 11 (wash-sale phrase and pane, "staged" split, single-fund, Closed today, Remove, Conversation, Est. additional tax), Task 10 (digit-free contortions and the guard), Task 5 (agent scope grammar). Testing → each task's unit tests; the guard from Task 1, switched on in Tasks 2, 5 and 6; baselines per the table; README and its spec in Task 14.
- **Spec decisions made explicit** are listed before the coverage table (address names, the composer's Send, the first clear day, the check on proposals only, the Brief line grouped on read, the best-interest record, account names' reach, the side-column labels, an outsider's list and title).
- **Names across tasks.** `RETIRED_WORDS`, `userFacingStrings`, `retiredWordHits` (1); `FIRM_SHORT_NAME`, `ThreadAudience`, `ThreadDetail.audience`, `audienceOf`, `THREAD_GROUP_TITLE`, `JUST_YOU`, `OUTSIDER_BAND`, `teamWords`, `partyWords`, `bandWordsOf`, `rowWordsOf`, `VisibilityBand({ visibility, words, scale })`, `--ws-shared`/`bg-shared` (2); `rosterOf`, `threadTitleFor`, `OUTSIDER_THREAD_TITLE`, `brandOf`, `Brand`, `ThreadAgents` (3); `ComposerMode` (`draft` with `partyName`, `addressName`, `canSend`), `useSaveAndSend`, `NotSentError` (4); `shareFindingTo`, `shareToTeamThread`, `context()` = Details (5); `RECORD_KIND_LABEL`, `SIGN_OFFS`, `RecordSlip.audit` (6); `ToleranceGap`, `modelAboveTolerance`, `toleranceViolation`, `withSuitability`, `needsSuitabilityReason`, `ProposalViolation.tolerance`, `BriefTopic` `model_above_tolerance`, `BriefItem.awaitsApprovalOf` (7); `SUITABILITY_REASONS`, `SuitabilityReasonId`, `SuitabilityReason`, `SUITABILITY_NOTE_MAX`, `isSuitabilityReasonId`, `suitabilityLine`, `BindingAct.suitability`, `ApprovalRecord.suitability`, `suitablyApprovedAccounts`, `settleApproved`, `BriefSummary`, `approveBlocker({ …, reasonMissing })`, `JOHNSON_REASON`, `reasonFor`, `SUITABILITY_REASON` (e2e) (8); `dayAfter`, `RecapInput.greetingNames`, `buildClientRateDisclosure(basis, { collectibles })` (9); `fmtYear`, `FigureUnit` `'year'`, `formatFigure`/`figureText` in `src/kit/figure-text.ts`, `handTypedDigits` (10); `firstClearDay`, `dontRepurchaseUntil` (11); `HOME_STEPS`, `JUMP_LABEL` (12); `accountDisplayName` (13).
- **Counted fixtures.** Seed ids (`th-brief`, `th-johnson-review`, `th-johnson-meeting`, `th-robert`, `th-pell`, `th-pell-work`, `acc-002`, `cli-001`, `cli-002`, `prsp-011`, `evt-010`) and act ids assume a fresh store per test, which `src/test/setup.ts` resets after each. The Johnson account `acc-002` is on Growth (`mod-002`, the Moderate Aggressive band's model); Robert's score 55 is the top of Moderate (41–55).
