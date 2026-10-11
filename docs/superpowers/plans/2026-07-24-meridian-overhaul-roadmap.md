> **Superseded 11 October 2026.** Meridian was replaced as the design target. Phases 1 and 1b (data integrity) and the tabular-figures utility shipped; the remaining phases are replaced by `docs/superpowers/specs/2026-10-11-workspace-roadmap.md`. Kept for history.

# Meridian Overhaul — Master Roadmap

> **For agentic workers:** This is the roadmap, not an executable plan. Each phase has its own
> detailed plan at `docs/superpowers/plans/2026-07-24-phase-N-<name>.md`. Use
> `superpowers:subagent-driven-development` to execute each phase plan task-by-task.

**Goal:** Take the Advisor Desktop demo from a credible-looking prototype with untrustworthy numbers
and a generic AI-SaaS skin, to a portfolio-grade showcase whose numbers withstand practitioner
scrutiny and whose interface is a faithful implementation of the Meridian design system.

**Architecture:** Seven sequential phases, integrity before aesthetics. Each phase ends at a gate
that must pass before the next begins. Phases 1–2 make the product *true*; phases 3–5 make it
*Meridian*; phases 6–7 make it *a showcase*.

**Tech Stack:** React 18 · TypeScript (strict) · Tailwind v4 · Radix · Recharts · MSW · Vitest ·
Playwright · Vite 6 · pnpm

---

## Source material

All inputs live in the session scratchpad. **Copy these into `docs/superpowers/reference/` before
starting Phase 1** — the scratchpad is session-scoped and will not survive.

| File | What it is |
| --- | --- |
| `SYNTHESIS.md` | Cross-cutting synthesis of all six agent reports |
| `design-system-brief.md` | Meridian spec — tokens + 60 auditable rules |
| `meridian-components.md` | The 20 Meridian component contracts |
| `meridian-dark-spec.md` | Derived dark theme — 136 contrast pairs, 0 failures |
| `critique-finance.md` | 80 findings — domain correctness |
| `critique-design-system.md` | 71 findings — Meridian adherence |
| `critique-ux.md` | ~101 findings — design + accessibility |
| `critique-content.md` | 78 findings — voice, copy, formatting |
| `critique-dataviz.md` | 55 findings — charts |
| `shots/` | 42 baseline screenshots (21 screens × light/dark) |

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

---

## Phase sequence

### Phase 1 — Numbers you can trust
**Plan:** `2026-07-24-phase-1-data-integrity.md`
**Why first:** Four of five audit agents independently identified data integrity as the finding that
ends a review before design is assessed. It is also the cheapest phase — mostly fixture
reconciliation and derived-value functions, very little UI.

Scope:
- One source of truth for AUM. Household `managedAUM` becomes **derived**, not hand-typed (5 of 13
  currently disagree with their accounts; roll-ups exceed book total by $14.6M / 16%). Fix the
  mixed-currency 1:1 summation behind Chen-Wong's $43.5M-vs-$30.3M gap.
- Reconcile the four Total AUM values ($91.3M / $102.5M / $99.855M / $107.055M) to one derived figure.
- Fix the 100× fee unit error (`pms.ts:702` renders `0.85 bps`, it is 85 bps) and reconcile the three
  competing fee numbers to one asset-weighted calculation.
