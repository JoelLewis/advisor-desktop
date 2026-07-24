# Meridian — Advisor Desktop Design System (authoritative brief)

Source: Claude Design project `cb15ae34-9c56-4478-b314-4ca5e5602fd2` ("Meridian Advisor Design System").
Token values below are verbatim from `tokens/*.css`. Rules are verbatim or near-verbatim from `readme.md`.
**Treat this file as the spec.** Where the codebase disagrees with this file, the codebase is wrong.

---

## 1. Identity & intent

Meridian is a design system for a **modern wealth-management advisor desktop**: the daily working
surface where an advisor reviews a book of households, inspects portfolios, approves trades and
produces client-ready material. Built for **dense, numeric, trust-carrying interfaces that still feel
calm and human — professional, clean, modern, in cream and earth tones.**

Influences (category conventions, not copies): Altruist, Communify — light warm surfaces, dense data
tables, tabular figures, restrained colour, allocation graphics over decoration.

**The one-sentence version:** Warm cream paper, espresso ink type, hairline rules instead of shadows,
one earth accent at a time, and every number in tabular mono.

Provenance caveats to be aware of: the palette is an original interpretation (not extracted hexes);
**no logo exists** — the brand appears as type only; "Meridian" is a placeholder name; fonts and icons
are substitutions (Google Fonts + Lucide).

---

## 2. Content fundamentals (voice & copy)

**Voice.** Fiduciary, not salesy. The interface behaves like a competent colleague: it states what is
true, quantifies it, and stops. **No exclamation marks, no hype adjectives** — no "amazing",
"seamlessly", "powerful". Confidence comes from precision, not adjectives.

**Person.** Address the advisor as **you**; refer to the firm as **we** only in outbound/client-facing
copy. **Never write in the product's own voice** ("Meridian thinks…"). The client is always named by
household, never "the customer".

- Nav/section labels: `Your book`, `Households`, `Portfolios`, `Trading`, `Proposals`
- Buttons: `New proposal`, `Rebalance`, `Approve & submit`, `Schedule review`, `Export`

**Casing.** **Sentence case everywhere** — headings, buttons, menu items, table cells, dialog titles.
UPPERCASE is reserved for the 11px eyebrow/label style (`TOTAL AUM`, `NEXT REVIEW`) and never runs
longer than three words. **Title Case is never used.**

**Numbers are the copy.** Figures do the persuading, so they are formatted strictly:

- Money: `$4.21M`, `$1.42B` in summary; `$1,148,300` in tables. **Never `$4.2 million`.**
- Change: signed, two decimals, with a **true minus (−, U+2212)** — `+8.42%`, `−3.02%`; basis points
  when under 1% (`+64 bps`).
- Accounting contexts wrap negatives: `($284,100)`.
- Dates: `24 July 2026` in prose, `2026-07-24` in tables, `Aug 14` for scheduling.
- Accounts are masked: `••••4210`.
- Percentages: **one decimal for weights, two for returns.**

**Sentence shape.** Short declaratives, front-loaded with the number or the noun. Advisory prompts
state the finding then the action: *"Intl equity is 4.1% over target. Trim VXUS to restore the 60/40
policy band."* Helper text explains a constraint, not the obvious: `Drift tolerance ±3%`, not
`Enter a number`.

**Compliance register.** **Never promise outcomes.** "Estimated", "as of", "net of fees", "before
Monday's close" are load-bearing words — keep them. Errors say what failed and what happens next:
*"Custodian sync failed. Retrying in 5 minutes."*

**Emoji: never.** Not in UI, not in empty states, not in notifications. Status is carried by a Badge
tone, a dot, or a Lucide glyph.

---

## 3. Colour — full token set

### Base ramps — warm neutrals (cream → espresso)
There are **no pure greys and no pure white** in Meridian; every neutral carries a yellow-red cast.

```
--cream-25:#FDFBF7    --cream-50:#FAF6EF    --cream-100:#F4EEE3   --cream-200:#EBE3D5
--sand-300:#DED3C0    --clay-400:#C4B49C    --stone-500:#9A8C77   --stone-600:#776B58
--bark-700:#584E41    --bark-800:#3B342B    --ink-900:#26221C     --ink-950:#181510
```

### Accents — earth pigments
```
--terracotta-100:#F6E3DA  --terracotta-300:#DFA98F  --terracotta-500:#B45C3C  --terracotta-700:#8A4227
--olive-100:#E9EBDD       --olive-300:#B6BE9C       --olive-500:#6E7A52       --olive-700:#4C553A
--ochre-100:#F9EBD2       --ochre-300:#E6C384       --ochre-500:#C08A2E       --ochre-700:#8E6418
--moss-100:#E0EBDF        --moss-500:#4E7A52        --moss-700:#365A39
--rust-100:#F7E0DA        --rust-500:#A8452F        --rust-700:#7E3020
--slate-100:#E2E7E9       --slate-500:#4C6272       --slate-700:#334553
```

