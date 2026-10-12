# Phase 0 (scenario truth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MSW engine and mock data on branch `phase-0` correct for every workspace job (spec items 0.2–0.7), with an invariant test for each fix, and keep the shared contracts byte-compatible with branch `workspace`.

**Architecture:** The engine is the MSW mock layer under `src/mocks` (handlers compute; `src/mocks/data` holds fixtures and engine-derived copy). Contracts the UI reads live in `src/services/*.ts` and `src/types/*.ts`. Every figure in copy is derived from the engine at module load (or, for `nba-001`, on read) and tied to it by an invariant test. No UI component changes; old UI tests change only where a figure legitimately moves.

**Tech Stack:** TypeScript (strict), React 18 (old UI, untouched), MSW 2, Vitest 4 (jsdom), ESLint, Vite.

**Spec:** `docs/superpowers/specs/2026-10-11-phase-0-scenario-truth-design.md` (binding). Read it before Task 1.

> **Note, 2026-10-12:** this plan dates the INTC harvest 2026-02-21, a Saturday. The controller's Task 14 ruling (spec "Amendments") moved it to Friday 2026-02-20 with a market-hours fill; the window became 2026-01-21 to 2026-03-22. The plan's dates below are left as they were written.

**Base:** branch `phase-0` at or after `4de430e` (PR #5, `claude/funny-turing-de0c7d`, merged: per-lot `saleWashSaleRisk`, symbol-level `repurchaseBlockedUntil` on `TaxLot`, YTD-netted `estimateTaxOnReturns`, `hh-001`/`hh-002` `married_filing_jointly`). Review-fix commits to PR #5 (for example to `src/lib/wash-sale.ts`'s `Acquisition` type) may sit on top; no task here depends on `Acquisition`'s shape. Locate code by the quoted anchors, not by line numbers.

Every task below was prototyped on a scratch copy of `phase-0` + PR #5 and its tests, `lint` and `build` ran green there in this order. Figures quoted in tests were read from that run.


> **Controller note:** this plan's pinned figures were derived at 4de430e. Commits 12ae873, cdac856 and db1619c (PR #5 review fixes: partial wash sales, IRA/Roth permanent disallowance, signed return-level estimate) landed afterwards. Where a pinned figure here disagrees with the engine at your base, re-derive it from the engine and record before → after in the commit; never force the engine to match a stale plan figure.

## Global Constraints

- Strict TypeScript: no `any` (use `unknown` and narrow), `type` over `interface`, no enums, ESM only, no barrel files (no re-export modules).
- Run a single test file with `node_modules/.bin/vitest run <path>`; type-check with `node_modules/.bin/tsc --noEmit -p .` (tests are type-checked too). At the end of every task: `node_modules/.bin/vitest run` (full suite), `pnpm lint` (max-warnings 0) and `pnpm build`. `pnpm build` rewrites the tracked `tsconfig.tsbuildinfo`; do not commit that file (`git checkout -- tsconfig.tsbuildinfo`).
- Frozen today is 2026-02-25 (`MOCK_TODAY_ISO`, `MOCK_NOW_ISO = '2026-02-25T12:00:00Z'` in `src/lib/clock.ts`). Never read the live clock (`new Date()` with no argument, `Date.now()`).
- No hand-typed figures in copy: derive every number from the engine and tie copy to engine with an invariant test.
- Old UI tests (`src/features/**/__tests__`) may change only where a figure legitimately moves; put the arithmetic in the commit message.
- No UI work: do not edit any `.tsx` component. Test fixtures that must satisfy a widened type are the only `.tsx` edits allowed.
- Never use a real person's name for demo people. The advisor is Adrian Hale (`user-001`).
- Commit after each task. End every commit message with `Co-Authored-By: Claude <your model name> <noreply@anthropic.com>`, naming the model that wrote the commit.
- Execute the tasks in order. Pairs that touch the same file or type, and so must never run in parallel: 2→11 (`messages.ts`), 3→9→10 (`oms.ts`), 4→10 (`pms.ts`), 5→13 (tax rates feed the INTC benefit), 6→8 (`realised-sales.ts`), 7→8 (`custodian.ts`), 9→10 (`src/services/oms.ts` `RebalancePreview`/`ProposedTrade`, and the `PreviewTradesStep` test fixture), 12→13 (`nbas.ts`), 12→14 (`activities.ts`).
- Files copied from branch `workspace` must stay byte-identical: verify with `git diff workspace -- <path>` (empty output).

## Decisions taken in this plan

- **Acts.** The act set is `workspace`'s (`approve_proposal`, `withdraw_approval`, `dispose_exception`, `send_to_client`, `post_firm`, `draft_for_client`, `read_all_firm_threads`). `supervise` is **not** added: the three supervision records on main (`sr-001`..`sr-003`) are the CCO's dispositions of compliance alerts (two approvals, one review in progress), which `dispose_exception` covers; supervisory reading of firm threads is `read_all_firm_threads`. Task 2's test asserts every supervision reviewer `can(…, 'dispose_exception')`.
- **`src/lib/fingerprint.ts` is not copied.** Nothing on main needs it (`people.ts` does not import it); it arrives with the merge.
- **The 2022 INTC lot.** PR #5 replaced `washSaleRestricted` with a per-lot `saleWashSaleRisk` (false for this lot) and a symbol-level `repurchaseBlockedUntil` (the rs-001 window, which restricts buying INTC back, not selling the lot). That is the engine's semantics; Task 8 pins it with tests rather than changing it.
- **rs-003 becomes short-term.** acc-015's remaining INTC was bought 2025-05-25 at the same $34.67 basis as the 4,000 shares rs-003 sold on 2026-02-18, so that sale was short-term, not long-term. Task 8's invariant ("a sale's holding period agrees with its opening transaction") exposed it.
- **Residual drift reasons** attach to every invested (non-cash) asset class whose projected |drift| still exceeds the threshold the trades were generated against. Cash carries none: it is the balancing item (the funding priority in `generateRebalanceTrades`). With any threshold at or below the model band, every class outside the band therefore has a reason; `withinBand` reports the band itself. `replacement_hold` and `below_lot_size` do not occur in the fixtures; unit tests of the classifier cover them.
- **msg-003** is rewritten in place to report acc-002 (spec option 1), from the engine.
- **Extra errors found while planning, fixed in the owning task:** ETHE is named "iShares Ethereum Trust ETF" but ETHE is Grayscale's ticker (iShares' is ETHA) (Task 7); BXPE's name is incomplete (Task 7); `act-012` and `ntf-010` repeat nba-001's "7 portfolios / 3%" and name a non-existent "Growth Equity" model (Task 12); `act-001`/`act-002` are dated after the frozen now (Task 14); `act-011` dates the SMH purchase 2026-02-23 against its recorded 2026-02-21 (Task 14); nba-002 says a February 2026 harvest "could offset realized gains from Q4" (Task 13); ~55 runtime writes in 14 handlers read the live clock (Task 3).
- **Not fixed (UI, out of scope), flagged:** the old Rebalance page sends a 10% threshold by default, wider than every model band, so at its default acc-002 proposes nothing (Task 10's test pins what the engine then reports). The "by Joel Lewis" author byline in `WelcomeOverlay.tsx` and `StatusBar.tsx` is the author's credit, not a demo person, and is left alone.

## Review Focus

1. A loss sale inside an IRA, Roth or 529 must not open a wash-sale window on the proposal (nothing deductible is realised there): Task 9, test "a loss inside an IRA or Roth opens no window".
2. A batch with two accounts of one household must list each account's projected window once, beside the recorded one, on both previews: Task 9, test "one batch for two hh-001 accounts".
3. A threshold wider than the model band (what the old Rebalance page sends) must still give every class it leaves beyond the threshold a reason, and report the band breach: Task 10, test "a threshold wider than the band".
4. A security launched more recently than its lot count in months must never get a lot dated before launch or after today: Task 7, tests "never ages a lot below zero" and "no lot in the book is dated after today".
5. nba-001's figures are computed on read (getters); the NBA endpoint must serve them, not drop them in a spread or JSON round trip: Task 12, test "the NBA endpoint serves the derived figures".

## Merge notes for main → workspace (read before the later merge, not during this plan)

- Byte-identical with `workspace`: `src/lib/clock.ts`, `src/lib/__tests__/clock.test.ts`, `src/mocks/data/people.ts`, `src/mocks/data/__tests__/people.test.ts`, `src/types/workspace.ts`; `src/mocks/data/realised-sales.ts` differs only on the rs-003 line (clean merge).
- `src/mocks/data/messages.ts`: thread-001's `lastMessage` line (Task 11) is adjacent to `workspace`'s identical rename of the `participants` line; resolve by taking main's side.
- `workspace` moved `src/features/portfolios/tax/shared.tsx` to `src/lib/tax-rules.ts` and deleted the old file. Port Task 5's rate change and `TAX_RATE_BASIS` into `src/lib/tax-rules.ts`, and repoint new imports of `@/features/portfolios/tax/shared` (in `nbas.ts`, `messages.ts`, `src/lib/__tests__/tax-rate-basis.test.ts`, `nba-facts.test.ts`, `drift-copy-invariants.test.ts`) to `@/lib/tax-rules`.
- New imports in handlers that `workspace` also edited (`nba.ts`, `ai.ts`, `oms.ts`) sit directly below each file's first import line, away from `workspace`'s changed import lines.
- `src/mocks/handlers/event-clock.ts` (old-UI writes) and `workspace`'s `workspace-store.ts` keep separate sequences; both start after the frozen now.

---

### Task 1: Event clock

**Files:**
- Modify: `src/lib/clock.ts` (copy from `workspace`)
- Modify: `src/lib/__tests__/clock.test.ts` (copy from `workspace`)

**Interfaces:**
- Consumes: nothing.
- Produces: `eventTime(sequence: number): string` in `src/lib/clock.ts` — the frozen now plus `sequence` minutes, ISO with milliseconds (`eventTime(6) === '2026-02-25T12:06:00.000Z'`). Task 3 uses it.

- [ ] **Step 1: Bring in the test from `workspace`**

```bash
git show workspace:src/lib/__tests__/clock.test.ts > src/lib/__tests__/clock.test.ts
```

It adds this block to the existing tests:

```ts
describe('eventTime', () => {
  it('advances one minute per sequence from the frozen now', () => {
    expect(eventTime(0)).toBe('2026-02-25T12:00:00.000Z')
    expect(eventTime(6)).toBe('2026-02-25T12:06:00.000Z')
    expect(eventTime(-30)).toBe('2026-02-25T11:30:00.000Z')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/lib/__tests__/clock.test.ts`
Expected: FAIL — `eventTime is not a function` (or a TypeError on import).

- [ ] **Step 3: Bring in the implementation from `workspace`**

```bash
git show workspace:src/lib/clock.ts > src/lib/clock.ts
```

The only change is this function at the end of the file:

```ts
/** Deterministic event clock: the frozen now plus `sequence` minutes. Recorded acts take successive sequences. */
export function eventTime(sequence: number): string {
  return new Date(Date.parse(MOCK_NOW_ISO) + sequence * 60_000).toISOString()
}
```

- [ ] **Step 4: Run the test and confirm byte-compatibility**

Run: `node_modules/.bin/vitest run src/lib/__tests__/clock.test.ts` — Expected: PASS (5 tests).
Run: `git diff workspace -- src/lib/clock.ts src/lib/__tests__/clock.test.ts` — Expected: no output.

- [ ] **Step 5: Full suite, lint, build, commit**

```bash
node_modules/.bin/vitest run && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/lib/clock.ts src/lib/__tests__/clock.test.ts
git commit -m "feat(clock): eventTime, the frozen now plus one minute per recorded act (§0.5)

Copied byte-for-byte from branch workspace.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 2: People, roles and permissions; supervision records reference the CCO; the advisor is Adrian Hale

**Files:**
- Create: `src/types/workspace.ts` (copy from `workspace`; it is self-contained, no imports)
- Create: `src/mocks/data/people.ts` (copy from `workspace`)
- Create: `src/mocks/data/__tests__/people.test.ts` (copy from `workspace`)
- Modify: `src/types/compliance.ts` (`SupervisionRecord`)
- Modify: `src/mocks/handlers/compliance.ts` (`supervisionRecords`)
- Modify: `src/mocks/data/messages.ts` (rename `joel` → `adrian`, "Joel" → "Adrian")
- Create: `src/mocks/handlers/__tests__/supervision-records.test.ts`
- Create: `src/mocks/__tests__/demo-names.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `src/types/workspace.ts`: `Role`, `Person = { id: string; name: string; role: Role }`, `Act`, `AgentProfile`, and the rest of `workspace`'s types, unchanged.
  - `src/mocks/data/people.ts`: `PEOPLE: readonly Person[]` (`user-001` Adrian Hale advisor, `user-002` Sarah Mitchell csa, `user-003` Mike Chen analyst, `cco-001` Mark Davis compliance, `cli-001` Robert Johnson client), `AGENTS`, `personById(id): Person | undefined`, `can(personId, act: Act): boolean`, `permissionsOf(personId): Act[]`.
  - `SupervisionRecord` gains `reviewerId: string`.

- [ ] **Step 1: Bring in the directory's test and write the new tests**

```bash
git show workspace:src/mocks/data/__tests__/people.test.ts > src/mocks/data/__tests__/people.test.ts
mkdir -p src/mocks/__tests__
```

Create `src/mocks/handlers/__tests__/supervision-records.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getSupervisionRecords } from '@/services/compliance'
import { can, personById } from '@/mocks/data/people'

describe('§0.3 · supervision records reference the CCO by directory id', () => {
  it.each([['comp-004', 'sr-001'], ['comp-006', 'sr-002'], ['comp-002', 'sr-003']])('%s → %s is reviewed by cco-001, Mark Davis', async (alertId, recordId) => {
    const records = await getSupervisionRecords(alertId)
    const record = records.find((r) => r.id === recordId)!
    expect(record.reviewerId).toBe('cco-001')
    expect(record.reviewer).toBe(`${personById('cco-001')!.name} (CCO)`)
    expect(record.reviewer).toBe('Mark Davis (CCO)')
  })

  it('every reviewer may dispose of a compliance exception', async () => {
    for (const alertId of ['comp-002', 'comp-004', 'comp-006']) {
      for (const record of await getSupervisionRecords(alertId)) expect(can(record.reviewerId, 'dispose_exception'), record.id).toBe(true)
    }
  })
})
```

Create `src/mocks/__tests__/demo-names.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { teamMembers } from '@/mocks/data/messages'
import { personById } from '@/mocks/data/people'

/** Every non-test source file under `dir`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('§0.3 · demo people are invented, never real', () => {
  it('no demo data names the author', () => {
    for (const file of sourceFiles(resolve(process.cwd(), 'src/mocks'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/joel/i)
    }
  })

  it("the advisor in the team's threads is the directory's user-001, Adrian Hale", () => {
    const advisor = teamMembers.find((p) => p.id === 'user-001')!
    expect(advisor.name).toBe('Adrian Hale')
    expect(advisor.name).toBe(personById('user-001')!.name)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/supervision-records.test.ts src/mocks/__tests__/demo-names.test.ts`
Expected: FAIL — `Cannot find module '../people'` / `'@/mocks/data/people'`.

- [ ] **Step 3: Bring in the directory and its types**

```bash
git show workspace:src/types/workspace.ts > src/types/workspace.ts
git show workspace:src/mocks/data/people.ts > src/mocks/data/people.ts
```

- [ ] **Step 4: Give supervision records the CCO's id**

In `src/types/compliance.ts`, replace

```ts
export type SupervisionRecord = {
  id: string
  alertId: string
  reviewer: string
```

with

```ts
export type SupervisionRecord = {
  id: string
  alertId: string
  /** The reviewing principal's id in the team directory (`people.ts`). */
  reviewerId: string
  /** Display label, derived from the directory: name and title. */
  reviewer: string
```

In `src/mocks/handlers/compliance.ts`, below `import { getPositionsForAccount } from '../data/positions'` add

```ts
import { personById } from '../data/people'
```

and replace the three records' `reviewer: 'Mark Davis (CCO)'` so the block reads (notes and timestamps unchanged):

```ts
/**
 * §0.3 · the chief compliance officer, the supervisory principal who disposes of these alerts.
 * Records carry his directory id; the display label is read from the directory, not re-typed.
 */
const CCO_ID = 'cco-001'
const ccoReviewer = { reviewerId: CCO_ID, reviewer: `${personById(CCO_ID)!.name} (CCO)` }

const supervisionRecords: SupervisionRecord[] = [
  { id: 'sr-001', alertId: 'comp-004', ...ccoReviewer, action: 'Approved', notes: 'All trades within portfolio guidelines. No restricted securities.', timestamp: '2026-02-22T09:35:00Z' },
  { id: 'sr-002', alertId: 'comp-006', ...ccoReviewer, action: 'Approved', notes: 'SMH is a distinct ETF from INTC. No wash sale concern.', timestamp: '2026-02-21T14:10:00Z' },
  { id: 'sr-003', alertId: 'comp-002', ...ccoReviewer, action: 'Under Review', notes: 'Reviewing client IPS for AAPL exception. Position is long-held with significant unrealized gain.', timestamp: '2026-02-23T10:00:00Z' },
]
```

- [ ] **Step 5: Rename the advisor in the team threads**

In `src/mocks/data/messages.ts` make exactly the edits `workspace` made (`git diff origin/main workspace -- src/mocks/data/messages.ts` shows them):

- `const joel: Participant = { id: 'user-001', name: 'Joel Lewis', role: 'advisor' }` → `const adrian: Participant = { id: 'user-001', name: 'Adrian Hale', role: 'advisor' }`
- every `[joel, ` in `teamMembers` and the five `participants:` arrays → `[adrian, `
- msg-010: `Joel, any households you want to handle personally?` → `Adrian, any households you want to handle personally?`

Then confirm nothing else in demo data carries the name: `grep -rni joel src/mocks` must print nothing. (The "by Joel Lewis" byline in `src/features/welcome/WelcomeOverlay.tsx` and `src/components/layout/StatusBar.tsx` is the author's credit, not demo data: leave it.)

- [ ] **Step 6: Run the tests and confirm byte-compatibility**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/supervision-records.test.ts src/mocks/__tests__/demo-names.test.ts`
Expected: PASS.
Run: `git diff workspace -- src/types/workspace.ts src/mocks/data/people.ts src/mocks/data/__tests__/people.test.ts` — Expected: no output.

- [ ] **Step 7: Full suite, lint, build, commit**

```bash
node_modules/.bin/vitest run && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/types/workspace.ts src/types/compliance.ts src/mocks/data/people.ts src/mocks/data/__tests__/people.test.ts src/mocks/handlers/compliance.ts src/mocks/data/messages.ts src/mocks/handlers/__tests__/supervision-records.test.ts src/mocks/__tests__/demo-names.test.ts
git commit -m "feat(people): team directory and permissions; sr-001..003 reference cco-001; advisor is Adrian Hale (§0.3)

people.ts and types/workspace.ts are copied byte-for-byte from branch workspace. The act set is
workspace's: supervision records are dispositions of compliance alerts (dispose_exception), so no
separate 'supervise' act is added.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 3: Records made at runtime take the event clock

**Files:**
- Create: `src/mocks/handlers/event-clock.ts`
- Modify (each `new Date().toISOString()` and `Date.now()`): `src/mocks/handlers/ai.ts`, `calendar.ts`, `crm.ts`, `email-templates.ts`, `engage.ts`, `messaging.ts`, `nba.ts`, `oms.ts`, `onboarding.ts`, `proposals.ts`, `reconciliation.ts`, `reports.ts`, `settings.ts`, `workflows.ts` (all in `src/mocks/handlers/`)
- Create: `src/mocks/__tests__/event-clock.test.ts`

**Interfaces:**
- Consumes: `eventTime(sequence: number): string` from `@/lib/clock` (Task 1).
- Produces: `nextEventTime(): string` and `nextRecordNumber(): number` in `src/mocks/handlers/event-clock.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/__tests__/event-clock.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { nextEventTime, nextRecordNumber } from '@/mocks/handlers/event-clock'
import { submitTrade } from '@/services/oms'
import { MOCK_NOW_ISO } from '@/lib/clock'

/** Every non-test source file under `dir`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('§0.5 · records made at runtime take the event clock, never the live one', () => {
  it('no mock reads the system clock', () => {
    for (const file of sourceFiles(resolve(process.cwd(), 'src/mocks'))) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/new Date\(\)/)
      expect(source, file).not.toMatch(/Date\.now\(\)/)
    }
  })

  it('successive records get distinct, increasing times after the frozen now', () => {
    const first = nextEventTime()
    const second = nextEventTime()
    expect(Date.parse(first)).toBeGreaterThan(Date.parse(MOCK_NOW_ISO))
    expect(Date.parse(second) - Date.parse(first)).toBe(60_000)
    expect(nextRecordNumber()).toBeLessThan(nextRecordNumber())
  })

  it('an order submitted now is stamped by the event clock', async () => {
    const order = await submitTrade({ accountId: 'acc-002', symbol: 'SPY', side: 'buy', quantity: 1, orderType: 'market' })
    expect(Date.parse(order.submittedAt)).toBeGreaterThan(Date.parse(MOCK_NOW_ISO))
    expect(order.submittedAt.startsWith('2026-02-25T')).toBe(true)
    expect(order.id).toMatch(/^ord-\d+$/)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/__tests__/event-clock.test.ts`
Expected: FAIL — cannot resolve `@/mocks/handlers/event-clock`.

- [ ] **Step 3: Write the event clock**

Create `src/mocks/handlers/event-clock.ts`:

```ts
import { eventTime } from '@/lib/clock'

/**
 * §0.5 · the time and id of every record a handler creates at runtime: an order, a dismissal, an
 * approval, a sent message. Each record takes the next `eventTime` sequence, so records made in one
 * session carry distinct, ordered times after the frozen now, and the live clock is never read.
 */
let sequence = 0
let recordNumber = 0

export function nextEventTime(): string {
  sequence += 1
  return eventTime(sequence)
}

/** A unique, increasing number for the id of a record created at runtime. */
export function nextRecordNumber(): number {
  recordNumber += 1
  return recordNumber
}
```

- [ ] **Step 4: Replace every live-clock read in the handlers**

List them: `grep -rnE "new Date\(\)|Date\.now\(\)" src/mocks | grep -v __tests__` (about 55 lines in the 14 files above). Apply these rules:

- `new Date().toISOString()` → `nextEventTime()`
- `Date.now()` → `nextRecordNumber()` (they all sit inside template-literal ids such as `` `ord-${Date.now()}` ``)
- In each file, add `import { nextEventTime, nextRecordNumber } from './event-clock'` (only the names the file uses) **directly below the file's first import line** (the `msw` import). Do not put it at the end of the import block: `workspace` changed import lines in `nba.ts`, `ai.ts` and `oms.ts`, and an adjacent insertion would conflict at the later merge.

Two sites need more than the rule:

`src/mocks/handlers/ai.ts`, in `makeBriefing`: a briefing's `asOf` is "as of now", not a recorded act. Replace

```ts
  return { title, entityType, metrics, highlights, asOf: new Date().toISOString() }
```

with

```ts
  return { title, entityType, metrics, highlights, asOf: MOCK_NOW_ISO }
```

and change `import { now, MOCK_TODAY_ISO } from '@/lib/clock'` to `import { now, MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'`.

`src/mocks/handlers/crm.ts`, in the `POST /api/crm/clients/:clientId/notes` handler: a new note is created and last updated at the same moment. Replace

```ts
    const body = await request.json() as { content: string }
    const newNote = {
      id: `note-${Date.now()}`,
      clientId: String(params.clientId),
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
```

with

```ts
    const body = await request.json() as { content: string }
    const at = nextEventTime()
    const newNote = {
      id: `note-${nextRecordNumber()}`,
      clientId: String(params.clientId),
      content: body.content,
      createdAt: at,
      updatedAt: at,
```

Where a handler already computes `const now = new Date().toISOString()` once and reuses it (`proposals.ts`, `calendar.ts`, `email-templates.ts`), the rule gives `const now = nextEventTime()`, which keeps one time per request.

- [ ] **Step 5: Run the test, then the whole suite**

Run: `node_modules/.bin/vitest run src/mocks/__tests__/event-clock.test.ts` — Expected: PASS (3 tests).
Run: `grep -rnE "new Date\(\)|Date\.now\(\)" src/mocks | grep -v __tests__` — Expected: no output.

- [ ] **Step 6: Full suite, lint, build, commit**

```bash
node_modules/.bin/vitest run && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/handlers src/mocks/__tests__/event-clock.test.ts
git commit -m "fix(engine): records made at runtime take the event clock, never the live one (§0.5)

Fourteen handlers stamped orders, dismissals, notes, proposals and messages with new Date() and
ids with Date.now(). They now take successive eventTime sequences, so acts recorded in one
session have distinct, ordered times after the frozen now.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 4: Model display names

**Files:**
- Modify: `src/mocks/handlers/pms.ts` (add `modelDisplayName` above `function getModelByIndex`)
- Create: `src/mocks/handlers/__tests__/model-names.test.ts`

**Interfaces:**
- Consumes: nothing new (`findModel` and `MODEL_DEFINITIONS` already in `pms.ts`).
- Produces: `modelDisplayName(modelId: string): string` exported from `src/mocks/handlers/pms.ts`; throws `Error('no model <id>')` for an unknown id. Tasks 11 and 12 use it.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/model-names.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { MODEL_DEFINITIONS, modelDisplayName } from '@/mocks/handlers/pms'

describe('§0.4 · every model reference resolves to its display name', () => {
  it('mod-002 is "Growth"', () => {
    expect(modelDisplayName('mod-002')).toBe('Growth')
  })
  it('every model id an account uses has a name', () => {
    for (const account of accounts) {
      expect(modelDisplayName(account.modelId), account.id).toBe(MODEL_DEFINITIONS.find((m) => m.id === account.modelId)!.name)
    }
  })
  it('an unknown model id is an error, not another model\'s name', () => {
    expect(() => modelDisplayName('mod-999')).toThrow('no model mod-999')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/model-names.test.ts`
Expected: FAIL — `modelDisplayName is not a function`.

- [ ] **Step 3: Implement**

In `src/mocks/handlers/pms.ts`, directly above `function getModelByIndex(index: number): ModelDefinition {`, add:

```ts
/**
 * §0.4 · a model's display name ("mod-002" → "Growth"), from `MODELS` — the one place a model is
 * named. Throws on an unknown id: a name that silently fell back to another model's would label
 * one policy with another's name.
 */
export function modelDisplayName(modelId: string): string {
  const model = findModel(modelId)
  if (!model) throw new Error(`no model ${modelId}`)
  return model.name
}
```

- [ ] **Step 4: Run the test**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/model-names.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Full suite, lint, build, commit**

```bash
node_modules/.bin/vitest run && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/handlers/pms.ts src/mocks/handlers/__tests__/model-names.test.ts
git commit -m "feat(pms): modelDisplayName resolves every model reference to its name (§0.4)

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 5: Short-term gains carry the 3.8% NIIT; the rate basis is exposed

**Files:**
- Modify: `src/features/portfolios/tax/shared.tsx` (rate constants, `TAX_RATE_BASIS`, disclosure text)
- Modify: `src/mocks/handlers/oms.ts` (two comments quoting 37%)
- Create: `src/lib/__tests__/tax-rate-basis.test.ts`
- Modify (figures move): `src/mocks/handlers/__tests__/tax-invariants.test.ts`, `src/mocks/handlers/__tests__/dashboard-consistency.test.ts`, `src/features/portfolios/__tests__/TaxManagementPage.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces (all from `@/features/portfolios/tax/shared`): `TOP_ORDINARY_RATE = 0.37`, `TOP_LONG_TERM_GAINS_RATE = 0.2`, `NIIT_RATE = 0.038`, `SHORT_TERM_RATE = 0.408` (was 0.37), `LONG_TERM_RATE = 0.238` (unchanged), `type TaxRateBasis = { shortTerm: number; longTerm: number; includes: readonly ('federal' | 'niit')[]; excludes: readonly 'state'[] }`, `TAX_RATE_BASIS: TaxRateBasis`. `taxRateFor` and `buildRateDisclosure(shortTermRate, longTermRate)` keep their signatures. Task 13's figures depend on the new short-term rate.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/tax-rate-basis.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  SHORT_TERM_RATE, LONG_TERM_RATE, TOP_ORDINARY_RATE, TOP_LONG_TERM_GAINS_RATE, NIIT_RATE, TAX_RATE_BASIS, taxRateFor,
} from '@/features/portfolios/tax/shared'

describe('§0.6 · both rates carry the 3.8% net investment income tax', () => {
  it('short-term is the top ordinary rate plus NIIT: 40.8%', () => {
    expect(SHORT_TERM_RATE).toBeCloseTo(TOP_ORDINARY_RATE + NIIT_RATE, 12)
    expect(taxRateFor('short')).toBe(0.408)
  })
  it('long-term is the top capital-gains rate plus NIIT: 23.8%', () => {
    expect(LONG_TERM_RATE).toBeCloseTo(TOP_LONG_TERM_GAINS_RATE + NIIT_RATE, 12)
    expect(taxRateFor('long')).toBe(0.238)
  })
  it('the basis states what the rates include and leave out', () => {
    expect(TAX_RATE_BASIS).toEqual({ shortTerm: 0.408, longTerm: 0.238, includes: ['federal', 'niit'], excludes: ['state'] })
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/lib/__tests__/tax-rate-basis.test.ts`
Expected: FAIL — `TOP_ORDINARY_RATE` undefined / `expected 0.37 to be 0.408`.

- [ ] **Step 3: Change the rates and the disclosure**

In `src/features/portfolios/tax/shared.tsx`, replace

```ts
/**
 * C11 · tax-loss-harvesting — a flat 37% was applied to every lot and rendered directly beside a
 * "Long" holding-period badge. Long-term losses offset long-term gains at capital-gains rates.
 *
 * These are the top federal marginal rates and exclude state tax. The screen must say so.
 */
export const SHORT_TERM_RATE = 0.37 as const
/** 20% long-term capital gains + 3.8% net investment income tax. */
export const LONG_TERM_RATE = 0.238 as const
```

with

```ts
/**
 * C11 · tax-loss-harvesting — a flat 37% was applied to every lot and rendered directly beside a
 * "Long" holding-period badge. Long-term losses offset long-term gains at capital-gains rates.
 *
 * These are the top federal marginal rates and exclude state tax. The screen must say so.
 *
 * §0.6 · the 3.8% net investment income tax (IRC §1411) applies to net gain of either character,
 * so it belongs on the short-term rate as much as the long-term one: a top-bracket short-term gain
 * is taxed at 37% + 3.8% = 40.8%, not 37%. The components are kept so the rates can be checked
 * against them; the rates themselves are literals because 0.37 + 0.038 is not exactly 0.408 in
 * floating point.
 */
export const TOP_ORDINARY_RATE = 0.37 as const
export const TOP_LONG_TERM_GAINS_RATE = 0.2 as const
export const NIIT_RATE = 0.038 as const
/** 37% top ordinary rate + 3.8% net investment income tax. */
export const SHORT_TERM_RATE = 0.408 as const
/** 20% long-term capital gains + 3.8% net investment income tax. */
export const LONG_TERM_RATE = 0.238 as const

/** What the two rates include and leave out, so a screen can state the basis of every estimate. */
export type TaxRateBasis = {
  shortTerm: number
  longTerm: number
  includes: readonly ('federal' | 'niit')[]
  excludes: readonly 'state'[]
}

export const TAX_RATE_BASIS: TaxRateBasis = {
  shortTerm: SHORT_TERM_RATE,
  longTerm: LONG_TERM_RATE,
  includes: ['federal', 'niit'],
  excludes: ['state'],
}
```

In the same file, inside `buildRateDisclosure`, replace

```ts
    `Estimated at top federal marginal rates — ${formatRatePercent(shortTermRate)} short-term, ` +
    `${formatRatePercent(longTermRate)} long-term including net investment income tax. State ` +
    'tax is not modelled. Estimates only, not tax advice.'
```

with

```ts
    `Estimated at top federal marginal rates including the ${formatRatePercent(NIIT_RATE)} net ` +
    `investment income tax — ${formatRatePercent(shortTermRate)} short-term, ` +
    `${formatRatePercent(longTermRate)} long-term. State tax is not modelled. Estimates only, not ` +
    'tax advice.'
```

In `src/mocks/handlers/oms.ts`, in the comments above and inside `realiseSale`, change `taxed at \`SHORT_TERM_RATE\` (37%), not` to `taxed at \`SHORT_TERM_RATE\` (40.8%), not`, and `low-gain short-term lot (37% rate)` to `low-gain short-term lot (40.8% rate)`.

- [ ] **Step 4: Run the full suite and re-derive the figures that moved**

Run: `node_modules/.bin/vitest run`
Expected: exactly these four failures, each a legitimate move:

1. `tax-invariants.test.ts` › "C11: short-term losses offset at the ordinary rate, long-term at capital-gains + NIIT". Replace

```ts
  it('C11: short-term losses offset at the ordinary rate, long-term at capital-gains + NIIT', () => {
    expect(SHORT_TERM_RATE).toBe(0.37)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(estimatedTaxBenefit({ gainLoss: -10_000, holdingPeriod: 'short' })).toBeCloseTo(3_700, 2)
```

with

```ts
  it('C11: short-term losses offset at the ordinary rate + NIIT, long-term at capital-gains + NIIT', () => {
    expect(SHORT_TERM_RATE).toBe(0.408)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(estimatedTaxBenefit({ gainLoss: -10_000, holdingPeriod: 'short' })).toBeCloseTo(4_080, 2)
```

2. `tax-invariants.test.ts` › "RATE_DISCLOSURE is buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE), not a separate literal". Replace

```ts
    expect(SHORT_TERM_RATE).toBe(0.37)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(RATE_DISCLOSURE).toBe(buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE))
    expect(RATE_DISCLOSURE).toContain('37% short-term')
```

with

```ts
    expect(SHORT_TERM_RATE).toBe(0.408)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(RATE_DISCLOSURE).toBe(buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE))
    expect(RATE_DISCLOSURE).toContain('40.8% short-term')
    expect(RATE_DISCLOSURE).toContain('3.8% net investment income tax')
```

3. `dashboard-consistency.test.ts` › "acc-015 has a genuine mix of short- and long-term harvestable lots": `expect(expectedBenefit).toBeCloseTo(39_839, 6)` → `expect(expectedBenefit).toBeCloseTo(43_832.8, 6)`.

4. `src/features/portfolios/__tests__/TaxManagementPage.test.tsx` › "acc-044 (CHF)…": `expect(screen.getByText(/37% short-term, 23\.8% long-term/)).toBeInTheDocument()` → `expect(screen.getByText(/40\.8% short-term, 23\.8% long-term/)).toBeInTheDocument()`.

If any other test fails, stop: it is not a legitimate move and needs investigation.

- [ ] **Step 5: Full suite, lint, build, commit**

```bash
node_modules/.bin/vitest run && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/features/portfolios/tax/shared.tsx src/mocks/handlers/oms.ts src/lib/__tests__/tax-rate-basis.test.ts src/mocks/handlers/__tests__/tax-invariants.test.ts src/mocks/handlers/__tests__/dashboard-consistency.test.ts src/features/portfolios/__tests__/TaxManagementPage.test.tsx
git commit -m "fix(tax): short-term gains carry the 3.8% NIIT too — 40.8%, not 37% (§0.6)

TAX_RATE_BASIS states what the rates include (federal, NIIT) and leave out (state).

Figures re-derived:
- C11 short-term benefit on a 10,000 loss: 10,000 × 0.37 = 3,700 → 10,000 × 0.408 = 4,080.
- acc-015 harvest benefit: 105,100 × 0.37 + 4,000 × 0.238 = 38,887 + 952 = 39,839
  → 105,100 × 0.408 + 4,000 × 0.238 = 42,880.8 + 952 = 43,832.8.
- Disclosure reads '40.8% short-term, 23.8% long-term'.
No rebalance pin moves: every taxed leg in the pinned previews is long-term.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---


**Controller addition (ruling):** GLD and any other physically backed precious-metal ETF held in a taxable account is taxed as a collectible: long-term gains at the 28% maximum collectibles rate plus 3.8% NIIT (31.8%), short-term at 40.8% like other short-term gains. Add a `taxCharacter: 'collectible'` (or equivalent) to the security master for GLD (and IAU/SLV/PPLT if present), make `taxRateFor` take it, expose it in the rate basis, and test: a long-term GLD gain is taxed at 31.8%; a long-term SPY gain at 23.8%. Re-derive any pinned figure that moves, with the arithmetic in the commit.

### Task 6: A harvest names its replacement (`replacementSymbol`, as on `workspace`)

**Files:**
- Modify: `src/mocks/data/realised-sales.ts` (copy from `workspace`)
- Create: `src/mocks/data/__tests__/replacement-link.test.ts`

**Interfaces:**
- Consumes: `KNOWN_OPEN_DATES` from `src/mocks/handlers/custodian.ts`, `generateRebalanceTrades` from `src/mocks/handlers/oms.ts` (both existing).
- Produces: `RealisedSale.replacementSymbol?: string`; `rs-001.replacementSymbol === 'SMH'`. Task 8 edits the rs-003 line of this file afterwards.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/replacement-link.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { realisedSales } from '@/mocks/data/realised-sales'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { KNOWN_OPEN_DATES } from '@/mocks/handlers/custodian'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'

describe('a harvest names its replacement (contract shared with the workspace branch)', () => {
  const rs001 = realisedSales.find((s) => s.id === 'rs-001')!

  it('rs-001 was replaced with SMH', () => {
    expect(rs001.replacementSymbol).toBe('SMH')
  })

  it('the replacement is held in the same account, bought on the sale date', () => {
    const account = accounts.find((a) => a.id === rs001.accountId)!
    const smh = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === rs001.replacementSymbol)!
    expect(KNOWN_OPEN_DATES.get(smh.id)).toBe(rs001.saleDate)
  })

  it('a tax-aware rebalance does not sell the replacement inside its hold', () => {
    expect(generateRebalanceTrades(rs001.accountId, true).some((t) => t.symbol === rs001.replacementSymbol)).toBe(false)
  })

  it('every named replacement differs from the security sold', () => {
    for (const sale of realisedSales) if (sale.replacementSymbol !== undefined) expect(sale.replacementSymbol).not.toBe(sale.symbol)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/replacement-link.test.ts`
Expected: FAIL — `expected undefined to be 'SMH'`, plus a TypeScript error on `replacementSymbol` under `tsc`.

- [ ] **Step 3: Bring in `workspace`'s file**

```bash
git show workspace:src/mocks/data/realised-sales.ts > src/mocks/data/realised-sales.ts
git diff workspace -- src/mocks/data/realised-sales.ts   # expect no output
```

It adds to `RealisedSale`:

```ts
  /**
   * The security bought with the proceeds to keep the market exposure the harvest gave up, when
   * there was one. Selling it does not itself cause a wash sale; the window governs buying back
   * `symbol`. The Drift Monitor reads this link to keep a rebalance from trimming the replacement.
   */
  replacementSymbol?: string
```

and `replacementSymbol: 'SMH'` at the end of the rs-001 row. (The comment mentions `workspace`'s Drift Monitor; keep it verbatim so the merge is mechanical.)

- [ ] **Step 4: Run the test**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/replacement-link.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 5: Full suite, lint, build, commit**

```bash
node_modules/.bin/vitest run && pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/data/realised-sales.ts src/mocks/data/__tests__/replacement-link.test.ts
git commit -m "feat(data): a realised harvest names its replacement; rs-001 → SMH

Copied byte-for-byte from branch workspace.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 7: No lot predates its security (IBIT, BXPE); ETHE and BXPE named correctly

**Files:**
- Modify: `src/lib/security-master.ts` (add `INCEPTION_DATES`, `inceptionDate`)
- Modify: `src/mocks/handlers/custodian.ts` (add `monthsSinceInception`, `capLotAges`; cap lot ages in `generateTaxLots`)
- Modify: `src/mocks/data/positions.ts` (ETHE and BXPE names)
- Create: `src/mocks/data/__tests__/lot-inception-invariants.test.ts`

**Interfaces:**
- Consumes: `startOfToday`, `MOCK_TODAY_ISO` from `@/lib/clock`.
- Produces: `inceptionDate(symbol: string): string | undefined` (`@/lib/security-master`); `monthsSinceInception(anchor: Date, inceptionISO: string): number` and `capLotAges(agesOldestFirst: readonly number[], maxAge: number): number[]` (`src/mocks/handlers/custodian.ts`). Task 8 edits `custodian.ts` next.

Facts (verified): iShares Bitcoin Trust ETF (IBIT) began trading on 11 January 2024. Blackstone Private Equity Strategies Fund L.P. (BXPE) held its first close, its inception, on 2 January 2024. ETHE is the Grayscale Ethereum Trust's ticker (an OTC-quoted trust from before 2022, an NYSE Arca ETF since 23 July 2024); iShares' Ethereum fund is ETHA. The lot generator dates lots 3–47 whole months before 2026-02-25, so its earliest possible date is 2022-03-25; every other security held in the book launched before that.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/lot-inception-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLots, capLotAges, monthsSinceInception } from '@/mocks/handlers/custodian'
import { inceptionDate } from '@/lib/security-master'
import { startOfToday, MOCK_TODAY_ISO } from '@/lib/clock'

function lotsWithSymbols(accountId: string) {
  const account = accounts.find((a) => a.id === accountId)!
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const symbolOf = new Map(positions.map((p) => [p.id, p.symbol]))
  return { positions, lots: generateTaxLots(account.id, account.totalValue).map((l) => ({ ...l, symbol: symbolOf.get(l.positionId)! })) }
}

describe('§0.7 · no lot predates its security', () => {
  it('IBIT and BXPE carry their launch dates', () => {
    expect(inceptionDate('IBIT')).toBe('2024-01-11')
    expect(inceptionDate('BXPE')).toBe('2024-01-02')
    expect(inceptionDate('SPY')).toBeUndefined()
  })

  it('every lot in the book is dated on or after its security\'s inception', () => {
    let checked = 0
    for (const account of accounts) {
      for (const lot of lotsWithSymbols(account.id).lots) {
        const inception = inceptionDate(lot.symbol)
        if (inception === undefined) continue
        checked++
        expect(lot.purchaseDate >= inception, `${account.id} ${lot.id} ${lot.symbol} ${lot.purchaseDate}`).toBe(true)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(5)
  })

  it("acc-002's IBIT lots move after launch, stay long-term, and still partition the position at one basis per share", () => {
    const { positions, lots } = lotsWithSymbols('acc-002')
    const ibit = lots.filter((l) => l.symbol === 'IBIT')
    const position = positions.find((p) => p.symbol === 'IBIT')!
    expect(ibit.map((l) => l.purchaseDate)).toEqual(['2024-01-25', '2024-02-25', '2025-01-25'])
    expect(ibit.every((l) => l.holdingPeriod === 'long')).toBe(true)
    expect(ibit.reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(position.quantity, 6)
    expect(ibit.reduce((s, l) => s + l.costBasis, 0)).toBe(position.costBasis)
    expect(ibit.reduce((s, l) => s + l.currentValue, 0)).toBeCloseTo(position.marketValue, 6)
    for (const lot of ibit) expect(lot.costBasis / lot.quantity).toBeCloseTo(position.costBasis / position.quantity, 2)
  })

  it("acc-002's BXPE lot is dated after the fund's first close", () => {
    const bxpe = lotsWithSymbols('acc-002').lots.filter((l) => l.symbol === 'BXPE')
    expect(bxpe.map((l) => l.purchaseDate)).toEqual(['2024-01-25'])
  })

  it('names the securities as their sponsors do', () => {
    const names = new Map(getPositionsForAccount('acc-002', 4_500_000).map((p) => [p.symbol, p.name]))
    expect(names.get('ETHE')).toBe('Grayscale Ethereum Trust ETF')
    expect(names.get('BXPE')).toBe('Blackstone Private Equity Strategies Fund')
  })
})

describe('lot-age capping', () => {
  it('counts the whole months back from the anchor that stay on or after inception', () => {
    expect(monthsSinceInception(startOfToday(), '2024-01-11')).toBe(25)
    expect(monthsSinceInception(startOfToday(), '2024-01-25')).toBe(25)
    expect(monthsSinceInception(startOfToday(), '2024-01-26')).toBe(24)
  })
  it('caps the oldest lots and keeps every capped lot a month apart', () => {
    expect(capLotAges([41, 32, 13], 25)).toEqual([25, 24, 13])
    expect(capLotAges([20, 10], 25)).toEqual([20, 10])
  })
  it('never ages a lot below zero, however recent the launch', () => {
    expect(capLotAges([5, 4, 3], 1)).toEqual([1, 0, 0])
  })
  it('no lot in the book is dated after today', () => {
    for (const account of accounts) {
      for (const lot of generateTaxLots(account.id, account.totalValue)) expect(lot.purchaseDate <= MOCK_TODAY_ISO, `${account.id} ${lot.id}`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/lot-inception-invariants.test.ts`
Expected: FAIL — `inceptionDate is not a function` / `capLotAges is not a function`.

- [ ] **Step 3: Add inception dates to the security master**

In `src/lib/security-master.ts`, directly below

```ts
export function isMarketTradable(symbol: string): boolean {
  return !PERIODIC_LIQUIDITY_SYMBOLS.has(symbol)
}
```

add

```ts
/**
 * The first day each security could be bought, for every security held in the book that launched
 * after 2022-03-25 — the earliest date the custodian's synthetic lot generator can produce
 * (`generateTaxLots` dates lots 3 to 47 whole months before 2026-02-25). Every other held security
 * launched before that date, so no lot can predate it.
 *
 * - IBIT: iShares Bitcoin Trust ETF began trading on 11 January 2024, the first day of US spot
 *   bitcoin ETFs.
 * - BXPE: Blackstone Private Equity Strategies Fund L.P. held its first close, its inception, on
 *   2 January 2024.
 */
const INCEPTION_DATES: ReadonlyMap<string, string> = new Map([
  ['IBIT', '2024-01-11'],
  ['BXPE', '2024-01-02'],
])

export function inceptionDate(symbol: string): string | undefined {
  return INCEPTION_DATES.get(symbol)
}
```

- [ ] **Step 4: Cap generated lot ages at inception**

In `src/mocks/handlers/custodian.ts`, below `import { hasWashSaleRisk, type Acquisition } from '@/lib/wash-sale'` (or whatever the current `@/lib/wash-sale` import line is), add

```ts
import { inceptionDate } from '@/lib/security-master'
```

Directly above `/** Whether \`pos\` was held on \`dateISO\` — false only before a known open date. */`, add

```ts
/** Whole months before `anchor` that still land on or after `inceptionISO`. */
export function monthsSinceInception(anchor: Date, inceptionISO: string): number {
  let months = 0
  for (;;) {
    const earlier = new Date(anchor)
    earlier.setUTCMonth(earlier.getUTCMonth() - (months + 1))
    if (earlier.toISOString().slice(0, 10) < inceptionISO) return months
    months += 1
  }
}

/**
 * Lot ages (whole months, oldest first) no older than `maxAge`, each a month younger than the one
 * before it once capped, so two lots of one position are never dated the same day by the cap.
 */
export function capLotAges(agesOldestFirst: readonly number[], maxAge: number): number[] {
  let ceiling = maxAge
  return agesOldestFirst.map((age) => {
    const capped = Math.max(0, Math.min(age, ceiling))
    ceiling = capped - 1
    return capped
  })
}
```

In `generateTaxLots`, replace

```ts
    // Older lots first, so FIFO and LIFO orderings are meaningful.
    const ages = Array.from({ length: lotCount }, () => 3 + Math.floor(rand() * 45))
      .sort((a, b) => b - a)
```

with

```ts
    // Older lots first, so FIFO and LIFO orderings are meaningful.
    const drawnAges = Array.from({ length: lotCount }, () => 3 + Math.floor(rand() * 45))
      .sort((a, b) => b - a)
    // §0.7 · no lot predates its security: IBIT drew 2022 and 2023 dates for a fund launched in
    // January 2024. The draws are kept (the PRNG stream, and so every other lot, is unchanged)
    // and only capped at the inception.
    const inception = inceptionDate(pos.symbol)
    const ages = inception === undefined ? drawnAges : capLotAges(drawnAges, monthsSinceInception(anchor, inception))
```

Cost basis stays consistent: lots still partition the position's quantity, basis and value, every lot keeps the position's per-share basis ($40.00 for IBIT), and the capped IBIT lots (25 and 24 months) stay long-term, so no tax figure moves.

- [ ] **Step 5: Name ETHE and BXPE correctly**

In `src/mocks/data/positions.ts`:
- pos-027: `name: 'iShares Ethereum Trust ETF'` → `name: 'Grayscale Ethereum Trust ETF'`
- pos-028 and pos-059: `name: 'Blackstone Private Equity Fund'` → `name: 'Blackstone Private Equity Strategies Fund'`

(`grep -rn "iShares Ethereum\|Blackstone Private Equity Fund" src` must print nothing afterwards.)

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/lot-inception-invariants.test.ts` — Expected: PASS (9 tests).
Run: `node_modules/.bin/vitest run` — Expected: all pass; no other figure moves.

- [ ] **Step 7: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/lib/security-master.ts src/mocks/handlers/custodian.ts src/mocks/data/positions.ts src/mocks/data/__tests__/lot-inception-invariants.test.ts
git commit -m "fix(data): no lot predates its security; ETHE is Grayscale's (§0.7)

acc-002's IBIT lots were dated 2022-09-25 and 2023-06-25 for a fund that began trading on
2024-01-11; they are now 2024-01-25 and 2024-02-25 (2025-01-25 unchanged). The BXPE lot moves from
2023-10-25 to 2024-01-25, after the fund's 2024-01-02 first close. Lots still partition each
position at one basis per share and stay long-term, so no tax figure moves. ETHE was labelled
'iShares Ethereum Trust ETF'; ETHE is the Grayscale Ethereum Trust (iShares' is ETHA).

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 8: Opening transactions match their lots; rs-003 is short-term; the 2022 INTC lot is not restricted

**Files:**
- Modify: `src/mocks/handlers/custodian.ts` (`generateTransactions` opening date)
- Modify: `src/mocks/data/realised-sales.ts` (rs-003 `holdingPeriod`)
- Create: `src/mocks/data/__tests__/opening-transaction-invariants.test.ts`

**Interfaces:**
- Consumes: `generateTaxLots`, `generateTaxLotsWithSaleRisk`, `generateTransactions`, `holdingPeriodOn` (existing, `custodian.ts`); `generateRebalanceTrades` (`oms.ts`).
- Produces: no new exports. Behaviour: the opening-balance transaction of a sold symbol still held is dated the oldest lot's purchase date; rs-003 is `'short'`.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/opening-transaction-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { realisedSales } from '@/mocks/data/realised-sales'
import { generateTaxLots, generateTaxLotsWithSaleRisk, generateTransactions, holdingPeriodOn } from '@/mocks/handlers/custodian'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'

function account(id: string) {
  return accounts.find((a) => a.id === id)!
}

function openingFor(accountId: string, symbol: string) {
  const a = account(accountId)
  return generateTransactions(a.id, a.totalValue).find((t) => t.id === `txn-${accountId}-opening-${symbol}`)!
}

describe('§0.7 · an opening transaction matches the lots it opened', () => {
  it("acc-002's INTC opening is dated the day its remaining lot was bought, 2022-07-25", () => {
    expect(openingFor('acc-002', 'INTC').date.slice(0, 10)).toBe('2022-07-25')
    const a = account('acc-002')
    const intc = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'INTC')!
    const lots = generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === intc.id)
    expect(lots.map((l) => l.purchaseDate)).toEqual(['2022-07-25'])
  })

  it('every recorded sale of a held position opens on the oldest lot date of that position', () => {
    for (const sale of realisedSales) {
      const a = account(sale.accountId)
      const position = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === sale.symbol)
      if (!position) continue
      const oldest = generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === position.id).map((l) => l.purchaseDate).sort()[0]
      expect(openingFor(a.id, sale.symbol).date.slice(0, 10), sale.id).toBe(oldest)
    }
  })

  it("every recorded sale's holding period agrees with its opening transaction", () => {
    for (const sale of realisedSales) {
      const opened = openingFor(sale.accountId, sale.symbol).date.slice(0, 10)
      expect(holdingPeriodOn(opened, sale.saleDate), `${sale.id} opened ${opened}, sold ${sale.saleDate}`).toBe(sale.holdingPeriod)
    }
  })
})

describe('§0.7 · the 2022 INTC lot is not restricted by the 2026-02-21 sale', () => {
  it('selling it is not a wash sale: no INTC was bought in the household in the 30 days before today', () => {
    const a = account('acc-002')
    const intc = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'INTC')!
    const [lot] = generateTaxLotsWithSaleRisk(a.id, a.totalValue).filter((l) => l.positionId === intc.id)
    expect(lot!.purchaseDate).toBe('2022-07-25')
    expect(lot!.saleWashSaleRisk).toBe(false)
  })

  it('what the 2026-02-21 sale restricts is buying INTC back, through 2026-03-23', () => {
    const a = account('acc-002')
    const intc = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'INTC')!
    const [lot] = generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === intc.id)
    expect(lot!.repurchaseBlockedUntil).toBe('2026-03-23')
  })

  it('the tax-aware rebalance sells it with no wash-sale flag', () => {
    const leg = generateRebalanceTrades('acc-002', true).find((t) => t.symbol === 'INTC')!
    expect(leg.side).toBe('sell')
    expect(leg.washSaleRisk).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/opening-transaction-invariants.test.ts`
Expected: FAIL — `expected '2025-12-27' to be '2022-07-25'`, and the holding-period test fails on rs-001 (opened 2025-12-27, a long-term sale) and rs-003. The three tests in the second block already pass: PR #5's `saleWashSaleRisk` fixed the restriction; they pin it.

- [ ] **Step 3: Date the opening by the oldest lot**

In `src/mocks/handlers/custodian.ts`, `generateTransactions`, replace

```ts
  const accountSales = realisedSales.filter((s) => s.accountId === accountId)
  const soldSymbols = new Set(accountSales.map((s) => s.symbol))
  const heldBySymbol = new Map(held.map((p) => [p.symbol, p]))
```

with

```ts
  const accountSales = realisedSales.filter((s) => s.accountId === accountId)
  const soldSymbols = new Set(accountSales.map((s) => s.symbol))
  const heldBySymbol = new Map(held.map((p) => [p.symbol, p]))
  // §0.7 · a position still held was opened when its oldest lot was bought: acc-002's INTC opening
  // was dated 2025-12-27 against a lot bought 2022-07-25, and a long-term sale (rs-001) cannot come
  // out of shares bought two months earlier.
  const oldestLotDate = new Map<string, string>()
  for (const lot of soldSymbols.size > 0 ? generateTaxLots(accountId, totalValue) : []) {
    const known = oldestLotDate.get(lot.positionId)
    if (known === undefined || lot.purchaseDate < known) oldestLotDate.set(lot.positionId, lot.purchaseDate)
  }
```

and replace

```ts
    const openingMs = Math.min(baseDate.getTime() - 60 * DAY_MS, earliestSaleMs - DAY_MS)
```

with

```ts
    const openedOn = position ? oldestLotDate.get(position.id) : undefined
    const openingMs = openedOn !== undefined
      ? new Date(`${openedOn}T00:00:00Z`).getTime()
      : Math.min(baseDate.getTime() - 60 * DAY_MS, earliestSaleMs - DAY_MS)
```

(A position sold out entirely — acc-007 NVDA, acc-022 TLT — has no lots and keeps the old rule; both sales are short-term and the old rule agrees with that.)

- [ ] **Step 4: Run the test; rs-003 still fails**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/opening-transaction-invariants.test.ts`
Expected: one failure — `rs-003 opened 2025-05-25, sold 2026-02-18: expected 'short' to be 'long'`. acc-015's remaining 15,000 INTC were bought 2025-05-25 at $34.67 (520,000 / 15,000), the same basis as the 4,000 shares rs-003 sold (138,667 / 4,000), so the sale came out of that purchase and was short-term.

- [ ] **Step 5: Correct rs-003**

In `src/mocks/data/realised-sales.ts`, in the rs-003 row only, change `realisedGainLoss: -24_867, holdingPeriod: 'long' }` to `realisedGainLoss: -24_867, holdingPeriod: 'short' }`. Touch no other line (the file is otherwise byte-identical to `workspace`).

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/opening-transaction-invariants.test.ts` — Expected: PASS (6 tests).
Run: `node_modules/.bin/vitest run` — Expected: all pass (no pinned figure moves).

- [ ] **Step 7: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/handlers/custodian.ts src/mocks/data/realised-sales.ts src/mocks/data/__tests__/opening-transaction-invariants.test.ts
git commit -m "fix(data): opening transactions match their lots; rs-003 was a short-term sale (§0.7)

acc-002's INTC opening balance was dated 2025-12-27 against its 2022-07-25 lot; it is now dated
2022-07-25. The same invariant showed rs-003 (acc-015, 4,000 INTC on 2026-02-18) recorded as
long-term out of shares bought 2025-05-25 at the same 34.67 basis; it is short-term. Michael
Martinez's year-to-date result moves from LT -24,867 to ST -24,867; no pinned figure moves.
The 2022 INTC lot's sale carries no wash-sale risk (PR #5's per-lot test); the rs-001 window
restricts buying INTC back through 2026-03-23. Tests pin both.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 9: A loss sale opens its own wash-sale window (§0.2)

**Files:**
- Modify: `src/services/oms.ts` (`ProposedTrade`, `RebalancePreview`, new `RepurchaseRestriction`)
- Create: `src/mocks/handlers/repurchase-restrictions.ts`
- Modify: `src/mocks/handlers/oms.ts` (imports, `toTrade` in `generateRebalanceTrades`, `POST /api/oms/rebalance`)
- Modify: `src/types/trading.ts` (`ModelProposedTrade`), `src/mocks/handlers/trading.ts` (model-trade preview)
- Modify: `src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx` (fixture only)
- Create: `src/mocks/handlers/__tests__/loss-sale-window.test.ts`

**Interfaces:**
- Consumes: `openWashSaleWindows(asOf, householdId?)` and `washSaleWindow(saleDate): { start; end; days: 61 }` from `src/mocks/data/realised-sales.ts`; `isTaxableAccount` from `@/lib/tax-treatment`.
- Produces:
  - `ProposedTrade.repurchaseBlockedUntil?: string` (sell legs that realise a loss only: `washSaleWindow(MOCK_TODAY_ISO).end`, i.e. `'2026-03-27'`); same optional field on `ModelProposedTrade`.
  - `type RepurchaseRestriction = { symbol: string; start: string; until: string; source: { kind: 'recorded'; saleId: string; accountId: string; saleDate: string } | { kind: 'projected'; accountId: string; saleDate: string } }` in `src/services/oms.ts`.
  - `RebalancePreview.repurchaseRestrictions: RepurchaseRestriction[]` (the account's household, sorted by `until` then `symbol`).
  - `householdRepurchaseRestrictions(householdId: string, asOfISO: string, proposals: readonly ProposalLegs[]): RepurchaseRestriction[]` and `type ProposalLegs = { accountId: string; legs: readonly Pick<ProposedTrade, 'symbol' | 'repurchaseBlockedUntil'>[] }` in `src/mocks/handlers/repurchase-restrictions.ts`.
  - Task 10 also edits `src/services/oms.ts`, `oms.ts` and the same fixture: it must run after this task.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/loss-sale-window.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { previewModelTrades } from '@/services/trading'
import { accounts } from '@/mocks/data/accounts'
import { realisedSales, washSaleWindow } from '@/mocks/data/realised-sales'
import { householdRepurchaseRestrictions } from '@/mocks/handlers/repurchase-restrictions'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTaxableAccount } from '@/lib/tax-treatment'

describe('§0.2 · a loss sale opens its own wash-sale window', () => {
  it("acc-002's tax-aware INTC sale today blocks repurchase through 2026-03-27", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.realisedShortTerm + intc.realisedLongTerm).toBeLessThan(0)
    expect(intc.repurchaseBlockedUntil).toBe('2026-03-27')
    expect(intc.repurchaseBlockedUntil).toBe(washSaleWindow(MOCK_TODAY_ISO).end)
  })

  it('every loss-realising sell leg carries the window end; every other leg omits it', async () => {
    const previews = await previewRebalance({ accountIds: accounts.map((a) => a.id), taxAware: true })
    let lossLegs = 0
    for (const p of previews) {
      for (const t of p.trades) {
        const realisesLoss = t.side === 'sell' && t.realisedShortTerm + t.realisedLongTerm < 0
        if (realisesLoss) lossLegs++
        expect(t.repurchaseBlockedUntil, `${p.accountId} ${t.side} ${t.symbol}`).toBe(realisesLoss ? '2026-03-27' : undefined)
      }
    }
    expect(lossLegs).toBeGreaterThan(1)
  })

  it("the household list keeps rs-001's recorded window (to 2026-03-23) separate from the projected one", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const intc = preview!.repurchaseRestrictions.filter((r) => r.symbol === 'INTC')
    const rs001 = realisedSales.find((s) => s.id === 'rs-001')!
    expect(intc).toEqual([
      { symbol: 'INTC', start: '2026-01-22', until: '2026-03-23', source: { kind: 'recorded', saleId: 'rs-001', accountId: 'acc-002', saleDate: rs001.saleDate } },
      { symbol: 'INTC', start: '2026-01-26', until: '2026-03-27', source: { kind: 'projected', accountId: 'acc-002', saleDate: MOCK_TODAY_ISO } },
    ])
  })

  it("a batch's projected windows reach every account in the household, never another household", () => {
    const proposals = [
      { accountId: 'acc-002', legs: [{ symbol: 'INTC', repurchaseBlockedUntil: '2026-03-27' }] },
      { accountId: 'acc-011', legs: [{ symbol: 'INTC', repurchaseBlockedUntil: '2026-03-27' }] },
    ]
    const hh001 = householdRepurchaseRestrictions('hh-001', MOCK_TODAY_ISO, proposals)
    expect(hh001.filter((r) => r.source.kind === 'projected').map((r) => r.source.accountId)).toEqual(['acc-002'])
    const hh003 = householdRepurchaseRestrictions('hh-003', MOCK_TODAY_ISO, proposals)
    expect(hh003.filter((r) => r.source.kind === 'projected').map((r) => r.source.accountId)).toEqual(['acc-011'])
  })

  it('a loss inside an IRA or Roth opens no window: nothing deductible is realised there', async () => {
    const sheltered = accounts.filter((a) => !isTaxableAccount(a.taxTreatment))
    const previews = await previewRebalance({ accountIds: sheltered.map((a) => a.id), taxAware: true })
    for (const p of previews) {
      expect(p.taxable).toBe(false)
      for (const t of p.trades) expect(t.repurchaseBlockedUntil, `${p.accountId} ${t.symbol}`).toBeUndefined()
    }
  })

  it("one batch for two hh-001 accounts lists each account's projected windows once, beside the recorded one", async () => {
    const previews = await previewRebalance({ accountIds: ['acc-002', 'acc-005'], taxAware: true })
    const lossLegs = previews.flatMap((p) => p.trades.filter((t) => t.repurchaseBlockedUntil).map((t) => `${p.accountId}:${t.symbol}`))
    for (const p of previews) {
      const projected = p.repurchaseRestrictions.filter((r) => r.source.kind === 'projected').map((r) => `${r.source.accountId}:${r.symbol}`)
      expect(projected.sort()).toEqual([...new Set(lossLegs)].sort())
      expect(p.repurchaseRestrictions.filter((r) => r.source.kind === 'recorded').map((r) => r.symbol)).toEqual(['INTC'])
    }
  })

  it('the model-trade preview carries the same window on the same leg', async () => {
    const [preview] = await previewModelTrades('mod-002', ['acc-002'])
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.repurchaseBlockedUntil).toBe('2026-03-27')
    expect(preview!.trades.filter((t) => t.side === 'buy').every((t) => t.repurchaseBlockedUntil === undefined)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/loss-sale-window.test.ts`
Expected: FAIL — cannot resolve `@/mocks/handlers/repurchase-restrictions`.

- [ ] **Step 3: Widen the contract**

In `src/services/oms.ts`, in `ProposedTrade`, replace

```ts
  washSaleRisk: boolean
  // Same account-native
```

with

```ts
  washSaleRisk: boolean
  /**
   * Sell legs that realise a loss only: the last day of the IRC §1091 window the sale opens if
   * executed today — the sale date plus 30 days. Buying the symbol back before then washes the loss.
   */
  repurchaseBlockedUntil?: string
  // Same account-native
```

In `RebalancePreview`, replace

```ts
  /** False for an IRA, Roth or other tax-advantaged account, where a sale realises nothing taxable. */
  taxable: boolean
}
```

with

```ts
  /** False for an IRA, Roth or other tax-advantaged account, where a sale realises nothing taxable. */
  taxable: boolean
  /**
   * IRC §1091 repurchase restrictions on the account's household: windows opened by loss sales
   * already recorded, and windows this batch's own loss legs would open. Sorted by `until`.
   */
  repurchaseRestrictions: RepurchaseRestriction[]
}

/**
 * A window in which buying `symbol` back would wash a loss (IRC §1091): 30 days either side of the
 * loss sale, inclusive. `recorded` windows come from sales already made (`realisedSales`);
 * `projected` windows are the ones this proposal's own loss legs would open if executed today.
 */
export type RepurchaseRestriction = {
  symbol: string
  start: string
  until: string
  source:
    | { kind: 'recorded'; saleId: string; accountId: string; saleDate: string }
    | { kind: 'projected'; accountId: string; saleDate: string }
}
```

In `src/types/trading.ts`, in `ModelProposedTrade`, replace

```ts
  /** Same account-native currency as the parent preview — see `ModelTradePreview.currency`. */
  currency: CurrencyCode
  reason: string
}
```

with

```ts
  /** Same account-native currency as the parent preview — see `ModelTradePreview.currency`. */
  currency: CurrencyCode
  reason: string
  /** Loss-realising sells only: the last day of the IRC §1091 window the sale opens (sale date + 30). */
  repurchaseBlockedUntil?: string
}
```

- [ ] **Step 4: Write the household restriction list**

Create `src/mocks/handlers/repurchase-restrictions.ts`:

```ts
import type { ProposedTrade, RepurchaseRestriction } from '@/services/oms'
import { accounts } from '../data/accounts'
import { openWashSaleWindows, washSaleWindow } from '../data/realised-sales'

