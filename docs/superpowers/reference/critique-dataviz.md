# Data-visualisation critique — Advisor Desktop (Meridian)

Reviewed against: the `dataviz` skill (form heuristic, four colour jobs, six checks, mark specs,
interaction rules, anti-pattern catalog), the **Meridian design-system brief** §3 (`--viz-1…8`),
§7 (Data visualisation) and rules 55–58, and the wealth-management domain skills
(`performance-attribution`, `forward-risk`, `asset-allocation`, `diversification`, `historical-risk`).

All colour claims below were produced by running
`node scripts/validate_palette.js` and its exported `contrast()` — not eyeballed.

Severity key: **C** critical (wrong/misleading data or a hard accessibility failure) ·
**H** high (wrong form, or a system-level inconsistency a reviewer will see immediately) ·
**M** medium · **L** low.

---

## 1. Verdict

**No. These read as fifteen separately-built components, and several will not survive expert scrutiny.**

Three things give it away in the first ten seconds of looking at the screenshots:

1. **Three different colour vocabularies are on screen simultaneously.** `src/lib/chart-colors.ts`
   defines a 10-entry hex map for asset classes; `src/features/portfolios/ModelGovernancePage.tsx:41`
   defines a *second, conflicting* asset-class map using raw Tailwind classes (`bg-indigo-500`,
   `bg-gray-400`); and `SEGMENT_COLORS` is copy-pasted into three files
   (`RevenuePage.tsx:28`, `BookAnalyticsView.tsx:15`, `BookOfBusinessPage.tsx:14`) with a fifth
   entry in only one of them. The same asset class — `intl_equity` — is `#3B82F6` in the donut on
   the client page and `#6366F1` in the allocation bar on the models page.
2. **Not one of the fifteen surfaces uses the Meridian `--viz-*` tokens.** The tokens do not exist
   in `src/index.css`. Every chart is painted in a cool blue/slate Tailwind-default palette
   (`#2563EB`, `#DC2626`, `#94A3B8`, `#8B7EC8`) that is the exact opposite of the brief's warm
   earth-pigment system, and violates rules 2, 3, 7 and 9 wholesale.
3. **The design system's single most specific viz rule is broken on the flagship screen.**
   Rule 55 — *"allocation renders as a 100%-stacked bar before any donut is considered"* — and the
   allocation surface is a donut (`AllocationChart.tsx:76`) used in six places. Ironically the app
   *does* contain a correct 100%-stacked allocation bar, at `ModelGovernancePage.tsx:127` — but it
   is hand-rolled CSS with the rival colour map, so the one right answer is also the one that
   doesn't compose.

Against the dataviz skill, the picture is worse than "inconsistent":

- **A dual-axis chart ships** (`NBAEffectivenessContent.tsx:87–96`) — the skill's #1 named mistake.
- **Every categorical palette in the app fails the validator**, most on the *normal-vision* floor,
  which is a hard gate that secondary encoding does not excuse.
- **Charts animate on mount.** No `isAnimationActive={false}` appears anywhere in `src/`, so every
  Recharts bar and line grows in over ~1.5 s. Rule 49 says *"charts draw instantly."*
- **One chart in the app has a text alternative** (`AllocationChart.tsx:74`). Fourteen do not.
- **Two charts render fabricated data.** `HouseholdListView.tsx:24` shows a per-segment
  `ALLOCATION_TEMPLATES` constant as if it were the household's real allocation, and
  `ClientDetailPage.tsx:134` hard-codes `CLIENT_ALLOCATION`. In a fiduciary product that is not a
  polish issue.

What *is* good and worth keeping: the underlying data model is genuinely sophisticated
(Brinson allocation/selection/interaction, Monte Carlo percentiles + histogram, factor exposures
vs benchmark, HHI, stress scenarios with position-level impacts). The analytics are right; the
visual layer squanders them. Every finding below is fixable without touching a service or a type.

Counts: **8 critical · 19 high · 21 medium · 7 low** (55 findings).

---

## 2. Chart inventory

