# Phase 2: workspace shell

**Date:** 11 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Branch:** `workspace`
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md`
**Builds on:** Phase 1 (`docs/superpowers/specs/2026-10-11-phase-1-instrument-foundation-design.md`) and its
carry-over list (`docs/superpowers/plans/2026-10-11-phase-1-carryover.md`)

## Goal

Build the frame every workspace job plugs into: threads with private, internal and client visibility;
a record of binding acts by named people; a scripted-agent framework with two working agents; a
"view as" control that proves the client boundary; the three-pane shell; and the first full view.
It ends before any real job (Phase 3 brings the brief, rebalance and client-thread job), but the
preview must be clickable end to end: open a thread, ask an agent, see its finding with sources,
draft a reply to the client, send it as a recorded act, and view as the client to see exactly what
they see.

## Decisions (from brainstorming)

1. **Thread state and its rules live in the engine** (the MSW mock backend), served and changed
   through the mock API, enforced in handlers and pinned by invariant tests. State lasts for the
   browser session and resets on reload.
2. **Switchable viewer.** A "view as" control switches the whole workspace to any person in the
   directory; the engine serves each viewer only what their role and the thread's visibility allow.
3. **The demo advisor is "Adrian Hale"** (`user-001`). No real person's name is used for anyone in
   the demo.
4. **Layout A: three panes** — thread list, thread, context column.
5. **Visibility is per thread**, never per message.
6. **Agents run in the engine, on request**, and are idempotent per as-of time.
7. **Phase 2 builds the agent framework plus two agents:** Drift Monitor and Pre-trade Check.

## People and agents

### People

Engine data. When Phase 0's people directory has landed on `main` and been merged into `workspace`,
Phase 2 uses it (renaming `user-001` to Adrian Hale if Phase 0 did not). Until then Phase 2 seeds the
same directory on `workspace` in `src/mocks/data/people.ts`:

| ID | Name | Role | May |
|---|---|---|---|
| `user-001` | Adrian Hale | `advisor` | post in firm threads; draft for and send to clients; record `approve_proposal`, `withdraw_approval`, `send_to_client` |
| `user-002` | Sarah Mitchell | `csa` | post in firm threads; draft for clients; may not approve or send |
| `user-003` | Mike Chen | `analyst` | post in firm threads; may not approve, draft for or send to clients |
| `cco-001` (or Phase 0's ID) | Mark Davis | `compliance` | read all internal and client threads (supervision); record `dispose_exception` (used in Phase 4) |
| `cli-001` | Robert Johnson | `client` | read and post in his own client thread only |

`can(personId, act): boolean` is the single permission check, used by handlers and tests.
The `user-001` participant in `src/mocks/data/messages.ts` (still carrying the former demo name) is renamed to Adrian Hale in the same change;
any test or fixture naming the advisor follows.

### Agents

```ts
type AgentScope = { may: string[]; mayNot: string[] }
type AgentDefinition = {
  id: 'drift-monitor' | 'pretrade-check'
  name: string
  scope: AgentScope
  run: (context: AgentContext) => AgentFinding[]
}
```

| Agent | May | May not |
|---|---|---|
| Drift Monitor | measure and flag | stage or release trades; post in a client thread |
| Pre-trade Check | run checks and report | clear a block; release orders; post in a client thread |

## Data model (`src/types/workspace.ts`)

```ts
type Visibility = 'private' | 'internal' | 'client'
type Subject = { type: 'account' | 'household' | 'client'; id: string }

type Thread = {
  id: string
  title: string
  visibility: Visibility
  ownerId?: string            // required for private threads
  clientId?: string           // required for client threads
  memberIds: string[]         // people
  agentIds: AgentDefinition['id'][]   // never on client threads
  subject?: Subject
}

type Figure = { label: string; value: number; unit: 'USD' | 'pp' | '%' | 'sh' | 'd'; source: string }
type Citation = { source: string; asOf: string }

type Message =
  | { kind: 'text'; id: string; threadId: string; authorId: string; at: string; body: string }
  | { kind: 'agent_finding'; id: string; threadId: string; agentId: AgentDefinition['id']; at: string;
      claim: string; figures: Figure[]; citations: Citation[]; attention: 'info' | 'attention';
      runKey: string }
  | { kind: 'embed'; id: string; threadId: string; authorId: string; at: string;
      embed: 'drift' | 'rebalance_preview'; subject: Subject }
  | { kind: 'act'; id: string; threadId: string; at: string; actId: string }

