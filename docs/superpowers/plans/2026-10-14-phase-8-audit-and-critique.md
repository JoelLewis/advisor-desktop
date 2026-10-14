# Phase 8: The Audit and the Critique Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the workspace read as a plan for the advisor's day — quiet where it can be, loud where it matters — and usable from a keyboard, a screen reader and a phone, closing or explicitly parking every finding of the 14 October audit and critique.

**Architecture:** The Brief's grouping and its Today lines move into the engine (`src/mocks/workspace/brief-groups.ts`, `brief-today.ts`), so the rules live in one tested place and the UI only renders them; Today is composed on every read of the Brief, while the decide/context summary is still composed with the findings and re-measured after fills. Cross-cutting fixes are kit-level, once: one Eastern-time stamp formatter, one announcer, one pending button, one shortcut setting, one document-title hook, one DataTable. The phone shell and the load work come last, after every desk screen is settled, so their new baselines are taken once.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4 tokens, TanStack Query 5, React Router 6 (v7 future flags), MSW 2 as the server, Vitest 4 + Testing Library, Playwright visual baselines, `@axe-core/playwright` 4.13.0 (this phase's one new dev dependency), knip 6.39.0 via `pnpm dlx`, wrangler 4.

**Spec:** `docs/superpowers/specs/2026-10-14-phase-8-audit-and-critique-design.md` (binding). Its inputs, with file:line evidence for every finding: `docs/audits/2026-10-14-workspace-audit.md` and `docs/audits/2026-10-14-workspace-critique.md`.

## Global Constraints

- Work only on branch `workspace`, base `308cda9` (`git log --oneline -1` before starting; report BLOCKED if a prerequisite task's commit is missing). Nothing is committed to `main`; `main` waits for the user's approval of the branch and is out of scope. Implementers never push; the controller pushes `workspace`.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums (`as const` arrays and unions); ESM; no barrel files. `.tsx` files export only components; helpers, words and types go in `.ts` siblings. Errors are explicit types or `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks (`?? ''` on a value that must exist is a silent fallback). The two existing storage `catch` blocks in `src/kit/theme.ts` are the model for storage that may be blocked: catch, fall back to the default, and say so in a comment.
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`), `pnpm type-check`, `pnpm build` and `pnpm dlx knip@6.39.0 --no-progress` (no output). A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. `tsconfig.tsbuildinfo` is untracked: never add it. Restore `wrangler.jsonc` with `git checkout -- wrangler.jsonc` if a tool modifies it. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`, `threshold: 0`). Regenerate only the specs whose baselines the task changes (`VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/<spec>.spec.ts`); then `git status --short e2e-visual/__baselines__` lists what moved, and the implementer opens every listed PNG with the Read tool and looks at it before committing. A PNG that moved outside the task's "Baselines" list is a bug in the task (or the list is wrong): stop and say which in the report. A listed PNG that did not move is fine; say so.
- From Task 1 on, every visual scene runs axe (`expectNoAxeViolations` in `e2e-visual/axe.ts`) and any violation fails the run. A task never disables a rule to make a scene pass.
- Dependencies: the phase adds exactly one, `@axe-core/playwright@4.13.0` (dev, exact pin, published 2026-08-11), in Task 1. Nothing else is added. `pnpm dlx knip@6.39.0` stays a `dlx` tool, not a dependency.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`), which is **07:00 ET**. Never read the live clock in `src/mocks` (banned by test). The presenter's jumps move the session clock to Thu 26 Feb and Mon 2 Mar; fills are priced only in the 25 Feb session.
- One clock (Task 2 onward): every human-facing time is Eastern Time through `fmtEasternStamp` ("25 Feb 07:00 ET"; "07:00 ET" in a same-day context). UTC appears only in a record slip's details, labeled "UTC", next to its fingerprint (`fmtUtcStamp`, imported by `src/kit/record-slip/RecordSlip.tsx` only).
- US spelling in all copy, identifiers and comments ("modeled", "realized", "canceled", "color", "labeled", "analyze").
- Agent claims contain no digits; every figure travels as a `Figure` and is formatted by the kit (`formatFigure`, `src/kit/measure.ts`). The Brief's engine-written lines (Task 3) are digit-free too, and a count in UI copy goes through `fmtQuantity`.
- Domain copy: a rollover is only "asked about; comparison to follow"; tax items say "estimate; consult your tax professional"; no Reg BI framing (the firm is **Larkfield Advisory**, a fictional SEC-registered investment adviser); disclosure timing is labeled firm policy.
- No real person's name for any demo person. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002`, Mike Chen `user-003`, Mark Davis `cco-001`, Robert Johnson `cli-001`, Patricia Johnson `cli-002`, Dr. Amanda Pell `prsp-011`.
- Production UI never imports values from `src/mocks` (`import type` is allowed); `src/__tests__/guardrails/mocks-boundary.test.ts` stays green. UI copy that names engine facts reads them over the API.
- Every in-app path literal matches a route (`src/__tests__/guardrails/route-links.test.ts`); every service request has a handler and every handler a caller (`api-routes.test.ts`). A new endpoint (Task 8) gets its service function and hook in the same task.
- Commit messages end with the trailer naming the model that wrote the commit: `Co-Authored-By: Claude <model name> <noreply@anthropic.com>` (Sonnet implementers: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; the controller: `Claude Opus 5.5`).
- Preview deploy (Task 22 only): `pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag <tag> --message "<msg>"` → `https://workspace-advisor-desktop.joel-e-lewis.workers.dev`. No production deploy in this phase.

## Review Focus

1. **The Brief after the presenter's clock jumps.** After "Advance to her reply · Thu 26 Feb 09:10 ET" the session day is 26 Feb: Today must date the meeting line ("25 Feb 14:00–15:15 ET · filed"), not show a bare "14:00" that reads as tomorrow's, and the coffee line must be gone because the coffee is recorded. Test: Task 4, `brief-thread.test.tsx` "dates a line that is not on the session's day" (with the engine side in `brief-today.test.ts`).
2. **Compliance returns the orders instead of releasing them.** `returnToAdvisor` withdraws the approval; the staged orders no longer await anyone, so the release line must leave Today, and an escalation (orders still held) must keep it. Test: Task 4, `brief-today.test.ts` "the release line leaves on a return and stays through an escalation".
3. **The Context group across a refetch.** Every write invalidates the whole workspace, so the Brief refetches while someone reads it; an opened Context group must stay open, and a closed one closed. Test: Task 3, `brief-thread.test.tsx` "the Context group keeps its open state across a refetch".
4. **Single-key shortcuts off, on the workbench.** Turning the setting off must not take away the focus-scoped row keys (`x`, `j`, `k`, Enter on a focused leg) or ⌘S/Ctrl+S, which WCAG 2.1.4 does not cover; only the page-wide character keys stop. Test: Task 12, `workbench-edit.test.tsx` "with single-key shortcuts off, the focused leg's x still excludes it and Ctrl+S still saves".
5. **Storage blocked (a private window or a policy).** The shortcut setting and the inline theme script must fall back to their defaults (shortcuts on; the system theme or `?theme`) without throwing and without a blank page. Tests: Task 12, `single-keys.test.ts` "reads on when storage throws"; Task 17, `theme-boot.test.ts` "falls back when storage throws".

---

## Finding coverage

