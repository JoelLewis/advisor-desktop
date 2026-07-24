# Meridian — component specs (verbatim from the design project)

Source: Claude Design project `cb15ae34-9c56-4478-b314-4ca5e5602fd2`, `components/*/*.prompt.md`.
Companion to `design-system-brief.md`. These are the authoritative component contracts.
Full `.jsx` implementations and `.d.ts` type definitions exist in the design project if a deeper
reference is needed — fetch on demand via DesignSync (main session only).

---

## core/

### Button
> The standard action control — use `primary` (espresso ink) for the single committing action in a view, `secondary` for everything else.

```jsx
<Button variant="primary" icon="plus">New proposal</Button>
<Button variant="secondary" size="sm" iconRight="chevron-down">This quarter</Button>
<Button variant="ghost" icon="download">Export</Button>
```

Variants: `primary`, `secondary`, `accent` (terracotta — **advisory/AI actions only, max one per screen**), `ghost` (toolbars, table rows), `danger` (destructive, **outline only**).
Sizes: **28 / 34 / 42px**.
Press state nudges 0.5px down and drops the shadow; **no scale, no bounce**.

### IconButton
> Square icon-only control for toolbars, row actions and panel headers — **always pass `label`**.

```jsx
<IconButton icon="sliders-horizontal" label="Filters" active />
<IconButton icon="x" label="Close" size="sm" />
```

`ghost` is the default (transparent, warm hover wash). `outline` when it sits on a cream surface with no neighbours. `inverse` on the ink nav rail.

### Card
> The standard content container — cream-white fill, hairline warm border, 12px radius, **no shadow unless it floats**.

```jsx
<Card eyebrow="Household" title="Asset allocation" action={<IconButton icon="ellipsis" label="More"/>}>
  <AllocationBar segments={segments}/>
</Card>
```

Tones: `default` (on cream page), `raised` (floating/overlay, shadow-md), `sunken` (nested inside a card), `accent` (advisory callout), `inverse` (ink — **one per screen maximum**).

### Badge
> Soft-tinted status label (4px radius, sentence case) for lifecycle and compliance states.

```jsx
<Badge tone="warning" dot>Drifted</Badge>
<Badge tone="positive" icon="check">Reconciled</Badge>
```

Tone maps to **meaning, not decoration**: positive = moss, negative = rust, warning = ochre, info = slate, accent = terracotta (advisory). Use `Tag` instead for user-applied labels and filters.

### Tag
> Pill chip for filters and user-applied labels — **the only pill-shaped element in the system**.

```jsx
<Tag selected onRemove={()=>{}}>Retirement</Tag>
<Tag onClick={()=>{}}>Taxable</Tag>
```

Selected = filled ink. Use `Badge` for system-derived status instead.

### Icon
> Monochrome Lucide glyph that inherits `currentColor` — the only icon primitive in Meridian; **never hand-roll SVG**.

```jsx
<Icon name="chart-pie" size={16} />
<Icon name="arrow-up-right" size={14} style={{color:'var(--status-positive)'}} />
```

Sizes: 14 inline with 13px text, 16 in buttons/rows, 18–20 in the nav rail. Set colour on the parent (buttons already do). `strokeless` dims to 70% for secondary affordances.

---

## forms/

### Input
> Labelled text field; set `numeric` for **any money, rate or account-number input** so figures render in tabular mono.

```jsx
<Input label="Target allocation" numeric suffix="%" defaultValue="62.5" hint="Drift tolerance ±3%"/>
<Input label="Household name" icon="search" placeholder="Search households"/>
<Input label="Notes" textarea/>
```

Focus = olive border + 3px olive wash. Error = rust border, **message replaces the hint**.

### Select
> Styled native select — same metrics as Input, for closed sets of **3+ options**.

```jsx
<Select label="Account type" options={['Taxable','Traditional IRA','Roth IRA','Trust']}/>
```

Fewer than 4 short options in a toolbar? Use `Tabs variant="segmented"` instead.

### Checkbox
> 16px checkbox for multi-select and consent rows; `indeterminate` for table "select all" headers.

```jsx
<Checkbox label="Include held-away accounts" description="Aggregated via Plaid" checked onChange={fn}/>
```

### Radio
> Single-choice control for 2–5 visible options (risk tolerance, billing frequency).

```jsx
<Radio name="risk" label="Moderate growth" description="60/40 target, ±3% drift" checked onChange={fn}/>
```

### Switch
> Toggle for settings that **take effect immediately** — label left, control right, olive when on.

```jsx
<Switch label="Drift alerts" description="Notify me when any sleeve moves ±3%" checked onChange={fn}/>
```

Use `Checkbox` instead inside forms that are submitted.

---

## navigation/

### Tabs
> Page-level section switcher (`underline`, terracotta indicator) or compact in-toolbar switch (`segmented`).

```jsx
<Tabs items={[{value:'overview',label:'Overview'},{value:'holdings',label:'Holdings',count:34}]} value={tab} onChange={setTab}/>
<Tabs variant="segmented" items={[{value:'1y',label:'1Y'},{value:'3y',label:'3Y'}]} value={range} onChange={setRange}/>
```

---

## feedback/

### Dialog
> Modal for decisions that **block the flow** (trade approval, destructive confirms); positions absolutely inside the nearest positioned ancestor.

```jsx
<Dialog eyebrow="Rebalance" title="Approve 6 trades" onClose={close}
  footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary">Approve & submit</Button></>}>
  …
</Dialog>
```

