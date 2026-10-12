# Design exploration: four competing directions

**Date:** 10 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Replaces:** Meridian as the design target (roadmap phases 3–7 in
`docs/superpowers/plans/2026-07-24-meridian-overhaul-roadmap.md` no longer stand as written)

## Why

Meridian was authored months ago. Models, agents and design skills have advanced since, so the
design direction is re-derived from scratch rather than iterated. The data-integrity work (Phases 1,
1b) and the tabular-figures utility stay; they are design-agnostic.

The app is a public portfolio showcase judged on craft and memorability by people who know wealth
management. Generic competence reads as failure; domain errors are reputational.

## What this produces

Four working design directions, each a prototype inside the real app, compared on one shared
scenario, reviewed by two independent reviewers, and presented to Joel on one comparison page. Joel
picks one direction (or a deliberate merge). That pick gets its own spec and a new roadmap. Nothing
from this exploration ships to `main` directly.

## Anti-anchoring rule

Direction agents see **problems, not answers**.

- **Allowed:** `docs/superpowers/exploration/audit-brief.md` (a de-Meridianed distillation of the
  six-lens audit — see Setup), this spec, the codebase, the mock data, and their own skills.
- **Forbidden:** `docs/superpowers/reference/design-system-brief.md`, `meridian-components.md`,
  `meridian-dark-spec.md`, the original `critique-*.md` and `SYNTHESIS.md`, the Meridian roadmap,
  and the Meridian Claude Design projects. Each direction prompt states this explicitly.
- **No direction may land on warm paper + editorial serif.** That is Meridian's territory.

## The four directions

Each stance is a starting constraint, not a finished look. Each must deliver a full direction:
type, colour, density, number formatting, chart grammar, motion, light/dark, and voice.

| Key | Stance | Bet |
|---|---|---|
| `terminal` | The advisor as a professional operator: dense, keyboard-first, dark-first. Bloomberg lineage, modern and legible rather than retro. | Experts read density as respect. |
| `instrument` | Swiss/engineering precision — Braun, Teenage Engineering, lab equipment. Strict grid, monochrome plus one signal colour, every figure presented as a measurement with its unit. | When numbers are the product, the interface should be a precision instrument. |
| `spatial` | Calm, high-end modern product — the Linear / Arc school. Depth, layering, purposeful motion, extreme restraint; detail appears as focus arrives. | The memorable thing is a pro tool that feels calm. |
| `multiplayer` | The work happens in conversation. Human team, agent team and the client share one or more threads; intelligent interactive components (drift breakdown, lot picker, trade ticket, approval, report) are embedded where a step needs them, moving the job forward across research, trading, reporting and evaluation. | AI-native advisory is a team of humans and agents completing jobs together, not a dashboard with a chatbot. |

`terminal`, `instrument` and `spatial` are visual languages and keep the app's existing information
architecture. `multiplayer` changes the information architecture; it is judged on the same scenario,
not forced onto existing screens.

### Domain constraints on `multiplayer` (non-negotiable)

1. **Books and records.** Client communications are records under SEC Rule 17a-4 and FINRA Rule
   4511, subject to supervisory review. The design visibly shows that threads are archived and
   reviewable: who saw what, when.
2. **Human approval.** Agents propose and stage; a named human approves anything binding — trades,
   client-facing communications, suitability judgements. Approval is a distinct, recorded act, never
   a chat reaction or an implicit "sounds good".
3. **Client boundary.** The client is in some threads and not others. Internal deliberation, other
   clients' data and agent reasoning never appear in a client thread, and the boundary is obvious at
   a glance (which thread am I in, who can see this message).

The finance reviewer verifies these against the finance-skills repo rather than general knowledge.

## The shared scenario

Anchor: **acc-002, Robert Johnson Individual** — client cli-001, Johnson Household hh-001. Taxable,
USD, Schwab, specific-ID cost basis, model mod-002 Growth with a 5% drift band. Advisor: Joel Lewis
(`user-001`). Frozen today: **2026-02-25** (`src/lib/clock.ts`).

Facts to verify during Setup (estimated by reading code, not yet run through the engine):

- Max asset-class drift ≈ 12.2%: US equity ≈ 67.2% vs 55% target; international ≈ −7.4%; fixed income
  ≈ −3.9%; off-model holdings of ≈ 5.4% digital assets and ≈ 2.7% private equity.
- Unrealised gains: SPY ≈ +$355K, QQQ ≈ +$179K. Unrealised loss: INTC ≈ −$45.9K.
- Open household wash-sale window on INTC (rs-001, sold 2026-02-21; window to 2026-03-23).
- Existing surfaces: nba-002 (INTC harvest → `/portfolios/accounts/acc-002/tax`), nba-001 (batch
  rebalance incl. cli-001), team thread-001 "Johnson Rebalance Review", client comms comm-001/002.

**Every figure in every direction comes from the engine via the shared selectors. No direction types
a number by hand.**

### The five beats

Every direction demonstrates all five, end to end:

1. **Surface** — morning; the drift breach and the harvestable INTC loss reach the advisor.
2. **Understand** — drift by asset class; tax lots with gain/loss and short/long-term status; the
   private-equity position is illiquid and must be worked around.
