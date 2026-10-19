# Phase 1: Instrument Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, retire the old UI and build the instrument design system in Tailwind v4 (tokens, formatter, kit components, keyboard layer, guardrail tests) with a `/kit` gallery on real acc-002 data.

**Architecture:** The engine layers (`src/mocks`, `src/lib`, `src/services`, `src/types`, data hooks) stay; domain code the engine borrowed from the old UI moves into `src/lib` first. The old UI is then deleted. Tokens live once in `src/styles/app.css` (`@theme` with Tailwind's default palette removed). Components live in `src/kit/` in the shadcn pattern (Radix behaviour, `cva` variants, `cn()`), routes in `src/app/`. Guardrail tests close the gaps configuration cannot.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4 (`@tailwindcss/vite`), Radix primitives, class-variance-authority, tailwind-merge + clsx, @tanstack/react-table, TanStack Query 5, React Router 6, MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-phase-1-instrument-foundation-design.md` (roadmap: `docs/superpowers/specs/2026-10-11-workspace-roadmap.md`)

## Global Constraints

- Work only on branch `workspace`. Never commit to `main`. Never push unless the controller says so.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums (`as const` + unions); ESM only; no barrel files (`index.ts` re-exports).
- `pnpm lint` runs with `--max-warnings 0`. `react-refresh/only-export-components` warns when a `.tsx` exports anything but components: put helpers, constants, variants and types in sibling `.ts` files.
- Run tests with `node_modules/.bin/vitest run <path>`; full suite `node_modules/.bin/vitest run`. Before every commit: `pnpm lint` and `pnpm build`. Restore `tsconfig.tsbuildinfo` and `wrangler.jsonc` with `git checkout --` if a tool modifies them; never commit them.
- Frozen today is `2026-02-25` (`src/lib/clock.ts`). Never read the live clock in product code.
- Every figure shown comes from the engine (services or hooks). No hand-typed numbers, names or IDs in UI code.
- UI code lives in `src/kit/` and `src/app/`. Only `src/kit/measure.ts` formats numbers and dates for display.
- Colour only through the instrument tokens (`bg`, `face`, `ink`, `ink-2`, `ink-3`, `rule`, `rule-2`, `band`, `signal`, `signal-ink`). The signal means only "outside its limit and stops you" (`OUT`, `BLOCK`). Warnings are ink. Gains and losses are never coloured.
- Visibility indicator words, exactly: private "Only you"; internal "Firm only · client can't see"; client "CLIENT CAN SEE".
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No new dependency except `@fontsource-variable/archivo` in Task 3, and only after the controller confirms Joel approved it.

## Review Focus

1. **Theme storage unavailable** (private window, blocked storage): `localStorage` throws → the app still renders and follows the system theme (Task 3 test `theme.test.ts`).
2. **Empty data**: a `DataTable` with zero rows shows "0 of 0 lots" and an empty-state row, never a crash or a blank table (Task 9 test).
3. **Negative zero and rounding**: values that round to zero (`-0.4`, `-0.004`) print `0` / `0.0`, never `−0` (Task 4 test).
4. **Shortcuts while typing**: single-key jumps, `/` and `?` must not fire while focus is in an input, textarea, select or contenteditable, or with Ctrl/Meta/Alt held (Task 13 test).
5. **Readings off the scale**: a `Gauge` with drift beyond its scale clamps the bar inside the drawing and still prints the true value; drift exactly at the band edge reads `AT LIMIT`, not `OUT` (Task 10 test).

---

### Task 1: Move engine-owned domain code out of `src/features`

The engine imports tax rules from the old UI (`src/mocks/handlers/{oms,trading,nba,ai}.ts` and six engine tests import `@/features/portfolios/tax/shared`). Move that code into `src/lib` before anything is deleted. A pure `git mv` first, so merges from `main` (where Phase 0 edits this file) follow the rename.

**Files:**
- Move: `src/features/portfolios/tax/shared.tsx` → `src/lib/tax-rules.tsx` (commit 1, pure rename + import paths), then → `src/lib/tax-rules.ts` (commit 2)
- Create: `src/lib/cost-basis.ts`
- Modify: `src/mocks/handlers/{oms,trading,nba,ai}.ts`, `src/mocks/data/__tests__/nba-facts.test.ts`, `src/mocks/handlers/__tests__/{dashboard-consistency,tax-invariants,tax-netting-invariants,pre-trade-invariants}.test.ts`, every file under `src/features` that imports `./shared` or `../tax/shared`
- Modify: `src/mocks/handlers/__tests__/benchmark-identity.test.tsx` → `benchmark-identity.test.ts`

**Interfaces:**
- Produces: `@/lib/tax-rules` exporting `SHORT_TERM_RATE`, `LONG_TERM_RATE`, `formatRatePercent`, `buildRateDisclosure`, `RATE_DISCLOSURE`, `taxRateFor`, `estimatedTaxBenefit`, `HARVEST_LOSS_THRESHOLD_USD`, `isHarvestable`, `harvestNeedsFx`, `FxStatus`, `fxStatusFrom`, `harvestFxStatus`, `MethodImpact`, `computeCostBasisImpact`, `HOLDING_LABELS`. `@/lib/cost-basis` exporting `COST_BASIS_METHODS`, `CostBasisMethod`.

- [ ] **Step 1: Pure rename**

```bash
git mv src/features/portfolios/tax/shared.tsx src/lib/tax-rules.tsx
```

Fix every import of the old path: `grep -rlE "tax/shared'|/shared'" src | xargs grep -lE "portfolios/tax/shared|from '\./shared'|from '\.\./tax/shared'"` — rewrite each to `@/lib/tax-rules`. Inside `src/lib/tax-rules.tsx`, change `import type { CostBasisMethod } from './CostBasisMethodCard'` to `import type { CostBasisMethod } from '@/features/portfolios/tax/CostBasisMethodCard'` (temporary, removed in Step 3). Change nothing else in the moved file.

- [ ] **Step 2: Verify and commit the rename**

Run: `pnpm exec tsc --noEmit && node_modules/.bin/vitest run src/mocks src/lib` → PASS.

```bash
git add -A src
git commit -m "refactor: move tax rules from the tax page into src/lib (pure rename)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Make the module UI-free**

Create `src/lib/cost-basis.ts`:

```ts
/**
 * Lot-selection standing instructions under specific identification (C14). Spec ID itself is not a
 * fifth algorithm; HIFO and LIFO are instructions under it, which is how custodians offer it.
 */
export const COST_BASIS_METHODS = ['FIFO', 'LIFO', 'HIFO', 'AvgCost'] as const
export type CostBasisMethod = (typeof COST_BASIS_METHODS)[number]
```

In `src/features/portfolios/tax/CostBasisMethodCard.tsx`, replace its own `COST_BASIS_METHODS` / `CostBasisMethod` declarations with `export { COST_BASIS_METHODS, type CostBasisMethod } from '@/lib/cost-basis'` (keeps the old UI compiling until Task 2 deletes it).

In the tax-rules module: delete `Th`, `TH_ALIGN` and the `cn` import (UI only); import `CostBasisMethod` from `@/lib/cost-basis`; then:

```bash
git mv src/lib/tax-rules.tsx src/lib/tax-rules.ts
```

Any old-UI file that used `Th` from the tax module imports it from wherever you place a local copy; simplest is to paste `Th` into the one or two old-UI files that use it (they are deleted in Task 2).

- [ ] **Step 4: Detach the engine test from the old UI**

`src/mocks/handlers/__tests__/benchmark-identity.test.tsx`: delete the `RiskTab` import, the `normalizedText` helper, and the two `it` blocks that render `RiskTab` ("the risk tab does not claim tracking error…" and "characterises the tracking-error figure…"). Keep the service-level assertions. Rename to `.test.ts` with `git mv`. Add a comment noting the removed assertions belonged to the retired RiskTab and return in phase 7's risk full view.

- [ ] **Step 5: Verify no engine file imports the old UI**

Run:
```bash
grep -rnE "from ['\"]@/(features|components|store)/|from ['\"](\.\./)+(features|components|store)/" src/mocks src/lib src/services src/types
```
Expected: only `src/lib/theme.ts` (UI-only; deleted in Task 2). Then `pnpm exec tsc --noEmit && node_modules/.bin/vitest run && pnpm lint && pnpm build` → green.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "refactor: tax rules and cost-basis methods are engine code, free of the old UI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Retire the old UI

**Files:**
- Delete: `src/components/`, `src/features/`, `src/store/`, `src/lib/theme.ts`, `src/index.css`, `src/app/App.tsx`, `e2e/*.spec.ts`
- Delete: hooks whose only purpose was the old UI and their tests (at least `use-breakpoint`, `use-container-width`, `use-command-search`)
- Create: `src/styles/app.css` (temporary minimal; Task 3 replaces it), `src/app/routes.tsx`, `src/app/RootLayout.tsx`, `src/app/RouteError.tsx`, `src/app/pages/HomePage.tsx`, `src/app/pages/NotFoundPage.tsx`, `e2e/smoke.spec.ts`
- Modify: `src/main.tsx`, `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: `routes: RouteObject[]` exported from `src/app/routes.tsx` (Task 14 adds `/kit`; the headings test renders these). `RootLayout` renders `<Outlet />` (Task 13 adds the keyboard provider).

- [ ] **Step 1: Record the baseline**

Run `node_modules/.bin/vitest run 2>&1 | tail -4` and note test files / tests counts for the report.

- [ ] **Step 2: Delete**

```bash
git rm -r -q src/components src/features src/store src/lib/theme.ts src/index.css src/app/App.tsx e2e
git rm -q src/hooks/use-breakpoint.ts src/hooks/use-container-width.ts src/hooks/use-command-search.ts \
  src/hooks/__tests__/use-breakpoint.test.ts src/hooks/__tests__/use-container-width.test.ts src/hooks/__tests__/use-command-search.test.tsx
```

Run `pnpm exec tsc --noEmit`. For every remaining file that fails because it imported a deleted module: if it exists only for the old UI (a hook or lib file nobody else uses), delete it and its test; if it is engine or data code, fix the import. List every deletion in the report. Then list `src/lib` files with no remaining importer:

```bash
for f in src/lib/*.ts; do b=$(basename "$f" .ts); n=$(grep -rlE "lib/$b['\"]" src --include=\*.ts --include=\*.tsx | grep -v "^$f$" | wc -l); echo "$n $f"; done | sort -n | head
```

Delete a zero-importer file only if it is presentation-only (e.g. `chart-colors.ts`, `labels.ts` if unused); keep engine modules even if only tests import them.

- [ ] **Step 3: New entry, minimal app**

`src/styles/app.css` (temporary):

```css
@import "tailwindcss";
```

`src/app/RouteError.tsx`:

```tsx
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'
  return (
    <main>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <a href="/">Go to the workspace</a>
    </main>
  )
}
```

`src/app/RootLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return <Outlet />
}
```

`src/app/pages/HomePage.tsx`:

```tsx
import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main>
      <h1>Advisor Desktop</h1>
      <p>The new workspace is under construction.</p>
      <Link to="/kit">Component kit</Link>
    </main>
  )
}
```

`src/app/pages/NotFoundPage.tsx`:

```tsx
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <Link to="/">Go to the workspace</Link>
    </main>
  )
}
```

`src/app/routes.tsx`:

```tsx
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
```

Fast-refresh lint: `routes.tsx` exports non-components (`routes`, `router`). Add at the top: `/* eslint-disable react-refresh/only-export-components -- route table module */`.

`src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/routes'
import '@/styles/app.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } },
})

async function enableMocking() {
  const { worker } = await import('@/mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  const root = document.getElementById('root')
  if (!root) throw new Error('index.html is missing #root')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
```

`e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('home renders its heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Advisor Desktop')
})

