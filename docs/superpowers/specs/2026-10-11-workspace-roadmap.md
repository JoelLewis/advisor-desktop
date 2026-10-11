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

## Dark launch on `main`

- The new workspace lives under `/w/*`, in its own source tree `src/workspace/`. It shares the engine
  layers (`src/mocks`, `src/lib`, `src/services`, `src/types`) and imports nothing from
  `src/components` or `src/features` (enforced by test).
- `/w` is not linked from the live app and shows a preview banner. Every phase merges to `main`, so
  engine fixes reach both shells automatically and every phase is reviewable on the deployed site.
- **The switch** (end of phase 7): `/` routes to the workspace, old routes redirect to their new
  homes, and `src/components`, `src/features` and the old shell are deleted with their UI tests. Engine
  tests stay.
- The lab (`/lab`, `src/lab/`) stays on branch `design-exploration` as reference material and never
  merges. Ideas are rebuilt with tests, not copied.

## Phases

Each phase gets its own spec, plan and review cycle. Specs for phases 0 and 1 are written; later
phases are specified when they start.

| # | Phase | Ends with |
|---|---|---|
| 0 | Scenario truth (`2026-10-11-phase-0-scenario-truth-design.md`) | Engine and data correct for every job |
| 1 | Instrument foundation (`2026-10-11-phase-1-instrument-foundation-design.md`) | Tokens, type, units, both themes, the kit, enforcement tests, accessibility base, keyboard layer, gallery at `/w/kit` |
| 2 | Workspace shell | Thread model with private, internal and client visibility; binding-act records; scripted-agent framework; command line; full-view routing |
| 3 | Brief, rebalance and harvest, client thread | The acc-002 story end to end: brief → team thread → approval → client thread |
| 4 | Compliance review | Compliance is a real participant (Mark Davis, CCO). Phase 3's pending steps become dispositions. The archive and supervision queue move over |
| 5 | Meeting prep and review | Agenda, household summary, notes and follow-ups; household and client full views |
| 6 | Proposals and onboarding | Long-running work with a prospect who is not yet a client: the hardest visibility case |
| 7 | Remaining full views, then the switch | Billing, reconciliation, risk, attribution, model governance; `/` flips to the workspace; old code deleted; showcase polish |

**Why this order.** Phase 0 first because every later screen displays the engine's figures. The
foundation (1) and shell (2) come before any job so nothing bypasses the system. The first job (3) is
the one proven in the lab, and it establishes every thread pattern. Compliance (4) follows
immediately because "pending compliance" in phase 3 is the largest finance objection still open.
Meetings (5) reuse thread patterns and add the CRM views. Proposals and onboarding (6) come last
among the jobs because the prospect boundary is the hardest visibility case. Pure reference screens
(7) are not conversations, so they move last and trigger the switch.

## Follow-ups already identified (owned by the phase named)

- Phase 3: post-trade drift shown on the construct step; DRIP and held-away accounts in wash-sale
  guidance to the client.
- Phase 4: supervision queue; exception dispositions with documented rationale.
- Phase 7: retire the old messaging, NBA and AI panels once their jobs live in threads.