| # | Chart / surface | File | Library | What it shows | Right form? | Issues | Sev |
|---|---|---|---|---|---|---|---|
| 1 | Asset allocation donut | `components/ui/AllocationChart.tsx:76` | Recharts `PieChart` | 5–10 asset-class weights | **No** | Rule 55 (stacked bar first); 10-slot palette fails validator; `#2563EB`/`#3B82F6` adjacent slices ΔE 8.2 normal-vision; hover-only values when `showLegend=false` | **C** |
| 2 | Position treemap | `components/ui/TreemapChart.tsx` | D3 | position weight, coloured by asset class, flagged on IPS breach | Marginal | 5 of 10 tile-label colours fail 4.5:1; breach = colour + a `⚠` unicode glyph (rule 27/59); imperative D3 in `useEffect` with no tooltip, no keyboard access, no empty state | **H** |
| 3 | Brinson attribution waterfall | `components/ui/WaterfallChart.tsx` + `AttributionPage.tsx:112` | D3 | cumulative active return by asset class | **No** | Does not decompose allocation/selection/interaction — the thing the page is named for; dashed grid + dashed connectors (rule 57); a number on every bar; `+` on every label | **C** |
| 4 | AUM decomposition waterfall | `growth/BookOfBusinessPage.tsx:39` | Recharts (stacked-bar hack) | trailing-12M AUM bridge | Right form, broken scale | Y-axis anchored at $0 so four of six bars are 1–3 px slivers (see `book.png`); no connector lines; duplicate implementation of #3 | **C** |
| 5 | Sensitivity analysis | `portfolios/RiskAnalyticsPage.tsx:168` | Recharts `BarChart` | P&L vs equity/rate/credit shock | **No** | A monotone response curve drawn as red/green columns; colour re-encodes the sign the axis already shows; bars ~120 px wide (spec: ≤24 px); tabs hide the cross-factor comparison that *is* the tornado | **H** |
| 6 | Monte Carlo histogram | `RiskAnalyticsPage.tsx:223` | Recharts `BarChart` | frequency by return bucket | **No** | Should be a fan chart over the horizon; blue/red by bucket sign is a status colour on a frequency series; percentiles not marked on the distribution | **H** |
| 7 | Key percentiles | `RiskAnalyticsPage.tsx:257` | HTML table | P5/25/50/75/95 terminal values | Transposed | One-row 5-column table; percentile→colour uses green/red on 75th/25th, implying "good/bad" about a quantile | **M** |
| 8 | Stress scenarios | `account-detail/shared.tsx:39` | plain divs | scenario → portfolio & position impact | **No** | Should be a comparison bar chart; the headline `%` is hard-coded `text-accent-red` even when positive; `.toFixed(0)` drops a decimal the table keeps | **H** |
| 9 | Factor exposure | `account-detail/RiskTab.tsx:39` | Recharts `BarChart` (vertical) | portfolio vs benchmark factor loadings | Close | Benchmark drawn as a filled grey bar — rule 58 says unfilled line or ink marker; `FACTOR_COLORS` is a 4th private palette (`RiskTab.tsx:11`); status red/green on a signed exposure | **H** |
| 10 | Growth of $100 (TWR) | `account-detail/PerformanceTab.tsx:30` | Recharts `LineChart` | portfolio vs benchmark index | Yes | No 10 % area wash (rule 56); 2 px line (spec 1.5–1.75); `<Legend/>` inside the plot (rule 57); x-tick `v.slice(5)` yields bare `03`, `04` | **M** |
| 11 | Benchmark comparison | `PerformanceTab.tsx:53` | `DataTable` | period returns vs bmk | Yes | — | **L** |
| 12 | Revenue trend | `growth/RevenuePage.tsx:126` | Recharts `LineChart` | monthly + projected revenue | Yes | **Visible data bug**: series drops to $0 for future months, drawing a cliff to zero (`revenue.png`); the dashed "Projected" line floats detached in the upper right; in-plot legend | **C** |
| 13 | Revenue by segment | `RevenuePage.tsx:149` | Recharts `BarChart` | 4 revenue values | **No** | 4 bars sitting directly above a table of the same 4 numbers; nominal categories coloured by identity for no reason | **H** |
| 14 | AUM by segment | `growth/BookAnalyticsView.tsx:102` | Recharts `BarChart` | 4 AUM values | **No** | Identical to #13, different file, same duplicated `SEGMENT_COLORS` | **H** |
| 15 | Client tenure distribution | `BookAnalyticsView.tsx:132` | Recharts `BarChart` | count by tenure bucket | Yes | Ordinal buckets should take an ordinal ramp (`--ordinal`), currently flat `--accent-blue`; acceptable, low priority | **L** |
| 16 | Client growth trend | `BookAnalyticsView.tsx:151` | Recharts `LineChart` ×3 | new / attrition / net-new | **No** | Net-new is *derived* from the other two — plotting all three as peers triple-encodes; should be a diverging column (new up, attrition down) with net as a line | **H** |
| 17 | NBA acceptance trend | `dashboard/NBAEffectivenessContent.tsx:69` | Recharts grouped `Bar` | accepted vs dismissed | Marginal | Two parts of one whole shown side-by-side; hard-coded `#059669`/`#DC2626` bypassing even the local tokens | **M** |
| 18 | Completion rate & revenue impact | `NBAEffectivenessContent.tsx:87` | Recharts `LineChart`, **two y-axes** | % and $ on one plot | **No** | **Dual-axis — the skill's #1 anti-pattern.** Duplicated verbatim in `NBAEffectivenessPage.tsx` | **C** |
| 19 | Effectiveness by category | `NBAEffectivenessContent.tsx:106` | CSS grid + mini bars | 7 metrics × N categories | **No** | A `DataTable` reimplemented as `grid-cols-8` divs: no sort, no header semantics, no `aria-sort`; `bg-amber-500` off-token | **H** |
| 20 | Match-rate trend | `reconciliation/ReconciliationPage.tsx:91` | Recharts `LineChart` ×3 | 3 match rates, 30 d | **No** | Axis truncated to 97–100 %, so three near-identical lines overlap into a braid (`reconciliation.png`); should be deviation-from-100 or small multiples | **H** |
| 21 | Open breaks | `ReconciliationPage.tsx:109` | Recharts `BarChart` | daily break count | Yes | Entire series painted `--accent-red` — status colour on a plain count; zero-days render as gaps that read as missing data | **M** |
| 22 | Model allocation snapshot | `ModelGovernancePage.tsx:127`, `:236` | CSS flex | model target weights | **Yes — the only correct allocation form** | Rival Tailwind colour map incl. `bg-gray-400`; `overflow-hidden` + inline `%` labels = the clipping anti-pattern; `gap-1` (4 px) not the 2 px surface gap; `text-white` regardless of fill luminance | **H** |
| 23 | Capacity meters | `BookOfBusinessPage.tsx:147`, `:162` | CSS bars | client & meeting utilisation | Marginal | Two meters in two different hues (blue, purple) for the same kind of quantity; track is `surface-tertiary` not a lighter step of the fill ramp; `%` label detached below-right | **M** |
| 24 | Goal progress | `components/ui/GoalProgressCard.tsx:48` | CSS bar | funded vs target | Yes | `bg-amber-500` (2.15:1) is off-token; no target/threshold marker; probability % and funding % sit side by side meaning different things | **M** |
| 25 | Revenue concentration (HHI) | `BookOfBusinessPage.tsx:242` | number in a box | Herfindahl index | **No** | 1828 is meaningless without its 1500/2500 bands — this is a meter, not a stat tile | **M** |
| 26 | Data-quality bar | `reconciliation/DataQualityPanel.tsx:43` | CSS bar | completeness | Yes | 5th independent progress-bar implementation | **M** |
| 27 | Workflow progress | `workflows/WorkflowCenterPage.tsx:181` | CSS bar | steps complete | Yes | 6th | **L** |
| 28 | Onboarding progress | `onboarding/steps/DocumentsStep.tsx:25` | CSS bar | docs received | Yes | 7th | **L** |
| 29 | NBA accept-rate mini bars | `NBAEffectivenessContent.tsx:134` | CSS bar | accept rate | Yes | 8th; thresholds green/amber/red inline | **L** |
| 30 | KPI strip | `components/ui/DenseMetricsBar.tsx` | HTML | 4–8 headline numbers | Yes | No sparkline slot (the brief lists Sparkline as one of five mandatory data components); label is 11 px uppercase ✓ but not `--tracking-caps` | **M** |
| 31 | Metric card | `components/ui/MetricCard.tsx` | HTML | KPI + delta | Yes | No trend/sparkline; `change.value` is free text ("Above target"), so a *label* wears the delta colour | **M** |
| 32 | Risk metric card | `account-detail/shared.tsx:16` | HTML | risk ratio | Yes | **Third** stat-tile implementation; `negative` prop paints the value red permanently — Max Drawdown is always red even when it improves | **H** |
| 33 | Stat cell | `account-detail/shared.tsx:27` | HTML | KPI in a grid | Yes | **Fourth** stat-tile implementation | **M** |
| 34 | Data table | `components/ui/DataTable.tsx` | TanStack | the product's core surface | Yes | Good `aria-sort` and keyboard rows; but no numeric right-alignment default (rule 34), no column-level `tabular-nums`, no sticky first column, no density token, no per-cell sparkline/bar cell type | **H** |