type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'dispose_exception' | 'send_to_client'
type BindingAct = {
  id: string                  // REC-0001, REC-0002 … in order of recording
  kind: BindingActKind
  actorId: string             // a person, never an agent
  at: string                  // event clock
  threadId: string
  subject?: Subject
  fingerprint: string         // hash of the content acted on
  summary: string
}

type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string }
```

Agent finding `claim` text contains no numbers; every number is a `Figure` with a raw value and its
engine source, formatted by the UI through `measure`. The engine never formats numbers for display.

## Engine rules (enforced in handlers; each has an invariant test)

1. **Every request names its viewer** (header `X-Viewer: <personId>`; the "view as" control sets it).
   A missing or unknown viewer is `401`.
2. **Viewer filtering.**
   - A private thread is served only to its owner.
   - Internal threads are served to members and to compliance.
   - A client thread is served to its client, its firm members, and compliance.
   - A client viewer is never served any thread but their own client thread, and never any agent,
     draft or act detail beyond the acts recorded in that thread.
   - A thread a viewer may not see returns `404` (not `403`), so its existence does not leak.
3. **Posting.** Only a member may post text. A client may post only in their own client thread.
   **Firm members cannot post text into a client thread**; they create a `Draft` instead.
4. **Drafts** are firm-only: never served to a client viewer; created by people whose role may draft
   for clients (`advisor`, `csa`).
5. **Binding acts.** `POST /workspace/acts` succeeds only when the viewer is the actor and
   `can(actor, kind)` is true. An agent can never be an actor. Acts are append-only: there is no
   update or delete endpoint for acts or messages.
6. **Send to client** (`kind: 'send_to_client'`, subject = the draft): copies the draft's body into the
   client thread as a `text` message authored by the sender, records the act with the draft's
   fingerprint, posts an `act` message in the client thread, and consumes the draft. It is the only
   way firm content enters a client thread.
7. **Agents.** `POST /workspace/threads/:id/agents/:agentId/run` runs only if the agent is on the
   thread and the thread is not a client thread. It is idempotent on (agent, thread, subject,
   as-of): a second run returns the existing findings.
8. **Event clock.** Every `at` comes from the deterministic event clock (Phase 0's `eventTime`, or a
   Phase 2 stand-in with the same contract until it lands), so recorded times are distinct and
   ordered. The live clock is never read.

## Agents

- **Context:** `{ asOf: string; subject: Subject }`, plus read-only access to the engine's own pure
  functions (drift, rebalance preview, proposal-level pre-trade check, tax lots) — called directly,
  not over HTTP.
- **Drift Monitor** for an account: the largest drift against the band; every asset class outside its
  band; off-model holdings; classes it cannot correct and why (periodic liquidity; replacement hold).
- **Pre-trade Check** for an account: runs the proposal-level pre-trade check (merged from `main`)
  on the account's tax-aware rebalance preview and reports blocks and warnings per leg. It never
  reports anything as cleared.

## API (MSW handlers, `src/mocks/handlers/workspace.ts`)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/workspace/people` | directory (people and agents) |
| GET | `/api/workspace/threads` | threads the viewer may see |
| GET | `/api/workspace/threads/:id` | thread + messages (404 if not visible) |
| POST | `/api/workspace/threads/:id/messages` | posts text (rules 3) |
| GET/POST | `/api/workspace/threads/:id/drafts` | firm-only drafts for a client thread |
| POST | `/api/workspace/threads/:id/agents/:agentId/run` | findings (rule 7) |
| GET | `/api/workspace/acts?threadId=` | acts the viewer may see |
| POST | `/api/workspace/acts` | records an act (rules 5–6) |

Services in `src/services/workspace.ts` and query hooks in `src/hooks/use-workspace.ts` follow the
existing patterns; every request carries `X-Viewer`.

## Seed data