test('unknown routes render not found', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
})
```

In `playwright.config.ts` change `command: 'npm run dev'` to `command: 'pnpm dev'`.

- [ ] **Step 4: Prune dependencies**

For each runtime and dev dependency, count importers:

```bash
node -e '
const p=require("./package.json");const {execSync}=require("child_process");
for (const d of [...Object.keys(p.dependencies),...Object.keys(p.devDependencies)]) {
  let n=0; try { n=execSync(`grep -rlE "from [\\x27\\"]${d}[/\\x27\\"]|@import [\\x27\\"]${d}|@plugin [\\x27\\"]${d}" src e2e *.ts 2>/dev/null | wc -l`).toString().trim() } catch {}
  console.log(n.padStart(3), d)
}' | sort -n | head -30
```

Remove runtime dependencies with zero importers that the kit does not need. Keep: `@radix-ui/react-dialog`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot`, `@tanstack/react-table`, `@tanstack/react-query`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react`, `react-dom`, `react-router-dom`. Remove `@tailwindcss/typography` (dev). Keep every dev tool used by config files. Example:

```bash
pnpm remove recharts react-markdown sonner zustand d3 @types/d3 @tanstack/react-virtual lucide-react @tailwindcss/typography
```

Adjust the list to what the count shows; never remove a package the engine imports.

- [ ] **Step 5: Verify**

`pnpm exec tsc --noEmit && node_modules/.bin/vitest run && pnpm lint && pnpm build` → green. Report before/after test counts and every deleted file group.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: retire the old UI on the workspace branch; engine and its tests stay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Tokens, theme and the contrast guardrail

> **Gate:** Step 1 adds `@fontsource-variable/archivo` (SIL OFL). The controller must confirm Joel approved this dependency before dispatching this task.

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `src/styles/app.css`
- Create: `src/kit/theme.ts`, `src/kit/__tests__/theme.test.ts`, `src/__tests__/guardrails/contrast.ts`, `src/__tests__/guardrails/contrast.test.ts`

**Interfaces:**
- Produces Tailwind utilities: colours `bg|text|border|fill|stroke|outline|accent|decoration-{bg,face,ink,ink-2,ink-3,rule,rule-2,band,signal,signal-ink}`; text sizes `text-label`, `text-table`, `text-table-dense`, `text-body`, `text-copy`, `text-title`, `text-total`, `text-readout-sm`, `text-readout-md`, `text-readout-lg`; utilities `stretch-readout`, `stretch-wide`, `stretch-table`, `stretch-dense`, `hatch`, `tabular`; animation `animate-gauge-in`.
- Produces `src/kit/theme.ts`: `type ThemeChoice = 'light' | 'dark' | 'system'`, `readThemeChoice(): ThemeChoice`, `applyTheme(choice: ThemeChoice): void`, `saveThemeChoice(choice: ThemeChoice): void`, `themeFromSearch(search: string): ThemeChoice | null`.

- [ ] **Step 1: Add the font (gated)**

```bash
pnpm add @fontsource-variable/archivo
ls node_modules/@fontsource-variable/archivo/*.css
```

Pick the CSS file that declares a `font-stretch` range (expected `wdth.css`; if the package names it differently, use the one whose `@font-face` includes `font-stretch: 62% 125%`). Record the file name.

- [ ] **Step 2: Write the failing contrast test**

`src/__tests__/guardrails/contrast.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Oklch = { l: number; c: number; h: number }
export type Palette = Map<string, Oklch>

const CSS_PATH = join(process.cwd(), 'src/styles/app.css')

export function readAppCss(): string {
  return readFileSync(CSS_PATH, 'utf8')
}

function block(css: string, selector: string): string {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`app.css has no block for ${selector}`)
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i) }
  }
  throw new Error(`unterminated block for ${selector}`)
}

export function parsePalette(body: string): Palette {
  const palette: Palette = new Map()
  for (const m of body.matchAll(/--ws-([a-z0-9-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g)) {
    palette.set(m[1]!, { l: Number(m[2]), c: Number(m[3]), h: Number(m[4]) })
  }
  return palette
}

export function lightPalette(css: string): Palette {
  return parsePalette(block(css, ':root {'))
}

export function darkPalette(css: string): Palette {
  return parsePalette(block(css, ':root[data-theme="dark"]'))
}

export function mediaDarkPalette(css: string): Palette {
  return parsePalette(block(css, ':root:not([data-theme="light"])'))
}

function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
}

export function luminance(colour: Oklch): number {
  const [r, g, b] = toLinearSrgb(colour)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
```

`src/__tests__/guardrails/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { contrast, darkPalette, lightPalette, mediaDarkPalette, readAppCss, type Palette } from './contrast'

const SURFACES = ['bg', 'face'] as const
const TEXT = ['ink', 'ink-2', 'ink-3', 'signal-ink'] as const
const MARKS = ['signal', 'rule-2', 'ink'] as const // signal marks, meaningful rules, focus ring

function check(name: string, palette: Palette) {
  describe(`${name} theme`, () => {
    for (const s of SURFACES) {
      for (const t of TEXT) {
        it(`${t} on ${s} is at least 4.5:1`, () => {
          expect(contrast(palette.get(t)!, palette.get(s)!)).toBeGreaterThanOrEqual(4.5)
        })
      }
      for (const m of MARKS) {
        it(`${m} on ${s} is at least 3:1`, () => {
          expect(contrast(palette.get(m)!, palette.get(s)!)).toBeGreaterThanOrEqual(3)
        })
      }
    }
  })
}

const css = readAppCss()
check('light', lightPalette(css))
check('dark', darkPalette(css))

describe('token blocks', () => {
  it('every token is defined in light and dark', () => {
    const keys = [...lightPalette(css).keys()].sort()
    expect(keys).toEqual([...darkPalette(css).keys()].sort())
    expect(keys).toEqual(expect.arrayContaining([...SURFACES, ...TEXT, 'signal', 'rule', 'rule-2', 'band']))
  })
  it('the prefers-color-scheme dark block matches the explicit dark block', () => {
    expect(Object.fromEntries(mediaDarkPalette(css))).toEqual(Object.fromEntries(darkPalette(css)))
  })
  it('contrast maths: ink on face in light is high, rule on face is low', () => {
    const p = lightPalette(css)
    expect(contrast(p.get('ink')!, p.get('face')!)).toBeGreaterThan(12)
    expect(contrast(p.get('rule')!, p.get('face')!)).toBeLessThan(2)
  })
})
```

Run: `node_modules/.bin/vitest run src/__tests__/guardrails/contrast.test.ts` → FAIL (`app.css has no block for :root {`).

- [ ] **Step 3: Write the tokens**

Replace `src/styles/app.css` with (substitute the font CSS file name from Step 1):

```css
@import "tailwindcss";
@import "@fontsource-variable/archivo/wdth.css";

/* tokens:start — the only place colour values may appear (guardrail 2) */
:root {
  --ws-bg: oklch(0.944 0.003 250);
  --ws-face: oklch(0.986 0.0015 250);
  --ws-ink: oklch(0.205 0.006 250);
  --ws-ink-2: oklch(0.39 0.006 250);
  --ws-ink-3: oklch(0.47 0.006 250);
  --ws-rule: oklch(0.86 0.004 250);
  --ws-rule-2: oklch(0.6 0.005 250);
  --ws-band: oklch(0.9 0.004 250);
  --ws-signal: oklch(0.6 0.2 41);
  --ws-signal-ink: oklch(0.53 0.185 39);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ws-bg: oklch(0.172 0.004 250);
    --ws-face: oklch(0.212 0.004 250);
    --ws-ink: oklch(0.935 0.004 250);
    --ws-ink-2: oklch(0.8 0.005 250);
    --ws-ink-3: oklch(0.69 0.005 250);
    --ws-rule: oklch(0.315 0.005 250);
    --ws-rule-2: oklch(0.55 0.005 250);
    --ws-band: oklch(0.26 0.005 250);
    --ws-signal: oklch(0.72 0.17 47);
    --ws-signal-ink: oklch(0.77 0.15 52);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --ws-bg: oklch(0.172 0.004 250);
  --ws-face: oklch(0.212 0.004 250);
  --ws-ink: oklch(0.935 0.004 250);
  --ws-ink-2: oklch(0.8 0.005 250);
  --ws-ink-3: oklch(0.69 0.005 250);
  --ws-rule: oklch(0.315 0.005 250);
  --ws-rule-2: oklch(0.55 0.005 250);
  --ws-band: oklch(0.26 0.005 250);
  --ws-signal: oklch(0.72 0.17 47);
  --ws-signal-ink: oklch(0.77 0.15 52);
  color-scheme: dark;
}
/* tokens:end */

@theme {
  --color-*: initial;
  --font-*: initial;

  --color-bg: var(--ws-bg);
  --color-face: var(--ws-face);
  --color-ink: var(--ws-ink);
  --color-ink-2: var(--ws-ink-2);
  --color-ink-3: var(--ws-ink-3);
  --color-rule: var(--ws-rule);
  --color-rule-2: var(--ws-rule-2);
  --color-band: var(--ws-band);
  --color-signal: var(--ws-signal);
  --color-signal-ink: var(--ws-signal-ink);

  --font-sans: "Archivo Variable", ui-sans-serif, system-ui, sans-serif;

  --text-label: 10.5px;
  --text-label--line-height: 1.2;
  --text-label--letter-spacing: 0.07em;
  --text-label--font-weight: 600;
  --text-table-dense: 12.5px;
  --text-table-dense--line-height: 1.3;
  --text-table: 13px;
  --text-table--line-height: 1.35;
  --text-body: 14px;
  --text-body--line-height: 1.5;
  --text-copy: 15.5px;
  --text-copy--line-height: 1.6;
  --text-title: 22px;
  --text-title--line-height: 1.2;
  --text-title--font-weight: 600;
  --text-total: 28px;
  --text-total--line-height: 1.1;
  --text-readout-sm: 36px;
  --text-readout-sm--line-height: 1;
  --text-readout-md: 56px;
  --text-readout-md--line-height: 1;
  --text-readout-lg: 104px;
  --text-readout-lg--line-height: 1;

  --animate-gauge-in: gauge-in 520ms cubic-bezier(0.25, 1, 0.5, 1) both;
  @keyframes gauge-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}

@utility stretch-readout { font-stretch: 125%; }
@utility stretch-wide { font-stretch: 118%; }
@utility stretch-table { font-stretch: 92%; }
@utility stretch-dense { font-stretch: 87.5%; }
@utility tabular { font-variant-numeric: tabular-nums; }
@utility hatch {
  background-image: repeating-linear-gradient(135deg, var(--ws-rule-2) 0 1px, transparent 1px 6px);
}

@layer base {
  html { background: var(--ws-bg); color: var(--ws-ink); }
  body { font-family: var(--font-sans); font-size: 14px; line-height: 1.5; font-variant-numeric: tabular-nums; }
  :focus-visible { outline: 2px solid var(--ws-ink); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  }
}
```

Run the contrast test. If any pair fails, adjust that token's lightness only (keep hue and chroma), re-run, and record the change. Do not lower a threshold.

- [ ] **Step 4: Theme helpers with a failing test first**

`src/kit/__tests__/theme.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { applyTheme, readThemeChoice, saveThemeChoice, themeFromSearch } from '@/kit/theme'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('data-theme')
  try { localStorage.clear() } catch { /* storage unavailable in this test */ }
})

describe('theme', () => {
  it('applyTheme sets data-theme for light/dark and removes it for system', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
  it('round-trips through storage', () => {
    saveThemeChoice('light')
    expect(readThemeChoice()).toBe('light')
  })
  it('falls back to system when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => saveThemeChoice('dark')).not.toThrow()
    expect(readThemeChoice()).toBe('system')
  })
  it('ignores an unknown stored value', () => {
    localStorage.setItem('ws-theme', 'purple')
    expect(readThemeChoice()).toBe('system')
  })
  it('reads ?theme= for screenshots', () => {
    expect(themeFromSearch('?theme=dark')).toBe('dark')
    expect(themeFromSearch('?theme=nope')).toBeNull()
    expect(themeFromSearch('')).toBeNull()
  })
})
```

Run → FAIL (module missing). Then `src/kit/theme.ts`:

```ts
export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'ws-theme'
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']

function isThemeChoice(v: unknown): v is ThemeChoice {
  return typeof v === 'string' && (CHOICES as readonly string[]).includes(v)
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(KEY)
    return isThemeChoice(stored) ? stored : 'system'
  } catch {
    // Storage blocked (private window, policy): follow the system theme.
    return 'system'
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    // Storage blocked: the choice applies for this page view only.
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = choice
}

export function themeFromSearch(search: string): ThemeChoice | null {
  const value = new URLSearchParams(search).get('theme')
  return isThemeChoice(value) && value !== 'system' ? value : null
}
```

In `src/main.tsx`, before rendering: `applyTheme(themeFromSearch(window.location.search) ?? readThemeChoice())` (import from `@/kit/theme`).

- [ ] **Step 5: Verify and commit**

`node_modules/.bin/vitest run src/__tests__/guardrails src/kit && pnpm lint && pnpm build` → green.

```bash
git add -A
git commit -m "feat(kit): instrument tokens in Tailwind @theme, theme switching, contrast guardrail

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: `measure`, the only formatter

**Files:**
- Create: `src/kit/measure.ts`, `src/kit/__tests__/measure.test.ts`

**Interfaces:**
- Produces:
  ```ts
  MINUS: '−'
  UNIT: { usd: 'USD'; pp: 'pp'; pct: '%'; shares: 'sh'; days: 'd' }
  normaliseMinus(s: string): string
  isNegative(formatted: string): boolean
  fmtMoney(v: number): string          // "4,500,000", "−2,954"
  fmtResult(v: number): string         // "+69,411", "−45,850", "0"
  fmtPrice(v: number): string          // "520.30"
  fmtWeight(fraction: number): string  // 0.448 → "44.8"
  fmtReturn(fraction: number): string  // 0.214 → "+21.4"
  fmtDrift(fraction: number): string   // 0.1322 → "+13.2"  (percentage points)
  fmtTolerance(fraction: number): string // 0.05 → "±5.0"
  fmtQuantity(v: number): string       // 7000 → "7,000"; 1515.331804 → "1,515.332"
  splitFraction(formatted: string): { whole: string; fraction: string } // "1,515.332" → { "1,515", ".332" }
  fmtDays(n: number): string           // "26"
  fmtScore(fraction: number): string   // 0.92 → "92"
  fmtDate(iso: string): string         // "2026-03-23"
  fmtTimestamp(iso: string): string    // "2026-02-25 12:00 UTC"
  clientMoney(v: number): string       // "$45,850", "−$45,850"
  clientPercent(fraction: number): string // "68.2%"
  clientDate(iso: string): string      // "March 27, 2026"
  ```

- [ ] **Step 1: Failing tests**

```ts
// src/kit/__tests__/measure.test.ts
import { describe, it, expect } from 'vitest'
import {
  MINUS, normaliseMinus, isNegative, fmtMoney, fmtResult, fmtPrice, fmtWeight, fmtReturn, fmtDrift,
  fmtTolerance, fmtQuantity, splitFraction, fmtDays, fmtScore, fmtDate, fmtTimestamp, clientMoney,
  clientPercent, clientDate,
} from '@/kit/measure'

describe('measure', () => {
  it('money is whole dollars with a true minus', () => {
    expect(fmtMoney(4_500_000)).toBe('4,500,000')
    expect(fmtMoney(-2954.4)).toBe(`${MINUS}2,954`)
  })
  it('results are always signed', () => {
    expect(fmtResult(69_411)).toBe('+69,411')
    expect(fmtResult(-45_850)).toBe(`${MINUS}45,850`)
    expect(fmtResult(0)).toBe('0')
  })
  it('never prints a negative zero', () => {
    expect(fmtResult(-0.4)).toBe('0')
    expect(fmtMoney(-0.4)).toBe('0')
    expect(fmtDrift(-0.0004)).toBe('0.0')
    expect(fmtReturn(-0.0004)).toBe('0.0')
  })
  it('prices, weights, returns, drift, tolerance', () => {
    expect(fmtPrice(520.3)).toBe('520.30')
    expect(fmtWeight(0.4486)).toBe('44.9')
    expect(fmtReturn(0.214)).toBe('+21.4')
    expect(fmtReturn(-0.187)).toBe(`${MINUS}18.7`)
    expect(fmtDrift(0.1322)).toBe('+13.2')
    expect(fmtDrift(-0.074)).toBe(`${MINUS}7.4`)
    expect(fmtTolerance(0.05)).toBe('±5.0')
  })
  it('quantities keep custodian fractions to 3 dp and split for display', () => {
    expect(fmtQuantity(7000)).toBe('7,000')
    expect(fmtQuantity(1515.331804)).toBe('1,515.332')
    expect(splitFraction('1,515.332')).toEqual({ whole: '1,515', fraction: '.332' })
    expect(splitFraction('7,000')).toEqual({ whole: '7,000', fraction: '' })
  })
  it('days, scores, dates, timestamps', () => {
    expect(fmtDays(26)).toBe('26')
    expect(fmtScore(0.92)).toBe('92')
    expect(fmtDate('2026-03-23')).toBe('2026-03-23')
    expect(fmtDate('2026-02-25T12:00:00Z')).toBe('2026-02-25')
    expect(fmtTimestamp('2026-02-25T12:00:00Z')).toBe('2026-02-25 12:00 UTC')
  })
  it('client copy is plain language', () => {
    expect(clientMoney(45_850)).toBe('$45,850')
    expect(clientMoney(-45_850)).toBe(`${MINUS}$45,850`)
    expect(clientPercent(0.682)).toBe('68.2%')
    expect(clientDate('2026-03-27')).toBe('March 27, 2026')
  })
  it('normalises engine hyphen-minus and detects negatives', () => {
    expect(normaliseMinus('cash would be -1.5%')).toBe(`cash would be ${MINUS}1.5%`)
    expect(normaliseMinus('2026-03-23')).toBe('2026-03-23')
    expect(isNegative(`${MINUS}45,850`)).toBe(true)
    expect(isNegative('+69,411')).toBe(false)
  })
})
```

Run → FAIL (module missing).

- [ ] **Step 2: Implement**