Every audit finding and critique item, with the task that closes it or the reason it is parked (reasons from the spec's "Parked" section unless marked *plan*).

| ID | Finding | Task |
|---|---|---|
| C1 | Single-key shortcuts cannot be turned off | 12 |
| H1 | Dialogs have no max height; the command line opens off-screen | 13 |
| H2 | Focus drops to `<body>` when an action disables itself | 14 |
| H3 | One document title for every route | 15 |
| H4 | Flash of the wrong theme on load | 17 |
| H5 | Mobile layout shift 0.89 | 21 (thread-list skeleton, static shell); 12 (the key legend's fixed set); measured in 22 |
| H6 | On a phone the thread list comes before the work | 20 |
| H7 | The home screen wastes the first impression | 8 |
| M1 | Agent posts, fills and posts are not announced | 7 |
| M2 | Workbench grid hides state and keys | 16 |
| M3 | Large readouts overflow narrow screens | 18 |
| M4 | The workbench scrolls sideways on phones | 18 |
| M5 | Source chips clip the wash-sale dates at 320 px | 18 |
| M6 | Key legend and header fill a quarter of a phone | 20 (legend hidden under `hover: none`); 12 (legend shrinks) |
| M7 | Touch targets under 44 px | 20 (44 px under `pointer: coarse`); 16 and 20 (24 px floor) |
| M8 | Fixed-px type scale; 14 px selects | 19 |
| M9 | Serial cold-load chain | 21 |
| M10 | View-as redirect with no explanation | 9 |
| M11 | Command-line options ignore the pointer | 13 |
| L1 | Blotter filter overflows at 320 px | 18 |
| L2 | Selects clip at 200% text zoom | 18 |
| L3 | Read-only tables add Tab stops | 16 |
| L4 | Skip link jumps past the h1 | 15 |
| L5 | No scroll cue or sticky first column | 18 |
| L6 | Context column drops below main at 1024 px | 19 |
| L7 | Every route bundled eagerly | 21 |
| L8 | DataTable rows not memoized | 16 |
| L9 | "Theme: system" never says what it resolved to; no cross-tab sync | 17 |
| L10 | Favicon not theme-aware; `public/` outside the guardrail | 17 |
| L11 | Duplicated dark token block; light scrim duplicates ink | 17 (scrim aliases ink). The duplicated block is **parked**: CSS cannot share one rule between a media query and an attribute selector; the drift test stays |
| L12 | Deep links to session state show "not found" | 9 (the "resets on reload" empty state). Persisting the engine is **parked**: out of scope |
| Critique 1 | The Brief is a list of measurements, not a plan for the day | 3 (Needs a decision · Context), 4 (Today) |
| Critique 2 | Repetition flattens every card | 5 (agent posts), 6 (thread list, note lines, type), 12 (header) |
| Critique 3 | Long screens with no shape | 10 (workbench drift), 11 (meeting order) |
| Critique 4 | The home page and empty states don't teach | 8, 9 |
| Critique 5 | Two clocks | 2 |
| Minor: small caps everywhere | | 6 |
| Minor: underlined link prose in the Brief | | 3 (only the action is underlined) |
| Minor: header weight | | 12 |
| Minor: key legend in the header | | 12 |
| Minor: "Intl Equity", "Emerging Mkts" | | 6 |
| Minor: two Intel lines | | 3 |
| Minor: the "8 / 10" readouts on Book risk | | 6 |
| Minor: dark mode's inverted primary buttons glare | | **Parked** (*plan*): not taken into the spec; correct by token, and an outlined primary moves every dark baseline |
| Critique: tax effect beside the legs at 1440 | | **Parked** (*plan*): the spec's §5 takes only the drift table |
| Critique questions (context column calendar, one moment of motion) | | **Not adopted** (*plan*): questions, not findings; Today answers the first in the main column |
| Spec parked: `/kit` shows the advisor's data whoever the viewer is | | **Parked**: `/kit` is a component gallery, not a viewer surface |

## Spec decisions this plan makes explicit

- **The sheet's modifier route is Ctrl/⌘+/, not Shift+?.** `?` is itself Shift+/ on a US keyboard, so "Shift+?" is a printable character key that WCAG 2.1.4 treats as a single-key shortcut, and it could not do something while `?` does nothing. The command line's route is Ctrl/⌘+K as the spec says. (Task 12.)
- **The Intel item's group.** The spec puts the harvest of the remaining shares in Needs a decision and also describes the two Intel findings as one item. The engine groups findings about the same security into one item, and the item sits in Needs a decision while any of its readings needs one, otherwise in Context. In the morning the Intel item is decision 2 with two readings (remaining shares, loss allowed now; sold recently); after the release sells the shares, its readings are both realized losses and it moves to Context. (Task 3.)
- **Eight steps, seven rules.** Steps 2 (approval), 3 (release), 5 (meeting filed and recap sent), 6 (proposal sent and accepted) and 7 (break resolved) carry the spec's rules. Steps 1 (the Brief) and 4 (the blotter) are reading steps: each is done once a later step is done. Step 8 (View as Robert) is never marked done; it is "Next" once step 7 is done. (Task 8.)
- **Counts in announcements use the kit's digits** ("Released by Mark Davis; 9 orders filled", "INTC excluded · 8 of 9 legs in the draft"), not the spec's spelled-out examples, under the rule that figures are formatted by the kit. (Tasks 7, 16.)
- **Which caps stay.** "Status codes" are the kit's `StatusCode` and `Tag` marks (FILLED, OUT, PENDING COMPLIANCE REVIEW) and keep caps; "section labels" are pane titles and `SidePanel` labels. Table column headers, the role word beside an author ("Agent", "Advisor"), the thread-list legend and figure labels become sentence case. (Task 6.)
- **Phone tab bar on full-width routes.** Routes that hide the thread list (reference views, the workbench, the meeting view) show only Thread and, where the route has one, Context. (Task 20.)
- **The shell spec's 1024 px layout assertion flips with L6.** At 1024 px the three panes sit side by side once the split starts at 960 px; Task 19 rewrites the two "context column under the thread at 1024px" assertions to check three panes, and adds the old assertion at 900 px.

## Task order and shared files

| Task | Depends on | Shares files with |
|---|---|---|
| 1 axe in the visual suite | — | every `e2e-visual/*.spec.ts`, `package.json`, `pnpm-lock.yaml` |
| 2 One clock | 1 | `src/kit/measure.ts`, `RecordSlip.tsx`, `SourceChips.tsx`, ~35 stamp callsites (Step 4's table), `CompactMessage.tsx` |
| 3 Brief: Needs a decision and Context | 2 | `src/types/workspace.ts`, `brief.ts`, `brief-remeasure.ts`, `drift-monitor.ts`, `harvest-scanner.ts`, `registry.ts`, `BriefSummaryView.tsx`, `CompactMessage.tsx`, `brief-thread.test.tsx`, `rebalance-job.spec.ts`, `compliance-review.spec.ts`, `readme-path.spec.ts` |
| 4 Brief: Today | 3 | `src/types/workspace.ts`, `workspace-seed.ts`, `workspace-store.ts`, `handlers/workspace.ts`, `brief-remeasure.ts`, `MessageView.tsx`, `CompactMessage.tsx`, `readme-path.spec.ts`, `meeting-review.spec.ts`, `prospect-proposal.spec.ts`, `reference-views.spec.ts` |
| 5 Quieter agent posts | 4 | `AgentFindingView.tsx`, `SourceChips.tsx`, `CarryControl.tsx`, `carry-targets.ts`, `brief-thread.test.tsx`, `readme-path.spec.ts`, `rebalance-job.spec.ts` |
| 6 Quieter shell and type | 5 | `ThreadList.tsx`, `VisibilityBand.tsx`, `NotesEditor.tsx`, `DataTable.tsx`, `MessageView.tsx`, `lib/labels.ts`, `BookRiskPage.tsx` |
| 7 The announcer | 6 | `RootLayout.tsx`, `src/test/render.tsx`, `AskAgents.tsx`, `ProposalAgentControl.tsx`, `ApprovalPanel.tsx`, `ConfirmRecord.tsx`, `Composer.tsx`, `DraftBar.tsx` |
| 8 Home as the five-minute path | 7 | `WorkspaceHome.tsx`, `handlers/workspace.ts`, `services/workspace.ts`, `hooks/use-workspace.ts`, `shell.spec.ts` |
| 9 Empty states and the View-as redirect | 8 | `use-go-home-when-hidden.ts` and its 8 callers, `WorkspaceHome.tsx`, `FullViewNotFound.tsx`, `SupervisionQueue.tsx`, `SupervisionPage.tsx`, `ArchiveTable.tsx` |
| 10 Workbench drift as one table | 6 | `DriftComparison.tsx`, `kit/gauge/Gauge.tsx`, `WorkbenchSummary.tsx` |
| 11 Meeting view order | 9 | `MeetingPage.tsx` |
| 12 Single-key shortcuts and the header | 7 | `KeyboardProvider.tsx`, `keyboard-context.ts`, `KeySheet.tsx`, `KeyLegend.tsx`, `ThemeToggle.tsx`, `WorkspaceShell.tsx`, `KitPage.tsx` |
| 13 Dialogs and the command line | 12 | `Dialog.tsx`, `CommandLine.tsx`, new `dialogs.spec.ts` |
| 14 The pending button and focus | 13 | `Button.tsx`, `button-variants.ts`, `AskAgents.tsx`, `ProposalAgentControl.tsx`, `Composer.tsx`, `TextInput.tsx`, `LetterControl.tsx`, `ConfirmRecord.tsx`, `hooks/use-workspace.ts` |
| 15 Titles and the skip link | 14 | `RootLayout.tsx`, `Page.tsx` |
| 16 DataTable semantics | 15 | `DataTable.tsx`, `types.ts`, `WorkbenchLegs.tsx`, `Workbench.tsx` |
| 17 Theme: first paint, label, favicon, tokens | 16 | `index.html`, `main.tsx`, `theme.ts`, `ThemeToggle.tsx`, `public/favicon.svg`, `app.css`, guardrails |
| 18 Reflow | 17 | `Reading.tsx`, `DataTable.tsx`, `SourceChips.tsx`, `Select.tsx`, `BlotterPage.tsx`, `app.css` |
| 19 rem type scale and the 960 px split | 18 | `app.css`, `source.test.ts`, `detectors.ts`, `shell.spec.ts`, `rebalance-job.spec.ts` |
| 20 Phone shell | 19 | `WorkspaceShell.tsx`, `app.css`, `button-variants.ts`, `DataTable.tsx`, `layout-checks.ts`, `workspace-steps.ts`, `dialogs.spec.ts`, new `phone.spec.ts` |
| 21 Load | 20 | `ThreadList.tsx`, `index.html`, `main.tsx`, `vite.config.ts`, `routes.tsx` |
| 22 README, the whole suite, CLS, preview | all | `README.md`, `readme-path.spec.ts`, `package.json`, new `scripts/measure-cls.mjs` |

Serial in one checkout (recommended): nearly every task moves shared baselines, and Tasks 3–7 and 12–21 each touch a file the next one does. No two tasks run in parallel.

## Baselines by task

49 baselines exist at `308cda9` (`e2e-visual/__baselines__/`). "Header scenes" means every baseline except `kit-light`, `kit-dark` and `not-found-light`.

| Task | Changes | Must not change | New |
|---|---|---|---|
| 1 | none | all | — |
| 2 | every baseline that shows a stamp: all except the three below | `home-light`, `home-dark`, `not-found-light` | — |
| 3 | `brief-light`, `brief-dark`, `brief-after-fills-light` | all others | — |
| 4 | `brief-light`, `brief-dark`, `brief-after-fills-light` | all others | — |
| 5 | scenes with an agent finding or source chips: `brief-*`, `brief-after-fills-light`, `adrian-johnson-finding-*`, `proposal-thread-*`, `thread-after-release-light`, `meeting-thread-light`, `meeting-before-*`, `meeting-after-*`, `pell-work-light`, `pell-onboarding-light`, `kit-*` | `home-*`, `not-found-light`, `supervision-*`, `archive-light` | — |
| 6 | all except `not-found-light` | `not-found-light` | — |
| 7 | none | all | — |
| 8 | `home-light`, `home-dark` | all others | `home-mid-story-light` |
| 9 | `supervision-light`, `supervision-dark` if their queues show an empty group; nothing else | all others | `proposal-reset-light` |
| 10 | `workbench-light`, `workbench-dark` | all others | — |
| 11 | `meeting-before-*`, `meeting-after-*` | all others | — |
| 12 | header scenes, `kit-*` | `not-found-light` | `key-sheet-light` |
| 13 | none | all | `command-line-1440x600-light`, `resolve-dialog-320-light` |
| 14 | none | all | — |
| 15 | `not-found-light`, `kit-*` only if the header-in-main move shifts a pixel | all others | — |
| 16 | none | all | — |
| 17 | header scenes only if the theme label's words change width (they read "Light"/"Dark" under `?theme`) | all others | — |
| 18 | none at 1440 px (the clamps resolve to today's sizes) | all | — |
| 19 | none (same px at the default root size) | all | — |
| 20 | nearly all at 1440 px: the 24 px floor raises quiet buttons and sort buttons | `not-found-light` | `phone-home-light`, `phone-brief-light`, `phone-thread-light`, `phone-context-light`, `phone-risk-book-light` |
| 21 | none | all | — |
| 22 | none | all | — |

---

### Task 1: axe in the visual suite

Every scene that takes a baseline also runs axe, from this task on. The audit found zero violations with axe-core 4.13 over 50 scans, so the suite starts green; a violation in any later task fails that task's visual run.

**Files:**
- Create: `e2e-visual/axe.ts`
- Modify: `package.json`, `pnpm-lock.yaml` (`pnpm add`), `e2e-visual/shell.spec.ts`, `e2e-visual/rebalance-job.spec.ts`, `e2e-visual/compliance-review.spec.ts`, `e2e-visual/meeting-review.spec.ts`, `e2e-visual/prospect-proposal.spec.ts`, `e2e-visual/reference-views.spec.ts`, `e2e-visual/kit.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `expectNoAxeViolations(page: Page): Promise<void>` in `e2e-visual/axe.ts`. Every later task's new scene calls it right after its `toHaveScreenshot`.

- [ ] **Step 1: Confirm the version, then add it**

Run: `pnpm view @axe-core/playwright@4.13.0 version time.4.13.0 dependencies`
Expected: `4.13.0`, published `2026-08-11…`, depending on `axe-core ~4.13.0`. Then:

```bash
pnpm add -D -E @axe-core/playwright@4.13.0
grep -n '"@axe-core/playwright"' package.json   # "4.13.0", no caret
```

- [ ] **Step 2: The helper**

Create `e2e-visual/axe.ts`:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** The WCAG 2.0–2.2 A and AA rules, as the 14 October audit ran them. No rule is ever disabled to make a scene pass. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const found = violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact ?? 'no impact'}): ${n.target.join(' ')}`))
  expect(found, 'axe violations').toEqual([])
}
```

- [ ] **Step 3: Run it in every scene**

In each spec's per-scene `'baseline at 1440px'` test (and `kit.spec.ts`'s `kit baseline · ${theme}`), add one line after the `toHaveScreenshot` assertion:

```ts
      await expectNoAxeViolations(page)
```

with `import { expectNoAxeViolations } from './axe'` at the top. The specs and their scene loops: `shell.spec.ts` (`for (const scene of SCENES)`), `rebalance-job.spec.ts` (same), `compliance-review.spec.ts`, `meeting-review.spec.ts`, `prospect-proposal.spec.ts`, `reference-views.spec.ts` (each has one `toHaveScreenshot` per scene; `grep -n toHaveScreenshot e2e-visual/*.spec.ts` lists them), and `kit.spec.ts`. The service-worker-blocked test in `shell.spec.ts` also gets it after its last assertion (the "demo could not start" page must be accessible too).

- [ ] **Step 4: Run the suite**

Run: `VISUAL_PORT=5195 pnpm visual`
Expected: PASS, no PNG moves (`git status --short e2e-visual/__baselines__` is empty). If axe reports a violation, stop and report it with its rule id and target: the audit found none, so a violation means the scene differs from the audited build, and the fix is the controller's call.

- [ ] **Step 5: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`
Expected: PASS; knip prints nothing (it sees `@axe-core/playwright` used by `e2e-visual/axe.ts`).

```bash
git add package.json pnpm-lock.yaml e2e-visual
git commit -m "test(a11y): axe runs on every visual scene; any WCAG A or AA violation fails the run

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 2: One clock (critique 5)

Every human-facing time reads in Eastern Time with its zone. UTC stays only in the record slip, labeled, next to the fingerprint.

**Files:**
- Modify: `src/kit/measure.ts`, `src/kit/record-slip/RecordSlip.tsx`, `src/kit/stamp/Stamp.tsx`, `src/kit/record-trail/RecordTrail.tsx`, `src/kit/source-chips/SourceChips.tsx`, and every callsite in Step 4's table
- Test: `src/kit/__tests__/measure.test.ts`, `src/kit/__tests__/RecordSlip.test.tsx`, `src/kit/__tests__/RecordTrail.test.tsx`, `src/kit/__tests__/SourceChips.test.tsx`, `src/kit/__tests__/Stamp.test.tsx`, `src/workspace/__tests__/fills-view.test.tsx`, `src/workspace/__tests__/thread.test.tsx`, new `src/__tests__/guardrails/one-clock.test.ts`

**Interfaces:**
- Consumes: `parseIso`, `partOf`, `monthAbbreviation`, `MeasureError` (all in `src/kit/measure.ts`).
- Produces: `fmtEasternStamp(iso: string, sameDayAs?: string): string` → `"25 Feb 07:00 ET"`, or `"07:00 ET"` when `iso` falls on the New York day of `sameDayAs`. `fmtUtcStamp(iso: string): string` → `"2026-02-25 12:00 UTC"` (the old `fmtTimestamp`, renamed; only `RecordSlip.tsx` imports it). `fmtTimestamp` no longer exists.

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/measure.test.ts` replace the `fmtTimestamp` describe with:

```ts
describe('fmtEasternStamp', () => {
  it('states the New York day and time with the zone', () => {
    expect(fmtEasternStamp('2026-02-25T12:00:00Z')).toBe('25 Feb 07:00 ET')
    expect(fmtEasternStamp('2026-02-25T19:00:00.000Z')).toBe('25 Feb 14:00 ET')
    expect(fmtEasternStamp('2026-03-02T15:00:00-05:00')).toBe('2 Mar 15:00 ET')
  })
  it('takes the New York date across UTC midnight', () => {
    expect(fmtEasternStamp('2026-02-26T03:30:00Z')).toBe('25 Feb 22:30 ET')
  })
  it('follows daylight saving time both ways', () => {
    expect(fmtEasternStamp('2026-03-08T06:30:00Z')).toBe('8 Mar 01:30 ET')
    expect(fmtEasternStamp('2026-03-08T07:30:00Z')).toBe('8 Mar 03:30 ET')
    expect(fmtEasternStamp('2026-11-01T05:30:00Z')).toBe('1 Nov 01:30 ET')
    expect(fmtEasternStamp('2026-11-01T06:30:00Z')).toBe('1 Nov 01:30 ET')
  })
  it('drops the date on the New York day it is compared with, and only then', () => {
    expect(fmtEasternStamp('2026-02-25T19:00:00Z', '2026-02-25T12:00:00Z')).toBe('14:00 ET')
    expect(fmtEasternStamp('2026-02-26T03:30:00Z', '2026-02-25T12:00:00Z')).toBe('22:30 ET')
    expect(fmtEasternStamp('2026-02-25T19:00:00Z', '2026-02-26T14:10:00Z')).toBe('25 Feb 14:00 ET')
  })
  it('refuses a time with no offset', () => {
    expect(() => fmtEasternStamp('2026-02-25T12:00:00')).toThrow(MeasureError)
  })
})

describe('fmtUtcStamp', () => {
  it('is the books-and-records time, labeled UTC', () => {
    expect(fmtUtcStamp('2026-02-25T07:00:00-05:00')).toBe('2026-02-25 12:00 UTC')
  })
})
```

(update the file's import line: `fmtEasternStamp`, `fmtUtcStamp` in, `fmtTimestamp` out).

Create `src/__tests__/guardrails/one-clock.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles, uiRoots } from './detectors'

const files = uiRoots().flatMap(listSourceFiles)
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** One clock: people read Eastern Time; UTC lives only in the record slip, next to the fingerprint. */
describe('one clock', () => {
  it.each(files.filter((f) => f !== 'src/kit/measure.ts' && f !== 'src/kit/record-slip/RecordSlip.tsx'))('%s never formats a UTC stamp', (f) => {
    expect(read(f)).not.toMatch(/\bfmtUtcStamp\b|\bfmtTimestamp\b/)
  })
  it('the record slip is the one place UTC is shown', () => {
    expect(read('src/kit/record-slip/RecordSlip.tsx')).toMatch(/\bfmtUtcStamp\b/)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/measure.test.ts src/__tests__/guardrails/one-clock.test.ts --testTimeout 30000`
Expected: FAIL — `fmtEasternStamp` and `fmtUtcStamp` are not exported; the guard lists every file in Step 4's table.

- [ ] **Step 3: The formatters**

In `src/kit/measure.ts`, replace `fmtTimestamp` with `fmtUtcStamp` (same body), and add after `fmtEasternDayTime`:

```ts
const easternStampParts = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York',
})

function easternParts(iso: string): { dayKey: string; day: string; month: number; time: string } {
  const parts = easternStampParts.formatToParts(parseIso(iso))
  const [year, month, day] = [partOf(parts, 'year'), Number(partOf(parts, 'month')), partOf(parts, 'day')]
  return { dayKey: `${year}-${month}-${day}`, day, month, time: `${partOf(parts, 'hour')}:${partOf(parts, 'minute')}` }
}

/**
 * A moment as people here read it, in New York time with the zone: "25 Feb 07:00 ET". Given `sameDayAs`,
 * a moment on that New York day drops its date: "07:00 ET". Deterministic in any machine zone; DST from the IANA zone.
 */
export function fmtEasternStamp(iso: string, sameDayAs?: string): string {
  const at = easternParts(iso)
  if (sameDayAs !== undefined && easternParts(sameDayAs).dayKey === at.dayKey) return `${at.time} ET`
  return `${at.day} ${monthAbbreviation(at.month)} ${at.time} ET`
}
```

and give `fmtUtcStamp` the doc comment `/** The record slip's books-and-records time, labeled UTC: "2026-02-25 12:00 UTC". Only the record slip shows it. */`.

- [ ] **Step 4: Every callsite**

`grep -rn "fmtTimestamp" src --include='*.ts' --include='*.tsx'` lists them (under zsh quote the globs). Each becomes `fmtEasternStamp`, except the record slip:

| File | Change |
|---|---|
| `src/kit/record-slip/RecordSlip.tsx` | `At` shows `fmtEasternStamp(at)`; add a row after it: `<dt className="uppercase text-ink-3">UTC</dt><dd className="tabular normal-case">{fmtUtcStamp(at)}</dd>` |
| `src/kit/stamp/Stamp.tsx`, `src/kit/record-trail/RecordTrail.tsx`, `src/kit/source-chips/SourceChips.tsx` (`as of …`) | `fmtEasternStamp` |
| `src/app/pages/kit/KitSections.tsx` | `fmtEasternStamp` |
| `src/workspace/thread/{MessageView,AgentFindingView,CarriedFindingView,DisclosureLine,NotesDraftedLine,MeetingTasksView,MeetingHeldLine,PartyStepLine,ProposalVersionLine,ProspectProposalVersionLine,AgendaVersionLine,ReferenceRowView,ProspectNoteView,FillsView}.tsx` | `fmtEasternStamp` (FillsView's message stamp and its "Time" column) |
| `src/workspace/workbench/{CompactMessage,Workbench}.tsx` | `fmtEasternStamp` |
| `src/workspace/context/DraftsPanel.tsx`, `src/workspace/drift/drift-meta.ts`, `src/workspace/proposal/FillList.tsx`, `src/workspace/full-views/HouseholdView.tsx`, `src/workspace/household/CommunicationsList.tsx`, `src/workspace/archive/ArchiveTable.tsx` | `fmtEasternStamp` |
| `src/workspace/supervision/{OrdersEvidence,AlertEvidence,CorrespondenceEvidence,SupervisionQueue}.tsx` | `fmtEasternStamp` |
| `src/workspace/reference/{PracticePage,AttributionPage,AccountRiskPage,ModelsPage,ModelPage,BookRiskPage,ReconciliationPage,BillingPage,BlotterPage}.tsx` | `fmtEasternStamp` |

`ArchiveTable.tsx` keeps `whitespace-nowrap` on its stamp. Nothing else in these files changes.

- [ ] **Step 5: The tests that read a stamp**

Run: `pnpm vitest run --testTimeout 30000`
Expected failures only in the files whose expectations quote a UTC stamp: `RecordSlip.test.tsx`, `RecordTrail.test.tsx`, `SourceChips.test.tsx`, `Stamp.test.tsx`, `fills-view.test.tsx`, `thread.test.tsx`; and `src/app/__tests__/routes.test.tsx`, which imports `fmtTimestamp` (it becomes `fmtEasternStamp`). In each, replace the quoted `"YYYY-MM-DD HH:MM UTC"` with its Eastern form (12:00 UTC → `25 Feb 07:00 ET`; the event clock adds a minute per sequence, so 12:05 UTC → `25 Feb 07:05 ET`). `RecordSlip.test.tsx` gains:

```ts
  it('shows the time in Eastern Time and keeps UTC beside it, labeled', () => {
    render(<RecordSlip kind="Approval" title="Approved v3" recordId="REC-0001" fingerprint="fp-1" recordedBy={{ name: 'Adrian Hale', role: 'Advisor' }} at="2026-02-25T12:07:00Z" archive="Archive" />)
    expect(screen.getByText('25 Feb 07:07 ET')).toBeInTheDocument()
    expect(screen.getByText('2026-02-25 12:07 UTC')).toBeInTheDocument()
  })
```

Then run the clock-dependent files under two other zones:

```bash
TZ=Asia/Tokyo pnpm vitest run src/kit/__tests__/measure.test.ts --testTimeout 30000
TZ=America/Los_Angeles pnpm vitest run src/kit/__tests__/measure.test.ts --testTimeout 30000
```

Expected: PASS in both.

- [ ] **Step 6: Baselines**

Run: `VISUAL_PORT=5195 pnpm visual`. Expected: every scene that shows a stamp fails on pixels and nothing else (the README path and the stories pass). Regenerate: `VISUAL_PORT=5195 pnpm visual:update` (every spec has a moved scene). `home-light`, `home-dark` and `not-found-light` must not appear in `git status --short e2e-visual/__baselines__`. Open each listed PNG: stamps read "25 Feb 07:00 ET"; a record slip shows both its ET time and its labeled UTC row.

- [ ] **Step 7: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(clock): every human-facing time in Eastern Time with its zone; UTC only in the record slip, labeled, beside the fingerprint

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 3: The Brief — Needs a decision and Context (critique 1, two Intel lines, underlined prose)

The engine tags each Brief finding with what it is about, classifies it as `decide` or `context` in one function, and groups findings about one security into one item. The summary becomes two groups: a numbered "Needs a decision" with each line's key figure, and a collapsed, quiet "Context". The finding cards below are unchanged.

**Files:**
- Create: `src/mocks/agents/brief-topic.ts`, `src/mocks/workspace/brief-groups.ts`, `src/mocks/workspace/__tests__/brief-groups.test.ts`
- Modify: `src/types/workspace.ts`, `src/mocks/agents/drift-monitor.ts`, `src/mocks/agents/harvest-scanner.ts`, `src/mocks/agents/registry.ts`, `src/mocks/workspace/brief.ts`, `src/workspace/thread/BriefSummaryView.tsx`, `src/workspace/workbench/CompactMessage.tsx`
- Test: `src/mocks/workspace/__tests__/brief.test.ts`, `src/mocks/workspace/__tests__/brief-remeasure.test.ts`, `src/workspace/__tests__/brief-thread.test.tsx`
- E2E: `e2e-visual/rebalance-job.spec.ts`, `e2e-visual/compliance-review.spec.ts`, `e2e-visual/readme-path.spec.ts`

**Interfaces:**
- Consumes: `fmtQuantity` and `formatFigure` (kit / `figure-format.ts`), `marksBreach`, `findingAnchorId`, `useFocusAfter`.
- Produces:
  - `src/types/workspace.ts`: `BriefGroup = 'decide' | 'context'`; `BriefReading = { findingId: string; line: string; figure?: Figure }`; `BriefItem = { key: string; agentId: AgentId; attention: Attention; title?: string; readings: BriefReading[] }`; the message `{ kind: 'brief_summary'; id; threadId; at; decide: BriefItem[]; context: BriefItem[] }` (the old `items` field is gone).
  - `src/mocks/agents/brief-topic.ts`: `BriefTopic` (union below), `TopicFinding = AgentFinding & { topic: BriefTopic }`, `withoutTopic(f: TopicFinding): AgentFinding`.
  - `src/mocks/workspace/brief-groups.ts`: `MeasuredFinding = TopicFinding & { id: string; agentId: AgentId }`, `briefGroupOf(topic: BriefTopic): BriefGroup`, `briefLine(f: Pick<MeasuredFinding, 'topic' | 'claim'>, grouped: boolean): string`, `briefItems(findings: readonly MeasuredFinding[], agentOrder: readonly AgentId[]): { decide: BriefItem[]; context: BriefItem[] }`.
  - `runDriftMonitor` and `runHarvestScanner` return `TopicFinding[]`; the registry strips the topic, so no stored or served finding carries one.

- [ ] **Step 1: The engine tests**

Create `src/mocks/workspace/__tests__/brief-groups.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { BriefTopic } from '@/mocks/agents/brief-topic'
import { briefMessages } from '../brief'
import { briefGroupOf } from '../brief-groups'
import { approvedStoryV3, release } from './story-fixture'
import { remeasureBrief } from '../brief-remeasure'
import { store } from '@/mocks/data/workspace-store'

const summaryOf = (messages = briefMessages()) => {
  const s = messages.find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('The Brief has a summary')
  return s
}
const lines = (items: ReturnType<typeof summaryOf>['decide']) => items.map((i) => ({ title: i.title, lines: i.readings.map((r) => r.line) }))

describe('the Brief groups its findings', () => {
  it.each<[BriefTopic, 'decide' | 'context']>([
    [{ kind: 'out_of_band', assetClass: 'US Equity' }, 'decide'],
    [{ kind: 'harvest_allowed', symbol: 'INTC', name: 'Intel Corp.', remaining: true }, 'decide'],
    [{ kind: 'in_band' }, 'context'],
    [{ kind: 'off_model' }, 'context'],
    [{ kind: 'illiquid', assetClass: 'Private Equity' }, 'context'],
    [{ kind: 'replacement_hold', held: 'VanEck Semiconductor ETF', sold: 'Intel Corp.' }, 'context'],
    [{ kind: 'realized_loss', symbol: 'INTC', name: 'Intel Corp.', when: 'recently' }, 'context'],
    [{ kind: 'held_away' }, 'context'],
    [{ kind: 'not_measured' }, 'context'],
  ])('%o is %s', (topic, group) => expect(briefGroupOf(topic)).toBe(group))

  it('in the morning: three decisions, Intel as one item with two readings, four lines of context', () => {
    const { decide, context } = summaryOf()
    expect(lines(decide)).toEqual([
      { title: undefined, lines: ['US Equity is outside its tolerance band'] },
      { title: 'Intel Corp.', lines: ['The remaining shares can be sold at a loss today', 'Sold at a loss recently; a buyback would wash the loss'] },
      { title: undefined, lines: ['iShares Core US Aggregate Bond ETF can be sold at a loss today'] },
    ])
    expect(lines(context)).toEqual([
      { title: undefined, lines: ['Some holdings sit outside the model'] },
      { title: undefined, lines: ['Private Equity cannot be sold at market'] },
      { title: undefined, lines: ['VanEck Semiconductor ETF holds the place of the Intel Corp. shares sold at a loss'] },
      { title: undefined, lines: ['Held-away accounts are outside the wash-sale checks'] },
    ])
  })

  it('carries each decision its key figure, and no line a digit', () => {
    const { decide, context } = summaryOf()
    expect(decide.flatMap((i) => i.readings.map((r) => r.figure?.label))).toEqual([
      'Largest drift · US Equity', 'Loss allowed now · INTC', 'Loss realized · INTC', 'Loss allowed now · AGG',
    ])
    for (const r of [...decide, ...context].flatMap((i) => i.readings)) expect(r.line).not.toMatch(/\d/)
    expect(context.flatMap((i) => i.readings).every((r) => r.figure === undefined)).toBe(true)
  })

  it('names every finding once, and the cards are the ones the readings point to', () => {
    const messages = briefMessages()
    const { decide, context } = summaryOf(messages)
    const read = [...decide, ...context].flatMap((i) => i.readings.map((r) => r.findingId))
    const cards = messages.filter((m) => m.kind === 'agent_finding').map((m) => m.id)
    expect([...read].sort()).toEqual([...cards].sort())
  })

  it('serves no topic: the tag never leaves the engine', () => {
    for (const m of briefMessages()) expect(m).not.toHaveProperty('topic')
  })

  it('after the story fills: no decision about Intel; Intel moves to Context with its two realized losses', () => {
    release(approvedStoryV3())
    remeasureBrief()
    const { decide, context } = summaryOf(store().messages.filter((m) => m.threadId === 'th-brief'))
    expect(decide.some((i) => i.title === 'Intel Corp.')).toBe(false)
    expect(lines(decide)[0]).toEqual({ title: undefined, lines: ['US Equity is outside its tolerance band'] })
    expect(lines(context).find((i) => i.title === 'Intel Corp.')).toEqual({
      title: 'Intel Corp.', lines: ['Sold at a loss today; a buyback would wash the loss', 'Sold at a loss recently; a buyback would wash the loss'],
    })
  })
})
```

In `src/mocks/workspace/__tests__/brief.test.ts`, replace the first test's body after `const [summary] = briefMessages()` with:

```ts
    if (summary?.kind !== 'brief_summary') throw new Error('The Brief must open with its summary')
    expect(summary.decide[0]).toMatchObject({ agentId: 'drift-monitor', attention: 'attention', readings: [{ line: 'US Equity is outside its tolerance band' }] })
    expect(summary.decide[1]).toMatchObject({ agentId: 'harvest-scanner', title: 'Intel Corp.' })
    const attention = [...summary.decide, ...summary.context].map((i) => i.attention)
    expect(attention).toEqual([...attention].sort((a, b) => Number(b === 'attention') - Number(a === 'attention')))
```

and rename it `'opens with its summary: decisions first, in rank, Drift Monitor before Harvest Scanner'`.

In `brief-remeasure.test.ts`: `summary().items[0]?.claim` becomes `summary().decide[0]?.readings[0]?.line` with `'US Equity is outside its tolerance band'`; "after v1 fills: every class inside its band" reads `summary().context.flatMap((i) => i.readings.map((r) => r.line))` and expects it to contain `'Every asset class is inside its tolerance band'`; "no two summary items read the same" becomes:

```ts
  it('after v1 fills: Intel is one item in Context with its two realized losses, and no two items read the same', async () => {
    release(approvedV1())
    await openBrief()
    const { decide, context } = summary()
    const titles = [...decide, ...context].map((i) => i.title ?? i.readings[0]?.line)
    expect(new Set(titles).size).toBe(titles.length)
    expect(context.find((i) => i.title === 'Intel Corp.')?.readings.map((r) => r.line)).toEqual([
      'Sold at a loss today; a buyback would wash the loss', 'Sold at a loss recently; a buyback would wash the loss',
    ])
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/brief-groups.test.ts src/mocks/workspace/__tests__/brief.test.ts src/mocks/workspace/__tests__/brief-remeasure.test.ts --testTimeout 30000`
Expected: FAIL — `../brief-groups` and `@/mocks/agents/brief-topic` do not exist; the summary has `items`, not `decide`.

- [ ] **Step 3: Topics on the Brief's agents**

Create `src/mocks/agents/brief-topic.ts`:

```ts
import type { AgentFinding } from './agent'

/**
 * What a finding is about, as the Brief groups it. Only the Brief's two agents tag their findings, and
 * the tag stays in the engine: `withoutTopic` is applied before any finding is stored or served.
 */
export type BriefTopic =
  | { kind: 'out_of_band'; assetClass: string }
  | { kind: 'in_band' }
  | { kind: 'off_model' }
  | { kind: 'illiquid'; assetClass: string }
  | { kind: 'replacement_hold'; held: string; sold: string }
  | { kind: 'harvest_allowed'; symbol: string; name: string; remaining: boolean }
  | { kind: 'realized_loss'; symbol: string; name: string; when: 'today' | 'recently' }
  | { kind: 'held_away' }
  /** Nothing to measure here: a custom mandate, no holdings, an untaxed account, or no loss to harvest. */
  | { kind: 'not_measured' }

export type TopicFinding = AgentFinding & { topic: BriefTopic }

export const withoutTopic = ({ claim, figures, citations, attention }: TopicFinding): AgentFinding => ({ claim, figures, citations, attention })
```

In `src/mocks/agents/drift-monitor.ts`: `runDriftMonitor` and `replacementHolds` return `TopicFinding[]` (import from `./brief-topic`), and each finding gains its topic:

| Finding | `topic` |
|---|---|
| custom mandate; no holdings or targets | `{ kind: 'not_measured' }` |
| the first finding | `drift.needsRebalance ? { kind: 'out_of_band', assetClass: label(worst.assetClass) } : { kind: 'in_band' }` |
| "Some holdings sit outside the model." | `{ kind: 'off_model' }` |
| "… cannot be sold at market …" | `{ kind: 'illiquid', assetClass: label(d.assetClass) }` |
| a replacement hold | `{ kind: 'replacement_hold', held, sold }` (the two names the function already computes) |

In `src/mocks/agents/harvest-scanner.ts`: `runHarvestScanner` returns `TopicFinding[]` (the `findings` array is typed `TopicFinding[]`):

| Finding | `topic` |
|---|---|
| "Sales in this account are not taxed …"; "No position in this account can be sold at a loss today." | `{ kind: 'not_measured' }` |
| each harvest | `{ kind: 'harvest_allowed', symbol: p.symbol, name: claimNameOf(p.symbol, p.name), remaining: partlySold.has(p.symbol) }` |
| each open window | `{ kind: 'realized_loss', symbol: w.symbol, name: claimNameOf(w.symbol, w.name), when: w.saleDate === today ? 'today' : 'recently' }` |
| held-away | `{ kind: 'held_away' }` |

In `src/mocks/agents/registry.ts` the two runners strip the tag:

```ts
  ['drift-monitor', (context) => runDriftMonitor(context).map(withoutTopic)],
  ['pretrade-check', runPretradeCheck],
  ['harvest-scanner', (context) => runHarvestScanner(context).map(withoutTopic)],
```

- [ ] **Step 4: The grouping**

Create `src/mocks/workspace/brief-groups.ts`:

```ts
import type { AgentId, Attention, BriefGroup, BriefItem } from '@/types/workspace'
import type { BriefTopic, TopicFinding } from '@/mocks/agents/brief-topic'

export type MeasuredFinding = TopicFinding & { id: string; agentId: AgentId }

/** The one rule: a finding needs a decision when acting on it would change a trade. */
export function briefGroupOf(topic: BriefTopic): BriefGroup {
  return topic.kind === 'out_of_band' || topic.kind === 'harvest_allowed' ? 'decide' : 'context'
}

/** The topics whose line carries its finding's first figure: the drift, the loss allowed now, the loss realized. */
const KEY_FIGURE: ReadonlySet<BriefTopic['kind']> = new Set(['out_of_band', 'harvest_allowed', 'realized_loss'])

/** The security a finding is about, where two findings can be about the same one. */
function securityOf(topic: BriefTopic): { symbol: string; name: string } | undefined {
  return topic.kind === 'harvest_allowed' || topic.kind === 'realized_loss' ? { symbol: topic.symbol, name: topic.name } : undefined
}

/** A finding's one line, in words with no digits. Grouped under its security's name, the line drops the name. */
export function briefLine({ topic, claim }: Pick<MeasuredFinding, 'topic' | 'claim'>, grouped: boolean): string {
  switch (topic.kind) {
    case 'out_of_band': return `${topic.assetClass} is outside its tolerance band`
    case 'in_band': return 'Every asset class is inside its tolerance band'
    case 'off_model': return 'Some holdings sit outside the model'
    case 'illiquid': return `${topic.assetClass} cannot be sold at market`
    case 'replacement_hold': return `${topic.held} holds the place of the ${topic.sold} shares sold at a loss`
    case 'harvest_allowed':
      if (grouped) return `${topic.remaining ? 'The remaining shares' : 'The position'} can be sold at a loss today`
      return `${topic.remaining ? `The remaining ${topic.name} shares` : topic.name} can be sold at a loss today`
    case 'realized_loss':
      return grouped ? `Sold at a loss ${topic.when}; a buyback would wash the loss` : `${topic.name} was sold at a loss ${topic.when}`
    case 'held_away': return 'Held-away accounts are outside the wash-sale checks'
    case 'not_measured': return claim.replace(/\.$/, '')
  }
}

const attentionFirst = (a: Attention, b: Attention) => Number(b === 'attention') - Number(a === 'attention')

/**
 * The Brief's summary: findings ranked (attention first, then the Brief's agent order), findings about one
 * security as one item under its name, each item in Needs a decision while any reading needs one.
 */
export function briefItems(findings: readonly MeasuredFinding[], agentOrder: readonly AgentId[]): { decide: BriefItem[]; context: BriefItem[] } {
  const order = (id: AgentId) => agentOrder.indexOf(id)
  const ranked = [...findings].sort((a, b) => attentionFirst(a.attention, b.attention) || order(a.agentId) - order(b.agentId))
  const placed = new Set<string>()
  const decide: BriefItem[] = []
  const context: BriefItem[] = []
  for (const finding of ranked) {
    if (placed.has(finding.id)) continue
    const security = securityOf(finding.topic)
    const members = security ? ranked.filter((f) => securityOf(f.topic)?.symbol === security.symbol) : [finding]
    members.forEach((m) => placed.add(m.id))
    const grouped = members.length > 1
    const item: BriefItem = {
      key: grouped && security ? `security:${security.symbol}` : finding.id,
      agentId: finding.agentId,
      attention: finding.attention,
      ...(grouped && security ? { title: security.name } : {}),
      readings: members.map((m) => {
        const figure = m.figures[0]
        if (KEY_FIGURE.has(m.topic.kind) && !figure) throw new Error(`A ${m.topic.kind} finding (${m.id}) carries no key figure`)
        return { findingId: m.id, line: briefLine(m, grouped), ...(KEY_FIGURE.has(m.topic.kind) && figure ? { figure } : {}) }
      }),
    }
    ;(members.some((m) => briefGroupOf(m.topic) === 'decide') ? decide : context).push(item)
  }
  return { decide, context }
}
```

In `src/types/workspace.ts` replace `type BriefItem = { findingId: string; agentId: AgentId; claim: string; attention: Attention }` with:

```ts
export type BriefGroup = 'decide' | 'context'
/** One reading of a Brief item: a line in words with no digits and, for a decision, its key figure, formatted by the kit. */
export type BriefReading = { findingId: string; line: string; figure?: Figure }
/** A line of the Brief's summary: one finding, or the findings about one security under its name (`title`). */
export type BriefItem = { key: string; agentId: AgentId; attention: Attention; title?: string; readings: BriefReading[] }
```

and the message member with `| { kind: 'brief_summary'; id: string; threadId: string; at: string; decide: BriefItem[]; context: BriefItem[] }`.

In `src/mocks/workspace/brief.ts`, `composeBrief` runs the Brief's agents through their tagged runners and builds the summary from `briefItems`:

```ts
import type { AgentId, Message } from '@/types/workspace'
import type { AgentContext } from '@/mocks/agents/agent'
import { withoutTopic, type TopicFinding } from '@/mocks/agents/brief-topic'
import { runDriftMonitor } from '@/mocks/agents/drift-monitor'
import { runHarvestScanner } from '@/mocks/agents/harvest-scanner'
// (SEED_THREADS, MOCK_NOW_ISO, bookVersion, runKeyOf as before)
import { briefItems } from './brief-groups'

/** The Brief's agents, run for their tagged findings: the Brief groups what the registry serves untagged. */
const BRIEF_RUNNERS: ReadonlyMap<AgentId, (context: AgentContext) => TopicFinding[]> = new Map<AgentId, (context: AgentContext) => TopicFinding[]>([
  ['drift-monitor', runDriftMonitor],
  ['harvest-scanner', runHarvestScanner],
])

export function composeBrief(idOf: (index: number) => string, at: string): Message[] {
  const thread = SEED_THREADS.find((t) => t.id === BRIEF_THREAD_ID)
  const subject = thread?.subject
  if (!thread || !subject) throw new Error('The Brief thread needs a subject')
  const measured = thread.agentIds.flatMap((agentId) => {
    const run = BRIEF_RUNNERS.get(agentId)
    if (!run) throw new Error(`The Brief lists ${agentId}, which does not tag its findings for the Brief`)
    const runKey = runKeyOf(agentId, thread.id, subject)
    return run({ asOf: at, subject }).map((finding) => ({ agentId, runKey, finding }))
  })
  const findings: Message[] = measured.map(({ agentId, runKey, finding }, i) => (
    { kind: 'agent_finding', id: idOf(i + 1), threadId: thread.id, at, agentId, runKey, ...withoutTopic(finding) }))
  const { decide, context } = briefItems(measured.map(({ agentId, finding }, i) => ({ ...finding, id: idOf(i + 1), agentId })), thread.agentIds)
  return [{ kind: 'brief_summary', id: idOf(0), threadId: thread.id, at, decide, context }, ...findings]
}
```

(the `Finding` type alias and the `AGENT_DEFINITIONS` import go; keep the doc comment, reworded to "a summary in two groups, Needs a decision and Context, ahead of them"). In `CompactMessage.tsx` the `brief_summary` line reads `Needs a decision · context.`

- [ ] **Step 5: Run the engine tests**

Run: `pnpm vitest run src/mocks --testTimeout 30000`
Expected: PASS. A test elsewhere in `src/mocks` that read `summary.items` (grep `\.items` near `brief_summary`) is updated the same way as Step 1's. A test that compares `runDriftMonitor` or `runHarvestScanner` output with `toEqual` against objects without a `topic` compares `.map(withoutTopic)` instead; one that reads `claim`, `figures` or `attention` needs nothing.

- [ ] **Step 6: The UI test**

In `src/workspace/__tests__/brief-thread.test.tsx`, replace the first test with:

```ts
  it('opens with Needs a decision, numbered, each line with its key figure, and Context collapsed', async () => {
    renderRoutes(routes, '/t/th-brief')
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    const decide = await screen.findByRole('region', { name: 'Needs a decision' })
    const items = within(decide).getAllByRole('listitem').filter((li) => li.parentElement?.closest('li') === null)
    expect(items).toHaveLength(3)
    expect(items[0]!.textContent).toMatch(/^1/)
    expect(items[0]).toHaveTextContent('US Equity is outside its tolerance band')
    expect(items[0]).toHaveTextContent('+13.2')
    expect(items[0]!.querySelector('[data-status="OUT"]')).not.toBeNull()
    expect(items[1]).toHaveTextContent('Intel Corp.')
    expect(items[1]).toHaveTextContent('−45,850')
    expect(items[1]).toHaveTextContent('−32,750')
    expect(items[1]!.querySelector('[data-status]')).toBeNull()
    const context = screen.getByRole('region', { name: 'Context' })
    expect(context.querySelector('details')).not.toHaveAttribute('open')
    const user = userEvent.setup()
    await user.click(within(items[1]!).getByRole('button', { name: 'Open finding: The remaining shares can be sold at a loss today' }))
    const intc = screen.getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await waitFor(() => expect(document.activeElement).toBe(intc))
  })

  it('the Context group keeps its open state across a refetch', async () => {
    const { queryClient } = renderRoutes(routes, '/t/th-brief')
    const context = await screen.findByRole('region', { name: 'Context' })
    await userEvent.setup().click(within(context).getByText(/^Context/))
    expect(context.querySelector('details')).toHaveAttribute('open')
    await act(() => queryClient.invalidateQueries({ queryKey: ['workspace'] }))
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.getByRole('region', { name: 'Context' }).querySelector('details')).toHaveAttribute('open')
  })
```

(add `act` to the `@testing-library/react` import). The old carry assertions move into Task 5, which rewrites "Take to"; keep them in a separate `it` for now, starting from `screen.getByRole('article', { name: \`Harvest Scanner: ${INTC_CLAIM}\` })`.

Run: `pnpm vitest run src/workspace/__tests__/brief-thread.test.tsx --testTimeout 30000`
Expected: FAIL — no region "Needs a decision".

- [ ] **Step 7: The view**

Replace `src/workspace/thread/BriefSummaryView.tsx`:

```tsx
import { useId } from 'react'
import { Button } from '@/kit/button/Button'
import { Reading } from '@/kit/reading/Reading'
import { StatusCode } from '@/kit/status/StatusCode'
import { fmtQuantity } from '@/kit/measure'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import type { BriefItem, BriefReading, Directory, Message } from '@/types/workspace'
import { findingAnchorId } from './finding-anchor'
import { formatFigure, marksBreach } from './figure-format'

type Summary = Extract<Message, { kind: 'brief_summary' }>

/** The Brief's summary: what needs a decision today, ranked and numbered, then the context behind it, folded and quiet. */
export function BriefSummaryView({ summary, directory }: { summary: Summary; directory: Directory }) {
  const decideId = useId()
  const agentName = (id: string) => directory.agents.find((a) => a.id === id)?.name ?? id
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby={decideId} className="flex min-w-0 flex-col gap-3">
        <h2 id={decideId} className="border-b border-ink pb-2 text-label uppercase text-ink-2">Needs a decision</h2>
        {summary.decide.length === 0 ? <p className="text-body text-ink-3">Nothing in the book needs a decision today.</p> : (
          <ol className="flex flex-col gap-4">
            {summary.decide.map((item, i) => (
              <li key={item.key} className="grid grid-cols-[1.75rem_1fr] items-baseline gap-x-3">
                <span className="tabular text-total stretch-wide text-ink">{fmtQuantity(i + 1)}</span>
                <ItemLines item={item} agent={agentName(item.agentId)} tone="decide" />
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-label="Context" className="flex min-w-0 flex-col gap-3">
        <details className="group">
          <summary className="cursor-pointer border-b border-rule pb-2 text-label uppercase text-ink-3">
            {`Context · ${fmtQuantity(summary.context.length)}`}
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {summary.context.map((item) => <li key={item.key}><ItemLines item={item} agent={agentName(item.agentId)} tone="context" /></li>)}
          </ul>
        </details>
      </section>
    </div>
  )
}

function ItemLines({ item, agent, tone }: { item: BriefItem; agent: string; tone: 'decide' | 'context' }) {
  const breach = marksBreach(item)
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        {item.title ? <span className={tone === 'decide' ? 'text-copy font-semibold' : 'text-body font-semibold text-ink-2'}>{item.title}</span> : null}
        <span className="ml-auto text-label text-ink-3">{agent}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {item.readings.map((r) => <ReadingLine key={r.findingId} reading={r} breach={breach && !item.title} tone={tone} />)}
      </ul>
    </div>
  )
}

function ReadingLine({ reading, breach, tone }: { reading: BriefReading; breach: boolean; tone: 'decide' | 'context' }) {
  const focusAfter = useFocusAfter()
  const figure = reading.figure ? formatFigure(reading.figure) : undefined
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {breach ? <StatusCode status="OUT" /> : null}
      <span className={tone === 'decide' ? 'text-copy' : 'text-body text-ink-2'}>{reading.line}</span>
      {figure ? <Reading value={figure.value} unit={figure.unit} /> : null}
      <Button rank="quiet" className="ml-auto text-label font-normal" aria-label={`Open finding: ${reading.line}`}
        onClick={() => focusAfter(findingAnchorId(reading.findingId))}>Open finding</Button>
    </li>
  )
}
```

The old summary's border box goes; only the action is underlined (the critique's "underlined link prose"). `<summary>` is a native element the kit-elements guard allows.

- [ ] **Step 8: The specs**

- `e2e-visual/rebalance-job.spec.ts`: the `brief` scene waits for `page.getByRole('region', { name: 'Needs a decision' })`; line 98 reads `await expect(page.getByRole('region', { name: 'Needs a decision' }).getByRole('listitem').first()).toContainText('US Equity is outside its tolerance band')`.
- `e2e-visual/compliance-review.spec.ts`: line 48 reads `await expect(page.getByRole('region', { name: 'Context' })).toContainText('Every asset class is inside its tolerance band')`; line 185 reads `await expect(page.getByRole('region', { name: 'Needs a decision' })).not.toContainText('Intel Corp.')`.
- `e2e-visual/readme-path.spec.ts`: step 1 expects `page.getByRole('region', { name: 'Needs a decision' })` visible; step 4's last line becomes `await expect(page.getByRole('region', { name: 'Needs a decision' })).not.toContainText('Intel Corp.')`.

- [ ] **Step 9: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual`.
Expected: unit PASS; visual fails only on `brief-light`, `brief-dark`, `brief-after-fills-light`. Regenerate: `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts`. Open the three PNGs: three numbered decisions, Intel with two readings and its two figures, "Context · 4" closed (in `brief-after-fills-light`: Intel under Context, US Equity still decision 1).

- [ ] **Step 10: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(brief): Needs a decision, numbered with each key figure, and a folded Context; the engine classifies each finding and groups one security's findings

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 4: The Brief — Today (critique 1)

Today leads the Brief: lines in time order, derived by the engine from session state on every read, each with one action. It replaces the three seeded bottom-of-thread lines (reconciliation, meeting, next action), whose message kinds and views are deleted.

**Files:**
- Create: `src/mocks/workspace/brief-today.ts`, `src/mocks/workspace/__tests__/brief-today.test.ts`, `src/workspace/thread/BriefTodayView.tsx`
- Delete: `src/workspace/thread/MeetingNoticeView.tsx`, `src/workspace/thread/NextActionView.tsx`, `src/workspace/thread/ReconciliationNoticeView.tsx`
- Modify: `src/types/workspace.ts`, `src/mocks/data/workspace-seed.ts`, `src/mocks/data/workspace-store.ts`, `src/mocks/handlers/workspace.ts`, `src/mocks/workspace/brief-remeasure.ts`, `src/kit/measure.ts`, `src/workspace/thread/MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`
- Test: `src/kit/__tests__/measure.test.ts`, `src/workspace/__tests__/brief-thread.test.tsx`, and the tests in Step 7's table
- E2E: `e2e-visual/readme-path.spec.ts`, `e2e-visual/meeting-review.spec.ts`, `e2e-visual/prospect-proposal.spec.ts`, `e2e-visual/reference-views.spec.ts`

**Interfaces:**
- Consumes: `store`, `sessionNow` (`workspace-store.ts`); `meetingEvent`, `meetingTitle` (`meetings.ts`); `calendarEvents` (`@/mocks/data/calendar`); `accounts` (`@/mocks/data/accounts`); `reconciliationView` (`@/mocks/reference/reconciliation`); `fmtEasternStamp` (Task 2).
- Produces:
  - `src/types/workspace.ts`: `TodayLine` (below) and the message `{ kind: 'brief_today'; id: string; threadId: string; at: string; lines: TodayLine[] }`. The kinds `meeting_notice`, `next_action` and `reconciliation_notice` are gone.
  - `briefToday(viewerId: string): Extract<Message, { kind: 'brief_today' }>` and `BRIEF_TODAY_ID = 'msg-btoday'` in `src/mocks/workspace/brief-today.ts`; `at` is `sessionNow()`.
  - `fmtEasternWindow(start: string, end: string, sameDayAs?: string): string` in `src/kit/measure.ts` → `"14:00–15:15 ET"`, or `"25 Feb 14:00–15:15 ET"` off the compared day.
  - The Brief's `GET` serves `[brief_today, brief_summary, ...findings, ...any posted messages by time]`.

```ts
export type TodayLine =
  /** Approved orders staged and waiting for compliance; `at` is the approval. */
  | { kind: 'release'; at: string; accountName: string; version: number; threadId: string }
  | { kind: 'meeting'; start: string; end: string; title: string; state: MeetingState; threadId: string }
  /** A prospect's first meeting, until it is recorded. Form CRS is due before it (firm policy). */
  | { kind: 'coffee'; start: string; prospectName: string; formCrs: 'due' | 'delivered'; threadId: string }
  | { kind: 'reconciliation'; openBreaks: number }
```

- [ ] **Step 1: The engine tests**

Create `src/mocks/workspace/__tests__/brief-today.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { reconciliationView, resolveBreak } from '@/mocks/reference/reconciliation'
import { briefToday } from '../brief-today'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { escalate, returnToAdvisor } from '../compliance-acts'
import { recordCoffee } from '../prospect-steps'
import { withFormCrs } from './prospect-fixture'
import { ADRIAN, MARK, RATIONALE, approvedV1, ok, release } from './story-fixture'

const lines = () => briefToday(ADRIAN).lines
const kinds = () => lines().map((l) => l.kind)

describe("the Brief's Today", () => {
  it('in the morning: the annual review, the coffee with Form CRS due, and the open break, in that order', () => {
    expect(lines()).toEqual([
      { kind: 'meeting', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z', title: 'Johnson annual review', state: 'scheduled', threadId: 'th-johnson-meeting' },
      { kind: 'coffee', start: '2026-02-25T20:30:00.000Z', prospectName: 'Dr. Amanda Pell', formCrs: 'due', threadId: 'th-pell' },
      { kind: 'reconciliation', openBreaks: 1 },
    ])
    expect(briefToday(ADRIAN)).toMatchObject({ kind: 'brief_today', id: 'msg-btoday', threadId: 'th-brief' })
  })

  it('leads with the release line while approved orders await compliance, and drops it once released', () => {
    const a = approvedV1()
    expect(lines()[0]).toMatchObject({ kind: 'release', accountName: 'Robert Johnson Individual', version: 1, threadId: 'th-johnson-review' })
    release(a)
    expect(kinds()).not.toContain('release')
  })

  it('the release line leaves on a return and stays through an escalation', () => {
    const a = approvedV1()
    ok(escalate(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE))
    expect(kinds()).toContain('release')
    ok(returnToAdvisor(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE))
    expect(kinds()).not.toContain('release')
  })

  it("follows the meeting's state: held, then filed", () => {
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(lines().find((l) => l.kind === 'meeting')).toMatchObject({ state: 'held' })
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    ok(fileMeetingRecord(ADRIAN, 'evt-010', meetingView(ADRIAN, 'evt-010')!.notesFingerprint!))
    expect(lines().find((l) => l.kind === 'meeting')).toMatchObject({ state: 'filed' })
  })

  it('says Form CRS was delivered, then drops the coffee once it is recorded', () => {
    withFormCrs()
    expect(lines().find((l) => l.kind === 'coffee')).toMatchObject({ formCrs: 'delivered' })
    ok(recordCoffee(ADRIAN, 'prsp-011', 'We met; she will send her statements.'))
    expect(kinds()).not.toContain('coffee')
  })

  it('drops the reconciliation line once no break is open', () => {
    const open = reconciliationView(ADRIAN)!.breaks.find((b) => b.id === 'brk-002')!
    ok(resolveBreak(ADRIAN, { breakId: 'brk-002', fingerprint: open.fingerprint, resolution: 'timing_difference', rationale: 'Schwab confirmed the sweep posted late.' }))
    expect(kinds()).not.toContain('reconciliation')
  })

  it('is stamped at the session clock and stored nowhere', () => {
    const before = store().messages.length
    expect(briefToday(ADRIAN).at).toBe('2026-02-25T12:08:00.000Z')
    expect(store().messages).toHaveLength(before)
  })
})
```

(the stamp is `eventTime(8)`: the seed's last sequence; if the seed's sequence differs, read `sessionNow()` instead of the literal).

In `src/kit/__tests__/measure.test.ts`:

```ts
describe('fmtEasternWindow', () => {
  it('drops the date on the compared day, states it otherwise', () => {
    expect(fmtEasternWindow('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z', '2026-02-25T12:00:00Z')).toBe('14:00–15:15 ET')
    expect(fmtEasternWindow('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z', '2026-02-26T14:10:00Z')).toBe('25 Feb 14:00–15:15 ET')
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/brief-today.test.ts src/kit/__tests__/measure.test.ts --testTimeout 30000`
Expected: FAIL — `../brief-today` and `fmtEasternWindow` do not exist.

- [ ] **Step 3: The engine**

Create `src/mocks/workspace/brief-today.ts`:

```ts
import type { Message, TodayLine } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { calendarEvents } from '@/mocks/data/calendar'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { reconciliationView } from '@/mocks/reference/reconciliation'
import { BRIEF_THREAD_ID } from './brief'
import { meetingEvent, meetingTitle } from './meetings'

export const BRIEF_TODAY_ID = 'msg-btoday'

type Timed = Exclude<TodayLine, { kind: 'reconciliation' }>
const timeOf = (line: Timed) => (line.kind === 'release' ? line.at : line.start)
const toUtc = (local: string) => new Date(local).toISOString()

function releaseLines(): Timed[] {
  const s = store()
  return s.approvals.filter((a) => a.status === 'active').flatMap((approval) => {
    if (!s.staged.some((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')) return []
    const proposal = s.proposals.find((p) => p.id === approval.proposalId)
    if (!proposal) throw new Error(`Approval ${approval.actId} names a missing proposal ${approval.proposalId}`)
    const account = accounts.find((a) => a.id === proposal.accountId)
    if (!account) throw new Error(`Proposal ${proposal.id} names a missing account ${proposal.accountId}`)
    return [{ kind: 'release', at: approval.at, accountName: account.name, version: approval.version, threadId: proposal.threadId }]
  })
}

function meetingLines(): Timed[] {
  return store().meetings.map((m) => {
    const event = meetingEvent(m.eventId)
    if (!event) throw new Error(`Meeting ${m.eventId} names no calendar event`)
    return { kind: 'meeting', start: event.start, end: event.end, title: meetingTitle(m), state: m.state, threadId: m.threadId }
  })
}

function coffeeLines(): Timed[] {
  return store().prospects.filter((p) => p.coffee === undefined).map((p) => {
    const event = calendarEvents.find((e) => e.id === p.eventId)
    if (!event) throw new Error(`Prospect ${p.id} names a missing event ${p.eventId}`)
    const formCrs = p.disclosures.some((d) => d.document === 'form_crs') ? 'delivered' : 'due'
    return { kind: 'coffee', start: toUtc(event.startTime), prospectName: p.name, formCrs, threadId: p.threadId }
  })
}

/**
 * The Brief's Today, as the session stands: the timed lines in time order (orders awaiting release, the
 * day's meetings, a prospect's coffee until it is recorded), then reconciliation while a break is open.
 * Composed on every read, never stored, so it always says what is true now.
 */
export function briefToday(viewerId: string): Extract<Message, { kind: 'brief_today' }> {
  const recon = reconciliationView(viewerId)
  if (!recon) throw new Error(`The Brief's owner ${viewerId} cannot read reconciliation`)
  const timed = [...releaseLines(), ...meetingLines(), ...coffeeLines()].sort((a, b) => timeOf(a).localeCompare(timeOf(b)))
  const open = recon.summary.openBreaks
  return {
    kind: 'brief_today', id: BRIEF_TODAY_ID, threadId: BRIEF_THREAD_ID, at: sessionNow(),
    lines: [...timed, ...(open > 0 ? [{ kind: 'reconciliation' as const, openBreaks: open }] : [])],
  }
}
```

In `src/kit/measure.ts`, after `fmtEasternRange`:

```ts
/** A window on the story's clock: "14:00–15:15 ET" on the compared New York day, "25 Feb 14:00–15:15 ET" on any other. */
export function fmtEasternWindow(start: string, end: string, sameDayAs?: string): string {
  const from = fmtEasternStamp(start, sameDayAs).replace(/ ET$/, '')
  return `${from}–${fmtEasternTime(end)} ET`
}
```

- [ ] **Step 4: Types, seed, store, handler**

- `src/types/workspace.ts`: add `TodayLine` (Interfaces above; `import type { MeetingState, MeetingTask } from './workspace-meeting'`) and the `brief_today` member with the doc comment `/** The Brief's Today, composed by the engine on every read of the Brief; never stored. */`; delete the `meeting_notice`, `next_action` and `reconciliation_notice` members and their comments.
- `src/mocks/data/workspace-seed.ts`: delete `msg-s05`, `msg-s08` and `RECONCILIATION_NOTICE`. `SEED_LAST_SEQUENCE` stays `8` — the remaining seed messages keep their sequences and every session stamp stays where it is; reword its comment: "The last event-clock sequence the seed reserves; 5 and 8 were the Brief's old meeting and referral lines and stay unused, so the session's events keep their times."
- `src/mocks/data/workspace-store.ts`: `messages: [...briefMessages(), ...SEED_MESSAGES.map((m) => ({ ...m }))]`.
- `src/mocks/handlers/workspace.ts`, in `GET /api/workspace/threads/:id`:

```ts
    const messages = thread.id === BRIEF_THREAD_ID
      ? [briefToday(viewer), ...briefOrder(inThread)]
      : inThread.sort((a, b) => a.at.localeCompare(b.at))
```

(import `briefToday` from `../workspace/brief-today`). `briefOrder`'s comment in `brief-remeasure.ts` becomes: "The Brief reads as measured: its summary and findings first, then anything posted in it, in time order. Today is composed on read and leads it (the thread handler)."

- [ ] **Step 5: Run the engine tests**

Run: `pnpm vitest run src/mocks --testTimeout 30000`
Expected: PASS after the filters in `brief.test.ts` and `brief-remeasure.test.ts` that skipped `meeting_notice`, `next_action` and `reconciliation_notice` are removed (the store no longer holds them; `openBrief` filters `m.kind !== 'brief_today'` instead). `brief-remeasure.test.ts`'s "the meeting line survives a re-measure" becomes:

```ts
  it('Today leads the Brief before and after a re-measure', async () => {
    const kinds = async () => {
      const res = await fetch(`/api/workspace/threads/${BRIEF_THREAD_ID}`, { headers: { 'X-Viewer': 'user-001' } })
      return ((await res.json()) as { messages: Message[] }).messages.map((m) => m.kind)
    }
    expect((await kinds()).slice(0, 2)).toEqual(['brief_today', 'brief_summary'])
    release(approvedV1())
    expect((await kinds()).slice(0, 2)).toEqual(['brief_today', 'brief_summary'])
  })
```

- [ ] **Step 6: The view**

Create `src/workspace/thread/BriefTodayView.tsx`:

```tsx
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fmtEasternStamp, fmtEasternWindow, fmtQuantity } from '@/kit/measure'
import { reconciliationHref } from '@/workspace/full-views/reference-href'
import type { Message, TodayLine } from '@/types/workspace'
import { TODAY_MEETING_STATE } from './brief-today-words'

type Today = Extract<Message, { kind: 'brief_today' }>
const LINK = 'shrink-0 text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

/** The day as it stands: one line per thing happening, in time order, each with its one action. */
export function BriefTodayView({ today }: { today: Today }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <h2 id={titleId} className="border-b border-ink pb-2 text-label uppercase text-ink-2">Today</h2>
      {today.lines.length === 0 ? <p className="text-body text-ink-3">Nothing else is on the calendar today.</p> : (
        <ol className="flex flex-col">
          {today.lines.map((line) => <li key={keyOf(line)} className="border-b border-rule py-2 last:border-b-0">{lineOf(line, today.at)}</li>)}
        </ol>
      )}
    </section>
  )
}

const keyOf = (line: TodayLine) => (line.kind === 'reconciliation' ? 'reconciliation' : `${line.kind}:${line.threadId}`)

function Row({ when, children, action }: { when?: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] items-baseline gap-x-4 gap-y-1 narrow:grid-cols-[9rem_1fr_auto]">
      <span className="tabular text-body text-ink-2">{when ?? ''}</span>
      <span className="text-copy">{children}</span>
      <span className="col-start-2 narrow:col-start-auto">{action}</span>
    </div>
  )
}

function lineOf(line: TodayLine, now: string): ReactNode {
  switch (line.kind) {
    case 'release':
      return <Row when={fmtEasternStamp(line.at, now)} action={<Link to={`/t/${encodeURIComponent(line.threadId)}`} className={LINK}>Open the team thread</Link>}>
        {`Orders await compliance review · ${line.accountName} · v${line.version}`}</Row>
    case 'meeting':
      return <Row when={fmtEasternWindow(line.start, line.end, now)} action={<Link to={`/t/${encodeURIComponent(line.threadId)}`} className={LINK}>Open the meeting thread</Link>}>
        {`${line.title} · ${TODAY_MEETING_STATE[line.state]}`}</Row>
    case 'coffee':
      return <Row when={fmtEasternStamp(line.start, now)} action={<Link to={`/t/${encodeURIComponent(line.threadId)}`} className={LINK}>Open her thread</Link>}>
        {`Coffee with ${line.prospectName} · ${line.formCrs === 'due' ? 'Form CRS due before it (firm policy)' : 'Form CRS delivered'}`}</Row>
    case 'reconciliation':
      return <Row action={<Link to={reconciliationHref('th-brief')} className={LINK}>Open reconciliation</Link>}>
        {`Reconciliation · ${fmtQuantity(line.openBreaks)} open ${line.openBreaks === 1 ? 'break' : 'breaks'}`}</Row>
  }
}
```

Create `src/workspace/thread/brief-today-words.ts`:

```ts
import type { MeetingState } from '@/types/workspace-meeting'

export const TODAY_MEETING_STATE: Readonly<Record<MeetingState, string>> = { scheduled: 'scheduled', held: 'held', filed: 'filed' }
```

(the "Open her thread" link names a woman because the only seeded prospect is Dr. Pell; if a second prospect is ever seeded the word comes from the engine). `MessageView.tsx`: delete the three removed cases and their imports; add `case 'brief_today': return <BriefTodayView today={message} />`. `CompactMessage.tsx`: delete the three cases; add `case 'brief_today': return <Line who="Brief" at={message.at}>Today.</Line>`. Delete the three view files. The `reconciliationHref` second argument is the thread to come back to (`'th-brief'` is a seeded thread, so the route guard accepts it).

- [ ] **Step 7: The UI tests**

In `src/workspace/__tests__/brief-thread.test.tsx` add:

```ts
  it('leads with Today: the meeting and the coffee at their Eastern times, the open break, each with its action', async () => {
    renderRoutes(routes, '/t/th-brief')
    const today = await screen.findByRole('region', { name: 'Today' })
    const rows = within(today).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      '14:00–15:15 ETJohnson annual review · scheduledOpen the meeting thread',
      '15:30 ETCoffee with Dr. Amanda Pell · Form CRS due before it (firm policy)Open her thread',
      'Reconciliation · 1 open breakOpen reconciliation',
    ])
    expect(within(rows[0]!).getByRole('link', { name: 'Open the meeting thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    expect(within(rows[1]!).getByRole('link', { name: 'Open her thread' })).toHaveAttribute('href', '/t/th-pell')
    const order = [today, screen.getByRole('region', { name: 'Needs a decision' })]
    expect(order[0]!.compareDocumentPosition(order[1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('dates a line that is not on the session\'s day', async () => {
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    renderRoutes(routes, '/t/th-brief')
    const today = await screen.findByRole('region', { name: 'Today' })
    expect(today).toHaveTextContent('25 Feb 14:00–15:15 ET')
  })
```

(imports: `advanceClockTo` from `@/mocks/data/workspace-store`, `minuteOf` from `@/lib/clock`). Then the tests that read a removed line:

| Test file | Change |
|---|---|
| `src/workspace/__tests__/meeting-messages.test.tsx` | the `article` "Meeting · Johnson annual review" becomes `within(await screen.findByRole('region', { name: 'Today' })).getByRole('link', { name: 'Open the meeting thread' })` |
| `src/workspace/__tests__/meeting-thread.test.tsx` (line 30) | the same |
| `src/workspace/__tests__/prospect-messages.test.tsx` | the "Next best action" article becomes Today's "Open her thread" link |
| `src/workspace/__tests__/reference-frame.test.tsx` (lines 67, 77) | the "Reference · Reconciliation" article becomes Today's row containing "Reconciliation · 1 open break" and its "Open reconciliation" link |

Run: `pnpm vitest run --testTimeout 30000`. Expected: PASS.

- [ ] **Step 8: The specs**

- `e2e-visual/readme-path.spec.ts` step 5: `await page.getByRole('region', { name: 'Today' }).getByRole('link', { name: 'Open the meeting thread' }).click()`; step 6: `await page.getByRole('region', { name: 'Today' }).getByRole('link', { name: 'Open her thread' }).click()`.
- `e2e-visual/meeting-review.spec.ts` line 184 and `prospect-proposal.spec.ts` line 112: the same two locators in place of the removed articles.
- `e2e-visual/reference-views.spec.ts` line 87: `const line = page.getByRole('region', { name: 'Today' }).getByRole('listitem').filter({ hasText: 'Reconciliation' })`; what it asserts about the line stays.

Run: `VISUAL_PORT=5195 pnpm visual`. Expected: only `brief-light`, `brief-dark`, `brief-after-fills-light` fail on pixels. Regenerate: `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts`. Open them: Today first (the meeting, the coffee, the break; in `brief-after-fills-light` no release line, since it was released), then the decisions; nothing at the bottom of the thread but the composer.

- [ ] **Step 9: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(brief): Today leads the Brief, composed by the engine from session state on every read; the old meeting, referral and reconciliation lines are gone

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 5: Quieter agent posts (critique 2)

The permission chips leave each post (they stay on the agent roster in the context column and the thread list), "as of" appears once when every source of a post shares it, and the two "Take to …" buttons become one "Take to ▾" menu of destination threads.

**Files:**
- Create: `src/kit/source-chips/shared-as-of.ts`
- Modify: `src/workspace/thread/AgentFindingView.tsx`, `src/kit/source-chips/SourceChips.tsx`, `src/workspace/thread/CarryControl.tsx`, `src/workspace/thread/carry-targets.ts`, `e2e-visual/workspace-steps.ts`
- Test: `src/kit/__tests__/SourceChips.test.tsx`, `src/workspace/__tests__/carry-targets.test.ts`, `src/workspace/__tests__/brief-thread.test.tsx`, `src/workspace/__tests__/meeting-thread.test.tsx`, `src/workspace/__tests__/thread.test.tsx`
- E2E: `e2e-visual/readme-path.spec.ts`, `e2e-visual/rebalance-job.spec.ts`

**Interfaces:**
- Consumes: `fmtEasternStamp` (Task 2), `carryTargets`.
- Produces: `sharedAsOf(sources: readonly Source[]): string | undefined` (`src/kit/source-chips/shared-as-of.ts`); `CarryTarget = { thread: Thread; kind: 'team' | 'meeting' }` (no `label`); `takeFindingTo(finding: Locator, threadTitle: string): Promise<void>` in `e2e-visual/workspace-steps.ts`. The menu's control is a button named "Take to" (`aria-expanded`, `aria-controls`) opening a list named "Take to" of buttons named by each thread's title.

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/SourceChips.test.tsx` replace the first test and add one:

```ts
it('lists what a finding relies on; a single as-of shared by every source is said once, beside the label', () => {
  render(<SourceChips sources={[{ label: 'Drift calculation', detail: 'acc-002 vs Growth', asOf: '2026-02-25T12:00:00Z', confidence: 0.92 }]} />)
  expect(screen.getByText('Relies on')).toBeInTheDocument()
  expect(screen.getByText('as of 25 Feb 07:00 ET')).toBeInTheDocument()
  expect(screen.getByRole('listitem')).not.toHaveTextContent('as of')
  expect(screen.getByText('confidence 92')).toBeInTheDocument()
})

it('puts the as-of on each chip only where the sources differ', () => {
  render(<SourceChips sources={[{ label: 'Lots', asOf: '2026-02-25T12:00:00Z' }, { label: 'Held away', asOf: '2025-12-01T05:00:00Z' }, { label: 'Policy' }]} />)
  const items = within(screen.getByRole('list', { name: 'Relies on' })).getAllByRole('listitem')
  expect(items.map((i) => i.textContent)).toEqual(['Lotsas of 25 Feb 07:00 ET', 'Held awayas of 1 Dec 00:00 ET', 'Policy'])
  expect(screen.queryByText(/^as of .* ET$/, { selector: '[data-part="shared-as-of"]' })).toBeNull()
})
```

and in the separators test the expected parts become `['Rebalance preview', 'Robert Johnson Individual']`. In `carry-targets.test.ts` the mapping becomes `.map((t) => [t.thread.id, t.kind])` with `['th-johnson-review', 'team'], ['th-johnson-meeting', 'meeting']`.

In `src/workspace/__tests__/brief-thread.test.tsx` the carry tests become:

```ts
  it('a finding goes to the team thread through the Take to menu, once; Escape closes the menu and returns focus', async () => {
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(intc).not.toHaveTextContent(/may (not )?measure/i)
    const user = userEvent.setup()
    const toggle = within(intc).getByRole('button', { name: 'Take to' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const menu = within(intc).getByRole('list', { name: 'Take to' })
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    await user.click(toggle)
    await user.click(within(within(intc).getByRole('list', { name: 'Take to' })).getByRole('button', { name: 'Johnson Rebalance Review' }))
    expect(await within(intc).findByRole('status')).toHaveTextContent('Taken to Johnson Rebalance Review.')
    expect(menu).not.toBeInTheDocument()
    expect(within(intc).queryByRole('list', { name: 'Take to' })).toBeNull()
    expect(store().messages.filter((m) => m.kind === 'carried')).toHaveLength(1)
  })
```

and in the two later tests `getByRole('button', { name: 'Take to team thread' })` becomes `getByRole('button', { name: 'Take to' })`, while "the meeting thread joins" opens the menu and reads its items:

```ts
    await userEvent.setup().click(await within(intc).findByRole('button', { name: 'Take to' }))
    const menu = within(intc).getByRole('list', { name: 'Take to' })
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Johnson Rebalance Review'])
    release()
    await waitFor(() => expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Johnson Rebalance Review', 'Johnson annual review']))
```

`meeting-thread.test.tsx` line 28 opens the menu and clicks "Johnson annual review". `thread.test.tsx`: any assertion on "MAY …" chips in a post goes; a new one pins their absence: `expect(within(finding).queryByText(/^may /i)).toBeNull()`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/SourceChips.test.tsx src/workspace/__tests__/carry-targets.test.ts src/workspace/__tests__/brief-thread.test.tsx --testTimeout 30000`
Expected: FAIL — the as-of is on the chip; there is no "Take to" menu; `kind` is undefined.

- [ ] **Step 3: Shared as-of**

Create `src/kit/source-chips/shared-as-of.ts`:

```ts
import type { Source } from './SourceChips'

/** The as-of every source states, when they all state the same one; otherwise each chip says its own. */
export function sharedAsOf(sources: readonly Source[]): string | undefined {
  const [first] = sources
  if (first?.asOf === undefined) return undefined
  return sources.every((s) => s.asOf === first.asOf) ? first.asOf : undefined
}
```

In `SourceChips.tsx`: `chipParts(s, shared)` leaves out `as of …` when `s.asOf === shared`, and the label row becomes:

```tsx
      <span id={labelId} className="text-label uppercase text-ink-3">Relies on</span>
      {shared ? <span data-part="shared-as-of" className="text-label text-ink-3">{`as of ${fmtEasternStamp(shared)}`}</span> : null}
```

with `const shared = sharedAsOf(sources)` at the top of the component.

- [ ] **Step 4: No chips on the post**

In `AgentFindingView.tsx` delete the `<div className="flex flex-wrap gap-1.5">` holding the two `Tag`s and the `Tag` import. Nothing else changes; `AgentScope` (thread list and context column) keeps "may" and "may not".

- [ ] **Step 5: The Take to menu**

`carry-targets.ts`: `CarryTarget = { thread: Thread; kind: 'team' | 'meeting' }`; the two maps produce `{ thread, kind: 'team' }` and `{ thread, kind: 'meeting' }`. Replace `CarryControl.tsx`:

```tsx
import { useId, useState, type KeyboardEvent } from 'react'
import { Button } from '@/kit/button/Button'
import { useAccount } from '@/hooks/use-accounts'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'
import { carryTargets } from './carry-targets'

/** "Take to ▾": the brief's owner sends a finding to the team thread about its subject, or to its household's meeting thread. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [open, setOpen] = useState(false)
  const [taken, setTaken] = useState<string>()
  const toggleId = useId()
  const menuId = useId()
  const subject = thread.subject
  const account = useAccount(subject?.type === 'account' ? subject.id : '')
  const targets = carryTargets(threads.data ?? [], viewerId, subject, account.data?.householdId)
  if (thread.ownerId !== viewerId || targets.length === 0) return null
  const close = () => { setOpen(false); document.getElementById(toggleId)?.focus() }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); close() }
  }
  return (
    <div className="flex flex-col items-start gap-2" onKeyDown={onKeyDown}>
      <Button id={toggleId} rank="secondary" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>
        Take to <span aria-hidden="true">▾</span>
      </Button>
      {open ? (
        <ul id={menuId} aria-label="Take to" className="flex flex-col items-start gap-1 border-l border-rule-2 pl-3">
          {targets.map(({ thread: target }) => (
            <li key={target.id}>
              <Button rank="quiet" disabled={carry.isPending}
                onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => { setTaken(target.title); close() } })}>
                {target.title}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {taken ? <p role="status" className="text-body text-ink-2">{`Taken to ${taken}.`}</p> : null}
      {carry.isError ? <p role="alert" className="text-body">{carry.error.message}</p> : null}
    </div>
  )
}
```

(`Button` passes `id` and the ARIA attributes through `...rest`; Task 14 swaps the menu items' `disabled` for the pending pattern).

- [ ] **Step 6: The specs**

Add to `e2e-visual/workspace-steps.ts`:

```ts
/** A finding taken to a thread through its "Take to" menu. */
export async function takeFindingTo(finding: Locator, threadTitle: string) {
  await finding.getByRole('button', { name: 'Take to', exact: true }).click()
  await finding.getByRole('list', { name: 'Take to' }).getByRole('button', { name: threadTitle, exact: true }).click()
  await expect(finding.getByRole('status')).toHaveText(`Taken to ${threadTitle}.`)
}
```

`readme-path.spec.ts` step 2 and `rebalance-job.spec.ts` line 102: `await takeFindingTo(intc, 'Johnson Rebalance Review')` (import it).

- [ ] **Step 7: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual`.
Expected: unit PASS; the visual failures are the scenes in "Baselines by task" row 5 and no others. Regenerate the specs they belong to (`VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/<spec>.spec.ts` for each), list them with `git status --short e2e-visual/__baselines__`, and open each: no "MAY …" chips on any post, one "as of" per post beside "Relies on" (the held-away chips keep their own dates), one "Take to ▾" button per Brief finding.

- [ ] **Step 8: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(threads): quieter agent posts — no permission chips on a post, one shared as-of, and one Take to menu

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 6: Quieter shell and type (critique 2 and minors)

One visibility legend at the top of the thread list, a bare mark on each row; note-line actions on hover or focus; caps only for section labels and status codes; asset classes spelled out; Book risk's two readouts at the small size.

**Files:**
- Create: `src/kit/visibility/VisibilityMark.tsx`, `src/workspace/shell/VisibilityLegend.tsx`
- Modify: `src/kit/visibility/visibility.ts`, `src/kit/visibility/VisibilityBand.tsx`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/meeting/NotesEditor.tsx`, `src/kit/data-table/DataTable.tsx`, `src/kit/reading/Reading.tsx`, `src/kit/select/Select.tsx`, `src/kit/text-input/TextInput.tsx`, `src/kit/number-input/NumberInput.tsx`, `src/kit/record-slip/RecordSlip.tsx`, `src/workspace/thread/MessageView.tsx`, `src/workspace/thread/AgentFindingView.tsx`, `src/lib/labels.ts`, `src/workspace/reference/BookRiskPage.tsx`
- Test: `src/workspace/__tests__/shell.test.tsx`, `src/kit/__tests__/DataTable.test.tsx`, `src/kit/__tests__/VisibilityBand.test.tsx`, `src/workspace/__tests__/asset-class-label.test.ts`, `src/workspace/__tests__/meeting-view.test.tsx`, `src/workspace/__tests__/proposal-thread.test.tsx`

**Interfaces:**
- Consumes: `visibilityWords`, `threadParty`.
- Produces: `VISIBILITY_RULE: Readonly<Record<Visibility, string>>` in `visibility.ts` (moved out of `VisibilityBand.tsx`); `VisibilityMark({ visibility }: { visibility: Visibility })` (the rule alone, `aria-hidden`); `VisibilityLegend()`; each thread link carries `aria-describedby` → a `sr-only` "Visibility: …" note; `ASSET_CLASS_LABELS.intl_equity === 'International Equity'`, `ASSET_CLASS_LABELS.emerging_markets === 'Emerging Markets'`.

- [ ] **Step 1: The failing tests**

In `src/workspace/__tests__/shell.test.tsx` add:

```ts
  it('puts one visibility legend above the threads; each row is a bare mark with its visibility as a description', async () => {
    await renderHome()
    const legend = within(threadNav()).getByRole('list', { name: 'Visibility' })
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Only you', 'Firm only', 'Shared with the client or prospect'])
    const review = within(threadNav()).getByRole('link', { name: 'Johnson Rebalance Review' })
    expect(review).toHaveAccessibleDescription("Visibility: Firm only · client can't see")
    expect(within(threadNav()).getByRole('link', { name: 'Pell · prospect work' })).toHaveAccessibleDescription("Visibility: Firm only · prospect can't see")
    expect(threadNav()).not.toHaveTextContent("client can't see")
  })
```

In `src/kit/__tests__/DataTable.test.tsx`:

```ts
it('sets column headers in sentence case, at table size', () => {
  render(<DataTable caption="T" rows={[{ id: 'a' }]} getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }}
    columns={[{ id: 'sym', header: 'Symbol', cell: (r) => r.id, sortValue: (r) => r.id }]} />)
  const header = screen.getByRole('columnheader', { name: 'Symbol' })
  expect(header.className).not.toContain('uppercase')
  expect(within(header).getByRole('button').className).not.toContain('uppercase')
})
```

In `src/workspace/__tests__/asset-class-label.test.ts`:

```ts
it('spells every asset class out, one form everywhere', () => {
  for (const key of Object.keys(ASSET_CLASS_PROSE_LABELS) as AssetClass[]) expect(ASSET_CLASS_LABELS[key]).toBe(ASSET_CLASS_PROSE_LABELS[key])
  expect(ASSET_CLASS_LABELS.intl_equity).toBe('International Equity')
  expect(ASSET_CLASS_LABELS.emerging_markets).toBe('Emerging Markets')
})
```

In `src/workspace/__tests__/meeting-view.test.tsx` (where a held meeting's notes are editable):

```ts
  it("keeps a note line's Edit and Remove reachable by keyboard while showing them only on hover or focus", async () => {
    // (open the held meeting view with drafted notes, as the file's other editing tests do)
    const line = within(screen.getByRole('list', { name: 'Decisions' })).getAllByRole('listitem')[0]!
    const actions = within(line).getByRole('button', { name: /^Edit n-/ }).parentElement!
    expect(line.className).toContain('group')
    expect(actions.className).toContain('opacity-0')
    expect(actions.className).toContain('group-focus-within:opacity-100')
    expect(within(line).getByRole('button', { name: /^Edit n-/ })).not.toHaveAttribute('tabindex', '-1')
  })
```

`proposal-thread.test.tsx` line 72's `/^Emerging Mkts/` becomes `/^Emerging Markets/`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/workspace/__tests__/shell.test.tsx src/kit/__tests__/DataTable.test.tsx src/workspace/__tests__/asset-class-label.test.ts src/workspace/__tests__/meeting-view.test.tsx --testTimeout 30000`
Expected: FAIL on each new case.

- [ ] **Step 3: Legend and marks**

`visibility.ts` gains the rule classes (moved from `VisibilityBand.tsx`, which now imports them):

```ts
/** The mark each visibility draws: dashed for only you, hatched for the firm, solid for the client's thread. */
export const VISIBILITY_RULE: Readonly<Record<Visibility, string>> = {
  private: 'border-t-2 border-dashed border-ink-2',
  internal: 'hatch h-2 border-y border-ink-2',
  client: 'border-t-4 border-ink',
}
```

Create `src/kit/visibility/VisibilityMark.tsx`:

```tsx
import { VISIBILITY_RULE, type Visibility } from './visibility'

/** The visibility mark alone, for a list whose legend says the words once. Decorative: the row's description names it. */
export function VisibilityMark({ visibility }: { visibility: Visibility }) {
  return <div aria-hidden="true" data-visibility={visibility} className={VISIBILITY_RULE[visibility]} />
}
```

Create `src/workspace/shell/VisibilityLegend.tsx`:

```tsx
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import type { Visibility } from '@/kit/visibility/visibility'

const LEGEND: readonly { visibility: Visibility; words: string }[] = [
  { visibility: 'private', words: 'Only you' },
  { visibility: 'internal', words: 'Firm only' },
  { visibility: 'client', words: 'Shared with the client or prospect' },
]

/** What the thread list's marks mean, said once at its top. */
export function VisibilityLegend() {
  return (
    <ul aria-label="Visibility" className="flex flex-col gap-1.5 border-b border-rule pb-3">
      {LEGEND.map(({ visibility, words }) => (
        <li key={visibility} className="grid grid-cols-[2rem_1fr] items-center gap-2 text-label text-ink-3">
          <VisibilityMark visibility={visibility} /><span>{words}</span>
        </li>
      ))}
    </ul>
  )
}
```

In `ThreadList.tsx`: the firm viewer's list starts with `<VisibilityLegend />` (an outsider, who has one thread, gets none); in `ThreadGroup` each row renders `<VisibilityMark visibility={t.visibility} />` in place of the aria-hidden `VisibilityBand`, the `NavLink` gets `aria-describedby={noteId}`, and the row ends with `<span id={noteId} className="sr-only">{`Visibility: ${visibilityWords(t.visibility, threadParty(t))}`}</span>` (one `useId` per row: extract a `ThreadRow` component in the same file). The note sits inside the `<li>`, outside the link, so the link's name stays the thread's title.

- [ ] **Step 4: Note-line actions on hover or focus**

In `NotesEditor.tsx`, the line `<li>` gains `group`; the `<span className="ml-auto flex gap-1">` holding Edit and Remove becomes `className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"`. The line being edited keeps them shown: add `editing === line.id && 'opacity-100'` through `cn`. Opacity never removes a control from the tab order.

- [ ] **Step 5: Sentence case where caps were not a label or a status**

| File | Change |
|---|---|
| `DataTable.tsx` | `th`: `text-label uppercase text-ink-2` → `text-table font-semibold text-ink-2`; the sort `button` loses `uppercase` |
| `Reading.tsx` | the label span: `uppercase` → `tracking-normal` |
| `Select.tsx`, `TextInput.tsx`, `NumberInput.tsx` | the `<label>`: `uppercase` → `tracking-normal` |
| `RecordSlip.tsx` | each `<dt>`: `uppercase` → `tracking-normal` (the slip's `kind` line stays caps: a section label) |
| `MessageView.tsx` (`ByAgent`, `Authored`), `AgentFindingView.tsx`, and every other `text-label uppercase text-ink-3` span whose text is a role word (`grep -rn '>Agent<\|ROLE_LABEL\[' src/workspace`) | `uppercase` goes; the word reads "Agent", "Advisor" |

Pane titles, `SidePanel` labels, "Relies on", the Brief's group titles, `StatusCode` and `Tag` stay in caps.

- [ ] **Step 6: Words and sizes**

`src/lib/labels.ts`: `intl_equity: 'International Equity'`, `emerging_markets: 'Emerging Markets'`. `BookRiskPage.tsx`: both readings `size="readout-sm"`.

- [ ] **Step 7: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`. Tests that matched an uppercase header or "Intl Equity" by text are updated to the new words (Testing Library matches text, not CSS case, so most need nothing).
Run: `VISUAL_PORT=5195 pnpm visual`; regenerate every spec (`VISUAL_PORT=5195 pnpm visual:update`); `not-found-light` must not move. Open every listed PNG: the legend above Private, bare marks on the rows, sentence-case column headers and figure labels, "International Equity" in the gauges, Edit/Remove hidden in `meeting-after-*`, the two Book risk readouts at the small size.

- [ ] **Step 8: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(shell): one visibility legend, bare marks on the rows, note actions on hover or focus, caps only for labels and status, asset classes spelled out

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 7: The announcer (audit M1)

One persistent, initially empty `role="status"` region at app level, written through a hook. Agent posts, fills, saves, sends and recorded acts are announced through it. (Theme changes join in Task 12, View-as redirects in Task 9.)

**Files:**
- Create: `src/kit/announcer/announcer-context.ts`, `src/kit/announcer/AnnouncerProvider.tsx`, `src/kit/announcer/use-announce.ts`, `src/kit/__tests__/Announcer.test.tsx`
- Modify: `src/app/RootLayout.tsx`, `src/test/render.tsx`, `src/app/pages/KitPage.tsx` (only if it renders outside `RootLayout`: it does not, it is a child route), `src/workspace/context/AskAgents.tsx`, `src/workspace/context/ProposalAgentControl.tsx`, `src/workspace/prospect/ProspectAgentControl.tsx`, `src/workspace/context/LetterControl.tsx`, `src/workspace/context/RecapControl.tsx`, `src/workspace/meeting/MeetingControls.tsx`, `src/workspace/meeting/AgendaEditor.tsx`, `src/workspace/meeting/NotesEditor.tsx`, `src/workspace/workbench/DraftBar.tsx`, `src/workspace/thread/Composer.tsx`, `src/workspace/thread/CarryControl.tsx`, `src/workspace/reference/TakeToTeamThread.tsx`, `src/workspace/context/ConfirmRecord.tsx`, `src/workspace/context/ApprovalPanel.tsx`
- Test: `src/workspace/__tests__/after-release.test.tsx`, `src/workspace/__tests__/context.test.tsx`

**Interfaces:**
- Consumes: `fmtQuantity`, `personIn`, `useActs`.
- Produces: `AnnouncerProvider({ children })` (renders the region `<div role="status" aria-live="polite" aria-atomic="true" data-part="announcer" className="sr-only">`); `useAnnounce(): (message: string) => void` (throws outside the provider). `ConfirmRecord`'s `RecordedAct` is `{ id: string; summary: string }`.

- [ ] **Step 1: The failing tests**

Create `src/kit/__tests__/Announcer.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AnnouncerProvider } from '@/kit/announcer/AnnouncerProvider'
import { useAnnounce } from '@/kit/announcer/use-announce'

let say: (m: string) => void = () => undefined
function Speaker() { say = useAnnounce(); return null }
const region = () => document.querySelector('[data-part="announcer"]')
const frame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))

describe('the announcer', () => {
  it('is one polite status region, mounted empty', () => {
    render(<AnnouncerProvider><Speaker /></AnnouncerProvider>)
    expect(screen.getByRole('status')).toBe(region())
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(region()).toBeEmptyDOMElement()
  })
  it('writes a message a frame after clearing, so the same words twice are said twice', async () => {
    render(<AnnouncerProvider><Speaker /></AnnouncerProvider>)
    act(() => say('Drift Monitor reported in the thread.'))
    await frame()
    expect(region()).toHaveTextContent('Drift Monitor reported in the thread.')
    act(() => say('Drift Monitor reported in the thread.'))
    expect(region()).toBeEmptyDOMElement()
    await frame()
    expect(region()).toHaveTextContent('Drift Monitor reported in the thread.')
  })
  it('refuses to be used outside its provider', () => {
    expect(() => render(<Speaker />)).toThrow('useAnnounce must be used inside AnnouncerProvider')
  })
})
```

In `src/workspace/__tests__/context.test.tsx` (where Ask Drift Monitor is clicked) add:

```ts
  it('announces an agent run in the app announcer', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ask Drift Monitor' }))
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent('Drift Monitor reported in the thread.'))
  })
```

In `src/workspace/__tests__/after-release.test.tsx`:

```ts
  it('announces the release and its fills', async () => {
    approvedStoryV3()
    renderRoutes(routes, '/t/th-johnson-review')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Demo · act as Mark Davis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    const fills = () => store().messages.find((m) => m.kind === 'fills')
    await waitFor(() => expect(fills()).toBeDefined())
    const count = fills()!.kind === 'fills' ? (fills() as Extract<Message, { kind: 'fills' }>).fills.length : 0
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent(`Released by Mark Davis; ${count} orders filled`))
  })
```

(import `approvedStoryV3` from `@/mocks/workspace/__tests__/story-fixture` and `type Message`).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/Announcer.test.tsx src/workspace/__tests__/context.test.tsx src/workspace/__tests__/after-release.test.tsx --testTimeout 30000`
Expected: FAIL — the modules do not exist; nothing writes the region.

- [ ] **Step 3: The announcer**

`src/kit/announcer/announcer-context.ts`:

```ts
import { createContext } from 'react'

export const AnnouncerContext = createContext<((message: string) => void) | null>(null)
```

`src/kit/announcer/use-announce.ts`:

```ts
import { useContext } from 'react'
import { AnnouncerContext } from './announcer-context'

/** Says a message in the app's one polite live region. */
export function useAnnounce(): (message: string) => void {
  const announce = useContext(AnnouncerContext)
  if (!announce) throw new Error('useAnnounce must be used inside AnnouncerProvider')
  return announce
}
```

`src/kit/announcer/AnnouncerProvider.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnnouncerContext } from './announcer-context'

/**
 * The app's one live region, mounted empty and kept mounted, so screen readers hear what is written into it.
 * A message is written a frame after the region is cleared, so the same words twice are announced twice.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const frame = useRef(0)
  const announce = useCallback((next: string) => {
    cancelAnimationFrame(frame.current)
    setMessage('')
    frame.current = requestAnimationFrame(() => setMessage(next))
  }, [])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" data-part="announcer" className="sr-only">{message}</div>
    </AnnouncerContext.Provider>
  )
}
```

`RootLayout.tsx` wraps `KeyboardProvider` in `AnnouncerProvider`. `src/test/render.tsx`'s `Providers` wraps its children in `AnnouncerProvider` too (`renderRoutes` already goes through `RootLayout`). Tests that render a component bare with `render(...)` and reach `useAnnounce` wrap it in `AnnouncerProvider`; the full suite in Step 5 finds them.

- [ ] **Step 4: Who announces**

The rule: every success path that today shows a `role="status"` report after a write also says the same words through `announce`. Concretely:

| File | Announces |
|---|---|
| `AskAgents.tsx` | the `report` it sets (`${agent.name} reported in the thread.` or `… has already reported for this as-of.`) |
| `ProposalAgentControl.tsx` | in `onSuccess`: `alreadyDrafted ? \`${agent.name} has already drafted this proposal; v${detail.versions.length} is in the thread.\` : \`${agent.name} posted v1 in the thread.\`` |
| `ProspectAgentControl.tsx`, `LetterControl.tsx`, `RecapControl.tsx`, `MeetingControls.tsx`, `AgendaEditor.tsx`, `NotesEditor.tsx`, `DraftBar.tsx` | the status line each shows on success, word for word (e.g. `Saved as v3 · posted to the thread.`) |
| `Composer.tsx` | `Posted.` after a post; `savedNote` (`Draft saved — not sent.`) after a draft |
| `CarryControl.tsx`, `TakeToTeamThread.tsx` | `Taken to ${title}.` |
| `ConfirmRecord.tsx` | in `onSuccess`: `` `${act.summary} · ${act.id}` `` (widen `RecordedAct` to `{ id: string; summary: string }`; every caller's mutation returns a `BindingAct`, which has both) |
| `ApprovalPanel.tsx` | `record`'s `onSuccess` the same way (widen `RecordCallbacks`'s act to `{ id: string; summary: string }`); and the fills, below |

The fills: inside `ProposalApproval`, a ref holds the approval kind it last rendered; when it changes from `'approved'` to `'released'` (a release seen in this session, not one already released on load), announce `` `Released by ${personIn(directory, releaseAct.actorId).name}; ${fmtQuantity(detail.fills.length)} orders filled` ``, where `releaseAct` is `useActs(detail.threadId).data?.find((a) => a.id === approval.releaseActId)`; the effect waits until that act has arrived. Keep the hook local to the file (it is a `.tsx`).

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run --testTimeout 30000`
Expected: PASS. A test that did `screen.getByRole('status')` now finds two statuses (its own and the announcer): scope it to its region (`within(panel).getByRole('status')`), never delete the announcer.

- [ ] **Step 6: Nothing moved**

Run: `VISUAL_PORT=5195 pnpm visual`. Expected: PASS with no PNG change (the region is `sr-only`), axe clean.

- [ ] **Step 7: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src
git commit -m "feat(a11y): one app announcer; agent posts, fills, saves, sends and recorded acts are announced

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 8: Home as the five-minute path (audit H7, critique 4)

`/` says in one sentence what this is, keeps the fictional-firm notice, and lists the README's eight steps, numbered, each linking into its thread or view, each marked done from session state by engine-derived rules, the next undone one marked "Next". A plain list in the instrument style.

**Files:**
- Create: `src/types/workspace-story.ts`, `src/mocks/workspace/story-progress.ts`, `src/mocks/workspace/__tests__/story-progress.test.ts`, `src/workspace/shell/home-steps.ts`, `src/workspace/__tests__/home.test.tsx`
- Modify: `src/mocks/handlers/workspace.ts`, `src/services/workspace.ts`, `src/hooks/use-workspace.ts`, `src/workspace/shell/WorkspaceHome.tsx`, `e2e-visual/shell.spec.ts`

**Interfaces:**
- Consumes: `store`, `prospectOf` (`prospects.ts`), `PELL_ID`; `firmViewer` (`workspace-http.ts`); `get`, `as` (`services/api-client`, as the other workspace services use them).
- Produces:
  - `src/types/workspace-story.ts`: `STORY_STEP_IDS = ['brief', 'rebalance', 'release', 'blotter', 'meeting', 'pell', 'reference', 'view_as'] as const`; `StoryStepId`; `StoryProgress = { steps: { id: StoryStepId; done: boolean }[]; next: StoryStepId | null }`.
  - `storyProgress(): StoryProgress` (engine); `GET /api/workspace/story` (firm viewers; an outsider gets 404); `getStoryProgress(viewer: string)`; `useStoryProgress(enabled: boolean)` (key `['workspace', viewerId, 'story']`).
  - `HOME_STEPS: readonly HomeStep[]` with `HomeStep = { id: StoryStepId; title: string; detail: string; to: string; linkLabel: string }`.

- [ ] **Step 1: The engine test**

Create `src/mocks/workspace/__tests__/story-progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { requireProspect } from '../prospects'
import { storyProgress } from '../story-progress'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { sendToParty } from '../acts'
import { reconciliationView, resolveBreak } from '@/mocks/reference/reconciliation'
import { ADRIAN, approvedV1, ok, release } from './story-fixture'

const done = () => Object.fromEntries(storyProgress().steps.map((s) => [s.id, s.done]))

describe('the five-minute path, from session state', () => {
  it('starts with nothing done and the Brief next', () => {
    expect(storyProgress()).toEqual({ steps: expect.any(Array), next: 'brief' })
    expect(Object.values(done()).every((d) => !d)).toBe(true)
  })

  it('an approval completes the rebalance, and the Brief before it', () => {
    approvedV1()
    expect(done()).toMatchObject({ brief: true, rebalance: true, release: false, blotter: false })
    expect(storyProgress().next).toBe('release')
  })

  it('a release completes the release, and the blotter waits for a later step', () => {
    release(approvedV1())
    expect(done()).toMatchObject({ release: true, blotter: false })
    expect(storyProgress().next).toBe('blotter')
  })

  it('the meeting is done once filed and its recap sent; then the blotter, read on the way, is done too', () => {
    release(approvedV1())
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    ok(fileMeetingRecord(ADRIAN, 'evt-010', meetingView(ADRIAN, 'evt-010')!.notesFingerprint!))
    expect(done()).toMatchObject({ meeting: false })
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    ok(sendToParty(ADRIAN, draft.id))
    expect(done()).toMatchObject({ meeting: true, blotter: true })
    expect(storyProgress().next).toBe('pell')
  })

  it('Dr. Pell is done once her proposal is sent and she has accepted', () => {
    const pell = requireProspect('prsp-011')
    pell.sent = { proposalId: 'pp-1', version: 2, actId: 'REC-0101', messageId: 'msg-x1', at: '2026-02-26T15:00:00.000Z' }
    expect(done()).toMatchObject({ pell: false })
    pell.accepted = { proposalId: 'pp-1', version: 2, actId: 'REC-0102', at: '2026-03-02T15:00:00.000Z' }
    expect(done()).toMatchObject({ pell: true })
  })

  it('a resolved break completes the reference views; View as Robert is never marked done, only next', () => {
    const open = reconciliationView(ADRIAN)!.breaks.find((b) => b.id === 'brk-002')!
    ok(resolveBreak(ADRIAN, { breakId: 'brk-002', fingerprint: open.fingerprint, resolution: 'timing_difference', rationale: 'Schwab confirmed the sweep posted late.' }))
    expect(done()).toMatchObject({ reference: true, view_as: false, brief: true, blotter: true })
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/story-progress.test.ts --testTimeout 30000`
Expected: FAIL — `../story-progress` does not exist.

- [ ] **Step 3: The engine, the route, the service, the hook**

`src/types/workspace-story.ts`:

```ts
/** The README's eight steps, in order. */
export const STORY_STEP_IDS = ['brief', 'rebalance', 'release', 'blotter', 'meeting', 'pell', 'reference', 'view_as'] as const
export type StoryStepId = (typeof STORY_STEP_IDS)[number]
export type StoryProgress = { steps: { id: StoryStepId; done: boolean }[]; next: StoryStepId | null }
```

`src/mocks/workspace/story-progress.ts`:

```ts
import { STORY_STEP_IDS, type StoryProgress, type StoryStepId } from '@/types/workspace-story'
import type { BindingActKind } from '@/types/workspace'
import { store } from '@/mocks/data/workspace-store'
import { PELL_ID } from '@/mocks/data/prospect-seed'
import { prospectOf } from './prospects'

/**
 * How far the session has come along the README's path. Steps 2, 3, 5, 6 and 7 are done by what the
 * session recorded; steps 1 (the Brief) and 4 (the blotter) are reading steps, done once a later step is;
 * step 8 (View as Robert) changes nothing, so it is never done — only next, at the end.
 */
export function storyProgress(): StoryProgress {
  const s = store()
  const recorded = (kind: BindingActKind) => s.acts.some((a) => a.kind === kind)
  const pell = prospectOf(PELL_ID)
  if (!pell) throw new Error(`The story's prospect ${PELL_ID} is not in the session`)
  const ruled = new Map<StoryStepId, boolean>([
    ['rebalance', recorded('approve_proposal')],
    ['release', recorded('release_orders')],
    ['meeting', s.meetings.some((m) => m.state === 'filed') && s.acts.some((a) => a.kind === 'send_to_party' && a.recordBasis !== undefined)],
    ['pell', pell.sent !== undefined && pell.accepted !== undefined],
    ['reference', recorded('resolve_break')],
  ])
  const steps = STORY_STEP_IDS.map((id, i) => {
    const rule = ruled.get(id)
    if (rule !== undefined) return { id, done: rule }
    const laterDone = id !== 'view_as' && STORY_STEP_IDS.slice(i + 1).some((later) => ruled.get(later) === true)
    return { id, done: laterDone }
  })
  return { steps, next: steps.find((step) => !step.done)?.id ?? null }
}
```

(`?? null` here is the type's own "nothing left" value, not a fallback for a missing fact.) In `src/mocks/handlers/workspace.ts` add to `workspaceHandlers`:

```ts
  http.get('/api/workspace/story', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? HttpResponse.json(storyProgress()) : viewer.response
  }),
```

`src/services/workspace.ts`: `export const getStoryProgress = (viewer: string) => get<StoryProgress>('/workspace/story', undefined, as(viewer))`. `src/hooks/use-workspace.ts`:

```ts
/** The README path's progress, for the home page. Firm viewers only: an outsider's home lists no firm steps. */
export function useStoryProgress(enabled: boolean) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'story'], queryFn: () => api.getStoryProgress(viewerId), enabled })
}
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/story-progress.test.ts src/__tests__/guardrails/api-routes.test.ts --testTimeout 30000`. Expected: PASS (the route guard sees the new route and its caller).

- [ ] **Step 4: The home test**

Create `src/workspace/__tests__/home.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approvedV1 } from '@/mocks/workspace/__tests__/story-fixture'

const path = () => screen.findByRole('list', { name: 'The five-minute path' })

describe('home', () => {
  it('says what this is, keeps the notice, and lists the eight steps, the Brief next', async () => {
    renderRoutes(routes, '/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByText(/^One advisor's day at Larkfield Advisory/)).toBeInTheDocument()
    expect(screen.getByText(/everyone in it are fictional/)).toBeInTheDocument()
    const steps = within(await path()).getAllByRole('listitem')
    expect(steps).toHaveLength(8)
    expect(within(steps[0]!).getByRole('link', { name: 'Open the Brief' })).toHaveAttribute('href', '/t/th-brief')
    await waitFor(() => expect(steps[0]).toHaveTextContent('NEXT'))
    expect(screen.queryByText('DONE')).toBeNull()
  })

  it('marks what the session has done and the next step', async () => {
    approvedV1()
    renderRoutes(routes, '/')
    const steps = within(await path()).getAllByRole('listitem')
    await waitFor(() => expect(steps[2]).toHaveTextContent('NEXT'))
    expect(steps[0]).toHaveTextContent('DONE')
    expect(steps[1]).toHaveTextContent('DONE')
  })

  it("gives an outsider no firm steps", async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/')
    await screen.findByRole('heading', { level: 1, name: 'Workspace' })
    await waitFor(() => expect(screen.queryByRole('list', { name: 'The five-minute path' })).toBeNull())
  })
})
```

Run it: FAIL (no list).

- [ ] **Step 5: The steps and the page**

`src/workspace/shell/home-steps.ts` (the README's eight steps; Task 22 keeps the two in agreement):

```ts
import type { StoryStepId } from '@/types/workspace-story'

export type HomeStep = { id: StoryStepId; title: string; detail: string; to: string; linkLabel: string }

export const HOME_STEPS: readonly HomeStep[] = [
  { id: 'brief', title: 'The Brief', detail: 'Today, what needs a decision, and the context behind it.', to: '/t/th-brief', linkLabel: 'Open the Brief' },
  { id: 'rebalance', title: 'The Johnson rebalance and harvest', detail: 'Take the Intel finding to the team thread, ask the Proposal Agent, revise to harvest only, exclude QAI in the workbench, approve v3.', to: '/t/th-johnson-review', linkLabel: 'Open Johnson Rebalance Review' },
  { id: 'release', title: 'Compliance releases, as Mark Davis', detail: "The presenter's shortcut records Mark's release; the orders fill at the day's prices.", to: '/t/th-johnson-review', linkLabel: 'Open the approval' },
  { id: 'blotter', title: 'The blotter and the moved book', detail: "Each order filled under the release's record; Intel leaves the holdings and the Brief's decisions.", to: '/blotter', linkLabel: 'Open the blotter' },
  { id: 'meeting', title: 'The Johnson annual review', detail: 'Prep, hold the meeting, draft and file the notes, then send Robert the recap.', to: '/t/th-johnson-meeting', linkLabel: 'Open Johnson annual review' },
  { id: 'pell', title: 'Dr. Amanda Pell, first contact to onboarding', detail: 'Form CRS before the coffee (firm policy), her reply, a staged sale over two tax years, her acceptance.', to: '/t/th-pell', linkLabel: 'Open her thread' },
  { id: 'reference', title: 'The reference views', detail: 'Billing, Models, Practice and the Blotter; resolve a reconciliation break; take a risk row to a team thread.', to: '/reconciliation', linkLabel: 'Open Reconciliation' },
  { id: 'view_as', title: 'View as Robert', detail: 'Set View as to Robert Johnson · Client: one thread, his own.', to: '/t/th-robert', linkLabel: 'Open his thread' },
]
```

Replace `WorkspaceHome.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { Tag } from '@/kit/tag/Tag'
import { fmtDayMonthYear, fmtQuantity } from '@/kit/measure'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { FIRM_NAME } from '@/lib/firm'
import { useDirectory, useStoryProgress } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { StoryProgress } from '@/types/workspace-story'
import { HOME_STEPS } from './home-steps'

const LINK = 'text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

export function WorkspaceHome() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const firm = directory.data !== undefined && !isExternalViewerIn(directory.data, viewerId)
  const progress = useStoryProgress(firm)
  return (
    <div className="flex max-w-[46rem] min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Workspace</h1>
        <p className="text-copy">{`One advisor's day at ${FIRM_NAME}: agents measure the book, the advisor decides, compliance releases, and each client sees only what is theirs.`}</p>
        <p className="text-body text-ink-3">
          {`A demonstration: ${FIRM_NAME} and everyone in it are fictional, the date is frozen at ${fmtDayMonthYear(MOCK_TODAY_ISO)}, and nothing here is investment, tax or legal advice.`}
        </p>
      </header>
      {firm ? <FiveMinutePath progress={progress.data} /> : null}
    </div>
  )
}

function FiveMinutePath({ progress }: { progress: StoryProgress | undefined }) {
  const doneOf = new Map(progress?.steps.map((s) => [s.id, s.done]))
  return (
    <section aria-labelledby="five-minute-path" className="flex flex-col gap-3">
      <h2 id="five-minute-path" className="border-b border-ink pb-2 text-label uppercase text-ink-2">Five minutes, in order</h2>
      <ol aria-label="The five-minute path" className="flex flex-col">
        {HOME_STEPS.map((step, i) => (
          <li key={step.id} className="grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-3 border-b border-rule py-3 last:border-b-0">
            <span className="tabular text-body text-ink-3">{fmtQuantity(i + 1)}</span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-copy font-semibold">{step.title}</span>
              <span className="text-body text-ink-2">{step.detail}</span>
              <Link to={step.to} className={`self-start ${LINK}`}>{step.linkLabel}</Link>
            </div>
            <span>{progress?.next === step.id ? <Tag tone="solid">NEXT</Tag> : doneOf.get(step.id) ? <Tag>DONE</Tag> : null}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

(`FIRM_NAME` is "Larkfield Advisory"; the `h2` id is a fixed string because there is one home page). Run: `pnpm vitest run src/workspace/__tests__/home.test.tsx src/workspace/__tests__/shell.test.tsx src/__tests__/guardrails --testTimeout 30000`. Expected: PASS (the route guard accepts every `to`: each matches a route, and each `/t/…` names a seeded thread).

- [ ] **Step 6: Baselines**

In `e2e-visual/shell.spec.ts` add a scene after `home-dark`:

```ts
const homeMidStory = async (page: Page) => {
  await visit(page, '/t/th-johnson-review', 'light')
  await page.getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Proposal · Johnson rebalance' }).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
  const approval = page.getByRole('complementary', { name: 'Thread context' }).getByRole('region', { name: 'Approval · Johnson rebalance' })
  await approval.getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade reading.' }).check()
  await approval.getByRole('button', { name: 'Approve v1' }).click()
  await expect(approval).toContainText('PENDING COMPLIANCE REVIEW')
  await page.getByRole('banner').getByRole('link', { name: 'Advisor Desktop' }).click()
  await expect(page.getByRole('list', { name: 'The five-minute path' }).getByRole('listitem').nth(2)).toContainText('NEXT')
  await settle(page)
}
```

with `{ name: 'home-mid-story-light', hasContext: false, open: homeMidStory }` in `SCENES` (an in-app link, not a reload: a reload resets the session). Run `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/shell.spec.ts`; `git status` lists `home-light.png`, `home-dark.png` (changed) and `home-mid-story-light.png` (new) only. Open all three: the sentence, the notice, eight numbered steps, NEXT on step 1 (fresh) or step 3 (mid-story) with DONE on 1 and 2. Then `VISUAL_PORT=5195 pnpm visual` passes.

- [ ] **Step 7: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(home): the five-minute path, live — eight numbered steps into the threads, each marked done from session state, the next one marked

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 9: Empty states and the View-as redirect (audit M10, L12; critique 4)

Each empty state names what fills it and the step that does. A session-state page on a fresh load says the demo resets on reload, with a link to the Brief. A View-as switch that sends the viewer home says why, visibly and through the announcer.

**Files:**
- Create: `src/workspace/full-views/hidden-redirect.ts`
- Modify: `src/workspace/full-views/use-go-home-when-hidden.ts` and its callers (`ThreadPage.tsx`, `ReferenceGate.tsx`, `WorkbenchPage.tsx`, `MeetingPage.tsx`, `ProspectPage.tsx`, `HouseholdView.tsx`, `ClientView.tsx`), `ArchivePage.tsx`, `AccountView.tsx`, `SupervisionPage.tsx`, `WorkspaceHome.tsx`, `FullViewNotFound.tsx`, `SupervisionQueue.tsx`, `ArchiveTable.tsx`, `src/kit/data-table/DataTable.tsx`, `e2e-visual/rebalance-job.spec.ts`
- Test: `src/workspace/__tests__/viewer.test.tsx`, `src/workspace/__tests__/supervision.test.tsx`, `src/workspace/__tests__/archive.test.tsx`, `src/workspace/__tests__/workbench-layout.test.tsx`, `src/kit/__tests__/DataTable.test.tsx`

**Interfaces:**
- Consumes: `useAnnounce` (Task 7), `useViewAsDirectory`.
- Produces: `HiddenRedirect = { hiddenSubject: string }` and `hiddenRedirectOf(state: unknown): HiddenRedirect | undefined` in `hidden-redirect.ts`; `useGoHomeWhenHidden(query, subject: string): boolean` (the subject as the sentence names it: "Billing", "this thread", "this proposal"); `FullViewNotFound({ subject, resetsOnReload?: boolean })`; `DataTable`'s optional `empty?: string`, said in place of "No {plural}." when the table has no rows.

- [ ] **Step 1: The failing tests**

In `src/workspace/__tests__/viewer.test.tsx`:

```ts
  it('switching to Robert on Billing goes home and says why, on the page and in the announcer', async () => {
    const { router } = renderRoutes(routes, '/billing')
    await screen.findByRole('heading', { level: 1, name: 'Billing' })
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText("Robert Johnson can't see Billing; showing the workspace.")).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent("Robert Johnson can't see Billing; showing the workspace."))
  })
```

In `src/workspace/__tests__/supervision.test.tsx` (Adrian's empty queue):

```ts
  it('says what fills each empty group and how the demo fills it', async () => {
    renderRoutes(routes, '/supervision')
    expect(await screen.findByText('Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve).')).toBeInTheDocument()
    expect(screen.getByText('Sent client messages appear here for review.')).toBeInTheDocument()
    expect(screen.getByText(/^Choose an item from the queue: its evidence/)).toBeInTheDocument()
  })
```

In `src/workspace/__tests__/archive.test.tsx` (filters that match nothing on a fresh session): `expect(await screen.findByText('Recorded acts appear here: approvals, releases, filings, deliveries and resolutions.')).toBeInTheDocument()`.

In `src/workspace/__tests__/workbench-layout.test.tsx`:

```ts
  it('a proposal on a fresh load says the demo resets on reload, and links to the Brief', async () => {
    renderRoutes(routes, '/proposals/prop-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposal not found' })).toBeInTheDocument()
    expect(screen.getByText("This demo's state resets when the page reloads.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start again from the Brief' })).toHaveAttribute('href', '/t/th-brief')
  })
```

In `src/kit/__tests__/DataTable.test.tsx`: a table with `rows={[]}` and `empty="Recorded acts appear here."` shows that text and not "No rows.".

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/workspace/__tests__/viewer.test.tsx src/workspace/__tests__/supervision.test.tsx src/workspace/__tests__/archive.test.tsx src/workspace/__tests__/workbench-layout.test.tsx src/kit/__tests__/DataTable.test.tsx --testTimeout 30000`
Expected: FAIL on each new case.

- [ ] **Step 3: The redirect says why**

`src/workspace/full-views/hidden-redirect.ts`:

```ts
/** The router state a View-as redirect leaves for the home page: what the new viewer could not see. */
export type HiddenRedirect = { hiddenSubject: string }

export function hiddenRedirectOf(state: unknown): HiddenRedirect | undefined {
  if (typeof state !== 'object' || state === null || !('hiddenSubject' in state)) return undefined
  return typeof state.hiddenSubject === 'string' ? { hiddenSubject: state.hiddenSubject } : undefined
}
```

`useGoHomeWhenHidden(query, subject)` navigates with `navigate('/', { replace: true, state: { hiddenSubject: subject } satisfies HiddenRedirect })`. Callers pass: `ThreadPage` "this thread", `ReferenceGate` its `subject` prop ("Billing", "Risk", "Models", "Model", "Practice", "Blotter", "Reconciliation", "Account"), `WorkbenchPage` "this proposal", `MeetingPage` "this meeting", `ProspectPage` "this prospect", `HouseholdView` "this household", `ClientView` "this client". `ArchivePage`, `AccountView` and `SupervisionPage` pass the same state from their own `navigate('/')` ("the Archive", "this account", "Supervision").

In `WorkspaceHome.tsx`, under the header:

```tsx
function RedirectNote() {
  const location = useLocation()
  const redirect = hiddenRedirectOf(location.state)
  const { viewerId } = useViewer()
  const people = useViewAsDirectory(redirect !== undefined)
  const announce = useAnnounce()
  const name = people.data?.people.find((p) => p.id === viewerId)?.name
  const sentence = redirect && name ? `${name} can't see ${redirect.hiddenSubject}; showing the workspace.` : undefined
  const said = useRef<string>()
  useEffect(() => {
    // Once per redirect (the location key), so a re-render or StrictMode's second effect does not say it twice.
    if (sentence && said.current !== location.key) { said.current = location.key; announce(sentence) }
  }, [sentence, location.key, announce])
  return sentence ? <p className="text-body text-ink-2">{sentence}</p> : null
}
```

(local to the file; `useRef`, `useEffect` from React; `useLocation` from react-router-dom).

- [ ] **Step 4: Empty states that teach**

- `SupervisionQueue.tsx`: Orders `empty: 'Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve).'`; Correspondence `empty: 'Sent client messages appear here for review.'`. Alerts and Disposed today keep theirs.
- `SupervisionPage.tsx`: "Choose an item from the queue." becomes "Choose an item from the queue: its evidence, and the acts compliance can record on it, appear here."; the not-in-queue sentence gains " This demo's state resets when the page reloads."
- `DataTable.tsx`: optional prop `empty?: string`; the no-rows cell reads `all === 0 ? (empty ?? \`No ${noun.plural}.\`) : …` (an explicit default the caller may replace).
- `ArchiveTable.tsx`: `empty="Recorded acts appear here: approvals, releases, filings, deliveries and resolutions."`.
- `FullViewNotFound.tsx`:

```tsx
export function FullViewNotFound({ subject, resetsOnReload = false }: { subject: string; resetsOnReload?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{`${subject} not found`}</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      {resetsOnReload ? (
        <>
          <p className="text-body text-ink-2">This demo&apos;s state resets when the page reloads.</p>
          <Link to="/t/th-brief" className="self-start text-body underline underline-offset-4">Start again from the Brief</Link>
        </>
      ) : <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>}
    </div>
  )
}
```

`WorkbenchPage.tsx` passes `resetsOnReload` (a proposal exists only in the session).

- [ ] **Step 5: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`. Expected: PASS.

Add a scene to `e2e-visual/rebalance-job.spec.ts`'s scene list (layout `'workbench'` does not apply; give it its own one-off test after the loop):

```ts
test('a proposal on a fresh load · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/proposals/prop-0001', 'light')
  await expect(heading(page)).toHaveText('Proposal not found')
  await settle(page)
  await expect(page).toHaveScreenshot('proposal-reset-light.png', SCREENSHOT)
  await expectNoAxeViolations(page)
})
```

Run `VISUAL_PORT=5195 pnpm visual`; regenerate only the specs whose scenes moved (`compliance-review.spec.ts` if the supervision scenes show an empty group, and `rebalance-job.spec.ts` for the new PNG). Open each: the new sentences and nothing else changed.

- [ ] **Step 6: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(onboard): empty states that say what fills them, a reset-on-reload not-found, and a View-as redirect that says why

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 10: Workbench drift as one table (critique 3)

One table replaces the before and after stacks: per class, a gauge with a ghost tick at before and a solid mark at after, then before, after and Δ, and its status. Residual reasons stay on their rows.

**Files:**
- Create: `src/workspace/workbench/drift-rows.ts`, `src/workspace/workbench/DriftTable.tsx`, `src/workspace/__tests__/drift-table.test.tsx`
- Delete: `src/workspace/workbench/DriftComparison.tsx`
- Modify: `src/kit/gauge/Gauge.tsx`, `src/workspace/workbench/WorkbenchSummary.tsx`
- Test: `src/kit/__tests__/Gauge.test.tsx`, `src/workspace/__tests__/workbench-body.test.tsx`

**Interfaces:**
- Consumes: `DriftStatus` (`@/types/portfolio`), `ProjectedDrift` (`@/services/oms`), `ASSET_CLASS_PROSE_LABELS`, `RESIDUAL_WORDS`, `sharedGaugeDomain`, `driftStatus`, `DataTable`, `StatusCode`, `fmtDrift`.
- Produces: `WorkbenchDriftRow = { assetClass: AssetClass; label: string; before: number; after: number; delta: number; band: number; reason?: string }` and `workbenchDriftRows(before: DriftStatus, projected: ProjectedDrift): WorkbenchDriftRow[]` in `drift-rows.ts` (a new file in `workbench/`; `proposal/drift-rows.ts` is a different helper and stays); `Gauge` gains `before?: number` (a ghost tick) and `bare?: boolean` (only the svg, still with its `aria-label`).

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/Gauge.test.tsx`:

```tsx
it('draws a ghost tick at before and a solid mark at after, and says both', () => {
  render(<Gauge label="US Equity" drift={0.012} before={0.132} band={0.05} bare />)
  const img = screen.getByRole('img')
  expect(img).toHaveAccessibleName('US Equity: drift +13.2 before, +1.2 after, percentage points against tolerance ±5.0 percentage points, IN')
  expect(img.querySelector('[data-part="ghost"]')).not.toBeNull()
  expect(screen.queryByText('US Equity')).toBeNull()
})
```

Create `src/workspace/__tests__/drift-table.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { workbenchDriftRows } from '@/workspace/workbench/drift-rows'
import { DriftTable } from '@/workspace/workbench/DriftTable'
import type { DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'

const before = { driftTolerance: 0.05, assetClassDrifts: [
  { assetClass: 'us_equity', drift: 0.132, actual: 0.682, target: 0.55 },
  { assetClass: 'cash', drift: -0.01, actual: 0.01, target: 0.02 },
] } as unknown as DriftStatus
const projected = { driftTolerance: 0.05, assetClassDrifts: [
  { assetClass: 'us_equity', drift: 0.012 },
  { assetClass: 'cash', drift: -0.008, residualReason: 'cash_capped' },
] } as unknown as ProjectedDrift

describe('workbench drift, before and after on one row', () => {
  it('joins each class before and after with its delta and reason', () => {
    expect(workbenchDriftRows(before, projected)).toMatchObject([
      { assetClass: 'us_equity', label: 'US Equity', before: 0.132, after: 0.012 },
      { assetClass: 'cash', reason: "held to the model's cash target" },
    ])
    expect(workbenchDriftRows(before, projected)[0]!.delta).toBeCloseTo(-0.12)
  })
  it('refuses a class drawn after that was not measured before', () => {
    const extra = { ...projected, assetClassDrifts: [...projected.assetClassDrifts, { assetClass: 'commodities', drift: 0.01 }] } as unknown as ProjectedDrift
    expect(() => workbenchDriftRows(before, extra)).toThrow('Drift before has no commodities')
  })
  it('is one table, one row per class, reasons on their rows', () => {
    render(<DriftTable before={before} projected={projected} />)
    const table = screen.getByRole('table', { name: 'Drift before and after' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('+13.2')
    expect(rows[0]).toHaveTextContent('+1.2')
    expect(rows[0]).toHaveTextContent('−12.0')
  })
})
```

(the cast is the test's fixture, carrying only the fields the rows read). In `workbench-body.test.tsx`, assertions on "Drift before"/"Drift after" headings become the table `Drift before and after` with one row per class.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/Gauge.test.tsx src/workspace/__tests__/drift-table.test.tsx --testTimeout 30000`
Expected: FAIL — no `before`/`bare` on the gauge; the modules do not exist.

- [ ] **Step 3: The gauge's ghost**

In `Gauge.tsx`: props `{ label; drift; band; domain?; before?: number; bare?: boolean }`. The domain covers `before` too (`sharedDomain ?? Math.max(gaugeDomain(drift, band), before === undefined ? 0 : gaugeDomain(before, band))`). After the band rect, when `before !== undefined`: `<line data-part="ghost" x1={scale(before)} x2={scale(before)} y1={3} y2={H - 3} className="stroke-ink-3" strokeWidth={1} strokeDasharray="2 2" />`. The description: with `before`, `${label}: drift ${fmtDrift(before)} before, ${fmtDrift(drift)} after, percentage points against tolerance ${fmtTolerance(band)} percentage points, ${status}`. With `bare`, the component returns the `svg` alone (no label, readout or status spans).

- [ ] **Step 4: The rows and the table**

`src/workspace/workbench/drift-rows.ts`:

```ts
import { ASSET_CLASS_PROSE_LABELS } from '@/lib/labels'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import type { AssetClass, DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'

export type WorkbenchDriftRow = { assetClass: AssetClass; label: string; before: number; after: number; delta: number; band: number; reason?: string }

/** Each class's drift before the trades beside its drift after, in the after list's order, with the engine's reason where it stays away from target. */
export function workbenchDriftRows(before: DriftStatus, projected: ProjectedDrift): WorkbenchDriftRow[] {
  return projected.assetClassDrifts.map((d) => {
    const was = before.assetClassDrifts.find((b) => b.assetClass === d.assetClass)
    if (!was) throw new Error(`Drift before has no ${d.assetClass}`)
    return {
      assetClass: d.assetClass, label: ASSET_CLASS_PROSE_LABELS[d.assetClass], before: was.drift, after: d.drift,
      delta: d.drift - was.drift, band: projected.driftTolerance, ...(d.residualReason ? { reason: RESIDUAL_WORDS[d.residualReason] } : {}),
    }
  })
}
```

(`AssetClass` is imported from `@/types/portfolio` as `src/lib/labels.ts` imports it). `src/workspace/workbench/DriftTable.tsx`:

```tsx
import { DataTable } from '@/kit/data-table/DataTable'
import { Gauge } from '@/kit/gauge/Gauge'
import { driftStatus, sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { StatusCode } from '@/kit/status/StatusCode'
import { UNIT, fmtDrift } from '@/kit/measure'
import type { DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'
import { workbenchDriftRows } from './drift-rows'

/** Drift before and after the trades, one row per class on one shared scale: the change is the picture. */
export function DriftTable({ before, projected }: { before: DriftStatus; projected: ProjectedDrift }) {
  const rows = workbenchDriftRows(before, projected)
  const domain = sharedGaugeDomain(rows.flatMap((r) => [r.before, r.after]), projected.driftTolerance)
  return (
    <DataTable caption="Drift before and after" rows={rows} getRowId={(r) => r.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }}
      columns={[
        { id: 'class', header: 'Asset class', wrap: true, cell: (r) => (
          <span className="flex flex-col"><span>{r.label}</span>{r.reason ? <span className="text-label text-ink-3">{r.reason}</span> : null}</span>
        ) },
        { id: 'gauge', header: 'Before → after', cell: (r) => <Gauge bare label={r.label} drift={r.after} before={r.before} band={r.band} domain={domain} /> },
        { id: 'before', header: 'Before', unit: UNIT.pp, align: 'right', cell: (r) => fmtDrift(r.before) },
        { id: 'after', header: 'After', unit: UNIT.pp, align: 'right', cell: (r) => fmtDrift(r.after) },
        { id: 'delta', header: 'Δ', unit: UNIT.pp, align: 'right', cell: (r) => fmtDrift(r.delta) },
        { id: 'status', header: 'Status', cell: (r) => <StatusCode status={driftStatus(r.after, r.band)} /> },
      ]} />
  )
}
```

`WorkbenchSummary.tsx` renders `<DriftTable before={view.driftBefore} projected={view.preview.projectedDrift} />` where it rendered `DriftComparison`; delete `DriftComparison.tsx`.

- [ ] **Step 5: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`. Expected: PASS.
Run: `VISUAL_PORT=5195 pnpm visual`; only `workbench-light` and `workbench-dark` move. `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/rebalance-job.spec.ts`; open both: one nine-row table, each gauge with a dashed ghost and a solid after mark, reasons under their classes; the workbench is shorter.

- [ ] **Step 6: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(workbench): drift before and after on one row per class, the gauge's ghost at before and its mark at after

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 11: Meeting view order (critique 3)

The meeting view follows the meeting: header and agenda, then the transcript beside the notes, then the household summary as a collapsed "Household reference".

**Files:**
- Modify: `src/workspace/meeting/MeetingPage.tsx`
- Test: `src/workspace/__tests__/meeting-view.test.tsx`

**Interfaces:**
- Consumes: `HouseholdSummaryPanes`, `Pane`, `AgendaEditor`, `TranscriptNotes`, `TaskTable`.
- Produces: the household summary inside `<section aria-label="Household reference"><details>…</details></section>`, closed by default.

- [ ] **Step 1: The failing test**

In `meeting-view.test.tsx`:

```ts
  it('reads in the order of the meeting: agenda, then transcript and notes, then the household reference, folded', async () => {
    // (open the held meeting view as the file's other tests do)
    const agenda = screen.getByRole('heading', { level: 2, name: 'Agenda' })
    const transcript = await screen.findByRole('heading', { level: 2, name: 'Transcript' })
    const reference = screen.getByRole('region', { name: 'Household reference' })
    expect(agenda.compareDocumentPosition(transcript) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(transcript.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(reference.querySelector('details')).not.toHaveAttribute('open')
  })
```

(the transcript is `TranscriptNotes`' `Pane title="Transcript"`). Run: FAIL (the agenda follows the notes; no region).

- [ ] **Step 2: The order**

In `MeetingFullView`'s returned tree: the header; `MeetingControls`; the Agenda `Pane`; `TranscriptNotes`; the Follow-up tasks `Pane` (when filed); then:

```tsx
      <section aria-label="Household reference" className="flex min-w-0 flex-col gap-3">
        <details>
          <summary className="cursor-pointer border-b border-ink pb-2 text-label uppercase text-ink-2">Household reference</summary>
          <div className="mt-4">
            {household.isPending ? <p role="status" className="text-body text-ink-3">Loading the household…</p>
              : household.isError ? <p role="alert" className="text-body">{household.error.message}</p>
              : <HouseholdSummaryPanes summary={household.data} />}
          </div>
        </details>
      </section>
```

Tests elsewhere in the file that read a household table first open the details: `await user.click(within(screen.getByRole('region', { name: 'Household reference' })).getByText('Household reference'))`.

- [ ] **Step 3: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual`; only `meeting-before-*` and `meeting-after-*` move (`meeting-review.spec.ts` scenes that read the household summary in the meeting view open the details first). `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/meeting-review.spec.ts`; open the four: the agenda right under the controls, the transcript and notes next, "Household reference" closed at the bottom; the page is far shorter.

- [ ] **Step 4: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(meeting): the view in the meeting's order — agenda, transcript beside notes, then the household reference, folded

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 12: Single-key shortcuts and a quieter header (audit C1; critique 2 header and legend)

A "Single-key shortcuts" switch in the `?` sheet, on by default, saved per browser. Off, the page-wide character keys (`t`, `[`, `\`, `]`, `/`, `?`) do nothing; Ctrl/⌘+K (command line) and Ctrl/⌘+/ (the sheet) work in both states. A theme change made by key is announced. The header's key legend shrinks to "/ command · ? keys", the theme control becomes a quiet text toggle, and View as stays the one bordered control.

**Files:**
- Create: `src/kit/keyboard/single-keys.ts`, `src/kit/__tests__/single-keys.test.ts`
- Modify: `src/kit/keyboard/KeyboardProvider.tsx`, `src/kit/keyboard/keyboard-context.ts`, `src/kit/keyboard/KeySheet.tsx`, `src/kit/keyboard/KeyLegend.tsx`, `src/kit/checkbox/Checkbox.tsx`, `src/workspace/shell/ThemeToggle.tsx`, `src/workspace/shell/WorkspaceShell.tsx`, `src/test/setup.ts`, `e2e-visual/shell.spec.ts`, `e2e-visual/workspace-steps.ts`
- Test: `src/kit/__tests__/Keyboard.test.tsx`, `src/workspace/__tests__/shell-keyboard.test.tsx`, `src/workspace/__tests__/ThemeToggle.test.tsx`, `src/workspace/__tests__/workbench-edit.test.tsx`

**Interfaces:**
- Consumes: `useAnnounce` (Task 7), `isEditableTarget`.
- Produces:
  - `src/kit/keyboard/single-keys.ts`: `SINGLE_KEYS_STORAGE_KEY = 'ws-single-keys'`, `readSingleKeys(): boolean` (true unless `'off'` is stored; true when storage throws), `saveSingleKeys(on: boolean): void`, `isCommandChord(e: KeyboardEvent): boolean` (Ctrl or ⌘ + K, no Alt), `isSheetChord(e: KeyboardEvent): boolean` (Ctrl or ⌘ + `/`, no Alt), `MODIFIER_WORD = 'Ctrl/⌘'`.
  - `KeyboardContextValue` gains `singleKeys: boolean` and `setSingleKeys: (on: boolean) => void`.
  - `Checkbox` gains `role?: 'switch'`.

- [ ] **Step 1: The failing tests**

Create `src/kit/__tests__/single-keys.test.ts`:

```ts
import { afterEach, describe, it, expect, vi } from 'vitest'
import { SINGLE_KEYS_STORAGE_KEY, isCommandChord, isSheetChord, readSingleKeys, saveSingleKeys } from '@/kit/keyboard/single-keys'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })
const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)

describe('the single-key shortcuts setting', () => {
  it('is on by default and remembers off', () => {
    expect(readSingleKeys()).toBe(true)
    saveSingleKeys(false)
    expect(localStorage.getItem(SINGLE_KEYS_STORAGE_KEY)).toBe('off')
    expect(readSingleKeys()).toBe(false)
    saveSingleKeys(true)
    expect(readSingleKeys()).toBe(true)
  })
  it('reads on when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readSingleKeys()).toBe(true)
    expect(() => saveSingleKeys(false)).not.toThrow()
  })
  it('knows the two modifier routes', () => {
    expect(isCommandChord(key({ key: 'k', ctrlKey: true }))).toBe(true)
    expect(isCommandChord(key({ key: 'K', metaKey: true, shiftKey: true }))).toBe(true)
    expect(isCommandChord(key({ key: 'k', ctrlKey: true, altKey: true }))).toBe(false)
    expect(isCommandChord(key({ key: 'k' }))).toBe(false)
    expect(isSheetChord(key({ key: '/', metaKey: true }))).toBe(true)
    expect(isSheetChord(key({ key: '?', shiftKey: true }))).toBe(false)
  })
})
```

In `src/kit/__tests__/Keyboard.test.tsx` add:

```ts
  it('with single-key shortcuts off: t, / and ? do nothing; Ctrl+K and Ctrl+/ still open the command line and the sheet', async () => {
    localStorage.setItem('ws-single-keys', 'off')
    const onT = vi.fn()
    render(<AnnouncerProvider><KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('t/?')
    expect(onT).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog', { name: 'Command line' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Control>}/{/Control}')
    expect(screen.getByRole('dialog', { name: 'Keyboard' })).toBeInTheDocument()
  })
  it('the sheet holds the switch; turning it off stops the single keys and is remembered', async () => {
    const onT = vi.fn()
    const view = render(<AnnouncerProvider><KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('?')
    const toggle = within(screen.getByRole('dialog', { name: 'Keyboard' })).getByRole('switch', { name: 'Single-key shortcuts' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    expect(localStorage.getItem('ws-single-keys')).toBe('off')
    await userEvent.keyboard('{Escape}t')
    expect(onT).not.toHaveBeenCalled()
    view.unmount()
    render(<AnnouncerProvider><KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('{Control>}/{/Control}')
    expect(within(screen.getByRole('dialog', { name: 'Keyboard' })).getByRole('switch', { name: 'Single-key shortcuts' })).not.toBeChecked()
  })
```

(import `AnnouncerProvider`; the existing tests that render `KeyboardProvider` bare are wrapped the same way). In `src/workspace/__tests__/shell-keyboard.test.tsx`:

```ts
  it('shows only the two global keys in the header, and their modifier forms once single keys are off', async () => {
    await renderAt('/')
    const legend = screen.getByRole('list', { name: 'Keys' })
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['/command', '?keys'])
    await userEvent.keyboard('?')
    await userEvent.click(screen.getByRole('switch', { name: 'Single-key shortcuts' }))
    await userEvent.keyboard('{Escape}')
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Ctrl/⌘ Kcommand', 'Ctrl/⌘ /keys'])
  })
```

In `src/workspace/__tests__/ThemeToggle.test.tsx`, `renderToggle` wraps in `AnnouncerProvider`, and:

```ts
  it('is a quiet text control, and a change made by key is announced', async () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'Theme: system' })).toHaveAttribute('data-rank', 'quiet')
    await userEvent.keyboard('t')
    await act(() => new Promise<void>((r) => requestAnimationFrame(() => r())))
    expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent('Theme: light')
  })
```

In `src/workspace/__tests__/workbench-edit.test.tsx` (Review Focus 4):

```ts
  it('with single-key shortcuts off, the focused leg\'s x still excludes it and Ctrl+S still saves', async () => {
    localStorage.setItem('ws-single-keys', 'off')
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    const draftLegs = await screen.findByRole('table', { name: 'Legs · draft' })
    await waitFor(() => expect(within(draftLegs).getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true'))
    await userEvent.keyboard('{Control>}s{/Control}')
    expect(await within(screen.getByRole('group', { name: 'Draft version' })).findByRole('status')).toHaveTextContent('Saved as v2 · posted to the thread.')
  })
```

`src/test/setup.ts`'s `afterEach` gains `localStorage.clear()` beside `sessionStorage.clear()`, so a setting never leaks between tests.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/single-keys.test.ts src/kit/__tests__/Keyboard.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx src/workspace/__tests__/ThemeToggle.test.tsx src/workspace/__tests__/workbench-edit.test.tsx --testTimeout 30000`
Expected: FAIL — the module does not exist; no switch; the legend lists every binding.

- [ ] **Step 3: The setting**

`src/kit/keyboard/single-keys.ts`:

```ts
export const SINGLE_KEYS_STORAGE_KEY = 'ws-single-keys'
/** How the key legend and sheet write the modifier, for either platform. */
export const MODIFIER_WORD = 'Ctrl/⌘'

export function readSingleKeys(): boolean {
  try {
    return localStorage.getItem(SINGLE_KEYS_STORAGE_KEY) !== 'off'
  } catch {
    // Storage blocked (private window, policy): the default, on.
    return true
  }
}

export function saveSingleKeys(on: boolean): void {
  try {
    localStorage.setItem(SINGLE_KEYS_STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked: the choice holds for this page view only.
  }
}

const withModifier = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && !e.altKey

/** Ctrl/⌘+K: the command line, whatever the setting (WCAG 2.1.4 covers only single character keys). */
export const isCommandChord = (e: KeyboardEvent) => withModifier(e) && e.key.toLowerCase() === 'k'
/** Ctrl/⌘+/: the key sheet. Not Shift+?: "?" is itself a character key. */
export const isSheetChord = (e: KeyboardEvent) => withModifier(e) && e.key === '/'
```

`keyboard-context.ts`: `KeyboardContextValue` gains `singleKeys: boolean; setSingleKeys: (on: boolean) => void`. In `KeyboardProvider.tsx`:

```tsx
  const [singleKeys, setSingleKeysState] = useState(readSingleKeys)
  const setSingleKeys = useCallback((on: boolean) => { saveSingleKeys(on); setSingleKeysState(on) }, [])
```

and the key handler:

```ts
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing) return
      if (commandOpen || sheetOpen || document.querySelector(OPEN_DIALOG)) return
      if (isCommandChord(e)) { e.preventDefault(); setCommandOpen(true); return }
      if (isSheetChord(e)) { e.preventDefault(); setSheetOpen(true); return }
      if (!singleKeys || e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return
      if (e.key === '/') { e.preventDefault(); setCommandOpen(true); return }
      if (e.key === '?') { e.preventDefault(); setSheetOpen(true); return }
      const match = bindings.find((b) => b.key === e.key)
      if (match) { e.preventDefault(); match.run() }
    }
```

(`singleKeys` joins the effect's dependencies; `value` carries `singleKeys` and `setSingleKeys`; `KeySheet` receives both). Row keys on a focused DataTable row and ⌘S are handled by their own focus-scoped listeners, which this does not touch.

`Checkbox.tsx`: optional `role?: 'switch'` passed to the `<input>`.

`KeySheet.tsx`:

```tsx
export function KeySheet({ open, onOpenChange, bindings, singleKeys, onSingleKeys }: KeySheetProps) {
  const noteId = useId()
  const global = [
    { key: singleKeys ? `/ or ${MODIFIER_WORD} K` : `${MODIFIER_WORD} K`, label: 'Command line' },
    { key: singleKeys ? `? or ${MODIFIER_WORD} /` : `${MODIFIER_WORD} /`, label: 'This key sheet' },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Checkbox role="switch" label="Single-key shortcuts" checked={singleKeys} onChange={onSingleKeys} describedBy={noteId} />
          <p id={noteId} className="text-label text-ink-3">Off: single keys such as t, / and ? do nothing, for speech input. Ctrl/⌘ K and Ctrl/⌘ / always work; keys on a focused table row and ⌘S or Ctrl+S always work.</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
          {[...global, ...(singleKeys ? bindings : [])].map((b, i) => (
            <div key={`${i}-${b.key}-${b.label}`} className="contents">
              <dt><kbd className="border border-ink-2 px-1.5 text-label">{b.key}</kbd></dt>
              <dd>{b.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Dialog>
  )
}
```

(`KeySheetProps = { open; onOpenChange; bindings: Binding[]; singleKeys: boolean; onSingleKeys: (on: boolean) => void }`).

`KeyLegend.tsx` renders exactly two items from the context's `singleKeys`: `[{ key: '/', label: 'command' }, { key: '?', label: 'keys' }]`, or `[{ key: \`${MODIFIER_WORD} K\`, label: 'command' }, { key: \`${MODIFIER_WORD} /\`, label: 'keys' }]` when off — a fixed set at first paint (audit H5's growing legend). Its doc comment: "The two global keys; every other key is in the `?` sheet."

- [ ] **Step 4: The header and the theme control**

`ThemeToggle.tsx`: `<Button rank="quiet" onClick={next}>`; `next()` also calls `announce(LABEL[c])` (`const announce = useAnnounce()`). `WorkspaceShell.tsx`: the legend's classes stay (`order-last w-full gap-x-3 split:order-none split:w-auto`); `ViewAs` keeps its bordered select.

`e2e-visual/workspace-steps.ts`'s `goTo` keeps pressing `/` (single keys are on by default in a fresh browser).

- [ ] **Step 5: Tests, then baselines**

Run: `pnpm vitest run --testTimeout 30000`. Expected: PASS (tests rendering `KeyboardProvider` without `AnnouncerProvider` wrap it).

In `e2e-visual/shell.spec.ts` add:

```ts
test('the key sheet with the single-key setting · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/', 'light')
  await settle(page)
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard' }).getByRole('switch', { name: 'Single-key shortcuts' })).toBeChecked()
  await expect(page).toHaveScreenshot('key-sheet-light.png', SCREENSHOT)
  await expectNoAxeViolations(page)
})
```

Run `VISUAL_PORT=5195 pnpm visual`, then `VISUAL_PORT=5195 pnpm visual:update` (the header moves in every shell scene and the kit page). `not-found-light` must not move. Open every listed PNG: the legend reads "/ command  ? keys", the theme control is quiet text, View as the one bordered control; `key-sheet-light` shows the switch on and its note.

- [ ] **Step 6: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "feat(keys): single-key shortcuts can be turned off in the key sheet, with Ctrl/⌘ K and Ctrl/⌘ / always on; a two-key legend and a quiet theme control

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 13: Dialogs and the command line (audit H1, M11)

The kit dialog never exceeds the viewport (its content scrolls), and the command line's list has its own scroll, keeps the active option in view, and accepts clicks and taps.

**Files:**
- Modify: `src/kit/dialog/Dialog.tsx`, `src/kit/keyboard/CommandLine.tsx`, `src/test/setup.ts`
- Create: `e2e-visual/dialogs.spec.ts`
- Test: `src/kit/__tests__/Dialog.test.tsx`, `src/kit/__tests__/Keyboard.test.tsx`

**Interfaces:**
- Consumes: `matchDestinations`, `Dialog`.
- Produces: the dialog content carries `max-h-[calc(100dvh-2rem)] overflow-y-auto`; each command-line option runs on click and takes the active index on pointer move.

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/Dialog.test.tsx`:

```ts
it('never grows past the viewport: its content scrolls', () => {
  render(<Dialog open onOpenChange={() => {}} title="Long"><p>Body</p></Dialog>)
  const dialog = screen.getByRole('dialog', { name: 'Long' })
  expect(dialog.className).toContain('max-h-[calc(100dvh-2rem)]')
  expect(dialog.className).toContain('overflow-y-auto')
})
```

In `src/kit/__tests__/Keyboard.test.tsx`:

```ts
  it('a click on a destination goes there; pointing at one makes it active; the active one is kept in view', async () => {
    const billing = vi.fn()
    const destinations = [
      { id: 'kit', label: 'Component kit', aliases: [], run: vi.fn() },
      { id: 'billing', label: 'Billing', aliases: [], run: billing },
    ]
    render(<AnnouncerProvider><KeyboardProvider destinations={destinations}><p>x</p></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('/')
    const option = screen.getByRole('option', { name: 'Billing' })
    await userEvent.hover(option)
    expect(option).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowUp}')
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
    await userEvent.click(screen.getByRole('option', { name: 'Billing' }))
    expect(billing).toHaveBeenCalledOnce()
    expect(screen.getByRole('listbox').className).toContain('overflow-y-auto')
  })
```

`src/test/setup.ts` gains `Element.prototype.scrollIntoView = vi.fn()` beside the other browser mocks (jsdom has none).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/Dialog.test.tsx src/kit/__tests__/Keyboard.test.tsx --testTimeout 30000`
Expected: FAIL.

- [ ] **Step 3: The fixes**

`Dialog.tsx`: the content's class string gains `max-h-[calc(100dvh-2rem)] overflow-y-auto`.

`CommandLine.tsx`: the listbox's classes become `mt-2 flex max-h-[min(24rem,50dvh)] flex-col overflow-y-auto`; each option gets `onClick={() => go(d)}` and `onPointerMove={() => setIndex(i)}`; and:

```tsx
  const activeId = matches[index] ? `${listId}-${matches[index].id}` : undefined
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])
```

(an option is not a focus stop: the combobox keeps focus and `aria-activedescendant` names the option, as now; `useEffect` joins the React import).

- [ ] **Step 4: The baselines at small sizes**

Create `e2e-visual/dialogs.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { SCREENSHOT, pageOverflowX } from './layout-checks'
import { expectNoAxeViolations } from './axe'
import { deskLink, settle, visit } from './workspace-steps'

test('the command line at 1440×600 shows its title, its field and Close · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 })
  await visit(page, '/', 'light')
  await settle(page)
  await page.keyboard.press('/')
  const dialog = page.getByRole('dialog', { name: 'Command line' })
  const box = await dialog.boundingBox()
  if (!box) throw new Error('the command line is not rendered')
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(600)
  await expect(dialog.getByRole('combobox', { name: 'Go to' })).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeInViewport()
  await expect(page).toHaveScreenshot('command-line-1440x600-light.png', { ...SCREENSHOT, fullPage: false })
  await expectNoAxeViolations(page)
})

test('the Resolve dialog at 320 px reaches its title, its select and Confirm · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await visit(page, '/', 'light')
  await deskLink(page, 'Reconciliation').click()
  await page.getByRole('button', { name: 'Resolve brk-002', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Resolve brk-002?' })
  await expect(dialog.getByRole('heading', { name: 'Resolve brk-002?' })).toBeInViewport()
  await dialog.getByLabel('Resolution').scrollIntoViewIfNeeded()
  await expect(dialog.getByLabel('Resolution')).toBeInViewport()
  await dialog.getByRole('button', { name: 'Confirm' }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeInViewport()
  expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
  await dialog.evaluate((el) => el.scrollTo(0, 0))
  await settle(page)
  await expect(page).toHaveScreenshot('resolve-dialog-320-light.png', { ...SCREENSHOT, fullPage: false })
  await expectNoAxeViolations(page)
})
```

(on a phone the Reconciliation link is in the Threads pane only after Task 20; until then the 320 px page lists it above main, which `deskLink` finds. Task 20 re-checks this spec.) Run `VISUAL_PORT=5195 pnpm visual:update -- e2e-visual/dialogs.spec.ts`; `git status` lists only the two new PNGs; open both: the whole dialog inside the viewport, its title and field visible. Then `VISUAL_PORT=5195 pnpm visual` passes with no other PNG moved.

- [ ] **Step 5: Full checks; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`

```bash
git add -A src e2e-visual
git commit -m "fix(dialogs): dialogs fit the viewport and scroll; the command line scrolls its list, keeps the active option in view and takes clicks

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 14: The pending button and focus (audit H2)

One kit pending pattern: a pending button stays focusable with `aria-disabled` and ignores activation. The composer returns focus to its field after a post. Release-as-Mark lands on the record slip.

**Files:**
- Modify: `src/kit/button/Button.tsx`, `src/kit/button/button-variants.ts`, `src/kit/text-input/TextInput.tsx`, `src/workspace/context/AskAgents.tsx`, `src/workspace/context/ProposalAgentControl.tsx`, `src/workspace/prospect/ProspectAgentControl.tsx`, `src/workspace/context/LetterControl.tsx`, `src/workspace/context/RecapControl.tsx`, `src/workspace/context/ConfirmRecord.tsx`, `src/workspace/thread/Composer.tsx`, `src/workspace/thread/CarryControl.tsx`, `src/hooks/use-workspace.ts`
- Test: `src/kit/__tests__/Button.test.tsx`, `src/workspace/__tests__/context.test.tsx`, `src/workspace/__tests__/thread.test.tsx`, `src/workspace/__tests__/after-release.test.tsx`

**Interfaces:**
- Consumes: `actAnchorId`.
- Produces: `Button`'s `pending?: boolean` (sets `aria-disabled="true"` and `data-pending="true"`, and swallows clicks while true; `disabled` keeps meaning "not available"); `TextInput`'s `id?: string` and `readOnly?: boolean`.

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/Button.test.tsx`:

```tsx
it('a pending button keeps focus, says it is unavailable, and ignores activation', async () => {
  const onClick = vi.fn()
  const { rerender } = render(<Button onClick={onClick}>Ask</Button>)
  const button = screen.getByRole('button', { name: 'Ask' })
  button.focus()
  rerender(<Button onClick={onClick} pending>Ask</Button>)
  expect(button).toHaveFocus()
  expect(button).toHaveAttribute('aria-disabled', 'true')
  expect(button).not.toBeDisabled()
  await userEvent.click(button)
  await userEvent.keyboard('{Enter}')
  expect(onClick).not.toHaveBeenCalled()
})
```

In `src/workspace/__tests__/context.test.tsx`:

```ts
  it('Ask Drift Monitor keeps focus through its request', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    const ask = await screen.findByRole('button', { name: 'Ask Drift Monitor' })
    await userEvent.setup().click(ask)
    expect(ask).toHaveFocus()
    await screen.findByText('Drift Monitor reported in the thread.')
    expect(ask).toHaveFocus()
  })
```

In `src/workspace/__tests__/thread.test.tsx`:

```ts
  it('the composer returns focus to its field after a post', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    const field = await screen.findByRole('textbox', { name: 'Message' })
    const user = userEvent.setup()
    await user.type(field, 'Looks right to me.')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    await waitFor(() => expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Looks right to me.'))
    await waitFor(() => expect(field).toHaveFocus())
  })
```

(a firm member's action in an internal thread is "Post", per `composerModeOf`). In `src/workspace/__tests__/after-release.test.tsx`:

```ts
  it("the presenter's release lands focus on the release's record slip", async () => {
    approvedStoryV3()
    renderRoutes(routes, '/t/th-johnson-review')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Demo · act as Mark Davis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    const releaseAct = () => store().acts.find((a) => a.kind === 'release_orders')
    await waitFor(() => expect(releaseAct()).toBeDefined())
    await waitFor(() => expect(document.activeElement?.id).toBe(`act-${releaseAct()!.id}`))
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/Button.test.tsx src/workspace/__tests__/context.test.tsx src/workspace/__tests__/thread.test.tsx src/workspace/__tests__/after-release.test.tsx --testTimeout 30000`
Expected: FAIL — no `pending`; focus falls to `<body>`; after the release focus lands on the page h1, not the slip.

- [ ] **Step 3: The pending button**

`Button.tsx`:

```tsx
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { rank?: ButtonRank; asChild?: boolean; pending?: boolean }

/** `pending`: a request is in flight. The button keeps focus and says it is unavailable, and ignores activation until it settles. */
export function Button({ rank = 'primary', asChild = false, pending = false, className, type, onClick, 'aria-disabled': ariaDisabled, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      {...rest}
      data-rank={rank}
      data-pending={pending ? 'true' : undefined}
      aria-disabled={pending ? true : ariaDisabled}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ rank }), className)}
      onClick={pending ? (e) => e.preventDefault() : onClick}
    />
  )
}
```

(the props this component owns come after `...rest`, so `pending` always wins over a caller's `aria-disabled` and click). `button-variants.ts`: every `disabled:` class gains its `aria-disabled:` twin (`aria-disabled:cursor-progress aria-disabled:text-ink-3`; primary `aria-disabled:border aria-disabled:border-rule-2 aria-disabled:bg-transparent`; secondary `aria-disabled:border-rule-2`; quiet `aria-disabled:no-underline`), and the hover classes become `not-disabled:not-aria-disabled:hover:…`.

- [ ] **Step 4: Use it**

| File | Change |
|---|---|
| `AskAgents.tsx` | each Ask button `pending={run.isPending}` in place of `disabled` |
| `ProposalAgentControl.tsx`, `ProspectAgentControl.tsx`, `LetterControl.tsx`, `RecapControl.tsx` | the ask button `pending={<mutation>.isPending}` in place of `disabled` |
| `CarryControl.tsx` | the menu items `pending={carry.isPending}` |
| `ConfirmRecord.tsx` | Confirm `pending={mutation.isPending}` and `disabled={blockedReason !== undefined}` |
| `TextInput.tsx` | optional `id` (used when given, else `useId()`) and `readOnly` |
| `Composer.tsx` | the field `readOnly={pending}` (never `disabled`) with `id={fieldId}` (`useId`); Post `pending={pending}` and `disabled={body.trim() === ''}`; on success `requestAnimationFrame(() => document.getElementById(fieldId)?.focus())` |

- [ ] **Step 5: The release's focus**

TanStack Query 5 awaits a promise returned from a hook-level `onSettled` before it calls the callbacks passed to `mutate`, and drops those callbacks if the component that called `mutate` has unmounted. `useActAsCco`'s `onSettled: invalidate` returns the refetch, the refetch shows the proposal as released, `PresenterRelease` (and its `ConfirmRecord`) unmounts, and `onRecorded` never runs, so nothing hands focus to the slip. Confirm this with the failing test from Step 1 (add a `console.log` in `ConfirmRecord`'s `onSuccess` and see it not print; remove it after). Fix in `src/hooks/use-workspace.ts`:

```ts
/** A compliance act can move the book (a release fills): accounts, positions, drift and lots are stale too, not only the workspace. */
function useInvalidateEverything() {
  const queryClient = useQueryClient()
  // Not returned: the mutate callbacks (focus on the new record slip) must run before the refetch unmounts the control that asked.
  return () => { void queryClient.invalidateQueries() }
}
```

If the log does print, the cause is elsewhere: follow superpowers:systematic-debugging from the failing test, and report what it was.

- [ ] **Step 6: Tests, visuals; commit**

Run: `pnpm vitest run --testTimeout 30000`. Tests asserting `toBeDisabled()` on a button while its request is in flight become `toHaveAttribute('aria-disabled', 'true')`; `toBeDisabled()` stays where the button is unavailable (an empty composer, a blocked Confirm, an invalid draft).
Run: `VISUAL_PORT=5195 pnpm visual` (no PNG moves: baselines are taken at rest), then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A src
git commit -m "fix(focus): one pending button that keeps focus; the composer returns to its field; the presenter's release lands on its record slip

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 15: Titles and the skip link (audit H3, L4)

Each route's document title is its h1 and the app's name: "Billing · Advisor Desktop", "Page not found · Advisor Desktop". The kit page's skip link lands on the h1, inside `<main>`.

**Files:**
- Create: `src/app/document-title.ts`, `src/app/use-document-title.ts`
- Modify: `src/app/RootLayout.tsx`, `src/kit/page/Page.tsx`
- Test: `src/app/__tests__/routes.test.tsx`, `src/kit/__tests__/Page.test.tsx`

**Interfaces:**
- Consumes: `PAGE_TITLE_ID`.
- Produces: `documentTitleOf(heading: string): string` (`document-title.ts`) and `useDocumentTitle(): void` (`use-document-title.ts`), called once in `RootLayout`; it keeps `document.title` equal to `documentTitleOf(<the routed h1's text>)` as the h1 appears or changes.

- [ ] **Step 1: The failing tests**

In `src/app/__tests__/routes.test.tsx`:

```ts
  it.each([
    ['/', 'Workspace · Advisor Desktop'],
    ['/t/th-brief', 'Brief · Advisor Desktop'],
    ['/t/th-pell', 'Dr. Amanda Pell · Advisor Desktop'],
    ['/billing', 'Billing · Advisor Desktop'],
    ['/no-such-page', 'Page not found · Advisor Desktop'],
  ])('%s is titled "%s"', async (path, title) => {
    renderAt(path)
    await waitFor(() => expect(document.title).toBe(title))
  })
```

In `src/kit/__tests__/Page.test.tsx`: `expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }))`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/app/__tests__/routes.test.tsx src/kit/__tests__/Page.test.tsx --testTimeout 30000`
Expected: FAIL — the title never changes; the h1 sits outside `<main>`.

- [ ] **Step 3: The title**

`src/app/document-title.ts`:

```ts
const APP_NAME = 'Advisor Desktop'

/** A tab's title: the page's own heading, then the app. */
export const documentTitleOf = (heading: string) => `${heading} · ${APP_NAME}`
```

`src/app/use-document-title.ts`:

```ts
import { useEffect } from 'react'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { documentTitleOf } from './document-title'

/**
 * Keeps the document title equal to the routed page's h1 and the app's name. Pages render their h1 when
 * their data arrives, so the title follows the h1 as it appears or changes rather than being set per route.
 */
export function useDocumentTitle(): void {
  useEffect(() => {
    const apply = () => {
      const heading = document.getElementById(PAGE_TITLE_ID)?.textContent?.trim()
      if (heading) document.title = documentTitleOf(heading)
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])
}
```

`RootLayout.tsx` calls `useDocumentTitle()`. `index.html`'s `<title>` stays as the first-paint and social title.

- [ ] **Step 4: The skip link's target**

`Page.tsx`: the `<header>` moves inside `<main>` as its first child (same classes, `mx-auto` and padding moved so the layout does not shift):

```tsx
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-(--breakpoint-wide)">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink px-6 pb-4 pt-8">…</header>
        <div className="px-6 py-8">{children}</div>
      </main>
```

- [ ] **Step 5: Tests, baselines; commit**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual`. `not-found-light` and `kit-*` should not move; if one moves by the header's new parent, open it, confirm the shift is the header's box only, regenerate that spec, and say so in the report. Then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A src e2e-visual
git commit -m "fix(a11y): each page titles its tab from its h1; the kit page's skip link lands on its h1, inside main

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 16: DataTable semantics (audit M2, L3, L8)

A table with row actions is a grid: rows take focus, a row that opens a detail says whether it is open, and its keys are announced as shortcuts. A read-only table adds no Tab stop. Excluding a leg is announced. Rows are memoized.

**Files:**
- Modify: `src/kit/data-table/DataTable.tsx`, `src/workspace/workbench/WorkbenchLegs.tsx`, `src/workspace/workbench/Workbench.tsx`, the legs-table locators in `src/workspace/__tests__/` and `e2e-visual/` (Step 5)
- Test: `src/kit/__tests__/DataTable.test.tsx`, `src/kit/__tests__/Keyboard.test.tsx`, `src/workspace/__tests__/workbench-edit.test.tsx`

**Interfaces:**
- Consumes: `useAnnounce`, `fmtQuantity`, `isExcluded` (`edit-draft.ts`), `legRows`.
- Produces: `DataTable`'s `expandedRowId?: string`; `role="grid"` and focusable rows only when `onActivate` or `rowKeys` is given; `aria-expanded` on every row when `expandedRowId` is passed; `aria-keyshortcuts` listing Enter (with `onActivate`) and each row key.

- [ ] **Step 1: The failing tests**

In `src/kit/__tests__/DataTable.test.tsx`:

```tsx
const ROWS = [{ id: 'a' }, { id: 'b' }]
const COLUMNS = [{ id: 'id', header: 'Id', cell: (r: { id: string }) => r.id }]

it('a read-only table is a plain table with no Tab stop', () => {
  render(<DataTable caption="Read" rows={ROWS} columns={COLUMNS} getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }} />)
  expect(screen.getByRole('table', { name: 'Read' })).not.toHaveAttribute('role')
  for (const row of screen.getAllByRole('row')) expect(row).not.toHaveAttribute('tabindex')
})

it('a table with row actions is a grid: one row in the Tab order, expanded state and keys stated', () => {
  render(<DataTable caption="Legs" rows={ROWS} columns={COLUMNS} getRowId={(r) => r.id} noun={{ singular: 'leg', plural: 'legs' }}
    onActivate={() => {}} expandedRowId="b" rowKeys={[{ key: 'x', run: () => {} }]} />)
  const grid = screen.getByRole('grid', { name: 'Legs' })
  const [a, b] = within(grid).getAllByRole('row').slice(1)
  expect(a).toHaveAttribute('tabindex', '0')
  expect(b).toHaveAttribute('tabindex', '-1')
  expect(a).toHaveAttribute('aria-expanded', 'false')
  expect(b).toHaveAttribute('aria-expanded', 'true')
  expect(a).toHaveAttribute('aria-keyshortcuts', 'Enter x')
})

it('renders a row again only when its own data or state changes', () => {
  const cell = vi.fn((r: { id: string }) => r.id)
  const columns = [{ id: 'id', header: 'Id', cell }]
  const { rerender } = render(<DataTable caption="M" rows={ROWS} columns={columns} getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }} />)
  cell.mockClear()
  rerender(<DataTable caption="M" rows={ROWS} columns={columns} getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }} />)
  expect(cell).not.toHaveBeenCalled()
})
```

In `Keyboard.test.tsx`'s "a global j binding does not double-fire" test the table gets `onActivate={() => {}}` (a read-only table's rows no longer take focus). In `workbench-edit.test.tsx`:

```ts
  it('announces an exclusion with the count of legs left in the draft', async () => {
    const legs = await openWorkbench()   // openWorkbench finds the grid once Step 5 has re-pointed it
    const total = within(legs).getAllByRole('row').length - 1
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent(`QAI excluded · ${total - 1} of ${total} legs in the draft`))
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/DataTable.test.tsx src/kit/__tests__/Keyboard.test.tsx src/workspace/__tests__/workbench-edit.test.tsx --testTimeout 30000`
Expected: FAIL.

- [ ] **Step 3: The table**

In `DataTable.tsx`:
- `const interactive = onActivate !== undefined || (rowKeys ?? []).length > 0`; `const shortcuts = [...(onActivate ? ['Enter'] : []), ...(rowKeys ?? []).map((k) => k.key)].join(' ')`.
- `<table role={interactive ? 'grid' : undefined} …>`; in a grid each body `td` gets `role="gridcell"`.
- Extract the body row into a `DataTableRow` component in the same file, wrapped in `memo` (React's), with primitive and stable props: `row` (the TanStack row; its `original` is the caller's object), `index`, `tabbable: boolean | undefined` (undefined when not interactive), `expanded: boolean | undefined`, `muted`, `shortcuts`, `density`, `columns` (the caller's `Column<T>[]`), and stable callbacks (`onRowKeyDown`, `onRowFocus`, `onRowActivate`, each from `useCallback` reading the latest values through a ref). The row renders `tabIndex={tabbable === undefined ? undefined : tabbable ? 0 : -1}`, `aria-expanded={expanded}`, `aria-keyshortcuts={interactive ? shortcuts : undefined}`, and attaches its key, focus and click handlers only when interactive. `memo` needs `forwardRef`-free generics: declare `const DataTableRow = memo(DataTableRowView) as typeof DataTableRowView`.
- `expanded` is `expandedRowId === undefined ? undefined : row.id === expandedRowId`.

Callers pass `columns` inline today, which would defeat the memo; `WorkbenchLegs.tsx` (the one table that re-renders on every keystroke of an edit) builds its columns with `useMemo` keyed on `currency`.

- [ ] **Step 4: The workbench**

`WorkbenchLegs.tsx` takes `expandedSymbol?: string` and passes `expandedRowId={expandedSymbol}`; `Workbench.tsx` passes `expandedSymbol={expanded}` and wraps the toggle:

```ts
  const announce = useAnnounce()
  const toggleWithAnnouncement = (symbol: string) => {
    const rows = legRows(view)
    const excludedNow = rows.filter((r) => isExcluded(draft.edits, r.symbol)).length
    const nowExcluded = !isExcluded(draft.edits, symbol)
    edit(symbol).toggleExclude()
    const inDraft = rows.length - (nowExcluded ? excludedNow + 1 : excludedNow - 1)
    announce(`${symbol} ${nowExcluded ? 'excluded' : 'included'} · ${fmtQuantity(inDraft)} of ${fmtQuantity(rows.length)} legs in the draft`)
  }
```

used for `onToggleExclude` and for `LegDetail`'s toggle.

- [ ] **Step 5: The grid's locators**

The workbench's legs table is the app's one table with row actions (`grep -rln "onActivate=\|rowKeys=" src --exclude-dir=__tests__` lists only `WorkbenchLegs.tsx`), so it is now a `grid`. Every locator of it changes role: `getByRole('table', { name: 'Legs · v1' })` (and `Legs · v2`, `Legs · draft`, `/^Legs/`) becomes `getByRole('grid', …)` in `src/workspace/__tests__/` and `e2e-visual/` (`grep -rn "'Legs\|/^Legs" src e2e-visual` lists about twenty, including `readme-path.spec.ts` step 2 and `rebalance-job.spec.ts`'s `workbench` scene).

- [ ] **Step 6: Tests, visuals; commit**

Run: `pnpm vitest run --testTimeout 30000`. A test that focused a read-only table's row now gives that table an action, or tests something else; say which in the report.
Run: `VISUAL_PORT=5195 pnpm visual` (no PNG moves; axe validates the grid roles), then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A src
git commit -m "fix(a11y): tables with row actions are grids with expanded state and key shortcuts; read-only tables add no Tab stop; exclusions are announced; rows are memoized

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 17: Theme — first paint, label, favicon, tokens (audit H4, L9, L10, L11)

An inline `<head>` script sets `data-theme` before first paint from `?theme` and the stored choice, kept in agreement with `theme.ts` by a test. The theme label says what "system" resolved to, and a choice made in another tab follows here. The favicon has a dark style; `public/` joins the color guardrail with the favicon allowlisted; the light scrim aliases ink.

**Files:**
- Create: `src/kit/use-system-dark.ts`, `src/kit/__tests__/theme-boot.test.ts`
- Modify: `index.html`, `src/main.tsx`, `src/kit/theme.ts`, `src/workspace/shell/ThemeToggle.tsx`, `public/favicon.svg`, `src/styles/app.css`, `src/__tests__/guardrails/contrast.ts`, `src/__tests__/guardrails/source.test.ts`
- Test: `src/workspace/__tests__/ThemeToggle.test.tsx`, `src/kit/__tests__/theme.test.ts`, `src/__tests__/guardrails/contrast.test.ts`

**Interfaces:**
- Consumes: `readThemeChoice`, `applyTheme`, `themeFromSearch`.
- Produces: `THEME_STORAGE_KEY = 'ws-theme'` (exported from `theme.ts`, replacing the private `KEY`); `initialThemeAttribute(search: string, stored: string | null): 'light' | 'dark' | null`; `useSystemDark(): boolean`; `themeLabel(choice: ThemeChoice, systemDark: boolean): string` in `theme.ts` → `"Theme: light"`, `"Theme: dark"`, `"Theme: system (dark)"`, `"Theme: system (light)"`.

- [ ] **Step 1: The failing tests**

Create `src/kit/__tests__/theme-boot.test.ts`:

```ts
import { afterEach, describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { THEME_STORAGE_KEY, initialThemeAttribute } from '@/kit/theme'

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
const boot = /<script>([\s\S]*?ws-theme[\s\S]*?)<\/script>/.exec(html)?.[1]
if (!boot) throw new Error('index.html has no inline theme script')
const run = () => new Function(boot)()

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  localStorage.clear()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('the inline theme script agrees with theme.ts', () => {
  const STORED = [null, 'light', 'dark', 'system', 'junk']
  const SEARCH = ['', '?theme=light', '?theme=dark', '?theme=system', '?theme=junk']
  it.each(STORED.flatMap((stored) => SEARCH.map((search) => [stored, search] as const)))('stored %s, search "%s"', (stored, search) => {
    if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored)
    window.history.pushState({}, '', `/t/th-brief${search}`)
    run()
    expect(document.documentElement.getAttribute('data-theme')).toBe(initialThemeAttribute(search, stored))
  })
  it('reads the same storage key as theme.ts', () => expect(boot).toContain(`'${THEME_STORAGE_KEY}'`))
  it('falls back when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    window.history.pushState({}, '', '/?theme=dark')
    expect(run).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
  it('declares both color schemes', () => expect(html).toContain('<meta name="color-scheme" content="light dark" />'))
})
```

In `ThemeToggle.test.tsx`:

```ts
  it('says what system resolved to, and follows a choice made in another tab', async () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({ matches: query === '(prefers-color-scheme: dark)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))
    renderToggle()
    expect(screen.getByRole('button', { name: 'Theme: system (dark)' })).toBeInTheDocument()
    localStorage.setItem('ws-theme', 'light')
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'ws-theme', newValue: 'light' })) })
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
```

(the existing tests' "Theme: system" becomes "Theme: system (light)": the setup's `matchMedia` matches nothing). In `source.test.ts`:

```ts
describe('public/ uses no color outside the favicon', () => {
  const dir = join(process.cwd(), 'public')
  const text = readdirSync(dir).filter((f) => /\.(svg|html|css|js|txt)$/.test(f) && f !== 'favicon.svg')
  it.each(text)('public/%s has no color literal', (f) => expect(findColorLiterals(readFileSync(join(dir, f), 'utf8'))).toEqual([]))
  it('the favicon draws a dark style of its own', () => expect(readFileSync(join(dir, 'favicon.svg'), 'utf8')).toContain('prefers-color-scheme: dark'))
})
```

In `contrast.test.ts`: `it('the light scrim is the ink', () => expect(readAppCss()).toMatch(/:root \{[^}]*--ws-scrim:\s*var\(--ws-ink\);/))`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/theme-boot.test.ts src/workspace/__tests__/ThemeToggle.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: FAIL.

- [ ] **Step 3: theme.ts and the inline script**

In `theme.ts`: rename `KEY` to the exported `THEME_STORAGE_KEY`, and add:

```ts
/** What the inline script in index.html sets before first paint: `?theme`, then the stored choice; "system" sets nothing. */
export function initialThemeAttribute(search: string, stored: string | null): 'light' | 'dark' | null {
  const fromUrl = themeFromSearch(search)
  if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl
  return stored === 'light' || stored === 'dark' ? stored : null
}

const LABEL: Record<Exclude<ThemeChoice, 'system'>, string> = { light: 'Theme: light', dark: 'Theme: dark' }
export const themeLabel = (choice: ThemeChoice, systemDark: boolean) =>
  choice === 'system' ? `Theme: system (${systemDark ? 'dark' : 'light'})` : LABEL[choice]
```

In `index.html`, first in `<head>` after the charset meta:

```html
    <meta name="color-scheme" content="light dark" />
    <script>
      // Before first paint, as src/kit/theme.ts's initialThemeAttribute decides (a test runs this text against it):
      // ?theme=light|dark wins, then the stored choice; "system" leaves the attribute off.
      (() => {
        let stored = null
        try { stored = localStorage.getItem('ws-theme') } catch { /* storage blocked: follow the system theme */ }
        const fromUrl = new URLSearchParams(location.search).get('theme')
        const theme = fromUrl === 'light' || fromUrl === 'dark' ? fromUrl : stored === 'light' || stored === 'dark' ? stored : null
        if (theme) document.documentElement.setAttribute('data-theme', theme)
      })()
    </script>
```

`main.tsx`: delete `applyTheme(themeFromSearch(window.location.search) ?? readThemeChoice())` and its import (the inline script has done it).

- [ ] **Step 4: The label, the sync**

`src/kit/use-system-dark.ts`:

```ts
import { useEffect, useState } from 'react'

const QUERY = '(prefers-color-scheme: dark)'

/** Whether the system theme is dark now, following changes. */
export function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return dark
}
```

`ThemeToggle.tsx`: the label is `themeLabel(choice, useSystemDark())` (the module's `LABEL` record goes; `announce(themeLabel(c, systemDark))`), and:

```ts
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return
      const c = readThemeChoice()
      applyTheme(c)
      setChoice(c)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
```

- [ ] **Step 5: Favicon and tokens**

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .face { fill: #15171a } .rule { fill: #fafafb } .signal { fill: #dc4500 }
    @media (prefers-color-scheme: dark) { .face { fill: #eef0f2 } .rule { fill: #15171a } .signal { fill: #f06a1f } }
  </style>
  <rect class="face" width="32" height="32" rx="6"/>
  <path class="rule" d="M7 9h18v2H7zM7 15h18v2H7zM7 21h11v2H7z"/>
  <path class="signal" d="M21 20h4v4h-4z"/>
</svg>
```

`app.css`: in `:root`, `--ws-scrim: var(--ws-ink);` (the two dark blocks keep their own scrim value; the duplicated dark block stays, parked). `contrast.ts`'s `parsePalette` resolves an alias within its block after reading the `oklch` values:

```ts
  for (const m of body.matchAll(/--ws-([a-z0-9-]+):\s*var\(--ws-([a-z0-9-]+)\)/g)) {
    const target = palette.get(m[2]!)
    if (!target) throw new Error(`--ws-${m[1]} aliases --ws-${m[2]}, which this block does not define`)
    palette.set(m[1]!, target)
  }
```

- [ ] **Step 6: Tests, the first frame, baselines; commit**

Run: `pnpm vitest run --testTimeout 30000`. Then check first paint by hand: `pnpm build && pnpm preview --port 4195 --strictPort` (background); in a Playwright one-off (`node -e` with `@playwright/test`'s `chromium`), emulate a light OS, set `localStorage['ws-theme']='dark'`, reload, and read `getComputedStyle(document.body).backgroundColor` in an `addInitScript` that runs at `DOMContentLoaded`: it must already be the dark `--ws-bg`. Stop the preview.
Run: `VISUAL_PORT=5195 pnpm visual` (no PNG should move: baselines pass `?theme=`, so the label reads "Theme: light"/"Theme: dark"; if one moves, open it and explain). Then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A index.html src public e2e-visual
git commit -m "fix(theme): the theme is set before first paint by an inline script that a test keeps in step with theme.ts; system says what it resolved to; tabs stay in sync; a dark favicon

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 18: Reflow (audit M3, M4, M5, L1, L2, L5)

Nothing scrolls the page sideways at 320 px. Readouts clamp and wrap their unit; the table scroll wrapper contains its screen-reader text and, when it overflows, is a labeled focusable region with an edge cue and a sticky first column on narrow screens; a source-chip part wraps when wider than its line; the blotter's filters fit; selects grow with text zoom.

**Files:**
- Create: `src/kit/data-table/use-overflowing.ts`, `e2e-visual/reflow.spec.ts`
- Modify: `src/kit/reading/Reading.tsx`, `src/styles/app.css`, `src/kit/data-table/DataTable.tsx`, `src/kit/source-chips/SourceChips.tsx`, `src/kit/select/Select.tsx`
- Test: `src/kit/__tests__/Reading.test.tsx`, `src/kit/__tests__/DataTable.test.tsx`, `src/kit/__tests__/SourceChips.test.tsx`, `src/kit/__tests__/Select.test.tsx`

**Interfaces:**
- Consumes: the `ResizeObserver` the browser has (and `src/test/setup.ts` mocks).
- Produces: `isOverflowing(el: HTMLElement): boolean` and `useOverflowing(ref: RefObject<HTMLElement | null>): boolean` in `use-overflowing.ts`; the wrapper `data-scroll="table"` is `relative`, and while it overflows carries `role="region"`, `aria-label="<caption>, scrolls sideways"`, `tabIndex={0}` and `data-overflowing="true"`.

- [ ] **Step 1: The failing tests**

`Reading.test.tsx`: `it('wraps its unit under the value rather than overflowing', () => { render(<Reading value="91,320,824" unit="USD" size="readout-md" />); expect(screen.getByText('91,320,824').parentElement!.className).toMatch(/flex-wrap/); expect(screen.getByText('91,320,824').closest('div')!.className).toMatch(/min-w-0/) })`.

`DataTable.test.tsx`:

```tsx
it('contains its screen-reader text and, only while it overflows, is a labeled region that takes focus', () => {
  const wide = (el: HTMLElement, scroll: number, client: number) => {
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scroll })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: client })
  }
  const div = document.createElement('div')
  wide(div, 600, 390)
  expect(isOverflowing(div)).toBe(true)
  wide(div, 390, 390)
  expect(isOverflowing(div)).toBe(false)
  const { container } = render(<DataTable caption="Legs" rows={[{ id: 'a' }]} columns={[{ id: 'id', header: 'Id', cell: (r: { id: string }) => r.id }]} getRowId={(r) => r.id} noun={{ singular: 'leg', plural: 'legs' }} />)
  const wrapper = container.querySelector('[data-scroll="table"]')!
  expect(wrapper.className).toContain('relative')
  expect(wrapper).not.toHaveAttribute('role')
  expect(wrapper).not.toHaveAttribute('tabindex')
})
```

`SourceChips.test.tsx`: `for (const part of parts) expect(part.className).toContain('max-w-full')` and `not.toContain('whitespace-nowrap')`. `Select.test.tsx`: `expect(select.className).toContain('min-h-9')` and `not.toMatch(/\bh-9\b/)`; the wrapper `span` has `max-w-full` and `min-w-0`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/kit/__tests__/Reading.test.tsx src/kit/__tests__/DataTable.test.tsx src/kit/__tests__/SourceChips.test.tsx src/kit/__tests__/Select.test.tsx --testTimeout 30000`
Expected: FAIL.

- [ ] **Step 3: The fixes**

- `Reading.tsx`: the outer `div` `inline-flex min-w-0 max-w-full flex-col gap-1`; the value row `inline-flex min-w-0 flex-wrap items-baseline gap-x-2`.
- `app.css` `@theme`: `--text-readout-md: clamp(2.25rem, 9vw, 3.5rem);` and `--text-readout-lg: clamp(3.5rem, 14vw, 6.5rem);` (at 1440 px both clamp to today's 56 and 104 px, so no baseline moves).
- `src/kit/data-table/use-overflowing.ts`:

```ts
import { useEffect, useState, type RefObject } from 'react'

export const isOverflowing = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1

/** Whether the element scrolls sideways now, following its size. */
export function useOverflowing(ref: RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflowing(isOverflowing(el))
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return overflowing
}
```

- `DataTable.tsx`: the wrapper:

```tsx
      <div ref={scroller} data-scroll="table" data-overflowing={overflowing ? 'true' : undefined}
        {...(overflowing ? { role: 'region', 'aria-label': `${caption}, scrolls sideways`, tabIndex: 0 } : {})}
        className="relative min-w-0 overflow-x-auto data-[overflowing=true]:border-r data-[overflowing=true]:border-rule-2">
```

and the first column's `th` and `td` gain `max-narrow:sticky max-narrow:left-0 max-narrow:z-[1] max-narrow:bg-bg`.
- `SourceChips.tsx`: `PART`'s `whitespace-nowrap` becomes `max-w-full` (a part keeps its line while it fits, and wraps inside itself only when it is wider than the line: a flex item's basis is its content width, capped by `max-w-full`).
- `Select.tsx`: the inline wrapper `inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1`; the inner `span` `relative inline-flex min-w-0 max-w-full`; the `select` `min-h-9 max-w-full min-w-0 py-1.5` in place of `h-9`.

- [ ] **Step 4: The reflow checks**

Create `e2e-visual/reflow.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { pageOverflowX } from './layout-checks'
import { askProposalAgent, embedOf, heading, settle, visit } from './workspace-steps'

for (const width of [320, 390]) {
  for (const path of ['/', '/t/th-brief', '/billing', '/practice', '/models/mod-005', '/blotter', '/risk', '/reconciliation']) {
    test(`${path} does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await visit(page, path, 'light')
      await settle(page)
      expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
    })
  }
  test(`the workbench does not scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await askProposalAgent(page, 'light')
    await embedOf(page).getByRole('link', { name: 'Workbench' }).click()
    await expect(heading(page)).toHaveText('Johnson rebalance')
    await settle(page)
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
  })
}

test('the wash-sale dates on the source chips are not clipped at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await visit(page, '/t/th-brief', 'light')
  await settle(page)
  const clipped = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-part="chip-part"]')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > document.documentElement.clientWidth)
    .map((el) => el.textContent))
  expect(clipped).toEqual([])
})
```

(until Task 20 a phone shows the thread list above main; these checks only measure width, so they hold before and after).

- [ ] **Step 5: Tests, visuals; commit**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual` (no baseline moves at 1440 px; the new spec passes), then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A src e2e-visual
git commit -m "fix(reflow): nothing scrolls sideways at 320 px — readouts clamp and wrap, tables contain their text and scroll as labeled regions, chips and filters wrap, selects grow

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 19: rem type scale and the 960 px split (audit M8, L6)

The type scale moves to rem with the same px at the default root size, form controls are at least 16 px on narrow screens, and the three-pane split starts at 960 px, so iPad landscape keeps three panes.

**Files:**
- Modify: `src/styles/app.css`, `src/__tests__/guardrails/source.test.ts`, `src/__tests__/guardrails/detectors.ts`, `e2e-visual/shell.spec.ts`, `e2e-visual/rebalance-job.spec.ts`
- Test: new `src/__tests__/guardrails/type-scale.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `--breakpoint-split: 960px`; every `--text-*` size token in rem (or a `clamp` of rems).

- [ ] **Step 1: The failing tests**

Create `src/__tests__/guardrails/type-scale.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8')
const sizes = [...css.matchAll(/--text-([a-z-]+):\s*([^;]+);/g)].filter(([, name]) => !name!.includes('--'))

describe('the type scale follows the reader\'s font size', () => {
  it('states every size in rem', () => {
    expect(sizes.length).toBeGreaterThanOrEqual(10)
    for (const [, name, value] of sizes) expect(value, name).toMatch(/^(?:[\d.]+rem|clamp\([\d.]+rem, [\d.]+vw, [\d.]+rem\))$/)
  })
  it('keeps today\'s px at the default root size', () => {
    const px = Object.fromEntries(sizes.map(([, name, value]) => [name, Number(/^([\d.]+)rem$/.exec(value!)?.[1]) * 16]))
    expect(px).toMatchObject({ label: 10.5, 'table-dense': 12.5, table: 13, body: 14, copy: 15.5, title: 22, total: 28, 'readout-sm': 36 })
  })
  it('sets the body in rem and form controls at 16 px or more on narrow screens', () => {
    expect(css).toMatch(/body \{[^}]*font-size: 0\.875rem;/)
    expect(css).toMatch(/input, select, textarea \{\s*@variant max-narrow \{\s*font-size: max\(16px, 1rem\);/)
  })
})
```

In `source.test.ts` the breakpoint expectation becomes `/--breakpoint-narrow:\s*768px;[\s\S]*--breakpoint-split:\s*960px;[\s\S]*--breakpoint-wide:\s*1440px;/`. Run: FAIL.

- [ ] **Step 2: The tokens**

In `app.css` `@theme`: `--breakpoint-split: 960px;` and

```css
  --text-label: 0.65625rem;
  --text-table-dense: 0.78125rem;
  --text-table: 0.8125rem;
  --text-body: 0.875rem;
  --text-copy: 0.96875rem;
  --text-title: 1.375rem;
  --text-total: 1.75rem;
  --text-readout-sm: 2.25rem;
```

(`readout-md` and `readout-lg` are Task 18's clamps). In `@layer base`: `body { … font-size: 0.875rem; … }` and

```css
  input, select, textarea {
    @variant max-narrow {
      font-size: max(16px, 1rem);
    }
  }
```

`detectors.ts`: `BREAKPOINT_LITERAL = /(?:min|max)(?:-w)?-\[(?:768|960|1440)px\]/g`.

- [ ] **Step 3: The layout specs**

`shell.spec.ts`: "thread list beside main, context column under the thread at 1024px" becomes "three panes side by side at 1024px" (the 1440 px test's assertions, at 1024), and the old assertions move to a new test at `900` px. `rebalance-job.spec.ts`'s last layout test sets `1024` → `900` for the "context column drops below main" half, and its title becomes "…; the context column drops below main at 900px".

- [ ] **Step 4: Tests, visuals; commit**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual`: no PNG moves (1440 px is above both breakpoints and rem equals px at 16 px root); the 1024 px checks pass with three panes. Then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A src e2e-visual
git commit -m "fix(type): the type scale in rem, form controls at 16 px on phones, and three panes from 960 px

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 20: The phone shell (audit H6, M6, M7)

Below 768 px the shell shows a sticky tab bar — Threads | Thread | Context — and one pane at a time: the thread first on `/t/*`, Threads on the home page. The key legend is hidden where there is no hover; under a coarse pointer every control is at least 44 px tall, and nothing is under 24 px anywhere.

**Files:**
- Create: `src/workspace/shell/phone-panes.ts`, `src/workspace/__tests__/phone-panes.test.ts`, `e2e-visual/phone.spec.ts`
- Modify: `src/workspace/shell/WorkspaceShell.tsx`, `src/styles/app.css`, `src/kit/button/button-variants.ts`, `src/kit/data-table/DataTable.tsx`, `e2e-visual/layout-checks.ts`, `e2e-visual/workspace-steps.ts`, `e2e-visual/dialogs.spec.ts`, `e2e-visual/reflow.spec.ts`
- Test: `src/workspace/__tests__/shell.test.tsx`

**Interfaces:**
- Consumes: `contextColumnOf`, `threadListHidden`, `THREAD_LIST_ID`, `MAIN_ID`, `CONTEXT_COLUMN_ID`.
- Produces: `PhonePane = 'threads' | 'thread' | 'context'`; `phonePanes({ listHidden, hasContext }): PhonePane[]`; `defaultPhonePane(pathname: string, listHidden: boolean): PhonePane`; the tab bar `<nav aria-label="Panes">` of buttons named "Threads", "Thread", "Context", the shown one with `aria-current="true"`; `@custom-variant touch (@media (hover: none))` and `@custom-variant coarse (@media (pointer: coarse))` in `app.css`; `smallTargets(page, min): Promise<string[]>` in `layout-checks.ts`; `openPhonePane(page, name)` in `workspace-steps.ts`.

- [ ] **Step 1: The failing tests**

`src/workspace/__tests__/phone-panes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { defaultPhonePane, phonePanes } from '@/workspace/shell/phone-panes'

describe('the phone panes', () => {
  it('offers the thread list, the page and the context column that the route has', () => {
    expect(phonePanes({ listHidden: false, hasContext: true })).toEqual(['threads', 'thread', 'context'])
    expect(phonePanes({ listHidden: false, hasContext: false })).toEqual(['threads', 'thread'])
    expect(phonePanes({ listHidden: true, hasContext: true })).toEqual(['thread', 'context'])
    expect(phonePanes({ listHidden: true, hasContext: false })).toEqual(['thread'])
  })
  it('opens on the thread for a thread route, on the list at home, on the page elsewhere', () => {
    expect(defaultPhonePane('/t/th-brief', false)).toBe('thread')
    expect(defaultPhonePane('/', false)).toBe('threads')
    expect(defaultPhonePane('/billing', true)).toBe('thread')
    expect(defaultPhonePane('/archive', false)).toBe('thread')
  })
})
```

In `shell.test.tsx`:

```ts
  it('on a phone shows one pane at a time, the thread first, and switches from the tab bar', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    const tabs = screen.getByRole('navigation', { name: 'Panes' })
    expect(within(tabs).getAllByRole('button').map((b) => b.textContent)).toEqual(['Threads', 'Thread', 'Context'])
    expect(within(tabs).getByRole('button', { name: 'Thread' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('navigation', { name: 'Threads' }).className).toContain('max-narrow:hidden')
    expect(screen.getByRole('main').className).not.toContain('max-narrow:hidden')
    await userEvent.setup().click(within(tabs).getByRole('button', { name: 'Context' }))
    expect(within(tabs).getByRole('button', { name: 'Context' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('main').className).toContain('max-narrow:hidden')
    expect(document.getElementById('context-column')!.className).not.toContain('max-narrow:hidden')
  })
```

Run both: FAIL.

- [ ] **Step 2: The panes**

`src/workspace/shell/phone-panes.ts`:

```ts
export type PhonePane = 'threads' | 'thread' | 'context'

export const PHONE_PANE_WORDS: Readonly<Record<PhonePane, string>> = { threads: 'Threads', thread: 'Thread', context: 'Context' }

export function phonePanes({ listHidden, hasContext }: { listHidden: boolean; hasContext: boolean }): PhonePane[] {
  return [...(listHidden ? [] : ['threads' as const]), 'thread', ...(hasContext ? ['context' as const] : [])]
}

/** The thread comes first on a thread route; the home page opens on the list; any other page on itself. */
export function defaultPhonePane(pathname: string, listHidden: boolean): PhonePane {
  return pathname === '/' && !listHidden ? 'threads' : 'thread'
}
```

In `WorkspaceShell.tsx`:

```tsx
  const { pathname } = useLocation()
  const panes = phonePanes({ listHidden, hasContext: context !== undefined })
  const [chosen, setChosen] = useState<{ path: string; pane: PhonePane }>()
  const wanted = chosen?.path === pathname ? chosen.pane : defaultPhonePane(pathname, listHidden)
  const pane = panes.includes(wanted) ? wanted : 'thread'
  const hiddenOnPhone = (p: PhonePane) => (pane === p ? '' : 'max-narrow:hidden')
  const choose = (p: PhonePane) => {
    setChosen({ path: pathname, pane: p })
    requestAnimationFrame(() => document.getElementById(p === 'threads' ? THREAD_LIST_ID : p === 'context' ? CONTEXT_COLUMN_ID : MAIN_ID)?.focus())
  }
```

and, between the header and the grid:

```tsx
      <nav aria-label="Panes" className="sticky top-0 z-10 flex border-b border-ink bg-bg px-6 narrow:hidden">
        {panes.map((p) => (
          <Button key={p} rank="quiet" aria-current={p === pane ? 'true' : undefined} onClick={() => choose(p)}
            className={cn('min-h-11 flex-1 justify-center no-underline', p === pane && 'font-semibold underline decoration-ink')}>
            {PHONE_PANE_WORDS[p]}
          </Button>
        ))}
      </nav>
```

The thread list `nav`, `main` and the context `div` add `hiddenOnPhone('threads')`, `hiddenOnPhone('thread')` and `hiddenOnPhone('context')` to their `cn(...)`. The header: `KeyLegend` gains `touch:hidden`; the `ViewAs`/`ThemeToggle` row is `flex flex-nowrap items-center gap-4`. A thread link chosen in the Threads pane changes `pathname`, so the Thread pane shows by default (no extra state).

- [ ] **Step 3: Targets**

In `app.css` (after `@theme`):

```css
@custom-variant touch (@media (hover: none));
@custom-variant coarse (@media (pointer: coarse));
```

and in `@layer base`:

```css
  button, select, summary, [role="option"], nav a {
    @variant coarse {
      min-height: 44px;
    }
  }
```

The 24 px floor everywhere: `button-variants.ts`'s `quiet` rank gains `min-h-6`; `DataTable.tsx`'s sort button gains `min-h-6 inline-flex items-center`. (Inline links inside prose are excepted by WCAG 2.5.8 and keep their line height.)

- [ ] **Step 4: The phone scenes**

`layout-checks.ts`:

```ts
/** Visible controls shorter than `min` px: buttons, selects, summaries, options and navigation links. */
export async function smallTargets(page: Page, min: number): Promise<string[]> {
  return page.evaluate((least) => [...document.querySelectorAll<HTMLElement>('button, select, summary, [role="option"], nav a')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < least - 0.5 })
    .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().height)}px`), min)
}
```

`workspace-steps.ts`: `export const openPhonePane = (page: Page, name: 'Threads' | 'Thread' | 'Context') => page.getByRole('navigation', { name: 'Panes' }).getByRole('button', { name, exact: true }).click()`.

Create `e2e-visual/phone.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, pageOverflowX, smallTargets } from './layout-checks'
import { expectNoAxeViolations } from './axe'
import { openPhonePane, settle, visit } from './workspace-steps'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

type Scene = { name: string; open: (page: Page) => Promise<void> }
const SCENES: Scene[] = [
  { name: 'phone-home-light', open: async (page) => { await visit(page, '/', 'light'); await settle(page) } },
  { name: 'phone-brief-light', open: async (page) => { await visit(page, '/t/th-brief', 'light'); await settle(page) } },
  { name: 'phone-thread-light', open: async (page) => { await visit(page, '/t/th-johnson-review', 'light'); await settle(page) } },
  { name: 'phone-context-light', open: async (page) => { await visit(page, '/t/th-johnson-review', 'light'); await openPhonePane(page, 'Context'); await settle(page) } },
  { name: 'phone-risk-book-light', open: async (page) => { await visit(page, '/risk', 'light'); await settle(page) } },
]

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test('baseline at 390px', async ({ page }) => {
      await scene.open(page)
      await expect(page).toHaveScreenshot(`${scene.name}.png`, SCREENSHOT)
      await expectNoAxeViolations(page)
    })
    test('no sideways scroll, no key legend, and every control at least 44px', async ({ page }) => {
      await scene.open(page)
      expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
      await expect(page.getByRole('list', { name: 'Keys' })).toBeHidden()
      expect(await smallTargets(page, 44)).toEqual([])
    })
  })
}

test('the thread comes first on a thread route, and a thread chosen from the list opens on the thread', async ({ page }) => {
  await visit(page, '/t/th-brief', 'light')
  const main = await page.getByRole('main').boundingBox()
  if (!main) throw new Error('main is not rendered')
  expect(main.y).toBeLessThan(300)
  await expect(page.getByRole('navigation', { name: 'Threads' })).toBeHidden()
  await openPhonePane(page, 'Threads')
  await page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name: 'Johnson Rebalance Review', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Johnson Rebalance Review')
  await expect(page.getByRole('navigation', { name: 'Panes' }).getByRole('button', { name: 'Thread', exact: true })).toHaveAttribute('aria-current', 'true')
})

test('nothing on a desktop is under 24px', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await visit(page, '/t/th-brief', 'light')
  await settle(page)
  expect(await smallTargets(page, 24)).toEqual([])
  await page.close()
})
```

In `dialogs.spec.ts`' 320 px test and anywhere a phone-width test clicks a thread-list link, call `await openPhonePane(page, 'Threads')` first (the list is now a pane).

- [ ] **Step 5: Tests, baselines; commit**

Run: `pnpm vitest run --testTimeout 30000`, then `VISUAL_PORT=5195 pnpm visual`. The 1440 px baselines move by the 24 px floor (quiet buttons, sort buttons): regenerate every spec (`VISUAL_PORT=5195 pnpm visual:update`); `not-found-light` must not move. Open every listed PNG: at 1440 px only the heights of quiet and sort buttons changed; the five phone PNGs show the tab bar under the header, one pane, no key legend, View as and Theme on one row, and tappable rows.

Then `pnpm lint && pnpm type-check && pnpm build && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A src e2e-visual
git commit -m "feat(phone): a sticky Threads | Thread | Context tab bar, the thread first; no key legend without hover; 44 px targets under a coarse pointer and nothing under 24 px

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 21: Load (audit H5, M9, L7)

The thread list reserves its height while it loads; `index.html` ships a static shell that matches the first frame; the mock-server chunk and the Archivo latin font are preloaded; the worker starts in parallel with the app chunk; the firm's secondary routes load lazily.

**Files:**
- Create: `src/app/App.tsx`, `src/workspace/shell/ThreadListSkeleton.tsx`
- Modify: `src/workspace/shell/ThreadList.tsx`, `index.html`, `src/main.tsx`, `vite.config.ts`, `src/app/routes.tsx`
- Test: `src/workspace/__tests__/shell.test.tsx`, `src/app/__tests__/routes.test.tsx`

**Interfaces:**
- Consumes: `router` (`routes.tsx`), `createAppQueryClient`, `ViewerProvider`, `providerFuture`, `ServerUnavailable`.
- Produces: `App` (the providers and the router, in its own chunk); `ThreadListSkeleton`; a Vite plugin `preloadServerAndFont` (build only) injecting `<link rel="modulepreload" href="/assets/browser-*.js">` and `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/archivo-latin-wdth-normal-*.woff2">`.

- [ ] **Step 1: The failing tests**

In `shell.test.tsx`:

```ts
  it('reserves the thread list while it loads: the panes and rows the loaded list will have, and a status', async () => {
    server.use(http.get('/api/workspace/threads', async () => { await delay(200); return HttpResponse.json([]) }))
    renderRoutes(routes, '/')
    expect(await screen.findByText('Loading threads…')).toBeInTheDocument()
    const skeleton = document.querySelector('[data-part="thread-list-skeleton"]')!
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    expect(skeleton.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(14)
  })
```

(14 rows: Desk 2, Reference 6, Private 1, Internal 3, Clients and prospects 2 — the advisor's list; import `delay` from `msw` beside `http` and `HttpResponse`). In `routes.test.tsx`:

```ts
  it.each(['/kit', '/supervision', '/archive', '/prospects/prsp-011', '/billing', '/risk', '/models', '/models/mod-005', '/blotter', '/practice', '/reconciliation'])('%s loads its page lazily', (path) => {
    const [match] = matchRoutes(routes, path)!.slice(-1)
    expect(match!.route.lazy).toBeTypeOf('function')
    expect(match!.route.element).toBeUndefined()
  })
```

(`matchRoutes` from react-router-dom). Run: FAIL.

- [ ] **Step 2: The skeleton**

`src/workspace/shell/ThreadListSkeleton.tsx`:

```tsx
import { Pane } from '@/kit/layout/Pane'

/** The advisor's list before it arrives: the same panes and row heights, so nothing below moves when it lands. */
const SHAPE: readonly { title: string; rows: number; tall: boolean }[] = [
  { title: 'Desk', rows: 2, tall: false }, { title: 'Reference', rows: 6, tall: false },
  { title: 'Private', rows: 1, tall: true }, { title: 'Internal', rows: 3, tall: true }, { title: 'Clients and prospects', rows: 2, tall: true },
]

export function ThreadListSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">Loading threads…</p>
      <div aria-hidden="true" data-part="thread-list-skeleton" className="flex flex-col gap-8">
        {SHAPE.map(({ title, rows, tall }) => (
          <Pane key={title} title={title}>
            <ul className="flex flex-col">
              {Array.from({ length: rows }, (_, i) => (
                <li key={i} data-part="skeleton-row" className="flex flex-col gap-1.5 border-l-2 border-transparent py-2 pl-3 pr-2">
                  {tall ? <div className="h-2" /> : null}
                  <span className="text-body text-transparent">{' '}</span>
                </li>
              ))}
            </ul>
          </Pane>
        ))}
      </div>
    </>
  )
}
```

(a thread row's mark is 2 px, 8 px or 4 px tall by visibility; `h-2` is the hatched one, the tallest; adjust a row class only if the Task 22 CLS measure shows the list itself shifting). `ThreadList.tsx`: `if (threads.isPending) return <ThreadListSkeleton />`.

- [ ] **Step 3: The static shell and the preloads**

`index.html`: `<div id="root">` holds the first frame:

```html
    <div id="root">
      <div class="flex min-h-screen flex-col"><div class="flex-1 bg-bg text-ink">
        <header class="mx-auto flex max-w-(--breakpoint-wide) flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ink px-6 py-3">
          <span class="text-body font-semibold uppercase stretch-wide">Advisor Desktop</span>
          <span class="h-9"></span>
        </header>
        <div class="h-11 border-b border-ink narrow:hidden"></div>
        <p role="status" class="sr-only">Loading the workspace…</p>
      </div></div>
    </div>
```

(React's `createRoot(...).render` replaces it; Tailwind scans `index.html`, so these classes exist; the header's `h-9` stands in for View as, and the `h-11` bar for the phone tab bar). `vite.config.ts`:

```ts
import { defineConfig, type Plugin, type Rollup } from 'vite'

/** Build only: the mock server's chunk and the Archivo latin face are preloaded, so they load beside the app instead of after it. */
function preloadServerAndFont(): Plugin {
  return {
    name: 'preload-server-and-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) throw new Error('preload-server-and-font runs at build, with a bundle')
        const files = Object.values(ctx.bundle)
        const server = files.find((f): f is Rollup.OutputChunk => f.type === 'chunk' && (f.facadeModuleId ?? '').endsWith('/src/mocks/browser.ts'))
        const font = files.find((f): f is Rollup.OutputAsset => f.type === 'asset' && /archivo-latin-wdth-normal-[\w-]+\.woff2$/.test(f.fileName))
        if (!server) throw new Error('preload-server-and-font: no mock-server chunk in the bundle')
        if (!font) throw new Error('preload-server-and-font: no Archivo latin face in the bundle')
        return [
          { tag: 'link', attrs: { rel: 'modulepreload', href: `/${server.fileName}` }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${font.fileName}`, crossorigin: '' }, injectTo: 'head' },
        ]
      },
    },
  }
}
```

with `plugins: [react(), tailwindcss(), preloadServerAndFont()]`.

- [ ] **Step 4: The worker beside the app**

`src/app/App.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { providerFuture } from './router-flags'
import { createAppQueryClient } from './query-client'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'

const queryClient = createAppQueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ViewerProvider><RouterProvider router={router} future={providerFuture} /></ViewerProvider>
    </QueryClientProvider>
  )
}
```

`src/main.tsx` keeps React, ReactDOM, the CSS, `ServerUnavailable`, the preload-error reload and `rootElement`, and starts both loads at once:

```tsx
const app = import('@/app/App')
const server = startServer()

server.then(
  async () => {
    const { App } = await app
    ReactDOM.createRoot(rootElement()).render(<React.StrictMode><App /></React.StrictMode>)
  },
  (error: unknown) => {
    console.error('The demo server (MSW service worker) did not start:', error)
    const reason = error instanceof Error ? error.message : String(error)
    ReactDOM.createRoot(rootElement()).render(<ServerUnavailable reason={reason} />)
  },
)
```

(the `QueryClientProvider`, `RouterProvider`, `router`, `providerFuture`, `createAppQueryClient` and `ViewerProvider` imports leave `main.tsx`; a rejected `app` import surfaces as an unhandled rejection with Vite's own preload-error reload, as before).

- [ ] **Step 5: Lazy routes**

In `routes.tsx`, each of these routes drops its `element` (and its static import) for `lazy`, keeping its `path` and `handle`:

```tsx
          { path: 'archive', lazy: () => import('@/workspace/archive/ArchivePage').then((m) => ({ Component: m.ArchivePage })) },
          { path: 'billing', lazy: () => import('@/workspace/reference/BillingPage').then((m) => ({ Component: m.BillingPage })), handle: fullWidthHandle },
```

and likewise `risk` (`BookRiskPage`), `accounts/:accountId/risk` (`AccountRiskPage`), `accounts/:accountId/attribution` (`AttributionPage`), `models` (`ModelsPage`), `models/:modelId` (`ModelPage`), `blotter` (`BlotterPage`), `practice` (`PracticePage`), `reconciliation` (`ReconciliationPage`), `supervision` and `supervision/:kind/:id` (`SupervisionPage`), `prospects/:prospectId` (`ProspectPage`), and `kit` (`KitPage`). The threads, the workbench, the meeting view and the full views stay eager (the story's main path); the MSW chunk stays as it is.

- [ ] **Step 6: Tests, the build, visuals; commit**

Run: `pnpm vitest run --testTimeout 30000` (route tests that rendered a lazy route already `await findBy…`; one that used `getBy…` right after render waits instead).
Run: `pnpm build`, then:

```bash
grep -o '<link rel="modulepreload"[^>]*browser-[^>]*>' dist/index.html
grep -o '<link rel="preload" as="font"[^>]*archivo-latin-wdth-normal-[^>]*>' dist/index.html
ls dist/assets | grep -E '^(BillingPage|KitPage|SupervisionPage)-'
```

Expected: one of each preload; the lazy pages have their own chunks; the build's printed size for `index-*.js` is below the 700 kB it was (record both figures in the report).
Run: `VISUAL_PORT=5195 pnpm visual` (no PNG moves), then `pnpm lint && pnpm type-check && pnpm dlx knip@6.39.0 --no-progress`.

```bash
git add -A index.html vite.config.ts src e2e-visual
git commit -m "perf(load): a reserved thread list and a static first frame; the mock server and the font preloaded; the worker starts beside the app; secondary routes load lazily

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

### Task 22: The README's path, the whole suite, mobile CLS, and the preview

The README's click path follows the new Brief, the Take to menu and the home page; `readme-path.spec.ts` performs it click for click. Then everything runs, mobile CLS is measured and recorded, and the workspace preview is refreshed. The controller pushes `workspace`; the implementer does not push.

**Files:**
- Create: `scripts/measure-cls.mjs`
- Modify: `README.md`, `e2e-visual/readme-path.spec.ts`, `package.json` (one script)

**Interfaces:**
- Consumes: every earlier task; `takeFindingTo`, `openPhonePane` and the rest of `e2e-visual/workspace-steps.ts`; `HOME_STEPS` (the README's steps and the home page's must say the same eight things).
- Produces: `pnpm measure:cls <base-url>`; the README.

- [ ] **Step 1: The README's path**

In `README.md`, replace the paragraph under "## Five minutes, click by click" and steps 1, 2, 4, 5 and 6 (steps 3, 7 and 8 and every image stay):

```markdown
You are Adrian Hale, the advisor. Nobody else acts live: colleagues' history is seeded, agents do the analysis, and **View as** shows what each person can see. The home page lists these eight steps and marks each one done as you go. Follow them in order: the clock only moves forward, and a reload starts the demo over. Single-key shortcuts (`/`, `?`, `t`) can be turned off in the key sheet (**Ctrl/⌘ /**); **Ctrl/⌘ K** always opens the command line.

1. **The Brief.** Choose **Brief** in the thread list. **Today** lists the day in Eastern Time: the 14:00 annual review, the 15:30 coffee with Dr. Pell (Form CRS due before it, firm policy) and the open reconciliation break. **Needs a decision** ranks what would change a trade, each with its figure; **Context** holds the rest, folded.
2. **The Johnson rebalance and harvest.**
   - On the Harvest Scanner's finding about the remaining Intel shares, choose **Take to**, then **Johnson Rebalance Review**, and open **Johnson Rebalance Review**.
   - (the remaining bullets of step 2 as they are)
```

Step 4's last sentence: "Choose **Back to the thread** and open the **Brief**: Intel has left **Needs a decision**, and its two realized losses sit under **Context**." Step 5 begins: "In the Brief, under **Today**, on the annual review's line choose **Open the meeting thread**." Step 6 begins: "In the Brief, under **Today**, on the coffee's line choose **Open her thread**." Under "## What it enforces", add a bullet:

```markdown
- **One clock.** Every time people read is Eastern Time with its zone ("25 Feb 07:00 ET"); UTC appears only in a record slip, labeled, beside its fingerprint (`src/kit/measure.ts`, `src/__tests__/guardrails/one-clock.test.ts`).
```

and change "Playwright for exact visual baselines and the end-to-end stories" to "Playwright for exact visual baselines, axe on every scene, and the end-to-end stories". Check each bold control name against the spec in Step 2, and `ls` every image path the README names.

- [ ] **Step 2: The spec performs the README**

`e2e-visual/readme-path.spec.ts`: the numbered comments are the README's steps. Before step 1, the home page:

```ts
  // The home page: the eight steps, the first one next.
  await visit(page, '/', 'light')
  await expect(page.getByRole('list', { name: 'The five-minute path' }).getByRole('listitem')).toHaveCount(8)
  await expect(page.getByRole('list', { name: 'The five-minute path' }).getByRole('listitem').first()).toContainText('NEXT')

  // 1. The Brief: Today, Needs a decision, Context.
  await threadLink(page, 'Brief').click()
  await expect(heading(page)).toHaveText('Brief')
  const today = page.getByRole('region', { name: 'Today' })
  await expect(today).toContainText('14:00–15:15 ET')
  await expect(today).toContainText('Coffee with Dr. Amanda Pell · Form CRS due before it (firm policy)')
  await expect(page.getByRole('region', { name: 'Needs a decision' })).toContainText('Intel Corp.')

  // 2. …
  const intc = conversation(page).getByRole('article', { name: /^Harvest Scanner: The remaining Intel Corp\. shares can be sold at a loss today/ })
  await takeFindingTo(intc, 'Johnson Rebalance Review')
  await threadLink(page, 'Johnson Rebalance Review').click()
```

Step 4's Brief check: `await expect(page.getByRole('region', { name: 'Needs a decision' })).not.toContainText('Intel Corp.')` and `await expect(page.getByRole('region', { name: 'Context' })).toContainText('Intel Corp.')`. Steps 5 and 6 open their threads from Today (`page.getByRole('region', { name: 'Today' }).getByRole('link', { name: 'Open the meeting thread' })`, `… 'Open her thread'`). At the end of step 7, back on the home page, `await expect(page.getByRole('list', { name: 'The five-minute path' }).getByRole('listitem').nth(7)).toContainText('NEXT')`. Step 8 is unchanged.

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
```

Expected: all green. Count the baselines (`ls e2e-visual/__baselines__ | wc -l`: 49 at the start, plus the 10 new ones of Tasks 8, 9, 12, 13 and 20 = 59) and record the suite counts in the report.

- [ ] **Step 4: Mobile CLS**

Create `scripts/measure-cls.mjs`:

```js
import { chromium, devices } from '@playwright/test'

/**
 * Mobile layout shift on the demo's two first screens, Lighthouse-like: a Pixel 7, 4× CPU slowdown,
 * a slow-4G network, and the sum of every shift without recent input over load plus three seconds
 * (an upper bound on Lighthouse's windowed CLS). Recorded, not gated: the target is 0.1 or less.
 */
const base = process.argv[2]
if (!base) throw new Error('Usage: pnpm measure:cls <base-url>, e.g. http://localhost:4195')
const ROUTES = ['/', '/t/th-brief']
const RUNS = 3

async function measure(browser, url) {
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  await page.addInitScript(() => {
    window.__shifts = []
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__shifts.push({ value: e.value, nodes: (e.sources ?? []).map((s) => s.node?.nodeName ?? '?').join(',') })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(url, { waitUntil: 'load' })
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(3_000)
  const shifts = await page.evaluate(() => window.__shifts)
  await context.close()
  return { cls: shifts.reduce((sum, s) => sum + s.value, 0), shifts }
}

const browser = await chromium.launch()
for (const route of ROUTES) {
  const runs = []
  for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, `${base}${route}`))
  const worst = runs.reduce((a, b) => (b.cls > a.cls ? b : a))
  console.log(`${route}: CLS ${runs.map((r) => r.cls.toFixed(3)).join(', ')} (worst ${worst.cls.toFixed(3)})`)
  for (const s of worst.shifts) console.log(`  ${s.value.toFixed(3)} ${s.nodes}`)
}
await browser.close()
```

`package.json` scripts gain `"measure:cls": "node scripts/measure-cls.mjs"` (knip sees the script through it). Then:

```bash
pnpm build
pnpm preview --port 4195 --strictPort &   # stop it after the measure
pnpm measure:cls http://localhost:4195
```

Expected: the worst run on each route is ≤ 0.1 (the audit measured 0.897 on `/`). Record the six numbers in the commit message body and the report. If a route is over 0.1, stop before Step 5 and report the printed shift sources; the controller decides.

- [ ] **Step 5: Commit, then the preview**

```bash
git add README.md e2e-visual/readme-path.spec.ts scripts/measure-cls.mjs package.json
git commit -m "docs(readme): the five-minute path through Today, Needs a decision and the Take to menu; the README spec performs it; mobile CLS measured

Mobile CLS (Pixel 7, 4x CPU, slow 4G, worst of three): / <n>, /t/th-brief <n>.

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-8 --message "workspace phase 8: the audit and the critique"
git checkout -- wrangler.jsonc 2>/dev/null; git status --short    # empty
```

Open `https://workspace-advisor-desktop.joel-e-lewis.workers.dev/`, `/t/th-brief`, `/billing` and `/no-such-page` and check: the home page's eight steps with NEXT on the first; the Brief leading with Today; the tab titles ("Workspace · Advisor Desktop", "Brief · Advisor Desktop", "Billing · Advisor Desktop", "Page not found · Advisor Desktop"); a dark-theme reload (`?theme=dark`) with no light flash; and on a phone-width window the tab bar with the thread first. Report the version id wrangler printed. Do not push: the controller pushes `workspace`.

---

## Self-review notes (for the executor)

- **Spec coverage.** §1 Brief → Tasks 3 (decide/context in one engine function, Intel as one item, numbered lines with kit-formatted figures, digit-free lines, re-measure after fills) and 4 (Today from session state, the old bottom lines removed). §2 quieter scaffolding → 5 (chips, as-of, Take to), 6 (legend, note actions, type, asset names, Book risk readouts), 12 (theme toggle, key legend). §3 one clock → 2 (and `fmtEasternWindow` in 4). §4 home and empty states → 8 (home, progress rules, Next) and 9 (empty states, resets-on-reload, View-as redirect via the announcer). §5 long screens → 10, 11. §6 keyboard and accessibility → 12 (C1), 13 (H1, M11), 14 (H2), 15 (H3, L4), 7 (M1), 16 (M2, L3), 18 (L2). §7 → 17 (H4, L9, L10, L11), 18 (M3, M4, M5, L1, L5), 19 (M8, L6), 20 (H6, M6, M7), 21 (H5, M9, L7), 16 (L8). Testing → each task's unit tests; axe from Task 1; the spec's new baselines (Brief light and dark: existing, moved in 3–5; home fresh and mid-story: 8; workbench drift: 10; meeting view: 11; the `?` sheet: 12; dialogs at 1440×600 and 320: 13; phone scenes at 390: 20); the README path: 3–5 keep it green, 22 rewrites it; CLS: 22.
- **Spec decisions made explicit** are listed after the coverage table (the Ctrl/⌘ / sheet route, the Intel item's group, the step rules, counts as digits, which caps stay, the phone tab bar on full-width routes, the 1024 px assertion).
- **Names across tasks.** `fmtEasternStamp`, `fmtUtcStamp` (2); `fmtEasternWindow` (4); `BriefTopic`, `TopicFinding`, `withoutTopic`, `MeasuredFinding`, `briefGroupOf`, `briefLine`, `briefItems`, `BriefGroup`, `BriefItem`, `BriefReading` (3); `TodayLine`, `briefToday`, `BRIEF_TODAY_ID` (4); `sharedAsOf`, `CarryTarget.kind`, `takeFindingTo` (5); `VISIBILITY_RULE`, `VisibilityMark`, `VisibilityLegend` (6); `AnnouncerProvider`, `useAnnounce`, `data-part="announcer"` (7, read by 9, 12, 16); `StoryStepId`, `StoryProgress`, `storyProgress`, `getStoryProgress`, `useStoryProgress`, `HOME_STEPS` (8); `HiddenRedirect`, `hiddenRedirectOf`, `useGoHomeWhenHidden(query, subject)`, `FullViewNotFound.resetsOnReload`, `DataTable.empty` (9); `workbenchDriftRows`, `DriftTable`, `Gauge.before`/`bare` (10); `readSingleKeys`, `saveSingleKeys`, `isCommandChord`, `isSheetChord`, `MODIFIER_WORD`, `singleKeys`/`setSingleKeys` (12); `Button.pending`, `TextInput.id`/`readOnly` (14); `documentTitleOf`, `useDocumentTitle` (15); `DataTable.expandedRowId` (16); `THEME_STORAGE_KEY`, `initialThemeAttribute`, `themeLabel`, `useSystemDark` (17); `isOverflowing`, `useOverflowing` (18); `PhonePane`, `phonePanes`, `defaultPhonePane`, `smallTargets`, `openPhonePane` (20); `App`, `ThreadListSkeleton`, `preloadServerAndFont` (21).
- **Counted fixtures.** Seed ids (`th-brief`, `th-johnson-review`, `th-johnson-meeting`, `th-robert`, `th-pell`, `th-pell-work`, `evt-010`, `evt-004`, `brk-002`, `prsp-011`) and act ids assume a fresh store per test, which `src/test/setup.ts` resets after each; Task 12 adds `localStorage.clear()` there so the shortcut setting never leaks.