3. **Construct** — trim SPY/QQQ, harvest INTC without repurchasing it inside the window, fill
   international and fixed-income gaps; show net tax impact; run pre-trade compliance.
4. **Approve** — a named human approves; the approval is a distinct, recorded act.
5. **Inform the client** — a plain-language message to Robert with correct figures and the
   appropriate disclosure, retained as a record.

### The density test

Separately, each direction renders one raw dense surface with no story scaffolding: acc-002's full
positions table and its tax-lot table. This tests density, not narrative.

## Architecture

### Lab area

- Routes `/lab` (index of directions) and `/lab/:direction` (and nested beat routes the direction
  defines), registered **outside** `AppShell` so each direction owns its entire chrome.
- `src/lab/registry.ts` — the one shared registry: key, title, stance line, lazy entry component.
  Created during Setup with all four entries, so direction agents never edit it.
- `src/lab/scenario/` — shared, read-only scenario layer: typed selectors over the existing services
  and hooks returning the acc-002 facts (drift breakdown, positions, lots, wash-sale windows, NBAs,
  candidate trades, pre-trade check results, client and team identities). Built and tested during
  Setup. Direction agents consume it and may not modify it; if they need something it lacks, they
  report the gap rather than computing figures themselves.
- `src/lab/<direction>/` — each direction's code, styles, tokens, fonts and design-language sheet.

### Isolation rules for direction agents

- Write only inside `src/lab/<direction>/`. No edits to `src/lab/scenario/`, `src/lab/registry.ts`,
  `src/app/`, `src/components/`, `src/features/`, `src/lib/`, `src/mocks/`, `src/index.css`,
  `package.json` or the lockfile.
- Styling is scoped: tokens live under a `[data-lab="<direction>"]` root; no global selectors.
- Fonts are self-hosted woff2 files inside the direction folder (or Google Fonts `<link>` injected by
  the direction root). No new npm dependencies.
- Each direction agent works in its own git worktree branched from the Setup commit.
- Project conventions apply: strict TypeScript, no `any`, ESM, no barrel files, Tailwind or vanilla
  CSS (no CSS-in-JS), existing lint rules pass.

### Integration

The four worktree branches merge onto `design-exploration`. Because each touches only its own folder
and the shared files were finalised in Setup, merges are mechanical. `design-exploration` never
merges to `main`.

## Deliverables per direction

1. Working routes covering all five beats and the density test, in light and dark.
2. `src/lab/<direction>/DESIGN.md` — the design-language sheet: type scale and families, colour
   tokens, density and spacing, number formatting rules, chart grammar, motion, light/dark, voice, and
   a one-paragraph case for why this stance should win.
3. Screenshots of every beat and the density test in both themes, saved under
   `docs/superpowers/exploration/screens/<direction>/`.

## Review

Two reviewer agents, each reviewing **all four** directions so scores are comparable:

1. **Finance and compliance** — using the finance-skills repo: tax-lot and wash-sale correctness,
   short/long-term treatment, private-equity illiquidity handled, books-and-records, human approval,
   client boundary, disclosure, and engine-consistency of every displayed figure.
2. **Design and audit-problems** — craft and memorability critique, scored against the audit-brief
   checklist (dense tables, number formatting, chart consistency, accessibility, keyboard).

Each reviewer returns, per direction: a score per criterion, the top three strengths, and the single
strongest objection.

## Comparison page

A private Artifact: the four directions side by side by beat, both themes, the design-language
summaries, both reviewers' scorecards and objections, and Claude's recommendation clearly labelled as
such. Joel chooses.

## Setup (main session, before any direction agent starts)

1. Create `design-exploration` branch.
2. Write `docs/superpowers/exploration/audit-brief.md`: the problems from the six audit lenses with
   every Meridian prescription stripped, phrased as requirements a direction must meet.
3. Build `src/lab/scenario/` with tests that pin the acc-002 facts to the engine (correcting the
   estimates above where the engine disagrees).
4. Add lab routes, `src/lab/registry.ts`, and a placeholder entry per direction.
5. Verify build, lint and tests; commit. Direction worktrees branch from this commit.

## Budget

Four direction agents plus two reviewers (six agents). Setup and the comparison page are done in the
main session.

## Success criteria

- All four directions run every beat and the density test in both themes with zero hand-typed
  figures.
- Both reviewers complete scorecards for all four.
- The comparison page lets Joel choose without opening the code.
- `main` is untouched.

## Engine defects found while planning (fixed on `main` first)

Probing the engine for acc-002 showed the scenario's Construct beat would be wrong without four fixes:

1. acc-002 holds no SMH, although the activity feed, note-002 and comp-006 record buying 180 SMH on
   2026-02-21 as the INTC replacement.
2. The rebalance proposes a market sale of all BXPE, a periodic-liquidity private-equity fund.
3. `washSaleRisk` is hard-coded `false` on every proposed leg.
4. Realised losses are ignored when estimating tax (INTC's loss shows $0 and never offsets the SPY
   gain), so the preview's net tax is overstated.

## Out of scope

- Migrating any production page to a chosen direction (that is the follow-on spec).
- Changing domain logic or mock data, except for bugs found during Setup, which are fixed on `main`
  separately with tests.
