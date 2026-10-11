# Advisor Desktop workspace: roadmap

**Date:** 11 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Replaces:** phases 3–7 of `docs/superpowers/plans/2026-07-24-meridian-overhaul-roadmap.md`
**Builds on:** the four-direction exploration (`docs/superpowers/specs/2026-10-10-design-exploration-design.md`;
outputs on branch `design-exploration`; comparison page https://claude.ai/artifact/FKLhhBpLLNXHPgzZ74SJ4b)

## Decision

Advisor Desktop becomes a **threads-first workspace in the instrument visual language**:

- **Information architecture from the multiplayer direction.** Threads are the front door. The human
  team, scripted agents and, in separate threads, the client work jobs to completion. Interactive
  components are embedded where a step needs them. Binding acts are named, recorded and supervisable.
- **Visual language from the instrument direction.** Archivo on its width axis, monochrome plus one
  signal colour, units as typography, the tolerance gauge, window ruler and tax tape.
- **Adapted from the terminal direction:** approval as a signature with a record trail, table
  discipline, the keyboard layer (command line, jump keys, key sheet), footnoted figures, and the
  provenance-labelled queue.
- **Dense reference work stays in full views.** Households, positions, model governance, billing,
  reconciliation, risk and attribution are full pages in the instrument language, opened from a thread
  or the command line. A thread is always one step away.

The app remains a public portfolio showcase judged by wealth-management experts and design-literate
reviewers. Integrity comes before aesthetics: every figure comes from the engine, and domain errors are
reputational.

## Rules that bind every phase

1. **Integrity.** Every displayed figure comes from the engine through a service or a typed selector.
   No hand-typed numbers, names, IDs or people.
2. **Client visibility is always visible.** Every thread, and every message or artefact that can reach
   a client, carries the visibility indicator (private, internal, client). It is built in black and
   white first; a colour is added only if testing shows the boundary is not obvious at a glance.
3. **Scripted agents.** Agents are deterministic functions over engine data. Every agent output cites
   its sources and declares its scope (what the agent may and may not do). No live model calls in this
   roadmap.
4. **Binding acts belong to named people.** Approvals, compliance dispositions and client sends are
   distinct recorded acts by a person with the right role. A reaction or comment is never an approval.
   An agent never clears a block.
5. **One signal.** The signal colour means "outside its limit and stops you". Warnings are ink.
6. **No phase merges with failing tests.** Each phase adds UI tests for the screens it builds.

## Branch model

- **`workspace` branch.** All roadmap work from phase 1 onward happens on branch `workspace`, cut from
  `main`. At the start of phase 1 the old UI is deleted on the branch: `src/components`,
  `src/features`, the old shell and their UI tests. The engine layers (`src/mocks`, `src/lib`,
  `src/services`, `src/types`) and their tests stay. The new workspace is the app at `/`.
- **`main` keeps serving the current site.** Phase 0 (engine and data fixes) lands on `main`, because
  it corrects figures the live site shows today, and is merged into `workspace`. Any later engine fix
  follows the same route. When a merge from `main` touches a deleted file, the deletion wins.
- **Review in context.** Each phase is reviewable on a Cloudflare preview deployment of the branch.
- **The switch** (end of phase 7): `workspace` merges to `main` in one merge; old routes that people
  may have bookmarked redirect to their new homes.
- **Parallel agents** working on this roadmap must be given worktrees cut from `workspace` and must
  verify their base commit before starting (worktree isolation defaults to `main`).
- The lab (`/lab`, `src/lab/`) stays on branch `design-exploration` as reference material and never
  merges. Ideas are rebuilt with tests, not copied.

## Styling system

Tailwind v4, set up so the look is easy to change and hard to bypass:

- Instrument's tokens are defined once in `@theme` (colours, fonts, type scale, spacing extras), with
  Tailwind's default palette removed (`--color-*: initial`). Only instrument colours exist as
  utilities; `bg-blue-500` does not compile.
- Components follow the shadcn pattern already supported by the dependencies: Radix primitives for
  accessible behaviour, `class-variance-authority` for variants, `cn()` (`clsx` + `tailwind-merge`)
  for composition, `@tanstack/react-table` under the data table.
- Changing the look later means editing tokens in one file and variants in one place per component.

## Phases

Each phase gets its own spec, plan and review cycle. Specs for phases 0 and 1 are written; later
phases are specified when they start.

| # | Phase | Ends with |
|---|---|---|
| 0 | Scenario truth (`2026-10-11-phase-0-scenario-truth-design.md`), on `main` | Engine and data correct for every job; merged into `workspace` |
| 1 | Instrument foundation (`2026-10-11-phase-1-instrument-foundation-design.md`) | Old UI deleted on `workspace`; Tailwind tokens, type, units, both themes, the kit, enforcement tests, accessibility base, keyboard layer, gallery at `/kit` |
| 2 | Workspace shell | Thread model with private, internal and client visibility; binding-act records; scripted-agent framework; command line; full-view routing |
| 3 | Brief, rebalance and harvest, client thread | The acc-002 story end to end: brief → team thread → approval → client thread |
| 4 | Compliance review | Compliance is a real participant (Mark Davis, CCO). Phase 3's pending steps become dispositions. The archive and supervision queue move over |
| 5 | Meeting prep and review | Agenda, household summary, notes and follow-ups; household and client full views |
| 6 | Proposals and onboarding | Long-running work with a prospect who is not yet a client: the hardest visibility case |
| 7 | Remaining full views, then the switch | Billing, reconciliation, risk, attribution, model governance; showcase polish; `workspace` merges to `main` |

**Why this order.** Phase 0 first because every later screen displays the engine's figures. The
foundation (1) and shell (2) come before any job so nothing bypasses the system. The first job (3) is
the one proven in the lab, and it establishes every thread pattern. Compliance (4) follows
immediately because "pending compliance" in phase 3 is the largest finance objection still open.
Meetings (5) reuse thread patterns and add the CRM views. Proposals and onboarding (6) come last
among the jobs because the prospect boundary is the hardest visibility case. Pure reference screens
(7) are not conversations, so they move last and trigger the merge to `main`.

## Follow-ups already identified (owned by the phase named)

- Phase 3: post-trade drift shown on the construct step; DRIP and held-away accounts in wash-sale
  guidance to the client.
- Phase 4: supervision queue; exception dispositions with documented rationale.
- Phase 1: prune dependencies no longer imported once the old UI is deleted (candidates: `recharts`,
  `react-markdown`, `sonner`, `zustand`, `d3`, unused Radix packages), each removal checked by build.
