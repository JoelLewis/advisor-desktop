# Phase 1: instrument foundation

**Date:** 11 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Branch:** `workspace`
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md`
**Reference (not copied):** `src/lab/instrument/` and `src/lab/terminal/` on branch `design-exploration`;
design and finance reviews in `docs/superpowers/exploration/reviews/` on that branch.

## Goal

Clear the old UI off the `workspace` branch and build the design system the whole workspace uses, in
Tailwind v4, with tests that make it hard to bypass. Ends with a gallery at `/kit` showing every
component in both themes on real acc-002 data. No threads, no agents, no jobs.

## 1. Retire the old UI (first task of the phase)

- Delete `src/components`, `src/features`, the old shell (`AppShell`, layout, routes to old pages),
  `src/store` if only the old UI uses it, and every test under those trees. Keep `src/mocks`,
  `src/lib`, `src/services`, `src/types` and all their tests. In `src/hooks`, keep the hooks that wrap
  a service query (`use-accounts`, `use-portfolio`, `use-tax-lots` and the like) and delete the ones
  that exist only for the old UI (`use-breakpoint`, `use-container-width`, `use-command-search`, and
  any hook whose only importers were deleted).
- `src/app/routes.tsx` is rewritten to the new app: `/` (placeholder home inside `Page`) and `/kit`
  (the gallery). Unknown routes render a not-found page.
- Old e2e specs that drive deleted pages are removed; the e2e smoke test is rewritten for `/` and
  `/kit`.
- Dependencies no longer imported are removed, each removal proven by `pnpm build` and the full test
  run. Candidates: `recharts`, `react-markdown`, `sonner`, `zustand`, `d3` and `@types/d3`,
  `@tanstack/react-virtual`, `@tailwindcss/typography`, Radix packages the kit does not use.
- The remaining suite (engine and data tests) stays green. Record the before and after test counts.

## 2. Design language

### Carried over from instrument

- **Type:** Archivo (variable: width 62–125, weight 300–800), used on its width axis like instrument
  scales.

  | Role | Width | Weight | Size |
  |---|---|---|---|
  | Readout (hero reading) | 125% | 300 | 104 / 56 / 36 px |
  | Totals, stamp | 118–125% | 400–700 | 26–30 px |
  | Page title (h1) | 100% | 600 | 22 px |
  | Body, client copy | 100% | 400 | 14 / 15.5 px |
  | Tables | 92% (dense 87.5%) | 400; symbols 600 | 13 / 12.5 px |
  | Labels, column heads, status codes | 100% | 600, caps, +0.07em | 10.5 px |

  Tabular figures everywhere. Units are smaller, in the third ink, after a space (`68.2 %`,
  `+13.2 pp`, `45,850 USD`). In tables the unit moves to the column header.
- **Colour:** monochrome, neutrals tinted cool (hue 250), never pure black or white, plus one signal.
  Starting values from instrument (`bg`, `face`, `ink`, `ink-2`, `ink-3`, `rule`, `rule-2`, `band`,
  `hatch`, `signal`, `signal-ink`, light and dark). Both palettes are selected, not inverted.
- **Hatching** marks constraints that are not breaches: tolerance bands, wash-sale windows, assets that
  cannot be sold at market.
- **Spacing:** 8px rhythm (4, 8, 12, 16, 24, 32, 48, 64); 12-column grid, 24px gutter, 1440px max;
  hairline rules; no cards in cards; no shadows; 2px radius.
- **Charts are instruments:** tolerance gauge, window ruler, tax tape. No dual axes, no pies, nothing
  animated in a loop.
- **Motion:** one fade-in for gauge marks (520ms ease-out); a single-needle loading sweep; both removed
  under `prefers-reduced-motion`.
- **Voice:** an instrument reports. Labels state what is measured and against what; every reading
  states its conditions; sentence case except caps labels and status codes.

### Changed from instrument

- **One signal, one meaning: outside its limit and stops you.** `BLOCK` and `OUT` take the signal
  (filled square). `WARN` is an outlined square in ink. Gains and losses are never coloured; they are
  signed (true minus U+2212) and losses also take a heavier weight.
- **Visibility indicator** (`VisibilityBand`), black and white first:

  | Visibility | Rule | Word |
  |---|---|---|
  | Private | dashed | Only you |
  | Internal | hatched | Firm only · client can't see |
  | Client | heavy solid | CLIENT CAN SEE |

  The band runs the full width of a thread's head and repeats, compact, on any message or artefact
  that can reach a client. The gallery has a test view with all three side by side at thread and
  message scale, in both themes. A colour is added in a later phase only if that view shows the
  boundary is not obvious at a glance.
- **"Waiting on you"** is shown by shape and words, never colour: an outlined `Stamp` reading
  "AWAITING YOUR SIGNATURE" where the filled "APPROVED" stamp will go.
- **Focus ring** in ink, 2px, at least 3:1 against both themes' surfaces.
- **No internal IDs on screen.** Components take display names; model, record and account IDs appear
  only where they are the subject (a record slip's ID).

## 3. Tailwind setup

- `src/styles/app.css` replaces `src/index.css`:
  - `@import "tailwindcss";`
  - `@theme` defines the instrument tokens and **removes Tailwind's defaults for colour**
    (`--color-*: initial;`) and fonts (`--font-*: initial;`), then declares only instrument colours
    (`--color-bg`, `--color-face`, `--color-ink`, `--color-ink-2`, `--color-ink-3`, `--color-rule`,
    `--color-rule-2`, `--color-band`, `--color-signal`, `--color-signal-ink`) as references to
    runtime CSS variables, plus the type scale and Archivo width presets.
  - Runtime variables hold the light values on `:root` and the dark values under
    `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again under
    `:root[data-theme="dark"]`, so components rarely need a `dark:` variant.
  - A `@utility` for hatching (`hatch`), the tabular-figures default on `body`, and the focus-ring
    base style.