`components/ui/FamilyTree.tsx` is a relationship diagram rather than a chart and is out of scope here.

---

## 3. Form problems

### 3.1 Allocation is a donut (C) — `AllocationChart.tsx:76`
The brief's rule 55 is unambiguous, and the dataviz skill agrees for a second reason: a donut is
"part-to-whole at a glance only, ≤ 6 segments," and this one is fed up to 10 asset classes. In
`client-detail.png` the two blue arcs (US Equity 42 %, Intl Equity 12 %) are adjacent and
near-identical — a reader cannot find the boundary.

**Replace with** a horizontal 100 %-stacked bar: full width, 24 px tall, 2 px surface gaps between
segments, in-bar label only where it fits, legend below as label + swatch + value. This is
`ModelGovernancePage.tsx:127` promoted to a real component. Keep the donut nowhere; if a compact
form is needed (`RichCard`, list rows) use a 4 px-tall stacked strip, not a mini pie.

### 3.2 Four bars sitting on a table of the same four numbers (H) — `RevenuePage.tsx:149`, `BookAnalyticsView.tsx:102`
"More than ~7 classes → table. Four values you can read → the table *is* the chart." Both cards
render a bar chart and then the identical numbers immediately below it. **Delete the bar charts;**
keep the table and add an inline bar cell (a 60 px track in slot-1 hue) to the revenue column. That
gets the magnitude comparison and the exact figures in one object at a third of the height.

### 3.3 Dual axis (C) — `NBAEffectivenessContent.tsx:87`, duplicated in `NBAEffectivenessPage.tsx:99`
```tsx
<YAxis yAxisId="left"  domain={[0, 100]} unit="%" />
<YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
```
Completion rate (%) and revenue impact ($) share a plot with two arbitrary scales, inventing a
correlation. **Replace with** two stacked small multiples on a shared x, or index both to 100 at t0
on a single axis. This is the single most defensible "expert would flag this" finding in the app.

### 3.4 Sensitivity drawn as diverging columns (H) — `RiskAnalyticsPage.tsx:168`
Shock size is a *continuous ordered* variable (−30 %…+30 %). A response to a continuous input is a
**line/curve**, not columns; drawing it as columns hides the convexity that is the entire point of a
sensitivity analysis. Worse, red/green per bar re-encodes the sign the y-axis already carries, and
burns the status channel on a non-status quantity.

**Replace with** (a) a single line in slot-1 hue with the 10 % area wash, zero-crossing marked, one
direct label on each end; and (b) a **tornado diagram** across the three factors — bars for
interest-rate, equity and credit sensitivity at the same ±1σ shock, sorted by absolute magnitude,
centred on zero, diverging pair (rust ↔ moss). That is the established correct form and it is
currently *impossible* to see because the three factors are behind mutually-exclusive tabs.

### 3.5 Monte Carlo as a histogram (H) — `RiskAnalyticsPage.tsx:223`
The service returns `percentiles[]` *and* `horizon` *and* `histogram[]`. A Monte Carlo over a
horizon has one canonical form: the **fan chart** — median line with nested percentile bands
(5–95, 25–75) shaded from the same hue, one axis, a target/goal line overlaid. The histogram is the
terminal-value slice only; it throws away the time dimension and cannot answer "when does the plan
break." Keep the histogram as an optional secondary panel with P5/P50/P95 marked *on* it, but lead
with the fan.

### 3.6 Stress scenarios as text rows (H) — `account-detail/shared.tsx:39`
Five scenarios × one impact number each is exactly the case for a **horizontal bar chart sorted by
severity**, with the current VaR(95 %) drawn as a reference rule so the reader can see which
historical scenarios exceed the modelled loss. Today they are five unranked paragraphs, and
`text-accent-red` is hard-coded on the headline even for a positive impact (`shared.tsx:47`).

### 3.7 Treemap where a bar reads better (M) — `ConcentrationView.tsx:125`
The concentration question is "which positions breach the IPS limit, and by how much." A treemap
answers "how is the whole divided" — the wrong question, and rectangle area is the hardest channel
to compare. **Replace with** a sorted horizontal bar chart of the top ~15 positions with each
position's IPS limit drawn as an ink target marker (rule 58) on its bar; breaches then read as
"bar past the tick," which is instant. Keep the treemap only if the goal is genuinely the whole
book's texture.

### 3.8 Charts that should be tables (H)
- #19 `NBAEffectivenessContent.tsx:106` — a 7-column table reimplemented as CSS grid. Use `DataTable`.
- #7 `RiskAnalyticsPage.tsx:257` — transposed one-row table; make percentiles rows.

### 3.9 Tables that should carry charts (M)
`DataTable` has no bar-cell or sparkline-cell. The drift column on `portfolios.png`, the tenure
column, the revenue column and the match-rate KPIs are all crying out for an in-cell mark.

### 3.10 Decorative rather than informative (M)
- `HouseholdListView.tsx:233` — a legend-less, label-less 6-slice donut per household card, fed
  from a **segment template**, not the household's data. It is pure ornament and it is untrue.
- `HouseholdDetailPage.tsx:231` and `:268` render the *same* allocation donut twice on one page.

---

## 4. Attribution & risk deep-dive

### 4.1 The Brinson waterfall does not do Brinson (C)

`AttributionPage.tsx:63`:
```ts
const waterfallData = (attribution ?? []).map((a) => ({ label: ..., value: a.total }))
```
`WaterfallChart` then runs a cumulative sum of per-asset-class **totals**. Arithmetically that is a
valid "contribution to active return by asset class" bridge — the classes do sum to total active
return. But the page is titled *Performance Attribution*, the CTA that leads to it says
*"View Brinson Attribution Analysis"* (`PerformanceTab.tsx:61`), and the Brinson decomposition —
allocation, selection, interaction — appears **only in the table below**. The chart drops the
`interaction` field entirely. The domain skill is explicit: `R_p − R_b = ΣA_i + ΣS_i + ΣI_i`.
The headline visual must show that identity.

Two correct forms, both better than what ships:

- **Effect waterfall (recommended):** `Benchmark return → Allocation → Selection → Interaction →
  Portfolio return`, with the two end bars as totals anchored to the baseline and the three middle
  bars floating. Five bars, one sentence, and it *is* the Brinson identity.
- **Per-class stacked bar:** one bar per asset class, segmented into allocation / selection /
  interaction (diverging around zero), sorted by total. Answers "which class, and was it the bet or
  the picks."