### Semantic aliases — surfaces
```
--surface-page:var(--cream-50)          --surface-card:var(--cream-25)
--surface-raised:#FFFFFF                --surface-sunken:var(--cream-100)
--surface-inset:var(--cream-200)        --surface-inverse:var(--ink-900)
--surface-nav:var(--ink-900)            --surface-accent-soft:var(--terracotta-100)
--surface-overlay:rgba(38,34,28,.44)
```

### Semantic aliases — text
```
--text-heading:var(--ink-900)           --text-body:var(--bark-800)
--text-muted:var(--stone-600)           --text-subtle:var(--stone-500)
--text-inverse:var(--cream-50)          --text-inverse-muted:var(--clay-400)
--text-accent:var(--terracotta-700)     --text-link:var(--terracotta-700)
--text-link-hover:var(--terracotta-500)
```

### Semantic aliases — lines
```
--border-hairline:rgba(88,78,65,.14)    --border-subtle:var(--cream-200)
--border-default:var(--sand-300)        --border-strong:var(--clay-400)
--border-focus:var(--olive-500)         --border-inverse:rgba(244,238,227,.18)
```

### Semantic aliases — actions
```
--action-primary-bg:var(--ink-900)          --action-primary-bg-hover:var(--bark-800)
--action-primary-bg-active:var(--ink-950)   --action-primary-fg:var(--cream-50)
--action-secondary-bg:var(--surface-card)   --action-secondary-bg-hover:var(--cream-100)
--action-secondary-fg:var(--ink-900)
--action-accent-bg:var(--terracotta-500)    --action-accent-bg-hover:var(--terracotta-700)
--action-accent-fg:#FFF8F3
--action-ghost-bg-hover:rgba(88,78,65,.07)
--action-disabled-bg:var(--cream-200)       --action-disabled-fg:var(--clay-400)
```

### Semantic aliases — status / performance
```
--status-positive:var(--moss-700)   --status-positive-soft:var(--moss-100)
--status-negative:var(--rust-500)   --status-negative-soft:var(--rust-100)
--status-warning:var(--ochre-700)   --status-warning-soft:var(--ochre-100)
--status-info:var(--slate-500)      --status-info-soft:var(--slate-100)
--status-neutral:var(--stone-600)   --status-neutral-soft:var(--cream-200)
```

### Data visualisation — fixed sequence
```
--viz-1:#4C553A  --viz-2:#8C9663  --viz-3:#C08A2E  --viz-4:#B45C3C
--viz-5:#7E3020  --viz-6:#4C6272  --viz-7:#9A8C77  --viz-8:#DED3C0
--viz-grid:rgba(88,78,65,.12)   --viz-axis:var(--stone-500)
```

### Colour usage rules
- Page is `--cream-50`, cards are `--cream-25`, the nav rail **and one feature block per screen** are `--ink-900`.
- **Colour is never decorative.** Terracotta means *advisory/AI*. Olive means *active/on*. Moss up,
  rust down, ochre attention, slate neutral information.
- **At most one accent-coloured action per screen.**

---

## 4. Typography

Families (`tokens/fonts.css`, loaded from Google Fonts CDN):
```
--font-display:"Instrument Serif",Georgia,"Times New Roman",serif
--font-sans:"Instrument Sans","Helvetica Neue",Arial,sans-serif
--font-mono:"IBM Plex Mono","SFMono-Regular",Menlo,monospace
```

Weights & tracking:
```
--weight-regular:400  --weight-medium:500  --weight-semibold:600
--tracking-tight:-0.02em  --tracking-snug:-0.01em  --tracking-normal:0em
--tracking-wide:0.04em    --tracking-caps:0.09em
```

Scale:
```
Display (Instrument Serif — editorial only)
  --display-1: 52px / 1.04      --display-2: 40px / 1.08      --display-3: 30px / 1.14
Headings (Instrument Sans)
  --h1: 26px / 1.2              --h2: 20px / 1.25             --h3: 16px / 1.35
Body (Instrument Sans)
  --body-lg: 16px / 1.55        --body: 14px / 1.5
  --body-sm: 13px / 1.45        --caption: 12px / 1.35
Eyebrow / label (uppercase, tracked)
  --label: 11px / 1.2
Numerals (IBM Plex Mono)
  --numeric-lg: 28px            --numeric: 14px               --numeric-sm: 12px
  --numeric-feature: "tnum" 1, "zero" 1
```

