# Advisor Desktop vs. Meridian — design system gap analysis

Audited: `/Users/joellewis/code/advisor-desktop` @ `72dad62` (main, clean).
Spec: `design-system-brief.md` §3–§8 narrative rules + §10 checklist rules 1–60.
Evidence: source tree (`src/index.css`, `src/components/ui/*`, `src/components/layout/*`, `src/features/*`), plus light and dark screenshots of every major screen.

---

## 1. Verdict

The app does not implement Meridian; it implements a different, unrelated design system. Every foundation layer is wrong at the root: the neutral ramp is Tailwind-slate (`#0F172A`, `#475569`, `#94A3B8`, `#F7F9FC`) rather than the cream→espresso warm ramp, the page/card surfaces are pure white `#FFFFFF` and cool `#F7F9FC` rather than `--cream-25`/`--cream-50`, the single dominant accent is `#2563EB` blue (517 usages) with a lavender `#8B7EC8` carrying the AI meaning that Meridian assigns to terracotta, the interface font is Plus Jakarta Sans, the numeric font is JetBrains Mono with no tabular/slashed-zero feature settings anywhere in the codebase, Instrument Serif is entirely absent, there is no ink nav rail, no 1180px content max, no `−` (U+2212) in the entire source, no masked account numbers, and copy is Title Case throughout. Charts are blue/indigo/purple ad-hoc hexes drawn as donuts with axis boxes and in-plot legends. Loading is a shimmering gradient skeleton; three surfaces pulse or bounce.

**This is a rebuild of the visual layer, not a re-skin.** The token layer is a swap (roughly a day), but the token *names* do not map onto Meridian's semantics — the app has three surfaces and five accents where Meridian has eight surfaces, six line weights, five action tones and five status pairs, so every one of ~90 component/feature files that reads `bg-surface-primary` or `text-accent-blue` needs re-decision, not find-and-replace. Add: a shared component set that is missing five of Meridian's thirteen primitives (Tag, StatTile-with-eyebrow, DeltaValue, AllocationBar, Sparkline), a nav shell with the wrong geometry, a chart layer that violates six of the four data-viz rules, and a number-formatting layer (`src/lib/utils.ts`) that produces hyphen-minus, 1-decimal compacts and US-short dates. Realistically: token layer + 16 shared components rewritten + AppShell rebuilt + `utils.ts` rewritten + a mechanical copy pass over ~165 Title Case strings, then a per-screen density audit.

---

## 2. Foundation gaps

### 2.1 Colour

| Token | Meridian says | App does | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| Page background | `--cream-50` `#FAF6EF` | `--surface-secondary: #F7F9FC` (cool blue-grey) | `src/index.css:172` | 3, 4 | blocker |
| Card fill | `--cream-25` `#FDFBF7` | `--surface-primary: #FFFFFF` (pure white) | `src/index.css:170` | 1, 4 | blocker |
| Raised surface | `#FFFFFF` — the *only* white | White is the base card fill; nothing distinguishes raised | `src/index.css:170` | 1 | blocker |
| Sunken/inset | `--cream-100` / `--cream-200` | `--surface-tertiary: #F0F4F8` (cool) | `src/index.css:173` | 3 | blocker |
| Nav rail | `--ink-900` `#26221C`, 60px, always ink | White sidebar, `bg-surface-primary`, 240/64px | `src/components/layout/Sidebar.tsx:44-46` | 5 | blocker |
| Heading text | `--ink-900` `#26221C` | `#0F172A` (slate-900, blue-cast) | `src/index.css:176` | 2, 3 | blocker |
| Body text | `--bark-800` `#3B342B` | no equivalent — `--text-secondary: #475569` (slate-600) | `src/index.css:177` | 3 | blocker |
| Muted / subtle | `--stone-600 #776B58` / `--stone-500 #9A8C77` | `#94A3B8` (slate-400) — single tier, cool | `src/index.css:178` | 3 | major |
| Border hairline | `rgba(88,78,65,.14)` warm ink | `--border-primary: #DEE5EE` (cool) | `src/index.css:174` | 3 | blocker |
| Border tiers | four (`hairline`/`subtle`/`default`/`strong`) | two (`primary`/`secondary`) | `src/index.css:174-175` | §6 lines | major |
| Primary action | `--action-primary-bg: --ink-900`, fg cream | `bg-accent-blue text-white` | `src/components/ui/Button.tsx:5` | 3, 6 | blocker |
| Accent action | terracotta `#B45C3C`, **one per screen** | blue `#2563EB` used 517× across the app | `src/index.css:179`, everywhere | 6, 8 | blocker |
| AI / advisory meaning | terracotta `#B45C3C` | lavender `--accent-purple: #8B7EC8` (164 usages) | `src/index.css:181`, `src/components/ui/AIInsightCard.tsx:9,42` | 8 | blocker |
| Positive | moss `#365A39` | `#059669` emerald | `src/index.css:180` | 7 | major |
| Negative | rust `#A8452F` | `#DC2626` red | `src/index.css:181` | 7 | major |
| Warning | ochre `#8E6418` / soft `#F9EBD2` | `#D97706` amber + raw `amber-50/100/600/700` classes (≈70 usages) | `src/index.css:183`, `src/components/ui/Badge.tsx:9` | 7 | major |
| Info | slate `#4C6272` (warm slate) | none — blue doubles as info | — | §3 | minor |
| Status softs | five `*-soft` tokens exist | improvised as `/10` alpha of the accent | `src/components/ui/Badge.tsx:5-8` | §3 | major |
| Viz ramp | `--viz-1…8` fixed order, olive→ochre→terracotta→rust→slate→stone | `#2563EB #3B82F6 #60A5FA #059669 #8B7EC8 #D97706 #DC2626 #94A3B8 #F59E0B #0891B2` keyed by *asset class*, not order | `src/lib/chart-colors.ts:2-11` | 9 | blocker |
| Grid / axis | `rgba(88,78,65,.12)` / `--stone-500` | `var(--border-primary)` cool + dashed `3 3` | 12 chart call sites, e.g. `src/features/growth/RevenuePage.tsx:128` | 9, 56 | major |
| Overlay scrim | `rgba(38,34,28,.44)` warm ink | `bg-black/30`, `bg-black/40`, `bg-black/50` (8 sites) | `src/components/ui/Dialog.tsx:18`, `src/features/workflows/WorkflowStepEditor.tsx:107` | 42 | major |
| Pure grey ban | no R=G=B anywhere | `#FFFFFF` ×2, `bg-black/*` ×8, `text-white` ×106, `bg-gray-400` ×1 | `src/index.css:170`, `src/features/growth/BookOfBusinessPage.tsx` | 1, 2 | blocker |

### 2.2 Typography

| Token | Meridian says | App does | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| Interface family | `"Instrument Sans"` | `'Plus Jakarta Sans', system-ui, sans-serif` | `src/index.css:22`, `index.html:23` | 11 | blocker |
| Display family | `"Instrument Serif"` — editorial only | `--font-display: 'Instrument Sans'` — a *sans*, used for all page titles and card headers | `src/index.css:23,101-113` | 11, 12 | blocker |
| Serif usage | sign-in line, empty states, report covers, wordmark | Instrument Serif not loaded at all (`index.html:23` requests Instrument Sans, Plus Jakarta Sans, JetBrains Mono only). `font-display` is applied to the wordmark box only (`Sidebar.tsx:51`) — and that's a sans | `index.html:23` | 12 | blocker |
| Mono family | `"IBM Plex Mono"` | `'JetBrains Mono'` | `src/index.css:24,134,141` | 13 | blocker |
| Numeric features | `font-feature-settings: "tnum" 1, "zero" 1` | **zero occurrences** of `tnum`, `tabular-nums`, `slashed-zero`, or `font-variant-numeric` in the entire repo | `src/index.css:133-145` | 14 | blocker |
| Body | 14px / 1.5 (21px) / 400 | `text-body` = 14px / **20px** / 400 | `src/index.css:115-119` | 10 | minor |
| h1 | 26px / 1.2, tracking −0.01…−0.02em | `text-page-title` = 24px / 32px / 600, no tracking | `src/index.css:101-106` | 16 | minor |
| h2 | 20px / 1.25 | `text-section-header` = 18px / 28px / 600 | `src/index.css:108-113` | 16 | minor |
| h3 | 16px / 1.35 | no token — features improvise `text-body-strong` | `src/index.css:121-125` | §4 | minor |
| Eyebrow / label | 11px uppercase, `tracking-caps` 0.09em, ≤3 words | no token. Improvised as `text-[11px] uppercase tracking-wide` (0.025em) at 71 arbitrary `[10px]`/`[11px]` sites | `src/components/ui/DenseMetricsBar.tsx:39` | 15 | major |
| KPI figure | 28px mono | `MetricCard` renders `text-section-header` = **18px sans-metric mono**; `DenseMetricsBar` uses `text-sm` (14px) | `src/components/ui/MetricCard.tsx:16`, `DenseMetricsBar.tsx:42` | 17 | major |
| Numeric scale | 28 / 14 / 12 | `text-mono` 13px, `text-mono-sm` 11px — neither on scale | `src/index.css:133-145` | §4 | major |
| Tracking tokens | five named values | 3 uses of `tracking-tight`, 6 of `tracking-wider`, 2 of `tracking-wide`; no system | repo-wide | 16 | minor |