Ship the effect waterfall as the hero and the per-class stacked bar as the second card; keep the
existing table as the table view.

Additional defects in the same area:

- **The three summary cards don't add up (H).** `AttributionPage.tsx:122–124` shows Total
  Allocation, Total Selection and Total Active — but no Interaction card, so the first two visibly
  fail to sum to the third. Add the interaction card, or label the third "Total active
  (A + S + I)."
- **`showTotal` builds an incorrect total when values are mixed-sign relative to a base**
  (`WaterfallChart.tsx:40`) — the total bar spans `0 → running`, which is right only because the
  bridge starts at zero. It will silently break the moment this component is reused for the AUM
  bridge (which starts at $83 M). Two waterfall implementations exist precisely because of this;
  one generalised component with an explicit `baseline` prop fixes both.
- **Dashed connectors and a dashed zero line** (`WaterfallChart.tsx:57`, `:70`) — the skill and
  rule 57 both prohibit dashed chrome; dashing reads as "projection."
- **A value label on every bar** (`WaterfallChart.tsx:87`) with `+` forced on all non-negatives —
  the anti-pattern is explicit, and rule 21 requires a true minus `−` (U+2212), which
  `toFixed()` never produces.
- **Rotated −30° x labels** with no measurement — at eight asset classes on a narrow container these
  will collide.

### 4.2 AUM waterfall — right form, unreadable scale (C)

`book.png` is the proof: `AUMWaterfall` (`BookOfBusinessPage.tsx:39`) plots a $83 M → $91 M bridge
on an axis anchored at $0. Market appreciation, new assets, withdrawals and attrition are each a
few million on a 91-million axis, so four of the six bars render as 1–3 px slivers. The chart shows
"AUM was big and stayed big" — which is not what a decomposition is for.

Fix: either (a) break the axis and start the domain at `min(start, end) − 10 % of the delta range`,
or (b) plot the *deltas* on their own scale as a diverging column chart with start/end as annotated
reference rules. Add the connector lines (present in the D3 version, absent here) — a waterfall
without connectors loses the "running total" reading entirely.

### 4.3 Monte Carlo (H)

Covered in 3.5. Additional points:
- `percentileColor()` (`RiskAnalyticsPage.tsx:36`) paints the 25th percentile red and the 75th
  green. A quantile of a distribution is not good or bad; this is status colour on a positional
  scale, and it will read as "the 25th percentile outcome is a failure" — which is a compliance
  problem in a fiduciary product, not just a viz one.
- No goal/target line, so the chart cannot answer the only question a client asks: *does this fund
  my plan?* The planning module already has `goal.targetAmount` and `goal.probability`.
- The `10,000 sims / 1Y` badge is the right instinct — keep it, move it under the title as a caption
  with the model assumption, per the brief's compliance register ("estimated", "as of").

### 4.4 Sensitivity / tornado (H)

Covered in 3.4. The one structural point worth repeating: a tornado diagram compares
sensitivities *across* factors. The current tab control makes that comparison impossible by
construction. The three factors should be three bars in one chart, with the tabs (if kept) only
switching the *shock magnitude*.

### 4.5 Stress scenarios (H)

Covered in 3.6. Also: `StressScenarioRow` prints `(scenario.portfolioImpact * 100).toFixed(0)%` —
zero decimals on the headline, two on the position rows. Rule 23 says returns carry two decimals.
The position impacts inside each card are a good candidate for a small horizontal bar list, and the
whole set should be sortable by severity.

### 4.6 Factor exposure (H)

`RiskTab.tsx:50` draws the benchmark as a filled grey bar next to the portfolio bar. Rule 58:
**benchmarks are an unfilled line or an ink target marker.** Redraw as a single portfolio bar per
factor with a 2 px ink tick at the benchmark value — the reader then sees *active* exposure as the
gap, which is the quantity that matters. Also drop the red/green fill: a negative factor loading
is not "bad."

---

## 5. Colour audit

### 5.1 What is in use today (all hexes verbatim from source)

| Palette | File | Hexes |
|---|---|---|
| Asset classes (10) | `lib/chart-colors.ts:1` | `#2563EB #3B82F6 #60A5FA #059669 #8B7EC8 #D97706 #DC2626 #94A3B8 #F59E0B #0891B2` |
| Asset classes (rival, Tailwind classes) | `ModelGovernancePage.tsx:41` | `bg-blue-500 bg-indigo-500 bg-violet-500 bg-emerald-500 bg-amber-500 bg-orange-500 bg-yellow-500 bg-gray-400 bg-purple-500 bg-purple-500` |
| Segments (×3 copies) | `RevenuePage.tsx:28`, `BookAnalyticsView.tsx:15`, `BookOfBusinessPage.tsx:14` | `#8B7EC8 #D97706 #94A3B8 #2563EB` (+`#CBD5E1` in one) |
| Factors | `RiskTab.tsx:11` | `#2563EB #DC2626 #94A3B8` |
| App accents (light) | `index.css:178` | blue `#2563EB` green `#059669` red `#DC2626` purple `#8B7EC8` amber `#D97706` |
| App accents (dark) | `index.css:194` | `#3B82F6 #10B981 #EF4444 #A99DE0 #F59E0B` |
| Ad-hoc | `NBAEffectivenessContent.tsx:75,76,94,95`, `GoalProgressCard.tsx:8` | `#059669 #DC2626 #2563EB #8B7EC8`, `bg-amber-500` |

### 5.2 Validator results — everything fails

```
ASSET_CLASS (8 of 10 slots), light, surface #FFFFFF
  [PASS] Lightness band
  [FAIL] Chroma floor        #94A3B8 C=0.035 — reads gray, does no identity work
  [WARN] CVD separation      #3B82F6↔#2563EB ΔE 6.4 deutan
  [FAIL] Normal-vision floor #3B82F6↔#2563EB ΔE 8.2 — hard gate, below 15
  [WARN] Contrast vs surface #60A5FA 2.54:1, #94A3B8 2.56:1

ASSET_CLASS, dark, surface #1E293B
  [FAIL] Lightness band      #60A5FA L=0.714, #94A3B8 L=0.711 outside 0.48–0.67
  [FAIL] Chroma floor        #94A3B8
  [FAIL] Normal-vision floor #3B82F6↔#2563EB ΔE 8.2
  [WARN] Contrast            #2563EB 2.83:1

SEGMENT_COLORS, light, --pairs all
  [FAIL] Lightness band      #CBD5E1 L=0.869
  [FAIL] Chroma floor        #94A3B8 0.035, #CBD5E1 0.02
  [FAIL] Normal-vision floor #94A3B8↔#8B7EC8 ΔE 11.3
  [WARN] Contrast            #94A3B8 2.56:1, #CBD5E1 1.48:1
```