```ts
// src/kit/measure.ts
export const MINUS = '−'
export const UNIT = { usd: 'USD', pp: 'pp', pct: '%', shares: 'sh', days: 'd' } as const

const cache = new Map<string, Intl.NumberFormat>()
function numberFormat(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })
    cache.set(key, f)
  }
  return f
}

function rounded(v: number, digits: number): number {
  const r = Number(v.toFixed(digits))
  return Object.is(r, -0) ? 0 : r
}

function unsigned(v: number, min: number, max: number): string {
  const r = rounded(v, max)
  const text = numberFormat(min, max).format(Math.abs(r))
  return r < 0 ? `${MINUS}${text}` : text
}

function signed(v: number, min: number, max: number): string {
  const r = rounded(v, max)
  const text = numberFormat(min, max).format(Math.abs(r))
  if (r > 0) return `+${text}`
  if (r < 0) return `${MINUS}${text}`
  return text
}

export function normaliseMinus(s: string): string {
  return s.replace(/(^|[\s(])-(?=\d)/g, `$1${MINUS}`)
}

export function isNegative(formatted: string): boolean {
  return formatted.startsWith(MINUS)
}

export const fmtMoney = (v: number) => unsigned(v, 0, 0)
export const fmtResult = (v: number) => signed(v, 0, 0)
export const fmtPrice = (v: number) => unsigned(v, 2, 2)
export const fmtWeight = (fraction: number) => unsigned(Math.abs(fraction) * 100, 1, 1)
export const fmtReturn = (fraction: number) => signed(fraction * 100, 1, 1)
export const fmtDrift = (fraction: number) => signed(fraction * 100, 1, 1)
export const fmtTolerance = (fraction: number) => `±${unsigned(Math.abs(fraction) * 100, 1, 1)}`
export const fmtQuantity = (v: number) => unsigned(v, 0, 3)
export const fmtDays = (n: number) => unsigned(n, 0, 0)
export const fmtScore = (fraction: number) => unsigned(fraction * 100, 0, 0)

export function splitFraction(formatted: string): { whole: string; fraction: string } {
  const dot = formatted.indexOf('.')
  return dot < 0 ? { whole: formatted, fraction: '' } : { whole: formatted.slice(0, dot), fraction: formatted.slice(dot) }
}

export function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

export function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`
}

export function clientMoney(v: number): string {
  const r = rounded(v, 0)
  const text = `$${numberFormat(0, 0).format(Math.abs(r))}`
  return r < 0 ? `${MINUS}${text}` : text
}

export function clientPercent(fraction: number): string {
  return `${unsigned(fraction * 100, 1, 1)}%`
}

const clientDates = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function clientDate(iso: string): string {
  return clientDates.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}
```

Run → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/kit/measure.ts src/kit/__tests__/measure.test.ts
git commit -m "feat(kit): measure, the single formatter for every figure and date

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Source guardrails (palette, colour literals, formatter, kit elements)

**Files:**
- Create: `src/__tests__/guardrails/detectors.ts`, `src/__tests__/guardrails/detectors.test.ts`, `src/__tests__/guardrails/source.test.ts`

**Interfaces:**
- Produces: `UI_ROOTS = ['src/kit', 'src/app']`; `listSourceFiles(root: string): string[]`; `findPaletteViolations(src: string): string[]`; `findColourLiterals(src: string): string[]`; `findFormatterBypass(src: string): string[]`; `findRawElements(src: string): string[]`; `colourLiteralsOutsideTokens(css: string): string[]`. Later phases add roots (e.g. `src/workspace`) to `UI_ROOTS`.

- [ ] **Step 1: Failing self-tests**

```ts
// src/__tests__/guardrails/detectors.test.ts
import { describe, it, expect } from 'vitest'
import {
  findPaletteViolations, findColourLiterals, findFormatterBypass, findRawElements, colourLiteralsOutsideTokens,
} from './detectors'

describe('palette detector', () => {
  it.each([
    'className="bg-blue-500"', 'className="text-red-600/50"', 'className="border-slate-200"',
    'className="text-white"', 'className="bg-[#ff0000]"', 'className="text-[oklch(0.5_0.1_20)]"',
    'className="fill-[rgb(0,0,0)]"', 'className="bg-[color:var(--x)]"',
  ])('catches %s', (src) => expect(findPaletteViolations(src)).not.toEqual([]))
  it.each([
    'className="bg-ink text-face"', 'className="text-signal-ink border-rule-2"', 'className="text-label"',
    'className="w-[64px] text-table"', 'className="bg-transparent"',
  ])('allows %s', (src) => expect(findPaletteViolations(src)).toEqual([]))
})

describe('colour literal detector', () => {
  it.each(['const c = "#ff0000"', "style={{ color: 'rgb(0,0,0)' }}", 'fill="oklch(0.5 0.1 20)"', 'hsl(10 20% 30%)'])(
    'catches %s', (src) => expect(findColourLiterals(src)).not.toEqual([]))
  it.each(['href="#main"', 'id="page-title"', 'const n = 0xff'])('allows %s', (src) => expect(findColourLiterals(src)).toEqual([]))
  it('CSS colour values are allowed only inside the token markers', () => {
    expect(colourLiteralsOutsideTokens('/* tokens:start */ :root { --a: oklch(0.5 0 0); } /* tokens:end */')).toEqual([])
    expect(colourLiteralsOutsideTokens('/* tokens:start */ /* tokens:end */ .x { color: #fff; }')).not.toEqual([])
    expect(colourLiteralsOutsideTokens('.x { color: red; }')).not.toEqual([])
  })
})

describe('formatter detector', () => {
  it.each(['v.toFixed(2)', 'n.toLocaleString()', 'new Intl.NumberFormat("en-US")', 'Intl.DateTimeFormat()'])(
    'catches %s', (src) => expect(findFormatterBypass(src)).not.toEqual([]))
  it('allows measure calls', () => expect(findFormatterBypass('fmtMoney(v)')).toEqual([]))
})

describe('raw element detector', () => {
  it.each(['<button onClick={x}>', '<table>', '<dialog open>'])('catches %s', (src) => expect(findRawElements(src)).not.toEqual([]))
  it.each(['<Button rank="primary">', '<DataTable', '<Dialog'])('allows %s', (src) => expect(findRawElements(src)).toEqual([]))
})
```

Run → FAIL (module missing).

- [ ] **Step 2: Implement the detectors**

```ts
// src/__tests__/guardrails/detectors.ts
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const UI_ROOTS = ['src/kit', 'src/app'] as const

export function listSourceFiles(root: string): string[] {
  const abs = join(process.cwd(), root)
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : listSourceFiles(join(root, name))
    return /\.(ts|tsx)$/.test(name) ? [join(root, name)] : []
  })
}

const PALETTE = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white'
const COLOUR_PREFIX = 'bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|outline|decoration|divide|from|via|to|accent|caret|shadow|placeholder'
const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:${COLOUR_PREFIX})-(?:${PALETTE})(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])`, 'g')
const ARBITRARY_COLOUR = /-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|color:)/g

export function findPaletteViolations(src: string): string[] {
  return [...src.matchAll(PALETTE_CLASS), ...src.matchAll(ARBITRARY_COLOUR)].map((m) => m[0])
}

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g
const COLOUR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/g

export function findColourLiterals(src: string): string[] {
  return [...src.matchAll(HEX), ...src.matchAll(COLOUR_FN)].map((m) => m[0])
}

const NAMED_CSS = new RegExp(`:\\s*(?:${PALETTE}|grey|silver|maroon|navy|olive|aqua|fuchsia)\\b`, 'g')

export function colourLiteralsOutsideTokens(css: string): string[] {
  const outside = css.replace(/\/\* tokens:start[\s\S]*?\/\* tokens:end \*\//g, '')
  return [...findColourLiterals(outside), ...[...outside.matchAll(NAMED_CSS)].map((m) => m[0])]
}

const FORMATTERS = /\.toFixed\(|\.toLocaleString\(|\bIntl\.(?:NumberFormat|DateTimeFormat)\b/g

export function findFormatterBypass(src: string): string[] {
  return [...src.matchAll(FORMATTERS)].map((m) => m[0])
}

const RAW = /<(?:button|table|dialog)\b/g

export function findRawElements(src: string): string[] {
  return [...src.matchAll(RAW)].map((m) => m[0])
}
```

Run self-tests → PASS. (If `text-white` in the allow/catch tables conflicts with a real need, it stays banned: use `text-face`.)

- [ ] **Step 3: The real scan**

```ts
// src/__tests__/guardrails/source.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  UI_ROOTS, listSourceFiles, findPaletteViolations, findColourLiterals, findFormatterBypass, findRawElements,
  colourLiteralsOutsideTokens,
} from './detectors'

const files = UI_ROOTS.flatMap(listSourceFiles)
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

describe('UI source guardrails', () => {
  it('scans a non-trivial set of files', () => expect(files.length).toBeGreaterThan(3))
  it.each(files)('%s uses only instrument colours', (f) => {
    expect(findPaletteViolations(read(f))).toEqual([])
    expect(findColourLiterals(read(f))).toEqual([])
  })
  it.each(files.filter((f) => !f.endsWith('src/kit/measure.ts')))('%s formats only through measure', (f) => {
    expect(findFormatterBypass(read(f))).toEqual([])
  })
  it.each(files.filter((f) => !f.startsWith('src/kit/')))('%s uses kit elements', (f) => {
    expect(findRawElements(read(f))).toEqual([])
  })
  it('app.css has colour values only inside the token block', () => {
    expect(colourLiteralsOutsideTokens(read('src/styles/app.css'))).toEqual([])
  })
})
```

Run → PASS (HomePage, NotFound, routes, theme, measure exist). If `listSourceFiles` returns fewer than 4 files at this point, the first assertion fails: that is correct until Task 6 adds components, so lower nothing; implement Task 5 after Task 6 if needed, or keep `>0` here and raise to `>3` in Task 14 (record the choice).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/guardrails
git commit -m "test(guardrails): palette, colour literals, formatter and kit-element scans with self-tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Basics — `Button`, `StatusCode`, `Tag`, `Reading`

**Files:**
- Create: `src/kit/button/Button.tsx`, `src/kit/button/button-variants.ts`, `src/kit/status/StatusCode.tsx`, `src/kit/status/status.ts`, `src/kit/tag/Tag.tsx`, `src/kit/reading/Reading.tsx`, tests `src/kit/__tests__/{Button,StatusCode,Tag,Reading}.test.tsx`

**Interfaces:**
- `Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { rank?: 'primary' | 'secondary' | 'quiet'; asChild?: boolean })`
- `type Status = 'OUT' | 'AT LIMIT' | 'IN' | 'BLOCK' | 'WARN' | 'CLEAR' | 'OPEN'`; `isSignal(s: Status): boolean` (OUT, BLOCK); `StatusCode({ status, label? }: { status: Status; label?: string })`
- `Tag({ children, tone? }: { children: string; tone?: 'outline' | 'solid' | 'hatch' })`
- `Reading({ label?, value, unit?, size?, limit?, status? }: { label?: string; value: string; unit?: string; size?: 'body' | 'total' | 'readout-sm' | 'readout-md' | 'readout-lg'; limit?: string; status?: Status })` — `value` comes from `measure`; a value starting with U+2212 renders heavier.

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/kit/button/Button'

describe('Button', () => {
  it('renders a button with its rank and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button rank="secondary" onClick={onClick}>Draft the client note</Button>)
    const b = screen.getByRole('button', { name: 'Draft the client note' })
    expect(b.dataset.rank).toBe('secondary')
    await userEvent.click(b)
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('defaults to primary and type=button', () => {
    render(<Button>Approve</Button>)
    const b = screen.getByRole('button')
    expect(b.dataset.rank).toBe('primary')
    expect(b).toHaveAttribute('type', 'button')
  })
})
```

```tsx
// src/kit/__tests__/StatusCode.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusCode } from '@/kit/status/StatusCode'
import { isSignal } from '@/kit/status/status'

describe('StatusCode', () => {
  it('only OUT and BLOCK are signal', () => {
    expect(['OUT', 'BLOCK'].every((s) => isSignal(s as 'OUT'))).toBe(true)
    expect(['WARN', 'AT LIMIT', 'IN', 'CLEAR', 'OPEN'].some((s) => isSignal(s as 'WARN'))).toBe(false)
  })
  it('always shows its word, so colour is never the only carrier', () => {
    render(<StatusCode status="BLOCK" />)
    expect(screen.getByText('BLOCK')).toBeInTheDocument()
    expect(screen.getByText('BLOCK').closest('[data-status]')).toHaveAttribute('data-signal', 'true')
  })
  it('WARN is ink, not signal', () => {
    render(<StatusCode status="WARN" />)
    expect(screen.getByText('WARN').closest('[data-status]')).toHaveAttribute('data-signal', 'false')
  })
})
```

```tsx
// src/kit/__tests__/Tag.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tag } from '@/kit/tag/Tag'

it('renders its word with a tone', () => {
  render(<Tag tone="hatch">NO MARKET</Tag>)
  expect(screen.getByText('NO MARKET')).toHaveAttribute('data-tone', 'hatch')
})
```

```tsx
// src/kit/__tests__/Reading.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Reading } from '@/kit/reading/Reading'
import { fmtDrift, fmtResult, fmtTolerance } from '@/kit/measure'

describe('Reading', () => {
  it('shows label, value, unit, limit and status', () => {
    render(<Reading label="Max drift · US equity" value={fmtDrift(0.132)} unit="pp" limit={`tol ${fmtTolerance(0.05)} pp`} status="OUT" />)
    expect(screen.getByText('Max drift · US equity')).toBeInTheDocument()
    expect(screen.getByText('+13.2')).toBeInTheDocument()
    expect(screen.getByText('pp')).toBeInTheDocument()
    expect(screen.getByText('tol ±5.0 pp')).toBeInTheDocument()
    expect(screen.getByText('OUT')).toBeInTheDocument()
  })
  it('a loss renders heavier, never coloured', () => {
    render(<Reading value={fmtResult(-45_850)} unit="USD" />)
    const v = screen.getByText(fmtResult(-45_850))
    expect(v).toHaveAttribute('data-negative', 'true')
    expect(v.className).not.toMatch(/signal/)
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/kit/button/button-variants.ts
import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex h-9 items-center gap-2 rounded-xs px-4 text-body font-semibold disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      rank: {
        primary: 'bg-ink text-face hover:bg-ink-2',
        secondary: 'border border-ink bg-transparent text-ink hover:bg-face',
        quiet: 'h-auto px-0 text-ink underline decoration-rule-2 underline-offset-4 hover:decoration-ink',
      },
    },
    defaultVariants: { rank: 'primary' },
  },
)

export type ButtonRank = NonNullable<VariantProps<typeof buttonVariants>['rank']>
```

```tsx
// src/kit/button/Button.tsx
import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonRank } from './button-variants'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { rank?: ButtonRank; asChild?: boolean }

export function Button({ rank = 'primary', asChild = false, className, type, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-rank={rank}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ rank }), className)}
      {...rest}
    />
  )
}
```

```ts
// src/kit/status/status.ts
export type Status = 'OUT' | 'AT LIMIT' | 'IN' | 'BLOCK' | 'WARN' | 'CLEAR' | 'OPEN'
export type Glyph = 'filled' | 'outlined' | 'hollow'

const SIGNAL: ReadonlySet<Status> = new Set(['OUT', 'BLOCK'])
const OUTLINED: ReadonlySet<Status> = new Set(['WARN', 'AT LIMIT', 'OPEN'])