### 2.3 Spacing & layout

| Constant | Meridian says | App does | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| Nav rail | 60px, ink, always present | none — collapsed sidebar is 64px white | `src/index.css:27`, `Sidebar.tsx:45` | 5, §5 | blocker |
| Sidebar | 248px | 240px (`--spacing-sidebar-expanded`) | `src/index.css:28` | §5 | minor |
| Top bar | 56px | 56px ✓ | `src/index.css:29` | — | ok |
| Right panel | 360px | 400px default, 600px wide | `src/index.css:32-33` | §5 | minor |
| Content max | **1180px** | no max anywhere. `<main>` is `p-6` full-bleed; at 2560px the tables span ~2200px | `src/components/layout/AppShell.tsx:109` | 35 | blocker |
| App gutter | 24px | `p-6` = 24px ✓ | `AppShell.tsx:109` | — | ok |
| Page gutter | 48px | never used | — | 36 | minor |
| Row height | 44px / 36px dense, **12px cell padding** | `px-4 py-3` → 44px height but **16px** side padding; compact `px-3 py-1.5` → **32px**, not 36px | `src/components/ui/DataTable.tsx:160` | 33 | major |
| Numeric alignment | right-aligned **without exception** | `<td>` has no alignment API; only 101 `text-right` occurrences against 254 `font-mono` cells. Portfolios "Value" and "Drift" columns are left-aligned (see `portfolios.png`) | `DataTable.tsx:157-164` | 34 | blocker |
| Spacing scale | 0/2/4/6/8/12/16/20/24/32/40/48/64/80/96 | Tailwind default 4px grid *plus* ~380 half-step utilities producing off-scale 6/10/14px (`py-1.5` ×98, `py-2.5` ×50, `px-2.5` ×16, `gap-1.5` ×63) and 71 arbitrary `[10px]` | repo-wide | 37 | major |
| Centring | only empty states and sign-in | `OnboardingWizard.tsx:142,192` (`mx-auto max-w-2xl/3xl`), `ProposalWizard.tsx:112`, `rebalance/ExecuteConfirmationStep.tsx:24-30`, `proposals/steps/FinalizeStep.tsx:35` all centre full working screens | those lines | 38 | major |
| Density | 5 KPI tiles, 1 chart, 1 allocation bar, 1 table per view | Dashboard stacks a 5-metric bar + 3 full-width AI banners + 2 cards before any data; Portfolios stacks a metric bar + 2 AI banners + tabs + a table (`dashboard.png`, `portfolios.png`) | — | §5 | major |

### 2.4 Radii

Tailwind v4 scale: `rounded-xs` 2 · `rounded-sm` 4 · `rounded-md` 6 · `rounded-lg` 8 · `rounded-xl` 12 · `rounded-2xl` 16.

| Element | Meridian | App | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| Badge / chip | 4px | `rounded-full` (pill) | `src/components/ui/Badge.tsx:22` | 43, 44 | blocker |
| Button | **8px rectangle, never a pill** | `rounded-md` = 6px | `src/components/ui/Button.tsx:29` | 43, 44 | major |
| Input / control | 6px | `rounded-md` = 6px ✓ | 44 form sites | — | ok |
| Card | 12px | `rounded-lg` = 8px | `src/components/ui/Card.tsx:12` | 44 | major |
| Dialog | 16px | `rounded-xl` = 12px | `src/components/ui/Dialog.tsx:35` | 44 | major |
| Feature block | 24px | none exists | — | 44 | minor |
| Pill | **Tags and toggles only** | 86 `rounded-full` usages: status chips, tab counts, step indicators, avatars, notification badge, FAB | `TabLayout.tsx:58`, `TopBar.tsx:121,96`, `rebalance/StepIndicator.tsx:14`, `engage/EngagePage.tsx:112,127` | 43 | blocker |

### 2.5 Elevation & lines

| Rule | Meridian | App | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| Cards at rest | **no shadow** — hairline only | `shadow-[0_1px_2px_rgba(0,0,0,0.03)]` on every card | `src/components/ui/Card.tsx:12` | 39, 41, 42 | blocker |
| Card variants | — | `NBACard` adds `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`; `ProspectsPage` cards `shadow-xs` | `NBACard.tsx:136`, `ProspectsPage.tsx:43` | 39, 42 | major |
| Shadow hue | ink `rgba(38,34,28,…)` | `rgba(0,0,0,…)` hardcoded ×3; 39 Tailwind `shadow-*` utilities using Tailwind's default black/blue-black | `Card.tsx:12`, `AnnotationPanel.tsx:137`, repo-wide | 42 | blocker |
| Card padding | 16–24px | `p-4` = 16px ✓ | `Card.tsx:43` | 40 | ok |
| Card header | 11px eyebrow + 16px semibold title + right action slot | 18px sans-display title, no eyebrow slot | `Card.tsx:28-35` | §6 | major |
| Gradients | scrims only | `bg-gradient-to-r` on the skeleton | `src/components/ui/Skeleton.tsx:12` | 45 | major |
| Glassmorphism / texture | banned | none found ✓ | — | 46 | ok |
| Focus ring | 2px page gap + 4px olive `rgba(110,122,82,.55)` | `focus-visible:ring-2 ring-accent-blue ring-offset-2` — blue, wrong geometry | `Button.tsx:29`, `Dialog.tsx:60` | 54 | major |
| Focus never suppressed | — | 88 `outline-hidden`/`outline-none` usages; ~20 in form fields replace it with only a *border* colour change, no ring | `settings/AISettingsTab.tsx:97,106,181,191`, `settings/autonomy/StandingRulesCard.tsx:50,58,69,82,89`, `settings/NBASettingsTab.tsx:156-186`, `clients/ClientDetailPage.tsx:317`, `settings/TemplatesPromptsTab.tsx:52,59,65`, `settings/settings-shared.tsx:87`, `settings/autonomy/PermissionMatrixCard.tsx:105` | 54 | blocker |

### 2.6 Motion

