# Phase 2: Workspace Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, build the threads-first workspace frame: engine-enforced threads with per-thread visibility, binding acts, drafts and two scripted agents, served per viewer; and the three-pane shell with "view as", the account full view and real visual baselines.

**Architecture:** All thread state and rules live in the MSW engine (`src/mocks/data/workspace-store.ts` + `src/mocks/handlers/workspace.ts`), with pure rule functions (`src/mocks/workspace/`) pinned by invariant tests. Agents are pure functions in the engine (`src/mocks/agents/`). The UI (`src/workspace/`) reads through services that send `X-Viewer`; the viewer is app state chosen by the "view as" control. UI uses only the Phase 1 kit.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-phase-2-workspace-shell-design.md`

## Global Constraints

- Work only on branch `workspace`. Never commit to `main`. Push only when the controller says so.
- Strict TypeScript; no `any`; `type` over `interface`; no enums; ESM; no barrel files. `pnpm lint` runs with `--max-warnings 0`; `.tsx` files export only components (helpers/types go in `.ts` siblings). On macOS's case-insensitive filesystem never place `foo.ts` next to `Foo.tsx`.
- Tests: `node_modules/.bin/vitest run <path>`; full suite `node_modules/.bin/vitest run`; then `pnpm lint`, `pnpm build`. Restore `tsconfig.tsbuildinfo` / `wrangler.jsonc` with `git checkout --` if a tool modifies them.
- Frozen today `2026-02-25`; the live clock is never read. Recorded times come from `eventTime(sequence)` in `src/lib/clock.ts`.
- **No real person's name anywhere in demo data or screens.** The advisor is **Adrian Hale** (`user-001`).
- Every displayed figure comes from the engine; the engine never formats numbers for display (UI formats through `src/kit/measure.ts`). Agent finding `claim` text contains no digits.
- UI code lives in `src/workspace/` and `src/app/`, uses only kit components for buttons/tables/dialogs/inputs, and only instrument colour tokens. Guardrails in `src/__tests__/guardrails/` must stay green.
- Visibility words exactly: "Only you" / "Firm only · client can't see" / "CLIENT CAN SEE".
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A client viewer probing hidden data** (`GET /api/workspace/threads/<internal-id>` with `X-Viewer: cli-001`, or listing acts/drafts) gets `404`/empty, never content or a `403` that confirms existence (Task 4, Task 5 tests).
2. **Viewer switch mid-session**: switching "view as" never shows the previous viewer's cached data (query keys include the viewer; Task 7 test).
3. **Sending a draft twice** (double click, retry) records exactly one act and one client message; the second request is `409` (Task 5 test).
4. **Agent run repeated or on a client thread**: a second run returns the same findings without duplicates; a run on a client thread is refused (Task 6 tests).
5. **Unknown or missing viewer / unknown thread / unknown account in a URL**: explicit not-found states, never a blank pane or crash (Tasks 4, 8, 11 tests).

---

### Task 1: Rename the demo advisor; move router flags out of the app

**Files:**
- Modify: `src/mocks/data/messages.ts:3` (participant `user-001` → `Adrian Hale`; rename the `joel` const to `adrian` everywhere in the file), `src/kit/__tests__/{RecordSlip,RecordTrail,Stamp}.test.tsx` (fixture name → `Adrian Hale`)
- Create: `src/app/router-flags.ts`
- Modify: `src/app/routes.tsx`, `src/main.tsx`, every test importing `routerFuture`/`providerFuture` from `@/app/routes` (grep)

- [ ] **Step 1:** Rename. Then `git grep -n "Joel Lewis" -- src` must print nothing.
- [ ] **Step 2:** Create `src/app/router-flags.ts`:

```ts
export const routerFuture = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const

export const providerFuture = { v7_startTransition: true } as const
```

Remove the two objects from `routes.tsx` (import them from `./router-flags` there) and update every importer to `@/app/router-flags`.
- [ ] **Step 3:** `node_modules/.bin/vitest run && pnpm lint && pnpm build` → green. Commit: `chore: demo advisor is Adrian Hale; router flags in their own module`.

### Task 2: Workspace types, people and agent directory, permissions, event clock, fingerprint

**Files:**
- Create: `src/types/workspace.ts`, `src/mocks/data/people.ts`, `src/lib/fingerprint.ts`
- Modify: `src/lib/clock.ts` (add `eventTime`; skip if Phase 0 already added an identical function — then just use it)
- Test: `src/mocks/data/__tests__/people.test.ts`, `src/lib/__tests__/fingerprint.test.ts`, `src/lib/__tests__/clock.test.ts` (append)

**Interfaces (produced):**
```ts
// src/types/workspace.ts
export type Role = 'advisor' | 'csa' | 'analyst' | 'compliance' | 'client'
export type Person = { id: string; name: string; role: Role }
export type AgentId = 'drift-monitor' | 'pretrade-check'
export type AgentScope = { may: string[]; mayNot: string[] }
export type AgentProfile = { id: AgentId; name: string; scope: AgentScope }
export type Visibility = 'private' | 'internal' | 'client'
export type Subject = { type: 'account' | 'household' | 'client' | 'draft'; id: string }
export type Thread = { id: string; title: string; visibility: Visibility; ownerId?: string; clientId?: string; memberIds: string[]; agentIds: AgentId[]; subject?: Subject }
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'd'
export type Figure = { label: string; value: number; unit: FigureUnit; source: string }   // pp and % values are fractions (0.132)
export type Citation = { source: string; asOf: string }
export type Attention = 'info' | 'attention'
export type EmbedKind = 'drift' | 'rebalance_preview'
export type Message =
  | { kind: 'text'; id: string; threadId: string; authorId: string; at: string; body: string }
  | { kind: 'agent_finding'; id: string; threadId: string; agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention; runKey: string }
  | { kind: 'embed'; id: string; threadId: string; authorId: string; at: string; embed: EmbedKind; subject: Subject }
  | { kind: 'act'; id: string; threadId: string; at: string; actId: string }
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'dispose_exception' | 'send_to_client'
export type BindingAct = { id: string; kind: BindingActKind; actorId: string; at: string; threadId: string; subject?: Subject; fingerprint: string; summary: string }
export type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string }
export type ThreadDetail = { thread: Thread; messages: Message[] }
export type Act = BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads'
/** permissions: personId → the acts that person may perform, computed by the engine's can(). The UI never derives permissions itself. */
export type Directory = { people: Person[]; agents: AgentProfile[]; permissions: Record<string, Act[]> }
```
```ts
// src/mocks/data/people.ts
export const PEOPLE: readonly Person[]
export const AGENTS: readonly AgentProfile[]
export function personById(id: string): Person | undefined
export function can(personId: string, act: Act): boolean
export function permissionsOf(personId: string): Act[]
// src/lib/clock.ts
export function eventTime(sequence: number): string   // MOCK_NOW + sequence minutes, ISO with Z
// src/lib/fingerprint.ts
export function fingerprint(text: string): string      // FNV-1a 32-bit, 8 upper-case hex chars
```

- [ ] **Step 1: Failing tests**

```ts
// src/mocks/data/__tests__/people.test.ts
import { describe, it, expect } from 'vitest'
import { PEOPLE, AGENTS, can, personById } from '../people'

describe('people and permissions', () => {
  it('has the five roles and no real names', () => {
    expect(PEOPLE.map((p) => p.role).sort()).toEqual(['advisor', 'analyst', 'client', 'compliance', 'csa'])
    expect(personById('user-001')?.name).toBe('Adrian Hale')
    expect(PEOPLE.some((p) => /joel/i.test(p.name))).toBe(false)
  })
  it.each([
    ['user-001', 'send_to_client', true], ['user-001', 'approve_proposal', true], ['user-001', 'draft_for_client', true],
    ['user-002', 'draft_for_client', true], ['user-002', 'send_to_client', false], ['user-002', 'approve_proposal', false],
    ['user-003', 'draft_for_client', false], ['user-003', 'post_firm', true],
    ['cco-001', 'dispose_exception', true], ['cco-001', 'read_all_firm_threads', true], ['cco-001', 'send_to_client', false],
    ['cli-001', 'post_firm', false], ['cli-001', 'send_to_client', false],
    ['drift-monitor', 'send_to_client', false], ['nobody', 'post_firm', false],
  ] as const)('can(%s, %s) is %s', (person, act, expected) => {
    expect(can(person, act)).toBe(expected)
  })
  it('agents declare what they may and may not do', () => {
    for (const a of AGENTS) {
      expect(a.scope.may.length).toBeGreaterThan(0)
      expect(a.scope.mayNot).toEqual(expect.arrayContaining(['post in a client thread']))
    }
  })
})
```

```ts
// src/lib/__tests__/fingerprint.test.ts
import { it, expect } from 'vitest'
import { fingerprint } from '@/lib/fingerprint'