- Components follow the shadcn pattern: Radix primitive where behaviour matters (Dialog, Tabs, Tooltip,
  Popover), `cva` variants, `cn()` from `src/lib/utils.ts`. No CSS files besides `src/styles/`.
- Archivo is self-hosted through `@fontsource-variable/archivo` (SIL Open Font License, width and
  weight axes), bundled by Vite: no external font host at runtime. This is the phase's one new
  dependency and needs Joel's approval before it is added.

## 4. The kit (`src/kit/`)

Only what phases 2–7 need. Each component: one folder with `Component.tsx` and a test.

**Basics**

| Component | Purpose |
|---|---|
| `Reading` | A value with unit and sign, formatted by `measure`; optional limit context |
| `StatusCode` | `OUT`, `AT LIMIT`, `IN`, `BLOCK`, `WARN`, `CLEAR`, `OPEN` with their square glyphs |
| `Tag` | Word tags (`NO MARKET`, `OFF-MODEL`, `REPLACES INTC`, `HELD`) |
| `Button` | Three ranks: primary (ink fill), secondary (outline), quiet (text) |
| `Attestation` | Checkbox plus the sentence the person attests to |
| `Dialog` | Radix dialog: holds focus and returns it on close |
| `Stepper` | Steps with a state: `READY`, `PREVIEWED`, `OPEN`, `DRAFT`, `DONE` |

**Data**

| Component | Purpose |
|---|---|
| `DataTable` | On `@tanstack/react-table`. Fixed row heights (24 / 28 / 34px by density); sortable headers with `aria-sort`; a roving row cursor (one Tab stop per table; J/K and arrows move); fractional digits set fainter; optional proportion bar for weights; a count line ("14 of 14 lots"); a totals row that states what it ties to; no clipping (overflow scrolls inside the table; labels never truncate) |
| `Gauge` | Tolerance gauge: symmetric scale on target, hatched band, ticks, bar and needle; also renders as a table row |
| `WindowRuler` | A dated restriction window: day ticks, events, today, hatched span |
| `TaxTape` | Gains, losses, net by holding period, tax before netting, reduction, estimate; states its scope and rate basis |
| `FigureRef` | A figure that can be focused or footnoted to reveal its engine source |
| `SourceChips` | "Relies on" list: source, as-of time, confidence where it exists |

**Records**