| Rule | Meridian | App | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| Durations | 80 / 120 / 180 / 260 / 320ms | 250, 200, 150, 120ms keyframe tokens; utilities `duration-200` ×7, `duration-150` ×6, `duration-300` ×1 | `src/index.css:37-45`, repo-wide | 47 | major |
| Easing | `ease-standard` / `ease-out` / `ease-in` only | `ease-in-out` ×5, plus `cubic-bezier(0.16,1,0.3,1)` (a spring-ish overshoot) | `src/index.css:40`, repo-wide | 47 | major |
| Skeleton shimmer | **banned** — static ghost row or `loader` glyph | `--animate-skeleton-shimmer: shimmer 1.5s linear infinite` on a moving gradient; `Skeleton` is the app's only loading primitive | `src/index.css:36,47-50`, `Skeleton.tsx:12` | 48, 45 | blocker |
| Scale-in | **banned** | `@keyframes scaleIn { scale: 0.96 → 1 }` used on Dialog, ActionMenu, MultiSelect, WelcomeOverlay | `src/index.css:67-70`, `Dialog.tsx:35`, `ActionMenu.tsx:77`, `MultiSelect.tsx:150`, `WelcomeOverlay.tsx:71` | 50 | blocker |
| Bounce | **banned** | AI typing indicator: three `animate-bounce` dots | `features/ai-assistant/AIChatPanel.tsx:278-280` | 50 | major |
| Pulse | **banned** (skeleton shimmer clause) | `animate-pulse` ghost rows; `animate-fab-pulse` (expanding amber box-shadow, infinite); `animate-hotspot-pulse` (infinite) | `notifications/NotificationCenter.tsx:176`, `annotations/AnnotationFAB.tsx:42`, `src/index.css:82-92`, `AnnotationHotspot.tsx:29` | 48, 50 | major |
| Hover never lifts | — | `hover:shadow-md` / `hover:shadow-xs` on 4 card surfaces | `ProspectsPage.tsx:43`, `FamilyTree.tsx:66`, `NBACard.tsx:136`, `proposals/steps/TemplateDataStep.tsx:66` | 51 | major |
| Hover never shifts hue | warms only | `hover:bg-accent-blue/90`, `hover:bg-amber-600`, `hover:border-accent-blue` — hue-shifting hovers | `Button.tsx:5`, `AnnotationFAB.tsx:41`, `FamilyTree.tsx:66` | 51 | major |
| Press `translateY(0.5px)` | — | no press state defined anywhere | — | 52 | minor |
| Selected is a fill | active tab = 2px terracotta underline | 2px **blue** underline (`TabLayout.tsx:68`); segmented control selected = **blue fill**, spec wants a white pill (`SegmentedControl.tsx:21`); scale transform on active hotspot (`AnnotationHotspot.tsx:29` `scale-110`) | those lines | 50, 53 | major |
| Numbers never count up | — | ✓ no count-up found | — | 49 | ok |
| Charts draw instantly | — | Recharts default animation is on everywhere — no `isAnimationActive={false}` in the repo (10 chart files) | all Recharts call sites | 49 | major |

### 2.7 Numbers & copy

| Rule | Meridian | App | File:line | Rule | Severity |
| --- | --- | --- | --- | --- | --- |
| True minus U+2212 | required for every signed figure | **zero occurrences** of `−` in `src/`. `formatCurrency` emits `'-'` (hyphen-minus); `formatPercent` emits bare `.toFixed()` output | `src/lib/utils.ts:57,74` | 21 | blocker |
| Summary money | `$4.21M` (2 dp) | `$8.2M`, `$450K` (1 dp / 0 dp) | `src/lib/utils.ts:58-60` | 19 | major |
| Table money | `$1,148,300` | ✓ via `Intl.NumberFormat` | `src/lib/utils.ts:65` | 20 | ok |
| Accounting negatives | `($284,100)` | never — plain `-$284,100` | `src/lib/utils.ts:57` | 24 | major |
| Returns 2 dp / weights 1 dp | — | `formatPercent(v, 2)` default ✓; weights use `.toFixed(1)` ✓ | `utils.ts:73`, `AllocationChart.tsx:38` | 23 | ok |
| bps under 1% | `+64 bps` | never used | — | 22 | minor |
| Dates | `24 July 2026` prose / `2026-07-24` tables / `Aug 14` scheduling | `formatDate` = `Nov 14, 2026` (US short) in all 24 call sites; dashboard prose = `Friday, July 24, 2026` | `src/lib/utils.ts:77-83`, `features/dashboard/DashboardPage.tsx:10-12`, `SchedulePanel.tsx:18` | 25 | major |
| Masked accounts | `••••4210` | raw `TRU-847291`, `BRK-293847`, `IRA-441028` rendered in full; no `maskAccount` helper exists | `portfolio-views/columns.tsx:40`, `clients/ClientDetailPage.tsx:53`, `HouseholdDetailPage.tsx:54`, `AccountDetailPage.tsx:163` | 26 | major |
| Sentence case | Title Case **never** | 165 Title Case JSX text nodes + Title Case label maps: `'Tax Deferred'`, `'Trust (Compressed)'`, `'Revocable Trust'`, `'Emerging Mkts'`. Screens show `Next Best Actions`, `Portfolio Health Summary`, `This Week`, `Time-Critical`, `Model Governance`, `Rebalance Wizard`, `Accounts Exceeding Drift Threshold`, `Select Accounts`, `Preview Trades`, `Compliance Review`, `Revenue Trend (Monthly)`, `By Segment`, `Fee Schedules`, `New Order`, `Recent Orders`, `Asset Allocation`, `Financial Goals`, `On Track`, `At Risk` | `src/lib/labels.ts:5-49` + 165 sites | 18 | blocker |
| Emoji | zero | `✅` ×4 in a compliance email template | `src/mocks/data/email-templates.ts:138-141` | 27 | major |
| Exclamation marks | zero | ✓ none found | — | 28 | ok |
| Product first person | never | ✓ none found (AI copy is impersonal: "Managing $91.3M across 47 accounts") | — | 29 | ok |
| Hedging retained | "estimated", "as of" | ✓ present ("Estimated tax savings", "Held-away estimate") | — | 30 | ok |
| Raw enum leakage | — | lowercase enum values render as UI copy: `platinum`, `gold`, `silver`, `bronze`, `aum based`, `filled`, `pending`, `submitted`, `cancelled` | `revenue.png`, `trading.png` | 18, §2 | major |

---

## 3. Component-level gaps

Meridian's inventory is 13 primitives across `core/`, `forms/`, `navigation/`, `feedback/`, `data/`. The app ships 39 files in `src/components/ui/`. Five Meridian primitives have **no equivalent at all**; five form primitives are unbuilt (native elements styled inline in 44 files).

### Button — `src/components/ui/Button.tsx`
- L5 `primary: 'bg-accent-blue text-white … shadow-xs'`. Must be `--action-primary-bg: --ink-900` / `--action-primary-fg: --cream-50`, **no shadow**, hover → `--bark-800`. (R3, R6, R41)
- L8 `danger: 'bg-accent-red text-white'` — Meridian has no danger variant; destructive intent is carried by rust text + a confirm dialog. (R7)
- L9 `ai:` variant is lavender `accent-purple` — must be terracotta `--action-accent-bg: #B45C3C` / fg `#FFF8F3`, and **at most one per screen**. (R6, R8)
- L29 `rounded-md` (6px) → must be `rounded-lg` (8px). (R43, R44)
- L29 focus ring is `ring-2 ring-accent-blue ring-offset-2` → must be `0 0 0 2px var(--surface-page), 0 0 0 4px rgba(110,122,82,.55)`. (R54)
- No press state. Must be `translateY(0.5px)` with resting shadow removed. (R52)
- Missing: `IconButton` primitive; the app hand-rolls 9 of them in `TopBar.tsx:69-125` at `h-9 w-9` (36px ✓ but `rounded-full` on the avatar at L121).

### Card — `src/components/ui/Card.tsx`
- L12 `shadow-[0_1px_2px_rgba(0,0,0,0.03)]` — **cards have no shadow at rest**, and the hue is pure black. (R39, R41, R42)
- L12 `rounded-lg` = 8px → 12px (`rounded-xl`). (R44)
- L12 `bg-surface-primary` = `#FFFFFF` → `--cream-25 #FDFBF7`. (R1, R4)
- L12 `border-border-primary` `#DEE5EE` cool → `--border-subtle: --cream-200`. (R3)
- L30-31 header is a single 18px sans-display title. Meridian header = optional 11px uppercase eyebrow + **16px semibold** title + right-aligned action slot. The `action` prop exists but there is no eyebrow slot and the title size is wrong. (R15, §6)
- L43 `p-4` = 16px ✓ in the 16–24px band.

### Badge — `src/components/ui/Badge.tsx`
- L22 `rounded-full` — badges are **4px** (`rounded-sm`); pills are for Tags and toggles only. (R43, R44) This single line produces the pill chips visible on every screenshot (`Taxable`, `Tax Deferred`, `This Week`, `Time-Critical`, `BUY`/`SELL`, `platinum`).
- L5-9 variants are named by *colour* (`blue`, `green`, `red`, `purple`, `yellow`), not by *meaning*. Meridian badges carry tone: positive/negative/warning/info/neutral mapped to moss/rust/ochre/slate/stone with `*-soft` fills. Colour-named variants guarantee decorative colour use. (R7, R8)
- L9 `yellow` bypasses the token layer entirely for raw `bg-amber-100 text-amber-700`. (R3)