/** The legs of one account's proposal, as far as a restriction list needs them. */
export type ProposalLegs = { accountId: string; legs: readonly Pick<ProposedTrade, 'symbol' | 'repurchaseBlockedUntil'>[] }

/**
 * §0.2 · the household's IRC §1091 repurchase restrictions: every open window a recorded loss sale
 * opened, and every window a proposed loss leg in `proposals` would open if executed on `asOfISO`.
 * The two are kept as separate entries with their own source, never merged into one "latest" date
 * per symbol — a reviewer needs to see that a window already exists and that the proposal extends it.
 */
export function householdRepurchaseRestrictions(
  householdId: string,
  asOfISO: string,
  proposals: readonly ProposalLegs[],
): RepurchaseRestriction[] {
  const recorded: RepurchaseRestriction[] = openWashSaleWindows(asOfISO, householdId).map((w) => ({
    symbol: w.symbol,
    start: w.start,
    until: w.end,
    source: { kind: 'recorded', saleId: w.id, accountId: w.accountId, saleDate: w.saleDate },
  }))
  const inHousehold = new Set(accounts.filter((a) => a.householdId === householdId).map((a) => a.id))
  const window = washSaleWindow(asOfISO)
  const projected = new Map<string, RepurchaseRestriction>()
  for (const { accountId, legs } of proposals) {
    if (!inHousehold.has(accountId)) continue
    for (const leg of legs) {
      if (leg.repurchaseBlockedUntil === undefined) continue
      projected.set(`${accountId}:${leg.symbol}`, {
        symbol: leg.symbol,
        start: window.start,
        until: leg.repurchaseBlockedUntil,
        source: { kind: 'projected', accountId, saleDate: asOfISO },
      })
    }
  }
  return [...recorded, ...projected.values()]
    .sort((a, b) => a.until.localeCompare(b.until) || a.symbol.localeCompare(b.symbol))
}
```

- [ ] **Step 5: Stamp loss legs and serve the list**

In `src/mocks/handlers/oms.ts`:

Change `import { openWashSaleWindows } from '../data/realised-sales'` to `import { openWashSaleWindows, washSaleWindow } from '../data/realised-sales'` and directly below it add `import { householdRepurchaseRestrictions } from './repurchase-restrictions'`. (Do not touch the `@/features/portfolios/tax/shared` import line or the two lines around it: `workspace` changed that line.)

In `toTrade` inside `generateRebalanceTrades`, replace

```ts
      const realised = side === 'sell' && taxable && target.position
        ? realiseSale(ownLots, target.position, estimatedValue, taxAware)
        : NOTHING_REALISED
      return {
```

with

```ts
      const realised = side === 'sell' && taxable && target.position
        ? realiseSale(ownLots, target.position, estimatedValue, taxAware)
        : NOTHING_REALISED
      const realisesLoss = realised.shortTerm + realised.longTerm < 0
      return {
```

and replace

```ts
          { symbol: target.symbol, side, realisesLoss: realised.shortTerm + realised.longTerm < 0, soldLotIds: realised.consumedLotIds },
          lossWindows, acquisitions, MOCK_TODAY_ISO,
        ),
```

with

```ts
          { symbol: target.symbol, side, realisesLoss, soldLotIds: realised.consumedLotIds },
          lossWindows, acquisitions, MOCK_TODAY_ISO,
        ),
        // §0.2 · a loss sale opens its own §1091 window, today through today + 30.
        ...(side === 'sell' && realisesLoss ? { repurchaseBlockedUntil: washSaleWindow(MOCK_TODAY_ISO).end } : {}),