- Per-account risk metrics — `pms.ts:288-297` currently returns identical values for every account
  including `VaR (95%) $485,000` on both a $100K IRA and a $12M trust. Add horizon, confidence and
  method labels. Correct the Sharpe (currently ~2× the value implied by the app's own return and σ).
- Concentration analysis: distinguish single-name from fund exposure with look-through, so NVDA at
  13.9% surfaces instead of VTI at 27.8% being flagged as an IPS breach.
- Wash-sale logic: anchor on the loss **sale** date, not `lot.purchaseDate`; label the window 61-day;
  replace the `washSaleRestricted: false` hardcode; stop applying a flat 37% rate to long-term lots.
- Brinson attribution: restore the `interaction` term so the identity holds and the three summary
  cards sum.
- Replace `ALLOCATION_TEMPLATES` (`HouseholdListView.tsx:24`) and `CLIENT_ALLOCATION`
  (`ClientDetailPage.tsx:134`) with real per-entity allocations.
- One clock. Remove the hardcoded `new Date('2026-02-25')` (`WorkflowCenterPage.tsx:94`) and the seven
  literal date strings producing four different "todays".
- Reconcile contradictory counts (`PENDING TASKS 14` vs `20 pending actions identified`;
  `2 Critical Actions` vs `3 time-sensitive items`).
- Correct the Reg BI / DOL PTE 2020-02 exposure at `nbas.ts:186-194` — the rollover claimed to *save*
  ~$4,800/yr would *add* ~$10,200/yr at the household's 85 bps.
- Fix the Revenue Trend flatline (`revenue.ts:102-103`) and the AUM waterfall $0 baseline.

**Gate:** A property test asserts every roll-up equals the sum of its parts. Codex runs an
independent adversarial pass over the corrected finance logic (see *Codex usage*). No contradictory
figures survive a full-app screenshot diff.

---

### Phase 2 — The formatting spine
**Plan:** `2026-07-24-phase-2-formatting-spine.md`
**Why second:** ~200 call sites are corrected by roughly five lines plus one component. Three audit
agents converged on `src/lib/utils.ts` independently. Doing this before the visual work means every
later phase inherits correct figures for free.

Scope:
- Rewrite `src/lib/utils.ts`: true minus, correct compact-money precision, **split `formatPercent`
  into weight (1dp) and return (2dp) variants** — it currently signs fee rates as `+0.85%` — route
  dates through the app's own date-format setting instead of hardcoded `en-US`, and add the missing
  masking utility.
- Build the three missing Meridian primitives: **`DeltaValue`** (*"the only correct way to render a
  change figure — never colour a plain number by hand"*), **`Tag`**, **`IconButton`**.
- Migrate all signed-figure sites to `DeltaValue`. Mask account numbers at the 9 sites currently
  rendering `TRU-847291`; stop rendering SSN/EIN as plain text.
- Introduce the compliance register: `net of fees` / `gross of fees` / `estimated` / `as of` where
  performance and projections are shown. Replace the unhedged
  `'All compliance checks passed. Ready to execute.'`.

**Gate:** Repo-wide grep proves zero hyphen-minus in signed output and zero unmasked account
numbers. Unit tests cover every formatter branch.

---

### Phase 3 — Meridian foundation
**Plan:** `2026-07-24-phase-3-meridian-foundation.md`
**Why here:** Global and cheap — it moves every screen at once. Must land before component work so
components are built against final tokens.

Scope:
- **Amend the design system first**, then push back to the Claude Design project:
  - Viz palette CVD failure (`viz-2 #8C9663` vs `viz-3 #C08A2E` at ΔE 5.6 protan, gate 15). Re-order
    to `#4C553A, #C08A2E, #4C6272, #B45C3C`, cap categorical use at 4 series.
  - Light `--border-*` WCAG 1.4.11 failure at 1.43:1. Apply the dark theme's split between structural
    hairlines and visible control boundaries.
- Replace the token layer wholesale: kill the Tailwind slate ramp (`index.css:170-178`), the 517
  `#2563EB` usages and the lavender `#8B7EC8` AI colour. Install Meridian's neutrals, earth accents,
  status and viz tokens.
- Typography: load Instrument Sans, Instrument Serif and IBM Plex Mono. Point `--font-display` at an
  actual serif. Define the missing `text-h2`/`text-h3` (used at 8 sites, defined nowhere).
- Install the dark theme from `meridian-dark-spec.md` and **delete the 27-line hardcoded patch
  layer** (`index.css:222-248`).
- Elevation and motion: remove resting card shadows, replace shimmer skeletons with static ghost
  rows, remove scale-in/pulse/bounce.

**Gate:** Automated contrast check across all token pairs passes at the spec's targets in both
themes. Screenshot diff against the 42 baselines, reviewed. Zero `rgba(0,0,0,…)` shadows.

---

### Phase 4 — Component system and enforcement
**Plan:** `2026-07-24-phase-4-component-system.md`
**Why here:** The repo already had a design system and bypassed it — `Button.tsx`, `EmptyState.tsx`
and `FilterBar.tsx` have **zero imports** while 278 hand-rolled buttons ship 8 padding variants.
Without an enforcement gate this recurs.

Scope:
- Align the existing components to the 20 Meridian contracts in `meridian-components.md`.
- Migrate 278 hand-rolled buttons to `Button`. Adopt `EmptyState` and `FilterBar`.
- Fix `accent-yellow` (undefined — renders the Archive "Edit Summary" callout invisible).
- **Add the enforcement gate:** lint rules banning raw hex in components, `rounded-full` on buttons,
  cool-grey Tailwind classes, `Title Case` in user-facing strings, and resting shadows on cards. Wire
  into `pnpm lint` so CI fails on regression.

**Gate:** Zero hand-rolled buttons. Lint rules active and passing. No undefined utility classes.

---

### Phase 5 — Charts as one system
**Plan:** `2026-07-24-phase-5-chart-system.md`
**Why here:** Needs Phase 3's viz tokens and Phase 2's formatters. Currently four rival colour
vocabularies, zero shared primitives, and accessibility at 1 of 15.

Scope:
- Build shared chart primitives so 15 surfaces compose from one system rather than 15 bespoke builds.
- Consolidate on Recharts; drop `d3` + `@types/d3` (~90 kB gzipped for the two weakest components).
- Remove the dual-axis chart (`NBAEffectivenessContent.tsx:87-96`, duplicated at
  `NBAEffectivenessPage.tsx:99`) — % left, $ right.
- Rebuild the Brinson waterfall to show allocation/selection/interaction; re-baseline the AUM
  waterfall so bars aren't 1–3px slivers.
- Retire the copy-pasted `SEGMENT_COLORS` and the Tailwind-class palette at
  `ModelGovernancePage.tsx:41`; single `--viz-*` source with dark variants.
- Accessibility: text alternatives for all 15, keyboard access for every chart,
  `isAnimationActive={false}` everywhere, fix the 5 of 10 treemap labels failing 4.5:1, and the
  colour-only donut shipping `showLegend={false}`.

**Gate:** dataviz validator passes for every palette in both themes. Every chart has a text
alternative and is keyboard-reachable.

---

### Phase 6 — Voice and copy
**Plan:** `2026-07-24-phase-6-voice-and-copy.md`
**Why here:** Mechanical and safe once the structure is stable. Deliberately after the component work
so strings are edited in their final locations.

Scope:
- ~830 Title Case strings → sentence case (497 in `src/features`, 39 in `types`, 21 in `components`,
  19 in `lib`, ~250 in mock data rendered as labels).
- Rewrite `annotation-config.ts` — the guided tour is the worst-written file in the repo and the one
  surface built to be judged ("10x faster", "like having a junior analyst watching over your
  shoulder", "in under two seconds").
- Remove the outcome promise at `mocks/data/proposals.ts:51` ("which historically outperforms over
  15+ year horizons") from client-facing proposal copy.
- Canonical terminology glossary; reconcile deviations across screens.
- **Add a visible statement that the data is fictional** — currently absent from the running app.
- Error messages state what failed *and* what happens next.

**Gate:** Title Case lint rule from Phase 4 passes with zero violations. No hype vocabulary remains.

---

### Phase 7 — Screen architecture, AI accountability, showcase narrative
**Plan:** `2026-07-24-phase-7-showcase.md`
**Why last:** Structural and highest-risk; benefits from everything before it.

Scope:
- Meridian layout architecture: 60px ink nav rail, 248px sidebar, 56px top bar, 360px panel, 1180px
  content max, 44px rows (36px dense), 12px cell padding, numerics right-aligned throughout.
- Density pass — *"a screen earns each element"*. Cut cards that exist to fill a grid.
- **AI accountability.** Render the confidence that is already computed, stored and user-weightable
  but never shown. Add `undo` — currently zero in the codebase, with two execution paths firing
  irreversibly on one click. Ship a disclaimer. Raise provenance above 9–11px.
- **Surface the WORM Books & Records Archive.** It is the one genuinely distinctive asset — model
  attribution plus AI-vs-final diff — currently two nav levels deep with 10 of 15 fixtures
  byte-identical so the diff renders empty two-thirds of the time. Fix the fixtures and promote it.
- Sign-in screen as the editorial moment: split ink/cream, display-serif value line — the one place
  Instrument Serif and imagery are permitted.
- Accessibility close-out: focus traps on six modals, keyboard-operable table sorting, the
  `CommandPalette` `DialogTitle` warning, responsive behaviour at 1280px.
- Out-of-product assets via Codex: OG/social card, README imagery, marketing surface.

**Gate:** Full `impeccable:audit` re-run showing zero critical and zero high findings. Fresh
screenshot set reviewed against the 42 baselines.

---

## Codex usage

Per decision, Codex is used for three things and nothing else:

1. **Bulk mechanical refactors** — Phase 6's ~830 Title Case strings, Phase 4's 278 button call
   sites, Phase 2's ~200 formatter migrations. Always from an explicit written spec, never
   judgment calls.
2. **Second opinion on finance logic** — an adversarial verification pass over Phase 1's corrected
   calculations (attribution identity, wash-sale windows, fee arithmetic, risk metrics). Codex
   reviews the fixes; it does not author them.
3. **Out-of-product imagery** — Phase 7 only. OG card, README assets, sign-in editorial moment.
   **Not in-product decoration** — Meridian forbids photography, illustration, patterns, textures and
   decorative gradients inside the app.

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| Phase 1 fixture changes break existing tests | Phase 1 task 1 is a baseline test run; every fixture change updates its test in the same commit |
| Token replacement (Phase 3) causes wide visual regression | 42 baseline screenshots captured pre-change; screenshot diff is the gate |
| 278-button migration introduces behavioural drift | Migrate per-feature-directory with a test run per batch, not repo-wide in one commit |
| Design system amendments diverge from the Claude Design project | Phase 3 pushes amendments back before any app code depends on them |
| Scratchpad artifacts lost between sessions | Copy all reference material into `docs/superpowers/reference/` as Phase 1, Task 1 |
| Dark theme regresses as components change | Every component task screenshots both themes |

---

## Sequencing summary

```
Phase 1  Numbers you can trust        ──┐
Phase 2  Formatting spine             ──┤ product is TRUE
                                        │
Phase 3  Meridian foundation          ──┐
Phase 4  Component system + gate      ──┤ product is MERIDIAN
Phase 5  Charts as one system         ──┘
                                        
Phase 6  Voice and copy               ──┐
Phase 7  Architecture + showcase      ──┘ product is a SHOWCASE
```

Phases 3–5 could partially overlap; 1→2 and 6→7 are strictly ordered. Phase 4's enforcement gate
must land before Phase 6, since Phase 6 relies on its Title Case lint rule.