16px radius, shadow-xl, ink scrim at 44% with a 2px blur. **Never stack two dialogs.**

### Toast
> Ink-panel toast confirming a **completed** action; anchor bottom-right, 24px from the edges, auto-dismiss in ~5s.

```jsx
<Toast tone="success" title="Proposal sent" message="Nakamura Family · e-signature requested"/>
```

**Only the glyph carries status colour — the panel is always ink.** Never use a toast for an error the user must resolve; use `Dialog` or an inline field error.

### Tooltip
> 12px ink tooltip for definitions and icon-only controls; fades in 120ms, **no arrow, never interactive**.

```jsx
<Tooltip content="Time-weighted return, net of fees"><span>TWR</span></Tooltip>
```

---

## data/

### StatTile
> Headline KPI tile — uppercase label, 28px tabular figure, optional delta and definition tooltip.

```jsx
<StatTile label="Total AUM" value="$1.42B" delta={2.14} deltaLabel="vs. Q1" definition="Market value of all managed accounts"/>
```

Put **3–5 in a row with 12px gaps**. Right-align (`align="right"`) only when the tiles sit above a right-aligned numeric table.

### DeltaValue
> **The only correct way to render a change figure — never colour a plain number by hand.**

```jsx
<DeltaValue value={1.42}/>
<DeltaValue value={-284100} format="currency" parenthesise showArrow={false}/>
```

Always tabular mono. Uses a **true minus (−), not a hyphen**. `parenthesise` for statement/table contexts.

### DataTable
> The data surface of the advisor desktop — sticky uppercase headers, 1px hairline rows, **no vertical rules, no zebra striping**.

```jsx
<DataTable
  columns={[{key:'name',label:'Household',width:'32%'},
            {key:'aum',label:'AUM',align:'right',numeric:true,sortable:true},
            {key:'ytd',label:'YTD',align:'right',render:r=><DeltaValue value={r.ytd} showArrow={false}/>}]}
  rows={rows} sort={sort} onSort={setSort} onRowClick={open}/>
```

**Right-align every numeric column and set `numeric`** so figures line up. Row hover is a warm cream wash; the selected row uses `--surface-inset`.

### AllocationBar
> 100%-stacked allocation bar — **the default allocation graphic in Meridian (use it before reaching for a donut)**.

```jsx
<AllocationBar segments={[{label:'US equity',value:48},{label:'Intl equity',value:17},{label:'Fixed income',value:26},{label:'Cash',value:9}]}/>
```

Colours come from `--viz-1…8` **in order**; override per segment only to keep a category consistent across views.

### Sparkline
> 1.5px trend line with a 10% area wash, for table rows and tiles — **no axes, no labels, no dots**.

```jsx
<Sparkline data={[42,44,43,47,51,49,54]}/>
```

`tone="auto"` (default) is moss when the series ends up, rust when down. Use `neutral` when direction isn't the point.

---

## Reference UI kit — advisor-desktop

A click-through recreation of the Meridian advisor desktop, **built entirely from these components — no bespoke primitives**. Design width **1440×900**. Every figure is tabular mono; every change figure goes through `DeltaValue`.

Flow:
1. **Sign in** (`LoginScreen.jsx`) — split ink/cream layout, display-serif value line on the left.
2. **Your book** (`BookScreen.jsx`) — firm KPI row, filterable household table with drift and trend, aggregate allocation, attention list, day schedule. Click any row →
3. **Household detail** (`HouseholdScreen.jsx`) — KPI row, tabs (Overview / Holdings / Activity / Documents / Notes), performance chart, allocation with policy band, accounts, advisory opportunities, monitoring rules.
4. **Rebalance approval** — `Rebalance` opens a Dialog listing proposed trades; approving fires a success Toast.

| File | Contains |
| --- | --- |
| `index.html` | Mounts the app, owns view state, toasts |
| `data.js` | All fixture data on `window.MD` |
| `AppShell.jsx` | `NavRail`, `TopBar`, `AppShell`, `PageHead` |
| `LoginScreen.jsx` | Sign-in screen |
| `BookScreen.jsx` | Book of business |
| `HouseholdScreen.jsx` | Household detail, tab panels, `PerfChart`, rebalance dialog |

---

## Mapping to the current app's components

The existing app has near-equivalents for most of these. The overhaul should reconcile them:

| Meridian | Current app (`src/components/ui/`) |
| --- | --- |
| Button | `Button.tsx` |
| IconButton | — (folded into Button?) |
| Card | `Card.tsx`, `RichCard.tsx` |
| Badge | `Badge.tsx` |
| Tag | — (likely inline) |
| Icon | lucide-react direct imports |
| Input / Select / Checkbox / Radio / Switch | scattered; `MultiSelect.tsx`, `FilterBar.tsx` |
| Tabs | `TabLayout.tsx`, `SegmentedControl.tsx` |
| Dialog | `Dialog.tsx` |
| Toast | `Toaster.tsx` (sonner) |
| Tooltip | Radix tooltip |
| StatTile | `MetricCard.tsx`, `DenseMetricsBar.tsx` |
| DeltaValue | `CurrencyValue.tsx` (partial) |
| DataTable | `DataTable.tsx` |
| AllocationBar | `AllocationChart.tsx` |
| Sparkline | — (inline / recharts) |

Notable: the app has **no `DeltaValue` equivalent** enforcing true-minus + tabular mono + tone, and **no `Tag`**, and `IconButton` is missing. Those three gaps are why signed-figure formatting drifts across screens.