```

(If a review fix to PR #5 has changed the `hasWashSaleRisk` call's argument list, keep its new arguments and only replace the `realisesLoss:` expression with the `realisesLoss` constant.) Non-taxable accounts already realise nothing (`NOTHING_REALISED`), so their legs never carry the field.

In the `http.post('/api/oms/rebalance', …)` handler, replace

```ts
    const estimates = estimateTaxOnReturns(batch, MOCK_TODAY_ISO)
    const previews: RebalancePreview[] = batch.map(({ account, legs: trades }, i) => {
```

with

```ts
    const estimates = estimateTaxOnReturns(batch, MOCK_TODAY_ISO)
    const proposals = batch.map(({ account, legs }) => ({ accountId: account.id, legs }))
    const previews: RebalancePreview[] = batch.map(({ account, legs: trades }, i) => {
```

and replace

```ts
        taxable: isTaxableAccount(account.taxTreatment),
      }
    })
```

with

```ts
        taxable: isTaxableAccount(account.taxTreatment),
        repurchaseRestrictions: householdRepurchaseRestrictions(account.householdId, MOCK_TODAY_ISO, proposals),
      }
    })
```

In `src/mocks/handlers/trading.ts`, in the model-trade preview's `trades: trades.map((t) => ({ … }))`, replace

```ts
        reason: sleeveReason(t),
      })),