| Component | Purpose |
|---|---|
| `Stamp` | `APPROVED` (filled) or `AWAITING YOUR SIGNATURE` (outlined) with person and time |
| `RecordSlip` | A binding act: record ID, fingerprint, who, role, when, archive status |
| `VisibilityBand` | The indicator above, thread and message scale |
| `RecordTrail` | Ordered steps with state `DONE`, `PENDING`, `NOT STARTED`, actor and time |

**Layout**

| Component | Purpose |
|---|---|
| `Page` | Frame that renders exactly one `h1` and the skip link |
| `Grid`, `Pane`, `SidePanel` | 12-column grid; the side panel drops below the main column under 1100px; nothing scrolls the page sideways at 1024px |

**Keyboard**

| Piece | Purpose |
|---|---|
| `CommandLine` | `/` opens it; accepts names and aliases; jumps to a destination |
| `useJumpKeys` | Registry of single-key jumps; shown in the footer legend |
| `KeySheet` | `?` opens a `Dialog` listing every key in scope |
| `useFocusAfter` | After a state change (navigate, approve, withdraw, send), moves focus to the result or the page heading |

**Formatting**

`src/kit/measure.ts` is the only formatter. Money, results (always signed), prices, weights, returns,
drift (`pp`), tolerances (`±`), quantities (custodian fractions to 3 dp), durations (days), ISO dates
and UTC timestamps; a plain-language variant for client copy (`$45,850`, `68.2%`, `March 27, 2026`);
a normaliser that turns any engine-formatted hyphen-minus into U+2212. The existing
`formatCurrency`/`formatPercent` in `src/lib/utils.ts` are removed once nothing imports them.

## 5. Enforcement

Configuration does most of it: with the default palette removed, only instrument colours exist as
utilities. Because Tailwind silently ignores unknown classes, tests close the gaps. Under
`src/__tests__/guardrails/`, each with a self-test proving it catches a violation:

1. **No default-palette or arbitrary colours:** no class string uses a Tailwind default colour name
   (`red`, `blue`, `slate`, `gray`, `zinc`, `neutral`, `stone`, `amber`, `emerald`, `white`, `black`,
   and the rest) after a colour-capable prefix, and no arbitrary colour value (`[#…]`, `[rgb(`,
   `[oklch(`, `[color:…]`).
2. **No colour literals outside tokens:** no hex, `rgb(`, `hsl(`, `oklch(` or named colour in any
   `.ts(x)` file, or in any CSS outside the token block of `src/styles/app.css`.
3. **One formatter:** no `toFixed`, `toLocaleString` or `Intl.NumberFormat`/`Intl.DateTimeFormat`
   outside `src/kit/measure.ts`.
4. **Kit elements only:** no raw `<button>`, `<table>` or `<dialog>` outside `src/kit/`.
5. **Contrast:** for every text token on every surface token, in both themes, computed contrast is at
   least 4.5:1 (3:1 for signal marks, meaningful rules and the focus ring), computed from the OKLCH
   values in `src/styles/app.css`.
6. **Headings:** every route renders exactly one `h1`.

## 6. Routes

- `/`: placeholder home inside `Page` (the shell arrives in phase 2).
- `/kit`: the gallery. Every component, both themes, real acc-002 data via the existing services, plus
  the visibility-indicator test view.

## Testing

- Unit and component tests for every kit component, including keyboard behaviour (`DataTable` cursor
  and sort, `Dialog` focus return, `CommandLine`, `useFocusAfter`).
- The six guardrail tests.
- A screenshot harness generalised from the lab's (per-worktree port, readiness attribute, fonts
  ready, animations frozen) captures `/kit` in both themes as the visual baseline.

## Out of scope

Threads, agents, records storage, any job.

## Success criteria

- Old UI and its tests removed; engine and data tests green; unused dependencies removed.
- Every kit component exists, is tested, and appears in the gallery in both themes on acc-002 data.
- All six guardrails pass and each self-test proves it catches a violation.
- The gallery has no page-level horizontal scroll at 1024px and no clipped labels at 1440px.
- `pnpm lint`, `pnpm build`, full `vitest run` and the screenshot harness are green.