it('is deterministic, 8 hex chars, and sensitive to content', () => {
  expect(fingerprint('abc')).toMatch(/^[0-9A-F]{8}$/)
  expect(fingerprint('abc')).toBe(fingerprint('abc'))
  expect(fingerprint('abc')).not.toBe(fingerprint('abd'))
})
```

Append to `src/lib/__tests__/clock.test.ts`:

```ts
import { eventTime } from '@/lib/clock'
it('eventTime advances one minute per sequence from the frozen now', () => {
  expect(eventTime(0)).toBe('2026-02-25T12:00:00.000Z')
  expect(eventTime(6)).toBe('2026-02-25T12:06:00.000Z')
  expect(eventTime(-30)).toBe('2026-02-25T11:30:00.000Z')
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/lib/fingerprint.ts
/** FNV-1a (32-bit). Identifies the exact content a binding act was recorded against. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).toUpperCase().padStart(8, '0')
}
```

Add to `src/lib/clock.ts`:

```ts
/** Deterministic event clock: the frozen now plus `sequence` minutes. Recorded acts take successive sequences. */
export function eventTime(sequence: number): string {
  return new Date(Date.parse(MOCK_NOW_ISO) + sequence * 60_000).toISOString()
}
```

```ts
// src/mocks/data/people.ts
import type { Act, AgentProfile, Person } from '@/types/workspace'

export const PEOPLE: readonly Person[] = [
  { id: 'user-001', name: 'Adrian Hale', role: 'advisor' },
  { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' },
  { id: 'user-003', name: 'Mike Chen', role: 'analyst' },
  { id: 'cco-001', name: 'Mark Davis', role: 'compliance' },
  { id: 'cli-001', name: 'Robert Johnson', role: 'client' },
]

export const AGENTS: readonly AgentProfile[] = [
  { id: 'drift-monitor', name: 'Drift Monitor', scope: { may: ['measure and flag'], mayNot: ['stage or release trades', 'post in a client thread'] } },
  { id: 'pretrade-check', name: 'Pre-trade Check', scope: { may: ['run checks and report'], mayNot: ['clear a block', 'release orders', 'post in a client thread'] } },
]

const PERMISSIONS: Readonly<Record<Person['role'], readonly Act[]>> = {
  advisor: ['post_firm', 'draft_for_client', 'send_to_client', 'approve_proposal', 'withdraw_approval'],
  csa: ['post_firm', 'draft_for_client'],
  analyst: ['post_firm'],
  compliance: ['post_firm', 'read_all_firm_threads', 'dispose_exception'],
  client: [],
}

export function personById(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id)
}

export function can(personId: string, act: Act): boolean {
  const person = personById(personId)
  return person ? PERMISSIONS[person.role].includes(act) : false
}

export function permissionsOf(personId: string): Act[] {
  const person = personById(personId)
  return person ? [...PERMISSIONS[person.role]] : []
}
```

If Phase 0 has landed a people directory on `workspace` (check `git log --oneline -5 -- src/mocks/data` and grep for `can(`), reuse it instead: keep `src/mocks/data/people.ts` as the single source and adapt Phase 0's data into it; record the decision in the report. Mark Davis's id follows Phase 0's if it differs.

Write `src/types/workspace.ts` exactly as in Interfaces above.

- [ ] **Step 3:** Run tests → PASS; lint, build. Commit: `feat(engine): workspace types, people directory, permissions, event clock, fingerprint`.

### Task 3: Workspace store and seed

**Files:**
- Create: `src/mocks/data/workspace-store.ts`, `src/mocks/data/workspace-seed.ts`
- Modify: `src/test/setup.ts` (reset the store after each test)
- Test: `src/mocks/data/__tests__/workspace-seed.test.ts`

**Interfaces (produced):**
```ts
// workspace-store.ts — module-level session state, the only mutable workspace data
export type WorkspaceState = { threads: Thread[]; messages: Message[]; acts: BindingAct[]; drafts: Draft[]; sequence: number }
export function store(): WorkspaceState
export function resetWorkspaceStore(): void   // restores the seed
export function nextAt(): string              // eventTime(++sequence)
export function nextId(prefix: 'msg' | 'draft'): string   // msg-0001…
export function nextActId(): string           // peeks: the id the next act will get (REC-0001 …)
export function commitActId(): string         // allocates the next act id
```

- [ ] **Step 1: Failing test**

```ts
// src/mocks/data/__tests__/workspace-seed.test.ts
import { describe, it, expect } from 'vitest'
import { store, resetWorkspaceStore, nextActId } from '../workspace-store'

describe('workspace seed', () => {
  it('has one thread per visibility with the right owners and members', () => {
    resetWorkspaceStore()
    const { threads } = store()
    const byVis = Object.fromEntries(threads.map((t) => [t.visibility, t]))
    expect(byVis.private).toMatchObject({ ownerId: 'user-001', memberIds: ['user-001'] })
    expect(byVis.internal).toMatchObject({ title: 'Johnson Rebalance Review', subject: { type: 'account', id: 'acc-002' } })
    expect(byVis.internal.agentIds).toEqual(['drift-monitor', 'pretrade-check'])
    expect(byVis.client).toMatchObject({ clientId: 'cli-001', agentIds: [] })
    expect(byVis.client.memberIds).toEqual(expect.arrayContaining(['cli-001', 'user-001', 'user-002']))
  })
  it('seed text carries no figures', () => {
    resetWorkspaceStore()
    for (const m of store().messages) if (m.kind === 'text') expect(m.body).not.toMatch(/\d/)
  })
  it('client thread messages are client-authored', () => {
    resetWorkspaceStore()
    const client = store().threads.find((t) => t.visibility === 'client')!
    for (const m of store().messages.filter((x) => x.threadId === client.id)) {
      expect(m.kind === 'text' && m.authorId === 'cli-001').toBe(true)
    }
  })
  it('reset restores the seed and act ids restart', () => {
    resetWorkspaceStore()
    expect(nextActId()).toBe('REC-0001')
    store().acts.push({ id: 'REC-0001', kind: 'send_to_client', actorId: 'user-001', at: 'x', threadId: 't', fingerprint: 'x', summary: 'x' })
    resetWorkspaceStore()
    expect(store().acts).toEqual([])
    expect(nextActId()).toBe('REC-0001')
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/mocks/data/workspace-seed.ts
import type { Message, Thread } from '@/types/workspace'
import { eventTime } from '@/lib/clock'

export const SEED_THREADS: readonly Thread[] = [
  { id: 'th-brief', title: 'Brief', visibility: 'private', ownerId: 'user-001', memberIds: ['user-001'], agentIds: ['drift-monitor'],
    subject: { type: 'account', id: 'acc-002' } },
  { id: 'th-johnson-review', title: 'Johnson Rebalance Review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: ['drift-monitor', 'pretrade-check'], subject: { type: 'account', id: 'acc-002' } },
  { id: 'th-robert', title: 'Robert Johnson', visibility: 'client', clientId: 'cli-001', memberIds: ['cli-001', 'user-001', 'user-002'],
    agentIds: [], subject: { type: 'client', id: 'cli-001' } },
]

export const SEED_MESSAGES: readonly Message[] = [
  { kind: 'text', id: 'msg-s01', threadId: 'th-johnson-review', authorId: 'user-002', at: eventTime(-10),
    body: 'Robert asked when his annual review is this year.' },
  { kind: 'embed', id: 'msg-s02', threadId: 'th-johnson-review', authorId: 'user-001', at: eventTime(-8),
    embed: 'drift', subject: { type: 'account', id: 'acc-002' } },
  { kind: 'text', id: 'msg-s03', threadId: 'th-johnson-review', authorId: 'user-001', at: eventTime(-7),
    body: 'Mike, can you look at the tax side before we build anything?' },
  { kind: 'text', id: 'msg-s04', threadId: 'th-robert', authorId: 'cli-001', at: eventTime(-20),
    body: 'When is my annual review this year?' },
]
```

The seed text above is the only hand-written copy; it contains no figures. (thread-001's old messages are not migrated: their figures belonged to the wrong account.)

```ts
// src/mocks/data/workspace-store.ts
import type { BindingAct, Draft, Message, Thread } from '@/types/workspace'
import { eventTime } from '@/lib/clock'
import { SEED_MESSAGES, SEED_THREADS } from './workspace-seed'

export type WorkspaceState = { threads: Thread[]; messages: Message[]; acts: BindingAct[]; drafts: Draft[]; sequence: number; counters: Record<'msg' | 'draft' | 'act', number> }

function seed(): WorkspaceState {
  return {
    threads: SEED_THREADS.map((t) => ({ ...t, memberIds: [...t.memberIds], agentIds: [...t.agentIds] })),
    messages: SEED_MESSAGES.map((m) => ({ ...m })),
    acts: [],
    drafts: [],
    sequence: 0,
    counters: { msg: 0, draft: 0, act: 0 },
  }
}

let state = seed()

export function store(): WorkspaceState {
  return state
}

export function resetWorkspaceStore(): void {
  state = seed()
}

export function nextAt(): string {
  state.sequence += 1
  return eventTime(state.sequence)
}

export function nextId(prefix: 'msg' | 'draft'): string {
  state.counters[prefix] += 1
  return `${prefix}-${String(state.counters[prefix]).padStart(4, '0')}`
}

export function nextActId(): string {
  return `REC-${String(state.counters.act + 1).padStart(4, '0')}`
}

export function commitActId(): string {
  state.counters.act += 1
  return `REC-${String(state.counters.act).padStart(4, '0')}`
}
```

In `src/test/setup.ts`, inside the existing `afterEach`, call `resetWorkspaceStore()` (import from `@/mocks/data/workspace-store`).

- [ ] **Step 3:** Run → PASS; full suite, lint, build. Commit: `feat(engine): workspace session store and seed threads`.

### Task 4: Viewer rules and read handlers

**Files:**
- Create: `src/mocks/workspace/visibility.ts`, `src/mocks/handlers/workspace.ts`
- Modify: `src/mocks/handlers/index.ts` (register `workspaceHandlers`)
- Test: `src/mocks/workspace/__tests__/visibility.test.ts`, `src/mocks/handlers/__tests__/workspace-read.test.ts`

**Interfaces (produced):**
```ts
// visibility.ts
export function canSeeThread(viewerId: string, thread: Thread): boolean
export function visibleThreads(viewerId: string): Thread[]
export function viewerFrom(request: Request): string | undefined   // X-Viewer, only if a known person
```
Handlers (this task): `GET /api/workspace/people` → `Directory`; `GET /api/workspace/threads` → `Thread[]`; `GET /api/workspace/threads/:id` → `ThreadDetail`. All return `401` without a known viewer and `404` for a thread the viewer may not see.

- [ ] **Step 1: Failing tests**

```ts
// src/mocks/workspace/__tests__/visibility.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { canSeeThread, visibleThreads } from '../visibility'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'

const ids = (viewer: string) => visibleThreads(viewer).map((t) => t.id).sort()

describe('viewer filtering (engine rule 2)', () => {
  beforeEach(() => resetWorkspaceStore())
  it('advisor sees all three; their private brief included', () => {
    expect(ids('user-001')).toEqual(['th-brief', 'th-johnson-review', 'th-robert'])
  })
  it('a csa sees firm threads they belong to, never another person\'s private thread', () => {
    expect(ids('user-002')).toEqual(['th-johnson-review', 'th-robert'])
  })
  it('compliance supervises internal and client threads but not private ones', () => {
    expect(ids('cco-001')).toEqual(['th-johnson-review', 'th-robert'])
  })
  it('a client sees exactly their own client thread', () => {
    expect(ids('cli-001')).toEqual(['th-robert'])
  })
  it('an unknown viewer sees nothing', () => {
    expect(ids('nobody')).toEqual([])
  })
  it('a client never sees an internal thread even if wrongly added as a member', () => {
    const internal = store().threads.find((t) => t.id === 'th-johnson-review')!
    expect(canSeeThread('cli-001', { ...internal, memberIds: [...internal.memberIds, 'cli-001'] })).toBe(false)
  })
})
```

```ts
// src/mocks/handlers/__tests__/workspace-read.test.ts
import { describe, it, expect } from 'vitest'

async function call(path: string, viewer?: string) {
  const res = await fetch(`/api/workspace${path}`, { headers: viewer ? { 'X-Viewer': viewer } : {} })
  return { status: res.status, body: res.status === 200 ? await res.json() : null }
}

describe('workspace read API', () => {
  it('requires a known viewer', async () => {
    expect((await call('/threads')).status).toBe(401)
    expect((await call('/threads', 'nobody')).status).toBe(401)
  })
  it('lists only visible threads', async () => {
    const { body } = await call('/threads', 'cli-001')
    expect(body.map((t: { id: string }) => t.id)).toEqual(['th-robert'])
  })
  it('a hidden thread is 404, not 403', async () => {
    expect((await call('/threads/th-johnson-review', 'cli-001')).status).toBe(404)
    expect((await call('/threads/th-brief', 'cco-001')).status).toBe(404)
    expect((await call('/threads/does-not-exist', 'user-001')).status).toBe(404)
  })
  it('serves a visible thread with its messages in time order', async () => {
    const { status, body } = await call('/threads/th-johnson-review', 'user-003')
    expect(status).toBe(200)
    expect(body.thread.id).toBe('th-johnson-review')
    const times = body.messages.map((m: { at: string }) => m.at)
    expect([...times].sort()).toEqual(times)
  })
  it('the directory lists people and agents', async () => {
    const { body } = await call('/people', 'user-001')
    expect(body.people.find((p: { id: string }) => p.id === 'user-001').name).toBe('Adrian Hale')
    expect(body.agents.map((a: { id: string }) => a.id)).toEqual(['drift-monitor', 'pretrade-check'])
    expect(body.permissions['user-001']).toContain('send_to_client')
    expect(body.permissions['user-002']).not.toContain('send_to_client')
  })
})
```

Requests use relative `/api/...` URLs, the same way `src/services/api-client.ts` does (see `src/mocks/data/__tests__/proposals-fee.test.ts` for an engine test going through MSW). If a relative `fetch` fails in this environment, prefix `window.location.origin` — keep the assertions.

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/mocks/workspace/visibility.ts
import type { Thread } from '@/types/workspace'
import { can, personById } from '@/mocks/data/people'
import { store } from '@/mocks/data/workspace-store'

export function canSeeThread(viewerId: string, thread: Thread): boolean {
  const viewer = personById(viewerId)
  if (!viewer) return false
  if (viewer.role === 'client') return thread.visibility === 'client' && thread.clientId === viewer.id
  if (thread.visibility === 'private') return thread.ownerId === viewer.id
  if (can(viewer.id, 'read_all_firm_threads')) return true
  return thread.memberIds.includes(viewer.id)
}

export function visibleThreads(viewerId: string): Thread[] {
  return store().threads.filter((t) => canSeeThread(viewerId, t))
}

export function viewerFrom(request: Request): string | undefined {
  const id = request.headers.get('X-Viewer') ?? undefined
  return id && personById(id) ? id : undefined
}
```

```ts
// src/mocks/handlers/workspace.ts
import { http, HttpResponse } from 'msw'
import type { Directory, ThreadDetail } from '@/types/workspace'
import { AGENTS, PEOPLE, permissionsOf } from '../data/people'
import { store } from '../data/workspace-store'
import { canSeeThread, viewerFrom, visibleThreads } from '../workspace/visibility'
import { notFound } from './utils'

const unauthorised = () => HttpResponse.json({ code: 'NO_VIEWER', message: 'A known viewer is required.' }, { status: 401 })

export const workspaceHandlers = [
  http.get('/api/workspace/people', ({ request }) => {
    if (!viewerFrom(request)) return unauthorised()
    const directory: Directory = { people: [...PEOPLE], agents: [...AGENTS], permissions: Object.fromEntries(PEOPLE.map((p) => [p.id, permissionsOf(p.id)])) }
    return HttpResponse.json(directory)
  }),

  http.get('/api/workspace/threads', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    return HttpResponse.json(visibleThreads(viewer))
  }),

  http.get('/api/workspace/threads/:id', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const messages = store().messages.filter((m) => m.threadId === thread.id).sort((a, b) => a.at.localeCompare(b.at))
    const detail: ThreadDetail = { thread, messages }
    return HttpResponse.json(detail)
  }),
]
```

Register `...workspaceHandlers` in `src/mocks/handlers/index.ts`.

- [ ] **Step 3:** Run → PASS; full suite, lint, build. Commit: `feat(engine): viewer-filtered workspace reads`.

### Task 5: Posting, drafts and binding acts

**Files:**
- Create: `src/mocks/workspace/acts.ts`
- Modify: `src/mocks/handlers/workspace.ts`
- Test: `src/mocks/handlers/__tests__/workspace-write.test.ts`

**Interfaces (produced):** handlers
- `POST /api/workspace/threads/:id/messages` body `{ body: string }` → `201 Message` (rule 3); `403` when the viewer can see but may not post; `404` when not visible.
- `GET /api/workspace/threads/:id/drafts` → `Draft[]` (firm viewers who can see the client thread; client viewer → `404`).
- `POST /api/workspace/threads/:id/drafts` body `{ body: string }` → `201 Draft` (only on client threads; only `can(viewer,'draft_for_client')`).
- `GET /api/workspace/acts?threadId=` → `BindingAct[]` for a thread the viewer can see (client viewer: acts recorded in their thread only).
- `POST /api/workspace/acts` body `{ kind: 'send_to_client'; draftId: string }` → `201 BindingAct`. Phase 2 implements `send_to_client` only; other kinds → `400 NOT_IN_PHASE`. Actor = viewer; `403` unless `can(viewer, kind)`; draft consumed → a second send of the same draft is `409`.
- No PUT/PATCH/DELETE routes exist under `/api/workspace` (tested).

`acts.ts` exports `sendToClient(viewerId: string, draftId: string): { ok: true; act: BindingAct } | { ok: false; status: 403 | 404 | 409; code: string; message: string }` — pure over the store, used by the handler.

- [ ] **Step 1: Failing tests** (same request helper as Task 4, extended with method/body)

```ts
// src/mocks/handlers/__tests__/workspace-write.test.ts
import { describe, it, expect } from 'vitest'

async function call(method: string, path: string, viewer: string, body?: unknown) {
  const res = await fetch(`/api/workspace${path}`, {
    method, headers: { 'X-Viewer': viewer, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: res.status < 300 ? await res.json() : await res.json().catch(() => null) }
}

describe('posting (rule 3)', () => {
  it('members post text in firm threads', async () => {
    const r = await call('POST', '/threads/th-johnson-review/messages', 'user-003', { body: 'Looking at lots now.' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ kind: 'text', authorId: 'user-003' })
  })
  it('firm members cannot type into a client thread', async () => {
    expect((await call('POST', '/threads/th-robert/messages', 'user-001', { body: 'Hi' })).status).toBe(403)
  })
  it('the client posts in their own thread', async () => {
    expect((await call('POST', '/threads/th-robert/messages', 'cli-001', { body: 'Thanks' })).status).toBe(201)
  })
  it('posting to an invisible thread is 404', async () => {
    expect((await call('POST', '/threads/th-johnson-review/messages', 'cli-001', { body: 'x' })).status).toBe(404)
  })
})

describe('drafts (rule 4)', () => {
  it('advisor and csa draft for clients; analyst cannot', async () => {
    expect((await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'A' })).status).toBe(201)
    expect((await call('POST', '/threads/th-robert/drafts', 'user-002', { body: 'B' })).status).toBe(201)
    expect((await call('POST', '/threads/th-robert/drafts', 'user-003', { body: 'C' })).status).toBe(404)
  })
  it('drafts never reach the client', async () => {
    await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'A' })
    expect((await call('GET', '/threads/th-robert/drafts', 'cli-001')).status).toBe(404)
    const detail = await call('GET', '/threads/th-robert', 'cli-001')
    expect(JSON.stringify(detail.body)).not.toContain('"A"')
  })
  it('drafts only on client threads', async () => {
    expect((await call('POST', '/threads/th-johnson-review/drafts', 'user-001', { body: 'A' })).status).toBe(400)
  })
})

describe('send to client (rules 5–6)', () => {
  it('records one act, posts the message to the client thread, consumes the draft', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'Sarah will be in touch this week.' })).body
    const sent = await call('POST', '/acts', 'user-001', { kind: 'send_to_client', draftId: draft.id })
    expect(sent.status).toBe(201)
    expect(sent.body).toMatchObject({ id: 'REC-0001', kind: 'send_to_client', actorId: 'user-001', threadId: 'th-robert' })
    expect(sent.body.fingerprint).toMatch(/^[0-9A-F]{8}$/)
    const seen = (await call('GET', '/threads/th-robert', 'cli-001')).body
    const last = seen.messages.slice(-2)
    expect(last[0]).toMatchObject({ kind: 'text', authorId: 'user-001', body: 'Sarah will be in touch this week.' })
    expect(last[1]).toMatchObject({ kind: 'act', actId: 'REC-0001' })
    expect((await call('POST', '/acts', 'user-001', { kind: 'send_to_client', draftId: draft.id })).status).toBe(409)
  })
  it('a csa may draft but not send', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-002', { body: 'x' })).body
    expect((await call('POST', '/acts', 'user-002', { kind: 'send_to_client', draftId: draft.id })).status).toBe(403)
  })
  it('acts are listed per thread and visible to the client only for their thread', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'y' })).body
    await call('POST', '/acts', 'user-001', { kind: 'send_to_client', draftId: draft.id })
    expect((await call('GET', '/acts?threadId=th-robert', 'cli-001')).body).toHaveLength(1)
    expect((await call('GET', '/acts?threadId=th-johnson-review', 'cli-001')).status).toBe(404)
  })
  it('other act kinds are not in phase 2', async () => {
    expect((await call('POST', '/acts', 'user-001', { kind: 'approve_proposal' })).status).toBe(400)
  })
  it('there is no way to edit or delete', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const r = await fetch('/api/workspace/acts/REC-0001', { method, headers: { 'X-Viewer': 'user-001' } })
      expect([404, 405]).toContain(r.status)
    }
  })
})
```

The edit/delete test may need MSW's unhandled-request setting: the global test setup uses `onUnhandledRequest: 'error'`. Add an explicit catch-all in `workspaceHandlers` — `http.all('/api/workspace/*', () => HttpResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'Workspace records cannot be edited or deleted.' }, { status: 405 }))` — placed **last** so it only answers unmatched methods/paths.

Run → FAIL.

- [ ] **Step 2: Implement** `src/mocks/workspace/acts.ts`:

```ts
import type { BindingAct, Message } from '@/types/workspace'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { canSeeThread } from './visibility'

type Failure = { ok: false; status: 403 | 404 | 409; code: string; message: string }

export function sendToClient(viewerId: string, draftId: string): { ok: true; act: BindingAct } | Failure {
  const s = store()
  const draft = s.drafts.find((d) => d.id === draftId)
  if (!draft) {
    const sent = s.acts.find((a) => a.kind === 'send_to_client' && a.subject?.type === 'draft' && a.subject.id === draftId)
    return sent
      ? { ok: false, status: 409, code: 'ALREADY_SENT', message: `This draft was already sent (${sent.id}).` }
      : { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  }
  const thread = s.threads.find((t) => t.id === draft.clientThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (!can(viewerId, 'send_to_client')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can send to a client.' }

  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_client', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body),
    summary: 'Message sent to the client',
  }
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewerId, at, body: draft.body }
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: thread.id, at: nextAt(), actId: act.id }
  s.acts.push(act)
  s.messages.push(text, marker)
  s.drafts = s.drafts.filter((d) => d.id !== draftId)
  return { ok: true, act }
}
```

The act's subject records the consumed draft (`{ type: 'draft', id }`) so a repeat send is answered with `409` naming the earlier record.

Add the handlers in `workspace.ts` (before the catch-all):

```ts
  http.post('/api/workspace/threads/:id/messages', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const isClient = personById(viewer)?.role === 'client'
    const allowed = thread.visibility === 'client'
      ? isClient && thread.clientId === viewer
      : !isClient && (thread.memberIds.includes(viewer) || thread.ownerId === viewer)
    if (!allowed) return HttpResponse.json({ code: 'NOT_PERMITTED', message: thread.visibility === 'client' ? 'Write a draft; sending to the client is a recorded act.' : 'Only members can post here.' }, { status: 403 })
    const { body } = (await request.json()) as { body: string }
    const message: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewer, at: nextAt(), body }
    store().messages.push(message)
    return HttpResponse.json(message, { status: 201 })
  }),

  http.get('/api/workspace/threads/:id/drafts', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread) || personById(viewer)?.role === 'client') return notFound()
    return HttpResponse.json(store().drafts.filter((d) => d.clientThreadId === thread.id))
  }),

  http.post('/api/workspace/threads/:id/drafts', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread) || !can(viewer, 'draft_for_client')) return notFound()
    if (thread.visibility !== 'client') return HttpResponse.json({ code: 'NOT_CLIENT_THREAD', message: 'Drafts are for client threads.' }, { status: 400 })
    const { body } = (await request.json()) as { body: string }
    const draft: Draft = { id: nextId('draft'), clientThreadId: thread.id, authorId: viewer, body, createdAt: nextAt() }
    store().drafts.push(draft)
    return HttpResponse.json(draft, { status: 201 })
  }),

  http.get('/api/workspace/acts', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const threadId = new URL(request.url).searchParams.get('threadId')
    const thread = store().threads.find((t) => t.id === threadId)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    return HttpResponse.json(store().acts.filter((a) => a.threadId === thread.id))
  }),

  http.post('/api/workspace/acts', async ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = (await request.json()) as { kind: string; draftId?: string }
    if (body.kind !== 'send_to_client' || !body.draftId) return HttpResponse.json({ code: 'NOT_IN_PHASE', message: 'Only sending to a client is recorded in this phase.' }, { status: 400 })
    const result = sendToClient(viewer, body.draftId)
    if (!result.ok) return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    return HttpResponse.json(result.act, { status: 201 })
  }),

  http.all('/api/workspace/*', () => HttpResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'Workspace records cannot be edited or deleted.' }, { status: 405 })),
```

Add the needed imports (`can`, `personById`, `nextAt`, `nextId`, `Message`, `Draft`, `sendToClient`).

- [ ] **Step 3:** Run → PASS; also add an invariant over the store after the write tests: every client-thread `text` message is client-authored or immediately follows a `send_to_client` act with matching fingerprint (`src/mocks/handlers/__tests__/workspace-invariants.test.ts`, exercising a send then asserting). Full suite, lint, build. Commit: `feat(engine): posting, drafts and the send-to-client binding act`.

### Task 6: Agent framework, Drift Monitor, Pre-trade Check, run endpoint

**Files:**
- Create: `src/mocks/agents/agent.ts`, `src/mocks/agents/drift-monitor.ts`, `src/mocks/agents/pretrade-check.ts`, `src/mocks/agents/registry.ts`, `src/mocks/workspace/run-agent.ts`
- Modify: `src/mocks/handlers/workspace.ts`
- Test: `src/mocks/agents/__tests__/agents.test.ts`, `src/mocks/handlers/__tests__/workspace-agents.test.ts`

**Interfaces (produced):**
```ts
// agent.ts
export type AgentContext = { asOf: string; subject: Subject }
export type AgentFinding = { claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type AgentDefinition = AgentProfile & { run: (context: AgentContext) => AgentFinding[] }
// registry.ts
export const AGENT_DEFINITIONS: ReadonlyMap<AgentId, AgentDefinition>
// run-agent.ts
export function runAgent(viewerId: string, threadId: string, agentId: AgentId): { ok: true; findings: Message[] } | { ok: false; status: 400 | 403 | 404; code: string; message: string }
```
Handler: `POST /api/workspace/threads/:id/agents/:agentId/run` → `200 Message[]` (the run's findings; same messages on repeat).

- [ ] **Step 1: Failing tests**

```ts
// src/mocks/agents/__tests__/agents.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { AGENT_DEFINITIONS } from '../registry'
import { MOCK_NOW_ISO } from '@/lib/clock'

const drift = AGENT_DEFINITIONS.get('drift-monitor')!
const pretrade = AGENT_DEFINITIONS.get('pretrade-check')!
const ctx = (id: string) => ({ asOf: MOCK_NOW_ISO, subject: { type: 'account' as const, id } })

describe('agents over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: claims have no digits; every figure has a source and finite value', (id) => {
    for (const agent of [drift, pretrade]) {
      for (const f of agent.run(ctx(id))) {
        expect(f.claim).not.toMatch(/\d/)
        expect(f.citations.length).toBeGreaterThan(0)
        for (const fig of f.figures) {
          expect(Number.isFinite(fig.value)).toBe(true)
          expect(fig.source.length).toBeGreaterThan(0)
        }
      }
    }
  })
  it('drift monitor figures equal the engine drift', () => {
    const account = accounts.find((a) => a.id === 'acc-002')!
    const engine = computeDriftForAccount(account)
    const findings = drift.run(ctx('acc-002'))
    const max = findings.flatMap((f) => f.figures).find((fig) => fig.label.startsWith('Largest drift'))!
    const worst = engine.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
    expect(max.value).toBe(worst.drift)
    expect(findings[0]!.attention).toBe('attention')
  })
  it('drift monitor names private equity as not tradable at market for acc-002', () => {
    const claims = drift.run(ctx('acc-002')).map((f) => f.claim).join(' ')
    expect(claims).toMatch(/Private Equity cannot be traded at market/)
  })
  it('pre-trade check never reports anything as cleared', () => {
    for (const a of accounts) for (const f of pretrade.run(ctx(a.id))) expect(f.claim.toLowerCase()).not.toContain('cleared')
  })
  it('runs are deterministic per as-of', () => {
    expect(drift.run(ctx('acc-002'))).toEqual(drift.run(ctx('acc-002')))
  })
})
```

```ts
// src/mocks/handlers/__tests__/workspace-agents.test.ts
import { describe, it, expect } from 'vitest'

const run = (thread: string, agent: string, viewer = 'user-001') =>
  fetch(`/api/workspace/threads/${thread}/agents/${agent}/run`, { method: 'POST', headers: { 'X-Viewer': viewer } })

describe('agent runs (rule 7)', () => {
  it('posts findings once; a repeat returns the same messages', async () => {
    const first = await (await run('th-johnson-review', 'drift-monitor')).json()
    const second = await (await run('th-johnson-review', 'drift-monitor')).json()
    expect(first.length).toBeGreaterThan(0)
    expect(second.map((m: { id: string }) => m.id)).toEqual(first.map((m: { id: string }) => m.id))
    const thread = await (await fetch('/api/workspace/threads/th-johnson-review', { headers: { 'X-Viewer': 'user-001' } })).json()
    expect(thread.messages.filter((m: { kind: string }) => m.kind === 'agent_finding')).toHaveLength(first.length)
  })
  it('refuses a client thread, an agent not on the thread, and an invisible thread', async () => {
    expect((await run('th-robert', 'drift-monitor')).status).toBe(400)
    expect((await run('th-brief', 'pretrade-check')).status).toBe(403)
    expect((await run('th-johnson-review', 'drift-monitor', 'cli-001')).status).toBe(404)
  })
  it('an agent can never record an act', async () => {
    const r = await fetch('/api/workspace/acts', { method: 'POST', headers: { 'X-Viewer': 'drift-monitor', 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'send_to_client', draftId: 'x' }) })
    expect(r.status).toBe(401)
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement**

```ts
// src/mocks/agents/agent.ts
import type { AgentProfile, Attention, Citation, Figure, Subject } from '@/types/workspace'

export type AgentContext = { asOf: string; subject: Subject }
export type AgentFinding = { claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type AgentDefinition = AgentProfile & { run: (context: AgentContext) => AgentFinding[] }
```

```ts
// src/mocks/agents/drift-monitor.ts
import type { AgentContext, AgentFinding } from './agent'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { isMarketTradable } from '@/lib/security-master'

const label = (key: string): string => {
  const name = ASSET_CLASS_LABELS[key]
  if (!name) throw new Error(`Drift Monitor: no display name for asset class "${key}"`)
  return name
}

export function runDriftMonitor({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const drift = computeDriftForAccount(account)
  const band = drift.driftTolerance
  const cite = [{ source: `Drift calculation · ${account.name}`, asOf }]
  const worst = drift.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
  const outside = drift.assetClassDrifts.filter((d) => Math.abs(d.drift) > band + 1e-9)
  const findings: AgentFinding[] = [{
    claim: outside.length > 0 ? `${label(worst.assetClass)} is outside its tolerance band.` : 'Every asset class is inside its tolerance band.',
    attention: outside.length > 0 ? 'attention' : 'info',
    citations: cite,
    figures: [
      { label: `Largest drift · ${label(worst.assetClass)}`, value: worst.drift, unit: 'pp', source: 'drift.assetClassDrifts' },
      { label: 'Tolerance', value: band, unit: 'pp', source: 'drift.driftTolerance' },
      ...outside.filter((d) => d !== worst).map((d) => ({ label: label(d.assetClass), value: d.drift, unit: 'pp' as const, source: 'drift.assetClassDrifts' })),
    ],
  }]
  const offModel = drift.assetClassDrifts.filter((d) => d.target === 0 && d.actual > 0)
  if (offModel.length > 0) {
    findings.push({
      claim: 'Some holdings sit outside the model.',
      attention: 'info',
      citations: cite,
      figures: offModel.map((d) => ({ label: label(d.assetClass), value: d.actual, unit: '%' as const, source: 'drift.assetClassDrifts.actual' })),
    })
  }
  const positions = getPositionsForAccount(account.id, account.totalValue)
  for (const d of drift.assetClassDrifts) {
    const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH')
    if (held.length > 0 && held.every((p) => !isMarketTradable(p.symbol)) && Math.abs(d.drift) > 0) {
      findings.push({
        claim: `${label(d.assetClass)} cannot be traded at market; its drift will remain until a repurchase window.`,
        attention: 'info', citations: cite,
        figures: [{ label: label(d.assetClass), value: d.drift, unit: 'pp', source: 'drift.assetClassDrifts' }],
      })
    }
  }
  return findings
}
```

```ts
// src/mocks/agents/pretrade-check.ts
import type { AgentContext, AgentFinding } from './agent'
import type { Figure } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { evaluateProposal } from '@/mocks/handlers/compliance'

const CATEGORY: Record<string, string> = {
  restricted_securities: 'is on the restricted list',
  concentration_limit: 'would exceed its concentration limit',
  sector_limit: 'would push its sector over the limit',
  cash_minimum: 'would leave cash below the minimum reserve',
  wash_sale: 'would trigger a wash sale',
}

export function runPretradeCheck({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const legs = generateRebalanceTrades(account.id, true)
  const cite = [{ source: `Pre-trade check · tax-aware rebalance preview · ${account.name}`, asOf }]
  if (legs.length === 0) return [{ claim: 'There is no rebalance proposal to check.', attention: 'info', figures: [], citations: cite }]
  const result = evaluateProposal(account.id, legs.map((l) => ({ symbol: l.symbol, side: l.side, quantity: l.quantity, estimatedValue: l.estimatedValue })))
  if (!result) return []
  if (result.violations.length === 0) return [{ claim: 'The proposal passes every pre-trade check.', attention: 'info', figures: [], citations: cite }]
  return result.violations.map((v) => {
    const who = v.symbol ?? 'The proposal'
    const verb = v.severity === 'block' ? 'Blocked' : 'Warning'
    const figures: Figure[] = []
    if (v.projectedWeight !== undefined) figures.push({ label: 'After the proposal', value: v.projectedWeight, unit: '%', source: 'evaluateProposal.violations.projectedWeight' })
    if (v.limitWeight !== undefined) figures.push({ label: 'Limit', value: v.limitWeight, unit: '%', source: 'evaluateProposal.violations.limitWeight' })
    if (v.category === 'cash_minimum') figures.push({ label: 'Cash after the proposal', value: result.projectedCashPct, unit: '%', source: 'evaluateProposal.projectedCashPct' })
    return { claim: `${verb}: ${who} ${CATEGORY[v.category] ?? 'fails a pre-trade rule'}.`, attention: v.severity === 'block' ? 'attention' : 'info', figures, citations: cite }
  })
}
```

`projectedCashPct` is already a fraction (`projectedCash / accountValue` in `compliance.ts`), matching the `'%'` unit.

```ts
// src/mocks/agents/registry.ts
import type { AgentId } from '@/types/workspace'
import type { AgentDefinition } from './agent'
import { AGENTS } from '@/mocks/data/people'
import { runDriftMonitor } from './drift-monitor'
import { runPretradeCheck } from './pretrade-check'

const RUNNERS: Record<AgentId, AgentDefinition['run']> = { 'drift-monitor': runDriftMonitor, 'pretrade-check': runPretradeCheck }

export const AGENT_DEFINITIONS: ReadonlyMap<AgentId, AgentDefinition> = new Map(
  AGENTS.map((a) => [a.id, { ...a, run: RUNNERS[a.id] }]),
)
```

```ts
// src/mocks/workspace/run-agent.ts
import type { AgentId, Message } from '@/types/workspace'
import { AGENT_DEFINITIONS } from '@/mocks/agents/registry'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { canSeeThread } from './visibility'

type Failure = { ok: false; status: 400 | 403 | 404; code: string; message: string }

export function runAgent(viewerId: string, threadId: string, agentId: AgentId): { ok: true; findings: Message[] } | Failure {
  const s = store()
  const thread = s.threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  if (thread.visibility === 'client') return { ok: false, status: 400, code: 'CLIENT_THREAD', message: 'Agents never post in a client thread.' }
  const agent = AGENT_DEFINITIONS.get(agentId)
  if (!agent || !thread.agentIds.includes(agentId)) return { ok: false, status: 403, code: 'NOT_ON_THREAD', message: 'That agent is not on this thread.' }
  const subject = thread.subject
  if (!subject) return { ok: false, status: 400, code: 'NO_SUBJECT', message: 'This thread has no subject for the agent to work on.' }
  const runKey = `${agentId}|${thread.id}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}`
  const existing = s.messages.filter((m): m is Extract<Message, { kind: 'agent_finding' }> => m.kind === 'agent_finding' && m.runKey === runKey)
  if (existing.length > 0) return { ok: true, findings: existing }
  const findings: Message[] = agent.run({ asOf: MOCK_NOW_ISO, subject }).map((f) => ({
    kind: 'agent_finding', id: nextId('msg'), threadId: thread.id, agentId, at: nextAt(), runKey, ...f,
  }))
  s.messages.push(...findings)
  return { ok: true, findings }
}
```

Add the handler (before the catch-all):

```ts
  http.post('/api/workspace/threads/:id/agents/:agentId/run', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const result = runAgent(viewer, String(params.id), String(params.agentId) as AgentId)
    if (!result.ok) return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    return HttpResponse.json(result.findings)
  }),
```

(An unknown agent id falls through `AGENT_DEFINITIONS.get` → 403.)

- [ ] **Step 3:** Run → PASS; full suite, lint, build. Commit: `feat(engine): scripted agents — Drift Monitor and Pre-trade Check — with idempotent runs`.

### Task 7: Services, hooks and the viewer

**Files:**
- Modify: `src/services/api-client.ts` (optional `headers` argument on `get`/`post`)
- Create: `src/services/workspace.ts`, `src/hooks/use-workspace.ts`, `src/workspace/viewer/viewer-context.ts`, `src/workspace/viewer/ViewerProvider.tsx`, `src/workspace/viewer/use-viewer.ts`
- Test: `src/hooks/__tests__/use-workspace.test.tsx`, `src/workspace/__tests__/viewer.test.tsx`

**Interfaces (produced):**
```ts
// api-client.ts
export function get<T>(path: string, params?: Record<string, string>, headers?: Record<string, string>): Promise<T>
export function post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T>
// services/workspace.ts — every function takes the viewer id first
getDirectory(viewer), getThreads(viewer), getThread(viewer, id), postMessage(viewer, threadId, body),
getDrafts(viewer, threadId), createDraft(viewer, threadId, body), getActs(viewer, threadId),
sendToClient(viewer, draftId), runAgent(viewer, threadId, agentId)
// hooks/use-workspace.ts — query keys always start ['workspace', viewer, …]
useDirectory(), useThreads(), useThread(id), useDrafts(threadId, enabled), useActs(threadId),
usePostMessage(threadId), useCreateDraft(threadId), useSendToClient(threadId), useRunAgent(threadId)
// viewer
useViewer(): { viewerId: string; setViewerId: (id: string) => void }   // default 'user-001', stored in sessionStorage 'ws-viewer' (try/catch)
```

Mutations invalidate `['workspace', viewer]` on success.

- [ ] **Step 1: Failing tests**

```tsx
// src/workspace/__tests__/viewer.test.tsx
import { it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'

it('defaults to the advisor and switches', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <ViewerProvider>{children}</ViewerProvider>
  const { result } = renderHook(() => useViewer(), { wrapper })
  expect(result.current.viewerId).toBe('user-001')
  act(() => result.current.setViewerId('cli-001'))
  expect(result.current.viewerId).toBe('cli-001')
})
```

```tsx
// src/hooks/__tests__/use-workspace.test.tsx
import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { useThreads } from '@/hooks/use-workspace'

it('switching viewer refetches and never shows the previous viewer\'s threads', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({ v: useViewer(), t: useThreads() }), { wrapper })
  await waitFor(() => expect(result.current.t.data?.length).toBe(3))
  act(() => result.current.v.setViewerId('cli-001'))
  await waitFor(() => expect(result.current.t.data?.map((t) => t.id)).toEqual(['th-robert']))
  expect(client.getQueryData(['workspace', 'cli-001', 'threads'])).toBeDefined()
})
```

Run → FAIL.

- [ ] **Step 2: Implement.** In `api-client.ts`, add the optional `headers` parameter (merge into the existing fetch options). `services/workspace.ts` passes `{ 'X-Viewer': viewer }` on every call, e.g.:

```ts
import { get, post } from './api-client'
import type { BindingAct, Directory, Draft, Message, Thread, ThreadDetail, AgentId } from '@/types/workspace'

const as = (viewer: string) => ({ 'X-Viewer': viewer })
export const getDirectory = (viewer: string) => get<Directory>('/workspace/people', undefined, as(viewer))
export const getThreads = (viewer: string) => get<Thread[]>('/workspace/threads', undefined, as(viewer))
export const getThread = (viewer: string, id: string) => get<ThreadDetail>(`/workspace/threads/${id}`, undefined, as(viewer))
export const postMessage = (viewer: string, threadId: string, body: string) => post<Message>(`/workspace/threads/${threadId}/messages`, { body }, as(viewer))
export const getDrafts = (viewer: string, threadId: string) => get<Draft[]>(`/workspace/threads/${threadId}/drafts`, undefined, as(viewer))
export const createDraft = (viewer: string, threadId: string, body: string) => post<Draft>(`/workspace/threads/${threadId}/drafts`, { body }, as(viewer))
export const getActs = (viewer: string, threadId: string) => get<BindingAct[]>('/workspace/acts', { threadId }, as(viewer))
export const sendToClient = (viewer: string, draftId: string) => post<BindingAct>('/workspace/acts', { kind: 'send_to_client', draftId }, as(viewer))
export const runAgent = (viewer: string, threadId: string, agentId: AgentId) => post<Message[]>(`/workspace/threads/${threadId}/agents/${agentId}/run`, undefined, as(viewer))
```

`viewer-context.ts` holds `createContext<{ viewerId: string; setViewerId: (id: string) => void } | null>(null)`; `ViewerProvider` keeps state initialised from `sessionStorage` (try/catch → `'user-001'`) and writes back on change; `useViewer` throws outside the provider. Hooks use `useQuery({ queryKey: ['workspace', viewerId, 'threads'], queryFn: () => getThreads(viewerId) })` etc.; mutations call `queryClient.invalidateQueries({ queryKey: ['workspace', viewerId] })` on success.

- [ ] **Step 3:** Run → PASS; full suite, lint, build. Commit: `feat(workspace): services, hooks and the viewer`.

### Task 8: The shell — top bar, thread list, routes

**Files:**
- Create: `src/workspace/shell/WorkspaceShell.tsx`, `src/workspace/shell/ViewAs.tsx`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/shell/WorkspaceHome.tsx`, `src/workspace/shell/shell-ids.ts`
- Modify: `src/app/routes.tsx` (shell as layout route at `/`, index = `WorkspaceHome`, `t/:threadId` = `ThreadPage` (Task 9), `accounts/:accountId` = `AccountView` (Task 11), `kit`, `*`), `src/main.tsx` (wrap in `ViewerProvider`), delete `src/app/pages/HomePage.tsx`
- Modify: `src/kit/layout/Grid.tsx` (`SidePanel` uses `aria-labelledby` with `useId`), `src/styles/app.css` (`--breakpoint-wide: 1440px; --breakpoint-split: 1100px` in `@theme`; replace the `min-[1100px]` / `max-w-[1440px]` literals in kit and shell with `split:` / `max-w-(--breakpoint-wide)`)
- Test: `src/workspace/__tests__/shell.test.tsx`

**Behaviour:**
- `WorkspaceShell` renders: a `<header>` top bar (product name "Advisor Desktop", `ViewAs`, `ThemeToggle` moved from the kit page to `src/workspace/shell/ThemeToggle.tsx` and reused by `/kit`), a `<nav aria-label="Threads">` with `ThreadList`, `<main id="main">` containing `<Outlet />`, and — when the route provides it — the context column (Task 10) as an `<aside>` outside `main`. Grid: thread list 3 columns, main 6, context 3 at `split:`; stacked below.
- `ViewAs` uses a new kit `Select` (`src/kit/select/Select.tsx`: a labelled native `<select>` styled with tokens only, with its own test; raw `<select>` stays banned outside the kit). Label "View as"; options = directory people as "Name · Role".
- `ThreadList` groups threads under "Private" / "Internal" / "Client" headings (h2), each item a `Link` to `/t/:id` with a compact `VisibilityBand` (message scale) and the title; current thread marked `aria-current="page"`; "Agents on this desk" lists the agents of visible threads with scopes ("may …" / "may not …").
- `WorkspaceHome` (index): page `h1` "Workspace" (id `PAGE_TITLE_ID`), text "Choose a thread." and nothing else.
- Viewer switch navigates to `/` if the current thread is no longer visible (avoid showing a stale 404).

- [ ] **Step 1: Failing tests** (`renderWithProviders` with `QueryClientProvider` + `ViewerProvider` + `createMemoryRouter(routes)`):
  - `/` as Adrian lists three threads under the three headings; exactly one `h1`.
  - switching ViewAs to "Robert Johnson · Client" leaves only "Robert Johnson" in the list and no "Agents on this desk" agents.
  - switching to Mark Davis shows the two firm threads, not "Brief".
  - `Select` kit test: label association, change event.
- [ ] **Step 2:** Implement per the behaviour above, using kit `Page`-free layout (the shell owns the frame; each routed page renders its own single `h1` with `id={PAGE_TITLE_ID}` and `tabIndex={-1}`). Update `src/__tests__/guardrails/headings` route walk if the new layout route changes nesting.
- [ ] **Step 3:** Run → PASS; guardrails, full suite, lint, build. Commit: `feat(workspace): three-pane shell, view-as, thread list`.

### Task 9: The thread — messages and embeds

**Files:**
- Create: `src/workspace/thread/ThreadPage.tsx`, `src/workspace/thread/MessageView.tsx`, `src/workspace/thread/AgentFindingView.tsx`, `src/workspace/thread/figure-format.ts`, `src/workspace/thread/embeds/DriftEmbed.tsx`, `src/workspace/thread/embeds/RebalanceEmbed.tsx`, `src/workspace/thread/embeds/embed-registry.ts`, `src/workspace/thread/Composer.tsx`
- Test: `src/workspace/__tests__/thread.test.tsx`, `src/workspace/__tests__/figure-format.test.ts`

**Behaviour:**
- `ThreadPage` (`/t/:threadId`): loads `useThread`; loading → `role="status"` "Loading the thread…"; 404 → `h1` "Thread not found" with a link to `/`; other errors → `role="alert"` with the error message. Ready → thread-scale `VisibilityBand` (client threads pass `audience` = client name from the directory) and `h1` = thread title; messages in order; `Composer` at the bottom.
- `MessageView` by kind:
  - `text`: author name and role (from directory), `fmtTimestamp(at)`, body.
  - `agent_finding`: `AgentFindingView` — agent name, scope tag "may … · may not …" (kit `Tag`), claim, `StatusCode` (`BLOCK` if the claim starts with "Blocked", `WARN` for "Warning", else `OUT`/`IN` from `attention` — keep this mapping in `figure-format.ts` as `findingStatus(finding)` with tests), figures as `Reading`s formatted by `formatFigure(fig)`, sources as `SourceChips` (label = citation source, asOf).
  - `embed`: registry → component; unknown kind throws (explicit).
  - `act`: `RecordSlip` from the act (fetched via `useActs`; kind label "Send to client · binding"; recorded by name + role; archive "Supervisory review").
- `figure-format.ts`: `formatFigure(fig: Figure): { value: string; unit: string }` — `pp` → `fmtDrift`, `%` → `fmtWeight`, `USD` → `fmtResult` when the label implies a result else `fmtMoney` (keep simple: `fmtMoney`), `sh` → `fmtQuantity`, `d` → `fmtDays`. Tests per unit.
- `DriftEmbed`: `useDrift(subject.id)` (existing hook) → shared-scale `Gauge`s with display names (reuse the kit gallery's `assetClassLabel`, moved to `src/workspace/asset-class-label.ts`), and a link "Open full view" → `/accounts/:id`.
- `RebalanceEmbed`: `previewRebalance` + `preTradeCheckProposal` via `useQuery` → kit `DataTable` of legs (symbol, side, qty, value, pre-trade `StatusCode` per leg from `result.legs[i].severity`: block→`BLOCK`, warning→`WARN`, pass→`CLEAR`) with totals tying to the preview. (Seeded nowhere in Phase 2 except available to Phase 3; render it in the `/kit` gallery as an embed demo.)
- `Composer`: in firm threads posts text (`usePostMessage`); in a client thread, for a viewer who `can draft`, the input placeholder reads "Write a draft for Robert (not sent until you send it)" and creates a draft (`useCreateDraft`) — the draft then appears in the context column (Task 10); for the client viewer it posts text to their thread; for a viewer who may not post (e.g. analyst in the client thread) the composer is replaced by "You can read this thread but not post in it." Uses kit `Button` and a kit `TextInput` (add `src/kit/text-input/TextInput.tsx`: labelled textarea, tokens only, tests).

- [ ] **Step 1: Failing tests:** thread renders band + one h1; an `agent_finding` (after calling the run endpoint in the test) shows the claim, scope tag, formatted figures (`+13.2`, `pp`) and "Relies on"; posting in the internal thread appends the message; as Adrian in Robert's thread the composer creates a draft (and posts nothing to the conversation); as Robert the composer posts; unknown thread → "Thread not found".
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run → PASS; guardrails, full suite, lint, build. Commit: `feat(workspace): thread view — messages, agent findings, embeds, composer`.

### Task 10: The context column — who can see, drafts and Send, acts, agents, full views

**Files:**
- Create: `src/workspace/context/ContextColumn.tsx`, `src/workspace/context/WhoCanSee.tsx`, `src/workspace/context/DraftsPanel.tsx`, `src/workspace/context/ActsPanel.tsx`, `src/workspace/context/AskAgents.tsx`
- Modify: `src/workspace/shell/WorkspaceShell.tsx` (render `ContextColumn` for `/t/:threadId`)
- Test: `src/workspace/__tests__/context.test.tsx`

**Behaviour:**
- `WhoCanSee`: members (name · role), compliance listed as "Mark Davis · Compliance (supervision)" for internal and client threads, agents with scopes; for a client viewer only the people in their thread, no agents.
- `DraftsPanel` (client threads, firm viewers only): each draft "Draft · not sent", its body, "Sending is recorded as a binding act by you.", and a **Send to \<client first name\>** `Button` shown only if `directory.permissions[viewerId]` includes `'send_to_client'` (served by the engine, Task 4; the UI never derives permissions). On send: `useSendToClient`; button disabled while pending; on success focus moves to the new act slip (`useFocusAfter('act-<id>')`); on error the message is shown (`role="alert"`).
- `ActsPanel`: the thread's acts as kit `RecordTrail` (label from kind, actor name, `DONE`, `at`) plus each act's `RecordSlip` with `id="act-<id>"`.
- `AskAgents`: one `Button` per agent on the thread — "Ask Drift Monitor" — calling `useRunAgent`; hidden for client threads and client viewers.
- Full views: "Robert Johnson Individual ↗" link for an account subject (display name from `useAccount`).

- [ ] **Step 1: Failing tests:** the end-to-end flow — as Adrian, open Robert's thread, type a draft, see it under "Draft · not sent", click "Send to Robert", a `RecordSlip` with `REC-0001` appears and the message appears in the conversation; switch to Robert — the message is there, no drafts or agents; switch to Sarah — the draft panel shows no Send button. "Ask Drift Monitor" in the Johnson thread adds a finding. Double-click Send records exactly one act (second request 409 handled quietly: button disabled while pending).
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run → PASS; guardrails, full suite, lint, build. Commit: `feat(workspace): context column — visibility, drafts and send, acts, agents`.

### Task 11: Account full view

**Files:**
- Create: `src/workspace/full-views/AccountView.tsx`
- Modify: `src/app/routes.tsx` (`accounts/:accountId`)
- Test: `src/workspace/__tests__/account-view.test.tsx`

**Behaviour:** `h1` = account display name (`useAccount`); drift gauges on a shared scale with display names; positions and tax lots as kit `DataTable`s (reuse the column definitions from the `/kit` gallery — move them to `src/workspace/full-views/account-columns.tsx` and import from both); totals verify `tiesTo` the account value; a "Back to the thread" link when opened from a thread (`?from=<threadId>`); unknown account → `h1` "Account not found" + link home.

- [ ] **Step 1: Failing tests:** acc-002 renders name h1, nine gauges, 10 positions, 14 lots; unknown id → not found.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run → PASS; full suite, lint, build. Commit: `feat(workspace): account full view`.

### Task 12: Keyboard and focus in the shell

**Files:**
- Modify: `src/app/RootLayout.tsx` → move keyboard wiring into `WorkspaceShell` (destinations: each visible thread "Thread · \<title\>" → `/t/:id`, "Account · \<name\>" for thread subjects → `/accounts/:id`, "Component kit" → `/kit`); `src/kit/keyboard/KeyboardProvider.tsx` (prune the order map on unregister; open-dialog selector `[role="dialog"][data-state="open"]`); `src/kit/dialog/Dialog.tsx` (visible close `Button` "Close", top-right, returns focus as before)
- Test: `src/workspace/__tests__/shell-keyboard.test.tsx`; extend `src/kit/__tests__/Keyboard.test.tsx` and `Dialog.test.tsx`

**Behaviour:** jump keys `[` thread list, `]` context column, `\` thread (registered by the shell, shown in the legend); on every route change focus moves to the page `h1` (`useFocusAfter` in a `useEffect` on `location.pathname`); `/` opens the command line with the destinations above.

- [ ] **Step 1: Failing tests:** `/` then "Johnson" + Enter navigates to the thread and focuses its h1; `[` focuses the thread list; Dialog close button closes and returns focus; order map size returns to baseline after unmount.
- [ ] **Step 2:** Implement. **Step 3:** Run, commit: `feat(workspace): keyboard navigation and focus across the shell`.

### Task 13: Explicit load errors and the kit gallery update

**Files:**
- Modify: `src/app/pages/KitPage.tsx` (error branch shows `state.error.message`), `src/app/pages/kit/KitSections.tsx` (add a "Workspace embeds" pane rendering `RebalanceEmbed` for acc-002 and an `AgentFindingView` from a Drift Monitor run via the service), any shell/page error branch that shows generic text
- Test: extend `src/app/__tests__/routes.test.tsx` (an MSW override returning 500 for `/api/workspace/threads` shows the error message)

- [ ] Steps: failing test → implement → run → commit `feat: explicit load errors; workspace embeds in the kit`.

### Task 14: Visual baselines that compare

**Files:**
- Modify: `e2e-visual/kit.spec.ts` (use `expect(page).toHaveScreenshot('kit-light.png', { fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 })` instead of writing PNGs), `playwright.visual.config.ts` (`snapshotPathTemplate: 'e2e-visual/__baselines__/{arg}{ext}'`), `.gitignore` (`!e2e-visual/__baselines__/*.png`), `package.json` (`"visual:update": "playwright test -c playwright.visual.config.ts --update-snapshots"`)
- Create: `e2e-visual/shell.spec.ts` — baselines: Adrian on the Johnson thread after "Ask Drift Monitor" (light, dark); Robert on his thread (light); the account full view (light). Keep the overflow-at-1024 and clipping checks from the kit spec, applied to the shell pages too.
- Remove `docs/superpowers/visual/*.png` (superseded by `e2e-visual/__baselines__/`).

- [ ] **Step 1:** `VISUAL_PORT=5195 pnpm visual:update` to create baselines; open every PNG and check: three panes at 1440, context column below at 1024, bands correct per thread, finding readable, Robert's view shows only his thread.
- [ ] **Step 2:** `VISUAL_PORT=5195 pnpm visual` → passes against the baselines; make a deliberate 1px change to a kit colour in a scratch edit and confirm it fails; revert.
- [ ] **Step 3:** Commit: `test(visual): compared baselines for the kit and the shell`.

### Task 15: Merge `main`, refresh the preview

- [ ] **Step 1:** `git fetch origin && git merge origin/main`. Resolve per the Phase 1 rules (old-UI deletions win; `src/lib/tax-rules.ts` takes main's tax changes; engine files take main's version and re-point imports). If Phase 0 added a people directory or `eventTime`, keep a single implementation (Phase 0's), adapt `src/mocks/data/people.ts` to it, and ensure the advisor is Adrian Hale. Full suite, lint, build, `pnpm visual` (update baselines only for intended changes, and look at them).
- [ ] **Step 2:** Refresh the preview: `pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-2 --message "workspace phase 2: shell"`. Record the preview URL in the report.
- [ ] **Step 3:** Commit any merge resolution: `merge: main into workspace (phase 0 updates)`.