### Tag — **missing**
No Tag primitive. Meridian's Tag is the *only* pill, and selected-Tag state is an ink fill. The app instead uses `rounded-full` `<span>`s ad hoc in ≥15 files and `EngagePage.tsx:112,127` uses `rounded-full` buttons as filter tags with a blue-fill selected state. (R43, R53)

### StatTile / MetricCard — `src/components/ui/MetricCard.tsx`, `DenseMetricsBar.tsx`
- `MetricCard.tsx:15` label is `text-caption` (12px sentence case) → must be the 11px uppercase `--tracking-caps` eyebrow, ≤3 words. (R15)
- `MetricCard.tsx:16` value is `text-section-header` = **18px** → KPI figures are **28px mono**. (R17)
- `MetricCard.tsx:16` `font-mono` without `tnum`/`zero`. (R14)
- `MetricCard.tsx:13` wraps `Card`, so it inherits the resting shadow. (R39)
- `MetricCard.tsx:20-24` up/down colours are `accent-green`/`accent-red` → moss/rust. (R7)
- `DenseMetricsBar.tsx:35` `h-[52px]` arbitrary height, off-scale. L39 label is `tracking-wide` (0.025em) not `tracking-caps` (0.09em). L42 value is `text-sm` (14px) — a KPI bar rendering KPIs at body size. (R15, R17, R37)

### DeltaValue — **missing**
Meridian names this "*the only correct way to render a signed figure*". The app has no such primitive; signed values are assembled inline in ≥30 places from `formatPercent()` + a `TrendingUp`/`TrendingDown` icon + a colour class (`MetricCard.tsx:17-31`, `DenseMetricsBar.tsx:12-27`). Consequences: hyphen-minus instead of `−` (R21), no tabular figures (R14), emerald/red instead of moss/rust (R7), and inconsistent decimal counts across screens (R22, R23). This is the single highest-leverage missing component.

### DataTable — `src/components/ui/DataTable.tsx`
- L160 `px-4 py-3` — 16px side padding, spec is **12px**. Compact `px-3 py-1.5` yields a **32px** row, spec dense is **36px**. (R33)
- L157-164 no numeric alignment API; cells inherit `text-left` from the `<td>` default. 101 `text-right` vs 254 mono cells means numerics are left-aligned by default. Visible in `portfolios.png` (Value, Drift), `revenue.png` (Revenue, Households, Rate, Annual Revenue). (R34)
- L81 header is `text-caption font-semibold` sentence-ish → Meridian table headers are the 11px uppercase tracked label. (R15)
- L73 `sticky … bg-surface-secondary` — header uses the page colour, so a scrolled header and the page merge. Meridian would use `--surface-sunken`.
- L131 `border-b border-border-primary` on every row — cool `#DEE5EE`, should be `--border-hairline rgba(88,78,65,.14)`. (R3)
- L132-133 hover is `bg-surface-tertiary` (cool) and expanded is `bg-surface-tertiary/50` — spec: hover = `--surface-sunken` wash, **selected = `--surface-inset` fill**. (R51, R53)
- L119 empty-state action is `text-accent-blue hover:underline` → `--text-link: --terracotta-700`. (R6)
- L146 expand button hit area is `p-0.5` around a 16px icon = **20px**, below the 26px minimum. (R60)

### AllocationBar — **missing**; `AllocationChart.tsx` is a donut
- Rule 55: "**Allocation renders as a 100%-stacked bar before any donut is considered.**" The app's only allocation surface is a Recharts `<PieChart>` with `innerRadius` (donut), used on client detail, household detail and portfolio views (`client-detail.png`). (R55)
- L2, L83-84 donut geometry; L95/L127 fills from `ASSET_CLASS_COLORS` — blue/blue/blue/emerald/lavender, not `--viz-1…8` in fixed order. (R9)
- L29, L95, L127 fallback `'#94A3B8'` hardcoded slate. (R2, R3)
- L110-137 legend is a sibling flex column — acceptable (out of plot), but it renders 11px sentence-case labels where Meridian would use the eyebrow style.
- L32 tooltip `shadow-lg` (black-hued Tailwind shadow) on a floating surface — floating is legitimate (R41 ✓) but the hue is wrong (R42).

### Sparkline — **missing**
No Sparkline component. `grep` finds zero references. Meridian lists it as one of five components "an advisor desktop cannot be built without". Row-level trend is currently conveyed by a `TrendingUp` glyph and a coloured percentage.

### Dialog — `src/components/ui/Dialog.tsx`
- L18 overlay `bg-black/40` → `--surface-overlay rgba(38,34,28,.44)` with the 2px blur. (R42, §6)
- L18/L35 `animate-fade-in`/`animate-scale-in`/`animate-scale-out` — scale-in is banned. (R50)
- L35 `rounded-xl` = 12px → dialogs are **16px**. (R44)
- L35 `shadow-2xl` — floating, so a shadow is correct (R41 ✓), but must be `--shadow-xl: 0 24px 56px rgba(38,34,28,.16), 0 4px 12px rgba(38,34,28,.07)`. (R42)
- L74 `DialogTitle` is `text-body-strong` = 14px/600. Meridian dialog titles are h3 (16px semibold), sentence case. (§4, R18)
- L60 close button focus ring is blue. (R54)
- Four screens bypass this primitive with hand-rolled `fixed inset-0 bg-black/30` modals: `ReportGenerator.tsx:132`, `QuickCaptureDialog.tsx:88`, `WorkflowStepEditor.tsx:107`, `NBAFeed.tsx:261`.

### Toast — `src/components/ui/Toaster.tsx`
- L11-12 `borderLeft: '3px solid var(--accent-blue)'` — a blue rail on every toast regardless of meaning; 3px is off the border scale (hair 1px / thick 1.5px). (R6, §6)
- L14 `richColors` hands Sonner's built-in green/red/amber palette control of status colour, bypassing moss/rust/ochre entirely. (R7)
- L8 `shadow-lg` — floating, so allowed, but black-hued. (R42)
- `position="bottom-right"` is fine.

### Tooltip — **missing**
`@radix-ui/react-tooltip` is a dependency but no `Tooltip.tsx` exists. Hover explanation is delivered by the native `title` attribute in ≥12 places (`TopBar.tsx:57,74,83,92,106,115`, `CurrencyValue.tsx:36`, `Sidebar.tsx:76`). Native tooltips cannot be styled, have a ~1s OS delay, and are invisible to keyboard users. (§9)

### Tabs — `src/components/ui/TabLayout.tsx` + `SegmentedControl.tsx`
- `TabLayout.tsx:68` active underline is `bg-accent-blue` → **2px terracotta**. (R53)
- `TabLayout.tsx:51` active label `text-accent-blue` → ink-900 + terracotta underline only.
- `TabLayout.tsx:58` count chip is `rounded-full` → 4px. (R43)
- `TabLayout.tsx:48` `py-2.5` = 10px, off-scale. (R37)
- `TabLayout.tsx:77` `animate-fade-in` on panel swap ✓ direction-correct, but 200ms `ease-out` vs the 180ms `--duration-base`. (R47)
- `SegmentedControl.tsx:21` selected = `bg-accent-blue text-white`. Meridian's segmented selected state is a **white pill on the inset track**. (R53)
- `SegmentedControl.tsx:13,19` `rounded-lg` + `first:rounded-l-[7px]` — arbitrary 7px, off the radius scale. (R44)
- No focus-visible styling on either.
- `@radix-ui/react-tabs` is installed but unused for these.

### Input / Select / Checkbox / Radio / Switch — **all missing**
No form primitives exist. 44 files style native `<input>`/`<select>`/`<textarea>` inline; there are 31 raw `<select>`, 11 `type="checkbox"`, 4 `type="radio"`. Consequences:
- Focus is suppressed and replaced with only a border colour in ≥20 fields (`AISettingsTab.tsx:97,106,181,191`; `StandingRulesCard.tsx:50,58,69,82,89`; `NBASettingsTab.tsx:156,163,172,178,186`; `TemplatesPromptsTab.tsx:52,59,65`; `settings-shared.tsx:87`; `PermissionMatrixCard.tsx:105`; `ClientDetailPage.tsx:317`). Meridian: focus **always visible**, plus an olive border and a 3px olive wash. (R54)
- Native `<select>` renders the OS chrome (visible in `trading.png` — "Select an account…" is an unstyled system dropdown).
- Checkboxes are browser-default blue (visible in `portfolios.png`, `rebalance.png`).
- No Switch exists; toggles are improvised.
- Helper text has no slot, so `Drift tolerance ±3%`-style constraint copy has nowhere to live. (R32)