export function isSignal(status: Status): boolean {
  return SIGNAL.has(status)
}

export function glyphFor(status: Status): Glyph {
  if (SIGNAL.has(status)) return 'filled'
  return OUTLINED.has(status) ? 'outlined' : 'hollow'
}
```

```tsx
// src/kit/status/StatusCode.tsx
import { cn } from '@/lib/utils'
import { glyphFor, isSignal, type Status } from './status'

const GLYPH = {
  filled: 'size-2 bg-signal',
  outlined: 'size-2 border border-ink',
  hollow: 'size-2 rounded-full border border-ink-3',
} as const

export function StatusCode({ status, label }: { status: Status; label?: string }) {
  const signal = isSignal(status)
  return (
    <span
      data-status={status}
      data-signal={String(signal)}
      className={cn('inline-flex items-center gap-1.5 text-label uppercase', signal ? 'text-signal-ink' : 'text-ink')}
    >
      <span aria-hidden className={GLYPH[glyphFor(status)]} />
      <span>{status}</span>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
```

```tsx
// src/kit/tag/Tag.tsx
import { cn } from '@/lib/utils'

const TONE = {
  outline: 'border border-ink-2 text-ink-2',
  solid: 'bg-ink text-face',
  hatch: 'hatch border border-rule-2 text-ink',
} as const

export function Tag({ children, tone = 'outline' }: { children: string; tone?: keyof typeof TONE }) {
  return (
    <span data-tone={tone} className={cn('inline-block whitespace-nowrap px-1.5 py-0.5 text-label uppercase', TONE[tone])}>
      {children}
    </span>
  )
}
```

```tsx
// src/kit/reading/Reading.tsx
import { cn } from '@/lib/utils'
import { isNegative } from '@/kit/measure'
import { StatusCode } from '@/kit/status/StatusCode'
import type { Status } from '@/kit/status/status'

const SIZE = {
  body: 'text-body',
  total: 'text-total stretch-wide',
  'readout-sm': 'text-readout-sm stretch-readout font-light',
  'readout-md': 'text-readout-md stretch-readout font-light',
  'readout-lg': 'text-readout-lg stretch-readout font-light',
} as const

type ReadingProps = {
  label?: string
  value: string
  unit?: string
  size?: keyof typeof SIZE
  limit?: string
  status?: Status
}

export function Reading({ label, value, unit, size = 'body', limit, status }: ReadingProps) {
  const negative = isNegative(value)
  return (
    <div className="inline-flex flex-col gap-1">
      {label ? <span className="text-label uppercase text-ink-3">{label}</span> : null}
      <span className="inline-flex items-baseline gap-2">
        <span data-negative={String(negative)} className={cn('tabular text-ink', SIZE[size], negative && 'font-semibold')}>
          {value}
        </span>
        {unit ? <span className="text-body text-ink-3">{unit}</span> : null}
        {status ? <StatusCode status={status} /> : null}
      </span>
      {limit ? <span className="text-label text-ink-3">{limit}</span> : null}
    </div>
  )
}
```

Run → PASS; then `node_modules/.bin/vitest run src/__tests__/guardrails` → PASS.

- [ ] **Step 3: Commit** — `feat(kit): Button, StatusCode, Tag and Reading` (+ trailer).

### Task 7: `Attestation`, `Dialog`, `Stepper`

**Files:**
- Create: `src/kit/attestation/Attestation.tsx`, `src/kit/dialog/Dialog.tsx`, `src/kit/stepper/Stepper.tsx`, `src/kit/stepper/stepper.ts`, tests `src/kit/__tests__/{Attestation,Dialog,Stepper}.test.tsx`

**Interfaces:**
- `Attestation({ id, checked, onChange, children, disabled? }: { id: string; checked: boolean; onChange: (checked: boolean) => void; children: string; disabled?: boolean })`
- `Dialog({ open, onOpenChange, title, description?, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode })`
- `type StepState = 'READY' | 'PREVIEWED' | 'OPEN' | 'DRAFT' | 'DONE'`; `type Step = { id: string; label: string; state: StepState }`; `Stepper({ steps, currentId, label }: { steps: Step[]; currentId: string; label: string })`

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/Attestation.test.tsx
import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Attestation } from '@/kit/attestation/Attestation'

it('is a labelled checkbox that reports its new state', async () => {
  const onChange = vi.fn()
  render(<Attestation id="a1" checked={false} onChange={onChange}>I reviewed every leg.</Attestation>)
  await userEvent.click(screen.getByRole('checkbox', { name: 'I reviewed every leg.' }))
  expect(onChange).toHaveBeenCalledWith(true)
})
```

```tsx
// src/kit/__tests__/Dialog.test.tsx
import { it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/kit/dialog/Dialog'
import { Button } from '@/kit/button/Button'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open keys</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Keyboard">
        <p>Press / for the command line.</p>
      </Dialog>
    </>
  )
}

it('opens with a titled dialog and returns focus to the trigger on Escape', async () => {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Open keys' })
  await userEvent.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Keyboard' })).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
```

```tsx
// src/kit/__tests__/Stepper.test.tsx
import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Stepper } from '@/kit/stepper/Stepper'

it('lists steps with their states and marks the current one', () => {
  render(
    <Stepper label="Rebalance this account" currentId="approve" steps={[
      { id: 'drift', label: 'Drift and lots', state: 'DONE' },
      { id: 'approve', label: 'Approve', state: 'OPEN' },
      { id: 'message', label: 'Client message', state: 'DRAFT' },
    ]} />,
  )
  const list = screen.getByRole('list', { name: 'Rebalance this account' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items[1]).toHaveAttribute('aria-current', 'step')
  expect(within(items[2]!).getByText('DRAFT')).toBeInTheDocument()
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/kit/attestation/Attestation.tsx
type AttestationProps = { id: string; checked: boolean; onChange: (checked: boolean) => void; children: string; disabled?: boolean }

export function Attestation({ id, checked, onChange, children, disabled }: AttestationProps) {
  return (
    <div className="flex items-start gap-3 border-b border-rule py-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 accent-ink"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="text-body text-ink">{children}</label>
    </div>
  )
}
```

```tsx
// src/kit/dialog/Dialog.tsx
import type { ReactNode } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-ink bg-face p-6 text-ink"
          aria-describedby={description ? undefined : undefined}
        >
          <RadixDialog.Title className="text-title">{title}</RadixDialog.Title>
          {description ? <RadixDialog.Description className="mt-1 text-body text-ink-2">{description}</RadixDialog.Description> : null}
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
```

If Radix warns about a missing description in tests, pass `aria-describedby={undefined}` only when `description` is absent (the expression above does that) — test output must be free of warnings.

```ts
// src/kit/stepper/stepper.ts
export type StepState = 'READY' | 'PREVIEWED' | 'OPEN' | 'DRAFT' | 'DONE'
export type Step = { id: string; label: string; state: StepState }
```

```tsx
// src/kit/stepper/Stepper.tsx
import { cn } from '@/lib/utils'
import type { Step } from './stepper'

export function Stepper({ steps, currentId, label }: { steps: Step[]; currentId: string; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col border-t border-rule">
      {steps.map((step, i) => {
        const current = step.id === currentId
        return (
          <li
            key={step.id}
            aria-current={current ? 'step' : undefined}
            className={cn('grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-rule py-2 text-body', current && 'font-semibold')}
          >
            <span className="tabular text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <span>{step.label}</span>
            <span className={cn('px-1.5 text-label uppercase', step.state === 'DONE' ? 'bg-ink text-face' : 'border border-ink-2 text-ink-2')}>
              {step.state}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
```

Note: `String(i + 1).padStart(2, '0')` is an index, not a figure; it does not trip the formatter guardrail.

Run → PASS. Commit — `feat(kit): Attestation, Dialog and Stepper` (+ trailer).

### Task 8: Layout — `Page`, `Grid`, `Pane`, `SidePanel`

**Files:**
- Create: `src/kit/page/Page.tsx`, `src/kit/page/ids.ts`, `src/kit/layout/Grid.tsx`, `src/kit/layout/Pane.tsx`, tests `src/kit/__tests__/{Page,Layout}.test.tsx`

**Interfaces:**
- `PAGE_TITLE_ID = 'page-title'`, `MAIN_ID = 'main'` (in `ids.ts`)
- `Page({ title, eyebrow?, meta?, children }: { title: string; eyebrow?: string; meta?: ReactNode; children: ReactNode })` — renders the skip link, one `h1#page-title` with `tabIndex={-1}`, and `main#main`.
- `Grid({ children })`; `MainColumn({ children })`; `SidePanel({ label, children })`; `Pane({ title, meta?, children })` (title is an `h2`).

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/Page.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Page } from '@/kit/page/Page'

it('renders exactly one h1, a focusable title and a skip link to main', () => {
  render(<Page title="Component kit" eyebrow="Advisor Desktop"><p>Body</p></Page>)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
})
```

```tsx
// src/kit/__tests__/Layout.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Grid, MainColumn, SidePanel } from '@/kit/layout/Grid'
import { Pane } from '@/kit/layout/Pane'

it('composes a pane in the main column and a labelled side panel', () => {
  render(
    <Grid>
      <MainColumn><Pane title="Holdings" meta="10 of 10"><p>rows</p></Pane></MainColumn>
      <SidePanel label="What is being approved"><p>tape</p></SidePanel>
    </Grid>,
  )
  expect(screen.getByRole('heading', { level: 2, name: 'Holdings' })).toBeInTheDocument()
  expect(screen.getByRole('complementary', { name: 'What is being approved' })).toBeInTheDocument()
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/kit/page/ids.ts
export const PAGE_TITLE_ID = 'page-title'
export const MAIN_ID = 'main'
```

```tsx
// src/kit/page/Page.tsx
import type { ReactNode } from 'react'
import { MAIN_ID, PAGE_TITLE_ID } from './ids'

type PageProps = { title: string; eyebrow?: string; meta?: ReactNode; children: ReactNode }

export function Page({ title, eyebrow, meta, children }: PageProps) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <a href={`#${MAIN_ID}`} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-face focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4 border-b border-ink px-6 pb-4 pt-8">
        <div className="flex flex-col gap-1">
          {eyebrow ? <span className="text-label uppercase text-ink-3">{eyebrow}</span> : null}
          <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{title}</h1>
        </div>
        {meta ? <div className="text-body text-ink-2">{meta}</div> : null}
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>
    </div>
  )
}
```

```tsx
// src/kit/layout/Grid.tsx
import type { ReactNode } from 'react'

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-6">{children}</div>
}

export function MainColumn({ children }: { children: ReactNode }) {
  return <div className="col-span-12 flex min-w-0 flex-col gap-8 min-[1100px]:col-span-8">{children}</div>
}

export function SidePanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="col-span-12 flex min-w-0 flex-col gap-4 min-[1100px]:col-span-4">
      <span className="border-b border-ink pb-2 text-label uppercase text-ink-2">{label}</span>
      {children}
    </aside>
  )
}
```

```tsx
// src/kit/layout/Pane.tsx
import type { ReactNode } from 'react'