Rules:
- **Instrument Serif for editorial moments only** — sign-in value line, empty states, report covers,
  the wordmark. **Never for UI chrome.**
- Instrument Sans for everything else, weights 400/500/600, tight tracking (−0.01 to −0.02em).
- **IBM Plex Mono, tabular figures with slashed zero, for every number, ticker, masked account and
  ISO date.** `font-feature-settings: "tnum" 1, "zero" 1`.
- **14px is the interface default.** 11px uppercase for labels. 28px mono for KPI figures.
  52/40/30px serif display.

---

## 5. Spacing & layout

Scale: `0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96` px
(`--space-0` … `--space-14`).

Layout constants:
```
--nav-rail-width:60px     --sidebar-width:248px     --topbar-height:56px
--panel-width:360px       --content-max:1180px
--gutter-app:24px         --gutter-page:48px
--row-height:44px         --row-height-dense:36px
```

Rules:
- Fixed chrome: 60px ink nav rail, 56px top bar, 248px sidebar, 360px right panel, 24px app gutter,
  1180px max content.
- Rows are 44px (36px dense) with **12px cell padding**.
- **Numeric columns are right-aligned, always.**
- Layout is left-anchored and grid-based; **nothing centres except empty states and sign-in.**
- Whitespace is warm and generous at the page level (24–48px) and tight inside data (6–12px).
- **Density & restraint:** a household view shows five KPI tiles, one chart, one allocation bar and
  one table — **a screen earns each element.**

---

## 6. Radii, elevation, lines, states, motion

Radii & border widths:
```
--radius-xs:4px  --radius-sm:6px  --radius-md:8px  --radius-lg:12px
--radius-xl:16px --radius-2xl:24px --radius-pill:999px
--border-width-hair:1px  --border-width-thick:1.5px
```
Assignment: 4px chips/badges · 6px controls and inputs · 8px tiles and small buttons · 12px cards ·
16px dialogs · 24px feature blocks · pill for **Tags and toggles only**. **Nothing else is
pill-shaped — buttons are rectangles with 8px corners.**

Shadows — warm (ink hue), short, low-opacity, **never blue-grey**:
```
--shadow-none:none
--shadow-xs:0 1px 1px rgba(38,34,28,.04)
--shadow-sm:0 1px 2px rgba(38,34,28,.06),0 1px 1px rgba(38,34,28,.04)
--shadow-md:0 2px 6px rgba(38,34,28,.07),0 1px 2px rgba(38,34,28,.05)
--shadow-lg:0 8px 24px rgba(38,34,28,.10),0 2px 6px rgba(38,34,28,.05)
--shadow-xl:0 24px 56px rgba(38,34,28,.16),0 4px 12px rgba(38,34,28,.07)
--shadow-inset-line:inset 0 -1px 0 rgba(88,78,65,.10)
```

Focus, blur, scrims:
```
--focus-ring:0 0 0 2px var(--surface-page),0 0 0 4px rgba(110,122,82,.55)
--focus-ring-inverse:0 0 0 2px var(--ink-900),0 0 0 4px rgba(182,190,156,.6)
--blur-panel:saturate(120%) blur(14px)
--scrim-top:linear-gradient(to bottom,var(--surface-page) 0%,rgba(250,246,239,0) 100%)
--scrim-bottom:linear-gradient(to top,var(--surface-page) 0%,rgba(250,246,239,0) 100%)
```

Motion:
```
--duration-instant:80ms  --duration-fast:120ms  --duration-base:180ms
--duration-slow:260ms    --duration-panel:320ms
--ease-standard:cubic-bezier(.2,.6,.2,1)
--ease-out:cubic-bezier(.16,.84,.32,1)
--ease-in:cubic-bezier(.5,0,.9,.4)
```

Rules:
- **Borders, not shadows.** Meridian is a *line* system: four border weights (`hairline` rows,
  `subtle` cards, `default` controls, `strong` hover) carry structure. **Shadow appears only when a
  surface genuinely floats** (popover, drawer, toast, dialog).
- **Cards:** `--surface-card` fill, 1px `--border-subtle` hairline, 12px radius, **no shadow at
  rest**; 16–24px padding; header = optional 11px uppercase eyebrow + 16px semibold title +
  right-aligned action slot.
- **Backgrounds:** flat warm fills only. **No gradients as decoration** (only exceptions are the
  scroll scrims). **No photography in-product, no illustration, no patterns, no textures, no
  noise/grain, no glassmorphism** beyond the 2px dialog scrim blur.