### Icon — no wrapper
`lucide-react@0.468.0` (spec pins **0.469.0**) imported directly in ~90 files. Outline-only and single-family ✓ (R59). But there is no size/hit-area contract: `h-3 w-3` (12px) icons appear in `MetricCard.tsx:26-28` and `DataTable.tsx:18-20` with no padded hit area, and `DataTable.tsx:146` gives a 16px icon a `p-0.5` → 20px target, under the 26px floor. (R60)

### Skeleton — `src/components/ui/Skeleton.tsx`
Entirely non-compliant: a `bg-gradient-to-r` (R45) animated by an infinite `shimmer` keyframe (R48, R50) on cool-grey stops (R3). Meridian's loading state is a **static ghost row** or a `loader` glyph. This is a delete-and-replace.

### AIInsightCard — `src/components/ui/AIInsightCard.tsx`
- L9, L39, L42, L56 lavender `accent-purple` carries the AI meaning → must be terracotta, and only one accent action per screen. (R6, R8)
- L14-15 warning tone uses raw `text-amber-600` / `bg-amber-50` → `--status-warning: --ochre-700` / `--status-warning-soft: --ochre-100`. (R3, R7)
- L39 `rounded-lg` (8px) on what reads as a feature block (24px) or card (12px). (R44)
- L46-47 title and body are both `text-caption text-text-secondary` — no hierarchy; Meridian's advisory prompt shape is *finding then action* with the number front-loaded.
- Three of these stack full-width above the fold on Dashboard, Portfolios, Trading and Client detail, giving 2–3 accent-coloured actions per screen. (R6)

---

## 4. Screen-level gaps

**Global chrome (every screen).** No 60px ink nav rail (R5) — instead a white 240px sidebar that collapses to 64px. Active nav item is `bg-accent-blue/10 text-accent-blue` (`Sidebar.tsx:72,101`) where Meridian's ink rail takes a 12% cream wash. `<main>` has no `1180px` max (R35), so tables run edge-to-edge at 2560px (all screenshots are 3200px wide and the content fills them). A pulsing amber `rounded-full` FAB is pinned bottom-right on every screen (`AnnotationFAB.tsx:38-42`) — pill (R43), infinite pulse (R50), lift shadow (R41/R51), and a second accent colour competing with blue (R6). A footer strip renders `Reference Design by Joel Lewis · ⚠ 2 breaks · joelelewis.com · Concept v1` — decorative chrome that no screen earns (§5).

**Dashboard** (`dashboard.png`). Greeting is `Good Evening, Sarah` — Title Case (R18) and not the fiduciary register. Date is `Friday, July 24, 2026` not `24 July 2026` (R25). The metric strip is 11px uppercase labels ✓ in spirit but 14px mono values, not 28px (R17). Three full-width AI banners (lavender, yellow, teal-green) stack before any data — three accent tones on one screen (R6, R8), and the teal `bg-accent-green/5` is a fourth hue. `Next Best Actions` / `This Week` / `Time-Critical` pill badges are Title Case (R18) in `rounded-full` amber/red (R43, R7). Schedule cards use `Internal` / `Quarterly Review` / `Planning` pills. Times render `8:30 AM – 9:00 AM` in mono ✓ but no ISO date anywhere.

**Portfolios** (`portfolios.png`). Two accent buttons in the header (`Trade` blue-filled, `Model Governance` outlined) — R6 caps at one. Segmented `Accounts / Households / Models` uses a blue fill (R53). The `All Accounts` table: `Value`, `Drift`, `Last Rebal` columns are **left-aligned** (R34); account numbers `TRU-847291` are unmasked (R26); a blue `Rebalance` button repeats in **every row**, so a single screen carries 40+ accent-coloured actions (R6 — the most severe instance in the app); `Taxable` / `Tax Deferred` / `Tax Free` / `Trust (Compressed)` are Title Case pills (R18, R43); drift values are red with a `⚠` glyph but use `#DC2626`, not rust (R7). `Drifted only` checkbox is browser-default.

**Client detail** (`client-detail.png`). Allocation is a **donut** (R55) in blue/blue/emerald/lavender/slate (R9). Three header buttons (`Generate Proposal`, `Generate Report`, `Workflow`) plus a share icon — Title Case (R18), multiple accents (R6). `Platinum` badge is a lavender pill (R43). Tabs carry `rounded-full` count chips (R43) with blue active underline (R53). Financial Goals bars are emerald/amber progress bars with `On Track` / `At Risk` labels in Title Case. `92%` / `78%` are 24px bold sans, not 28px mono (R13, R17). AI Summary block is a card with a lavender left rail.

**Rebalance** (`rebalance.png`). `Rebalance Wizard`, `Select Accounts`, `Preview Trades`, `Compliance Review`, `Execute` — all Title Case (R18). Step indicators are `rounded-full` numbered circles (R43) with a blue fill for the active step. Account rows are individually bordered `rounded-lg` cards inside a card — nested elevation with a resting shadow on each (R39), and ~72px tall against the 44px row spec (R33). `$8.2M` / `7.0% drift` are right-aligned ✓ but 1-dp compact (R19) and the drift red is `#DC2626` (R7). `Drift threshold [3] %` field has no helper text explaining the constraint (R32).

**Trading** (`trading.png`). `Single Trade` / `Model Trade`, `New Order`, `Recent Orders`, `Order Type`, `Quantity (shares)` — Title Case (R18). Asset-class tabs are a segmented control with a white-on-blue selected pill inside a grey track — closer to spec by accident, but the icons mix concepts. `Buy` selected state is a green-tinted **outline** — spec says selected is a **fill** (R53). `Select an account…` is an unstyled native `<select>`. Recent Orders: `BUY`/`SELL` pills (R43) in emerald/red (R7); `filled` / `pending` / `submitted` / `cancelled` are raw lowercase enum values leaking to the UI (§2). Symbol/Qty columns are mono ✓ but Qty is **left**-aligned (R34). The table overflows its card and is clipped mid-column.

**Revenue / Practice Management** (`revenue.png`). Chart violations cluster here: visible **axis box** (left + bottom axis lines) and a dashed `3 3` grid (R57, R56); an **in-plot legend** (`Revenue` / `Projected` rendered below the plot inside the chart container) (R57); a 2px blue line with **no 10% area wash** (R56); projected series is a dashed lavender line (R9); bars are lavender / orange / slate / blue with no fixed order (R9). Segment table renders `platinum` / `gold` / `silver` / `bronze` as lowercase pills and `aum based` as a fee type (§2). `+8.30%` uses a hyphen-free positive ✓ but the negative case would emit `-`. Y-axis labels `$80K` / `$60K` are 1-dp compacts (R19).

**Settings, Workflows, Engage, Billing, Reconciliation, Archive, Prospects, Book, Risk, Models, Households, Clients, Actions.** Same pattern throughout: white cards with resting shadows on a cool-grey page, blue primary actions, `rounded-full` status chips, Title Case section headers, native form controls with suppressed focus, and left-aligned numerics. `EngagePage.tsx:112,127` uses `rounded-full` filter buttons with blue fills. `ReconciliationPage.tsx:92-99` puts a `<Legend>` inside the plot with blue/emerald/lavender lines.

**Command palette** (`command-palette.png`). Overlay is `bg-black/30`-family (R42); the panel animates with `scale-in` (R50).

**Onboarding / Proposal wizards.** `OnboardingWizard.tsx:142,192` and `ProposalWizard.tsx:112` centre the entire working screen with `mx-auto max-w-2xl/3xl`; `ExecuteConfirmationStep.tsx:24-30` and `FinalizeStep.tsx:35` centre a success state around a `rounded-full` green circle. Meridian: nothing centres except empty states and sign-in (R38), and layout is left-anchored.

---

## 5. Dark mode — open design question, not a gap to fix

**The Meridian brief defines no dark theme.** §3 gives one ramp (cream → espresso), one page surface, one card surface, and states flatly that "there are **no pure greys and no pure white**". There is no inverse ramp beyond `--surface-inverse`/`--surface-nav` (`--ink-900`), `--text-inverse` (`--cream-50`), `--text-inverse-muted` (`--clay-400`), `--border-inverse` (`rgba(244,238,227,.18)`) and `--focus-ring-inverse` — five tokens intended for the **ink nav rail and one feature block per screen**, not for a whole-app theme.