```

with

```ts
        reason: sleeveReason(t),
        ...(t.repurchaseBlockedUntil === undefined ? {} : { repurchaseBlockedUntil: t.repurchaseBlockedUntil }),
      })),
```

- [ ] **Step 6: Satisfy the widened type in the one UI test fixture**

In `src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx`, in the `zeroResult: RebalancePreview` fixture, replace

```ts
      nettedWithAccountIds: [],
      trades: [{
        symbol: 'SMH',
```

with

```ts
      nettedWithAccountIds: [],
      repurchaseRestrictions: [],
      trades: [{
        symbol: 'SMH',
```

- [ ] **Step 7: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/loss-sale-window.test.ts` — Expected: PASS (7 tests).
Run: `node_modules/.bin/tsc --noEmit -p .` — Expected: no errors.
Run: `node_modules/.bin/vitest run` — Expected: all pass.

- [ ] **Step 8: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/services/oms.ts src/types/trading.ts src/mocks/handlers/repurchase-restrictions.ts src/mocks/handlers/oms.ts src/mocks/handlers/trading.ts src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx src/mocks/handlers/__tests__/loss-sale-window.test.ts
git commit -m "feat(rebalance): a proposed loss sale opens its own wash-sale window (§0.2)

Every sell leg that realises a loss carries repurchaseBlockedUntil (today + 30: 2026-03-27). The
preview lists the household's restrictions with their source: acc-002's INTC sale today is a
projected window to 2026-03-27, kept separate from rs-001's recorded window to 2026-03-23.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---


**Controller addition (ruling):** the rebalance preview's tax estimate must not count the washed part of a sell leg's loss. When a proposed loss sale is washed (in whole or in part, per `matchWashedShares` in `src/lib/wash-sale.ts`, §1.1091-1(c)), only the allowed part offsets gains; the washed part is reported separately (deferred to the replacement's basis, or permanently disallowed for an IRA/Roth replacement). Test with a constructed proposal where a loss leg is partly washed.

### Task 10: Projected drift after the trades, with the reason any drift remains (§0.6)

**Files:**
- Modify: `src/mocks/handlers/pms.ts` (`computeDriftForHoldings`, `DriftHolding`)
- Modify: `src/services/oms.ts` (`ResidualDriftReason`, `ProjectedAssetClassDrift`, `ProjectedDrift`, `RebalancePreview.projectedDrift`)
- Modify: `src/mocks/handlers/oms.ts` (`Sleeve.assetClass` type; `holdingsAfterTrades`, `ResidualFacts`, `residualReason`, `projectDrift`; rebalance handler)
- Modify: `src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx` (fixture only)
- Create: `src/mocks/handlers/__tests__/projected-drift.test.ts`

**Interfaces:**
- Consumes: from Task 9, `RebalancePreview` with `repurchaseRestrictions` and the `proposals` constant in the rebalance handler; existing `recentlyOpenedPositions(lots, asOfISO): Set<string>`, `pickBuyCandidate(held, modelId, assetClass, currency)`, `currencyForAccount(accountId)`, `ProposedTradeLeg` (all in `oms.ts`), `isMarketTradable` (`@/lib/security-master`).
- Produces:
  - `src/mocks/handlers/pms.ts`: `type DriftHolding = Pick<Position, 'assetClass' | 'weight'>`; `computeDriftForHoldings(account: typeof accounts[0], positions: readonly DriftHolding[], modelIdOverride?: string): DriftStatus` (the old body of `computeDriftForAccount`, which now delegates to it).
  - `src/services/oms.ts`: `type ResidualDriftReason = 'not_market_tradable' | 'cash_capped' | 'replacement_hold' | 'below_lot_size'`; `type ProjectedAssetClassDrift = { assetClass: AssetClass; target: number; actual: number; drift: number; residualReason?: ResidualDriftReason }`; `type ProjectedDrift = { driftTolerance: number; driftThreshold: number; totalDrift: number; maxAbsDrift: number; withinBand: boolean; assetClassDrifts: ProjectedAssetClassDrift[] }`; `RebalancePreview.projectedDrift: ProjectedDrift`.
  - `src/mocks/handlers/oms.ts`: `holdingsAfterTrades(account, positions: readonly Position[], legs: readonly ProposedTradeLeg[]): DriftHolding[]`; `type ResidualFacts`; `residualReason(facts: ResidualFacts): ResidualDriftReason`; `projectDrift(accountId: string, legs: readonly ProposedTradeLeg[], taxAware: boolean, driftThreshold = 0.005, modelId?: string): ProjectedDrift`.

Semantics (state them in review): a residual is an invested (non-cash) class whose projected |drift| still exceeds the threshold the trades were generated against. Cash carries no reason (it is the balancing item). Reasons, in order: an overweight class whose excess exceeds the sellable value left is `not_market_tradable` if it holds a periodic-liquidity security (BXPE), else `replacement_hold` if it holds a harvest replacement inside its 31-day hold (the engine's existing `recentlyOpenedPositions`, which is how SMH, rs-001's `replacementSymbol`, is held back); otherwise `below_lot_size` if the gap is worth less than one unit of the cheapest security that could close it; otherwise `cash_capped` (the two-sided cash band stopped the trades — the test proves the band binds wherever this is claimed).

- [ ] **Step 1: Write the failing test**

Create `src/mocks/handlers/__tests__/projected-drift.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { generateRebalanceTrades, projectDrift, residualReason, type ProposedTradeLeg, type ResidualFacts } from '@/mocks/handlers/oms'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { roundTo } from '@/mocks/handlers/utils'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { isMarketTradable } from '@/lib/security-master'

const TAX_MODES = [true, false] as const

/** Asset-class weights after `legs`, computed here from the positions and the legs alone. */
function classWeightsAfter(accountId: string, legs: readonly ProposedTradeLeg[]): Map<string, number> {
  const account = accounts.find((a) => a.id === accountId)!
  const value = new Map<string, number>()
  for (const p of getPositionsForAccount(account.id, account.totalValue)) value.set(p.assetClass, (value.get(p.assetClass) ?? 0) + p.marketValue)
  for (const leg of legs) {
    const signed = leg.side === 'sell' ? -leg.estimatedValue : leg.estimatedValue
    value.set(leg.assetClass, (value.get(leg.assetClass) ?? 0) + signed)
    value.set('cash', (value.get('cash') ?? 0) - signed)
  }
  const total = [...value.values()].reduce((s, v) => s + v, 0)
  return new Map([...value].map(([assetClass, v]) => [assetClass, v / total]))
}

describe('§0.6 · projected drift after the proposed trades', () => {
  it.each(TAX_MODES)('(a) every account: projected drift is the drift function on the post-trade holdings (taxAware=%s)', (taxAware) => {
    for (const account of accounts) {
      const legs = generateRebalanceTrades(account.id, taxAware)
      const projected = projectDrift(account.id, legs, taxAware)
      const weights = classWeightsAfter(account.id, legs)
      for (const d of projected.assetClassDrifts) {
        expect(d.actual, `${account.id} ${d.assetClass}`).toBeCloseTo(weights.get(d.assetClass) ?? 0, 9)
        expect(d.drift, `${account.id} ${d.assetClass}`).toBe(roundTo(d.actual - d.target, 4))
      }
      expect(projected.maxAbsDrift).toBe(roundTo(Math.max(0, ...projected.assetClassDrifts.map((d) => Math.abs(d.drift))), 4))
      expect(projected.driftTolerance).toBe(computeDriftForAccount(account).driftTolerance)
    }
  })

  it('an account with no trades projects exactly its current drift', () => {
    const quiet = accounts.filter((a) => generateRebalanceTrades(a.id, true).length === 0)
    expect(quiet.length).toBeGreaterThan(0)
    for (const account of quiet) {
      const projected = projectDrift(account.id, [], true)
      expect(projected.assetClassDrifts.map(({ assetClass, target, actual, drift }) => ({ assetClass, target, actual, drift })))
        .toEqual(computeDriftForAccount(account).assetClassDrifts)
    }
  })

  it('the rebalance preview serves the same projection the engine computes', async () => {
    const previews = await previewRebalance({ accountIds: accounts.map((a) => a.id), taxAware: true })
    for (const preview of previews) {
      // Through JSON, as the handler serves it (a -0 drift arrives as 0).
      const engine = projectDrift(preview.accountId, generateRebalanceTrades(preview.accountId, true), true)
      expect(preview.projectedDrift).toEqual(JSON.parse(JSON.stringify(engine)))
    }
  })

  it('(b) acc-002: the trades lower max drift, and private equity stays, unsellable', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const current = computeDriftForAccount(accounts.find((a) => a.id === 'acc-002')!)
    expect(preview!.projectedDrift.maxAbsDrift).toBeLessThan(current.maxAbsDrift)
    const pe = preview!.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    expect(pe.drift).toBe(current.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!.drift)
    expect(pe.residualReason).toBe('not_market_tradable')
    expect(Object.fromEntries(preview!.projectedDrift.assetClassDrifts.filter((d) => d.residualReason).map((d) => [d.assetClass, d.residualReason]))).toEqual({
      intl_equity: 'cash_capped', emerging_markets: 'cash_capped', alternatives: 'cash_capped', private_equity: 'not_market_tradable',
    })
  })

  it('a threshold wider than the band (the Rebalance page sends 10%) still explains what it leaves', () => {
    const projected = projectDrift('acc-002', generateRebalanceTrades('acc-002', true, 0.1), true, 0.1)
    const usEquity = projected.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(Math.abs(usEquity.drift)).toBeGreaterThan(0.1)
    expect(usEquity.residualReason).toBe('cash_capped')
    expect(projected.withinBand).toBe(false)
  })

  it('a migration preview projects against the model it migrates to', () => {
    const legs = generateRebalanceTrades('acc-002', true, 0.005, 'mod-003')
    const projected = projectDrift('acc-002', legs, true, 0.005, 'mod-003')
    const mod003 = computeDriftForAccount(accounts.find((a) => a.id === 'acc-002')!, 'mod-003')
    expect(projected.driftTolerance).toBe(mod003.driftTolerance)
    for (const d of projected.assetClassDrifts) expect(d.target).toBe(mod003.assetClassDrifts.find((c) => c.assetClass === d.assetClass)?.target ?? 0)
  })

  it.each(TAX_MODES)('every invested class left beyond the threshold has a reason, and only those (taxAware=%s)', (taxAware) => {
    for (const threshold of [0.005, 0.02, 0.05, 0.1]) {
      for (const account of accounts) {
        const projected = projectDrift(account.id, generateRebalanceTrades(account.id, taxAware, threshold), taxAware, threshold)
        for (const d of projected.assetClassDrifts) {
          const residual = d.assetClass !== 'cash' && Math.abs(d.drift) > threshold
          expect(d.residualReason !== undefined, `${account.id} ${d.assetClass} at ${threshold}`).toBe(residual)
        }
      }
    }
  })

  it.each(TAX_MODES)('cash_capped is only claimed where the cash band stopped the trades (taxAware=%s)', (taxAware) => {
    let claimed = 0
    for (const threshold of [0.005, 0.02, 0.05, 0.1]) {
      for (const account of accounts) {
        const legs = generateRebalanceTrades(account.id, taxAware, threshold)
        const projected = projectDrift(account.id, legs, taxAware, threshold)
        const startCash = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === 'CASH')?.marketValue ?? 0
        const targetCash = (projected.assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0) * account.totalValue
        const endCash = startCash + legs.reduce((s, l) => s + (l.side === 'sell' ? l.estimatedValue : -l.estimatedValue), 0)
        // Each leg is floored to whole units, so the band is reached to within one unit per leg.
        const slack = 1 + legs.reduce((s, l) => s + l.estimatedValue / l.quantity, 0)
        for (const d of projected.assetClassDrifts.filter((x) => x.residualReason === 'cash_capped')) {
          claimed++
          // Underweight: buys stopped at the band's floor. Overweight: sells stopped at its ceiling.
          if (d.drift < 0) expect(endCash - Math.min(startCash, targetCash), `${account.id} ${d.assetClass}`).toBeLessThanOrEqual(slack)
          else expect(Math.max(startCash, targetCash) - endCash, `${account.id} ${d.assetClass}`).toBeLessThanOrEqual(slack)
        }
      }
    }
    expect(claimed).toBeGreaterThan(0)
  })

  it('not_market_tradable is only claimed for an overweight class holding a security with no market', () => {
    for (const account of accounts) {
      const positions = getPositionsForAccount(account.id, account.totalValue)
      for (const d of projectDrift(account.id, generateRebalanceTrades(account.id, true), true).assetClassDrifts) {
        if (d.residualReason !== 'not_market_tradable') continue
        expect(d.drift).toBeGreaterThan(0)
        expect(positions.some((p) => p.assetClass === d.assetClass && !isMarketTradable(p.symbol))).toBe(true)
      }
    }
  })
})

describe('residualReason', () => {
  const base: ResidualFacts = { drift: 0.02, totalValue: 1_000_000, sellableLeft: 0, nonTradableLeft: 0, replacementHeldLeft: 0, unitPrice: 100 }
  it('an overweight excess nothing sellable can absorb, held in a periodic-liquidity fund', () => {
    expect(residualReason({ ...base, nonTradableLeft: 20_000 })).toBe('not_market_tradable')
  })
  it('an overweight excess held in a harvest replacement inside its hold', () => {
    expect(residualReason({ ...base, replacementHeldLeft: 20_000 })).toBe('replacement_hold')
  })
  it('a gap smaller than one unit of what would close it', () => {
    expect(residualReason({ ...base, drift: -0.00005, unitPrice: 87_450 })).toBe('below_lot_size')
  })
  it('a gap the sellable positions could close, left by the cash band', () => {
    expect(residualReason({ ...base, sellableLeft: 500_000, nonTradableLeft: 20_000 })).toBe('cash_capped')
    expect(residualReason({ ...base, drift: -0.03 })).toBe('cash_capped')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/projected-drift.test.ts`
Expected: FAIL — `projectDrift is not a function`.

- [ ] **Step 3: Split the drift function from the positions it reads**

In `src/mocks/handlers/pms.ts`, change `import type { DriftStatus, BenchmarkKind } from '@/types/portfolio'` to `import type { DriftStatus, BenchmarkKind, Position } from '@/types/portfolio'`, then replace

```ts
export function computeDriftForAccount(account: typeof accounts[0], modelIdOverride?: string): DriftStatus {
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const modelId
```

with

```ts
export function computeDriftForAccount(account: typeof accounts[0], modelIdOverride?: string): DriftStatus {
  return computeDriftForHoldings(account, getPositionsForAccount(account.id, account.totalValue), modelIdOverride)
}

/** What drift reads from a holding: its asset class and its weight in the account. */
export type DriftHolding = Pick<Position, 'assetClass' | 'weight'>

/**
 * §0.6 · the drift derivation itself, over any set of holdings. `computeDriftForAccount` runs it on
 * the account's positions today; the rebalance preview runs it on the same positions with the
 * proposed trades applied, so current and projected drift are one function, not two.
 */
export function computeDriftForHoldings(account: typeof accounts[0], positions: readonly DriftHolding[], modelIdOverride?: string): DriftStatus {
  const modelId
```

The rest of the old body (from `const modelId = …` to the closing `}`) is unchanged and becomes `computeDriftForHoldings`'s body; it already reads only `pos.assetClass` and `pos.weight`.

- [ ] **Step 4: Add the projected-drift contract**

In `src/services/oms.ts`, add `import type { AssetClass } from '@/types/portfolio'` below `import type { CurrencyCode } from '@/types/currency'`. In `RebalancePreview`, replace

```ts
  repurchaseRestrictions: RepurchaseRestriction[]
}
```

with

```ts
  repurchaseRestrictions: RepurchaseRestriction[]
  /** Drift by asset class after the proposed trades, from the same drift function as current drift. */
  projectedDrift: ProjectedDrift
}
```

and, directly after the `RepurchaseRestriction` type, add

```ts
/** Why an asset class is still away from target after the proposed trades. */
export type ResidualDriftReason = 'not_market_tradable' | 'cash_capped' | 'replacement_hold' | 'below_lot_size'

export type ProjectedAssetClassDrift = {
  assetClass: AssetClass
  target: number
  actual: number
  /** Signed, rounded to 4dp, exactly as `DriftStatus.assetClassDrifts[].drift`. */
  drift: number
  /** Present on every invested (non-cash) class whose |drift| still exceeds the proposal's threshold. */
  residualReason?: ResidualDriftReason
}

export type ProjectedDrift = {
  driftTolerance: number
  /** The threshold the trades were generated against; a residual is drift beyond it. */
  driftThreshold: number
  totalDrift: number
  maxAbsDrift: number
  /** `maxAbsDrift` within the model's own band. */
  withinBand: boolean
  assetClassDrifts: ProjectedAssetClassDrift[]
}
```

- [ ] **Step 5: Project the drift in the engine**

In `src/mocks/handlers/oms.ts`:

Extend the `@/services/oms` type import with `ProjectedDrift, ResidualDriftReason`, and change `import { computeDriftForAccount, modelImplementationSecurity } from './pms'` to `import { computeDriftForAccount, computeDriftForHoldings, modelImplementationSecurity, type DriftHolding } from './pms'`. Do not edit the `@/types/portfolio` import line (it neighbours the line `workspace` changed); the types below come from `DriftHolding` and `accounts` instead.

In `type Sleeve`, change `assetClass: string` to `assetClass: DriftHolding['assetClass']`.

Directly above `export const omsHandlers = [`, add:

```ts
/**
 * §0.6 · the account's holdings after `legs` execute: a sell reduces its position, a buy adds to
 * its position (or opens one), and cash takes the difference. Weights stay `marketValue /
 * totalValue`, the definition `getPositionsForAccount` uses, because trades move money between
 * holdings without changing the account's value.
 */
export function holdingsAfterTrades(account: (typeof accounts)[number], positions: readonly Position[], legs: readonly ProposedTradeLeg[]): DriftHolding[] {
  const bySymbol = new Map(positions.map((p) => [p.symbol, { assetClass: p.assetClass, marketValue: p.marketValue }]))
  let cashMoved = 0
  for (const leg of legs) {
    const signed = leg.side === 'sell' ? -leg.estimatedValue : leg.estimatedValue
    const held = bySymbol.get(leg.symbol)
    bySymbol.set(leg.symbol, { assetClass: held?.assetClass ?? leg.assetClass, marketValue: (held?.marketValue ?? 0) + signed })
    cashMoved -= signed
  }
  const cash = bySymbol.get('CASH')
  bySymbol.set('CASH', { assetClass: 'cash', marketValue: (cash?.marketValue ?? 0) + cashMoved })
  return [...bySymbol.values()].map(({ assetClass, marketValue }) => ({ assetClass, weight: marketValue / account.totalValue }))
}

/** What the classifier needs to know about one invested asset class still away from target. */
export type ResidualFacts = {
  /** Projected drift, signed (positive = overweight). */
  drift: number
  totalValue: number
  /** Value left after the trades in positions a sell could still draw on. */
  sellableLeft: number
  /** Value in positions with no market to sell into (`isMarketTradable` false). */
  nonTradableLeft: number
  /** Value in harvest replacements a tax-aware rebalance holds for `REPLACEMENT_HOLD_DAYS`. */
  replacementHeldLeft: number
  /** Price of one unit of the cheapest security that could close the gap; `undefined` when none can. */
  unitPrice: number | undefined
}

/**
 * Why a class is still away from target after the trades. An overweight class whose remaining
 * excess is more than the sellable value left is blocked by what cannot be sold: a periodic-
 * liquidity fund, or a harvest replacement still inside its hold. Otherwise the gap is smaller
 * than one unit of what would close it, or the proposal stopped where the cash band let it.
 */
export function residualReason(facts: ResidualFacts): ResidualDriftReason {
  const residualValue = Math.abs(facts.drift) * facts.totalValue
  if (facts.drift > 0 && facts.sellableLeft < residualValue) {
    if (facts.nonTradableLeft > 0) return 'not_market_tradable'
    if (facts.replacementHeldLeft > 0) return 'replacement_hold'
  }
  if (facts.unitPrice !== undefined && residualValue < facts.unitPrice) return 'below_lot_size'
  return 'cash_capped'
}

/**
 * §0.6 · drift after the proposed trades, by asset class, from `computeDriftForHoldings` — the
 * function current drift comes from — run on `holdingsAfterTrades`. Every invested class whose
 * |drift| still exceeds `driftThreshold` (the threshold the trades were generated against) carries
 * the reason the proposal could not close it. Cash carries none: it is the balancing item the
 * other classes settle into (see the funding priority in `generateRebalanceTrades`).
 */
export function projectDrift(
  accountId: string,
  legs: readonly ProposedTradeLeg[],
  taxAware: boolean,
  driftThreshold = 0.005,
  modelId?: string,
): ProjectedDrift {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`projectDrift: unknown account ${accountId}`)
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const after = computeDriftForHoldings(account, holdingsAfterTrades(account, positions, legs), modelId)
  const heldBack = taxAware && isTaxableAccount(account.taxTreatment)
    ? recentlyOpenedPositions(generateTaxLots(account.id, account.totalValue), MOCK_TODAY_ISO)
    : new Set<string>()
  const soldBySymbol = new Map<string, number>()
  for (const leg of legs) if (leg.side === 'sell') soldBySymbol.set(leg.symbol, (soldBySymbol.get(leg.symbol) ?? 0) + leg.estimatedValue)
  const valueLeft = (p: Position) => p.marketValue - (soldBySymbol.get(p.symbol) ?? 0)

  const factsFor = (assetClass: DriftHolding['assetClass'], drift: number): ResidualFacts => {
    const inClass = positions.filter((p) => p.assetClass === assetClass && p.symbol !== 'CASH')
    const sellable = inClass.filter((p) => isMarketTradable(p.symbol) && !heldBack.has(p.id) && valueLeft(p) > 0)
    const sum = (ps: readonly Position[]) => ps.reduce((s, p) => s + valueLeft(p), 0)
    const buyCandidate = drift < 0
      ? pickBuyCandidate(inClass.filter((p) => isMarketTradable(p.symbol)), after.modelId, assetClass, currencyForAccount(accountId))
      : undefined
    const sellPrices = sellable.map((p) => p.price)
    return {
      drift,
      totalValue: account.totalValue,
      sellableLeft: sum(sellable),
      nonTradableLeft: sum(inClass.filter((p) => !isMarketTradable(p.symbol))),
      replacementHeldLeft: sum(inClass.filter((p) => heldBack.has(p.id))),
      unitPrice: drift < 0 ? buyCandidate?.price : (sellPrices.length > 0 ? Math.min(...sellPrices) : undefined),
    }
  }

  return {
    driftTolerance: after.driftTolerance,
    driftThreshold,
    totalDrift: after.totalDrift,
    maxAbsDrift: after.maxAbsDrift,
    withinBand: !after.needsRebalance,
    assetClassDrifts: after.assetClassDrifts.map((d) => (
      d.assetClass !== 'cash' && Math.abs(d.drift) > driftThreshold
        ? { ...d, residualReason: residualReason(factsFor(d.assetClass, d.drift)) }
        : { ...d }
    )),
  }
}
```

In the `POST /api/oms/rebalance` handler, replace

```ts
        repurchaseRestrictions: repurchaseRestrictionsFor(account, MOCK_TODAY_ISO, proposals),
      }
    })
```

with

```ts
        repurchaseRestrictions: repurchaseRestrictionsFor(account, MOCK_TODAY_ISO, proposals),
        projectedDrift: projectDrift(accountId, trades, body.taxAware, body.driftThreshold),
      }
    })
```

(`body.driftThreshold` may be undefined; `projectDrift`'s default, 0.005, is the same default `generateRebalanceTrades` uses.)

- [ ] **Step 6: Satisfy the widened type in the UI test fixture**

In `src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx`, in `zeroResult`, replace

```ts
      repurchaseRestrictions: [],
```

with

```ts
      repurchaseRestrictions: [],
      projectedDrift: { driftTolerance: 0.05, driftThreshold: 0.005, totalDrift: 0, maxAbsDrift: 0, withinBand: true, assetClassDrifts: [] },
```

- [ ] **Step 7: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/projected-drift.test.ts` — Expected: PASS (16 tests).
Run: `node_modules/.bin/tsc --noEmit -p .` — Expected: no errors.
Run: `node_modules/.bin/vitest run` — Expected: all pass (no pinned figure moves; the trades are unchanged).

- [ ] **Step 8: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/handlers/pms.ts src/services/oms.ts src/mocks/handlers/oms.ts src/features/portfolios/rebalance/__tests__/PreviewTradesStep.test.tsx src/mocks/handlers/__tests__/projected-drift.test.ts
git commit -m "feat(rebalance): projected drift after the trades, with the reason any drift remains (§0.6)

The preview runs the drift function on the post-trade holdings. acc-002 (tax-aware): max drift
13.2% → 2.68%; private equity stays at +2.68% (not_market_tradable: BXPE has quarterly
liquidity only); intl −0.85, EM −0.58 and alternatives −0.58 are cash_capped (cash ends at its 3%
target). Across 47 accounts x 4 thresholds x 2 tax modes, every cash_capped claim is checked
against the cash band.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 11: msg-003 reports acc-002's own drift and trades

**Files:**
- Modify: `src/mocks/data/messages.ts` (new derived note; thread-001 `lastMessage`; msg-003 content and attachment)
- Create: `src/mocks/data/__tests__/johnson-thread-copy.test.ts`

**Interfaces:**
- Consumes: `computeDriftForAccount`, `modelDisplayName` (Task 4) from `src/mocks/handlers/pms.ts`; `generateRebalanceTrades` from `oms.ts`; `formatRatePercent` from `@/features/portfolios/tax/shared`; Task 2's `adrian` rename already in this file.
- Produces: `johnsonDriftNote(): { account; drift; worst; label; content }` exported from `messages.ts` (used only by this file and its test).

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/johnson-thread-copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { threads, threadMessages } from '@/mocks/data/messages'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { getPositionsForAccount } from '@/mocks/data/positions'

describe("§0.7 · msg-003 reports acc-002's own drift and trades", () => {
  const msg = threadMessages['thread-001']!.find((m) => m.id === 'msg-003')!
  const account = accounts.find((a) => a.id === 'acc-002')!
  const drift = computeDriftForAccount(account)

  it('names only securities acc-002 holds or the engine proposes', () => {
    const held = new Set(getPositionsForAccount(account.id, account.totalValue).map((p) => p.symbol))
    expect(held.has('AAPL')).toBe(false)
    expect(msg.content).not.toMatch(/AAPL|MSFT/)
    for (const leg of generateRebalanceTrades(account.id, true).filter((l) => l.side === 'sell')) {
      expect(held.has(leg.symbol)).toBe(true)
      expect(msg.content).toContain(`${leg.quantity.toLocaleString('en-US')} ${leg.symbol}`)
    }
  })

  it("states the worst class's drift against acc-002's own model and band", () => {
    const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]!
    expect(worst.assetClass).toBe('us_equity')
    expect(msg.content).toContain(`US Equity is ${(worst.actual * 100).toFixed(1)}% against the Growth model's ${(worst.target * 100).toFixed(1)}% target`)
    expect(msg.content).toContain(`${(worst.drift * 100).toFixed(1)} points over, outside its ±5% band`)
    expect(msg.content).not.toContain('3.2%')
  })

  it('the attached card is acc-002 with its engine drift, and the thread preview is the message', () => {
    const card = msg.attachments![0]!
    expect(card.entityId).toBe('acc-002')
    expect(card.richData!.driftPercent).toBe(Math.round(drift.maxAbsDrift * 1000) / 10)
    expect(card.richData!.needsRebalance).toBe(drift.needsRebalance)
    expect(threads.find((t) => t.id === 'thread-001')!.lastMessage).toBe(msg.content)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/johnson-thread-copy.test.ts`
Expected: FAIL — content contains AAPL; card entity is acc-001.

- [ ] **Step 3: Derive the note**

In `src/mocks/data/messages.ts`, directly below the first line (`import type { Participant, Thread, Message } from '@/types/messaging'`) and above the blank line that precedes `const adrian`, insert:

```ts
import { accounts } from './accounts'
import { computeDriftForAccount, modelDisplayName } from '../handlers/pms'
import { generateRebalanceTrades } from '../handlers/oms'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { formatRatePercent } from '@/features/portfolios/tax/shared'
import { formatCurrency } from '@/lib/utils'
import { roundTo } from '../handlers/utils'

const pct1 = (fraction: number) => `${(fraction * 100).toFixed(1)}%`
const wholeDollars = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`
/** "a", "a and b", "a, b and c". */
const listing = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

/**
 * §0.7 · msg-003, in Robert Johnson's rebalance thread, used to recommend trimming AAPL and MSFT at
 * "3.2% over target" — acc-001's holdings at a figure from nowhere. It now reports acc-002, Robert's
 * individual account, from the engine: its worst asset-class drift against its own model and band,
 * and the trades the tax-aware rebalance proposes.
 */
export function johnsonDriftNote() {
  const account = accounts.find((a) => a.id === 'acc-002')!
  const drift = computeDriftForAccount(account)
  const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]!
  const legs = generateRebalanceTrades(account.id, true)
  const sells = legs.filter((l) => l.side === 'sell').map((l) => {
    const realised = l.realisedShortTerm + l.realisedLongTerm
    return `${l.quantity.toLocaleString('en-US')} ${l.symbol}${realised < 0 ? ` (a ${wholeDollars(Math.abs(realised))} loss)` : ''}`
  })
  const buys = [...new Set(legs.filter((l) => l.side === 'buy').map((l) => ASSET_CLASS_LABELS[l.assetClass] ?? l.assetClass))]
  const label = ASSET_CLASS_LABELS[worst.assetClass] ?? worst.assetClass
  const content = `I ran the drift analysis on Robert's individual account: ${label} is ${pct1(worst.actual)} against the ` +
    `${modelDisplayName(drift.modelId)} model's ${pct1(worst.target)} target, ${(Math.abs(worst.drift) * 100).toFixed(1)} points ` +
    `${worst.drift > 0 ? 'over' : 'under'}, outside its ±${formatRatePercent(drift.driftTolerance)} band. A tax-aware rebalance sells ` +
    `${listing(sells)}, and buys ${listing(buys)}.`
  return { account, drift, worst, label, content }
}

const johnson = johnsonDriftNote()
```

In thread-001, replace

```ts
    lastMessage: 'I ran the drift analysis — large-cap growth is 3.2% over target. Recommend trimming AAPL and MSFT to fund the fixed income sleeve.',
```

with

```ts
    lastMessage: johnson.content,
```

In msg-003, replace

```ts
      content: 'I ran the drift analysis — large-cap growth is 3.2% over target. Recommend trimming AAPL and MSFT to fund the fixed income sleeve.',
      timestamp: '2026-02-25T10:45:00Z',
      attachments: [
        {
          type: 'account_card' as const,
          entityId: 'acc-001',
          entityName: 'Johnson Family Trust',
          preview: 'Drift: +3.2% large-cap growth',
          richData: {
            variant: 'portfolio_overview' as const,
            entityId: 'acc-001',
            entityName: 'Johnson Family Trust',
            metrics: [{ label: 'AUM', value: '$8.2M' }],
            allocation: [
              { assetClass: 'us_equity', weight: 0.45 },
              { assetClass: 'intl_equity', weight: 0.12 },
              { assetClass: 'fixed_income', weight: 0.22 },
              { assetClass: 'alternatives', weight: 0.13 },
              { assetClass: 'cash', weight: 0.08 },
            ],
            driftPercent: 3.2,
            needsRebalance: true,
          },
        },
      ],
```

with

```ts
      content: johnson.content,
      timestamp: '2026-02-25T10:45:00Z',
      attachments: [
        {
          type: 'account_card' as const,
          entityId: johnson.account.id,
          entityName: johnson.account.name,
          preview: `Drift: ${johnson.worst.drift > 0 ? '+' : '−'}${(Math.abs(johnson.worst.drift) * 100).toFixed(1)}% ${johnson.label}`,
          richData: {
            variant: 'portfolio_overview' as const,
            entityId: johnson.account.id,
            entityName: johnson.account.name,
            metrics: [{ label: 'AUM', value: formatCurrency(johnson.account.totalValue, true) }],
            allocation: johnson.drift.assetClassDrifts
              .filter((d) => d.actual > 0)
              .map((d) => ({ assetClass: d.assetClass, weight: roundTo(d.actual, 3) })),
            driftPercent: roundTo(johnson.drift.maxAbsDrift * 100, 1),
            needsRebalance: johnson.drift.needsRebalance,
          },
        },
      ],
```

The message now reads: "I ran the drift analysis on Robert's individual account: US Equity is 68.2% against the Growth model's 55.0% target, 13.2 points over, outside its ±5% band. A tax-aware rebalance sells 7,000 INTC (a $45,850 loss), 758 SPY, 3,882 ETHE and 3,234 IBIT, and buys Intl Equity, Emerging Mkts, Fixed Income, Alternatives and Commodities."

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/johnson-thread-copy.test.ts` — Expected: PASS (3 tests).
Run: `node_modules/.bin/vitest run` — Expected: all pass.

- [ ] **Step 5: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/data/messages.ts src/mocks/data/__tests__/johnson-thread-copy.test.ts
git commit -m "fix(data): msg-003 reports acc-002's own drift and trades, from the engine (§0.7)

It recommended trimming AAPL and MSFT at '3.2% over target' — acc-001's holdings, a figure from
nowhere — in Robert's thread. It now states acc-002's US equity at 68.2% against the Growth
model's 55% (13.2 points, outside ±5%) and the tax-aware trades.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 12: nba-001, act-012 and ntf-010 state each account's own band and the engine's count

**Files:**
- Modify: `src/mocks/data/nbas.ts` (imports, helpers, `driftBatchFacts`, nba-001)
- Modify: `src/mocks/data/activities.ts` (act-012)
- Modify: `src/mocks/data/notifications.ts` (ntf-010)
- Create: `src/mocks/data/__tests__/drift-copy-invariants.test.ts`

**Interfaces:**
- Consumes: `computeDriftForAccount`, `modelDisplayName` (Task 4) from `src/mocks/handlers/pms.ts`; `formatRatePercent` from `@/features/portfolios/tax/shared`; `clients` from `src/mocks/data/clients.ts` (`fullName`).
- Produces: `driftBatchFacts(): { accountCount: number; modelIds: string[]; clients: NBAClient[]; bands: string[]; lowestBreach: number; highestBreach: number }` exported from `src/mocks/data/nbas.ts` (`bands` entries read like `"Growth ±5%"`). Task 13 adds to `nbas.ts`; Task 14 adds to `activities.ts`.

Why getters: `pms.ts` imports `nbas.ts`. If `nbas.ts` called the drift engine while the modules load, a load that starts at `pms.ts` would run it before `pms.ts` had defined its models (a TDZ `ReferenceError`). nba-001's derived fields are therefore getters, evaluated on read. `activities.ts` and `notifications.ts` are not imported by `pms.ts` and may call the engine at load.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/drift-copy-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nbas, driftBatchFacts } from '@/mocks/data/nbas'
import { getNBAs } from '@/services/nba'
import { activities } from '@/mocks/data/activities'
import { MOCK_NOTIFICATIONS } from '@/mocks/data/notifications'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { formatRatePercent } from '@/features/portfolios/tax/shared'

const drifted = accounts.map((a) => ({ account: a, drift: computeDriftForAccount(a) })).filter(({ drift }) => drift.needsRebalance)
const bandOf = (modelId: string) => `${modelDisplayName(modelId)} ±${formatRatePercent(computeDriftForAccount(drifted.find(({ drift }) => drift.modelId === modelId)!.account).driftTolerance)}`

describe('§0.7 · drift copy states each account\'s own band and the engine\'s count', () => {
  const nba = nbas.find((n) => n.id === 'nba-001')!

  it('nba-001 counts the accounts outside their own model band', () => {
    expect(drifted.length).toBeGreaterThan(0)
    expect(nba.title).toContain(`${drifted.length} accounts`)
    expect(nba.description).toContain(`${drifted.length} accounts across ${new Set(drifted.map(({ account }) => account.clientId)).size} clients`)
  })

  it('nba-001 names every breached model with its own band, and no flat 3% threshold', () => {
    for (const modelId of new Set(drifted.map(({ drift }) => drift.modelId))) {
      expect(nba.description).toContain(bandOf(modelId))
    }
    expect(nba.description).not.toContain('3% threshold')
  })

  it("nba-001's clients are exactly the drifted accounts' clients", () => {
    const expected = [...new Set(drifted.map(({ account }) => account.clientId))]
    expect(nba.clients.map((c) => c.id)).toEqual(expected)
    for (const c of nba.clients) expect(c.name).toBe(clients.find((x) => x.id === c.id)!.fullName)
  })

  it("nba-001's trigger range is the smallest and largest breach", () => {
    const breaches = drifted.map(({ drift }) => drift.maxAbsDrift)
    const pct = (f: number) => `${(f * 100).toFixed(1)}%`
    expect(nba.trigger.value).toBe(`${pct(Math.min(...breaches))}–${pct(Math.max(...breaches))}`)
  })

  it('act-012 reports the same count and bands', () => {
    const act = activities.find((a) => a.id === 'act-012')!
    expect(act.title).toContain(`${drifted.length} accounts`)
    expect(act.title).not.toContain('3%')
    for (const modelId of new Set(drifted.map(({ drift }) => drift.modelId))) expect(act.description).toContain(bandOf(modelId))
  })

  it('ntf-010 names the Growth model and counts its drifted accounts', () => {
    const ntf = MOCK_NOTIFICATIONS.find((n) => n.id === 'ntf-010')!
    const onGrowth = drifted.filter(({ account }) => account.modelId === 'mod-002').length
    expect(ntf.body).toContain(`${onGrowth} accounts on the Growth model`)
    expect(ntf.body).toContain(bandOf('mod-002'))
    expect(ntf.body).not.toContain('Growth Equity')
  })
})

describe('nba-001 over the wire', () => {
  it('the NBA endpoint serves the derived figures, not empty getters', async () => {
    const served = (await getNBAs()).find((n) => n.id === 'nba-001')!
    const facts = driftBatchFacts()
    expect(served.title).toContain(`${facts.accountCount} accounts`)
    expect(served.clients).toEqual(facts.clients)
    expect(served.trigger.value).toBe(nbas.find((n) => n.id === 'nba-001')!.trigger.value)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/drift-copy-invariants.test.ts`
Expected: FAIL — `driftBatchFacts` is not exported; nba-001 says "7 portfolios".

- [ ] **Step 3: Derive nba-001**

In `src/mocks/data/nbas.ts`, replace the head of the file, from `import type { NBA } from '@/types/nba'` down to and including nba-001's `trigger:` line:

```ts
import type { NBA } from '@/types/nba'

export const nbas: NBA[] = [
  // ── Rebalancing (batch group — 7 clients over 3% drift) ──
  {
    id: 'nba-001', title: 'Batch Rebalance — 7 portfolios exceeding drift threshold',
    description: 'Seven client portfolios have drifted beyond the 3% threshold due to recent equity rally. Batch rebalancing can save ~40 minutes vs individual trades.',
    category: 'rebalancing', priority: 'high',
    scoring: { urgency: 72, impact: 80, efficiency: 90, relationship: 50, confidence: 88, composite: 77 },
    clients: [
      { id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-003', name: 'Margaret Chen' },
      { id: 'cli-006', name: 'Michael Martinez' }, { id: 'cli-008', name: 'James Thompson' },
      { id: 'cli-009', name: 'Richard Anderson' }, { id: 'cli-011', name: 'Raj Patel' },
      { id: 'cli-017', name: 'William Foster' },
    ],
    groupId: 'grp-001',
    trigger: { source: 'pms', condition: 'drift_exceeded', value: '3.2%-5.8%', detectedAt: '2026-02-24T08:00:00Z' },
```

with

```ts
import type { NBA, NBAClient, TriggerSignal } from '@/types/nba'
import { accounts } from './accounts'
import { clients } from './clients'
import { computeDriftForAccount, modelDisplayName } from '../handlers/pms'
import { formatRatePercent } from '@/features/portfolios/tax/shared'

const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`
const clientName = (clientId: string) => clients.find((c) => c.id === clientId)?.fullName ?? clientId

/**
 * §0.7 · nba-001 used to say "seven portfolios … beyond the 3% threshold" against per-model bands
 * of 3%, 5% and 7%. Its figures now come from the drift engine: the accounts whose own model band
 * is breached (`needsRebalance`), each band stated with its model's name.
 */
export function driftBatchFacts() {
  const drifted = accounts
    .map((account) => ({ account, drift: computeDriftForAccount(account) }))
    .filter(({ drift }) => drift.needsRebalance)
  const clientIds = [...new Set(drifted.map(({ account }) => account.clientId))]
  const bands = [...new Map(drifted.map(({ drift }) => [drift.modelId, drift.driftTolerance])).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modelId, band]) => `${modelDisplayName(modelId)} ±${formatRatePercent(band)}`)
  const breaches = drifted.map(({ drift }) => drift.maxAbsDrift)
  return {
    accountCount: drifted.length,
    modelIds: drifted.map(({ drift }) => drift.modelId),
    clients: clientIds.map((id): NBAClient => ({ id, name: clientName(id) })),
    bands,
    lowestBreach: Math.min(...breaches),
    highestBreach: Math.max(...breaches),
  }
}

export const nbas: NBA[] = [
  // ── Rebalancing (batch group) ──
  {
    id: 'nba-001',
    // `pms.ts` imports this module, so the drift engine is read when these fields are read, never
    // while the modules load: a load-time call would run before `pms.ts` has defined its models.
    get title() {
      return `Batch rebalance — ${driftBatchFacts().accountCount} accounts outside their model's drift band`
    },
    get description() {
      const facts = driftBatchFacts()
      return `${facts.accountCount} accounts across ${facts.clients.length} clients have drifted outside their own model's band (${facts.bands.join(', ')}). ` +
        'Batch rebalancing proposes every account in one pass.'
    },
    category: 'rebalancing', priority: 'high',
    scoring: { urgency: 72, impact: 80, efficiency: 90, relationship: 50, confidence: 88, composite: 77 },
    get clients() {
      return driftBatchFacts().clients
    },
    groupId: 'grp-001',
    get trigger(): TriggerSignal {
      const facts = driftBatchFacts()
      return { source: 'pms', condition: 'drift_exceeded', value: `${percent(facts.lowestBreach)}–${percent(facts.highestBreach)}`, detectedAt: '2026-02-24T08:00:00Z' }
    },
```

(nba-001's remaining lines — `suggestedAction`, `estimatedImpact`, `createdAt`, … — are unchanged. "Due to recent equity rally" and "save ~40 minutes" are dropped: nothing in the engine supports either.) With today's fixtures this reads "40 accounts across 20 clients have drifted outside their own model's band (Balanced Growth ±5%, Growth ±5%, Conservative Income ±3%, Aggressive Growth ±7%, Ultra-HNW Multi-Strategy ±5%, Education 529 ±5%, Moderate Balanced ±5%)."

- [ ] **Step 4: Derive act-012 and ntf-010**

In `src/mocks/data/activities.ts`, below `import type { ActivityItem } from '@/types/activity'` add `import { driftBatchFacts } from './nbas'`, and replace

```ts
    title: 'Drift alert — 7 portfolios exceeded 3% threshold',
    description: 'Recent equity rally pushed 7 client portfolios beyond drift tolerance.',
```

with

```ts
    // §0.7 · the count and the bands come from the drift engine, as nba-001's do.
    title: `Drift alert — ${driftBatchFacts().accountCount} accounts outside their model's band`,
    description: `${driftBatchFacts().accountCount} client accounts are outside their own model's drift band (${driftBatchFacts().bands.join(', ')}).`,
```

In `src/mocks/data/notifications.ts`, below `import { now } from '@/lib/clock'` add

```ts
import { driftBatchFacts } from './nbas'
import { modelDisplayName } from '../handlers/pms'

/** §0.7 · ntf-010 named a "Growth Equity" model that does not exist and a flat 3% band. */
function growthBatchBody(): string {
  const modelId = 'mod-002'
  const facts = driftBatchFacts()
  const count = facts.modelIds.filter((id) => id === modelId).length
  const band = facts.bands.find((b) => b.startsWith(`${modelDisplayName(modelId)} `))
  return `${count} accounts on the ${modelDisplayName(modelId)} model are outside its band (${band}). Batch rebalance recommended.`
}
```

and in ntf-010 replace `body: '5 accounts drifted >3% from Growth Equity model. Batch rebalance recommended.',` with `body: growthBatchBody(),`. (Today: "15 accounts on the Growth model are outside its band (Growth ±5%).")

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/drift-copy-invariants.test.ts` — Expected: PASS (7 tests).
Run: `node_modules/.bin/vitest run` — Expected: all pass (a module-load `ReferenceError` anywhere means a load-time engine call slipped into `nbas.ts`; keep nba-001's derived fields as getters).

- [ ] **Step 6: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/data/nbas.ts src/mocks/data/activities.ts src/mocks/data/notifications.ts src/mocks/data/__tests__/drift-copy-invariants.test.ts
git commit -m "fix(data): drift copy states each account's own band and the engine's count (§0.7)

nba-001 and act-012 said '7 portfolios … beyond the 3% threshold'; bands are per model (3%, 5%,
7%) and the engine finds 40 accounts across 20 clients outside their own band. ntf-010 named a
'Growth Equity' model that does not exist; it now counts the 15 Growth accounts outside ±5%.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 13: nba-002 refers to the partial harvests and prices each lot at its own rate

**Files:**
- Modify: `src/mocks/data/nbas.ts` (imports, `intcHarvestFacts`, nba-002 `description` and `estimatedImpact`)
- Modify (figures move): `src/mocks/data/__tests__/nba-facts.test.ts` (two D22 tests)
- Create: `src/mocks/data/__tests__/intc-harvest-copy.test.ts`

**Interfaces:**
- Consumes: Task 12's `nbas.ts` head (`clientName`, `formatRatePercent` import, `accounts`); Task 5's `SHORT_TERM_RATE = 0.408`; `generateTaxLots` (`custodian.ts`), `estimatedTaxBenefit` (`shared.tsx`), `realisedSales`, `formatCalendarDate` (`@/lib/utils`, from PR #5), `isTaxableAccount`.
- Produces: `intcHarvestFacts(): { holders: { account; position; benefit: number; sales: RealisedSale[] }[]; totalLoss: number; totalBenefit: number }` exported from `nbas.ts`.

acc-015's remaining INTC lot was bought 2025-05-25 and is short-term, so its $93,250 loss is priced at 40.8%: 45,850 × 0.238 + 52,400 × 0.238 + 93,250 × 0.408 = 10,912.30 + 12,471.20 + 38,046.00 = 61,429.50.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/intc-harvest-copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nbas } from '@/mocks/data/nbas'
import { realisedSales } from '@/mocks/data/realised-sales'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { formatCalendarDate } from '@/lib/utils'

describe('§0.7 · nba-002 refers to the partial harvests already made', () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!

  it("states Robert Johnson's 2026-02-21 harvest and the 7,000 shares he still holds", () => {
    const rs001 = realisedSales.find((s) => s.id === 'rs-001')!
    const acc002 = accounts.find((a) => a.id === 'acc-002')!
    const intc = getPositionsForAccount(acc002.id, acc002.totalValue).find((p) => p.symbol === 'INTC')!
    expect(intc.quantity).toBe(7_000)
    expect(nba.description).toContain(`Robert Johnson harvested ${rs001.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(rs001.saleDate)}`)
    expect(nba.description).toContain(`holds ${intc.quantity.toLocaleString('en-US')} at a $45,850 loss`)
  })

  it('states every recorded INTC harvest in the accounts it names', () => {
    for (const sale of realisedSales.filter((s) => s.symbol === 'INTC')) {
      expect(nba.description).toContain(`harvested ${sale.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(sale.saleDate)}`)
    }
  })

  it('no longer claims the harvest offsets last year\'s gains', () => {
    expect(nba.description).not.toContain('Q4')
  })
})
```

In `src/mocks/data/__tests__/nba-facts.test.ts`, add `import { generateTaxLots } from '@/mocks/handlers/custodian'` below the `estimatedTaxBenefit` import, and in the `describe('D22: nba-002 …')` block replace

```ts
  it('the appended benefit figure is the loss, at long-term rates, not the loss itself', () => {
    const benefit = intcLosses.reduce((sum, g) => sum + estimatedTaxBenefit({ gainLoss: g, holdingPeriod: 'long' }), 0)
    expect(benefit).toBeCloseTo(45_577, 0)
    expect(nba.description).toContain('$45,600')
    expect(nba.description).toContain('not the benefit')
  })
```

with

```ts
  // §0.7 · each lot at its own holding-period rate: acc-015's INTC lot (bought 2025-05-25) is
  // short-term, so its $93,250 is priced at 40.8%, not 23.8%. 45,850 × 0.238 + 52,400 × 0.238 +
  // 93,250 × 0.408 = 10,912.30 + 12,471.20 + 38,046.00 = 61,429.50, stated as "about $61,400".
  const intcLots = ['acc-002', 'acc-011', 'acc-015'].flatMap((id) => {
    const account = accounts.find((a) => a.id === id)!
    const intc = positionsFor(id).find((p) => p.symbol === 'INTC')!
    return generateTaxLots(account.id, account.totalValue).filter((l) => l.positionId === intc.id)
  })
  const benefit = intcLots.reduce((sum, l) => sum + estimatedTaxBenefit(l), 0)

  it('the appended benefit figure is each lot at its own rate, not the loss itself', () => {
    expect(benefit).toBeCloseTo(61_429.5, 6)
    expect(nba.description).toContain('$61,400')
    expect(nba.description).toContain('not the benefit')
  })
```

and in "estimatedImpact is the derived tax benefit…" replace

```ts
    const benefit = intcLosses.reduce((sum, g) => sum + estimatedTaxBenefit({ gainLoss: g, holdingPeriod: 'long' }), 0)
    expect(nba.estimatedImpact).toBe(benefit)
```

with

```ts
    expect(nba.estimatedImpact).toBe(Math.round(benefit))
```

- [ ] **Step 2: Run them to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/intc-harvest-copy.test.ts src/mocks/data/__tests__/nba-facts.test.ts`
Expected: FAIL — no "harvested … shares" in the description; `$61,400` missing; `expected 45577 to be 61430`.

- [ ] **Step 3: Derive nba-002**

In `src/mocks/data/nbas.ts`, extend the imports Task 12 added so the block reads:

```ts
import type { NBA, NBAClient, TriggerSignal } from '@/types/nba'
import { accounts } from './accounts'
import { clients } from './clients'
import { getPositionsForAccount } from './positions'
import { realisedSales } from './realised-sales'
import { computeDriftForAccount, modelDisplayName } from '../handlers/pms'
import { generateTaxLots } from '../handlers/custodian'
import { estimatedTaxBenefit, formatRatePercent, LONG_TERM_RATE, SHORT_TERM_RATE } from '@/features/portfolios/tax/shared'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { formatCalendarDate } from '@/lib/utils'

const dollars = (amount: number) => `$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`
```

(keep `percent` and `clientName` below it). Directly above `export const nbas: NBA[] = [`, add:

```ts
/**
 * The INTC harvest across the book: every taxable account still holding INTC below cost, its
 * loss and the tax benefit at each lot's own holding-period rate, and the partial harvests already
 * recorded this quarter.
 */
export function intcHarvestFacts() {
  const holders = accounts
    .filter((a) => isTaxableAccount(a.taxTreatment))
    .flatMap((account) => {
      const position = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === 'INTC' && p.gainLoss < 0)
      if (!position) return []
      const lots = generateTaxLots(account.id, account.totalValue).filter((l) => l.positionId === position.id)
      const benefit = lots.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
      return [{ account, position, benefit, sales: realisedSales.filter((r) => r.accountId === account.id && r.symbol === 'INTC') }]
    })
  return {
    holders,
    totalLoss: holders.reduce((s, h) => s + h.position.gainLoss, 0),
    totalBenefit: holders.reduce((s, h) => s + h.benefit, 0),
  }
}

function intcHarvestDescription(): string {
  const { holders, totalLoss, totalBenefit } = intcHarvestFacts()
  const perAccount = holders.map(({ account, position, sales }) => {
    const harvested = sales.map((s) => `harvested ${s.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(s.saleDate)} and `).join('')
    return `${clientName(account.clientId)} ${harvested}holds ${position.quantity.toLocaleString('en-US')} at a ${dollars(position.gainLoss)} loss`
  })
  return `Intel (INTC) is still below cost in ${holders.length} client accounts: ${perAccount.join('; ')}. ` +
    `That is ${dollars(totalLoss)} of harvestable losses. Estimated tax benefit is about ${dollars(Math.round(totalBenefit / 100) * 100)} ` +
    `at each lot's own rate (${formatRatePercent(SHORT_TERM_RATE)} short-term, ${formatRatePercent(LONG_TERM_RATE)} long-term); ` +
    `the ${dollars(totalLoss)} is the harvestable loss, not the benefit.`
}
```

(These run at module load. That is safe: none of them reaches `pms.ts`.)

In nba-002, replace the six-line `// D22 · …` comment and the `description: 'Intel (INTC) is down 18.7% …'` line with

```ts
    // §0.7 · this read as if nothing had been harvested, and stated the benefit at long-term rates
    // for all three accounts. Robert Johnson sold 5,000 of his 12,000 shares on 2026-02-21 (rs-001)
    // and Michael Martinez 4,000 on 2026-02-18 (rs-003); the description now says so, from the
    // realised-sales ledger and the positions, and prices each lot at its own holding-period rate.
    description: intcHarvestDescription(),
```

and replace the six-line `// Review round 1, Critical · …` comment and `estimatedImpact: 45_577, createdAt: '2026-02-24T09:45:00Z', dismissed: false,` with

```ts
    // The benefit, not the harvestable loss: the sum of `estimatedTaxBenefit` over every remaining
    // INTC lot, each at its own holding-period rate.
    estimatedImpact: Math.round(intcHarvestFacts().totalBenefit), createdAt: '2026-02-24T09:45:00Z', dismissed: false,
```

The description now reads: "Intel (INTC) is still below cost in 3 client accounts: Robert Johnson harvested 5,000 shares on Feb 21, 2026 and holds 7,000 at a $45,850 loss; David Williams holds 8,000 at a $52,400 loss; Michael Martinez harvested 4,000 shares on Feb 18, 2026 and holds 15,000 at a $93,250 loss. That is $191,500 of harvestable losses. Estimated tax benefit is about $61,400 at each lot's own rate (40.8% short-term, 23.8% long-term); the $191,500 is the harvestable loss, not the benefit."

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/intc-harvest-copy.test.ts src/mocks/data/__tests__/nba-facts.test.ts` — Expected: PASS.
Run: `node_modules/.bin/vitest run` — Expected: all pass.

- [ ] **Step 5: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/data/nbas.ts src/mocks/data/__tests__/nba-facts.test.ts src/mocks/data/__tests__/intc-harvest-copy.test.ts
git commit -m "fix(data): nba-002 refers to the partial harvests and prices each lot at its own rate (§0.7)

It read as if nothing had been harvested. It now states rs-001 (5,000 shares on 2026-02-21, 7,000
left) and rs-003 (4,000 on 2026-02-18, 15,000 left), and drops the claim that a 2026 harvest
offsets Q4 gains. estimatedImpact moves 45,577 → 61,430: acc-015's lot is short-term, so
45,850 × 0.238 + 52,400 × 0.238 + 93,250 × 0.408 = 10,912.30 + 12,471.20 + 38,046.00 = 61,429.50,
rounded; previously 191,500 × 0.238 = 45,577.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 14: The activity feed agrees with the records

**Files:**
- Modify: `src/mocks/data/activities.ts` (act-001, act-002 timestamps; act-005 and act-011 derived)
- Create: `src/mocks/data/__tests__/activity-invariants.test.ts`

**Interfaces:**
- Consumes: Task 12's `import { driftBatchFacts } from './nbas'` line in `activities.ts`; `orders` from `src/mocks/handlers/oms.ts` (ord-004 `filledAt: '2026-02-21T10:15:03Z'`); `KNOWN_OPEN_DATES` from `custodian.ts` (`pos-265 → '2026-02-21'`); `realisedSales`; `notes` (note-002 at `2026-02-21T10:30:00Z`).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/activity-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { activities } from '@/mocks/data/activities'
import { realisedSales } from '@/mocks/data/realised-sales'
import { orders } from '@/mocks/handlers/oms'
import { KNOWN_OPEN_DATES } from '@/mocks/handlers/custodian'
import { notes } from '@/mocks/data/notes'
import { MOCK_NOW_ISO } from '@/lib/clock'

describe('§0.7 · the activity feed agrees with the records', () => {
  const sale = activities.find((a) => a.id === 'act-005')!
  const replacement = activities.find((a) => a.id === 'act-011')!
  const rs001 = realisedSales.find((s) => s.id === 'rs-001')!

  it("act-005 is rs-001: 5,000 INTC at $28.45, a $32,750 long-term loss, at ord-004's fill", () => {
    expect(sale.description).toBe('Sold 5,000 shares INTC at $28.45 in Robert Johnson Individual. Realised long-term loss: $32,750.')
    expect(rs001.proceeds / rs001.quantity).toBe(28.45)
    expect(rs001.realisedGainLoss).toBe(-32_750)
    expect(sale.timestamp).toBe(orders.find((o) => o.id === 'ord-004')!.filledAt)
    expect(sale.description).not.toContain('500 shares INTC at')
    expect(sale.description).not.toContain('6,820')
  })

  it('act-011 is the SMH bought the same morning, after the sale fill and before note-002', () => {
    expect(replacement.description).toBe('Purchased 180 shares SMH at $245.20 in Robert Johnson Individual as the INTC replacement.')
    expect(replacement.timestamp.slice(0, 10)).toBe(KNOWN_OPEN_DATES.get('pos-265'))
    expect(replacement.timestamp > sale.timestamp).toBe(true)
    const note002 = notes.find((n) => n.id === 'note-002')!
    expect(replacement.timestamp < note002.createdAt).toBe(true)
  })

  it('no activity is dated after the frozen now', () => {
    for (const a of activities) expect(Date.parse(a.timestamp), `${a.id} ${a.timestamp}`).toBeLessThanOrEqual(Date.parse(MOCK_NOW_ISO))
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/activity-invariants.test.ts`
Expected: FAIL — "Sold 500 shares INTC … $6,820"; act-011 dated 2026-02-23; act-001 at 13:45Z after the frozen now.

- [ ] **Step 3: Derive the harvest activities and fix the future timestamps**

In `src/mocks/data/activities.ts`, below `import { driftBatchFacts } from './nbas'`, add

```ts
import { accounts } from './accounts'
import { getPositionsForAccount } from './positions'
import { realisedSales } from './realised-sales'
import { orders } from '../handlers/oms'
import { KNOWN_OPEN_DATES } from '../handlers/custodian'

/**
 * §0.7 · the INTC harvest and its SMH replacement, from the records that state them: rs-001 and
 * its fill (ord-004) for the sale, pos-265 and its recorded open date for the purchase. The feed
 * said "Sold 500 shares … Realized loss: $6,820" against a 5,000-share, −$32,750 sale.
 */
const rs001 = realisedSales.find((s) => s.id === 'rs-001')!
const ord004 = orders.find((o) => o.id === 'ord-004')!
const acc002 = accounts.find((a) => a.id === rs001.accountId)!
const smh = getPositionsForAccount(acc002.id, acc002.totalValue).find((p) => p.id === 'pos-265')!
const dollarsAndCents = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
```

In act-001, replace `timestamp: '2026-02-25T13:45:00Z', read: false,` with

```ts
    // §0.7 · was 13:45Z today, after the frozen now (12:00Z, 7:00 ET) and before the market opened.
    timestamp: '2026-02-24T20:45:00Z', read: false,
```

In act-002, replace

```ts
    title: 'Market open — S&P 500 up 0.3% pre-market',
    description: 'Futures indicate positive open. Key earnings: HD, LOW this week.',
    timestamp: '2026-02-25T13:30:00Z', read: true,
```

with

```ts
    title: 'Pre-market — S&P 500 futures up 0.3%',
    description: 'Futures indicate positive open. Key earnings: HD, LOW this week.',
    // §0.7 · was 13:30Z, after the frozen now; a pre-market note at 6:30 ET precedes it.
    timestamp: '2026-02-25T11:30:00Z', read: true,
```

In act-005, replace

```ts
    title: 'Trade executed — INTC sell for tax harvest',
    description: 'Sold 500 shares INTC at $28.45 in Johnson account. Realized loss: $6,820.',
    entityType: 'client', entityId: 'cli-001', entityName: 'Robert Johnson',
    timestamp: '2026-02-24T16:30:00Z', read: true,
```

with

```ts
    title: `Trade executed — ${rs001.symbol} sell for tax harvest`,
    description: `Sold ${rs001.quantity.toLocaleString('en-US')} shares ${rs001.symbol} at ${dollarsAndCents(rs001.proceeds / rs001.quantity)} in ${acc002.name}. ` +
      `Realised ${rs001.holdingPeriod}-term loss: $${Math.abs(rs001.realisedGainLoss).toLocaleString('en-US')}.`,
    entityType: 'client', entityId: 'cli-001', entityName: 'Robert Johnson',
    timestamp: ord004.filledAt!, read: true,
```

In act-011, replace

```ts
    title: 'Order filled — SMH purchase (tax harvest replacement)',
    description: 'Purchased 180 shares SMH at $245.20 in Johnson account as INTC replacement.',
    entityType: 'client', entityId: 'cli-001', entityName: 'Robert Johnson',
    timestamp: '2026-02-23T14:20:00Z', read: true,
```

with

```ts
    title: `Order filled — ${smh.symbol} purchase (tax harvest replacement)`,
    description: `Purchased ${smh.quantity.toLocaleString('en-US')} shares ${smh.symbol} at ${dollarsAndCents(smh.costBasis / smh.quantity)} in ${acc002.name} as the ${rs001.symbol} replacement.`,
    entityType: 'client', entityId: 'cli-001', entityName: 'Robert Johnson',
    // Bought the morning of the sale, after the INTC fill (10:15) and before note-002 (10:30).
    timestamp: `${KNOWN_OPEN_DATES.get(smh.id)}T10:20:00Z`, read: true,
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/activity-invariants.test.ts` — Expected: PASS (3 tests).
Run: `node_modules/.bin/vitest run` — Expected: all pass. If an old UI test pins the feed's order or text, change it only for the re-timed or re-worded items above and say so in the commit.

- [ ] **Step 5: Lint, build, commit**

```bash
pnpm lint && pnpm build && git checkout -- tsconfig.tsbuildinfo
git add src/mocks/data/activities.ts src/mocks/data/__tests__/activity-invariants.test.ts
git commit -m "fix(data): the activity feed agrees with the records (§0.7)

act-005 said 'Sold 500 shares INTC … Realized loss: \$6,820'; rs-001 is 5,000 shares, a \$32,750
long-term loss, filled 2026-02-21 10:15 (ord-004). act-011 dated the SMH purchase 2026-02-23; it
was bought 2026-02-21. act-001 and act-002 were dated after the frozen now.

Co-Authored-By: Claude <your model name> <noreply@anthropic.com>"
```

---

### Task 15: Final verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Whole suite, lint, build**

```bash
node_modules/.bin/vitest run
pnpm lint
pnpm build && git checkout -- tsconfig.tsbuildinfo
```

Expected: all green.

- [ ] **Step 2: Contract checks**

```bash
git diff workspace -- src/lib/clock.ts src/lib/__tests__/clock.test.ts src/mocks/data/people.ts src/mocks/data/__tests__/people.test.ts src/types/workspace.ts   # no output
git diff workspace -- src/mocks/data/realised-sales.ts   # only the rs-003 holdingPeriod line
grep -rni joel src/mocks                                   # no output
grep -rnE "new Date\(\)|Date\.now\(\)" src/mocks | grep -v __tests__   # no output
```

- [ ] **Step 3: Spec checklist** — confirm each has a test that fails without its fix:

| Spec item | Test file |
|---|---|
| 0.2 loss-sale window, recorded vs projected | `src/mocks/handlers/__tests__/loss-sale-window.test.ts` |
| 0.3 directory, `can`, CCO id, no real names | `people.test.ts`, `supervision-records.test.ts`, `src/mocks/__tests__/demo-names.test.ts` |
| 0.4 model names | `src/mocks/handlers/__tests__/model-names.test.ts` |
| 0.5 event clock | `src/lib/__tests__/clock.test.ts`, `src/mocks/__tests__/event-clock.test.ts` |
| 0.6 NIIT on short-term, rate basis | `src/lib/__tests__/tax-rate-basis.test.ts` |
| 0.6 post-trade drift and reasons | `src/mocks/handlers/__tests__/projected-drift.test.ts` |
| 0.7 msg-003 | `johnson-thread-copy.test.ts` |
| 0.7 nba-001 (and act-012, ntf-010) | `drift-copy-invariants.test.ts` |
| 0.7 activities | `activity-invariants.test.ts` |
| 0.7 INTC opening transaction | `opening-transaction-invariants.test.ts` |
| 0.7 nba-002 | `intc-harvest-copy.test.ts`, `nba-facts.test.ts` |
| 0.7 IBIT / BXPE inception | `lot-inception-invariants.test.ts` |
| 0.7 2022 INTC lot not restricted | `opening-transaction-invariants.test.ts` (second block) |

No commit unless a fix was needed.