- **Motion:** 80–120ms controls, 180ms surfaces, 320ms panels. `--ease-standard` for state changes,
  `--ease-out` entrances, `--ease-in` exits. Fades and short travel (≤8px) only — **no bounce, no
  spring, no scale-in, no parallax, no skeleton shimmer** (loading is a static ghost row or a
  `loader` glyph). **Numbers never count up. Charts draw instantly.**
- **Hover warms rather than brightens:** primary darkens ink-900 → bark-800; secondary fills to
  cream-100 and border steps to `--border-strong`; ghost picks up a 7% ink wash; table rows take a
  `--surface-sunken` wash; nav rail items take a 12% cream wash. **Never a colour hue shift, never a
  lift on hover.**
- **Press:** `translateY(0.5px)`, resting shadow removed. **No scale, no ripple, no colour inversion.**
- **Active/selected is a fill, not an outline:** selected Tag = ink fill, selected row =
  `--surface-inset`, active tab = terracotta 2px underline (or a white pill in the segmented control).
- **Focus always visible, never suppressed:** 2px page-coloured gap + 4px olive ring. Fields
  additionally take an olive border and a 3px olive wash.
- **Transparency & blur** only for depth: 44% ink dialog scrim with 2px blur; 12–18% cream washes on
  ink surfaces; `--blur-panel` reserved for an overlaid panel above scrolling data. **No frosted
  cards, no translucent tables.**

---

## 7. Data visualisation

- Earth pigments in **fixed order** (`--viz-1…8`: olive → ochre → terracotta → rust → slate → stone).
- **Allocation is a 100%-stacked bar before it is ever a donut.**
- Lines are **1.5–1.75px with a 10% area wash**; grid lines are 12% ink.
- **No axis boxes, no legends inside the plot, no 3D, no drop shadows on data.**
- Benchmarks are shown as an **unfilled line or an ink target marker**.

---

## 8. Iconography

- **Lucide v0.469.0**, outline only, 1.5–2px stroke, rounded caps. Applied as a CSS mask so glyphs
  inherit `currentColor`.
- **Never mix filled and outline glyphs; never use a second icon family**; never use brandmark glyphs
  for concepts.
- Sizes: 11–13px inline with small text · 14–16px in buttons, rows and tiles · 17–18px in the nav
  rail. Always optically centred in a square hit area of **at least 26px**.
- Colour inherits text colour; colour applied only to carry status (moss/rust/ochre) or the
  terracotta advisory accent.
- **No hand-drawn SVG.** The only SVG generated is data-driven (Sparkline, PerfChart).
- **No emoji, no unicode symbols as icons.** Text exceptions only: true minus `−`, masking bullet `•`.
- Vocabulary in use: `layout-grid` book · `users` households · `chart-pie` portfolios ·
  `arrow-left-right` trading · `file-text` proposals · `chart-line` reports · `settings` · `search` ·
  `bell` alerts · `sliders-horizontal` filters · `download` export · `scale` rebalance ·
  `scissors` tax-loss harvest · `piggy-bank` contributions · `shield-check` security ·
  `arrow-up-right`/`arrow-down-right` performance · `check`/`alert-circle`/`triangle-alert`/`info` status.

---

## 9. Component inventory

Every component has `<Name>.jsx`, `<Name>.d.ts` and `<Name>.prompt.md` in the design project.
Read those directly for per-component API when implementing.

| Group | Components |
| --- | --- |
| `core/` | Button, IconButton, Card, Badge, Tag, Icon |
| `forms/` | Input, Select, Checkbox, Radio, Switch |
| `navigation/` | Tabs (underline + segmented) |
| `feedback/` | Dialog, Toast, Tooltip |
| `data/` | StatTile, DeltaValue, DataTable, AllocationBar, Sparkline |