**What the app currently does.** `src/index.css:185-200` defines a full `[data-theme="dark"]` block that swaps to Tailwind's slate ramp: `--surface-primary: #1E293B` (slate-800), `--surface-secondary: #0F172A` (slate-900), `--surface-tertiary: #334155`, `--border-primary: #334155`, `--text-primary: #F1F5F9`, `--text-secondary: #94A3B8`, `--text-tertiary: #64748B`, and brightened accents `#3B82F6` / `#10B981` / `#EF4444` / `#A99DE0` / `#F59E0B`. It is a cool blue-black theme. Beneath it, `src/index.css:222-248` is a 27-line patch layer overriding hardcoded Tailwind colour utilities (`bg-white`, `bg-amber-50`, `text-amber-700`, `border-yellow-200`, …) that leaked past the token layer — an explicit admission that the token system is not load-bearing. `dashboard-dark.png` shows the result: near-black slate page, slate-800 cards, blue nav highlight, lavender/amber/teal AI banners now floating on dark with washed-out contrast.

**The risk.** Porting this dark theme onto Meridian is not a token swap — it is a second design system. Meridian's identity *is* the warm paper: hairline rules instead of shadows only work on a light warm ground; `--border-hairline` at 14% ink is invisible on ink-900; `--shadow-*` at 4–16% ink opacity does nothing on a dark surface; the moss/rust/ochre status set loses most of its separation below 30% luminance; and the whole "ink nav rail as the one dark element per screen" idea collapses when the page itself is dark. Inventing values here would be inventing brand.

**Recommendation.** Treat dark mode as an explicit open question for the design owner, with three options to decide between, not to guess at: (a) ship light-only and remove the toggle (`TopBar.tsx:102-109`) and the `[data-theme="dark"]` block — the option most consistent with the brief; (b) commission a Meridian night ramp (an espresso-ground inversion: `--ink-950` page, `--ink-900`/`--bark-800` cards, `--cream-50` text, `--border-inverse` rules, accents lifted to the `-300` steps) as a formal addendum with its own token file; (c) keep the current cool dark theme as an acknowledged non-Meridian surface. **Do not** silently map slate → cream and call it done; the `index.css:222-248` patch layer shows what that produces.

---

## 6. Violation inventory

Severity: **blocker** = breaks a foundational Meridian rule and is visible on every screen · **major** = breaks a §10 rule on a shared component or many screens · **minor** = local or cosmetic.

### Blockers (24)

| # | Rule | File:line | Current | Required |
| --- | --- | --- | --- | --- |
| B1 | 1, 4 | `src/index.css:170` | `--surface-primary: #FFFFFF` used as card fill | `--surface-card: var(--cream-25)` `#FDFBF7`; white reserved for `--surface-raised` |
| B2 | 3, 4 | `src/index.css:172` | `--surface-secondary: #F7F9FC` as page bg | `--surface-page: var(--cream-50)` `#FAF6EF` |
| B3 | 3 | `src/index.css:173` | `--surface-tertiary: #F0F4F8` | `--surface-sunken: var(--cream-100)` / `--surface-inset: var(--cream-200)` |
| B4 | 2, 3 | `src/index.css:174-175` | `--border-primary: #DEE5EE`, `--border-secondary: #C4CFDB` | four tiers: `--border-hairline rgba(88,78,65,.14)`, `--border-subtle var(--cream-200)`, `--border-default var(--sand-300)`, `--border-strong var(--clay-400)` |
| B5 | 2, 3 | `src/index.css:176-178` | `#0F172A` / `#475569` / `#94A3B8` (slate) | `--text-heading var(--ink-900)`, `--text-body var(--bark-800)`, `--text-muted var(--stone-600)`, `--text-subtle var(--stone-500)` |
| B6 | 6, 8 | `src/index.css:179` + 517 usages | `--accent-blue: #2563EB` as the app-wide accent | delete. Primary action = `--ink-900`; accent = `--terracotta-500 #B45C3C`, **one per screen** |
| B7 | 8 | `src/index.css:181`, `AIInsightCard.tsx:9,42,56`, `TopBar.tsx:72` + 164 usages | `--accent-purple: #8B7EC8` carries AI meaning | terracotta `#B45C3C` / `--text-accent #8A4227` |
| B8 | 5 | `src/components/layout/Sidebar.tsx:44-46` | white 240/64px sidebar, `bg-surface-primary` | 60px `--surface-nav: var(--ink-900)` rail + optional 248px sidebar |
| B9 | 9 | `src/lib/chart-colors.ts:2-11` | 10 ad-hoc hexes keyed by asset class (`#2563EB`, `#3B82F6`, `#60A5FA`, `#8B7EC8`, `#0891B2`…) | `--viz-1…8` in fixed order: `#4C553A #8C9663 #C08A2E #B45C3C #7E3020 #4C6272 #9A8C77 #DED3C0` |
| B10 | 11 | `src/index.css:22`, `index.html:23` | `--font-sans: 'Plus Jakarta Sans', system-ui` | `"Instrument Sans","Helvetica Neue",Arial,sans-serif` |
| B11 | 11, 12 | `src/index.css:23`, `index.html:23` | `--font-display: 'Instrument Sans'` (a sans) used for all page/section titles | `--font-display: "Instrument Serif",Georgia,serif`, used **only** in sign-in, empty states, report covers, wordmark; UI headings use Instrument Sans |
| B12 | 13 | `src/index.css:24,134,141` | `--font-mono: 'JetBrains Mono'` | `"IBM Plex Mono","SFMono-Regular",Menlo,monospace` |
| B13 | 14 | `src/index.css:133-145` (+313 `font-mono` usages) | no `tnum`/`zero` anywhere in the repo | `font-feature-settings: "tnum" 1, "zero" 1` on every numeric utility |
| B14 | 18 | `src/lib/labels.ts:5-49` + 165 JSX sites | Title Case: `Next Best Actions`, `Model Governance`, `Rebalance Wizard`, `Tax Deferred`, `Trust (Compressed)`, `Time-Critical`, `This Week`, `On Track` | sentence case everywhere; UPPERCASE only for the 11px ≤3-word eyebrow |
| B15 | 21 | `src/lib/utils.ts:57,74` | `const sign = value < 0 ? '-' : ''` (hyphen-minus); zero `−` in `src/` | true minus `−` U+2212 for every signed figure |
| B16 | 34 | `src/components/ui/DataTable.tsx:157-164` | no alignment API; numerics left-aligned by default (101 `text-right` vs 254 mono cells) | numeric columns right-aligned **without exception** |
| B17 | 35 | `src/components/layout/AppShell.tsx:109` | `<div className="p-6">` — no width cap | `max-width: var(--content-max)` = 1180px |
| B18 | 39, 41, 42 | `src/components/ui/Card.tsx:12` | `shadow-[0_1px_2px_rgba(0,0,0,0.03)]` on every card at rest | no shadow at rest; 1px `--border-subtle` + 12px radius only |
| B19 | 43, 44 | `src/components/ui/Badge.tsx:22` | `rounded-full` on every badge | `--radius-xs` 4px (`rounded-sm`) |
| B20 | 43 | 86 sites incl. `TabLayout.tsx:58`, `TopBar.tsx:96,121`, `rebalance/StepIndicator.tsx:14`, `EngagePage.tsx:112,127`, `AnnotationFAB.tsx:38` | pills on counts, avatars, step indicators, notification badge, filter buttons, FAB | pill reserved for Tags and toggles; everything else 4/6/8/12/16/24px |
| B21 | 48, 50, 45 | `src/index.css:36,47-50` + `Skeleton.tsx:12` | `animate-skeleton-shimmer` on a `bg-gradient-to-r` — the app's only loading primitive | static ghost row (`--surface-sunken` fill, no animation) or a `loader` glyph |
| B22 | 50 | `src/index.css:40,42,67-80`; `Dialog.tsx:35`, `ActionMenu.tsx:77`, `MultiSelect.tsx:150`, `WelcomeOverlay.tsx:71` | `scaleIn`/`scaleOut` (0.96 → 1) on four surfaces | fade + ≤8px travel, `--duration-base` 180ms, `--ease-out` |
| B23 | 54 | `settings/AISettingsTab.tsx:97,106,181,191`; `autonomy/StandingRulesCard.tsx:50,58,69,82,89`; `NBASettingsTab.tsx:156,163,172,178,186`; `TemplatesPromptsTab.tsx:52,59,65`; `settings-shared.tsx:87`; `autonomy/PermissionMatrixCard.tsx:105`; `clients/ClientDetailPage.tsx:317` | `focus:outline-hidden` replaced only by a border colour change — no ring | `--focus-ring: 0 0 0 2px var(--surface-page), 0 0 0 4px rgba(110,122,82,.55)` + olive border + 3px olive wash |
| B24 | 55 | `src/components/ui/AllocationChart.tsx:2,83-84` | allocation is a Recharts donut on client detail, household detail and portfolio views | 100%-stacked `AllocationBar` first; donut only if the bar has been ruled out |

