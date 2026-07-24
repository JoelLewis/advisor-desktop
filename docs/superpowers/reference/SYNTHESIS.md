# Advisor Desktop — consolidated critique synthesis

Six agents, ~385 findings. Source reports in this directory:

| Report | Findings | Lens |
| --- | --- | --- |
| `critique-design-system.md` | 71 (24 blocker · 33 major · 14 minor) | Meridian adherence |
| `critique-finance.md` | 80 (26 crit · 32 high · 19 med · 3 low) | Domain correctness, via 91 finance skills |
| `critique-ux.md` | ~101 (7 crit · 24 high · 12 med · 3 low a11y + ~55 craft) | impeccable critique + audit |
| `critique-content.md` | 78 (7 crit · 18 high · 31 med · 22 low) | Voice, copy, formatting, narrative |
| `critique-dataviz.md` | 55 (8 crit · 19 high · 21 med · 7 low) | dataviz skill + Meridian viz tokens |
| `meridian-dark-spec.md` | — (deliverable, not critique) | Derived dark theme, 136 contrast pairs, 0 failures |

Supporting artifacts: `design-system-brief.md` (60 auditable rules), `meridian-components.md` (20 component contracts), `shots/` (42 screenshots).

---

## The convergent finding

**Four of five agents independently identified data integrity — not visual design — as the thing that ends a review.** They arrived at it from unrelated directions:

- Finance: household `managedAUM` disagrees with the sum of its accounts for 5 of 13 households; roll-ups exceed book total by $14.6M (16%).
- UX: four different values for Total AUM ($91.3M / $102.5M / $99.855M / $107.055M).
- Content: `PENDING TASKS 14` above `20 pending actions identified`; four different "todays".
- Dataviz: two screens render constant templates (`ALLOCATION_TEMPLATES`, `CLIENT_ALLOCATION`) as if they were real per-entity data.

For a product whose brand voice states *"numbers are the copy"* and whose value proposition is numeric precision, this is the credibility ceiling. **No amount of visual polish clears it.** A reviewer who catches one contradiction stops trusting every other figure on the page.

**Implication for sequencing: data integrity precedes visual overhaul.** It is also cheaper — most of it is fixture reconciliation and a handful of derived-value functions, not UI work.

---

## Cross-cutting themes

### 1. The foundation is wholesale wrong, not locally wrong
The neutral ramp is Tailwind slate (`#FFFFFF`, `#F7F9FC`, `#0F172A`) where Meridian forbids pure white, pure grey and cool neutrals. `--accent-blue: #2563EB` appears 517×. Body type is Plus Jakarta Sans; `--font-display` points at a sans; Instrument Serif is never loaded. Rules 1–4 and 11–13 fail at the root.

→ This is a **token-layer replacement**, not a tuning pass. Cheap to do globally, and it moves every screen at once.

### 2. There is already a design system in the repo, and it is bypassed
`Button.tsx`, `EmptyState.tsx`, `FilterBar.tsx` have **zero imports**, while **278 hand-rolled buttons** ship 8 padding variants. `text-h2`/`text-h3` are used at 8 sites and defined nowhere. `accent-yellow` is undefined, rendering one callout invisible.

→ **The discipline problem predates Meridian.** Re-tokenising without enforcement reproduces the same drift. Any plan must include a lint/CI gate, or this recurs.

### 3. Missing primitives are the root cause of formatting drift
No `DeltaValue`, no `Tag`, no `IconButton`. Meridian describes `DeltaValue` as *"the only correct way to render a change figure — never colour a plain number by hand"*. Its absence explains: zero tabular figures repo-wide, hyphen-minus instead of true minus, one `formatPercent` serving both weights and returns, and inconsistent up/down colour.

→ `src/lib/utils.ts` + a `DeltaValue` primitive is the **highest-leverage change in the codebase**. Three agents converged on this file independently. ~200 call sites corrected by ~5 lines plus one component.

### 4. Accessibility fails on load-bearing semantics
Four tokens fail WCAG AA and each carries a core meaning: `--accent-green` 3.77:1 (every positive figure), `--accent-amber` 3.19:1 (every warning), `--accent-purple` 3.55:1 (every AI CTA), `--text-tertiary` 2.56:1 (all metadata). Plus keyboard-inoperable table sorting, six modals without focus trap, charts 1-of-15 for text alternatives, both D3 charts keyboard-unreachable.

→ The Meridian palette fixes the colour half **for free** — but only if the dark spec's corrected values are used, because Meridian's *light* border tokens still fail 1.4.11 at 1.43:1 (found by the dark-theme agent).

### 5. The AI layer is assertive rather than accountable
Confidence is computed, stored and user-weightable — but never rendered. Zero `undo` in the codebase; two execution paths fire irreversibly on one click. No shipped disclaimer. No compliance register anywhere (`net of fees` appears zero times). And one AI recommendation makes a fee claim that is quantitatively backwards in the exact way Reg BI and DOL PTE 2020-02 target.

→ For an AI-native *fiduciary* tool, this is a thesis problem, not a polish problem. Rendering confidence, adding undo, and hedging claims is what makes the AI story credible rather than decorative.

### 6. The distinctive asset is buried and half-broken
The WORM Books & Records Archive — model attribution plus AI-vs-final diff — is the one feature here that is not in every other AI dashboard. It sits at `/workflows/archive`, and 10 of 15 fixtures have byte-identical originals, so the diff renders empty two-thirds of the time.

→ For a **capability showcase**, this is the lead asset. Currently hidden behind two nav levels and non-functional in the majority case.

---

## Decisions required before planning

### D1 — Amend the design system's viz palette
Meridian's own `--viz-1…8` fails CVD validation: `viz-2 #8C9663` vs `viz-3 #C08A2E` at ΔE 5.6 protan (gate is 15). Proposed: re-order existing tokens to `#4C553A, #C08A2E, #4C6272, #B45C3C`, cap categorical use at 4 series (validates 10.0 CVD / 18.2 normal). Also 4 of light's 8 viz colours fail 3:1 on the card surface.
**This means editing the design system, not just the app.**

### D2 — Amend Meridian's light border tokens
The dark-theme derivation surfaced that light `--border-*` fails WCAG 1.4.11 at 1.43:1 for interactive control boundaries. Dark now splits structural hairlines (α .09/.13) from visible control boundaries (α .42, 3.37:1). Light should get the same split.

### D3 — Imagery conflict
Meridian explicitly forbids photography, illustration, patterns, textures, noise and gradients **in-product**. Image generation can therefore only serve: OG/social card, README assets, a marketing/landing surface, or the sign-in screen's editorial moment. It cannot be used to "improve the look and feel" of the app itself without breaking the system.

### D4 — Scope of the visual overhaul
Token replacement is global and cheap. Component consolidation (278 hand-rolled buttons → Button) is mechanical but large. Screen rebuilds (nav rail + sidebar architecture, density, "a screen earns each element") are structural.

### D5 — Fee/Reg BI claim
`nbas.ts:186-194` — remove, correct, or reframe with hedging. Recommend correct + hedge, since a fixed version demonstrates domain fluency better than deletion.