The five data components exist because an advisor desktop cannot be built without them: **StatTile**
(KPI tile), **DeltaValue** (*the only correct way to render a signed figure*), **DataTable** (the
product's core surface), **AllocationBar**, **Sparkline**.

Reference screens live at `ui_kits/advisor-desktop/`: `AppShell.jsx`, `LoginScreen.jsx`,
`BookScreen.jsx`, `HouseholdScreen.jsx`, plus `index.html` and `data.js`.

---

## 10. Auditable rules checklist

Concrete, falsifiable rules. Cite rule numbers when reporting findings.

**Colour**
1. No pure white (`#FFF`/`#FFFFFF`) as a page or card surface; only `--surface-raised` may be white.
2. No pure grey (equal R=G=B) anywhere in the palette.
3. No blue-grey/cool neutrals (e.g. Tailwind `slate-*`, `gray-*`, `zinc-*`) as base neutrals.
4. Page background is `--cream-50` (#FAF6EF); cards are `--cream-25` (#FDFBF7).
5. Nav rail is `--ink-900` (#26221C).
6. At most **one** accent-coloured (terracotta) action per screen.
7. Positive = moss (#365A39), negative = rust (#A8452F). Not green/red hex defaults.
8. Terracotta is reserved for advisory/AI meaning; it is never decorative.
9. Chart series use `--viz-1…8` in fixed order; no ad-hoc chart colours.

**Type**
10. Body text is 14px / line-height 1.5 / weight 400.
11. Interface default font is Instrument Sans; **no system-ui/Inter/Helvetica-only stacks**.
12. Instrument Serif appears **only** in sign-in value line, empty states, report covers, wordmark.
13. Every financial figure, ticker, masked account and ISO date renders in IBM Plex Mono.
14. All such numerals carry `font-feature-settings: "tnum" 1, "zero" 1` (tabular + slashed zero).
15. Eyebrow/label style is 11px uppercase with `--tracking-caps` (0.09em), ≤3 words.
16. Headings use tight tracking (−0.01 to −0.02em).
17. KPI figures are 28px mono.
18. **Title Case never appears.** Sentence case for headings, buttons, menu items, dialog titles.

**Numbers & copy**
19. Money in summary uses `$4.21M` / `$1.42B` form; never `$4.2 million`.
20. Money in tables uses full separators: `$1,148,300`.
21. Signed changes use a **true minus `−` (U+2212)**, not a hyphen.
22. Changes carry two decimals; sub-1% changes may use bps (`+64 bps`).
23. Weights carry one decimal; returns carry two.
24. Accounting negatives use parentheses: `($284,100)`.
25. Dates: `24 July 2026` in prose, `2026-07-24` in tables, `Aug 14` for scheduling.
26. Account numbers are masked `••••4210`.
27. **Zero emoji** anywhere in the UI.
28. **Zero exclamation marks**; no hype adjectives ("amazing", "seamlessly", "powerful", "effortless").
29. Product never speaks in first person about itself ("Meridian thinks…").
30. No promised outcomes; hedging words ("estimated", "as of", "net of fees") retained.
31. Errors state what failed **and** what happens next.
32. Helper text explains a constraint, not the obvious.

**Layout & structure**
33. Table rows are 44px (36px dense) with 12px cell padding.
34. Numeric table columns are right-aligned without exception.
35. Content max width is 1180px.
36. Page gutters 24px (app) / 48px (page); data-internal spacing 6–12px.
37. All spacing values come from the 2/4/6/8/12/16/20/24/32/40/48/64 scale.
38. Nothing is centred except empty states and sign-in.

**Surface & elevation**
39. Cards have **no shadow at rest** — 1px `--border-subtle` hairline + 12px radius only.
40. Card padding is 16–24px.
41. Shadows appear only on genuinely floating surfaces (popover, drawer, toast, dialog).
42. All shadows are ink-hued `rgba(38,34,28,…)`; no `rgba(0,0,0,…)` and nothing blue-grey.
43. Buttons are 8px radius rectangles — **not pills**. Only Tags and toggles are pill-shaped.
44. Badges/chips 4px, controls/inputs 6px, cards 12px, dialogs 16px, feature blocks 24px.
45. **No decorative gradients** — only `--scrim-top`/`--scrim-bottom`.
46. No photography, illustration, pattern, texture, noise/grain, or glassmorphism in-product.

**Interaction & motion**
47. Durations come from 80/120/180/260/320ms; easing from the three named curves.
48. **No skeleton shimmer** — loading is a static ghost row or a `loader` glyph.
49. **No count-up number animation**; charts draw instantly.
50. No bounce, spring, scale-in, or parallax anywhere.
51. Hover never shifts hue and never lifts the element.
52. Press is `translateY(0.5px)` with resting shadow removed; no scale or ripple.
53. Selected/active state is a **fill**, not an outline. Active tab = 2px terracotta underline.
54. Focus ring is always visible (never `outline:none` without replacement): 2px page gap + 4px olive ring.

**Data viz**
55. Allocation renders as a 100%-stacked bar before any donut is considered.
56. Chart lines are 1.5–1.75px with a 10% area wash; grid lines 12% ink.
57. No axis boxes, no in-plot legends, no 3D, no shadows on data marks.
58. Benchmarks render as an unfilled line or ink target marker.

**Iconography**
59. Lucide outline only, 1.5–2px stroke; no mixed filled/outline; no second icon family.
60. Icon hit areas are ≥26px square.