### Majors (33)

| # | Rule | File:line | Current | Required |
| --- | --- | --- | --- | --- |
| M1 | 7 | `src/index.css:180-181` | `--accent-green #059669` / `--accent-red #DC2626` | `--status-positive var(--moss-700) #365A39` / `--status-negative var(--rust-500) #A8452F` |
| M2 | 7, 3 | `Badge.tsx:9`, `AIInsightCard.tsx:14-15` + ~70 raw `amber-*`/`yellow-*`/`orange-*` classes | `bg-amber-100 text-amber-700`, `bg-amber-50`, `text-amber-600` | `--status-warning var(--ochre-700)` / `--status-warning-soft var(--ochre-100)` |
| M3 | 3 | `Badge.tsx:5-8` | variants named by colour (`blue`/`green`/`red`/`purple`/`yellow`) | variants named by tone (positive/negative/warning/info/neutral) mapped to the status pairs |
| M4 | 42 | `Card.tsx:12`, `NBACard.tsx:136`, `AnnotationPanel.tsx:137` + 39 Tailwind `shadow-*` | `rgba(0,0,0,…)` and Tailwind's default black shadows | `--shadow-xs…xl`, all `rgba(38,34,28,…)` |
| M5 | 42 | `Dialog.tsx:18`, `ReportGenerator.tsx:132`, `QuickCaptureDialog.tsx:88`, `WelcomeOverlay.tsx:66`, `WorkflowStepEditor.tsx:107`, `NBAFeed.tsx:261`, `AIChatPanel.tsx:181`, `AnnotationOverlay.tsx:42` | `bg-black/30`–`/50` scrims | `--surface-overlay rgba(38,34,28,.44)` + 2px blur |
| M6 | 44 | `Card.tsx:12` | `rounded-lg` 8px | `--radius-lg` 12px (`rounded-xl`) |
| M7 | 43, 44 | `Button.tsx:29` | `rounded-md` 6px | `--radius-md` 8px (`rounded-lg`) |
| M8 | 44 | `Dialog.tsx:35` | `rounded-xl` 12px | `--radius-xl` 16px (`rounded-2xl`) |
| M9 | 44 | `SegmentedControl.tsx:19` | `first:rounded-l-[7px] last:rounded-r-[7px]` — arbitrary 7px | 6px control radius |
| M10 | 45 | `Skeleton.tsx:12` | `bg-gradient-to-r from-… via-… to-…` | flat `--surface-sunken` fill; gradients only for `--scrim-top`/`--scrim-bottom` |
| M11 | 15 | `DenseMetricsBar.tsx:39`, `DataTable.tsx:81`, `MetricCard.tsx:15` + 71 `text-[10px]`/`text-[11px]` sites | improvised labels: `text-[11px] uppercase tracking-wide` (0.025em) or 12px sentence case | `--label` 11px / 1.2, uppercase, `--tracking-caps` 0.09em, ≤3 words |
| M12 | 17 | `MetricCard.tsx:16`, `DenseMetricsBar.tsx:42` | KPI values at 18px and 14px | `--numeric-lg` 28px IBM Plex Mono |
| M13 | 33 | `DataTable.tsx:160` | `px-4 py-3` (16px side padding); compact `px-3 py-1.5` → 32px row | 44px row / 36px dense, **12px** cell padding |
| M14 | 53 | `TabLayout.tsx:68` | active tab underline `bg-accent-blue` | 2px terracotta underline |
| M15 | 53 | `SegmentedControl.tsx:21` | selected segment = `bg-accent-blue text-white` | white pill on the inset track |
| M16 | 53 | `DataTable.tsx:133` | expanded/selected row = `bg-surface-tertiary/50` (translucent) | opaque `--surface-inset` fill |
| M17 | 51 | `ProspectsPage.tsx:43`, `FamilyTree.tsx:66`, `NBACard.tsx:136`, `proposals/steps/TemplateDataStep.tsx:66` | `hover:shadow-md` / `hover:shadow-xs` — elements lift on hover | hover warms only: `--surface-sunken` wash / border → `--border-strong`; never a lift |
| M18 | 51 | `Button.tsx:5,8`, `AnnotationFAB.tsx:41`, `FamilyTree.tsx:66` | `hover:bg-accent-blue/90`, `hover:bg-amber-600`, `hover:border-accent-blue` — hue shifts | primary darkens ink-900 → bark-800; secondary fills to cream-100 |
| M19 | 50, 48 | `AnnotationFAB.tsx:42` + `src/index.css:88-92` | `animate-fab-pulse` — infinite expanding amber box-shadow on a `rounded-full` FAB | remove; if the affordance is needed, a static ink icon button, 8px radius |
| M20 | 50, 48 | `AnnotationHotspot.tsx:29` + `src/index.css:82-86` | `animate-hotspot-pulse` infinite + `scale-110` on active | static ring, no pulse, no scale |
| M21 | 50 | `AIChatPanel.tsx:278-280` | three `animate-bounce` typing dots | static `loader` glyph or a ghost line |
| M22 | 48, 50 | `NotificationCenter.tsx:176` | `animate-pulse` ghost rows | static ghost rows |
| M23 | 47 | `src/index.css:37-45` + `duration-200`×7 / `duration-150`×6 / `duration-300`×1 / `ease-in-out`×5 | 250/200/150/120ms, `ease-in-out`, `cubic-bezier(0.16,1,0.3,1)` | 80/120/180/260/320ms and the three named curves only |
| M24 | 49 | all 10 Recharts files | Recharts default entry animation left on | `isAnimationActive={false}` — charts draw instantly |
| M25 | 56 | `RevenuePage.tsx:132-133`, `PerformanceTab.tsx:36-37`, `BookAnalyticsView.tsx:162-164`, `ReconciliationPage.tsx:97-99` | `strokeWidth={2}`, no area wash | 1.5–1.75px stroke + 10% area wash |
| M26 | 56, 57 | 12 `CartesianGrid` sites, e.g. `RevenuePage.tsx:128` | `strokeDasharray="3 3" stroke="var(--border-primary)"` + visible axis lines forming a box | solid grid at `--viz-grid rgba(88,78,65,.12)`; no axis box |
| M27 | 57 | `RevenuePage.tsx:134`, `ReconciliationPage.tsx:96`, `PerformanceTab.tsx:38`, `RiskTab.tsx:51`, `BookAnalyticsView.tsx:161`, `NBAEffectivenessContent.tsx:74,93` | `<Legend>` rendered inside the plot | legend outside the plot area, or direct labelling |
| M28 | 9 | `NBAEffectivenessContent.tsx:94-95` | raw `stroke="#2563EB"` / `"#8B7EC8"` bypassing even the app's own tokens | `--viz-1…8` |
| M29 | 19 | `src/lib/utils.ts:58-60` | `$8.2M`, `$1.4B`, `$450K` — 1 dp / 0 dp | `$4.21M`, `$1.42B` — two significant decimals |
| M30 | 24 | `src/lib/utils.ts:57` | `-$284,100` | accounting parentheses `($284,100)` |
| M31 | 25 | `src/lib/utils.ts:77-83` (24 call sites), `dashboard/DashboardPage.tsx:10-12`, `SchedulePanel.tsx:18` | `Nov 14, 2026`; `Friday, July 24, 2026` | `2026-11-14` in tables, `24 July 2026` in prose, `Aug 14` for scheduling |
| M32 | 26 | `portfolio-views/columns.tsx:40`, `clients/ClientDetailPage.tsx:53`, `HouseholdDetailPage.tsx:54`, `portfolios/AccountDetailPage.tsx:163`, `portfolio-views/HouseholdView.tsx:105` | full account numbers `TRU-847291`, `IRA-441028` | masked `••••7291` |
| M33 | 27 | `src/mocks/data/email-templates.ts:138-141` | `✅` ×4 in a compliance summary template | zero emoji; a Badge tone or Lucide `check` |