**The critical one (C):** `us_equity #2563EB` and `intl_equity #3B82F6` sit at ΔE 8.2 under *normal*
vision, and they are adjacent slices in the donut on every client and household page. The skill is
explicit that a sub-15 normal-vision floor "is a hard gate — secondary encoding does not excuse
this one." Two of the ten slots (`#94A3B8` cash, `#CBD5E1`) are effectively grey and cannot carry
identity at all; `#8B7EC8`/`#94A3B8` is another sub-floor pair.

**Semantics (C):** the brief says positive = moss `#365A39`, negative = rust `#A8452F` (rule 7).
The app uses `#059669` / `#DC2626` — generic web green/red — in *every* delta, cell, badge, bar and
line. That is a one-line token change that fixes ~40 call sites.

**Status colours used as series colours (H):** `--accent-green`/`--accent-red` paint the sensitivity
bars, the waterfall bars, the factor bars, the growth-trend lines and the whole reconciliation
break series. The skill's rule: status tokens only where the colour *means* good/bad.

**Colour-blindness in dark mode (H):** the dark palette is an automatic re-pick of Tailwind's 400/500
steps, not a *selected* dark set. Two slots fall outside the dark lightness band, and the pair that
fails in light mode fails identically in dark (the two blues are unchanged in the asset map — the
map has no dark variant at all, so `#2563EB` renders at 2.83:1 on the `#1E293B` dark card).

### 5.3 The Meridian `--viz-1…8` sequence also fails — and here is the fix

This is worth flagging back to the design-system owner. Run verbatim against the Meridian cream
surface `#FDFBF7`:

```
--viz-1..8  #4C553A,#8C9663,#C08A2E,#B45C3C,#7E3020,#4C6272,#9A8C77,#DED3C0
  [FAIL] Lightness band      #7E3020 L=0.418, #DED3C0 L=0.871
  [FAIL] Chroma floor        #4C553A 0.044, #8C9663 0.072, #4C6272 0.037,
                             #9A8C77 0.035, #DED3C0 0.028
  [FAIL] CVD separation      viz-2↔viz-3 (#8C9663↔#C08A2E) ΔE 5.6 protan
  [FAIL] Normal-vision floor viz-2↔viz-3 ΔE 8.6
  [WARN] Contrast            #C08A2E 2.94:1, #DED3C0 1.43:1
```

Earth pigments are desaturated by construction, so the chroma floor cannot be met with this family —
that is a known and acceptable trade, mitigated by mandatory secondary encoding. The *separation*
failure is not acceptable and is fixable **by re-ordering the existing tokens, with zero new hexes.**

Validated recommendation — **light mode, cap at four series:**

| Slot | Token | Hex | Meaning |
|---|---|---|---|
| 1 | `--viz-1` olive-700 | `#4C553A` | first series |
| 2 | `--viz-3` ochre-500 | `#C08A2E` | second series |
| 3 | `--viz-6` slate-500 | `#4C6272` | third series |
| 4 | `--viz-4` terracotta-500 | `#B45C3C` | fourth series |

```
[PASS] Lightness band       all 4 inside 0.43–0.77
[PASS] CVD separation       worst adjacent #B45C3C↔#4C6272 ΔE 10.0 protan
[PASS] Normal-vision floor  worst adjacent ΔE 18.2
[FAIL] Chroma floor         #4C553A 0.044, #4C6272 0.037  (earth-pigment limitation)
[WARN] Contrast             #C08A2E 2.94:1
```

**Dark mode** (surface `#26221C`) takes the `-300` steps of the same four families:
`#8C9663, #E6C384, #7D97A8, #DFA98F` — `[PASS]` CVD ΔE 10.6, `[PASS]` normal-vision 16.1,
`[PASS]` contrast all ≥ 3:1.

