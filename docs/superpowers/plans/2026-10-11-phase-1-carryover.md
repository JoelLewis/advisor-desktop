# Phase 1 carry-over (instrument foundation)

Recorded 11 October 2026 at the close of Phase 1 on branch `workspace`. Items parked by task and final reviews, and spec items deferred to Phase 2 (Ruling R20). Phase 2's spec should triage this list.

## Deferred spec items (Ruling R20)
- Gauge table-row form; single-needle loading sweep; Dialog/CommandLine/KeySheet in the visual baseline; toHaveScreenshot comparisons (baseline currently overwritten, never compared); Dialog visible close control; compact message-scale visibility band.

## Parked minors

Already resolved in the final fix wave (kept here for history): commission constants re-homed to `src/lib/commission.ts`; raw `input|select|textarea` banned outside the kit; `<dl>` separator divs replaced; Stamp `approved` requires `at`; `FigureRef note` resolved to a real footnote; gauge labels use display names; no dangling "·" at chip wraps; `scrim` token added to tests and token lists.

- **Task 2:** COMMISSION constants/OrderSummaryCard commission logic not re-homed; validateTrade lacks fail cases for equity negative stop / option non-positive limit
- **Task 3:** duplicated dark block (plan-mandated, parity-tested); base font-size literal duplicates --text-body
- **Task 4:** normaliseMinus heuristic false positives after whitespace ("2020 -2021"); misses "x=-3", "-$5"
- **Task 4:** shift() near Number.MAX_VALUE yields ∞ not MeasureError; fmtDate now converts offset datetimes to UTC date
- **Task 5:** HEX false positives on href="#add"/"#123" comments; RAW limited to button|table|dialog (add input|select|textarea when kit has them); only .ts/.tsx scanned; signal-ink oklch(0.5 0.17 39) marginally out of sRGB (clamped)
- **Task 5:** shadow-[0_0_0_1px_var(--x)] compound arbitrary values not flagged; text-[var(--x)] flagged even as font size (use text-[length:var(--x)])
- **Task 7:** Stepper ol may lose list semantics in Safari (role="list"); no tests for programmatic open / removed opener / Attestation keyboard toggle
- **Task 8:** SidePanel aria-label duplicates visible label (prefer aria-labelledby); aside nested in main (axe best-practice); breakpoint/container values repeated (1100px, 1440px) — candidate @theme tokens
- **Task 9:** count line has no aria-live; totals drop column 0's cell; proportion bar always right-justified; no cursor-pointer affordance on activatable rows; inline columns arrays rebuild defs
- **Task 10:** unbounded tick count for multi-year windows; key collisions on duplicate events; WindowRuler visible text duplicates SVG label for screen readers
- **Task 10:** clamp tests assert 0/200 and 0/480 not the 1px-inset bounds; duplicate-event keys
- **Task 11:** per-instance Tooltip.Provider loses shared skip-delay; sr-only source text inside sentence affects copy-paste; fmtScore no 0..1 range check
- **Task 11:** rule-separator divs directly inside <dl> (axe may flag); reconcile-throw test spies not in try/finally
- **Task 12:** RecordTrail collapse uses viewport not container query; PENDING vs NOT STARTED differ subtly; Stamp approved could require `at` via union; shape-difference tests thin
- **Task 13:** no tests for e.repeat / isComposing guards or scope order surviving re-registration; OPEN_DIALOG selector should narrow to [data-state=open] before any dialog exit animation is added; collision warning noisy on re-register
- **Task 14:** FigureRef note={1} literal; gauge labels show raw asset-class keys (us_equity)
- **Task 15:** dangling trailing "·" at a chip wrap point; fixed w-40 gauge label column
- **Final:** KitPage error branch hides state.error (surface it); kit test imports router flags from @/app/routes (move to neutral module); approval alert matched on entityId only; routePaths drops path+children-without-index; KeyboardProvider order map never pruned; WindowRuler label collision when marks close; "Wash Sale" casing; global-constraints colour list needs 'scrim'

## Other follow-ups
- Re-run the main→workspace merge (plan Task 16) when the rest of Phase 0 lands on main; then refresh the gallery (model names, loss-sale window, rate basis, event times, people directory) and regenerate the visual baseline.
- Add `scrim` to the colour-token list in the Phase 1 plan's Global Constraints / design docs (11 tokens).