export function Pane({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 className="text-label uppercase text-ink-2">{title}</h2>
        {meta ? <span className="text-label text-ink-3">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}
```

Run → PASS. Commit — `feat(kit): Page, Grid, Pane and SidePanel` (+ trailer).

### Task 9: `DataTable`

**Files:**
- Create: `src/kit/data-table/DataTable.tsx`, `src/kit/data-table/Num.tsx`, `src/kit/data-table/types.ts`, test `src/kit/__tests__/DataTable.test.tsx`

**Interfaces:**
- ```ts
  type Density = 'dense' | 'regular' | 'narrative'
  type Column<T> = {
    id: string; header: string; unit?: string; align?: 'left' | 'right'
    cell: (row: T) => ReactNode
    sortValue?: (row: T) => number | string
    proportion?: (row: T) => number // 0..1, draws a bar before the cell
  }
  type Totals = { label: string; tiesTo?: string; cells: Partial<Record<string, ReactNode>> }
  DataTable<T>(props: {
    caption: string; columns: Column<T>[]; rows: T[]; getRowId: (row: T) => string
    noun: { singular: string; plural: string }; total?: number; density?: Density
    totals?: Totals; onActivate?: (row: T) => void; initialSort?: { id: string; desc: boolean }
  })
  Num({ text }: { text: string }) // fraction digits set fainter
  ```

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/DataTable.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import type { Column } from '@/kit/data-table/types'
import { fmtMoney, fmtQuantity } from '@/kit/measure'

type Row = { id: string; symbol: string; qty: number; value: number; weight: number }
const rows: Row[] = [
  { id: 'a', symbol: 'SPY', qty: 3879, value: 2_018_244, weight: 0.448 },
  { id: 'b', symbol: 'INTC', qty: 7000, value: 199_150, weight: 0.044 },
  { id: 'c', symbol: 'ETHE', qty: 3882.5, value: 71_623, weight: 0.016 },
]
const columns: Column<Row>[] = [
  { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol, sortValue: (r) => r.symbol },
  { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (r) => <Num text={fmtQuantity(r.qty)} />, sortValue: (r) => r.qty },
  { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (r) => fmtMoney(r.value), sortValue: (r) => r.value, proportion: (r) => r.weight },
]

function renderTable(extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <DataTable caption="Holdings" columns={columns} rows={rows} getRowId={(r) => r.id}
      noun={{ singular: 'position', plural: 'positions' }} {...extra} />,
  )
}

describe('DataTable', () => {
  it('states its count and puts units in the header', () => {
    renderTable({ total: 3 })
    expect(screen.getByText('3 of 3 positions')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Value USD/ })).toBeInTheDocument()
  })
  it('sorts by a header and reports aria-sort', async () => {
    renderTable()
    const header = screen.getByRole('columnheader', { name: /Value/ })
    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    const first = screen.getAllByRole('row')[1]!
    expect(within(first).getByText('ETHE')).toBeInTheDocument()
  })
  it('has one tab stop and moves the row cursor with J/K and arrows', async () => {
    const onActivate = vi.fn()
    renderTable({ onActivate })
    const body = screen.getAllByRole('row').slice(1)
    expect(body.filter((r) => r.tabIndex === 0)).toHaveLength(1)
    body[0]!.focus()
    await userEvent.keyboard('j')
    expect(body[1]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(body[2]).toHaveFocus()
    await userEvent.keyboard('k')
    expect(body[1]).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onActivate).toHaveBeenCalledWith(rows[1])
  })
  it('sets fractional digits apart', () => {
    renderTable()
    expect(screen.getByText('.5')).toHaveAttribute('data-fraction', 'true')
  })
  it('renders totals and says what they tie to', () => {
    renderTable({ totals: { label: 'Total', tiesTo: 'account value', cells: { value: fmtMoney(2_289_017) } } })
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('ties to account value')).toBeInTheDocument()
  })
  it('handles zero rows without crashing', () => {
    renderTable({ rows: [], total: 0 })
    expect(screen.getByText('0 of 0 positions')).toBeInTheDocument()
    expect(screen.getByText('No positions.')).toBeInTheDocument()
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/kit/data-table/types.ts
import type { ReactNode } from 'react'

export type Density = 'dense' | 'regular' | 'narrative'

export type Column<T> = {
  id: string
  header: string
  unit?: string
  align?: 'left' | 'right'
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
  proportion?: (row: T) => number
}

export type Totals = { label: string; tiesTo?: string; cells: Partial<Record<string, ReactNode>> }
```

```tsx
// src/kit/data-table/Num.tsx
import { splitFraction } from '@/kit/measure'

export function Num({ text }: { text: string }) {
  const { whole, fraction } = splitFraction(text)
  return (
    <span className="tabular whitespace-nowrap">
      {whole}
      {fraction ? <span data-fraction="true" className="text-ink-3">{fraction}</span> : null}
    </span>
  )
}
```

```tsx
// src/kit/data-table/DataTable.tsx
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import type { Column, Density, Totals } from './types'

const ROW_HEIGHT: Record<Density, string> = { dense: 'h-6 text-table-dense stretch-dense', regular: 'h-7 text-table stretch-table', narrative: 'h-[34px] text-table stretch-table' }

type DataTableProps<T> = {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  noun: { singular: string; plural: string }
  total?: number
  density?: Density
  totals?: Totals
  onActivate?: (row: T) => void
  initialSort?: { id: string; desc: boolean }
}

export function DataTable<T>({
  caption, columns, rows, getRowId, noun, total, density = 'regular', totals, onActivate, initialSort,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ? [initialSort] : [])
  const [active, setActive] = useState(0)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])

  const defs = useMemo<ColumnDef<T>[]>(
    () => columns.map((c) => ({
      id: c.id,
      accessorFn: (row: T) => c.sortValue?.(row) ?? 0,
      enableSorting: c.sortValue !== undefined,
      header: c.header,
      cell: ({ row }) => c.cell(row.original),
    })),
    [columns],
  )

  const table = useReactTable({
    data: rows,
    columns: defs,
    state: { sorting },
    onSortingChange: setSorting,
    sortDescFirst: false,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const sorted = table.getRowModel().rows
  const shown = sorted.length
  const all = total ?? rows.length
  const byId = new Map(columns.map((c) => [c.id, c]))

  const moveTo = (index: number) => {
    const next = Math.max(0, Math.min(shown - 1, index))
    setActive(next)
    rowRefs.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); moveTo(index + 1) }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); moveTo(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); moveTo(0) }
    else if (e.key === 'End') { e.preventDefault(); moveTo(shown - 1) }
    else if (e.key === 'Enter' && onActivate) { e.preventDefault(); const r = sorted[index]; if (r) onActivate(r.original) }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="min-w-0 overflow-x-auto" data-scroll="table">
        <table className="min-w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-ink">
                {group.headers.map((header) => {
                  const col = byId.get(header.column.id)
                  const sort = header.column.getIsSorted()
                  const label = (
                    <>
                      {col?.header}
                      {col?.unit ? <span className="ml-1 text-ink-3">{col.unit}</span> : null}
                    </>
                  )
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}
                      className={cn('whitespace-nowrap px-2 py-2 text-label uppercase text-ink-2', col?.align === 'right' ? 'text-right' : 'text-left')}
                    >
                      {header.column.getCanSort() ? (
                        <button type="button" className="uppercase" onClick={header.column.getToggleSortingHandler()}>
                          {label}
                        </button>
                      ) : label}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {shown === 0 ? (
              <tr><td colSpan={columns.length} className="px-2 py-3 text-body text-ink-3">No {noun.plural}.</td></tr>
            ) : sorted.map((row, i) => (
              <tr
                key={row.id}
                ref={(el) => { rowRefs.current[i] = el }}
                tabIndex={i === active ? 0 : -1}
                onFocus={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onClick={onActivate ? () => onActivate(row.original) : undefined}
                className={cn('border-b border-rule focus-visible:bg-band', ROW_HEIGHT[density])}
              >
                {row.getVisibleCells().map((cell) => {
                  const col = byId.get(cell.column.id)
                  const p = col?.proportion?.(row.original)
                  return (
                    <td key={cell.id} className={cn('whitespace-nowrap px-2', col?.align === 'right' ? 'text-right tabular' : 'text-left')}>
                      {p !== undefined ? (
                        <span className="inline-flex w-full items-center justify-end gap-2">
                          <span aria-hidden className="inline-block h-1.5 bg-ink-3" style={{ width: `${Math.round(Math.max(0, Math.min(1, p)) * 64)}px` }} />
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      ) : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {totals ? (
            <tfoot>
              <tr className="border-t-2 border-ink font-semibold">
                {columns.map((c, i) => (
                  <td key={c.id} className={cn('whitespace-nowrap px-2 py-2 text-table', c.align === 'right' ? 'text-right tabular' : 'text-left')}>
                    {i === 0 ? (
                      <span className="flex flex-col">
                        <span>{totals.label}</span>
                        {totals.tiesTo ? <span className="text-label font-normal text-ink-3">ties to {totals.tiesTo}</span> : null}
                      </span>
                    ) : totals.cells[c.id] ?? null}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <p className="text-label text-ink-3">{shown} of {all} {all === 1 ? noun.singular : noun.plural}</p>
    </div>
  )
}
```

Fast-refresh: `DataTable.tsx` exports only the component. Run → PASS. Guardrails → PASS (raw `<table>`/`<button>` are allowed inside `src/kit/`).

- [ ] **Step 3: Commit** — `feat(kit): DataTable with sort, row cursor, counts, totals and fractional digits` (+ trailer).

### Task 10: `Gauge` and `WindowRuler`

**Files:**
- Create: `src/kit/gauge/Gauge.tsx`, `src/kit/gauge/gauge.ts`, `src/kit/window-ruler/WindowRuler.tsx`, `src/kit/window-ruler/window.ts`, tests `src/kit/__tests__/{Gauge,WindowRuler}.test.tsx`

**Interfaces:**
- `gaugeStatus(drift: number, band: number): 'OUT' | 'AT LIMIT' | 'IN'`; `gaugeDomain(drift: number, band: number): number` (next whole multiple of `band` at or above `|drift|`, minimum `2 * band`)
- `Gauge({ label, drift, band }: { label: string; drift: number; band: number })` — fractions; renders an SVG `role="img"` plus the printed value and status.
- `daysBetween(fromIso: string, toIso: string): number` (UTC calendar days)
- `WindowRuler({ label, start, end, today, events }: { label: string; start: string; end: string; today: string; events: { date: string; label: string }[] })`

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/Gauge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gauge } from '@/kit/gauge/Gauge'
import { gaugeDomain, gaugeStatus } from '@/kit/gauge/gauge'

describe('gauge maths', () => {
  it('classifies against the band; the edge is AT LIMIT', () => {
    expect(gaugeStatus(0.132, 0.05)).toBe('OUT')
    expect(gaugeStatus(-0.05, 0.05)).toBe('AT LIMIT')
    expect(gaugeStatus(0.02, 0.05)).toBe('IN')
  })
  it('domain is the next band multiple, at least two bands', () => {
    expect(gaugeDomain(0.132, 0.05)).toBeCloseTo(0.15)
    expect(gaugeDomain(0.01, 0.05)).toBeCloseTo(0.1)
  })
})

describe('Gauge', () => {
  it('prints the true value and status and describes itself', () => {
    render(<Gauge label="US equity" drift={0.132} band={0.05} />)
    expect(screen.getByRole('img', { name: /US equity: drift \+13\.2 pp against tolerance ±5\.0 pp, OUT/ })).toBeInTheDocument()
    expect(screen.getByText('+13.2')).toBeInTheDocument()
    expect(screen.getByText('OUT')).toBeInTheDocument()
  })
  it('clamps an off-scale bar inside the drawing', () => {
    const { container } = render(<Gauge label="Digital" drift={0.9} band={0.05} />)
    const bar = container.querySelector('[data-part="bar"]')!
    const x = Number(bar.getAttribute('x')) + Number(bar.getAttribute('width'))
    expect(x).toBeLessThanOrEqual(200)
  })
})
```

```tsx
// src/kit/__tests__/WindowRuler.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { daysBetween } from '@/kit/window-ruler/window'

describe('WindowRuler', () => {
  it('counts UTC calendar days', () => {
    expect(daysBetween('2026-02-25', '2026-03-27')).toBe(30)
    expect(daysBetween('2026-01-22', '2026-03-23')).toBe(60)
  })
  it('states the window, today and days left', () => {
    render(<WindowRuler label="INTC repurchase window" start="2026-01-22" end="2026-03-23" today="2026-02-25"
      events={[{ date: '2026-02-21', label: 'Loss sale' }]} />)
    expect(screen.getByRole('img', { name: /INTC repurchase window: 2026-01-22 to 2026-03-23, today 2026-02-25, 26 d left/ })).toBeInTheDocument()
    expect(screen.getByText('26 d left · ends 2026-03-23')).toBeInTheDocument()
    expect(screen.getByText('Loss sale')).toBeInTheDocument()
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/kit/gauge/gauge.ts
const EPSILON = 1e-9

export function gaugeStatus(drift: number, band: number): 'OUT' | 'AT LIMIT' | 'IN' {
  const d = Math.abs(drift)
  if (d > band + EPSILON) return 'OUT'
  if (Math.abs(d - band) <= EPSILON) return 'AT LIMIT'
  return 'IN'
}

export function gaugeDomain(drift: number, band: number): number {
  const multiples = Math.max(2, Math.ceil((Math.abs(drift) - EPSILON) / band))
  return multiples * band
}
```

```tsx
// src/kit/gauge/Gauge.tsx
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { fmtDrift, fmtTolerance } from '@/kit/measure'
import { StatusCode } from '@/kit/status/StatusCode'
import { gaugeDomain, gaugeStatus } from './gauge'

const W = 200
const H = 24
const MID = W / 2

export function Gauge({ label, drift, band }: { label: string; drift: number; band: number }) {
  const patternId = `hatch-${useId().replace(/:/g, '')}`
  const status = gaugeStatus(drift, band)
  const domain = gaugeDomain(drift, band)
  const scale = (v: number) => MID + (Math.max(-domain, Math.min(domain, v)) / domain) * MID
  const bandLeft = scale(-band)
  const bandRight = scale(band)
  const end = scale(drift)
  const barX = Math.min(MID, end)
  const barW = Math.abs(end - MID)
  const out = status === 'OUT'
  const description = `${label}: drift ${fmtDrift(drift)} pp against tolerance ${fmtTolerance(band)} pp, ${status}`

  return (
    <div className="inline-flex items-center gap-3">
      <svg role="img" aria-label={description} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="animate-gauge-in text-rule-2">
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={bandLeft} y={4} width={bandRight - bandLeft} height={H - 8} fill={`url(#${patternId})`} />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-rule" strokeWidth={1} />
        <line x1={MID} x2={MID} y1={2} y2={H - 2} className="stroke-ink-3" strokeWidth={1} />
        <rect data-part="bar" x={barX} y={9} width={barW} height={6} className={out ? 'fill-signal' : 'fill-ink-2'} />
        <line x1={end} x2={end} y1={2} y2={H - 2} className="stroke-ink" strokeWidth={out ? 2 : 1} />
      </svg>
      <span className={cn('tabular text-table', out && 'font-semibold')}>{fmtDrift(drift)}</span>
      <span className="text-label text-ink-3">pp</span>
      <StatusCode status={status} />
    </div>
  )
}
```

```ts
// src/kit/window-ruler/window.ts
const DAY = 86_400_000

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`)
  return Math.round((to - from) / DAY)
}
```

```tsx
// src/kit/window-ruler/WindowRuler.tsx
import { fmtDate, fmtDays } from '@/kit/measure'
import { daysBetween } from './window'

type WindowRulerProps = { label: string; start: string; end: string; today: string; events: { date: string; label: string }[] }

const W = 480
const H = 40

export function WindowRuler({ label, start, end, today, events }: WindowRulerProps) {
  const span = Math.max(1, daysBetween(start, end))
  const x = (iso: string) => Math.max(0, Math.min(W, (daysBetween(start, iso) / span) * W))
  const left = Math.max(0, daysBetween(today, end))
  const summary = `${fmtDays(left)} d left · ends ${fmtDate(end)}`
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label uppercase text-ink-2">{label}</figcaption>
      <svg role="img" aria-label={`${label}: ${fmtDate(start)} to ${fmtDate(end)}, today ${fmtDate(today)}, ${fmtDays(left)} d left`}
        viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-[480px]">
        <rect x={0} y={14} width={W} height={12} className="fill-band" />
        {Array.from({ length: span + 1 }, (_, i) => (
          <line key={i} x1={(i / span) * W} x2={(i / span) * W} y1={i % 7 === 0 ? 10 : 14} y2={26} className="stroke-rule-2" strokeWidth={1} />
        ))}
        {events.map((e) => (
          <line key={e.date + e.label} x1={x(e.date)} x2={x(e.date)} y1={4} y2={30} className="stroke-ink-2" strokeWidth={1} />
        ))}
        <line x1={x(today)} x2={x(today)} y1={0} y2={H} className="stroke-ink" strokeWidth={2} />
      </svg>
      <div className="flex flex-wrap justify-between gap-2 text-label text-ink-3">
        <span>{fmtDate(start)}</span>
        {events.map((e) => <span key={e.date + e.label}>{e.label}</span>)}
        <span>Today {fmtDate(today)}</span>
        <span>{summary}</span>
      </div>
    </figure>
  )
}
```

Run → PASS. Commit — `feat(kit): tolerance Gauge and WindowRuler` (+ trailer).

### Task 11: `TaxTape`, `FigureRef`, `SourceChips`

**Files:**
- Create: `src/kit/tax-tape/TaxTape.tsx`, `src/kit/figure-ref/FigureRef.tsx`, `src/kit/source-chips/SourceChips.tsx`, tests `src/kit/__tests__/{TaxTape,FigureRef,SourceChips}.test.tsx`

**Interfaces:**
- `TaxTape({ gains, losses, netShortTerm, netLongTerm, grossTax, netTax, scope, rateBasis }: { gains: number; losses: number; netShortTerm: number; netLongTerm: number; grossTax: number; netTax: number; scope: string; rateBasis: string })` — all USD figures from the engine; the reduction line is `netTax − grossTax`.
- `FigureRef({ children, source, note? }: { children: string; source: string; note?: number })` — focusable figure; tooltip and screen-reader description show the engine source.
- `type Source = { label: string; detail?: string; asOf?: string; confidence?: number }`; `SourceChips({ sources }: { sources: Source[] })`

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/TaxTape.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { MINUS } from '@/kit/measure'

it('runs gains, losses, netting and the estimate, and states scope and rate basis', () => {
  render(<TaxTape gains={122_388} losses={-45_850} netShortTerm={0} netLongTerm={76_538} grossTax={29_128} netTax={18_216}
    scope="Nets this proposal's legs only." rateBasis="Federal rates incl. 3.8% NIIT; state tax excluded." />)
  expect(screen.getByText('+122,388')).toBeInTheDocument()
  expect(screen.getByText(`${MINUS}45,850`)).toBeInTheDocument()
  expect(screen.getByText(`${MINUS}10,912`)).toBeInTheDocument()
  expect(screen.getByText('18,216')).toBeInTheDocument()
  expect(screen.getByText("Nets this proposal's legs only.")).toBeInTheDocument()
  expect(screen.getByText(/state tax excluded/)).toBeInTheDocument()
})
```

```tsx
// src/kit/__tests__/FigureRef.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FigureRef } from '@/kit/figure-ref/FigureRef'

it('is focusable and describes its engine source', () => {
  render(<p>Tax of about <FigureRef source="rebalance.estimatedTaxImpact" note={3}>$18,216</FigureRef>.</p>)
  const fig = screen.getByText('$18,216').closest('[data-figure]') as HTMLElement
  expect(fig).toHaveAttribute('tabindex', '0')
  expect(fig).toHaveAccessibleDescription('Source: rebalance.estimatedTaxImpact')
  expect(screen.getByText('3')).toBeInTheDocument()
})
```

```tsx
// src/kit/__tests__/SourceChips.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourceChips } from '@/kit/source-chips/SourceChips'

it('lists what a finding relies on, with as-of time and confidence', () => {
  render(<SourceChips sources={[{ label: 'Drift calculation', detail: 'acc-002 vs Growth', asOf: '2026-02-25T12:00:00Z', confidence: 0.92 }]} />)
  expect(screen.getByText('Relies on')).toBeInTheDocument()
  expect(screen.getByText('Drift calculation')).toBeInTheDocument()
  expect(screen.getByText('as of 2026-02-25 12:00 UTC')).toBeInTheDocument()
  expect(screen.getByText('confidence 92')).toBeInTheDocument()
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/kit/tax-tape/TaxTape.tsx
import { cn } from '@/lib/utils'
import { fmtMoney, fmtResult, isNegative } from '@/kit/measure'

type TaxTapeProps = {
  gains: number; losses: number; netShortTerm: number; netLongTerm: number
  grossTax: number; netTax: number; scope: string; rateBasis: string
}

function Line({ label, value, indent, strong }: { label: string; value: string; indent?: boolean; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', indent && 'pl-3 text-ink-2')}>
      <span className="text-body">{label}</span>
      <span className="inline-flex items-baseline gap-1.5">
        <span className={cn('tabular text-table', (strong || isNegative(value)) && 'font-semibold')}>{value}</span>
        <span className="text-label text-ink-3">USD</span>
      </span>
    </div>
  )
}

export function TaxTape({ gains, losses, netShortTerm, netLongTerm, grossTax, netTax, scope, rateBasis }: TaxTapeProps) {
  return (
    <section aria-label="Tax effect estimate" className="border border-ink bg-face p-4">
      <Line label="Gains realized" value={fmtResult(gains)} />
      <Line label="Losses realized" value={fmtResult(losses)} />
      <Line label="Net, long-term" value={fmtResult(netLongTerm)} indent />
      <Line label="Net, short-term" value={fmtResult(netShortTerm)} indent />
      <div className="my-2 border-t border-ink" />
      <Line label="Tax on gains before netting" value={fmtMoney(grossTax)} />
      <Line label="Reduced by netting the losses" value={fmtResult(netTax - grossTax)} />
      <div className="my-2 border-t-2 border-ink" />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body font-semibold">Estimated net tax</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="tabular text-total stretch-wide">{fmtMoney(netTax)}</span>
          <span className="text-label text-ink-3">USD</span>
        </span>
      </div>
      <p className="mt-3 text-label normal-case text-ink-3">{scope}</p>
      <p className="text-label normal-case text-ink-3">{rateBasis}</p>
    </section>
  )
}
```

```tsx
// src/kit/figure-ref/FigureRef.tsx
import { useId } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

export function FigureRef({ children, source, note }: { children: string; source: string; note?: number }) {
  const descId = useId()
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span data-figure tabIndex={0} aria-describedby={descId}
            className="tabular underline decoration-ink-3 decoration-dotted underline-offset-4">
            {children}
            {note !== undefined ? <sup className="ml-0.5 text-label text-ink-3">{note}</sup> : null}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="border border-ink bg-face px-2 py-1 text-label normal-case text-ink">{`Source: ${source}`}</Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <span id={descId} className="sr-only">{`Source: ${source}`}</span>
    </Tooltip.Provider>
  )
}
```

```tsx
// src/kit/source-chips/SourceChips.tsx
import { fmtScore, fmtTimestamp } from '@/kit/measure'

export type Source = { label: string; detail?: string; asOf?: string; confidence?: number }

export function SourceChips({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-label uppercase text-ink-3">Relies on</span>
      {sources.map((s) => (
        <span key={s.label + (s.detail ?? '')} className="inline-flex flex-wrap items-baseline gap-1.5 border border-rule-2 px-2 py-0.5 text-label normal-case text-ink-2">
          <span className="font-semibold text-ink">{s.label}</span>
          {s.detail ? <span>{s.detail}</span> : null}
          {s.asOf ? <span>{`as of ${fmtTimestamp(s.asOf)}`}</span> : null}
          {s.confidence !== undefined ? <span>{`confidence ${fmtScore(s.confidence)}`}</span> : null}
        </span>
      ))}
    </div>
  )
}
```

`SourceChips.tsx` exports a type alongside the component; type exports do not trigger the fast-refresh rule. If lint disagrees, move `Source` to `src/kit/source-chips/source.ts`.

Run → PASS. Commit — `feat(kit): TaxTape, FigureRef and SourceChips` (+ trailer).

### Task 12: Records — `Stamp`, `RecordSlip`, `VisibilityBand`, `RecordTrail`

**Files:**
- Create: `src/kit/stamp/Stamp.tsx`, `src/kit/record-slip/RecordSlip.tsx`, `src/kit/visibility/VisibilityBand.tsx`, `src/kit/visibility/visibility.ts`, `src/kit/record-trail/RecordTrail.tsx`, tests `src/kit/__tests__/{Stamp,RecordSlip,VisibilityBand,RecordTrail}.test.tsx`

**Interfaces:**
- `Stamp({ state, person, role?, at? }: { state: 'approved' | 'awaiting'; person: string; role?: string; at?: string })`
- `RecordSlip({ kind, title, recordId, fingerprint?, recordedBy, at, archive, children? }: { kind: string; title: string; recordId: string; fingerprint?: string; recordedBy: { name: string; role: string }; at: string; archive: string; children?: ReactNode })`
- `type Visibility = 'private' | 'internal' | 'client'`; `VISIBILITY_WORDS: Record<Visibility, string>`; `VisibilityBand({ visibility, scale?, audience? }: { visibility: Visibility; scale?: 'thread' | 'message'; audience?: string })`
- `type TrailState = 'DONE' | 'PENDING' | 'NOT STARTED'`; `RecordTrail({ steps }: { steps: { label: string; actor: string; state: TrailState; at?: string }[] })`

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/VisibilityBand.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { VISIBILITY_WORDS } from '@/kit/visibility/visibility'

describe('VisibilityBand', () => {
  it('uses the exact words', () => {
    expect(VISIBILITY_WORDS).toEqual({ private: 'Only you', internal: "Firm only · client can't see", client: 'CLIENT CAN SEE' })
  })
  it.each(['private', 'internal', 'client'] as const)('%s announces who can see it at both scales', (v) => {
    const { unmount } = render(<VisibilityBand visibility={v} scale="thread" audience="Robert Johnson" />)
    expect(screen.getByRole('note', { name: `Visibility: ${VISIBILITY_WORDS[v]}` })).toHaveAttribute('data-visibility', v)
    expect(screen.getByText(VISIBILITY_WORDS[v])).toBeInTheDocument()
    unmount()
    render(<VisibilityBand visibility={v} scale="message" />)
    expect(screen.getByText(VISIBILITY_WORDS[v])).toBeInTheDocument()
  })
  it('names the client audience on client threads', () => {
    render(<VisibilityBand visibility="client" audience="Robert Johnson" />)
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument()
  })
})
```

```tsx
// src/kit/__tests__/Stamp.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stamp } from '@/kit/stamp/Stamp'

it('approved and awaiting differ by shape and words, not colour', () => {
  const { rerender } = render(<Stamp state="awaiting" person="Joel Lewis" role="Advisor of record" />)
  expect(screen.getByRole('status')).toHaveTextContent('AWAITING YOUR SIGNATURE')
  expect(screen.getByText('AWAITING YOUR SIGNATURE')).toHaveAttribute('data-stamp', 'awaiting')
  rerender(<Stamp state="approved" person="Joel Lewis" role="Advisor of record" at="2026-02-25T12:03:00Z" />)
  expect(screen.getByText('APPROVED')).toHaveAttribute('data-stamp', 'approved')
  expect(screen.getByText('2026-02-25 12:03 UTC')).toBeInTheDocument()
})
```

```tsx
// src/kit/__tests__/RecordSlip.test.tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordSlip } from '@/kit/record-slip/RecordSlip'

it('shows who, role, when, record ID and archive status', () => {
  render(<RecordSlip kind="Approval · binding" title="Rebalance approved" recordId="REC-222EF522" fingerprint="AAA22E77"
    recordedBy={{ name: 'Joel Lewis', role: 'Advisor of record' }} at="2026-02-25T12:03:00Z" archive="Non-rewritable · supervisory review" />)
  expect(screen.getByRole('heading', { name: 'Rebalance approved' })).toBeInTheDocument()
  for (const t of ['REC-222EF522', 'AAA22E77', 'Joel Lewis, Advisor of record', '2026-02-25 12:03 UTC', 'Non-rewritable · supervisory review']) {
    expect(screen.getByText(t)).toBeInTheDocument()
  }
})
```

```tsx
// src/kit/__tests__/RecordTrail.test.tsx
import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RecordTrail } from '@/kit/record-trail/RecordTrail'

it('lists ordered steps with state and actor', () => {
  render(<RecordTrail steps={[
    { label: 'Plan signed', actor: 'Joel Lewis', state: 'DONE', at: '2026-02-25T12:03:00Z' },
    { label: 'Exception review of SPY, EFA', actor: 'Mark Davis', state: 'PENDING' },
    { label: 'Release to the custodian', actor: 'Trading', state: 'NOT STARTED' },
  ]} />)
  const items = within(screen.getByRole('list', { name: 'Record trail' })).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(within(items[1]!).getByText('PENDING')).toBeInTheDocument()
  expect(within(items[0]!).getByText('2026-02-25 12:03 UTC')).toBeInTheDocument()
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/kit/visibility/visibility.ts
export type Visibility = 'private' | 'internal' | 'client'

export const VISIBILITY_WORDS: Record<Visibility, string> = {
  private: 'Only you',
  internal: "Firm only · client can't see",
  client: 'CLIENT CAN SEE',
}
```

```tsx
// src/kit/visibility/VisibilityBand.tsx
import { cn } from '@/lib/utils'
import { VISIBILITY_WORDS, type Visibility } from './visibility'

const RULE: Record<Visibility, string> = {
  private: 'border-t-2 border-dashed border-ink-2',
  internal: 'hatch h-2',
  client: 'border-t-4 border-ink',
}

type BandProps = { visibility: Visibility; scale?: 'thread' | 'message'; audience?: string }

export function VisibilityBand({ visibility, scale = 'thread', audience }: BandProps) {
  const words = VISIBILITY_WORDS[visibility]
  return (
    <div role="note" aria-label={`Visibility: ${words}`} data-visibility={visibility} data-scale={scale}
      className={cn('flex flex-col', scale === 'thread' ? 'gap-1.5' : 'gap-1')}>
      <div aria-hidden className={RULE[visibility]} />
      <div className={cn('flex items-baseline justify-between gap-3', scale === 'message' && 'justify-start')}>
        <span className={cn('text-label', visibility === 'client' ? 'font-bold text-ink' : 'text-ink-2')}>{words}</span>
        {audience ? <span className="text-label normal-case text-ink-2">{audience}</span> : null}
      </div>
    </div>
  )
}
```

```tsx
// src/kit/stamp/Stamp.tsx
import { cn } from '@/lib/utils'
import { fmtTimestamp } from '@/kit/measure'

type StampProps = { state: 'approved' | 'awaiting'; person: string; role?: string; at?: string }

export function Stamp({ state, person, role, at }: StampProps) {
  const approved = state === 'approved'
  return (
    <div role="status" className="flex flex-wrap items-center gap-4">
      <span data-stamp={state}
        className={cn('px-3 py-1.5 stretch-wide text-total uppercase tracking-wide',
          approved ? 'bg-ink text-face' : 'border-2 border-ink text-ink text-body font-semibold')}>
        {approved ? 'APPROVED' : 'AWAITING YOUR SIGNATURE'}
      </span>
      <span className="flex flex-col text-body">
        <span className="font-semibold">{person}</span>
        {role ? <span className="text-ink-2">{role}</span> : null}
        {at ? <span className="tabular text-ink-3">{fmtTimestamp(at)}</span> : null}
      </span>
    </div>
  )
}
```

```tsx
// src/kit/record-slip/RecordSlip.tsx
import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'

type RecordSlipProps = {
  kind: string; title: string; recordId: string; fingerprint?: string
  recordedBy: { name: string; role: string }; at: string; archive: string; children?: ReactNode
}

export function RecordSlip({ kind, title, recordId, fingerprint, recordedBy, at, archive, children }: RecordSlipProps) {
  return (
    <article className="border border-dashed border-ink-2 bg-face p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label uppercase text-ink-2">{kind}</span>
        <span className="tabular text-label text-ink-3">{recordId}</span>
      </div>
      <h3 className="mt-1 text-body font-semibold">{title}</h3>
      {children ? <div className="mt-2 text-body">{children}</div> : null}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-2 text-label">
        <dt className="uppercase text-ink-3">Recorded by</dt><dd className="normal-case">{`${recordedBy.name}, ${recordedBy.role}`}</dd>
        <dt className="uppercase text-ink-3">At</dt><dd className="tabular normal-case">{fmtTimestamp(at)}</dd>
        <dt className="uppercase text-ink-3">Archive</dt><dd className="normal-case">{archive}</dd>
        {fingerprint ? (<><dt className="uppercase text-ink-3">Fingerprint</dt><dd className="tabular normal-case">{fingerprint}</dd></>) : null}
      </dl>
    </article>
  )
}
```

```tsx
// src/kit/record-trail/RecordTrail.tsx
import { cn } from '@/lib/utils'
import { fmtTimestamp } from '@/kit/measure'

export type TrailState = 'DONE' | 'PENDING' | 'NOT STARTED'
type TrailStep = { label: string; actor: string; state: TrailState; at?: string }

const STATE: Record<TrailState, string> = {
  DONE: 'bg-ink text-face',
  PENDING: 'border border-ink text-ink',
  'NOT STARTED': 'border border-dashed border-ink-3 text-ink-3',
}

export function RecordTrail({ steps }: { steps: TrailStep[] }) {
  return (
    <ol aria-label="Record trail" className="border-t border-ink">
      {steps.map((s) => (
        <li key={s.label} className="grid grid-cols-[10rem_1fr_8rem_auto] items-center gap-3 border-b border-rule py-2 text-body max-[700px]:grid-cols-1">
          <span className="tabular text-label text-ink-3">{s.at ? fmtTimestamp(s.at) : '—'}</span>
          <span>{s.label}</span>
          <span className="text-ink-2">{s.actor}</span>
          <span className={cn('justify-self-start px-1.5 text-label uppercase', STATE[s.state])}>{s.state}</span>
        </li>
      ))}
    </ol>
  )
}
```

Run → PASS. Commit — `feat(kit): Stamp, RecordSlip, VisibilityBand and RecordTrail` (+ trailer).

### Task 13: Keyboard layer

**Files:**
- Create: `src/kit/keyboard/keys.ts`, `src/kit/keyboard/KeyboardProvider.tsx`, `src/kit/keyboard/keyboard-context.ts`, `src/kit/keyboard/use-jump-keys.ts`, `src/kit/keyboard/use-focus-after.ts`, `src/kit/keyboard/CommandLine.tsx`, `src/kit/keyboard/KeySheet.tsx`, `src/kit/keyboard/KeyLegend.tsx`, test `src/kit/__tests__/Keyboard.test.tsx`
- Modify: `src/app/RootLayout.tsx`

**Interfaces:**
- `type Binding = { key: string; label: string; run: () => void }`; `type Destination = { id: string; label: string; aliases: string[]; run: () => void }`
- `isEditableTarget(target: EventTarget | null): boolean`; `matchDestinations(query: string, destinations: Destination[]): Destination[]` (in `keys.ts`)
- `KeyboardProvider({ destinations, children })` — handles `/` (command line), `?` (key sheet) and registered single-key bindings; ignores keys while typing or with Ctrl/Meta/Alt.
- `useJumpKeys(scope: string, bindings: Binding[]): void`
- `useFocusAfter(): (targetId?: string) => void` — focuses `targetId`, else the page `h1`.
- `KeyLegend()` — footer listing `/`, `?` and current bindings.

- [ ] **Step 1: Failing tests**

```tsx
// src/kit/__tests__/Keyboard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { isEditableTarget, matchDestinations } from '@/kit/keyboard/keys'
import { Page } from '@/kit/page/Page'
import { Button } from '@/kit/button/Button'

function Jumps({ onT }: { onT: () => void }) {
  const bindings = useMemo(() => [{ key: 't', label: 'Toggle theme', run: onT }], [onT])
  useJumpKeys('test', bindings)
  return <input aria-label="Notes" />
}

describe('keyboard', () => {
  it('matches destinations by label and alias', () => {
    const d = [{ id: 'kit', label: 'Component kit', aliases: ['kit', 'components'], run: () => {} }]
    expect(matchDestinations('comp', d)).toHaveLength(1)
    expect(matchDestinations('kit', d)).toHaveLength(1)
    expect(matchDestinations('zzz', d)).toHaveLength(0)
  })
  it('knows editable targets', () => {
    const input = document.createElement('input')
    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(document.createElement('div'))).toBe(false)
  })
  it('runs a jump key, but not while typing or with a modifier', async () => {
    const onT = vi.fn()
    render(<KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider>)
    await userEvent.keyboard('t')
    expect(onT).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Control>}t{/Control}')
    expect(onT).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByLabelText('Notes'))
    await userEvent.keyboard('t')
    expect(onT).toHaveBeenCalledTimes(1)
  })
  it('/ opens the command line and Enter runs the first match', async () => {
    const run = vi.fn()
    render(<KeyboardProvider destinations={[{ id: 'kit', label: 'Component kit', aliases: ['kit'], run }]}><p>x</p></KeyboardProvider>)
    await userEvent.keyboard('/')
    const box = screen.getByRole('combobox', { name: 'Go to' })
    await userEvent.type(box, 'kit{Enter}')
    expect(run).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('? opens the key sheet listing the bindings', async () => {
    render(<KeyboardProvider destinations={[]}><Jumps onT={() => {}} /></KeyboardProvider>)
    await userEvent.keyboard('?')
    const sheet = screen.getByRole('dialog', { name: 'Keyboard' })
    expect(sheet).toHaveTextContent('Toggle theme')
    expect(sheet).toHaveTextContent('Command line')
  })
  it('useFocusAfter moves focus to the page heading', async () => {
    function Harness() {
      const focusAfter = useFocusAfter()
      return <Page title="Kit"><Button onClick={() => focusAfter()}>Withdraw</Button></Page>
    }
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/kit/keyboard/keys.ts
export type Binding = { key: string; label: string; run: () => void }
export type Destination = { id: string; label: string; aliases: string[]; run: () => void }

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

export function matchDestinations(query: string, destinations: Destination[]): Destination[] {
  const q = query.trim().toLowerCase()
  if (!q) return destinations
  return destinations.filter((d) => [d.label, ...d.aliases].some((name) => name.toLowerCase().includes(q)))
}
```

```ts
// src/kit/keyboard/keyboard-context.ts
import { createContext } from 'react'
import type { Binding } from './keys'

export type KeyboardContextValue = {
  register: (scope: string, bindings: Binding[]) => () => void
  bindings: Binding[]
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null)
```

```ts
// src/kit/keyboard/use-jump-keys.ts
import { useContext, useEffect } from 'react'
import { KeyboardContext } from './keyboard-context'
import type { Binding } from './keys'

export function useJumpKeys(scope: string, bindings: Binding[]): void {
  const ctx = useContext(KeyboardContext)
  if (!ctx) throw new Error('useJumpKeys must be used inside KeyboardProvider')
  const { register } = ctx
  useEffect(() => register(scope, bindings), [register, scope, bindings])
}
```

```ts
// src/kit/keyboard/use-focus-after.ts
import { useCallback } from 'react'
import { PAGE_TITLE_ID } from '@/kit/page/ids'

export function useFocusAfter(): (targetId?: string) => void {
  return useCallback((targetId?: string) => {
    requestAnimationFrame(() => {
      const target = (targetId ? document.getElementById(targetId) : null) ?? document.getElementById(PAGE_TITLE_ID)
      target?.focus()
    })
  }, [])
}
```

```tsx
// src/kit/keyboard/CommandLine.tsx
import { useId, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@/kit/dialog/Dialog'
import { cn } from '@/lib/utils'
import { matchDestinations, type Destination } from './keys'

type CommandLineProps = { open: boolean; onOpenChange: (open: boolean) => void; destinations: Destination[] }

export function CommandLine({ open, onOpenChange, destinations }: CommandLineProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listId = useId()
  const matches = matchDestinations(query, destinations)

  const close = () => { setQuery(''); setIndex(0); onOpenChange(false) }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(matches.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const target = matches[index]
      if (target) { close(); target.run() }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title="Command line">
      <input
        role="combobox"
        aria-label="Go to"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={matches[index] ? `${listId}-${matches[index].id}` : undefined}
        autoFocus
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIndex(0) }}
        onKeyDown={onKeyDown}
        className="w-full border border-ink bg-bg px-3 py-2 text-body text-ink"
      />
      <ul id={listId} role="listbox" aria-label="Destinations" className="mt-2 flex flex-col">
        {matches.length === 0 ? <li className="px-3 py-2 text-body text-ink-3">No destination matches.</li> : null}
        {matches.map((d, i) => (
          <li key={d.id} id={`${listId}-${d.id}`} role="option" aria-selected={i === index}
            className={cn('px-3 py-2 text-body', i === index && 'bg-band font-semibold')}>
            {d.label}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
```

```tsx
// src/kit/keyboard/KeySheet.tsx
import { Dialog } from '@/kit/dialog/Dialog'
import type { Binding } from './keys'

const GLOBAL = [{ key: '/', label: 'Command line' }, { key: '?', label: 'This key sheet' }]

export function KeySheet({ open, onOpenChange, bindings }: { open: boolean; onOpenChange: (o: boolean) => void; bindings: Binding[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
        {[...GLOBAL, ...bindings].map((b) => (
          <div key={b.key + b.label} className="contents">
            <dt><kbd className="border border-ink-2 px-1.5 text-label">{b.key}</kbd></dt>
            <dd>{b.label}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
```

```tsx
// src/kit/keyboard/KeyboardProvider.tsx
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KeyboardContext } from './keyboard-context'
import { isEditableTarget, type Binding, type Destination } from './keys'
import { CommandLine } from './CommandLine'
import { KeySheet } from './KeySheet'

export function KeyboardProvider({ destinations, children }: { destinations: Destination[]; children: ReactNode }) {
  const [scopes, setScopes] = useState<Map<string, Binding[]>>(new Map())
  const [commandOpen, setCommandOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const register = useCallback((scope: string, bindings: Binding[]) => {
    setScopes((prev) => new Map(prev).set(scope, bindings))
    return () => setScopes((prev) => { const next = new Map(prev); next.delete(scope); return next })
  }, [])

  const bindings = useMemo(() => [...scopes.values()].flat(), [scopes])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return
      if (commandOpen || sheetOpen) return
      if (e.key === '/') { e.preventDefault(); setCommandOpen(true); return }
      if (e.key === '?') { e.preventDefault(); setSheetOpen(true); return }
      const match = bindings.find((b) => b.key === e.key)
      if (match) { e.preventDefault(); match.run() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings, commandOpen, sheetOpen])

  const value = useMemo(() => ({ register, bindings }), [register, bindings])

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      <CommandLine open={commandOpen} onOpenChange={setCommandOpen} destinations={destinations} />
      <KeySheet open={sheetOpen} onOpenChange={setSheetOpen} bindings={bindings} />
    </KeyboardContext.Provider>
  )
}
```

```tsx
// src/kit/keyboard/KeyLegend.tsx
import { useContext } from 'react'
import { KeyboardContext } from './keyboard-context'

export function KeyLegend() {
  const ctx = useContext(KeyboardContext)
  const items = [{ key: '/', label: 'command' }, { key: '?', label: 'all keys' }, ...(ctx?.bindings ?? [])]
  return (
    <footer className="mx-auto flex max-w-[1440px] flex-wrap gap-4 border-t border-rule px-6 py-3 text-label text-ink-3">
      {items.map((b) => (
        <span key={b.key + b.label} className="inline-flex items-center gap-1.5">
          <kbd className="border border-ink-3 px-1">{b.key}</kbd>
          <span className="normal-case">{b.label}</span>
        </span>
      ))}
    </footer>
  )
}
```

`src/app/RootLayout.tsx`:

```tsx
import { useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { KeyLegend } from '@/kit/keyboard/KeyLegend'
import type { Destination } from '@/kit/keyboard/keys'

export function RootLayout() {
  const navigate = useNavigate()
  const destinations = useMemo<Destination[]>(() => [
    { id: 'home', label: 'Workspace home', aliases: ['home'], run: () => navigate('/') },
    { id: 'kit', label: 'Component kit', aliases: ['kit', 'components', 'gallery'], run: () => navigate('/kit') },
  ], [navigate])
  return (
    <KeyboardProvider destinations={destinations}>
      <Outlet />
      <KeyLegend />
    </KeyboardProvider>
  )
}
```

Run → PASS, plus the full kit suite. Commit — `feat(kit): keyboard layer — jump keys, command line, key sheet, focus after change` (+ trailer).

### Task 14: Home, not-found and the `/kit` gallery on acc-002

**Files:**
- Modify: `src/app/pages/HomePage.tsx`, `src/app/pages/NotFoundPage.tsx`, `src/app/routes.tsx`
- Create: `src/app/pages/KitPage.tsx`, `src/app/pages/kit/KitSections.tsx`, `src/app/pages/kit/use-kit-data.ts`, `src/app/pages/kit/ThemeToggle.tsx`, test `src/app/__tests__/routes.test.tsx`

**Interfaces:**
- Consumes: hooks `useAccount` (`@/hooks/use-accounts`), `usePositions`, `useDrift` (`@/hooks/use-portfolio`), `useTaxLots` (`@/hooks/use-tax-lots`), `useOpenWashSaleWindows` (`@/hooks/use-open-wash-sale-windows`); service `previewRebalance` (`@/services/oms`); `todayISO` (`@/lib/clock`); `RATE_DISCLOSURE` (`@/lib/tax-rules`). If a hook file was deleted in Task 2, use the matching service through `useQuery` instead.
- Produces: `useKitData(): { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: KitData }` with `KitData = { account, positions, drift, lots, windows, preview }` typed from the services' return types. Root element of `/kit` has `data-kit-ready="true"` only when ready.

- [ ] **Step 1: Failing route test**

```tsx
// src/app/__tests__/routes.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { routes } from '@/app/routes'
import { createTestQueryClient } from '@/test/render'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<QueryClientProvider client={createTestQueryClient()}><RouterProvider router={router} /></QueryClientProvider>)
}

describe('routes', () => {
  it.each(['/', '/kit', '/no-such-page'])('%s renders exactly one h1', async (path) => {
    renderAt(path)
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
  it('the kit becomes ready on acc-002 data', async () => {
    const { container } = renderAt('/kit')
    await screen.findByText('Robert Johnson Individual', {}, { timeout: 5000 })
    expect(container.querySelector('[data-kit-ready="true"]')).not.toBeNull()
  })
  it('shows all three visibility bands', async () => {
    renderAt('/kit')
    for (const w of ['Only you', "Firm only · client can't see", 'CLIENT CAN SEE']) {
      expect((await screen.findAllByText(w)).length).toBeGreaterThanOrEqual(2)
    }
  })
})
```

Run → FAIL (`/kit` not found, headings mismatch).

- [ ] **Step 2: Pages**

`src/app/pages/HomePage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'

export function HomePage() {
  return (
    <Page title="Advisor Desktop" eyebrow="Workspace">
      <p className="max-w-[65ch] text-body text-ink-2">
        The threads-first workspace is under construction. The component kit shows the design system on live demo data.
      </p>
      <Link to="/kit" className="mt-4 inline-block text-body underline underline-offset-4">Open the component kit</Link>
    </Page>
  )
}
```

`src/app/pages/NotFoundPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'

export function NotFoundPage() {
  return (
    <Page title="Page not found" eyebrow="Workspace">
      <Link to="/" className="text-body underline underline-offset-4">Go to the workspace</Link>
    </Page>
  )
}
```

`src/app/pages/kit/use-kit-data.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { getAccount, getTaxLots, getOpenWashSaleWindows } from '@/services/custodian'
import { getDrift, getPositions } from '@/services/pms'
import { previewRebalance } from '@/services/oms'

const ACCOUNT_ID = 'acc-002'

async function loadKitData() {
  const [account, positions, drift, lots, windows, previews] = await Promise.all([
    getAccount(ACCOUNT_ID), getPositions(ACCOUNT_ID), getDrift(ACCOUNT_ID), getTaxLots(ACCOUNT_ID),
    getOpenWashSaleWindows(ACCOUNT_ID), previewRebalance({ accountIds: [ACCOUNT_ID], taxAware: true }),
  ])
  const preview = previews.find((p) => p.accountId === ACCOUNT_ID)
  if (!preview) throw new Error(`No rebalance preview returned for ${ACCOUNT_ID}`)
  return { account, positions, drift, lots, windows, preview }
}

export type KitData = Awaited<ReturnType<typeof loadKitData>>
export type KitState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: KitData }

export function useKitData(): KitState {
  const q = useQuery({ queryKey: ['kit', ACCOUNT_ID], queryFn: loadKitData, staleTime: Infinity })
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'error', error: q.error }
  return { status: 'ready', data: q.data }
}
```

`src/app/pages/kit/ThemeToggle.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { applyTheme, readThemeChoice, saveThemeChoice, type ThemeChoice } from '@/kit/theme'

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemeChoice, string> = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' }

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice)
  const next = () => {
    const c = NEXT[choice]
    applyTheme(c); saveThemeChoice(c); setChoice(c)
  }
  return <Button rank="secondary" onClick={next}>{LABEL[choice]}</Button>
}
```

`src/app/pages/kit/KitSections.tsx` renders one `Pane` per component group using `data` only (no literals):

```tsx
import { Fragment, useState } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { Grid, MainColumn, SidePanel } from '@/kit/layout/Grid'
import { Reading } from '@/kit/reading/Reading'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { Button } from '@/kit/button/Button'
import { Attestation } from '@/kit/attestation/Attestation'
import { Stepper } from '@/kit/stepper/Stepper'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Gauge } from '@/kit/gauge/Gauge'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { FigureRef } from '@/kit/figure-ref/FigureRef'
import { SourceChips } from '@/kit/source-chips/SourceChips'
import { Stamp } from '@/kit/stamp/Stamp'
import { RecordSlip } from '@/kit/record-slip/RecordSlip'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { RecordTrail } from '@/kit/record-trail/RecordTrail'
import { clientMoney, fmtDrift, fmtMoney, fmtPrice, fmtQuantity, fmtResult, fmtTolerance, fmtWeight } from '@/kit/measure'
import { todayISO, now } from '@/lib/clock'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import type { Status } from '@/kit/status/status'
import type { KitData } from './use-kit-data'

const STATUSES: Status[] = ['OUT', 'AT LIMIT', 'IN', 'BLOCK', 'WARN', 'CLEAR', 'OPEN']

export function KitSections({ data }: { data: KitData }) {
  const { account, positions, drift, lots, windows, preview } = data
  const [attested, setAttested] = useState(false)
  const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]
  const symbolOf = new Map(positions.map((p) => [p.id, p.symbol]))
  const sells = preview.trades.filter((t) => t.side === 'sell')
  const gains = sells.reduce((s, t) => s + Math.max(0, t.realisedShortTerm) + Math.max(0, t.realisedLongTerm), 0)
  const losses = sells.reduce((s, t) => s + Math.min(0, t.realisedShortTerm) + Math.min(0, t.realisedLongTerm), 0)
  const netShortTerm = preview.trades.reduce((s, t) => s + t.realisedShortTerm, 0)
  const netLongTerm = preview.trades.reduce((s, t) => s + t.realisedLongTerm, 0)
  const restriction = windows[0]
  const stamp = now().toISOString()

  return (
    <Grid>
      <MainColumn>
        <Pane title="Readings" meta={account.name}>
          <div className="flex flex-wrap gap-10">
            {worst ? <Reading label={`Max drift · ${worst.assetClass}`} value={fmtDrift(worst.drift)} unit="pp" size="readout-md"
              limit={`tol ${fmtTolerance(drift.driftTolerance)} pp`} status={Math.abs(worst.drift) > drift.driftTolerance ? 'OUT' : 'IN'} /> : null}
            <Reading label="Account value" value={fmtMoney(account.totalValue)} unit="USD" size="total" />
          </div>
        </Pane>
        <Pane title="Status codes and tags">
          <div className="flex flex-wrap gap-4">{STATUSES.map((s) => <StatusCode key={s} status={s} />)}</div>
          <div className="flex flex-wrap gap-2"><Tag tone="hatch">NO MARKET</Tag><Tag>OFF-MODEL</Tag><Tag tone="solid">HELD</Tag></div>
          <div className="flex flex-wrap gap-4"><Button>Approve</Button><Button rank="secondary">Withdraw</Button><Button rank="quiet">View lots</Button></div>
        </Pane>
        <Pane title="Drift against model" meta={`band ${fmtTolerance(drift.driftTolerance)} pp`}>
          <div className="flex flex-col gap-2">
            {drift.assetClassDrifts.map((d) => <Gauge key={d.assetClass} label={d.assetClass} drift={d.drift} band={drift.driftTolerance} />)}
          </div>
        </Pane>
        <Pane title="Holdings" meta={account.name}>
          <DataTable caption="Holdings" rows={positions} getRowId={(p) => p.id} total={positions.length}
            noun={{ singular: 'position', plural: 'positions' }}
            columns={[
              { id: 'symbol', header: 'Symbol', cell: (p) => p.symbol, sortValue: (p) => p.symbol },
              { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (p) => <Num text={fmtQuantity(p.quantity)} />, sortValue: (p) => p.quantity },
              { id: 'price', header: 'Price', unit: 'USD', align: 'right', cell: (p) => fmtPrice(p.price), sortValue: (p) => p.price },
              { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (p) => fmtMoney(p.marketValue), sortValue: (p) => p.marketValue, proportion: (p) => p.weight },
              { id: 'weight', header: 'Weight', unit: '%', align: 'right', cell: (p) => fmtWeight(p.weight), sortValue: (p) => p.weight },
              { id: 'gain', header: 'Unrealized', unit: 'USD', align: 'right', cell: (p) => fmtResult(p.gainLoss), sortValue: (p) => p.gainLoss },
            ]}
            totals={{ label: 'Total', tiesTo: 'account value', cells: { value: fmtMoney(positions.reduce((s, p) => s + p.marketValue, 0)) } }} />
        </Pane>
        <Pane title="Tax lots" meta={`${lots.length} lots`}>
          <DataTable caption="Tax lots" density="dense" rows={lots} getRowId={(l) => l.id} total={lots.length}
            noun={{ singular: 'lot', plural: 'lots' }}
            columns={[
              { id: 'symbol', header: 'Symbol', cell: (l) => symbolOf.get(l.positionId) ?? l.positionId, sortValue: (l) => symbolOf.get(l.positionId) ?? '' },
              { id: 'acquired', header: 'Acquired', cell: (l) => l.purchaseDate, sortValue: (l) => l.purchaseDate },
              { id: 'term', header: 'Term', cell: (l) => (l.holdingPeriod === 'long' ? 'Long-term' : 'Short-term'), sortValue: (l) => l.holdingPeriod },
              { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} />, sortValue: (l) => l.quantity },
              { id: 'gain', header: 'Unrealized', unit: 'USD', align: 'right', cell: (l) => fmtResult(l.gainLoss), sortValue: (l) => l.gainLoss },
            ]} />
        </Pane>
        {restriction ? (
          <Pane title="Restriction window">
            <WindowRuler label={`${restriction.symbol} repurchase window`} start={restriction.start} end={restriction.end} today={todayISO()}
              events={[{ date: restriction.saleDate, label: 'Loss sale' }]} />
          </Pane>
        ) : null}
        <Pane title="Visibility indicator test view">
          {(['private', 'internal', 'client'] as const).map((v) => (
            <Fragment key={v}>
              <VisibilityBand visibility={v} scale="thread" audience={v === 'client' ? account.name : undefined} />
              <div className="pl-6"><VisibilityBand visibility={v} scale="message" /></div>
            </Fragment>
          ))}
        </Pane>
        <Pane title="Records">
          <Stamp state="awaiting" person="Advisor of record" />
          <RecordSlip kind="Approval · binding" title={`Rebalance of ${account.name}`} recordId="REC-EXAMPLE"
            recordedBy={{ name: 'Advisor of record', role: 'Approver' }} at={stamp} archive="Non-rewritable · supervisory review">
            {`${preview.trades.length} legs, estimated net tax ${clientMoney(preview.estimatedTaxImpact)}.`}
          </RecordSlip>
          <RecordTrail steps={[
            { label: 'Rebalance preview built', actor: 'Rebalance engine', state: 'DONE', at: stamp },
            { label: 'Compliance exception review', actor: 'Compliance', state: 'PENDING' },
            { label: 'Release to the custodian', actor: 'Trading', state: 'NOT STARTED' },
          ]} />
          <Stepper label="Rebalance this account" currentId="approve" steps={[
            { id: 'drift', label: 'Drift and lots', state: 'DONE' },
            { id: 'preview', label: 'Proposal', state: 'PREVIEWED' },
            { id: 'approve', label: 'Approve', state: 'OPEN' },
            { id: 'message', label: 'Client message', state: 'DRAFT' },
          ]} />
          <Attestation id="kit-attest" checked={attested} onChange={setAttested}>I reviewed every leg and its pre-trade reading.</Attestation>
        </Pane>
      </MainColumn>
      <SidePanel label="Tax effect">
        <TaxTape gains={gains} losses={losses} netShortTerm={netShortTerm} netLongTerm={netLongTerm}
          grossTax={preview.grossTaxOnGains} netTax={preview.estimatedTaxImpact}
          scope="Nets this proposal's legs only." rateBasis={RATE_DISCLOSURE} />
        <p className="text-body">Estimated tax of about <FigureRef source="rebalance.estimatedTaxImpact" note={1}>{clientMoney(preview.estimatedTaxImpact)}</FigureRef>.</p>
        <SourceChips sources={[{ label: 'Rebalance preview', detail: account.name, asOf: stamp }, { label: 'Drift calculation', detail: `${drift.assetClassDrifts.length} asset classes`, asOf: stamp }]} />
      </SidePanel>
    </Grid>
  )
}
```

Notes for the implementer:
- "REC-EXAMPLE" and "Advisor of record" are gallery placeholders for components whose real data arrives with the records model in phase 2; they are labels, not figures. Keep them visibly generic; do not invent a person's name.
- If `Position` has no `weight` field at runtime, compute `p.marketValue / account.totalValue` for the proportion and the weight column.
- If the field names on `preview` differ after Phase 0 merges (e.g. `grossTaxOnGains`), follow the service types; never cast.

`src/app/pages/KitPage.tsx`:

```tsx
import { Page } from '@/kit/page/Page'
import { KitSections } from './kit/KitSections'
import { ThemeToggle } from './kit/ThemeToggle'
import { useKitData } from './kit/use-kit-data'

export function KitPage() {
  const state = useKitData()
  return (
    <Page title="Component kit" eyebrow="Advisor Desktop · instrument" meta={<ThemeToggle />}>
      <div data-kit-ready={state.status === 'ready' ? 'true' : 'false'}>
        {state.status === 'loading' ? <p className="text-body text-ink-3">Loading acc-002 from the engine…</p> : null}
        {state.status === 'error' ? <p role="alert" className="text-body">{state.error.message}</p> : null}
        {state.status === 'ready' ? <KitSections data={state.data} /> : null}
      </div>
    </Page>
  )
}
```

Add `{ path: 'kit', element: <KitPage /> }` to the children in `src/app/routes.tsx` (before the `*` route).

- [ ] **Step 3: Run tests, lint, build; raise the guardrail floor**

`node_modules/.bin/vitest run src/app src/kit src/__tests__ && pnpm lint && pnpm build` → green. If Task 5 lowered the file-count floor, restore it to `> 3` now.

- [ ] **Step 4: Commit** — `feat(app): home, not-found and the /kit gallery on acc-002` (+ trailer).

### Task 15: Visual baseline and responsive checks

**Files:**
- Create: `playwright.visual.config.ts`, `e2e-visual/kit.spec.ts`, `docs/superpowers/visual/` (screenshots)
- Modify: `package.json` (script `"visual": "playwright test -c playwright.visual.config.ts"`), `.gitignore` (add `!docs/superpowers/visual/*.png` after the `*.png` line)

- [ ] **Step 1: Config and spec**

```ts
// playwright.visual.config.ts
import { defineConfig, devices } from '@playwright/test'

// Each worktree runs its own dev server on VISUAL_PORT so parallel runs never share a server.
const port = Number(process.env.VISUAL_PORT ?? 5173)
const isolated = process.env.VISUAL_PORT !== undefined

export default defineConfig({
  testDir: './e2e-visual',
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: `pnpm dev --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: !isolated, timeout: 120_000 },
})
```

```ts
// e2e-visual/kit.spec.ts
import { test, expect, type Page } from '@playwright/test'

async function openKit(page: Page, theme: 'light' | 'dark', width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`/kit?theme=${theme}`)
  await expect(page.locator('[data-kit-ready="true"]')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
}

for (const theme of ['light', 'dark'] as const) {
  test(`kit baseline · ${theme}`, async ({ page }) => {
    await openKit(page, theme, 1440)
    await page.screenshot({ path: `docs/superpowers/visual/kit-${theme}.png`, fullPage: true, animations: 'disabled', caret: 'hide' })
  })
}

test('no page-level horizontal scroll at 1024px', async ({ page }) => {
  await openKit(page, 'light', 1024)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('no clipped labels at 1440px', async ({ page }) => {
  await openKit(page, 'light', 1440)
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('th, [data-status], [data-tone], [data-stamp]')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent ?? ''),
  )
  expect(clipped).toEqual([])
})
```

- [ ] **Step 2: Run**

`VISUAL_PORT=5195 pnpm visual` → 4 passed; two PNGs written. Open both screenshots (Read tool) and fix anything clipped, overlapping or unreadable in either theme; re-run until clean. Record what you changed.

- [ ] **Step 3: Commit** — `test(visual): kit baseline in both themes, overflow and clipping checks` (+ trailer), including the two PNGs.

### Task 16: Merge `main` (Phase 0) into `workspace`

Phase 0 is being implemented on `main` by other agents. Run this task when the controller reports Phase 0 (or a usable part of it) has merged to `main`; it may also run more than once.

- [ ] **Step 1: Merge**

```bash
git fetch origin
git merge origin/main
```

Resolve conflicts:
- **Modify/delete on old-UI files** (`src/features/**`, `src/components/**`, old e2e): keep the deletion (`git rm <path>`).
- **`src/features/portfolios/tax/shared.tsx` edited on `main`:** git should follow the Task 1 rename into `src/lib/tax-rules.ts`. If it does not, re-apply `main`'s change by hand to `src/lib/tax-rules.ts` (e.g. the 40.8% short-term rate) and `git rm` the old path.
- **Engine files** (`src/mocks`, `src/lib`, `src/services`, `src/types`): take `main`'s version unless it re-imports `@/features/...`; if so, point the import at `@/lib/tax-rules` / `@/lib/cost-basis`.

- [ ] **Step 2: Adopt what the gallery should show** (only for Phase 0 items that have landed)
- Model display name (0.4): show it in the Readings pane meta ("Growth"), from the new service.
- Loss-sale window (0.2): add a second `WindowRuler` for the proposal's projected window using the leg's `repurchaseBlockedUntil`.
- Rate basis (0.6): pass the exposed rate basis to `TaxTape.rateBasis` instead of `RATE_DISCLOSURE` if it replaces it.
- Recorded event times (0.5): use `eventTime(n)` for the gallery's `RecordTrail` and `RecordSlip` timestamps.
- People directory (0.3): replace the "Advisor of record" placeholders with the directory's advisor name and role.

- [ ] **Step 3: Verify and commit**

`pnpm exec tsc --noEmit && node_modules/.bin/vitest run && pnpm lint && pnpm build && VISUAL_PORT=5195 pnpm visual` → green; refresh the two baseline PNGs if the gallery changed, and look at them.

```bash
git add -A
git commit -m "merge: phase 0 engine fixes from main into workspace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