Because the chroma floor and one contrast check land in WARN/FAIL, the **relief rule is mandatory
and non-negotiable**: every chart using these ships visible direct labels *and* a table view. That
is not a compromise — it is exactly the discipline the brief already asks for ("a screen earns each
element", "numbers are the copy").

**The corollary is the most important colour consequence:** ten asset classes cannot be coloured.
Fold to five + Other (equity, fixed income, alternatives, real assets, cash, other) — which is also
what the `asset-allocation` domain skill reports at — and give the 10-class detail to the table.

### 5.4 Other colour findings

- `contrastTextColor()` (`chart-colors.ts:28`) claims "Relative luminance (sRGB)" in its comment but
  implements the YIQ perceived-brightness formula, and picks white text at a 0.55 threshold. Result:
  **5 of 10 treemap tile labels fail 4.5:1** — `intl_equity` 3.68, `fixed_income` 3.77,
  `alternatives` 3.55, `real_estate` 3.19, `private_equity` 3.68 (M)
  The secondary weight label is drawn at `rgba(255,255,255,0.8)` (`TreemapChart.tsx:85`), worse again.
- Grid lines: `--border-primary` `#DEE5EE` on white = 1.27:1, dark `#334155` on `#1E293B` = 1.41:1 —
  both close enough to the brief's "12 % ink" that only the hue is wrong (cool, not warm). (L)
- `bg-amber-500` `#F59E0B` at 2.15:1 appears in `GoalProgressCard.tsx:8` and
  `NBAEffectivenessContent.tsx:136` as an "at risk" state — outside both token sets. Use
  `--status-warning` `--ochre-700 #8E6418` (5.10:1 on cream). (M)
- `bg-gray-400` in `ModelGovernancePage.tsx:47` is a pure grey — rule 2 forbids equal-RGB neutrals
  anywhere in the palette. (M)

---

## 6. Marks, axes, labels, tooltips

**Marks**
- **Bar thickness is uncapped.** `risk.png` shows sensitivity bars ~120 px wide. Spec: ≤ 24 px, with
  the band's leftover as air. Apply `maxBarSize={24}` on every Recharts `<Bar>`; the D3 charts need
  an explicit cap on `x.bandwidth()`. (H)
- **Rounded ends point the wrong way on negative bars.** `radius={[4,4,0,0]}` is applied
  unconditionally at `RiskAnalyticsPage.tsx:185,242`, `RevenuePage.tsx:155`,
  `BookAnalyticsView.tsx:115,141`, `NBAEffectivenessContent.tsx:75,76`. On a downward bar the
  rounding lands at the *baseline* and the data-end is square — the opposite of the spec. (M)
- **Line weight is 2 px everywhere;** the brief says 1.5–1.75 px (rule 56). (M)
- **No area wash on any line chart.** Rule 56 requires a 10 % fill. Zero `<Area>` usage in `src/`. (H)
- **No surface gaps.** Stacked/adjacent marks touch; `ModelGovernancePage` uses `gap-1` (4 px), the
  donut uses `paddingAngle={1}`, Recharts stacks use nothing. Standardise on a 2 px surface gap. (M)
- **A stroke is used to separate marks** — `AllocationChart.tsx:97` adds a 2 px `--text-primary`
  stroke on hover, and `TreemapChart.tsx:63` a 2 px red stroke on breach. The spec calls for a
  surface ring, not a border; and the breach stroke makes colour+stroke the sole breach encoding. (M)

**Axes & grid**
- **`strokeDasharray="3 3"` on every `CartesianGrid`** — 9 occurrences. Rule 57 and the anti-pattern
  catalog both require solid hairlines. (H)
- **Dashed zero line and dashed connectors** in `WaterfallChart.tsx:57,70`. (M)
- **Axis boxes:** `WaterfallChart.tsx:115` re-strokes `.domain` — rule 57 says no axis boxes; strip
  the domain path and keep only the baseline. (M)
- **Truncated axis on near-identical series** — `ReconciliationPage.tsx:91` (97–100 %). Either plot
  deviation from 100 %, or facet. (H)
- **Zero-anchored axis on a delta bridge** — `BookOfBusinessPage.tsx:74`. (C, see 4.2)
- **Tick density** is left to Recharts defaults everywhere; `revenue.png` and
  `reconciliation.png` both show 15 x-labels crammed into ~700 px. (M)

**Labels & formatting**
- **`formatPercent()` always prefixes `+`** (`lib/utils.ts:73`). That is right for a *change* and
  wrong for a *share* — hence `book.png` reading "% of AUM **+64.1 %**"
  (`BookOfBusinessPage.tsx:128`). Split into `formatDelta()` and `formatWeight()`. (H)
- **No true minus anywhere.** `toFixed()` emits U+002D; rule 21 requires U+2212. Affects every
  negative figure in the app. (H)
- **Decimal rules inconsistent** (rules 22/23: weights 1 dp, returns 2 dp): drift uses 1 dp,
  attribution 2 dp, stress-scenario headline 0 dp, HHI 4 dp in one place and 0 dp in another
  (`ConcentrationView.tsx:95` vs `BookOfBusinessPage.tsx:202`). (M)
- **A number on every bar** — `WaterfallChart.tsx:87`. Label selectively. (M)
- **x-tick `v.slice(5)`** yields bare `03`, `04` with no year and no month name
  (`PerformanceTab.tsx:33`, `RevenuePage.tsx:129`, `BookAnalyticsView.tsx:157`). (M)
- **No direct end-labels on any line chart** — every line relies on the legend. (M)

**Legends**
- **In-plot legends** — `<Legend/>` with default positioning at `PerformanceTab.tsx:38`,
  `RevenuePage.tsx:134`, `RiskTab.tsx:51`, `BookAnalyticsView.tsx:161`,
  `NBAEffectivenessContent.tsx:74,93`, `ReconciliationPage.tsx`. Rule 57 forbids it. (H)
- **A legend on a single-series chart** is absent (good), but a *legend-less multi-series* chart
  exists: `AllocationChart` with `showLegend={false}` in `HouseholdListView.tsx:236` and
  `RichCard.tsx:50`. (C — see §7)

**Tooltips**
- Three tooltip designs: a bespoke card (`AllocationChart.tsx:31`), a second bespoke card
  (`BookOfBusinessPage.tsx:24` — which also calls `useFormatCurrency()` inside a render-prop
  component, a hook-in-conditional-render smell), and raw `contentStyle` on eight other charts.
  They differ in padding, border, shadow and whether the value is mono. (H)
- The D3 charts (`TreemapChart`, `WaterfallChart`) have **no tooltip at all** — only a native
  `title` attribute on the model bars, which is not keyboard-reachable. (H)
- No crosshair on any line chart. The skill makes crosshair+tooltip the default for line/area. (M)

**Empty & loading states**
- Loading is `<Skeleton>` with — per `index.css` — an animated shimmer. Rule 48: *no skeleton
  shimmer*; loading is a static ghost row or a `loader` glyph. (M)
- Empty states are ad-hoc strings in six different phrasings ("No sensitivity data available",
  "No attribution data", "No positions above 2% weight", "Unable to load NBA effectiveness data",
  …). `EmptyState.tsx` exists and is not used by any chart. (M)
- `TreemapChart` and `WaterfallChart` `return` early on empty data leaving a **blank sized SVG** —
  no message at all. (M)
- Refetch drops to a skeleton rather than holding the previous render at reduced opacity. (L)

---

## 7. Accessibility

1. **Colour is the sole encoding in the small donut (C).** `HouseholdListView.tsx:236` and
   `RichCard.tsx:50` pass `showLegend={false}`. Six slices, no labels, no legend; the only route to
   a value is a mouse hover. That is simultaneously the "tooltip as the only way to read a value"
   and the "colour-only encoding" anti-patterns, and it is unusable by keyboard.
2. **Fourteen of fifteen chart surfaces have no text alternative (C).** Only `AllocationChart.tsx:74`
   sets `role="img"` + `aria-label`. Recharts' `accessibilityLayer` is not enabled anywhere.
3. **No table view exists for any chart.** The skill requires a WCAG-clean twin. Some pages happen
   to have a related table (attribution, revenue), but nothing is wired as *the same data*.
4. **Contrast failures under 3:1 for marks**: `#60A5FA` 2.54:1 and `#94A3B8` 2.56:1 on white;
   `#2563EB` 2.83:1 on the dark card. Under the relief rule these obligate visible labels — none are
   present on the donut arcs. (H)
5. **Treemap label contrast**: 5 of 10 fills produce sub-4.5:1 text (§5.4). (M)
6. **The IPS breach indicator is a `⚠` unicode character** (`TreemapChart.tsx:103`) — rule 27 bans
   unicode-as-icon, and it carries no accessible name. Use a Lucide `triangle-alert` mask plus a
   text badge. (M)
7. **D3 charts are not keyboard reachable at all** — no `tabIndex`, no focus ring, no `figure`/
   `figcaption`, click handlers on bare `<g>` elements (`TreemapChart.tsx:52`). (H)
8. **Chart animation on mount** (no `isAnimationActive={false}`) has no `prefers-reduced-motion`
   guard, and violates rule 49 independently. (H)
9. **Delta direction is conveyed by icon + colour** in `MetricCard`/`DenseMetricsBar` — this part is
   done correctly (icon + label, never colour alone). Keep it. ✓
10. **`DataTable` sorting is accessible** (`aria-sort`, keyboard rows) — also good. Missing: numeric
    columns are not right-aligned by default (rule 34) and carry no `tabular-nums`. (M)

---

## 8. The chart system that should exist

Today there are **zero shared chart primitives** — `AllocationChart`, `TreemapChart` and
`WaterfallChart` are three unrelated components, and eleven more charts are inline in feature files.
The following eight primitives would let all ~34 surfaces compose, and would collapse an estimated
1,400 lines of chart code to under 500.

**Layer 0 — tokens** (`src/styles/viz.css`, consumed by every primitive)

```css
:root {
  --viz-1:#4C553A; --viz-2:#C08A2E; --viz-3:#4C6272; --viz-4:#B45C3C;  /* validated 4-slot order */
  --viz-pos:#365A39;  --viz-neg:#A8452F;   /* moss / rust — rule 7 */
  --viz-grid:rgba(88,78,65,.12); --viz-axis:var(--stone-500);
  --viz-wash:.10; --viz-line-w:1.6px; --viz-bar-max:24px; --viz-gap:2px;
}
[data-theme="dark"]:root {
  --viz-1:#8C9663; --viz-2:#E6C384; --viz-3:#7D97A8; --viz-4:#DFA98F;
}
```

**Layer 1 — the frame**

```ts
// ChartFrame — every chart's outer shell. Owns title, caption, legend placement (always
// OUTSIDE the plot, per rule 57), loading, empty, error, the table-view toggle, and the
// aria-label/description. No chart is allowed to render without going through this.
type ChartFrameProps = {
  title: string
  caption?: string            // "as of 2026-07-24 · net of fees" — the compliance register
  series: SeriesSpec[]        // drives the legend AND the aria description
  state: 'ready' | 'loading' | 'empty' | 'error'
  emptyMessage?: string
  tableView: React.ReactNode  // mandatory — the WCAG-clean twin
  action?: React.ReactNode
  children: React.ReactNode
}
```

**Layer 2 — the six chart primitives**

```ts
// 1. AllocationBar — replaces AllocationChart (donut), ModelGovernance's hand-rolled bar,
//    RichCard's mini pie, HouseholdListView's ornament. Rule 55's answer.
type AllocationBarProps = {
  data: { key: string; label: string; weight: number; value?: number }[]
  target?: { key: string; weight: number }[]   // renders an ink target tick per segment (rule 58)
  height?: 4 | 12 | 24                          // strip | inline | full
  maxSeries?: number                            // default 4; the rest fold to "Other"
  labels?: 'inside-if-fits' | 'below' | 'none'  // never clipped — measured before render
}

// 2. TrendChart — replaces 6 LineCharts. One axis, always.
type TrendChartProps = {
  data: Row[]
  x: keyof Row
  series: { key: keyof Row; label: string; emphasis?: boolean }[]  // >4 → facet, never a 2nd axis
  benchmark?: { key: keyof Row; label: string }   // unfilled 1px ink line — rule 58
  wash?: boolean                                   // 10% area, default true for 1 series
  directLabel?: 'end' | 'extreme' | 'none'
  yFormat: (n: number) => string
  band?: { lower: keyof Row; upper: keyof Row }[]  // ← this is also the Monte Carlo fan chart
}

// 3. CategoryBars — replaces 6 BarCharts + the sorted-bar concentration view + the tornado.
type CategoryBarsProps = {
  data: { key: string; label: string; value: number; target?: number }[]
  orientation?: 'horizontal' | 'vertical'
  sort?: 'value-desc' | 'value-abs-desc' | 'none'   // 'value-abs-desc' + diverging = tornado
  color?: 'single' | 'diverging' | 'categorical'    // default 'single' — nominal bars are ONE hue
  reference?: { value: number; label: string }      // VaR rule, IPS limit, policy band
  maxBarSize?: number                               // default 24
}

// 4. WaterfallChart — one implementation, generalised. Replaces both existing waterfalls.
type WaterfallProps = {
  baseline: number                        // 0 for attribution, startingAUM for the AUM bridge
  steps: { label: string; value: number; kind?: 'delta' | 'subtotal' | 'total' }[]
  autoScale?: boolean                     // domain from the delta range, not from 0 — fixes 4.2
  connectors?: boolean                    // solid hairline, default true
  format: (n: number) => string
}

// 5. Meter — replaces 8 hand-rolled progress bars + the HHI box.
type MeterProps = {
  value: number
  max: number
  bands?: { upto: number; tone: 'good'|'warning'|'critical' }[]  // HHI 1500/2500, drift ±3%
  target?: number                                                 // ink tick
  label: string
  valueLabel: string
}

// 6. Sparkline — the brief's fifth data component; does not exist today.
type SparklineProps = { data: number[]; trend?: 'up-good' | 'down-good'; width?: number }
```

**Layer 3 — the numeric components the brief names**

```ts
// StatTile — collapses MetricCard, RiskMetricCard, StatCell, DenseMetricsBar's cell into one.
type StatTileProps = {
  label: string                       // 11px uppercase, --tracking-caps
  value: string                       // 28px IBM Plex Mono, tnum + zero
  delta?: { value: number; period: string; upIsGood?: boolean }   // → DeltaValue
  trend?: number[]                    // → Sparkline
  density?: 'card' | 'bar'            // 'bar' renders inside DenseMetricsBar
}

// DeltaValue — "the only correct way to render a signed figure": true minus U+2212,
// two decimals (or bps under 1%), moss/rust, icon + label, never colour alone.
type DeltaValueProps = { value: number; unit: '%' | 'bps' | 'currency'; upIsGood?: boolean }
```

**Layer 4 — `DataTable` additions**: a `numeric` column flag (right-align + `tabular-nums`), a
`bar` cell renderer (reuses `Meter`), and a `sparkline` cell renderer. This alone removes the two
"bar chart above a table of the same numbers" cards and the CSS-grid pseudo-table.

**Composition check.** With these, the fifteen surfaces become:
allocation ×6 → `AllocationBar`; trend ×6 → `TrendChart`; bars ×8 → `CategoryBars`;
waterfalls ×2 → `WaterfallChart`; meters ×8 → `Meter`; stat tiles ×4 → `StatTile`;
Monte Carlo → `TrendChart` with `band`; tornado → `CategoryBars` sorted `value-abs-desc`;
concentration → `CategoryBars` with `reference`; stress → `CategoryBars` with `reference`.
Nothing is left over, and the treemap becomes optional rather than load-bearing.

---

## 9. Recharts vs D3

**Recommendation: consolidate on Recharts. Delete the D3 dependency.**

Current split: Recharts for 12 charts, D3 for exactly 2 (`TreemapChart`, `WaterfallChart`), and the
D3 pair are the *worst* components in the codebase by every measure in this review — no tooltip, no
keyboard access, no empty state, no theme reactivity (they read `var(--accent-green)` through
`.attr()`, which works but silently pins them to the legacy token names and re-renders only when
their `useEffect` deps change, so a theme toggle does **not** repaint them), imperative
`selectAll('*').remove()` teardown on every render, and 300 lines of layout code that Recharts
would give for free.

The reasoning per chart:

- **The waterfall does not need D3.** `BookOfBusinessPage.tsx:39` already proves it — a transparent
  base bar plus a visible bar in a Recharts stack is the standard technique, and it is 50 lines
  instead of 120, with tooltips, responsiveness and theming included. Consolidating also collapses
  the two divergent waterfall implementations into one, which is finding 4.2's fix anyway.
- **The treemap is the only genuine D3 case** — and §3.7 argues it should be a sorted bar chart, at
  which point the case disappears. If a treemap is kept for the whole-book view, `d3-hierarchy`
  alone is ~6 kB gzipped and can be imported as a single sub-package rather than all of `d3`
  (~90 kB gzipped for the umbrella import currently in `package.json`, plus `@types/d3`).
- **The Monte Carlo fan chart** needs stacked `<Area>` bands — native Recharts, no D3.
- **The tornado** is a horizontal `<BarChart>` with a diverging `<Cell>` fill — native Recharts.

**Bundle:** dropping `d3` + `@types/d3` removes roughly 90 kB gzipped for two components. Recharts
is already paid for.

**Maintenance:** one mental model, one tooltip component, one theming path, one place to set
`isAnimationActive={false}` and `maxBarSize={24}`. The primitives in §8 become a thin, testable
Recharts wrapper layer rather than two parallel rendering paradigms.

**The one caveat:** Recharts v2's `ResponsiveContainer` + `<Legend/>` defaults are the source of
several findings here (in-plot legends, animation, uncapped bars, wrong-way radii). Consolidating is
only a win *if* the `ChartFrame`/primitive layer is built at the same time and feature files are
forbidden from importing `recharts` directly. Add an ESLint `no-restricted-imports` rule for
`recharts` outside `src/components/charts/**` to make that stick.

---

## 10. Ranked recommendations (impact per effort)

| # | Recommendation | Effort | Why it ranks here |
|---|---|---|---|
| 1 | **Delete the dual-axis chart** (`NBAEffectivenessContent.tsx:87`, `NBAEffectivenessPage.tsx:99`) — split into two stacked small multiples | XS | The single most-recognised chart error in existence, on a page a reviewer will open. One deletion. |
| 2 | **Publish `--viz-*` tokens in the validated 4-slot order** and delete all four rival palettes (`chart-colors.ts`, `ModelGovernancePage.tsx:41`, the 3 `SEGMENT_COLORS` copies, `RiskTab.tsx:11`) | S | Fixes the CVD failures, the moss/rust semantics (rule 7), rules 9 and 3, and the "fifteen components" impression, in one commit. Zero new hexes — a pure re-order of the brief's tokens. |
| 3 | **Build `ChartFrame` + `AllocationBar`; replace the donut everywhere** | M | Rule 55 is the brief's most specific viz instruction; the donut appears on 6 surfaces and is where the ΔE 8.2 failure lives. Also kills the legend-less ornament donut. |
| 4 | **Fix the revenue-trend zero cliff** (`RevenuePage.tsx:126`) — null future months instead of 0, and connect Projected to the last actual point | XS | A visible, screenshot-legible data lie on the practice-management landing chart. |
| 5 | **Fix the AUM waterfall scale** (`BookOfBusinessPage.tsx:74`) — domain from the delta range, add connectors | XS | Four of six bars are currently invisible. One line of `domain` config. |
| 6 | **Global Recharts defaults**: `isAnimationActive={false}`, `maxBarSize={24}`, solid `CartesianGrid`, `<Legend/>` moved out of the plot, correct radius per bar sign | S | Clears rules 49, 56, 57 and four mark-spec violations across 12 charts at once. Best ratio in the list. |
| 7 | **Rebuild the attribution waterfall as the Brinson identity** (benchmark → allocation → selection → interaction → portfolio) and add the missing Interaction summary card | M | The most technically demanding visual in the product currently doesn't show the decomposition it is named after, and three cards visibly fail to add up. |
| 8 | **Split `formatPercent` into `formatDelta`/`formatWeight` and adopt U+2212** (`lib/utils.ts:73`) | XS | Fixes "% of AUM +64.1 %" and rules 21–23 in every number in the app. |
| 9 | **Monte Carlo → fan chart** via `TrendChart`'s `band` prop; mark P5/P50/P95 and the goal target; drop `percentileColor` | M | Turns a generic histogram into the canonical form, and removes an implied good/bad judgement on a quantile. |
| 10 | **Sensitivity → response curve + a real tornado across the three factors** | M | The tab control currently makes the tornado comparison structurally impossible. |
| 11 | **`Meter` primitive; replace 8 hand-rolled progress bars** and give HHI its 1500/2500 bands | S | Eight near-duplicates in one component, and turns a context-free "1828" into a readable risk statement. |
| 12 | **`StatTile` + `DeltaValue` + `Sparkline`**; collapse `MetricCard`/`RiskMetricCard`/`StatCell`/`DenseMetricsBar`; fix the permanently-red Max Drawdown | S | The brief names these as three of its five mandatory data components; two of the three don't exist. |
| 13 | **Add text alternatives + a table-view twin via `ChartFrame`** and enable Recharts `accessibilityLayer` | S | Takes chart accessibility from 1/15 to 15/15 with no per-chart work once the frame exists. |
| 14 | **Delete the two bar-charts-above-identical-tables** (`RevenuePage.tsx:149`, `BookAnalyticsView.tsx:102`); add a bar cell to `DataTable` instead | XS | Removes two charts and improves both cards. Pure subtraction. |
| 15 | **Migrate the two D3 charts to Recharts, drop `d3` + `@types/d3`**, and add `no-restricted-imports` for `recharts` outside the chart layer | M | ~90 kB gzipped, one rendering paradigm, and the enforcement that stops the fifteen-components problem from coming back. |

**Two things to fix regardless of ranking, because they are correctness rather than design:**
`HouseholdListView.tsx:24` (`ALLOCATION_TEMPLATES` presented as a household's real allocation) and
`ClientDetailPage.tsx:134` (hard-coded `CLIENT_ALLOCATION`). Both render invented numbers in a
fiduciary context.