### Minors (14)

| # | Rule | File:line | Current | Required |
| --- | --- | --- | --- | --- |
| m1 | 10 | `src/index.css:115-119` | `text-body` 14px / **20px** | 14px / 1.5 → 21px |
| m2 | 16 | `src/index.css:101-113` | `text-page-title` 24/32/600; `text-section-header` 18/28/600; no tracking | `--h1` 26/1.2, `--h2` 20/1.25, `--h3` 16/1.35, tracking −0.01…−0.02em |
| m3 | §4 | `src/index.css:133-145` | `text-mono` 13px, `text-mono-sm` 11px | `--numeric` 14px, `--numeric-sm` 12px, `--numeric-lg` 28px |
| m4 | §5 | `src/index.css:28` | `--spacing-sidebar-expanded: 240px` | `--sidebar-width: 248px` |
| m5 | §5 | `src/index.css:32-33` | AI panel 400px / 600px | `--panel-width: 360px` |
| m6 | 36 | repo-wide | no 48px page gutter anywhere | `--gutter-page: 48px` at the page level |
| m7 | 37 | ~380 half-step utilities (`py-1.5`×98, `py-2.5`×50, `gap-1.5`×63, `px-2.5`×16) + 71 `[10px]` + `h-[52px]` | off-scale 6/10/14px values | 0/2/4/6/8/12/16/20/24/32/40/48/64 only |
| m8 | 38 | `OnboardingWizard.tsx:142,192`, `ProposalWizard.tsx:112`, `rebalance/ExecuteConfirmationStep.tsx:24-30`, `proposals/steps/FinalizeStep.tsx:35` | full working screens centred with `mx-auto max-w-2xl/3xl` | left-anchored; centre only empty states and sign-in |
| m9 | 52 | repo-wide | no press state | `translateY(0.5px)`, resting shadow removed |
| m10 | 58 | `PerformanceTab.tsx:37`, `RevenuePage.tsx:133` | benchmark = dashed cool-grey/lavender line | unfilled line or ink target marker |
| m11 | 59 | `package.json` | `lucide-react ^0.468.0` | pin `0.469.0` |
| m12 | 60 | `DataTable.tsx:146` (`p-0.5` on 16px icon = 20px), `MetricCard.tsx:26-28` (12px icons, no hit area) | targets below 26px | ≥26px square hit area, optically centred |
| m13 | §6 | `Toaster.tsx:11-14` | `borderLeft: '3px solid var(--accent-blue)'` on every toast + Sonner `richColors` | tone-driven left rule at `--border-width-thick` 1.5px; app-owned status colours |
| m14 | §9 | `TopBar.tsx:57,74,83,92,106,115`, `Sidebar.tsx:76`, `CurrencyValue.tsx:36` | native `title` attributes as tooltips (Radix tooltip installed but unused) | a Tooltip component |

**Totals: 71 concrete violations — 24 blocker, 33 major, 14 minor.**
Missing components (counted once each inside the inventory but worth restating): Tag, DeltaValue, AllocationBar, Sparkline, Tooltip, Input, Select, Checkbox, Radio, Switch, Icon wrapper — **11 primitives absent**.

---

## 7. Effort map

### Tier 1 — token swap (cheap, global, ~1 day)
Rewrite `src/index.css:5-98` and `:169-248`. Replaces B1–B5, B9–B13, M1, M4, M23, m1–m3.
- Replace the 13-variable `:root` block with the full Meridian token set: 12 base ramp steps, 6 accent families, 9 surface aliases, 9 text aliases, 6 line aliases, 11 action aliases, 10 status aliases, 10 viz tokens.
- Swap `@theme` font vars and the `index.html:23` Google Fonts link to Instrument Serif + Instrument Sans + IBM Plex Mono.
- Add `font-feature-settings: "tnum" 1, "zero" 1` to the numeric utilities and a `--numeric-lg` 28px token.
- Add the 11px `--label` eyebrow utility with `letter-spacing: 0.09em`.
- Replace the six `--animate-*` tokens and eight keyframes with Meridian's five durations and three curves; delete `shimmer`, `scaleIn`, `scaleOut`, `hotspotPulse`, `fabPulse`.
- Replace `src/lib/chart-colors.ts:2-11` with an ordered `--viz-1…8` array.
- **Caveat:** the token *names* don't map 1:1. `surface-primary`/`secondary`/`tertiary` must fan out into `page`/`card`/`raised`/`sunken`/`inset`/`nav`; `border-primary`/`secondary` into four weights; `accent-blue` has no successor. So Tier 1 leaves ~90 files referencing names that no longer carry the right meaning — which is Tier 2.

### Tier 2 — component rewrites (the bulk, ~1–1.5 weeks)
Rewrite in `src/components/ui/`, in dependency order:
1. **New primitives** (highest leverage first): `DeltaValue` (fixes B15, M1, M29, M30 and ~30 inline call sites at once), `AllocationBar` (B24), `Tag`, `Sparkline`, `Tooltip`, `Icon`.
2. **Form set**: `Input`, `Select`, `Checkbox`, `Radio`, `Switch` — this is what retires B23 across 44 files and 20 suppressed focus rings. Largest single mechanical job.
3. **Rewrites**: `Button` (B6, M7, M18, m9), `Card` (B18, M6), `Badge` (B19, M2, M3), `Skeleton` → static ghost (B21, M10), `Dialog` (B22, M5, M8), `Toaster` (m13), `TabLayout` + `SegmentedControl` (M14, M15, M9), `MetricCard` → `StatTile` (M11, M12), `DataTable` (B16, M13, M16, m12), `AIInsightCard` (B7).
4. **Formatting layer**: rewrite `src/lib/utils.ts:43-91` — true minus, 2-dp compacts, accounting parens, ISO/prose/scheduling date variants, add `maskAccount()` (B15, M29–M32).
5. **Copy pass**: `src/lib/labels.ts` + 165 JSX sites → sentence case; delete 4 emoji (B14, M33). Mechanical, scriptable with review.

### Tier 3 — screen rebuilds (~1 week)
- **AppShell + Sidebar + TopBar**: introduce the 60px ink nav rail, the 248px sidebar, the 1180px content max, the 360px right panel; delete the AnnotationFAB or restyle it out of pill-and-pulse (B8, B17, B20, M19, M20, m4–m6).
- **Chart layer** (10 Recharts files + 2 D3): strip axis boxes and in-plot legends, retune stroke widths and add area washes, disable entry animation, apply the ordered viz ramp, convert allocation donuts to stacked bars (B24, M24–M28, m10).
- **Density pass, per screen**: Meridian's "a screen earns each element" rule invalidates the current Dashboard (3 stacked AI banners), Portfolios (per-row accent buttons — the worst R6 breach in the app), Client detail (3 header actions + donut), Rebalance (nested shadowed cards at 72px rows). This is design work, not a refactor; budget it as design time, not engineering.
- **Wizards**: un-centre Onboarding, Proposal, Rebalance-complete and Finalize (m8).

### Tier 4 — decision, not work
Dark mode (§5). Resolve before Tier 1 ships, because the outcome determines whether `[data-theme="dark"]` and the `index.css:222-248` patch layer are deleted or rebuilt.

### Rough shape
| Tier | Scope | Effort |
| --- | --- | --- |
| 1 Token swap | 3 files | ~1 day |
| 2 Components + formatting + copy | 16 rewrites, 11 new, ~90 consuming files | ~1–1.5 weeks |
| 3 Shell + charts + density | 4 layout files, 12 chart files, ~20 screens | ~1 week eng + design time |
| 4 Dark mode | decision | blocking, not sized |

Tier 1 alone will make the app *look* warmer and change nothing structural — cards will still float on shadows, badges will still be pills, numbers will still use hyphens and left-align, and allocation will still be a donut. **The value is in Tier 2.**