- **Brief** — private, owner Adrian Hale; Drift Monitor on it.
- **Johnson Rebalance Review** — internal; Adrian, Sarah, Mike; Drift Monitor and Pre-trade Check;
  subject acc-002. Rebuilt from thread-001's existing messages with the acc-001 mix-up corrected
  (msg-003 discusses acc-002's actual drift, or is removed if Phase 0 already fixed it on `main`).
  Includes a `drift` embed for acc-002.
- **Robert Johnson** — client; Robert, Adrian, Sarah; carries Robert's existing inbound
  communication history as client-authored text messages.

Seed text never contains figures; figures appear only in agent findings and embeds.

## UI (`src/workspace/`, scanned by the guardrails)

**Routes:** `/` → the shell (replaces the placeholder home); `/t/:threadId` → a thread;
`/accounts/:accountId` → the account full view; `/kit` stays.

**Shell (layout A):**
- **Top bar:** product name; the "view as" control (lists the directory with roles; defaults to Adrian
  Hale; stored for the session; switching invalidates every workspace query); the key legend.
- **Thread list:** threads grouped Private / Internal / Client, each with a compact `VisibilityBand`
  and title; "Agents on this desk" with each agent's scope.
- **Thread:** thread-scale `VisibilityBand` (client threads name the client) and the thread title as
  the page `h1`; messages in order:
  - text: author, role, event-clock time;
  - agent finding: agent name + scope tag, claim, figures via kit `Reading`/`FigureRef`, sources via
    `SourceChips`, attention marked by `StatusCode`;
  - embed: a registry `embed → component` (Phase 2: `drift` → shared-scale `Gauge`s; `rebalance_preview`
    → kit `DataTable` of legs with pre-trade results), each linking to its full view;
  - act: `RecordSlip` from the act record.
  The composer posts text in firm threads; in a client thread a firm member's composer creates a
  draft ("Write a draft for Robert (not sent until you send it)").
- **Context column:** who can see the thread (people with roles, compliance shown as supervision,
  agents with scopes); drafts awaiting send, each with a **Send** button that records the
  `send_to_client` act; the thread's binding acts as a `RecordTrail`; "Ask \<agent\>" buttons;
  links to full views. Below 1100px it drops under the thread.
- **Viewing as a client:** only their client thread exists; no agents, drafts or context beyond the
  thread's own acts.

**Account full view** (`/accounts/:accountId`): page `h1` = account display name; drift gauges on a
shared scale; positions and tax lots as kit `DataTable`s; a link back to the thread that opened it.

**Keyboard:** the command line lists threads and full views; jump keys move between thread list,
thread and context column; focus moves to the page heading on every navigation (`useFocusAfter`).

## Phase 1 carry-over picked up here

- Move the router future flags out of `@/app/routes` into a neutral module (`src/app/router-flags.ts`)
  so kit tests don't import the app.
- `SidePanel` uses `aria-labelledby`; the shell places complementary regions outside `main` where the
  layout allows (axe `landmark-complementary-is-top-level`).
- Breakpoints (1100px, 1440px) become `@theme` tokens used by the kit and shell.
- `KeyboardProvider`: prune the order map on unregister; narrow the open-dialog selector to
  `[data-state="open"]`.
- `Dialog` gets a visible close control.
- Visual tests compare against committed baselines (`toHaveScreenshot`) instead of overwriting them,
  for `/kit` and the new shell screens.
- Surface load errors explicitly in the shell (the error message, not generic text).

Everything else on the carry-over list stays deferred.

## Testing

- **Engine invariants** (`src/mocks/handlers/__tests__/workspace-*.test.ts`), one per rule above,
  including: a client viewer is served exactly their own client thread; every client-thread message
  is either client-authored or arrived via a `send_to_client` act; no act has an agent actor; acts and
  messages have no update/delete path; drafts never reach a client viewer; hidden threads return 404.
- **Agents:** each agent run over every account in the book; every figure equals its engine source;
  every citation resolves; deterministic per as-of; idempotent runs; refusal on client threads.
- **UI:** shell renders for every viewer with exactly one `h1`; switching viewer re-queries and
  changes what is shown; the draft → send flow records an act and the message appears for Robert;
  keyboard navigation and focus; guardrails pass on `src/workspace/`.
- **Visual:** baselines for the shell (Adrian viewing the internal thread; Robert viewing his thread)
  in both themes, compared on each run; no page-level horizontal scroll at 1024px; no clipped labels.

## Out of scope

Real jobs (proposals, approvals of trades, client letters drafted by an agent) — Phase 3; compliance
dispositions and the supervision queue — Phase 4; the drafting and tax agents — Phase 3; persistence
across reloads; notifications; read receipts.

## Success criteria

- On the preview, a reviewer can: open the Johnson thread as Adrian, ask Drift Monitor and see a
  finding with sources, open the account full view, draft a reply in Robert's thread, send it as a
  recorded act, switch to "view as Robert" and see only his thread with that message, and switch to
  Mark Davis and see the firm threads but not Adrian's private brief.
- Every engine rule has an invariant test that fails without it.
- `pnpm lint`, `pnpm build`, full `vitest run` and the visual suite are green.
